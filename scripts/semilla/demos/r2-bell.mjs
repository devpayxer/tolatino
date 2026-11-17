#!/usr/bin/env node
/* Demo ronda 2 · Belleza (NEG-BELL): las 35 subcategorías que NO hizo la ronda 1 (06–40), 10 negocios cada una (2 por ciudad) = 350 negocios Pro.
   32 de servicios (citas, equipo, historia) con las piezas de la ronda 1 del grupo B, y 3 de tienda (37 vitaminas, 38 naturales y herbales, 39 belleza)
   con las piezas del grupo A (apartado). Rangos reservados (todo ficticio, solo sandbox): dueños +1 484 555 0600–1199, clientes +1 717 555 0300–0599,
   operaciones C-22000000… (citas) y A-22500000… (apartados). Determinista; idempotente (llaves fijas, on conflict do nothing); nunca borra.
   Salida: infra/pruebas/demos/demo-x-bell.sql. Uso: node scripts/semilla/demos/r2-bell.mjs */
import { writeFileSync, mkdirSync } from "node:fs";
import { emitir } from "./b/sql.mjs";
import { reiniciarIds } from "./b/negocio.mjs";
import { slug } from "./b/comun.mjs";
import { SUBS } from "./r2-bell/subs.mjs";
import { construir } from "./r2-bell/build.mjs";
import { construirTienda } from "./r2-bell/tiendas.mjs";
import { FUNCIONES, bloqueNegocio } from "./a/sql.mjs";
import { q } from "./a/comun.mjs";

const RAIZ = new URL("../../..", import.meta.url).pathname;
const pad = (n) => String(n).padStart(4, "0");
const telDueno = (idx) => `+1484555${pad(600 + idx)}`;
const telCliente = (i) => `+1717555${pad(300 + i)}`;
const NUM_C = 22000000, NUM_A = 22500000;

reiniciarIds();
const B = [];
let opsC = 0;
SUBS.forEach((cfg, si) => {
  for (let k = 0; k < 10; k++) {
    const idx = si * 10 + k;
    const b = construir(cfg, si, k, idx);
    b.owner.phone = telDueno(idx);
    b.owner.email = `${slug(b.owner.fn)}.${slug(b.owner.ln)}.x${idx}@demo.example`;
    // los números de operación y las reseñas apuntan a un contador global (el número C-… sale de él)
    const base = opsC;
    b.ops.forEach((o) => { o.i += base; });
    b.reviews.forEach((r) => { r.op += base; });
    b.helpful.forEach((h) => { h.op += base; });
    opsC += b.ops.length;
    B.push(b);
  }
});
const TI = [];
let opsA = 0;
for (let si = 0; si < 3; si++) {
  for (let k = 0; k < 10; k++) {
    const idx = SUBS.length * 10 + si * 10 + k;
    const b = construirTienda(si, k, idx, opsA, (n) => `A-${NUM_A + n}`);
    b.owner.phone = telDueno(idx);
    opsA += b.hist.ops.length;
    TI.push(b);
  }
}
if (new Set([...B, ...TI].map((b) => b.id)).size !== B.length + TI.length) throw new Error("ids repetidos");

/* ── Parte 1: los 320 negocios de servicios, con el emisor de la ronda 1 y los rangos de esta ronda ── */
let sql = emitir("Demo X · Belleza (NEG-BELL) · ronda 2: 35 subcategorías × 10 negocios Pro", B);
const cuenta = (re) => (sql.match(re) ?? []).length;
const cambia = (de, a, min = 1) => { const n = cuenta(de); if (n < min) throw new Error(`no encontré ${de}`); sql = sql.replace(de, a); };
cambia(/\+1570555(8[2-4]\d\d)/g, (_, n) => telCliente(+n - 8250), 250);
cambia(/'C-' \|\| nextval\('operations_appt_seq'\)/g, `'C-' || (${NUM_C} + t.ord)`);
cambia(/demo-b:/g, "demo-x-bell:", 4);
cambia(/'demo-b-' \|\|/g, "'demo-x-bell-' ||");
cambia(/GENERADO por scripts\/semilla\/demos\/grupo-b\.mjs/, "GENERADO por scripts/semilla/demos/r2-bell.mjs");
const resto = sql.match(/.{40}\+1570555[89]\d\d\d.{20}/); if (resto) throw new Error("quedó un teléfono de la ronda 1: " + resto[0]);
if (/nextval\('operations_appt_seq'\)/.test(sql)) throw new Error("quedó un número de la secuencia");

/* ── Parte 2: las 30 tiendas (apartados) con las funciones del grupo A y los clientes de esta ronda ── */
const ids = TI.map((b) => b.id);
const jsonSql = (o) => `$j$${JSON.stringify(o)}$j$::jsonb`;
let tail = `
-- Tiendas de Belleza (37 vitaminas · 38 naturales y herbales · 39 productos de belleza): apartados con las funciones del grupo A.
set local statement_timeout = 0;
${FUNCIONES}
create temp table da_cli on commit drop as
  select (t.o - 1)::int as idx, u.id from jsonb_array_elements_text($j$${JSON.stringify(Array.from({ length: 247 }, (_, i) => telCliente(i)))}$j$::jsonb) with ordinality t(p, o) join users u on u.phone = t.p;
alter table da_cli add primary key (idx);
`;
for (const b of TI) tail += bloqueNegocio(b, b.sqlExtra);
tail += `create temp table da_it on commit drop as
  select business_id as biz, (row_number() over (partition by business_id order by id))::int as ord, id, name, price_cents, tax_pct
    from items where business_id = any(array[${ids.map(q).join(",")}]::text[]) and module = 'shop' and removed_at is null and not is_extra;
create temp table da_var on commit drop as
  select i.biz, i.ord, v.id, v.label from da_it i join item_variants v on v.item_id = i.id and v.removed_at is null;
`;
for (const b of TI) {
  const h = b.hist;
  tail += `do $$ begin perform pg_temp.da_hold(${q(b.id)}, ${jsonSql(h.ops)}); perform pg_temp.da_reviews(${q(b.id)}, ${jsonSql(h.reviews)});
  perform pg_temp.da_posts(${q(b.id)}, ${jsonSql(h.posts)}); perform pg_temp.da_follows(${q(b.id)}, ${b.fol.st}, ${b.fol.n}, ${b.fol.stp}, 3000); end $$;\n`;
}
tail += `do $$ begin perform reviews_stats(id) from businesses where id = any(array[${ids.map(q).join(",")}]::text[]); end $$;
update business_stats_cache s set profile_strength = perfil_fuerza(s.business_id) where s.business_id = any(array[${ids.map(q).join(",")}]::text[]);
commit;
`;
if (!/commit;\n$/.test(sql)) throw new Error("el emisor ya no termina en commit");
sql = sql.replace(/commit;\n$/, "") + tail;

mkdirSync(RAIZ + "infra/pruebas/demos/", { recursive: true });
writeFileSync(RAIZ + "infra/pruebas/demos/demo-x-bell.sql", sql);
const n = (L, f) => L.reduce((s, b) => s + f(b), 0);
console.log(`bell r2: ${B.length} negocios de servicios · ${n(B, (b) => b.items.length)} servicios · ${n(B, (b) => b.ops.length)} citas · ${n(B, (b) => b.reviews.length)} reseñas · ${n(B, (b) => b.posts.length)} novedades · ${n(B, (b) => b.follows.length)} seguidores`);
console.log(`        ${TI.length} tiendas · ${n(TI, (b) => b.flat.length)} artículos · ${n(TI, (b) => b.hist.ops.length)} apartados · ${n(TI, (b) => b.hist.reviews.length)} reseñas · ${n(TI, (b) => b.hist.posts.length)} novedades · ${(sql.length / 1048576).toFixed(1)} MB`);
