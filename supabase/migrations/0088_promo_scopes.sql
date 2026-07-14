-- 0088_promo_scopes.sql — Fase 2 of the Promociones hub: services & rentals now
-- carry promo codes too, so promo validation + redemption metrics must cover all
-- three "book/rent/order" stores (menu_config.promos, service_config.promos,
-- rental_config.promos). The business ALWAYS funds its own promo — the platform
-- never does. Idempotent, portable vanilla Postgres.

-- 1) check_promo gains an `in_scope` argument so the cart/booking/rental sheets ask
--    the RIGHT store. A redeemable promo is an ACTIVE `percent` promo with a
--    non-empty `code` whose `minOrder` the subtotal meets. Default scope 'menu'
--    keeps every existing caller working. We DROP the old 3-arg overload first so
--    PostgREST resolves unambiguously.
drop function if exists public.check_promo(text, text, numeric);
create or replace function public.check_promo(
  in_slug text, in_code text, in_subtotal numeric, in_scope text default 'menu'
)
returns table(ok boolean, percent numeric, discount numeric, label text)
language sql stable security definer set search_path = public as $fn$
  with cfg as (
    select case lower(coalesce(in_scope, 'menu'))
             when 'service' then b.service_config->'promos'
             when 'rental'  then b.rental_config->'promos'
             else b.menu_config->'promos'
           end as arr
    from public.businesses b
    where b.slug = in_slug
  ),
  hit as (
    select pr
    from cfg,
         lateral jsonb_array_elements(coalesce(cfg.arr, '[]'::jsonb)) as pr
    where pr->>'status' = 'active'
      and pr->>'type' = 'percent'
      and coalesce(nullif(btrim(pr->>'code'), ''), '') <> ''
      and upper(btrim(pr->>'code')) = upper(btrim(coalesce(in_code, '')))
      and coalesce((pr->>'value')::numeric, 0) > 0
      and coalesce(in_subtotal, 0) >= coalesce((pr->>'minOrder')::numeric, 0)
    limit 1
  )
  select
    (select count(*) from hit) > 0,
    coalesce((select (pr->>'value')::numeric from hit), 0),
    -- discount is % of subtotal, never more than the subtotal itself
    least(coalesce(in_subtotal, 0),
          round(coalesce((select (pr->>'value')::numeric from hit), 0) * coalesce(in_subtotal, 0) / 100, 2)),
    (select coalesce(nullif(pr->>'es', ''), pr->>'code') from hit);
$fn$;

grant execute on function public.check_promo(text, text, numeric, text) to anon, authenticated;

-- 2) owner_promo_stats now UNIONs the two places a redeemed code lands:
--      · business_orders.fulfillment->>'promo'  — menu/shop orders (card + cash)
--      · pending_purchases.payload->>'promo'    — booking/rental deposits (online,
--        fulfilled). Bookings/rentals have no per-code column of their own, so the
--        staged purchase (which persists the payload) is the authoritative source.
--    Owner-scoped: SECURITY DEFINER but only counts a business owned by auth.uid().
create or replace function public.owner_promo_stats(in_business uuid, in_days int default 7)
returns table(code text, redemptions bigint, revenue numeric)
language sql stable security definer set search_path = public as $fn$
  with owned as (
    select b.id
    from public.businesses b
    where b.id = in_business and b.owner_id = auth.uid()
  ),
  rows as (
    -- Menu / shop orders (card + cash) carry the code on fulfillment.promo.
    select upper(o.fulfillment->>'promo') as code, o.total::numeric as revenue
    from public.business_orders o
    join owned on owned.id = o.business_id
    where o.status <> 'cancelled'
      and coalesce(nullif(o.fulfillment->>'promo', ''), '') <> ''
      and o.created_at > now() - ((greatest(in_days, 1))::text || ' days')::interval
    union all
    -- Booking / rental deposits paid online carry the code on payload.promo.
    select upper(pp.payload->>'promo') as code, (pp.subtotal::numeric / 100) as revenue
    from public.pending_purchases pp
    join owned on owned.id = pp.business_id
    where pp.kind in ('booking', 'rental')
      and pp.status = 'fulfilled'
      and coalesce(nullif(pp.payload->>'promo', ''), '') <> ''
      and pp.created_at > now() - ((greatest(in_days, 1))::text || ' days')::interval
  )
  select code, count(*)::bigint as redemptions, coalesce(sum(revenue), 0)::numeric as revenue
  from rows
  group by code;
$fn$;

grant execute on function public.owner_promo_stats(uuid, int) to authenticated;

notify pgrst, 'reload schema';
