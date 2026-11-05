#!/bin/bash
# Despliegue del sandbox. Lo ejecuta tolatino-sync (root) en /opt/tolatino cada vez que la rama `pruebas` cambia.
# Idempotente: se puede correr mil veces. Nunca pide nada a nadie.
set -euo pipefail
cd "$(dirname "$0")/../.."
REPO=$(pwd)
COMMIT=$(git rev-parse --short HEAD)
ENV_FILE=/etc/tolatino/pruebas.env
log() { echo "$(date -Is) [deploy] $*"; }

# 1) El script de sincronización con candado (corrige el choque del primer arranque).
install -m 0755 "$REPO/infra/pruebas/tolatino-sync" /usr/local/bin/tolatino-sync

# 2) Secretos del sandbox: se generan una sola vez en el servidor, nunca viven en el repo.
mkdir -p /etc/tolatino
if [ ! -f "$ENV_FILE" ]; then
  log "creando $ENV_FILE"
  umask 077
  cat > "$ENV_FILE" <<EOF
POSTGRES_PASSWORD=$(openssl rand -hex 24)
MINIO_ROOT_USER=tolatino
MINIO_ROOT_PASSWORD=$(openssl rand -hex 24)
EOF
fi
chmod 600 "$ENV_FILE"

# 3) Contenedores: app (se reconstruye con el commit nuevo), Postgres + PostGIS, MinIO.
export TOLATINO_COMMIT="$COMMIT"
log "docker compose up (commit $COMMIT)"
docker compose --env-file "$ENV_FILE" -f "$REPO/infra/pruebas/docker-compose.yml" up -d --build --remove-orphans
docker image prune -f >/dev/null 2>&1 || true

# 3b) Base de datos: migraciones pendientes, en orden, una sola vez cada una.
for i in $(seq 1 30); do
  docker compose --env-file "$ENV_FILE" -f "$REPO/infra/pruebas/docker-compose.yml" exec -T db pg_isready -h 127.0.0.1 -U tolatino -d tolatino >/dev/null 2>&1 && break
  sleep 2
done
bash "$REPO/packages/db/migrar.sh" docker compose --env-file "$ENV_FILE" -f "$REPO/infra/pruebas/docker-compose.yml"

# 4) nginx: la app en /, la página de estado del servidor en /estado.
install -m 0644 "$REPO/infra/pruebas/nginx-pruebas.conf" /etc/nginx/sites-available/tolatino-pruebas
ln -sf /etc/nginx/sites-available/tolatino-pruebas /etc/nginx/sites-enabled/tolatino-pruebas
rm -f /etc/nginx/sites-enabled/estado /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 5) Comprobación real: la app responde y ve la base con PostGIS.
for i in $(seq 1 30); do
  if curl -fsS -m 5 http://127.0.0.1:3000/api/salud >/tmp/salud.json 2>/dev/null; then
    log "salud: $(cat /tmp/salud.json)"
    exit 0
  fi
  sleep 3
done
log "la app no respondió en /api/salud a tiempo"
docker compose --env-file "$ENV_FILE" -f "$REPO/infra/pruebas/docker-compose.yml" logs --tail=40 web || true
exit 1
