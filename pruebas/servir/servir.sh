#!/bin/bash
# 9a · Sirve la app en :3100 para las pruebas de punta a punta (reemplaza los servir*.sh de cada fase: servir, servidor, servir8a…servir8i).
#
# Uso:  bash pruebas/servir/servir.sh [perfil]
#   perfiles: completo (por defecto) · todos los simuladores (push 8c, App Store Connect 8f/8h, Wallet 8g, llaves de acceso 8d,
#                          tiendas 8h, cuentas de revisión 8i); es el que corre la regresión entera (pruebas/correr.mjs --todas)
#             basico                · sin simuladores (como el servir.sh de las fases 1–7)
#   SOLO=servir      no reconstruye: reinicia el servidor ya construido (sin perfil: el de la última vez)
#   TRADUCTOR_URL=…  el traductor de «Ver traducción» (5h; com5h levanta su traductor de mentira y reinicia con esto)
#
# EL REPO ES PÚBLICO: ningún secreto vive aquí. Se leen de $PRUEBAS_SECRETOS (por defecto $PRUEBAS_SALIDA/secretos.env, FUERA del repo);
# el que falta se genera al azar con openssl la primera vez y se guarda ahí (permisos 600). Las pruebas leen el mismo archivo
# (pruebas/lib/entorno.cjs). La base y Garage los prepara pruebas/servir/base.sh; los recursos de terceros, pruebas/servir/recursos.sh.
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
SALIDA="${PRUEBAS_SALIDA:-${TMPDIR:-/tmp}/tolatino-pruebas}"
SEC="${PRUEBAS_SECRETOS:-$SALIDA/secretos.env}"
case "$(cd "$(dirname "$SEC")" 2>/dev/null && pwd || echo /)" in "$RAIZ"|"$RAIZ"/*) echo "✗ $SEC está dentro del repo: tiene que quedar fuera" >&2; exit 1;; esac
mkdir -p "$SALIDA/cap"
PERFIL="${1:-}"
if [ -z "$PERFIL" ]; then PERFIL=$(cat "$SALIDA/perfil" 2>/dev/null || echo completo); fi
case "$PERFIL" in completo|basico) ;; *) echo "perfil desconocido: $PERFIL (completo | basico)" >&2; exit 2;; esac
echo "$PERFIL" > "$SALIDA/perfil"
DB_CONT="${PRUEBAS_DB_CONT:-tlprueba-db-1}"; MEDIOS_CONT="${PRUEBAS_MEDIOS_CONT:-tlprueba-medios-1}"

# ── Secretos de la corrida: los que faltan se generan (al azar) y se guardan fuera del repo ──
umask 077; touch "$SEC"; chmod 600 "$SEC"
tiene() { grep -q "^$1=" "$SEC"; }
pon() { tiene "$1" || echo "$1=$2" >> "$SEC"; }
hex() { openssl rand -hex "$1"; }
pon AUTH_SECRET "$(hex 32)"
pon BARRIDO_TOKEN "$(hex 32)"
pon DATOS_SECRET "$(hex 32)"
pon STRIPE_WEBHOOK_SECRET "whsec_$(hex 24)"
pon WHATSAPP_APP_SECRET "$(hex 24)"
pon WHATSAPP_VERIFY_TOKEN "$(hex 20)"
pon QR_LLAVE_PRIVADA "$(openssl genpkey -algorithm ed25519 -outform DER | base64 -w0)"
for a in CLIENTE NEGOCIO REPARTIDOR PUERTA; do pon "REVISION_CODIGO_$a" "$(printf '%06d' $(( $(od -An -N4 -tu4 /dev/urandom | tr -d ' ') % 1000000 )))"; done
# Telnyx firma con Ed25519: la privada queda en la salida (la usa compa7h para firmar como Telnyx); la pública, al servidor.
if ! tiene TELNYX_PUBLIC_KEY || [ ! -s "$SALIDA/telnyx-prueba.pem" ]; then
  sed -i '/^TELNYX_PUBLIC_KEY=/d' "$SEC"
  pub=$(node -e "const c=require('crypto'),fs=require('fs');const k=c.generateKeyPairSync('ed25519');fs.writeFileSync(process.argv[1],k.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});process.stdout.write(k.publicKey.export({type:'spki',format:'der'}).subarray(12).toString('base64'))" "$SALIDA/telnyx-prueba.pem")
  echo "TELNYX_PUBLIC_KEY=$pub" >> "$SEC"
fi
# La base y Garage: si base.sh los creó, ya dejó DATABASE_URL y la llave de Garage aquí.
tiene DATABASE_URL || { echo "✗ falta DATABASE_URL en $SEC: corre primero «bash pruebas/servir/base.sh» (crea la base local y lo anota)" >&2; exit 1; }
if ! tiene MEDIOS_KEY_ID && docker ps --format '{{.Names}}' | grep -qx "$MEDIOS_CONT"; then
  OUT=$(docker exec "$MEDIOS_CONT" /garage key create "pruebas-$(date +%s)")
  ID=$(echo "$OUT" | awk -F': *' '/Key ID/ {print $2; exit}' | tr -d '[:space:]'); SK=$(echo "$OUT" | awk -F': *' '/Secret key/ {print $2; exit}' | tr -d '[:space:]')
  docker exec "$MEDIOS_CONT" /garage bucket allow --read --write medios --key "$ID" >/dev/null
  { echo "MEDIOS_KEY_ID=$ID"; echo "MEDIOS_SECRET=$SK"; } >> "$SEC"
fi

# ── Construir (salvo SOLO=servir) ──
cd "$RAIZ/apps/web"
if [ "${SOLO:-}" != "servir" ]; then
  pnpm build > "$SALIDA/build.log" 2>&1 || { tail -30 "$SALIDA/build.log"; exit 1; }
  cp -r .next/static .next/standalone/apps/web/.next/ && cp -r public .next/standalone/apps/web/
fi

# ── El entorno del servidor: los secretos (de $SEC) + lo de cada perfil (solo direcciones locales; nada secreto) ──
VARS=(PORT=3100 MEDIOS_S3_URL=http://127.0.0.1:${PRUEBAS_S3_PUERTO:-3900} TOLATINO_ENTORNO=pruebas TOLATINO_SMS_MODO=pruebas)
if [ "$PERFIL" = basico ]; then
  VARS+=(HOSTNAME=127.0.0.1)
else
  # 8g: la cadena de PRUEBA de Wallet (raíz → WWDR de prueba), hecha aquí con openssl en la salida; el servidor confía en esa raíz solo en este proceso.
  PKI="$SALIDA/wal8g/pki"
  node -e "require('$RAIZ/scripts/wallet-sim/pki.cjs').cadena({ dir: '$PKI', aia: 'http://127.0.0.1:4405/aia/wwdr.der' })"
  VARS+=(HOSTNAME=0.0.0.0 PASSKEY_RP_ID=localhost PASSKEY_ORIGENES=http://localhost:3100
    PUSH_APNS_URL=http://127.0.0.1:4401 PUSH_FCM_URL=http://127.0.0.1:4402 PUSH_FCM_OAUTH_URL=http://127.0.0.1:4402/token PUSH_WEB_HOSTS=127.0.0.1:4403
    ASC_API_URL=http://127.0.0.1:4404 PASES_APNS_URL=https://127.0.0.1:4406 PASES_GOOGLE_URL=http://127.0.0.1:4405 PASES_GOOGLE_OAUTH_URL=http://127.0.0.1:4405/token
    PASES_AIA_HOSTS=127.0.0.1:4405 TIENDAS_OIDC_JWKS_URL=http://127.0.0.1:4407/.well-known/jwks TIENDAS_GITHUB_API_URL=http://127.0.0.1:4407
    PLAY_API_URL=http://127.0.0.1:4408 PLAY_OAUTH_URL=http://127.0.0.1:4408/token NODE_EXTRA_CA_CERTS="$PKI/raiz.pem"
    CORREO_SNS_HOSTS=127.0.0.1:4409 CORREO_SNS_TEMA=arn:aws:sns:us-east-1:000000000000:tolatino-soporte-pruebas)  # 9l: el certificado de «SNS» lo sirve avi9l en :4409
fi
[ -n "${TRADUCTOR_URL:-}" ] && VARS+=(TRADUCTOR_URL="$TRADUCTOR_URL")
# 5d: la moderación de imágenes propia (la levanta com5d en :8790 con el venv de recursos.sh; sin ella, las fotos esperan revisión manual).
VARS+=(MODERACION_IMG_URL="${MODERACION_IMG_URL:-http://127.0.0.1:8790}")

fuser -k 3100/tcp >/dev/null 2>&1 || true; sleep 1
(set -a; . "$SEC"; set +a; unset TRADUCTOR_URL; env "${VARS[@]}" nohup node .next/standalone/apps/web/server.js > "$SALIDA/server.log" 2>&1 &)
for i in $(seq 1 40); do curl -s -o /dev/null http://127.0.0.1:3100/ && break; sleep 1; done
curl -s -o /dev/null http://127.0.0.1:3100/ || { echo "✗ el servidor no respondió en :3100"; tail -20 "$SALIDA/server.log"; exit 1; }
echo "servido ($PERFIL${TRADUCTOR_URL:+, TRADUCTOR_URL=$TRADUCTOR_URL})"
