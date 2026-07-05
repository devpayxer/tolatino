-- To'Latino — the two-sided transaction loop. A customer orders / books / rents /
-- buys tickets / RSVPs from a business listing or event; the SAME record shows in
-- the customer's dashboard (Mi cuenta) AND the business dashboard. Adds the
-- customer (user_id) to orders + bookings and opens RLS to both sides; new tables
-- for rentals, event tickets and event attendance ("Voy"). Idempotent.
-- Apply: paste into the Supabase SQL Editor and Run.

-- ── ORDERS: add the customer + open RLS to customer AND owner ───────────────
alter table public.business_orders add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists business_orders_user_idx on public.business_orders (user_id, created_at desc);
drop policy if exists "owner all business_orders" on public.business_orders;
drop policy if exists "read business_orders"   on public.business_orders;
drop policy if exists "insert business_orders" on public.business_orders;
drop policy if exists "update business_orders" on public.business_orders;
create policy "read business_orders" on public.business_orders for select
  using (user_id = auth.uid() or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "insert business_orders" on public.business_orders for insert
  with check (user_id = auth.uid() or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "update business_orders" on public.business_orders for update
  using (user_id = auth.uid() or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (user_id = auth.uid() or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

-- ── BOOKINGS: same ─────────────────────────────────────────────────────────
alter table public.business_bookings add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists business_bookings_user_idx on public.business_bookings (user_id, starts_at desc);
drop policy if exists "owner all business_bookings" on public.business_bookings;
drop policy if exists "read business_bookings"   on public.business_bookings;
drop policy if exists "insert business_bookings" on public.business_bookings;
drop policy if exists "update business_bookings" on public.business_bookings;
create policy "read business_bookings" on public.business_bookings for select
  using (user_id = auth.uid() or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "insert business_bookings" on public.business_bookings for insert
  with check (user_id = auth.uid() or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "update business_bookings" on public.business_bookings for update
  using (user_id = auth.uid() or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (user_id = auth.uid() or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

-- ── RENTALS (customer rents an item for a date range) ──────────────────────
create table if not exists public.business_rentals (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  customer_name text,
  item_name     text not null,
  start_at      timestamptz not null,
  end_at        timestamptz,
  qty           int not null default 1,
  total         numeric,
  deposit       numeric,
  status        text not null default 'pending' check (status in ('pending', 'confirmed', 'out', 'returned', 'cancelled')),
  created_at    timestamptz not null default now()
);
create index if not exists business_rentals_biz_idx  on public.business_rentals (business_id, start_at desc);
create index if not exists business_rentals_user_idx on public.business_rentals (user_id, start_at desc);
alter table public.business_rentals enable row level security;
drop policy if exists "read business_rentals"   on public.business_rentals;
drop policy if exists "insert business_rentals" on public.business_rentals;
drop policy if exists "update business_rentals" on public.business_rentals;
create policy "read business_rentals" on public.business_rentals for select
  using (user_id = auth.uid() or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "insert business_rentals" on public.business_rentals for insert
  with check (user_id = auth.uid() or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "update business_rentals" on public.business_rentals for update
  using (user_id = auth.uid() or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (user_id = auth.uid() or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

-- ── EVENT TICKETS (customer buys tickets for an event) ─────────────────────
create table if not exists public.event_tickets (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  customer_name text,
  qty           int not null default 1,
  total         numeric,
  code          text not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  status        text not null default 'confirmed' check (status in ('confirmed', 'used', 'refunded')),
  created_at    timestamptz not null default now()
);
-- idempotent: backfill the column on DBs where the table pre-existed
alter table public.event_tickets add column if not exists customer_name text;
create index if not exists event_tickets_user_idx  on public.event_tickets (user_id, created_at desc);
create index if not exists event_tickets_event_idx on public.event_tickets (event_id, created_at desc);
alter table public.event_tickets enable row level security;
drop policy if exists "read event_tickets"   on public.event_tickets;
drop policy if exists "insert event_tickets" on public.event_tickets;
drop policy if exists "update event_tickets" on public.event_tickets;
create policy "read event_tickets" on public.event_tickets for select
  using (user_id = auth.uid() or exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));
create policy "insert event_tickets" on public.event_tickets for insert
  with check (user_id = auth.uid());
create policy "update event_tickets" on public.event_tickets for update
  using (user_id = auth.uid() or exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()))
  with check (user_id = auth.uid() or exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));

-- ── EVENT ATTENDANCE ("Voy" / RSVP) ────────────────────────────────────────
create table if not exists public.event_attendance (
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index if not exists event_attendance_user_idx on public.event_attendance (user_id, created_at desc);
alter table public.event_attendance enable row level security;
drop policy if exists "public read event_attendance" on public.event_attendance;
drop policy if exists "own insert event_attendance"  on public.event_attendance;
drop policy if exists "own delete event_attendance"  on public.event_attendance;
create policy "public read event_attendance" on public.event_attendance for select using (true);
create policy "own insert event_attendance"  on public.event_attendance for insert with check (user_id = auth.uid());
create policy "own delete event_attendance"  on public.event_attendance for delete using (user_id = auth.uid());
