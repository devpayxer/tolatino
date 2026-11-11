#!/usr/bin/env bash
# Contrato del push propio — bloque 8c. Como scripts/contrato-canales: compila el código REAL de los proveedores de push (apps/web/lib/push/webpush.ts,
# apns.ts, fcm.ts) aparte y lo corre contra los simuladores de scripts/push-sim, que validan cada pedido. Referencias:
#   · FCM: el documento de descubrimiento oficial de FCM v1, fijado a un commit de googleapis/google-api-go-client.
#   · Web Push: http_ece 1.2.1 (MIT, web-push-libs) como implementación independiente para descifrar, y el vector del RFC 8291 dentro de la prueba.
#   · APNs: scripts/contrato-push/apns.json (sacado de la documentación de Apple con extraer-apns.mjs; sha256 de cada página adentro).
# Necesita red para bajar las dos primeras (o CONTRATO_SPECS con fcm-v1.json y http_ece/ ya bajados).
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
T="$(mktemp -d)"
trap 'rm -rf -- "$T"' EXIT
SPECS="${CONTRATO_SPECS:-$T/specs}"
FCM_COMMIT=be503e8963ac11ca328020a6a42316b00b3d8601
mkdir -p "$SPECS" "$T/src" "$T/node_modules/server-only"
[ -f "$SPECS/fcm-v1.json" ] || curl -fsSL -o "$SPECS/fcm-v1.json" "https://raw.githubusercontent.com/googleapis/google-api-go-client/$FCM_COMMIT/fcm/v1/fcm-api.json"
if [ ! -f "$SPECS/http_ece/package.json" ]; then
  (cd "$SPECS" && npm pack --silent http_ece@1.2.1 > /dev/null && mkdir -p http_ece && tar xzf http_ece-1.2.1.tgz -C http_ece --strip-components 1)
fi
cp "$RAIZ"/apps/web/lib/push/{webpush,apns,fcm}.ts "$T/src/"
echo 'module.exports = {};' > "$T/node_modules/server-only/index.js"
(cd "$RAIZ/apps/web" && npx tsc --outDir "$T/out" --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck --types node --rootDir "$T/src" "$T"/src/*.ts > /dev/null) || true
test -f "$T/out/webpush.js" && test -f "$T/out/apns.js" && test -f "$T/out/fcm.js"
CONTRATO_OUT="$T/out" FCM_SPEC="$SPECS/fcm-v1.json" ECE_DIR="$SPECS/http_ece" NODE_PATH="$T/node_modules" node "$RAIZ/scripts/contrato-push/prueba.cjs"
