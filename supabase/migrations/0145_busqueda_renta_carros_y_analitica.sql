-- 0145_busqueda_renta_carros_y_analitica.sql
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- DOS COSAS, y empiezo por una CORRECCIÓN a lo que dije antes: afirmé dos veces
-- que `properties_search` y `vehicles_search` seguían con el diccionario
-- `simple`. ERA FALSO — lo dije sin comprobarlo. Las dos ya estaban en español,
-- índice y consulta. Lo que de verdad les faltaba, medido sobre los 16
-- inmuebles y 16 vehículos de pruebas:
--     habitacion → 0   ·   camioneta → 0 (pero «troca» → 3)   ·   toyoya → 0
-- Es decir: sin sinónimos, sin tolerancia a erratas y comparando nombres CON
-- tildes. Justo lo que Negocios ya tiene desde 0144.
--
-- 1 · Se les da el mismo motor: `expandir_consulta` (español + jerga regional),
--     erratas con `word_similarity` y comparación sin tildes.
-- 2 · Analítica ANÓNIMA de búsqueda: qué se busca y qué no encuentra nada. Hoy
--     esa información se pierde en cada búsqueda, y es exactamente la lista de
--     qué negocios hay que ir a reclutar.

-- ════════════════════════════════════════════════════════════════════════════
-- 1 · Renta y carros, con el mismo motor que Negocios
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.properties_search(user_lat double precision DEFAULT NULL::double precision, user_lng double precision DEFAULT NULL::double precision, in_city text DEFAULT NULL::text, in_deal text DEFAULT NULL::text, in_type text DEFAULT NULL::text, in_beds integer DEFAULT NULL::integer, in_baths integer DEFAULT NULL::integer, in_min numeric DEFAULT NULL::numeric, in_max numeric DEFAULT NULL::numeric, in_q text DEFAULT NULL::text, in_hood text DEFAULT NULL::text, in_business uuid DEFAULT NULL::uuid, in_sort text DEFAULT 'relevance'::text, max_results integer DEFAULT 30, in_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, slug text, deal text, ptype text, title text, price numeric, beds integer, baths numeric, sqft integer, address text, hood text, city text, lat double precision, lng double precision, photos jsonb, open_house timestamp with time zone, status text, views integer, saves_count integer, created_at timestamp with time zone, biz_slug text, biz_name text, biz_logo text, biz_tier text, biz_rating numeric, distance_m double precision, total_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with base as (
    select p.*,
      case when user_lat is not null and user_lng is not null and p.location is not null
        then st_distance(p.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography)
        else null end as dist
    from public.properties p
    where p.status = 'published'
      and (in_deal is null or p.deal = in_deal)
      and (in_type is null or p.ptype = in_type)
      and (in_city is null or p.city ilike in_city || '%')
      and (in_hood is null or p.hood ilike in_hood)
      and (in_beds is null or coalesce(p.beds, 0) >= in_beds)
      and (in_baths is null or coalesce(p.baths, 0) >= in_baths)
      and (in_min is null or p.price >= in_min)
      and (in_max is null or p.price <= in_max)
      and (in_business is null or p.business_id = in_business)
      and (in_q is null or in_q = '' or p.search_tsv @@ public.expandir_consulta(in_q, false)
         or lower(public.tl_unaccent(in_q)) <% lower(public.tl_unaccent(concat_ws(' ', p.title, p.hood, p.city, p.desc_es)))
           or lower(public.tl_unaccent(p.title))   like '%' || lower(public.tl_unaccent(in_q)) || '%'
         or lower(public.tl_unaccent(p.address)) like '%' || lower(public.tl_unaccent(in_q)) || '%'
         or lower(public.tl_unaccent(p.hood))    like '%' || lower(public.tl_unaccent(in_q)) || '%')
  )
  select b.id, b.slug, b.deal, b.ptype, b.title, b.price, b.beds, b.baths, b.sqft,
         b.address, b.hood, b.city,
         st_y(b.location::geometry) as lat, st_x(b.location::geometry) as lng,
         b.photos, b.open_house, b.status, b.views, b.saves_count, b.created_at,
         biz.slug, biz.name, biz.logo_url, biz.tier, biz.rating,
         b.dist, count(*) over () as total_count
  from base b
  left join public.businesses biz on biz.id = b.business_id
  order by
    case when in_sort = 'price_asc'  then b.price end asc nulls last,
    case when in_sort = 'price_desc' then b.price end desc nulls last,
    case when in_sort = 'newest'     then b.created_at end desc nulls last,
    case when in_sort not in ('price_asc','price_desc','newest') then coalesce(b.dist, 1e12) end asc nulls last,
    b.created_at desc
  limit greatest(1, least(max_results, 100)) offset greatest(0, in_offset)
$function$
;

CREATE OR REPLACE FUNCTION public.vehicles_search(user_lat double precision DEFAULT NULL::double precision, user_lng double precision DEFAULT NULL::double precision, in_city text DEFAULT NULL::text, in_cond text DEFAULT NULL::text, in_type text DEFAULT NULL::text, in_make text DEFAULT NULL::text, in_min numeric DEFAULT NULL::numeric, in_max numeric DEFAULT NULL::numeric, in_year_min integer DEFAULT NULL::integer, in_miles_max integer DEFAULT NULL::integer, in_bhph boolean DEFAULT NULL::boolean, in_q text DEFAULT NULL::text, in_business uuid DEFAULT NULL::uuid, in_sort text DEFAULT 'relevance'::text, max_results integer DEFAULT 30, in_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, slug text, cond text, vtype text, make text, model text, year integer, price numeric, down numeric, miles integer, trans text, fuel text, mpg integer, color_es text, color_en text, city text, lat double precision, lng double precision, photos jsonb, bhph boolean, financing boolean, apr numeric, status text, views integer, saves_count integer, created_at timestamp with time zone, biz_slug text, biz_name text, biz_logo text, biz_tier text, biz_rating numeric, distance_m double precision, total_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with base as (
    select v.*,
      case when user_lat is not null and user_lng is not null and v.location is not null
        then st_distance(v.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography)
        else null end as dist
    from public.vehicles v
    where v.status = 'published'
      and (in_cond is null or v.cond = in_cond)
      and (in_type is null or v.vtype = in_type)
      and (in_make is null or v.make ilike in_make)
      and (in_city is null or v.city ilike in_city || '%')
      and (in_min is null or v.price >= in_min)
      and (in_max is null or v.price <= in_max)
      and (in_year_min is null or v.year >= in_year_min)
      and (in_miles_max is null or coalesce(v.miles, 0) <= in_miles_max)
      and (in_bhph is null or v.bhph = in_bhph)
      and (in_business is null or v.business_id = in_business)
      and (in_q is null or in_q = '' or v.search_tsv @@ public.expandir_consulta(in_q, false)
         or lower(public.tl_unaccent(in_q)) <% lower(public.tl_unaccent(concat_ws(' ', v.make, v.model, v.color_es, v.desc_es)))
           or lower(public.tl_unaccent(v.make))  like '%'||lower(public.tl_unaccent(in_q))||'%'
         or lower(public.tl_unaccent(v.model)) like '%'||lower(public.tl_unaccent(in_q))||'%')
  )
  select b.id, b.slug, b.cond, b.vtype, b.make, b.model, b.year, b.price, b.down,
         b.miles, b.trans, b.fuel, b.mpg, b.color_es, b.color_en, b.city,
         st_y(b.location::geometry), st_x(b.location::geometry),
         b.photos, b.bhph, b.financing, b.apr, b.status, b.views, b.saves_count, b.created_at,
         biz.slug, biz.name, biz.logo_url, biz.tier, biz.rating,
         b.dist, count(*) over () as total_count
  from base b
  left join public.businesses biz on biz.id = b.business_id
  order by
    case when in_sort = 'price_asc'  then b.price end asc nulls last,
    case when in_sort = 'price_desc' then b.price end desc nulls last,
    case when in_sort = 'miles_asc'  then b.miles end asc nulls last,
    case when in_sort = 'year_desc'  then b.year end desc nulls last,
    case when in_sort not in ('price_asc','price_desc','miles_asc','year_desc') then coalesce(b.dist, 1e12) end asc nulls last,
    b.created_at desc
  limit greatest(1, least(max_results, 100)) offset greatest(0, in_offset)
$function$
;

-- ════════════════════════════════════════════════════════════════════════════
-- 2 · Analítica de búsqueda — ANÓNIMA Y AGREGADA, por diseño
-- ════════════════════════════════════════════════════════════════════════════
-- PARA QUÉ: lo más valioso que puede decirte tu propio buscador es qué busca la
-- gente y NO encuentra. Esa lista es, literalmente, a qué negocios hay que ir a
-- tocarles la puerta. Hoy se pierde en cada búsqueda.
--
-- CÓMO, Y POR QUÉ ASÍ: lo que uno busca dice mucho de uno — salud, dinero,
-- situación migratoria. Un registro de «este usuario buscó abogado de
-- inmigración el martes a las 9:14» es un expediente, y la app de una comunidad
-- que ya vive vigilada no puede construir eso. Por eso:
--   · NO se guarda quién. Ni usuario, ni sesión, ni IP.
--   · NO se guarda cuándo, más allá del DÍA.
--   · No hay una fila por búsqueda: hay un CONTADOR por (día, término, sección,
--     ciudad). Mil personas buscando «mecánico» son una fila con `veces = 1000`.
-- Así, agregado y sin identidad, el dato sirve para decidir y no sirve para
-- perseguir a nadie. Es una diferencia de diseño, no de promesa.
create table if not exists public.search_log (
  dia         date not null default current_date,
  termino     text not null,
  seccion     text not null,
  ciudad      text,
  resultados  int  not null default 0,
  veces       int  not null default 1,
  primary key (dia, termino, seccion, ciudad)
);

comment on table public.search_log is
  'Analítica de búsqueda anónima y agregada: sin usuario, sin sesión, sin IP y sin hora. Un contador por (día, término, sección, ciudad).';

-- Para la consulta que de verdad importa: «qué se buscó y no encontró nada».
create index if not exists search_log_sin_resultados_idx
  on public.search_log (dia desc, veces desc) where resultados = 0;

alter table public.search_log enable row level security;
-- Nadie lo LEE desde el navegador: es información de negocio, y además leerlo
-- entero permitiría reconstruir qué se busca en un barrio pequeño. Se consulta
-- desde el panel de administración con `service_role`, o con la función de
-- abajo. Sin políticas de SELECT, RLS lo niega a `anon` y `authenticated`.

-- El único camino de escritura, y va cerrado: la app no toca la tabla, llama a
-- esta función. Así el navegador no puede inventar ni el día ni el contador.
create or replace function public.registrar_busqueda(
  in_q          text,
  in_seccion    text,
  in_resultados int,
  in_ciudad     text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  t text := lower(public.tl_unaccent(btrim(coalesce(in_q, ''))));
  s text := lower(btrim(coalesce(in_seccion, '')));
begin
  -- Se normaliza y se acota antes de guardar nada: «Mecánico», «mecanico» y
  -- «  MECANICO » son el mismo dato, y un término de 400 letras es basura.
  if length(t) < 2 or length(t) > 60 then return; end if;
  if s not in ('negocios', 'eventos', 'comunidad', 'renta', 'carros') then return; end if;

  insert into public.search_log (dia, termino, seccion, ciudad, resultados, veces)
  values (current_date, t, s, nullif(btrim(coalesce(in_ciudad, '')), ''), greatest(coalesce(in_resultados, 0), 0), 1)
  on conflict (dia, termino, seccion, ciudad) do update
    set veces = public.search_log.veces + 1,
        -- Se queda el MAYOR número de resultados visto ese día: si una vez
        -- encontró y otra no, el término no está «sin resultados».
        resultados = greatest(public.search_log.resultados, excluded.resultados);
end $$;

grant execute on function public.registrar_busqueda(text, text, int, text) to anon, authenticated;

-- Lo que el fundador va a querer mirar: qué se buscó y no encontró NADA.
create or replace function public.busquedas_sin_resultados(in_dias int default 30, max_results int default 50)
returns table (termino text, seccion text, ciudad text, veces bigint, ultimo_dia date)
language sql
stable
security definer
set search_path to 'public'
as $$
  select l.termino, l.seccion, l.ciudad, sum(l.veces)::bigint, max(l.dia)
    from public.search_log l
   where l.resultados = 0
     and l.dia > current_date - greatest(1, coalesce(in_dias, 30))
   group by l.termino, l.seccion, l.ciudad
   order by sum(l.veces) desc, max(l.dia) desc
   limit greatest(1, least(coalesce(max_results, 50), 200));
$$;

-- Solo para el panel de administración; el navegador de un usuario no la puede
-- llamar.
revoke execute on function public.busquedas_sin_resultados(int, int) from anon, authenticated, public;
grant execute on function public.busquedas_sin_resultados(int, int) to service_role;

notify pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- 3 · Los sinónimos van en LOS DOS SENTIDOS
-- ════════════════════════════════════════════════════════════════════════════
-- Al medir renta y carros salió un fallo de fondo en 0144: la expansión miraba
-- solo la columna `term`. Con la fila «troca → camioneta, pickup», buscar
-- «troca» encontraba las camionetas, pero buscar «camioneta» NO encontraba las
-- trocas. Medido: camioneta → 0 con troca → 3. Igual con «habitación» y
-- «cuarto».
--
-- Un sinónimo no tiene dirección: si A significa B, B significa A. Ahora la
-- búsqueda mira las dos columnas, así que UNA fila define la relación entera y
-- nadie tiene que acordarse de escribir la inversa. Vale para todas las
-- superficies a la vez — negocios, renta y carros.
create or replace function public.expandir_consulta(in_q text, estricta boolean default true)
returns tsquery
language plpgsql
stable
set search_path to 'public'
as $$
declare
  base    tsquery;
  extra   tsquery;
  palabra text;
  sinon   text;
begin
  if in_q is null or btrim(in_q) = '' then return null; end if;

  if estricta then
    base := websearch_to_tsquery('spanish', in_q);
  else
    for palabra in select unnest(string_to_array(btrim(in_q), ' ')) loop
      if btrim(palabra) = '' then continue; end if;
      extra := websearch_to_tsquery('spanish', palabra);
      if extra is not null then
        base := case when base is null then extra else base || extra end;
      end if;
    end loop;
  end if;
  if base is null then return null; end if;

  for palabra in
    select unnest(string_to_array(lower(public.tl_unaccent(btrim(in_q))), ' '))
  loop
    if length(palabra) < 3 then continue; end if;
    for sinon in
      -- de ida: la palabra es la clave de la fila
      select unnest(s.expands_to) from public.search_synonyms s where s.term = palabra
      union
      -- y de vuelta: la palabra aparece EN la lista de otra fila
      select s.term from public.search_synonyms s where palabra = any(s.expands_to)
    loop
      extra := websearch_to_tsquery('spanish', sinon);
      if extra is not null then base := base || extra; end if;
    end loop;
  end loop;

  return base;
end $$;

-- Y las erratas: el umbral por defecto de `word_similarity` (0.6) deja fuera
-- cambios de una letra en palabras cortas — «toyoya» por «toyota» puntúa 0.57.
-- Bajarlo con `alter function … set pg_trgm.word_similarity_threshold` NO se
-- puede en Supabase (permiso denegado), así que el umbral va ESCRITO en cada
-- consulta, que además lo deja a la vista de quien lea el código.
-- Coste: `word_similarity(...) > 0.45` no usa el índice de trigramas como sí
-- hace el operador `<%`. A la escala de hoy da igual; anotado en
-- docs/LAUNCH-CHECKLIST.md para revisarlo cuando las tablas crezcan.

notify pgrst, 'reload schema';

CREATE OR REPLACE FUNCTION public.properties_search(user_lat double precision DEFAULT NULL::double precision, user_lng double precision DEFAULT NULL::double precision, in_city text DEFAULT NULL::text, in_deal text DEFAULT NULL::text, in_type text DEFAULT NULL::text, in_beds integer DEFAULT NULL::integer, in_baths integer DEFAULT NULL::integer, in_min numeric DEFAULT NULL::numeric, in_max numeric DEFAULT NULL::numeric, in_q text DEFAULT NULL::text, in_hood text DEFAULT NULL::text, in_business uuid DEFAULT NULL::uuid, in_sort text DEFAULT 'relevance'::text, max_results integer DEFAULT 30, in_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, slug text, deal text, ptype text, title text, price numeric, beds integer, baths numeric, sqft integer, address text, hood text, city text, lat double precision, lng double precision, photos jsonb, open_house timestamp with time zone, status text, views integer, saves_count integer, created_at timestamp with time zone, biz_slug text, biz_name text, biz_logo text, biz_tier text, biz_rating numeric, distance_m double precision, total_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with base as (
    select p.*,
      case when user_lat is not null and user_lng is not null and p.location is not null
        then st_distance(p.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography)
        else null end as dist
    from public.properties p
    where p.status = 'published'
      and (in_deal is null or p.deal = in_deal)
      and (in_type is null or p.ptype = in_type)
      and (in_city is null or p.city ilike in_city || '%')
      and (in_hood is null or p.hood ilike in_hood)
      and (in_beds is null or coalesce(p.beds, 0) >= in_beds)
      and (in_baths is null or coalesce(p.baths, 0) >= in_baths)
      and (in_min is null or p.price >= in_min)
      and (in_max is null or p.price <= in_max)
      and (in_business is null or p.business_id = in_business)
      and (in_q is null or in_q = '' or p.search_tsv @@ public.expandir_consulta(in_q, false)
         or word_similarity(lower(public.tl_unaccent(in_q)), lower(public.tl_unaccent(concat_ws(' ', p.title, p.hood, p.city, p.desc_es)))) > 0.45
           or lower(public.tl_unaccent(p.title))   like '%' || lower(public.tl_unaccent(in_q)) || '%'
         or lower(public.tl_unaccent(p.address)) like '%' || lower(public.tl_unaccent(in_q)) || '%'
         or lower(public.tl_unaccent(p.hood))    like '%' || lower(public.tl_unaccent(in_q)) || '%')
  )
  select b.id, b.slug, b.deal, b.ptype, b.title, b.price, b.beds, b.baths, b.sqft,
         b.address, b.hood, b.city,
         st_y(b.location::geometry) as lat, st_x(b.location::geometry) as lng,
         b.photos, b.open_house, b.status, b.views, b.saves_count, b.created_at,
         biz.slug, biz.name, biz.logo_url, biz.tier, biz.rating,
         b.dist, count(*) over () as total_count
  from base b
  left join public.businesses biz on biz.id = b.business_id
  order by
    case when in_sort = 'price_asc'  then b.price end asc nulls last,
    case when in_sort = 'price_desc' then b.price end desc nulls last,
    case when in_sort = 'newest'     then b.created_at end desc nulls last,
    case when in_sort not in ('price_asc','price_desc','newest') then coalesce(b.dist, 1e12) end asc nulls last,
    b.created_at desc
  limit greatest(1, least(max_results, 100)) offset greatest(0, in_offset)
$function$
;

CREATE OR REPLACE FUNCTION public.vehicles_search(user_lat double precision DEFAULT NULL::double precision, user_lng double precision DEFAULT NULL::double precision, in_city text DEFAULT NULL::text, in_cond text DEFAULT NULL::text, in_type text DEFAULT NULL::text, in_make text DEFAULT NULL::text, in_min numeric DEFAULT NULL::numeric, in_max numeric DEFAULT NULL::numeric, in_year_min integer DEFAULT NULL::integer, in_miles_max integer DEFAULT NULL::integer, in_bhph boolean DEFAULT NULL::boolean, in_q text DEFAULT NULL::text, in_business uuid DEFAULT NULL::uuid, in_sort text DEFAULT 'relevance'::text, max_results integer DEFAULT 30, in_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, slug text, cond text, vtype text, make text, model text, year integer, price numeric, down numeric, miles integer, trans text, fuel text, mpg integer, color_es text, color_en text, city text, lat double precision, lng double precision, photos jsonb, bhph boolean, financing boolean, apr numeric, status text, views integer, saves_count integer, created_at timestamp with time zone, biz_slug text, biz_name text, biz_logo text, biz_tier text, biz_rating numeric, distance_m double precision, total_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with base as (
    select v.*,
      case when user_lat is not null and user_lng is not null and v.location is not null
        then st_distance(v.location, st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography)
        else null end as dist
    from public.vehicles v
    where v.status = 'published'
      and (in_cond is null or v.cond = in_cond)
      and (in_type is null or v.vtype = in_type)
      and (in_make is null or v.make ilike in_make)
      and (in_city is null or v.city ilike in_city || '%')
      and (in_min is null or v.price >= in_min)
      and (in_max is null or v.price <= in_max)
      and (in_year_min is null or v.year >= in_year_min)
      and (in_miles_max is null or coalesce(v.miles, 0) <= in_miles_max)
      and (in_bhph is null or v.bhph = in_bhph)
      and (in_business is null or v.business_id = in_business)
      and (in_q is null or in_q = '' or v.search_tsv @@ public.expandir_consulta(in_q, false)
         or word_similarity(lower(public.tl_unaccent(in_q)), lower(public.tl_unaccent(concat_ws(' ', v.make, v.model, v.color_es, v.desc_es)))) > 0.45
           or lower(public.tl_unaccent(v.make))  like '%'||lower(public.tl_unaccent(in_q))||'%'
         or lower(public.tl_unaccent(v.model)) like '%'||lower(public.tl_unaccent(in_q))||'%')
  )
  select b.id, b.slug, b.cond, b.vtype, b.make, b.model, b.year, b.price, b.down,
         b.miles, b.trans, b.fuel, b.mpg, b.color_es, b.color_en, b.city,
         st_y(b.location::geometry), st_x(b.location::geometry),
         b.photos, b.bhph, b.financing, b.apr, b.status, b.views, b.saves_count, b.created_at,
         biz.slug, biz.name, biz.logo_url, biz.tier, biz.rating,
         b.dist, count(*) over () as total_count
  from base b
  left join public.businesses biz on biz.id = b.business_id
  order by
    case when in_sort = 'price_asc'  then b.price end asc nulls last,
    case when in_sort = 'price_desc' then b.price end desc nulls last,
    case when in_sort = 'miles_asc'  then b.miles end asc nulls last,
    case when in_sort = 'year_desc'  then b.year end desc nulls last,
    case when in_sort not in ('price_asc','price_desc','miles_asc','year_desc') then coalesce(b.dist, 1e12) end asc nulls last,
    b.created_at desc
  limit greatest(1, least(max_results, 100)) offset greatest(0, in_offset)
$function$
;

CREATE OR REPLACE FUNCTION public.search_businesses(in_q text DEFAULT NULL::text, user_lat double precision DEFAULT NULL::double precision, user_lng double precision DEFAULT NULL::double precision, in_city text DEFAULT NULL::text, in_cat text DEFAULT NULL::text, in_price text DEFAULT NULL::text, in_min_rating numeric DEFAULT NULL::numeric, max_results integer DEFAULT 30, in_offset integer DEFAULT 0, radius_m double precision DEFAULT 80000)
 RETURNS TABLE(slug text, name text, category_id text, rating numeric, reviews_count integer, price_level text, is_open boolean, tier text, endorse_count integer, tile_a text, tile_b text, specialty_es text, specialty_en text, subcategories text[], features text[], card_features text[], hours jsonb, hours_exceptions jsonb, amenities_es text[], amenities_en text[], review_es text, review_en text, phone text, address text, city text, website text, logo_url text, accepts_messages boolean, message_channel text, message_phone text, about_es text, about_en text, distance_m double precision)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
         -- capa 4: erratas. `word_similarity` compara contra la MEJOR palabra
         -- del texto; `similarity` sobre el texto entero siempre puntúa bajo y
         -- por eso casi nunca disparaba.
         or word_similarity(tn, lower(public.tl_unaccent(concat_ws(' ', b.name, b.specialty_es, array_to_string(b.subcategories,' '), b.about_es)))) > 0.45
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
end $function$
;

notify pgrst, 'reload schema';

-- Cinturón Y tirantes: la RLS sin políticas de SELECT ya niega la lectura
-- (comprobado con `set role anon` → 0 filas, y con `set role authenticated` →
-- 0 filas, mientras el dueño sí las ve). Aun así se quita el permiso de tabla
-- que Supabase concede por defecto, para que un descuido futuro —añadir una
-- política «legible por todos» copiando de otra tabla— no abra de golpe el
-- registro de lo que busca todo un barrio.
revoke select on public.search_log from anon, authenticated;

notify pgrst, 'reload schema';
