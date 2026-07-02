-- To'Latino v2 — "Plataforma multicanal" (Handoff v2)
-- Adds what the v2 app reads: business card fields (specialty, endorsements,
-- striped-tile colors), community posts and events (with geo + FTS), plus a
-- v2 search RPC returning the full card payload with distance.
-- Idempotent: safe to re-run. RLS: public read; writes stay locked until the
-- auth phase.
--
-- Apply: paste into the Supabase SQL Editor and Run.

-- ── Businesses: v2 card fields ───────────────────────────────────────────────
alter table public.businesses add column if not exists specialty_es  text;
alter table public.businesses add column if not exists specialty_en  text;
alter table public.businesses add column if not exists endorse_count int not null default 0;
alter table public.businesses add column if not exists tile_a        text;
alter table public.businesses add column if not exists tile_b        text;

-- ── Community posts (Comunidad feed) ────────────────────────────────────────
create table if not exists public.posts (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('ask','rec','local','sale','poll')),
  author_name     text not null,
  author_initials text not null,
  author_color    text not null default '#7B61FF',
  hood            text,
  city            text not null default 'Houston, TX',
  body_es         text not null,
  body_en         text not null,
  business_name   text,
  business_rating numeric(2,1),
  poll_options    jsonb,          -- ["opción", ...] when type='poll'
  poll_votes      jsonb,          -- [n, ...] aligned with poll_options
  recommends      int not null default 0,
  search_vector   tsvector generated always as (
    to_tsvector('simple', coalesce(body_es,'') || ' ' || coalesce(body_en,'') || ' ' || coalesce(author_name,'') || ' ' || coalesce(business_name,''))
  ) stored,
  created_at      timestamptz not null default now()
);
create index if not exists posts_city_created_idx on public.posts (city, created_at desc);
create index if not exists posts_search_gin       on public.posts using gin (search_vector);

-- ── Events (Eventos, con boletos) ───────────────────────────────────────────
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title_es     text not null,
  title_en     text not null,
  venue_es     text not null,
  venue_en     text not null,
  cat          text not null check (cat in ('musica','mercado','familia','comida')),
  city         text not null default 'Houston, TX',
  starts_at    timestamptz not null,
  time_label_es text,               -- display: 'Sáb · 10:00 pm'
  time_label_en text,
  price_label  text,                -- '$15' · null = gratis
  going_count  int not null default 0,
  desc_es      text,
  desc_en      text,
  tile_a       text,
  tile_b       text,
  location     geography(Point, 4326),
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(title_es,'') || ' ' || coalesce(title_en,'') || ' ' || coalesce(venue_es,'') || ' ' || coalesce(venue_en,''))
  ) stored,
  created_at   timestamptz not null default now()
);
create index if not exists events_city_starts_idx on public.events (city, starts_at);
create index if not exists events_cat_idx         on public.events (cat);
create index if not exists events_location_gix    on public.events using gist (location);
create index if not exists events_search_gin      on public.events using gin (search_vector);

-- ── v2 card RPC: everything the business card needs + distance ──────────────
create or replace function public.businesses_v2(
  user_lat double precision default null,
  user_lng double precision default null,
  in_city  text default null,
  max_results int default 50
) returns table (
  slug text, name text, category_id text,
  rating numeric, reviews_count int,
  price_level text, is_open boolean, tier text,
  endorse_count int, tile_a text, tile_b text,
  specialty_es text, specialty_en text,
  amenities_es text[], amenities_en text[],
  review_es text, review_en text,
  distance_m double precision
) language sql stable as $$
  with origin as (
    select case when user_lat is not null and user_lng is not null
                then st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography
           end as g
  )
  select b.slug, b.name, b.category_id,
         b.rating, b.reviews_count,
         b.price_level, b.is_open, b.tier,
         b.endorse_count, b.tile_a, b.tile_b,
         b.specialty_es, b.specialty_en,
         (select coalesce(array_agg(a.name_es order by a.id), '{}')
            from public.business_amenities ba join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = b.id),
         (select coalesce(array_agg(a.name_en order by a.id), '{}')
            from public.business_amenities ba join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = b.id),
         (select r.body_es from public.reviews r where r.business_id = b.id and r.featured order by r.created_at desc limit 1),
         (select r.body_en from public.reviews r where r.business_id = b.id and r.featured order by r.created_at desc limit 1),
         case when o.g is not null and b.location is not null
              then st_distance(b.location, o.g) end
  from public.businesses b
  cross join origin o
  where (in_city is null or b.city = in_city)
    and b.tile_a is not null           -- only v2-seeded rows have card tiles
  order by
    (case when o.g is not null and b.location is not null
          then st_distance(b.location, o.g) end) asc nulls last,
    b.rating desc
  limit greatest(1, least(max_results, 100));
$$;

-- ── RLS: public read; writes locked until the auth phase ────────────────────
alter table public.posts  enable row level security;
alter table public.events enable row level security;

drop policy if exists "public read posts"  on public.posts;
drop policy if exists "public read events" on public.events;
create policy "public read posts"  on public.posts  for select using (true);
create policy "public read events" on public.events for select using (true);

grant execute on function public.businesses_v2 to anon, authenticated;
