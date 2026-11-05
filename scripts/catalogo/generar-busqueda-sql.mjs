#!/usr/bin/env node
/* packages/taxonomy/busqueda.json → packages/db/seeds/busqueda.sql: sinónimos y frases de intención en `synonyms`
   (configuración real del producto; va también a producción). Repetible: inserta lo nuevo y nunca toca `active`
   (lo que el Super Admin apague sigue apagado). Las palabras vacías, etiquetas y ejemplos se leen del JSON en el código. */
import { readFileSync, writeFileSync } from "node:fs";
const RAIZ = new URL("../..", import.meta.url).pathname;
const B = JSON.parse(readFileSync(RAIZ + "packages/taxonomy/busqueda.json", "utf8"));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const filas = [];
for (const s of B.sinonimos) for (const t of s.targets) filas.push([s.term, "query", t]);
for (const f of B.frases) filas.push([f.term, "query", f.target]);
for (const i of B.intenciones) for (const f of i.frases) filas.push([f, "filter", i.key]);
let sql = `-- GENERADO por scripts/catalogo/generar-busqueda-sql.mjs desde packages/taxonomy/busqueda.json. No editar a mano.
begin;
`;
for (const [term, kind, target] of filas)
  sql += `insert into synonyms (term, lang, target_kind, target, created_by) values (${q(term)}, 'es', '${kind}', ${q(target)}, 'semilla') on conflict (term, lang, target_kind, target) do nothing;\n`;
sql += "select refrescar_busqueda();\ncommit;\n";
writeFileSync(RAIZ + "packages/db/seeds/busqueda.sql", sql);
// Lo que el motor necesita en código: palabras vacías, etiquetas de cada intención (y si aplica a negocios, eventos u orden)
// y los ejemplos de «Pregunta como hablas».
writeFileSync(RAIZ + "apps/web/lib/busqueda-datos.json", JSON.stringify({
  vacias: B.vacias, intenciones: B.intenciones.map(({ key, label, tipo }) => ({ key, label, tipo })), ejemplos: B.ejemplos,
}, null, 1) + "\n");
console.log(`busqueda.sql: ${filas.length} filas`);
