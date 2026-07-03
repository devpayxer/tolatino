-- To'Latino — business opening hours → a live "open / closes soon / closed"
-- status in the UI. Stored as jsonb: a 7-element array, index 0 = Sunday … 6 =
-- Saturday; each day is a list of [openMin, closeMin] minute-of-day intervals
-- (close past 1440 = runs past midnight; [] = closed). The client computes the
-- status from this + the current time. businesses_v2 returns it and
-- create_business accepts it. Idempotent.
-- Apply: paste into the Supabase SQL Editor and Run.

alter table public.businesses add column if not exists hours jsonb;

-- ── Backfill the seeded businesses with realistic schedules by rubro ─────────
with pat(k, h) as (values
  ('FOOD',  '[[[600,1200]],[[540,1320]],[[540,1320]],[[540,1320]],[[540,1320]],[[540,1380]],[[540,1380]]]'::jsonb),
  ('SHOP',  '[[[600,1080]],[[540,1260]],[[540,1260]],[[540,1260]],[[540,1260]],[[540,1260]],[[540,1260]]]'::jsonb),
  ('AUTO',  '[[],[[480,1080]],[[480,1080]],[[480,1080]],[[480,1080]],[[480,1080]],[[480,840]]]'::jsonb),
  ('PRO',   '[[],[[540,1020]],[[540,1020]],[[540,1020]],[[540,1020]],[[540,1020]],[]]'::jsonb),
  ('CLINIC','[[],[[480,1020]],[[480,1020]],[[480,1020]],[[480,1020]],[[480,1020]],[]]'::jsonb),
  ('SALON', '[[[600,960]],[[540,1140]],[[540,1140]],[[540,1140]],[[540,1140]],[[540,1140]],[[540,1080]]]'::jsonb)
),
map(slug, k) as (values
  ('taqueria-la-esperanza','FOOD'),
  ('don-beto-mecanica','AUTO'),
  ('dulces-encanto','FOOD'),
  ('salon-bella-vida','SALON'),
  ('clinica-familiar-sana','CLINIC'),
  ('abogada-ramirez','PRO'),
  ('lavado-express-sol','AUTO'),
  ('ferreteria-el-tornillo','SHOP'),
  ('hz-sabor-quisqueya','FOOD'),
  ('hz-colmado-esquina','SHOP'),
  ('hz-taller-reyes','AUTO'),
  ('hz-remesas-caribe','PRO'),
  ('bo-pupuseria-bendicion','FOOD'),
  ('bo-panaderia-trigal','FOOD'),
  ('bo-salon-glamour','SALON'),
  ('bo-taller-aparicio','AUTO'),
  ('bo-clinica-familia','CLINIC'),
  ('bo-abogado-restrepo','PRO'),
  ('bx-malecon-dominicano','FOOD'),
  ('bx-barberia-panas','SALON'),
  ('bx-bodega-la-isla','SHOP'),
  ('bx-mecanica-boricua','AUTO'),
  ('bx-salon-caribena','SALON'),
  ('bx-legal-vargas','PRO')
)
update public.businesses b set hours = pat.h
from map join pat on pat.k = map.k
where b.slug = map.slug;

-- ── businesses_v2: also return hours (drop first: return type change) ────────
drop function if exists public.businesses_v2(double precision, double precision, text, int, double precision);

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
  features text[],
  hours jsonb,
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

grant execute on function public.businesses_v2 to anon, authenticated;

-- ── create_business: accept hours (trailing optional param) ─────────────────
drop function if exists public.create_business(
  text, text, text[], text, text, text, text, text, text, text, text, text, double precision, double precision, text[]);

create or replace function public.create_business(
  p_name         text,
  p_category     text,
  p_subcats      text[],
  p_price        text,
  p_phone        text,
  p_address      text,
  p_city         text,
  p_about        text,
  p_specialty_es text,
  p_specialty_en text,
  p_tile_a       text,
  p_tile_b       text,
  p_lat          double precision,
  p_lng          double precision,
  p_features     text[] default '{}',
  p_hours        jsonb  default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  uid      uuid := auth.uid();
  new_slug text;
begin
  if uid is null then raise exception 'auth required'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'name required'; end if;
  if not exists (select 1 from categories where id = p_category) then raise exception 'invalid category'; end if;

  new_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if new_slug = '' then new_slug := 'negocio'; end if;
  new_slug := new_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  insert into businesses (
    slug, name, category_id, owner_id, tier, price_level, is_open,
    phone, address, city, about_es, about_en,
    specialty_es, specialty_en, subcategories, features, hours, tile_a, tile_b,
    rating, reviews_count, location
  ) values (
    new_slug, trim(p_name), p_category, uid, 'free', nullif(p_price, ''), true,
    nullif(p_phone, ''), nullif(p_address, ''), coalesce(nullif(p_city, ''), 'Houston, TX'),
    nullif(p_about, ''), nullif(p_about, ''),
    nullif(p_specialty_es, ''), nullif(p_specialty_en, ''),
    coalesce(p_subcats, '{}'), coalesce(p_features, '{}'), p_hours, coalesce(nullif(p_tile_a, ''), '#EFEBFF'), coalesce(nullif(p_tile_b, ''), '#7B61FF'),
    0, 0,
    case when p_lat is not null and p_lng is not null
         then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end
  );
  return new_slug;
end $$;

grant execute on function public.create_business to authenticated;
