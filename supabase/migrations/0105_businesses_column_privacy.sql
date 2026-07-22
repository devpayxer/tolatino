-- 0105_businesses_column_privacy.sql
-- Lock down the businesses table. Direct reads were world-open (policy
-- using(true)), so anyone with the public anon key could read every row via
-- PostgREST — leaking stripe_account_id, settings (driver phones),
-- menu/service/product/rental_config (promo codes) and owner_id. Now direct table
-- reads are OWNER-ONLY; the public discovery/detail surfaces read through
-- SECURITY DEFINER RPCs that return only safe, curated columns. Idempotent.
-- Apply: node scripts/sbsql.mjs --file supabase/migrations/0105_businesses_column_privacy.sql

-- 1) The public-read + validation functions that touch businesses must keep
--    working once the row policy is owner-only → run them as DEFINER (they only
--    ever RETURN safe columns / shaped objects; verified column-by-column).
do $$
declare r record;
begin
  for r in
    select oid::regprocedure::text as sig
    from pg_proc
    where pronamespace = 'public'::regnamespace and prokind = 'f'
      and proname in (
        'business_by_slug','business_menu_by_slug','business_photos_by_slug',
        'business_products_by_slug','business_rentals_by_slug','business_services_by_slug',
        'businesses_v2','delivery_range_check','search_businesses',
        'tg_rental_order_guard','tg_txn_customer_update_guard')
  loop
    execute 'alter function ' || r.sig || ' security definer';
    execute 'alter function ' || r.sig || ' set search_path = public';
  end loop;
end $$;

-- 2) Restrict direct table reads to the owner. Everyone else uses the RPCs above.
drop policy if exists "public read businesses" on public.businesses;
create policy "owner reads own business" on public.businesses
  for select using (auth.uid() = owner_id);

notify pgrst, 'reload schema';
