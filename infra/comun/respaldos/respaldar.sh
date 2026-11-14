#!/bin/bash
# 9o · Los respaldos de producción y del ensayo (fase9-apertura.md §3.4; guardián Datos de PLAN §5). Los corren los temporizadores de systemd que deja
# infra/produccion/deploy.sh; cada corrida queda en backup_runs (solo inserción: Sistema › Respaldos) con su resultado, aunque falle.
#   base-completo     (máquina base, diario 03:15)   pgBackRest completo
#   base-diferencial  (máquina base, cada 6 h)       pgBackRest diferencial
#   wal               (máquina base, cada hora)      pgbackrest check: el WAL continuo llega al almacén (RPO ≤ 5 min con archive_timeout=60)
#   fotos             (máquina base, diario 04:10)   Garage → almacén con rclone; lo borrado o cambiado se aparta 35 días (fotos-apartadas/<fecha>)
#   sobre             (cada máquina, diario 04:40)   el sobre de recuperación de ESTA máquina (sus llaves que nacen en el servidor + su llave age),
#                                                    cifrado para la llave pública de recuperación del entorno (sellado/recuperacion.txt)
# Nada de aquí imprime un secreto: las credenciales pasan a los contenedores por el entorno (-e NOMBRE), nunca en la línea de comandos.
set -uo pipefail
REPO=$(cd "$(dirname "$0")/../../.." && pwd)
# shellcheck source=/dev/null
. /etc/tolatino/rol.conf
ENV_FILE=/etc/tolatino/${TOLATINO_ENTORNO}.env
set -a
# shellcheck source=/dev/null
. "$ENV_FILE"
set +a
# shellcheck source=../lib.sh
. "$REPO/infra/comun/lib.sh"
# shellcheck source=../registro.sh
. "$REPO/infra/comun/registro.sh"
TIPO="${1:?tipo: base-completo | base-diferencial | wal | fotos | sobre}"
DB_CONT=tolatino-base-db-1
if [ "$TOLATINO_ROL" = base ]; then PSQL=(docker exec -i "$DB_CONT" psql -U tolatino -d tolatino -v ON_ERROR_STOP=1 -qAt)
else PGPASSWORD=${POSTGRES_PASSWORD:-}; export PGPASSWORD; PSQL=(bash "$REPO/infra/comun/psql-remoto.sh" exec -T db psql -h x -U tolatino -d tolatino -v ON_ERROR_STOP=1 -qAt); fi
DESTINO="${RESPALDO_S3_BUCKET:-?}/${TOLATINO_ENTORNO}"
# En el ensayo el almacén es un Garage con certificado propio (máquina «almacen»): sin verificar TLS SOLO ahí.
TLS_EXTRA=""; [ "${RESPALDO_S3_VERIFICAR_TLS:-y}" = n ] && [ "$TOLATINO_ENTORNO" = ensayo ] && TLS_EXTRA="-e RCLONE_NO_CHECK_CERTIFICATE=true"

# rclone (MIT) contra el almacén; la configuración por variables (RCLONE_CONFIG_R_*), sin archivo.
# shellcheck disable=SC2120  # los argumentos de docker extra son opcionales
s3() {
  RCLONE_CONFIG_R_TYPE=s3 RCLONE_CONFIG_R_PROVIDER=Other RCLONE_CONFIG_R_ENDPOINT="https://$RESPALDO_S3_ENDPOINT" RCLONE_CONFIG_R_REGION="${RESPALDO_S3_REGION:-auto}" \
  RCLONE_CONFIG_R_ACCESS_KEY_ID="${RESPALDO_S3_KEY_ID:-}" RCLONE_CONFIG_R_SECRET_ACCESS_KEY="${RESPALDO_S3_SECRET:-}" RCLONE_CONFIG_R_FORCE_PATH_STYLE=true \
  docker run --rm -i --network host -e RCLONE_CONFIG_R_TYPE -e RCLONE_CONFIG_R_PROVIDER -e RCLONE_CONFIG_R_ENDPOINT -e RCLONE_CONFIG_R_REGION \
    -e RCLONE_CONFIG_R_ACCESS_KEY_ID -e RCLONE_CONFIG_R_SECRET_ACCESS_KEY -e RCLONE_CONFIG_R_FORCE_PATH_STYLE $TLS_EXTRA ${RCLONE_EXTRA:-} "$@" rclone/rclone:1.68.2 "${S3_ARGS[@]}"
}

# anotar TIPO_TABLA INICIO RESULTADO BYTES SHA DETALLE
anotar() {
  local k="$1" i="$2" r="$3" b="${4:-}" h="${5:-}" d="${6:-}"
  [[ "$b" =~ ^[0-9]+$ ]] || b=""; [[ "$h" =~ ^[0-9a-f]{64}$ ]] || h=""
  [ "$r" = ok ] && [ -z "$h" ] && { r=fallo; d="sin huella: ${d}"; }
  "${PSQL[@]}" -v e="$TOLATINO_ENTORNO" -v k="$k" -v i="$i" -v r="$r" -v b="$b" -v h="$h" -v de="$DESTINO" -v d="${d:0:300}" >/dev/null <<'SQL' || log "respaldo: la base no anotó la corrida ($k $r)"
insert into backup_runs (entorno, kind, started_at, finished_at, bytes, sha256, destino, result, detail)
values (:'e', :'k', (:'i')::timestamptz, now(), nullif(:'b', '')::bigint, nullif(:'h', ''), :'de', :'r', nullif(:'d', ''));
SQL
}

INICIO=$(date -u +%FT%TZ)
case "$TIPO" in
  base-completo|base-diferencial)
    t=$([ "$TIPO" = base-completo ] && echo full || echo diff)
    if docker exec -u postgres "$DB_CONT" pgbackrest --stanza=tolatino --type="$t" backup >/tmp/tl-respaldo.log 2>&1; then
      info=$(docker exec -u postgres "$DB_CONT" pgbackrest --stanza=tolatino --output=json info 2>/dev/null)
      ult=$(printf '%s' "$info" | python3 -c 'import json,sys; b=json.load(sys.stdin)[0]["backup"][-1]; print(b["label"], b["info"]["repository"]["delta"])' 2>/dev/null)
      anotar base "$INICIO" ok "${ult#* }" "$(printf '%s' "$info" | python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin)[0]["backup"][-1], sort_keys=True))' 2>/dev/null | sha256sum | cut -c1-64)" "pgBackRest $t ${ult%% *}"
    else
      anotar base "$INICIO" fallo "" "" "pgBackRest $t: $(tail -c 240 /tmp/tl-respaldo.log | tr '\n' ' ')"
    fi ;;
  wal)
    if docker exec -u postgres "$DB_CONT" pgbackrest --stanza=tolatino check >/tmp/tl-wal.log 2>&1; then
      max=$(docker exec -u postgres "$DB_CONT" pgbackrest --stanza=tolatino --output=json info 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["archive"][-1]["max"])' 2>/dev/null)
      anotar wal "$INICIO" ok "" "$(printf '%s' "$max" | sha256sum | cut -c1-64)" "WAL al día hasta ${max:-?}"
    else
      anotar wal "$INICIO" fallo "" "" "el WAL no llega al almacén: $(tail -c 200 /tmp/tl-wal.log | tr '\n' ' ')"
    fi ;;
  fotos)
    # Garage (S3 en esta máquina) → almacén. Lo que se borró o cambió en Garage no se pierde: se aparta con la fecha y sale a los 35 días.
    G=$(grep -m1 '^MEDIOS_KEY_ID=' "$ENV_FILE" | cut -d= -f2); GS=$(grep -m1 '^MEDIOS_SECRET=' "$ENV_FILE" | cut -d= -f2 | tr -d "'")
    S3_ARGS=(sync "G:medios" "R:$RESPALDO_S3_BUCKET/$TOLATINO_ENTORNO/fotos" --backup-dir "R:$RESPALDO_S3_BUCKET/$TOLATINO_ENTORNO/fotos-apartadas/$(date -u +%F)" --fast-list --transfers 8)
    export RCLONE_CONFIG_G_TYPE=s3 RCLONE_CONFIG_G_PROVIDER=Other RCLONE_CONFIG_G_ENDPOINT="http://$RED_YO:3900" RCLONE_CONFIG_G_REGION=garage RCLONE_CONFIG_G_ACCESS_KEY_ID="$G" RCLONE_CONFIG_G_SECRET_ACCESS_KEY="$GS" RCLONE_CONFIG_G_FORCE_PATH_STYLE=true
    RCLONE_EXTRA="-e RCLONE_CONFIG_G_TYPE -e RCLONE_CONFIG_G_PROVIDER -e RCLONE_CONFIG_G_ENDPOINT -e RCLONE_CONFIG_G_REGION -e RCLONE_CONFIG_G_ACCESS_KEY_ID -e RCLONE_CONFIG_G_SECRET_ACCESS_KEY -e RCLONE_CONFIG_G_FORCE_PATH_STYLE"
    if s3 >/tmp/tl-fotos.log 2>&1; then
      S3_ARGS=(size --json "R:$RESPALDO_S3_BUCKET/$TOLATINO_ENTORNO/fotos"); tam=$(s3 2>/dev/null)
      bytes=$(printf '%s' "$tam" | python3 -c 'import json,sys; print(json.load(sys.stdin)["bytes"])' 2>/dev/null)
      S3_ARGS=(delete --min-age 35d "R:$RESPALDO_S3_BUCKET/$TOLATINO_ENTORNO/fotos-apartadas"); s3 >/dev/null 2>&1 || true
      anotar fotos "$INICIO" ok "$bytes" "$(printf '%s' "$tam" | sha256sum | cut -c1-64)" "Garage → almacén (lo apartado sale a los 35 días)"
    else
      anotar fotos "$INICIO" fallo "" "" "rclone: $(tail -c 200 /tmp/tl-fotos.log | tr '\n' ' ')"
    fi ;;
  sobre)
    # El sobre de recuperación de ESTA máquina: lo que nace aquí (secretos.json, recuperacion: true) y la llave age; sin él, una máquina reconstruida
    # no lee op_private (L458) ni valida los QR ya emitidos (L775). Cifrado para la llave de recuperación (su privada vive solo en los secretos del
    # entorno de Claude Code de producción).
    PUB=$(grep -Eo 'age1[0-9a-z]{58}' "$REPO/infra/${TOLATINO_ENTORNO_DIR:-$TOLATINO_ENTORNO}/sellado/recuperacion.txt" 2>/dev/null | head -1)
    [ -n "$PUB" ] || { anotar sobre "$INICIO" fallo "" "" "falta la llave pública de recuperación del entorno"; exit 0; }
    tmp=$(mktemp); trap 'shred -u "$tmp" 2>/dev/null; rm -f "$tmp" "$tmp.age"' EXIT
    for n in $(grep -E '"recuperacion": true' "$REPO/infra/comun/secretos.json" | grep -Eo '^  "[A-Z][A-Z0-9_]+"' | tr -d ' "'); do
      grep -m1 "^$n=" "$ENV_FILE" >> "$tmp" || true
    done
    echo "AGE_SERVIDOR=$(grep -m1 '^AGE-SECRET-KEY-' /etc/tolatino/age.key)" >> "$tmp"
    [ -f /etc/tolatino/garage.toml ] && echo "GARAGE_TOML_B64=$(base64 -w0 /etc/tolatino/garage.toml)" >> "$tmp"
    if age -r "$PUB" -o "$tmp.age" "$tmp" 2>/dev/null; then
      sha=$(sha256sum "$tmp.age" | cut -c1-64); bytes=$(stat -c %s "$tmp.age")
      S3_ARGS=(rcat "R:$RESPALDO_S3_BUCKET/$TOLATINO_ENTORNO/sobres/$TOLATINO_ROL/$(date -u +%F).age")
      if s3 < "$tmp.age" >/dev/null 2>&1; then
        S3_ARGS=(rcat "R:$RESPALDO_S3_BUCKET/$TOLATINO_ENTORNO/sobres/$TOLATINO_ROL/ultimo.age"); s3 < "$tmp.age" >/dev/null 2>&1 || true
        anotar sobre "$INICIO" ok "$bytes" "$sha" "sobre de recuperación de la máquina $TOLATINO_ROL"
      else anotar sobre "$INICIO" fallo "" "" "no se pudo subir el sobre de $TOLATINO_ROL"; fi
    else anotar sobre "$INICIO" fallo "" "" "no se pudo cifrar el sobre de $TOLATINO_ROL"; fi ;;
  *) echo "tipo desconocido: $TIPO" >&2; exit 2 ;;
esac
