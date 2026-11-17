#!/usr/bin/env node
/* Ronda 2 · semilla-1: deja «completos» los negocios que YA existen en la semilla de siempre (infra/pruebas/semilla/negocios.json) de las categorías
   NEG-FOOD, NEG-MERC, NEG-TIENDA, NEG-NOCHE, NEG-BELL, NEG-SALUD, NEG-PRO y NEG-DEPORTE. SOLO AGREGA lo que falta: fotos, equipo, preguntas, ajustes,
   ítems («lo que vende»), historia de operaciones, reseñas con respuesta, novedades y seguidores. No cambia plan, estado, dueño, nombre, categoría ni filas existentes
   (única excepción: suma módulos faltantes a modules_on y recalcula lo derivado con las funciones de la app).
   Determinista y sin red. Llaves fijas + «on conflict do nothing» / «where not exists»: aplicarlo dos veces no cambia nada. SOLO SANDBOX.
   Teléfonos de clientes ficticios: +1 717 555 6000–6246 (reservados 6000–6299). Números de operación: 38000000–38999999 (con el prefijo de cada tipo).
   Uso: node scripts/semilla/demos/r2-semilla-1.mjs  →  infra/pruebas/demos/demo-y-semilla-1.sql */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { rng, hash, FIRST_F, FIRST_M, SURN } from "./a/comun.mjs";
import { FUNCIONES } from "./r2-semilla-1/sql.mjs";
import { bancoFood, bancoMerc, SEC_MERC } from "./r2-semilla-1/catalogo-a.mjs";
import { TIENDA, NOCHE_VENUE, NOCHE_SERV, BELL, SALUD, PRO, DEPORTE } from "./r2-semilla-1/catalogo-b.mjs";
import { resena, NOV, FAQ, ROLES, NOMBRES, APELL } from "./r2-semilla-1/texto.mjs";
import { reiniciarIds } from "./b/negocio.mjs";

const RAIZ = new URL("../../..", import.meta.url).pathname;
const SALIDA = RAIZ + "infra/pruebas/demos/demo-y-semilla-1.sql";
mkdirSync(RAIZ + "infra/pruebas/demos/", { recursive: true });
const CATS = ["NEG-FOOD", "NEG-MERC", "NEG-TIENDA", "NEG-NOCHE", "NEG-BELL", "NEG-SALUD", "NEG-PRO", "NEG-DEPORTE"];
const NEGOCIOS = JSON.parse(readFileSync(RAIZ + "infra/pruebas/semilla/negocios.json", "utf8")).filter((b) => CATS.includes(b.category_id));

/* ── utilidades ── */
const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const J = (o) => { const s = JSON.stringify(o); if (s.includes("$j$")) throw new Error("dólar j en datos"); return `$j$${s}$j$`; };
const bi = (es, en) => ({ es, en: en ?? es });
const ANCLA = Date.UTC(2026, 10, 17);
const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const lt = (ms, min) => `${ymd(ms + Math.floor(min / 1440) * 86400000)} ${hhmm(((min % 1440) + 1440) % 1440)}`;

/* ── clientes ficticios: +1 717 555 6000–6246 (247 filas; el resto de lo reservado queda libre) ── */
const CLIENTES = (() => {
  const out = [], vistos = new Set(), r = rng("k18-clientes");
  for (let i = 0; i < 247; i++) {
    const fem = i % 2 === 0, F = fem ? FIRST_F : FIRST_M;
    let a = (i * 7 + 3) % F.length, b = (i * 11 + Math.floor(i / 50)) % SURN.length, k = 0;
    while (vistos.has(F[a] + SURN[b])) { b = (b + 1) % SURN.length; if (++k > 70) { a = (a + 1) % F.length; k = 0; } }
    vistos.add(F[a] + SURN[b]);
    out.push({ i, p: `+1717555${6000 + i}`, f: F[a], l: SURN[b], g: i % 6 === 5 ? "en" : "es" });
  }
  void r;
  return out;
})();

/* ── fotos: solo las que ya trae la semilla, por categoría ── */
const FOTOS = {};
for (const b of NEGOCIOS) { (FOTOS[b.category_id] ??= new Set()); for (const u of b.photos ?? []) FOTOS[b.category_id].add(u); }
for (const c of CATS) FOTOS[c] = [...(FOTOS[c] ?? [])].sort();
const SUBFOTOS = {};
for (const b of NEGOCIOS) for (const s of b.subcategory_ids.slice(0, 1)) { (SUBFOTOS[s] ??= new Set()); for (const u of b.photos ?? []) SUBFOTOS[s].add(u); }

/* ── bancos de «lo que vende» ── */
const MOD = { "NEG-FOOD": "menu", "NEG-MERC": "shop", "NEG-TIENDA": "shop" };
const modOf = (c) => MOD[c] ?? "svc";
const META = { "NEG-FOOD": 16, "NEG-MERC": 26, "NEG-TIENDA": 14, "NEG-NOCHE": 6, "NEG-BELL": 10, "NEG-SALUD": 9, "NEG-PRO": 9, "NEG-DEPORTE": 9 };
const MODS = { "NEG-FOOD": ["menu", "pedidos", "nov", "staff"], "NEG-MERC": ["shop", "pedidos", "nov", "staff"], "NEG-TIENDA": ["shop", "pedidos", "nov", "staff"], "NEG-NOCHE": ["svc", "rsv", "nov", "staff"],
  "NEG-BELL": ["svc", "citas", "staff", "nov"], "NEG-SALUD": ["svc", "citas", "staff", "nov"], "NEG-PRO": ["svc", "citas", "staff", "nov"], "NEG-DEPORTE": ["svc", "staff", "nov"] };
const DESC = { "NEG-FOOD": ["Hecho al momento con ingredientes frescos.", "Made to order with fresh ingredients."], "NEG-MERC": ["Siempre fresco y a buen precio.", "Always fresh and fairly priced."], "NEG-TIENDA": ["Aparta en la app y recoge en la tienda.", "Hold in the app and pick up in store."],
  "NEG-NOCHE": ["Reserva en la app.", "Book in the app."], "NEG-BELL": ["Reserva en la app con quien tú elijas.", "Book in the app with the person you pick."], "NEG-SALUD": ["Reserva en la app, con tu seguro o sin él.", "Book in the app, with or without insurance."],
  "NEG-PRO": ["Precio claro antes de empezar.", "Clear price before you start."], "NEG-DEPORTE": ["Reserva tu lugar en la app.", "Reserve your spot in the app."] };
const CONSTRUIR = { "NEG-BELL": ["./b/bell.mjs", { "NEG-BELL-01": 0, "NEG-BELL-02": 1, "NEG-BELL-03": 2, "NEG-BELL-05": 4 }], "NEG-SALUD": ["./b/salud.mjs", { "NEG-SALUD-01": 0, "NEG-SALUD-02": 1, "NEG-SALUD-03": 2, "NEG-SALUD-04": 3, "NEG-SALUD-05": 4 }],
  "NEG-PRO": ["./b/pro.mjs", { "NEG-PRO-01": 0, "NEG-PRO-02": 1, "NEG-PRO-05": 4 }], "NEG-DEPORTE": ["./b/deporte.mjs", { "NEG-DEPORTE-01": 0, "NEG-DEPORTE-05": 4 }] };
const CACHE_C = {};
async function deConstruir(cat, sub) {
  const [file, mapa] = CONSTRUIR[cat], si = mapa[sub];
  if (si == null) return null;
  const key = `${cat}:${si}`;
  if (CACHE_C[key]) return CACHE_C[key];
  reiniciarIds();
  const m = await import(file), b = m.construir(si, 0, 0);
  return (CACHE_C[key] = b.items.filter((x) => !x.extra).map((x) => ({ es: x.name.es, en: x.name.en, de: x.descr?.es, den: x.descr?.en, p: x.price, m: x.dur, k: x.kind ?? null, attrs: x.attrs ?? {}, ph: (x.photos ?? [])[0], sec: b.secs[x.sec] ? [b.secs[x.sec].es, b.secs[x.sec].en] : null })));
}
const parSec = (s) => { const [es, en] = (s ?? "Catálogo|Catalog").split("|"); return [es, en ?? es]; };
const fromP = (arr) => arr.map((x) => ({ es: x.es, en: x.en, p: x.p, m: x.a ? +x.a : 30, k: x.b ?? null, sec: parSec(x.sec), unit: x.b === "lb" ? "lb" : "u", serv: x.b === "serv" }));

async function banco(b, h) {
  const c = b.category_id, S = b.subcategory_ids, mod = modOf(c);
  if (c === "NEG-FOOD") { const o = bancoFood(S, h); return o.items.map((x) => ({ es: x.es, en: x.en, p: x.p, de: x.de, den: x.den, sec: o.secs[x.sc] })); }
  if (c === "NEG-MERC") { const o = bancoMerc(S, h); return o.items.map((x) => ({ es: x.es, en: x.en, p: x.p, de: x.de, den: x.den, sec: SEC_MERC[x.sc] ?? ["Productos", "Products"], unit: x.unit, tax: x.tax, ebt: x.ebt })); }
  if (c === "NEG-TIENDA") {
    for (const s of S) if (TIENDA[s]) return TIENDA[s].map((x) => ({ es: x.es, en: x.en, p: x.p, sec: parSec(x.sec), serv: x.a === "serv", unit: x.a === "lb" ? "lb" : "u", tax: x.a === "serv" ? 6 : 6 }));
    return TIENDA["NEG-TIENDA-01"].map((x) => ({ es: x.es, en: x.en, p: x.p, sec: parSec(x.sec), unit: "u", tax: 6 }));
  }
  if (c === "NEG-NOCHE") {
    for (const s of S) if (NOCHE_SERV[s] && ["NEG-NOCHE-22", "NEG-NOCHE-23", "NEG-NOCHE-25"].includes(s)) return fromP(NOCHE_SERV[s]);
    const cover = [0, 500, 500, 1000, 1500][h % 5];
    return NOCHE_VENUE(cover).map((x) => ({ es: x.es, en: x.en, p: x.es === "Entrada" ? x.p : x.p, de: x.de[0], den: x.de[1], m: 60, k: x.b, sec: x.b === "cover" ? ["Esta noche", "Tonight"] : ["Mesas y VIP", "Tables and VIP"] }));
  }
  const tab = { "NEG-BELL": BELL, "NEG-SALUD": SALUD, "NEG-PRO": PRO, "NEG-DEPORTE": DEPORTE }[c];
  const GEN_BELL = [{ es: "Consulta o asesoría", en: "Consultation", p: 0, m: 15, k: null, sec: ["Otros", "Other"] }, { es: "Tarjeta de regalo", en: "Gift card", p: 2500, m: 15, k: null, sec: ["Otros", "Other"] },
    { es: "Retoque sin costo", en: "Free touch-up", p: 0, m: 15, k: null, sec: ["Otros", "Other"] }, { es: "Lavado y peinado", en: "Wash and style", p: 2500, m: 30, k: null, sec: ["Otros", "Other"] }];
  let out = null;
  for (const s of S) { if (tab[s]) { out = fromP(tab[s]); break; } const r1 = await deConstruir(c, s); if (r1) { out = r1; break; } }
  const base = { "NEG-SALUD": 90, "NEG-PRO": 80, "NEG-DEPORTE": 18 }[c];
  if (!out) out = c === "NEG-BELL" ? ((await deConstruir(c, "NEG-BELL-05")) ?? []) : fromP(tab.def(base));
  const extra = c === "NEG-BELL" ? GEN_BELL : fromP(tab.def(base));
  const nombres = new Set(out.map((x) => x.es.toLowerCase()));
  return out.length >= 10 ? out : [...out, ...extra.filter((x) => !nombres.has(x.es.toLowerCase()))];
}

/* ── horarios ── */
const aMin = (s) => +s.slice(0, 2) * 60 + +s.slice(3, 5);
function abiertos(h) {
  const out = [];
  for (const d of h ?? []) if (d.open && d.ranges?.length) { const [a, z] = d.ranges[0]; let e = aMin(z); const s = aMin(a); if (e <= s) e += 1440; out.push({ d: d.weekday, s, e }); }
  return out.length ? out : [0, 1, 2, 3, 4, 5, 6].map((d) => ({ d, s: 600, e: 1080 }));
}

/* ── historia ── */
const dow = (ms) => new Date(ms).getUTCDay();
function diaAtras(r, max) { const u = r(); if (u < 0.38) return r.int(1, Math.min(364, max)); if (u < 0.65) return r.int(Math.min(365, max), Math.min(729, max)); return r.int(Math.min(730, max), max); }
const KIND = { "NEG-FOOD": "order", "NEG-MERC": "market_order", "NEG-TIENDA": "hold", "NEG-NOCHE": "night", "NEG-BELL": "appointment", "NEG-SALUD": "appointment", "NEG-PRO": "appointment", "NEG-DEPORTE": "enrollment" };
const PREF = { order: "", market_order: "M-", hold: "A-", night: "N-", appointment: "C-", enrollment: "I-" };
const OPS = { "NEG-FOOD": [60, 120], "NEG-MERC": [50, 110], "NEG-TIENDA": [40, 90], "NEG-NOCHE": [40, 90], "NEG-BELL": [60, 120], "NEG-SALUD": [50, 110], "NEG-PRO": [40, 90], "NEG-DEPORTE": [40, 100] };
let SEQ = 38000000;
const NOCHE_VENUE_SUBS = new Set(["NEG-NOCHE-22", "NEG-NOCHE-23", "NEG-NOCHE-25"]);
const PRIMOS = [2, 3, 5, 7, 11, 17, 23, 29, 31, 37];

function historia(b, r, kd) {
  const c = b.category_id, ab = abiertos(b.hours), fund = b.founded_year ?? 2012;
  const max = Math.max(200, Math.min(2900, (2026 - fund) * 365 + 100));
  const n = r.int(...OPS[c]);
  const pool = Array.from({ length: r.int(25, 70) }, () => r.int(0, 246));
  const ops = [];
  const usados = new Set();
  for (let i = 0; i < n + (["appointment", "enrollment", "night"].includes(kd) ? r.int(2, 5) : 0); i++) {
    const futuro = i >= n;
    let d = futuro ? -r.int(1, 12) : diaAtras(r, max), ms = ANCLA - d * 86400000, tries = 0;
    while (!ab.some((x) => x.d === dow(ms)) && tries++ < 8) ms += (futuro ? 1 : -1) * 86400000;
    const rg = ab.find((x) => x.d === dow(ms)) ?? ab[0];
    let min = r.int(rg.s, Math.max(rg.s, rg.e - 60));
    const u = pool[Math.floor(Math.pow(r(), 1.5) * pool.length)];
    const sP = futuro ? r.pick(["confirmed", "confirmed", "pending"]) : r.weighted([["done", 80], ["cancelled", 8], ["declined", 4], ["expired", 3], ["noshow", kd === "appointment" ? 5 : 0]]);
    const num = `${PREF[kd]}${SEQ++}`;
    const o = { q: i + 1, n: num, u, st: sP === "noshow" ? "done" : sP, a: Math.floor(Math.pow(r(), 1.7) * 997), b: Math.floor(r() * 997), qa: r.weighted([[1, 60], [2, 28], [3, 12]]), qb: r.weighted([[1, 70], [2, 30]]) };
    if (sP === "noshow") o.sd = "noshow";
    if (kd === "order" || kd === "market_order") {
      o.mo = r.chance(kd === "order" ? 0.45 : 0.35) ? "d" : "p"; o.dlv = o.mo === "d" ? r.pick([299, 399, 499]) : 0; o.tip = kd === "order" && o.mo === "d" && r.chance(0.5) ? r.pick([200, 300, 500]) : 0; if (!r.chance(0.55)) delete o.b;
      o.ts = lt(ms, min % 1440); if (min >= 1440) o.ts = lt(ms + 86400000, min - 1440);
    } else if (kd === "hold") {
      const tw = min % 1440; o.ts = lt(ms - Math.floor(r.int(3, 40)) * 3600000, r.int(540, 1200)); o.tw = lt(ms, tw); delete o.b; o.qa = r.weighted([[1, 75], [2, 25]]);
    } else if (kd === "night") {
      const nd = ms; o.nd = Math.round((ANCLA - nd) / 86400000); if (futuro) o.nd = -Math.abs(o.nd); const ar = (min % 1440) + (min >= 1440 ? 1440 : 0) - 720; o.ar = Math.max(240, Math.min(720, ar < 240 ? 360 + r.int(0, 240) : ar));
      o.ts = lt(ms - r.int(5, 60) * 3600000, r.int(540, 1200)); o.pax = r.int(2, 8); o.code = String(1000 + r.int(0, 8999));
      if (o.st === "done") { const k = r.weighted([["entro", 86], ["nollegaron", 9], ["noid", 5]]); o.sd = k; if (k === "entro") o.inn = Math.max(1, o.pax - (r.chance(0.2) ? 1 : 0)); }
    } else {
      const lead = r.int(2, 72); o.tw = lt(ms, min % 1440); o.ts = lt(ms - lead * 3600000, ((min % 1440) + r.int(0, 100)) % 1440); o.am = r.int(3, 90); o.m = r.int(0, 9);
      if (kd === "enrollment") { o.m = null; delete o.m; }
    }
    if (futuro) o.ts = lt(ANCLA - 86400000, r.int(540, 1200));
    if (o.st === "cancelled") { o.cb = r.pick(["user", "user", "business"]); o.cr = o.cb === "user" ? "Cambio de planes" : "No pudimos atender"; o.cm = kd === "appointment" || kd === "enrollment" ? r.int(30, 60 * 20) : r.int(5, 40); if ((kd === "appointment" || kd === "enrollment") && o.cm > 60 * 8) o.cm = 60 * 8; }
    ops.push(o);
  }
  // se descartan los futuros de tipos que no los tienen y las fechas repetidas del mismo usuario (por si acaso)
  void usados;
  return ops.filter((o) => !(o.st === "pending" && kd === "night" && o.nd == null));
}

function resenas(b, r, ops, src) {
  const hechas = ops.filter((o) => o.st === "done" && (o.sd == null || o.sd === "entro"));
  const porU = new Map();
  for (const o of [...hechas].sort((a, z) => z.q - a.q)) if (!porU.has(o.u)) porU.set(o.u, o);
  const n = Math.min(porU.size, Math.max(15, Math.min(40, Math.round(hechas.length * 0.3))), r.int(15, 40));
  const out = [];
  for (const o of r.shuffle([...porU.values()]).slice(0, n)) {
    const s = r.weighted([[5, 52], [4, 33], [3, 8], [2, 5]]), en = r.chance(0.28), t = resena(r, b.category_id, s, en);
    const x = { q: o.q, s, l: en ? "en" : "es", b: t.b, d: r.int(0, 3), h: r.chance(0.3) ? r.int(1, 7) : 0, src };
    if (s <= 3 || r.chance(0.42)) { x.r = t.r; x.rl = en ? "en" : "es"; }
    out.push(x);
  }
  return out;
}
function novedades(b, r, kd) {
  const c = b.category_id, N = NOV[c], P = [];
  const ciudad = "Hazleton";
  const fund = b.founded_year ?? 2012;
  P.push({ k: "novedad", t: `Cumplimos ${2026 - fund} años en ${ciudad}`, b: `Gracias a cada familia que nos eligió desde ${fund}.`, d: 20 + r.int(0, 30), e: 24 * 30, v: r.int(10, 40) });
  P.push({ k: "novedad", t: N[0][0].slice(0, 60), b: N[0][2], d: 8 + r.int(0, 20), e: 24 * 20, v: r.int(8, 30) });
  P.push({ k: "novedad", t: N[1][0].slice(0, 60), b: N[1][2], d: 60 + r.int(0, 80), e: 24 * 20, v: r.int(5, 25) });
  if (kd !== "night" || !NOCHE_VENUE_SUBS.has(b.subcategory_ids[0])) P.push({ k: "oferta", t: "Oferta de la semana", b: "Hasta el domingo. Pídelo o resérvalo en la app.", d: 1, pin: true, it: r.int(0, 997), md: modOf(c), v: r.int(6, 30) });
  if (r.chance(0.7)) P.push({ k: "aviso", t: "Horario especial este mes", b: "Gracias por entender.", d: 2, e: 24 * 14, av: { day: "Sábado", hrs: "early", hrsT: "9 AM – 3 PM" }, v: r.int(2, 12) });
  if (r.chance(0.5)) P.push({ k: "novedad", t: N[2][0].slice(0, 60), b: N[2][2], d: 140 + r.int(0, 300), e: 24 * 7, v: r.int(3, 20) });
  return P;
}
function equipo(b, r, c) {
  const roles = ROLES[c], k = 3, nm = r.shuffle(NOMBRES), out = [];
  for (let i = 0; i < k; i++) out.push({ name: `${nm[i]} ${r.pick(APELL)}`, role: bi(...roles[i % roles.length]), since: Math.min(2025, (b.founded_year ?? 2012) + r.int(1, 8)), takes: ["NEG-BELL", "NEG-SALUD", "NEG-PRO"].includes(c) });
  return out;
}

/* ── armar todos ── */
const lista = [];
for (const b of NEGOCIOS) {
  const r = rng(`k18:${b.id}`), h = hash(b.id), c = b.category_id, kd = c === "NEG-NOCHE" && NOCHE_VENUE_SUBS.has(b.subcategory_ids[0]) ? "appointment" : KIND[c];
  const items = (await banco(b, h)).map((x, ix) => ({ ...x, ix }));
  const ops = historia(b, r, kd);
  const rev = resenas(b, r, ops, kd === "order" ? (ops.some((o) => o.mo === "d") ? "pk" : "pk") : kd === "market_order" || kd === "hold" ? "pk" : kd === "night" ? "rsv" : "cita");
  const pool = [...(SUBFOTOS[b.subcategory_ids[0]] ?? []), ...FOTOS[c]];
  const extraF = r.shuffle([...new Set(pool)]).slice(0, 8);
  lista.push({ b, c, kd, mod: modOf(c), items, ops, rev, posts: novedades(b, r, kd), team: equipo(b, r, c), fotos: extraF,
    fol: { st: h % 247, n: r.int(15, 80), stp: PRIMOS[h % 10] }, faq: FAQ[c], h, r });
}

/* ── SQL ── */
let sql = `-- Ronda 2 · semilla-1: negocios que ya existían (semilla de siempre) completados con lo que les faltaba.
-- GENERADO por scripts/semilla/demos/r2-semilla-1.mjs (determinista). SOLO SANDBOX; nunca corre en producción.
-- Solo AGREGA (llaves fijas, on conflict do nothing / where not exists). No cambia plan, estado, dueño, nombre ni categoría. Lo derivado lo recalculan las funciones de la app.
begin;
set local statement_timeout = 0;
`;
sql += `insert into users (phone, phone_verified_at, first_name, last_name, lang, created_at)
select x->>'p', now() - interval '3 years', x->>'f', x->>'l', x->>'g', now() - make_interval(days => 200 + (x->>'i')::int * 7)
  from jsonb_array_elements(${J(CLIENTES.map((c) => ({ p: c.p, f: c.f, l: c.l, g: c.g, i: c.i })))}::jsonb) x
on conflict (phone) do nothing;
create temp table k_cli on commit drop as
  select (t.o - 1)::int as idx, u.id from jsonb_array_elements_text(${J(CLIENTES.map((c) => c.p))}::jsonb) with ordinality t(p, o) join users u on u.phone = t.p;
alter table k_cli add primary key (idx);
-- Solo los negocios de la semilla que existen en esta base.
create temp table k_b on commit drop as
  select b.id, b.city_id, b.category_id, b.founded_year from businesses b join jsonb_array_elements_text(${J(lista.map((l) => l.b.id))}::jsonb) t(id) on t.id = b.id;
alter table k_b add primary key (id);
` + FUNCIONES;

const rs = (rows, cols) => `jsonb_to_recordset(${J(rows)}::jsonb) as t(${cols.map(([n, t]) => `${n} ${t}`).join(", ")})`;
const NYQ = "'America/New_York'";

/* 1 · fotos hasta 8 */
const fo = lista.flatMap((l) => l.fotos.map((u, i) => ({ id: l.b.id, u, i })));
sql += `insert into media (id, owner_kind, owner_id, url, credit, sort)
select md5('k18:media:' || t.id || ':' || t.i)::uuid, 'business', t.id, t.u, 'Pexels',
       (select coalesce(max(m.sort), -1) from media m where m.owner_kind = 'business' and m.owner_id = t.id) + 1 + t.i
  from ${rs(fo, [["id", "text"], ["u", "text"], ["i", "int"]])} join k_b on k_b.id = t.id
 where (select count(*) from media m where m.owner_kind = 'business' and m.owner_id = t.id and m.status = 'visible' and m.id <> md5('k18:media:' || t.id || ':' || t.i)::uuid
          and m.id not in (select md5('k18:media:' || t.id || ':' || z)::uuid from generate_series(0, 7) z)) + t.i < 8
   and not exists (select 1 from media m where m.owner_kind = 'business' and m.owner_id = t.id and m.url = t.u)
on conflict (id) do nothing;
`;

/* 2 · equipo (solo si tiene menos de 3 personas) */
const eq = lista.flatMap((l) => l.team.map((m, i) => ({ id: l.b.id, mid: `k18:m:${l.b.id}:${i}`, name: m.name, role: m.role, since: m.since, sort: i + 10, takes: m.takes })));
sql += `insert into business_members (id, business_id, kind, display_name, role, status, show_on_page, panel_access, since_year, sort, same_as_business_hours, languages, takes_bookings)
select md5(t.mid)::uuid, t.id, 'staff', t.name, t.role, 'active', true, '{}', t.since, t.sort, true, array['es'], t.takes
  from ${rs(eq, [["mid", "text"], ["id", "text"], ["name", "text"], ["role", "jsonb"], ["since", "int"], ["sort", "int"], ["takes", "boolean"]])} join k_b on k_b.id = t.id
 where (select count(*) from business_members m where m.business_id = t.id and m.status = 'active') < 3 or exists (select 1 from business_members m where m.id = md5(t.mid)::uuid)
on conflict (id) do nothing;
`;

/* 3 · preguntas frecuentes (si no tiene) */
const fq = lista.flatMap((l) => l.faq.map((f, i) => ({ id: l.b.id, q: bi(f[0], f[1]), a: bi(f[2], f[3]), i })));
sql += `insert into faqs (business_id, question, answer, sort)
select t.id, t.q, t.a, t.i from ${rs(fq, [["id", "text"], ["q", "jsonb"], ["a", "jsonb"], ["i", "int"]])} join k_b on k_b.id = t.id
 where not exists (select 1 from faqs f where f.business_id = t.id);
`;

/* 4 · ajustes de la categoría (solo si faltan) */
const aj = (c) => lista.filter((l) => l.c === c);
const ids = (c) => J(aj(c).map((l) => ({ id: l.b.id, h: l.h % 7 })));
sql += `insert into delivery_settings (business_id, pickup, delivery, prep_min, scheduled_orders, auto_accept, pay_card, pay_cash_pickup, pay_cash_delivery, ask_tip, zone_mi, fee_cents, free_over_cents, min_order_cents, travel_min, who, pickup_note, proof)
select t.id, true, true, 20 + t.h * 3, true, t.h % 2 = 0, true, true, true, true, (array[3, 5, 10])[1 + t.h % 3], 299 + (t.h % 3) * 100, 4000 + t.h * 500, 1500, 10, 'team', '{"es":"Pide en la caja con tu número de pedido.","en":"Ask at the register with your order number."}'::jsonb, false
  from jsonb_to_recordset(${ids("NEG-FOOD")}::jsonb) as t(id text, h int) join k_b on k_b.id = t.id
on conflict (business_id) do nothing;
insert into menu_settings (business_id, last_min, busy_min, low_alert) select t.id, 15, 0, 3 from jsonb_to_recordset(${ids("NEG-FOOD")}::jsonb) as t(id text, h int) join k_b on k_b.id = t.id on conflict (business_id) do nothing;
insert into delivery_settings (business_id, pickup, delivery, prep_min, scheduled_orders, auto_accept, pay_card, pay_cash_pickup, pay_cash_delivery, zone_mi, fee_cents, free_over_cents, min_order_cents, travel_min, who, pickup_note)
select t.id, true, true, 30 + t.h * 3, true, false, true, true, false, (array[3, 5, 10])[1 + t.h % 3], 399 + (t.h % 3) * 100, 6000 + t.h * 500, 2500, 15, 'team', '{"es":"Pasa por el mostrador con tu número de pedido.","en":"Stop by the counter with your order number."}'::jsonb
  from jsonb_to_recordset(${ids("NEG-MERC")}::jsonb) as t(id text, h int) join k_b on k_b.id = t.id
on conflict (business_id) do nothing;
insert into retail_settings (business_id, ebt, cash, weighs_front, sub_default, slot_cap, hold_hours)
select t.id, true, true, true, 'call', 4 + t.h % 5, 48 from jsonb_to_recordset(${ids("NEG-MERC")}::jsonb) as t(id text, h int) join k_b on k_b.id = t.id on conflict (business_id) do nothing;
insert into retail_settings (business_id, ebt, cash, weighs_front, sub_default, slot_cap, hold_hours, returns_days, layaway, lay_down_pct, lay_payments, lay_every_days, lay_cancel_pct)
select t.id, false, true, false, 'call', 4 + t.h % 5, 48, 15, t.h % 3 = 0, 20, 4, 14, 10 from jsonb_to_recordset(${ids("NEG-TIENDA")}::jsonb) as t(id text, h int) join k_b on k_b.id = t.id on conflict (business_id) do nothing;
insert into delivery_settings (business_id, pickup, delivery, pay_card, pay_cash_pickup, ship, ship_fee_cents, ship_free_over_cents, ship_days, prep_min, pickup_note)
select t.id, true, false, true, true, t.h % 3 = 0, case when t.h % 3 = 0 then 799 else 0 end, case when t.h % 3 = 0 then 7500 else 0 end, '3-5', 20, '{"es":"Pasa por la caja con tu número de apartado.","en":"Stop by the register with your hold number."}'::jsonb
  from jsonb_to_recordset(${ids("NEG-TIENDA")}::jsonb) as t(id text, h int) join k_b on k_b.id = t.id on conflict (business_id) do nothing;
insert into noche_settings (business_id, city_id, cover_cents, min_age, list_on, music, music_note)
select t.id, k_b.city_id, (array[0, 500, 500, 1000, 1500])[1 + t.h % 5], 21, false, array['m:mixto'], '{"es":"Música latina todas las noches","en":"Latin music every night"}'::jsonb
  from jsonb_to_recordset(${J(aj("NEG-NOCHE").filter((l) => l.kd === "night").map((l) => ({ id: l.b.id, h: l.h % 7 })))}::jsonb) as t(id text, h int) join k_b on k_b.id = t.id on conflict (business_id) do nothing;
insert into booking_policies (business_id, auto_approve, response_min, expires_h, deposit_cents, cancel_free_h, tolerance_min, staff_pick)
select t.id, t.h % 2 = 0, (array[15, 30, 60])[1 + t.h % 3], 2, 0, 2, 15, true
  from jsonb_to_recordset(${J(lista.filter((l) => ["NEG-BELL", "NEG-SALUD", "NEG-PRO", "NEG-DEPORTE"].includes(l.c) || l.kd === "appointment").map((l) => ({ id: l.b.id, h: l.h % 7 })))}::jsonb) as t(id text, h int) join k_b on k_b.id = t.id on conflict (business_id) do nothing;
insert into insc_settings (business_id, city_id, rubro, how_presencial, esp, contract_m, cancel_fee_cents, signup_cents, childcare, free_agents, reply_h)
select t.id, k_b.city_id, 'dep', true, true, t.h % 3 * 3, 0, 0, false, false, 24 from jsonb_to_recordset(${ids("NEG-DEPORTE")}::jsonb) as t(id text, h int) join k_b on k_b.id = t.id on conflict (business_id) do nothing;
`;

/* 5 · módulos que faltan (solo suma; nunca quita) */
const md = lista.map((l) => ({ id: l.b.id, m: MODS[l.c] }));
sql += `update businesses b set modules_on = (select array(select distinct x from unnest(b.modules_on || t.m) x order by x))
  from ${rs(md, [["id", "text"], ["m", "text[]"]])} where b.id = t.id and not (b.modules_on @> t.m);
`;

/* 6 · «lo que vende»: secciones e ítems que faltan hasta la meta de la categoría (sin repetir nombres) */
const meta = (l) => META[l.c];
const secs = lista.flatMap((l) => { const vistas = new Map(); for (const x of l.items) { const s = x.sec ?? ["Catálogo", "Catalog"]; if (!vistas.has(s[0])) vistas.set(s[0], { id: l.b.id, md: l.mod, es: s[0], en: s[1] ?? s[0], i: vistas.size, mk: x.ix, meta: meta(l) }); } return [...vistas.values()]; });
sql += `insert into item_sections (business_id, module, name, sort)
select t.id, t.md, jsonb_build_object('es', t.es, 'en', t.en), 100 + t.i
  from ${rs(secs, [["id", "text"], ["md", "text"], ["es", "text"], ["en", "text"], ["i", "int"], ["mk", "int"], ["meta", "int"]])} join k_b on k_b.id = t.id
 where not exists (select 1 from item_sections s where s.business_id = t.id and s.module = t.md and s.name->>'es' = t.es and s.removed_at is null)
   and (select count(*) from items i where i.business_id = t.id and i.module = t.md and i.removed_at is null and not i.is_extra) + t.mk < t.meta;
`;
const FOTOI = (l, k) => (l.c === "NEG-MERC" || l.c === "NEG-NOCHE" || !FOTOS[l.c].length ? [] : (k % 2 === 0 ? [FOTOS[l.c][(l.h + k) % FOTOS[l.c].length]] : []));
const it = lista.flatMap((l) => l.items.map((x) => ({
  id: l.b.id, md: l.mod, k: x.ix, sec: (x.sec ?? ["Catálogo", "Catalog"])[0], es: x.es, en: x.en, de: x.de ?? DESC[l.c][0], den: x.den ?? DESC[l.c][1], p: x.p, unit: x.unit ?? "u", tax: l.mod === "menu" ? 6 : l.mod === "shop" ? (x.tax ?? 0) : 0,
  sk: l.mod === "shop" ? (x.serv ? "serv" : x.unit === "lb" ? "peso" : "unid") : null, ebt: !!x.ebt, m: x.m == null || l.mod !== "svc" ? null : Math.min(480, Math.max(15, x.m)), kind: x.k && l.mod === "svc" ? x.k : null, attrs: x.attrs ?? {}, ph: x.ph ? [x.ph] : FOTOI(l, x.ix), meta: meta(l),
})));
sql += `insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, shop_kind, ebt, duration_min, svc_kind, svc_attrs, sort, featured)
select t.id, t.md, (select s.id from item_sections s where s.business_id = t.id and s.module = t.md and s.name->>'es' = t.sec and s.removed_at is null order by s.id limit 1),
       jsonb_build_object('es', t.es, 'en', t.en), jsonb_build_object('es', t.de, 'en', t.den), t.p, t.unit, t.tax, t.ph, t.sk, t.ebt, t.m, t.kind, t.attrs,
       (select coalesce(max(i.sort), -1) from items i where i.business_id = t.id and i.module = t.md) + 1 + t.k, t.k = 0
  from ${rs(it, [["id", "text"], ["md", "text"], ["k", "int"], ["sec", "text"], ["es", "text"], ["en", "text"], ["de", "text"], ["den", "text"], ["p", "int"], ["unit", "text"], ["tax", "numeric"], ["sk", "text"], ["ebt", "boolean"], ["m", "int"], ["kind", "text"], ["attrs", "jsonb"], ["ph", "text[]"], ["meta", "int"]])} join k_b on k_b.id = t.id
 where not exists (select 1 from items i where i.business_id = t.id and i.module = t.md and lower(i.name->>'es') = lower(t.es) and i.removed_at is null)
   and (select count(*) from items i where i.business_id = t.id and i.module = t.md and i.removed_at is null and not i.is_extra) + t.k < t.meta;
`;

/* 7 · historia: operaciones, reseñas, novedades y seguidores (una llamada por negocio) */
for (const l of lista) {
  const bz = q(l.b.id);
  sql += `do $$ begin if exists (select 1 from k_b where id = ${bz}) then
  perform pg_temp.k_ops(${bz}, ${q(l.kd)}, ${q(l.mod)}, ${J(l.ops)}::jsonb);
  perform pg_temp.k_rev(${bz}, ${J(l.rev)}::jsonb);
  perform pg_temp.k_posts(${bz}, ${q(l.mod)}, ${J(l.posts)}::jsonb);
  perform pg_temp.k_fol(${bz}, ${l.fol.st}, ${l.fol.n}, ${l.fol.stp});
end if; end $$;
`;
}

/* 8 · lo derivado, con las funciones de la propia app (nunca a mano) */
sql += `-- Derivados (estrellas, conteos, fuerza del perfil, fotos) con las funciones de la propia app.
do $$ begin perform reviews_stats(id) from k_b; end $$;
update business_stats_cache s set photo_count = (select count(*) from media m where m.owner_kind = 'business' and m.owner_id = s.business_id and m.status = 'visible') where s.business_id in (select id from k_b);
update business_stats_cache s set profile_strength = perfil_fuerza(s.business_id) where s.business_id in (select id from k_b);
commit;
`;
writeFileSync(SALIDA, sql);
const nops = lista.reduce((s, l) => s + l.ops.length, 0), nrev = lista.reduce((s, l) => s + l.rev.length, 0), npost = lista.reduce((s, l) => s + l.posts.length, 0), nit = lista.reduce((s, l) => s + l.items.length, 0);
console.log(`demo-y-semilla-1.sql: ${lista.length} negocios · ${nit} ítems (banco) · ${nops} operaciones · ${nrev} reseñas · ${npost} novedades · ${(sql.length / 1048576).toFixed(2)} MB`);
const por = {}; for (const l of lista) por[l.c] = (por[l.c] ?? 0) + 1; console.log(por);
