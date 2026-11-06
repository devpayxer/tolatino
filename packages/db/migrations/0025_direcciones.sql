-- 0025 · Direcciones propias (PLAN §5 «Nominatim/Photon propio»; HERRAMIENTAS #10) para la Fase 2 · bloque 2f.
-- Ubicar una dirección (calle, número, código postal) sin servicios de terceros: los tramos de calle con sus rangos de
-- números del Censo de EE. UU. (TIGER/Line ADDRFEAT, dominio público; es lo que usa Nominatim en EE. UU.), cargados por
-- infra/direcciones/generar.sh para los condados de nuestras ciudades. El número se interpola sobre el tramo.
-- Y las direcciones de entrega de cada persona (modelo de datos · Address).
begin;

-- «West Oak Street» = «W Oak St» = «w. oak st»: minúsculas, sin acentos ni puntos, y las palabras de calle y de
-- dirección abreviadas como las escribe el Servicio Postal. Inmutable: sirve para índices.
create or replace function dir_norm(t text) returns text language sql immutable parallel safe as $$
  select trim(regexp_replace(
    ' ' || regexp_replace(lower(public.unaccent('public.unaccent', coalesce(t, ''))), '[^a-z0-9 ]+', ' ', 'g') || ' ',
    '\s+', ' ', 'g'))
$$;
create or replace function dir_abrev(t text) returns text language plpgsql immutable parallel safe as $$
declare
  w text; out text[] := '{}';
  m constant jsonb := '{"street":"st","str":"st","avenue":"ave","av":"ave","avn":"ave","road":"rd","drive":"dr","drv":"dr",
    "boulevard":"blvd","boul":"blvd","lane":"ln","place":"pl","court":"ct","terrace":"ter","highway":"hwy","parkway":"pkwy",
    "circle":"cir","square":"sq","alley":"aly","way":"way","pike":"pike","trail":"trl","route":"rte","rt":"rte",
    "north":"n","south":"s","east":"e","west":"w","northeast":"ne","northwest":"nw","southeast":"se","southwest":"sw",
    "first":"1st","second":"2nd","third":"3rd","fourth":"4th","fifth":"5th","sixth":"6th","seventh":"7th","eighth":"8th",
    "ninth":"9th","tenth":"10th","saint":"st","mount":"mt","apartment":"apt"}';
begin
  foreach w in array regexp_split_to_array(dir_norm(t), ' ') loop
    if w <> '' then out := out || coalesce(m ->> w, w); end if;
  end loop;
  return array_to_string(out, ' ');
end $$;

-- Tramos de calle con sus rangos de números (lado izquierdo y derecho), su código postal y su línea.
create table if not exists geo_streets (
  id        bigint generated always as identity primary key,
  name      text not null,                 -- como lo escribe el Censo: «W Oak St»
  norm      text not null,                 -- dir_abrev(name): «w oak st»
  l_from    integer, l_to integer, r_from integer, r_to integer,
  zip_l     text, zip_r text,
  county    text not null,                 -- FIPS: 42079 (Luzerne)…
  geom      geometry(LineString, 4326) not null
);
create index if not exists geo_streets_norm_idx on geo_streets (norm);
create index if not exists geo_streets_trgm_idx on geo_streets using gin (norm gin_trgm_ops);
create index if not exists geo_streets_zip_idx on geo_streets (zip_l, zip_r);
create index if not exists geo_streets_geom_idx on geo_streets using gist (geom);

-- De qué carga vienen los tramos (para saber si están al día y cuántos hay).
create table if not exists geo_loads (
  id        bigint generated always as identity primary key,
  source    text not null,                 -- 'tiger-2024'
  counties  text[] not null,
  rows      integer not null,
  at        timestamptz not null default now()
);

-- Ubicar «58 W Oak St» en el 18201: el tramo de esa calle (igual, o casi igual si está mal escrita) en ese código postal
-- cuyo rango de números incluye el 58, del lado con la misma paridad; el punto se interpola sobre el tramo.
-- calidad 'numero' = el número cae en un tramo; 'calle' = la calle existe en ese código postal pero no ese número
-- (se da el tramo con el número más cercano). Sin fila = no se encontró.
create or replace function dir_ubicar(calle text, cp text)
returns table (lat double precision, lng double precision, calidad text, nombre text, zip text)
language sql stable parallel safe as $$
  with q as (select regexp_match(dir_norm(calle), '^(\d{1,7})\s+(.+)$') m),
  p as (select (m[1])::int n, dir_abrev(m[2]) s from q where m is not null),
  cand as (
    select g.*, p.n, p.s, similarity(g.norm, p.s) sim,
      case when g.l_from is not null and p.n between least(g.l_from, g.l_to) and greatest(g.l_from, g.l_to) and coalesce(g.zip_l, cp) = cp then 'l'
           when g.r_from is not null and p.n between least(g.r_from, g.r_to) and greatest(g.r_from, g.r_to) and coalesce(g.zip_r, cp) = cp then 'r' end lado,
      least(abs(p.n - coalesce(g.l_from, -99999999)), abs(p.n - coalesce(g.l_to, -99999999)), abs(p.n - coalesce(g.r_from, -99999999)), abs(p.n - coalesce(g.r_to, -99999999))) lejos
    from p join geo_streets g on (g.norm = p.s or (g.norm % p.s and similarity(g.norm, p.s) >= 0.5)) and (g.zip_l = cp or g.zip_r = cp)
  ),
  mejor as (
    select *, case lado when 'l' then case when l_to = l_from then 0.5 else (n - l_from)::float8 / (l_to - l_from) end
                        when 'r' then case when r_to = r_from then 0.5 else (n - r_from)::float8 / (r_to - r_from) end else 0.5 end f
      from cand
     order by (lado is not null) desc, (norm = s) desc, sim desc,
              -- del lado con la misma paridad (pares de un lado, nones del otro)
              (case lado when 'l' then (l_from % 2) = (n % 2) when 'r' then (r_from % 2) = (n % 2) else false end) desc, lejos
     limit 1
  )
  select st_y(pt), st_x(pt), case when lado is null then 'calle' else 'numero' end, name, cp
    from (select *, st_lineinterpolatepoint(geom, greatest(0, least(1, f))) pt from mejor) z
$$;

-- Direcciones de entrega de cada persona (Mi cuenta › Direcciones). Nada se borra: removed_at.
create table if not exists user_addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users (id),
  label        text not null default 'casa' check (label in ('casa', 'trabajo', 'otra')),
  street       text not null check (length(street) between 4 and 120),
  apt          text check (length(apt) <= 20),
  zip          text not null check (zip ~ '^\d{5}$'),
  instructions text check (length(instructions) <= 160),
  geo          geography(Point, 4326),        -- donde la ubicó el servidor (null: no se encontró)
  geo_quality  text check (geo_quality in ('numero', 'calle')),  -- el número exacto o solo la calle
  city_id      text references cities (id),   -- la ciudad cuyo código postal es (null: fuera de nuestras ciudades)
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  removed_at   timestamptz
);
create index if not exists user_addresses_user_idx on user_addresses (user_id) where removed_at is null;
create unique index if not exists user_addresses_default_idx on user_addresses (user_id) where is_default and removed_at is null;

commit;
