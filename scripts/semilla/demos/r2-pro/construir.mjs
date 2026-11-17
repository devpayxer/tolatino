/* NEG-PRO · ronda 2: arma los 10 negocios de cada subcategoría (2 por ciudad). Reusa los ayudantes de la ronda 1 (grupo B): armado común, historia de citas,
   reseñas con respuesta, novedades y seguidores. Lo propio: nombres, dueños con teléfono de la ronda 2, números de operación reservados, y la forma de cobrar de
   cada tipo (legal o no) como la lee la app (lib/pro-comun.ts, citas-pro.ts, total-escrito.ts). Determinista. */
import { sumaDias, diaN, HOY, APELLIDOS, rngDe, slug } from "../b/comun.mjs";
import { crear, poner, horario, persona, precio } from "../b/negocio.mjs";
import { citasHistoria } from "../b/citas.mjs";
import { resenas, novedades, seguidores, ts } from "../b/historia.mjs";
import { SUBS, tipoDe, LEGAL } from "./subs.mjs";
import { banco, NOV_LEGAL, NOV_NO, faqs, acerca, extrasDe, genero } from "./textos.mjs";

const CAT = "NEG-PRO";
export const DUENO0 = 1800; // +1 484 555 1800 … 2399 (dueños de la ronda 2 de Profesionales)
const bi = (s) => { const [es, en] = s.split(" | "); return { es: es.trim(), en: (en ?? es).trim() }; };
const usd = (c, es = true) => `$${(c / 100).toLocaleString(es ? "en-US" : "en-US", { maximumFractionDigits: 2 })}`;
const hrsMid = (h) => { const m = /^(\d+)(?:[–-](\d+))?$/.exec(h ?? ""); return m ? (m[2] ? (+m[1] + +m[2]) / 2 : +m[1]) : 1; };

const LICL = { abogado: "Abogado con licencia en PA | PA-licensed attorney", notario: "Notario comisionado en PA | PA commissioned notary", ata: "Traductor certificado | Certified translator", cpa: "Contador público (CPA) | Certified Public Accountant",
  ptin: "Preparador con PTIN | Preparer with PTIN", caa: "Agente certificador de ITIN | ITIN Certifying Acceptance Agent", nmls: "Originador con licencia (NMLS) | Licensed loan originator (NMLS)", agente: "Agente de seguros con licencia | Licensed insurance agent", arq: "Arquitecto e ingeniero con licencia en PA | PA licensed architect and engineer" };
const ROLES = {
  fam: ["Abogado · titular | Attorney · principal", "Abogado asociado | Associate attorney", "Asistente legal | Legal assistant"],
  doc: ["Notario público · dueño | Notary public · owner", "Notario público | Notary public", "Asistente de documentos | Document assistant"],
};
ROLES.penal = ROLES.injury = ROLES.law = ROLES.fam;
ROLES.tax = ["Preparador de impuestos · dueño | Tax preparer · owner", "Preparador de impuestos | Tax preparer", "Asistente de oficina | Office assistant"];
ROLES.fin = ["Asesor · dueño | Advisor · owner", "Asesor asociado | Associate advisor", "Asistente administrativo | Administrative assistant"];
ROLES.seg = ["Agente de seguros · dueño | Insurance agent · owner", "Agente de seguros | Insurance agent", "Servicio al cliente | Customer service"];

/* Horarios de la semana (0 = domingo), en minutos. */
const HORAS = {
  of: (r) => [null, [540, 1050], [540, 1050], [540, 1050], [540, 1050], [540, 1050], r.chance(0.3) ? [600, 780] : null],
  fin: (r) => [null, [540, 1020], [540, 1020], [540, 1020], [540, 1140], [540, 960], r.chance(0.3) ? [600, 780] : null],
  tarde: () => [null, [600, 1170], [600, 1170], [600, 1170], [600, 1170], [600, 1170], [600, 900]],
  sab: () => [null, [540, 1020], [540, 1020], [540, 1020], [540, 1020], [540, 1020], [540, 780]],
  taller: () => [null, [510, 1080], [510, 1080], [510, 1080], [510, 1080], [510, 1080], [510, 960]],
  semana7: () => [[600, 1020], [480, 1200], [480, 1200], [480, 1200], [480, 1200], [480, 1200], [480, 1200]],
  h24: () => [[0, 1439], [0, 1439], [0, 1439], [0, 1439], [0, 1439], [0, 1439], [0, 1439]],
  ofic: () => [[600, 1080], null, [600, 1080], [600, 1080], [600, 1080], [540, 1200], [540, 1200]],
};

/* Qué ajustes lleva «Tu herramienta» por tipo (salud-pro-comun.ts PRO_DEF y el resto: 2 días, sin garantía, presupuesto antes). */
function ajustes(tipo, r, legal, cfg) {
  const plan = r.chance(0.55), urg = r.chance(0.3);
  if (legal) return { days: r.pick([3, 5, 7, 10, 14]), warr: 0, est: true, cos: null, cmp: false, plan, urg };
  switch (tipo) {
    case "repair": return { days: r.pick([1, 1, 2, 3]), warr: r.pick([30, 60, 90]), est: true, cos: null, cmp: false, plan: false, urg };
    case "print": return { days: r.pick([1, 2, 3, 5]), warr: 0, est: true, cos: null, cmp: false, plan: false, urg: false };
    case "digital": return { days: r.pick([10, 14, 21, 30]), warr: r.pick([0, 30, 60]), est: true, cos: null, cmp: false, plan, urg: false };
    case "build": return { days: r.pick([14, 21, 30, 45]), warr: 0, est: true, cos: null, cmp: false, plan, urg: false };
    case "biz": return { days: r.pick([3, 5, 7, 10]), warr: 0, est: true, cos: null, cmp: false, plan, urg: false };
    case "seg": return { days: 1, warr: 0, est: false, cos: r.int(cfg.cos[0], cfg.cos[1]), cmp: r.chance(0.7), plan: false, urg: false };
    case "money": return { days: 1, warr: 0, est: false, cos: null, cmp: false, plan: false, urg: false };
    case "ofic": return { days: 2, warr: 0, est: false, cos: null, cmp: false, plan, urg: false };
    default: return { days: r.pick([1, 2, 3]), warr: 0, est: true, cos: null, cmp: false, plan: false, urg }; // svc
  }
}

/* El precio que dice la app en cada forma (pro-comun.ts precioPro). */
function precioPro(it) {
  const E = (a, b) => ({ es: a, en: b });
  if (it.kind === "fijo") return it.gov ? E(`${usd(it.price + it.gov)}${it.attrs.mes ? "/mes" : ""} · HONORARIO ${usd(it.price)} + GOBIERNO ${usd(it.gov)}`, `${usd(it.price + it.gov)}${it.attrs.mes ? "/mo" : ""} · FEE ${usd(it.price)} + GOVERNMENT ${usd(it.gov)}`) : E(`${usd(it.price)}${it.attrs.mes ? "/mes" : ""} · PRECIO FIJO`, `${usd(it.price)}${it.attrs.mes ? "/mo" : ""} · FLAT PRICE`);
  if (it.kind === "cons") return it.price ? E(`${usd(it.price)} · ${it.attrs.cred ? "SE DESCUENTA SI LO CONTRATAS" : "CONSULTA"}`, `${usd(it.price)} · ${it.attrs.cred ? "CREDITED IF YOU HIRE" : "CONSULTATION"}`) : E("Gratis · CONSULTA GRATIS", "Free · FREE CONSULTATION");
  if (it.kind === "hora") return E(`${usd(it.price)}/hora · ESTIMADO ${it.attrs.hrs} H`, `${usd(it.price)}/hour · ESTIMATED ${it.attrs.hrs} H`);
  if (it.kind === "cotiza") return it.price ? E(`Desde ${usd(it.price)} · TOTAL POR ESCRITO EN LA CONSULTA`, `From ${usd(it.price)} · TOTAL IN WRITING AT THE CONSULTATION`) : E("Se cotiza · TOTAL POR ESCRITO EN LA CONSULTA", "Quoted · TOTAL IN WRITING AT THE CONSULTATION");
  return E(it.price ? `${usd(it.price)} · SIN CITA` : "Gratis · SIN CITA", it.price ? `${usd(it.price)} · WALK-IN` : "Free · WALK-IN");
}

/* Nombres: 10 formas con dos apellidos distintos; la subcategoría pone los sustantivos. */
function nombres(cfg) {
  const r = rngDe(`r2pro:nombres:${cfg.n}`), P = r.shuffle(APELLIDOS), [N0, N1, N2] = cfg.N;
  const F = [(a) => `${N0} ${a}`, (a) => `${a} ${N1}`, (a, b) => `${N2} ${a} y ${b}`, (a, b) => `${a} y ${b} ${N1}`, (a) => `${a} ${N0}`, (a) => `${N1} ${a}`, (a) => `${N0} Familia ${a}`,
    (a) => `${a} ${N1} Group`, (a) => `${N2} ${a}`, (a, b) => `${N0} ${a} y ${b}`];
  return F.map((f, k) => f(P[k * 2], P[k * 2 + 1]));
}

export function construir(si, k, ord, ordOps) {
  const cfg = SUBS[si], sub = `NEG-PRO-${String(cfg.n).padStart(2, "0")}`, tipo = tipoDe(cfg.n), legal = LEGAL.includes(tipo);
  const nombre = nombres(cfg)[k];
  const b = crear({ cat: CAT, sub, si, k, ord, nombre });
  const r = b.r;
  b.id = `${slug(`${nombre} ${b.cityNombre}`)}-p${String(cfg.n).padStart(2, "0")}`;
  b.owner = { phone: `+1484555${DUENO0 + ord}`, fn: b.owner.fn, ln: b.owner.ln, ln2: b.owner.ln2, email: `${slug(b.owner.fn)}.${slug(b.owner.ln)}.x${DUENO0 + ord}@demo.example`, f: b.owner.f };
  b.factor = 0.88 + r() * 0.3;
  const anos = 2026 - b.founded;
  b.langs = ["es", "en"];
  b.about = acerca(legal, tipo, { o: b.owner.fn, st: b.calle, y: b.founded, c: b.cityNombre, n: nombre, a: cfg.a, r });
  if (cfg.home) { b.radius = 40; }
  b.subs = [sub];
  poner(b, CAT, sub, 6);
  b.mods = ["svc", "citas", "staff", "nov"];
  horario(b, HORAS[cfg.hr](r));

  /* equipo con licencia */
  const roles = cfg.r ?? ROLES[tipo] ?? ROLES.fin;
  b.members = []; b.lic = [];
  const nM = Math.min(roles.length, r.int(2, 3)), evitar = [b.owner.fn];
  b.members.push({ kind: "owner", name: `${b.owner.fn} ${b.owner.ln}`, role: bi(genero(roles[0], b.owner.f)), langs: ["es", "en"], spec: [], since: b.founded, auto: r.chance(0.5), resp: [15, 30, 60][r.int(0, 2)], dep: 0, bio: bi(`Atiende en español e inglés desde hace ${anos} años. | Serves clients in Spanish and English for ${anos} years.`) });
  for (let j = 1; j < nM; j++) {
    const fm = r.chance(0.5), p = persona(r, fm, evitar); evitar.push(p.fn);
    b.members.push({ kind: "staff", name: p.nombre, role: bi(genero(roles[j], fm)), langs: r.chance(0.5) ? ["es", "en"] : ["es"], spec: [], since: r.int(b.founded, 2024), auto: r.chance(0.4), resp: [15, 30, 60][r.int(0, 2)], dep: 0, bio: bi(`${roles[j].split(" | ")[0]}. Habla español. | ${roles[j].split(" | ")[1]}. Speaks Spanish.`) });
  }
  b.members.forEach((m, i) => { m.takes = i < 2; });
  for (const [kind, m] of cfg.lic) if (m < b.members.length) b.lic.push({ kind, m });

  /* servicios (lo que vende, completo salvo los opcionales) */
  const elegidos = cfg.svc.filter((s) => s.core || r.chance(0.7));
  const usadas = [...new Set(elegidos.map((s) => s.sec))].sort((a, c) => a - c), mapa = new Map(usadas.map((s, n) => [s, n]));
  b.secs = usadas.map((s) => bi(cfg.secs[s]));
  const remDef = ["inm", "doc", "tax", "injury", "penal", "fam", "law", "fin", "digital", "biz", "seg"].includes(tipo);
  b.items = elegidos.map((s, i) => {
    const p = s.k === "pct" || s.p === 0 ? s.p : precio(b, s.p), gov = s.gov ? Math.round(s.gov / 100) * 100 : 0;
    const nm = bi(s.nm), ds = bi(s.ds);
    if (nm.es.length > 60) throw new Error(`nombre largo: ${nm.es}`);
    const rem = s.k === "walk" || s.k === "pct" ? false : (s.rem ?? remDef);
    const attrs = { ...(rem ? { rem: true } : {}), ...(gov ? { gov } : {}), ...(s.cred ? { cred: true } : {}), ...(s.hrs ? { hrs: s.hrs } : {}), ...(s.mes ? { mes: true } : {}), ...(s.k === "pct" ? { unit: s.unit } : {}), ...(s.no ? { no: [bi(s.no)] } : {}) };
    return { sort: i, sec: mapa.get(s.sec), name: nm, descr: ds, price: p, dur: s.d, buf: 0, kind: s.k, attrs, photos: r.chance(0.7) ? [b.photos[(i + 1) % b.photos.length]] : [], who: [], gov };
  });
  b.ps = ajustes(tipo, r, legal, cfg);
  b.pol = { auto: b.members[0].auto, resp: b.members[0].resp, exp: 2, dep: 0, cxh: [2, 4, 12, 24][r.int(0, 3)], tol: 15, pick: true };

  /* filtros de Buscar y amenidades */
  const hay = (kx) => b.items.some((x) => x.kind === kx);
  const fv = ["esp", "presencial"];
  if (hay("fijo")) fv.push("fijo");
  if (hay("hora")) fv.push("hora");
  if (hay("walk")) fv.push("walk");
  if (b.items.some((x) => x.kind === "cons" && !x.price)) fv.push("gratis");
  if (b.items.some((x) => x.attrs.rem)) fv.push("remoto");
  if (b.ps.plan) fv.push("plan");
  if (b.ps.urg) fv.push("urgente");
  if (b.hours[6].open) fv.push("sabado");
  if (b.hours.some((h) => h.open && h.ranges.some((rg) => +rg[1].slice(0, 2) >= 19))) fv.push("noche");
  if (b.founded <= 2016) fv.push("y10");
  b.fv = [...new Set(fv)];
  b.pay = ["local"];
  const am = ["estacionamiento", "accesible"].filter(() => r.chance(0.55));
  if (b.lic.length) am.push("con-licencia");
  if (fv.includes("gratis")) am.push("consulta-gratis");
  if (fv.includes("remoto")) am.push("por-video-o-telefono");
  if (b.ps.plan) am.push("plan-de-pagos");
  b.amenities = [...new Set(am)];
  const consulta = b.items.find((x) => x.kind === "cons" && x.price);
  const dias = b.ps.days;
  const eta = legal ? bi("Consulta con cita en la app | Consultation by appointment in the app")
    : tipo === "seg" ? bi("Cotización en minutos | Quote in minutes") : tipo === "money" ? bi("Sin cita, en minutos | Walk in, done in minutes")
    : bi(dias <= 1 ? "Listo el mismo día | Ready the same day" : `Listo en ${dias} días | Ready in ${dias} days`);
  const fee = consulta ? bi(`Consulta ${usd(consulta.price)}${consulta.attrs.cred ? " · se descuenta si lo contratas" : ""} | Consultation ${usd(consulta.price)}${consulta.attrs.cred ? " · credited if you hire" : ""}`)
    : legal ? bi("Consulta gratis · total por escrito | Free consultation · total in writing") : b.ps.est ? bi("Presupuesto antes de empezar | Estimate first") : tipo === "seg" ? bi("Cotización gratis | Free quote") : bi("Precio claro, sin sorpresas | Clear price, no surprises");
  b.attrs = { m: "shop", ...(b.lic.length ? { lic: [...new Set(b.lic.map((l) => l.kind))], licL: bi(cfg.cant?.[1] ?? LICL[b.lic[0].kind]) } : {}), ...(cfg.cant ? { cant: [bi(cfg.cant[0]).es, bi(cfg.cant[0]).en] } : {}), docs: b.members.length, tarjeta: { eta, fee } };
  b.faqs = faqs(legal, tipo, cfg.cant?.[0]).slice(0, r.int(4, 5));

  /* historia: consultas y su desenlace (el total por escrito) */
  const tam = r.weighted([[1, 3], [2, 4], [3, 3]]);
  const N = { 1: r.int(40, 60), 2: r.int(60, 90), 3: r.int(90, 120) }[tam];
  b.totales = [];
  const reservable = b.items.filter((x) => ["cons", "fijo", "hora", "cotiza"].includes(x.kind));
  const fijos = b.items.filter((x) => (x.kind === "fijo" || x.kind === "hora" || x.kind === "cotiza") && x.price > 0);
  const EXTRAS = extrasDe(tipo);
  const elegir = (bb, rr) => ({ item: rr.weighted(reservable.map((x) => [x, x.kind === "cons" ? 4 : x.kind === "fijo" ? 3 : 1.5])), mi: rr.weighted(b.members.map((m, mi) => [mi, m.takes ? (mi === 0 ? 1.5 : 1) : 0]).filter((z) => z[1] > 0)) });
  const detalle = (bb, item, M, rr) => {
    const modo = item.attrs.rem && rr.chance(0.35) ? rr.pick(["video", "telefono"]) : "oficina";
    const total = item.kind === "cons" ? item.price : 0;
    return { det: { rubro: "pro", legal, svc: item.name, k: item.kind, modo, sms: true, cualquiera: false, precio: precioPro(item), honorario: item.price, gov: item.gov, cred: !!item.attrs.cred, hrs: item.attrs.hrs ?? null }, sub: total, tot: total, dur: Math.max(15, item.dur) };
  };
  const final = (o, rr, ctx) => {
    const item = ctx.item;
    const reciente = diaN(HOY) - diaN(ctx.dia) <= 24;
    if (ctx.futura || o.st === "cancelled" || (o.st === "done" && o.sd === "noshow")) return;
    const cont = item.kind === "cons" ? (fijos.length ? rr.pick(fijos) : null) : item;
    const resultado = !cont || !(cont.price > 0) ? "solo" : rr.weighted([["hired", item.kind === "cons" ? 40 : 82], ["nohire", item.kind === "cons" ? 44 : 10], ["solo", item.kind === "cons" ? 16 : 8]]);
    const fee0 = !cont ? 0 : cont.kind === "cotiza" ? Math.round((cont.price * (0.85 + rr() * 0.4)) / 500) * 500 : cont.kind === "hora" ? Math.round(cont.price * hrsMid(cont.attrs.hrs)) : cont.price;
    const fee = Math.max(500, fee0), gov = cont ? cont.gov : 0, credit = item.kind === "cons" && item.attrs.cred ? Math.min(fee, item.price) : 0;
    const extras = EXTRAS.length && rr.chance(0.3) ? [rr.pick(EXTRAS)] : [];
    const dia1 = sumaDias(ctx.dia, rr.int(0, 2));
    const tot0 = { i: o.i, fee, gov, credit, hours: cont?.attrs.hrs ?? null, extras, note: null, cat: ts(dia1, 720 + rr.int(0, 300)) };
    if (reciente && resultado !== "solo" && o.st === "done" && rr.chance(0.7)) {
      o.st = "confirmed"; o.done = null; o.sd = rr.chance(0.5) ? "quote" : "hired";
      if (o.sd === "quote") b.totales.push({ ...tot0, status: "sent", xok: [], aat: null });
      else { const xo = extras.length && rr.chance(0.6) ? [0] : []; b.totales.push({ ...tot0, status: "accepted", xok: xo, aat: ts(sumaDias(dia1, 1), 900) }); o.tot = fee - credit + xo.reduce((s, i) => s + extras[i].cents, 0); o.sub = o.tot; }
      ctx.hecha && (ctx.hecha.abierta = true);
      return;
    }
    if (reciente && resultado === "solo" && o.st === "done") { o.st = "confirmed"; o.done = null; o.sd = "consulted"; ctx.hecha && (ctx.hecha.abierta = true); return; }
    if (resultado === "hired") {
      const fin = sumaDias(ctx.dia, rr.int(5, 55)), finOk = diaN(fin) < diaN(HOY) ? fin : sumaDias(HOY, -1);
      const xo = extras.length && rr.chance(0.6) ? [0] : [];
      o.done = ts(finOk, rr.int(600, 1000)); o.sd = "done";
      const tot = fee - credit + xo.reduce((s, i) => s + extras[i].cents, 0);
      o.tot = tot; o.sub = tot;
      b.totales.push({ ...tot0, status: "accepted", xok: xo, aat: ts(sumaDias(dia1, 1), 900) });
      ctx.hecha.dia = finOk; ctx.hecha.total = tot; ctx.hecha.hired = true;
    } else if (resultado === "nohire") {
      const venc = rr.chance(0.4);
      const fin = venc ? sumaDias(dia1, 8) : sumaDias(dia1, rr.int(1, 5)), finOk = diaN(fin) < diaN(HOY) ? fin : sumaDias(HOY, -1);
      o.done = ts(finOk, rr.int(600, 1000)); o.sd = "nohire";
      b.totales.push({ ...tot0, status: venc ? "expired" : "declined", xok: [], aat: null });
      ctx.hecha.dia = finOk; ctx.hecha.total = fee - credit + gov; ctx.hecha.hired = false;
    } else { ctx.hecha.hired = false; }
  };
  const { ops, hechas } = citasHistoria(b, r, { N, proximas: r.int(2, 4), hooks: { elegir, detalle, final } });
  b.ops = ops;
  for (const o of ops) o.num = ordOps.next();
  const cerradas = hechas.filter((h) => !h.abierta && h.o.st === "done" && h.o.sd !== "noshow");
  const rv = resenas(b, cerradas, banco(legal, tipo), r, { min: 15, max: 40 });
  b.reviews = rv.reseñas; b.helpful = rv.util;
  b.posts = novedades(b, legal ? NOV_LEGAL : NOV_NO, r, { n: r.int(3, 6) });
  b.follows = seguidores(b, r).slice(0, r.int(15, 80));
  return b;
}

export function todos() {
  const L = [];
  let ord = 0, num = 24000000;
  const ordOps = { next: () => { if (num > 24999999) throw new Error("rango de números agotado"); return num++; } };
  for (let si = 0; si < SUBS.length; si++) for (let k = 0; k < 10; k++) L.push(construir(si, k, ord++, ordOps));
  if (ord > 600) throw new Error("rango de dueños agotado");
  return L;
}
