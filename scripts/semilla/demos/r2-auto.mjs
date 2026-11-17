#!/usr/bin/env node
/* Ronda 2 · Auto (NEG-AUTO): las 35 subcategorías que no cubrió la ronda 1 (06–40), 10 negocios cada una, 2 por ciudad = 350.
   Uso: node scripts/semilla/demos/r2-auto.mjs   →  infra/pruebas/demos/demo-x-auto.sql
   Determinista. Solo el sandbox (is_demo = true). Teléfonos de ficción: dueños +1 484 555 5400–5749, clientes +1 717 555 2700–2949,
   operaciones C-/A-/T- 30000001+. Reutiliza por importación los ayudantes de la ronda 1 (c/*.mjs). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { q, TA, slug } from "./c/base.mjs";
import { sqlNegocio, sqlOps, sqlResenas, sqlPosts, sqlSeguidores } from "./c/nucleo.mjs";
import { armarResenas, armarSeguidores, ok3, ok2, okm } from "./c/resenas.mjs";
import * as auto from "./c/auto.mjs";
import { SERV } from "./r2-auto/serv.mjs";
import { SUBS2 } from "./r2-auto/subs.mjs";
import { CLIENTES, especificar, planR2, historiaR2, renumerar, responderSiempre, CAT } from "./r2-auto/motor.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SALIDA = path.join(RAIZ, "infra/pruebas/demos");
// Identificadores ya tomados: semilla de siempre + ronda 1 (los nombres de Auto y lo ya generado, si está)
const existentes = [...fs.readFileSync(path.join(RAIZ, "infra/pruebas/semilla/0001_negocios.sql"), "utf8").matchAll(/^values \('([a-z0-9-]+)', '[a-z]{3}', 'NEG-/gm)].map((m) => m[1]);
for (const s of auto.SUBS) for (const n of s.negocios) existentes.push(slug(n));
if (fs.existsSync(SALIDA)) for (const f of fs.readdirSync(SALIDA)) if (f.endsWith(".sql") && f !== "demo-x-auto.sql") for (const m of fs.readFileSync(path.join(SALIDA, f), "utf8").matchAll(/declare b text := '([a-z0-9-]+)'/g)) existentes.push(m[1]);

// Comprobaciones de los datos de entrada
for (const S of SUBS2) {
  for (const k of [...S.base, ...S.resto]) if (!SERV[k]) throw new Error(`${S.id}: servicio desconocido ${k}`);
  if (S.nombres.length !== 10) throw new Error(`${S.id}: hacen falta 10 nombres`);
  if (S.faq.length !== 2 || !S.tienda.length) throw new Error(`${S.id}: faltan datos`);
}

const specs = especificar(SUBS2, existentes);
const ctx = { contador: { c: 1 } };
const trabajo = [];
for (const B of specs) {
  const plan = planR2(B);
  const { h, ex } = historiaR2(B, plan, ctx);
  trabajo.push({ B, plan, h, ex });
}
// Todo al rango de números propio (operaciones, eventos y SQL de apartados/rentas)
const filas = trabajo.flatMap((t) => [...t.h.filas, ...t.ex.filas]), evs = trabajo.flatMap((t) => [...t.h.eventos, ...t.ex.eventos]);
const extra = renumerar(filas, evs, trabajo.flatMap((t) => t.ex.sql ?? []));

const bloques = [], revs = [], posts = [], segs = [];
const cuenta = { negocios: 0, items: 0, ops: filas.length, resenas: 0, novedades: 0, seguidores: 0 };
const porSub = {};
for (const { B, plan, h } of trabajo) {
  bloques.push(sqlNegocio(B, plan));
  const rs = armarResenas("oficio", B, h.filas, {
    src: "cita", terminada: (f) => f.st === "done" && !f.sd && f.kind === "appointment",
    respuestas: (f, s) => ({ first: ok3(s), trato: ok3(s), ask: ok2(s), part: ok3(s), carro: okm(s) }),
    hechos: (f) => ({ ok: f.tot, cob: f.tot }),
  });
  const nombre = new Map(CLIENTES.map((c) => [c.tel, c.nombre]));
  responderSiempre(B, rs, nombre);
  revs.push(...rs);
  posts.push(sqlPosts(B, plan.posts));
  const sg = armarSeguidores({ ...B, size: Math.max(B.size, 0.85) }, h.clientes, CLIENTES);
  segs.push(sqlSeguidores(B, sg));
  cuenta.negocios++; cuenta.items += plan.secciones.reduce((n, s) => n + s.items.length, 0); cuenta.resenas += rs.length; cuenta.novedades += plan.posts.length; cuenta.seguidores += sg.length;
  porSub[B.sub] = (porSub[B.sub] ?? 0) + 1;
}

const ids = specs.map((s) => s.id);
const out = [`-- GENERADO por scripts/semilla/demos/r2-auto.mjs — Auto (ronda 2): 10 negocios en cada una de las subcategorías NEG-AUTO-06 a NEG-AUTO-40. SOLO SANDBOX (is_demo = true). No editar a mano.
-- Idempotente: llaves fijas (id del negocio, número de operación, md5 de cada fila) y «on conflict do nothing»; aplicarlo dos veces no cambia nada. Nada se borra.
-- Solo hechos base: ★, conteos y fuerza del perfil los recalculan al final las funciones de la base (reviews_stats, perfil_fuerza).
begin;
create or replace function pg_temp.c_ts(d int, m int) returns timestamptz language sql stable as $f$ select (((now() at time zone 'America/New_York')::date + d) + make_interval(mins => m)) at time zone 'America/New_York' $f$;`];
const vals = CLIENTES.map((c) => `(${q(c.tel)}, now() - interval '300 days', ${q(c.nombre)}, ${q(c.ap)}, ${q(c.lang)}, ${q(c.ciudad)})`);
for (let i = 0; i < vals.length; i += 130) out.push(`insert into users (phone, phone_verified_at, first_name, last_name, lang, home_city_id) values\n${vals.slice(i, i + 130).join(",\n")}\non conflict (phone) do nothing;`);
out.push(...bloques);
out.push(`drop table if exists _c_u; create temp table _c_u on commit drop as select phone, id from users where phone between '+17175552700' and '+17175552999';`);
out.push(`drop table if exists _c_own; create temp table _c_own on commit drop as select business_id, user_id from business_members where kind = 'owner' and business_id = any(${TA(ids)});`);
out.push(sqlOps(filas));
for (let i = 0; i < evs.length; i += 500) {
  const parte = evs.slice(i, i + 500).map((e) => `(${q(e.num)}, ${q(e.kind)}, ${q(e.actor)}, ${e.d}, ${e.m})`);
  out.push(`insert into operation_events (operation_id, at, kind, actor)\nselect o.id, pg_temp.c_ts(v.d, v.m), v.kind, v.actor from (values\n${parte.join(",\n")}) as v(num, kind, actor, d, m) join operations o on o.number = v.num\n where not exists (select 1 from operation_events e where e.operation_id = o.id);`);
}
out.push(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct)
select o.id, i.id, coalesce(i.name, jsonb_build_object('es', o.details#>>'{svc,es}', 'en', o.details#>>'{svc,en}')), 1, o.subtotal_cents, o.subtotal_cents, 0
  from operations o left join items i on i.business_id = o.business_id and i.module = 'svc' and i.removed_at is null and i.name->>'es' = o.details#>>'{svc,es}'
 where o.business_id = any(${TA(ids)}) and o.kind = 'appointment' and not exists (select 1 from operation_lines l where l.operation_id = o.id);`);
out.push(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated, created_at)
select o.id, o.user_id, o.business_id, o.city_id, 'full', 'card', 'pi_sim_demox_' || o.number, o.total_cents, round(o.total_cents * 0.08)::int, 'captured', (array['visa', 'mastercard', 'visa', 'amex'])[1 + (o.id % 4)::int], lpad(((o.id * 7919) % 10000)::text, 4, '0'), o.confirmed_at, o.done_at, true, o.sent_at
  from operations o where o.business_id = any(${TA(ids)}) and o.kind = 'appointment' and o.pay_status = 'captured' and o.total_cents > 0 and not exists (select 1 from payments p where p.operation_id = o.id) on conflict do nothing;`);
out.push(...extra);
out.push(sqlResenas(revs));
out.push(...posts, ...segs);
out.push(`-- Lo derivado lo calculan las funciones de la base (como el barrido): ★ y conteo, «Útil», fuerza del perfil.
insert into review_helpful (review_id, user_id)
select r.id, h.id from reviews r cross join lateral (select u.id from _c_u u where u.id <> r.user_id order by md5(r.id::text || u.phone) limit (r.id % 5)::int) h
 where r.business_id = any(${TA(ids)}) and not exists (select 1 from review_helpful x where x.review_id = r.id) on conflict do nothing;
update reviews r set helpful_count = (select count(*) from review_helpful h where h.review_id = r.id) where r.business_id = any(${TA(ids)}) and r.helpful_count <> (select count(*) from review_helpful h where h.review_id = r.id);
select reviews_stats(id) from unnest(${TA(ids)}) id;
update business_stats_cache set profile_strength = perfil_fuerza(business_id), updated_at = now() where business_id = any(${TA(ids)});
commit;`);
const sql = out.join("\n") + "\n";
fs.mkdirSync(SALIDA, { recursive: true });
fs.writeFileSync(path.join(SALIDA, "demo-x-auto.sql"), sql);
console.error(JSON.stringify({ archivo: "demo-x-auto.sql", bytes: sql.length, categoria: CAT, ...cuenta, subcategorias: Object.keys(porSub).length }, null, 1));
