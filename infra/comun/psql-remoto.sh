#!/bin/bash
# 9o · psql contra la base de OTRA máquina (producción: la app le habla a la base por la red privada). Imita lo que migrar.sh espera de
# «docker compose … exec -T db psql -h 127.0.0.1 …», así migrar.sh y registro.sh son los mismos en los dos entornos:
#   bash packages/db/migrar.sh bash infra/comun/psql-remoto.sh
# Se saltan «exec -T db» y se cambia -h por DB_HOST. La contraseña llega por PGPASSWORD (del entorno del servidor), nunca en la línea de comandos.
# TOLATINO_PSQL (solo pruebas de la infra) reemplaza el cliente.
set -euo pipefail
[ "${1:-}" = exec ] && shift 3   # exec -T db
[ "${1:-}" = psql ] && shift
args=()
while [ $# -gt 0 ]; do
  case "$1" in
    -h) args+=(-h "${DB_HOST:?falta DB_HOST}"); shift 2 ;;
    *) args+=("$1"); shift ;;
  esac
done
if [ -n "${TOLATINO_PSQL:-}" ]; then exec $TOLATINO_PSQL "${args[@]}"; fi
exec docker run --rm -i --network host -e PGPASSWORD -e PGCONNECT_TIMEOUT=10 postgres:16.6-alpine psql "${args[@]}"
