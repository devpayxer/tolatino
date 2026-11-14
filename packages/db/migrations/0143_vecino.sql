-- 0143 · Lo diferido del vecino que entra antes de abrir (Fase 9 · 9m; fase9-apertura.md §4 9m).
-- · DIRECCIONES COMO DOORDASH/UBER PARA TODO EE. UU. (decisión AC), sin terceros:
--   - `geo_points`: puntos de dirección casa por casa (OpenAddresses y los condados/estados que los publican); `geo_streets` (0025) suma el estado y el
--     lugar (ciudad del Censo) y queda como respaldo interpolado por rango (TIGER ADDRFEAT); `geo_places` (TIGER PLACE), `geo_zips` (ZCTA) y
--     `geo_names` (una fila por calle y código postal, derivada de las dos de arriba: es lo que autocompleta por prefijo y por trigramas).
--   - `dir_partes` (lee «123 N Wyo, Hazleton PA 18201»), `dir_resolver` (calle + número + código postal → el punto: primero la casa, luego el
--     tramo), `dir_ubicar` (0025) pasa a usar `dir_resolver` sin cambiar su forma, `dir_sugerir` (autocompletar mientras se escribe: prefijo con
--     índice, lo más cerca primero, en ≤ 100 ms) y `dir_inversa` («Usar mi ubicación»: el GPS → la dirección más cercana, por GIST).
--   - `geo_loads` dice qué estado y qué fuente se cargó (la carga nacional es por estado, reanudable: infra/direcciones/generar.sh).
--   - `user_addresses`: el lugar y el estado de la dirección, y el pin ajustado por la persona («la puerta está aquí»: calidad «puerta», pin_at).
--   - `businesses`: el punto corregido por el Super Admin (quién, cuándo y por qué; la auditoría guarda el antes y el después).
-- · MENSAJES EN VIVO (L385, L599): cada mensaje nuevo (y uno que se oculta) avisa por NOTIFY 'mensajes' con lo mínimo (de qué conversación): el SSE propio
--   (/api/vivo) lo reparte a quien puede verla y la pantalla trae lo nuevo por su camino de siempre. Sin preguntar cada 5 s.
-- · Mensajes tapa tarjetas y seguro social como Soporte (L1063): la app lo tapa antes de guardar y la base rechaza el que se salte eso.
-- · Alertas: «Avísame de nuevas vacantes» (search_alerts.kind = 'vacantes', L318) con su plantilla; reportar una vacante (content_reports 'job', L321).
-- · «Lo que más mencionan» (L280): `review_topics`, derivado de las reseñas por el barrido (nunca se edita a mano).
-- · Retiros del fabricante (L524): `vehicle_recalls` con los datos públicos de NHTSA por marca, modelo y año (infra/retiros/generar.sh) y su carga.
-- · Buscar con la voz (L95): `users.voice_search` (null = nunca se le preguntó; el aviso de Privacidad y el interruptor).
-- Reglas: nada se borra (estados); los CHECK que listan valores se AMPLÍAN (nunca una lista fija: otro bloque puede haber agregado los suyos); no depende
-- de 0144/0145 (el sandbox la aplica después de 0145; una base nueva, antes). Idempotente: aplicarla dos veces no cambia nada.
begin;

create or replace function pg_temp.ampliar_check(t regclass, nombre text, valores text[]) returns void language plpgsql as $$
declare d text; v text; nuevo text := '';
begin
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = nombre and conrelid = t;
  if d is null then return; end if;
  foreach v in array valores loop
    if position(quote_literal(v) in d) = 0 then nuevo := nuevo || quote_literal(v) || '::text, '; end if;
  end loop;
  if nuevo = '' then return; end if;
  execute format('alter table %s drop constraint %I', t, nombre);
  execute format('alter table %s add constraint %I %s', t, nombre, replace(d, 'ARRAY[', 'ARRAY[' || nuevo));
end $$;

-- ══════════════════════════════════════════ Direcciones ══════════════════════════════════════════

-- Los tramos del Censo (0025) suman su estado, su lugar (la ciudad del Censo que los contiene) y de dónde vienen; el prefijo se busca por índice.
alter table geo_streets add column if not exists state text check (state ~ '^[A-Z]{2}$');
alter table geo_streets add column if not exists place text check (char_length(place) <= 100);
alter table geo_streets add column if not exists source text not null default 'tiger';
create index if not exists geo_streets_calle_zip_idx on geo_streets (norm, zip_l, zip_r);
create index if not exists geo_streets_estado_idx on geo_streets (state);

-- Puntos de dirección casa por casa (OpenAddresses y lo que publican condados y estados): la mejor precisión. `source` = la fuente
-- («oa:us/pa/statewide»…; «prueba» = las filas que crea una prueba de punta a punta y borra al terminar).
create table if not exists geo_points (
  id      bigint generated always as identity primary key,
  num     text not null check (char_length(num) between 1 and 12),   -- «123», «123A», «12-14»
  num_i   integer,                                                 -- la parte numérica, para buscar
  street  text not null check (char_length(street) between 1 and 120),
  norm    text not null,                                           -- dir_abrev(street)
  unit    text check (char_length(unit) <= 30),
  place   text check (char_length(place) <= 100),
  state   text not null check (state ~ '^[A-Z]{2}$'),
  zip     text check (zip ~ '^\d{5}$'),
  county  text,
  source  text not null check (char_length(source) between 2 and 80),
  hash    text check (char_length(hash) <= 64),
  geom    geometry(Point, 4326) not null
);
create index if not exists geo_points_calle_idx on geo_points (norm, zip, num_i);
create index if not exists geo_points_geom_idx on geo_points using gist (geom);
create index if not exists geo_points_estado_idx on geo_points (state, source);
create unique index if not exists geo_points_hash_idx on geo_points (source, hash) where hash is not null;

-- Lugares del Censo (TIGER PLACE: ciudades, pueblos y lugares designados), simplificados: dan el nombre de la ciudad a cada tramo y punto.
create table if not exists geo_places (
  geoid  text primary key check (geoid ~ '^\d{7}$'),
  name   text not null check (char_length(name) between 1 and 100),
  state  text not null check (state ~ '^[A-Z]{2}$'),
  geom   geometry(MultiPolygon, 4326) not null
);
create index if not exists geo_places_geom_idx on geo_places using gist (geom);
create index if not exists geo_places_estado_idx on geo_places (state);

-- Códigos postales (ZCTA del Censo): su centro, su estado y su lugar principal (código postal → «Hazleton, PA»).
create table if not exists geo_zips (
  zip    text primary key check (zip ~ '^\d{5}$'),
  state  text check (state ~ '^[A-Z]{2}$'),
  place  text check (char_length(place) <= 100),
  geom   geometry(Point, 4326) not null
);
create index if not exists geo_zips_geom_idx on geo_zips using gist (geom);

-- Una fila por calle y código postal (de los puntos y de los tramos): lo que se autocompleta. Derivada (geo_nombres_rehacer); nunca a mano.
create table if not exists geo_names (
  id     bigint generated always as identity primary key,
  norm   text not null,
  name   text not null check (char_length(name) between 1 and 120),
  zip    text not null check (zip ~ '^\d{5}$'),
  place  text,
  state  text not null check (state ~ '^[A-Z]{2}$'),
  n      integer not null default 0,                               -- cuántos puntos y tramos la forman
  source text not null default 'carga',                            -- «prueba» = de una prueba de punta a punta
  geom   geometry(Point, 4326) not null,
  unique (norm, zip)
);
create index if not exists geo_names_prefijo_idx on geo_names (norm text_pattern_ops);
create index if not exists geo_names_estado_prefijo_idx on geo_names (state, norm text_pattern_ops);
create index if not exists geo_names_trgm_idx on geo_names using gin (norm gin_trgm_ops);
create index if not exists geo_names_zip_idx on geo_names (zip);

-- Qué se cargó: por estado y por fuente (la carga nacional es reanudable: lo cargado hace menos de 90 días no se vuelve a bajar).
alter table geo_loads add column if not exists state text check (state ~ '^[A-Z]{2}$');
alter table geo_loads add column if not exists kind text check (kind in ('tramos', 'lugares', 'zips', 'puntos', 'nombres', 'retiros'));
alter table geo_loads add column if not exists status text not null default 'ok' check (status in ('ok', 'fallo'));
alter table geo_loads add column if not exists seconds integer;
alter table geo_loads add column if not exists detail text check (char_length(detail) <= 500);
create index if not exists geo_loads_estado_idx on geo_loads (state, kind, at desc);

-- Abreviaturas de los estados (y sus nombres) para leer «…, Austin, Texas» o «…, TX 78701».
create or replace function dir_estado(t text) returns text language sql immutable parallel safe as $$
  select case
    when upper(t) in ('AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
                      'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','PR') then upper(t)
    else ('{"alabama":"AL","alaska":"AK","arizona":"AZ","arkansas":"AR","california":"CA","colorado":"CO","connecticut":"CT","delaware":"DE","florida":"FL",
            "georgia":"GA","hawaii":"HI","idaho":"ID","illinois":"IL","indiana":"IN","iowa":"IA","kansas":"KS","kentucky":"KY","louisiana":"LA","maine":"ME",
            "maryland":"MD","massachusetts":"MA","michigan":"MI","minnesota":"MN","mississippi":"MS","missouri":"MO","montana":"MT","nebraska":"NE","nevada":"NV",
            "new hampshire":"NH","new jersey":"NJ","new mexico":"NM","new york":"NY","north carolina":"NC","north dakota":"ND","ohio":"OH","oklahoma":"OK",
            "oregon":"OR","pennsylvania":"PA","rhode island":"RI","south carolina":"SC","south dakota":"SD","tennessee":"TN","texas":"TX","utah":"UT","vermont":"VT",
            "virginia":"VA","washington":"WA","west virginia":"WV","wisconsin":"WI","wyoming":"WY","puerto rico":"PR"}'::jsonb ->> lower(trim(t))) end
$$;

-- Lee lo que la persona escribe: «123 N Wyo», «412 north wyoming street, hazleton pa 18201», «1100 Congress Ave Austin TX». El número (con su letra), la
-- calle normalizada (dir_abrev) y, si los hay, el código postal, el estado y el lugar (lo que va después de la coma, o al final).
create or replace function dir_partes(q text)
returns table (num text, num_i integer, calle text, zip text, estado text, lugar text)
language plpgsql immutable parallel safe as $$
#variable_conflict use_variable
declare p text[]; cab text; m text[]; resto text; w text[]; e text;
begin
  p := regexp_split_to_array(left(coalesce(q, ''), 200), ',');
  cab := dir_norm(p[1]);
  resto := dir_norm(array_to_string(p[2:], ' '));
  -- El código postal puede ir al final de la cabeza («… 18201») o después de la coma.
  zip := coalesce((regexp_match(resto, '(?:^|\s)(\d{5})(?:\s\d{4})?(?:\s|$)'))[1], (regexp_match(cab, '\s(\d{5})$'))[1]);
  resto := trim(regexp_replace(resto, '(?:^|\s)\d{5}(?:\s\d{4})?(?=\s|$)', ' ', 'g'));
  if zip is not null then cab := trim(regexp_replace(cab, '\s\d{5}$', '')); end if;
  m := regexp_match(cab, '^(\d{1,7}[a-z]?)(?:\s+(.*))?$');
  if m is not null then num := m[1]; num_i := (regexp_match(m[1], '^\d+'))[1]::integer; cab := coalesce(m[2], ''); end if;
  -- El estado: la última palabra (o las dos últimas: «new york») de lo de después de la coma.
  w := regexp_split_to_array(resto, '\s+');
  if array_length(w, 1) >= 2 then e := dir_estado(w[array_length(w, 1) - 1] || ' ' || w[array_length(w, 1)]); if e is not null then w := w[1:array_length(w, 1) - 2]; end if; end if;
  if e is null and array_length(w, 1) >= 1 and w[1] <> '' then e := dir_estado(w[array_length(w, 1)]); if e is not null then w := w[1:array_length(w, 1) - 1]; end if; end if;
  estado := e;
  lugar := nullif(trim(array_to_string(w, ' ')), '');
  calle := dir_abrev(cab);
  return next;
end $$;

-- Resolver una dirección (calle con número + código postal) al punto: 1) la casa (geo_points), 2) el tramo con ese número (geo_streets, interpolado),
-- 3) la calle sin ese número. La calle mal escrita se corrige con los nombres de ese código postal (trigramas). Devuelve también el lugar y el estado.
create or replace function dir_resolver(calle text, cp text)
returns table (lat double precision, lng double precision, calidad text, nombre text, zip text, lugar text, estado text, numero text)
language plpgsql stable parallel safe as $$
#variable_conflict use_column
declare pa record; s text; g record;
begin
  select * into pa from dir_partes(calle);
  if pa.num_i is null or coalesce(pa.calle, '') = '' or cp !~ '^\d{5}$' then return; end if;
  -- La calle tal cual en ese código postal, o la más parecida (≥ 0.5) de ese código postal.
  select n.norm into s from geo_names n where n.zip = cp and n.norm = pa.calle limit 1;
  if s is null then select n.norm into s from geo_names n where n.zip = cp and similarity(n.norm, pa.calle) >= 0.5 order by similarity(n.norm, pa.calle) desc, n.n desc limit 1; end if;
  s := coalesce(s, pa.calle);
  -- 1) la casa
  for g in select p.* from geo_points p where p.norm = s and p.zip = cp and p.num_i = pa.num_i order by (p.num = pa.num) desc, p.unit nulls first limit 1 loop
    -- El nombre como se escribe más en ese código postal (muchas fuentes de puntos lo traen EN MAYÚSCULAS).
    lat := st_y(g.geom); lng := st_x(g.geom); calidad := 'punto'; zip := cp; numero := g.num;
    nombre := coalesce((select n.name from geo_names n where n.norm = s and n.zip = cp), g.street);
    lugar := coalesce(g.place, (select z.place from geo_zips z where z.zip = cp)); estado := g.state; return next; return;
  end loop;
  -- 2) el tramo con ese número (del lado con la misma paridad), y si no, 3) la calle con el número más cercano
  for g in
    with cand as (
      select t.*, case when t.l_from is not null and pa.num_i between least(t.l_from, t.l_to) and greatest(t.l_from, t.l_to) and coalesce(t.zip_l, cp) = cp then 'l'
                       when t.r_from is not null and pa.num_i between least(t.r_from, t.r_to) and greatest(t.r_from, t.r_to) and coalesce(t.zip_r, cp) = cp then 'r' end as lado,
             least(abs(pa.num_i - coalesce(t.l_from, -99999999)), abs(pa.num_i - coalesce(t.l_to, -99999999)), abs(pa.num_i - coalesce(t.r_from, -99999999)), abs(pa.num_i - coalesce(t.r_to, -99999999))) as lejos
        from geo_streets t where t.norm = s and (t.zip_l = cp or t.zip_r = cp)
    )
    select c.*, case c.lado when 'l' then case when c.l_to = c.l_from then 0.5 else (pa.num_i - c.l_from)::float8 / (c.l_to - c.l_from) end
                            when 'r' then case when c.r_to = c.r_from then 0.5 else (pa.num_i - c.r_from)::float8 / (c.r_to - c.r_from) end else 0.5 end as f
      from cand c
     order by (c.lado is not null) desc, (case c.lado when 'l' then (c.l_from % 2) = (pa.num_i % 2) when 'r' then (c.r_from % 2) = (pa.num_i % 2) else false end) desc, c.lejos
     limit 1
  loop
    lat := st_y(st_lineinterpolatepoint(g.geom, greatest(0, least(1, g.f)))); lng := st_x(st_lineinterpolatepoint(g.geom, greatest(0, least(1, g.f))));
    calidad := case when g.lado is null then 'calle' else 'numero' end; nombre := g.name; zip := cp; numero := pa.num;
    lugar := coalesce(g.place, (select z.place from geo_zips z where z.zip = cp)); estado := coalesce(g.state, (select z.state from geo_zips z where z.zip = cp));
    return next; return;
  end loop;
end $$;

-- 0025 · dir_ubicar conserva su forma (la usan el pago, los eventos y los inmuebles) y ahora también encuentra la casa exacta.
create or replace function dir_ubicar(calle text, cp text)
returns table (lat double precision, lng double precision, calidad text, nombre text, zip text)
language sql stable parallel safe as $$
  select r.lat, r.lng, case when r.calidad = 'punto' then 'numero' else r.calidad end, r.nombre, r.zip from dir_resolver(calle, cp) r
$$;

-- Autocompletar mientras se escribe (≤ 100 ms): los nombres de calle que EMPIEZAN con lo escrito (índice por prefijo), en el estado de quien busca
-- primero y luego en todo el país, lo más cerca de su punto primero; si nada empieza así, los parecidos (trigramas). Cada calle con el número escrito
-- se resuelve a la casa (punto) o al tramo (número); sin número, la calle. «… Austin TX» sin coma: se quitan palabras del final hasta que haya calle.
create or replace function dir_sugerir(q text, p_lat double precision, p_lng double precision, mi_estado text default null, cuantos integer default 6)
returns table (linea text, sub text, calle text, numero text, zip text, lugar text, estado text, lat double precision, lng double precision, calidad text)
language plpgsql stable as $$
#variable_conflict use_column
declare
  pa record; pt geometry := st_setsrid(st_point(coalesce(p_lng, -98.5), coalesce(p_lat, 39.8)), 4326);
  w text[]; k integer; s text; est text; lug text; c record; r record; vistos text[] := '{}'; dados integer := 0; fase integer; intento integer; lugar_q text;
  hay boolean := false; calles text[] := '{}'; cl record;
begin
  select * into pa from dir_partes(q);
  if coalesce(pa.calle, '') = '' or length(replace(pa.calle, ' ', '')) < 2 then return; end if;
  cuantos := greatest(1, least(coalesce(cuantos, 6), 10));
  w := regexp_split_to_array(pa.calle, '\s+');
  est := pa.estado; lug := pa.lugar;
  -- Sin coma, el final puede ser el lugar y el estado: se prueba la calle entera y después quitando palabras del final (hasta 4).
  for k in reverse array_length(w, 1)..greatest(1, array_length(w, 1) - 4) loop
    s := array_to_string(w[1:k], ' ');
    if k < array_length(w, 1) then
      lug := nullif(array_to_string(w[k + 1:array_length(w, 1)], ' '), '');
      if est is null and lug is not null then
        est := dir_estado((regexp_match(lug, '(\S+\s\S+)$'))[1]);
        if est is not null then lug := nullif(trim(regexp_replace(lug, '\S+\s\S+$', '')), '');
        else est := dir_estado((regexp_match(lug, '(\S+)$'))[1]); if est is not null then lug := nullif(trim(regexp_replace(lug, '\S+$', '')), ''); end if; end if;
      end if;
    end if;
    -- El lugar escrito ordena pero no manda: si con él no hay calle, se prueba sin él (el lugar del Censo no siempre es como lo dice la gente).
    for intento in 1..2 loop
      lugar_q := case when intento = 1 then lug end;
      exit when intento = 2 and lug is null;
      -- fase 1: el estado (el escrito, o el de quien busca); fase 2: todo el país (si no escribió estado).
      for fase in 1..2 loop
        exit when fase = 2 and (est is not null or dados >= cuantos);
        for c in
          with m as materialized (
            select g.norm, g.name, g.zip, g.place, g.state, g.geom from geo_names g
             where g.norm like s || '%'
               and (fase = 2 or g.state = coalesce(est, upper(mi_estado), g.state))
               and (pa.zip is null or g.zip = pa.zip)
               and (lugar_q is null or lower(coalesce(g.place, '')) like lugar_q || '%')
             limit 4000)
          select * from m order by m.geom <-> pt limit cuantos * 3
        loop
          exit when dados >= cuantos;
          hay := true;
          if pa.num_i is null or (c.norm || c.zip) = any(vistos) then
            if (c.norm || c.zip) = any(vistos) then continue; end if;
            vistos := vistos || (c.norm || c.zip);
            linea := c.name; sub := concat_ws(', ', c.place, c.state || ' ' || c.zip); calle := c.name; numero := null; zip := c.zip; lugar := c.place; estado := c.state;
            lat := st_y(c.geom); lng := st_x(c.geom); calidad := 'calle'; dados := dados + 1; return next;
            continue;
          end if;
          select * into r from dir_resolver(pa.num || ' ' || c.norm, c.zip) x where x.calidad in ('punto', 'numero');
          if r.lat is null then
            -- La calle existe pero no ese número: queda de respaldo (sin número) por si ninguna lo tiene.
            if array_length(calles, 1) is null or array_length(calles, 1) < cuantos then calles := calles || (c.norm || '|' || c.zip); end if;
            continue;
          end if;
          if (r.numero || r.nombre || r.zip) = any(vistos) then continue; end if;
          vistos := vistos || (r.numero || r.nombre || r.zip);
          linea := r.numero || ' ' || r.nombre; sub := concat_ws(', ', coalesce(r.lugar, c.place), coalesce(r.estado, c.state) || ' ' || r.zip);
          calle := r.numero || ' ' || r.nombre; numero := r.numero; zip := r.zip; lugar := coalesce(r.lugar, c.place); estado := coalesce(r.estado, c.state);
          lat := r.lat; lng := r.lng; calidad := r.calidad; dados := dados + 1; return next;
        end loop;
      end loop;
      exit when dados > 0 or hay;
    end loop;
    exit when dados > 0 or hay;
    est := pa.estado; lug := pa.lugar;
  end loop;
  if dados > 0 then return; end if;
  -- La calle existe pero ninguna tiene ese número: las calles, sin número (la pantalla dice «falta el número»).
  if hay then
    for cl in select g.* from unnest(calles) x(v) join geo_names g on g.norm = split_part(x.v, '|', 1) and g.zip = split_part(x.v, '|', 2) loop
      linea := cl.name; sub := concat_ws(', ', cl.place, cl.state || ' ' || cl.zip); calle := cl.name; numero := null; zip := cl.zip; lugar := cl.place; estado := cl.state;
      lat := st_y(cl.geom); lng := st_x(cl.geom); calidad := 'calle'; return next;
    end loop;
    return;
  end if;
  -- Nada empieza así: los parecidos (mal escrita), en el estado (el escrito o el de quien busca) y cerca primero; acotado.
  if length(pa.calle) < 4 then return; end if;
  for c in
    with m as materialized (
      select g.norm, g.name, g.zip, g.place, g.state, g.geom, similarity(g.norm, pa.calle) as sim from geo_names g
       where g.norm % pa.calle and g.state = coalesce(pa.estado, upper(mi_estado), g.state) and (pa.zip is null or g.zip = pa.zip)
       limit 2000)
    select * from m where m.sim >= 0.45 order by m.sim desc, m.geom <-> pt limit cuantos * 3
  loop
    exit when dados >= cuantos;
    if pa.num_i is null then
      linea := c.name; sub := concat_ws(', ', c.place, c.state || ' ' || c.zip); calle := c.name; numero := null; zip := c.zip; lugar := c.place; estado := c.state;
      lat := st_y(c.geom); lng := st_x(c.geom); calidad := 'calle'; dados := dados + 1; return next;
    else
      select * into r from dir_resolver(pa.num || ' ' || c.norm, c.zip) x where x.calidad in ('punto', 'numero');
      if r.lat is null or (r.numero || r.nombre || r.zip) = any(vistos) then continue; end if;
      vistos := vistos || (r.numero || r.nombre || r.zip);
      linea := r.numero || ' ' || r.nombre; sub := concat_ws(', ', coalesce(r.lugar, c.place), coalesce(r.estado, c.state) || ' ' || r.zip);
      calle := linea; numero := r.numero; zip := r.zip; lugar := coalesce(r.lugar, c.place); estado := coalesce(r.estado, c.state);
      lat := r.lat; lng := r.lng; calidad := r.calidad; dados := dados + 1; return next;
    end if;
  end loop;
end $$;

-- «Usar mi ubicación»: el punto del GPS → la dirección más cercana. 1) la casa a ≤ 40 m; 2) el tramo a ≤ 150 m con el número interpolado del lado
-- donde está el punto (izquierda o derecha del tramo, con su paridad). Sin nada cerca, ninguna fila.
create or replace function dir_inversa(lat double precision, lng double precision)
returns table (calle text, numero text, zip text, lugar text, estado text, plat double precision, plng double precision, calidad text, metros integer)
language plpgsql stable as $$
#variable_conflict use_column
declare pt geometry := st_setsrid(st_point(dir_inversa.lng, dir_inversa.lat), 4326); g record; f float8; a geometry; b geometry; izq boolean; d0 integer; d1 integer; nn integer; z text;
begin
  if lat is null or lng is null or abs(lat) > 90 or abs(lng) > 180 then return; end if;
  for g in select p.*, st_distance(p.geom::geography, pt::geography) as m from geo_points p order by p.geom <-> pt limit 1 loop
    if g.m <= 40 then
      calle := g.num || ' ' || coalesce((select n.name from geo_names n where n.norm = g.norm and n.zip = g.zip), g.street); numero := g.num; zip := g.zip; lugar := coalesce(g.place, (select x.place from geo_zips x where x.zip = g.zip)); estado := g.state;
      plat := st_y(g.geom); plng := st_x(g.geom); calidad := 'punto'; metros := round(g.m); return next; return;
    end if;
  end loop;
  for g in
    select t.*, st_distance(t.geom::geography, pt::geography) as m from (select * from geo_streets t order by t.geom <-> pt limit 8) t order by m limit 1
  loop
    if g.m > 150 then return; end if;
    f := st_linelocatepoint(g.geom, pt);
    a := st_lineinterpolatepoint(g.geom, greatest(0, f - 0.02)); b := st_lineinterpolatepoint(g.geom, least(1, f + 0.02));
    izq := ((st_x(b) - st_x(a)) * (st_y(pt) - st_y(a)) - (st_y(b) - st_y(a)) * (st_x(pt) - st_x(a))) > 0;
    if izq and g.l_from is null then izq := false; elsif not izq and g.r_from is null then izq := true; end if;
    if izq then d0 := g.l_from; d1 := g.l_to; z := coalesce(g.zip_l, g.zip_r); else d0 := g.r_from; d1 := g.r_to; z := coalesce(g.zip_r, g.zip_l); end if;
    if d0 is not null then
      nn := round(d0 + f * (d1 - d0));
      if nn % 2 <> d0 % 2 then nn := nn + case when d1 >= d0 then 1 else -1 end; end if;
      nn := greatest(least(d0, d1), least(greatest(d0, d1), nn));
      numero := nn::text; calle := nn || ' ' || g.name; calidad := 'numero';
    else
      numero := null; calle := g.name; calidad := 'calle';
    end if;
    zip := z; lugar := coalesce(g.place, (select x.place from geo_zips x where x.zip = z)); estado := coalesce(g.state, (select x.state from geo_zips x where x.zip = z));
    plat := st_y(st_closestpoint(g.geom, pt)); plng := st_x(st_closestpoint(g.geom, pt)); metros := round(g.m);
    return next; return;
  end loop;
end $$;

-- Rehace los nombres de calle de un estado (los de la carga: los de una prueba, source «prueba», no se tocan). La corre generar.sh al final de cada estado.
create or replace function geo_nombres_rehacer(st text) returns integer language plpgsql as $$
begin
  delete from geo_names where state = st and source = 'carga';
  insert into geo_names (norm, name, zip, place, state, n, source, geom)
  select norm, (array_agg(name order by c desc))[1], zip, (array_agg(place order by c desc) filter (where place is not null))[1], st, sum(c)::int, 'carga',
         st_centroid(st_collect(g))
    from (
      select p.norm, p.street as name, p.zip, p.place, count(*) as c, st_centroid(st_collect(p.geom)) as g
        from geo_points p where p.state = st and p.zip is not null and p.source <> 'prueba' group by 1, 2, 3, 4
      union all
      select t.norm, t.name, z.zip, t.place, count(*), st_centroid(st_collect(st_lineinterpolatepoint(t.geom, 0.5)))
        from geo_streets t cross join lateral (select distinct x from unnest(array[t.zip_l, t.zip_r]) x where x is not null) z(zip)
       where t.state = st and t.county <> 'prueba' group by 1, 2, 3, 4
    ) u
   group by norm, zip
  on conflict (norm, zip) do update set name = excluded.name, place = excluded.place, state = excluded.state, n = excluded.n, geom = excluded.geom
    where geo_names.source = 'carga';
  return (select count(*)::int from geo_names where state = st and source = 'carga');
end $$;

-- Mis direcciones: el lugar y el estado de cada dirección (todo EE. UU.) y el pin que la persona ajustó («la puerta está aquí»).
alter table user_addresses add column if not exists place text check (char_length(place) <= 100);
alter table user_addresses add column if not exists state text check (state ~ '^[A-Z]{2}$');
alter table user_addresses add column if not exists pin_at timestamptz;
do $$ begin perform pg_temp.ampliar_check('user_addresses', 'user_addresses_geo_quality_check', array['punto', 'puerta']); end $$;

-- El punto de un negocio corregido por el Super Admin (la auditoría guarda el antes y el después; el motivo, aquí y allá).
alter table businesses add column if not exists geo_fixed_at timestamptz;
alter table businesses add column if not exists geo_fixed_by uuid references users (id);
alter table businesses add column if not exists geo_fixed_reason text check (char_length(geo_fixed_reason) <= 300);

-- La guía de El Compa del panel suma el apartado nuevo de Tu página (Panel › Tu página › Dirección y mapa).
insert into compa_panel_guide (code, ruta, parte, needs, title, what, help_slugs, words, sort) values
  ('pagina/dir', 'pagina/dir', 'page', 'always', '{"es":"Dirección y mapa","en":"Address and map"}',
    '{"es":"Dónde te encuentran: la dirección y el pin en la puerta.","en":"Where people find you: the address and the pin at the door."}',
    '{direcciones}', '{direccion,mapa,pin,puerta,ubicacion,donde estoy,cambiar direccion,address,map,location,door}', 24)
on conflict (code) do update set ruta = excluded.ruta, parte = excluded.parte, needs = excluded.needs, title = excluded.title, what = excluded.what,
  help_slugs = excluded.help_slugs, words = excluded.words, sort = excluded.sort;

-- ══════════════════════════════════════════ Mensajes en vivo y tapados ══════════════════════════════════════════

-- Cada mensaje nuevo (o uno que se oculta) avisa por NOTIFY 'mensajes' con lo mínimo: de qué conversación es y de quién (nunca el texto).
create or replace function chat_messages_vivo() returns trigger language plpgsql as $$
declare t record;
begin
  select user_id, business_id into t from chat_threads where id = new.thread_id;
  if found then perform pg_notify('mensajes', json_build_object('k', 'chat', 't', new.thread_id, 'u', t.user_id, 'b', t.business_id)::text); end if;
  return null;
end $$;
drop trigger if exists chat_messages_vivo on chat_messages;
create trigger chat_messages_vivo after insert or update of hidden_at on chat_messages for each row execute function chat_messages_vivo();

create or replace function dm_messages_vivo() returns trigger language plpgsql as $$
declare t record;
begin
  select a_user_id, b_user_id into t from dm_threads where id = new.thread_id;
  if found then perform pg_notify('mensajes', json_build_object('k', 'dm', 't', new.thread_id, 'a', t.a_user_id, 'b', t.b_user_id)::text); end if;
  return null;
end $$;
drop trigger if exists dm_messages_vivo on dm_messages;
create trigger dm_messages_vivo after insert or update of hidden_at on dm_messages for each row execute function dm_messages_vivo();

-- Mensajes tapa como Soporte (L1063): la app tapa tarjetas y seguro social antes de guardar; la base rechaza el que se salte eso (como 0117 en Soporte).
create or replace function chat_messages_sin_secretos() returns trigger language plpgsql as $$
begin
  if texto_con_secretos(new.body) then raise exception 'mensajes_sin_secretos: un mensaje no guarda números de tarjeta ni de seguro social'; end if;
  return new;
end $$;
drop trigger if exists chat_messages_sin_secretos on chat_messages;
create trigger chat_messages_sin_secretos before insert or update of body on chat_messages for each row execute function chat_messages_sin_secretos();

-- ══════════════════════════════════════════ Alertas, reportes y lo que más mencionan ══════════════════════════════════════════

-- «Avísame de nuevas vacantes» (L318): una alerta de la ciudad (query = «vacantes»; filters = {kind}); se lista en Mi cuenta › Avisos con «Quitar».
alter table search_alerts add column if not exists kind text not null default 'busqueda' check (kind in ('busqueda', 'vacantes'));
create index if not exists search_alerts_vivas_idx on search_alerts (user_id, created_at desc) where removed_at is null;
create index if not exists search_alerts_vacantes_idx on search_alerts (city_id, kind) where removed_at is null and kind = 'vacantes';
create unique index if not exists search_alerts_vacantes_una on search_alerts (user_id, city_id) where removed_at is null and kind = 'vacantes';
insert into notif_templates (key, grp, pref, sms, sms_mode, push, title, body) values
  ('vacante_nueva', 'tx', null, false, 'nunca', true, '{"es":"Vacante nueva en {ciudad}","en":"New job in {ciudad}"}',
   '{"es":"{negocio} busca {puesto}. Mírala y aplica en To''Latino.","en":"{negocio} is hiring: {puesto}. See it and apply on To''Latino."}')
on conflict (key) do nothing;

-- Reportar una vacante desde su página (L309): la cola «Reportes de contenido» acepta vacantes.
do $$ begin perform pg_temp.ampliar_check('content_reports', 'content_reports_target_kind_check', array['job']); end $$;

-- «Lo que más mencionan» (L280): los temas de las reseñas visibles de cada negocio (derivado del texto por el barrido; nunca se edita a mano).
create table if not exists review_topics (
  business_id  text not null references businesses (id),
  topic        text not null check (topic ~ '^[a-z_]{2,30}$'),
  n            integer not null check (n >= 0),
  refreshed_at timestamptz not null default now(),
  primary key (business_id, topic)
);
create index if not exists review_topics_negocio_idx on review_topics (business_id, n desc);

-- ══════════════════════════════════════════ Retiros del fabricante (NHTSA) ══════════════════════════════════════════

-- Los retiros públicos de NHTSA por marca, modelo y año (infra/retiros/generar.sh baja el archivo público una vez al mes). La campaña dice qué falla,
-- qué puede pasar y cómo se arregla; si aplica a un VIN concreto lo confirma el dealer o nhtsa.gov (la página lo dice así).
create table if not exists vehicle_recalls (
  campaign     text not null check (campaign ~ '^[0-9A-Z]{6,14}$'),
  make         text not null check (char_length(make) between 1 and 40),
  model        text not null check (char_length(model) between 1 and 60),
  year         smallint not null check (year between 1949 and 2100),
  component    text check (char_length(component) <= 200),
  summary      text check (char_length(summary) <= 4000),
  consequence  text check (char_length(consequence) <= 4000),
  remedy       text check (char_length(remedy) <= 4000),
  report_date  date,
  do_not_drive boolean not null default false,
  source       text not null default 'nhtsa',
  loaded_at    timestamptz not null default now(),
  primary key (campaign, make, model, year)
);
create index if not exists vehicle_recalls_modelo_idx on vehicle_recalls (upper(make), upper(model), year);

-- ══════════════════════════════════════════ Buscar con la voz ══════════════════════════════════════════
-- null = nunca se le preguntó (la primera vez que toca el micrófono ve el aviso); true / false = su interruptor en Mi cuenta › Ajustes › Privacidad.
alter table users add column if not exists voice_search boolean;

commit;
