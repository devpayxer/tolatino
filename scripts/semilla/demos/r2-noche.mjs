#!/usr/bin/env node
/* Ronda 2 · Vida Nocturna (NEG-NOCHE): las 20 subcategorías que no hizo la ronda 1 (sort 6–25) × 10 negocios = 200 (2 por ciudad).
   Reutiliza por import las piezas de la ronda 1 (scripts/semilla/demos/a/): Pro, ficha, fotos, equipo, preguntas, reseñas con respuestas, novedades,
   seguidores, funciones temporales de «noche». Aparte: clientes (+1717555 2100…2346) y dueños (+1484555 4200…4399) propios; números N-28000000….
   Uso: node scripts/semilla/demos/r2-noche.mjs   →  infra/pruebas/demos/demo-x-noche.sql   Determinista; una transacción; llaves fijas; SOLO SANDBOX. */
import { writeFileSync, mkdirSync } from "node:fs";
import { q } from "./a/comun.mjs";
import { HEAD, FUNCIONES, bloqueNegocio } from "./a/sql.mjs";
import { CLIENTES_SQL2, FUNCION_VIS } from "./r2-noche/comun.mjs";
import { generarNocheR2 } from "./r2-noche/gen.mjs";

const RAIZ = new URL("../../..", import.meta.url).pathname;
const SALIDA = RAIZ + "infra/pruebas/demos/";
mkdirSync(SALIDA, { recursive: true });
const jsonSql = (o) => `$j$${JSON.stringify(o)}$j$::jsonb`;

const negocios = generarNocheR2();
const ids = negocios.map((b) => b.id);
let sql = HEAD("Demo X · Vida Nocturna (NEG-NOCHE), subcategorías 6 a 25: 200 negocios").replace("grupo-a.mjs", "r2-noche.mjs") + CLIENTES_SQL2() + FUNCIONES + FUNCION_VIS;
for (const b of negocios) sql += bloqueNegocio(b, b.sqlExtra ?? "");
sql += `create temp table da_it on commit drop as
  select business_id as biz, (row_number() over (partition by business_id order by id))::int as ord, id, name, price_cents, tax_pct
    from items where business_id = any(array[${ids.map(q).join(",")}]::text[]) and module = 'svc' and removed_at is null and not is_extra;
create temp table da_var on commit drop as
  select i.biz, i.ord, v.id, v.label from da_it i join item_variants v on v.item_id = i.id and v.removed_at is null;
`;
for (const b of negocios) {
  const h = b.hist;
  const calls = h.ops.length
    ? `perform pg_temp.da_night(${q(b.id)}, ${jsonSql(h.ops)}); perform pg_temp.da_reviews(${q(b.id)}, ${jsonSql(h.reviews)});`
    : `perform pg_temp.dr_vis(${q(b.id)}, ${jsonSql(h.reviews)});`;
  sql += `do $$ begin ${calls}
  perform pg_temp.da_posts(${q(b.id)}, ${jsonSql(h.posts)}); perform pg_temp.da_follows(${q(b.id)}, ${b.fol.st}, ${b.fol.n}, ${b.fol.stp}, 3000); end $$;\n`;
}
sql += `-- Derivados con las funciones de la propia app (nunca a mano).
do $$ begin perform reviews_stats(id) from businesses where id = any(array[${ids.map(q).join(",")}]::text[]); end $$;
update business_stats_cache s set profile_strength = perfil_fuerza(s.business_id) where s.business_id = any(array[${ids.map(q).join(",")}]::text[]);
commit;
`;
writeFileSync(SALIDA + "demo-x-noche.sql", sql);
const nops = negocios.reduce((s, b) => s + b.hist.ops.length, 0), nrev = negocios.reduce((s, b) => s + b.hist.reviews.length, 0), npost = negocios.reduce((s, b) => s + b.hist.posts.length, 0);
console.log(`demo-x-noche.sql: ${negocios.length} negocios · ${nops} operaciones · ${nrev} reseñas · ${npost} novedades · ${(sql.length / 1048576).toFixed(2)} MB`);
