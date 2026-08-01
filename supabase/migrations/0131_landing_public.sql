-- 0131_landing_public.sql — datos REALES para la landing pública (2026-07-29).
--
-- POR QUÉ: el handoff de la nueva Home trae negocios, eventos, listados y
-- testimonios de muestra ("Taquería La Esperanza · 4.7 · 86 reseñas", "María
-- Cruz, Vecina · Spring Branch"). Publicar eso sería repetir exactamente lo que
-- se limpió hoy: datos fabricados presentados como reales (regla #8) — y encima
-- en la página que más se ve, con testimonios falsos, que es lo más dañino para
-- la confianza. El propio handoff lo dice: "counts, ratings, prices and business
-- names are representative sample data, not seeded content".
--
-- Este archivo da las fuentes reales. Todo es de LECTURA PÚBLICA y no expone
-- nada privado: solo negocios ya listados, eventos publicados y reseñas que ya
-- son visibles en la ficha del negocio.

-- ════════════════════════════════════════════════════════════════════════════
-- 1 · Conteos de la plataforma (hero, tarjetas de categoría, "Ver los N")
-- ════════════════════════════════════════════════════════════════════════════
-- ESCALA: hoy son conteos exactos porque las tablas son pequeñas y el plan usa
-- índices. A volumen real (1M+) un count(*) por visita a la landing es caro:
-- migrar entonces a estimaciones de `pg_class.reltuples` (O(1)) o a una tabla de
-- contadores materializada y refrescada por cron. Anotado en LAUNCH-CHECKLIST.
-- La función es STABLE para que el cliente pueda cachearla por sesión.
create or replace function public.platform_stats()
returns jsonb
language sql stable security definer set search_path to 'public' as $fn$
  select jsonb_build_object(
    'businesses',  (select count(*) from businesses where tile_a is not null and suspended = false),
    'verified',    (select count(*) from businesses where tile_a is not null and suspended = false and tier in ('verified','premium')),
    'avg_rating',  (select round(avg(rating)::numeric, 1) from businesses where tile_a is not null and suspended = false and reviews_count > 0),
    'reviews',     (select count(*) from reviews),
    'neighbors',   (select count(*) from profiles),
    'posts',       (select count(*) from posts),
    'events_week', (select count(*) from events where starts_at between now() and now() + interval '7 days'),
    'properties',  (select count(*) from properties where status = 'published'),
    'vehicles',    (select count(*) from vehicles where status = 'published'),
    'jobs',        (select count(*) from business_jobs where status = 'open'),
    'by_category', (select coalesce(jsonb_object_agg(category_id, n), '{}'::jsonb)
                      from (select category_id, count(*) as n
                              from businesses
                             where tile_a is not null and suspended = false and category_id is not null
                             group by category_id) t)
  );
$fn$;
grant execute on function public.platform_stats() to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 2 · Testimonios REALES (sección "Lo que dice la comunidad")
-- ════════════════════════════════════════════════════════════════════════════
-- Reseñas de verdad, de 5 estrellas, con texto suficiente para leerse como
-- testimonio. Devuelve el nombre visible del autor y el negocio reseñado — lo
-- mismo que ya se ve públicamente en la ficha del negocio, nada nuevo.
-- Si no hay ninguna, devuelve 0 filas y la landing OCULTA la sección: mejor sin
-- testimonios que con testimonios inventados.
create or replace function public.landing_testimonials(max_results integer default 3)
returns table(
  id uuid, author text, initials text, rating numeric, body_es text, body_en text,
  biz_name text, biz_slug text, biz_city text)
language sql stable security definer set search_path to 'public' as $fn$
  -- `reviews` ya guarda el nombre visible y las iniciales del autor, así que no
  -- hace falta tocar `profiles` (que además es privado por RLS).
  select r.id,
         coalesce(nullif(btrim(r.author_name), ''), 'Vecino') as author,
         coalesce(nullif(btrim(r.author_initials), ''), upper(left(coalesce(nullif(btrim(r.author_name), ''), 'V'), 1))) as initials,
         r.rating,
         r.body_es, r.body_en,
         b.name, b.slug, b.city
    from reviews r
    join businesses b on b.id = r.business_id
   where r.rating >= 5
     and coalesce(r.hidden, false) = false
     and b.suspended = false
     and length(coalesce(r.body_es, '')) between 60 and 400
   order by r.featured desc nulls last, length(r.body_es) desc, r.created_at desc
   limit greatest(1, least(coalesce(max_results, 3), 12));
$fn$;
grant execute on function public.landing_testimonials(integer) to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 3 · Mercado: casas, autos y empleos reales para la sección de tres columnas
-- ════════════════════════════════════════════════════════════════════════════
-- Tres listas cortas. Cada una devuelve lo mínimo que pinta la fila del diseño
-- (título, meta, precio, etiqueta). Sin filas → la columna muestra su vacío.
create or replace function public.landing_marketplace(max_each integer default 3)
returns jsonb
language sql stable security definer set search_path to 'public' as $fn$
  with lim as (select greatest(1, least(coalesce(max_each, 3), 6)) as n)
  select jsonb_build_object(
    'homes', coalesce((select jsonb_agg(x) from (
        select p.slug, p.title as name,
               concat_ws(' · ', nullif(p.hood, ''), nullif(p.city, ''),
                         case when p.beds is not null then p.beds || '/' || coalesce(p.baths::text, '?') end) as meta,
               p.price, p.deal
          from properties p, lim
         where p.status = 'published'
         order by p.created_at desc
         limit (select n from lim)) x), '[]'::jsonb),
    'autos', coalesce((select jsonb_agg(x) from (
        select v.slug, concat_ws(' ', v.year::text, v.make, v.model) as name,
               concat_ws(' · ', case when v.miles is not null then to_char(v.miles, 'FM999,999') || ' mi' end,
                         nullif(v.city, '')) as meta,
               v.price, v.bhph
          from vehicles v, lim
         where v.status = 'published'
         order by v.created_at desc
         limit (select n from lim)) x), '[]'::jsonb),
    'jobs', coalesce((select jsonb_agg(x) from (
        select j.id, coalesce(j.title_es, j.title_en) as name,
               concat_ws(' · ', nullif(b.city, ''), nullif(coalesce(j.type_es, j.type_en), '')) as meta,
               j.pay
          from business_jobs j
          join businesses b on b.id = j.business_id
             , lim
         where j.status = 'open' and b.suspended = false
         order by j.created_at desc
         limit (select n from lim)) x), '[]'::jsonb)
  );
$fn$;
grant execute on function public.landing_marketplace(integer) to anon, authenticated;

notify pgrst, 'reload schema';
