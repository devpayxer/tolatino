#!/usr/bin/env bash
# Contrato con Telnyx (SMS) y Meta (WhatsApp Cloud API) — bloque 7h. Como scripts/contrato-stripe: compila el código REAL del proveedor de los
# canales (apps/web/lib/compa/canales-proveedor.ts) aparte y lo corre contra un servidor local que valida cada llamada con la especificación
# OFICIAL publicada de cada proveedor (Telnyx: team-telnyx/openapi spec3.json; Meta: facebook/openapi business-messaging-api). También lee
# una entrada de ejemplo armada con el esquema de Telnyx (InboundMessagePayload). Necesita red para bajar las especificaciones (o
# CONTRATO_SPECS con telnyx.json y meta.yaml ya bajados) y python3 con PyYAML para leer la de Meta.
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
T="$(mktemp -d)"
trap 'rm -rf -- "$T"' EXIT
SPECS="${CONTRATO_SPECS:-$T/specs}"
mkdir -p "$SPECS" "$T/src/compa" "$T/node_modules/server-only"
# 9l · Las especificaciones FIJAS a un commit (L1113) y a su huella: un cambio del proveedor no rompe la CI sin aviso. Para subir de versión: cambiar el
# commit y la huella aquí (git ls-remote https://github.com/team-telnyx/openapi master · facebook/openapi main), correr el contrato y anotarlo en PROGRESS.
TELNYX_COMMIT=bf2eb8ed5b816213987fecae8fe33329e98cdd84; TELNYX_SHA256=fc59cb60a25c5091e73889842c808f1db7b4c0bb36bbb0228ee9ed2f629eca18
META_COMMIT=e96a1c9dbf240c2937b6a95920685230458e346b; META_SHA256=5c1973265369944b7cdfa3fa690985713575249042e2b7edd46be3ef9bd9b09d
[ -f "$SPECS/telnyx.json" ] || curl -fsSL -o "$SPECS/telnyx.json" "https://raw.githubusercontent.com/team-telnyx/openapi/$TELNYX_COMMIT/openapi/spec3.json"
[ -f "$SPECS/meta.yaml" ] || curl -fsSL -o "$SPECS/meta.yaml" "https://raw.githubusercontent.com/facebook/openapi/$META_COMMIT/business-messaging-api_v23.0.yaml"
echo "$TELNYX_SHA256  $SPECS/telnyx.json" | sha256sum -c --quiet - || { echo "✗ la especificación de Telnyx no es la fijada ($TELNYX_COMMIT)" >&2; exit 1; }
echo "$META_SHA256  $SPECS/meta.yaml" | sha256sum -c --quiet - || { echo "✗ la especificación de Meta no es la fijada ($META_COMMIT)" >&2; exit 1; }
python3 -I -c 'import sys, json, yaml; json.dump(yaml.safe_load(open(sys.argv[1])), open(sys.argv[2], "w"))' "$SPECS/meta.yaml" "$T/meta.json"
cp "$RAIZ/apps/web/lib/compa/canales-proveedor.ts" "$T/src/compa/"
echo 'module.exports = {};' > "$T/node_modules/server-only/index.js"
(cd "$RAIZ/apps/web" && npx tsc --outDir "$T/out" --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck --types node --rootDir "$T/src" "$T/src/compa/canales-proveedor.ts" > /dev/null) || true
test -f "$T/out/compa/canales-proveedor.js"
CONTRATO_OUT="$T/out" TELNYX_SPEC="$SPECS/telnyx.json" META_SPEC="$T/meta.json" NODE_PATH="$T/node_modules" node "$RAIZ/scripts/contrato-canales/prueba.cjs"
