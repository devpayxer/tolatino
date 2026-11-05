#!/usr/bin/env node
/* Semilla del SANDBOX (decisión I): negocios del prototipo → SQL idempotente.
   Entrada: infra/pruebas/semilla/negocios.json (sacado del prototipo con scripts/semilla/extraer-prototipo.cjs).
   Salida:  infra/pruebas/semilla/0001_negocios.sql. Solo lo aplica infra/pruebas/deploy.sh; nunca producción.
   Teléfonos: rango 555-01xx (ficción, no timbra a nadie). Todo queda marcado is_demo = true. */
import { readFileSync, writeFileSync } from "node:fs";
const RAIZ = new URL("../..", import.meta.url).pathname;
const N = JSON.parse(readFileSync(RAIZ + "infra/pruebas/semilla/negocios.json", "utf8"));
const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const j = (o) => `${q(JSON.stringify(o))}::jsonb`;
const arr = (a) => `array[${(a || []).map(q).join(",")}]::text[]`;
let sql = `-- GENERADO por scripts/semilla/generar-sql.mjs — semilla SOLO del sandbox (decisión I). No editar a mano.
begin;
`;
for (const b of N) {
  const geo = b.geo ? `st_geogfromtext('POINT(${b.geo[1]} ${b.geo[0]})')` : "null";
  sql += `insert into businesses (id, city_id, category_id, subcategory_ids, name, status, origin, address, geo, phone, founded_year, filter_values, category_attrs, is_demo)
values (${q(b.id)}, 'hzl', ${q(b.category_id)}, ${arr(b.subcategory_ids)}, ${q(b.name)}, 'active', 'self', ${q(b.address)}, ${geo}, ${q(b.phone)}, ${b.founded_year ?? "null"}, ${arr(b.filter_values)}, ${j(b.category_attrs)}, true)
on conflict (id) do update set category_id = excluded.category_id, subcategory_ids = excluded.subcategory_ids, name = excluded.name, address = excluded.address,
  geo = excluded.geo, phone = excluded.phone, founded_year = excluded.founded_year, filter_values = excluded.filter_values, category_attrs = excluded.category_attrs;
insert into business_stats_cache (business_id, plan, verified, rating_avg, review_count, photo_count)
values (${q(b.id)}, ${q(b.plan)}, ${b.verified}, ${b.rating_avg ?? "null"}, ${b.review_count ?? 0}, ${b.photos.length})
on conflict (business_id) do update set plan = excluded.plan, verified = excluded.verified, rating_avg = excluded.rating_avg, review_count = excluded.review_count, photo_count = excluded.photo_count, updated_at = now();
delete from business_hours where business_id = ${q(b.id)};
${b.hours.map((h) => `insert into business_hours (business_id, weekday, open, ranges) values (${q(b.id)}, ${h.weekday}, ${h.open}, ${j(h.ranges)});`).join("\n")}
delete from media where owner_kind = 'business' and owner_id = ${q(b.id)} and uploaded_by is null;
${b.photos.map((u, i) => `insert into media (owner_kind, owner_id, url, credit, sort) values ('business', ${q(b.id)}, ${q(u)}, 'Pexels', ${i});`).join("\n")}
`;
}
sql += "commit;\n";
writeFileSync(RAIZ + "infra/pruebas/semilla/0001_negocios.sql", sql);
console.log(`semilla: ${N.length} negocios · ${(sql.length / 1024).toFixed(0)} KB`);
