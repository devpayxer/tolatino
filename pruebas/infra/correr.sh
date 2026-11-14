#!/bin/bash
# 9o · Todas las pruebas de la producción como código que corren SIN servidor (el ensayo de verdad es scripts/produccion/ensayo.sh, en máquinas):
#   1. bash -n y shellcheck (si está) de cada script de infra/ y scripts/produccion/
#   2. los compose y las configuraciones YAML: se leen, cada servicio tiene imagen, cada variable ${X} está en la lista cerrada (secretos.json), cada red y
#      volumen nombrado existe (pruebas/infra/compose.py); en el CI, además, «docker compose config» de verdad
#   3. la página de mantenimiento es la que sale del sistema de diseño
#   4. azul/verde y vuelta atrás (azulverde.test.sh), sobre sellado y recuperación (sellado.test.sh)
#   5. con root: la traza del sandbox igual a la de antes (traza-sandbox.sh), tolatino-sync de producción solo avanza (sync.test.sh); con Postgres 16 +
#      pgBackRest: el PITR de verdad (pitr-local.sh)
# Uso: bash pruebas/infra/correr.sh   → sale con 1 si algo falla. INFRA_SIN_ROOT=1 salta lo que necesita root.
set -uo pipefail
RAIZ=$(cd "$(dirname "$0")/../.." && pwd); cd "$RAIZ" || exit 1
mal=0
seccion() { echo; echo "▸ $*"; }
seccion "sintaxis y shellcheck"
SCRIPTS=$(ls infra/comun/*.sh infra/comun/respaldos/*.sh infra/produccion/deploy.sh infra/produccion/tolatino-sync infra/pruebas/deploy.sh infra/pruebas/tolatino-sync \
  infra/ensayo/*.sh scripts/produccion/*.sh packages/db/migrar.sh pruebas/infra/*.sh 2>/dev/null)
for f in $SCRIPTS; do bash -n "$f" || { echo "  ✗ $f no es bash válido"; mal=1; }; done
echo "  ✓ bash -n: $(echo "$SCRIPTS" | wc -w) scripts"
if command -v shellcheck >/dev/null; then
  # Avisos y errores (no estilo). SC1090/SC1091: los «source» de rutas del servidor; SC2034: variables que usa quien carga el archivo.
  if shellcheck -x -S warning -e SC1090,SC1091,SC2034 $SCRIPTS; then echo "  ✓ shellcheck sin avisos"; else echo "  ✗ shellcheck"; mal=1; fi
else echo "  · shellcheck no está (en el CI sí)"; fi
seccion "compose y YAML"
python3 pruebas/infra/compose.py || mal=1
if command -v docker >/dev/null && docker compose version >/dev/null 2>&1; then
  for f in infra/produccion/compose-app.yml infra/produccion/compose-app-fijos.yml infra/produccion/compose-base.yml infra/produccion/compose-replica.yml infra/ensayo/compose-almacen.yml; do
    TOLATINO_IMAGEN=x TOLATINO_PUERTO=3001 RED_YO=10.40.0.3 POSTGRES_PASSWORD=x docker compose -f "$f" config -q >/dev/null 2>&1 && echo "  ✓ docker compose config $f" || { echo "  ✗ docker compose config $f"; mal=1; }
  done
else echo "  · docker compose no está aquí (en el CI sí: «docker compose config»)"; fi
seccion "página de mantenimiento"
node scripts/produccion/mantenimiento.mjs --revisar || mal=1
seccion "azul/verde"; bash pruebas/infra/azulverde.test.sh || mal=1
seccion "sobre sellado y recuperación"; bash pruebas/infra/sellado.test.sh || mal=1
if [ "$(id -u)" = 0 ] && [ "${INFRA_SIN_ROOT:-0}" != 1 ]; then
  seccion "el sandbox no cambia (traza)"; bash pruebas/infra/traza-sandbox.sh || mal=1
  seccion "producción solo avanza (tolatino-sync)"; bash pruebas/infra/sync.test.sh || mal=1
  if command -v pgbackrest >/dev/null && [ -x /usr/lib/postgresql/16/bin/initdb ]; then seccion "PITR de verdad"; bash pruebas/infra/pitr-local.sh || mal=1
  else echo; echo "· PITR: falta pgbackrest o Postgres 16 (no corrió)"; fi
fi
echo
[ "$mal" = 0 ] && echo "✓ infra: todo en verde" || echo "✗ infra: hay fallos"
exit "$mal"
