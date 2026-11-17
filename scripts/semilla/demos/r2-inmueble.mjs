#!/usr/bin/env node
/* Ronda 2 del sandbox · Bienes Raíces (NEG-INMUEBLE): las 40 subcategorías que no salieron en la ronda 1 (06–45), 10 negocios en cada una
   (2 por ciudad) = 400 negocios con propiedades, servicios, equipo, historia, reseñas, novedades y seguidores.
   Uso: node scripts/semilla/demos/r2-inmueble.mjs   →  infra/pruebas/demos/demo-x-inmueble.sql
   Determinista. Solo el sandbox (is_demo = true). Teléfonos de ficción: dueños +1 484 555 6600–6999, clientes +1 717 555 3300–3599.
   Números de operación D-32000001…  (rango reservado 32000000–32999999). Reutiliza los ayudantes de la ronda 1 (c/) sin tocarlos. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { q, TA } from "./c/base.mjs";
import { sqlNegocio, sqlOps, sqlResenas, sqlPosts, sqlSeguidores } from "./c/nucleo.mjs";
import { SUBS } from "./r2-inmueble/catalogo.mjs";
import { CLIENTES, especificar, planInm2 } from "./r2-inmueble/plan.mjs";
import { historia, armarResenas2, armarSeguidores2 } from "./r2-inmueble/historia.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SALIDA = path.join(RAIZ, "infra/pruebas/demos");
const existentes = [...fs.readFileSync(path.join(RAIZ, "infra/pruebas/semilla/0001_negocios.sql"), "utf8").matchAll(/^values \('([a-z0-9-]+)', '[a-z]{3}', '/gm)].map((m) => m[1]);

const specs = especificar(existentes);
const ctx = {};
const bloques = [], ops = [], evs = [], revs = [], posts = [], segs = [], extra = [];
const cuenta = { negocios: 0, items: 0, propiedades: 0, ops: 0, resenas: 0, novedades: 0, seguidores: 0, porSub: {}, porCiudad: {} };
for (const B of specs) {
  const plan = planInm2(B);
  bloques.push(sqlNegocio(B, plan));
  const h = historia(B, plan, ctx);
  ops.push(...h.filas); evs.push(...h.eventos);
  const rs = armarResenas2(B, h.filas);
  revs.push(...rs);
  posts.push(sqlPosts(B, plan.posts));
  const sg = armarSeguidores2(B, h.clientes);
  segs.push(sqlSeguidores(B, sg));
  if (plan.licencias.length) extra.push(`insert into licenses (business_id, city_id, kind, title, can, cannot, issuer, registry_url, status, source, sort, checked_at, next_review)
select b.id, b.city_id, k.key, k.title, k.can, coalesce(k.cannot, '[]'::jsonb), k.issuer->>'es', k.registry_url, 'valid', 'semilla', o.n, now(), (now() + interval '3 months')::date
  from businesses b cross join lateral unnest(${TA(plan.licencias)}) with ordinality o(k, n) join license_kinds k on k.key = o.k
 where b.id = ${q(B.id)} and not exists (select 1 from licenses l where l.business_id = b.id and l.kind = k.key);`);
  const items = plan.secciones.reduce((n, s) => n + s.items.length, 0) + plan.sueltos.length;
  cuenta.negocios++; cuenta.items += items; cuenta.propiedades += plan.props.length; cuenta.ops += h.filas.length; cuenta.resenas += rs.length; cuenta.novedades += plan.posts.length; cuenta.seguidores += sg.length;
  cuenta.porSub[B.sub] = (cuenta.porSub[B.sub] ?? 0) + 1; cuenta.porCiudad[B.city] = (cuenta.porCiudad[B.city] ?? 0) + 1;
}
const ids = specs.map((s) => s.id);
const out = [`-- GENERADO por scripts/semilla/demos/r2-inmueble.mjs — Bienes Raíces, ronda 2: 40 subcategorías (06–45) × 10 negocios. SOLO SANDBOX (is_demo = true). No editar a mano.
-- Idempotente: llaves fijas (id del negocio, número de operación D-32…, md5 de cada fila) y «on conflict do nothing»; aplicarlo dos veces no cambia nada. Nada se borra.
-- Solo hechos base: ★, conteos, fuerza del perfil y licencias los recalculan al final las funciones de la base (reviews_stats, perfil_fuerza, licencias_refrescar).
begin;
create or replace function pg_temp.c_ts(d int, m int) returns timestamptz language sql stable as $f$ select (((now() at time zone 'America/New_York')::date + d) + make_interval(mins => m)) at time zone 'America/New_York' $f$;`];
const vals = CLIENTES.map((c) => `(${q(c.tel)}, now() - interval '300 days', ${q(c.nombre)}, ${q(c.ap)}, ${q(c.lang)}, ${q(c.ciudad)})`);
for (let i = 0; i < vals.length; i += 130) out.push(`insert into users (phone, phone_verified_at, first_name, last_name, lang, home_city_id) values\n${vals.slice(i, i + 130).join(",\n")}\non conflict (phone) do nothing;`);
out.push(...bloques);
out.push(`drop table if exists _c_u; create temp table _c_u on commit drop as select phone, id from users where phone between '+17175553300' and '+17175553599' or phone between '+14845556600' and '+14845557199';`);
out.push(`drop table if exists _c_own; create temp table _c_own on commit drop as select business_id, user_id from business_members where kind = 'owner' and business_id = any(${TA(ids)});`);
out.push(sqlOps(ops));
for (let i = 0; i < evs.length; i += 500) {
  const parte = evs.slice(i, i + 500).map((e) => `(${q(e.num)}, ${q(e.kind)}, ${q(e.actor)}, ${e.d}, ${e.m})`);
  out.push(`insert into operation_events (operation_id, at, kind, actor)\nselect o.id, pg_temp.c_ts(v.d, v.m), v.kind, v.actor from (values\n${parte.join(",\n")}) as v(num, kind, actor, d, m) join operations o on o.number = v.num\n where not exists (select 1 from operation_events e where e.operation_id = o.id);`);
}
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
update operations o set details = o.details || jsonb_build_object('dia', (o.scheduled_at at time zone 'America/New_York')::date::text)
 where o.details->>'demo' = 'r2i' and not (o.details ? 'dia');
update operations o set details = o.details || jsonb_build_object('item_id', i.id::text)
  from items i where o.details->>'demo' = 'r2i' and not (o.details ? 'item_id') and i.business_id = o.business_id and i.module = 'svc' and i.name->>'es' = o.details#>>'{item,es}';
select licencias_refrescar(id) from unnest(${TA(ids)}) id;
commit;`);
const sql = out.join("\n") + "\n";
fs.mkdirSync(SALIDA, { recursive: true });
fs.writeFileSync(path.join(SALIDA, "demo-x-inmueble.sql"), sql);
console.error(JSON.stringify({ subcategorias: SUBS.length, ...cuenta, bytes: sql.length }, null, 1));
