-- To'Latino — user accounts + hyperlocal community. Adds profiles (tied to
-- Supabase Auth users), gives community posts real coordinates, and scopes the
-- Comunidad feed to 30 miles around the user's location.
--
-- Apply: paste into the Supabase SQL Editor and Run.
-- IMPORTANT (one-time, for email+password without email delivery):
--   Authentication → Providers → Email → turn OFF "Confirm email".
--   Then sign-up logs the user in immediately (no confirmation email needed).

create extension if not exists postgis;

-- ── Profiles (1:1 with auth.users) ──────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  initials     text not null,
  avatar_color text not null default '#7B61FF',
  city_label   text,
  lat          double precision,
  lng          double precision,
  location     geography(Point, 4326) generated always as
    (case when lat is not null and lng is not null
          then st_setsrid(st_makepoint(lng, lat), 4326)::geography end) stored,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists "public read profiles" on public.profiles;
drop policy if exists "insert own profile"   on public.profiles;
drop policy if exists "update own profile"   on public.profiles;
-- display fields are public (shown on posts/comments); writes are self-only
create policy "public read profiles" on public.profiles for select using (true);
create policy "insert own profile"   on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile"   on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ── Posts: author + coordinates (for the 30-mile radius) ────────────────────
alter table public.posts add column if not exists author_id uuid references auth.users(id) on delete set null;
alter table public.posts add column if not exists lat double precision;
alter table public.posts add column if not exists lng double precision;
alter table public.posts add column if not exists location geography(Point, 4326) generated always as
  (case when lat is not null and lng is not null
        then st_setsrid(st_makepoint(lng, lat), 4326)::geography end) stored;

create index if not exists posts_location_gix on public.posts using gist (location);

-- Backfill seeded posts with their city's coordinates (location auto-computes)
update public.posts p set lat = c.lat, lng = c.lng
from (values
  ('Houston, TX',   29.7604, -95.3698),
  ('Hazleton, PA',  40.9584, -75.9746),
  ('Boston, MA',    42.3584, -71.0598),
  ('The Bronx, NY', 40.8498, -73.8664)
) as c(city, lat, lng)
where p.city = c.city and p.lat is null;

-- authenticated users may create posts as themselves (public read already set)
drop policy if exists "insert own posts" on public.posts;
create policy "insert own posts" on public.posts for insert with check (auth.uid() = author_id);

-- ── Community feed within radius (default 30 mi = 48,280 m) ──────────────────
create or replace function public.posts_near(
  user_lat double precision default null,
  user_lng double precision default null,
  radius_m double precision default 48280,
  max_results int default 50
) returns setof public.posts language sql stable as $$
  select p.*
  from public.posts p
  where user_lat is null or user_lng is null or p.location is null
     or st_distance(p.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography) <= radius_m
  order by p.created_at desc
  limit greatest(1, least(max_results, 100));
$$;

grant execute on function public.posts_near to anon, authenticated;
