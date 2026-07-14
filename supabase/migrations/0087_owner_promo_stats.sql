-- 0087_owner_promo_stats.sql — real promo-redemption metrics for the owner's
-- Promociones hub. Counts the orders that actually used each promo CODE (stored on
-- business_orders.fulfillment->>'promo' by both the card and cash checkout paths)
-- in the last N days, for the caller's OWN business. Owner-scoped: SECURITY DEFINER
-- but only returns rows for a business owned by auth.uid(). Idempotent.
create or replace function public.owner_promo_stats(in_business uuid, in_days int default 7)
returns table(code text, redemptions bigint, revenue numeric)
language sql stable security definer set search_path = public as $fn$
  select upper(o.fulfillment->>'promo') as code,
         count(*)::bigint as redemptions,
         coalesce(sum(o.total), 0)::numeric as revenue
  from public.business_orders o
  join public.businesses b on b.id = o.business_id
  where o.business_id = in_business
    and b.owner_id = auth.uid()
    and o.status <> 'cancelled'
    and coalesce(nullif(o.fulfillment->>'promo', ''), '') <> ''
    and o.created_at > now() - ((greatest(in_days, 1))::text || ' days')::interval
  group by upper(o.fulfillment->>'promo');
$fn$;

grant execute on function public.owner_promo_stats(uuid, int) to authenticated;

notify pgrst, 'reload schema';
