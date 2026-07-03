-- To'Latino — saved addresses (Phase 2). Signed-in users keep multiple labeled
-- addresses (Casa / Trabajo / …), one default; the active one is the geo origin
-- for distances and the future delivery destination. RLS: each user sees and
-- manages only their own. Idempotent. Apply: paste into the SQL Editor and Run.

create table if not exists public.user_addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  label      text,
  formatted  text not null,
  lat        double precision not null,
  lng        double precision not null,
  location   geography(Point, 4326) generated always as
             (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists user_addresses_user_idx on public.user_addresses (user_id, created_at desc);

alter table public.user_addresses enable row level security;
drop policy if exists "own read addresses"   on public.user_addresses;
drop policy if exists "own insert address"   on public.user_addresses;
drop policy if exists "own update address"   on public.user_addresses;
drop policy if exists "own delete address"   on public.user_addresses;
create policy "own read addresses" on public.user_addresses for select using (auth.uid() = user_id);
create policy "own insert address" on public.user_addresses for insert with check (auth.uid() = user_id);
create policy "own update address" on public.user_addresses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own delete address" on public.user_addresses for delete using (auth.uid() = user_id);
