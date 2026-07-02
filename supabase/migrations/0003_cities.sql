-- To'Latino — our own city gazetteer (replaces the external geocoder for the
-- two hot paths: city autocomplete + GPS→city). Data is a finite, free
-- GeoNames US extract (supabase/data/us_cities.csv, ~7k cities pop ≥ 5,000).
-- Everything lives in OUR Postgres → no external dependency, no rate limits,
-- scales like any indexed query. Photon/Nominatim stay only as a fallback.
--
-- Apply: paste this into the Supabase SQL Editor and Run, THEN import the CSV
-- (Table Editor → cities → Insert → Import data from CSV → us_cities.csv).

create extension if not exists pg_trgm;
create extension if not exists postgis;

create table if not exists public.cities (
  id         bigint primary key,          -- stable GeoNames id
  name       text   not null,
  state      text   not null,             -- 2-letter US state
  label      text   not null,             -- "Houston, TX" (display)
  population int    not null default 0,
  lat        double precision not null,
  lng        double precision not null,
  -- geography derived from lat/lng so CSV import stays plain columns
  location   geography(Point, 4326) generated always as
    (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored
);

create index if not exists cities_name_trgm   on public.cities using gin (name gin_trgm_ops);
create index if not exists cities_label_trgm   on public.cities using gin (label gin_trgm_ops);
create index if not exists cities_location_gix on public.cities using gist (location);
create index if not exists cities_pop_idx      on public.cities (population desc);

-- ── Autocomplete: prefix match first, then substring, ranked by population ───
create or replace function public.search_cities(q text, max_results int default 8)
returns table (label text, lat double precision, lng double precision, population int)
language sql stable as $$
  select c.label, c.lat, c.lng, c.population
  from public.cities c
  where c.name ilike q || '%' or c.label ilike '%' || q || '%'
  order by (c.name ilike q || '%') desc, c.population desc
  limit greatest(1, least(max_results, 20));
$$;

-- ── GPS → nearest city (KNN over the GIST index) ────────────────────────────
create or replace function public.nearest_city(user_lat double precision, user_lng double precision)
returns table (label text, lat double precision, lng double precision)
language sql stable as $$
  select c.label, c.lat, c.lng
  from public.cities c
  order by c.location <-> st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography
  limit 1;
$$;

-- ── Public read; execution granted to the anon/publishable key ──────────────
alter table public.cities enable row level security;
drop policy if exists "public read cities" on public.cities;
create policy "public read cities" on public.cities for select using (true);

grant execute on function public.search_cities to anon, authenticated;
grant execute on function public.nearest_city  to anon, authenticated;
