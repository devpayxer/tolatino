#!/usr/bin/env node
/* Ronda 2 · semilla-2: «llena» los negocios que YA existen en la semilla base (solo Hazleton) de Hogar, Auto, Dealer, Inmueble, Fiestas, Transporte,
   Educación, Niños y Fe, como los demos de la ronda 1: ficha ES/EN, fotos, equipo, preguntas, más catálogo, historia de operaciones, reseñas con respuesta,
   novedades y seguidores. SOLO AGREGA lo que falta (llaves fijas y «on conflict do nothing» / «where not exists»); no toca plan, estado, dueño, nombre ni categoría.
   Uso: node scripts/semilla/demos/r2-semilla-2.mjs [categoría...]  →  infra/pruebas/demos/demo-y-semilla-2.sql   (determinista; solo el sandbox)
   Teléfonos de ficción: clientes +1 717 555 6300–6599. Operaciones: 39000000–39999999 (mismo prefijo por tipo: C cita, D visita, F fiesta, V viaje, I inscripción). */
import fs from "node:fs";
import path from "node:path";
import { negociosBase, especificar, CLIENTES, DE_C, SUBS, subEs, subEn, cabecera, sqlClientes, sqlFicha, sqlCatalogo, sqlOps, sqlEventos, sqlLineasPagos, sqlResenas, sqlPosts, sqlSeguidores, sqlLicencias, pie, RAIZ, Rng, q, BI } from "./r2-semilla-2/base.mjs";
import * as hogar from "./c/hogar.mjs";
import * as auto from "./c/auto.mjs";
import { planOficio, historiaOficio } from "./c/oficios.mjs";
import { planDealer, historiaDealer, CONFIG as CD } from "./c/dealer.mjs";
import { planInm, historiaInm, CONFIG as CI } from "./c/inmueble.mjs";
import { armarResenas, ok3, ok2, okm } from "./c/resenas.mjs";
import { textoReplica } from "./c/textos.mjs";
import { fotosDeSubs, px } from "./c/base.mjs";
import * as G from "./r2-semilla-2/generico.mjs";
import { histGen, armarResenasGen, armarSeguidoresGen } from "./r2-semilla-2/historia.mjs";

const SALIDA = path.join(RAIZ, "infra/pruebas/demos"), ARCHIVO = "demo-y-semilla-2.sql";
const pedidas = process.argv.slice(2);
let seq = 0;
const nuevoNum = (pre) => `${pre}-39${String(++seq).padStart(6, "0")}`;

/* Subcategorías que sí tienen plan de la ronda 1 (las 5 principales) y las que se acercan a una de ellas. */
const CORE = { "NEG-HOGAR": hogar.SUBS.map((s) => s.id), "NEG-AUTO": auto.SUBS.map((s) => s.id), "NEG-DEALER": ["NEG-DEALER-01", "NEG-DEALER-02", "NEG-DEALER-03", "NEG-DEALER-04", "NEG-DEALER-05"], "NEG-INMUEBLE": ["NEG-INMUEBLE-01", "NEG-INMUEBLE-02", "NEG-INMUEBLE-03", "NEG-INMUEBLE-04", "NEG-INMUEBLE-05"] };
const MAPEO_DEALER = { "NEG-DEALER-07": "NEG-DEALER-05", "NEG-DEALER-09": "NEG-DEALER-01", "NEG-DEALER-10": "NEG-DEALER-02", "NEG-DEALER-13": "NEG-DEALER-03", "NEG-DEALER-26": "NEG-DEALER-02", "NEG-DEALER-32": "NEG-DEALER-02", "NEG-DEALER-37": "NEG-DEALER-01" };
const MAPEO_INM = { "NEG-INMUEBLE-07": ["NEG-INMUEBLE-05", "venta"], "NEG-INMUEBLE-11": ["NEG-INMUEBLE-05", "venta"], "NEG-INMUEBLE-33": ["NEG-INMUEBLE-05", "venta"], "NEG-INMUEBLE-14": ["NEG-INMUEBLE-01", "renta"], "NEG-INMUEBLE-16": ["NEG-INMUEBLE-01", "renta"], "NEG-INMUEBLE-18": ["NEG-INMUEBLE-01", "renta"], "NEG-INMUEBLE-19": ["NEG-INMUEBLE-01", "renta"] };
const NINOS_CUIDADO = /guarder|cuidado|preescolar|ni[ñn]era|nana|despu[eé]s de la escuela|campamento|subsidiad/i;

const adaptar = (B, h, nTeam) => {
  const mapa = new Map();
  for (const f of h.filas) {
    const nn = nuevoNum(f.num[0]); mapa.set(f.num, nn); f.num = nn; f.det = { ...f.det, demo: "r2s2" }; f.ph = DE_C[f.ph]?.tel ?? f.ph;
    if (f.mem) { const k = Number(String(f.mem).split(":").pop()); f.mem = `r2s2:m:${B.id}:${k % nTeam}`; }
  }
  for (const e of h.eventos) e.num = mapa.get(e.num);
  h.clientes = h.clientes.map((c) => DE_C[c.tel] ?? c);
  return h;
};
const NOM = Object.fromEntries(CLIENTES.map((c) => [c.tel, c.nombre]));
const ajustaResenas = (B, revs) => {
  const r = new Rng(B.seed + ":adj");
  let out = revs.length > 40 ? r.some(revs, r.int(15, 40)).sort((a, b) => a.cd - b.cd) : revs;
  return out.map((x) => (x.stars <= 3 && !x.reply ? { ...x, reply: textoReplica(x.stars, x.lang, NOM[x.ph] ?? "", r), rd: Math.min(-1, x.cd + r.int(0, 3)), rm: r.int(8, 20) * 60 + r.int(0, 59), rlang: x.lang } : x));
};
/* servicios genéricos para quien no tiene inventario (Dealer o Inmueble de otro tipo) */
function itemsServ(B, r, fotos) {
  const S = subEs(B), E = subEn(B), nm = (a, b) => ({ es: a.length <= 60 ? a : a.slice(0, 60), en: b.length <= 60 ? b : b.slice(0, 60) });
  const dealer = B.cat === "NEG-DEALER";
  const L = [
    { ...nm(`Consulta sobre ${S.toLowerCase()}`, `${E} consultation`), des: "Una conversación sin compromiso para explicarte las opciones y los precios por escrito.", den: "A no-commitment conversation to explain the options and prices in writing.", price: 0, dur: 30 },
    { ...nm(`Cotización de ${S.toLowerCase()}`, `${E} quote`), des: "Te damos el precio por escrito, con lo que incluye y lo que no.", den: "We give you the price in writing, with what is included and what is not.", price: 0, dur: 30 },
    { ...nm(`Servicio de ${S.toLowerCase()}`, `${E} service`), des: "El precio final depende del caso; lo ves por escrito antes de aceptar.", den: "The final price depends on the case; you see it in writing before accepting.", price: dealer ? 9500 : 12500, dur: 60, from: true },
    { es: dealer ? "Visita al local" : "Cita en la oficina", en: dealer ? "Visit the lot" : "Office appointment", des: "Elige una hora libre en la ficha; antes de la visita no se cobra nada.", den: "Pick a free time on our page; nothing is charged before the visit.", price: 0, dur: 30 },
  ];
  return L.map((x, i) => ({ m: "svc", ...x, kind: null, attrs: {}, fotos: [fotos[(i * 3 + B.idx) % fotos.length].startsWith("http") ? fotos[(i * 3 + B.idx) % fotos.length] : px(fotos[(i * 3 + B.idx) % fotos.length])], sort: i }));
}

function procesar(B) {
  const r = new Rng(B.seed + ":r2");
  const cat = B.cat, fam = G.FAM[cat];
  const team = G.equipo(B, r), nTeam = team.length;
  const Bx = { ...B, owner: { tel: "", nombre: team[0].name.split(" ")[0], ap: "", mujer: false }, wa: true, j: 0, calle: "", num: 0, zip: "18201", subx: B.sub };
  const F = { about: null, amenities: G.AMENIDADES[cat], fotos: G.galeria(B, r), team, faqs: G.preguntas(B), licencias: G.LICENCIAS[cat] ?? [] };
  let cat0 = { secciones: [], sueltos: [], objetivo: G.OBJETIVO[cat], todo: false }, h, revs, posts = G.novedades(B, r), contado = 0, claseHist = "";
  const generica = () => G.sobre(B, r);

  if (cat === "NEG-HOGAR" || cat === "NEG-AUTO") {
    const mod = cat === "NEG-HOGAR" ? hogar : auto, core = CORE[cat].includes(B.sub);
    let plan;
    if (core) { plan = planOficio(mod, { ...Bx, sub: B.sub }); F.about = plan.about; F.faqs = plan.faqs; posts = plan.posts; cat0.secciones = plan.secciones; plan.team = [{ name: "x" }, ...team]; }
    else {
      const fotos = fotosDeSubs([B.sub, ...B.subs0], cat), items = G.itemsOficio(B, r, fotos);
      F.about = generica(); cat0.secciones = G.secciones(items, cat); plan = { items, team: [{ name: "x" }, ...team] };
    }
    h = adaptar(B, historiaOficio(mod, { ...Bx, sub: core ? B.sub : CORE[cat][0], seed: B.seed }, plan, { contador: { c: 1 } }), nTeam);
    const hog = cat === "NEG-HOGAR";
    revs = armarResenas("oficio", Bx, h.filas, { src: "cita", terminada: (f) => f.st === "done" && !f.sd && f.kind === "appointment",
      respuestas: (f, s) => (hog ? { first: ok3(s), trato: ok3(s), clean: ok3(s), care: okm(s), who: ok2(s) } : { first: ok3(s), trato: ok3(s), ask: ok2(s), part: ok3(s), carro: okm(s) }),
      hechos: (f) => (hog ? { win: f._late || 0, ok: f.tot, cob: f.tot } : { ok: f.tot, cob: f.tot }) });
  } else if (cat === "NEG-DEALER") {
    const bB = B.sub, sub5 = CORE[cat].includes(bB) ? bB : MAPEO_DEALER[bB];
    if (sub5) {
      const plan = planDealer({ ...Bx, sub: sub5 });
      cat0 = { secciones: plan.secciones, sueltos: plan.sueltos, objetivo: 8, todo: true };
      if (CORE[cat].includes(bB)) { F.about = plan.about; } else F.about = generica();
      F.faqs = plan.faqs; posts = plan.posts; F.licencias = plan.licencias;
      h = adaptar(B, historiaDealer({ ...Bx, sub: sub5 }, plan, { contador: { c: 1 } }), nTeam);
      revs = armarResenas("dealer", Bx, h.filas, CD.resenas());
    } else claseHist = "visita";
  } else if (cat === "NEG-INMUEBLE") {
    const bB = B.sub, directo = CORE[cat].includes(bB), mp = MAPEO_INM[bB];
    if (directo || mp) {
      const sub5 = directo ? bB : mp[0], plan = planInm({ ...Bx, sub: sub5 });
      if (mp) { const keep = plan.props.map((p) => p.deal === mp[1]); plan.props = plan.props.filter((_, i) => keep[i]); plan.sueltos = plan.sueltos.filter((_, i) => keep[i]); }
      cat0 = { secciones: plan.secciones, sueltos: plan.sueltos, objetivo: 8, todo: true };
      F.about = directo ? plan.about : generica(); F.faqs = plan.faqs; posts = plan.posts;
      h = adaptar(B, historiaInm({ ...Bx, sub: sub5 }, plan, { contador: { c: 1 } }), nTeam);
      revs = armarResenas("inm", Bx, h.filas, CI.resenas());
    } else claseHist = "visita";
  } else claseHist = fam;

  if (claseHist) { // historia genérica (Fiestas, Transporte, Educación, Niños, Fe y los de Dealer/Inmueble sin inventario)
    let items, cfg, banco;
    const fotosC = G.fotosPool(B);
    if (cat === "NEG-FIESTA") { items = G.itemsFiesta(B, r, fotosC); cfg = { kind: "party", prefix: "F", nBase: 80, cat }; banco = "fiesta"; }
    else if (cat === "NEG-TRANS") { items = G.itemsTrans(B, r, fotosC); cfg = { kind: "trip", prefix: "V", nBase: 90, cat }; banco = "trans"; }
    else if (cat === "NEG-EDU") { items = G.itemsClases(B, r, fotosC); cfg = { kind: "enrollment", prefix: "I", nBase: 100, cat, rubro: "edu" }; banco = "clases"; }
    else if (cat === "NEG-NINOS") { items = G.itemsClases(B, r, fotosC); cfg = { kind: "enrollment", prefix: "I", nBase: 90, cat, rubro: "ninos" }; banco = "clases"; }
    else if (cat === "NEG-FE") { items = G.itemsClases(B, r, fotosC); cfg = { kind: "enrollment", prefix: "I", nBase: 70, cat, rubro: "fe" }; banco = "clases"; }
    else { items = itemsServ(B, r, fotosC.length ? fotosC : fotosDeSubs([B.sub, ...B.subs0], cat)); cfg = { kind: "visit", prefix: "D", nBase: 60, cat, rubro: cat === "NEG-DEALER" ? "dealer" : "inm" }; banco = "visita"; }
    F.about = generica();
    cat0.secciones = cat === "NEG-DEALER" || cat === "NEG-INMUEBLE" ? [{ es: "Servicios", en: "Services", sort: 20, items }] : G.secciones(items, cat);
    h = histGen(B, cfg, items, nuevoNum);
    revs = armarResenasGen(banco, B, h.filas, (f) => f.st === "done" && (f.kind === "visit" ? f.sd === "done" : !f.sd), (f) => f._it);
  }
  posts = posts.slice(0, r.int(3, 6));
  revs = ajustaResenas(B, revs);
  const segs = armarSeguidoresGen(B, h.clientes);
  // el fraseo de vivienda justa también aplica a lo que escribimos nosotros
  return { F, cat0, h, revs, posts, segs };
}

/* ── Corrida ── */
const lista = especificar(negociosBase()).filter((B) => !pedidas.length || pedidas.includes(B.cat) || pedidas.includes(B.cat.replace("NEG-", "").toLowerCase()));
const out = [cabecera(lista.length), sqlClientes()];
const ops = [], evs = [], revs = [], resumen = {};
const sec = { fichas: [], cat: [], posts: [], segs: [], lic: [] };
for (const B of lista) {
  const x = procesar(B);
  sec.fichas.push(sqlFicha(B, x.F));
  sec.cat.push(sqlCatalogo(B, x.cat0.secciones, x.cat0.sueltos, x.cat0.objetivo, x.cat0.todo));
  const l = sqlLicencias(B, B.cat === "NEG-NINOS" ? (NINOS_CUIDADO.test(subEs(B)) ? ["pa_dhs_childcare"] : []) : B.cat === "NEG-FE" && ["NEG-FE-30", "NEG-FE-31"].includes(B.sub) ? [] : x.F.licencias);
  if (l) sec.lic.push(l);
  ops.push(...x.h.filas); evs.push(...x.h.eventos); revs.push(...x.revs);
  if (x.posts.length) sec.posts.push(sqlPosts(B, x.posts));
  sec.segs.push(sqlSeguidores(B, x.segs));
  const c = (resumen[B.cat] ??= { negocios: 0, ops: 0, resenas: 0, novedades: 0, seguidores: 0, items: 0 });
  c.negocios++; c.ops += x.h.filas.length; c.resenas += x.revs.length; c.novedades += x.posts.length; c.seguidores += x.segs.length;
  c.items += x.cat0.secciones.reduce((n, s) => n + s.items.length, 0) + x.cat0.sueltos.length;
}
out.push(...sec.fichas, ...sec.cat, ...sec.lic);
out.push(sqlOps(ops), sqlEventos(evs), sqlLineasPagos());
out.push(sqlResenas(revs), ...sec.posts, ...sec.segs);
out.push(pie(lista.map((B) => B.id)));
const sql = out.filter(Boolean).join("\n") + "\n";
fs.mkdirSync(SALIDA, { recursive: true });
fs.writeFileSync(path.join(SALIDA, ARCHIVO), sql);
console.error(JSON.stringify({ archivo: ARCHIVO, mb: +(sql.length / 1e6).toFixed(2), negocios: lista.length, operaciones: ops.length, numeros: seq, resumen }, null, 1));
