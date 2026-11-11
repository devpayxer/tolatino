#!/usr/bin/env bash
# Contrato con Stripe (bloque 2d): compila la pasarela real (apps/web/lib/pagos) aparte, con dos reemplazos mínimos
# (la base y el entorno no se usan en modo Stripe), y la corre contra stripe-mock, que valida cada llamada contra la
# especificación oficial de la API. Uso: stripe-mock en 127.0.0.1:12111 (o STRIPE_API_BASE) y luego este script.
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
T="$(mktemp -d)"
trap 'rm -rf -- "$T"' EXIT
mkdir -p "$T/src/pagos" "$T/node_modules/server-only"
cp "$RAIZ/apps/web/lib/pagos/stripe.ts" "$RAIZ/apps/web/lib/pagos/pasarela.ts" "$T/src/pagos/"
echo 'module.exports = {};' > "$T/node_modules/server-only/index.js"
printf 'export const db = (): { query: (q: string, v?: unknown[]) => Promise<{ rows: any[]; rowCount: number }> } => { throw new Error("sin base en el contrato"); };\nexport const tx = db;\n' > "$T/src/db.ts"
printf 'export const ENTORNO = "pruebas" as string;\n' > "$T/src/entorno.ts"
# 8i · La pasarela pregunta antes de cobrar si quien paga es una cuenta de revisión (lib/tiendas/revision.ts, con la base y la sesión): en el
# contrato no hay sesión, así que nadie lo es.
mkdir -p "$T/src/tiendas" && printf 'export const pagoBloqueado = async (): Promise<{ es: string; en: string } | null> => null;\n' > "$T/src/tiendas/revision.ts"
# tsc emite aunque los reemplazos no tipen perfecto; el código bajo prueba es el real.
(cd "$RAIZ/apps/web" && npx tsc --outDir "$T/out" --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck --types node --rootDir "$T/src" "$T/src/pagos/pasarela.ts" > /dev/null) || true
test -f "$T/out/pagos/pasarela.js"
CONTRATO_OUT="$T/out" NODE_PATH="$T/node_modules" node "$RAIZ/scripts/contrato-stripe/prueba.cjs"
