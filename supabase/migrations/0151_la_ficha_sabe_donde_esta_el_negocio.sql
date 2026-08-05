-- 0151_la_ficha_sabe_donde_esta_el_negocio.sql
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- DE DÓNDE SALE: el fundador preguntó cómo hacer «funcional» el mapa de la
-- ficha del negocio (2026-08-05). Al mirarlo, la sección «Ubicación» no era un
-- mapa apagado: **no era un mapa**. Era el rayado gris con un pin dibujado
-- siempre en el centro, sin relación con la dirección real. Para poner un mapa
-- de verdad falta el dato que nunca salía de la base: `business_by_slug`
-- devolvía 37 columnas y ninguna era la coordenada.
--
-- ESTA MIGRACIÓN ES EL CUERPO ORIGINAL DE LA FUNCIÓN + DOS COLUMNAS. Nada más.
-- Se copió tal cual de la base (`prosrc`) en vez de reescribirlo: la primera
-- versión de este archivo lo redactó de memoria y salió MUY distinta —
-- amenities con otro join, y el bloque de `delivery` reducido a un `settings ->
-- 'delivery'` que habría dejado sin envío a todos los negocios. Habría roto la
-- ficha entera. Cuando se toca una función viva, se parte de la que hay.
--
-- ════════════════════════════════════════════════════════════════════════════
-- LA DECISIÓN QUE NO ES OBVIA: a quién se le enseña el punto exacto
-- ════════════════════════════════════════════════════════════════════════════
-- Un negocio con local tiene dirección pública: enseñar su punto es lo que el
-- dueño quiere. Pero MUCHOS negocios de esta comunidad no tienen local —
-- cocinan, cosen o reparan **desde su casa**. Para ellos la coordenada exacta
-- es su domicilio, y el propio alta se lo promete por escrito:
--   «No tengo local — trabajo desde casa o a domicilio.
--    Mostramos tu zona de servicio, no tu dirección exacta.»
--
-- Regla, entonces: **coordenada solo si hay dirección**. Sin dirección se
-- devuelve NULL y la ficha se queda con su marcador de posición — nunca un pin
-- sobre la casa de alguien. Cumplir esa promesa importa más que tener el mapa
-- lleno. (Precedente: `tg_fuzz_post_coords` ya difumina las coordenadas de las
-- publicaciones de Comunidad por lo mismo.)

-- Añadir columnas al retorno obliga a tirar la función antes: PostgreSQL no deja
-- cambiar el tipo de retorno con `create or replace`. Va en la misma
-- transacción que el `create` de abajo, así que si algo fallara no queda un
-- momento sin función — la petición entera se deshace.
drop function if exists public.business_by_slug(text);

create function public.business_by_slug(in_slug text)
returns table (
  slug text, name text, category_id text, rating numeric, reviews_count integer,
  price_level text, is_open boolean, tier text, endorse_count integer,
  tile_a text, tile_b text, specialty_es text, specialty_en text,
  subcategories text[], features text[], card_features text[],
  hours jsonb, hours_exceptions jsonb, amenities_es text[], amenities_en text[],
  review_es text, review_en text, phone text, address text, city text,
  website text, logo_url text, accepts_messages boolean, message_channel text,
  message_phone text, about_es text, about_en text, distance_m double precision,
  modules jsonb, accepts_payments boolean, delivery jsonb,
  lat double precision, lng double precision
)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
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
         null::double precision,
         b.modules,
         coalesce(b.connect_charges_enabled, false),
         case when (b.settings->'shipping'->'delivery'->>'on')::boolean is true then
           jsonb_build_object(
             'on', true,
             'fee', coalesce(nullif(regexp_replace(b.settings->'shipping'->'delivery'->>'fee', '[^0-9.]', '', 'g'), ''), '0')::numeric,
             'min', coalesce(nullif(b.settings->'delivery_ops'->>'minOrder', ''), '0')::numeric,
             'prep', coalesce(nullif(b.settings->'delivery_ops'->>'prepTime', ''), '25')::numeric,
             'radius', case when coalesce(b.settings->'delivery_ops'->>'radiusMi', '') ~ '^\d+\.?\d*$'
                            then (b.settings->'delivery_ops'->>'radiusMi')::numeric end,
             'tips', coalesce(b.settings->'tips', '{}'::jsonb),
             'time', nullif(b.settings->'shipping'->'delivery'->'zones'->0->>'time', '')
           )
         else jsonb_build_object('on', false) end,
         -- ── lo único nuevo ──
         case when coalesce(trim(b.address), '') <> '' then st_y(b.location::geometry) end,
         case when coalesce(trim(b.address), '') <> '' then st_x(b.location::geometry) end
  from public.businesses b
  where b.slug = in_slug and b.suspended = false
  limit 1;
$fn$;

-- La ficha se ve SIN cuenta, así que esta función es pública a propósito y está
-- en la lista blanca de `scripts/verify-permisos.mjs`. Recrearla la deja
-- ejecutable por PUBLIC otra vez; se explicita para que no dependa del azar.
grant execute on function public.business_by_slug(text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
