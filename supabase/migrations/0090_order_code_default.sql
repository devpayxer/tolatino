-- 0090_order_code_default.sql — every order gets a TL-XXXXXX code at the DB level.
-- Paid orders already get one from fulfill_order; cash/pickup orders (direct client
-- insert) landed with code NULL, so the client confirmation + Cocina showed no
-- order number. A column default fixes every current and future insert path.
-- Idempotent. Paste into the Supabase SQL Editor + Run.

alter table public.business_orders
  alter column code set default ('TL-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)));

-- Backfill the cash orders that already exist without a code (deterministic per id).
update public.business_orders
  set code = 'TL-' || upper(substr(md5(id::text), 1, 6))
  where code is null;

notify pgrst, 'reload schema';
