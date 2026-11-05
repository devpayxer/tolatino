#!/usr/bin/env node
/* apps/web/lib/onb/datos.ts (TLOnbNeg, portado del prototipo) → packages/db/seeds/amenidades.sql.
   «Lo que hay en tu negocio» (Quiénes somos · EN TU NEGOCIO y Publica tu negocio): las generales (AMEN) + las de cada
   categoría (CFG[cat].amen). En la base se guarda una CLAVE estable (no la etiqueta en español): la clave sale del texto
   en español sin acentos (`clave()`, la misma función en apps/web/lib/amenidades.ts). Repetible. */
import { readFileSync, writeFileSync } from "node:fs";
const RAIZ = new URL("../..", import.meta.url).pathname;
const src = readFileSync(RAIZ + "apps/web/lib/onb/datos.ts", "utf8").replace(/^export const .*$/gm, "");
const window = new Function(`${src}; return window;`)();
const N = window.TLOnbNeg;
export const clave = (es) => es.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const m = new Map();
for (const a of N.AMEN) m.set(clave(a[1]), { icon: a[0], es: a[1], en: a[2], cats: [] });
for (const [cat, c] of Object.entries(N.CFG)) for (const a of c.amen || []) {
  const k = clave(a[1]);
  const x = m.get(k) ?? { icon: a[0], es: a[1], en: a[2], cats: [] };
  if (!x.general) x.cats.push(cat);
  m.set(k, x);
}
for (const a of N.AMEN) m.get(clave(a[1])).general = true;
let sql = `-- GENERADO por scripts/catalogo/generar-amenidades-sql.mjs desde apps/web/lib/onb/datos.ts. No editar a mano.
-- categories vacío = sirve para todas las categorías.
begin;
`;
let i = 0;
for (const [k, x] of m) sql += `insert into amenities (key, icon, label, categories, sort) values (${q(k)}, ${q(x.icon)}, ${q(JSON.stringify({ es: x.es, en: x.en }))}::jsonb, ${q(`{${x.general ? "" : [...new Set(x.cats)].join(",")}}`)}, ${++i})
on conflict (key) do update set icon = excluded.icon, label = excluded.label, categories = excluded.categories, sort = excluded.sort;\n`;
/* Lo que Publica guardó antes con la etiqueta en español pasa a la clave (una vez; lo que ya es clave no cambia). */
sql += `update businesses b set amenities = (select coalesce(array_agg(coalesce(a.key, x) order by o), '{}') from unnest(b.amenities) with ordinality u(x, o) left join amenities a on a.label->>'es' = x)
 where exists (select 1 from unnest(b.amenities) x join amenities a on a.label->>'es' = x);
commit;
`;
writeFileSync(RAIZ + "packages/db/seeds/amenidades.sql", sql);
console.log(`amenidades: ${m.size}`);
