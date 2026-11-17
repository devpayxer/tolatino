/* R2 · FOOD · motor: menú → SQL, pedidos, reseñas y novedades de los negocios de comida (subcategorías 06–53). Parte del motor de a/food.mjs
   (que no exporta sus piezas y no se edita), generalizado por «perfil» (tipo de negocio) y con volúmenes de la ronda 2 (más ligeros). */
import { q, j, arr, bi, photoUrl, MES_ES, money } from "../a/comun.mjs";
import { estrellas, dias, maxDiasDe } from "../a/negocio.mjs";
export const NUM_BASE = 21000000;
export function itemsPlanos(menu) {
  const out = [];
  for (const s of menu.sections) for (const it of s.items) out.push(it);
  return out;
}

export function sqlMenu(menu, r, disp) {
  const flat = [];
  let sql = "";
  const usado = new Set();
  const gdef = (k) => { const d = menu.defs[k]; return d; };
  const ensure = (k) => {
    if (usado.has(k)) return "";
    usado.add(k);
    const d = gdef(k);
    return `  insert into option_groups (business_id, name, required, max_pick, options) values (b, ${j(bi(d.n[0], d.n[1]))}, ${d.req}, ${d.max}, ${j(d.o.map((o) => ({ es: o[0], en: o[1], cents: o[2], on: true })))}) returning id into gid;
  gk := gk || jsonb_build_object(${q(k)}, gid);
`;
  };
  menu.sections.forEach((s, si) => {
    sql += `  insert into item_sections (business_id, module, name, sort, avail, av) values (b, 'menu', ${j(bi(s.n[0], s.n[1]))}, ${si}, ${q(s.avail)}, ${s.av ? j(s.av) : "null"}) returning id into s;\n`;
    s.items.forEach((it, ii) => {
      for (const k of it.g) sql += ensure(k);
      const stock = it.stock ?? (r.chance(0.12) ? { mode: "day", left: r.int(4, 22), par: 24 } : { mode: "none", left: 0, par: 10 });
      const sold = r.chance(0.035);
      const ext = it.feat ?? (ii < 1 && r.chance(0.5));
      flat.push(it);
      it.ord = flat.length;
      sql += `  insert into items (business_id, module, section_id, name, descr, price_cents, photos, channels, sold_out, stock_mode, stock_left, stock_par, stock_day, tags, featured, avail, group_ids, sort)
    values (b, 'menu', s, ${j(bi(it.es, it.en))}, ${j(bi(it.de, it.den))}, ${it.p}, array[${q(photoUrl(it.ph))}]::text[], ${arr(disp.delivery ? (disp.pickup ? ["dlv", "pick"] : ["dlv"]) : ["pick"])}, ${sold}, ${q(stock.mode)}, ${stock.left}, ${stock.par}, (now() at time zone 'America/New_York')::date,
            ${arr(it.t.filter((x) => x !== "pica" || true))}, ${!!ext}, 'cat', array[${it.g.map((k) => `(gk->>${q(k)})::bigint`).join(", ")}]::bigint[], ${ii});\n`;
    });
  });
  return { sql, flat };
}

const NOTAS = ["Sin cebolla, por favor.", "Bien caliente, que voy llegando.", "Toque en la puerta de atrás.", "Poquito picante.", "Sin sal en el arroz.", "Con servilletas extra.", "Es para un cumpleaños, gracias.", "Leave at the door, please.", "No onions please.", "Extra sauce on the side."];
const ESTADOS_MALOS = [["cancelled", "user", "Me equivoqué de pedido."], ["cancelled", "business", "Se nos acabó un ingrediente."], ["declined", null, null], ["expired", null, null]];
export function genOrdenes(r, b, menu, flat, disp, prof, nOps, base) {
  const maxD = maxDiasDe(b.founded);
  const hoursDef = b.hours;
  const pop = flat.filter((x) => !x.svc).map((it, i) => ({ it, w: (it.feat ? 3 : 1) * (it.p < 1600 ? 2 : 1) * (it.es.includes("(almuerzo)") ? 1.5 : 1) }));
  const wsum = pop.reduce((s, x) => s + x.w, 0);
  const pickItem = () => { let u = r() * wsum; for (const x of pop) { u -= x.w; if (u <= 0) return x.it; } return pop[0].it; };
  const ops = [];
  const regulares = Array.from({ length: 36 }, () => r.int(0, 299));
  for (let k = 0; k < nOps; k++) {
    // día (recientes más), en un día en que el negocio abre
    let d = k < 22 ? r.int(0, 29) : dias(r, maxD), h, tries = 0;
    while (tries++ < 14) {
      const wd = ((new Date(Date.UTC(2026, 10, 17)).getUTCDay() - d) % 7 + 7) % 7;
      h = hoursDef[wd];
      if (h.open) break;
      d += 1;
    }
    const rg = h.ranges[0];
    const [o0, o1] = [rg[0], rg[1]].map((x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3)));
    const m = r.int(o0 + 20, Math.max(o0 + 21, o1 - 40));
    const u = r.chance(0.55) ? r.pick(regulares) : r.int(0, 299);
    const delivery = disp.delivery && (!disp.pickup || r.chance(prof.dlv));
    const nLines = r.int(1, prof.lines);
    const L = [];
    const usados = new Set();
    for (let l = 0; l < nLines; l++) {
      const it = pickItem();
      if (usados.has(it.ord)) continue;
      usados.add(it.ord);
      const ops2 = [];
      let unit = it.p;
      for (const gk of it.g) {
        const gd = menu.defs[gk];
        if (!gd.req && !r.chance(0.28)) continue;
        const picks = gd.req ? 1 : r.int(1, Math.min(gd.max, 2));
        const pool = r.shuffle(gd.o.map((o, ix) => ix)).slice(0, picks);
        for (const ix of pool) { const o = gd.o[ix]; unit += o[2]; ops2.push({ g: { es: gd.n[0], en: gd.n[1] }, o: { es: o[0], en: o[1] } }); }
      }
      const qty = r.pick(prof.qty);
      L.push([it.ord, qty, unit, 6, ops2, r.chance(0.07) ? r.pick(["Bien cocido", "Sin picante", "Cortado en cuatro", "Extra salsa"]) : null]);
    }
    const sub = L.reduce((s, x) => s + x[1] * x[2], 0), tax = Math.round(L.reduce((s, x) => s + (x[1] * x[2] * 6) / 100, 0));
    const dlv = delivery ? (disp.free && sub >= disp.free ? 0 : disp.fee) : 0;
    const tip = delivery && r.chance(0.55) ? Math.round((sub * r.pick([0.15, 0.18, 0.2])) / 5) * 5 : 0;
    const tot = sub + tax + dlv + tip;
    const recent = d < 400;
    const pm = r.weighted([[recent ? "a" : "l", 55], ["l", 30], [delivery ? "e" : "l", 15]]);
    const pmode = delivery && pm === "l" ? "e" : pm;
    const bad = r.chance(0.07) ? r.pick(ESTADOS_MALOS) : null;
    const op = { q: base + k, n: String(NUM_BASE + base + k), d, m, u, mo: delivery ? "d" : "p", pm: pmode, st: bad ? bad[0] : "done", sub, tax, dlv, tip, tot, L, prep: Math.max(10, disp.prep + r.int(-6, 10)) };
    if (bad && bad[1]) { op.cb = bad[1]; op.cr = bad[2]; }
    if (r.chance(0.12)) op.nt = r.pick(NOTAS);
    if (delivery) op.det = { to: { label: "casa", street: `${r.int(2, 98) * 10 + 1} ${r.pick(["N Church St", "W 4th St", "Maple Ave", "Oak St", "Linden St", "Main St", "Park Ave"])}`, apt: r.chance(0.3) ? `Apt ${r.int(1, 12)}` : null, zip: b.addr.zip, mi: +(r.int(3, disp.zone * 10) / 10).toFixed(1) }, drop: { drop: "mano", at: [], note: "" } };
    else op.det = { address: b.addr.text, pickupNote: { es: "Pide en la caja con tu número de pedido.", en: "Ask at the register with your order number." } };
    if (pmode === "a") { op.br = r.pick(["visa", "visa", "mastercard", "amex"]); op.l4 = r.pick(["4242", "4444", "0005", "1881", "9424"]); }
    ops.push(op);
  }
  // Pedidos programados que vienen (1 a 3): confirmados, con hora en el futuro.
  const fut = r.int(1, 3);
  for (let k = 0; k < fut; k++) {
    const base2 = ops.length;
    const it = pickItem();
    const unit = it.p, qty = r.int(1, 3), sub = unit * qty, tax = Math.round(sub * 0.06), dlv = 0;
    ops.push({ q: base + base2, n: String(NUM_BASE + base + base2), d: 0, m: 720, fut: r.int(180, 2600), u: r.int(0, 299), mo: "p", pm: "l", st: "confirmed", sub, tax, dlv, tip: 0, tot: sub + tax, prep: disp.prep,
      L: [[it.ord, qty, unit, 6, [], null]], det: { address: b.addr.text, pickupNote: { es: "Pide en la caja con tu número de pedido.", en: "Ask at the register with your order number." } } });
  }
  return ops;
}

// ── Reseñas ──
const RES_ES5 = [
  "«{d}»: riquísimo, con el sazón de casa. {x}", "Pedí «{d}» y llegó calientito y en su punto. {x}", "Increíble lo que pedí, «{d}»; se nota que cocinan con cariño. {x}", "Todo fresco y bien sazonado; «{d}» es lo mejor. {x}",
  "Porciones generosas y buen precio. Repetimos «{d}». {x}", "Hacía años que no probaba algo así: «{d}». {x}", "«{d}» sabe a la cocina de mi mamá. {x}", "Pedido perfecto: «{d}» y todo lo demás. {x}",
];
const RES_ES4 = ["Muy bueno «{d}», aunque tardó un poquito. {x}", "Rico «{d}» y buen servicio; le subiría la sal. {x}", "Buena comida y buen precio, «{d}» cumple. {x}", "«{d}» estaba sabroso. Me gustaría ver más opciones. {x}"];
const RES_ES3 = ["Pedí «{d}»: estaba bien, pero la comida llegó tibia. {x}", "Demoró más de lo prometido, aunque la comida estaba buena («{d}»). {x}", "La porción de «{d}» me pareció pequeña para el precio. {x}"];
const RES_ES2 = ["Pedí «{d}» y la comida llegó fría y tarde. {x}", "Esperaba más de «{d}»: le faltó sazón y llegó tarde. {x}", "Faltó una parte del pedido («{d}») y tuve que llamar. {x}"];
const X_ES5 = ["Atención muy amable.", "Entrega puntual.", "Ya somos clientes de hace años.", "Lo recomiendo con los ojos cerrados.", "Volvemos el próximo fin de semana.", "Gracias por tanto cariño.", "Se lo recomendé a toda la familia."];
const X_ES3 = ["Espero que mejoren.", "Les doy otra oportunidad.", "El trato sí fue amable."];
const RES_EN5 = ["The {d} was delicious, tastes like home. {x}", "I ordered the {d} and it arrived hot and perfect. {x}", "Incredible {d}; you can tell they cook with love. {x}", "Fresh and well seasoned, the {d} is the best. {x}", "Generous portions and a fair price. We reorder the {d}. {x}"];
const RES_EN4 = ["Very good {d}, though it took a little while. {x}", "Tasty {d} and good service. {x}"];
const RES_EN3 = ["The {d} was fine but arrived lukewarm. {x}", "It took longer than promised, though the food was good. {x}"];
const RES_EN2 = ["The {d} arrived cold and late. {x}", "Part of my order was missing and I had to call. {x}"];
const X_EN5 = ["Very friendly service.", "On-time delivery.", "We have been customers for years.", "Highly recommend.", "We will be back next weekend."];
const X_EN3 = ["Hope they improve.", "I will give them another try."];
const REPLY_ES5 = ["Gracias por tu reseña. Te esperamos pronto.", "Un gusto atenderte. ¡Buen provecho!", "Gracias por tus palabras; se las paso al equipo.", "Gracias por la confianza. Vuelve cuando quieras."];
const REPLY_ES3 = ["Gracias por avisarnos. Lamentamos la demora; ya ajustamos los tiempos. Te invitamos a probar de nuevo.", "Tienes razón y lo estamos corrigiendo. Escríbenos y te lo compensamos en tu próximo pedido.", "Gracias por tu honestidad. Tomamos nota para mejorar el servicio."];
const REPLY_EN5 = ["Thank you for your review. See you soon.", "Our pleasure. Enjoy!", "Thanks for the kind words; we will pass them on to the team."];
const REPLY_EN3 = ["Thank you for telling us. We are sorry for the delay and have adjusted our times. Please try us again.", "You are right and we are fixing it. Message us and we will make it up on your next order."];
const G_ES5 = ["Excelente calidad: «{d}» superó lo que esperaba. {x}", "Pedí «{d}» y quedé encantada; todo muy fresco. {x}", "Lo mejor del barrio: «{d}» no tiene comparación. {x}", "Buen precio y muy buena calidad en «{d}». {x}", "Siempre vuelvo por «{d}»; nunca falla. {x}"];
const G_ES4 = ["Muy bueno «{d}», aunque había un poco de fila. {x}", "Buena calidad y buen servicio con «{d}». {x}", "«{d}» estuvo bien; me gustaría ver más variedad. {x}"];
const G_ES3 = ["«{d}» estaba bien, pero esperaba algo más por el precio. {x}", "Tardaron más de lo prometido, aunque «{d}» estaba bien. {x}", "Me falló un detalle del pedido; «{d}», regular. {x}"];
const G_ES2 = ["«{d}» no era lo que esperaba y tardó mucho. {x}", "Faltó una parte del pedido y tuve que volver. {x}"];
const G_EN5 = ["Excellent quality: {d} beat my expectations. {x}", "I ordered {d} and loved it; everything was fresh. {x}", "Best in the neighborhood, {d} has no match. {x}", "Fair price and great quality on {d}. {x}"];
const G_EN4 = ["Very good {d}, though there was a short line. {x}", "Good quality and service with {d}. {x}"];
const G_EN3 = ["{d} was fine, but I expected a bit more for the price. {x}", "It took longer than promised, though {d} was fine. {x}"];
const G_EN2 = ["{d} was not what I expected and it took long. {x}", "Part of my order was missing and I had to go back. {x}"];
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? "");

export function genResenas(r, b, ops, flat, nRev, prof) {
  const hechas = ops.filter((o) => o.st === "done");
  // un reseñista por persona: la operación más reciente de cada cliente
  const porU = new Map();
  for (const o of hechas.sort((a, b2) => a.d - b2.d)) if (!porU.has(o.u)) porU.set(o.u, o);
  const cand = r.shuffle([...porU.values()]).slice(0, nRev);
  const out = [];
  for (const o of cand) {
    const s = estrellas(r);
    const en = r.chance(0.28);
    const ln = o.L.map((x) => flat[x[0] - 1]).filter(Boolean);
    const dish = (en ? ln[0]?.en : ln[0]?.es) ?? "comida";
    const dishN = en ? dish : dish.replace(/ \(almuerzo\)$/, "");
    const gen = prof.gen;
    const pool = en ? (s >= 5 ? (gen ? G_EN5 : RES_EN5) : s === 4 ? (gen ? G_EN4 : RES_EN4) : s === 3 ? (gen ? G_EN3 : RES_EN3) : (gen ? G_EN2 : RES_EN2)) : (s >= 5 ? (gen ? G_ES5 : RES_ES5) : s === 4 ? (gen ? G_ES4 : RES_ES4) : s === 3 ? (gen ? G_ES3 : RES_ES3) : (gen ? G_ES2 : RES_ES2));
    const xs = en ? (s >= 4 ? X_EN5 : X_EN3) : (s >= 4 ? X_ES5 : X_ES3);
    const body = fmt(r.pick(pool), { d: dishN.toLowerCase().startsWith("la ") ? dishN : dishN, x: r.pick(xs) }).trim();
    const asw = s >= 5 ? { taste: 1, hot: 1, val: r.pick([1, 1, 0]) } : s === 4 ? { taste: 1, hot: r.pick([1, 0]), val: r.pick([1, 0]) } : s === 3 ? { taste: 0, hot: r.pick([0, -1]), val: 0 } : { taste: -1, hot: -1, val: r.pick([0, -1]) };
    const rv = { o: o.q, s, l: en ? "en" : "es", b: body.length < 22 ? body + " Todo muy bien." : body, a: asw, src: o.mo === "d" ? "dl" : "pk", d: r.int(0, 3), rc: o.L.slice(0, 2).map((x) => x[0]), h: r.chance(0.3) ? r.int(1, 7) : 0 };
    if (o.mo === "d") rv.f = { late: s >= 4 ? r.int(-8, 4) : r.int(8, 30) };
    if (s <= 3 || r.chance(0.42)) { rv.r = r.pick(s <= 3 ? (en ? REPLY_EN3 : REPLY_ES3) : (en ? REPLY_EN5 : REPLY_ES5)); rv.rl = en ? "en" : "es"; }
    out.push(rv);
  }
  return out;
}

export function genNovedades(r, b, flat, prof) {
  const P = [];
  const caros = flat.filter((x) => x.p >= 400 && x.p < 40000 && !x.svc);
  const o1 = r.pick(caros), o2 = r.pick(caros), o3 = r.pick(caros);
  const rebaja = (x) => Math.round((x.p * r.pick([0.8, 0.85, 0.9])) / 5) * 5;
  P.push({ k: "oferta", t: `${o1.es} a ${money(rebaja(o1))} hoy`.slice(0, 60), b: "Hasta agotar. Pídelo en la app.", d: 1, pin: true, it: o1.ord, was: o1.p, now: rebaja(o1), v: r.int(6, 40) });
  P.push({ k: "hoy", t: `Hoy hay ${o2.es}`.slice(0, 60), b: "Recién hecho esta mañana. Son pocas unidades.", d: 0, it: o2.ord, v: r.int(4, 30) });
  P.push({ k: "encuesta", t: `¿Qué ${prof.coc[0]} esta semana?`, b: `Vota y ${prof.coc[1]} el más pedido.`, d: 5, e: 24 * 4, poll: r.shuffle(flat.filter((x) => x.p >= 300)).slice(0, 3).map((x) => x.es.slice(0, 40)), v: r.int(8, 30) });
  const dt = new Date(Date.UTC(2026, 10, 17 + r.int(8, 15))), dnames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  P.push({ k: "aviso", t: `El ${dnames[dt.getUTCDay()]} ${dt.getUTCDate()} de ${MES_ES[dt.getUTCMonth()]} cerramos temprano`.slice(0, 60), b: "Gracias por entender.", d: 2, e: 24 * 14, av: { day: `${dnames[dt.getUTCDay()][0].toUpperCase()}${dnames[dt.getUTCDay()].slice(1)} ${dt.getUTCDate()} ${MES_ES[dt.getUTCMonth()].slice(0, 3)}`, hrs: "early", hrsT: "9 AM – 3 PM" }, v: r.int(2, 14) });
  P.push({ k: "cupon", t: "Cupón de seguidores: $5 en tu pedido", b: "Para quien nos sigue: $5 de descuento en pedidos desde $25.", d: 3, e: 24 * 20, cc: `SEGUIR${5 + (b.n % 5)}`, co: 500, cm: 2500, cu: 100, au: "fol", v: r.int(4, 22) });
  P.push({ k: "novedad", t: `Cumplimos ${2026 - b.founded} años en ${b.addr.text.split(", ")[1].replace(" PA", "")}`.slice(0, 60), b: `Gracias a cada familia que nos eligió desde ${b.founded}. Seguimos ${prof.coc[2]} igual.`, d: 20 + r.int(0, 30), e: 24 * 30, v: r.int(10, 60) });
  P.push({ k: "novedad", t: ["Ahora aceptamos pedidos programados", "Nuevo horario de fin de semana", "Estrenamos empaques nuevos", "Seguimos con los precios de siempre"][b.n % 4], b: "Programa tu pedido con hasta 6 días de anticipación desde la app.", d: 60 + r.int(0, 80), e: 24 * 20, v: r.int(8, 40) });
  P.push({ k: "oferta", t: `${o3.es} con descuento de temporada`.slice(0, 60), b: "Oferta de otro mes, ya terminada.", d: 140 + r.int(0, 300), e: 24 * 5, it: o3.ord, was: o3.p, now: rebaja(o3), v: r.int(3, 20) });
  P.push({ k: "novedad", t: "Reconocimiento a nuestros clientes más fieles", b: "Entre todos nuestros seguidores del año sorteamos un vale de consumo para la familia.", d: 300 + r.int(0, 600), e: 24 * 7, v: r.int(5, 30) });
  return P;
}

export const FIRST_FEM = (n) => /a$|^(Carmen|Luz|Mercedes|Inés|Dolores|Beatriz|Isabel)$/.test(n) && !/^(José|Jesús)$/.test(n);
const ROLES_EQ = [["Cocina", "Kitchen"], ["Caja y mostrador", "Register and counter"], ["Delivery", "Delivery driver"], ["Ayudante de cocina", "Kitchen helper"], ["Atención y pedidos", "Orders and service"], ["Repostería", "Pastry"], ["Servicio y montaje", "Service and setup"], ["Sous chef", "Sous chef"]];
export function EQUIPO(prof, r, founded) {
  const nombres = r.shuffle(["Anyelina", "Yoel", "Kimberly", "Josué", "Marcela", "Elvis", "Nathalie", "Brayan", "Lisbeth", "Darwin", "Yuleisy", "Franklin"]);
  const roles = prof.team;
  return roles.slice(0, r.int(1, 3)).map((ri, i) => ({ name: `${nombres[i]} ${r.pick(["Cruz", "Mejía", "Peña", "Rosario", "Santana", "Díaz", "Ortega"])}`, role: bi(ROLES_EQ[ri][0], ROLES_EQ[ri][1]), since: Math.min(2025, founded + r.int(1, 6)) }));
}
