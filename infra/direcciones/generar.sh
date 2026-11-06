#!/bin/bash
# Direcciones propias (decisión O, PLAN §5; HERRAMIENTAS #10): carga los tramos de calle con sus rangos de números del
# Censo de EE. UU. (TIGER/Line ADDRFEAT, dominio público) de los condados de nuestras ciudades en geo_streets, para
# ubicar una dirección sin servicios de terceros (lib/direcciones.ts). Lo corre deploy.sh aparte (no detiene el
# despliegue) y la prueba de CI «Direcciones». Idempotente: si la última carga tiene menos de 90 días, no hace nada.
# Uso: bash infra/direcciones/generar.sh <carpeta de datos> <comando compose…>   (como packages/db/migrar.sh)
set -euo pipefail
DIR="${1:?carpeta de datos}"; shift
COMPOSE=("$@")
psql() { "${COMPOSE[@]}" exec -T db psql -h 127.0.0.1 -v ON_ERROR_STOP=1 -U tolatino -d tolatino -qAt "$@"; }
ANIO="${TIGER_ANIO:-2024}"
# Hazleton: Luzerne, Schuylkill, Carbon · Wilkes-Barre: Luzerne · Scranton: Lackawanna · Allentown: Lehigh, Northampton ·
# Reading: Berks. Una ciudad nueva agrega aquí sus condados.
CONDADOS=(42079 42107 42025 42069 42077 42095 42011)
# GDAL fijado por versión (código abierto) para leer los shapefiles del Censo.
GDAL="${GDAL_IMAGEN:-ghcr.io/osgeo/gdal:alpine-small-3.9.2}"

if [ "${FORZAR:-0}" != 1 ] && [ "$(psql -c "select count(*) from geo_loads where source = 'tiger-$ANIO' and at > now() - interval '90 days'")" != "0" ]; then
  echo "[direcciones] al día"; exit 0
fi
mkdir -p "$DIR"
bajar() { [ -s "$2" ] && return 0; curl -fsSL --retry 3 --connect-timeout 30 -o "$2.tmp" "$1" && mv "$2.tmp" "$2"; }
psql -c "drop table if exists geo_streets_carga; create unlogged table geo_streets_carga (name text, l_from text, l_to text, r_from text, r_to text, zip_l text, zip_r text, wkt text, county text);"
for c in "${CONDADOS[@]}"; do
  z="tl_${ANIO}_${c}_addrfeat.zip"
  echo "[direcciones] condado $c"
  bajar "https://www2.census.gov/geo/tiger/TIGER${ANIO}/ADDRFEAT/$z" "$DIR/$z"
  rm -f "$DIR/$c.csv"
  docker run --rm -v "$DIR":/d "$GDAL" ogr2ogr -f CSV "/d/$c.csv" "/vsizip//d/$z" -t_srs EPSG:4326 -explodecollections \
    -select FULLNAME,LFROMHN,LTOHN,RFROMHN,RTOHN,ZIPL,ZIPR -lco GEOMETRY=AS_WKT -lco GEOMETRY_NAME=wkt
  # Columnas: wkt, FULLNAME, LFROMHN, LTOHN, RFROMHN, RTOHN, ZIPL, ZIPR → al orden de la tabla de carga, con el condado.
  python3 -c "
import csv,sys
r=csv.DictReader(open('$DIR/$c.csv',newline=''));w=csv.writer(sys.stdout)
for x in r:
  if x.get('FULLNAME'): w.writerow([x['FULLNAME'],x['LFROMHN'],x['LTOHN'],x['RFROMHN'],x['RTOHN'],x['ZIPL'],x['ZIPR'],x['wkt'],'$c'])
" | psql -c "\copy geo_streets_carga from stdin with (format csv)"
done
# Solo números enteros (el Censo trae algunos como «12A» o «N123»: esos tramos se quedan sin ese lado).
psql <<SQL
begin;
create table geo_streets_nueva (like geo_streets including all);
insert into geo_streets_nueva (name, norm, l_from, l_to, r_from, r_to, zip_l, zip_r, county, geom)
select name, dir_abrev(name),
       case when l_from ~ '^\d{1,7}$' and l_to ~ '^\d{1,7}$' then l_from::int end, case when l_from ~ '^\d{1,7}$' and l_to ~ '^\d{1,7}$' then l_to::int end,
       case when r_from ~ '^\d{1,7}$' and r_to ~ '^\d{1,7}$' then r_from::int end, case when r_from ~ '^\d{1,7}$' and r_to ~ '^\d{1,7}$' then r_to::int end,
       nullif(zip_l, ''), nullif(zip_r, ''), county, st_setsrid(st_geomfromtext(wkt), 4326)
  from geo_streets_carga where wkt like 'LINESTRING%';
alter table geo_streets rename to geo_streets_vieja;
alter table geo_streets_nueva rename to geo_streets;
drop table geo_streets_vieja;
drop table geo_streets_carga;
insert into geo_loads (source, counties, rows) select 'tiger-$ANIO', '{$(IFS=,; echo "${CONDADOS[*]}")}', count(*) from geo_streets;
commit;
analyze geo_streets;
SQL
echo "[direcciones] tramos cargados: $(psql -c 'select count(*) from geo_streets')"
