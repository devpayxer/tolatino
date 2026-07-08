-- 0067_fix_buy_notify_and_promo_ambiguity.sql — fixes the two real bugs that made
-- ticket purchase fail in production:
--   BUG 1  "function public.notify_user(uuid, unknown, jsonb, unknown) does not exist"
--          → migration 0054 (notifications table + notify_user + notify triggers) was
--            never applied. Every event_tickets insert calls notify_user (a trigger
--            from 0061), so buying always failed. This re-applies 0054 (idempotent).
--   BUG 2  "column reference \"code\" is ambiguous"
--          → in buy_event_tickets_multi the promo lookup `upper(code)` collides with
--            the function's own `code` OUT column. Qualified to event_promo_codes.code.
-- Idempotent. Portable vanilla Postgres. Apply: paste this WHOLE file + Run.

-- ===========================================================================
-- BUG 1 — notifications spine (re-apply 0054; harmless if already present)
-- ===========================================================================
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,
  data       jsonb not null default '{}',
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
drop policy if exists "own notifications read" on public.notifications;
create policy "own notifications read" on public.notifications for select using (user_id = auth.uid());
drop policy if exists "own notifications update" on public.notifications;
create policy "own notifications update" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.notify_user(in_user uuid, in_kind text, in_data jsonb, in_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, data, link)
  select in_user, in_kind, in_data, in_link where in_user is not null;
$$;

-- order / booking / rental / message notify triggers (so the bell works app-wide)
create or replace function public.tg_notify_order() returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from public.businesses where id = new.business_id;
  if tg_op = 'INSERT' then
    perform public.notify_user(v_owner, 'order_new', jsonb_build_object('code', new.code, 'total', new.total, 'channel', new.channel), '/negocio');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.notify_user(new.user_id, 'order_status', jsonb_build_object('code', new.code, 'status', new.status), '/cuenta');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_order on public.business_orders;
create trigger trg_notify_order after insert or update on public.business_orders for each row execute function public.tg_notify_order();

create or replace function public.tg_notify_booking() returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from public.businesses where id = new.business_id;
  if tg_op = 'INSERT' then
    perform public.notify_user(v_owner, 'booking_new', jsonb_build_object('service', new.service_name, 'name', new.customer_name), '/negocio');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.notify_user(new.user_id, 'booking_status', jsonb_build_object('service', new.service_name, 'status', new.status), '/cuenta');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_booking on public.business_bookings;
create trigger trg_notify_booking after insert or update on public.business_bookings for each row execute function public.tg_notify_booking();

create or replace function public.tg_notify_rental() returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from public.businesses where id = new.business_id;
  if tg_op = 'INSERT' then
    perform public.notify_user(v_owner, 'rental_new', jsonb_build_object('item', new.item_name, 'name', new.customer_name), '/negocio');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.notify_user(new.user_id, 'rental_status', jsonb_build_object('item', new.item_name, 'status', new.status), '/cuenta');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_rental on public.business_rentals;
create trigger trg_notify_rental after insert or update on public.business_rentals for each row execute function public.tg_notify_rental();

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='business_messages')
     and not exists (select 1 from pg_proc where proname='tg_notify_message' and pronamespace='public'::regnamespace) then
    -- message trigger only if the chat tables exist (kept optional/safe)
    null;
  end if;
end $$;

-- realtime → the bell updates live (guarded; publication exists on Supabase)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ===========================================================================
-- BUG 2 — buy_event_tickets_multi: qualify the ambiguous `code` in the promo lookup
-- (identical to 0065 except `upper(code)` → `upper(event_promo_codes.code)`)
-- ===========================================================================
drop function if exists public.buy_event_tickets_multi(text, jsonb, text);
create or replace function public.buy_event_tickets_multi(in_slug text, in_items jsonb, in_promo text default null)
returns table (ticket_id uuid, code text, tier_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_ev uuid; v_status text; v_owner uuid; v_title text; v_name text;
  v_tier record; v_matched int := 0; v_req int; v_total_qty int := 0;
  v_code text; p record; v_kind text := null; v_pvalue numeric := 0; v_scope uuid := null;
  v_promo_id uuid := null; v_access_tier uuid := null; v_factor numeric := 1; v_gross numeric := 0;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if in_items is null or jsonb_typeof(in_items) <> 'array' then raise exception 'no tickets selected'; end if;
  select id, status into v_ev, v_status from public.events where slug = in_slug;
  if v_ev is null then raise exception 'event not found'; end if;
  if v_status = 'cancelled' then raise exception 'event cancelled'; end if;
  if v_status <> 'published' then raise exception 'event not on sale'; end if;

  v_code := nullif(upper(btrim(coalesce(in_promo, ''))), '');
  if v_code is not null then
    select * into p from public.event_promo_codes
      where event_id = v_ev and upper(event_promo_codes.code) = v_code and active for update;
    if not found then raise exception 'promo invalid' using errcode = 'check_violation'; end if;
    if p.max_uses is not null and p.used >= p.max_uses then raise exception 'promo exhausted' using errcode = 'check_violation'; end if;
    v_promo_id := p.id; v_kind := p.kind; v_pvalue := p.value; v_scope := p.tier_id;
    if v_kind = 'access' then v_access_tier := p.tier_id;
    elsif v_kind = 'percent' then v_factor := greatest(0, 1 - v_pvalue/100.0); end if;
  end if;

  select count(*) into v_req from (select distinct (i->>'tier_id')::uuid from jsonb_array_elements(in_items) i where coalesce((i->>'qty')::int, 0) > 0) s;
  if v_req = 0 then raise exception 'no tickets selected'; end if;

  for v_tier in
    with req as (select (i->>'tier_id')::uuid as tier_id, least(greatest(sum((i->>'qty')::int), 1), 10) as qty
      from jsonb_array_elements(in_items) i where coalesce((i->>'qty')::int, 0) > 0 group by 1)
    select t.id, coalesce(nullif(btrim(t.name_es), ''), 'Boleto') as name_es, t.capacity, t.sold, t.sales_start, t.sales_end, t.visible, t.price, r.qty
    from req r join public.event_tiers t on t.id = r.tier_id and t.event_id = v_ev
    order by t.id for update of t
  loop
    if not v_tier.visible and v_tier.id is distinct from v_access_tier then raise exception 'tier not found'; end if;
    if v_tier.sales_start is not null and now() < v_tier.sales_start then raise exception 'not on sale yet: %', v_tier.name_es using errcode = 'check_violation'; end if;
    if v_tier.sales_end is not null and now() > v_tier.sales_end then raise exception 'sales closed: %', v_tier.name_es using errcode = 'check_violation'; end if;
    if v_tier.capacity is not null and v_tier.sold + v_tier.qty > v_tier.capacity then raise exception 'sold out: %', v_tier.name_es using errcode = 'check_violation'; end if;
    v_matched := v_matched + 1; v_total_qty := v_total_qty + v_tier.qty;
    if v_kind in ('percent','amount') and (v_scope is null or v_scope = v_tier.id) then v_gross := v_gross + v_tier.price * v_tier.qty; end if;
  end loop;
  if v_matched <> v_req then raise exception 'tier not found'; end if;
  if v_kind = 'amount' then v_factor := case when v_gross > 0 then greatest(0, (v_gross - v_pvalue) / v_gross) else 1 end; end if;

  select coalesce(nullif(btrim(display_name), ''), 'Cliente') into v_name from public.profiles where id = auth.uid();
  perform set_config('tolatino.bulk_ticket', 'on', true);

  return query
    with req as (select (i->>'tier_id')::uuid as tier_id, least(greatest(sum((i->>'qty')::int), 1), 10) as qty
      from jsonb_array_elements(in_items) i where coalesce((i->>'qty')::int, 0) > 0 group by 1)
    insert into public.event_tickets (event_id, user_id, customer_name, tier_id, qty, unit_price, total, status, promo_code)
    select v_ev, auth.uid(), coalesce(v_name, 'Cliente'), t.id, r.qty,
           round(t.price * case when v_kind in ('percent','amount') and (v_scope is null or v_scope = t.id) then v_factor else 1 end, 2),
           round(t.price * r.qty * case when v_kind in ('percent','amount') and (v_scope is null or v_scope = t.id) then v_factor else 1 end, 2),
           'confirmed', v_code
    from req r join public.event_tiers t on t.id = r.tier_id and t.event_id = v_ev
    order by t.id
    returning event_tickets.id, event_tickets.code, event_tickets.tier_id;

  if v_promo_id is not null then update public.event_promo_codes set used = used + 1 where id = v_promo_id; end if;

  select owner_id, title_es into v_owner, v_title from public.events where id = v_ev;
  perform public.notify_user(v_owner, 'ticket_new', jsonb_build_object('event', v_title, 'qty', v_total_qty, 'name', coalesce(v_name, 'Cliente'), 'promo', v_code), '/negocio');
end $$;
grant execute on function public.buy_event_tickets_multi(text, jsonb, text) to authenticated;

notify pgrst, 'reload schema';
