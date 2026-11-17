/* Ronda 2 · MERC · pedidos del mercado, reseñas y novedades de cada negocio (más ligeros que la ronda 1). Números M-26000000 en adelante. */
import { photoUrl, money } from "../a/comun.mjs";
import { dias, maxDiasDe } from "../a/negocio.mjs";
import { genResenas, genNovedades } from "../a/textos.mjs";

export const NUM_BASE = 26000000;
export const CLIENTES_N = 247;

const MALOS = [["cancelled", "user", "Cambié de planes."], ["cancelled", "business", "No teníamos lo principal del pedido."], ["declined", null, null], ["expired", null, null]];

/* flat = solo lo que se puede pedir (lo de 21+ es «solo en la tienda»). it.ord = posición real del ítem en la tienda. */
export function genOrdenes(r, b, flat, grupos, disp, nOps, base, S) {
  const maxD = maxDiasDe(b.founded);
  const wsum = flat.map((it) => ({ it, w: (it.p < 800 ? 1.5 : 1) * (it.peso ? 1.3 : 1) }));
  const tot = wsum.reduce((s, x) => s + x.w, 0);
  const pick = () => { let u = r() * tot; for (const x of wsum) { u -= x.w; if (u <= 0) return x.it; } return wsum[0].it; };
  const ops = [];
  const reg = Array.from({ length: 40 }, () => r.int(0, CLIENTES_N - 1));
  const hayEnvio = disp.delivery !== false;
  for (let k = 0; k < nOps; k++) {
    let d = k < 14 ? r.int(0, 29) : dias(r, maxD), h, t = 0;
    while (t++ < 14) { const wd = ((new Date(Date.UTC(2026, 10, 17)).getUTCDay() - d) % 7 + 7) % 7; h = b.hours[wd]; if (h.open) break; d += 1; }
    const rg = h.ranges[0].map((x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3)));
    const m = r.int(rg[0] + 20, Math.max(rg[0] + 21, rg[1] - 60));
    const u = r.chance(0.5) ? r.pick(reg) : r.int(0, CLIENTES_N - 1);
    const delivery = hayEnvio && r.chance(0.4);
    const nL = S.qmax ? r.int(1, S.qmax) : r.int(2, 5), L = [], usados = new Set();
    let sub = 0, subEst = 0, pesoEst = 0;
    for (let l = 0; l < nL; l++) {
      const it = pick();
      if (usados.has(it.ord)) continue;
      usados.add(it.ord);
      const ops2 = it.g.map((gk) => { const gd = grupos[gk]; const o = r.pick(gd.o); return { g: { es: gd.n[0], en: gd.n[1] }, o: { es: o[0], en: o[1] } }; });
      if (it.peso) {
        const west = r.pick([1, 1.5, 2, 2, 2.5, 3, 4, 5]);
        const wfin = Math.round(west * (0.9 + r() * 0.2) * 100) / 100;
        const fin = Math.round(it.p * wfin), est = Math.round(it.p * west);
        L.push([it.ord, 1, it.p, it.tax, ops2, west, wfin, fin, "ok", photoUrl(it.ph)]);
        sub += fin; subEst += est; pesoEst += est;
      } else {
        const qty = it.p > 3000 ? r.pick([1, 1, 2]) : r.pick([1, 1, 1, 2, 2, 3, 4]);
        L.push([it.ord, qty, it.p, it.tax, ops2, null, null, qty * it.p, "ok", null]);
        sub += qty * it.p; subEst += qty * it.p;
      }
    }
    if (!L.length) continue;
    const dlv = delivery ? (sub >= disp.free ? 0 : disp.fee) : 0;
    const est = subEst + Math.round(pesoEst * 0.1) + dlv;
    const bad = r.chance(0.06) ? r.pick(MALOS) : null;
    const pm = r.chance(d < 500 ? 0.62 : 0.35) ? "a" : "l";
    const op = { q: base + k, n: `M-${NUM_BASE + base + k}`, d, m, u, mo: delivery ? "d" : "p", pm: delivery ? "a" : pm, st: bad ? bad[0] : "done", sub, dlv, tot: sub + dlv, est, L };
    if (bad && bad[1]) { op.cb = bad[1]; op.cr = bad[2]; }
    if (bad) { op.L = L.map((x) => [x[0], x[1], x[2], x[3], x[4], x[5], null, null, "ok", null]); op.tot = subEst + dlv; op.sub = subEst; }
    if (delivery) op.det = { to: { label: "casa", street: `${r.int(2, 98) * 10 + 1} ${r.pick(["N Church St", "W 4th St", "Maple Ave", "Oak St", "Linden St", "Main St"])}`, apt: r.chance(0.3) ? `Apt ${r.int(1, 12)}` : null, zip: b.addr.zip, mi: +(r.int(3, disp.zone * 10) / 10).toFixed(1) }, window_end: "18:30" };
    else op.det = { address: b.addr.text, window_end: "17:30" };
    if (op.pm === "a") { op.br = r.pick(["visa", "visa", "mastercard", "amex"]); op.l4 = r.pick(["4242", "4444", "0005", "1881", "9424"]); }
    ops.push(op);
  }
  for (let k = 0; k < r.int(1, 3); k++) {
    const it = pick(), idx = ops.length;
    const qty = it.peso ? 1 : r.int(1, 3), west = it.peso ? r.pick([2, 3]) : null;
    const subE = it.peso ? Math.round(it.p * west) : it.p * qty;
    ops.push({ q: base + idx, n: `M-${NUM_BASE + base + idx}`, d: 0, m: 720, fut: r.int(120, 1800), u: r.int(0, CLIENTES_N - 1), mo: "p", pm: "a", st: "confirmed", sub: subE, dlv: 0, tot: subE, est: Math.round(subE * 1.1), br: "visa", l4: "4242",
      L: [[it.ord, qty, it.p, it.tax, [], west, null, subE, "ok", null]], det: { address: b.addr.text, window_end: "17:30" } });
  }
  return ops;
}

const PACK_FOOD = {
  es: { 5: ["{d} siempre fresco y bien atendido. {x}", "Buen precio en {d} y atención de confianza. {x}", "Pedí {d} por la app y estaba tal como lo pedí. {x}", "Aquí consigo {d} como en mi tierra. {x}", "Me pesaron {d} con foto y cobraron el peso real. {x}"],
    4: ["Buen {d}, aunque tardaron un poco en armar el pedido. {x}", "Todo bien con {d}; los precios están justos. {x}", "Fresco el {d} y buena atención. {x}"], 3: ["El {d} estaba bien pero la fila en la caja fue larga. {x}", "Faltó una parte del pedido y me avisaron tarde. {x}"], 2: ["El {d} no estaba tan fresco como esperaba. {x}", "Demoraron mucho el pedido y llegó incompleto. {x}"],
    x5: ["Los recomiendo.", "Ya somos clientes de años.", "Buena atención.", "Gracias por todo.", "Vuelvo cada semana."], x3: ["Espero que mejoren.", "Les doy otra oportunidad."] },
  en: { 5: ["Always fresh {d} and great service. {x}", "Great price on {d} and trusted service. {x}", "I ordered {d} in the app and it was exactly as asked. {x}", "I find {d} here just like back home. {x}"],
    4: ["Good {d}, though the order took a while to assemble. {x}", "Fresh {d} and friendly service. {x}"], 3: ["The {d} was fine but the register line was long. {x}", "Part of my order was missing and they told me late. {x}"], 2: ["The {d} was not as fresh as I expected. {x}", "The order took forever and arrived incomplete. {x}"],
    x5: ["Highly recommend.", "Customers for years.", "Friendly staff.", "Thank you for everything."], x3: ["Hope they improve.", "I will give them another chance."] },
};
const PACK_GEN = {
  es: { 5: ["Encontré {d} sin problema y la atención fue excelente. {x}", "Pedí {d} por la app y lo tenían listo al llegar. {x}", "Buen precio en {d} y lugar limpio. {x}", "Siempre tienen {d} cuando lo necesito. {x}"],
    4: ["Bien con {d}, aunque tardaron un poco en prepararlo. {x}", "Buena atención y precios justos en {d}. {x}", "El {d} estaba como esperaba. {x}"], 3: ["El {d} estaba bien pero había mucha fila. {x}", "Faltó algo del pedido y me avisaron tarde. {x}"], 2: ["El {d} no era lo que esperaba. {x}", "Demoraron mucho el pedido y llegó incompleto. {x}"],
    x5: ["Los recomiendo.", "Ya somos clientes de años.", "Buena atención.", "Gracias por todo.", "Vuelvo seguido."], x3: ["Espero que mejoren.", "Les doy otra oportunidad."] },
  en: { 5: ["Found {d} with no trouble and the service was excellent. {x}", "I ordered {d} in the app and it was ready when I got there. {x}", "Good price on {d} and a clean place. {x}", "They always have {d} when I need it. {x}"],
    4: ["Good with {d}, though it took a bit to prepare. {x}", "Friendly staff and fair prices on {d}. {x}"], 3: ["The {d} was fine but the line was long. {x}", "Part of my order was missing and they told me late. {x}"], 2: ["The {d} was not what I expected. {x}", "The order took forever and arrived incomplete. {x}"],
    x5: ["Highly recommend.", "Customers for years.", "Friendly staff.", "Thank you for everything."], x3: ["Hope they improve.", "I will give them another chance."] },
};

export function resenas(r, ops, flatPorOrd, S) {
  const T = S.tono === "food" ? PACK_FOOD : PACK_GEN;
  const hechas = ops.filter((o) => o.st === "done").length;
  const nRev = Math.min(40, Math.max(15, Math.round(hechas * r.pick([0.22, 0.28, 0.34]))));
  return genResenas(r, ops, nRev, {
    vale: (o) => o.st === "done", srcDe: (o) => (o.mo === "d" ? "dl" : "pk"), recDe: (o) => o.L.slice(0, 2).map((x) => x[0]), nombreDe: (o) => { const x = flatPorOrd.get(o.L[0][0]); return { es: x.es, en: x.en }; },
    resp: (rr, s) => (s >= 5 ? { trato: 1, fresco: 1, estante: 1, sust: rr.pick(["ok", "na"]) } : s === 4 ? { trato: 1, fresco: rr.pick([1, 0]), estante: 1, sust: "na" } : s === 3 ? { trato: 0, fresco: 0, estante: rr.pick([1, 0]), sust: rr.pick(["na", "ok"]) } : { trato: -1, fresco: -1, estante: 0, sust: rr.pick(["no", "na"]) }),
    hechos: (rr, s, o) => (o.mo === "d" ? { late: s >= 4 ? rr.int(-10, 5) : rr.int(10, 40) } : null),
    es: T.es, en: T.en,
    rEs5: ["Gracias por tu reseña. Aquí te esperamos.", "Un gusto atenderte. Vuelve pronto.", "Gracias por tu confianza; se la paso al equipo."], rEs3: ["Gracias por avisarnos. Ya lo estamos corrigiendo; escríbenos y lo arreglamos en tu próximo pedido.", "Lamentamos la demora. Tomamos nota para mejorar la caja y el armado de pedidos."],
    rEn5: ["Thank you for your review. See you soon.", "Our pleasure. Come back soon."], rEn3: ["Thank you for telling us. We are fixing it; message us and we will make it right on your next order."],
  });
}

export function novedades(r, bz, flat, S) {
  const food = S.tono === "food";
  const c = {
    oferta: "Hasta el domingo. Pídelo en la app y recógelo o te lo llevamos.", hoy: (x) => (food ? `Hoy llegó ${x.es.toLowerCase()} fresco` : `Nuevo en el estante: ${x.es}`), hoyB: food ? "Llegó esta mañana. Hasta agotar." : "Ya está disponible. Pídelo en la app y recógelo en el mostrador.",
    encuesta: { t: "¿Qué quieres que traigamos?", b: "Vota y lo pedimos para la próxima semana.", o: S.enc }, avisoT: "cerramos temprano",
    cupon: S.edad ? null : { t: "Cupón de seguidores: $5 en tu pedido", b: "Para quien nos sigue: $5 de descuento en pedidos desde $30.", pref: "SEGUIR", off: 500, min: 3000 },
    nov2: S.nov2, nov3: S.nov3, sinOferta: !!S.sinOferta,
  };
  let P = genNovedades(r, bz, flat, c);
  // 3–6 novedades: se quitan la oferta vieja, la nota de aniversario viejo y, si sobran, el aviso.
  P = P.filter((x) => !(x.k === "oferta" && x.d >= 140) && x.t !== S.nov3[0]);
  if (P.length > 6) P = P.filter((x) => x.k !== "aviso");
  return P.slice(0, 6);
}

export { money };
