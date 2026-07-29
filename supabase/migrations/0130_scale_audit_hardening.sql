-- 0130_scale_audit_hardening.sql — auditoría de seguridad + escala (2026-07-29).
-- Idempotente, portable a Postgres vanilla. No cambia datos.
--
-- Cierra 3 agujeros de privilegios reachables golpeando PostgREST directamente
-- (sin pasar por la app) y arregla el cuello de botella #1 de escala: las
-- consultas de descubrimiento geográfico NO usaban el índice GIST.
--
-- Evidencia medida en staging (548 negocios) antes del fix:
--   businesses_v2(...)                → 652 ms  (Function Scan, 3677 buffers)
--   where st_distance(loc,g) <= 80000 → Parallel Seq Scan, 97.7 ms, 1859 buffers
--   where st_dwithin(loc,g,80000)     → Index Scan GIST,     32.1 ms,  441 buffers  (274 filas idénticas)
-- El Seq Scan crece lineal con la tabla: a 1M de negocios es inviable.

-- ════════════════════════════════════════════════════════════════════════════
-- H1 · profiles: columnas privilegiadas NO son escribibles por el usuario
-- ════════════════════════════════════════════════════════════════════════════
-- La policy "update own profile" (auth.uid() = id) es de FILA, y Supabase concede
-- UPDATE sobre TODAS las columnas → un usuario podía PATCH su propio perfil con:
--   {"suspended_until": null}      → levantarse su propia suspensión (0120 lee
--                                    ESTA columna para bloquear publicaciones;
--                                    todo el sistema de moderación se anulaba)
--   {"stripe_customer_id":"cus_X"} → apuntar su perfil al Stripe Customer de otra
--                                    persona; marketplace-checkout usa esa columna
--                                    para el depósito de renta (guarda la tarjeta y
--                                    el webhook cobra off-session) → cargo a la
--                                    tarjeta de la víctima.
-- Verificado 2026-07-29 como authenticated: el UPDATE pasaba.
-- Fix portable: privilegios a NIVEL COLUMNA. La app solo escribe estas 9
-- (apps/web/src/lib/auth.tsx: signUp/saveLocation/updateProfile); `id` se incluye
-- porque PostgREST hace upsert (ON CONFLICT DO UPDATE SET id = excluded.id) y la
-- policy WITH CHECK (auth.uid() = id) impide cambiarlo a otro usuario.
revoke update on public.profiles from anon, authenticated;
grant update (id, display_name, initials, avatar_color, city_label, lat, lng, bio, settings)
  on public.profiles to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- H2 · businesses: ampliar el guard de columnas protegidas (0081)
-- ════════════════════════════════════════════════════════════════════════════
-- 0081 ya protegía tier/rating/reviews_count/owner_id/stripe_account_id/connect_*
-- (verificado: siguen bloqueadas). Pero quedaron FUERA tres columnas que el admin
-- controla y el dueño podía escribir directo — verificado 2026-07-29 invirtiendo
-- el valor real (no basta con re-escribir el mismo valor: el guard compara IS
-- DISTINCT FROM y un no-cambio pasa siempre):
--   suspended / suspended_reason → un negocio suspendido se auto-reactivaba
--   verified_license             → auto-otorgarse la insignia de licencia verificada
--                                  (confianza: es el sello de agentes/dealers)
--   featured / featured_at / featured_by → auto-promoverse a destacado
-- Mismo patrón que 0081: guardar por CURRENT_USER, así los escritores legítimos
-- (RPCs SECURITY DEFINER del admin, service_role del webhook) siguen pasando.
create or replace function public.tg_businesses_guard_cols()
returns trigger language plpgsql as $fn$
begin
  if current_user in ('authenticated', 'anon') then
    if new.tier                      is distinct from old.tier
    or new.rating                    is distinct from old.rating
    or new.reviews_count             is distinct from old.reviews_count
    or new.owner_id                  is distinct from old.owner_id
    or new.stripe_account_id         is distinct from old.stripe_account_id
    or new.connect_charges_enabled   is distinct from old.connect_charges_enabled
    or new.connect_details_submitted is distinct from old.connect_details_submitted
    -- nuevas (0130):
    or new.suspended                 is distinct from old.suspended
    or new.suspended_reason          is distinct from old.suspended_reason
    or new.verified_license          is distinct from old.verified_license
    or new.featured                  is distinct from old.featured
    or new.featured_at               is distinct from old.featured_at
    or new.featured_by               is distinct from old.featured_by
    then
      raise exception 'no autorizado: columnas protegidas del negocio (tier/rating/connect/owner/suspensión/licencia/destacado) solo cambian por el sistema';
    end if;
  end if;
  return new;
end $fn$;

drop trigger if exists businesses_guard_protected_cols on public.businesses;
create trigger businesses_guard_protected_cols
  before update on public.businesses
  for each row execute function public.tg_businesses_guard_cols();

-- ════════════════════════════════════════════════════════════════════════════
-- H3 · businesses_v2: usa el índice GIST + oculta suspendidos + subconsultas
--      DESPUÉS del LIMIT
-- ════════════════════════════════════════════════════════════════════════════
-- Tres defectos en la consulta MÁS caliente de la app (el listado de Negocios):
--  1) `st_distance(b.location, g) <= radius_m` no es indexable → Parallel Seq Scan
--     sobre businesses. `st_dwithin` sí usa businesses_location_gix.
--  2) Las 4 subconsultas correlacionadas (amenities ×2, reseña destacada ×2) se
--     evaluaban para CADA fila candidata ANTES del LIMIT. Ahora se filtra +
--     ordena + LIMITa primero (CTE `cand`) y solo las ≤100 filas finales pagan
--     las subconsultas.
--  3) NO filtraba negocios suspendidos (search_businesses sí) → un negocio
--     suspendido por el admin seguía en el feed principal. Verificado 2026-07-29.
-- Se pasa a plpgsql para RAMIFICAR según haya o no coordenadas: así el camino
-- geográfico (el común) queda garantizado sobre el índice, en vez de depender de
-- una cadena de OR que el planner no puede podar (la función es SECURITY DEFINER
-- → no se inlinea → los parámetros no son constantes en tiempo de plan).
-- Cambio de comportamiento acotado y deliberado: cuando hay filtro por radio, un
-- negocio SIN coordenadas ya no se incluye (antes entraba sin importar distancia,
-- lo cual mostraba negocios de otra ciudad). Hoy afecta a 0 filas: no existe
-- ningún negocio listado (tile_a not null) con location null.
create or replace function public.businesses_v2(
  user_lat    double precision default null,
  user_lng    double precision default null,
  in_city     text default null,
  max_results integer default 50,
  radius_m    double precision default 80000)
returns table(
  slug text, name text, category_id text, rating numeric, reviews_count integer,
  price_level text, is_open boolean, tier text, endorse_count integer,
  tile_a text, tile_b text, specialty_es text, specialty_en text,
  subcategories text[], features text[], card_features text[],
  hours jsonb, hours_exceptions jsonb, amenities_es text[], amenities_en text[],
  review_es text, review_en text, phone text, address text, city text,
  website text, logo_url text, accepts_messages boolean, message_channel text,
  message_phone text, about_es text, about_en text, distance_m double precision)
language plpgsql stable security definer set search_path to 'public' as $fn$
declare
  g   geography;
  lim integer := greatest(1, least(coalesce(max_results, 50), 100));
begin
  if user_lat is not null and user_lng is not null then
    g := st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography;
  end if;

  return query
  with cand as (
    select b.id,
           b.slug, b.name, b.category_id, b.rating, b.reviews_count,
           b.price_level, b.is_open, b.tier, b.endorse_count, b.tile_a, b.tile_b,
           b.specialty_es, b.specialty_en, b.subcategories, b.features,
           b.card_features, b.hours, b.hours_exceptions, b.phone, b.address,
           b.city, b.website, b.logo_url, b.accepts_messages, b.message_channel,
           b.message_phone, b.about_es, b.about_en,
           case when g is not null and b.location is not null
                then st_distance(b.location, g) end as dist
      from public.businesses b
     where b.tile_a is not null
       and b.suspended = false                                  -- (3)
       and (in_city is null or b.city = in_city)
       and (
         -- (1) camino geográfico indexable; si no hay origen/radio, sin filtro
         case when g is null or radius_m is null then true
              else st_dwithin(b.location, g, radius_m) end
       )
     order by dist asc nulls last, b.rating desc, b.id
     limit lim
  )
  select c.slug, c.name, c.category_id, c.rating, c.reviews_count,
         c.price_level, c.is_open, c.tier, c.endorse_count, c.tile_a, c.tile_b,
         c.specialty_es, c.specialty_en, c.subcategories, c.features,
         c.card_features, c.hours, c.hours_exceptions,
         (select coalesce(array_agg(a.name_es order by a.id), '{}')          -- (2)
            from public.business_amenities ba
            join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = c.id),
         (select coalesce(array_agg(a.name_en order by a.id), '{}')
            from public.business_amenities ba
            join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = c.id),
         (select r.body_es from public.reviews r
           where r.business_id = c.id and r.featured
           order by r.created_at desc limit 1),
         (select r.body_en from public.reviews r
           where r.business_id = c.id and r.featured
           order by r.created_at desc limit 1),
         c.phone, c.address, c.city, c.website, c.logo_url,
         c.accepts_messages, c.message_channel, c.message_phone,
         c.about_es, c.about_en, c.dist
    from cand c
   order by c.dist asc nulls last, c.rating desc, c.id;
end $fn$;

-- ════════════════════════════════════════════════════════════════════════════
-- H4 · search_businesses: mismo tratamiento (índice GIST + post-LIMIT)
-- ════════════════════════════════════════════════════════════════════════════
-- Ya filtraba suspended = false (correcto). Se corrige el filtro de radio y se
-- mueven las 4 subconsultas después del LIMIT/OFFSET. El ranking textual
-- (ts_rank + websearch_to_tsquery + similarity) se conserva EXACTO.
create or replace function public.search_businesses(
  in_q           text default null,
  user_lat       double precision default null,
  user_lng       double precision default null,
  in_city        text default null,
  in_cat         text default null,
  in_price       text default null,
  in_min_rating  numeric default null,
  max_results    integer default 30,
  in_offset      integer default 0,
  radius_m       double precision default 80000)
returns table(
  slug text, name text, category_id text, rating numeric, reviews_count integer,
  price_level text, is_open boolean, tier text, endorse_count integer,
  tile_a text, tile_b text, specialty_es text, specialty_en text,
  subcategories text[], features text[], card_features text[],
  hours jsonb, hours_exceptions jsonb, amenities_es text[], amenities_en text[],
  review_es text, review_en text, phone text, address text, city text,
  website text, logo_url text, accepts_messages boolean, message_channel text,
  message_phone text, about_es text, about_en text, distance_m double precision)
language plpgsql stable security definer set search_path to 'public' as $fn$
declare
  g   geography;
  t   text := nullif(btrim(coalesce(in_q, '')), '');
  lim integer := greatest(1, least(coalesce(max_results, 30), 60));
  off integer := greatest(0, coalesce(in_offset, 0));
begin
  if user_lat is not null and user_lng is not null then
    g := st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography;
  end if;

  return query
  with cand as (
    select b.id,
           b.slug, b.name, b.category_id, b.rating, b.reviews_count,
           b.price_level, b.is_open, b.tier, b.endorse_count, b.tile_a, b.tile_b,
           b.specialty_es, b.specialty_en, b.subcategories, b.features,
           b.card_features, b.hours, b.hours_exceptions, b.phone, b.address,
           b.city, b.website, b.logo_url, b.accepts_messages, b.message_channel,
           b.message_phone, b.about_es, b.about_en,
           case when g is not null and b.location is not null
                then st_distance(b.location, g) end as dist,
           case when t is not null
                then ts_rank(b.search_tsv, websearch_to_tsquery('simple', t)) end as rnk
      from public.businesses b
     where b.tile_a is not null
       and b.suspended = false
       and (in_city is null or b.city = in_city)
       and (in_cat is null or in_cat = 'all' or b.category_id = in_cat)
       and (in_price is null or b.price_level = in_price)
       and (in_min_rating is null or b.rating >= in_min_rating)
       and (
         case when g is null or radius_m is null then true
              else st_dwithin(b.location, g, radius_m) end
       )
       and (
         t is null
         or b.search_tsv @@ websearch_to_tsquery('simple', t)
         or b.name ilike '%' || t || '%'
         or similarity(b.name, t) > 0.2
       )
     order by rnk desc nulls last, dist asc nulls last, b.rating desc, b.id
     offset off
     limit lim
  )
  select c.slug, c.name, c.category_id, c.rating, c.reviews_count,
         c.price_level, c.is_open, c.tier, c.endorse_count, c.tile_a, c.tile_b,
         c.specialty_es, c.specialty_en, c.subcategories, c.features,
         c.card_features, c.hours, c.hours_exceptions,
         (select coalesce(array_agg(a.name_es order by a.id), '{}')
            from public.business_amenities ba
            join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = c.id),
         (select coalesce(array_agg(a.name_en order by a.id), '{}')
            from public.business_amenities ba
            join public.amenities a on a.id = ba.amenity_id
           where ba.business_id = c.id),
         (select r.body_es from public.reviews r
           where r.business_id = c.id and r.featured
           order by r.created_at desc limit 1),
         (select r.body_en from public.reviews r
           where r.business_id = c.id and r.featured
           order by r.created_at desc limit 1),
         c.phone, c.address, c.city, c.website, c.logo_url,
         c.accepts_messages, c.message_channel, c.message_phone,
         c.about_es, c.about_en, c.dist
    from cand c
   order by c.rnk desc nulls last, c.dist asc nulls last, c.rating desc, c.id;
end $fn$;

-- ════════════════════════════════════════════════════════════════════════════
-- H5 · posts_near (feed de Comunidad = pantalla de INICIO) usa el índice GIST
-- ════════════════════════════════════════════════════════════════════════════
-- Mismo patrón: `st_distance(...) <= radius_m` obligaba a un Seq Scan sobre posts
-- en CADA carga del inicio. Con millones de publicaciones es el peor caso de la
-- app. Semántica preservada salvo el mismo detalle acotado: con radio, un post
-- sin coordenadas queda fuera (hoy: 0 filas con location null).
create or replace function public.posts_near(
  user_lat    double precision default null,
  user_lng    double precision default null,
  radius_m    double precision default 48280,
  max_results integer default 50)
returns setof public.posts
language plpgsql stable set search_path to 'public' as $fn$
declare
  g   geography;
  lim integer := greatest(1, least(coalesce(max_results, 50), 100));
begin
  if user_lat is not null and user_lng is not null then
    g := st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography;
  end if;

  return query
  select p.*
    from public.posts p
   where case when g is null or radius_m is null then true
              else st_dwithin(p.location, g, radius_m) end
   order by p.created_at desc, p.id
   limit lim;
end $fn$;

-- ════════════════════════════════════════════════════════════════════════════
-- H6 · Índices de respaldo para claves foráneas (36 sin índice)
-- ════════════════════════════════════════════════════════════════════════════
-- Postgres NO crea índices para las FK. Sin ellos:
--  · borrar/anonimizar UNA cuenta escanea ENTERAS todas las tablas hijas
--    (posts, likes, votos, reseñas…) — a 1M usuarios, minutos por borrado, y el
--    borrado de cuenta es un requisito legal/tienda de apps;
--  · las consultas "lo mío" (mis posts, mis likes, mis reseñas) hacen Seq Scan.
-- Las columnas de MODERACIÓN (*_by, handled_by, assigned_to, updated_by,
-- created_by) van con índice PARCIAL (where ... is not null): son casi todo NULL,
-- así el índice queda diminuto pero igual evita el escaneo en cascada.
-- CONCURRENTLY no se usa a propósito: no funciona dentro de una transacción y
-- estas tablas son pequeñas hoy; en una base ya grande, crearlos CONCURRENTLY.

-- ── hot: pertenencia de usuario ──────────────────────────────────────────────
create index if not exists posts_author_idx              on public.posts (author_id);
create index if not exists post_comments_author_idx      on public.post_comments (author_id);
create index if not exists post_likes_user_idx           on public.post_likes (user_id);
create index if not exists comment_likes_user_idx        on public.comment_likes (user_id);
create index if not exists poll_votes_user_idx           on public.poll_votes (user_id);
create index if not exists saved_posts_user_idx          on public.saved_posts (user_id);
create index if not exists reviews_user_idx              on public.reviews (user_id);
create index if not exists event_reviews_user_idx        on public.event_reviews (user_id);
create index if not exists business_customers_user_idx   on public.business_customers (user_id);
create index if not exists business_conv_customer_idx    on public.business_conversations (customer_user_id);
create index if not exists payments_buyer_idx            on public.payments (buyer_id);
create index if not exists event_waitlist_user_idx       on public.event_waitlist (user_id);
create index if not exists post_reports_reporter_idx     on public.post_reports (reporter_id);
create index if not exists reports_reporter_idx          on public.reports (reporter_id);

-- ── relaciones internas ─────────────────────────────────────────────────────
create index if not exists posts_endorsement_idx         on public.posts (endorsement_id) where endorsement_id is not null;
create index if not exists pending_purchases_business_idx on public.pending_purchases (business_id);
create index if not exists business_amenities_amenity_idx on public.business_amenities (amenity_id);
create index if not exists event_seat_claims_ticket_idx  on public.event_seat_claims (ticket_id);
create index if not exists event_promo_codes_tier_idx    on public.event_promo_codes (tier_id);
create index if not exists event_waitlist_tier_idx       on public.event_waitlist (tier_id);

-- ── moderación / admin (parciales: casi siempre NULL) ───────────────────────
create index if not exists posts_hidden_by_idx           on public.posts (hidden_by) where hidden_by is not null;
create index if not exists post_comments_hidden_by_idx   on public.post_comments (hidden_by) where hidden_by is not null;
create index if not exists reviews_hidden_by_idx         on public.reviews (hidden_by) where hidden_by is not null;
create index if not exists event_reviews_hidden_by_idx   on public.event_reviews (hidden_by) where hidden_by is not null;
create index if not exists posts_featured_by_idx         on public.posts (featured_by) where featured_by is not null;
create index if not exists businesses_featured_by_idx    on public.businesses (featured_by) where featured_by is not null;
create index if not exists events_featured_by_idx        on public.events (featured_by) where featured_by is not null;
create index if not exists properties_featured_by_idx    on public.properties (featured_by) where featured_by is not null;
create index if not exists vehicles_featured_by_idx      on public.vehicles (featured_by) where featured_by is not null;
create index if not exists business_updates_featured_by_idx on public.business_updates (featured_by) where featured_by is not null;
create index if not exists reports_handled_by_idx        on public.reports (handled_by) where handled_by is not null;
create index if not exists claims_assigned_to_idx        on public.claims (assigned_to) where assigned_to is not null;
create index if not exists admins_created_by_idx         on public.admins (created_by) where created_by is not null;
create index if not exists notif_broadcasts_created_by_idx on public.notif_broadcasts (created_by) where created_by is not null;
create index if not exists platform_config_updated_by_idx on public.platform_config (updated_by) where updated_by is not null;
create index if not exists platform_flags_updated_by_idx  on public.platform_flags (updated_by) where updated_by is not null;

notify pgrst, 'reload schema';
