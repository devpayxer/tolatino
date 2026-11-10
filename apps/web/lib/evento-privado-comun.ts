/* Evento privado (6i): lo que comparten el servidor y las pantallas (sin dinero que decida nada: los montos los calcula la base al
   mandar la propuesta; lo de aquí solo sirve para MOSTRAR mientras se arma). Listas del diseño evp-flow.js (OCC, BUD, horas). */
export type Bi = { es: string; en: string };
export const NUM_EP = /^EP-\d{1,10}$/;

/* ¿Qué celebran? (evp-flow.js OCC) */
export const OCASIONES: [string, string, string][] = [["cumple", "Cumpleaños", "Birthday"], ["bautizo", "Bautizo", "Baptism"], ["familia", "Reunión familiar", "Family gathering"], ["grad", "Graduación", "Graduation"],
  ["despedida", "Despedida", "Farewell"], ["trabajo", "Del trabajo", "Work event"], ["otra", "Otra", "Other"]];
/* Presupuesto por persona (evp-flow.js BUD): solo orienta al restaurante; el precio lo pone su propuesta. */
export const PRESUPUESTOS: [string, string, string][] = [["20", "Hasta $20", "Up to $20"], ["30", "$20–30", "$20–30"], ["45", "$30–45", "$30–45"], ["46", "Más de $45", "Over $45"]];
export const AREAS_EVP: Record<string, Bi> = { salon: { es: "Salón", en: "Dining room" }, terraza: { es: "Terraza", en: "Patio" }, barra: { es: "Barra", en: "Bar" }, todo: { es: "Todo el local", en: "The whole place" } };
/* Horas de inicio (10 AM – 10 PM, cada 30 min) y duración (2, 3, 4, 5 o 6 h). */
export const HORAS_EVP = Array.from({ length: 25 }, (_, i) => 600 + i * 30);
export const DURACIONES = [2, 3, 4, 5, 6];

export type MenuEvp = { k: string; es: string; en: string; des?: string; desEn?: string; cents: number | null };
export type ExtraEvp = { k: string; es: string; en: string; cents: number | null };
export type AjustesEvp = {
  on: boolean; minParty: number; capacity: number; leadDays: number; depositPct: number; areas: string[]; wholeCents: number | null;
  menus: MenuEvp[]; extras: ExtraEvp[]; replyH: number;
};
/* Lo que un restaurante tiene al encender (lo cambia en su panel). */
export const MENUS_FABRICA: MenuEvp[] = [
  { k: "buffet", es: "Buffet criollo", en: "Creole buffet", des: "Arroz, habichuelas, dos carnes, ensalada y tostones.", desEn: "Rice, beans, two meats, salad and tostones.", cents: 2600 },
  { k: "fijo", es: "Menú de 3 tiempos", en: "3-course set menu", des: "Entrada, plato fuerte y postre servidos en la mesa.", desEn: "Starter, main and dessert served at the table.", cents: 3000 },
  { k: "prop", es: "Que me propongan", en: "Let them suggest", des: "Te mandan opciones con precio por persona.", desEn: "They send options with a price per person.", cents: null },
];
export const EXTRAS_FABRICA: ExtraEvp[] = [
  { k: "biz", es: "Traemos el bizcocho", en: "We bring the cake", cents: 0 }, { k: "deco", es: "Decoración", en: "Decorations", cents: 8000 },
  { k: "dj", es: "Música o DJ", en: "Music or DJ", cents: 18000 }, { k: "bebe", es: "Silla para bebé", en: "High chair", cents: 0 },
  { k: "silla", es: "Acceso para silla de ruedas", en: "Wheelchair access", cents: 0 },
];

export const dinero = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
export const horaL = (m: number) => { m = ((Math.round(m) % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`; };
const DOW: [string, string][] = [["domingo", "Sunday"], ["lunes", "Monday"], ["martes", "Tuesday"], ["miércoles", "Wednesday"], ["jueves", "Thursday"], ["viernes", "Friday"], ["sábado", "Saturday"]];
const MES: [string, string][] = [["ene", "Jan"], ["feb", "Feb"], ["mar", "Mar"], ["abr", "Apr"], ["may", "May"], ["jun", "Jun"], ["jul", "Jul"], ["ago", "Aug"], ["sep", "Sep"], ["oct", "Oct"], ["nov", "Nov"], ["dic", "Dec"]];
/* «sábado 21 nov» / «Saturday Nov 21» (la fecha de la ciudad, sin zona del navegador). */
export function diaEvp(ymd: string, es: boolean, corto = false) {
  const d = new Date(`${ymd}T12:00:00Z`), w = DOW[d.getUTCDay()]!, m = MES[d.getUTCMonth()]!, n = d.getUTCDate();
  const wd = corto ? (es ? w[0].slice(0, 3) : w[1].slice(0, 3)) : es ? w[0] : w[1];
  return es ? `${wd} ${n} ${m[0]}` : `${wd} ${m[1]} ${n}`;
}
export const lbl = (L: [string, string, string][], k: string | null | undefined, es: boolean) => { const x = L.find((z) => z[0] === k); return x ? (es ? x[1] : x[2]) : ""; };
export const nm = (b: Bi | null | undefined, es: boolean) => (b ? (es ? b.es : b.en || b.es) : "");

/* Solo para MOSTRAR mientras el restaurante arma su propuesta (la base vuelve a calcular todo al mandarla, con su impuesto y su %). */
export function vistaPrevia(lineas: { q: number; unit: number }[], taxBp: number, depPct: number) {
  const sub = lineas.reduce((n, l) => n + Math.max(0, Math.round(l.q)) * Math.max(0, Math.round(l.unit)), 0);
  const tax = Math.round((sub * taxBp) / 10000), tot = sub + tax, dep = tot ? Math.min(tot, Math.max(100, Math.round((tot * depPct) / 100))) : 0;
  return { sub, tax, tot, dep, resto: tot - dep };
}
