-- To'Latino — subcategories on businesses. Each business carries 1+ subcategory
-- tags (stored as the Spanish canonical label from SUBCATS in the app), so the
-- Negocios directory can filter by subcategory. GIN index for containment
-- queries at scale. businesses_v2 returns the tags. Idempotent.
-- Apply: paste into the Supabase SQL Editor and Run.

alter table public.businesses add column if not exists subcategories text[] not null default '{}';
create index if not exists businesses_subcats_gin on public.businesses using gin (subcategories);

-- ── Backfill the seeded businesses with real subcategories ───────────────────
update public.businesses b set subcategories = v.subs
from (values
  ('taqueria-la-esperanza',  array['Taquería','Tacos','Mexicana']::text[]),
  ('don-beto-mecanica',      array['Taller mecánico','Afinación','Frenos']),
  ('dulces-encanto',         array['Dulcería','Repostería','Pastelería']),
  ('salon-bella-vida',       array['Salón de belleza','Uñas','Corte de cabello']),
  ('clinica-familiar-sana',  array['Clínica','Médico general','Pediatra']),
  ('abogada-ramirez',        array['Abogado','Abogado de inmigración','Notario']),
  ('lavado-express-sol',     array['Autolavado','Detallado','Polarizado']),
  ('ferreteria-el-tornillo', array['Handyman','Construcción']),
  ('hz-sabor-quisqueya',     array['Dominicana','Desayunos','Cocina económica']),
  ('hz-colmado-esquina',     array['Abarrotes','Tienda latina','Tienda de conveniencia']),
  ('hz-taller-reyes',        array['Taller mecánico','Frenos','Afinación']),
  ('hz-remesas-caribe',      array['Envío de dinero','Cambio de cheques','Trámites y documentos']),
  ('bo-pupuseria-bendicion', array['Pupusería','Salvadoreña','Antojitos']),
  ('bo-panaderia-trigal',    array['Panadería','Pastelería','Café']),
  ('bo-salon-glamour',       array['Salón de belleza','Uñas','Maquillaje']),
  ('bo-taller-aparicio',     array['Taller mecánico','Hojalatería y pintura','Frenos']),
  ('bo-clinica-familia',     array['Clínica','Médico general','Pediatra']),
  ('bo-abogado-restrepo',    array['Abogado','Abogado de inmigración','Notario']),
  ('bx-malecon-dominicano',  array['Dominicana','Desayunos','Mariscos']),
  ('bx-barberia-panas',      array['Barbería','Corte de cabello']),
  ('bx-bodega-la-isla',      array['Abarrotes','Tienda de conveniencia','Tienda latina']),
  ('bx-mecanica-boricua',    array['Taller mecánico','Afinación','Frenos']),
  ('bx-salon-caribena',      array['Salón de belleza','Uñas','Trenzas']),
  ('bx-legal-vargas',        array['Abogado','Abogado de inmigración','Notario'])
) as v(slug, subs)
where b.slug = v.slug;

-- ── businesses_v2: return the subcategory tags (drop first: return type change)
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
