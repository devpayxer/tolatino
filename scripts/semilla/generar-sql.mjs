#!/usr/bin/env node
/* Semilla del SANDBOX (decisión I): negocios del prototipo → SQL idempotente.
   Entrada: infra/pruebas/semilla/negocios.json (sacado del prototipo con scripts/semilla/extraer-prototipo.cjs).
   Salida:  infra/pruebas/semilla/0001_negocios.sql. Solo lo aplica infra/pruebas/deploy.sh; nunca producción.
   Teléfonos: rango 555-01xx (ficción, no timbra a nadie). Todo queda marcado is_demo = true.
   ★ y número de reseñas: no se siembran; salen de las reseñas reales (reviews_stats, 0007_resenas.sql). */
import { readFileSync, writeFileSync } from "node:fs";
const RAIZ = new URL("../..", import.meta.url).pathname;
const N = JSON.parse(readFileSync(RAIZ + "infra/pruebas/semilla/negocios.json", "utf8"));
const ENL = JSON.parse(readFileSync(RAIZ + "infra/pruebas/semilla/enlaces.json", "utf8"));
const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const j = (o) => `${q(JSON.stringify(o))}::jsonb`;
const arr = (a) => `array[${(a || []).map(q).join(",")}]::text[]`;
let sql = `-- GENERADO por scripts/semilla/generar-sql.mjs — semilla SOLO del sandbox (decisión I). No editar a mano.
begin;
`;
for (const b of N) {
  const geo = b.geo ? `st_geogfromtext('POINT(${b.geo[1]} ${b.geo[0]})')` : "null";
  sql += `insert into businesses (id, city_id, category_id, subcategory_ids, name, status, origin, address, geo, phone, founded_year, about, filter_values, category_attrs, service_radius_mi, works_from_home, is_demo)
values (${q(b.id)}, 'hzl', ${q(b.category_id)}, ${arr(b.subcategory_ids)}, ${q(b.name)}, 'active', 'self', ${q(b.address)}, ${geo}, ${q(b.phone)}, ${b.founded_year ?? "null"}, ${b.about ? j(b.about) : "null"}, ${arr(b.filter_values)}, ${j(b.category_attrs)}, ${b.service_radius_mi ?? "null"}, ${!!b.works_from_home}, true)
on conflict (id) do update set category_id = excluded.category_id, subcategory_ids = excluded.subcategory_ids, name = excluded.name, address = excluded.address,
  geo = excluded.geo, phone = excluded.phone, founded_year = excluded.founded_year, about = excluded.about, filter_values = excluded.filter_values, category_attrs = excluded.category_attrs,
  service_radius_mi = excluded.service_radius_mi, works_from_home = excluded.works_from_home;
insert into business_stats_cache (business_id, plan, verified, photo_count)
values (${q(b.id)}, ${q(b.plan)}, ${b.verified}, ${b.photos.length})
on conflict (business_id) do update set plan = excluded.plan, verified = excluded.verified, photo_count = excluded.photo_count, updated_at = now();
delete from business_hours where business_id = ${q(b.id)};
${b.hours.map((h) => `insert into business_hours (business_id, weekday, open, ranges) values (${q(b.id)}, ${h.weekday}, ${h.open}, ${j(h.ranges)});`).join("\n")}
${b.photos.map((u, i) => `insert into media (id, owner_kind, owner_id, url, credit, sort) values (md5(${q(`semilla:${b.id}:${i}`)})::uuid, 'business', ${q(b.id)}, ${q(u)}, 'Pexels', ${i})
on conflict (id) do update set url = excluded.url, credit = excluded.credit, sort = excluded.sort;`).join("\n")}
update media set status = 'removed', removed_reason = 'semilla: ya no está en el prototipo'
 where owner_kind = 'business' and owner_id = ${q(b.id)} and uploaded_by is null and status = 'visible'
   and id <> all(array[${b.photos.map((_, i) => `md5(${q(`semilla:${b.id}:${i}`)})::uuid`).join(",")}]::uuid[]);
delete from faqs where business_id = ${q(b.id)};
${(b.faqs || []).map((f, i) => `insert into faqs (business_id, question, answer, sort) values (${q(b.id)}, ${j(f.q)}, ${j(f.a)}, ${i});`).join("\n")}
`;
}
for (const e of ENL) {
  sql += `insert into business_links (a_id, b_id, kind, note_a, note_b, status, answered_at) values (${q(e.a)}, ${q(e.b)}, ${q(e.kind)}, ${e.note_a ? j(e.note_a) : "null"}, ${e.note_b ? j(e.note_b) : "null"}, 'ok', now())
on conflict (a_id, b_id) do update set kind = excluded.kind, note_a = excluded.note_a, note_b = excluded.note_b, status = 'ok';\n`;
}
sql += "commit;\n";
writeFileSync(RAIZ + "infra/pruebas/semilla/0001_negocios.sql", sql);
console.log(`semilla: ${N.length} negocios · ${(sql.length / 1024).toFixed(0)} KB`);
