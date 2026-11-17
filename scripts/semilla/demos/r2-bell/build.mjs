/* Ronda 2 · NEG-BELL · arma un negocio de servicios (las 32 subcategorías de servicios que no hizo la ronda 1) con las MISMAS piezas de la ronda 1:
   crear/poner/horario/persona/precio (b/negocio.mjs), historia de citas, reseñas, novedades y seguidores (b/citas.mjs, b/historia.mjs).
   Los bancos de reseñas y novedades de Belleza de la ronda 1 se leen del propio b/bell.mjs (sin editarlo). */
import { readFileSync } from "node:fs";
import { usd, rngDe } from "../b/comun.mjs";
import { crear, poner, horario, persona, precio, bi, rolGenero } from "../b/negocio.mjs";
import { citasHistoria } from "../b/citas.mjs";
import { resenas, novedades, seguidores } from "../b/historia.mjs";
import { SUBS, FAMILIAS, HORAS } from "./subs.mjs";

const CAT = "NEG-BELL";

/* Bancos de la ronda 1 (BANCO) sin importar su módulo: se evalúa el trozo que va de «const STAFF_ROLE» a «function elegirServicios». */
const FUENTE = readFileSync(new URL("../b/bell.mjs", import.meta.url), "utf8");
const trozo = FUENTE.slice(FUENTE.indexOf("const STAFF_ROLE"), FUENTE.indexOf("function elegirServicios"));
const { BANCO } = new Function(`${trozo}\nreturn { BANCO };`)();

const RPOS = ["Gracias por venir y por tus palabras. Te esperamos pronto. | Thanks for coming and for your kind words. See you soon.", "Nos alegra que hayas salido contenta. Aquí te esperamos. | We are glad you left happy. We are here for you.",
  "Gracias por la confianza. Un saludo de todo el equipo. | Thank you for trusting us. Greetings from the whole team.", "Qué bueno saberlo. Cualquier ajuste, escríbenos. | Great to hear. Message us for any adjustment."];

function bancoDe(fam) {
  const F = FAMILIAS[fam];
  return {
    pos: { open: BANCO.pos.open, det: [...F.pos, ...BANCO.pos.det.slice(3, 8).filter((x) => !/quedó|Mis hijos|mis hijos|Hay café/.test(x))], close: BANCO.pos.close },
    mid: { ...BANCO.mid }, neg: { open: BANCO.neg.open, det: [...F.neg, BANCO.neg.det[2]] },
    rPos: RPOS, rMid: BANCO.rMid, rNeg: BANCO.rNeg, answers: BANCO.answers,
  };
}

/* Novedades genéricas con el servicio principal del negocio. */
function bancoNov(cfg, b, core) {
  const s1 = core[0], s2 = core[1] ?? core[0];
  const it = () => b.items.find((x) => x.name.es === s1.es)?.sort ?? b.items.find((x) => !x.extra).sort;
  const nombreRol = cfg.ro.split(" | ");
  return [
    { kind: "novedad", t: "Ya tomamos citas en la app | We now take bookings in the app", b: "Reserva tu hora, elige a quien te atienda y llega sin esperar. | Book your time, pick who serves you and arrive without waiting." },
    { kind: "novedad", t: `Nueva persona en el equipo | A new team member joins`, b: `Ya puedes reservar con ${nombreRol[0].toLowerCase()} nueva desde la página. | You can now book with our new ${nombreRol[1].toLowerCase()} from the page.` },
    { kind: "aviso", t: "Este sábado cerramos temprano | We close early this Saturday", b: "Abrimos de 9 AM a 3 PM por un evento familiar. | We open 9 AM to 3 PM for a family event.", day: "Sábado", hrs: "early", hrsT: "9 AM – 3 PM" },
    { kind: "oferta", t: `${s1.es} con precio especial | ${s1.en} special price`.slice(0, 80), b: "Solo esta semana y con cita. | This week only, by appointment.", off: 0.85, it },
    { kind: "hoy", t: "Turnos libres hoy | Open spots today", b: "Quedan espacios esta tarde. Reserva en la app. | A few spots left this afternoon. Book in the app." },
    { kind: "encuesta", t: "¿Qué horario prefieres? | What hours do you prefer?", b: "", poll: ["Más temprano | Earlier", "Más tarde | Later", "Como está | As it is"] },
    { kind: "novedad", t: "Cumplimos años en {c} | Our anniversary in {c}", b: "Gracias a quienes nos eligen desde {y}. | Thank you to everyone who has chosen us since {y}." },
    { kind: "aviso", t: "Cerramos por el feriado | Closed for the holiday", b: "Volvemos al día siguiente con horario normal. | Back the next day on regular hours.", day: "Feriado", hrs: "closed", hrsT: "" },
    { kind: "novedad", t: `Más sobre ${s2.es.toLowerCase()} | More about ${s2.en.toLowerCase()}`.slice(0, 80), b: `Pregúntanos por ${s2.es.toLowerCase()} en tu próxima cita. | Ask us about ${s2.en.toLowerCase()} at your next visit.` },
    { kind: "novedad", t: "Gracias por sus reseñas | Thank you for your reviews", b: "Leemos cada una y las usamos para mejorar. | We read each one and use them to improve." },
  ];
}

function elegirServicios(r, cfg) {
  const base = cfg.svc.filter((s) => s.core), otros = cfg.svc.filter((s) => !s.core && !s.extra), extras = cfg.svc.filter((s) => s.extra && !s.core);
  const L = [...base, ...otros.filter(() => r.chance(0.78)), ...extras.filter(() => r.chance(0.7))];
  if (L.length < 6) L.push(...otros.filter((s) => !L.includes(s)));
  return cfg.svc.filter((s) => L.includes(s));
}

const sinPlural = (s) => s;

/* cfg = una entrada de SUBS · si = índice de la subcategoría (0–31) · k = 0–9 · idx = número global del negocio (teléfono del dueño) · opBase = primer número de operación local */
export function construir(cfg, si, k, idx) {
  const nombre = cfg.nombres[k];
  const b = crear({ cat: CAT, sub: cfg.sub, si, k, ord: idx, nombre, mujer: rngDe(`r2b:${cfg.sub}:${k}`).chance(cfg.f) });
  const r = b.r;
  b.id = `${b.id}-${cfg.sub.slice(-2)}`; // sufijo propio: ningún otro agente repite este id
  b.factor = 0.88 + r() * 0.34;
  b.langs = r.chance(0.45) ? ["es", "en"] : ["es"];
  const extraSubs = { hair: ["NEG-BELL-05", "NEG-BELL-12"], nails: ["NEG-BELL-14", "NEG-BELL-15", "NEG-BELL-16"], lash: ["NEG-BELL-17", "NEG-BELL-18", "NEG-BELL-19"], skin: ["NEG-BELL-23", "NEG-BELL-21"], masaje: ["NEG-BELL-25", "NEG-BELL-29"], arte: ["NEG-BELL-32", "NEG-BELL-34"], makeup: ["NEG-BELL-12", "NEG-BELL-13"], bienestar: ["NEG-BELL-36"] }[cfg.fam] ?? [];
  b.subs = [...new Set([cfg.sub, ...extraSubs.filter((s) => s !== cfg.sub && r.chance(0.3))])].slice(0, 3);
  const anos = 2026 - b.founded;
  const aboutT = r.pick(cfg.about), f = (t) => t.replace(/\{o\}/g, b.owner.fn).replace(/\{st\}/g, b.calle).replace(/\{y\}/g, b.founded).replace(/\{c\}/g, b.cityNombre).replace(/\{n\}/g, nombre).replace(/\{a\}/g, anos);
  b.about = { es: f(aboutT[0]), en: f(aboutT[1]) };
  poner(b, CAT, cfg.sub, 6);
  b.mods = ["svc", "citas", "staff", "nov"];
  b.svcModel = "emp"; b.rent = null; b.operation = "local";
  if (cfg.dom) b.radius = r.int(8, 15);
  // horario
  const preset = HORAS[r.pick(cfg.horas)];
  const H = preset.map((x) => (x ? x.slice() : null));
  horario(b, H);
  // equipo
  const nPers = r.int(cfg.staff[0], cfg.staff[1]);
  const [rolEs, rolEn] = cfg.ro.split(" | ");
  const evitar = [b.owner.fn];
  b.members = [];
  const wkDe = () => H.map((h) => (h ? [Math.max(8, h[0] / 60 + r.int(0, 1)), Math.min(21, h[1] / 60 - r.int(0, 1))] : null));
  const nsm = () => ({ langs: b.langs.length > 1 || r.chance(0.3) ? ["es", "en"] : ["es"], spec: r.shuffle(cfg.esp).slice(0, 2).map(bi), since: r.int(b.founded, 2024) });
  b.members.push({ kind: "owner", name: `${b.owner.fn} ${b.owner.ln}`, nick: null, role: bi(`${rolEs} · ${b.owner.f ? "dueña" : "dueño"} | ${rolEn} · owner`), seat: null, auto: r.chance(0.5), resp: [15, 30, 60][r.int(0, 2)], dep: 0, ...nsm(), since: b.founded,
    bio: bi(`${rolEs} desde hace ${anos} años. Atiende con cita para no apurarte. | ${rolEn} for ${anos} years. Books by appointment so you are never rushed.`) });
  for (let j = 1; j < nPers; j++) {
    const fem = cfg.f >= 0.7 ? r.chance(0.88) : r.chance(0.5);
    const p = persona(r, fem, evitar); evitar.push(p.fn);
    const wk = r.chance(0.55) ? wkDe() : null;
    b.members.push({ kind: "staff", name: p.nombre, role: bi(`${rolEs} | ${rolEn}`), seat: null, auto: r.chance(0.4), resp: [15, 30, 60][r.int(0, 2)], dep: 0, ...nsm(), wk,
      bio: bi(`${rolEs} con ${r.int(3, 16)} años de oficio. | ${rolEn} with ${r.int(3, 16)} years of experience.`) });
  }
  // servicios y quién los hace
  const sv = elegirServicios(r, cfg);
  const depDueno = r.chance(0.35) && cfg.fam !== "arte" ? [500, 1000, 1500][r.int(0, 2)] : 0;
  b.pol = { auto: b.members[0].auto, resp: b.members[0].resp, exp: 2, dep: depDueno, cxh: [2, 4, 12, 24][r.int(0, 3)], tol: 15, pick: true };
  b.items = sv.map((s, n) => {
    const p = s.p === 0 ? 0 : precio(b, s.p);
    const who = [];
    b.members.forEach((m, mi) => {
      if (s.extra) return;
      if (mi === 0 || r.chance(0.88) || (s.core && r.chance(0.95))) who.push({ m: mi, price: null });
    });
    if (!s.extra && !who.length) who.push({ m: 0, price: null });
    const it = { sort: n, sec: s.sec, name: bi(`${s.es} | ${s.en}`), descr: bi(`${s.de} | ${s.dn}`), price: p, dur: s.extra ? s.d : Math.max(15, s.d), buf: s.buf, from: s.from, extra: s.extra, who, kind: null, attrs: {}, dep: s.dep ? Math.min(s.dep, p) : 0, core: s.core };
    if (s.extra) it.who = [];
    it.photos = r.chance(0.7) && !s.extra ? [b.photos[(n + 1) % b.photos.length]] : [];
    return it;
  });
  const seccs = cfg.secs.split(/, (?=[A-ZÁÉÍÓÚ])/);
  const usadas = [...new Set(b.items.map((x) => x.sec))].sort((a, c) => a - c), mapa = new Map(usadas.map((s, n) => [s, n]));
  b.secs = usadas.map((s) => bi(seccs[s])); b.items.forEach((x) => { x.sec = mapa.get(x.sec); });
  // filtros, atributos y tarjeta
  const minimo = Math.min(...b.items.filter((x) => !x.extra && x.price > 0).map((x) => x.price));
  const fv = ["cita", "online"]; if (cfg.dom) fv.push("domicilio"); if (b.items.some((x) => /niñ|kids|niña|girls/i.test(x.name.es))) fv.push("kids"); if (depDueno || b.items.some((x) => x.dep)) fv.push("deposit");
  b.fv = [...new Set(fv)];
  b.pay = fv.includes("deposit") ? ["local", "app"] : ["local"];
  b.attrs = { m: cfg.dom ? "solo" : "shop", who: cfg.quien, bell: 1, ...(cfg.dom ? { soloCita: 1 } : {}),
    tarjeta: { eta: bi(cfg.dom ? `A domicilio en ${b.cityNombre} y ${b.radius} millas | At your home in ${b.cityNombre} and ${b.radius} miles` : `Con cita en la app | By appointment in the app`), fee: bi(`Desde ${usd(minimo)} | From ${usd(minimo, false)}`) } };
  b.amenities = r.shuffle(["wifi", "cafe", "estacionamiento", "tarjeta", "accesible"]).slice(0, 3);
  b.faqs = cfg.faq.map(([q, a]) => ({ q: bi(q.replace(/\{c\}/g, b.cityNombre)), a: bi(a.replace(/\{c\}/g, b.cityNombre)) }));

  // historia (más liviana que la ronda 1: ~40–120 citas pasadas)
  const N = r.int(40, 120);
  const peso = b.items.filter((x) => !x.extra).map((x) => ({ x, w: x.dur <= 60 ? 3 : 1 }));
  const elegir = (bb, rr) => {
    const item = rr.weighted(peso.map((p) => [p.x, p.w]));
    const poss = item.who.map((w) => w.m);
    return { item, mi: rr.weighted(poss.map((m) => [m, m === 0 ? 1.7 : 1])) };
  };
  const detalle = (bb, item, M, rr) => {
    const cents = item.price;
    const dep = item.dep ? item.dep : (M === b.members[0] && b.pol.dep ? Math.min(b.pol.dep, cents) : 0);
    const kid = /niñ|kids|bebé|baby|niña|girls/i.test(item.name.es);
    return { det: { svc: item.name, opts: [], adds: [], para: kid ? "kid" : "me", nombre: null, edad: kid ? rr.int(3, 12) : null, sms: true, cualquiera: false, base: cents, sel: {} }, sub: cents, tot: cents, dep: Math.min(dep, cents) };
  };
  const { ops, hechas } = citasHistoria(b, r, { N, proximas: r.int(4, 7), hooks: { elegir, detalle } });
  b.ops = ops;
  const rv = resenas(b, hechas, bancoDe(cfg.fam), r, { min: 15, max: 40 });
  b.reviews = rv.reseñas; b.helpful = rv.util;
  const core = b.items.filter((x) => x.core && !x.extra).map((x) => ({ es: x.name.es, en: x.name.en }));
  b.posts = novedades(b, bancoNov(cfg, b, core.length ? core : [{ es: b.items[0].name.es, en: b.items[0].name.en }]), r, { n: r.int(3, 6) });
  b.follows = seguidores(b, r).slice(0, r.int(15, 80));
  b.lic = [];
  void sinPlural; void rolGenero;
  return b;
}

export const TOTAL_SERVICIOS = SUBS.length;
