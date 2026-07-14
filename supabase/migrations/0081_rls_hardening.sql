-- 0081_rls_hardening.sql — RLS/write-surface hardening from the 2026-07-14
-- security audit (H1 + H2). Idempotent, portable vanilla Postgres. No data
-- changes. Closes two privilege-escalation holes reachable by hitting PostgREST
-- directly (bypassing the app), while leaving every legitimate write path intact.

-- ── H1 · Protect sensitive `businesses` columns from direct owner writes ──────
-- The "update own business" policy (0013) is row-wide and Supabase grants
-- authenticated UPDATE on all columns, so an owner could PATCH their own row with
-- {"tier":"premium"} (unlock the paid tier + "verified" badge for free),
-- {"rating":5.0,"reviews_count":9999} (defeat the review-integrity trigger), or
-- flip Connect flags. The app never writes these columns (its WRITABLE whitelist
-- excludes them) — the restriction was only enforced client-side.
--
-- Guard by CURRENT_USER, not auth.role(): every LEGITIMATE writer of these columns
-- runs as a privileged role, so it passes —
--   · apply_subscription / apply_connect_status  → SECURITY DEFINER (owner=postgres)
--   · tg_sync_business_rating (rating/reviews_count) → SECURITY DEFINER (owner=postgres)
--   · the Stripe webhook                          → service_role
-- Only a direct end-user PostgREST write runs as 'authenticated'/'anon', and that
-- is exactly the path we block. (auth.role() would NOT work: it stays
-- 'authenticated' inside a SECURITY DEFINER RPC, so it would wrongly break review
-- posting, which fires the rating sync.)
create or replace function public.tg_businesses_guard_cols()
returns trigger language plpgsql as $fn$
begin
  if current_user in ('authenticated', 'anon') then
    if new.tier                     is distinct from old.tier
    or new.rating                   is distinct from old.rating
    or new.reviews_count            is distinct from old.reviews_count
    or new.owner_id                 is distinct from old.owner_id
    or new.stripe_account_id        is distinct from old.stripe_account_id
    or new.connect_charges_enabled  is distinct from old.connect_charges_enabled
    or new.connect_details_submitted is distinct from old.connect_details_submitted
    then
      raise exception 'no autorizado: columnas protegidas del negocio (tier/rating/connect/owner) solo cambian por el sistema';
    end if;
  end if;
  return new;
end $fn$;

drop trigger if exists businesses_guard_protected_cols on public.businesses;
create trigger businesses_guard_protected_cols
  before update on public.businesses
  for each row execute function public.tg_businesses_guard_cols();

-- ── H2 · Stop direct client creation/mutation of event_tickets ───────────────
-- event_tickets.status defaults 'confirmed' and code auto-generates, so the
-- direct INSERT policy let any user mint free confirmed tickets (unit_price=0,
-- arbitrary tier/qty), bypassing buy_event_tickets_multi — the ONLY place
-- capacity/price/oversell is enforced. The UPDATE policy likewise let a holder
-- rewrite their own ticket (e.g. reset used_at to re-use a scanned code).
-- Verified 2026-07-14: the app only READS event_tickets; every create/mutate path
-- is a SECURITY DEFINER RPC (buy_event_tickets[_multi], fulfill_event_tickets_multi,
-- checkin_ticket) that bypasses RLS. So dropping these two policies is safe and
-- non-breaking. The read policy (buyer + organizer) stays.
drop policy if exists "insert event_tickets" on public.event_tickets;
drop policy if exists "update event_tickets" on public.event_tickets;

notify pgrst, 'reload schema';
