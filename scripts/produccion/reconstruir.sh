#!/bin/bash
# 9o · Reconstruir una máquina perdida (docs/incidentes/servidor-perdido.md). Del lado de quien la reconstruye (el flujo de GitHub Actions con el entorno
# «produccion» o «ensayo», o una sesión de Claude con las mismas variables): nadie entra a la máquina, nadie copia nada.
#   1. maquinas.sh reconstruir: la máquina nueva nace con TOLATINO_RECONSTRUIR=1 y publica una llave age PROVISIONAL.
#   2. Se baja del almacén el sobre de recuperación de ese rol (sobres/<rol>/ultimo.age), se abre con la llave de recuperación y se vuelve a cifrar
#      SOLO para la llave provisional → rama «recuperacion» (recuperacion/para-<huella>.age). La llave de recuperación en claro solo existe en un
#      archivo temporal 0600 que se borra al salir.
#   3. La máquina abre su sobre, vuelve a tener sus llaves de siempre y sigue con su despliegue; se mide cuánto tardó hasta estar sana.
# Variables: HCLOUD_TOKEN, TOLATINO_RECUPERACION_LLAVE (la privada de recuperación), RESPALDO_S3_KEY_ID / RESPALDO_S3_SECRET y RESPALDO_S3_ENDPOINT_PUBLICO
# (el almacén visto desde fuera), GH_TOKEN o credenciales de git que puedan empujar la rama de recuperación.
# Uso: reconstruir.sh ENTORNO ROL
set -euo pipefail
DIR=$(cd "$(dirname "$0")" && pwd); RAIZ=$(cd "$DIR/../.." && pwd)
E="${1:?entorno}"; ROL="${2:?rol}"
# shellcheck source=/dev/null
. "$RAIZ/infra/$E/entorno.conf"
# shellcheck source=hetzner.sh
. "$DIR/hetzner.sh"
T=$(mktemp -d); chmod 700 "$T"; trap 'find "$T" -type f -exec shred -u {} + 2>/dev/null; rm -rf "$T"' EXIT
T0=$(date +%s)

# 1) La máquina nueva.
bash "$DIR/maquinas.sh" reconstruir "$E" "$ROL"
APP_IP=$(for id in $(servidor_de "$E" app); do ip_publica "$id"; done | head -1)
URL="http://$APP_IP/estado$([ "$ROL" = app ] || echo "/$ROL")"
echo "· esperando la llave provisional en /estado$([ "$ROL" = app ] || echo "/$ROL")/llave.txt"
for _ in $(seq 1 90); do curl -fsS -m 10 "$URL/llave.txt" -o "$T/llave.txt" 2>/dev/null && grep -q '^huella ' "$T/llave.txt" && break; sleep 20; done
FP=$(sed -n 's/^huella //p' "$T/llave.txt"); PUB=$(grep -Eo 'age1[0-9a-z]{58}' "$T/llave.txt" | head -1)
[ -n "$FP" ] && [ -n "$PUB" ] || { echo "✗ la máquina nueva no publicó su llave"; exit 1; }
[ "$(printf '%s' "$PUB" | sha256sum | cut -c1-32)" = "$FP" ] || { echo "✗ la huella publicada no es la de la llave"; exit 1; }

# 2) El sobre de recuperación, del almacén, abierto y vuelto a cifrar solo para la llave provisional.
export RCLONE_CONFIG_R_TYPE=s3 RCLONE_CONFIG_R_PROVIDER=Other RCLONE_CONFIG_R_ENDPOINT="https://${RESPALDO_S3_ENDPOINT_PUBLICO:?}" RCLONE_CONFIG_R_REGION="${RESPALDO_S3_REGION:-auto}" \
  RCLONE_CONFIG_R_ACCESS_KEY_ID="${RESPALDO_S3_KEY_ID:?}" RCLONE_CONFIG_R_SECRET_ACCESS_KEY="${RESPALDO_S3_SECRET:?}" RCLONE_CONFIG_R_FORCE_PATH_STYLE=true
EXTRA=(); [ "$E" = ensayo ] && EXTRA=(-e RCLONE_NO_CHECK_CERTIFICATE=true)
docker run --rm -e RCLONE_CONFIG_R_TYPE -e RCLONE_CONFIG_R_PROVIDER -e RCLONE_CONFIG_R_ENDPOINT -e RCLONE_CONFIG_R_REGION -e RCLONE_CONFIG_R_ACCESS_KEY_ID \
  -e RCLONE_CONFIG_R_SECRET_ACCESS_KEY -e RCLONE_CONFIG_R_FORCE_PATH_STYLE "${EXTRA[@]}" rclone/rclone:1.68.2 cat "R:$RESPALDO_S3_BUCKET/$E/sobres/$ROL/ultimo.age" > "$T/sobre.age"
[ -s "$T/sobre.age" ] || { echo "✗ no hay sobre de recuperación de $ROL en el almacén"; exit 1; }
( umask 077; printf '%s\n' "${TOLATINO_RECUPERACION_LLAVE:?}" > "$T/rec.key" )
age -d -i "$T/rec.key" "$T/sobre.age" | age -r "$PUB" -o "$T/para.age"
RAMA="${RAMA_RECUPERACION:-recuperacion}"
git -C "$RAIZ" fetch -q origin "$RAMA" 2>/dev/null && git -C "$RAIZ" worktree add -q "$T/rama" FETCH_HEAD 2>/dev/null || { git -C "$RAIZ" worktree add -q --detach "$T/rama" 2>/dev/null; git -C "$T/rama" checkout -q --orphan "$RAMA"; git -C "$T/rama" rm -rqf . 2>/dev/null || true; }
mkdir -p "$T/rama/recuperacion"; cp "$T/para.age" "$T/rama/recuperacion/para-$FP.age"
git -C "$T/rama" add recuperacion; git -C "$T/rama" -c user.email=tolatino@users.noreply.github.com -c user.name="To'Latino" commit -qm "recuperación de $ROL ($E) para la llave $FP"
git -C "$T/rama" push -q origin "HEAD:refs/heads/$RAMA"
git -C "$RAIZ" worktree remove --force "$T/rama" 2>/dev/null || true
echo "· sobre de recuperación entregado (rama $RAMA, para $FP)"

# 3) Hasta que vuelve a estar sana (la app: /api/salud contesta; las otras: su página de estado dice OK).
for _ in $(seq 1 120); do
  if [ "$ROL" = app ]; then curl -fsS -m 10 "http://$APP_IP/api/salud" 2>/dev/null | grep -q '"ok":true' && break
  else curl -fsS -m 10 "$URL/index.html" 2>/dev/null | grep -q 'Último despliegue:</b> OK' && break; fi
  sleep 30
done
echo "✓ $ROL reconstruida y sana en $(( $(date +%s) - T0 )) s (objetivo ≤ 3600 s)"
