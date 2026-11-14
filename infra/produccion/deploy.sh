#!/bin/bash
# 9o · Despliegue de PRODUCCIÓN (y del ensayo, su copia desechable). Lo ejecuta tolatino-sync (root) en /opt/tolatino de cada máquina cuando la rama
# del entorno avanza (produccion solo por fast-forward y con su etiqueta ok-produccion/*, guardián produccionSoloAvanza). Idempotente; nunca pide nada.
# Tres máquinas (fase9-apertura.md §3.2): «base» (Postgres + PostGIS con pgBackRest, Garage), «app» (Next azul/verde detrás de nginx, barrido, push,
# servicios) y «replica» (lectura para Analítica, Prometheus + Alertmanager + blackbox, la restauración de prueba). En el ensayo, una cuarta «almacen»
# (Garage con TLS propio: el almacén de objetos del ensayo; en producción es el del proveedor en otra región).
# Los pasos son los del sandbox (infra/comun/, guardián mismoPaquete) con sus diferencias: SIN semilla de pruebas (guardián semilla), sin el modo pruebas
# del SMS ni simuladores (guardián modoPruebas), azul/verde con la puerta de salud y la vuelta atrás, respaldos y monitoreo.
set -euo pipefail
cd "$(dirname "$0")/../.."
REPO=$(pwd)
# shellcheck source=/dev/null
. /etc/tolatino/rol.conf
case "${TOLATINO_ENTORNO:-}" in produccion|ensayo) ;; *) echo "entorno desconocido: ${TOLATINO_ENTORNO:-}" >&2; exit 2 ;; esac
# shellcheck source=entorno.conf
. "$REPO/infra/$TOLATINO_ENTORNO/entorno.conf"
# shellcheck source=../comun/lib.sh
. "$REPO/infra/comun/lib.sh"
# shellcheck source=../comun/registro.sh
. "$REPO/infra/comun/registro.sh"
# shellcheck source=../comun/sellado.sh
. "$REPO/infra/comun/sellado.sh"
# shellcheck source=../comun/sobres-privados.sh
. "$REPO/infra/comun/sobres-privados.sh"
# shellcheck source=../comun/recuperacion.sh
. "$REPO/infra/comun/recuperacion.sh"
# shellcheck source=../comun/azulverde.sh
. "$REPO/infra/comun/azulverde.sh"
# shellcheck source=../comun/respaldos/pgbackrest.sh
. "$REPO/infra/comun/respaldos/pgbackrest.sh"

COMMIT=$(git rev-parse HEAD); CORTO=${COMMIT:0:12}
ENV_FILE=/etc/tolatino/${TOLATINO_ENTORNO}.env
LISTA="$REPO/infra/comun/secretos.json"
SELLADO="$REPO/infra/$TOLATINO_ENTORNO/sellado"
LLAVES="$SELLADO/llaves.json"
ROL="${TOLATINO_ROL:?falta el rol}"
case "$ROL" in base) RED_YO=$RED_BASE ;; app) RED_YO=$RED_APP ;; replica) RED_YO=$RED_REPLICA ;; almacen) RED_YO=${RED_ALMACEN:?} ;; *) echo "rol desconocido: $ROL" >&2; exit 2 ;; esac
mkdir -p /etc/tolatino /var/www/estado /var/lib/tolatino
( umask 077; touch "$ENV_FILE" ); chmod 600 "$ENV_FILE"

# Lo que no es secreto y los compose necesitan (de entorno.conf).
for n in TOLATINO_URL PASSKEY_RP_ID PASSKEY_ORIGENES VAPID_SUJETO CORREO_DE DB_SHARED_BUFFERS DB_CACHE RESPALDO_S3_ENDPOINT RESPALDO_S3_REGION RESPALDO_S3_BUCKET RESPALDO_S3_VERIFICAR_TLS; do
  env_poner "$ENV_FILE" "$n" "${!n:-}"
done
env_poner "$ENV_FILE" DB_HOST "$RED_BASE"; env_poner "$ENV_FILE" REPLICA_HOST "$RED_REPLICA"; env_poner "$ENV_FILE" RED_YO "$RED_YO"
env_poner "$ENV_FILE" TOLATINO_COMMIT "$CORTO"

# 0) En la máquina de la app, /estado/ se ve desde el primer minuto (antes de que exista el sitio completo): ahí se publica la llave age, también la
#    provisional de una máquina que se está reconstruyendo.
if [ "$ROL" = app ] && command -v nginx >/dev/null && [ ! -e /etc/nginx/sites-enabled/tolatino ]; then
  printf 'server {\n    listen 80 default_server;\n    location /estado/ { alias /var/www/estado/; add_header Cache-Control "no-store"; }\n    location / { return 503; }\n}\n' > /etc/nginx/sites-available/tolatino-estado
  ln -sf /etc/nginx/sites-available/tolatino-estado /etc/nginx/sites-enabled/tolatino-estado; rm -f /etc/nginx/sites-enabled/default
  nginx -t -q && systemctl reload nginx || true
fi

# 1) El sobre sellado: la llave age de esta máquina (publicada en /estado/llave.txt) y, si se está reconstruyendo, sus llaves de siempre ANTES de que
#    nazca nada nuevo; después los sobres de esta máquina.
FP_AGE=$(sellado_preparar /var/www/estado/llave.txt || true)
# Una base, réplica o almacén que se reconstruye publica su llave provisional por la red privada (la app la muestra en /estado/<rol>/) con un nginx
# provisional, que se quita en cuanto vuelve a tener sus llaves.
if [ "${TOLATINO_RECONSTRUIR:-0}" = 1 ] && [ "$ROL" != app ] && [ ! -f /var/lib/tolatino/recuperada ]; then
  mkdir -p /var/lib/tolatino/sobres-servidos/estado; cp /var/www/estado/llave.txt /var/lib/tolatino/sobres-servidos/estado/ 2>/dev/null || true
  docker run -d --rm --name tolatino-estado-provisional -p "$RED_YO:8099:80" -v /var/lib/tolatino/sobres-servidos:/usr/share/nginx/html:ro nginx:1.27.3-alpine >/dev/null 2>&1 || true
fi
if ! recuperar_si_hace_falta "$REPO" "$ENV_FILE"; then exit 1; fi
docker rm -f tolatino-estado-provisional >/dev/null 2>&1 || true
[ -f /var/lib/tolatino/recuperada ] && FP_AGE=$(sellado_preparar /var/www/estado/llave.txt || true)
sellado_abrir "$SELLADO" "$ROL" "$ENV_FILE" "$LISTA" /var/www/estado/sobres.txt
disco_liberar

# psql contra la base: en la base, por el socket del contenedor; en las demás, por la red privada.
DB_CONT=tolatino-base-db-1
psql_local() { docker exec -i "$DB_CONT" psql -U tolatino -d tolatino -v ON_ERROR_STOP=1 -qAt "$@"; }
envval() { grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2- | sed -e "s/^'//" -e "s/'$//"; }

# Los temporizadores de systemd (respaldos, sobres, restauración, mantenimiento): una unidad por tarea, idempotente.
temporizador() {
  local nombre="$1" cuando="$2" cmd="$3"
  cat > "/etc/systemd/system/tolatino-$nombre.service" <<EOF
[Unit]
Description=To'Latino · $nombre
[Service]
Type=oneshot
ExecStart=/bin/bash -c '$cmd'
EOF
  cat > "/etc/systemd/system/tolatino-$nombre.timer" <<EOF
[Unit]
Description=To'Latino · $nombre
[Timer]
OnCalendar=$cuando
Persistent=true
RandomizedDelaySec=60
[Install]
WantedBy=timers.target
EOF
  systemctl daemon-reload
  systemctl enable --now "tolatino-$nombre.timer" >/dev/null 2>&1 || log "temporizador $nombre no se encendió"
}

# ─────────────────────────────────────────── base ───────────────────────────────────────────
paso_base() {
  local C=(docker compose --env-file "$ENV_FILE" -f "$REPO/infra/produccion/compose-base.yml")
  COMPOSE=("${C[@]}")
  for n in POSTGRES_PASSWORD REPLICA_PASSWORD RESPALDO_LLAVE; do secreto_nace "$ENV_FILE" "$n"; done
  # Sin las llaves del almacén, el WAL no se archiva (si no, se acumularía en el disco esperando un almacén que no existe).
  if [ -n "$(envval RESPALDO_S3_KEY_ID)" ]; then env_poner "$ENV_FILE" DB_ARCHIVE "pgbackrest --stanza=tolatino archive-push %p"
  else env_poner "$ENV_FILE" DB_ARCHIVE "/bin/true"; fi
  set -a
  # shellcheck source=/dev/null
  . "$ENV_FILE"
  set +a
  mkdir -p /var/lib/tolatino/db /var/lib/tolatino/medios; chown 999:999 /var/lib/tolatino/db; chmod 700 /var/lib/tolatino/db
  cat > /etc/tolatino/pg_hba.conf <<EOF
local all all trust
host all all 127.0.0.1/32 scram-sha-256
host tolatino tolatino $RED_RED scram-sha-256
host replication replicador $RED_REPLICA/32 scram-sha-256
host tolatino tolatino 172.16.0.0/12 scram-sha-256
EOF
  chmod 644 /etc/tolatino/pg_hba.conf
  pgbackrest_conf "$REPO" /etc/tolatino/pgbackrest.conf
  # Una base reconstruida arranca desde el último respaldo (PITR al final del WAL), nunca vacía.
  if [ -f /var/lib/tolatino/recuperada ] && [ ! -f /var/lib/tolatino/db/PG_VERSION ]; then
    log "base: restaurando el último respaldo antes de arrancar"
    "${C[@]}" build db
    docker run --rm -u postgres -v /var/lib/tolatino/db:/var/lib/postgresql/data -v /etc/tolatino/pgbackrest.conf:/etc/pgbackrest/pgbackrest.conf:ro \
      tolatino/base:produccion pgbackrest --stanza=tolatino --type=default restore || { log "base: la restauración falló"; return 1; }
  fi
  ENV_FILE="$ENV_FILE" GARAGE_TOML=/etc/tolatino/garage.toml bash "$REPO/infra/pruebas/medios.sh" "${C[@]}" || log "medios: falló la preparación"
  diag "base antes"
  "${C[@]}" up -d --build --remove-orphans
  for _ in $(seq 1 60); do psql_local -c "select 1" >/dev/null 2>&1 && break; sleep 5; done
  # El usuario de la réplica (su contraseña nace aquí y le llega a la réplica en su sobre privado).
  psql_local -v p="$(envval REPLICA_PASSWORD)" >/dev/null <<'SQL'
select format('create role replicador with replication login password %L', :'p') where not exists (select 1 from pg_roles where rolname = 'replicador') \gexec
select format('alter role replicador with password %L', :'p') \gexec
SQL
  if [ -n "$(envval RESPALDO_S3_KEY_ID)" ]; then
    docker exec -u postgres "$DB_CONT" pgbackrest --stanza=tolatino stanza-create >/dev/null 2>&1 || log "pgBackRest: stanza-create falló (ver /estado/diag.txt)"
    temporizador respaldo-completo "*-*-* 03:15:00" "bash $REPO/infra/comun/respaldos/respaldar.sh base-completo"
    temporizador respaldo-diferencial "*-*-* 00/6:45:00" "bash $REPO/infra/comun/respaldos/respaldar.sh base-diferencial"
    temporizador respaldo-wal "hourly" "bash $REPO/infra/comun/respaldos/respaldar.sh wal"
    temporizador respaldo-fotos "*-*-* 04:10:00" "bash $REPO/infra/comun/respaldos/respaldar.sh fotos"
    temporizador respaldo-sobre "*-*-* 04:40:00" "bash $REPO/infra/comun/respaldos/respaldar.sh sobre"
  else
    log "respaldos: sin las llaves del almacén todavía (llegan selladas); no se programan"
  fi
  servir_sobres base "$ENV_FILE" "$LLAVES" "$LISTA" app replica
  PSQL=(psql_local)
  anotar_llave "$TOLATINO_ENTORNO" age_servidor base "${FP_AGE:-}"
  anotar_llave "$TOLATINO_ENTORNO" respaldo_llave base "$(printf '%s' "$(envval RESPALDO_LLAVE)" | sha256sum | cut -c1-32)"
  diag "base después"
}

# ─────────────────────────────────────────── app ───────────────────────────────────────────
paso_app() {
  local F=(docker compose -p tolatino-fijos --env-file "$ENV_FILE" -f "$REPO/infra/produccion/compose-app-fijos.yml") n
  COMPOSE=("${F[@]}")
  for n in AUTH_SECRET DATOS_SECRET LLAVERO_SECRET BARRIDO_TOKEN ALERTA_TOKEN QR_LLAVE_PRIVADA VAPID_PRIVADA \
           REVISION_CODIGO_CLIENTE REVISION_CODIGO_NEGOCIO REVISION_CODIGO_REPARTIDOR REVISION_CODIGO_PUERTA; do secreto_nace "$ENV_FILE" "$n"; done
  traer_sobre "$RED_BASE" app "$ENV_FILE" "$LISTA" base || log "app: sin el sobre de la base todavía (la app no verá la base)"
  servir_sobres app "$ENV_FILE" "$LLAVES" "$LISTA" replica
  docker network inspect tolatino-salida >/dev/null 2>&1 || docker network create tolatino-salida >/dev/null
  docker network inspect tolatino-interna >/dev/null 2>&1 || docker network create --internal tolatino-interna >/dev/null

  # La imagen de la versión: la MISMA receta del sandbox (infra/pruebas/Dockerfile), etiquetada por commit; una vez.
  local IMG="tolatino/web:$CORTO"
  docker image inspect "$IMG" >/dev/null 2>&1 || docker build -q -f "$REPO/infra/pruebas/Dockerfile" --build-arg "TOLATINO_COMMIT=$CORTO" -t "$IMG" "$REPO" >/dev/null

  # nginx: el sitio con su dominio, la IP real desde Cloudflare, el certificado de origen y la página de mantenimiento.
  mkdir -p /var/www/mantenimiento /var/lib/tolatino/mantenimiento
  install -m 0644 "$REPO/infra/comun/mantenimiento/index.html" /var/www/mantenimiento/index.html
  if [ "${DETRAS_DE_CLOUDFLARE:-0}" = 1 ]; then
    { curl -fsS -m 10 https://www.cloudflare.com/ips-v4; echo; curl -fsS -m 10 https://www.cloudflare.com/ips-v6; } 2>/dev/null | grep -E '^[0-9a-f:.]+/[0-9]+$' > /tmp/cf.txt \
      || cp "$REPO/infra/comun/cloudflare-rangos.txt" /tmp/cf.txt
    [ -s /tmp/cf.txt ] || cp "$REPO/infra/comun/cloudflare-rangos.txt" /tmp/cf.txt
    { grep -E '^[0-9a-f:.]+/[0-9]+$' /tmp/cf.txt | sed 's/^/set_real_ip_from /; s/$/;/'; echo "real_ip_header CF-Connecting-IP;"; } > /etc/nginx/tolatino-cloudflare.conf
  else : > /etc/nginx/tolatino-cloudflare.conf; fi
  # El certificado de origen: la llave nace aquí (nunca sale) y la solicitud se publica en /estado/csr.txt; el certificado llega sellado (ORIGEN_CERT).
  if [ ! -s /etc/tolatino/origen.key ] && [ -n "$TOLATINO_DOMINIO" ]; then
    ( umask 077; openssl req -new -newkey rsa:2048 -nodes -keyout /etc/tolatino/origen.key -subj "/CN=$TOLATINO_DOMINIO" -out /var/www/estado/csr.txt 2>/dev/null ) || true
    chmod 644 /var/www/estado/csr.txt 2>/dev/null || true
  fi
  if [ -n "$(envval ORIGEN_CERT)" ]; then
    envval ORIGEN_CERT | base64 -d > /etc/tolatino/origen.crt 2>/dev/null || true
    printf 'listen 443 ssl http2;\nlisten [::]:443 ssl http2;\nssl_certificate /etc/tolatino/origen.crt;\nssl_certificate_key /etc/tolatino/origen.key;\nssl_protocols TLSv1.2 TLSv1.3;\n' > /etc/nginx/tolatino-ssl.conf
    PSQL=(bash "$REPO/infra/comun/psql-remoto.sh" exec -T db psql -h x -U tolatino -d tolatino -v ON_ERROR_STOP=1 -qAt)
    anotar_llave "$TOLATINO_ENTORNO" cloudflare_origen app "$(openssl x509 -in /etc/tolatino/origen.crt -noout -fingerprint -sha256 2>/dev/null | cut -d= -f2 | tr -d ':' | tr 'A-F' 'a-f' | cut -c1-32)" \
      "$(date -d "$(openssl x509 -in /etc/tolatino/origen.crt -noout -enddate 2>/dev/null | cut -d= -f2)" +%F 2>/dev/null)"
  else : > /etc/nginx/tolatino-ssl.conf; fi
  [ -f "$AV_UPSTREAM" ] || printf 'upstream tolatino_app {\n    server 127.0.0.1:3001;\n    keepalive 16;\n}\n' > "$AV_UPSTREAM"
  sed -e "s|__DOMINIO__|${TOLATINO_DOMINIO:-_}|" -e "s|__RED_APP__|$RED_APP|g" -e "s|__RED_BASE__|$RED_BASE|g" -e "s|__RED_RED__|$RED_RED|g" \
      -e "s|__RED_REPLICA__|$RED_REPLICA|g" -e "s|__RED_ALMACEN__|${RED_ALMACEN:-127.0.0.1}|g" \
    "$REPO/infra/produccion/nginx-produccion.conf" > /etc/nginx/sites-available/tolatino
  ln -sf /etc/nginx/sites-available/tolatino /etc/nginx/sites-enabled/tolatino
  rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/tolatino-estado
  nginx -t && systemctl reload nginx

  # Lo fijo (barrido, push, moderación, node_exporter); el traductor y el mapa aparte, como en el sandbox (nunca frenan el despliegue).
  "${F[@]}" up -d --build barrido push moderacion-img node-exporter || log "fijos: algo no arrancó (ver /estado/diag.txt)"
  if ! systemctl is-active --quiet tolatino-traductor; then
    systemd-run --unit tolatino-traductor --collect bash -c "${F[*]} --profile traductor run --rm traductor-modelos && ${F[*]} --profile traductor up -d traductor" || true
  fi
  if [ -f /var/lib/tolatino/mapa/pennsylvania.mbtiles ]; then "${F[@]}" --profile mapa up -d mapa
  elif ! systemctl is-active --quiet tolatino-mapa; then
    systemd-run --unit tolatino-mapa --collect bash -c "bash '$REPO/infra/mapa/generar.sh' /var/lib/tolatino/mapa && ${F[*]} --profile mapa up -d mapa" || true
  fi

  # El azul/verde: migraciones (por la red privada) → color nuevo → puerta de salud → nginx → 10 minutos de vigilancia → ok o vuelta atrás sola.
  export PGPASSWORD; PGPASSWORD=$(envval POSTGRES_PASSWORD)
  export DB_HOST="$RED_BASE"
  # 9m · Direcciones de TODO EE. UU. (decisión AC: los 50 estados + DC + PR, por estado, 4 a la vez, reanudable; la carpeta en el volumen aparte) y los
  # retiros de NHTSA, aparte y sin esperar: nunca frenan el despliegue. La base es la de la otra máquina (psql-remoto); la clave viaja por el entorno.
  if ! systemctl is-active --quiet tolatino-direcciones; then
    systemd-run --unit tolatino-direcciones --collect --setenv=PGPASSWORD --setenv=DB_HOST --setenv=ESTADOS=todos --setenv=PARALELO=4 \
      bash "$REPO/infra/direcciones/generar.sh" /var/lib/tolatino/direcciones bash "$REPO/infra/comun/psql-remoto.sh" || true
  fi
  if ! systemctl is-active --quiet tolatino-retiros; then
    systemd-run --unit tolatino-retiros --collect --setenv=PGPASSWORD --setenv=DB_HOST bash "$REPO/infra/retiros/generar.sh" /var/lib/tolatino/retiros bash "$REPO/infra/comun/psql-remoto.sh" || true
  fi
  PSQL=(bash "$REPO/infra/comun/psql-remoto.sh" exec -T db psql -h x -U tolatino -d tolatino -v ON_ERROR_STOP=1 -qAt)
  av_compose() { local c="$1"; shift; TOLATINO_COLOR="$c" TOLATINO_PUERTO="$(puerto_de "$c")" TOLATINO_IMAGEN="$IMG" \
    docker compose -p "tolatino-$c" --env-file "$ENV_FILE" -f "$REPO/infra/produccion/compose-app.yml" "$@"; }
  av_migrar() { bash "$REPO/packages/db/migrar.sh" bash "$REPO/infra/comun/psql-remoto.sh"; }
  local rc=0
  desplegar_azulverde "$TOLATINO_ENTORNO" "$CORTO" "$IMG" "${TOLATINO_OK_REF:-}" av_migrar || rc=$?
  # Lo que sale del repo (ayuda, legal, cadenas), con la base ya migrada. Nunca la semilla de pruebas.
  indexar_docs "$REPO" "${PSQL[@]}"
  # Las imágenes viejas: se guardan la que sirve y las tres anteriores (para volver a mano si hiciera falta).
  docker image ls tolatino/web --format '{{.Tag}} {{.CreatedAt}}' | sort -k2 -r | awk 'NR > 4 { print $1 }' | while read -r t; do docker image rm "tolatino/web:$t" >/dev/null 2>&1 || true; done
  temporizador respaldo-sobre "*-*-* 04:45:00" "bash $REPO/infra/comun/respaldos/respaldar.sh sobre"
  temporizador mantenimiento "minutely" "bash $REPO/infra/comun/mantenimiento.sh"
  anotar_llave "$TOLATINO_ENTORNO" age_servidor app "${FP_AGE:-}"
  return "$rc"
}

# ─────────────────────────────────────────── replica ───────────────────────────────────────────
paso_replica() {
  local C=(docker compose --env-file "$ENV_FILE" -f "$REPO/infra/produccion/compose-replica.yml")
  COMPOSE=("${C[@]}")
  traer_sobre "$RED_BASE" replica "$ENV_FILE" "$LISTA" base || log "réplica: sin el sobre de la base todavía"
  traer_sobre "$RED_APP" replica "$ENV_FILE" "$LISTA" app || log "réplica: sin el sobre de la app todavía (las alertas no llegan a la app)"
  docker image inspect tolatino/base:produccion >/dev/null 2>&1 || docker build -q -t tolatino/base:produccion "$REPO/infra/produccion/base" >/dev/null
  mkdir -p /var/lib/tolatino/db; chown 999:999 /var/lib/tolatino/db; chmod 700 /var/lib/tolatino/db
  printf 'local all all trust\nhost all all 127.0.0.1/32 scram-sha-256\nhost tolatino tolatino %s scram-sha-256\n' "$RED_RED" > /etc/tolatino/pg_hba.conf
  if [ ! -f /var/lib/tolatino/db/PG_VERSION ] && [ -n "$(envval REPLICA_PASSWORD)" ]; then
    log "réplica: copia inicial de la base (pg_basebackup)"
    docker run --rm -u postgres -e PGPASSWORD="$(envval REPLICA_PASSWORD)" -v /var/lib/tolatino/db:/var/lib/postgresql/data tolatino/base:produccion \
      pg_basebackup -h "$RED_BASE" -U replicador -D /var/lib/postgresql/data -R -X stream -c fast || log "réplica: pg_basebackup falló"
  fi
  # Prometheus y Alertmanager (sus plantillas llenas en el servidor; el correo de las alertas solo si llegaron sus llaves selladas).
  local URL="${TOLATINO_URL:-http://$RED_APP}"
  [ -n "$TOLATINO_DOMINIO" ] || URL="http://$RED_APP"
  sed -e "s|__RED_APP__|$RED_APP|g" -e "s|__RED_BASE__|$RED_BASE|g" -e "s|__RED_REPLICA__|$RED_REPLICA|g" -e "s|__DOMINIO_URL__|$URL|g" -e "s|__ENTORNO__|$TOLATINO_ENTORNO|g" \
    "$REPO/infra/comun/monitoreo/prometheus.yml.tpl" > /etc/tolatino/prometheus.yml
  ( umask 077
    sed -e "s|__RED_APP__|$RED_APP|g" -e "s|__ALERTA_TOKEN__|$(envval ALERTA_TOKEN)|" -e "s|__SMTP_HOST__|${ALERTA_SMTP_HOST:-localhost}|" -e "s|__SMTP_DE__|${CORREO_DE:-alertas@localhost}|" \
        -e "s|__SMTP_USUARIO__|$(envval ALERTA_SMTP_USUARIO)|" -e "s|__SMTP_CLAVE__|$(envval ALERTA_SMTP_CLAVE)|" -e "s|__ALERTA_CORREO__|$(envval ALERTA_CORREO)|" \
        "$REPO/infra/comun/monitoreo/alertmanager.yml.tpl" > /etc/tolatino/alertmanager.yml )
  # Sin las llaves del correo (ensayo, o antes del Paquete 9-1), las alertas van solo a la app: se quita el receptor de correo.
  if [ -z "$(envval ALERTA_SMTP_CLAVE)" ] || [ -z "$(envval ALERTA_CORREO)" ]; then
    python3 - /etc/tolatino/alertmanager.yml <<'PY'
import re, sys
p = sys.argv[1]; t = open(p).read()
t = re.sub(r"\n    email_configs:\n(?:      .*\n)+", "\n", t)
t = re.sub(r"\n  smtp_[a-z_]+: .*", "", t)
open(p, "w").write(t)
PY
  fi
  chmod 644 /etc/tolatino/prometheus.yml; chmod 640 /etc/tolatino/alertmanager.yml; chown root:65534 /etc/tolatino/alertmanager.yml
  diag "réplica antes"
  "${C[@]}" up -d --remove-orphans
  temporizador restauracion-prueba "Sun *-*-* 05:20:00" "bash $REPO/infra/comun/respaldos/restaurar-prueba.sh"
  temporizador respaldo-sobre "*-*-* 04:50:00" "bash $REPO/infra/comun/respaldos/respaldar.sh sobre"
  export PGPASSWORD; PGPASSWORD=$(envval POSTGRES_PASSWORD); export DB_HOST="$RED_BASE"
  PSQL=(bash "$REPO/infra/comun/psql-remoto.sh" exec -T db psql -h x -U tolatino -d tolatino -v ON_ERROR_STOP=1 -qAt)
  anotar_llave "$TOLATINO_ENTORNO" age_servidor replica "${FP_AGE:-}"
  diag "réplica después"
}

# ─────────────────────────────────────────── almacen (solo el ensayo) ───────────────────────────────────────────
paso_almacen() {
  [ "$TOLATINO_ENTORNO" = ensayo ] || { log "la máquina almacen solo existe en el ensayo"; return 1; }
  local C=(docker compose --env-file "$ENV_FILE" -f "$REPO/infra/ensayo/compose-almacen.yml")
  COMPOSE=("${C[@]}")
  mkdir -p /var/lib/tolatino/medios /etc/tolatino/almacen-tls
  [ -s /etc/tolatino/almacen-tls/cert.pem ] || ( umask 077; openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj "/CN=$RED_ALMACEN" \
    -keyout /etc/tolatino/almacen-tls/key.pem -out /etc/tolatino/almacen-tls/cert.pem 2>/dev/null ); chmod 644 /etc/tolatino/almacen-tls/*.pem
  # Garage hace de almacén de objetos: su bucket «respaldos» y la llave de los respaldos (a las otras tres por su sobre privado).
  ENV_FILE="$ENV_FILE" GARAGE_TOML=/etc/tolatino/garage.toml bash "$REPO/infra/pruebas/medios.sh" "${C[@]}" || log "almacen: Garage no quedó"
  # La llave de los respaldos llega SELLADA como en producción (la genera el ensayo y la sella para las cuatro máquinas): aquí se importa en Garage.
  local G=("${C[@]}" exec -T medios /garage)
  "${G[@]}" bucket info respaldos >/dev/null 2>&1 || "${G[@]}" bucket create respaldos >/dev/null
  if [ -n "$(envval RESPALDO_S3_KEY_ID)" ]; then
    "${G[@]}" key info "$(envval RESPALDO_S3_KEY_ID)" >/dev/null 2>&1 || "${G[@]}" key import --yes -n respaldos "$(envval RESPALDO_S3_KEY_ID)" "$(envval RESPALDO_S3_SECRET)" >/dev/null
    "${G[@]}" bucket allow --read --write --owner respaldos --key "$(envval RESPALDO_S3_KEY_ID)" >/dev/null
  else log "almacen: sin la llave de los respaldos todavía (llega sellada)"; fi
  "${C[@]}" up -d --remove-orphans
}

INICIO_TOTAL=$(date +%s)
RC=0
case "$ROL" in
  base) paso_base || RC=$? ;;
  app) paso_app || RC=$? ;;
  replica) paso_replica || RC=$? ;;
  almacen) paso_almacen || RC=$? ;;
esac
# Solo el ENSAYO: las órdenes del guion del ensayo (scripts/produccion/ensayo.sh las pone en la rama «ensayo», nunca en main; guardián mismoPaquete) y
# lo que el guion necesita mirar desde fuera (los despliegues y las restauraciones de la base, sin personas). En producción esto no existe.
if [ "$TOLATINO_ENTORNO" = ensayo ]; then
  if [ -f "$REPO/infra/ensayo/ordenes/$ROL.sh" ] && [ "$(sha256sum "$REPO/infra/ensayo/ordenes/$ROL.sh" | cut -c1-16)" != "$(cat /var/lib/tolatino/orden-hecha 2>/dev/null)" ]; then
    { echo "== $(date -Is) orden de $ROL"; bash "$REPO/infra/ensayo/ordenes/$ROL.sh" 2>&1; echo "== fin $?"; } >> /var/www/estado/orden.txt
    sha256sum "$REPO/infra/ensayo/ordenes/$ROL.sh" | cut -c1-16 > /var/lib/tolatino/orden-hecha
    [ "$ROL" = app ] || cp /var/www/estado/orden.txt /var/lib/tolatino/sobres-servidos/estado/ 2>/dev/null || true
  fi
  [ "$ROL" = app ] && { temporizador ensayo-estado "minutely" "bash $REPO/infra/ensayo/estado.sh"; bash "$REPO/infra/ensayo/estado.sh" || true; }
fi
log "rol $ROL · commit $CORTO · terminó con $RC en $(( $(date +%s) - INICIO_TOTAL )) s"
exit "$RC"
