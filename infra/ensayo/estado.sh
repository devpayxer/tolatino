#!/bin/bash
# 9o · SOLO EL ENSAYO: lo que el guion (scripts/produccion/ensayo.sh) mira desde fuera, cada minuto, en /estado/despliegues.txt de la app: los últimos
# despliegues, restauraciones, respaldos, incidentes y llaves del servidor (solo cifras y nombres de casos; nada de personas, y el ensayo no tiene datos
# reales). En producción no existe (deploy.sh solo lo programa con TOLATINO_ENTORNO=ensayo; guardián mismoPaquete).
set -uo pipefail
. /etc/tolatino/rol.conf
[ "$TOLATINO_ENTORNO" = ensayo ] || exit 0
E=/etc/tolatino/ensayo.env
PGPASSWORD=$(grep -m1 '^POSTGRES_PASSWORD=' "$E" | cut -d= -f2- | sed -e "s/^'//" -e "s/'$//"); export PGPASSWORD
DB_HOST=$(grep -m1 '^DB_HOST=' "$E" | cut -d= -f2-); export DB_HOST
Q() { bash /opt/tolatino/infra/comun/psql-remoto.sh exec -T db psql -h x -U tolatino -d tolatino -qAt -c "$1" 2>/dev/null; }
{ Q "select id, result, left(commit_sha, 12), coalesce(rollback_s, -1), coalesce(reason, '-'), array_to_string(migrations_applied, ' ') from deploy_releases order by id desc limit 15"
  Q "select 'restauracion', id, result, rto_s, point_at, checks from restore_drills order by id desc limit 5"
  Q "select 'respaldo', kind, result, finished_at, coalesce(detail, '-') from backup_runs order by id desc limit 12"
  Q "select 'incidente', kind, severity, ended_at is null, seen from incident_log order by id desc limit 10"
  Q "select 'llave', key_name, machine, fingerprint, retired_at is null from server_keys order by id desc limit 10"
} > /var/www/estado/despliegues.txt.tmp && mv /var/www/estado/despliegues.txt.tmp /var/www/estado/despliegues.txt
