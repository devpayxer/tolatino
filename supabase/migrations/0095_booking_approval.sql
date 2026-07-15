-- 0095_booking_approval.sql — Booking approval mode (Booksy/Fresha "Instant book"
-- vs "Request to book"). The owner decides per business, in service_config:
--   service_config.autoConfirm = true  → new customer bookings land 'confirmed'
--                               = false → new customer bookings land 'pending'
--                                          (the owner approves/declines in the agenda)
-- Default is manual approval (false / absent) — matches the prior behavior where
-- every booking arrived pending. The choice is applied SERVER-SIDE so a customer
-- can never self-confirm on a manual business.
--
-- 1) tg_booking_apply_mode: BEFORE INSERT — for real customer inserts
--    (authenticated/anon and NOT the owner) force status from the business's
--    autoConfirm. Owner walk-ins (auth.uid() = owner) and the Stripe webhook
--    (service_role, fulfill_booking) keep their own 'confirmed' status: a paid or
--    counter booking is confirmed regardless of mode.
-- 2) tg_notify_booking v3: the owner's "new booking" notification now carries the
--    resulting status so the client can label it "Nueva solicitud de cita"
--    (pending, needs approval) vs "Nueva reserva" (already confirmed).
-- Idempotent. Vanilla Postgres — portable to self-hosted.

-- ── 1 · Apply the approval mode on insert ────────────────────────────────────
create or replace function public.tg_booking_apply_mode() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  v_owner uuid;
  v_auto  boolean;
begin
  -- Governs only logged-in CUSTOMER inserts. The Stripe webhook (fulfill_booking)
  -- runs as service_role with no auth.uid() → skipped, so its paid booking stays
  -- 'confirmed'. The owner's own walk-in (auth.uid() = owner) is skipped too and
  -- keeps the 'confirmed' status the agenda inserts. auth.uid() (not current_user)
  -- is used on purpose: this function is SECURITY DEFINER, so current_user would be
  -- the definer, never the caller's role.
  if auth.uid() is not null then
    select owner_id, (service_config->>'autoConfirm')::boolean
      into v_owner, v_auto
      from public.businesses
      where id = new.business_id;
    if v_owner is null or auth.uid() <> v_owner then
      new.status := case when coalesce(v_auto, false) then 'confirmed' else 'pending' end;
    end if;
  end if;
  return new;
end $fn$;

-- Name sorts before 'booking_overlap' so the status is settled before the
-- double-booking guard reads it (both 'pending' and 'confirmed' count as active,
-- so ordering is belt-and-suspenders here).
drop trigger if exists booking_apply_mode on public.business_bookings;
create trigger booking_apply_mode
  before insert on public.business_bookings
  for each row execute function public.tg_booking_apply_mode();

-- ── 2 · Notify trigger v3: carry the resulting status into 'booking_new' ──────
create or replace function public.tg_notify_booking() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  v_owner uuid;
begin
  if tg_op = 'INSERT' then
    select owner_id into v_owner from public.businesses where id = new.business_id;
    -- don't notify the owner about their own walk-in entries
    if v_owner is not null and (auth.uid() is null or auth.uid() <> v_owner) then
      perform public.notify_user(v_owner, 'booking_new',
        jsonb_build_object('service', new.service_name, 'name', new.customer_name,
                           'starts_at', new.starts_at, 'status', new.status), '/negocio');
    end if;
  elsif tg_op = 'UPDATE' and (new.status is distinct from old.status or new.starts_at is distinct from old.starts_at) then
    if new.user_id is not null and auth.uid() is not null and auth.uid() = new.user_id then
      -- the CLIENT acted → tell the owner
      select owner_id into v_owner from public.businesses where id = new.business_id;
      if v_owner is not null then
        perform public.notify_user(v_owner,
          case when new.status = 'cancelled' then 'booking_cancelled' else 'booking_resched' end,
          jsonb_build_object('service', new.service_name, 'name', new.customer_name, 'starts_at', new.starts_at), '/negocio');
      end if;
    elsif new.user_id is not null then
      -- the OWNER (or webhook) acted → tell the client
      perform public.notify_user(new.user_id, 'booking_status',
        jsonb_build_object('service', new.service_name, 'status', new.status, 'starts_at', new.starts_at), '/cuenta');
    end if;
  end if;
  return new;
end $fn$;

drop trigger if exists notify_booking on public.business_bookings;
create trigger notify_booking
  after insert or update of status, starts_at
  on public.business_bookings
  for each row execute function public.tg_notify_booking();

-- ── 3 · Let the customer INSERT land as 'confirmed' in auto mode ──────────────
-- The original policy pinned customer inserts to status='pending'. With auto
-- mode the BEFORE trigger legitimately writes 'confirmed', which the WITH CHECK
-- (evaluated on the final row) then rejected. Allow both — the trigger above is
-- the authoritative status-setter, so a customer still can NEVER self-confirm on
-- a manual business (it forces 'pending'); this check only has to accept whatever
-- the trigger produced. Deposit bounds and ownership branch are unchanged.
drop policy if exists "insert business_bookings" on public.business_bookings;
create policy "insert business_bookings" on public.business_bookings
  for insert to public
  with check (
    (
      user_id = auth.uid()
      and status in ('pending', 'confirmed')
      and coalesce(deposit, 0) >= 0
      and coalesce(deposit, 0) <= 100000
    )
    or exists (
      select 1 from public.businesses b
      where b.id = business_bookings.business_id and b.owner_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
