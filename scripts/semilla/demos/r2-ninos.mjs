// Ronda 2 · NEG-NINOS: las 30 subcategorías que faltan (06 a 35), 10 negocios cada una (2 por ciudad). SOLO SANDBOX.
// Uso: node scripts/semilla/demos/r2-ninos.mjs  →  infra/pruebas/demos/demo-x-ninos.sql (determinista, idempotente).
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sqlComun } from "./d/comun.mjs";
import { generar } from "./r2-ninos/armar.mjs";

const aqui = dirname(fileURLToPath(import.meta.url)), salida = join(aqui, "..", "..", "..", "infra", "pruebas", "demos");
mkdirSync(salida, { recursive: true });
const g = generar();
const sql = sqlComun(g.cat, g.negocios, g.ops, g.extra, g.after || []).replace("Negocios demo del grupo D", "Negocios demo de la ronda 2").replace("scripts/semilla/demos/grupo-d.mjs", "scripts/semilla/demos/r2-ninos.mjs");
writeFileSync(join(salida, g.file), sql);
const rev = g.ops.filter((o) => o.review).length;
console.log(`${g.file}: ${g.negocios.length} negocios, ${g.negocios.reduce((a, b) => a + b.items.length, 0)} servicios, ${g.ops.length} operaciones, ${rev} reseñas de operaciones, ${g.negocios.reduce((a, b) => a + b.posts.length, 0)} novedades, ${(sql.length / 1e6).toFixed(2)} MB`);
