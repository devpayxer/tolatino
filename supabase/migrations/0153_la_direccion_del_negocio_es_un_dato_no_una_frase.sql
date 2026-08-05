-- 0153_la_direccion_del_negocio_es_un_dato_no_una_frase.sql
-- Idempotente. Aplicar: pegar en el SQL Editor de Supabase y darle a Run.
--
-- ════════════════════════════════════════════════════════════════════════════
-- DE DÓNDE SALE (fundador, 2026-08-05)
-- ════════════════════════════════════════════════════════════════════════════
-- «En el registro del negocio, la dirección debe usar nuestra geo-dirección para
-- que ayude a la automatización, y debe ser un formulario completo profesional:
-- dirección, ciudad, estado, zipcode, etc.»
--
-- Tenía razón, y el fallo era peor de lo que se ve. Hoy el alta guarda:
--   · `address` → UNA caja de texto libre («Calle, ciudad y código postal»)
--   · `city`    → la ciudad del SELECTOR de la app, no la del negocio
--   · `location`→ **las coordenadas de esa ciudad**, no las de la dirección
--
-- O sea: el pin de un negocio no estaba donde está el negocio, sino en el centro
-- de la ciudad que el dueño tuviera elegida al darse de alta. Todo lo que se
-- apoya en la distancia —«cerca de mí», el radio de entrega, ordenar por
-- cercanía— trabajaba sobre un dato inventado. Y el panel, al editar la
-- dirección, ni siquiera tocaba `location`: se podía mudar el negocio de estado
-- y el mapa seguía igual.
--
-- ════════════════════════════════════════════════════════════════════════════
-- QUÉ CAMBIA
-- ════════════════════════════════════════════════════════════════════════════
-- 1. Columnas para las piezas que faltaban: `address_line2` (suite/local),
--    `state` y `postal_code`. `address` pasa a ser SOLO la calle y el número.
-- 2. `create_business` las acepta (parámetros nuevos, con valor por defecto y al
--    final: cualquier llamada vieja sigue funcionando igual).
-- 3. **`set_business_address`**, nueva: escribe las piezas Y la coordenada a la
--    vez, con la comprobación de dueño en el servidor. Existe porque las dos
--    cosas no pueden separarse — una dirección sin su punto es justo el fallo
--    que venimos a arreglar — y porque `location` es `geography`: dejar que el
--    navegador la escriba a mano invita a que un día se guarde torcida.
--
-- LO QUE NO CAMBIA, a propósito: el negocio SIN local. El alta promete por
-- escrito «Mostramos tu zona de servicio, no tu dirección exacta», y la 0151
-- solo devuelve la coordenada cuando hay dirección. Sin local se sigue guardando
-- `address` vacía y la coordenada de la CIUDAD — que es lo prometido, no un
-- descuido. Quien cocina desde su casa no puede acabar con un pin en su puerta.

-- ── 1 · Las piezas ──────────────────────────────────────────────────────────
alter table public.businesses add column if not exists address_line2 text;
alter table public.businesses add column if not exists state         text;
alter table public.businesses add column if not exists postal_code   text;

comment on column public.businesses.address       is 'Calle y número. Sin ciudad ni estado — esos van aparte.';
comment on column public.businesses.address_line2 is 'Suite, local, piso. Opcional.';
comment on column public.businesses.state         is 'Sigla de dos letras: PA, TX…';
comment on column public.businesses.postal_code   is 'Código postal (ZIP).';

-- Buscar por código postal es de las primeras cosas que pide un negocio («¿a qué
-- ZIPs reparto?»), y sin índice sería un recorrido completo. Parcial: la inmensa
-- mayoría de filas antiguas lo tienen a null y no hace falta indexarlas.
create index if not exists businesses_postal_idx
  on public.businesses (postal_code) where postal_code is not null;

-- ── 2 · El alta acepta las piezas ───────────────────────────────────────────
-- Cuerpo copiado del vivo (`prosrc`) + los campos nuevos. Los parámetros van al
-- FINAL y con valor por defecto: así una llamada que no los mande —el código de
-- producción hasta que se despliegue el nuevo— sigue comportándose igual.
create or replace function public.create_business(
  p_name text, p_category text, p_subcats text[], p_price text, p_phone text,
  p_address text, p_city text, p_about text, p_specialty_es text,
  p_specialty_en text, p_tile_a text, p_tile_b text,
  p_lat double precision, p_lng double precision,
  p_features text[] default '{}'::text[], p_hours jsonb default null,
  p_address_line2 text default null,
  p_state text default null,
  p_postal text default null
)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $fn$
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
    rating, reviews_count, location,
    address_line2, state, postal_code
  ) values (
    new_slug, trim(p_name), p_category, uid, 'free', nullif(p_price, ''), true,
    nullif(p_phone, ''), nullif(p_address, ''), coalesce(nullif(p_city, ''), 'Houston, TX'),
    nullif(p_about, ''), nullif(p_about, ''),
    nullif(p_specialty_es, ''), nullif(p_specialty_en, ''),
    coalesce(p_subcats, '{}'), coalesce(p_features, '{}'), p_hours, coalesce(nullif(p_tile_a, ''), '#EFEBFF'), coalesce(nullif(p_tile_b, ''), '#7B61FF'),
    0, 0,
    case when p_lat is not null and p_lng is not null
         then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end,
    nullif(trim(coalesce(p_address_line2, '')), ''),
    nullif(upper(trim(coalesce(p_state, ''))), ''),
    nullif(trim(coalesce(p_postal, '')), '')
  );
  return new_slug;
end
$fn$;

grant execute on function public.create_business(text, text, text[], text, text, text, text, text, text, text, text, text, double precision, double precision, text[], jsonb, text, text, text) to authenticated;

-- ⚠️ RETIRAR LA VERSIÓN VIEJA, y esto NO es limpieza opcional.
-- `create or replace` con distinto número de parámetros **no reemplaza: crea una
-- segunda función**. Al aplicar esto quedaron DOS `create_business` conviviendo,
-- la de 16 argumentos y la de 19. PostgREST elige por los nombres que le manden,
-- así que una llamada a la que le faltara un campo podía caer en la vieja y
-- guardar el negocio SIN estado ni código postal, sin error y sin rastro. Dos
-- funciones con el mismo nombre acaban divergiendo siempre.
-- Va DESPUÉS del `create` de arriba: en ningún momento se queda sin función.
drop function if exists public.create_business(text, text, text[], text, text, text, text, text, text, text, text, text, double precision, double precision, text[], jsonb);

-- ── 3 · Cambiar la dirección: piezas y punto, o nada ────────────────────────
-- El panel escribía `address` con un UPDATE normal y no tocaba `location`. Por
-- eso esto es una función y no una columna más: obliga a que las dos cosas
-- viajen juntas. Si algún día alguien vuelve a escribir solo el texto, la
-- coordenada se queda vieja y nadie se entera hasta que un cliente no encuentra
-- el negocio.
create or replace function public.set_business_address(
  p_business_id uuid,
  p_address text,
  p_line2 text,
  p_city text,
  p_state text,
  p_postal text,
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $fn$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'auth required'; end if;
  if not exists (select 1 from businesses b where b.id = p_business_id and b.owner_id = uid) then
    raise exception 'no autorizado: ese negocio no es tuyo';
  end if;

  -- Sin local: se borra la dirección y el punto pasa a ser el de la ciudad, que
  -- es lo que el alta promete. No se deja una dirección a medias.
  update businesses b
     set address       = nullif(trim(coalesce(p_address, '')), ''),
         address_line2 = nullif(trim(coalesce(p_line2, '')), ''),
         city          = coalesce(nullif(trim(coalesce(p_city, '')), ''), b.city),
         state         = nullif(upper(trim(coalesce(p_state, ''))), ''),
         postal_code   = nullif(trim(coalesce(p_postal, '')), ''),
         location      = case
                           when p_lat is not null and p_lng is not null
                             then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
                           else b.location
                         end
   where b.id = p_business_id;
end
$fn$;

revoke execute on function public.set_business_address(uuid, text, text, text, text, text, double precision, double precision) from public, anon;
grant execute on function public.set_business_address(uuid, text, text, text, text, text, double precision, double precision) to authenticated;

notify pgrst, 'reload schema';
