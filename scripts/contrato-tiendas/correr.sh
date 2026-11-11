#!/usr/bin/env bash
# Contrato de las tiendas — bloque 8f (8h lo amplía). Compila el código REAL de lib/tiendas/asc.ts aparte y lo corre contra el simulador de
# scripts/tiendas-sim, que valida cada pedido contra scripts/contrato-tiendas/asc.json (sacado de la especificación OpenAPI de App Store Connect,
# versión 4.6, sha256 adentro; se rehace con extraer-asc.mjs). Y comprueba en el documento de descubrimiento OFICIAL de la API de Google Play
# (googleapis, fijado a un commit) que los testers de una pista solo se agregan por Grupos de Google (por eso Play interno queda «en Play Console»).
# Necesita red para bajar el documento de Google (o CONTRATO_SPECS con androidpublisher-v3.json ya bajado).
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
T="$(mktemp -d)"
trap 'rm -rf -- "$T"' EXIT
SPECS="${CONTRATO_SPECS:-$T/specs}"
GOOGLE_COMMIT=be503e8963ac11ca328020a6a42316b00b3d8601
mkdir -p "$SPECS" "$T/src" "$T/node_modules/server-only"
[ -f "$SPECS/androidpublisher-v3.json" ] || curl -fsSL -o "$SPECS/androidpublisher-v3.json" "https://raw.githubusercontent.com/googleapis/google-api-go-client/$GOOGLE_COMMIT/androidpublisher/v3/androidpublisher-api.json"
cp "$RAIZ"/apps/web/lib/tiendas/asc.ts "$T/src/"
echo 'module.exports = {};' > "$T/node_modules/server-only/index.js"
(cd "$RAIZ/apps/web" && npx tsc --outDir "$T/out" --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck --types node --rootDir "$T/src" "$T"/src/*.ts > /dev/null) || true
test -f "$T/out/asc.js"
CONTRATO_OUT="$T/out" PLAY_SPEC="$SPECS/androidpublisher-v3.json" NODE_PATH="$T/node_modules" node "$RAIZ/scripts/contrato-tiendas/prueba.cjs"
