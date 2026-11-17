#!/usr/bin/env node
/* Grupo C del sandbox: negocios demo de Hogar, Auto, Dealer e Inmueble (10 por cada una de las 5 subcategorías principales de cada categoría = 200).
   Uso: node scripts/semilla/demos/grupo-c.mjs [clave...]   (sin argumentos: las cuatro)  →  infra/pruebas/demos/demo-c-<categoria>.sql
   Determinista: la misma salida cada vez. Solo el sandbox (is_demo = true). Teléfonos de ficción: dueños +1 570 555 9500–9749, clientes +1 570 555 8500–8749. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { q, Rng, TA } from "./c/base.mjs";
import { CLIENTES, especificar, sqlNegocio, sqlOps, sqlResenas, sqlPosts, sqlSeguidores, cabecera } from "./c/nucleo.mjs";
import { armarResenas, armarSeguidores, ok3, ok2, okm } from "./c/resenas.mjs";
import * as hogar from "./c/hogar.mjs";
import * as auto from "./c/auto.mjs";
import { planOficio, historiaOficio } from "./c/oficios.mjs";
import { extrasOficio } from "./c/extras.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SALIDA = path.join(RAIZ, "infra/pruebas/demos");
const existentes = [...fs.readFileSync(path.join(RAIZ, "infra/pruebas/semilla/0001_negocios.sql"), "utf8").matchAll(/^values \('([a-z0-9-]+)', '[a-z]{3}', 'NEG-/gm)].map((m) => m[1]);

const CATEGORIAS = {
  hogar: { archivo: "demo-c-hogar.sql", titulo: "Hogar (10 negocios en cada una de: Multiservicios, Plomería, Destape de drenajes, Calentadores de agua, Electricista)", mod: hogar, idx: 0, plan: (B) => planOficio(hogar, B), hist: (B, p, ctx) => historiaOficio(hogar, B, p, ctx), extras: (B, p, h, ctx) => extrasOficio(hogar, B, p, h, ctx), tipo: "oficio" },
  auto: { archivo: "demo-c-auto.sql", titulo: "Auto (10 negocios en cada una de: Mecánico general, Mecánico a domicilio, Cambio de aceite, Diagnóstico y escáner, Frenos)", mod: auto, idx: 50, plan: (B) => planOficio(auto, B), hist: (B, p, ctx) => historiaOficio(auto, B, p, ctx), extras: (B, p, h, ctx) => extrasOficio(auto, B, p, h, ctx), tipo: "oficio" },
};
try { const d = await import("./c/dealer.mjs"); CATEGORIAS.dealer = d.CONFIG; } catch (e) { if (e.code !== "ERR_MODULE_NOT_FOUND") throw e; }
try { const d = await import("./c/inmueble.mjs"); CATEGORIAS.inmueble = d.CONFIG; } catch (e) { if (e.code !== "ERR_MODULE_NOT_FOUND") throw e; }

const claves = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CATEGORIAS);
const resumen = {};
for (const clave of claves) {
  const C = CATEGORIAS[clave];
  if (!C) { console.error("categoría desconocida:", clave); continue; }
  const specs = especificar({ cat: C.mod.CAT, subs: C.mod.SUBS }, C.idx, existentes);
  const ctx = { contador: { c: 1 } };
  const bloques = [], ops = [], evs = [], revs = [], extra = [], posts = [], segs = [];
  const cuenta = { negocios: 0, items: 0, ops: 0, resenas: 0, novedades: 0, seguidores: 0, extra: {} };
  for (const B of specs) {
    const plan = C.plan(B);
    bloques.push(sqlNegocio(B, plan));
    const h = C.hist(B, plan, ctx);
    ops.push(...h.filas);
    evs.push(...h.eventos);
    const ex = C.extras ? C.extras(B, plan, h, ctx) : null;
    if (ex) { ops.push(...(ex.filas ?? [])); evs.push(...(ex.eventos ?? [])); extra.push(...(ex.sql ?? [])); for (const [k, v] of Object.entries(ex.cuenta ?? {})) cuenta.extra[k] = (cuenta.extra[k] ?? 0) + v; }
    const rs = armarResenas(C.tipo === "oficio" ? "oficio" : C.tipo, B, h.filas, C.resenas ? C.resenas(B, plan) : (C.tipo === "oficio" ? {
      src: "cita", terminada: (f) => f.st === "done" && !f.sd && f.kind === "appointment",
      respuestas: (f, s, r) => (C.mod.RUBRO === "hogar" ? { first: ok3(s), trato: ok3(s), clean: ok3(s), care: okm(s), who: ok2(s) } : { first: ok3(s), trato: ok3(s), ask: ok2(s), part: ok3(s), carro: okm(s) }),
      hechos: (f) => (C.mod.RUBRO === "hogar" ? { win: f._late || 0, ok: f.tot, cob: f.tot } : { ok: f.tot, cob: f.tot }),
    } : null));
    revs.push(...rs);
    if (plan.posts.length) posts.push(sqlPosts(B, plan.posts));
    const sg = armarSeguidores(B, h.clientes, CLIENTES);
    segs.push(sqlSeguidores(B, sg));
    cuenta.negocios++; cuenta.items += plan.secciones.reduce((n, s) => n + s.items.length, 0) + (plan.sueltos?.length ?? 0); cuenta.ops += h.filas.length + (ex?.filas?.length ?? 0); cuenta.resenas += rs.length; cuenta.novedades += plan.posts.length; cuenta.seguidores += sg.length;
  }
  const ids = specs.map((s) => s.id), catId = C.mod.CAT;
  const out = [cabecera(C.titulo, ids)];
  // Clientes de ficción (ya existen los de otras corridas; no se repiten)
  const vals = CLIENTES.map((c) => `(${q(c.tel)}, now() - interval '300 days', ${q(c.nombre)}, ${q(c.ap)}, ${q(c.lang)}, ${q(c.ciudad)})`);
  for (let i = 0; i < vals.length; i += 130) out.push(`insert into users (phone, phone_verified_at, first_name, last_name, lang, home_city_id) values\n${vals.slice(i, i + 130).join(",\n")}\non conflict (phone) do nothing;`);
  out.push(...bloques);
  out.push(`drop table if exists _c_u; create temp table _c_u on commit drop as select phone, id from users where phone between '+15705558500' and '+15705558749' or phone between '+15705559500' and '+15705559749';`);
  out.push(`drop table if exists _c_own; create temp table _c_own on commit drop as select business_id, user_id from business_members where kind = 'owner' and business_id = any(${TA(ids)});`);
  out.push(sqlOps(ops));
  // Eventos, líneas y cobros: salen de las operaciones (conjunto), no a mano
  for (let i = 0; i < evs.length; i += 500) {
    const parte = evs.slice(i, i + 500).map((e) => `(${q(e.num)}, ${q(e.kind)}, ${q(e.actor)}, ${e.d}, ${e.m})`);
    out.push(`insert into operation_events (operation_id, at, kind, actor)\nselect o.id, pg_temp.c_ts(v.d, v.m), v.kind, v.actor from (values\n${parte.join(",\n")}) as v(num, kind, actor, d, m) join operations o on o.number = v.num\n where not exists (select 1 from operation_events e where e.operation_id = o.id);`);
  }
  out.push(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct)
select o.id, i.id, coalesce(i.name, jsonb_build_object('es', o.details#>>'{svc,es}', 'en', o.details#>>'{svc,en}')), 1, o.subtotal_cents, o.subtotal_cents, 0
  from operations o left join items i on i.business_id = o.business_id and i.module = 'svc' and i.removed_at is null and i.name->>'es' = o.details#>>'{svc,es}'
 where o.details->>'demo' = 'c' and o.details->>'cat' = ${q(catId)} and o.kind = 'appointment' and not exists (select 1 from operation_lines l where l.operation_id = o.id);`);
  out.push(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated, created_at)
select o.id, o.user_id, o.business_id, o.city_id, 'full', 'card', 'pi_sim_democ_' || o.number, o.total_cents, round(o.total_cents * 0.08)::int, 'captured', (array['visa', 'mastercard', 'visa', 'amex'])[1 + (o.id % 4)::int], lpad(((o.id * 7919) % 10000)::text, 4, '0'), o.confirmed_at, o.done_at, true, o.sent_at
  from operations o where o.details->>'demo' = 'c' and o.details->>'cat' = ${q(catId)} and o.kind = 'appointment' and o.pay_status = 'captured' and o.total_cents > 0 and not exists (select 1 from payments p where p.operation_id = o.id) on conflict do nothing;`);
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
${C.final ? C.final(ids) : ""}
commit;`);
  const sql = out.join("\n") + "\n";
  fs.mkdirSync(SALIDA, { recursive: true });
  fs.writeFileSync(path.join(SALIDA, C.archivo), sql);
  resumen[clave] = { ...cuenta, bytes: sql.length };
}
console.error(JSON.stringify(resumen, null, 1));
