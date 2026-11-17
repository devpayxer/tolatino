/* Grupo C · núcleo: de las especificaciones de cada categoría arma el SQL (negocio, catálogo, equipo, historia, reseñas, novedades, seguidores).
   Todo determinista. Los datos derivados (★, conteos, fuerza del perfil, licencias, pagos con su comisión) los calculan al final las funciones de la base. */
import { Rng, q, J, TA, BI, slug, logoSvg, horarioSQL, CIUDADES, ORDEN_CIUDADES, lugar, telDueno, clientes, fotosDeSubs, RETRATOS, px, hash, diaDeVida, dedupe, money } from "./base.mjs";

export const CLIENTES = clientes();
const CLI_POR_CIUDAD = Object.fromEntries(ORDEN_CIUDADES.map((c) => [c, CLIENTES.filter((x) => x.ciudad === c)]));

/* ── Especificaciones: 5 subcategorías × 10 negocios, 2 por ciudad ── */
export function especificar(mod, idxBase, existentes) {
  const usados = new Set(existentes), out = [];
  let k = 0;
  for (const sub of mod.subs) {
    sub.negocios.forEach((nom, j) => {
      const r = new Rng(`b:${mod.cat}:${sub.id}:${j}`);
      const ciudad = ORDEN_CIUDADES[j % 5], L = lugar(ciudad, r);
      const mujer = r.chance(0.28), nombre = mujer ? r.pick(["María", "Rosa", "Carmen", "Yokasta", "Mariela", "Altagracia", "Noelia", "Milagros", "Marisol", "Griselda"]) : r.pick(["Rafael", "José", "Luis", "Carlos", "Miguel", "Ramón", "Wilfredo", "Héctor", "Pedro", "Manuel", "Julio", "Freddy", "Edwin", "Víctor", "Nelson", "Orlando", "Domingo", "Francisco"]);
      const ap = r.pick(["Rodríguez", "Martínez", "García", "Díaz", "Pérez", "Santana", "Jiménez", "Almonte", "Peña", "Reyes", "Cabrera", "Núñez", "Vargas", "Féliz", "Batista", "Tavárez", "Méndez", "Ortiz", "Rosario", "Mejía", "Castillo", "Ramírez", "Torres", "Soto", "Colón", "Medina", "Polanco", "Guzmán", "Morel", "Brito"]);
      const id = dedupe(usados, slug(nom));
      out.push({
        cat: mod.cat, sub: sub.id, j, idx: idxBase + k++, id, name: nom, city: ciudad, ...L, founded: r.int(2008, 2018),
        owner: { tel: telDueno(idxBase + k - 1), nombre, ap, mujer }, phone: `+1${CIUDADES[ciudad].area}55501${String(r.int(0, 99)).padStart(2, "0")}`,
        size: r.pick([0.55, 0.7, 0.85, 1, 1, 1.1, 1.25, 1.5, 1.9]), wa: r.chance(0.6), seed: `${mod.cat}:${id}`, extra: sub.extra?.[j] ?? null,
      });
    });
  }
  return out;
}

/* ── Texto de dueño/equipo ── */
function equipoSQL(B, plan, r) {
  const T = plan.team, filas = [];
  T.forEach((m, i) => {
    const owner = i === 0, mid = `md5('democ:m:${B.id}:${i}')::uuid`;
    filas.push(`insert into business_members (id, business_id, user_id, kind, display_name, nickname, role, photo_url, languages, specialties, bio, panel_access, status, show_on_page, sort, since_year, same_as_business_hours, takes_bookings${plan.certOwner && owner ? ", certification" : ""})
  select ${mid}, b, ${owner ? "(select id from users where phone = " + q(B.owner.tel) + ")" : "null"}, ${q(owner ? "owner" : "staff")}, ${q(m.name)}, ${q(m.nick ?? null)}, ${J(m.role)}, ${q(RETRATOS[(B.idx * 3 + i) % RETRATOS.length])}, ${TA(m.langs ?? ["es"])}, ${J(m.spec ?? [])}, ${J(m.bio ?? null)}, ${owner ? "'{all}'" : "'{}'"}::text[], 'active', true, ${i}, ${m.since}, true, ${m.bookings === false ? "false" : "true"}${plan.certOwner && owner ? ", " + J(plan.certOwner) : ""}
  where not exists (select 1 from business_members x where x.id = ${mid});`);
  });
  return filas.join("\n  ");
}

/* ── Catálogo: secciones e ítems ── */
function itemSQL(B, it, sec, sort) {
  const base = ["business_id", "module", "section_id", "name", "descr", "price_cents", "unit", "tax_pct", "photos", "channels", "stock_mode", "stock_left", "stock_par", "duration_min", "price_from", "svc_opts", "svc_kind", "svc_attrs", "deposit_cents", "attrs", "featured", "sort", "tags"];
  const m = it.m ?? "svc";
  const v = [
    "b", q(m), sec ? "s" : "null", J(BI(it.es, it.en)), J(BI(it.des ?? "", it.den ?? it.des ?? "")), it.price ?? 0, q(it.unit ?? (m === "renta" ? "dia" : "u")), it.tax ?? 6, `array[${(it.fotos ?? []).map((f) => q(f)).join(",")}]::text[]`,
    TA(it.channels ?? (m === "svc" ? ["dlv", "pick"] : ["pick"])), q(it.stock ?? "none"), it.left ?? 0, it.par ?? 10, it.dur ?? (m === "svc" ? 30 : "null"), it.from ? "true" : "false", J(it.opts ?? []), q(it.kind ?? null), J(it.attrs ?? {}), it.dep ?? 0, J(it.attrs2 ?? {}), it.feat ? "true" : "false", sort, TA(it.tags ?? []),
  ];
  return `insert into items (${base.join(", ")}) values (${v.join(", ")})` + (it.ret ? ` returning id into it;` : ";");
}

/* ── Un negocio completo (bloque DO) ── */
export function sqlNegocio(B, plan) {
  const r = new Rng(B.seed + ":sql");
  const fotos = plan.galeria, o = B.owner;
  const L = [];
  L.push(`do $$\ndeclare b text := ${q(B.id)}; s bigint; it bigint;\nbegin\n  if exists (select 1 from businesses where id = b) then return; end if;`);
  L.push(`  insert into users (phone, phone_verified_at, first_name, last_name, lang, home_city_id, is_test, created_at) values (${q(o.tel)}, now(), ${q(o.nombre)}, ${q(o.ap)}, 'es', ${q(B.city)}, false, now() - interval '400 days') on conflict (phone) do nothing;`);
  L.push(`  insert into businesses (id, city_id, category_id, subcategory_ids, name, status, origin, owner_user_id, operation, address, geo, works_from_home, service_radius_mi, phone, whatsapp, languages, about, founded_year, amenities, filter_values, payment_modes, category_attrs, logo_url, modules_on, svc_model, is_demo)
  values (b, ${q(B.city)}, ${q(B.cat)}, ${TA(plan.subs)}, ${q(B.name)}, 'active', 'self', (select id from users where phone = ${q(o.tel)}), ${q(plan.operation ?? "local")}, ${q(B.addr)}, st_geogfromtext('POINT(${B.lng} ${B.lat})'), ${plan.deCasa ? "true" : "false"}, ${plan.radio ?? "null"}, ${q(B.phone)}, ${B.wa}, ${TA(plan.langs)}, ${J(plan.about)}, ${B.founded}, ${TA(plan.amenities)}, ${TA(plan.filtros)}, '{local}', ${J(plan.attrs)}, ${q(logoSvg(B.name, B.id))}, ${TA(plan.modulos)}, ${q(plan.svcModel ?? "emp")}, true);`);
  L.push(`  insert into business_stats_cache (business_id, plan, verified, photo_count) values (b, 'pro', true, ${fotos.length}) on conflict (business_id) do update set plan = 'pro', verified = true, photo_count = excluded.photo_count, updated_at = now();`);
  const fecha = `${B.founded}-${String(3 + (B.idx % 7)).padStart(2, "0")}-${String(5 + (B.idx % 20)).padStart(2, "0")}`;
  L.push(`  insert into subscriptions (business_id, status, cycle, price_cents, trial_started_at, trial_ends_at, trial_choice, current_period_end, created_at) values (b, 'active', ${B.idx % 4 === 0 ? "'year'" : "'month'"}, ${B.idx % 4 === 0 ? 14990 : 1499}, ${q(fecha)}::date, ${q(fecha)}::date + 30, 'card', now() + interval '${10 + (B.idx % 20)} days', ${q(fecha)}::date) on conflict (business_id) do nothing;`);
  L.push(horarioSQL("b", plan.semana).replace(/\(\x27b\x27/g, "(b").replace(/values \('([^']+)'/g, (m, x) => (x === B.id ? "values (b" : m)));
  fotos.forEach((u, i) => L.push(`  insert into media (id, owner_kind, owner_id, url, credit, sort) values (md5('democ:img:${B.id}:${i}')::uuid, 'business', b, ${q(u)}, 'Pexels', ${i}) on conflict (id) do nothing;`));
  L.push(equipoSQL(B, plan, r).replace(/^/, "  "));
  plan.faqs.forEach((f, i) => L.push(`  insert into faqs (business_id, question, answer, sort) values (b, ${J(BI(f[0], f[1]))}, ${J(BI(f[2], f[3]))}, ${i});`));
  for (const s of plan.settings) L.push("  " + s);
  if (plan.stripe) L.push(`  insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated) values (b, 'acct_sim_' || b, 'enabled', true, true, '[]'::jsonb, ${q(String(1000 + (hash(B.id) % 8999)))}, true) on conflict (business_id) do nothing;`);
  let sort = 0;
  for (const sec of plan.secciones) {
    L.push(`  insert into item_sections (business_id, module, name, sort) values (b, ${q(sec.m ?? "svc")}, ${J(BI(sec.es, sec.en))}, ${sec.sort ?? 0}) returning id into s;`);
    sec.items.forEach((it, i) => { L.push("  " + itemSQL(B, it, true, i)); if (it.after) L.push("  " + it.after); });
    sort++;
  }
  for (const it of plan.sueltos ?? []) { L.push("  " + itemSQL(B, it, false, it.sort ?? 0)); if (it.after) L.push("  " + it.after); }
  for (const s of plan.despues ?? []) L.push("  " + s);
  L.push("end $$;");
  return L.join("\n");
}

/* ── Historia: operaciones ── */
export const MIN_HORA = (h, m = 0) => h * 60 + m;
export function elegirClientes(B, r, n) { // lista de clientes para n operaciones: ~75 % caras nuevas
  const mismos = CLI_POR_CIUDAD[B.city], otros = CLIENTES.filter((x) => x.ciudad !== B.city);
  const pool = [...r.shuffle(mismos), ...r.shuffle(otros)], out = []; let nuevo = 0;
  for (let i = 0; i < n; i++) {
    if (i > 3 && (r.chance(0.28) || nuevo >= pool.length)) out.push(out[r.int(0, out.length - 1)]);
    else out.push(pool[nuevo++ % pool.length]);
  }
  return out;
}

const CONV = (v) => (v == null ? "null" : String(v));
/* Una fila de VALUES de operación. t(d,m) → pg_temp.c_ts */
export const ts = (d, m) => (d == null ? "null" : `pg_temp.c_ts(${d},${m})`);
export function sqlOps(filas) {
  const out = [];
  for (let i = 0; i < filas.length; i += 300) {
    const parte = filas.slice(i, i + 300).map((o) => `(${[q(o.num), q(o.kind), q(o.city), q(o.biz), q(o.ph), o.mem == null ? "null" : q(o.mem), q(o.st), q(o.sd ?? null), ts(o.d, o.m), o.dur ?? "null", q(JSON.stringify(o.det)), o.sub, o.dep ?? 0, o.tot, q(o.pm), q(o.ps ?? null),
      ts(o.sentD, o.sentM), ts(o.ansD, o.ansM), ts(o.doneD, o.doneM), ts(o.cancD, o.cancM), q(o.cby ?? null), q(o.creason ?? null), o.party ?? "null", q(o.note ?? null), o.mode ? q(o.mode) : "null", q(o.stage ?? null)].join(", ")})`);
    out.push(`insert into operations (number, kind, city_id, business_id, user_id, member_id, status, status_detail, scheduled_at, duration_min, details, subtotal_cents, deposit_cents, total_cents, pay_mode, pay_status,
    sent_at, answered_at, confirmed_at, done_at, cancelled_at, cancelled_by, cancel_reason, party_size, customer_note, mode, stage, client_key, is_test)
select v.num, v.kind, v.city, v.biz, u.id, case when v.mem is null then null else md5(v.mem)::uuid end, v.st, v.sd, v.sched::timestamptz, v.dur::smallint, v.det::jsonb, v.sub, v.dep, v.tot, v.pm, v.ps,
       v.sent::timestamptz, v.ans::timestamptz, case when v.st in ('confirmed', 'done') or (v.st = 'cancelled' and v.ans is not null) then v.ans::timestamptz end, v.done::timestamptz, v.canc::timestamptz, v.cby, v.creason, v.party::smallint, v.note, v.mode, v.stage,
       md5('democ:ck:' || v.num)::uuid, true
  from (values\n${parte.join(",\n")}) as v(num, kind, city, biz, ph, mem, st, sd, sched, dur, det, sub, dep, tot, pm, ps, sent, ans, done, canc, cby, creason, party, note, mode, stage)
  join _c_u u on u.phone = v.ph
on conflict do nothing;`);
  }
  return out.join("\n");
}

/* ── Reseñas ── */
export function sqlResenas(filas) {
  const out = [];
  for (let i = 0; i < filas.length; i += 200) {
    const parte = filas.slice(i, i + 200).map((x) => `(${[q(x.biz), q(x.city), q(x.ph), q(x.op), q(x.src), x.stars, q(x.body), q(x.lang), q(JSON.stringify(x.answers)), q(JSON.stringify(x.facts)), q(x.reply ?? null), x.rd ?? "null", x.rm ?? "null", q(x.rlang ?? null), x.cd, x.cm].join(", ")})`);
    out.push(`insert into reviews (business_id, city_id, user_id, operation_id, src, stars, body, lang, answers, facts, reply, reply_at, reply_by, reply_lang, created_at)
select v.biz, v.city, u.id, o.id, v.src, v.stars, v.body, v.lang, v.ans::jsonb, v.facts::jsonb, v.reply, case when v.reply is null then null else pg_temp.c_ts(v.rd, v.rm) end, case when v.reply is null then null else ow.user_id end, v.rlang, pg_temp.c_ts(v.cd, v.cm)
  from (values\n${parte.join(",\n")}) as v(biz, city, ph, op, src, stars, body, lang, ans, facts, reply, rd, rm, rlang, cd, cm)
  join _c_u u on u.phone = v.ph
  left join operations o on o.number = v.op
  left join _c_own ow on ow.business_id = v.biz
on conflict do nothing;`);
  }
  return out.join("\n");
}

/* ── Novedades ── */
export function sqlPosts(B, posts) {
  const parte = posts.map((p) => `(${[q(p.kind), q(p.title), q(p.body), p.was ?? "null", p.now ?? "null", p.d, p.m, p.pin ? "true" : "false", ts(p.endD ?? null, 1200)].join(", ")})`);
  return `insert into business_posts (business_id, city_id, kind, title, body, link_kind, price_was_cents, price_now_cents, publish_at, status, pinned, ends_at, created_at, created_by)
select ${q(B.id)}, ${q(B.city)}, v.kind, v.title, v.body, 'none', v.was::int, v.now::int, pg_temp.c_ts(v.d, v.m), 'live', v.pin, v.ends::timestamptz, pg_temp.c_ts(v.d, v.m), (select user_id from _c_own where business_id = ${q(B.id)})
  from (values\n${parte.join(",\n")}) as v(kind, title, body, was, now, d, m, pin, ends)
 where not exists (select 1 from business_posts p where p.business_id = ${q(B.id)} and p.title = v.title);`;
}
export function sqlSeguidores(B, lista) {
  const parte = lista.map((s) => `(${q(s.ph)}, ${s.d})`);
  return `insert into follows (follower_user_id, target_kind, target_id, created_at)
select u.id, 'business', ${q(B.id)}, pg_temp.c_ts(v.d, 700) from (values ${parte.join(", ")}) as v(ph, d) join _c_u u on u.phone = v.ph on conflict do nothing;`;
}

/* ── Encabezado y pie del archivo ── */
export function cabecera(titulo, ids) {
  return `-- GENERADO por scripts/semilla/demos/grupo-c.mjs — ${titulo}. SOLO SANDBOX (is_demo = true). No editar a mano.
-- Idempotente: llaves fijas (id del negocio, número de operación, md5 de cada fila) y «on conflict do nothing»; aplicarlo dos veces no cambia nada. Nada se borra.
-- Solo hechos base: ★, conteos, fuerza del perfil y licencias los recalculan al final las funciones de la base (reviews_stats, perfil_fuerza, licencias_refrescar).
begin;
create or replace function pg_temp.c_ts(d int, m int) returns timestamptz language sql stable as $f$ select (((now() at time zone 'America/New_York')::date + d) + make_interval(mins => m)) at time zone 'America/New_York' $f$;`;
}
