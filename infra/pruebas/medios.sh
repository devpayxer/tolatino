#!/bin/bash
# Almacenamiento de fotos del sandbox: Garage (S3 propio, autoalojado). Idempotente: se puede correr mil veces.
#  1. Configuración con secretos generados aquí (nunca en el repo): /etc/tolatino/garage.toml.
#  2. Enciende el contenedor «medios», asigna la capacidad del nodo, crea el bucket «medios» (público como sitio web,
#     lo sirve nginx en /medios/) y la llave de la app; la llave va a $ENV_FILE (MEDIOS_KEY_ID / MEDIOS_SECRET).
# Uso: ENV_FILE=/etc/tolatino/pruebas.env GARAGE_TOML=/etc/tolatino/garage.toml bash medios.sh docker compose --env-file … -f …
set -euo pipefail
ENV_FILE="${ENV_FILE:?}"; TOML="${GARAGE_TOML:?}"
COMPOSE=("$@")
if [ ! -s "$TOML" ]; then
  umask 077; mkdir -p "$(dirname "$TOML")"
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
fi
"${COMPOSE[@]}" up -d medios
G() { "${COMPOSE[@]}" exec -T medios /garage "$@"; }
LISTO=0; for i in $(seq 1 30); do G status >/dev/null 2>&1 && { LISTO=1; break; }; sleep 2; done
[ "$LISTO" = 1 ] || { echo "[medios] Garage no arrancó:"; "${COMPOSE[@]}" logs --tail=20 medios || true; exit 1; }
NODO=$(G status 2>/dev/null | awk '/^[0-9a-f]{16}/ {print $1; exit}')
if G layout show 2>/dev/null | grep -q "No nodes currently have a role"; then
  G layout assign -z dc1 -c 20G "$NODO" >/dev/null
  G layout apply --version 1 >/dev/null
  echo "[medios] capacidad asignada al nodo $NODO"
fi
G bucket info medios >/dev/null 2>&1 || { G bucket create medios >/dev/null; echo "[medios] bucket creado"; }
G bucket website --allow medios >/dev/null
if ! grep -q '^MEDIOS_KEY_ID=' "$ENV_FILE" 2>/dev/null; then
  OUT=$(G key create tolatino-app)
  ID=$(echo "$OUT" | awk -F': *' '/Key ID/ {print $2; exit}' | tr -d '[:space:]')
  SEC=$(echo "$OUT" | awk -F': *' '/Secret key/ {print $2; exit}' | tr -d '[:space:]')
  [ -n "$ID" ] && [ -n "$SEC" ] || { echo "[medios] no pude leer la llave nueva"; exit 1; }
  { echo "MEDIOS_KEY_ID=$ID"; echo "MEDIOS_SECRET=$SEC"; } >> "$ENV_FILE"
  echo "[medios] llave de la app creada"
fi
KEY_ID=$(grep '^MEDIOS_KEY_ID=' "$ENV_FILE" | cut -d= -f2)
G bucket allow --read --write medios --key "$KEY_ID" >/dev/null
echo "[medios] listo"
