-- To'Latino — initial schema (Supabase / Postgres + PostGIS)
-- Discovery MVP: categories, businesses (geo), amenities, reviews + a
-- scalable geo+text search RPC. Designed for the 1M+ scale target:
-- GIST geo index, GIN full-text + trigram, btree on hot filters, RLS public read.
--
-- Apply: paste into Supabase SQL Editor, or `supabase db push` with the CLI.

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists postgis;     -- geo "near me" / radius
create extension if not exists pg_trgm;      -- fuzzy name matching

-- ── Categories (the 16 onboarding categories) ───────────────────────────────
create table if not exists public.categories (
  id      text primary key,            -- slug, e.g. 'food'
  name_es text not null,
  name_en text not null,
  sort    int  not null default 0
);

-- ── Businesses ──────────────────────────────────────────────────────────────
create table if not exists public.businesses (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,   -- stable public id used by the app/URLs
  name         text not null,
  category_id  text not null references public.categories(id),  -- broad bucket (filtering)
  tagline_es   text,   -- specific display label shown on cards, e.g. 'Comida Mexicana'
  tagline_en   text,
  tier         text not null default 'free' check (tier in ('free','verified','premium')),
  price_level  text check (price_level in ('$','$$','$$$')),
  about_es     text,
  about_en     text,
  address      text,
  city         text default 'Houston, TX',
  phone        text,
  hours_es     text,
  hours_en     text,
  is_open      boolean not null default true,
  promo_es     text,
  promo_en     text,
  photo_seed   text not null default 'tolatino',
  rating       numeric(2,1) not null default 0,
  reviews_count int not null default 0,
  location     geography(Point, 4326),  -- lng/lat; null until geocoded
  search_vector tsvector generated always as (
    to_tsvector('simple',
      coalesce(name,'') || ' ' || coalesce(about_es,'') || ' ' || coalesce(about_en,''))
  ) stored,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists businesses_location_gix on public.businesses using gist (location);
create index if not exists businesses_category_idx on public.businesses (category_id);
create index if not exists businesses_search_gin   on public.businesses using gin (search_vector);
create index if not exists businesses_name_trgm     on public.businesses using gin (name gin_trgm_ops);
create index if not exists businesses_rating_idx     on public.businesses (rating desc);

-- ── Amenities (normalized, bilingual) ───────────────────────────────────────
create table if not exists public.amenities (
  id      text primary key,
  name_es text not null,
  name_en text not null
);
create table if not exists public.business_amenities (
  business_id uuid references public.businesses(id) on delete cascade,
  amenity_id  text references public.amenities(id)  on delete cascade,
  primary key (business_id, amenity_id)
);

-- ── Reviews ─────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  author_name     text not null,
  author_initials text,
  rating          int not null check (rating between 1 and 5),
  body_es         text,
  body_en         text,
  featured        boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists reviews_business_idx on public.reviews (business_id);

-- ── updated_at trigger ──────────────────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists businesses_updated_at on public.businesses;
create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();

-- ── Search RPC: geo + text, paginated, ordered by distance then rating ──────
create or replace function public.search_businesses(
  q             text default '',
  user_lat      double precision default null,
  user_lng      double precision default null,
  category      text default null,
  max_results   int default 20,
  result_offset int default 0
) returns table (
  slug text, name text, category_id text,
  tagline_es text, tagline_en text,
  tier text, price_level text, is_open boolean,
  rating numeric, reviews_count int, photo_seed text,
  promo_es text, promo_en text,
  distance_m double precision
) language sql stable as $$
  with origin as (
    select case when user_lat is not null and user_lng is not null
                then st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography
           end as g
  )
  select b.slug, b.name, b.category_id,
         coalesce(b.tagline_es, c.name_es), coalesce(b.tagline_en, c.name_en),
         b.tier, b.price_level, b.is_open,
         b.rating, b.reviews_count, b.photo_seed,
         b.promo_es, b.promo_en,
         case when o.g is not null and b.location is not null
              then st_distance(b.location, o.g) end as distance_m
  from public.businesses b
  join public.categories c on c.id = b.category_id
  cross join origin o
  where (category is null or b.category_id = category)
    and (
      q = '' or
      b.search_vector @@ websearch_to_tsquery('simple', q) or
      b.name ilike '%' || q || '%' or
      c.name_es ilike '%' || q || '%' or
      c.name_en ilike '%' || q || '%'
    )
  order by
    (case when o.g is not null and b.location is not null
          then st_distance(b.location, o.g) end) asc nulls last,
    b.rating desc
  limit greatest(1, least(max_results, 50))
  offset greatest(0, result_offset);
$$;

-- ── Row Level Security: public read for the discovery surface ───────────────
alter table public.categories         enable row level security;
alter table public.businesses         enable row level security;
alter table public.amenities          enable row level security;
alter table public.business_amenities enable row level security;
alter table public.reviews            enable row level security;

drop policy if exists "public read categories"  on public.categories;
drop policy if exists "public read businesses"   on public.businesses;
drop policy if exists "public read amenities"    on public.amenities;
drop policy if exists "public read biz_amenities" on public.business_amenities;
drop policy if exists "public read reviews"      on public.reviews;

create policy "public read categories"   on public.categories          for select using (true);
create policy "public read businesses"    on public.businesses          for select using (true);
create policy "public read amenities"     on public.amenities           for select using (true);
create policy "public read biz_amenities" on public.business_amenities  for select using (true);
create policy "public read reviews"       on public.reviews             for select using (true);

grant execute on function public.search_businesses to anon, authenticated;
