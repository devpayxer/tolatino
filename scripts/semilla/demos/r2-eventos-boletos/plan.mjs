/* Eventos con boletos · el plan: qué negocio organiza qué, cuándo, y quién compró (todo determinista, sin red ni base).
   Las fechas van RELATIVAS al día de la ciudad al aplicarse (como 0035): `d` = días desde hoy (negativo = pasado), `wk` = semanas desde la primera
   fecha de la serie que cae hoy o después. Lo que depende de la hora real (qué fecha ya pasó) lo decide el SQL; aquí solo se da el ritmo de ventas. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rng, hash, FIRST_F, FIRST_M, SURN } from "../a/comun.mjs";
import { PLANTILLAS, SINGLES, ARTISTAS, DJS } from "./plantillas.mjs";

const aqui = dirname(fileURLToPath(import.meta.url));
const NEG = JSON.parse(readFileSync(join(aqui, "negocios.json"), "utf8"));
export const CIUDADES = ["hzl", "alw", "wbr", "scr", "rdg"];
const BASE = Date.UTC(2026, 10, 17); // 17 nov 2026: el día en que se escribió el plan; las fechas con nombre propio (Nochebuena…) se cuentan desde aquí
const dias = (iso) => Math.round((Date.parse(iso + "T00:00:00Z") - BASE) / 86400000);

/* ── Compradores: 100 por ciudad, +1717555 7000…7499 (rango reservado de este generador) ── */
export const COMPRADORES = (() => {
  const out = [], seen = new Set();
  for (let i = 0; i < 500; i++) {
    const fem = i % 2 === 0, F = fem ? FIRST_F : FIRST_M;
    let a = (i * 13 + (fem ? 2 : 5)) % F.length, b = (i * 17 + Math.floor(i / 47) * 3 + 1) % SURN.length, k = 0;
    while (seen.has(F[a] + SURN[b])) { b = (b + 1) % SURN.length; if (++k > 70) { a = (a + 1) % F.length; k = 0; } }
    seen.add(F[a] + SURN[b]);
    out.push({ idx: i, phone: `+1717555${7000 + i}`, first: F[a], last: SURN[b], city: CIUDADES[Math.floor(i / 100)], lang: i % 7 === 6 ? "en" : "es" });
  }
  return out;
})();
const NOMBRES_EXTRA = [...FIRST_F, ...FIRST_M];

/* ── Negocios por ciudad y categoría ── */
const POR = {};
for (const n of NEG) (POR[n.city + "|" + n.cat.replace("NEG-", "")] ??= []).push(n);

function elegirNegocio(ciudad, cat, subs, usados, r) {
  const todos = (POR[ciudad + "|" + cat] || []).slice().sort((a, b) => (a.id < b.id ? -1 : 1));
  if (!todos.length) return null;
  const libres = todos.filter((n) => (usados.get(n.id) || 0) === 0);
  const pref = (libres.length ? libres : todos).filter((n) => !subs || subs.includes(n.sub));
  const lista = pref.length ? pref : libres.length ? libres : todos;
  const n = lista[Math.floor(r() * lista.length)];
  usados.set(n.id, (usados.get(n.id) || 0) + 1);
  return n;
}

/* ── El plan por ciudad ── */
const SEMANALES = ["w_fri_bachata", "w_sat_merengue", "w_wed_salsa", "w_thu_karaoke", "w_sun_sancocho", "w_mon_ingles", "w_tue_bootcamp", "w_sat_zumba", "w_fri_alabanza", "w_wed_entrevista"];
const QUINCENAL_MENSUAL = ["b_comedia", "b_finanzas", "m_brunch", "m_vigilia"];
const VARIOS_DIAS = { hzl: ["s_expo_quince", "s_festival_gastro", "s_retiro_jovenes"], alw: ["s_congreso_salsa", "s_torneo_futbol"], wbr: ["s_retiro_matrimonios", "s_expo_quince"], scr: ["s_festival_gastro", "s_congreso_salsa"], rdg: ["s_torneo_futbol", "s_retiro_jovenes"] };
const CON_NOMBRE = { // fechas con nombre propio por ciudad
  hzl: ["c_halloween", "c_nochebuena", "c_findeano", "c_sanvalentin", "f_mercado_nav", "o_brunch_unico"], alw: ["c_halloween", "c_findeano", "c_sanvalentin", "o_brunch_unico"],
  wbr: ["c_nochebuena", "c_findeano", "c_sanvalentin", "o_brunch_unico"], scr: ["c_halloween", "c_nochebuena", "c_sanvalentin", "f_mercado_nav", "o_brunch_unico"], rdg: ["c_nochebuena", "c_findeano", "c_sanvalentin", "f_mercado_nav", "o_brunch_unico"],
};
const SIN_NOMBRE = SINGLES.filter((k) => !PLANTILLAS[k].date);
const UNOS_POR_CIUDAD = 17;

const reemplazar = (t, art, dj) => (typeof t === "string" ? t.replace(/\{art\}/g, art).replace(/\{dj\}/g, dj) : t);
const bi = (o, art, dj) => (o ? { es: reemplazar(o.es, art, dj), en: reemplazar(o.en, art, dj) } : o);

export function construirEventos() {
  const eventos = [];
  for (const ciudad of CIUDADES) {
    const r = rng("k20:plan:" + ciudad), usados = new Map();
    const lista = [];
    for (const t of SEMANALES) lista.push({ t });
    for (const t of QUINCENAL_MENSUAL) lista.push({ t });
    for (const t of VARIOS_DIAS[ciudad]) lista.push({ t, extra: { esVarios: true } });
    for (const t of CON_NOMBRE[ciudad]) lista.push({ t });
    for (const t of r.shuffle(SIN_NOMBRE).slice(0, UNOS_POR_CIUDAD)) lista.push({ t });
    let n = 0;
    for (const { t } of lista) {
      const P = PLANTILLAS[t], rr = rng(`k20:ev:${ciudad}:${t}`);
      const neg = elegirNegocio(ciudad, P.cat, P.subs, usados, rr);
      if (!neg) continue;
      const art = rr.pick(ARTISTAS), dj = rr.pick(DJS);
      const e = { tpl: t, city: ciudad, biz: neg.id, bizName: neg.name, n: n++, art, dj };
      eventos.push(armar(e, P, rr));
    }
  }
  marcar(eventos);
  return eventos;
}

function armar(e, P, r) {
  const ti = bi(P.ti, e.art, e.dj);
  const s = {
    key: `${e.city}.${e.tpl}.${e.n}`, tpl: e.tpl, biz: e.biz, city: e.city, fmt: P.fmt, ti, desc: P.desc, kind: P.kind === "weekly" || P.kind === "biweekly" || P.kind === "monthly" ? "series" : P.kind === "span" ? "span" : "single",
    h0: P.h0, h1: P.h1, door: P.door, entry: P.entry, age: P.age ?? 0, kids: P.kids ?? null, payAt: !!P.payAt, gen: P.gen ?? [], dress: P.dress ?? null, before: P.before ?? [],
    lu: (P.lu || []).map((l) => ({ h: l.h, who: reemplazar(l.who, e.art, e.dj), role: l.role })),
    tks: P.tks ?? [], mesas: P.mesas ?? [], adds: P.adds ?? [], cod: P.cod ?? [], free: !!P.free, fillR: P.fill, eb: P.eb ?? 0,
  };
  if (P.entry === "rsvp") { s.cap = P.cap; s.party = P.party; }
  if (P.venue) { s.venue = P.venue; s.addr = `${100 + Math.floor(r() * 800)} ${r.pick(["N Wyoming St", "W Broad St", "Main St", "Union St", "Linden St"])}`; }
  // Forma y fechas
  const lead = r.int(12, 40);
  if (P.kind === "single") {
    s.d = P.date ? dias(P.date) : r.chance(0.4) ? -r.int(2, 88) : r.int(1, 118);
    if (P.date && s.d < -88) s.d = -r.int(5, 80);
  } else if (P.kind === "span") {
    s.span = P.span; s.dayCap = P.dayCap;
    s.d = r.chance(0.3) ? -r.int(12, 70) : r.int(14, 100);
    // Un fin de semana: el primer día cae en viernes (3 días) o sábado (2 días) lo más cerca posible; lo fija el SQL con `dow`.
    s.dow = P.span === 3 ? 5 : 6;
    s.dh = Array.from({ length: P.span }, (_, i) => [P.h0, P.span === 3 && i === 2 ? Math.min(P.h1, P.h0 + 420) : P.h1]);
  } else {
    s.dow = P.dow;
    if (P.kind === "weekly") { s.wk = -r.int(4, 6); s.rep = { k: "w", n: -s.wk + 26 }; s.pastN = -s.wk; }
    else if (P.kind === "biweekly") { s.wk = -2 * r.int(3, 4); s.rep = { k: "2w", n: -s.wk / 2 + 14 }; s.pastN = -s.wk / 2; }
    else { s.wk = -13; s.rep = { k: "m", n: 10 }; s.pastN = 3; }
  }
  const comienzo = s.kind === "series" ? s.wk * 7 + 3 : s.d; // días desde hoy a la primera fecha (aprox.)
  s.cre = Math.max(2, comienzo < 0 ? -comienzo + lead : Math.max(2, lead - comienzo));
  s.lead = lead;
  return s;
}

/* ── Casos especiales: agotados, cancelados, pospuestos, patrocinados ── */
function marcar(eventos) {
  for (const ciudad of CIUDADES) {
    const E = eventos.filter((x) => x.city === ciudad);
    const conBoletos = E.filter((x) => x.entry === "tickets" && x.kind === "single");
    const futuros = conBoletos.filter((x) => x.d >= 12 && x.d <= 70);
    const pasados = conBoletos.filter((x) => x.d <= -6 && x.d >= -80);
    // agotados: un próximo y un pasado
    if (futuros[0]) futuros[0].soldout = true;
    if (pasados[0]) pasados[0].soldout = true;
    if (conBoletos.find((x) => x.tpl === "c_findeano")) conBoletos.find((x) => x.tpl === "c_findeano").soldout = true;
    // patrocinados: dos próximos
    for (const x of futuros.filter((y) => !y.soldout || true).slice(1, 3)) x.spons = true;
    if (futuros[0] && ciudad !== "rdg") futuros[0].spons = true;
    // lista de espera en el agotado próximo
    if (futuros[0]) futuros[0].wl = true;
  }
  const por = (c) => eventos.filter((x) => x.city === c && x.entry === "tickets" && x.kind === "single" && !x.soldout && !x.spons && !PLANTILLAS[x.tpl].date);
  // cancelados: 2 en hzl, 1 en cada otra
  const cx = [["hzl", "past"], ["hzl", "up"], ["alw", "up"], ["wbr", "past"], ["scr", "up"], ["rdg", "past"]];
  const mv = ["hzl", "alw", "scr", "rdg"];
  for (const [c, cuando] of cx) {
    const x = por(c).filter((y) => !y.cancel && !y.move && (cuando === "past" ? y.d <= -10 && y.d >= -70 : y.d >= 3 && y.d <= 40 && y.tpl !== "c_nochebuena" && y.tpl !== "c_findeano"))[0];
    if (!x) continue;
    x.cancel = cuando === "past" ? { why: ["clima", "artista", "local"][hash(x.key) % 3], hb: 20 + (hash(x.key) % 40) } : { why: ["artista", "planes", "clima"][hash(x.key) % 3], hb: 4 + (hash(x.key) % 50) };
    x.soldout = false;
    if (cuando === "up") x.cre = Math.max(x.cre, 8);
  }
  for (const c of mv) {
    const x = por(c).filter((y) => !y.cancel && !y.move && y.d >= 10 && y.d <= 60)[0];
    if (!x) continue;
    x.move = { dias: [7, 14, 7, 14][mv.indexOf(c)], hb: 30 + (hash(x.key) % 80) };
    x.cre = Math.max(x.cre, 8);
  }
  // Un varios días patrocinado y cancelado no: sigue el plan.
}

/* ── Ventas ── */
function nombresDe(r, comprador, n) {
  const out = [`${comprador.first} ${comprador.last[0]}.`];
  while (out.length < n) out.push(`${r.pick(NOMBRES_EXTRA)} ${r.pick(SURN)[0]}.`);
  return out.slice(0, n);
}
function compradorPara(r, ciudad, cuentaFecha) {
  const ci = CIUDADES.indexOf(ciudad);
  for (let k = 0; k < 8; k++) {
    const otra = r.chance(0.06);
    const c = otra ? r.int(0, 499) : ci * 100 + Math.min(99, Math.floor(100 * Math.pow(r(), 1.7)));
    if ((cuentaFecha.get(c) || 0) < 10) return c;
  }
  return ci * 100 + r.int(0, 99);
}

/* La cantidad por tipo para una fecha: cap × fill, con jitter por tipo; la preventa se vende primero. */
function objetivos(s, f, r, lejos) {
  const t = {};
  for (const x of s.tks) {
    let k = f * (0.8 + r() * 0.4);
    if (x.id === "pre") k = lejos ? Math.min(1, f * 1.5 + 0.1) : Math.min(1, f * 1.7 + 0.25);
    if (x.id === "vip" || x.id === "ring" || x.id === "front") k *= 0.85;
    t[x.id] = Math.min(x.cap, Math.round(x.cap * Math.min(1, Math.max(0, k))));
    if (f >= 0.999) t[x.id] = x.cap;
  }
  return t;
}

export function ventasDe(s) {
  const orders = [], rsvps = [];
  const r = rng("k20:ventas:" + s.key);
  const [lo, hi] = s.fillR || [0.3, 0.8];
  const ocurrencias = s.kind === "series" ? Math.min(s.rep.n, s.pastN + 3) : 1;
  const esMovido = !!s.move, esCx = !!s.cancel;
  let seq = 0;
  for (let i = 0; i < ocurrencias; i++) {
    // desfase de esta fecha respecto de hoy (aprox.)
    const dd = s.kind === "series" ? (s.wk * 7 + 3) + i * (s.rep.k === "w" ? 7 : s.rep.k === "2w" ? 14 : 30) : s.d;
    const pasada = dd < 0;
    let f;
    if (s.soldout) f = 1;
    else if (pasada) f = lo + (hi - lo) * r();
    else if (s.kind === "series") { const j = i - s.pastN; f = (lo + hi) / 2 * [0.55, 0.3, 0.15][Math.max(0, j)] * (0.8 + r() * 0.4); }
    else f = ((lo + hi) / 2) * Math.pow(Math.max(0.1, 1 - dd / 130), 1.3) * (0.8 + r() * 0.4) + (dd < 30 ? 0.05 : 0);
    if (s.kind === "series" && !pasada && i >= s.pastN + 3) continue;
    if (!s.soldout) f *= s.kind === "series" ? 0.72 : 0.9;
    if (f < 0.02) continue;
    const maxAgo = Math.max(10, (pasada ? s.cre + dd : s.cre) * 24 - 8);
    const minAgo = esCx ? s.cancel.hb + 3 : esMovido ? s.move.hb + 3 : 0;
    const cuentaFecha = new Map();
    const agoDe = () => Math.min(maxAgo, minAgo + 1 + Math.floor(-Math.log(1 - r()) * (pasada ? 70 : 40)));
    if (s.entry === "tickets") {
      const T = objetivos(s, f, r, !pasada && dd > (s.eb || 0));
      const M = {};
      for (const m of s.mesas) M[m.id] = Math.min(m.cap, Math.round(m.cap * Math.min(1, f * 1.15 + (s.soldout ? 1 : 0))));
      const usoCod = new Map();
      const hacer = (t, mesaId) => {
        const u = compradorPara(r, s.city, cuentaFecha), c = COMPRADORES[u];
        const o = { e: s.key, i: ++seq, d: i, u, t, m: mesaId || null, a: [], c: null, ago: agoDe(), nm: [] };
        const nT = t.reduce((a, b) => a + b[1], 0);
        o.nm = nombresDe(r, c, nT + (mesaId ? 1 : 0));
        cuentaFecha.set(u, (cuentaFecha.get(u) || 0) + nT);
        const extrasL = s.adds.filter((a) => (mesaId ? true : !a.mesa));
        if (extrasL.length && r.chance(mesaId ? 0.4 : 0.14)) o.a = [r.pick(extrasL).id];
        if (nT && s.cod.length && !mesaId && !o.a.length && r.chance(0.18)) {
          const k = r.pick(s.cod), id = k[0];
          if ((usoCod.get(id) || 0) < k[3]) { o.c = id; usoCod.set(id, (usoCod.get(id) || 0) + 1); }
        }
        // El comprador cancela solo (≥ 24 h antes): ~4 % de las órdenes de boletos sin extras ni código
        if (nT && !o.a.length && !o.c && !esCx && !esMovido && !s.soldout && r.chance(0.04)) o.x = "b";
        orders.push(o);
      };
      let quedan = Object.entries(T).filter(([, v]) => v > 0);
      while (quedan.length) {
        const tot = quedan.reduce((a, b) => a + b[1], 0);
        let u = r() * tot, pick = quedan[0];
        for (const x of quedan) { u -= x[1]; if (u <= 0) { pick = x; break; } }
        const id = pick[0], tt = s.tks.find((x) => x.id === id);
        const solo = /equipo|pareja/.test(id) ? 1 : r.pick([1, 2, 2, 3, 3, 4]);
        const q1 = Math.min(pick[1], solo);
        const t = [[id, q1]];
        T[id] -= q1;
        if (r.chance(0.22) && quedan.length > 1) {
          const otro = quedan.filter(([k, v]) => k !== id && T[k] > 0)[0];
          if (otro) { const q2 = Math.min(T[otro[0]], r.pick([1, 2])); if (q2 > 0 && q1 + q2 <= 8) { t.push([otro[0], q2]); T[otro[0]] -= q2; } }
        }
        hacer(t, null);
        quedan = Object.entries(T).filter(([, v]) => v > 0);
      }
      for (const m of s.mesas) for (let k = 0; k < M[m.id]; k++) hacer([], m.id);
    } else if (s.entry === "rsvp") {
      // RSVP: personas hasta ~ cap × fill, en grupos de 1..party
      const meta = Math.round(s.cap * Math.min(1, f));
      let tot = 0; const vistos = new Set();
      while (tot < meta) {
        const u = compradorPara(r, s.city, new Map([...vistos].map((x) => [x, 99])));
        if (vistos.has(u)) { if (vistos.size > 95) break; continue; }
        vistos.add(u);
        const p = Math.min(s.party, r.pick([1, 1, 2, 2, 3, 4]), meta - tot);
        rsvps.push({ e: s.key, d: i, u, p, k: hash(s.key + i + u) % 100 });
        tot += p;
      }
    }
  }
  return { orders, rsvps };
}

/* Códigos de descuento con usos suficientes (el SQL no deja pasar de uses_max). */
export function codigosDe(s, orders) {
  const out = [];
  for (const [code, kind, value, max] of s.cod || []) {
    const usados = orders.filter((o) => o.c === code).length;
    out.push({ code, kind, value, max: Math.max(max, usados + 5), on: true });
  }
  return out;
}
