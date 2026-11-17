/* Ronda 2 · semilla-2: negocios que YA existen en la semilla base (solo Hazleton) → los «llena» sin tocar lo que tienen.
   Utilidades comunes: carga de la semilla, especificación de cada negocio, clientes de ficción (+1 717 555 6300–6599),
   texto SQL de las partes que solo se AGREGAN (todo con llaves fijas y «on conflict do nothing» / «where not exists»). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Rng, q, J, TA, BI, hash, slug, logoSvg, RETRATOS, px } from "../c/base.mjs";
import { CLIENTES as CLI_C } from "../c/nucleo.mjs";

export { Rng, q, J, TA, BI, hash, px };
const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ = path.resolve(AQUI, "../../../..");
export const SUBS = JSON.parse(fs.readFileSync(path.join(AQUI, "subs.json"), "utf8"));
export const CATS = ["NEG-HOGAR", "NEG-AUTO", "NEG-DEALER", "NEG-INMUEBLE", "NEG-FIESTA", "NEG-TRANS", "NEG-EDU", "NEG-NINOS", "NEG-FE"];

/* ── Clientes: 300 teléfonos de ficción reservados para este archivo. Los primeros 250 repiten nombres de los clientes del grupo C (para poder reusar su historia). ── */
const NH = ["Rafael", "José", "Luis", "Carlos", "Miguel", "Ramón", "Wilfredo", "Héctor", "Pedro", "Manuel", "Julio", "Freddy", "Edwin", "Jorge", "Víctor", "Ángel", "Nelson", "Orlando", "Félix", "Domingo"];
const NM = ["María", "Rosa", "Carmen", "Yokasta", "Mariela", "Daisy", "Ana", "Luz", "Katherine", "Rosanna", "Altagracia", "Yanira", "Noelia", "Milagros", "Esperanza", "Idalia", "Lourdes", "Marisol", "Sonia", "Griselda"];
const AP = ["Rodríguez", "Martínez", "García", "Díaz", "Pérez", "Santana", "Jiménez", "Almonte", "Peña", "Reyes", "Cabrera", "Núñez", "Vargas", "Féliz", "Batista", "Tavárez", "Méndez", "Ortiz", "Rosario", "Mejía", "Castillo", "Ramírez", "Torres", "Soto", "Colón"];
export const CLIENTES = (() => {
  const r = new Rng("clientes-r2-semilla-2"), out = [];
  for (let i = 0; i < 300; i++) {
    const tel = `+1717555${6300 + i}`;
    if (i < CLI_C.length) { const c = CLI_C[i]; out.push({ tel, nombre: c.nombre, ap: c.ap, lang: c.lang, ciudad: c.ciudad, mujer: c.mujer, old: c.tel }); }
    else { const mujer = r.chance(0.5); out.push({ tel, nombre: mujer ? r.pick(NM) : r.pick(NH), ap: r.pick(AP), lang: r.chance(0.18) ? "en" : "es", ciudad: ["hzl", "alw", "wbr", "scr", "rdg"][i % 5], mujer, old: null }); }
  }
  return out;
})();
export const DE_C = Object.fromEntries(CLIENTES.filter((c) => c.old).map((c) => [c.old, c]));

/* ── Negocios a llenar ── */
const ARCHIVO = path.join(RAIZ, "infra/pruebas/semilla/negocios.json");
export function negociosBase() {
  const todos = JSON.parse(fs.readFileSync(ARCHIVO, "utf8"));
  return todos.filter((x) => CATS.includes(x.category_id)).sort((a, b) => (a.category_id === b.category_id ? (a.id < b.id ? -1 : 1) : CATS.indexOf(a.category_id) - CATS.indexOf(b.category_id)));
}
const SIZES = [0.5, 0.6, 0.7, 0.8];
export function especificar(lista) {
  return lista.map((x, i) => {
    const r = new Rng("r2s2:" + x.id), ciudad = "hzl";
    const m = x.geo ? { lat: x.geo[0], lng: x.geo[1] } : { lat: 40.9576, lng: -75.9741 };
    return {
      cat: x.category_id, sub: x.subcategory_ids[0], subs0: x.subcategory_ids, id: x.id, name: x.name, city: ciudad, addr: x.address, lat: m.lat, lng: m.lng, founded: x.founded_year ?? 2012,
      idx: 7000 + i, phone: x.phone, size: r.pick(SIZES), seed: `r2s2:${x.category_id}:${x.id}`, photos: x.photos ?? [], aboutEs: x.about?.es ?? "", aboutEn: x.about?.en ?? "",
      faqs0: (x.faqs ?? []).length, attrs: x.category_attrs ?? {}, filters: x.filter_values ?? [],
      owner: { tel: "+10000000000", nombre: r.pick(NH), ap: r.pick(AP), mujer: false }, // solo para los textos («Don …»); no existe como usuario
    };
  });
}
export const subEs = (B) => SUBS[B.sub]?.[0] ?? "";
export const subEn = (B) => SUBS[B.sub]?.[1] ?? "";

/* ── Texto SQL ── */
export const ts = (d, m) => (d == null ? "null" : `pg_temp.c_ts(${d},${m})`);
export function cabecera(n) {
  return `-- GENERADO por scripts/semilla/demos/r2-semilla-2.mjs — «llena» ${n} negocios de la semilla base (Hazleton): ficha, fotos, equipo, preguntas, catálogo, historia, reseñas con respuesta, novedades y seguidores. SOLO SANDBOX.
-- Solo AGREGA: no cambia plan, estado, dueño, nombre, categoría ni filas que ya existen (lo único que se completa es lo que estaba vacío: texto «sobre nosotros», logo y comodidades).
-- Idempotente: llaves fijas (md5 de cada fila, número de operación) y «on conflict do nothing» / «where not exists»; aplicarlo dos veces no cambia nada. Nada se borra.
-- Teléfonos de ficción de clientes: +1 717 555 6300–6599. Números de operación: 39000000–39999999.
begin;
create or replace function pg_temp.c_ts(d int, m int) returns timestamptz language sql stable as $f$ select (((now() at time zone 'America/New_York')::date + d) + make_interval(mins => m)) at time zone 'America/New_York' $f$;`;
}
export function sqlClientes() {
  const vals = CLIENTES.map((c) => `(${q(c.tel)}, now() - interval '300 days', ${q(c.nombre)}, ${q(c.ap)}, ${q(c.lang)}, ${q(c.ciudad)})`);
  const out = [];
  for (let i = 0; i < vals.length; i += 150) out.push(`insert into users (phone, phone_verified_at, first_name, last_name, lang, home_city_id) values\n${vals.slice(i, i + 150).join(",\n")}\non conflict (phone) do nothing;`);
  out.push(`drop table if exists _c_u; create temp table _c_u on commit drop as select phone, id from users where phone between '+17175556300' and '+17175556599';`);
  out.push(`drop table if exists _c_own; create temp table _c_own (business_id text, user_id uuid) on commit drop;`);
  return out.join("\n");
}

/* ── Ficha: texto, logo, comodidades (solo si están vacíos), fotos, equipo, preguntas ── */
export function sqlFicha(B, F) {
  const L = [];
  if (!B.aboutEs && F.about) L.push(`update businesses set about = ${J(F.about)} where id = ${q(B.id)} and (about is null or about = '{}'::jsonb or coalesce(about->>'es', '') = '');`);
  else if (B.aboutEs && !B.aboutEn && F.about) L.push(`update businesses set about = about || jsonb_build_object('en', ${q(F.about.en)}::text) where id = ${q(B.id)} and coalesce(about->>'en', '') = '' and coalesce(about->>'es', '') <> '';`);
  L.push(`update businesses set logo_url = ${q(logoSvg(B.name, B.id))} where id = ${q(B.id)} and logo_url is null;`);
  if (F.amenities?.length) L.push(`update businesses set amenities = ${TA(F.amenities)} where id = ${q(B.id)} and amenities = '{}'::text[];`);
  if (F.langs?.length) L.push(`update businesses set languages = ${TA(F.langs)} where id = ${q(B.id)} and languages = '{es}'::text[] and ${F.langs.length > 1};`);
  // fotos: se suman a las que ya tiene
  if (F.fotos?.length) {
    const vals = F.fotos.map((u, k) => `(${q(B.id)}, ${k}, ${q(u)})`);
    L.push(`insert into media (id, owner_kind, owner_id, url, credit, sort)
select md5('r2s2:img:' || v.b || ':' || v.k)::uuid, 'business', v.b, v.u, 'Pexels', coalesce((select max(sort) from media m where m.owner_kind = 'business' and m.owner_id = v.b), -1) + 1 + v.k
  from (values ${vals.join(", ")}) as v(b, k, u)
 where not exists (select 1 from media m where m.owner_kind = 'business' and m.owner_id = v.b and m.url = v.u) on conflict (id) do nothing;`);
  }
  // equipo (solo personal; el dueño de verdad lo pone el negocio)
  if (F.team?.length) {
    F.team.forEach((m, i) => {
      const mid = `md5('r2s2:m:${B.id}:${i}')::uuid`;
      L.push(`insert into business_members (id, business_id, user_id, kind, display_name, nickname, role, photo_url, languages, specialties, bio, panel_access, status, show_on_page, sort, since_year, same_as_business_hours, takes_bookings)
select ${mid}, ${q(B.id)}, null, 'staff', ${q(m.name)}, ${q(m.nick ?? null)}, ${J(m.role)}, ${q(RETRATOS[(B.idx * 3 + i) % RETRATOS.length])}, ${TA(m.langs ?? ["es"])}, ${J(m.spec ?? [])}, ${J(m.bio ?? null)}, '{}'::text[], 'active', true, ${i + 1}, ${m.since}, true, ${m.bookings === false ? "false" : "true"}
 where (select count(*) from business_members x where x.business_id = ${q(B.id)}) < 3 and not exists (select 1 from business_members x where x.id = ${mid} or (x.business_id = ${q(B.id)} and x.display_name = ${q(m.name)}));`);
    });
  }
  // preguntas frecuentes (solo si tiene menos de 4)
  if (F.faqs?.length) {
    F.faqs.forEach((f, i) => L.push(`insert into faqs (business_id, question, answer, sort) select ${q(B.id)}, ${J(BI(f[0], f[1]))}, ${J(BI(f[2], f[3]))}, ${i + 10}
 where (select count(*) from faqs x where x.business_id = ${q(B.id)}) < 4 and not exists (select 1 from faqs x where x.business_id = ${q(B.id)} and x.question->>'es' = ${q(f[0])});`));
  }
  return L.join("\n");
}

/* ── Catálogo: secciones e ítems; solo suma hasta el objetivo y nunca repite un nombre ── */
function itemCols(it, sec, sort) {
  const m = it.m ?? "svc";
  const v = [
    q(m), sec ? "s" : "null", J(BI(it.es, it.en)), J(BI(it.des ?? "", it.den ?? it.des ?? "")), it.price ?? 0, q(it.unit ?? (m === "renta" ? "dia" : "u")), it.tax ?? 6, `array[${(it.fotos ?? []).map((f) => q(f)).join(",")}]::text[]`,
    TA(it.channels ?? (m === "svc" ? ["dlv", "pick"] : ["pick"])), q(it.stock ?? "none"), it.left ?? 0, it.par ?? 10, it.dur ?? (m === "svc" ? 30 : "null"), it.from ? "true" : "false", J(it.opts ?? []), q(it.kind ?? null), J(it.attrs ?? {}), it.dep ?? 0, J(it.attrs2 ?? {}), it.feat ? "true" : "false", sort, TA(it.tags ?? []),
  ];
  return `insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, channels, stock_mode, stock_left, stock_par, duration_min, price_from, svc_opts, svc_kind, svc_attrs, deposit_cents, attrs, featured, sort, tags) values (b, ${v.join(", ")})`;
}
/* plan.secciones: [{es,en,items:[...]}], plan.sueltos: [...] (ítems con .after = SQL que usa «it»). objetivo: cuántos ítems «svc» debe tener el negocio; todo: true = si le faltan se agrega el catálogo completo. */
export function sqlCatalogo(B, secciones, sueltos, objetivo, todo = false) {
  const L = [`do $$\ndeclare b text := ${q(B.id)}; s bigint; it bigint; n int; go boolean;\nbegin`, `  select count(*) into n from items where business_id = b and module = 'svc' and removed_at is null;`, `  go := n < ${objetivo};`];
  const igual = (it) => `not exists (select 1 from items x where x.business_id = b and x.name->>'es' = ${q(it.es)} and x.module = ${q(it.m ?? "svc")} and x.removed_at is null)`;
  const cond = (it) => ((it.m ?? "svc") === "svc" ? `(${todo ? "go" : `n < ${objetivo}`}) and ` : "") + igual(it);
  const suma = (it) => ((it.m ?? "svc") === "svc" ? "n := n + 1; " : "");
  let k = 0;
  for (const sec of secciones) {
    const m = sec.m ?? "svc";
    // svc: hasta el objetivo; tienda y renta: solo si el negocio no tiene ninguno de ese módulo
    L.push(`  if ${m === "svc" ? (todo ? "go" : `n < ${objetivo}`) : `not exists (select 1 from items x where x.business_id = b and x.module = ${q(m)} and x.removed_at is null)`} then
    select id into s from item_sections where business_id = b and module = ${q(m)} and name->>'es' = ${q(sec.es)} limit 1;
    if s is null then insert into item_sections (business_id, module, name, sort) values (b, ${q(m)}, ${J(BI(sec.es, sec.en))}, ${sec.sort ?? 0}) returning id into s; end if;`);
    sec.items.forEach((it) => {
      L.push(`    if ${m === "svc" ? cond(it) : igual(it)} then ${itemCols(it, true, k++)}${it.ret || it.after ? " returning id into it" : ""}; ${it.after ? it.after + " " : ""}${suma(it)}end if;`);
    });
    L.push("  end if;");
  }
  for (const it of sueltos ?? []) {
    L.push(`  if ${cond(it)} then ${itemCols(it, false, it.sort ?? k++)}${it.ret || it.after ? " returning id into it" : ""}; ${it.after ? it.after + " " : ""}${suma(it)}end if;`);
  }
  L.push("end $$;");
  return L.join("\n");
}

/* ── Historia: operaciones, eventos, líneas, pagos ── */
const CONV = (v) => (v == null ? "null" : String(v));
export function sqlOps(filas) {
  const out = [];
  for (let i = 0; i < filas.length; i += 300) {
    const parte = filas.slice(i, i + 300).map((o) => `(${[q(o.num), q(o.kind), q(o.city), q(o.biz), q(o.ph), o.mem == null ? "null" : q(o.mem), q(o.st), q(o.sd ?? null), ts(o.d, o.m), o.dur ?? "null", q(JSON.stringify(o.det)), o.sub, o.dep ?? 0, o.tot, q(o.pm), q(o.ps ?? null),
      ts(o.sentD, o.sentM), ts(o.ansD, o.ansM), ts(o.doneD, o.doneM), ts(o.cancD, o.cancM), q(o.cby ?? null), q(o.creason ?? null), o.party ?? "null", q(o.note ?? null), o.mode ? q(o.mode) : "null", q(o.stage ?? null)].join(", ")})`);
    out.push(`insert into operations (number, kind, city_id, business_id, user_id, member_id, status, status_detail, scheduled_at, duration_min, details, subtotal_cents, deposit_cents, total_cents, pay_mode, pay_status,
    sent_at, answered_at, confirmed_at, done_at, cancelled_at, cancelled_by, cancel_reason, party_size, customer_note, mode, stage, client_key, is_test)
select v.num, v.kind, v.city, v.biz, u.id, (select m.id from business_members m where m.id = md5(v.mem)::uuid), v.st, v.sd, v.sched::timestamptz, v.dur::smallint, v.det::jsonb, v.sub, v.dep, v.tot, v.pm, v.ps,
       v.sent::timestamptz, v.ans::timestamptz, case when v.st in ('confirmed', 'done') or (v.st = 'cancelled' and v.ans is not null) then v.ans::timestamptz end, v.done::timestamptz, v.canc::timestamptz, v.cby, v.creason, v.party::smallint, v.note, v.mode, v.stage,
       md5('r2s2:ck:' || v.num)::uuid, false
  from (values\n${parte.join(",\n")}) as v(num, kind, city, biz, ph, mem, st, sd, sched, dur, det, sub, dep, tot, pm, ps, sent, ans, done, canc, cby, creason, party, note, mode, stage)
  join _c_u u on u.phone = v.ph
on conflict do nothing;`);
  }
  return out.join("\n");
}
export function sqlEventos(evs) {
  const out = [];
  for (let i = 0; i < evs.length; i += 500) {
    const parte = evs.slice(i, i + 500).map((e) => `(${q(e.num)}, ${q(e.kind)}, ${q(e.actor)}, ${e.d}, ${e.m})`);
    out.push(`insert into operation_events (operation_id, at, kind, actor)
select o.id, pg_temp.c_ts(v.d, v.m), v.kind, v.actor from (values\n${parte.join(",\n")}) as v(num, kind, actor, d, m) join operations o on o.number = v.num
 where not exists (select 1 from operation_events e where e.operation_id = o.id);`);
  }
  return out.join("\n");
}
export const sqlLineasPagos = () => `insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct)
select o.id, i.id, coalesce(i.name, jsonb_build_object('es', coalesce(o.details#>>'{svc,es}', o.details#>>'{item,es}'), 'en', coalesce(o.details#>>'{svc,en}', o.details#>>'{item,en}'))), greatest(1, coalesce((o.details->>'qty')::int, 1)), o.subtotal_cents, o.total_cents, 0
  from operations o left join items i on i.business_id = o.business_id and i.module = 'svc' and i.removed_at is null and i.name->>'es' = coalesce(o.details#>>'{svc,es}', o.details#>>'{item,es}')
 where o.details->>'demo' = 'r2s2' and o.total_cents > 0 and o.status in ('done', 'confirmed') and not exists (select 1 from operation_lines l where l.operation_id = o.id);
insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, fee_cents, status, card_brand, card_last4, held_at, captured_at, simulated, created_at)
select o.id, o.user_id, o.business_id, o.city_id, 'full', 'card', 'pi_sim_demor2s2_' || o.number, o.total_cents, round(o.total_cents * 0.08)::int, 'captured', (array['visa', 'mastercard', 'visa', 'amex'])[1 + (o.id % 4)::int], lpad(((o.id * 7919) % 10000)::text, 4, '0'), o.confirmed_at, o.done_at, true, o.sent_at
  from operations o where o.details->>'demo' = 'r2s2' and o.pay_status = 'captured' and o.total_cents > 0 and o.done_at is not null and not exists (select 1 from payments p where p.operation_id = o.id) on conflict do nothing;`;

export function sqlResenas(filas) {
  const out = [];
  for (let i = 0; i < filas.length; i += 200) {
    const parte = filas.slice(i, i + 200).map((x) => `(${[q(x.biz), q(x.city), q(x.ph), q(x.op), q(x.src), x.stars, q(x.body), q(x.lang), q(JSON.stringify(x.answers ?? {})), q(JSON.stringify(x.facts ?? {})), q(x.reply ?? null), x.rd ?? "null", x.rm ?? "null", q(x.rlang ?? null), x.cd, x.cm].join(", ")})`);
    out.push(`insert into reviews (business_id, city_id, user_id, operation_id, src, stars, body, lang, answers, facts, reply, reply_at, reply_by, reply_lang, created_at)
select v.biz, v.city, u.id, o.id, v.src, v.stars, v.body, v.lang, v.ans::jsonb, v.facts::jsonb, v.reply, case when v.reply is null then null else pg_temp.c_ts(v.rd, v.rm) end, null, v.rlang, pg_temp.c_ts(v.cd, v.cm)
  from (values\n${parte.join(",\n")}) as v(biz, city, ph, op, src, stars, body, lang, ans, facts, reply, rd, rm, rlang, cd, cm)
  join _c_u u on u.phone = v.ph
  left join operations o on o.number = v.op
where not exists (select 1 from reviews x where x.business_id = v.biz and x.user_id = u.id and x.status <> 'removed') on conflict do nothing;`);
  }
  return out.join("\n");
}
export function sqlPosts(B, posts) {
  const parte = posts.map((p) => `(${[q(p.kind), q(p.title), q(p.body), p.was ?? "null", p.now ?? "null", p.d, p.m, p.pin ? "true" : "false", ts(p.endD ?? null, 1200)].join(", ")})`);
  return `insert into business_posts (business_id, city_id, kind, title, body, link_kind, price_was_cents, price_now_cents, publish_at, status, pinned, ends_at, created_at, created_by)
select ${q(B.id)}, ${q(B.city)}, v.kind, v.title, v.body, 'none', v.was::int, v.now::int, pg_temp.c_ts(v.d, v.m), 'live', v.pin, v.ends::timestamptz, pg_temp.c_ts(v.d, v.m), null
  from (values\n${parte.join(",\n")}) as v(kind, title, body, was, now, d, m, pin, ends)
 where not exists (select 1 from business_posts p where p.business_id = ${q(B.id)} and p.title = v.title);`;
}
export function sqlSeguidores(B, lista) {
  const parte = lista.map((s) => `(${q(s.ph)}, ${s.d})`);
  return `insert into follows (follower_user_id, target_kind, target_id, created_at)
select u.id, 'business', ${q(B.id)}, pg_temp.c_ts(v.d, 700) from (values ${parte.join(", ")}) as v(ph, d) join _c_u u on u.phone = v.ph on conflict do nothing;`;
}
export function sqlLicencias(B, kinds) {
  if (!kinds?.length) return "";
  return `insert into licenses (business_id, city_id, kind, title, can, cannot, issuer, registry_url, status, source, sort, checked_at, next_review)
select b.id, b.city_id, k.key, k.title, k.can, coalesce(k.cannot, '[]'::jsonb), k.issuer->>'es', k.registry_url, 'valid', 'semilla', o.n, now(), (now() + interval '3 months')::date
  from businesses b cross join lateral unnest(${TA(kinds)}) with ordinality o(k, n) join license_kinds k on k.key = o.k
 where b.id = ${q(B.id)} and not exists (select 1 from licenses l where l.business_id = b.id and l.kind = k.key);`;
}
export function pie(ids) {
  return `-- Lo derivado lo calculan las funciones de la base: ★ y conteo, «Útil», fuerza del perfil, licencias, conteo de fotos.
insert into review_helpful (review_id, user_id)
select r.id, h.id from reviews r cross join lateral (select u.id from _c_u u where u.id <> r.user_id order by md5(r.id::text || u.phone) limit (r.id % 5)::int) h
 where r.business_id = any(${TA(ids)}) and not exists (select 1 from review_helpful x where x.review_id = r.id) on conflict do nothing;
update reviews r set helpful_count = (select count(*) from review_helpful h where h.review_id = r.id) where r.business_id = any(${TA(ids)}) and r.helpful_count <> (select count(*) from review_helpful h where h.review_id = r.id);
select reviews_stats(id) from unnest(${TA(ids)}) id;
select licencias_refrescar(id) from unnest(${TA(ids)}) id;
update business_stats_cache s set photo_count = (select count(*) from media m where m.owner_kind = 'business' and m.owner_id = s.business_id and m.status = 'visible'), updated_at = now() where s.business_id = any(${TA(ids)});
update business_stats_cache set profile_strength = perfil_fuerza(business_id), updated_at = now() where business_id = any(${TA(ids)});
-- «dia» y el id del ítem de cada visita salen de lo ya guardado
update operations o set details = o.details || jsonb_build_object('dia', (o.scheduled_at at time zone 'America/New_York')::date::text)
 where o.details->>'demo' = 'r2s2' and o.kind = 'visit' and not (o.details ? 'dia');
update operations o set details = o.details || jsonb_build_object('item_id', i.id::text)
  from items i where o.details->>'demo' = 'r2s2' and o.kind = 'visit' and not (o.details ? 'item_id') and i.business_id = o.business_id and i.module = 'svc' and i.name->>'es' = o.details#>>'{item,es}';
commit;`;
}
