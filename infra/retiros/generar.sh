#!/bin/bash
# Retiros del fabricante (recalls) con los datos PÚBLICOS de NHTSA (9m, L524): el archivo plano de retiros (FLAT_RCL, dominio público, sin llave y
# sin pagar) se baja una vez al mes y se carga en vehicle_recalls por marca, modelo y año. La página nunca llama a NHTSA: cruza con nuestra base.
# Idempotente y reanudable: si la última carga tiene menos de 30 días, no hace nada (FORZAR=1 la rehace); la carga reemplaza todo en una transacción.
# Uso: bash infra/retiros/generar.sh <carpeta de datos> <comando compose…>   (como packages/db/migrar.sh)
#   RETIROS_URL=…   el archivo (por omisión el de NHTSA; una copia propia o file:///… en las pruebas)
# Tamaño: el .zip ≈ 30 MB, ≈ 300 mil filas (≈ 120 MB en la base con su índice). Tarda unos minutos.
set -euo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"
DIR="${1:?carpeta de datos}"; shift
COMPOSE=("$@")
psql() { "${COMPOSE[@]}" exec -T db psql -h 127.0.0.1 -v ON_ERROR_STOP=1 -U tolatino -d tolatino -qAt "$@"; }
URL="${RETIROS_URL:-https://static.nhtsa.gov/odi/ffdd/rcl/FLAT_RCL.zip}"
mkdir -p "$DIR"
if [ "${FORZAR:-0}" != 1 ] && [ "$(psql -c "select count(*) from geo_loads where kind = 'retiros' and status = 'ok' and at > now() - interval '30 days'")" != 0 ]; then
  echo "[retiros] al día"; exit 0
fi
t0=$SECONDS
rm -f "$DIR/rcl.zip.tmp"
curl -fsSL --retry 3 --connect-timeout 30 -o "$DIR/rcl.zip.tmp" "$URL" && mv "$DIR/rcl.zip.tmp" "$DIR/rcl.zip"
psql -c "drop table if exists retiros_carga; create unlogged table retiros_carga (campaign text, make text, model text, year int, component text, summary text, consequence text, remedy text, report_date date, dnd boolean);"
python3 -I "$AQUI/rcl_csv.py" "$DIR/rcl.zip" | psql -c "\copy retiros_carga from stdin with (format csv)"
n=$(psql <<'SQL'
begin;
delete from vehicle_recalls where source = 'nhtsa';
insert into vehicle_recalls (campaign, make, model, year, component, summary, consequence, remedy, report_date, do_not_drive, source)
select distinct on (campaign, make, model, year) campaign, make, model, year::smallint, left(component, 200), left(summary, 4000), left(consequence, 4000), left(remedy, 4000), report_date, coalesce(dnd, false), 'nhtsa'
  from retiros_carga where campaign ~ '^[0-9A-Z]{6,14}$' and make <> '' and model <> '' and year between 1949 and 2100
 order by campaign, make, model, year, report_date desc nulls last;
drop table retiros_carga;
commit;
select count(*) from vehicle_recalls where source = 'nhtsa';
SQL
)
psql -c "insert into geo_loads (source, counties, rows, state, kind, status, seconds) values ('nhtsa:flat_rcl', '{}', $n, 'US', 'retiros', 'ok', $((SECONDS - t0)))"
rm -f "$DIR/rcl.zip"
echo "[retiros] $n retiros cargados"
