/* Historia genérica (fiestas, transporte, educación, niños, fe y las visitas sin inventario): operaciones, eventos y reseñas con respuesta.
   Misma forma de fila que usa la ronda 1 (grupo C) para que se emita igual. Todo determinista. */
import { Rng, q, BI, diaDeVida, redondea, lugar, HOY } from "../c/base.mjs";
import { textoReplica } from "../c/textos.mjs";
import { CLIENTES } from "./base.mjs";

const P = (...x) => x;
/* ── Bancos de reseñas [es, en]; {s} = servicio ── */
const mk = (o) => o;
export const BANCOS = {
  fiesta: mk({
    abre5: [P("Una fiesta preciosa.", "A beautiful party."), P("Todo salió como lo planeamos.", "Everything went as planned."), P("Muy profesionales.", "Very professional."), P("Súper recomendados.", "Highly recommended.")],
    medio5: [P("Llegaron a montar a la hora acordada y dejaron el lugar impecable.", "They arrived to set up at the agreed time and left the place spotless."), P("El paquete incluyó todo lo que decía la ficha, sin cargos de última hora.", "The package included everything on the page, with no last-minute charges."), P("El anticipo fue claro y el resto lo pagamos después de la fiesta.", "The deposit was clear and we paid the rest after the party."), P("La coordinadora estuvo pendiente todo el evento y resolvió cada detalle.", "The coordinator was on top of the whole event and handled every detail."), P("Para {s} nos dieron el presupuesto por escrito el mismo día.", "For {s} they gave us the written estimate the same day.")],
    cierra5: [P("Los vamos a llamar para la próxima.", "We will call them for the next one."), P("Gracias por todo.", "Thanks for everything."), P("Se los recomendé a mis amigas.", "I recommended them to my friends.")],
    abre4: [P("Buena fiesta en general.", "A good party overall."), P("Todo bien, con un detalle.", "All good, with one small thing.")],
    medio4: [P("El montaje empezó unos minutos tarde pero avisaron.", "Setup started a few minutes late but they let us know."), P("Pedimos una hora extra y tenía el precio que nos dijeron.", "We asked for an extra hour and it had the price they quoted.")],
    cierra4: [P("Los volvería a contratar.", "I would hire them again."), P("Recomendados.", "Recommended.")],
    abre3: [P("Regular.", "So-so."), P("Esperaba un poco más.", "I expected a little more.")],
    medio3: [P("Faltó una parte de la decoración y tuve que pedirla dos veces.", "Part of the décor was missing and I had to ask twice."), P("El equipo llegó tarde y casi no avisaron.", "The crew arrived late and barely let us know.")],
    cierra3: [P("Con mejor comunicación serían excelentes.", "With better communication they would be excellent.")],
    abre2: [P("No quedé conforme.", "I was not satisfied."), P("Mala experiencia.", "Bad experience.")],
    medio2: [P("Llegaron muy tarde al montaje y la fiesta empezó con retraso.", "They arrived very late to set up and the party started late."), P("Parte de lo que decía el paquete no estaba.", "Part of what the package listed was not there.")],
    cierra2: [P("Ojalá mejoren.", "I hope they improve."), P("Al menos respondieron cuando reclamé.", "At least they answered when I complained.")],
  }),
  trans: mk({
    abre5: [P("Excelente servicio.", "Excellent service."), P("Puntuales y amables.", "Punctual and friendly."), P("Muy buen viaje.", "A very good trip."), P("Súper recomendados.", "Highly recommended.")],
    medio5: [P("El chofer llegó a la hora y me avisó cuando salió.", "The driver arrived on time and messaged me when he left."), P("El precio que vi en la app fue el que pagué, con peajes incluidos.", "The price I saw in the app is what I paid, tolls included."), P("Para {s} cabían todas las maletas sin problema.", "For {s} all the bags fit with no trouble."), P("El carro estaba limpio y el viaje fue cómodo.", "The vehicle was clean and the ride was comfortable.")],
    cierra5: [P("Los vuelvo a llamar.", "I will call them again."), P("Gracias por todo.", "Thanks for everything."), P("Se los recomiendo a mi familia.", "I recommend them to my family.")],
    abre4: [P("Buen servicio.", "Good service."), P("Todo bien en general.", "All good overall.")],
    medio4: [P("Se tardó unos minutos en llegar pero avisó.", "He was a few minutes late but let me know."), P("El viaje tomó un poco más por el tráfico.", "The trip took a bit longer because of traffic.")],
    cierra4: [P("Cumplieron con lo prometido.", "They did what they promised."), P("Recomendado.", "Recommended.")],
    abre3: [P("Regular.", "So-so.")],
    medio3: [P("Llegó más tarde de lo acordado y tuve que escribir para preguntar.", "He arrived later than agreed and I had to message to ask.")],
    cierra3: [P("Esperaba un poco más.", "I expected a little more.")],
    abre2: [P("No fue lo que esperaba.", "It was not what I expected.")],
    medio2: [P("Esperé mucho tiempo y nadie contestó al principio.", "I waited a long time and no one answered at first.")],
    cierra2: [P("Ojalá mejoren.", "I hope they improve.")],
  }),
  clases: mk({
    abre5: [P("Excelente experiencia.", "Excellent experience."), P("Muy buen trato.", "Very good treatment."), P("Lo recomiendo.", "I recommend it."), P("Estoy muy contento.", "I am very happy.")],
    medio5: [P("Desde la inscripción todo fue claro: el precio, el horario y lo que incluye.", "From enrollment everything was clear: the price, the schedule and what it includes."), P("Las clases son en grupos pequeños y el maestro explica con paciencia.", "Classes are in small groups and the teacher explains patiently."), P("Me dieron la información de {s} sin presión y pude probar antes.", "They gave me the information about {s} with no pressure and I could try first."), P("El horario me funciona con el trabajo.", "The schedule works with my job.")],
    cierra5: [P("Ya llevo varios meses y sigo contento.", "I have been going for several months and I am still happy."), P("Se lo recomendé a mis amigos.", "I told my friends."), P("Gracias por todo.", "Thanks for everything.")],
    abre4: [P("Buena experiencia.", "A good experience."), P("Todo bien, con un detalle.", "All good, with one small thing.")],
    medio4: [P("La primera clase empezó unos minutos tarde pero avisaron.", "The first class started a few minutes late but they let us know."), P("El grupo estaba un poco lleno, aunque todo se resolvió.", "The group was a bit full, though it got sorted out.")],
    cierra4: [P("Lo volvería a tomar.", "I would take it again."), P("Recomendado.", "Recommended.")],
    abre3: [P("Regular.", "So-so.")],
    medio3: [P("Cambiaron el horario y me avisaron tarde.", "They changed the schedule and told me late.")],
    cierra3: [P("Con mejor comunicación sería excelente.", "With better communication it would be excellent.")],
    abre2: [P("No quedé conforme.", "I was not satisfied.")],
    medio2: [P("Esperaba más atención en el grupo y no la tuve.", "I expected more attention in the group and did not get it.")],
    cierra2: [P("Ojalá mejoren.", "I hope they improve.")],
  }),
  visita: mk({
    abre5: [P("Muy buena atención.", "Very good service."), P("Nos trataron muy bien.", "They treated us very well."), P("Sin presión.", "No pressure."), P("Muy recomendados.", "Highly recommended.")],
    medio5: [P("La visita fue a la hora que reservé en la app y todo estaba listo.", "The visit was at the time I booked in the app and everything was ready."), P("Me explicaron todo con el precio por escrito antes de hablar de nada más.", "They explained everything with the price in writing before anything else."), P("Contestaron todas mis preguntas sobre {s}.", "They answered all my questions about {s}.")],
    cierra5: [P("Volvería sin dudarlo.", "I would come back without hesitation."), P("Gracias por todo.", "Thanks for everything.")],
    abre4: [P("Buena visita.", "A good visit."), P("Todo bien en general.", "All good overall.")],
    medio4: [P("La visita empezó unos minutos tarde pero avisaron.", "The visit started a few minutes late but they let me know.")],
    cierra4: [P("Recomendado.", "Recommended.")],
    abre3: [P("Regular.", "So-so.")],
    medio3: [P("Tardaron en contestar mis mensajes.", "They were slow to answer my messages.")],
    cierra3: [P("Esperaba un poco más.", "I expected a little more.")],
    abre2: [P("No fue lo que esperaba.", "It was not what I expected.")],
    medio2: [P("Llegué a la hora y no había quien me atendiera.", "I came on time and there was nobody to help me.")],
    cierra2: [P("Ojalá mejoren.", "I hope they improve.")],
  }),
};
const llenar = (t, v) => t.replace(/\{(\w)\}/g, (_, k) => v[k] ?? "");
export function textoResenaGen(banco, stars, lang, s, r) {
  const T = BANCOS[banco], lvl = stars >= 5 ? "5" : stars <= 2 ? "2" : String(stars), li = lang === "es" ? 0 : 1;
  const a = r.pick(T["abre" + lvl]), m = r.pick(T["medio" + lvl]), c = r.chance(0.75) ? r.pick(T["cierra" + lvl]) : null, m2 = r.chance(0.4) && stars >= 4 ? r.pick(T["medio" + lvl]) : null;
  let out = [a[li], llenar(m[li], { s }), m2 && m2 !== m ? llenar(m2[li], { s }) : null, c ? c[li] : null].filter(Boolean).join(" ");
  if (out.length < 24) out += lang === "es" ? " Todo en orden." : " All in order.";
  return out.slice(0, 600);
}

const ESTRELLAS = [[5, 0.56], [4, 0.27], [3, 0.09], [2, 0.05], [1, 0.03]];
/* Una reseña por persona, de operaciones terminadas; entre 15 y 40 por negocio; 2–3★ siempre con respuesta, ~40 % de las de 4–5★. */
export function armarResenasGen(banco, B, filas, terminada, nombreDe) {
  const r = new Rng(B.seed + ":res"), hechas = filas.filter(terminada), vistos = new Set(), unicos = [];
  for (const f of hechas) { if (vistos.has(f.ph)) continue; vistos.add(f.ph); unicos.push(f); }
  const objetivo = Math.min(unicos.length, r.int(15, 40));
  const out = [];
  for (const f of r.some(unicos, objetivo).sort((a, b) => a.d - b.d)) {
    const stars = r.weighted(ESTRELLAS), lang = f._c?.lang === "en" || r.chance(0.1) ? "en" : "es";
    const s = (lang === "en" ? nombreDe(f).en : nombreDe(f).es).toLowerCase();
    const delay = r.int(0, 6), cd = Math.min(-1, f.d + delay), cm = r.int(9, 21) * 60 + r.int(0, 59);
    const reply = stars <= 3 ? true : r.chance(0.4);
    out.push({ biz: B.id, city: B.city, ph: f.ph, op: f.num, src: "cita", stars, body: textoResenaGen(banco, stars, lang, s, r), lang, answers: {}, facts: {}, cd, cm,
      ...(reply ? { reply: textoReplica(stars, lang, f._c?.nombre ?? "", r), rd: Math.min(-1, cd + r.int(0, 3)), rm: r.int(8, 20) * 60 + r.int(0, 59), rlang: lang } : {}) });
  }
  return out;
}

/* Seguidores: entre ~15 y ~80, más los de más edad. */
export function armarSeguidoresGen(B, clientes) {
  const r = new Rng(B.seed + ":seg"), n = Math.max(15, Math.min(80, Math.round((14 + (2026 - B.founded) * 3.4) * (B.size + 0.3) * (0.7 + r.next() * 0.6))));
  const pool = r.shuffle([...new Set(clientes.map((c) => c.tel))]), extra = r.shuffle(CLIENTES.map((x) => x.tel));
  return [...pool, ...extra].filter((x, i, a) => a.indexOf(x) === i).slice(0, n).map((ph) => ({ ph, d: -r.int(3, Math.max(10, (2026 - B.founded) * 330)) }));
}

/* ── Clientes de una lista: ~72 % caras nuevas ── */
export function elegirClientes(B, r, n) {
  const pool = r.shuffle(CLIENTES), out = []; let nuevo = 0;
  for (let i = 0; i < n; i++) { if (i > 3 && (r.chance(0.28) || nuevo >= pool.length)) out.push(out[r.int(0, out.length - 1)]); else out.push(pool[nuevo++ % pool.length]); }
  return out;
}

const dow = (d) => (HOY.getUTCDay() + d + 7 * 400) % 7;
const fechaDe = (d) => new Date(HOY.getTime() + d * 86400000).toISOString().slice(0, 10);
const M = (h, m = 0) => h * 60 + m;

/* cfg: { kind: 'party'|'trip'|'enrollment'|'visit', prefix, nBase, rubro, cat } ; items = ítems con kind/price/attrs/es/en */
export function histGen(B, cfg, items, nuevoNum) {
  const r = new Rng(B.seed + ":hist"), N = Math.max(40, Math.min(110, Math.round(cfg.nBase * B.size * (0.8 + r.next() * 0.4)))), U = r.int(3, 6);
  const clientes = elegirClientes(B, r, N + U + 20);
  const elegibles = items.filter((x) => (cfg.kind === "visit" ? true : cfg.kind === "party" ? ["pack", "cotiza", "unid"].includes(x.kind) : cfg.kind === "trip" ? ["priv", "asiento", "caja", "cotiza"].includes(x.kind) : x.kind !== "visita"));
  const pesos = elegibles.map((x, i) => [x, i < 3 ? 3 : 1]);
  const dias = Array.from({ length: N }, () => diaDeVida(r, B.founded)).sort((a, b) => a - b);
  const todos = [...dias.map((d) => ({ d, up: false })), ...Array.from({ length: U }, () => ({ d: r.int(1, 14), up: true })).sort((a, b) => a.d - b.d)];
  const filas = [], eventos = []; let n = 0;
  for (let { d, up } of todos) {
    const c = clientes[n++ % clientes.length], it = r.weighted(pesos);
    if (cfg.kind === "party") { d -= (dow(d) - 6 + 7) % 7; if (!up && d > -1) d = -1 - ((dow(-1) - 6 + 7) % 7); }
    const st = up ? r.weighted([["confirmed", 0.7], ["pending", 0.3]]) : (cfg.kind === "visit" ? r.weighted([["done", 0.74], ["noshow", 0.05], ["cancelled", 0.11], ["declined", 0.05], ["expired", 0.05]]) : r.weighted([["done", 0.8], ["cancelled", 0.11], ["declined", 0.05], ["expired", 0.04]]));
    const num = nuevoNum(cfg.prefix);
    const lead = cfg.kind === "party" ? r.int(14, 60) : cfg.kind === "enrollment" ? r.int(2, 20) : r.int(1, 6);
    const sentD = up ? -r.int(1, 4) : d - lead, sentM = r.int(7, 21) * 60 + r.pick([0, 12, 24, 40]);
    const ansD = up ? (st === "pending" ? null : sentD) : sentD, ansM = sentM + r.int(5, 120);
    let mm = r.pick([M(9), M(10), M(11), M(13), M(14), M(15), M(16)]), dur = 60, det = { demo: "r2s2", cat: cfg.cat }, sub = it.price ?? 0, tot = sub, dep = 0, party = 1, pm = "local", ps = null;
    if (cfg.kind === "party") {
      const h = it.attrs?.h ?? 4, extra = r.chance(0.2) ? r.int(1, 2) : 0, g = r.int(30, 220);
      sub = tot = it.price + extra * 9500; mm = r.pick([M(12), M(13), M(14), M(15), M(16)]); dur = Math.min(600, (h + extra) * 60); party = g;
      dep = Math.min(25000, redondea(tot * 0.2, 500));
      det = { ...det, e: r.pick(["cumple", "quince", "bautizo", "boda", "aniversario", "graduacion"]), g, h: h + extra, k: it.kind, u: null, cap: g + 60, inc: it.attrs?.inc ?? [], qty: 1, sms: true, svc: { es: it.es, en: it.en }, mont: !!it.attrs?.mont, unit: it.price, donde: { k: "local", t: lugar("hzl", r).addr } };
    } else if (cfg.kind === "trip") {
      const adults = r.int(1, 4); sub = tot = it.kind === "cotiza" ? redondea(it.price * (1 + r.next() * 0.5), 500) : it.price + (adults > 3 ? 0 : 0); mm = r.pick([M(5), M(6), M(8), M(10), M(13), M(16), M(19)]); party = adults;
      det = { ...det, k: it.kind, to: null, inc: it.attrs?.inc ?? [], run: null, sms: true, svc: { es: it.es, en: it.en }, from: null, kids: 0, unit: it.price, child: null, svcId: 0, terms: { feePct: 50, cancelH: 24 }, adults, pickup: { t: lugar("hzl", r).addr }, bagsIncl: 3, extraBag: 1500, bagsExtra: 0, childSeat: false };
    } else if (cfg.kind === "enrollment") {
      const k = it.kind, fe = cfg.rubro === "fe", ninos = cfg.rubro === "ninos", sem = it.attrs?.sem ?? (k === "curso" ? 10 : null);
      sub = tot = it.price ?? 0; dep = k === "curso" && it.attrs?.dep && it.attrs.dep < sub ? it.attrs.dep : 0; mm = ninos ? M(7) : r.pick([M(9), M(10), M(17), M(18), M(19)]); dur = ninos ? 480 : fe ? 120 : r.pick([60, 90, 120]);
      const dows = k === "semana" ? [1, 2, 3, 4, 5] : k === "mes" ? [1, 2, 3, 4, 5] : [r.pick([2, 3]), r.pick([4, 5])].sort();
      const ends = sem ? fechaDe(d + sem * 7) : k === "clase" ? fechaDe(d) : null;
      det = { ...det, k, g1: false, no: [], for: ninos ? "hijo" : "yo", sms: true, svc: { es: it.es, en: it.en }, cert: null, dows: fe && k === "clase" ? [] : dows, group: { es: `Empieza el ${fechaDe(d)}`, en: `Starts ${fechaDe(d)}` }, level: null, rubro: cfg.rubro, neutro: false, plan_n: it.attrs?.plan_n ?? null, band_id: null, cert_by: null, cuidado: ninos, ends_on: ends, item_id: null, mat_app: dep, oficial: false, group_id: null, mat_cents: dep, start_min: mm, starts_on: fechaDe(d), team_name: null, contract_m: 0, guardian_ok: ninos, price_cents: sub, cancel_fee_cents: 0 };
    } else {
      mm = r.pick([M(10), M(11), M(13), M(15), M(16), M(17)]); sub = tot = 0; dur = null;
      det = { ...det, rubro: cfg.rubro, what: "visita", min: mm, sms: true, item: { es: it.es, en: it.en }, sub: { es: it.des ?? "", en: it.den ?? "" }, ciudad: "Hazleton", at_home: false, solo_zona: false };
    }
    const pagaApp = tot > 0 && cfg.kind !== "visit" && r.chance(0.45) && st === "done";
    if (pagaApp) { pm = "app"; ps = "captured"; } else if (tot === 0) pm = "none";
    const o = { num, kind: cfg.kind, city: B.city, biz: B.id, ph: c.tel, mem: null, st: st === "noshow" ? "done" : st, sd: st === "noshow" ? "noshow" : cfg.kind === "visit" && st === "done" ? "done" : null, d, m: mm, dur, det, sub, dep, tot, pm, ps, sentD, sentM, ansD, ansM, party, ck: null };
    if (st === "pending") { o.ansD = null; o.ansM = null; o.pm = tot === 0 ? "none" : "local"; o.ps = null; }
    if (st === "confirmed") { o.pm = tot === 0 ? "none" : "local"; o.ps = null; }
    if (st === "done" || st === "noshow") { o.doneD = d; o.doneM = mm + (dur ?? 60) + r.int(0, 30); if (o.doneM > 1430) o.doneM = 1430; }
    if (st === "noshow") { o.tot = 0; o.sub = 0; o.dep = 0; o.pm = "none"; o.ps = null; o.doneM = Math.min(1430, mm + 30); }
    if (st === "cancelled") { o.cancD = Math.min(d, Math.max(sentD, d - r.int(0, 3))); o.cancM = r.int(7, 20) * 60; o.cby = r.weighted([["user", 0.7], ["business", 0.25], ["admin", 0.05]]); o.creason = o.cby === "user" ? r.pick(["Cambié de planes", "Ya lo resolví por mi cuenta", "No me da el horario", "Encontré otra fecha"]) : r.pick(["Reprogramamos por clima", "No tenemos cupo ese día"]); o.pm = o.tot === 0 ? "none" : "local"; o.ps = null; o.dep = 0; }
    if (st === "declined") { o.pm = o.tot === 0 ? "none" : "local"; o.ps = null; o.dep = 0; }
    if (st === "expired") { o.ansD = null; o.ansM = null; o.pm = o.tot === 0 ? "none" : "local"; o.ps = null; o.dep = 0; }
    if (!up && o.d > -1) o.d = -1;
    if (o.st === "done" && o.doneD > -1) o.doneD = -1;
    if (o.st !== "done" && !o.sd) { /* nada */ }
    filas.push({ ...o, _it: it, _c: c, _up: up });
    const E = eventos, K = cfg.kind === "visit" ? ["vis_sent", "vis_ok", "vis_done", "vis_noshow", "vis_exp"] : cfg.kind === "enrollment" ? ["insc_sent", "insc_ok", null, null, null] : ["sent", "accepted", null, null, null];
    E.push({ num, kind: K[0], actor: "user", d: sentD, m: sentM });
    if (o.ansD != null && st !== "declined" && st !== "cancelled") E.push({ num, kind: K[1], actor: cfg.kind === "visit" ? "member" : "business", d: o.ansD, m: o.ansM });
    if (st === "declined") E.push({ num, kind: "declined", actor: "business", d: o.ansD ?? sentD, m: ansM });
    if (st === "expired") E.push({ num, kind: cfg.kind === "visit" ? "vis_exp" : "expired", actor: "system", d: Math.min(-1, sentD + 1), m: sentM });
    if (st === "cancelled") E.push({ num, kind: "cancelled", actor: o.cby === "user" ? "user" : o.cby === "admin" ? "admin" : "business", d: o.cancD, m: o.cancM });
    if (o.st === "done" && st === "done") {
      if (cfg.kind === "enrollment") { E.push({ num, kind: "insc_start", actor: "system", d: o.d, m: mm }); E.push({ num, kind: "insc_done", actor: "system", d: o.doneD, m: o.doneM }); }
      else if (cfg.kind === "party") E.push({ num, kind: "done", actor: "system", d: o.doneD, m: o.doneM });
      else if (cfg.kind === "visit") E.push({ num, kind: "vis_done", actor: "member", d: o.doneD, m: o.doneM });
    }
    if (st === "noshow" && cfg.kind === "visit") E.push({ num, kind: "vis_noshow", actor: "member", d: o.d, m: mm + 30 });
  }
  return { filas, eventos, clientes };
}
