// NEG-FE ronda 2: las subcategorías 06..43 de Iglesias y Religión (10 negocios cada una, 2 por ciudad) con su historia.
// Uso: node scripts/semilla/demos/r2-fe.mjs  →  infra/pruebas/demos/demo-x-fe.sql (determinista, sin red, sin base de datos). SOLO SANDBOX.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sqlComun } from "./d/comun.mjs";
import { generar } from "./r2-fe/gen.mjs";

const aqui = dirname(fileURLToPath(import.meta.url)), salida = join(aqui, "..", "..", "..", "infra", "pruebas", "demos");
mkdirSync(salida, { recursive: true });
const g = generar();
const sql = sqlComun(g.cat, g.negocios, g.ops, g.extra, g.after).replace("del grupo D", "de la ronda 2 (Iglesias, subcategorías 06..43)").replace("scripts/semilla/demos/grupo-d.mjs", "scripts/semilla/demos/r2-fe.mjs");
writeFileSync(join(salida, g.file), sql);
const rev = g.ops.filter((o) => o.review).length;
console.log(`${g.file}: ${g.negocios.length} negocios, ${g.negocios.reduce((a, b) => a + b.items.length, 0)} servicios, ${g.ops.length} operaciones, ${rev + g.vis} reseñas (${g.vis} de visitante), ${g.grupos.length} grupos, ${g.negocios.reduce((a, b) => a + b.posts.length, 0)} novedades, ${(sql.length / 1e6).toFixed(2)} MB`);
