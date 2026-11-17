// Ronda 2 · NEG-FIESTA: todas las subcategorías menos las 5 primeras (ya hechas en la ronda 1, grupo D), 10 negocios cada una (2 por ciudad).
// Uso: node scripts/semilla/demos/r2-fiesta.mjs  →  infra/pruebas/demos/demo-x-fiesta.sql (determinista, sin red, sin base de datos).
// Teléfonos reservados: dueños +14845557200–7799, clientes +17175553600–3899; números de operación F-33000001 en adelante.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generar, sqlDe, SUBS } from "./r2-fiesta/motor.mjs";

const aqui = dirname(fileURLToPath(import.meta.url)), salida = join(aqui, "..", "..", "..", "infra", "pruebas", "demos");
mkdirSync(salida, { recursive: true });
const g = generar();
const sql = sqlDe(g);
writeFileSync(join(salida, g.file), sql);
const rev = g.ops.filter((o) => o.review).length;
console.log(`${g.file}: ${SUBS.length} subcategorías, ${g.negocios.length} negocios, ${g.negocios.reduce((a, b) => a + b.items.length, 0)} servicios, ${g.ops.length} operaciones, ${rev} reseñas, ${g.negocios.reduce((a, b) => a + b.posts.length, 0)} novedades, ${(sql.length / 1e6).toFixed(2)} MB`);
