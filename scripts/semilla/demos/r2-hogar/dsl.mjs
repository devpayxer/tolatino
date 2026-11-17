/* Ronda 2 · Hogar · constructores compactos de servicios. Cada uno devuelve la misma tupla que usa c/hogar.mjs (SERV):
   [es, en, descripción es, descripción en, forma, precio (centavos), minutos, atributos, opciones].
   Formas = las de lib/oficios.ts (visita, fijo, hora, area, pres, emer, plan). */
export const inc = (...x) => x.map(([e, n]) => ({ es: e, en: n }));
export const FIJO = (es, en, d, dn, p, dur, a = {}, o) => [es, en, d, dn, "fijo", p, dur, a, o];
export const HORA = (es, en, d, dn, p, a = {}) => [es, en, d, dn, "hora", p, 60, { mh: 1, ...a }];
/* u: pie2 | cuarto | salida · p = precio por unidad · min = mínimo del trabajo · days = [a, b] días */
export const AREA = (es, en, d, dn, p, u, min, days, a = {}) => [es, en, d, dn, "area", p, null, { u, min, days: days ?? [1, 2], ...a }];
export const PRES = (es, en, d, dn, lo, hi, days, a = {}) => [es, en, d, dn, "pres", 0, days ? null : 90, { rng: [lo, hi], days, cred: true, ...a }];
export const VIS = (es, en, d, dn, p, a = {}) => [es, en, d, dn, "visita", p, 45, p ? { cred: true, ...a } : { free: true, ...a }];
export const EMER = (es, en, d, dn, p, sur, a = {}) => [es, en, d, dn, "emer", p, 60, { sur, inc: inc(["Salida y primera hora", "Call-out and first hour"]), ...a }];
export const PLAN = (es, en, d, dn, p, fr, a = {}) => [es, en, d, dn, "plan", p, 60, { fr, ...a }];
/* Visita y presupuesto gratis: la que lleva casi toda subcategoría */
export const VIS_LIBRE = () => VIS("Visita y presupuesto", "Visit and estimate", "Vemos el trabajo en tu casa y te damos el precio por escrito. Gratis.", "We see the job at your home and give you the price in writing. Free.", 0);
export const opt = (t, ...o) => ({ t: { es: t[0], en: t[1] }, o: o.map(([e, n, p, m]) => ({ n: { es: e, en: n }, p, m })) });
export const X = (es, en, p, m) => ({ n: { es, en }, p, m });
