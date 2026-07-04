-- To'Latino — team & hiring for the business dashboard (Cuenta → Personal /
-- Empleos). business_staff is PRIVATE (owner-only). business_jobs is PUBLIC
-- (postings surface to the community) but only the owner writes them. Idempotent.
-- Apply: paste into the Supabase SQL Editor and Run.

create table if not exists public.business_staff (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null,
  email       text,
  role        text not null default 'staff' check (role in ('owner', 'manager', 'staff')),
  title_es    text,
  title_en    text,
  invited     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists business_staff_biz_idx on public.business_staff (business_id, created_at);

alter table public.business_staff enable row level security;
drop policy if exists "owner read business_staff"   on public.business_staff;
drop policy if exists "owner insert business_staff" on public.business_staff;
drop policy if exists "owner update business_staff" on public.business_staff;
drop policy if exists "owner delete business_staff" on public.business_staff;
create policy "owner read business_staff" on public.business_staff
  for select using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "owner insert business_staff" on public.business_staff
  for insert with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "owner update business_staff" on public.business_staff
  for update using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
          with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "owner delete business_staff" on public.business_staff
  for delete using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

create table if not exists public.business_jobs (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title_es    text not null,
  title_en    text,
  pay         text,
  type_es     text,
  type_en     text,
  status      text not null default 'live' check (status in ('live', 'new', 'paused')),
  applied     int not null default 0,
  viewed      int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists business_jobs_biz_idx on public.business_jobs (business_id, created_at desc);

alter table public.business_jobs enable row level security;
drop policy if exists "public read business_jobs"  on public.business_jobs;
drop policy if exists "owner insert business_jobs" on public.business_jobs;
drop policy if exists "owner update business_jobs" on public.business_jobs;
drop policy if exists "owner delete business_jobs" on public.business_jobs;
create policy "public read business_jobs" on public.business_jobs
  for select using (true);
create policy "owner insert business_jobs" on public.business_jobs
  for insert with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "owner update business_jobs" on public.business_jobs
  for update using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
          with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "owner delete business_jobs" on public.business_jobs
  for delete using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
