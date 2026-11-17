// Mini-lenguaje para escribir el catálogo de Fiestas (ronda 2) sin repetir llaves: «es|en», alternativas con «~», lista con «;».
import { bi } from "../d/comun.mjs";

export const bl = (t) => { const [es, en] = String(t).split("|").map((x) => x.trim()); return bi(es, en || es); };
export const alts = (t) => String(t).split("~").map(bl);
export const incs = (t) => String(t).split(";").map(bl);

/* Una fila del catálogo de una subcategoría.
   R("Sección|Section", "pack", "Nombre|Name~Otro|Other", "descripción|description", precioEnDólares, minutos, {inc, h, cap, mont, u, per, min}, {feat, opt}) */
export function R(sec, kind, names, descr, price, dur, a = {}, f = {}) {
  const attrs = { ...a };
  if (typeof attrs.inc === "string") attrs.inc = incs(attrs.inc);
  if (typeof attrs.u === "string") attrs.u = bl(attrs.u);
  return { sec: bl(sec), kind, alts: alts(names), descr: bl(descr), base: price, dur, attrs, feat: !!f.feat, opt: !!f.opt };
}
/* Fila de visita gratis. */
export const V = (sec, names, descr, f = {}) => R(sec, "visita", names, descr, 0, 30, {}, f);

/* Una subcategoría: id del catálogo, nombres, grupo de textos, secundaria, eventos que atiende, 10 nombres de negocio y su catálogo. */
export function S(id, es, en, g, also, evts, names, rows, extra = {}) {
  if (names.length !== 10) throw new Error(`${id}: ${names.length} nombres, deben ser 10`);
  return { id, es, en, g, also, evts, names, rows, ...extra };
}
