#!/bin/bash
# 9a · La base local de las pruebas (PostGIS 16-3.5, America/New_York como el sandbox) y Garage (fotos), en contenedores sueltos.
# Si no existen se crean con secretos al azar (la contraseña de la base, la de Garage y su llave), que se anotan en
# $PRUEBAS_SECRETOS (por defecto $PRUEBAS_SALIDA/secretos.env, FUERA del repo). Si ya existen, solo se encienden.
# Después aplica las migraciones y la semilla de pruebas (solo esta base local; nunca producción):
#   bash pruebas/servir/base.sh             contenedores + migraciones + semilla
#   bash pruebas/servir/base.sh --sin-datos contenedores solamente
# Una base NUEVA al lado: PRUEBAS_SALIDA=… PRUEBAS_DB_CONT=otra-db PRUEBAS_DB_PUERTO=5433 PRUEBAS_MEDIOS_CONT=otro-medios PRUEBAS_S3_PUERTO=3910 PRUEBAS_WEB_PUERTO=3912.
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
SALIDA="${PRUEBAS_SALIDA:-${TMPDIR:-/tmp}/tolatino-pruebas}"
SEC="${PRUEBAS_SECRETOS:-$SALIDA/secretos.env}"
DB_CONT="${PRUEBAS_DB_CONT:-tlprueba-db-1}"; MEDIOS_CONT="${PRUEBAS_MEDIOS_CONT:-tlprueba-medios-1}"
PUERTO="${PRUEBAS_DB_PUERTO:-5432}"; S3="${PRUEBAS_S3_PUERTO:-3900}"; WEB="${PRUEBAS_WEB_PUERTO:-3902}"
mkdir -p "$SALIDA"; umask 077; touch "$SEC"; chmod 600 "$SEC"
existe() { docker ps -a --format '{{.Names}}' | grep -qx "$1"; }

# ── La base ──
if existe "$DB_CONT"; then
  docker start "$DB_CONT" >/dev/null
else
  CLAVE=$(openssl rand -hex 24)
  docker run -d --name "$DB_CONT" -e POSTGRES_DB=tolatino -e POSTGRES_USER=tolatino -e POSTGRES_PASSWORD="$CLAVE" -e TZ=America/New_York \
    -p "127.0.0.1:$PUERTO:5432" -v "${DB_CONT}-data:/var/lib/postgresql/data" postgis/postgis:16-3.5 >/dev/null
  sed -i '/^DATABASE_URL=/d' "$SEC"; echo "DATABASE_URL=postgres://tolatino:$CLAVE@127.0.0.1:$PUERTO/tolatino" >> "$SEC"
  echo "[base] $DB_CONT creada (DATABASE_URL en $SEC)"
fi
for i in $(seq 1 60); do docker exec "$DB_CONT" pg_isready -h 127.0.0.1 -U tolatino -d tolatino >/dev/null 2>&1 && break; sleep 1; done
grep -q '^DATABASE_URL=' "$SEC" || echo "⚠ $DB_CONT ya existía y $SEC no tiene la URL de la base: agrégala a mano (la contraseña es la de ese contenedor)" >&2

# ── Garage (fotos): configuración con secretos al azar en la salida, bucket «medios» y la llave de la app ──
if existe "$MEDIOS_CONT"; then
  docker start "$MEDIOS_CONT" >/dev/null
else
  TOML="$SALIDA/garage.toml"; mkdir -p "$SALIDA/garage"
  cat > "$TOML" <<CONF
metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"
db_engine = "sqlite"
replication_factor = 1
rpc_bind_addr = "0.0.0.0:3901"
rpc_public_addr = "127.0.0.1:3901"
rpc_secret = "$(openssl rand -hex 32)"
[s3_api]
s3_region = "garage"
api_bind_addr = "0.0.0.0:3900"
root_domain = ".s3.garage"
[s3_web]
bind_addr = "0.0.0.0:3902"
root_domain = ".web.garage"
index = "index.html"
[admin]
api_bind_addr = "0.0.0.0:3903"
admin_token = "$(openssl rand -hex 32)"
CONF
  chmod 644 "$TOML"
  docker run -d --name "$MEDIOS_CONT" -p "127.0.0.1:$S3:3900" -p "127.0.0.1:$WEB:3902" -v "$TOML:/etc/garage.toml:ro" -v "$SALIDA/garage:/var/lib/garage" dxflrs/garage:v2.1.0 /garage server >/dev/null
  G() { docker exec "$MEDIOS_CONT" /garage "$@"; }
  for i in $(seq 1 30); do G status >/dev/null 2>&1 && break; sleep 1; done
  NODO=$(G status 2>/dev/null | awk '/^[0-9a-f]{16}/ {print $1; exit}')
  G layout assign -z dc1 -c 5G "$NODO" >/dev/null; G layout apply --version 1 >/dev/null
  G bucket create medios >/dev/null; G bucket website --allow medios >/dev/null
  sed -i '/^MEDIOS_KEY_ID=/d;/^MEDIOS_SECRET=/d' "$SEC"
  echo "[base] $MEDIOS_CONT creado (la llave de la app la crea servir.sh)"
fi

[ "${1:-}" = "--sin-datos" ] && exit 0
# ── Migraciones y semilla de pruebas (migrar.sh: cada una una sola vez; la semilla solo si cambió) ──
bash "$RAIZ/packages/db/migrar.sh" "$RAIZ/pruebas/fakecompose.sh" x
SEMILLA_DIR="$RAIZ/infra/pruebas/semilla" bash "$RAIZ/packages/db/migrar.sh" --semilla-pruebas "$RAIZ/pruebas/fakecompose.sh" x
