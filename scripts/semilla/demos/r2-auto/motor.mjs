/* Auto · ronda 2: arma cada negocio (plan, historia, reseñas) reutilizando los ayudantes de la ronda 1 (c/*.mjs) sin tocarlos.
   Diferencias con la ronda 1: otros teléfonos (dueños +1 484 555 5400–5999, clientes +1 717 555 2700–2999), números de operación 30000000–30999999,
   historia más ligera y fichas por subcategoría (06–40). Todo determinista. */
import { Rng, q, BI, px, fotosDeSubs, ORDEN_CIUDADES, CIUDADES, lugar, slug, dedupe, NOMBRES_H, NOMBRES_M, APELLIDOS, redondea } from "../c/base.mjs";
import { CLIENTES as CLIENTES_R1 } from "../c/nucleo.mjs";
import { textoReplica } from "../c/textos.mjs";
import { planOficio, historiaOficio } from "../c/oficios.mjs";
import { extrasOficio } from "../c/extras.mjs";
import * as auto from "../c/auto.mjs";
import { SERV } from "./serv.mjs";

export const CAT = "NEG-AUTO";
const SIN_GARANTIA = new Set(["NEG-AUTO-23", "NEG-AUTO-24", "NEG-AUTO-34", "NEG-AUTO-35", "NEG-AUTO-36", "NEG-AUTO-39", "NEG-AUTO-40"]);
const STAFF_DEF = [["Técnico", "Technician"], ["Ayudante", "Helper"], ["Atención al cliente", "Customer care"]];

/* ── Clientes de ficción propios: +1 717 555 2700–2999 (mismas ciudades e idiomas que la ronda 1, otros nombres) ── */
const rc = new Rng("clientes-r2-auto");
export const CLIENTES = CLIENTES_R1.map((c, i) => {
  const mujer = rc.chance(0.5);
  return { tel: `+1717555${2700 + i}`, nombre: mujer ? rc.pick(NOMBRES_M) : rc.pick(NOMBRES_H), ap: rc.pick(APELLIDOS), ciudad: c.ciudad, lang: c.lang, mujer };
});
const MAPA_CLI = new Map(CLIENTES_R1.map((c, i) => [c.tel, CLIENTES[i]]));

/* ── Especificaciones: 10 negocios por subcategoría, 2 por ciudad ── */
const CLAVES_CIUDAD = { hzl: /hazleton/i, alw: /allentown|lehigh/i, wbr: /wilkes|wyoming/i, scr: /scranton|lackawanna/i, rdg: /reading|berks/i };
function acomodar(nombres) {
  const slots = Array(10).fill(null), resto = [];
  for (const n of nombres) {
    const c = ORDEN_CIUDADES.find((k) => CLAVES_CIUDAD[k].test(n));
    const i = c == null ? -1 : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].find((x) => ORDEN_CIUDADES[x % 5] === c && slots[x] == null);
    if (i >= 0) slots[i] = n; else resto.push(n);
  }
  return slots.map((s) => s ?? resto.shift());
}
export function especificar(subs, existentes) {
  const usados = new Set(existentes), out = [];
  let k = 0;
  for (const S of subs) {
    const nombres = acomodar(S.nombres);
    nombres.forEach((nom, j) => {
      const r = new Rng(`r2:${CAT}:${S.id}:${j}`);
      const ciudad = ORDEN_CIUDADES[j % 5], L = lugar(ciudad, r);
      const mujer = r.chance(0.28), nombre = mujer ? r.pick(NOMBRES_M.slice(0, 10)) : r.pick(NOMBRES_H.slice(0, 18)), ap = r.pick(APELLIDOS);
      const id = dedupe(usados, slug(nom));
      if (k >= 600) throw new Error("sin teléfonos de dueño");
      out.push({
        cat: CAT, sub: S.id, S, j, idx: 100 + k, id, name: nom, city: ciudad, ...L, founded: r.int(2008, 2018),
        owner: { tel: `+1484555${5400 + k}`, nombre, ap, mujer }, phone: `+1${CIUDADES[ciudad].area}55502${String(r.int(0, 99)).padStart(2, "0")}`,
        size: r.pick([0.55, 0.7, 0.85, 1, 1, 1.1, 1.25, 1.5, 1.9]), wa: r.chance(0.6), seed: `r2:${CAT}:${id}`, extra: null,
      });
      k++;
    });
  }
  return out;
}

/* ── Plan de un negocio ── */
function moduloDe(S) {
  const n = S.resto.length, tomar = Math.max(0, n - 4);
  return {
    CAT, RUBRO: "auto", SERV, MARCAS: auto.MARCAS, CARROS: S.carros ?? auto.CARROS, RENTA: [],
    SUBS: [{ id: S.alias, es: S.es, en: S.en, otras: S.otras, negocios: [] }],
    POR_SUB: { [S.alias]: { base: [...S.base, ...S.resto.slice(0, tomar)], resto: S.resto.slice(tomar), grua: false } },
    TIENDA: { [S.alias]: S.tienda },
    ROLES: { owner: { [S.alias]: S.rol }, staff: { [S.alias]: S.st ?? STAFF_DEF } },
  };
}
function parcharTrade(settings, { h24, sinGarantia }) {
  return settings.map((s) => {
    if (!s.startsWith("insert into trade_settings")) return s;
    const m = s.match(/values \(b, ([^,]+), ([^,]+), ([^,]+), ([^,]+), ([^,]+), (true|false), ([^)]+)\)/);
    const [, rate, wm, wmi, cut, bays, , eta] = m;
    return s.replace(m[0], `values (b, ${rate}, ${sinGarantia ? "null" : wm}, ${sinGarantia ? "null" : wmi}, ${cut}, ${bays}, ${h24}, ${eta})`);
  });
}
export function planR2(B) {
  const S = B.S, mod = moduloDe(S), Bx = { ...B, sub: S.alias };
  const plan = planOficio(mod, Bx);
  const r = new Rng(B.seed + ":r2");
  const sinGar = SIN_GARANTIA.has(S.id), h24 = !!S.h24;
  // subcategorías propias (la principal real + 1–2 afines)
  plan.subs = [S.id, ...r.some(S.otras, r.int(1, 2))];
  // fotos: las de la subcategoría real (el motor eligió con las de la subcategoría alias)
  const fotos = fotosDeSubs(plan.subs, CAT);
  plan.galeria = r.shuffle(fotos).slice(0, Math.min(fotos.length, r.int(6, 8)));
  plan.items.forEach((it, i) => { it.fotos = [px(fotos[(i * 7 + B.idx) % fotos.length])]; });
  plan.tienda.forEach((it, i) => { it.fotos = [px(fotos[(i * 5 + B.idx + 3) % fotos.length])]; });
  // tienda completa (repuestos, gomas, baterías, audio, motos, deshuesadero): todo lo que vende, siempre
  if (S.tiendaFull) {
    plan.secciones = plan.secciones.filter((s) => s.m !== "shop");
    plan.tienda = S.tienda.map((t, i) => ({ m: "shop", es: t[0], en: t[1], des: t[2], den: t[3], price: redondea(t[4] * (0.94 + r.next() * 0.12), t[4] >= 10000 ? 500 : 100), stock: "qty", left: Math.max(2, Math.floor(t[5] * (0.3 + r.next() * 0.7))), par: t[5], fotos: [px(fotos[(i * 5 + B.idx + 3) % fotos.length])], channels: ["pick"], sort: i }));
    plan.secciones.push({ m: "shop", es: "Tienda", en: "Shop", sort: 10, items: plan.tienda });
  }
  if (plan.tienda.length) {
    for (const m of ["shop"]) if (!plan.modulos.includes(m)) plan.modulos.push(m);
    for (const f of ["tienda"]) if (!plan.filtros.includes(f)) plan.filtros.push(f);
    for (const a of ["productos-a-la-venta", "apartado"]) if (!plan.amenities.includes(a)) plan.amenities.push(a);
  }
  // grúas (cobro por llamada): el motor no les arma sección
  const gruas = plan.items.filter((x) => x.kind === "grua");
  if (gruas.length) { plan.secciones.splice(plan.secciones.findIndex((s) => s.m === "shop") < 0 ? plan.secciones.length : plan.secciones.findIndex((s) => s.m === "shop"), 0, { es: "Grúa", en: "Towing", sort: 4, items: gruas }); if (!plan.filtros.includes("grua")) plan.filtros.push("grua"); }
  // 24 horas
  plan.h24 = h24;
  if (h24 && !plan.filtros.includes("h24")) plan.filtros.push("h24");
  plan.settings = parcharTrade(plan.settings, { h24, sinGarantia: sinGar });
  if (sinGar) { plan.filtros = plan.filtros.filter((f) => f !== "garantia"); plan.amenities = plan.amenities.filter((a) => a !== "garantia"); if (plan.attrs.warr) plan.attrs.warr = [null, null]; }
  if (plan.deCasa) plan.amenities = plan.amenities.filter((a) => !["sala-de-espera", "estacionamiento"].includes(a));
  // tarjeta, presentación y preguntas propias de la subcategoría
  const ciudad = CIUDADES[B.city], c = ciudad.nombre, y = B.founded, T = plan.attrs.tarjeta;
  T.offer = BI(S.of[0], S.of[1]);
  if (h24) T.eta = BI(`Atención 24/7 · llega en ~${plan.eta} min`, `24/7 service · arrives in ~${plan.eta} min`);
  if (!plan.items.some((x) => x.kind === "diag")) T.fee = BI("Precio por escrito antes de empezar", "Price in writing before we start");
  const extra = [h24 ? ["Atendemos las 24 horas.", "We are available 24 hours."] : null, plan.tienda.length ? ["Apartas productos desde la app y los recoges en 48 horas.", "Reserve products in the app and pick them up within 48 hours."] : null, sinGar ? ["Precio por escrito antes de empezar.", "Price in writing before we start."] : ["Garantía por escrito.", "Written warranty."]].filter(Boolean);
  plan.about = BI(`${S.t[0]} en ${c} desde ${y}. ${S.n[0]} ${extra.map((e) => e[0]).join(" ")} Hablamos español e inglés.`.replace(/\s+/g, " "), `${S.t[1]} in ${c} since ${y}. ${S.n[1]} ${extra.map((e) => e[1]).join(" ")} We speak Spanish and English.`.replace(/\s+/g, " "));
  plan.faqs = plan.faqs.filter((f, i) => i !== 3 && !(sinGar && i === 1)).concat(S.faq);
  if (S.sinMarcas) delete plan.attrs.mk;
  if (S.veh) plan.attrs.veh = S.veh;
  // novedades: entre 3 y 6
  plan.posts = plan.posts.slice(0, r.int(3, 6));
  return plan;
}

/* ── Historia (más ligera que la ronda 1) y números de operación propios ── */
const mapCli = (c) => MAPA_CLI.get(c.tel);
export function historiaR2(B, plan, ctx) {
  const mod = moduloDe(B.S), Bh = { ...B, sub: B.S.alias, size: 0.3 + 0.25 * B.size };
  const planH = { ...plan, items: plan.items.filter((x) => x.kind !== "grua" && x.kind !== "plan") };
  const h = historiaOficio(mod, Bh, planH, ctx);
  h.clientes = h.clientes.map(mapCli);
  for (const f of h.filas) { f.ph = mapCli({ tel: f.ph }).tel; f._c = mapCli(f._c); }
  const ex = extrasOficio(mod, Bh, plan, h, ctx);
  for (const f of ex.filas) f.ph = f.ph; // ya vienen de h.clientes (mapeados)
  return { h, ex };
}
/* Renumera todo al rango propio: C-/A-/T- + 30000000–30999999 (una cuenta por tipo). */
export function renumerar(filas, eventos, sqls) {
  const cont = { C: 0, A: 0, T: 0 }, mapa = new Map();
  for (const f of filas) { const p = f.num[0]; const nuevo = `${p}-${30000000 + ++cont[p]}`; if (cont[p] > 999999) throw new Error("sin números de operación"); mapa.set(f.num, nuevo); f.num = nuevo; }
  for (const e of eventos) { const n = mapa.get(e.num); if (!n) throw new Error("evento sin operación " + e.num); e.num = n; }
  const sub = (s) => s.replace(/\b([ACT])-3[12]\d{5}\b/g, (m) => { const n = mapa.get(m); if (!n) throw new Error("número sin mapa " + m); return n; });
  return sqls.map(sub);
}

/* Reseñas de 2–3 estrellas: respuesta del dueño siempre */
export function responderSiempre(B, revs, nombre) {
  const r = new Rng(B.seed + ":rep");
  for (const x of revs) if (x.stars <= 3 && !x.reply) { x.reply = textoReplica(x.stars, x.lang, nombre.get(x.ph) ?? "", r); x.rd = Math.min(-1, x.cd + r.int(0, 3)); x.rm = r.int(8, 20) * 60 + r.int(0, 59); x.rlang = x.lang; }
}
