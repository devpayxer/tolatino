#!/usr/bin/env bash
# Contrato de Wallet — bloque 8g. Compila el código REAL de lib/pases (der, zip, apple, apns-pase, google) y lib/push/fcm.ts aparte y lo corre
# (prueba.cjs) contra: apple.json (el formato del pase y del servicio web, sacado de la documentación oficial de Apple con extraer-apple.mjs,
# sha256 de cada página adentro), una cadena de certificados de PRUEBA hecha en el momento con openssl (nunca en el repo), el APNs simulado
# con TLS de cliente y el simulador de Google Wallet (scripts/wallet-sim), que valida cada cuerpo contra el documento de descubrimiento
# OFICIAL de walletobjects v1 (googleapis, fijado al mismo commit que el de Play en contrato-tiendas). Necesita red para bajar ese documento
# (o CONTRATO_SPECS con walletobjects-v1.json ya bajado) y openssl.
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
T="$(mktemp -d)"
trap 'rm -rf -- "$T"' EXIT
SPECS="${CONTRATO_SPECS:-$T/specs}"
GOOGLE_COMMIT=be503e8963ac11ca328020a6a42316b00b3d8601
# El documento de esa revisión (walletobjects v1, revisión 20260806): si el archivo cambia, el contrato no corre a ciegas.
GOOGLE_SHA=d5a73991282d0a06d94f74e77b0ae5f863b274a4a1b817a43a3f54dd37b92ffc
mkdir -p "$SPECS" "$T/src/pases" "$T/src/push" "$T/node_modules/server-only"
[ -f "$SPECS/walletobjects-v1.json" ] || curl -fsSL -o "$SPECS/walletobjects-v1.json" "https://raw.githubusercontent.com/googleapis/google-api-go-client/$GOOGLE_COMMIT/walletobjects/v1/walletobjects-api.json"
echo "$GOOGLE_SHA  $SPECS/walletobjects-v1.json" | sha256sum -c --quiet -
cp "$RAIZ"/apps/web/lib/pases/{der,zip,apple,apns-pase,google}.ts "$T/src/pases/"
cp "$RAIZ"/apps/web/lib/push/{fcm,webpush}.ts "$T/src/push/"
echo 'module.exports = {};' > "$T/node_modules/server-only/index.js"
(cd "$RAIZ/apps/web" && npx tsc --outDir "$T/out" --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck --types node --rootDir "$T/src" "$T"/src/pases/*.ts "$T"/src/push/*.ts > /dev/null) || true
test -f "$T/out/pases/apple.js" && test -f "$T/out/pases/google.js"
CONTRATO_OUT="$T/out" WALLET_SPEC="$SPECS/walletobjects-v1.json" NODE_PATH="$T/node_modules" node "$RAIZ/scripts/contrato-wallet/prueba.cjs"
