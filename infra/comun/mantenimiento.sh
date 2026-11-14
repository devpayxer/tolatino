#!/bin/bash
# 9o · La ventana de mantenimiento en el servidor web (LAUNCH «la página de mantenimiento la sirve nginx durante la ventana»). Cada minuto (temporizador
# de la máquina de la app) mira en la base si hay un mantenimiento programado en curso (maintenance_windows, sin cancelar) y deja o quita
# /var/lib/tolatino/mantenimiento/activo: nginx-produccion.conf muestra la página de mantenimiento a las páginas de los vecinos mientras exista (el Super
# Admin, la entrada y las rutas de la API siguen). Si la base no contesta, NO se toca el aviso (ni se prende ni se apaga por un corte de un minuto).
# Uso: mantenimiento.sh            (lo que diga la base)
#      mantenimiento.sh on|off     (a mano desde un despliegue que necesita la ventana; «off» al terminar)
set -uo pipefail
REPO=$(cd "$(dirname "$0")/../.." && pwd)
F=/var/lib/tolatino/mantenimiento/activo
mkdir -p "$(dirname "$F")"
case "${1:-}" in
  on) date -Is > "$F"; exit 0 ;;
  off) rm -f "$F"; exit 0 ;;
esac
# shellcheck source=/dev/null
. /etc/tolatino/rol.conf
ENV_FILE=/etc/tolatino/${TOLATINO_ENTORNO}.env
PGPASSWORD=$(grep -m1 '^POSTGRES_PASSWORD=' "$ENV_FILE" | cut -d= -f2- | sed -e "s/^'//" -e "s/'$//"); export PGPASSWORD
DB_HOST=$(grep -m1 '^DB_HOST=' "$ENV_FILE" | cut -d= -f2-); export DB_HOST
r=$(bash "$REPO/infra/comun/psql-remoto.sh" exec -T db psql -h x -U tolatino -d tolatino -qAt \
    -c "select exists (select 1 from maintenance_windows where cancelled_at is null and now() between from_at and to_at)" 2>/dev/null) || exit 0
case "$r" in
  t) [ -f "$F" ] || date -Is > "$F" ;;
  f) rm -f "$F" ;;
esac
