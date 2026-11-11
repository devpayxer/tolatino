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
[ -f "$SPECS/telnyx.json" ] || curl -fsSL -o "$SPECS/telnyx.json" https://raw.githubusercontent.com/team-telnyx/openapi/master/openapi/spec3.json
[ -f "$SPECS/meta.yaml" ] || curl -fsSL -o "$SPECS/meta.yaml" https://raw.githubusercontent.com/facebook/openapi/main/business-messaging-api_v23.0.yaml
python3 -I -c 'import sys, json, yaml; json.dump(yaml.safe_load(open(sys.argv[1])), open(sys.argv[2], "w"))' "$SPECS/meta.yaml" "$T/meta.json"
cp "$RAIZ/apps/web/lib/compa/canales-proveedor.ts" "$T/src/compa/"
echo 'module.exports = {};' > "$T/node_modules/server-only/index.js"
(cd "$RAIZ/apps/web" && npx tsc --outDir "$T/out" --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck --types node --rootDir "$T/src" "$T/src/compa/canales-proveedor.ts" > /dev/null) || true
test -f "$T/out/compa/canales-proveedor.js"
CONTRATO_OUT="$T/out" TELNYX_SPEC="$SPECS/telnyx.json" META_SPEC="$T/meta.json" NODE_PATH="$T/node_modules" node "$RAIZ/scripts/contrato-canales/prueba.cjs"
