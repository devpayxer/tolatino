-- 0144_busqueda_que_entiende_espanol.sql
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- EL PROBLEMA, con el número delante: el fundador escribió «mecanico» y no salió
-- NINGÚN taller, habiendo 18 en su radio. Medido sobre los 548 negocios de
-- pruebas antes de tocar nada:
--     mecanico → 0   ·   mecánico → 4   ·   mecanica → 2   ·   mecanioc → 0
--
-- TRES CAUSAS, las tres comprobadas por SQL:
--
--  1. El índice se construía con `to_tsvector('simple', …)`. El diccionario
--     `simple` NO quita tildes y NO reduce a la raíz:
--         simple  → 'mecánica'      (tal cual, con tilde)
--         spanish → 'mecan'         (sin tilde y en su raíz)
--     Con español, «mecanico», «mecánico», «mecanica», «mecánicos» y
--     «MECANICO» caen TODAS en `mecan`. Nadie escribe tildes en el teléfono.
--
--  2. El índice metía `category_id` en crudo y en inglés (`AutoServices`).
--     Nadie teclea eso. Las etiquetas que un humano SÍ escribe («Servicios de
--     Auto», «taller mecánico») vivían solo en el código del navegador y nunca
--     llegaban a la base. Por eso «Taller Aparicio» —que es AutoServices pero no
--     lleva «mecánico» en el nombre— era invisible.
--
--  3. Las erratas se intentaban con `similarity(name, q) > 0.2`: solo contra el
--     NOMBRE, y `similarity` de una palabra corta contra un texto largo siempre
--     puntúa bajo. La herramienta correcta es `word_similarity` (`<%`), que
--     compara la consulta contra la MEJOR palabra del texto.
--
-- QUÉ HACE ESTA MIGRACIÓN (capas 1 a 4 del plan; el orden/ranking es la 5):
--   · Diccionario `spanish` en el índice y en la consulta.
--   · Una tabla de CATEGORÍAS con sus etiquetas legibles ES/EN y sus términos de
--     búsqueda, que entra al índice.
--   · Una tabla de SINÓNIMOS Y JERGA regional latina, que expande la consulta.
--     Un mexicano dice «abarrotes», un dominicano «colmado», un puertorriqueño
--     «bodega» — y los tres buscan lo mismo. Eso no lo trae ningún motor: es
--     conocimiento del negocio, y es la ventaja frente a Yelp.
--   · Erratas con `word_similarity` sobre el texto completo.
--
-- NO cambia ninguna firma de función: la app sigue llamando igual.

-- ════════════════════════════════════════════════════════════════════════════
-- 1 · Categorías: sus etiquetas legibles y los términos con que la gente las busca
-- ════════════════════════════════════════════════════════════════════════════
-- Fuente única en la BASE de lo que hasta ahora solo existía en `lib/tiles.ts`.
-- `terms` es lo que de verdad teclea la gente, no el nombre bonito de la
-- categoría: nadie busca «Servicios de Auto», busca «mecánico» o «taller».
create table if not exists public.search_categories (
  id        text primary key,
  label_es  text not null,
  label_en  text not null,
  terms     text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.search_categories (id, label_es, label_en, terms) values
  ('AutoServices',   'Servicios de Auto',        'Auto Services',
   'mecanico mecanica taller automotriz hojalateria enderezado pintura llantera vulcanizadora frenos transmision aceite afinacion grua auto carro coche vehiculo car repair mechanic'),
  ('BeautyHealth',   'Belleza y Salud',          'Beauty & Health',
   'salon estetica peluqueria barberia barber unas manicure pedicure spa masaje depilacion cejas pestanas maquillaje tinte corte cabello beauty hair nails'),
  ('FoodDrinks',     'Comida y Bebida',          'Food & Drinks',
   'comida restaurante taqueria taco tacos antojitos fonda cocina lonchera food truck cafeteria panaderia pupuseria birria pozole mariscos pollo asado desayuno almuerzo cena restaurant food'),
  ('HomeServices',   'Servicios del Hogar',      'Home Services',
   'plomero plomeria fontanero electricista albanil construccion pintor techos jardineria limpieza mudanza cerrajero aire acondicionado calefaccion handyman plumber electrician cleaning'),
  ('NightLife',      'Vida Nocturna',            'Night Life',
   'bar cantina discoteca antro club billar karaoke musica en vivo cerveza tragos night club'),
  ('Grocery',        'Supermercado',             'Grocery & Market',
   'supermercado abarrotes bodega colmado tienda mercado carniceria fruteria verduleria despensa mandado grocery market'),
  ('Party',          'Fiestas y Celebraciones',  'Party & Celebrations',
   'fiesta fiestas quinceanera boda bautizo piñatas pinatas globos salon de fiestas banquete dj sonido brincolin inflable renta de sillas mesas catering party rental'),
  ('HealthMedicine', 'Salud y Medicina',         'Health & Medicine',
   'doctor doctora medico clinica consultorio dentista dental pediatra farmacia laboratorio analisis terapia psicologo quiropractico optica lentes urgencias clinic dentist'),
  ('ProServices',    'Servicios Profesionales',  'Professional Services',
   'abogado abogada contador contabilidad impuestos taxes notario traductor traduccion seguros aseguranza inmigracion migracion papeles ita in itin envio de dinero remesas lawyer accountant taxes'),
  ('Shops',          'Tiendas',                  'Shops & Stores',
   'tienda ropa zapatos zapateria boutique celulares telefonos accesorios muebles electronica regalos joyeria botanica shop store clothing'),
  ('Transportation', 'Transporte',               'Transportation',
   'transporte taxi viaje viajes camioneta van autobus bus mudanza flete paqueteria envios aeropuerto ride'),
  ('Education',      'Cursos y Educación',       'Courses & Education',
   'escuela clases curso cursos ingles computacion tutoria maestro profesor guarderia preescolar universidad ged manejo school classes english'),
  ('Children',       'Niños',                    'Children',
   'ninos niños guarderia daycare cuidado infantil juguetes ropa de bebe pediatria fiestas infantiles kids children daycare'),
  ('Sports',         'Vida Activa y Deportes',   'Active Life & Sports',
   'gimnasio gym deportes futbol soccer box boxeo zumba baile yoga crossfit cancha equipo deportivo gym sports'),
  ('Churches',       'Iglesias y Religión',      'Churches & Religion',
   'iglesia templo parroquia misa culto catolica cristiana evangelica pentecostal bautista pastor sacerdote church'),
  ('RealEstate',     'Bienes Raíces',            'Real Estate',
   'casa casas renta alquiler apartamento departamento cuarto habitacion venta bienes raices inmobiliaria agente real estate rent apartment'),
  ('CarDealer',      'Dealer de carros',         'Car Dealers',
   'carro carros auto autos coche vehiculo camioneta troca dealer agencia seminuevos usados financiamiento buy here pay here car dealer')
on conflict (id) do update
  set label_es = excluded.label_es,
      label_en = excluded.label_en,
      terms    = excluded.terms,
      updated_at = now();

alter table public.search_categories enable row level security;
drop policy if exists "categorias legibles por todos" on public.search_categories;
create policy "categorias legibles por todos" on public.search_categories for select using (true);
-- Escritura solo desde el servidor (service_role / admin). Sin política de
-- INSERT/UPDATE, RLS lo niega a `anon` y `authenticated` por defecto.

-- ════════════════════════════════════════════════════════════════════════════
-- 2 · Sinónimos y jerga regional — la parte que ningún motor trae de fábrica
-- ════════════════════════════════════════════════════════════════════════════
-- `term` es lo que teclea el usuario; `expands_to` lo que ADEMÁS hay que buscar.
-- Se guarda sin tildes y en minúsculas: la consulta se normaliza igual antes de
-- mirar aquí, así «panadería» y «panaderia» encuentran la misma fila.
create table if not exists public.search_synonyms (
  term        text primary key,
  expands_to  text[] not null,
  note        text,
  updated_at  timestamptz not null default now()
);

insert into public.search_synonyms (term, expands_to, note) values
  -- Auto
  ('mecanico',   array['taller','automotriz','mecanica','hojalateria'], 'MX/centroamérica'),
  ('taller',     array['mecanico','automotriz','mecanica'], null),
  ('llantera',   array['llantas','vulcanizadora','neumaticos','gomas'], 'gomas = Caribe'),
  ('gomas',      array['llantas','llantera','neumaticos'], 'RD/PR'),
  ('hojalateria',array['golpes','pintura','enderezado','carroceria'], null),
  -- Tienda de barrio: la MISMA cosa con cuatro nombres según el país
  ('bodega',     array['abarrotes','colmado','tienda','mercado','supermercado'], 'PR/NY'),
  ('colmado',    array['abarrotes','bodega','tienda','mercado'], 'RD'),
  ('abarrotes',  array['bodega','colmado','tienda','mercado'], 'MX'),
  ('pulperia',   array['abarrotes','bodega','colmado','tienda'], 'Centroamérica'),
  -- Belleza
  ('salon',      array['estetica','peluqueria','belleza','barberia'], null),
  ('estetica',   array['salon','peluqueria','belleza'], 'MX'),
  ('peluqueria', array['salon','estetica','barberia','corte'], null),
  ('barberia',   array['barber','corte','salon'], null),
  ('unas',       array['manicure','pedicure','acrilicas','nails'], null),
  -- Comida
  ('taqueria',   array['tacos','comida','mexicana','antojitos'], null),
  ('lonchera',   array['food truck','troca','comida','taqueria'], 'MX'),
  ('fonda',      array['comida corrida','restaurante','cocina economica'], 'MX'),
  ('panaderia',  array['pan','pasteleria','reposteria','bizcocho'], null),
  ('carniceria', array['carne','carnes','pollo','res'], null),
  ('marisqueria',array['mariscos','pescado','ceviche','camarones'], null),
  -- Hogar
  ('plomero',    array['plomeria','fontanero','tuberia','agua'], null),
  ('fontanero',  array['plomero','plomeria','tuberia'], 'ES/PR'),
  ('albanil',    array['construccion','obra','remodelacion','cemento'], null),
  ('cerrajero',  array['llaves','cerradura','candado'], null),
  -- Trámites: lo que más se busca y peor se escribe
  ('impuestos',  array['taxes','contador','declaracion','itin'], null),
  ('taxes',      array['impuestos','contador','declaracion'], null),
  ('aseguranza', array['seguro','seguros','poliza','insurance'], 'calco muy usado'),
  ('remesas',    array['envio de dinero','mandar dinero','giro','western union'], null),
  ('notario',    array['notaria','documentos','poder','acta'], null),
  ('abogado',    array['legal','licenciado','bufete','consulta legal'], null),
  -- Fiestas
  ('quinceanera',array['quince','xv','fiesta','salon de fiestas','vestidos'], null),
  ('brincolin',  array['inflable','brincolines','juegos','fiesta infantil'], 'MX'),
  ('pinatas',    array['piñatas','fiesta','dulces'], null),
  -- Vivienda y trabajo
  ('cuarto',     array['habitacion','renta','alquiler','room'], null),
  ('troca',      array['camioneta','pickup','truck'], 'MX/US'),
  ('chamba',     array['trabajo','empleo','vacante'], 'MX'),
  ('mandado',    array['despensa','supermercado','abarrotes','compras'], 'MX')
on conflict (term) do update
  set expands_to = excluded.expands_to,
      note = excluded.note,
      updated_at = now();

alter table public.search_synonyms enable row level security;
drop policy if exists "sinonimos legibles por todos" on public.search_synonyms;
create policy "sinonimos legibles por todos" on public.search_synonyms for select using (true);

-- ════════════════════════════════════════════════════════════════════════════
-- 3 · El texto buscable de un negocio
-- ════════════════════════════════════════════════════════════════════════════
-- Junta lo que el negocio ES (nombre, especialidad, subcategorías) con lo que la
-- gente TECLEA para encontrarlo (etiquetas y términos de su categoría).
--
-- Para quitar tildes se usa `public.tl_unaccent`, que YA EXISTE en la base
-- (envoltorio INMUTABLE de `unaccent`, necesario porque `unaccent` viene marcada
-- STABLE y Postgres no deja usar una función STABLE dentro de un índice). Se
-- reutiliza a propósito en vez de crear otra igual: dos funciones que hacen lo
-- mismo acaban divergiendo.

-- El trigger que mantiene el índice. Ahora en ESPAÑOL — ese es el arreglo de
-- fondo — y con el texto enriquecido de arriba.
create or replace function public.tg_business_search_tsv()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  cat public.search_categories%rowtype;
begin
  select * into cat from public.search_categories where id = new.category_id;
  new.search_tsv := to_tsvector('spanish', concat_ws(' ',
    new.name,
    new.specialty_es, new.specialty_en,
    array_to_string(new.subcategories, ' '),
    array_to_string(new.features, ' '),
    -- La descripción que escribió el dueño: es donde dice lo que de verdad hace
    -- («cambio de aceite, frenos, suspensión») y hasta hoy no se buscaba.
    new.about_es, new.about_en,
    cat.label_es, cat.label_en, cat.terms));
  return new;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 4 · Expandir la consulta del usuario con los sinónimos
-- ════════════════════════════════════════════════════════════════════════════
-- Devuelve una `tsquery` que busca lo que el usuario escribió O cualquiera de
-- sus sinónimos. Se normaliza sin tildes y en minúsculas antes de buscar en la
-- tabla, para que «panadería» encuentre la fila de «panaderia».
-- `estricta = true`  → todas las palabras (precisión).
-- `estricta = false` → alguna palabra (cobertura).
--
-- Hacen falta LAS DOS. Con solo la estricta, «comida mexicana» daba CERO: exige
-- que estén las dos palabras y «mexicana» no aparecía en ningún sitio, así que
-- la consulta entera moría por una palabra. Con solo la amplia, «taller de
-- pintura» traería todos los talleres y todas las pinturas mezclados.
-- La solución es la de los buscadores serios: FILTRAR con la amplia (que no se
-- pierda nada) y ORDENAR poniendo delante lo que además cumple la estricta.
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
    -- Cada palabra en OR con las demás.
    for palabra in select unnest(string_to_array(btrim(in_q), ' ')) loop
      if btrim(palabra) = '' then continue; end if;
      extra := websearch_to_tsquery('spanish', palabra);
      if extra is not null then
        base := case when base is null then extra else base || extra end;
      end if;
    end loop;
  end if;
  if base is null then return null; end if;

  -- Los sinónimos SIEMPRE entran en OR: son alternativas, no requisitos.
  for palabra in
    select unnest(string_to_array(lower(public.tl_unaccent(btrim(in_q))), ' '))
  loop
    if length(palabra) < 3 then continue; end if;
    for sinon in
      select unnest(s.expands_to) from public.search_synonyms s where s.term = palabra
    loop
      extra := websearch_to_tsquery('spanish', sinon);
      if extra is not null then base := base || extra; end if;
    end loop;
  end loop;

  return base;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 5 · La búsqueda de negocios, con las cuatro capas
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.search_businesses(
  in_q          text default null,
  user_lat      double precision default null,
  user_lng      double precision default null,
  in_city       text default null,
  in_cat        text default null,
  in_price      text default null,
  in_min_rating numeric default null,
  max_results   integer default 30,
  in_offset     integer default 0,
  radius_m      double precision default 80000
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
as $$
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
         or tn <% lower(public.tl_unaccent(concat_ws(' ', b.name, b.specialty_es, array_to_string(b.subcategories,' '), b.about_es)))
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
end $$;

grant execute on function public.search_businesses(text, double precision, double precision, text, text, text, numeric, integer, integer, double precision) to anon, authenticated;
grant execute on function public.expandir_consulta(text, boolean) to anon, authenticated;
drop function if exists public.expandir_consulta(text);

-- ════════════════════════════════════════════════════════════════════════════
-- 6 · Eventos: exactamente el mismo fallo
-- ════════════════════════════════════════════════════════════════════════════
-- El buscador global sugiere Negocios, Eventos y Comunidad a la vez. Arreglar
-- solo negocios habría dejado «musica» sin encontrar «Noche de Música en Vivo».
-- (Comunidad ya estaba en español desde la auditoría del 2026-08-03.)
create or replace function public.tg_event_search_tsv()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.search_tsv := to_tsvector('spanish', concat_ws(' ',
    new.title_es, new.title_en, new.venue_es, new.venue_en,
    new.desc_es, new.desc_en, new.cat));
  return new;
end $$;

update public.events set created_at = created_at;   -- reindexa sin cambiar nada

-- Y el OTRO lado. Arreglar solo el índice no sirve de nada si la consulta sigue
-- preguntando en `simple`: el índice guardaba 'merc' (de «mercado») y la
-- consulta buscaba 'mercado' literal, así que no casaban. Un lado en español y
-- el otro en `simple` es peor que los dos mal, porque parece arreglado.
-- Se reescribe `search_events` cambiando SOLO cómo pregunta: misma firma, misma
-- forma, ahora con `expandir_consulta` (español + sinónimos) y sin tildes en la
-- comparación por nombre.
CREATE OR REPLACE FUNCTION public.search_events(in_q text DEFAULT NULL::text, user_lat double precision DEFAULT NULL::double precision, user_lng double precision DEFAULT NULL::double precision, radius_m double precision DEFAULT 80000, in_cat text DEFAULT NULL::text, in_free boolean DEFAULT NULL::boolean, max_results integer DEFAULT 30, in_offset integer DEFAULT 0)
 RETURNS TABLE(slug text, title_es text, title_en text, venue_es text, venue_en text, cat text, starts_at timestamp with time zone, time_label_es text, time_label_en text, price_label text, going_count integer, desc_es text, desc_en text, tile_a text, tile_b text, cover_url text)
 LANGUAGE sql
 STABLE
AS $function$
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
      or similarity(e.title_es, q.t) > 0.2
    )
  order by
    (case when q.t is not null then ts_rank(e.search_tsv, public.expandir_consulta(q.t, false)) end) desc nulls last,
    e.starts_at asc
  offset greatest(0, in_offset)
  limit greatest(1, least(max_results, 60));
$function$
;


-- ════════════════════════════════════════════════════════════════════════════
-- 7 · Reconstruir el índice de TODOS los negocios con las reglas nuevas
-- ════════════════════════════════════════════════════════════════════════════
-- Sin esto, el arreglo solo aplicaría a los negocios que se editen a partir de
-- ahora — es decir, a ninguno.
update public.businesses set updated_at = updated_at;

-- Índice de trigramas para que las erratas no acaben en escaneo completo cuando
-- la tabla crezca. GIN + gin_trgm_ops es lo que acelera `<%`.
create index if not exists businesses_name_trgm_idx
  on public.businesses using gin (lower(public.tl_unaccent(name)) gin_trgm_ops);

notify pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- 8 · «¿Quisiste decir…?»
-- ════════════════════════════════════════════════════════════════════════════
-- Cuando alguien escribe «carniceria» y no hay ninguna, o escribe «mecnico» tan
-- mal que ni las erratas lo alcanzan, un buscador serio no se encoge de hombros:
-- propone. La corrección sale del vocabulario que YA tenemos —los términos de
-- las categorías y las claves de sinónimos—, no de un diccionario genérico:
-- así solo sugiere palabras que de verdad llevan a algún sitio de esta app.
create or replace function public.sugerir_termino(in_q text)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  with q as (select lower(public.tl_unaccent(btrim(coalesce(in_q, '')))) as t),
  vocabulario as (
    select unnest(string_to_array(c.terms, ' ')) as palabra from public.search_categories c
    union
    select s.term from public.search_synonyms s
  )
  select v.palabra
    from vocabulario v, q
   where length(q.t) >= 3
     and length(v.palabra) >= 3
     and v.palabra <> q.t
     and word_similarity(q.t, v.palabra) > 0.5
   order by word_similarity(q.t, v.palabra) desc, length(v.palabra)
   limit 1;
$$;

grant execute on function public.sugerir_termino(text) to anon, authenticated;

notify pgrst, 'reload schema';
