/* Grupo A · reseñas y novedades genéricas (MERC, TIENDA, NOCHE): plantillas es/en con huecos {d} (el artículo) y {x} (cierre). Sin emoji, tono sobrio. */
import { estrellas } from "./negocio.mjs";
import { MES_ES, money } from "./comun.mjs";

export const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? "");

/* cfg: { es:{5,4,3,2,x5,x3}, en:{...}, rEs5, rEs3, rEn5, rEn3, srcDe(op), resp(r,s,op), nombreDe(op) → {es,en} , recDe(op) → ords } */
export function genResenas(r, ops, nRev, cfg) {
  const hechas = ops.filter((o) => cfg.vale(o));
  const porU = new Map();
  for (const o of [...hechas].sort((a, b) => (a.d ?? a.nd ?? 0) - (b.d ?? b.nd ?? 0))) if (!porU.has(o.u)) porU.set(o.u, o);
  const cand = r.shuffle([...porU.values()]).slice(0, nRev);
  const out = [];
  for (const o of cand) {
    const s = estrellas(r), en = r.chance(0.28), T = en ? cfg.en : cfg.es;
    const nm = cfg.nombreDe(o, r);
    const pool = s >= 5 ? T[5] : s === 4 ? T[4] : s === 3 ? T[3] : T[2];
    const body = fmt(r.pick(pool), { d: (en ? nm.en : nm.es).toLowerCase(), x: r.pick(s >= 4 ? T.x5 : T.x3) }).replace(/^./, (c) => c.toUpperCase()).trim();
    const rv = { o: o.q, s, l: en ? "en" : "es", b: body.length < 22 ? `${body} Todo muy bien.` : body, a: cfg.resp(r, s, o), src: cfg.srcDe(o), d: r.int(0, 3), rc: cfg.recDe ? cfg.recDe(o) : [], h: r.chance(0.3) ? r.int(1, 7) : 0 };
    if (cfg.hechos) { const f = cfg.hechos(r, s, o); if (f) rv.f = f; }
    if (s <= 3 || r.chance(0.42)) { rv.r = r.pick(s <= 3 ? (en ? cfg.rEn3 : cfg.rEs3) : (en ? cfg.rEn5 : cfg.rEs5)); rv.rl = en ? "en" : "es"; }
    out.push(rv);
  }
  return out;
}

const DN = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
/* Novedades: o1 = ítem de oferta, o2 = ítem de «hoy», o3 = ítem viejo. `c` = textos de la categoría. */
export function genNovedades(r, b, flat, c) {
  const P = [];
  const base = flat.filter((x) => x.p >= 200).length ? flat.filter((x) => x.p >= 200) : flat;
  const o1 = r.pick(base), o2 = r.pick(base), o3 = r.pick(base);
  const rebaja = (x) => Math.max(50, Math.round((x.p * r.pick([0.8, 0.85, 0.9])) / 5) * 5);
  const per = (x) => (x.unit === "lb" ? "/lb" : "");
  const n1 = rebaja(o1);
  if (!c.sinOferta) P.push({ k: "oferta", t: `${o1.es} a ${money(n1)}${per(o1)} hasta el domingo`.slice(0, 60), b: c.oferta, d: 1, pin: true, it: o1.ord, was: o1.p, now: n1, v: r.int(6, 40) });
  P.push({ k: "hoy", t: c.hoy(o2).slice(0, 60), b: c.hoyB, d: 0, it: o2.ord, v: r.int(4, 30) });
  if (c.encuesta) P.push({ k: "encuesta", t: c.encuesta.t, b: c.encuesta.b, d: 5, e: 24 * 4, poll: c.encuesta.o, v: r.int(8, 30) });
  const dt = new Date(Date.UTC(2026, 10, 17 + r.int(8, 15)));
  P.push({ k: "aviso", t: `El ${DN[dt.getUTCDay()]} ${dt.getUTCDate()} de ${MES_ES[dt.getUTCMonth()]} ${c.avisoT}`.slice(0, 60), b: "Gracias por entender.", d: 2, e: 24 * 14,
    av: { day: `${DN[dt.getUTCDay()][0].toUpperCase()}${DN[dt.getUTCDay()].slice(1)} ${dt.getUTCDate()} ${MES_ES[dt.getUTCMonth()].slice(0, 3)}`, hrs: c.avisoH ?? "early", hrsT: c.avisoHT ?? "9 AM – 3 PM" }, v: r.int(2, 14) });
  if (c.cupon) P.push({ k: "cupon", t: c.cupon.t, b: c.cupon.b, d: 3, e: 24 * 20, cc: `${c.cupon.pref}${5 + (b.n % 5)}`, co: c.cupon.off, cm: c.cupon.min, cu: 100, au: "fol", v: r.int(4, 22) });
  const ciudad = b.addr.text.split(", ")[1].replace(" PA", "");
  P.push({ k: "novedad", t: `Cumplimos ${2026 - b.founded} años en ${ciudad}`.slice(0, 60), b: `Gracias a cada familia que nos eligió desde ${b.founded}.`, d: 20 + r.int(0, 30), e: 24 * 30, v: r.int(10, 60) });
  P.push({ k: "novedad", t: c.nov2[b.n % c.nov2.length][0], b: c.nov2[b.n % c.nov2.length][1], d: 60 + r.int(0, 80), e: 24 * 20, v: r.int(8, 40) });
  const n3 = rebaja(o3);
  if (!c.sinOferta) P.push({ k: "oferta", t: `${o3.es} con descuento de temporada`.slice(0, 60), b: "Oferta de otro mes, ya terminada.", d: 140 + r.int(0, 300), e: 24 * 5, it: o3.ord, was: o3.p, now: n3, v: r.int(3, 20) });
  P.push({ k: "novedad", t: c.nov3[0], b: c.nov3[1], d: 300 + r.int(0, 600), e: 24 * 7, v: r.int(5, 30) });
  return P;
}
