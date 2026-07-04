-- To'Latino — dynamic per-category feature filter. Each business carries a set
-- of feature/attribute tags (stored as the Spanish canonical label from the
-- app's FEATURES_COMMON / FEATURES_BY_CAT), so the Negocios directory can offer
-- Yelp-style "Sugeridos" + per-category "Características" filters. GIN index for
-- containment queries at scale. businesses_v2 returns the tags and
-- create_business accepts them. Idempotent.
-- Apply: paste into the Supabase SQL Editor and Run.

alter table public.businesses add column if not exists features text[] not null default '{}';
create index if not exists businesses_features_gin on public.businesses using gin (features);

-- ── Backfill the seeded businesses with real features ────────────────────────
update public.businesses b set features = v.feats
from (values
  ('taqueria-la-esperanza',  array['A domicilio','Para llevar','Comedor','Apto para niños','Se habla español']::text[]),
  ('don-beto-mecanica',      array['Presupuesto gratis','Garantía','Servicio a domicilio','Se habla español']),
  ('dulces-encanto',         array['Para llevar','A domicilio','Catering','Se habla español']),
  ('salon-bella-vida',       array['Con cita','Sin cita','Unisex','Se habla español']),
  ('clinica-familiar-sana',  array['Sin seguro OK','Mismo día','Personal bilingüe']),
  ('abogada-ramirez',        array['Consulta gratis','Planes de pago','Bilingüe']),
  ('lavado-express-sol',     array['Servicio express','Estacionamiento']),
  ('ferreteria-el-tornillo', array['Presupuesto gratis','Se habla español','Estacionamiento']),
  ('hz-sabor-quisqueya',     array['Comedor','Para llevar','Desayuno','Se habla español']),
  ('hz-colmado-esquina',     array['Envío de dinero','Abierto tarde','Se habla español']),
  ('hz-taller-reyes',        array['Presupuesto gratis','Garantía','Se habla español']),
  ('hz-remesas-caribe',      array['Envíos a Latinoamérica','Bilingüe','Mismo día']),
  ('bo-pupuseria-bendicion', array['Comedor','Para llevar','A domicilio','Se habla español']),
  ('bo-panaderia-trigal',    array['Para llevar','Desayuno','Se habla español']),
  ('bo-salon-glamour',       array['Con cita','Sin cita','Novias','Se habla español']),
  ('bo-taller-aparicio',     array['Presupuesto gratis','Garantía','Grúa','Se habla español']),
  ('bo-clinica-familia',     array['Sin seguro OK','Mismo día','Personal bilingüe']),
  ('bo-abogado-restrepo',    array['Consulta gratis','Planes de pago','Bilingüe']),
  ('bx-malecon-dominicano',  array['Comedor','Para llevar','A domicilio','Música en vivo']),
  ('bx-barberia-panas',      array['Sin cita','Apto para niños','Se habla español']),
  ('bx-bodega-la-isla',      array['Envío de dinero','Abierto tarde','Acepta WIC/EBT']),
  ('bx-mecanica-boricua',    array['Presupuesto gratis','Garantía','Se habla español']),
  ('bx-salon-caribena',      array['Con cita','Sin cita','Se habla español']),
  ('bx-legal-vargas',        array['Consulta gratis','Planes de pago','Bilingüe'])
) as v(slug, feats)
where b.slug = v.slug;

-- ── businesses_v2: also return the feature tags (drop first: return type change)
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

-- ── create_business: accept feature tags (trailing optional param) ───────────
drop function if exists public.create_business(
  text, text, text[], text, text, text, text, text, text, text, text, text, double precision, double precision);

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
  p_features     text[] default '{}'
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
    specialty_es, specialty_en, subcategories, features, tile_a, tile_b,
    rating, reviews_count, location
  ) values (
    new_slug, trim(p_name), p_category, uid, 'free', nullif(p_price, ''), true,
    nullif(p_phone, ''), nullif(p_address, ''), coalesce(nullif(p_city, ''), 'Houston, TX'),
    nullif(p_about, ''), nullif(p_about, ''),
    nullif(p_specialty_es, ''), nullif(p_specialty_en, ''),
    coalesce(p_subcats, '{}'), coalesce(p_features, '{}'), coalesce(nullif(p_tile_a, ''), '#EFEBFF'), coalesce(nullif(p_tile_b, ''), '#7B61FF'),
    0, 0,
    case when p_lat is not null and p_lng is not null
         then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end
  );
  return new_slug;
end $$;

-- Grant the exact signature (not the bare name) so re-running this migration
-- when the 14- or 16-arg overload also exists never trips "42725: not unique".
grant execute on function public.create_business(
  text, text, text[], text, text, text, text, text, text, text, text, text, double precision, double precision, text[]
) to authenticated;
