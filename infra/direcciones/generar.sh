#!/bin/bash
# Direcciones propias para TODO EE. UU. (decisión AC, PLAN §5; HERRAMIENTAS #10; 9m). Sin servicios de terceros: datos públicos que se bajan una vez y
# viven en nuestra base. Por estado, en paralelo y reanudable:
#   · lugares  TIGER PLACE (ciudades y lugares del Censo, simplificados)               → geo_places
#   · tramos   TIGER ADDRFEAT de cada condado (calles con sus rangos de números)        → geo_streets (con su estado y su lugar)
#   · puntos   OpenAddresses y los condados/estados que publican puntos de dirección    → geo_points  (la casa exacta; fuentes-oa.txt)
#   · nombres  una fila por calle y código postal (lo que se autocompleta)              → geo_names   (geo_nombres_rehacer)
#   · zips     ZCTA del Censo (una vez para todo el país: código postal → centro)       → geo_zips
# Cada estado y cada fuente queda en geo_loads; lo cargado hace menos de 90 días no se vuelve a bajar (FORZAR=1 lo rehace). Si una corrida se corta,
# la siguiente sigue donde quedó (lo terminado ya está anotado). Cada estado reemplaza SOLO sus filas, en una transacción: quien busca nunca ve el
# estado a medias.
#
# Uso:  bash infra/direcciones/generar.sh <carpeta de datos> <comando compose…>      (como packages/db/migrar.sh)
#   ESTADOS="PA NJ"        estados a cargar enteros. Por omisión, los de nuestras ciudades (cities.state). «todos» = los 50 + DC + PR.
#   CONDADOS_MUESTRA="06075 48453 36061"   condados sueltos (muestra de otro estado: lo que entra en un disco chico)
#   PARALELO=4             estados a la vez (cada uno usa un núcleo para leer los archivos y otro para la base)
#   ZCTA=1                 bajar los códigos postales nacionales (≈ 500 MB, una vez); ZCTA=0 los saca de los tramos cargados
#   FORZAR=1               rehacer aunque esté al día
#   TIGER_ANIO=2024 · DIRECCIONES_ESPEJO=https://www2.census.gov/geo/tiger (una copia propia también sirve, file:///… en las pruebas)
#   GDAL_IMAGEN            la imagen de GDAL fijada por versión (si el servidor no tiene ogr2ogr)
#
# Dónde y cuánto (la carga NACIONAL corre en el servidor, nunca en una sesión de trabajo):
#   · Carpeta de datos en un VOLUMEN APARTE (sandbox: volumen de Hetzner montado en /var/lib/tolatino/direcciones; producción: el volumen de la máquina
#     de la base). Los .zip se quedan como caché hasta la próxima carga (90 días); los .csv se borran al cargar cada condado.
#   · Descarga: ADDRFEAT de los ~3,230 condados ≈ 11 GB, PLACE de los 52 ≈ 1 GB, ZCTA ≈ 0.5 GB; OpenAddresses de EE. UU. ≈ 15–20 GB comprimido.
#   · Base: tramos ≈ 30 M filas (≈ 14 GB con índices), puntos ≈ 150 M (≈ 45 GB con índices), nombres ≈ 6 M (≈ 2 GB). Reservar 80 GB en el volumen
#     de la base (o un tablespace «geo» en otro volumen) y 40 GB en la carpeta de datos.
#   · Tiempo estimado con PARALELO=4 en 8 núcleos: 8–12 h la primera vez (la red manda: ≈ 30 GB), luego cada 90 días igual (se baja de nuevo).
#     Medido aquí (9m, sandbox sin red al Censo): ver docs/PROGRESS.md «Fase 9 · 9m».
set -euo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"
if [ "${1:-}" = "--estado" ]; then UNO="$2"; shift 2; else UNO=""; fi
DIR="${1:?carpeta de datos}"; shift
COMPOSE=("$@")
psql() { "${COMPOSE[@]}" exec -T db psql -h 127.0.0.1 -v ON_ERROR_STOP=1 -U tolatino -d tolatino -qAt "$@"; }
ANIO="${TIGER_ANIO:-2024}"
BASE="${DIRECCIONES_ESPEJO:-https://www2.census.gov/geo/tiger}"
GDAL="${GDAL_IMAGEN:-ghcr.io/osgeo/gdal:alpine-small-3.9.2}"
DIAS="${DIRECCIONES_DIAS:-90}"
mkdir -p "$DIR"
log() { echo "[direcciones${UNO:+ $UNO}] $*"; }

declare -A FIPS=([AL]=01 [AK]=02 [AZ]=04 [AR]=05 [CA]=06 [CO]=08 [CT]=09 [DE]=10 [DC]=11 [FL]=12 [GA]=13 [HI]=15 [ID]=16 [IL]=17 [IN]=18 [IA]=19
  [KS]=20 [KY]=21 [LA]=22 [ME]=23 [MD]=24 [MA]=25 [MI]=26 [MN]=27 [MS]=28 [MO]=29 [MT]=30 [NE]=31 [NV]=32 [NH]=33 [NJ]=34 [NM]=35 [NY]=36 [NC]=37
  [ND]=38 [OH]=39 [OK]=40 [OR]=41 [PA]=42 [RI]=44 [SC]=45 [SD]=46 [TN]=47 [TX]=48 [UT]=49 [VT]=50 [VA]=51 [WA]=53 [WV]=54 [WI]=55 [WY]=56 [PR]=72)
estado_de_fips() { local k; for k in "${!FIPS[@]}"; do [ "${FIPS[$k]}" = "$1" ] && echo "$k" && return; done; }

# Bajar (reanudable: lo que ya está no se vuelve a bajar; lo cortado se baja de nuevo).
bajar() { [ -s "$2" ] && return 0; curl -fsSL --retry 3 --connect-timeout 30 -o "$2.tmp" "$1" && mv "$2.tmp" "$2"; }
# Los archivos de una carpeta del Censo (o de la copia propia).
listar() { case "$1" in file://*) ls "${1#file://}" ;; *) curl -fsSL --retry 3 "$1/" | grep -o 'tl_[A-Za-z0-9_]*\.zip' | sort -u ;; esac; }
# ogr2ogr del servidor o, si no lo tiene, el de la imagen fijada (las rutas son relativas a la carpeta de datos).
ogr() {
  if command -v ogr2ogr >/dev/null; then (cd "$DIR" && ogr2ogr "$@")
  else docker run --rm -v "$DIR":/d -w /d "$GDAL" ogr2ogr "$@"; fi
}
# psql no reemplaza las variables (-v) en -c: lo que las usa va por la entrada (nunca SQL armado con los valores).
sqlv() { local s="$1"; shift; printf '%s\n' "$s" | psql "$@"; }
al_dia() { [ "${FORZAR:-0}" = 1 ] && return 1; [ "$(sqlv "select count(*) from geo_loads where state = :'st' and kind = :'k' and status = 'ok' and at > now() - (:'d' || ' days')::interval" -v st="$1" -v k="$2" -v d="$DIAS")" != 0 ]; }
anotar() { sqlv "insert into geo_loads (source, counties, rows, state, kind, status, seconds, detail) values (:'src', '{}', :'n', :'st', :'k', 'ok', :'s', nullif(:'det', ''))" -v st="$1" -v k="$2" -v n="$3" -v s="$4" -v det="$5" -v src="$6"; }

# ── Un estado (lo corre la parte de abajo, en paralelo) ──
cargar_estado() {
  local ST="$1" SS="${FIPS[$1]:-}" t0 n condados=() z c src
  [ -n "$SS" ] || { log "estado desconocido: $ST"; return 1; }
  local T="geo_carga_${ST,,}"
  # Muestra: solo los condados pedidos de este estado.
  for c in ${CONDADOS_MUESTRA:-}; do [ "${c:0:2}" = "$SS" ] && condados+=("$c"); done
  local MUESTRA=""; [ ${#condados[@]} -gt 0 ] && MUESTRA="muestra: ${condados[*]}"

  # 1) Lugares del Censo del estado.
  if ! al_dia "$ST" lugares; then
    t0=$SECONDS; z="tl_${ANIO}_${SS}_place.zip"
    log "lugares ($z)"
    bajar "$BASE/TIGER${ANIO}/PLACE/$z" "$DIR/$z"
    rm -f "$DIR/$ST-lugares.csv"
    ogr -f CSV "$ST-lugares.csv" "/vsizip/$z" -t_srs EPSG:4326 -simplify 0.0002 -nlt MULTIPOLYGON -select GEOID,NAME -lco GEOMETRY=AS_WKT -lco GEOMETRY_NAME=wkt
    psql -c "drop table if exists ${T}_l; create unlogged table ${T}_l (wkt text, geoid text, name text);"
    psql -c "\copy ${T}_l from stdin with (format csv, header true)" < "$DIR/$ST-lugares.csv"
    n=$(psql -v st="$ST" <<SQL
begin;
insert into geo_places (geoid, name, state, geom)
select geoid, name, :'st', st_multi(st_makevalid(st_geomfromtext(wkt, 4326))) from ${T}_l where wkt like 'MULTIPOLYGON%' or wkt like 'POLYGON%'
on conflict (geoid) do update set name = excluded.name, state = excluded.state, geom = excluded.geom;
drop table ${T}_l;
commit;
select count(*) from geo_places where state = :'st';
SQL
)
    rm -f "$DIR/$ST-lugares.csv"
    anotar "$ST" lugares "$n" $((SECONDS - t0)) "" "tiger-$ANIO:place"; log "lugares: $n"
  fi

  # 2) Tramos de calle (ADDRFEAT) de cada condado del estado.
  if ! al_dia "$ST" tramos; then
    t0=$SECONDS
    if [ ${#condados[@]} -eq 0 ]; then mapfile -t condados < <(listar "$BASE/TIGER${ANIO}/ADDRFEAT" | sed -n "s/^tl_${ANIO}_\(${SS}[0-9]\{3\}\)_addrfeat\.zip$/\1/p"); fi
    [ ${#condados[@]} -gt 0 ] || { log "sin condados en ADDRFEAT"; return 1; }
    psql -c "drop table if exists ${T}_t; create unlogged table ${T}_t (wkt text, name text, l_from text, l_to text, r_from text, r_to text, zip_l text, zip_r text, county text default '');"
    for c in "${condados[@]}"; do
      z="tl_${ANIO}_${c}_addrfeat.zip"
      bajar "$BASE/TIGER${ANIO}/ADDRFEAT/$z" "$DIR/$z"
      rm -f "$DIR/$c.csv"
      ogr -f CSV "$c.csv" "/vsizip/$z" -t_srs EPSG:4326 -explodecollections -select FULLNAME,LFROMHN,LTOHN,RFROMHN,RTOHN,ZIPL,ZIPR -lco GEOMETRY=AS_WKT -lco GEOMETRY_NAME=wkt
      psql -c "\copy ${T}_t (wkt, name, l_from, l_to, r_from, r_to, zip_l, zip_r) from stdin with (format csv, header true)" < "$DIR/$c.csv"
      sqlv "update ${T}_t set county = :'c' where county = ''" -v c="$c"
      rm -f "$DIR/$c.csv"
    done
    # Solo números enteros (el Censo trae algunos como «12A» o «N123»: esos lados se quedan sin rango). El lugar: el del Censo que contiene la mitad del tramo.
    n=$(psql -v st="$ST" -v ss="$SS" <<SQL
begin;
delete from geo_streets where state = :'st' or (state is null and county like :'ss' || '%');
insert into geo_streets (name, norm, l_from, l_to, r_from, r_to, zip_l, zip_r, county, geom, state, place, source)
select t.name, dir_abrev(t.name),
       case when t.l_from ~ '^\d{1,7}$' and t.l_to ~ '^\d{1,7}$' then t.l_from::int end, case when t.l_from ~ '^\d{1,7}$' and t.l_to ~ '^\d{1,7}$' then t.l_to::int end,
       case when t.r_from ~ '^\d{1,7}$' and t.r_to ~ '^\d{1,7}$' then t.r_from::int end, case when t.r_from ~ '^\d{1,7}$' and t.r_to ~ '^\d{1,7}$' then t.r_to::int end,
       nullif(t.zip_l, ''), nullif(t.zip_r, ''), t.county, g.geom, :'st',
       (select p.name from geo_places p where p.state = :'st' and st_intersects(p.geom, st_lineinterpolatepoint(g.geom, 0.5)) limit 1), 'tiger'
  from ${T}_t t cross join lateral (select st_setsrid(st_geomfromtext(t.wkt), 4326) as geom) g
 where t.name <> '' and t.wkt like 'LINESTRING%';
drop table ${T}_t;
commit;
select count(*) from geo_streets where state = :'st';
SQL
)
    anotar "$ST" tramos "$n" $((SECONDS - t0)) "$MUESTRA" "tiger-$ANIO:addrfeat"; log "tramos: $n${MUESTRA:+ ($MUESTRA)}"
  fi

  # 3) Puntos de dirección (OpenAddresses y lo que publica cada estado o condado): la lista vive en fuentes-oa.txt («ESTADO URL»).
  if ! al_dia "$ST" puntos; then
    t0=$SECONDS; n=0
    while read -r est url; do
      [ "$est" = "$ST" ] || continue
      src="oa:$(basename "${url%%\?*}" | sed 's/\.geojson\.gz$//; s/\.geojson$//')"
      z="$DIR/$ST-$(basename "${url%%\?*}")"
      log "puntos ($src)"
      bajar "$url" "$z" || { log "no se pudo bajar $url (se sigue con los tramos)"; continue; }
      psql -c "drop table if exists ${T}_p; create unlogged table ${T}_p (num text, street text, unit text, city text, zip text, hash text, lng float8, lat float8);"
      python3 -I "$AQUI/oa_csv.py" "$z" | psql -c "\copy ${T}_p from stdin with (format csv)"
      psql -v st="$ST" -v src="$src" <<SQL
begin;
delete from geo_points where state = :'st' and source = :'src';
insert into geo_points (num, num_i, street, norm, unit, place, state, zip, county, source, hash, geom)
select left(p.num, 12), (regexp_match(p.num, '^\d+'))[1]::int, left(p.street, 120), dir_abrev(p.street), nullif(left(p.unit, 30), ''),
       coalesce(nullif(initcap(lower(p.city)), ''), (select g.name from geo_places g where g.state = :'st' and st_intersects(g.geom, st_setsrid(st_point(p.lng, p.lat), 4326)) limit 1)),
       :'st', case when p.zip ~ '^\d{5}' then left(p.zip, 5) end, null, :'src', nullif(left(p.hash, 64), ''), st_setsrid(st_point(p.lng, p.lat), 4326)
  from ${T}_p p
 where p.num ~ '^\d' and p.street <> '' and p.lat between -90 and 90 and p.lng between -180 and 180
on conflict (source, hash) where hash is not null do nothing;
drop table ${T}_p;
commit;
SQL
      rm -f "$z"
    done < <(grep -v "^\s*#" "${FUENTES_OA:-$AQUI/fuentes-oa.txt}" 2>/dev/null || true)
    n=$(sqlv "select count(*) from geo_points where state = :'st' and source <> 'prueba'" -v st="$ST")
    anotar "$ST" puntos "$n" $((SECONDS - t0)) "" "openaddresses"; log "puntos: $n"
  fi

  # 4) Los nombres de calle del estado (lo que se autocompleta).
  t0=$SECONDS
  n=$(sqlv "select geo_nombres_rehacer(:'st')" -v st="$ST")
  anotar "$ST" nombres "$n" $((SECONDS - t0)) "" "derivado"; log "nombres: $n"
}

if [ -n "$UNO" ]; then cargar_estado "$UNO"; exit $?; fi

# ── La corrida: qué estados, en paralelo; después los códigos postales y el análisis ──
case "${ESTADOS:-}" in
  todos) LISTA=("${!FIPS[@]}") ;;
  "") mapfile -t LISTA < <(psql -c "select distinct upper(state) from cities where state ~ '^[A-Za-z]{2}$' order by 1") ;;
  *) read -r -a LISTA <<< "${ESTADOS^^}" ;;
esac
contiene() { local x; for x in "${LISTA[@]}"; do [ "$x" = "$1" ] && return 0; done; return 1; }
for c in ${CONDADOS_MUESTRA:-}; do e=$(estado_de_fips "${c:0:2}"); if [ -n "$e" ] && ! contiene "$e"; then LISTA+=("$e"); fi; done
log "estados: ${LISTA[*]} · ${PARALELO:-4} a la vez"
fallos=0
printf '%s\n' "${LISTA[@]}" | xargs -P "${PARALELO:-4}" -I{} bash "$0" --estado {} "$DIR" "${COMPOSE[@]}" || fallos=1

# Códigos postales: el ZCTA nacional (centros de cada código postal), o, sin él, el centro de los tramos de cada código postal.
if ! al_dia US zips; then
  t0=$SECONDS
  psql -c "drop table if exists geo_carga_zips; create unlogged table geo_carga_zips (zip text, lat float8, lng float8);"
  z="tl_${ANIO}_us_zcta520.zip"
  if [ "${ZCTA:-1}" = 1 ] && bajar "$BASE/TIGER${ANIO}/ZCTA520/$z" "$DIR/$z"; then
    rm -f "$DIR/zcta.csv"
    ogr -f CSV zcta.csv "/vsizip/$z" -select ZCTA5CE20,INTPTLAT20,INTPTLON20 -nlt NONE
    psql -c "\copy geo_carga_zips from stdin with (format csv, header true)" < "$DIR/zcta.csv"
    rm -f "$DIR/zcta.csv"; det="zcta"
  else
    psql -c "insert into geo_carga_zips select z, st_y(st_centroid(st_collect(st_lineinterpolatepoint(geom, 0.5)))), st_x(st_centroid(st_collect(st_lineinterpolatepoint(geom, 0.5)))) from geo_streets, unnest(array[zip_l, zip_r]) z where z ~ '^\d{5}$' group by z"
    det="de los tramos"
  fi
  n=$(psql <<'SQL'
begin;
insert into geo_zips (zip, geom, state, place)
select z.zip, st_setsrid(st_point(z.lng, z.lat), 4326), p.state, p.name
  from geo_carga_zips z left join lateral (select g.state, g.name from geo_places g where st_intersects(g.geom, st_setsrid(st_point(z.lng, z.lat), 4326)) limit 1) p on true
 where z.zip ~ '^\d{5}$'
on conflict (zip) do update set geom = excluded.geom, state = coalesce(excluded.state, geo_zips.state), place = coalesce(excluded.place, geo_zips.place);
-- Sin lugar del Censo (zonas rurales): el estado y el lugar más comunes de sus calles.
update geo_zips z set state = coalesce(z.state, x.state), place = coalesce(z.place, x.place)
  from (select n.zip, (array_agg(n.state order by n.n desc))[1] as state, (array_agg(n.place order by n.n desc) filter (where n.place is not null))[1] as place
          from geo_names n group by n.zip) x
 where x.zip = z.zip and (z.state is null or z.place is null);
drop table geo_carga_zips;
commit;
select count(*) from geo_zips;
SQL
)
  anotar US zips "$n" $((SECONDS - t0)) "$det" "tiger-$ANIO:zcta"; log "códigos postales: $n ($det)"
fi
psql -c "analyze geo_streets; analyze geo_points; analyze geo_names; analyze geo_zips; analyze geo_places;"
log "listo · tramos $(psql -c 'select count(*) from geo_streets') · puntos $(psql -c 'select count(*) from geo_points') · nombres $(psql -c 'select count(*) from geo_names')"
exit "$fallos"
