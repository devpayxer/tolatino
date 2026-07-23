-- 0116_events_audit_hardening.sql
-- Hardening from the 2026-07-23 Events audit. Five backend fixes, all idempotent:
--
--  M2 — Payment gate ignored REQUIRED paid add-ons: a $0 seated tier carrying a
--       required $200 package (nightclub bottle-service case) went through the
--       FREE rpc, issuing a confirmed ticket with an unpaid mandatory package.
--       Fix: fold ANY resolved paid add-on into the gate — money + paying org →
--       online path forced. (buy_event_tickets_multi.)
--
--  M3 — event_reviews accepted DIRECT PostgREST inserts (RLS only checked
--       user_id); the "must hold a ticket" attendee gate lived ONLY in the
--       post_event_review RPC, so any authed user could fake-rate any event.
--       Fix: drop the direct insert/update policies; force all writes through the
--       SECURITY DEFINER RPC (which still works — definer bypasses RLS).
--
--  M5/M10 — Refunding a ticket freed tier inventory (sold recomputes) but the
--       seat stayed permanently marked taken on the map. Fix: trigger releases
--       event_seat_claims when a ticket goes to 'refunded'.
--
--  SEC-1 — event_seat_claims public SELECT exposed buyer user_id per seat. The
--       client only ever calls seat_claims_by_slug (returns seat only). Fix: drop
--       the table's public read; rely on the RPC.
--
--  SEC-2 — events public SELECT (using true) exposed DRAFT rows via direct
--       PostgREST (event_by_slug 404s drafts, but the table didn't). Fix: scope
--       the read policy to non-draft OR owner.
--
-- Apply: node scripts/sbsql.mjs --file supabase/migrations/0116_events_audit_hardening.sql

-- ── M2: payment gate folds in required/paid add-ons ──────────────────────────
create or replace function public.buy_event_tickets_multi(
  in_slug text, in_items jsonb, in_promo text default null, in_seats jsonb default null, in_addon_ids text[] default null
) returns table(ticket_id uuid, code text, tier_id uuid)
language plpgsql security definer set search_path = public as $fn$
declare v_ev uuid; v_pays boolean; v_paid boolean; v_seated boolean; v_addons jsonb; v_addon_paid boolean;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select e.id, exists (select 1 from public.businesses b where b.owner_id = e.owner_id and coalesce(b.connect_charges_enabled, false))
    into v_ev, v_pays from public.events e where e.slug = in_slug limit 1;
  if v_ev is null then raise exception 'event not found'; end if;
  -- does any requested tier carry a price?
  select exists (select 1 from jsonb_array_elements(in_items) it
    join public.event_tiers t on t.id = coalesce(it->>'tier_id', it->>'tierId')::uuid
    where coalesce((it->>'qty')::int, 0) > 0 and coalesce(t.price, 0) > 0) into v_paid;
  -- does any requested tier require a seat/table? (scopes seated-only add-ons)
  select exists (select 1 from jsonb_array_elements(in_items) it
    join public.event_tiers t on t.id = coalesce(it->>'tier_id', it->>'tierId')::uuid
    where coalesce((it->>'qty')::int, 0) > 0 and coalesce(t.seat, false)) into v_seated;
  -- resolve the applicable add-ons (required always + optional by id) and see if
  -- any of them carries a price. A paid add-on is money owed just like a tier.
  v_addons := public.resolve_event_addons(v_ev, v_seated, in_addon_ids);
  select coalesce(sum(round((a->>'price')::numeric, 2)), 0) > 0
    from jsonb_array_elements(coalesce(v_addons, '[]'::jsonb)) a into v_addon_paid;
  -- ANY money owed on a Stripe-enabled organizer must go through online checkout.
  if (v_paid or v_addon_paid) and v_pays then
    raise exception 'payment required' using errcode = 'check_violation';
  end if;
  return query select * from public._issue_tickets_multi(auth.uid(), in_slug, in_items, in_promo, in_seats, v_addons);
end $fn$;
grant execute on function public.buy_event_tickets_multi(text, jsonb, text, jsonb, text[]) to authenticated;

-- ── M3: event_reviews — no direct client writes; RPC is the only author ───────
-- post_event_review (SECURITY DEFINER) still inserts; definer bypasses RLS.
drop policy if exists "own insert event review" on public.event_reviews;
drop policy if exists "own update event review" on public.event_reviews;
-- (public read + own-delete stay; delete of your own review is harmless.)

-- ── M5/M10: release the seat when a ticket is refunded ───────────────────────
create or replace function public.tg_release_seat_on_refund() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if new.status = 'refunded' and coalesce(old.status, '') is distinct from new.status then
    delete from public.event_seat_claims where ticket_id = new.id;
  end if;
  return new;
end $fn$;
drop trigger if exists release_seat_on_refund on public.event_tickets;
create trigger release_seat_on_refund after update of status on public.event_tickets
  for each row execute function public.tg_release_seat_on_refund();

-- ── SEC-1: seat claims no longer world-readable (RPC exposes seat only) ───────
drop policy if exists "public read seat claims" on public.event_seat_claims;
-- No SELECT policy → anon/authenticated cannot read the table directly; the
-- SECURITY DEFINER seat_claims_by_slug RPC (returns seat text only) still works.

-- ── SEC-2: draft events not exposed via direct PostgREST ─────────────────────
drop policy if exists "public read events" on public.events;
create policy "public read events" on public.events for select
  using (status <> 'draft' or auth.uid() = owner_id);
