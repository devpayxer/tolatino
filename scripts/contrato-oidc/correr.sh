#!/usr/bin/env bash
# Contrato del OIDC de GitHub — bloque 8h. Compila el código REAL de lib/tiendas/oidc.ts aparte y lo corre: (1) siempre, con tokens firmados por
# una llave RSA de PRUEBA hecha en el momento que imita la de GitHub (scripts/tiendas-sim/github.cjs): cada rechazo con su motivo; (2) dentro del
# CI de las tiendas (CONTRATO_OIDC_REAL=1, permiso id-token: write), con el token REAL de GitHub contra su JWKS REAL. El token no sale del runner
# ni se imprime (se enmascara); solo se dice qué claim pasó.
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
T="$(mktemp -d)"
trap 'rm -rf -- "$T"' EXIT
mkdir -p "$T/src" "$T/node_modules/server-only"
cp "$RAIZ"/apps/web/lib/tiendas/oidc.ts "$T/src/"
echo 'module.exports = {};' > "$T/node_modules/server-only/index.js"
(cd "$RAIZ/apps/web" && npx tsc --outDir "$T/out" --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck --types node --rootDir "$T/src" "$T"/src/*.ts > /dev/null) || true
test -f "$T/out/oidc.js"
CONTRATO_OUT="$T/out" NODE_PATH="$T/node_modules" node "$RAIZ/scripts/contrato-oidc/prueba.cjs"
