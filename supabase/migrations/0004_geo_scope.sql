-- To'Latino — scope discovery to the user's city by DISTANCE (PostGIS), not by
-- matching city strings. businesses_v2 gains a radius filter; events get an
-- equivalent events_near RPC. With ~80 km each metro is cleanly separated
-- (Houston · Boston · The Bronx · Hazleton never bleed into each other) while
-- everything inside a metro (e.g. Katy ↔ Houston, East Boston ↔ Boston) stays.
--
-- Apply: paste into the Supabase SQL Editor and Run.

-- ── Businesses: add radius_m (keeps ordering by real distance) ───────────────
-- Drop the old 4-arg signature first — adding a param makes a NEW overload
-- rather than replacing it, which would leave two functions.
drop function if exists public.businesses_v2(double precision, double precision, text, int);

create or replace function public.businesses_v2(
  user_lat double precision default null,
  user_lng double precision default null,
  in_city  text default null,
  max_results int default 50,
  radius_m double precision default 80000
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
    and b.tile_a is not null
    and (
      o.g is null or radius_m is null or b.location is null
      or st_distance(b.location, o.g) <= radius_m
    )
  order by
    (case when o.g is not null and b.location is not null
          then st_distance(b.location, o.g) end) asc nulls last,
    b.rating desc
  limit greatest(1, least(max_results, 100));
$$;

-- ── Events near the user (same radius model), soonest first ─────────────────
create or replace function public.events_near(
  user_lat double precision default null,
  user_lng double precision default null,
  radius_m double precision default 80000,
  max_results int default 50
) returns table (
  slug text, title_es text, title_en text, venue_es text, venue_en text,
  cat text, starts_at timestamptz, time_label_es text, time_label_en text,
  price_label text, going_count int, desc_es text, desc_en text,
  tile_a text, tile_b text
) language sql stable as $$
  with origin as (
    select case when user_lat is not null and user_lng is not null
                then st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography
           end as g
  )
  select e.slug, e.title_es, e.title_en, e.venue_es, e.venue_en,
         e.cat, e.starts_at, e.time_label_es, e.time_label_en,
         e.price_label, e.going_count, e.desc_es, e.desc_en, e.tile_a, e.tile_b
  from public.events e
  cross join origin o
  where o.g is null or radius_m is null or e.location is null
     or st_distance(e.location, o.g) <= radius_m
  order by e.starts_at asc
  limit greatest(1, least(max_results, 100));
$$;

grant execute on function public.businesses_v2 to anon, authenticated;
grant execute on function public.events_near   to anon, authenticated;
