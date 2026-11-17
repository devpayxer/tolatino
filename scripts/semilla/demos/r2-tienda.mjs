#!/usr/bin/env node
/* Ronda 2 · Tiendas (NEG-TIENDA): todas las subcategorías salvo las 5 principales de la ronda 1 (06–52 = 47 × 10 negocios, 2 por ciudad).
   Uso: node scripts/semilla/demos/r2-tienda.mjs  →  infra/pruebas/demos/demo-x-tienda.sql
   Determinista, sin red ni base; una transacción, llaves fijas y «on conflict do nothing». SOLO SANDBOX.
   Reservas: dueños +14845553600–4199 · clientes +17175551800–2099 · operaciones A-27000000… */
import { writeFileSync, mkdirSync } from "node:fs";
import { q } from "./a/comun.mjs";
import { HEAD, FUNCIONES, bloqueNegocio } from "./a/sql.mjs";
import { generarTienda, CLIENTES_SQL2 } from "./r2-tienda/gen.mjs";

const RAIZ = new URL("../../..", import.meta.url).pathname;
const SALIDA = RAIZ + "infra/pruebas/demos/";
mkdirSync(SALIDA, { recursive: true });
const jsonSql = (o) => `$j$${JSON.stringify(o).replace(/\$j\$/g, "")}$j$::jsonb`;

const negocios = generarTienda();
const ids = negocios.map((b) => b.id);
const lista = `array[${ids.map(q).join(",")}]::text[]`;
let sql = HEAD("Demo X · Tiendas (NEG-TIENDA), subcategorías 06–52: 470 negocios") + CLIENTES_SQL2() + FUNCIONES;
for (const b of negocios) sql += bloqueNegocio(b, b.sqlExtra ?? "");
sql += `create temp table da_it on commit drop as
  select business_id as biz, (row_number() over (partition by business_id order by id))::int as ord, id, name, price_cents, tax_pct
    from items where business_id = any(${lista}) and module = 'shop' and removed_at is null and not is_extra;
create temp table da_var on commit drop as
  select i.biz, i.ord, v.id, v.label from da_it i join item_variants v on v.item_id = i.id and v.removed_at is null;
`;
for (const b of negocios) {
  const h = b.hist;
  sql += `do $$ begin perform pg_temp.da_hold(${q(b.id)}, ${jsonSql(h.ops)}); perform pg_temp.da_reviews(${q(b.id)}, ${jsonSql(h.reviews)});
  perform pg_temp.da_posts(${q(b.id)}, ${jsonSql(h.posts)}); perform pg_temp.da_follows(${q(b.id)}, ${b.fol.st}, ${b.fol.n}, ${b.fol.stp}, 3000); end $$;\n`;
}
sql += `-- Derivados con las funciones de la propia app (nunca a mano).
do $$ begin perform reviews_stats(id) from businesses where id = any(${lista}); end $$;
update business_stats_cache s set profile_strength = perfil_fuerza(s.business_id) where s.business_id = any(${lista});
commit;
`;
writeFileSync(SALIDA + "demo-x-tienda.sql", sql);
const sum = (f) => negocios.reduce((s, b) => s + f(b), 0);
console.log(`demo-x-tienda.sql: ${negocios.length} negocios · ${sum((b) => b.flat.length)} artículos · ${sum((b) => b.hist.ops.length)} operaciones · ${sum((b) => b.hist.reviews.length)} reseñas · ${sum((b) => b.hist.posts.length)} novedades · ${(sql.length / 1048576).toFixed(2)} MB`);
