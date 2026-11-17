#!/usr/bin/env node
/* Ronda 2 del sandbox · Hogar: 10 negocios demo en cada subcategoría de NEG-HOGAR salvo las 5 primeras (ya hechas en la ronda 1, grupo C) = 53 × 10 = 530.
   Uso: node scripts/semilla/demos/r2-hogar.mjs   →  infra/pruebas/demos/demo-x-hogar.sql
   Determinista (la misma salida cada vez), sin red ni base de datos. Solo el sandbox (is_demo = true).
   Reusa los ayudantes del grupo C (c/): SQL del negocio, historia de citas, apartados y rentas, reseñas, novedades y seguidores.
   Propio de esta ronda (r2-hogar/): servicios y textos de las 53 subcategorías, plan del negocio, gente y rangos reservados.
   Teléfonos de ficción: dueños +1 484 555 4800–5399, clientes +1 717 555 2400–2699. Números de operación 29000000–29999999 (C-, A-, T- como en la app). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { q, TA, Rng } from "./c/base.mjs";
import { textoReplica } from "./c/textos.mjs";
import { CLIENTES as CLIENTES1, sqlNegocio, sqlOps, sqlResenas, sqlPosts, sqlSeguidores } from "./c/nucleo.mjs";
import { armarResenas, armarSeguidores, ok3, ok2, okm } from "./c/resenas.mjs";
import { historiaOficio } from "./c/oficios.mjs";
import { extrasOficio } from "./c/extras.mjs";
import { SUBS1 } from "./r2-hogar/subs1.mjs";
import { SUBS2 } from "./r2-hogar/subs2.mjs";
import { SUBS3 } from "./r2-hogar/subs3.mjs";
import { SUBS4 } from "./r2-hogar/subs4.mjs";
import { planHogar, MOD } from "./r2-hogar/plan.mjs";
import { especificar2, CLIENTES2, DUENO_DESDE, DUENO_HASTA, CLI_DESDE, CLI_HASTA } from "./r2-hogar/gente.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SALIDA = path.join(RAIZ, "infra/pruebas/demos");
const existentes = [...fs.readFileSync(path.join(RAIZ, "infra/pruebas/semilla/0001_negocios.sql"), "utf8").matchAll(/^values \('([a-z0-9-]+)', '[a-z]{3}', 'NEG-/gm)].map((m) => m[1]);

const TODAS = [...SUBS1, ...SUBS2, ...SUBS3, ...SUBS4];
if (TODAS.length !== 53 || new Set(TODAS.map((s) => s.id)).size !== 53) throw new Error(`se esperaban 53 subcategorías, hay ${TODAS.length}`);
const POR_ID = Object.fromEntries(TODAS.map((s) => [s.id, s]));
const specs = especificar2(TODAS, existentes, 0);

/* Los ayudantes de la ronda 1 eligen clientes de su propia lista; aquí se cambia cada uno por el de igual posición de la nuestra (misma ciudad). */
const CAMBIO = new Map(CLIENTES1.map((c, i) => [c.tel, CLIENTES2[i]]));
const nuevo = (c) => { const x = CAMBIO.get(c.tel); if (!x) throw new Error("cliente desconocido " + c.tel); return x; };

/* Números de operación: se conserva el prefijo de la app (C-, A-, T-) y la serie pasa al rango reservado 29000000–29999999. */
const NUM = new Map(); let sig = 0;
const renum = (n) => { let v = NUM.get(n); if (!v) { sig++; if (sig > 999999) throw new Error("se acabó el rango de números"); v = `${n[0]}-${29000000 + sig}`; NUM.set(n, v); } return v; };
const cambiaFilas = (filas, clientes) => { for (const f of filas) { f.num = renum(f.num); if (clientes) { f.ph = CAMBIO.get(f.ph).tel; f._c = nuevo(f._c); } } };
const cambiaEventos = (evs) => { for (const e of evs) e.num = renum(e.num); };

const NOMBRE = new Map(CLIENTES2.map((c) => [c.tel, c.nombre]));
const ctx = { contador: { c: 1 } };
const bloques = [], ops = [], evs = [], revs = [], extra = [], posts = [], segs = [];
const cuenta = { negocios: 0, items: 0, ops: 0, resenas: 0, novedades: 0, seguidores: 0, extra: {} };
const porSub = {};
for (const B of specs) {
  const S = POR_ID[B.sub];
  const plan = planHogar(S, B);
  bloques.push(sqlNegocio(B, plan));
  const h = historiaOficio(MOD, B, plan, ctx);
  cambiaFilas(h.filas, true); cambiaEventos(h.eventos);
  h.clientes = h.clientes.map(nuevo);
  ops.push(...h.filas); evs.push(...h.eventos);
  const ex = extrasOficio(MOD, B, plan, h, ctx);
  cambiaFilas(ex.filas, false); cambiaEventos(ex.eventos);
  ops.push(...ex.filas); evs.push(...ex.eventos);
  for (const s of ex.sql) extra.push(s.replace(/'([ACT])-31(\d+)'/g, (m, p, d) => `'${renum(`${p}-31${d}`)}'`));
  for (const [k, v] of Object.entries(ex.cuenta)) cuenta.extra[k] = (cuenta.extra[k] ?? 0) + v;
  const rs = armarResenas("oficio", B, h.filas, {
    src: "cita", terminada: (f) => f.st === "done" && !f.sd && f.kind === "appointment",
    respuestas: (f, s) => ({ first: ok3(s), trato: ok3(s), clean: ok3(s), care: okm(s), who: ok2(s) }),
    hechos: (f) => ({ win: f._late || 0, ok: f.tot, cob: f.tot }),
  });
  // Las de 1 a 3 estrellas siempre llevan respuesta del dueño (la ronda 1 dejaba ~7 % sin ella)
  for (const x of rs) if (x.stars <= 3 && !x.reply) { const r2 = new Rng(`${B.id}:rep:${x.ph}`); x.reply = textoReplica(x.stars, x.lang, NOMBRE.get(x.ph) ?? "", r2); x.rd = Math.min(-1, x.cd + r2.int(0, 3)); x.rm = r2.int(8, 20) * 60 + r2.int(0, 59); x.rlang = x.lang; }
  // La respuesta nunca es anterior a la reseña (el mismo día se mueve a media hora después de ella)
  for (const x of rs) if (x.reply && x.rd === x.cd && x.rm <= x.cm) x.rm = Math.min(1439, x.cm + 30 + (x.rm % 30));
  revs.push(...rs);
  if (plan.posts.length) posts.push(sqlPosts(B, plan.posts));
  const sg = armarSeguidores(B, h.clientes, CLIENTES2);
  segs.push(sqlSeguidores(B, sg));
  const nItems = plan.secciones.reduce((n, s) => n + s.items.length, 0);
  cuenta.negocios++; cuenta.items += nItems; cuenta.ops += h.filas.length + ex.filas.length; cuenta.resenas += rs.length; cuenta.novedades += plan.posts.length; cuenta.seguidores += sg.length;
  porSub[B.sub] = (porSub[B.sub] ?? 0) + 1;
}
// Ningún texto de operación debe haber quedado con el rango viejo
for (const o of ops) if (!/^[ACT]-29\d{6}$/.test(o.num)) throw new Error("número fuera de rango " + o.num);

const ids = specs.map((s) => s.id);
const out = [`-- GENERADO por scripts/semilla/demos/r2-hogar.mjs — Hogar, ronda 2: 10 negocios en cada subcategoría 06–58 (53 × 10). SOLO SANDBOX (is_demo = true). No editar a mano.
-- Idempotente: llaves fijas (id del negocio, número de operación, md5 de cada fila) y «on conflict do nothing»; aplicarlo dos veces no cambia nada. Nada se borra.
-- Solo hechos base: ★, conteos, fuerza del perfil los recalculan al final las funciones de la base (reviews_stats, perfil_fuerza).
begin;
create or replace function pg_temp.c_ts(d int, m int) returns timestamptz language sql stable as $f$ select (((now() at time zone 'America/New_York')::date + d) + make_interval(mins => m)) at time zone 'America/New_York' $f$;`];
const usados = CLIENTES1.map((_, i) => CLIENTES2[i]);
const vals = usados.map((c) => `(${q(c.tel)}, now() - interval '300 days', ${q(c.nombre)}, ${q(c.ap)}, ${q(c.lang)}, ${q(c.ciudad)})`);
for (let i = 0; i < vals.length; i += 130) out.push(`insert into users (phone, phone_verified_at, first_name, last_name, lang, home_city_id) values\n${vals.slice(i, i + 130).join(",\n")}\non conflict (phone) do nothing;`);
out.push(...bloques);
out.push(`drop table if exists _c_u; create temp table _c_u on commit drop as select phone, id from users where phone between '+1717555${CLI_DESDE}' and '+1717555${CLI_HASTA}' or phone between '+1484555${DUENO_DESDE}' and '+1484555${DUENO_HASTA}';`);
out.push(`drop table if exists _c_own; create temp table _c_own on commit drop as select business_id, user_id from business_members where kind = 'owner' and business_id = any(${TA(ids)});`);
out.push(sqlOps(ops));
for (let i = 0; i < evs.length; i += 500) {
  const parte = evs.slice(i, i + 500).map((e) => `(${q(e.num)}, ${q(e.kind)}, ${q(e.actor)}, ${e.d}, ${e.m})`);
  out.push(`insert into operation_events (operation_id, at, kind, actor)\nselect o.id, pg_temp.c_ts(v.d, v.m), v.kind, v.actor from (values\n${parte.join(",\n")}) as v(num, kind, actor, d, m) join operations o on o.number = v.num\n where not exists (select 1 from operation_events e where e.operation_id = o.id);`);
}
out.push(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct)
select o.id, i.id, coalesce(i.name, jsonb_build_object('es', o.details#>>'{svc,es}', 'en', o.details#>>'{svc,en}')), 1, o.subtotal_cents, o.subtotal_cents, 0
  from operations o left join items i on i.business_id = o.business_id and i.module = 'svc' and i.removed_at is null and i.name->>'es' = o.details#>>'{svc,es}'
 where o.business_id = any(${TA(ids)}) and o.details->>'demo' = 'c' and o.kind = 'appointment' and not exists (select 1 from operation_lines l where l.operation_id = o.id);`);
out.push(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated, created_at)
select o.id, o.user_id, o.business_id, o.city_id, 'full', 'card', 'pi_sim_democ_' || o.number, o.total_cents, round(o.total_cents * 0.08)::int, 'captured', (array['visa', 'mastercard', 'visa', 'amex'])[1 + (o.id % 4)::int], lpad(((o.id * 7919) % 10000)::text, 4, '0'), o.confirmed_at, o.done_at, true, o.sent_at
  from operations o where o.business_id = any(${TA(ids)}) and o.details->>'demo' = 'c' and o.kind = 'appointment' and o.pay_status = 'captured' and o.total_cents > 0 and not exists (select 1 from payments p where p.operation_id = o.id) on conflict do nothing;`);
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
fs.writeFileSync(path.join(SALIDA, "demo-x-hogar.sql"), sql);
console.error(JSON.stringify({ ...cuenta, subcategorias: Object.keys(porSub).length, numeros: sig, bytes: sql.length }, null, 1));
