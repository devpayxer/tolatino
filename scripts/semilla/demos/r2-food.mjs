#!/usr/bin/env node
/* Ronda 2 · FOOD (NEG-FOOD): las 48 subcategorías que la ronda 1 no cubrió (NEG-FOOD-06 a 53; la ronda 1 hizo las 5 primeras por sort),
   10 negocios cada una (2 por ciudad, rotadas) = 480 negocios. Reutiliza por import los ayudantes de la ronda 1 (grupo A: comun, negocio, sql, food-menu).
   Uso: node scripts/semilla/demos/r2-food.mjs   →  infra/pruebas/demos/demo-x-food.sql
   Determinista (PRNG con semilla), una transacción, llaves fijas y «on conflict do nothing». SOLO SANDBOX.
   Rangos reservados: dueños +1484555 0000–0479 · clientes +1717555 0000–0299 · números de operación 21000000–21999999. */
import { writeFileSync, mkdirSync } from "node:fs";
import { rng, q, j, bi, hash, FIRST_F, FIRST_M, SURN, CIUDAD_IDS, photoUrl } from "./a/comun.mjs";
import { armar, ciudadDe, anioFundado } from "./a/negocio.mjs";
import { FUNCIONES, bloqueNegocio } from "./a/sql.mjs";
import { COCINAS, FOTOS } from "./a/food-menu.mjs";
import { SUBS } from "./r2-food/subs.mjs";
import { PERFILES, CARGO, aboutDe, faqsDe } from "./r2-food/perfiles.mjs";
import { armarMenu, CATALOGO } from "./r2-food/menus.mjs";
import { sqlMenu, genOrdenes, genResenas, genNovedades, EQUIPO, FIRST_FEM, NUM_BASE } from "./r2-food/motor.mjs";

const RAIZ = new URL("../../..", import.meta.url).pathname;
const SALIDA = RAIZ + "infra/pruebas/demos/";
mkdirSync(SALIDA, { recursive: true });
const jsonSql = (o) => `$j$${JSON.stringify(o).replace(/\$j\$/g, "")}$j$::jsonb`;
const N_CLI = 300;

// ── Clientes propios (+1717555 0000–0299): 300 personas ficticias, nombres distintos entre sí ──
const CLIENTES = (() => {
  const out = [], seen = new Set();
  for (let i = 0; i < N_CLI; i++) {
    const fem = i % 2 === 1, F = fem ? FIRST_F : FIRST_M;
    let a = (i * 9 + (fem ? 2 : 5)) % F.length, b = (i * 13 + Math.floor(i / 47) * 3) % SURN.length, k = 0;
    while (seen.has(F[a] + SURN[b])) { b = (b + 1) % SURN.length; if (++k > 70) { a = (a + 1) % F.length; k = 0; } }
    seen.add(F[a] + SURN[b]);
    out.push({ idx: i, phone: `+1717555${String(i).padStart(4, "0")}`, first: F[a], last: SURN[b], city: CIUDAD_IDS[(i * 3 + 2) % 5], lang: i % 6 === 5 ? "en" : "es" });
  }
  return out;
})();
const CLIENTES_SQL = () => `insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, created_at)
select x->>'p', now() - interval '4 years', x->>'f', x->>'l', x->>'c', x->>'g', now() - make_interval(days => 200 + (x->>'i')::int * 6)
  from jsonb_array_elements($j$${JSON.stringify(CLIENTES.map((c) => ({ p: c.phone, f: c.first, l: c.last, c: c.city, g: c.lang, i: c.idx })))}$j$::jsonb) x
on conflict (phone) do nothing;
create temp table da_cli on commit drop as
  select (t.o - 1)::int as idx, u.id from jsonb_array_elements_text($j$${JSON.stringify(CLIENTES.map((c) => c.phone))}$j$::jsonb) with ordinality t(p, o) join users u on u.phone = t.p;
alter table da_cli add primary key (idx);
`;

// ── Fotos del negocio: solo IDs que ya están en las semillas (platos del catálogo y fotos de negocios de la semilla) ──
const RELLENO = { bar: [2337843, 12253092, 34321369, 36408393], ice: [27518954, 3651045, 8215113, 4239] };
const fotosDe = (sub, ck, r, kind) => {
  let pool = ck ? [...FOTOS[ck], ...FOTOS.gen.slice(0, 3)] : [...CATALOGO[sub.menu.slice(2)].ph];
  for (const x of RELLENO[kind] ?? FOTOS.gen) { if (pool.length >= 6) break; if (!pool.includes(x)) pool.push(x); }
  return r.shuffle([...new Set(pool)]).slice(0, 5);
};

const FUERA_DEF = {
  ct: { take: { alm: 6, ant: 3, pos: 1, beb: 3 }, combo: "truck" },
  cs: { take: { ant: 6, alm: 2, lad: 2, pos: 2, beb: 3 } },
  cd: { combo: "dark" },
};
const STEP = [7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]; // primos con 300 = 2²·3·5²

const negocios = [];
let baseOps = 0, idx = 0;
for (const sub of SUBS) {
  const prof = PERFILES[sub.kind];
  for (let k = 0; k < 10; k++) {
    const [name, cKey] = sub.names[k].split("|");
    const ck = sub.menu.startsWith("c:") ? sub.menu.slice(2) : cKey ?? null;
    const def = sub.menu.startsWith("k:") ? { cat: sub.menu.slice(2) } : sub.menu.startsWith("c:") ? {} : FUERA_DEF[sub.menu];
    const c = ck ? COCINAS[ck] : null;
    const what = sub.what ?? [`comida ${c.es}`, `${c.en} food`];
    const r = rng(`r2food:${name}`);
    const founded = anioFundado(r);
    const city = ciudadDe(sub.n, k);
    const subs = [`NEG-FOOD-${String(sub.n).padStart(2, "0")}`];
    if (!sub.menu.startsWith("c:") && c && !subs.includes(c.sub)) subs.push(c.sub);
    const filter = [...prof.filter];
    if (prof.tpl === "rest" && r.chance(0.35)) filter.push("menudia");
    if (founded <= 2016) filter.push("y10");
    const bz = armar({
      n: 500 + idx, cat: "NEG-FOOD", name, subs, city, founded, about: null, attrs: null, filter, mods: ["menu", "pedidos", "nov", "staff"], amenities: prof.amen,
      hours: prof.hours(), photoIds: fotosDe(sub, ck, r, sub.kind), faqs: [], role: bi("", ""), bio: null, team: [], followers: r.int(15, 80),
    });
    bz.owner.phone = `+1484555${String(idx + (idx >= 181 ? 4 : 0)).padStart(4, "0")}`; // 0181–0184 son las cuentas de revisión de las tiendas
    const first = bz.owner.first, fem = FIRST_FEM(first);
    bz.about = aboutDe(prof.tpl, name, what, founded, first, bz.addr.street);
    bz.owner.role = CARGO(sub.kind, fem);
    bz.owner.bio = bi(`${first} lleva ${name} desde ${founded}. Todo se hace en el negocio, con atención directa y recetas propias.`, `${first} has run ${name} since ${founded}. Everything is made on site, with direct service and our own recipes.`);
    bz.team = EQUIPO(prof, r, founded);
    const disp = { ...prof.d, pay_card: true };
    bz.faqs = faqsDe(prof.tpl, disp).map(([qq, a]) => ({ q: qq, a }));
    const menu = armarMenu(def, ck, r);
    const { sql: sqlItems, flat } = sqlMenu(menu, r, disp);
    const posts = genNovedades(r, bz, flat, prof).slice(0, r.int(3, 6));
    const of = posts[0], ofIt = flat.find((x) => x.ord === of.it);
    const eta = disp.pickup ? `Pickup ${disp.prep} min` : `Delivery ${disp.prep} min`;
    const fee = disp.delivery ? `Delivery $${(disp.fee / 100).toFixed(2).replace(/\.00$/, "")}` : null;
    bz.attrs = { tarjeta: { eta: bi(eta, eta), ...(fee ? { fee: bi(fee, fee) } : {}), offer: bi(`${of.t.replace(/ hoy$/, "")}, hasta agotar`, `${ofIt.en} ${"$" + (of.now / 100).toFixed(of.now % 100 === 0 ? 0 : 2)}, while it lasts`) } };
    bz.sqlExtra = `  insert into delivery_settings (business_id, pickup, delivery, prep_min, scheduled_orders, auto_accept, pay_card, pay_cash_pickup, pay_cash_delivery, ask_tip, zone_mi, fee_cents, free_over_cents, min_order_cents, travel_min, who, pickup_note, proof)
  values (b, ${disp.pickup}, ${disp.delivery}, ${disp.prep}, true, ${prof.auto}, true, true, ${prof.cashDlv}, ${disp.delivery}, ${disp.zone}, ${disp.fee}, ${disp.free}, ${disp.min}, ${disp.zone <= 3 ? 10 : disp.zone <= 5 ? 15 : 20}, 'team', ${j(bi("Pide en la caja con tu número de pedido.", "Ask at the register with your order number."))}, false) on conflict (business_id) do nothing;
  insert into menu_settings (business_id, last_min, busy_min, low_alert) values (b, 15, 0, 3) on conflict (business_id) do nothing;
${sqlItems}`;
    const ops = genOrdenes(r, bz, menu, flat, disp, prof, r.int(prof.ops[0], prof.ops[1]), baseOps);
    baseOps += ops.length + 5;
    const hechas = ops.filter((o) => o.st === "done").length;
    const reviews = genResenas(r, bz, ops, flat, Math.min(40, Math.max(15, Math.round(hechas * r.pick([0.3, 0.38, 0.45])))), prof);
    bz.hist = { ops, reviews, posts };
    bz.fol = { st: hash(bz.id + "f") % N_CLI, n: bz.fol.n, stp: STEP[hash(bz.id + "s") % STEP.length] };
    bz.nItems = flat.length;
    negocios.push(bz);
    idx++;
  }
}
if (NUM_BASE + baseOps > 21999999) throw new Error("números de operación fuera del rango reservado");

// ── SQL ──
const ids = negocios.map((b) => b.id);
const listaIds = `array[${ids.map(q).join(",")}]::text[]`;
let sql = `-- Demo R2 · Comida y Bebidas (NEG-FOOD-06 a 53): ${negocios.length} negocios
-- GENERADO por scripts/semilla/demos/r2-food.mjs (determinista: la misma entrada da el mismo SQL). SOLO SANDBOX; nunca corre en producción.
-- Negocios de demostración con is_demo = true: Pro, con ficha completa, «lo que vende» completo e historia de varios años (pedidos, reseñas con
-- respuestas, novedades, seguidores). Solo hechos base: lo derivado lo recalculan las funciones de la propia app (reviews_stats, perfil_fuerza y el barrido).
-- Repetible: llaves fijas, nada se borra.
begin;
set local statement_timeout = 0;
` + CLIENTES_SQL() + FUNCIONES.split("247").join(String(N_CLI));
for (const b of negocios) sql += bloqueNegocio(b, b.sqlExtra);
sql += `create temp table da_it on commit drop as
  select business_id as biz, (row_number() over (partition by business_id order by id))::int as ord, id, name, price_cents, tax_pct
    from items where business_id = any(${listaIds}) and module = 'menu' and removed_at is null and not is_extra;
create temp table da_var on commit drop as
  select i.biz, i.ord, v.id, v.label from da_it i join item_variants v on v.item_id = i.id and v.removed_at is null;
`;
for (const b of negocios) {
  const h = b.hist;
  sql += `do $$ begin perform pg_temp.da_food(${q(b.id)}, ${jsonSql(h.ops)}); perform pg_temp.da_reviews(${q(b.id)}, ${jsonSql(h.reviews)});
  perform pg_temp.da_posts(${q(b.id)}, ${jsonSql(h.posts)}); perform pg_temp.da_follows(${q(b.id)}, ${b.fol.st}, ${b.fol.n}, ${b.fol.stp}, 3000); end $$;\n`;
}
sql += `-- Derivados con las funciones de la propia app (nunca a mano).
do $$ begin perform reviews_stats(id) from businesses where id = any(${listaIds}); end $$;
update business_stats_cache s set profile_strength = perfil_fuerza(s.business_id) where s.business_id = any(${listaIds});
commit;
`;
writeFileSync(SALIDA + "demo-x-food.sql", sql);
const tot = (f) => negocios.reduce((s, b) => s + f(b), 0);
console.log(`demo-x-food.sql: ${negocios.length} negocios · ${tot((b) => b.nItems)} ítems · ${tot((b) => b.hist.ops.length)} pedidos · ${tot((b) => b.hist.reviews.length)} reseñas · ${tot((b) => b.hist.posts.length)} novedades · ${(sql.length / 1e6).toFixed(1)} MB`);
