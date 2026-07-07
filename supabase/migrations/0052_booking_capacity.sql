-- To'Latino — booking capacity truth (no over-booking a session). Tie each
-- booking to its service item, and expose ONLY the per-day seat load (no customer
-- data) so the public booking sheet can block dates whose session is already full.
-- business_bookings RLS stays locked (customer/owner only); the public read goes
-- through a SECURITY DEFINER function returning just day + seats. Idempotent.
-- Apply: paste into the Supabase SQL Editor + Run.

-- 1) link a booking to the exact service item (nullable for back-compat).
alter table public.business_bookings
  add column if not exists service_id uuid references public.business_items(id) on delete set null;
create index if not exists business_bookings_service_idx
  on public.business_bookings (service_id, starts_at);

-- 2) public load: seats already booked per day for one service (active statuses),
--    exposing NO customer data. party_size null counts as 1 seat.
create or replace function public.booking_load_by_service(in_service_id uuid)
returns table (day date, seats int)
language sql
stable
security definer
set search_path = public
as $$
  select (starts_at)::date, sum(coalesce(party_size, 1))::int
  from public.business_bookings
  where service_id = in_service_id
    and status in ('pending', 'confirmed', 'seated')
  group by (starts_at)::date;
$$;

grant execute on function public.booking_load_by_service(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
