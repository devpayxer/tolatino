-- To'Latino — per-slot booking capacity (finish the appointment story). 0052
-- exposed seat load per DAY, but capacity is "seats per session" (a session = a
-- time slot), so three bookings in different slots wrongly marked the whole day
-- full. This regroups the public load by the exact slot timestamp, so the booking
-- sheet can disable just the slots that are actually full and keep the rest open.
-- Still SECURITY DEFINER, still exposes NO customer data (only slot + seats).
-- business_bookings RLS stays locked. Idempotent. Apply: paste + Run.

-- Ensure the booking↔service link exists (originally added in 0052). If that
-- migration was never applied, service_id is missing and the function below can't
-- reference it (Postgres 42703) — so add it here, idempotently, first.
alter table public.business_bookings
  add column if not exists service_id uuid references public.business_items(id) on delete set null;
create index if not exists business_bookings_service_idx
  on public.business_bookings (service_id, starts_at);

-- return type changes (day date → slot timestamptz), which CREATE OR REPLACE can't
-- do — drop the old signature first (Postgres 42P13).
drop function if exists public.booking_load_by_service(uuid);
create or replace function public.booking_load_by_service(in_service_id uuid)
returns table (slot timestamptz, seats int)
language sql
stable
security definer
set search_path = public
as $$
  select starts_at, sum(coalesce(party_size, 1))::int
  from public.business_bookings
  where service_id = in_service_id
    and status in ('pending', 'confirmed', 'seated')
  group by starts_at;
$$;

grant execute on function public.booking_load_by_service(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
