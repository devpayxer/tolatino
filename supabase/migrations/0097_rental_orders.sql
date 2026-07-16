-- 0097_rental_orders.sql — Rental CART: one order, many items (party-rental model,
-- benchmark Turo / event rentals). Until now a rental was one business_rentals row =
-- one item. This adds an ORDER HEADER so a customer can rent several items
-- (mesas + sillas + carpa) for ONE event date range in a single order, with a
-- combined fee + refundable deposit, one status lifecycle, one notification.
--
--   business_rental_orders — the header (customer, date range, status, totals, extras)
--   business_rentals       — now line items, tied to an order via order_id
--
-- Payment mirrors the canonical rule: a business WITHOUT Stripe rents pay-at-pickup
-- (create_rental_order), the refundable deposit is collected at pickup. Approval mode
-- (rental_config.autoConfirm) works like Servicios 0095 — the order lands 'confirmed'
-- (auto) or 'pending' (manual, owner approves). Idempotent. Vanilla Postgres.

-- ── 1 · Order header ─────────────────────────────────────────────────────────
create table if not exists public.business_rental_orders (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  customer_name text,
  start_at      timestamptz not null,
  end_at        timestamptz,
  status        text not null default 'pending'
                  check (status in ('pending','confirmed','out','returned','cancelled')),
  fee_total     numeric,
  deposit_total numeric,
  extras        jsonb,          -- order-level extras (delivery, setup…): [{name, price}]
  notes         text,
  created_at    timestamptz not null default now()
);
create index if not exists bro_biz_idx  on public.business_rental_orders (business_id, start_at desc);
create index if not exists bro_user_idx on public.business_rental_orders (user_id, created_at desc);

-- ── 2 · Line items point at their order ──────────────────────────────────────
alter table public.business_rentals add column if not exists order_id uuid
  references public.business_rental_orders(id) on delete cascade;
create index if not exists business_rentals_order_idx on public.business_rentals (order_id);

-- ── 3 · RLS on the header (RPC-only insert; owner/customer read; guarded update) ──
alter table public.business_rental_orders enable row level security;
drop policy if exists "read own or owned rental order" on public.business_rental_orders;
create policy "read own or owned rental order" on public.business_rental_orders for select
  using (user_id = auth.uid()
         or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
drop policy if exists "update own or owned rental order" on public.business_rental_orders;
create policy "update own or owned rental order" on public.business_rental_orders for update
  using (user_id = auth.uid()
         or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
-- no INSERT policy → only the SECURITY DEFINER RPC / webhook fulfiller can create orders.

-- Customer may only CANCEL (never edit money/dates); the owner can advance freely.
create or replace function public.tg_rental_order_guard() returns trigger
language plpgsql set search_path = public as $fn$
begin
  if current_user in ('authenticated','anon')
     and old.user_id = auth.uid()
     and not exists (select 1 from public.businesses b where b.id = old.business_id and b.owner_id = auth.uid())
  then
    if new.status is distinct from old.status and new.status <> 'cancelled' then
      raise exception 'solo puedes cancelar tu renta';
    end if;
    if new.fee_total is distinct from old.fee_total
       or new.deposit_total is distinct from old.deposit_total
       or new.business_id is distinct from old.business_id
       or new.user_id is distinct from old.user_id then
      raise exception 'no autorizado';
    end if;
  end if;
  return new;
end $fn$;
drop trigger if exists rental_order_guard on public.business_rental_orders;
create trigger rental_order_guard before update on public.business_rental_orders
  for each row execute function public.tg_rental_order_guard();

-- ── 4 · Create a rental order (pay-at-pickup) — the customer cart checkout ────
-- in_lines : [{item_id uuid|null, item_name text, qty int, fee numeric, deposit numeric}]
-- in_extras: [{name text, price numeric}]  (order-level; folded into fee_total)
-- Status is decided SERVER-SIDE from the business's approval mode, so a customer
-- can never self-confirm on a manual business. Totals are bounded (settled at
-- pickup, the owner confirms). Returns the new order id.
create or replace function public.create_rental_order(
  in_slug text, in_start_at timestamptz, in_end_at timestamptz,
  in_lines jsonb, in_extras jsonb default '[]', in_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $fn$
declare
  v_biz uuid; v_owner uuid; v_auto boolean; v_name text;
  v_fee numeric := 0; v_dep numeric := 0; v_extra numeric := 0;
  v_status text; v_order uuid; ln jsonb;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if in_lines is null or jsonb_array_length(in_lines) = 0 then raise exception 'empty cart'; end if;
  select id, owner_id, (rental_config->>'autoConfirm')::boolean
    into v_biz, v_owner, v_auto
    from public.businesses where slug = in_slug limit 1;
  if v_biz is null then raise exception 'business not found'; end if;

  select coalesce(sum(greatest((l->>'fee')::numeric, 0)), 0),
         coalesce(sum(greatest((l->>'deposit')::numeric, 0)), 0)
    into v_fee, v_dep
    from jsonb_array_elements(in_lines) l;
  select coalesce(sum(greatest((e->>'price')::numeric, 0)), 0) into v_extra
    from jsonb_array_elements(coalesce(in_extras, '[]')) e;
  v_fee := least(v_fee + v_extra, 1000000);
  v_dep := least(v_dep, 1000000);

  select coalesce(nullif(btrim(display_name), ''), 'Cliente') into v_name
    from public.profiles where id = auth.uid();
  v_name := coalesce(v_name, 'Cliente');

  -- owner walk-in → confirmed; customer → derived from approval mode
  if auth.uid() = v_owner then v_status := 'confirmed';
  else v_status := case when coalesce(v_auto, false) then 'confirmed' else 'pending' end;
  end if;

  insert into public.business_rental_orders
    (business_id, user_id, customer_name, start_at, end_at, status, fee_total, deposit_total, extras, notes)
  values (v_biz, auth.uid(), v_name, in_start_at, in_end_at, v_status, v_fee, v_dep,
          nullif(in_extras, '[]'::jsonb), nullif(btrim(in_notes), ''))
  returning id into v_order;

  for ln in select * from jsonb_array_elements(in_lines) loop
    insert into public.business_rentals
      (order_id, business_id, user_id, customer_name, item_name, item_id, start_at, end_at, qty, total, deposit, status)
    values (v_order, v_biz, auth.uid(), v_name,
            coalesce(ln->>'item_name', 'Artículo'),
            nullif(ln->>'item_id','')::uuid,
            in_start_at, in_end_at,
            greatest(coalesce((ln->>'qty')::int, 1), 1),
            greatest(coalesce((ln->>'fee')::numeric, 0), 0),
            greatest(coalesce((ln->>'deposit')::numeric, 0), 0),
            v_status);
  end loop;

  -- notify the owner now that the lines exist (skip the owner's own walk-ins)
  if v_owner is not null and auth.uid() <> v_owner then
    perform public.notify_user(v_owner, 'rental_new',
      jsonb_build_object('item', coalesce(in_lines->0->>'item_name', 'Renta'),
                         'name', v_name, 'count', jsonb_array_length(in_lines),
                         'status', v_status), '/negocio');
  end if;
  return v_order;
end $fn$;
grant execute on function public.create_rental_order(text, timestamptz, timestamptz, jsonb, jsonb, text) to authenticated;

-- ── 5 · Online fulfiller (Stripe webhook, service_role) — same shape, confirmed ──
create or replace function public.fulfill_rental_order(
  in_buyer uuid, in_business uuid, in_start_at timestamptz, in_end_at timestamptz,
  in_lines jsonb, in_extras jsonb, in_fee numeric, in_deposit numeric
) returns uuid
language plpgsql security definer set search_path = public as $fn$
declare v_name text; v_order uuid; ln jsonb;
begin
  select coalesce(nullif(btrim(display_name), ''), 'Cliente') into v_name
    from public.profiles where id = in_buyer;
  insert into public.business_rental_orders
    (business_id, user_id, customer_name, start_at, end_at, status, fee_total, deposit_total, extras)
  values (in_business, in_buyer, coalesce(v_name,'Cliente'), in_start_at, in_end_at, 'confirmed',
          in_fee, in_deposit, nullif(in_extras, '[]'::jsonb))
  returning id into v_order;
  for ln in select * from jsonb_array_elements(in_lines) loop
    insert into public.business_rentals
      (order_id, business_id, user_id, customer_name, item_name, item_id, start_at, end_at, qty, total, deposit, status)
    values (v_order, in_business, in_buyer, coalesce(v_name,'Cliente'),
            coalesce(ln->>'item_name','Artículo'), nullif(ln->>'item_id','')::uuid,
            in_start_at, in_end_at, greatest(coalesce((ln->>'qty')::int,1),1),
            greatest(coalesce((ln->>'fee')::numeric,0),0),
            greatest(coalesce((ln->>'deposit')::numeric,0),0), 'confirmed');
  end loop;
  perform public.notify_user(
    (select owner_id from public.businesses where id = in_business), 'rental_new',
    jsonb_build_object('item', coalesce(in_lines->0->>'item_name','Renta'),
                       'name', coalesce(v_name,'Cliente'), 'count', jsonb_array_length(in_lines),
                       'status', 'confirmed'), '/negocio');
  return v_order;
end $fn$;
revoke all on function public.fulfill_rental_order(uuid, uuid, timestamptz, timestamptz, jsonb, jsonb, numeric, numeric) from public, anon, authenticated;
grant execute on function public.fulfill_rental_order(uuid, uuid, timestamptz, timestamptz, jsonb, jsonb, numeric, numeric) to service_role;

-- ── 6 · Notify per ORDER (one message, not per line) ─────────────────────────
-- Drop the legacy per-row trigger so a multi-item cart doesn't spam N notifications.
drop trigger if exists trg_notify_rental on public.business_rentals;

-- Owner is notified on order creation from inside the RPC/fulfiller (the lines
-- exist by then). This trigger only tells the CUSTOMER when the owner advances
-- the order's status (confirmed → out → returned / cancelled).
create or replace function public.tg_notify_rental_order() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare v_item text;
begin
  if new.status is distinct from old.status
     and new.user_id is not null
     and (auth.uid() is null or auth.uid() <> new.user_id) then
    select item_name into v_item from public.business_rentals where order_id = new.id limit 1;
    perform public.notify_user(new.user_id, 'rental_status',
      jsonb_build_object('item', coalesce(v_item, 'Renta'), 'status', new.status), '/cuenta');
  end if;
  return new;
end $fn$;
drop trigger if exists notify_rental_order on public.business_rental_orders;
create trigger notify_rental_order after update of status
  on public.business_rental_orders for each row execute function public.tg_notify_rental_order();

-- keep line status in sync with the order so availability + any legacy reads agree
create or replace function public.tg_rental_lines_sync() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if new.status is distinct from old.status then
    update public.business_rentals set status = new.status where order_id = new.id;
  end if;
  return new;
end $fn$;
drop trigger if exists rental_lines_sync on public.business_rental_orders;
create trigger rental_lines_sync after update of status
  on public.business_rental_orders for each row execute function public.tg_rental_lines_sync();

-- ── 7 · Availability counts line qty from ACTIVE orders (or legacy rows) ──────
create or replace function public.rental_busy_by_item(in_item_id uuid)
returns table (starts date, ends date, qty int)
language sql stable security definer set search_path = public as $$
  select r.start_at::date, coalesce(r.end_at, r.start_at)::date, greatest(coalesce(r.qty, 1), 1)
  from public.business_rentals r
  left join public.business_rental_orders o on o.id = r.order_id
  where r.item_id = in_item_id
    and coalesce(o.status, r.status) in ('pending','confirmed','out');
$$;
grant execute on function public.rental_busy_by_item(uuid) to anon, authenticated;

-- ── 8 · Realtime for live owner/customer order updates ───────────────────────
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='business_rental_orders') then
    alter publication supabase_realtime add table public.business_rental_orders;
  end if;
end $$;

notify pgrst, 'reload schema';
