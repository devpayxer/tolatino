/* 9b-3 · La carga mide el código REAL de la app (no una copia de sus consultas): carga los módulos de apps/web/lib con jiti (TypeScript sin
   compilar; viene con las dependencias de Tailwind), con «server-only» vacío y «@/» → apps/web. Así lo que se mide es lo que corre en producción
   y no se desvía cuando la consulta cambia. Nada de esto se sirve: es solo de la carga. */
import { createRequire } from "node:module";
import { readdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const WEB = join(RAIZ, "apps/web");

function cargarJiti() {
  const pnpm = join(RAIZ, "node_modules/.pnpm");
  const dir = readdirSync(pnpm).filter((d) => /^jiti@\d/.test(d)).sort().at(-1);
  if (!dir) throw new Error("falta jiti (pnpm install en la raíz)");
  return createRequire(join(pnpm, dir, "node_modules/jiti/package.json"))("jiti");
}

let jiti = null;
/* Importa un archivo de apps/web (p. ej. "lib/comunidad.ts"). */
export async function app(ruta) {
  if (!jiti) {
    const vacio = join(mkdtempSync(join(tmpdir(), "carga-")), "vacio.cjs");
    writeFileSync(vacio, "module.exports = {};\n");
    const { createJiti } = cargarJiti();
    jiti = createJiti(join(WEB, "package.json"), { alias: { "server-only": vacio, "@/": `${WEB}/`, "@": WEB }, interopDefault: true, moduleCache: true, fsCache: false });
  }
  return jiti.import(join(WEB, ruta));
}
