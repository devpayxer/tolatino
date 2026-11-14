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
# 9k (L817) · Un doble de la base para lo que la pasarela lee y escribe en modo Stripe: el cliente de Stripe de una persona (users.stripe_customer_id).
# Cualquier otra consulta falla en voz alta: el contrato no tapa lo que no conoce.
cat > "$T/src/db.ts" <<'TS'
const clientes = new Map<string, string | null>();
type R = { rows: any[]; rowCount: number };
const q = async (sql: string, v: unknown[] = []): Promise<R> => {
  if (/^select stripe_customer_id as c from users where id = \$1$/.test(sql.trim())) return { rows: [{ c: clientes.get(String(v[0])) ?? null }], rowCount: 1 };
  if (/^update users set stripe_customer_id = \$2 where id = \$1 and stripe_customer_id is null$/.test(sql.trim())) {
    if (clientes.get(String(v[0]))) return { rows: [], rowCount: 0 };
    clientes.set(String(v[0]), String(v[1])); return { rows: [], rowCount: 1 };
  }
  throw new Error("sin base en el contrato: " + sql.slice(0, 80));
};
export const db = () => ({ query: q, connect: async () => ({ query: q, release: () => undefined }) });
export const tx = async <T,>(f: (c: { query: typeof q }) => Promise<T>) => f({ query: q });
export const __clientes = clientes;
TS
printf 'export const ENTORNO = "pruebas" as string;\n' > "$T/src/entorno.ts"
# 8i · La pasarela pregunta antes de cobrar si quien paga es una cuenta de revisión (lib/tiendas/revision.ts, con la base y la sesión): en el
# contrato no hay sesión, así que nadie lo es.
mkdir -p "$T/src/tiendas" && printf 'export const pagoBloqueado = async (): Promise<{ es: string; en: string } | null> => null;\n' > "$T/src/tiendas/revision.ts"
# tsc emite aunque los reemplazos no tipen perfecto; el código bajo prueba es el real.
(cd "$RAIZ/apps/web" && npx tsc --outDir "$T/out" --module commonjs --target es2022 --moduleResolution node --esModuleInterop --skipLibCheck --types node --rootDir "$T/src" "$T/src/pagos/pasarela.ts" > /dev/null) || true
test -f "$T/out/pagos/pasarela.js"
CONTRATO_OUT="$T/out" NODE_PATH="$T/node_modules" node "$RAIZ/scripts/contrato-stripe/prueba.cjs"
