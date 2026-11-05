#!/usr/bin/env node
/* packages/taxonomy/paginas.json (sacado del prototipo con scripts/catalogo/extraer-paginas.cjs) →
   packages/db/seeds/paginas.sql: configuración real del producto (va a pruebas y a producción).
   Repetible: actualiza `categories.page` y los textos/orden de `filter_options`; nunca toca `active` ni `page_admin`
   (lo que el Super Admin apagó o editó se respeta). Los grupos de «Ordenar» no son filtros: viven en el código. */
import { readFileSync, writeFileSync } from "node:fs";
const RAIZ = new URL("../..", import.meta.url).pathname;
const P = JSON.parse(readFileSync(RAIZ + "packages/taxonomy/paginas.json", "utf8"));
const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const j = (o) => `${q(JSON.stringify(o))}::jsonb`;
let sql = `-- GENERADO por scripts/catalogo/generar-paginas-sql.mjs desde packages/taxonomy/paginas.json. No editar a mano.
begin;
`;
for (const c of P) {
  const { groups, ...page } = c;
  delete page.id;
  page.quick5 = c.quick5.map((x) => ({ key: x.key, icon: x.icon }));
  sql += `update categories set page = ${j(page)}, updated_at = now() where id = ${q(c.id)};\n`;
  const icon = Object.fromEntries(c.quick5.map((x) => [x.key, x.icon]));
  let n = 0;
  for (const g of groups.filter((g) => g.kind !== "sort")) {
    for (const o of g.options) {
      n++;
      sql += `insert into filter_options (category_id, group_key, group_label, key, label, quick, sort, icon) values (${q(c.id)}, ${q(g.key)}, ${j(g.title)}, ${q(o.key)}, ${j(o.label)}, ${o.key in icon}, ${n}, ${q(icon[o.key] ?? null)})
on conflict (category_id, group_key, key) do update set group_label = excluded.group_label, label = excluded.label, quick = excluded.quick, sort = excluded.sort, icon = excluded.icon;\n`;
    }
  }
}
sql += "commit;\n";
writeFileSync(RAIZ + "packages/db/seeds/paginas.sql", sql);
console.log(`paginas.sql: ${P.length} categorías · ${(sql.length / 1024).toFixed(0)} KB`);
