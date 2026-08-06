-- 0155_la_ficha_v2_trae_lo_que_el_dueno_declara.sql
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- DE DÓNDE SALE: el fundador aprobó el handoff «Business Detail v2» COMPLETO
-- (2026-08-06): «necesito que el diseño sea idéntico, tanto en desktop como en
-- mobile». Varias secciones de ese diseño necesitan datos que la base no
-- guardaba en ningún sitio:
--   · «Bueno saber» (famosos por · espera típica · lugar) — rejilla 2×2 del
--     Overview. El cuarto cuadro (Pagos) se DERIVA en el cliente de
--     accepts_payments + la config de venta; no se guarda.
--   · «Lo más lleno» (horas pico) — las barras de la hoja de Horario.
--   · La tarjeta del dueño («Doña Rosa · dueña») del riel de escritorio.
--   · Transporte y estacionamiento — los cuadros de Ubicación en escritorio.
--
-- REGLA #7 (nada fabricado): TODO esto lo declara el dueño en su panel. Lo que
-- no declaró, no existe y la ficha NO lo pinta — nunca se rellena con texto de
-- muestra. Por eso todo es opcional y el valor por defecto es «no hay».
--
-- DÓNDE VIVE: en `businesses.settings->'ficha'` (jsonb), no en columnas nuevas.
--   settings.ficha = {
--     famoso:          text,   -- «Conchas — se acaban a las 10»
--     espera:          text,   -- «Unos 10 min en mostrador»
--     lugar:           text,   -- «28 adentro + patio con perros»
--     transporte:      text,   -- «Bus 40 en la esquina»
--     estacionamiento: text,   -- «Estacionamiento propio gratis»
--     dueno: { nombre: text, rol: text },  -- «Doña Rosa» · «dueña»
--     pico:  int[14]           -- nivel 0–3 por hora, 7 am → 8 pm, un día típico
--   }
-- El panel ya puede escribir `settings` (columna en la lista WRITABLE del
-- cliente y cubierta por la RLS de dueño existente), así que el ÚNICO cambio de
-- base es exponer el objeto en `business_by_slug`, que es la función pública
-- que alimenta la ficha.
--
-- El cuerpo de abajo se copió de la función VIVA (pg_get_functiondef en la base
-- de pruebas, idéntica a 0151) — lección de la 0151: cuando se toca una función
-- viva se parte de la que hay, nunca de la memoria. Lo único nuevo es la última
-- columna `ficha`.

-- Añadir una columna al retorno obliga a tirar la función antes: PostgreSQL no
-- deja cambiar el tipo de retorno con `create or replace`. Va en la misma
-- petición que el `create`, así que si algo falla se deshace entera y no queda
-- un momento sin función.
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
  lat double precision, lng double precision,
  ficha jsonb
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
         case when coalesce(trim(b.address), '') <> '' then st_y(b.location::geometry) end,
         case when coalesce(trim(b.address), '') <> '' then st_x(b.location::geometry) end,
         -- ── lo único nuevo: lo que el dueño declaró para su ficha ──
         b.settings->'ficha'
  from public.businesses b
  where b.slug = in_slug and b.suspended = false
  limit 1;
$fn$;

-- La ficha se ve SIN cuenta: pública a propósito (está en la lista blanca de
-- scripts/verify-permisos.mjs). Recrear una función la deja ejecutable por
-- PUBLIC otra vez; se explicita para que no dependa del azar.
grant execute on function public.business_by_slug(text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
