-- 0069_crm_orders_reviews.sql — real CRM + order + review spine for the business
-- dashboard (Clientes / Pedidos / Reseñas). Idempotent. Portable vanilla Postgres.
--
-- Turns the fixture-driven dashboard into a real one:
--   1) business_customers gains user_id (link to the buyer) + loyalty_points.
--   2) A trigger on business_orders auto-builds/updates the customer directory on
--      every order (orders_count, spend, last_order_at, loyalty points) — so the
--      CRM is derived from real orders, not seeded.
--   3) owner_customer_stats() — KPIs + segment breakdown (VIP top-decile, regulars,
--      occasional, new, at-risk) in ONE aggregate query (scale-safe).
--   4) owner_order_stats() — today's count/revenue, in-flight, status + channel mix.

-- ---------------------------------------------------------------------------
-- 1) columns
-- ---------------------------------------------------------------------------
alter table public.business_customers add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.business_customers add column if not exists loyalty_points int not null default 0;
-- one directory row per (business, buyer); guests (no user_id) are matched by name
create unique index if not exists business_customers_biz_user_idx
  on public.business_customers (business_id, user_id) where user_id is not null;

-- ---------------------------------------------------------------------------
-- 2) orders → customer directory (accrue on every order)
-- ---------------------------------------------------------------------------
create or replace function public.tg_order_customer() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare v_rate numeric; v_pts int; v_id uuid; v_name text; v_init text;
begin
  select coalesce(nullif(b.settings->'loyalty'->>'points_per_dollar','')::numeric, 1)
    into v_rate from public.businesses b where b.id = new.business_id;
  v_pts := floor(coalesce(new.total, 0) * coalesce(v_rate, 1));
  v_name := coalesce(nullif(btrim(new.customer_name), ''), 'Cliente');
  v_init := upper(left(regexp_replace(v_name, '[^A-Za-z]', '', 'g'), 2));
  if v_init = '' then v_init := 'C'; end if;

  -- find the existing directory row: by buyer id first, else by name
  if new.user_id is not null then
    select id into v_id from public.business_customers
      where business_id = new.business_id and user_id = new.user_id limit 1;
  end if;
  if v_id is null then
    select id into v_id from public.business_customers
      where business_id = new.business_id and user_id is null and lower(name) = lower(v_name) limit 1;
  end if;

  if v_id is not null then
    update public.business_customers set
      orders_count  = coalesce(orders_count, 0) + 1,
      spend         = coalesce(spend, 0) + coalesce(new.total, 0),
      last_order_at = greatest(coalesce(last_order_at, new.created_at), new.created_at),
      loyalty_points = coalesce(loyalty_points, 0) + v_pts,
      user_id       = coalesce(user_id, new.user_id)
    where id = v_id;
  else
    insert into public.business_customers
      (business_id, user_id, name, initials, orders_count, spend, last_order_at, loyalty_points, tag)
    values
      (new.business_id, new.user_id, v_name, v_init, 1, coalesce(new.total, 0), new.created_at, v_pts, 'Nuevo');
  end if;
  return new;
end $fn$;
drop trigger if exists trg_order_customer on public.business_orders;
create trigger trg_order_customer after insert on public.business_orders
  for each row execute function public.tg_order_customer();

-- ---------------------------------------------------------------------------
-- 3) customer KPIs + segments (owner-scoped, single aggregate)
-- ---------------------------------------------------------------------------
create or replace function public.owner_customer_stats(in_business uuid)
returns jsonb language sql stable security definer set search_path = public as $fn$
  with mine as (
    select c.orders_count, c.spend, c.created_at, c.last_order_at, c.loyalty_points
    from public.business_customers c join public.businesses b on b.id = c.business_id
    where c.business_id = in_business and b.owner_id = auth.uid()
  ),
  p as (select percentile_cont(0.9) within group (order by coalesce(spend,0)) as p90 from mine),
  vip as (select coalesce((select p90 from p), 0) as t),
  agg as (
    select
      count(*) as total,
      count(*) filter (where created_at > now() - interval '30 days') as new_30d,
      count(*) filter (where coalesce(orders_count,0) > 1) as returning_n,
      coalesce(round(avg(coalesce(spend,0))), 0) as avg_ltv,
      count(*) filter (where coalesce(spend,0) >= (select t from vip) and coalesce(spend,0) > 0) as vip_n,
      coalesce(round(avg(coalesce(spend,0)) filter (where coalesce(spend,0) >= (select t from vip) and coalesce(spend,0) > 0)), 0) as vip_ltv,
      count(*) filter (where coalesce(orders_count,0) >= 3 and not (coalesce(spend,0) >= (select t from vip) and coalesce(spend,0) > 0)) as reg_n,
      coalesce(round(avg(coalesce(spend,0)) filter (where coalesce(orders_count,0) >= 3 and not (coalesce(spend,0) >= (select t from vip) and coalesce(spend,0) > 0))), 0) as reg_ltv,
      count(*) filter (where coalesce(orders_count,0) between 1 and 2) as occ_n,
      coalesce(round(avg(coalesce(spend,0)) filter (where coalesce(orders_count,0) between 1 and 2)), 0) as occ_ltv,
      count(*) filter (where created_at > now() - interval '30 days' and coalesce(orders_count,0) <= 1) as new_seg_n,
      coalesce(round(avg(coalesce(spend,0)) filter (where created_at > now() - interval '30 days' and coalesce(orders_count,0) <= 1)), 0) as new_ltv,
      count(*) filter (where last_order_at is not null and last_order_at < now() - interval '60 days') as risk_n,
      coalesce(round(avg(coalesce(spend,0)) filter (where last_order_at is not null and last_order_at < now() - interval '60 days')), 0) as risk_ltv,
      count(*) filter (where coalesce(loyalty_points,0) > 0) as enrolled
    from mine
  )
  select to_jsonb(agg) from agg;
$fn$;
grant execute on function public.owner_customer_stats(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) order KPIs + status/channel mix (owner-scoped)
-- ---------------------------------------------------------------------------
create or replace function public.owner_order_stats(in_business uuid)
returns jsonb language sql stable security definer set search_path = public as $fn$
  with mine as (
    select o.total, o.status, o.channel, o.created_at
    from public.business_orders o join public.businesses b on b.id = o.business_id
    where o.business_id = in_business and b.owner_id = auth.uid()
  )
  select jsonb_build_object(
    'today_count',   (select count(*) from mine where created_at::date = now()::date),
    'today_revenue', (select coalesce(round(sum(total)), 0) from mine where created_at::date = now()::date and status <> 'cancelled'),
    'in_flight',     (select count(*) from mine where status in ('new','preparing','ready')),
    'total_count',   (select count(*) from mine),
    'status',        (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) n from mine group by status) s),
    'channel_today', (select coalesce(jsonb_object_agg(channel, n), '{}'::jsonb) from (select channel, count(*) n from mine where created_at::date = now()::date group by channel) c)
  );
$fn$;
grant execute on function public.owner_order_stats(uuid) to authenticated;

notify pgrst, 'reload schema';
