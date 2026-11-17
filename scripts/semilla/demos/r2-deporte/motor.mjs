/* Motor de la ronda 2 de Deporte: copia parametrizada de b/deporte.mjs (que solo exporta sus 5 subcategorías) para las demás.
   Misma historia, mismas tablas y mismas reglas; lo propio de cada subcategoría sale de subs.mjs. */
import { usd, HOY, diaN, desdeDia, sumaDias, dow, diaPesado, hhmm } from "../b/comun.mjs";
import { crear, poner, horario, persona, precio, bi, reiniciarIds, rolGenero } from "../b/negocio.mjs";
import { habituales, resenas, novedades, seguidores, ts } from "../b/historia.mjs";

import { SUBS } from "./subs.mjs";

const CAT = "NEG-DEPORTE";

const BANCO = {
  pos: {
    open: ["Fui a probar y me quedé. | I came to try it and stayed.", "{p} me ayudó a arrancar sin pena. | {p} helped me get started without embarrassment.", "El ambiente es de familia y todos te saludan. | The atmosphere is family-like and everyone greets you.", "Llevo años viniendo y no pienso cambiarme. | I have been coming for years and do not plan to switch.",
      "Un lugar limpio, bien cuidado y con buen trato. | A clean, well-kept place with good service.", "Desde que empecé me siento con más energía. | Since I started I feel more energetic.", "Se nota que aquí les importa la gente. | You can tell they care about people here."],
    det: ["Me explicaron el precio antes de pagar y no hubo sorpresas. | They explained the price before I paid and there were no surprises.", "El horario me sirve antes y después del trabajo. | The hours work before and after work.", "Reservé mi lugar en la app en un minuto. | I booked my spot in the app in a minute.",
      "Todo está limpio y en buen estado. | Everything is clean and in good shape.", "Hablan español y eso me dio confianza desde el primer día. | They speak Spanish and that gave me confidence from day one.", "Pude cambiar mi reserva sin vueltas. | I could change my booking with no hassle.", "Es fácil llegar y hay dónde estacionar. | It is easy to get here and there is parking."],
    close: ["Se lo recomiendo a toda mi familia. | I recommend it to my whole family.", "Cinco estrellas. | Five stars.", "Ya llevé a dos amigos. | I already brought two friends.", "Vale cada dólar. | Worth every dollar."],
  },
  mid: {
    open: ["Buen lugar, pero se llena mucho en las horas pico. | Good place, but it gets crowded at peak hours.", "Me gusta; el precio me pareció algo alto. | I like it; the price felt a bit high."],
    det: ["Con más espacio sería perfecto. | With more room it would be perfect.", "El estacionamiento es difícil. | Parking is difficult."],
    midClose: ["Aun así sigo viniendo. | I still keep coming.", "Espero que amplíen el horario. | I hope they extend the hours."],
  },
  neg: {
    open: ["Tuve problemas para cambiar mi reserva. | I had trouble changing my booking.", "Empezaron tarde varias veces. | They started late several times."],
    det: ["No me explicaron bien el cobro. | They did not explain the charge well.", "Nadie me avisó del cambio de horario. | Nobody told me about the schedule change.", "Esperaba más limpieza. | I expected it to be cleaner."],
  },
  rPos: ["Gracias por visitarnos. ¡Nos vemos pronto! | Thanks for visiting us. See you soon!", "Nos alegra tenerte aquí. Gracias por tu reseña. | We are glad to have you here. Thanks for your review.", "Gracias por tus palabras; las compartimos con todo el equipo. | Thank you for your words; we share them with the whole team."],
  rMid: ["Gracias por tu opinión. Estamos revisando cómo manejar las horas pico. | Thanks for your feedback. We are reviewing peak hours."],
  rNeg: ["Lamentamos la experiencia. Escríbenos y lo resolvemos contigo. | We are sorry about the experience. Message us and we will fix it with you.", "Tienes razón; ya cambiamos cómo avisamos los cambios de horario. | You are right; we changed how we announce schedule changes.", "Gracias por avisarnos. Revisamos el equipo y los vestidores esta semana. | Thank you for telling us. We checked the equipment and locker rooms this week."],
  answers: (est, r) => ({ totalOk: est >= 3 ? 1 : 0, horarioOk: est >= 3 ? 1 : 0, trato: est >= 4 ? 1 : est === 3 ? 0 : -1, salirOk: est >= 3 ? 1 : 0, entrenan: est >= 4 ? 1 : est === 3 ? 0 : -1, limpioEq: est >= 3 ? 1 : 0 }),
  facts: (o) => ({ dia: o.dia, tot: o.tot ?? 0, certDado: false }),
};
const nov = (cfg) => [...NOV.filter((n) => cfg.gym || !/máquinas|niños/.test(n.t)), ...(cfg.nov ?? [])];
const NOV = [
  { kind: "novedad", t: "Inscríbete desde la app | Sign up from the app", b: "Elige lo que quieres y reserva tu lugar en un minuto. | Choose what you want and save your spot in a minute." },
  { kind: "novedad", t: "Primera visita sin compromiso | First visit, no commitment", b: "Ven a probar sin compromiso. Pregunta por la primera visita. | Come try with no commitment. Ask about the first visit." },
  { kind: "aviso", t: "Cambio de horario por feriado | Holiday schedule change", b: "Abrimos con horario reducido el día feriado. | We open on reduced hours on the holiday.", day: "Feriado", hrs: "early", hrsT: "8 AM – 2 PM" },
  { kind: "oferta", t: "Oferta de la temporada | Season offer", b: "Para los que se inscriban esta semana. | For those who sign up this week.", off: 0.85, it: (b) => b.items.find((x) => x.kind === "mes")?.sort ?? 0 },
  { kind: "novedad", t: "Nuevas máquinas y pesas | New machines and weights", b: "Ampliamos la zona de pesas libres para que no esperes. | We expanded the free weights area so you do not wait." },
  { kind: "hoy", t: "Quedan lugares para hoy | Spots left for today", b: "Reserva en la app antes de que se llene. | Book in the app before it fills." },
  { kind: "encuesta", t: "¿Qué clase quieres que agreguemos? | Which class should we add?", b: "", poll: ["Más temprano | Earlier", "En la noche | In the evening", "Fin de semana | Weekend"] },
  { kind: "novedad", t: "Cuidado de niños mientras entrenas | Childcare while you train", b: "En horarios seleccionados. Pregunta en el mostrador. | At selected hours. Ask at the front desk." },
  { kind: "novedad", t: "Cumplimos años en {c} | Our anniversary in {c}", b: "Gracias a quienes entrenan con nosotros desde {y}. | Thank you to those who have trained with us since {y}." },
  { kind: "aviso", t: "Mantenimiento de equipos | Equipment maintenance", b: "Un día de ajustes; las reservas siguen. | One day of adjustments; bookings continue.", day: "Un día", hrs: "early", hrsT: "Horario normal" },
];

const DIAS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"], DIAS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hora12 = (m, es) => { const h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? "PM" : "AM", h12 = h % 12 || 12; return `${h12}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${ap}`; };
const etiqueta = (dows, min) => ({ es: `${dows.length === 1 ? DIAS_ES[dows[0]] : dows.slice(0, -1).map((d) => DIAS_ES[d]).join(", ") + " y " + DIAS_ES[dows[dows.length - 1]]} · ${hora12(min)}`, en: `${dows.map((d) => DIAS_EN[d]).join(", ")} · ${hora12(min)}` });

function bancoDe(cfg) {
  const B = JSON.parse(JSON.stringify(BANCO));
  B.pos.open = cfg.pos ? [...cfg.pos, ...cfg.pos, ...BANCO.pos.open.slice(0, 3)] : BANCO.pos.open;
  B.pos.det = cfg.det ? [...cfg.det, ...cfg.det, ...BANCO.pos.det.slice(0, 3)] : BANCO.pos.det;
  B.mid.open = cfg.mid ? [...cfg.mid, BANCO.mid.open[0]] : BANCO.mid.open;
  B.neg.open = cfg.neg ? [...cfg.neg, BANCO.neg.open[0]] : BANCO.neg.open;
  B.answers = BANCO.answers; B.facts = BANCO.facts;
  return B;
}

export function construir(si, k, ord) {
  const cfg = SUBS[si], nombre = cfg.nombres[k];
  const b = crear({ cat: CAT, sub: cfg.sub, si, k, ord, nombre, mujer: cfg.mujer ? true : undefined });
  const r = b.r;
  b.factor = 0.85 + r() * 0.35;
  const anos = 2026 - b.founded;
  b.langs = ["es", "en"]; if (r.chance(0.4)) b.langs = ["es"];
  b.subs = [cfg.sub, ...(cfg.rel ?? []).filter(() => r.chance(0.4))];
  const aboutT = r.pick(cfg.about), f = (t) => t.replace(/\{o\}/g, b.owner.fn).replace(/\{st\}/g, b.calle).replace(/\{y\}/g, b.founded).replace(/\{c\}/g, b.cityNombre).replace(/\{n\}/g, nombre).replace(/\{a\}/g, anos);
  b.about = { es: f(aboutT[0]), en: f(aboutT[1]) };
  poner(b, CAT, cfg.sub, 6);
  b.mods = ["svc", "staff", "nov"];
  horario(b, cfg.horas(r));
  // equipo: entrenadores
  b.members = [];
  const evitar = [b.owner.fn], nM = cfg.solo ? 1 : r.int(2, 4);
  b.members.push({ kind: "owner", name: `${b.owner.fn} ${b.owner.ln}`, role: bi(rolGenero(cfg.rolDueno, b.owner.f)), langs: b.langs, since: b.founded, auto: false, resp: 30, dep: 0, spec: [], bio: bi(`Trabaja con la comunidad desde ${b.founded}. | Has worked with the community since ${b.founded}.`) });
  for (let j = 1; j < nM; j++) { const fm = cfg.mujer ? true : r.chance(0.45), p = persona(r, fm, evitar); evitar.push(p.fn); b.members.push({ kind: "staff", name: p.nombre, role: bi(rolGenero(cfg.rolEquipo, fm)), langs: ["es", "en"], since: r.int(b.founded, 2024), auto: false, resp: 30, dep: 0, spec: [], bio: bi(`Con ${r.int(3, 15)} años de experiencia. | With ${r.int(3, 15)} years of experience.`) }); }
  b.members.forEach((m) => { m.takes = false; });
  // servicios
  const elegidos = cfg.items.filter((x) => x.core || r.chance(0.5));
  b.secs = [bi(cfg.sec)];
  b.items = elegidos.map((x, i) => {
    const attrs = { ...(x.g1 ? { g1: true } : {}), ...(x.inc ? { inc: x.inc.map(bi) } : {}), ...(x.sem ? { sem: x.sem } : {}), ...(x.dep ? { dep: precio(b, x.dep) } : {}) };
    const price = precio(b, x.p), dep = x.dep ? Math.min(Math.round(precio(b, x.dep) / 100) * 100, price - 100) : 0;
    return { sort: i, sec: 0, name: bi(`${x.es} | ${x.en}`), descr: bi(`${x.de} | ${x.dn}`), price, dur: x.d, buf: 0, kind: x.k, attrs: x.dep ? { ...attrs, dep } : attrs, dep, photos: r.chance(0.7) ? [b.photos[(i + 1) % b.photos.length]] : [], who: [], cfg: x };
  });
  // herramienta
  const mes = b.items.find((x) => x.kind === "mes");
  const contrato = cfg.contrato === false || !b.items.some((x) => x.kind === "mes") ? 0 : r.weighted([[0, 6], [6, 2], [12, 2]]);
  b.insc = { esp: b.langs.includes("es"), contrato, salir: contrato ? [0, 5000, 10000, 15000][r.int(0, 3)] : 0, insc: contrato ? [0, 1000, 2500][r.int(0, 2)] : 0, guard: cfg.guard && r.chance(0.5), reply: 24 };
  // grupos
  b.groups = [];
  const hoyDia = HOY, dowHoy = dow(HOY);
  const lunes = sumaDias(HOY, ((1 - dowHoy + 7) % 7) || 7);
  b.items.forEach((x) => {
    if (x.kind === "mes") { b.groups.push({ item: x.sort, label: bi("Empieza hoy | Start today"), starts: hoyDia, ends: null, dows: [], min: null, dur: null, seats: r.int(10, 30), outside: r.int(0, 6), booked: 0, status: "open" }, { item: x.sort, label: bi("Empieza el lunes | Start Monday"), starts: lunes, ends: null, dows: [1], min: null, dur: null, seats: r.int(8, 20), outside: 0, booked: 0, status: "open" }); }
    if ((x.kind === "hora" || x.kind === "clase") && x.cfg.slots) for (const [ds, min] of x.cfg.slots) b.groups.push({ item: x.sort, label: bi(`${etiqueta(ds, min).es} | ${etiqueta(ds, min).en}`), starts: sumaDias(HOY, -r.int(30, 900)), ends: null, dows: ds, min, dur: x.dur, seats: x.kind === "hora" ? r.int(1, 3) : r.int(12, 30), outside: 0, booked: 0, status: "started" });
  });
  // temporadas (cursos): una terminada por trimestre desde que existe el negocio + la próxima abierta
  const curso = b.items.find((x) => x.kind === "curso");
  const temporadas = [];
  if (curso) {
    const [ds, min] = curso.cfg.slots[0], semanas = curso.cfg.sem;
    let ini = sumaDias(`${Math.max(b.founded + 1, 2017)}-01-0${r.int(5, 9)}`, 0);
    while (diaN(ini) + semanas * 7 < diaN(HOY) - 14) {
      const fin = sumaDias(ini, semanas * 7);
      temporadas.push({ ini, fin });
      ini = sumaDias(ini, r.pick([112, 126, 140, 154]));
    }
    for (const t of temporadas) { t.g = { label: `Temporada ${t.ini.slice(0, 7)}`, starts: t.ini }; }
    const proxIni = sumaDias(HOY, r.int(9, 24));
    b.groups.push({ item: curso.sort, label: bi(`Empieza el ${proxIni.slice(8)}/${proxIni.slice(5, 7)} · ${hora12(min)} | Starts ${proxIni.slice(5, 7)}/${proxIni.slice(8)} · ${hora12(min)}`), starts: proxIni, ends: sumaDias(proxIni, semanas * 7), dows: ds, min, dur: curso.dur, seats: 0, outside: 0, booked: 0, status: "open", abierta: true });
  }
  // filtros y atributos
  const fv = ["esp"]; if (b.insc.contrato === 0 && mes) fv.push("sincontrato"); if (b.insc.guard) fv.push("guarderia"); if (b.items.some((x) => x.attrs.g1)) fv.push("gratis1");
  if (mes) fv.push("membresia"); if (b.items.some((x) => x.kind === "clase")) fv.push("visita"); if (curso) fv.push("ligas");
  if (cfg.lugar !== "aire") fv.push("techado"); if (cfg.lugar !== "techado") fv.push("aire"); if (cfg.h24) fv.push("24h"); if (b.founded <= 2016) fv.push("y10");
  b.fv = [...new Set(fv.filter((x) => x !== "ligas"))];
  b.pay = ["local"];
  b.amenities = r.shuffle(cfg.amen ?? ["estacionamiento", "wi-fi", "duchas", "accesible", "acepta-tarjeta", "para-ninos"]).slice(0, 4).concat(cfg.h24 ? ["24-7"] : []);
  b.attrs = { m: "shop", tarjeta: { eta: bi(contrato ? `Contrato de ${contrato} meses · cancelar antes ${b.insc.salir ? `cuesta ${usd(b.insc.salir)}` : "no cuesta"} | ${contrato}-month contract · early cancellation ${b.insc.salir ? `costs ${usd(b.insc.salir, false)}` : "is free"}` : mes ? "Sin contrato · cancela cuando quieras | No contract · cancel any time" : "Sin compromiso · reservas y pagas en el lugar | No commitment · you book and pay on site"),
    fee: mes ? bi(`${usd(mes.price)} al mes · ${b.insc.insc ? `inscripción ${usd(b.insc.insc)}` : "sin cuota de inscripción"} | ${usd(mes.price, false)} a month · ${b.insc.insc ? `signup ${usd(b.insc.insc, false)}` : "no signup fee"}`) : bi(`Desde ${usd(Math.min(...b.items.map((x) => x.price)))} | From ${usd(Math.min(...b.items.map((x) => x.price)), false)}`) } };
  b.faqs = cfg.faqs.map(([q, a]) => ({ q: bi(q), a: bi(a) }));

  // historia: inscripciones
  const tam = r.weighted([[1, 3], [2, 4], [3, 3]]);
  const N = { 1: r.int(40, 60), 2: r.int(65, 90), 3: r.int(95, 120) }[tam];
  const quien = habituales(b, r, 110);
  const ini0 = b.proSince > "2016-11-20" ? b.proSince : "2016-11-20", ayer = sumaDias(HOY, -1);
  const ops = [], hechas = [];
  const pesoK = { mes: 4, clase: 3, hora: cfg.pesoHora ?? 2, curso: 1.2 };
  let i = 0;
  const base = (x, o) => ({ rubro: "dep", k: x.kind, svc: x.name, group: null, starts_on: null, ends_on: null, start_min: null, dows: [], for: "yo", guardian_ok: false, level: null, team_name: null, price_cents: 0, mat_cents: x.kind === "curso" ? x.dep : 0, mat_app: 0, plan_n: 0, cert: null, cert_by: null, oficial: false, no: null, contract_m: x.kind === "mes" ? b.insc.contrato : 0, cancel_fee_cents: x.kind === "mes" ? b.insc.salir : 0, g1: false, sms: true, neutro: false, cuidado: false, ...o });
  const escala = (dia, p) => Math.max(500, Math.round((p * (0.72 + 0.28 * Math.min(1, (diaN(dia) - diaN("2016-11-01")) / 3650))) / 100) * 100); // los precios de antes eran menores
  const cursoOps = new Map();
  for (let n = 0; n < N + 6; n++) {
    const fut = n >= N;
    const x = r.weighted(b.items.map((z) => [z, pesoK[z.kind] ?? 1]));
    const u = quien();
    const dia = fut ? sumaDias(HOY, r.int(1, 12)) : diaPesado(r, ini0, ayer, 2.0);
    const min = x.kind === "mes" ? 480 : (b.groups.find((g) => g.item === x.sort && g.min != null)?.min ?? r.pick([420, 480, 1080, 1110, 1140]));
    const o = { i, kind: "enrollment", u, m: null, it: x.sort, pax: 1, buf: 0, sub: 0, tot: 0, dep: 0, pay: "none" };
    const price = escala(dia, x.price);
    o.sub = price; o.tot = price; o.pay = price > 0 ? "local" : "none";
    const lead = r.int(60, 60 * 24 * 12), resp = r.int(5, 600);
    const base0 = diaN(dia) - Math.ceil(lead / 1440);
    const sent = desdeDia(Math.max(base0, diaN(ini0) - 1));
    o.sent = ts(sent, r.int(480, 1200)); o.ans = ts(sent, Math.min(1439, 480 + resp));
    if (x.kind === "curso" && temporadas.length && !fut) {
      const t = r.pick(temporadas);
      const d0 = t.ini, idx = temporadas.indexOf(t);
      o.loc = ts(d0, x.cfg.slots[0][1]); o.det = base(x, { group: bi(`Temporada ${d0.slice(0, 7)} | Season ${d0.slice(0, 7)}`), starts_on: d0, ends_on: t.fin, start_min: x.cfg.slots[0][1], dows: x.cfg.slots[0][0], price_cents: price, mat_app: x.dep });
      o.g = { label: `Temporada ${d0.slice(0, 7)}`, starts: d0 };
      o.sent = ts(sumaDias(d0, -r.int(3, 20)), 700); o.ans = ts(sumaDias(d0, -r.int(1, 2)), 900);
      if (sumaDias(d0, -3) < ini0) { continue; }
      cursoOps.set(`${d0}`, (cursoOps.get(`${d0}`) ?? 0) + 1);
      if (x.dep) { o.dep = escala(dia, x.dep); o.pay = "app"; o.ps = "captured"; o.det.mat_app = o.dep; o.det.mat_cents = o.dep; }
      const cx = r.chance(0.07);
      if (cx) { o.st = "cancelled"; o.cb = "user"; o.cr = "baja"; o.canc = ts(sumaDias(d0, -r.int(1, 2)), 1000); o.dep = 0; o.pay = "local"; delete o.ps; cursoOps.set(`${d0}`, cursoOps.get(`${d0}`) - 1); }
      else { o.st = "done"; o.sd = "done"; o.done = ts(t.fin, 1200); hechas.push({ i, u, dia: t.fin, min: 1200, persona: b.members[0].name.split(" ")[0], svcTxt: x.name, rec: [x.sort], tot: o.dep }); }
    } else if (x.kind === "curso") { n--; continue; }
    else if (x.kind === "mes") {
      const meses = r.weighted([[1, 20], [2, 14], [3, 14], [6, 18], [12, 18], [24, 10], [36, 6]]);
      const fin = sumaDias(dia, Math.round(meses * 30.4));
      const g1 = x.attrs.g1 && r.chance(0.3);
      o.det = base(x, { starts_on: dia, price_cents: price, g1: !!g1 });
      o.loc = ts(dia, 480);
      if (fut) { o.det.starts_on = dia; delete o.loc; o.rel = diaN(dia) - diaN(HOY); o.tm = "08:00"; o.st = "confirmed"; o.sd = null; o.sago = r.int(60, 3000); o.ansm = r.int(10, 400); delete o.sent; delete o.ans; }
      else if (diaN(fin) >= diaN(HOY)) { o.st = "confirmed"; o.sd = "started"; }
      else if (r.chance(0.18)) { o.st = "cancelled"; o.cb = "user"; o.cr = "baja"; o.canc = ts(sumaDias(dia, Math.round(meses * 30.4 * 0.6) + 1), 1000); }
      else { o.st = "done"; o.sd = "done"; o.done = ts(fin, 1100); hechas.push({ i, u, dia: fin, min: 1100, persona: b.members[0].name.split(" ")[0], svcTxt: x.name, rec: [x.sort], tot: 0 }); }
    } else {
      // pase de un día o hora con entrenador
      o.det = base(x, { starts_on: dia, start_min: min, price_cents: price });
      if (fut) { o.rel = diaN(dia) - diaN(HOY); o.tm = hhmm(min); o.st = "confirmed"; o.sd = null; o.sago = r.int(60, 3000); o.ansm = r.int(10, 400); delete o.sent; delete o.ans; }
      else { o.loc = ts(dia, min); const q = r.chance(0.05); if (q) { o.st = "cancelled"; o.cb = "user"; o.cr = "baja"; o.canc = ts(sumaDias(dia, -1), 1000); } else { o.st = "done"; o.sd = "done"; o.done = ts(dia, Math.min(1439, min + x.dur)); hechas.push({ i, u, dia, min, persona: b.members[r.int(0, b.members.length - 1)].name.split(" ")[0], svcTxt: x.name, rec: [x.sort], tot: 0 }); } }
    }
    if (o.dep) o.det.mat_app = o.dep;
    ops.push(o); i++;
  }
  // los cupos de las temporadas: terminadas llenas; la abierta con lugares libres
  if (curso) {
    for (const t of temporadas) { const n = cursoOps.get(t.ini) ?? 0; if (!n) continue; b.groups.push({ item: curso.sort, label: bi(`Temporada ${t.ini.slice(0, 7)} | Season ${t.ini.slice(0, 7)}`), starts: t.ini, ends: t.fin, dows: curso.cfg.slots[0][0], min: curso.cfg.slots[0][1], dur: curso.dur, seats: Math.max(n, 10), outside: Math.max(0, Math.max(n, 10) - n), booked: n, status: "finished" }); }
    const ab = b.groups.find((g) => g.abierta); if (ab) { ab.seats = r.int(14, 28); ab.outside = r.int(4, 9); ab.booked = 0; delete ab.abierta; }
  }
  b.ops = ops;
  const rv = resenas(b, hechas, bancoDe(cfg), r, { min: 15, max: 40 });
  b.reviews = rv.reseñas; b.helpful = rv.util;
  b.posts = novedades(b, nov(cfg), r, { n: r.int(3, 6) });
  b.follows = seguidores(b, r).slice(0, r.int(15, 80));
  b.lic = [];
  return b;
}

export function todos(inicio = 0) {
  reiniciarIds();
  const L = [];
  for (let si = 0; si < SUBS.length; si++) for (let k = 0; k < 10; k++) L.push(construir(si, k, inicio + si * 10 + k));
  return L;
}
