#!/bin/bash
# 9o · Llena la plantilla de pgBackRest (pgbackrest.conf.tpl) con el almacén y la llave de este servidor. La usan la máquina de la base (deploy.sh) y la
# restauración de prueba. RESPALDO_S3_ENDPOINT es «host» o «host:puerto» (sin https://; pgBackRest siempre habla TLS). El archivo queda 0600 y es
# del usuario postgres de la imagen (uid 999, PGBACKREST_UID), que es quien lo lee dentro del contenedor.
# pgbackrest_conf REPO SALIDA (lee RESPALDO_S3_*, RESPALDO_LLAVE y TOLATINO_ENTORNO del entorno)
pgbackrest_conf() {
  local repo="$1" out="$2" host="${RESPALDO_S3_ENDPOINT%%:*}" puerto=443
  [[ "$RESPALDO_S3_ENDPOINT" == *:* ]] && puerto="${RESPALDO_S3_ENDPOINT##*:}"
  ( umask 077
    sed -e "s|__S3_ENDPOINT__|${host}|" -e "s|__S3_PUERTO__|${puerto}|" -e "s|__S3_REGION__|${RESPALDO_S3_REGION:-auto}|" -e "s|__S3_BUCKET__|${RESPALDO_S3_BUCKET}|" \
        -e "s|__S3_KEY__|${RESPALDO_S3_KEY_ID:-}|" -e "s|__S3_SECRET__|${RESPALDO_S3_SECRET:-}|" -e "s|__S3_VERIFICAR_TLS__|${RESPALDO_S3_VERIFICAR_TLS:-y}|" \
        -e "s|__ENTORNO__|${TOLATINO_ENTORNO}|" -e "s|__RESPALDO_LLAVE__|${RESPALDO_LLAVE:-}|" "$repo/infra/comun/respaldos/pgbackrest.conf.tpl" > "$out" )
  chown "${PGBACKREST_UID:-999}:${PGBACKREST_UID:-999}" "$out" 2>/dev/null || true
}
