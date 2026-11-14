#!/bin/bash
# 9m · La tubería de direcciones de punta a punta SIN red (decisión AC): una copia del Censo y de OpenAddresses en su formato (direcciones-espejo.py) →
# infra/direcciones/generar.sh carga Pensilvania entero (de la copia) y la muestra de CA, TX y NY en paralelo → lo cargado por estado y fuente en
# geo_loads → otra corrida no baja nada (al día) → se borra la marca de un estado y la siguiente corrida rehace SOLO eso (reanudable) → autocompletar
# con «123 N Wyo» en Hazleton y direcciones de California, Texas y Nueva York, la casa de OpenAddresses, «Usar mi ubicación» y la velocidad.
# Con los datos de verdad corre en el CI «Direcciones» (red al Censo) y en el servidor (deploy.sh).
# Uso: bash pruebas/infra/direcciones.test.sh <comando compose…>   (p. ej. «bash pruebas/fakecompose.sh x» o «docker compose -f … »). Necesita ogr2ogr.
set -uo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd)
[ $# -gt 0 ] || { echo "uso: bash pruebas/infra/direcciones.test.sh <comando compose…>"; exit 2; }
COMPOSE=("$@")
command -v ogr2ogr >/dev/null || { echo "✗ falta ogr2ogr (gdal-bin)"; exit 1; }
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
q() { "${COMPOSE[@]}" exec -T db psql -h 127.0.0.1 -U tolatino -d tolatino -qAt -c "$1" < /dev/null; }
bien=0; total=0
ok() { total=$((total + 1)); if eval "$2"; then bien=$((bien + 1)); echo "  ✓ $1"; else echo "  ✗ $1"; fi; }

python3 -I "$RAIZ/pruebas/infra/direcciones-espejo.py" "$T" >/dev/null
echo "PA file://$T/no-existe.geojson.gz" > "$T/fuentes.txt"   # una fuente que no se puede bajar no frena la carga
echo "PA file://$T/pa-statewide.geojson.gz" >> "$T/fuentes.txt"
correr() { ESTADOS=PA CONDADOS_MUESTRA="06075 48453 36061" DIRECCIONES_ESPEJO="file://$T/tiger" FUENTES_OA="$T/fuentes.txt" PARALELO=4 \
  bash "$RAIZ/infra/direcciones/generar.sh" "$T/datos" "${COMPOSE[@]}" > "$T/log" 2>&1; }
# Lo que dejó una corrida anterior de esta prueba (solo estos estados, solo la carga; lo de otras pruebas, source «prueba», no se toca).
q "delete from geo_loads where state in ('PA','CA','TX','NY','US'); delete from geo_points where state in ('PA','CA','TX','NY') and source <> 'prueba'; delete from geo_names where state in ('PA','CA','TX','NY') and source = 'carga'; delete from geo_zips where zip in ('18201','94102','94103','78701','10118','10001')" >/dev/null

echo "carga:"
t0=$SECONDS; correr; r=$?; dt=$((SECONDS - t0))
ok "la carga termina sin error ($dt s): PA + muestra de CA, TX, NY, 4 a la vez" '[ $r = 0 ] || { tail -20 "$T/log"; false; }'
ok "tramos por estado (PA de la copia entera; CA, TX y NY solo sus condados de muestra)" '[ "$(q "select string_agg(state || '"'"'='"'"'|| n, '"'"' '"'"' order by state) from (select state, count(*) n from geo_streets where state in ('"'"'PA'"'"','"'"'CA'"'"','"'"'TX'"'"','"'"'NY'"'"') group by 1) x")" = "CA=9 NY=9 PA=46 TX=14" ]'
ok "cada tramo con su lugar del Censo (PLACE)" '[ "$(q "select count(*) from geo_streets where state in ('"'"'PA'"'"','"'"'CA'"'"','"'"'TX'"'"','"'"'NY'"'"') and county <> '"'"'prueba'"'"' and place is null")" = 0 ]'
ok "los puntos de OpenAddresses de PA (la fuente caída se salta; la línea rota también)" '[ "$(q "select count(*) from geo_points where state = '"'"'PA'"'"' and source = '"'"'oa:pa-statewide'"'"'")" = 30 ] && grep -q "no se pudo bajar" "$T/log"'
ok "nombres de calle por estado (lo que se autocompleta)" '[ "$(q "select count(distinct state) from geo_names where state in ('"'"'PA'"'"','"'"'CA'"'"','"'"'TX'"'"','"'"'NY'"'"') and source = '"'"'carga'"'"'")" = 4 ]'
ok "códigos postales del ZCTA con su estado y su lugar" '[ "$(q "select state || '"'"' '"'"' || place from geo_zips where zip = '"'"'78701'"'"'")" = "TX Austin" ]'
ok "geo_loads: cada estado y cada fuente anotados (la muestra dice qué condados)" '[ "$(q "select count(*) from geo_loads where state in ('"'"'PA'"'"','"'"'CA'"'"','"'"'TX'"'"','"'"'NY'"'"') and status = '"'"'ok'"'"'")" = 16 ] && [ "$(q "select detail from geo_loads where state = '"'"'TX'"'"' and kind = '"'"'tramos'"'"'")" = "muestra: 48453" ]'
ok "los .csv de cada condado se borran al cargar (en la carpeta solo quedan los .zip de caché)" '[ -z "$(ls "$T/datos" | grep -v "\.zip$")" ]'

echo "otra vez (al día):"
n0=$(q "select count(*) from geo_streets"); correr
ok "no baja ni carga nada (todo hace menos de 90 días)" '! grep -qE "\] (lugares \(|puntos \()" "$T/log" && ! grep -qE "\] tramos:" "$T/log" && [ "$(q "select count(*) from geo_streets")" = "$n0" ]'

echo "reanudable:"
q "delete from geo_loads where state = 'TX' and kind = 'tramos'" >/dev/null; correr
ok "solo rehace lo que faltaba (los tramos de TX), el resto sigue al día" 'grep -q "\[direcciones TX\] tramos: 14" "$T/log" && ! grep -q "\[direcciones PA\] tramos:" "$T/log" && ! grep -q "\[direcciones CA\] tramos:" "$T/log"'

echo "autocompletar e inversa:"
s() { q "select linea || ' · ' || sub || ' · ' || calidad from dir_sugerir('$1', 40.9584, -75.9746, 'PA') limit 1"; }
ok "«123 N Wyo» en Hazleton → 123 N Wyoming St, Hazleton, PA 18201" '[ "$(s "123 N Wyo")" = "123 N Wyoming St · Hazleton, PA 18201 · numero" ]'
ok "la casa de OpenAddresses gana al rango (113 N Wyoming St: punto)" '[ "$(s "113 n wyoming")" = "113 N Wyoming St · Hazleton, PA 18201 · punto" ]'
ok "California: «1 Dr Carlton B Goodlett» → San Francisco, CA 94102" '[ "$(s "1 Dr Carlton B Goodlett")" = "1 Dr Carlton B Goodlett Pl · San Francisco, CA 94102 · numero" ]'
ok "Texas sin coma: «1100 Congress Ave Austin TX» → Austin, TX 78701" '[ "$(s "1100 Congress Ave Austin TX")" = "1100 Congress Ave · Austin, TX 78701 · numero" ]'
ok "Nueva York con estado: «350 5th Ave, New York, NY» → New York, NY 10118" '[ "$(s "350 5th Ave, New York, NY")" = "350 5th Ave · New York, NY 10118 · numero" ]'
ok "mal escrita: «412 N Wyomng St» → 412 N Wyoming St" '[ "$(s "412 N Wyomng St" | cut -d" " -f1-4)" = "412 N Wyoming St" ]'
ok "«Usar mi ubicación» junto a la casa 113 → 113 N Wyoming St (punto)" '[ "$(q "select calle || '"'"' '"'"' || calidad from dir_inversa(40.95988, -75.97485)")" = "113 N Wyoming St punto" ]'
ok "«Usar mi ubicación» entre casas → el número del lado donde está (par a la derecha)" '[ "$(q "select (numero::int % 2) || '"'"' '"'"' || calidad from dir_inversa(40.9604, -75.97455)")" = "0 numero" ]'
r=$(q "select b.n || '|' || round(extract(epoch from clock_timestamp() - a.t) * 1000 / 50) from (select clock_timestamp() t) a, lateral (select count(*) n from generate_series(1, 50) g, lateral dir_sugerir((g * 2 + 101) || ' N Wyo', 40.9584, -75.9746, 'PA') x) b")
ms=${r#*|}
ok "velocidad: 50 sugerencias con resultado (${r%%|*}), $ms ms cada una (presupuesto 100 ms; la escala nacional se mide en scripts/carga/direcciones-1m.mjs)" '[ "${r%%|*}" -ge 50 ] && [ "${ms:-999}" -le 100 ]'

echo "$bien/$total casos"
[ "$bien" = "$total" ]
