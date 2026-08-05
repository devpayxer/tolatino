-- 0152_la_busqueda_ya_no_recorre_la_tabla_entera.sql
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- ════════════════════════════════════════════════════════════════════════════
-- DE DÓNDE SALE: la búsqueda ya da los resultados BUENOS, pero los busca mal
-- ════════════════════════════════════════════════════════════════════════════
-- La 0144 arregló lo que se veía: «mecanico» pasó de 0 a 18 talleres. Se dio por
-- cerrada porque el resultado era correcto — y ese es justo el error. Nadie
-- miró CÓMO llegaba a ese resultado. Medido hoy con `explain (analyze)` sobre
-- los 547 negocios de pruebas:
--
--   · `search_tsv @@ …`   → **Seq Scan**, 533 ms   ← el camino PRINCIPAL
--   · la capa de erratas  → **Seq Scan**, 465 ms
--
-- Las dos recorren la tabla entera. Con 547 filas no se nota; el objetivo del
-- proyecto es 1M+ de negocios, y ahí una búsqueda que lee la tabla completa no
-- es lenta: es imposible. Esto no se ve probando la app — solo midiendo.
--
-- LA CAUSA DEL PRINCIPAL es de una línea: la 0144 creó la columna `search_tsv`
-- (la del diccionario español) y **nunca creó su índice**. El único GIN que hay
-- (`businesses_search_gin`) apunta a `search_vector`, la columna VIEJA, que
-- ningún trigger mantiene ya. Es decir: se paga el índice de una columna muerta
-- y se busca sin índice en la viva.
--
-- ════════════════════════════════════════════════════════════════════════════
-- Y DE PASO, UN AGUJERO DE RESULTADOS: las erratas no ven la categoría
-- ════════════════════════════════════════════════════════════════════════════
-- Las capas 1–3 buscan sobre `search_tsv`, que incluye la etiqueta legible de la
-- categoría («Servicios de Auto», «taller mecánico») — por eso «mecanico» da 18.
-- Pero la capa 4 (erratas) se construía su PROPIO texto a mano, con
-- `concat_ws(name, specialty_es, subcategories, about_es)`, sin la etiqueta. Por
-- eso «mecaniko» daba 5 en vez de 18: solo casaba con negocios que llevan la
-- palabra en el nombre.
--
-- Dos textos distintos para la misma búsqueda es la clase de fallo que vuelve:
-- alguien enriquece uno y se olvida del otro. Aquí se corta de raíz — el trigger
-- guarda **el mismo texto** en las dos formas (`search_tsv` para el español,
-- `search_txt` en plano para los trigramas), así que no pueden divergir.
--
-- Y `search_txt` es además lo que hace indexable la capa 4: `word_similarity(a,b)
-- > 0.45` NO puede usar índice; el operador `<%` sí, contra un `gin_trgm_ops`
-- sobre una columna real. El umbral se fija en la propia función.
--
-- NO se toca `search_vector` ni su índice en esta migración: borrar es
-- irreversible y esto ya cambia lo suficiente. Queda anotado en
-- `docs/LAUNCH-CHECKLIST.md` como peso muerto que retirar aparte.

-- ════════════════════════════════════════════════════════════════════════════
-- 1 · El índice que faltaba: el camino principal de la búsqueda
-- ════════════════════════════════════════════════════════════════════════════
create index if not exists businesses_search_tsv_gin
  on public.businesses using gin (search_tsv);

-- ════════════════════════════════════════════════════════════════════════════
-- 2 · El mismo texto, también en plano, para las erratas
-- ════════════════════════════════════════════════════════════════════════════
alter table public.businesses add column if not exists search_txt text;

-- El trigger construye el texto UNA vez y lo guarda en las dos formas. Cualquier
-- cosa que se añada aquí entra a la vez en la búsqueda normal y en la de
-- erratas; ese es el punto.
create or replace function public.tg_business_search_tsv()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  cat public.search_categories%rowtype;
  txt text;
begin
  select * into cat from public.search_categories where id = new.category_id;
  txt := concat_ws(' ',
    new.name,
    new.specialty_es, new.specialty_en,
    array_to_string(new.subcategories, ' '),
    array_to_string(new.features, ' '),
    -- La descripción que escribió el dueño: es donde dice lo que de verdad hace
    -- («cambio de aceite, frenos, suspensión»).
    new.about_es, new.about_en,
    cat.label_es, cat.label_en, cat.terms);
  new.search_tsv := to_tsvector('spanish', txt);
  -- En minúsculas y sin tildes desde YA: el índice de trigramas y la consulta
  -- tienen que comparar exactamente el mismo texto, o el índice no se usa.
  new.search_txt := lower(public.tl_unaccent(txt));
  return new;
end $$;

create index if not exists businesses_search_txt_trgm
  on public.businesses using gin (search_txt gin_trgm_ops);

-- Rellenar lo que ya existe. Sin esto, `search_txt` queda a null en los 547
-- negocios y la capa de erratas dejaría de encontrar NADA — un arreglo que
-- rompe justo lo que venía a mejorar.
update public.businesses set updated_at = updated_at;

-- ════════════════════════════════════════════════════════════════════════════
-- 3 · La función: cuerpo IDÉNTICO al vivo, salvo la capa 4
-- ════════════════════════════════════════════════════════════════════════════
-- Se copió de `prosrc` en vez de reescribirla de memoria. La 0151 enseñó por qué:
-- la primera versión redactada a mano cambiaba un join y habría dejado sin envío
-- a todos los negocios. Cuando se toca una función viva, se parte de la que hay.
--
-- `pg_trgm.word_similarity_threshold` va como SET de la función: es lo que da
-- sentido a `<%` (que es «word_similarity >= umbral») y lo deja indexable.
-- Los valores por defecto van TAL CUAL están en la base. Sin ellos, Postgres
-- rechaza el `create or replace` («cannot remove parameter defaults») — y con
-- otros distintos, cualquier llamada que omita un argumento cambiaría de
-- comportamiento en silencio. Se sacaron de `pg_get_function_arguments`.
create or replace function public.search_businesses(
  in_q text default null,
  user_lat double precision default null,
  user_lng double precision default null,
  in_city text default null,
  in_cat text default null,
  in_price text default null,
  in_min_rating numeric default null,
  max_results integer default 30,
  in_offset integer default 0,
  radius_m double precision default 80000
)
returns table (
  slug text, name text, category_id text, rating numeric, reviews_count integer,
  price_level text, is_open boolean, tier text, endorse_count integer,
  tile_a text, tile_b text, specialty_es text, specialty_en text,
  subcategories text[], features text[], card_features text[],
  hours jsonb, hours_exceptions jsonb, amenities_es text[], amenities_en text[],
  review_es text, review_en text, phone text, address text, city text,
  website text, logo_url text, accepts_messages boolean, message_channel text,
  message_phone text, about_es text, about_en text, distance_m double precision
)
language plpgsql
stable
security definer
set search_path to 'public'
set pg_trgm.word_similarity_threshold to '0.45'
as $fn$
declare
  g    geography;
  t    text := nullif(btrim(coalesce(in_q, '')), '');
  tq   tsquery;   -- amplia: para FILTRAR sin perder nada
  tqa  tsquery;   -- estricta: para ORDENAR lo más relevante delante
  tn   text;
  lim  integer := greatest(1, least(coalesce(max_results, 30), 60));
  off  integer := greatest(0, coalesce(in_offset, 0));
begin
  if user_lat is not null and user_lng is not null then
    g := st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography;
  end if;
  if t is not null then
    tq  := public.expandir_consulta(t, false);
    tqa := public.expandir_consulta(t, true);
    tn := lower(public.tl_unaccent(t));   -- para las erratas
  end if;

  return query
  with cand as (
    select b.id, b.slug, b.name, b.category_id, b.rating, b.reviews_count,
           b.price_level, b.is_open, b.tier, b.endorse_count, b.tile_a, b.tile_b,
           b.specialty_es, b.specialty_en, b.subcategories, b.features,
           b.card_features, b.hours, b.hours_exceptions, b.phone, b.address,
           b.city, b.website, b.logo_url, b.accepts_messages, b.message_channel,
           b.message_phone, b.about_es, b.about_en,
           case when g is not null and b.location is not null
                then st_distance(b.location, g) end as dist,
           case when tq is not null then ts_rank(b.search_tsv, tq) else 0 end as rnk,
           -- ¿cumple TODAS las palabras? Va delante de quien solo cumple una.
           case when tqa is not null and b.search_tsv @@ tqa then 1 else 0 end as completo,
           -- ¿el nombre EMPIEZA por lo que escribió? Eso manda sobre todo lo demás:
           -- quien teclea «Don Beto» busca ese negocio, no la categoría.
           case when tn is not null and lower(public.tl_unaccent(b.name)) like tn || '%' then 1 else 0 end as prefijo,
           case when tn is not null and position(tn in lower(public.tl_unaccent(b.name))) > 0 then 1 else 0 end as en_nombre
      from public.businesses b
     where b.tile_a is not null
       and b.suspended = false
       and (in_city is null or b.city = in_city)
       and (in_cat is null or in_cat = 'all' or b.category_id = in_cat)
       and (in_price is null or b.price_level = in_price)
       and (in_min_rating is null or b.rating >= in_min_rating)
       and (case when g is null or radius_m is null then true
                 else st_dwithin(b.location, g, radius_m) end)
       and (
         t is null
         -- capa 1+2+3: texto en español, enriquecido y con sinónimos
         or (tq is not null and b.search_tsv @@ tq)
         -- el nombre tal cual, para búsquedas literales
         or lower(public.tl_unaccent(b.name)) like '%' || tn || '%'
         -- capa 4: erratas. Ahora contra `search_txt` — el MISMO texto que ven
         -- las capas de arriba, etiqueta de categoría incluida — y con el
         -- operador `<%`, que sí puede apoyarse en el índice de trigramas.
         or tn <% b.search_txt
       )
  )
  select c.slug, c.name, c.category_id, c.rating, c.reviews_count, c.price_level,
         c.is_open, c.tier, c.endorse_count, c.tile_a, c.tile_b, c.specialty_es,
         c.specialty_en, c.subcategories, c.features, c.card_features, c.hours,
         c.hours_exceptions,
         -- Amenidades y reseña destacada: IGUAL que antes. La firma pública no
         -- cambia, así que la app no se entera de nada.
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
         c.accepts_messages, c.message_channel, c.message_phone, c.about_es,
         c.about_en, c.dist
    from cand c
   -- CAPA 5 · el orden. Explicable, no magia: primero quien se llama así,
   -- después la relevancia del texto, luego reputación y cercanía.
   order by c.prefijo desc,
            c.en_nombre desc,
            c.completo desc,
            c.rnk desc,
            (c.tier <> 'free') desc,
            coalesce(c.rating, 0) desc,
            c.dist asc nulls last,
            c.slug
   limit lim offset off;
end
$fn$;

grant execute on function public.search_businesses(text, double precision, double precision, text, text, text, numeric, integer, integer, double precision) to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 4 · EVENTOS: el mismo patrón, arreglado igual
-- ════════════════════════════════════════════════════════════════════════════
-- Al encontrar lo de arriba tocaba preguntar dónde más está. Se revisaron TODAS
-- las columnas `tsvector` de la base (negocios, eventos, publicaciones,
-- propiedades, vehículos): solo a `businesses.search_tsv` le faltaba el índice.
-- Pero la otra mitad del fallo —una capa de erratas que no puede usar índice—
-- sí se repite, y solo aquí: `search_events` filtra con
-- `similarity(e.title_es, q.t) > 0.2`.
--
-- `similarity(a, b) > c` NUNCA usa índice: solo lo hacen los OPERADORES de
-- pg_trgm (`%`, `<%`). Y como va dentro de un `OR`, arrastra a toda la consulta
-- a recorrer la tabla aunque `search_tsv` sí esté indexado — comprobado con
-- `explain`: Seq Scan. Con 11 eventos de prueba no se nota nada; el día que haya
-- eventos de verdad, sí.
--
-- Además compara solo contra el TÍTULO EN ESPAÑOL: una errata en el nombre del
-- lugar o en la descripción no encuentra nada. Mismo arreglo que en negocios —
-- un solo texto, guardado, indexado.
alter table public.events add column if not exists search_txt text;

create or replace function public.tg_event_search_tsv()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  txt text;
begin
  txt := concat_ws(' ',
    new.title_es, new.title_en, new.venue_es, new.venue_en,
    new.desc_es, new.desc_en, new.cat);
  new.search_tsv := to_tsvector('spanish', txt);
  new.search_txt := lower(public.tl_unaccent(txt));
  return new;
end $$;

create index if not exists events_search_txt_trgm
  on public.events using gin (search_txt gin_trgm_ops);

-- `events` no tiene `updated_at` (a diferencia de `businesses`), así que se
-- toca otra columna cualquiera para que el trigger vuelva a pasar.
update public.events set created_at = created_at;

create or replace function public.search_events(
  in_q text default null,
  user_lat double precision default null,
  user_lng double precision default null,
  radius_m double precision default 80000,
  in_cat text default null,
  in_free boolean default null,
  max_results integer default 30,
  in_offset integer default 0
)
returns table (
  slug text, title_es text, title_en text, venue_es text, venue_en text,
  cat text, starts_at timestamptz, time_label_es text, time_label_en text,
  price_label text, going_count integer, desc_es text, desc_en text,
  tile_a text, tile_b text, cover_url text
)
language sql
stable
set search_path to 'public', 'pg_temp'
set pg_trgm.word_similarity_threshold to '0.45'
as $fn$
  with q as (select nullif(btrim(coalesce(in_q, '')), '') as t),
  origin as (
    select case when user_lat is not null and user_lng is not null
                then st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography end as g
  )
  select e.slug, e.title_es, e.title_en, e.venue_es, e.venue_en,
         e.cat, e.starts_at, e.time_label_es, e.time_label_en,
         e.price_label, e.going_count, e.desc_es, e.desc_en, e.tile_a, e.tile_b,
         e.cover_url
  from public.events e
  cross join origin o
  cross join q
  where e.status = 'published'
    and coalesce(e.ends_at, e.starts_at + interval '3 hours') >= now()
    and (o.g is null or radius_m is null or e.location is null
         or st_dwithin(e.location, o.g, radius_m))
    and (in_cat is null or e.cat = in_cat)
    and (in_free is null
         or (in_free and e.price_label is null)
         or (not in_free and e.price_label is not null))
    and (
      q.t is null
      or e.search_tsv @@ public.expandir_consulta(q.t, false)
      or lower(public.tl_unaccent(e.title_es)) like '%' || lower(public.tl_unaccent(q.t)) || '%'
      or lower(public.tl_unaccent(e.title_en)) like '%' || lower(public.tl_unaccent(q.t)) || '%'
      -- erratas: contra TODO el texto del evento y con operador indexable
      or lower(public.tl_unaccent(q.t)) <% e.search_txt
    )
  order by
    (case when q.t is not null then ts_rank(e.search_tsv, public.expandir_consulta(q.t, false)) end) desc nulls last,
    e.starts_at asc
  offset greatest(0, in_offset)
  limit greatest(1, least(max_results, 60));
$fn$;

grant execute on function public.search_events(text, double precision, double precision, double precision, text, boolean, integer, integer) to anon, authenticated;

-- Con índices nuevos y columnas nuevas, el planificador va a ciegas hasta que
-- alguien mira la tabla. Sin esto seguiría eligiendo el recorrido completo por
-- pura falta de estadísticas.
analyze public.businesses;
analyze public.events;

notify pgrst, 'reload schema';
