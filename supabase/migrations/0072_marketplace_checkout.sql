-- 0072_marketplace_checkout.sql — REAL marketplace checkout via Stripe Connect
-- (destination charges). For a goods value P the buyer is charged P×1.05, the
-- platform keeps 15% of P as the Stripe application fee, and the seller's connected
-- account receives P×0.90. Purchases are STAGED here, charged on Stripe's hosted
-- page, then FULFILLED by the payments webhook — so money moving and the order/
-- tickets being created are always consistent (never one without the other).
-- Idempotent. Portable vanilla Postgres (Stripe ids are just text).
--
--  · business_by_slug / event_by_slug gain `accepts_payments` so the client knows
--    whether to offer "Pagar ahora" (online card) vs pay-on-pickup / free.
--  · pending_purchases stages a purchase (buyer, amounts, payload) before charging.
--  · fulfill_order()            — service_role: create the paid order (fires CRM + notify).
--  · _issue_tickets_multi()     — shared ticket-issuance core (was inline in the RPC).
--  · buy_event_tickets_multi()  — now delegates to the core (auth.uid() buyer).
--  · fulfill_event_tickets_multi() — service_role: issue tickets for an explicit buyer.

-- ── 1) Expose "accepts online payments" on the public reads ──────────────────
-- (connect_charges_enabled is safe to read publicly: it only says "can pay online".)

drop function if exists public.business_by_slug(text);
create function public.business_by_slug(in_slug text)
returns table(
  slug text, name text, category_id text, rating numeric, reviews_count integer,
  price_level text, is_open boolean, tier text, endorse_count integer, tile_a text, tile_b text,
  specialty_es text, specialty_en text, subcategories text[], features text[], card_features text[],
  hours jsonb, hours_exceptions jsonb, amenities_es text[], amenities_en text[],
  review_es text, review_en text, phone text, address text, city text, website text, logo_url text,
  accepts_messages boolean, message_channel text, message_phone text, about_es text, about_en text,
  distance_m double precision, modules jsonb, accepts_payments boolean
) language sql stable as $function$
  select b.slug, b.name, b.category_id,
         b.rating, b.reviews_count,
         b.price_level, b.is_open, b.tier,
         b.endorse_count, b.tile_a, b.tile_b,
         b.specialty_es, b.specialty_en,
         b.subcategories,
         b.features, b.card_features,
         b.hours, b.hours_exceptions,
         (select coalesce(array_agg(a.name_es order by a.id), '{}')
            from public.business_amenities ba join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = b.id),
         (select coalesce(array_agg(a.name_en order by a.id), '{}')
            from public.business_amenities ba join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = b.id),
         (select r.body_es from public.reviews r where r.business_id = b.id and r.featured order by r.created_at desc limit 1),
         (select r.body_en from public.reviews r where r.business_id = b.id and r.featured order by r.created_at desc limit 1),
         b.phone, b.address, b.city, b.website, b.logo_url,
         b.accepts_messages, b.message_channel, b.message_phone,
         b.about_es, b.about_en,
         null::double precision,
         b.modules,
         coalesce(b.connect_charges_enabled, false)
  from public.businesses b
  where b.slug = in_slug
  limit 1;
$function$;

drop function if exists public.event_by_slug(text);
create function public.event_by_slug(in_slug text)
returns table(
  slug text, title_es text, title_en text, venue_es text, venue_en text, cat text, city text,
  starts_at timestamptz, ends_at timestamptz, time_label_es text, time_label_en text, price_label text,
  desc_es text, desc_en text, tile_a text, tile_b text, cover_url text, status text, going_count integer,
  lat double precision, lng double precision, organizer text, organizer_slug text, tiers jsonb,
  accepts_payments boolean
) language sql stable security definer set search_path = public as $function$
  select e.slug, e.title_es, e.title_en, e.venue_es, e.venue_en, e.cat, e.city, e.starts_at, e.ends_at,
         e.time_label_es, e.time_label_en, e.price_label, e.desc_es, e.desc_en, e.tile_a, e.tile_b, e.cover_url,
         e.status, e.going_count,
         case when e.location is not null then st_y(e.location::geometry) end,
         case when e.location is not null then st_x(e.location::geometry) end,
         coalesce((select b.name from public.businesses b where b.owner_id = e.owner_id order by b.created_at limit 1),
           (select p.display_name from public.profiles p where p.id = e.owner_id), 'Organizador'),
         (select b.slug from public.businesses b where b.owner_id = e.owner_id order by b.created_at limit 1),
         coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name_es', t.name_es, 'name_en', t.name_en,
             'price', t.price, 'capacity', t.capacity, 'sold', t.sold,
             'remaining', case when t.capacity is null then null else greatest(0, t.capacity - t.sold) end,
             'sales_start', t.sales_start, 'sales_end', t.sales_end) order by t.sort, t.created_at)
           from public.event_tiers t where t.event_id = e.id and t.visible), '[]'::jsonb),
         exists(select 1 from public.businesses b
                 where b.owner_id = e.owner_id and coalesce(b.connect_charges_enabled, false)
                   and b.stripe_account_id is not null)
  from public.events e where e.slug = in_slug and e.status <> 'draft' limit 1;
$function$;

-- ── 2) pending_purchases — staged purchase awaiting payment ──────────────────
create table if not exists public.pending_purchases (
  id                     uuid primary key default gen_random_uuid(),
  buyer_id               uuid not null references auth.users(id) on delete cascade,
  business_id            uuid references public.businesses(id) on delete set null,
  seller_account         text,             -- connected account (snapshot at checkout)
  kind                   text not null,    -- 'order' | 'ticket'
  ref                    text,             -- business slug / event slug
  payload                jsonb not null default '{}'::jsonb,
  subtotal               integer not null, -- cents (goods value P)
  amount                 integer not null, -- cents the buyer is charged (P×1.05)
  application_fee        integer not null, -- cents the platform keeps (P×0.15)
  currency               text not null default 'usd',
  stripe_session         text,
  stripe_payment_intent  text,
  status                 text not null default 'pending', -- pending|fulfilled|failed|refunded
  result                 jsonb,            -- order code / ticket codes on success
  error                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists pending_purchases_session_idx on public.pending_purchases (stripe_session);
create index if not exists pending_purchases_buyer_idx on public.pending_purchases (buyer_id, created_at desc);

alter table public.pending_purchases enable row level security;
drop policy if exists "buyer reads own pending" on public.pending_purchases;
create policy "buyer reads own pending" on public.pending_purchases for select using (buyer_id = auth.uid());
-- All writes are done by Edge Functions with the service role (bypasses RLS); no
-- insert/update policy is granted to anon/authenticated on purpose.

-- ── 3) fulfill_order — create the paid order (service_role) ───────────────────
-- Mirrors a normal order insert so the CRM (trg_order_customer) + owner
-- notification (trg_notify_order) fire exactly as for a pay-on-pickup order.
create or replace function public.fulfill_order(
  in_buyer uuid, in_business uuid, in_items jsonb, in_total numeric, in_channel text
) returns table(id uuid, code text)
language plpgsql security definer set search_path = public as $fn$
declare v_name text; v_id uuid; v_code text;
begin
  select coalesce(nullif(btrim(p.display_name), ''), 'Cliente') into v_name from public.profiles p where p.id = in_buyer;
  v_id := gen_random_uuid();
  v_code := 'TL-' || upper(substr(replace(v_id::text, '-', ''), 1, 6));
  insert into public.business_orders (id, business_id, user_id, customer_name, items, total, channel, status, code)
  values (v_id, in_business, in_buyer, coalesce(v_name, 'Cliente'), coalesce(in_items, '[]'::jsonb), in_total, coalesce(in_channel, 'pickup'), 'new', v_code);
  id := v_id; code := v_code; return next;
end $fn$;
revoke execute on function public.fulfill_order(uuid, uuid, jsonb, numeric, text) from public;
grant execute on function public.fulfill_order(uuid, uuid, jsonb, numeric, text) to service_role;

-- ── 4) ticket issuance core + wrappers ───────────────────────────────────────
-- Shared core: same capacity/promo logic as before, but keyed on an explicit
-- buyer so it can run both under a user's JWT (buy) and the service role (fulfill
-- after payment). SECURITY DEFINER; the wrappers gate who may pass which buyer.
create or replace function public._issue_tickets_multi(
  in_buyer uuid, in_slug text, in_items jsonb, in_promo text
) returns table(ticket_id uuid, code text, tier_id uuid)
language plpgsql security definer set search_path = public as $fn$
declare
  v_ev uuid; v_status text; v_owner uuid; v_title text; v_name text;
  v_tier record; v_matched int := 0; v_req int; v_total_qty int := 0;
  v_code text; p record; v_kind text := null; v_pvalue numeric := 0; v_scope uuid := null;
  v_promo_id uuid := null; v_access_tier uuid := null; v_factor numeric := 1; v_gross numeric := 0;
begin
  if in_buyer is null then raise exception 'auth required'; end if;
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

  select coalesce(nullif(btrim(display_name), ''), 'Cliente') into v_name from public.profiles where id = in_buyer;
  perform set_config('tolatino.bulk_ticket', 'on', true);

  return query
    with req as (select (i->>'tier_id')::uuid as tier_id, least(greatest(sum((i->>'qty')::int), 1), 10) as qty
      from jsonb_array_elements(in_items) i where coalesce((i->>'qty')::int, 0) > 0 group by 1)
    insert into public.event_tickets (event_id, user_id, customer_name, tier_id, qty, unit_price, total, status, promo_code)
    select v_ev, in_buyer, coalesce(v_name, 'Cliente'), t.id, r.qty,
           round(t.price * case when v_kind in ('percent','amount') and (v_scope is null or v_scope = t.id) then v_factor else 1 end, 2),
           round(t.price * r.qty * case when v_kind in ('percent','amount') and (v_scope is null or v_scope = t.id) then v_factor else 1 end, 2),
           'confirmed', v_code
    from req r join public.event_tiers t on t.id = r.tier_id and t.event_id = v_ev
    order by t.id
    returning event_tickets.id, event_tickets.code, event_tickets.tier_id;

  if v_promo_id is not null then update public.event_promo_codes set used = used + 1 where id = v_promo_id; end if;

  select owner_id, title_es into v_owner, v_title from public.events where id = v_ev;
  perform public.notify_user(v_owner, 'ticket_new', jsonb_build_object('event', v_title, 'qty', v_total_qty, 'name', coalesce(v_name, 'Cliente'), 'promo', v_code), '/negocio');
end $fn$;
revoke execute on function public._issue_tickets_multi(uuid, text, jsonb, text) from public;

-- Buyer-facing wrapper (unchanged signature): the caller is the buyer via auth.uid().
create or replace function public.buy_event_tickets_multi(in_slug text, in_items jsonb, in_promo text default null)
returns table(ticket_id uuid, code text, tier_id uuid)
language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  return query select * from public._issue_tickets_multi(auth.uid(), in_slug, in_items, in_promo);
end $fn$;

-- Service wrapper: issue tickets for a buyer paid via Stripe (called by the webhook).
create or replace function public.fulfill_event_tickets_multi(
  in_buyer uuid, in_slug text, in_items jsonb, in_promo text default null
) returns table(ticket_id uuid, code text, tier_id uuid)
language plpgsql security definer set search_path = public as $fn$
begin
  return query select * from public._issue_tickets_multi(in_buyer, in_slug, in_items, in_promo);
end $fn$;
revoke execute on function public.fulfill_event_tickets_multi(uuid, text, jsonb, text) from public;
grant execute on function public.fulfill_event_tickets_multi(uuid, text, jsonb, text) to service_role;

notify pgrst, 'reload schema';
