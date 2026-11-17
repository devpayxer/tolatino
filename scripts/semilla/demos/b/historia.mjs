/* Historia compartida del grupo B: clientes habituales, reseñas verificadas (con respuesta del dueño), novedades y seguidores.
   Cada categoría pone sus bancos de texto («es | en») y sus números; aquí se arma lo común. Todo determinista. */
import { CLIENTES, HOY, diaN, desdeDia, sumaDias, rngDe, hhmm } from "./comun.mjs";

const par = (s) => { const [es, en] = s.split(" | "); return { es: es.trim(), en: (en ?? es).trim() }; };
const llena = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
export const bi = par;

/* Clientes habituales de un negocio: ~96 personas, 60% de su ciudad, con peso decreciente (los primeros vuelven más). */
export function habituales(b, r, n = 96) {
  const mia = CLIENTES.filter((c) => c.city === b.city).map((c) => c.i), otra = CLIENTES.filter((c) => c.city !== b.city).map((c) => c.i);
  const A = r.shuffle(mia), O = r.shuffle(otra), L = [];
  while (L.length < n) { if (r() < 0.62 && A.length) L.push(A.shift()); else if (O.length) L.push(O.shift()); else if (A.length) L.push(A.shift()); else break; }
  const w = L.map((u, k) => ({ u, w: 1 / Math.pow(k + 1, 0.55) }));
  const tot = w.reduce((s, x) => s + x.w, 0);
  return () => { let x = r() * tot; for (const e of w) { if ((x -= e.w) < 0) return e.u; } return w[w.length - 1].u; };
}

/* Fecha local de «hoy» más/menos días, y un instante dentro de un día. */
export const ts = (ymd, min) => `${ymd} ${hhmm(min)}`;

/* Reseñas: una por persona (la base lo exige), cada una pegada a una operación terminada suya. */
export function resenas(b, hechas, banco, r, { min = 20, max = 62, lang = 0.12, respuestaBuena = 0.4 } = {}) {
  const porU = new Map();
  for (const o of hechas) { if (!porU.has(o.u)) porU.set(o.u, []); porU.get(o.u).push(o); }
  const usuarios = r.shuffle([...porU.keys()]);
  const N = Math.min(r.int(min, max), Math.floor(usuarios.length * 0.9));
  const out = [];
  const dueno = b.members[0]?.name?.split(" ")[0] ?? "";
  for (let k = 0; k < N; k++) {
    const u = usuarios[k], o = r.pick(porU.get(u));
    const estrellas = r.weighted([[5, 62], [4, 27], [3, 7], [2, 3.5], [1, 0.5]]);
    const en = r.chance(lang), L = en ? "en" : "es";
    const pers = o.persona ?? "", svc = o.svcTxt ?? { es: "", en: "" };
    const v = { s: svc[L].toLowerCase(), p: pers, c: b.cityNombre, n: b.name };
    const fuente = estrellas >= 4 ? banco.pos : estrellas === 3 ? banco.mid : banco.neg;
    const partes = [r.pick(fuente.open), r.pick(fuente.det)];
    if (estrellas >= 4 && r.chance(0.55)) partes.push(r.pick(banco.pos.close));
    if (estrellas === 3 && r.chance(0.5)) partes.push(r.pick(banco.mid.midClose));
    let body = partes.map((t) => llena(par(t)[L], v)).join(" ").replace(/\s+/g, " ").trim();
    if (body.length < 25) body += L === "es" ? " Lo recomiendo." : " I recommend it.";
    if (body.length > 900) body = body.slice(0, 900);
    const retraso = r.int(0, 9);
    const at = sumaDias(o.dia, retraso) > HOY ? HOY : sumaDias(o.dia, retraso);
    const x = { op: o.i, stars: estrellas, body, lang: L, at: ts(at, Math.min(1380, (o.min ?? 600) + r.int(60, 600))) };
    const responde = estrellas <= 3 || r.chance(respuestaBuena * (diaN(at) > diaN(HOY) - 900 ? 1 : 0.5));
    if (responde) {
      const RB = estrellas >= 4 ? banco.rPos : estrellas === 3 ? banco.rMid : banco.rNeg;
      let rep = llena(par(r.pick(RB))[L], { ...v, o: dueno, u: "" });
      if (rep.length > 290) rep = rep.slice(0, 290);
      const rd = sumaDias(at, r.int(0, 3)) > HOY ? HOY : sumaDias(at, r.int(0, 3));
      x.reply = rep; x.rlang = L; x.rat = ts(rd, r.int(540, 1140));
    }
    if (banco.answers) x.answers = banco.answers(estrellas, r, o);
    if (banco.facts) x.facts = banco.facts(o);
    if (o.rec?.length && estrellas >= 4 && r.chance(0.5)) x.rec = o.rec;
    out.push(x);
  }
  out.sort((a, c) => a.at.localeCompare(c.at));
  // «Útil»: algunas reseñas buenas, con 1–6 votos de otros clientes.
  const util = [];
  for (const x of out) {
    if (x.stars >= 4 && r.chance(0.22)) { const n = r.int(1, 6); const vs = new Set(); for (let j = 0; j < n; j++) vs.add(r.int(0, 249)); for (const u of vs) util.push({ op: x.op, u }); }
  }
  return { reseñas: out, util };
}

/* Novedades: [{kind, es|en title/body}] repartidas en los años; las dos últimas, recientes; las ofertas viejas, ya paradas. */
export function novedades(b, banco, r, { n = 8 } = {}) {
  const pool = r.shuffle(banco);
  const items = [];
  const desde = Math.max(diaN(b.proSince), diaN(HOY) - 1500);
  const fechas = [];
  for (let k = 0; k < n; k++) {
    let d;
    if (k === 0) d = diaN(HOY) - r.int(1, 6); else if (k === 1) d = diaN(HOY) - r.int(8, 24); else if (k === 2) d = diaN(HOY) - r.int(30, 80);
    else d = desde + Math.floor(Math.pow(r(), 0.8) * (diaN(HOY) - 90 - desde));
    fechas.push(d);
  }
  fechas.sort((a, c) => c - a);
  for (let k = 0; k < n && k < pool.length; k++) {
    const p = pool[k], d = desdeDia(fechas[k]), reciente = diaN(HOY) - fechas[k] <= 30;
    const v = { c: b.cityNombre, n: b.name, y: String(b.founded) };
    const t = par(llena(p.t, v)), c = par(llena(p.b ?? "", v));
    let tipo = p.kind ?? "novedad";
    const x = { kind: tipo, title: t.es.slice(0, 60), body: c.es.slice(0, 280), at: ts(d, r.int(540, 1020)), status: "live", pinned: false };
    if (tipo === "oferta") {
      const it = p.it != null ? b.items.find((z) => z.sort === (typeof p.it === "function" ? p.it(b) : p.it)) : null;
      const base = it ?? b.items.filter((z) => !z.extra)[0];
      x.it = base.sort; x.was = base.price; x.now_ = Math.max(100, Math.round((base.price * (p.off ?? 0.8)) / 100) * 100);
      if (x.now_ >= x.was) x.now_ = x.was - 100;
      x.ends = ts(sumaDias(d, r.int(5, 20)), 1200);
      x.status = reciente && diaN(d) + 7 >= diaN(HOY) ? "live" : "stopped";
    }
    if (tipo === "encuesta") { x.poll = p.poll.map((z) => par(z).es); }
    if (tipo === "aviso") { x.aviso = { day: p.day ?? "", hrs: p.hrs ?? "closed", hrsT: p.hrsT ?? "" }; x.status = reciente ? "live" : "live"; }
    items.push(x);
  }
  return items;
}

/* Seguidores: entre 35 y 140 personas del padrón (más de su ciudad). */
export function seguidores(b, r) {
  const n = r.int(35, 140), mia = r.shuffle(CLIENTES.filter((c) => c.city === b.city).map((c) => c.i)), otra = r.shuffle(CLIENTES.filter((c) => c.city !== b.city).map((c) => c.i));
  const S = new Set();
  while (S.size < n) { if (r() < 0.65 && mia.length) S.add(mia.shift()); else if (otra.length) S.add(otra.shift()); else if (mia.length) S.add(mia.shift()); else break; }
  return [...S];
}

export { rngDe };
