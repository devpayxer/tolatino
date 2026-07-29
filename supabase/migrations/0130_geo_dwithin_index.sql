-- 0130_geo_dwithin_index.sql
-- Auditoría de lanzamiento (docs/LAUNCH-AUDIT-2026-07-21.md → "DATOS / ESCALA /
-- SEGURIDAD"): «las queries geo derrotan su índice GIST (usan ST_Distance en vez
-- de ST_DWithin → seq-scan a escala)». Único punto de BASE DE DATOS que quedaba
-- abierto de esa sección (ledger 0104, RLS de businesses 0105, fuzz de coords
-- 0106, rate-limiting 0111 ya se cerraron).
--
-- Qué pasa hoy: `st_distance(location, origen) <= radio` calcula la distancia
-- geodésica EXACTA de CADA fila antes de compararla → Postgres no puede usar el
-- índice GIST (`businesses_location_gix`, `posts_location_gix`) y hace seq-scan
-- de toda la tabla en cada carga del directorio y del feed. A 1M+ de negocios/
-- publicaciones eso es el cuello de botella de la app.
--
-- Qué hace esta migración (sin cambiar NI UN resultado):
--   1. `st_distance(...) <= radio` → `st_dwithin(..., radio)` en las 3 funciones
--      que aún filtran por radio: businesses_v2, search_businesses, posts_near.
--      ST_DWithin sobre `geography` usa el mismo esferoide que ST_Distance (misma
--      respuesta, mismos bordes), pero descarta con la caja del índice antes de
--      calcular nada → apto para índice GIST y mucho más barato por fila.
--   2. El filtro de radio pasa a escribirse con los PARÁMETROS de la función (no
--      con la columna del CTE `origin`), para que el planificador pueda resolver
--      las ramas `user_lat is null` / `radius_m is null` al planear y dejar
--      `st_dwithin(location, <punto>, <radio>)` como condición de índice.
--   3. Índices parciales para la rama "fila sin coordenadas" (que por diseño SÍ
--      se muestra): sin ellos ese `or location is null` obliga a seq-scan aunque
--      la rama geo sí sea indexable. Con ellos el plan puede ser BitmapOr(GIST,
--      índice parcial).
-- La distancia que se DEVUELVE y el orden siguen calculándose con st_distance:
-- eso es correcto (es el valor exacto que muestra la UI) y ya sólo corre sobre
-- las filas que pasaron el filtro.
--
-- Idempotente. Apply: pegar en el SQL Editor de Supabase + Run
-- (o: node scripts/sbsql.mjs --file supabase/migrations/0130_geo_dwithin_index.sql)

-- ── 1) Índices ───────────────────────────────────────────────────────────────
-- Los GIST de geo ya existen (0001 businesses, 0005 posts). Faltaban los de la
-- rama "sin coordenadas", que es la que hoy fuerza el escaneo completo.
create index if not exists businesses_no_location_idx
  on public.businesses (id) where location is null;

create index if not exists posts_no_location_idx
  on public.posts (id) where location is null;

-- ── 2) businesses_v2 — feed geo del directorio (misma firma y salida que 0043) ─
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
  subcategories text[],
  features text[], card_features text[],
  hours jsonb, hours_exceptions jsonb,
  amenities_es text[], amenities_en text[],
  review_es text, review_en text,
  phone text, address text, city text, website text, logo_url text,
  accepts_messages boolean, message_channel text, message_phone text,
  about_es text, about_en text,
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
         b.subcategories,
         b.features, b.card_features,
         b.hours, b.hours_exceptions,
         (select coalesce(array_agg(a.name_es order by a.id), '{}')
            from public.business_amenities ba join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = b.id),
         (select coalesce(array_agg(a.name_en order by a.id), '{}')
            from public.business_amenities ba join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = b.id),
         (select r.body_es from public.reviews r where r.business_id = b.id and r.featured order by r.created_at desc limit 1),
         (select r.body_en from public.reviews r where r.business_id = b.id and r.featured order by r.created_at desc limit 1),
         b.phone, b.address, b.city, b.website, b.logo_url,
         b.accepts_messages, b.message_channel, b.message_phone,
         b.about_es, b.about_en,
         case when o.g is not null and b.location is not null
              then st_distance(b.location, o.g) end
  from public.businesses b
  cross join origin o
  where (in_city is null or b.city = in_city)
    and b.tile_a is not null
    and (
      user_lat is null or user_lng is null or radius_m is null or b.location is null
      or st_dwithin(b.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography, radius_m)
    )
  order by
    (case when o.g is not null and b.location is not null
          then st_distance(b.location, o.g) end) asc nulls last,
    b.rating desc
  limit greatest(1, least(max_results, 100));
$$;

grant execute on function public.businesses_v2 to anon, authenticated;

-- ── 3) search_businesses — buscador FTS + geo (misma firma y salida que 0055) ──
create or replace function public.search_businesses(
  in_q          text default null,
  user_lat      double precision default null,
  user_lng      double precision default null,
  in_city       text default null,
  in_cat        text default null,
  in_price      text default null,
  in_min_rating numeric default null,
  max_results   int default 40,
  in_offset     int default 0,
  radius_m      double precision default 80000
) returns table (
  slug text, name text, category_id text,
  rating numeric, reviews_count int,
  price_level text, is_open boolean, tier text,
  endorse_count int, tile_a text, tile_b text,
  specialty_es text, specialty_en text,
  subcategories text[],
  features text[], card_features text[],
  hours jsonb, hours_exceptions jsonb,
  amenities_es text[], amenities_en text[],
  review_es text, review_en text,
  phone text, address text, city text, website text, logo_url text,
  accepts_messages boolean, message_channel text, message_phone text,
  about_es text, about_en text,
  distance_m double precision
) language sql stable as $$
  with q as (select nullif(btrim(coalesce(in_q, '')), '') as t),
  origin as (
    select case when user_lat is not null and user_lng is not null
                then st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography end as g
  )
  select b.slug, b.name, b.category_id,
         b.rating, b.reviews_count,
         b.price_level, b.is_open, b.tier,
         b.endorse_count, b.tile_a, b.tile_b,
         b.specialty_es, b.specialty_en,
         b.subcategories,
         b.features, b.card_features,
         b.hours, b.hours_exceptions,
         (select coalesce(array_agg(a.name_es order by a.id), '{}')
            from public.business_amenities ba join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = b.id),
         (select coalesce(array_agg(a.name_en order by a.id), '{}')
            from public.business_amenities ba join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = b.id),
         (select r.body_es from public.reviews r where r.business_id = b.id and r.featured order by r.created_at desc limit 1),
         (select r.body_en from public.reviews r where r.business_id = b.id and r.featured order by r.created_at desc limit 1),
         b.phone, b.address, b.city, b.website, b.logo_url,
         b.accepts_messages, b.message_channel, b.message_phone,
         b.about_es, b.about_en,
         case when o.g is not null and b.location is not null then st_distance(b.location, o.g) end
  from public.businesses b
  cross join origin o
  cross join q
  where b.tile_a is not null
    and (in_city is null or b.city = in_city)
    and (in_cat is null or in_cat = 'all' or b.category_id = in_cat)
    and (in_price is null or b.price_level = in_price)
    and (in_min_rating is null or b.rating >= in_min_rating)
    and (
      user_lat is null or user_lng is null or radius_m is null or b.location is null
      or st_dwithin(b.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography, radius_m)
    )
    and (
      q.t is null
      or b.search_tsv @@ websearch_to_tsquery('simple', q.t)
      or b.name ilike '%' || q.t || '%'
      or similarity(b.name, q.t) > 0.2
    )
  order by
    (case when q.t is not null then ts_rank(b.search_tsv, websearch_to_tsquery('simple', q.t)) end) desc nulls last,
    (case when o.g is not null and b.location is not null then st_distance(b.location, o.g) end) asc nulls last,
    b.rating desc
  offset greatest(0, in_offset)
  limit greatest(1, least(max_results, 60));
$$;

grant execute on function public.search_businesses(text, double precision, double precision, text, text, text, numeric, int, int, double precision) to anon, authenticated;

-- ── 4) posts_near — feed hiperlocal de Comunidad (misma firma que 0005) ───────
create or replace function public.posts_near(
  user_lat double precision default null,
  user_lng double precision default null,
  radius_m double precision default 48280,
  max_results int default 50
) returns setof public.posts language sql stable as $$
  select p.*
  from public.posts p
  where user_lat is null or user_lng is null or p.location is null
     or st_dwithin(p.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography, radius_m)
  order by p.created_at desc
  limit greatest(1, least(max_results, 100));
$$;

grant execute on function public.posts_near to anon, authenticated;

-- ── 5) Ledger + recarga del esquema ──────────────────────────────────────────
insert into public.schema_migrations (version) values ('0130_geo_dwithin_index')
on conflict (version) do nothing;

notify pgrst, 'reload schema';
