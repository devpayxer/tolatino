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
# Secretos que se agregaron después: se completan sin tocar los que ya existen.
grep -q '^AUTH_SECRET=' "$ENV_FILE" || echo "AUTH_SECRET=$(openssl rand -hex 32)" >> "$ENV_FILE"
# Llave del cifrado de columna (op_private, 4j): se crea una vez en el servidor; perderla vuelve ilegibles las notas vivas.
grep -q '^DATOS_SECRET=' "$ENV_FILE" || echo "DATOS_SECRET=$(openssl rand -hex 32)" >> "$ENV_FILE"
# Barrido central (0078): el token que comparten la app y el servicio «barrido»; nunca sale del servidor.
grep -q '^BARRIDO_TOKEN=' "$ENV_FILE" || echo "BARRIDO_TOKEN=$(openssl rand -hex 32)" >> "$ENV_FILE"
chmod 600 "$ENV_FILE"

# 2b) Fotos: Garage (S3 propio). Antes que el resto: su configuración (con secretos) tiene que existir antes de montar
#     el contenedor. La primera vez crea el bucket y la llave de la app (a $ENV_FILE), que el paso 3 le pasa a la app.
ENV_FILE="$ENV_FILE" GARAGE_TOML=/etc/tolatino/garage.toml bash "$REPO/infra/pruebas/medios.sh" docker compose --env-file "$ENV_FILE" -f "$REPO/infra/pruebas/docker-compose.yml" \
  || log "medios: falló la preparación (las fotos no se pueden subir)"

# 3) Contenedores: app (se reconstruye con el commit nuevo), Postgres + PostGIS y Garage (fotos).
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

# 3c) Semilla del SANDBOX (decisión I: datos de ejemplo solo en pruebas). Se vuelve a aplicar si cambia.
SEMILLA_DIR="$REPO/infra/pruebas/semilla" bash "$REPO/packages/db/migrar.sh" --semilla-pruebas docker compose --env-file "$ENV_FILE" -f "$REPO/infra/pruebas/docker-compose.yml"

# 3d) Mapa: teselas propias de Pensilvania. Generarlas tarda minutos: si faltan, se hacen aparte (systemd-run) y al
#     terminar se enciende el servidor de teselas. El despliegue de la app nunca espera por el mapa.
MAPA=/var/lib/tolatino/mapa
COMPOSE_MAPA=(docker compose --env-file "$ENV_FILE" -f "$REPO/infra/pruebas/docker-compose.yml" --profile mapa)
if [ -f "$MAPA/pennsylvania.mbtiles" ]; then
  "${COMPOSE_MAPA[@]}" up -d mapa
elif ! systemctl is-active --quiet tolatino-mapa; then
  log "teselas: no existen todavía, se generan aparte"
  systemd-run --unit tolatino-mapa --collect bash -c "bash '$REPO/infra/mapa/generar.sh' '$MAPA' && ${COMPOSE_MAPA[*]} up -d mapa" || true
fi

# 3f) Moderación de imágenes propia (5d): se construye y se enciende aparte (perfil «moderacion»). Si falla, la app sigue
#     arriba y las fotos nuevas de la Comunidad esperan revisión manual; nunca se publican sin revisar.
COMPOSE_MOD=(docker compose --env-file "$ENV_FILE" -f "$REPO/infra/pruebas/docker-compose.yml" --profile moderacion)
if ! systemctl is-active --quiet tolatino-moderacion; then
  systemd-run --unit tolatino-moderacion --collect ${COMPOSE_MOD[*]} up -d --build moderacion-img || true
fi

# 3e) Direcciones propias: tramos de calle del Censo (TIGER) para ubicar direcciones de entrega. Aparte y sin esperar;
#     el script mismo no hace nada si la carga tiene menos de 90 días.
if ! systemctl is-active --quiet tolatino-direcciones; then
  systemd-run --unit tolatino-direcciones --collect bash "$REPO/infra/direcciones/generar.sh" /var/lib/tolatino/direcciones \
    docker compose --env-file "$ENV_FILE" -f "$REPO/infra/pruebas/docker-compose.yml" || true
fi

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
