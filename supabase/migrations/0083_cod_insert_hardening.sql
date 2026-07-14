-- 0083_cod_insert_hardening.sql — M1 (2026-07-14 security audit). The cash-on-
-- delivery insert policies for business_orders/bookings/rentals only checked
-- user_id = auth.uid(), so a customer hitting PostgREST directly could set an
-- arbitrary status (e.g. 'completed'), a nonsense total, and spam fake orders
-- into any business's dashboard. COD is paid in cash in person (the owner is the
-- backstop for the amount), so the real harms are status tampering + spam.
--
-- Fix, without changing the working client flow:
--   1. Tighten each customer INSERT with a `with check`: force the initial status
--      and bound the money columns. The OWNER branch (manual entry) is unchanged.
--   2. A per-user hourly rate-limit trigger caps how many a single customer can
--      create (anti-spam / griefing). Owner/service-role inserts are exempt.
-- Idempotent. Portable vanilla Postgres.

-- ── 1 · Tighten the customer INSERT checks ───────────────────────────────────
drop policy if exists "insert business_orders" on public.business_orders;
create policy "insert business_orders" on public.business_orders for insert with check (
  (user_id = auth.uid() and status = 'new' and coalesce(total, 0) between 0 and 100000)
  or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
);

drop policy if exists "insert business_bookings" on public.business_bookings;
create policy "insert business_bookings" on public.business_bookings for insert with check (
  (user_id = auth.uid() and status = 'pending' and coalesce(deposit, 0) between 0 and 100000)
  or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
);

drop policy if exists "insert business_rentals" on public.business_rentals;
create policy "insert business_rentals" on public.business_rentals for insert with check (
  (user_id = auth.uid() and status = 'pending'
     and coalesce(total, 0) between 0 and 100000 and coalesce(deposit, 0) between 0 and 100000)
  or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
);

-- ── 2 · Per-user hourly rate-limit (anti-spam) ───────────────────────────────
-- One function for all three tables (keyed off TG_TABLE_NAME). Only limits a
-- customer inserting their OWN rows via PostgREST; owner/service-role inserts are
-- exempt. MUST be SECURITY INVOKER: current_user has to reflect the CALLER
-- ('authenticated'), not the function owner — a SECURITY DEFINER function would
-- see current_user = postgres and skip the limit entirely. The count reads the
-- user's own rows, which RLS already allows, so invoker rights suffice.
create or replace function public.tg_cod_ratelimit() returns trigger
language plpgsql set search_path = public as $fn$
declare n int;
begin
  if current_user in ('authenticated', 'anon') and new.user_id = auth.uid() then
    execute format('select count(*) from public.%I where user_id = $1 and created_at > now() - interval ''1 hour''', tg_table_name)
      into n using new.user_id;
    if n >= 30 then
      raise exception 'demasiados pedidos en poco tiempo — espera un momento e intenta de nuevo';
    end if;
  end if;
  return new;
end $fn$;

drop trigger if exists cod_ratelimit on public.business_orders;
create trigger cod_ratelimit before insert on public.business_orders
  for each row execute function public.tg_cod_ratelimit();
drop trigger if exists cod_ratelimit on public.business_bookings;
create trigger cod_ratelimit before insert on public.business_bookings
  for each row execute function public.tg_cod_ratelimit();
drop trigger if exists cod_ratelimit on public.business_rentals;
create trigger cod_ratelimit before insert on public.business_rentals
  for each row execute function public.tg_cod_ratelimit();

-- ── 3 · Index the rate-limit / "my activity" lookups ─────────────────────────
create index if not exists business_orders_user_idx   on public.business_orders   (user_id, created_at desc);
create index if not exists business_bookings_user_idx  on public.business_bookings (user_id, created_at desc);
create index if not exists business_rentals_user_idx   on public.business_rentals  (user_id, created_at desc);

notify pgrst, 'reload schema';
