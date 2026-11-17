#!/usr/bin/env node
/* Ronda 2 · Venta de Autos (agente k11): 10 negocios demo en cada una de las 34 subcategorías que la ronda 1 no hizo (06–39) = 340 negocios, 2 por ciudad.
   Uso: node scripts/semilla/demos/r2-dealer.mjs   →  infra/pruebas/demos/demo-x-dealer.sql
   Determinista: la misma salida cada vez. Solo el sandbox (is_demo = true). Sin red ni base de datos.
   Teléfonos de ficción (555): dueños +1 484 555 6000–6339, clientes +1 717 555 3000–3242. Números de operación 31000000–31999999 (D- visitas, C- citas).
   Reutiliza por importación las piezas de la ronda 1 (scripts/semilla/demos/c/): fórmulas del total en la puerta, historia de pruebas, reseñas, SQL del negocio. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { q, Rng, TA, slug, dedupe } from "./c/base.mjs";
import { CLIENTES, especificar, sqlNegocio, sqlOps, sqlResenas, sqlPosts, sqlSeguidores, cabecera } from "./c/nucleo.mjs";
import { armarResenas, armarSeguidores } from "./c/resenas.mjs";
import { SUBS, CAT, TAG } from "./r2-dealer/subs.mjs";
import { planR2, historiaR2, VINS } from "./r2-dealer/plan.mjs";
import { VOCAB, textoResena } from "./r2-dealer/textos.mjs";
import { textoReplica } from "./c/textos.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SALIDA = path.join(RAIZ, "infra/pruebas/demos"), ARCHIVO = "demo-x-dealer.sql";
const existentes = [...fs.readFileSync(path.join(RAIZ, "infra/pruebas/semilla/0001_negocios.sql"), "utf8").matchAll(/^values \('([a-z0-9-]+)', '[a-z]{3}', 'NEG-/gm)].map((m) => m[1]);

/* Clientes de ficción de este agente: las mismas personas de la ronda 1 con teléfonos propios (+1 717 555 3000…). */
CLIENTES.forEach((c, i) => { c.tel = `+1717555${3000 + i}`; });
const TEL_C = [CLIENTES[0].tel, CLIENTES[CLIENTES.length - 1].tel];

/* ── Especificaciones ── */
const usados = new Set(existentes), specs = [];
let gi = 0;
for (const sub of SUBS) {
  const num = sub.id.slice(-2);
  for (const B of especificar({ cat: CAT, subs: [sub] }, 0, existentes)) {
    B.id = dedupe(usados, `${slug(B.name)}-d${num}`);
    B.seed = `${CAT}:${TAG}:${B.id}`;
    B.idx = gi;
    B.owner = { ...B.owner, tel: `+1484555${6000 + gi}` };
    B.size = Math.min(B.size, 1.55);
    gi++;
    specs.push(B);
  }
}
const OPS_NUM = { n: 0 };
const bloques = [], ops = [], evs = [], revs = [], posts = [], segs = [], extra = [];
const cuenta = { negocios: 0, items: 0, vehiculos: 0, ops: 0, resenas: 0, novedades: 0, seguidores: 0, porSub: {} };
const ctx = { n: 0 };
for (const B of specs) {
  const sub = SUBS.find((s) => s.id === B.sub), plan = planR2(B), inv = plan.inventario;
  bloques.push(sqlNegocio(B, plan));
  const h = historiaR2(B, plan, ctx);
  ops.push(...h.filas); evs.push(...h.eventos);
  const dia = (f) => new Date(Date.UTC(2026, 10, 17) + f.d * 86400000).toISOString().slice(0, 10);
  const op = inv ? {
    src: "cita", terminada: (f) => f.kind === "visit" && f.st === "done" && f.sd === "done",
    hechos: (f) => ({ dia: dia(f), que: "prueba", tot: f.det.otd_cents }),
  } : {
    src: "cita", terminada: (f) => f.kind === "appointment" && f.st === "done" && !f.sd,
    hechos: (f) => ({ dia: dia(f), que: "cita", tot: f.tot }),
  };
  const ok3 = (s) => (s >= 4 ? 1 : s === 3 ? 0 : -1), ok2 = (s) => (s >= 4 ? 1 : 0), okm = (s) => (s >= 4 ? 1 : -1);
  let rs = armarResenas("dealer", B, h.filas, { ...op, respuestas: (f, s) => ({ trato: ok3(s), puertaOk: okm(s), tituloOk: ok2(s), fotosOk: ok2(s), aTiempo: s >= 4 ? "a" : s === 3 ? "b" : "c", sinPresion: okm(s) }) });
  const rr = new Rng(B.seed + ":res2");
  if (rs.length > 40) rs = rr.some(rs, 40).sort((a, b) => a.cd - b.cd);
  const porOp = new Map(h.filas.map((f) => [f.num, f]));
  for (const x of rs) {
    const f = porOp.get(x.op), servicio = f._it ? (x.lang === "en" ? f._it.en : f._it.es).toLowerCase() : "";
    x.body = textoResena(inv, inv ? VOCAB[sub.fam] : null, x.stars, x.lang, { d: B.owner.nombre, s: servicio }, rr);
    if (!inv) x.facts = { ...x.facts, que: "cita" };
    if (x.stars <= 3 && !x.reply) { x.reply = textoReplica(x.stars, x.lang, f._c?.nombre ?? "", rr); x.rd = Math.min(-1, x.cd + rr.int(0, 3)); x.rm = rr.int(8, 20) * 60 + rr.int(0, 59); x.rlang = x.lang; }
  }
  revs.push(...rs);
  if (plan.licencias.length) extra.push(`insert into licenses (business_id, city_id, kind, title, can, cannot, issuer, registry_url, status, source, sort, checked_at, next_review)
select b.id, b.city_id, k.key, k.title, k.can, coalesce(k.cannot, '[]'::jsonb), k.issuer->>'es', k.registry_url, 'valid', 'semilla', o.n, now(), (now() + interval '3 months')::date
  from businesses b cross join lateral unnest(${TA(plan.licencias)}) with ordinality o(k, n) join license_kinds k on k.key = o.k
 where b.id = ${q(B.id)} and not exists (select 1 from licenses l where l.business_id = b.id and l.kind = k.key);`);
  posts.push(sqlPosts(B, plan.posts));
  const sg = armarSeguidores(B, h.clientes, CLIENTES);
  segs.push(sqlSeguidores(B, sg));
  const nItems = plan.secciones.reduce((n, s) => n + s.items.length, 0) + plan.sueltos.length;
  cuenta.negocios++; cuenta.items += nItems; cuenta.vehiculos += plan.veh.length; cuenta.ops += h.filas.length; cuenta.resenas += rs.length; cuenta.novedades += plan.posts.length; cuenta.seguidores += sg.length;
  const k = (cuenta.porSub[B.sub] ??= { negocios: 0, ciudades: {} }); k.negocios++; k.ciudades[B.city] = (k.ciudades[B.city] ?? 0) + 1;
}
void OPS_NUM;

/* ── Archivo ── */
const ids = specs.map((s) => s.id);
const out = [cabecera("Venta de Autos · ronda 2 (34 subcategorías × 10 negocios)", ids).replace("scripts/semilla/demos/grupo-c.mjs", "scripts/semilla/demos/r2-dealer.mjs")];
const vals = CLIENTES.map((c) => `(${q(c.tel)}, now() - interval '300 days', ${q(c.nombre)}, ${q(c.ap)}, ${q(c.lang)}, ${q(c.ciudad)})`);
for (let i = 0; i < vals.length; i += 130) out.push(`insert into users (phone, phone_verified_at, first_name, last_name, lang, home_city_id) values\n${vals.slice(i, i + 130).join(",\n")}\non conflict (phone) do nothing;`);
out.push(...bloques);
out.push(`drop table if exists _c_u; create temp table _c_u on commit drop as select phone, id from users where phone between ${q(TEL_C[0])} and ${q(TEL_C[1])};`);
out.push(`drop table if exists _c_own; create temp table _c_own on commit drop as select business_id, user_id from business_members where kind = 'owner' and business_id = any(${TA(ids)});`);
out.push(sqlOps(ops));
for (let i = 0; i < evs.length; i += 500) {
  const parte = evs.slice(i, i + 500).map((e) => `(${q(e.num)}, ${q(e.kind)}, ${q(e.actor)}, ${e.d}, ${e.m})`);
  out.push(`insert into operation_events (operation_id, at, kind, actor)\nselect o.id, pg_temp.c_ts(v.d, v.m), v.kind, v.actor from (values\n${parte.join(",\n")}) as v(num, kind, actor, d, m) join operations o on o.number = v.num\n where not exists (select 1 from operation_events e where e.operation_id = o.id);`);
}
const ESCOPO = `o.business_id = any(${TA(ids)}) and o.details->>'r2' = ${q(TAG)}`;
out.push(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct)
select o.id, i.id, coalesce(i.name, jsonb_build_object('es', o.details#>>'{svc,es}', 'en', o.details#>>'{svc,en}')), 1, o.subtotal_cents, o.subtotal_cents, 0
  from operations o left join items i on i.business_id = o.business_id and i.module = 'svc' and i.removed_at is null and i.name->>'es' = o.details#>>'{svc,es}'
 where ${ESCOPO} and o.kind = 'appointment' and not exists (select 1 from operation_lines l where l.operation_id = o.id);`);
out.push(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated, created_at)
select o.id, o.user_id, o.business_id, o.city_id, 'full', 'card', 'pi_sim_demox_' || o.number, o.total_cents, round(o.total_cents * 0.08)::int, 'captured', (array['visa', 'mastercard', 'visa', 'amex'])[1 + (o.id % 4)::int], lpad(((o.id * 7919) % 10000)::text, 4, '0'), o.confirmed_at, o.done_at, true, o.sent_at
  from operations o where ${ESCOPO} and o.kind = 'appointment' and o.pay_status = 'captured' and o.total_cents > 0 and not exists (select 1 from payments p where p.operation_id = o.id) on conflict do nothing;`);
out.push(...extra);
out.push(sqlResenas(revs));
out.push(...posts, ...segs);
out.push(`-- Lo derivado lo calculan las funciones de la base (como el barrido): ★ y conteo, «Útil», fuerza del perfil, licencias.
insert into review_helpful (review_id, user_id)
select r.id, h.id from reviews r cross join lateral (select u.id from _c_u u where u.id <> r.user_id order by md5(r.id::text || u.phone) limit (r.id % 5)::int) h
 where r.business_id = any(${TA(ids)}) and not exists (select 1 from review_helpful x where x.review_id = r.id) on conflict do nothing;
update reviews r set helpful_count = (select count(*) from review_helpful h where h.review_id = r.id) where r.business_id = any(${TA(ids)}) and r.helpful_count <> (select count(*) from review_helpful h where h.review_id = r.id);
select reviews_stats(id) from unnest(${TA(ids)}) id;
update business_stats_cache set profile_strength = perfil_fuerza(business_id), updated_at = now() where business_id = any(${TA(ids)});
-- «dia» de cada prueba y el id de su vehículo salen de lo ya guardado; las licencias se refrescan con la función de la base
update operations o set details = o.details || jsonb_build_object('dia', (o.scheduled_at at time zone 'America/New_York')::date::text)
 where ${ESCOPO} and not (o.details ? 'dia');
update operations o set details = o.details || jsonb_build_object('item_id', i.id::text)
  from items i where ${ESCOPO} and o.kind = 'visit' and not (o.details ? 'item_id') and i.business_id = o.business_id and i.module = 'svc' and i.name->>'es' = o.details#>>'{item,es}';
select licencias_refrescar(id) from unnest(${TA(ids)}) id;
commit;`);
const sql = out.join("\n") + "\n";
fs.mkdirSync(SALIDA, { recursive: true });
fs.writeFileSync(path.join(SALIDA, ARCHIVO), sql);
console.error(JSON.stringify({ archivo: ARCHIVO, bytes: sql.length, vin: VINS.size, ...cuenta, porSub: Object.keys(cuenta.porSub).length }, null, 1));
