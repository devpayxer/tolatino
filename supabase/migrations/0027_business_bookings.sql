-- To'Latino — appointments/reservations (Módulos → Reservas). Owner-managed and
-- PRIVATE (customer data). Idempotent. Apply: paste into the SQL Editor and Run.

create table if not exists public.business_bookings (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  service_name  text,
  customer_name text not null,
  party_size    int,
  starts_at     timestamptz not null,
  status        text not null default 'pending' check (status in ('pending', 'confirmed', 'seated', 'done', 'cancelled')),
  deposit       numeric,
  notes         text,
  created_at    timestamptz not null default now()
);
create index if not exists business_bookings_biz_idx on public.business_bookings (business_id, starts_at);

alter table public.business_bookings enable row level security;
drop policy if exists "owner all business_bookings" on public.business_bookings;
create policy "owner all business_bookings" on public.business_bookings
  for all using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
          with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
