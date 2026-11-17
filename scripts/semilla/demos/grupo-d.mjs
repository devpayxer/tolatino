// Grupo D del reparto de negocios demo: Fiestas, Transporte, Educación, Niños e Iglesias (5 subcategorías × 10 negocios cada una).
// Uso: node scripts/semilla/demos/grupo-d.mjs [fiesta|trans|edu|ninos|fe ...]  →  infra/pruebas/demos/demo-d-<categoria>.sql (determinista).
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sqlComun } from "./d/comun.mjs";

const aqui = dirname(fileURLToPath(import.meta.url)), salida = join(aqui, "..", "..", "..", "infra", "pruebas", "demos");
const MODS = { fiesta: "./d/fiesta.mjs", trans: "./d/trans.mjs", edu: "./d/edu.mjs", ninos: "./d/ninos.mjs", fe: "./d/fe.mjs" };
const pedidas = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(MODS);
mkdirSync(salida, { recursive: true });
for (const k of pedidas) {
  const { generar } = await import(MODS[k]);
  const g = generar();
  const sql = sqlComun(g.cat, g.negocios, g.ops, g.extra, g.after || []);
  const f = join(salida, g.file);
  writeFileSync(f, sql);
  const rev = g.ops.filter((o) => o.review).length;
  console.log(`${g.file}: ${g.negocios.length} negocios, ${g.ops.length} operaciones, ${rev} reseñas, ${g.negocios.reduce((a, b) => a + b.posts.length, 0)} novedades, ${(sql.length / 1e6).toFixed(2)} MB`);
}
