-- 0092_booking_pro.sql — Booksy/Fresha-grade booking model.
-- 1) business_bookings learns the full appointment shape: duration, assigned
--    professional (from service_config.providers), chosen add-ons, price variant
--    (e.g. vehicle type), authoritative total, and a customer phone for walk-ins.
-- 2) status gains 'no_show' (industry staple; feeds client reliability later).
-- 3) booking_busy_by_slug: public, privacy-safe occupancy feed (no customer data)
--    so the consumer slot picker can grey out real conflicts per professional.
-- 4) tg_booking_overlap: server-side double-booking guard per professional —
--    the availability the client computes is advisory; this is the real lock.
-- 5) fulfill_booking v2 (Stripe webhook path) writes the new fields.
-- 6) tg_notify_booking v2: no self-notifications; owner learns about client
--    cancellations ('booking_cancelled') and reschedules ('booking_resched').
-- 7) Customer-update guard (0084) now permits the reschedule transition:
--    status → 'pending' when the client moves starts_at on a pending/confirmed
--    booking (money + identity columns stay locked).
-- Idempotent. Vanilla Postgres — portable to self-hosted.

-- ── 1 · New columns ──────────────────────────────────────────────────────────
alter table public.business_bookings
  add column if not exists duration_min   int,
  add column if not exists staff_id       text,
  add column if not exists staff_name     text,
  add column if not exists addons         jsonb,
  add column if not exists variant        text,
  add column if not exists total          numeric,
  add column if not exists customer_phone text;

-- ── 2 · Status set += no_show ────────────────────────────────────────────────
alter table public.business_bookings drop constraint if exists business_bookings_status_check;
alter table public.business_bookings add constraint business_bookings_status_check
  check (status in ('pending','confirmed','seated','done','cancelled','no_show'));

-- Overlap-guard lookup: active bookings for one professional around a time.
create index if not exists business_bookings_staff_idx
  on public.business_bookings (business_id, staff_id, starts_at)
  where staff_id is not null;

-- ── 3 · Public occupancy feed (privacy-safe) ─────────────────────────────────
-- Returns only (when, how long, which professional, how many seats) for active
-- bookings — never who booked. Range capped at 60 days to prevent scraping.
create or replace function public.booking_busy_by_slug(in_slug text, in_from timestamptz, in_to timestamptz)
returns table (starts_at timestamptz, duration_min int, staff_id text, service_id uuid, seats int)
language sql stable security definer set search_path = public as $$
  select bk.starts_at,
         coalesce(bk.duration_min, 30),
         bk.staff_id,
         bk.service_id,
         greatest(coalesce(bk.party_size, 1), 1)
  from public.business_bookings bk
  join public.businesses b on b.id = bk.business_id
  where b.slug = in_slug
    and bk.status in ('pending','confirmed','seated')
    and bk.starts_at >= in_from
    and bk.starts_at < least(in_to, in_from + interval '60 days');
$$;
grant execute on function public.booking_busy_by_slug(text, timestamptz, timestamptz) to anon, authenticated;

-- ── 4 · Server-side double-booking guard per professional ────────────────────
-- Two active bookings for the SAME professional may not overlap in time
-- ([starts_at, starts_at + duration)). Fires on insert and on any reschedule /
-- reassignment / reactivation. Capacity-only businesses (no staff_id) keep the
-- seat-count model and are unaffected.
create or replace function public.tg_booking_overlap() returns trigger
language plpgsql set search_path = public as $fn$
begin
  if new.status in ('pending','confirmed','seated') and new.staff_id is not null then
    if exists (
      select 1 from public.business_bookings x
      where x.business_id = new.business_id
        and x.staff_id = new.staff_id
        and x.id is distinct from new.id
        and x.status in ('pending','confirmed','seated')
        and x.starts_at < new.starts_at + make_interval(mins => greatest(coalesce(new.duration_min, 30), 5))
        and new.starts_at < x.starts_at + make_interval(mins => greatest(coalesce(x.duration_min, 30), 5))
    ) then
      raise exception 'staff_slot_taken';
    end if;
  end if;
  return new;
end $fn$;

drop trigger if exists booking_overlap on public.business_bookings;
create trigger booking_overlap
  before insert or update of starts_at, staff_id, status, duration_min
  on public.business_bookings
  for each row execute function public.tg_booking_overlap();

-- ── 5 · fulfill_booking v2 (Stripe webhook, service_role only) ───────────────
-- Signature changes → drop the old one first (avoid an overload ambiguity).
drop function if exists public.fulfill_booking(uuid, uuid, text, uuid, timestamptz, int, numeric);
drop function if exists public.fulfill_booking(uuid, uuid, text, uuid, timestamptz, int, numeric, int, text, text, jsonb, text, numeric, text);
create or replace function public.fulfill_booking(
  in_buyer uuid, in_business uuid, in_service_name text, in_service_id uuid,
  in_starts_at timestamptz, in_party_size int, in_deposit numeric,
  in_duration_min int default null, in_staff_id text default null, in_staff_name text default null,
  in_addons jsonb default null, in_variant text default null, in_total numeric default null,
  in_notes text default null
) returns table(id uuid)
language plpgsql security definer set search_path = public as $fn$
declare v_name text; v_id uuid;
begin
  select coalesce(nullif(btrim(p.display_name), ''), 'Cliente') into v_name
    from public.profiles p where p.id = in_buyer;
  v_id := gen_random_uuid();
  insert into public.business_bookings
    (id, business_id, user_id, customer_name, service_name, service_id, starts_at, party_size,
     deposit, status, duration_min, staff_id, staff_name, addons, variant, total, notes)
  values
    (v_id, in_business, in_buyer, coalesce(v_name, 'Cliente'), in_service_name, in_service_id,
     in_starts_at, in_party_size, in_deposit, 'confirmed', in_duration_min, in_staff_id,
     nullif(in_staff_name, ''), in_addons, nullif(in_variant, ''), in_total, nullif(in_notes, ''))
  ;
  id := v_id; return next;
end $fn$;
revoke all on function public.fulfill_booking(uuid, uuid, text, uuid, timestamptz, int, numeric, int, text, text, jsonb, text, numeric, text) from public, anon, authenticated;
grant execute on function public.fulfill_booking(uuid, uuid, text, uuid, timestamptz, int, numeric, int, text, text, jsonb, text, numeric, text) to service_role;

-- ── 6 · Notification trigger v2 (no self-notify; owner hears cancellations/reschedules) ──
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
        jsonb_build_object('service', new.service_name, 'name', new.customer_name, 'starts_at', new.starts_at), '/negocio');
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

drop trigger if exists trg_notify_booking on public.business_bookings; -- 0054's name — leaving it would double-fire
drop trigger if exists notify_booking on public.business_bookings;
create trigger notify_booking
  after insert or update of status, starts_at
  on public.business_bookings
  for each row execute function public.tg_notify_booking();

-- ── 7 · Customer-update guard learns the reschedule transition ───────────────
-- Same guard as 0084 for orders/rentals; bookings additionally allow the client
-- to move starts_at (and staff) while resetting status to 'pending' so the
-- business re-confirms. Money and identity columns stay immutable.
create or replace function public.tg_txn_customer_update_guard() returns trigger
language plpgsql set search_path = public as $fn$
declare
  v_resched boolean := false;
begin
  if current_user in ('authenticated', 'anon')
     and old.user_id = auth.uid()
     and not exists (select 1 from public.businesses b where b.id = old.business_id and b.owner_id = auth.uid())
  then
    if tg_table_name = 'business_bookings' then
      v_resched := new.status = 'pending'
        and old.status in ('pending','confirmed')
        and new.starts_at is distinct from old.starts_at
        and old.starts_at > now();
    end if;
    if new.status is distinct from old.status and new.status <> 'cancelled' and not v_resched then
      raise exception 'solo puedes cancelar tu pedido/reserva';
    end if;
    if tg_table_name = 'business_bookings' then
      if new.starts_at is distinct from old.starts_at and not v_resched and new.status <> 'cancelled' then
        raise exception 'no autorizado: usa reagendar';
      end if;
    end if;
    if (to_jsonb(new)->>'total')   is distinct from (to_jsonb(old)->>'total')   then raise exception 'no autorizado: no puedes cambiar el monto'; end if;
    if (to_jsonb(new)->>'deposit') is distinct from (to_jsonb(old)->>'deposit') then raise exception 'no autorizado: no puedes cambiar el depósito'; end if;
    if new.business_id is distinct from old.business_id or new.user_id is distinct from old.user_id then
      raise exception 'no autorizado';
    end if;
  end if;
  return new;
end $fn$;

notify pgrst, 'reload schema';
