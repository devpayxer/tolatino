-- To'Latino — fetch ONE business by its public slug, independent of geo.
-- The geo feed (businesses_v2) is scoped to the selected city's radius and skips
-- rows without a tile, so it can't reliably open an arbitrary listing (e.g. the
-- owner previewing their own new/out-of-city business via "Ver listado público").
-- This returns the exact same columns as businesses_v2 (distance_m always null)
-- so the client reuses the same row→Business mapper. Indexed: businesses.slug is
-- UNIQUE → O(log n) lookup, scale-safe. Idempotent.
-- Apply: paste into the Supabase SQL Editor and Run.

create or replace function public.business_by_slug(in_slug text)
returns table (
  slug text, name text, category_id text,
  rating numeric, reviews_count int,
  price_level text, is_open boolean, tier text,
  endorse_count int, tile_a text, tile_b text,
  specialty_es text, specialty_en text,
  subcategories text[],
  features text[],
  hours jsonb,
  amenities_es text[], amenities_en text[],
  review_es text, review_en text,
  distance_m double precision
) language sql stable as $$
  select b.slug, b.name, b.category_id,
         b.rating, b.reviews_count,
         b.price_level, b.is_open, b.tier,
         b.endorse_count, b.tile_a, b.tile_b,
         b.specialty_es, b.specialty_en,
         b.subcategories,
         b.features,
         b.hours,
         (select coalesce(array_agg(a.name_es order by a.id), '{}')
            from public.business_amenities ba join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = b.id),
         (select coalesce(array_agg(a.name_en order by a.id), '{}')
            from public.business_amenities ba join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = b.id),
         (select r.body_es from public.reviews r where r.business_id = b.id and r.featured order by r.created_at desc limit 1),
         (select r.body_en from public.reviews r where r.business_id = b.id and r.featured order by r.created_at desc limit 1),
         null::double precision
  from public.businesses b
  where b.slug = in_slug
  limit 1;
$$;

grant execute on function public.business_by_slug(text) to anon, authenticated;
