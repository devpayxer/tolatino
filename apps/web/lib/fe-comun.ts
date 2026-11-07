/* Iglesias y Religión (Fase 4 · 4ia · fase4-iglesias-inmuebles-autos.md §1c, §2, §4ia y §5). Tipos y textos que también usa el
   navegador (sin consultas). Tipos por subcategoría (neg-fe-kind.js KS L11–20; el prototipo recorre las subcategorías en su orden):
   misa · culto → «Horarios y ayuda» (MISA EN ESPAÑOL / TUS CULTOS DE LA SEMANA); ayuda → «La ayuda de hoy»; fun → «Precios y
   repatriación»; grupo, sacramentos, consejería y oración usan los horarios como el culto; tienda va por contacto (§6 #19).
   Iglesias no cobra nada en la app: el donativo es sugerido y la funeraria dice el total por escrito (§3, §6 #1). */
import { horaInsc, type Bi } from "./inscripciones-comun";

export type KindFe = "misa" | "culto" | "grupo" | "sacr" | "consejo" | "fun" | "oracion" | "ayuda" | "tienda";
export const KINDS_FE: KindFe[] = ["misa", "culto", "grupo", "sacr", "consejo", "fun", "oracion", "ayuda", "tienda"];
export const KS_FE: [string, KindFe][] = [["Parroquia católica", "misa"], ["Misa en español", "misa"], ["Iglesia ortodoxa", "misa"],
  ["Iglesia evangélica", "culto"], ["Iglesia pentecostal", "culto"], ["Iglesia bautista", "culto"], ["Iglesia metodista", "culto"], ["Iglesia adventista", "culto"], ["Iglesia no denominacional", "culto"],
  ["Salón de los Testigos de Jehová", "culto"], ["Capilla de los Santos", "culto"], ["Mezquita", "culto"], ["Sinagoga", "culto"],
  ["Funeraria", "fun"], ["Servicios funerarios", "fun"], ["Cremación", "fun"], ["Repatriación de restos", "fun"], ["Servicio memorial y novenario", "fun"],
  ["Despensa de alimentos", "ayuda"], ["Donación de ropa", "ayuda"], ["Refugio y ayuda de emergencia", "ayuda"], ["Ayuda migratoria de la iglesia", "ayuda"], ["Labor comunitaria y misiones", "ayuda"], ["Oportunidades de voluntariado", "ayuda"],
  ["Consejería matrimonial y familiar", "consejo"], ["Consejería cristiana", "consejo"], ["Ministerio de recuperación", "consejo"],
  ["Capellanía", "oracion"], ["Línea de oración", "oracion"],
  ["Bautizos", "sacr"], ["Primera comunión y confirmación", "sacr"], ["Misa de quinceañera", "sacr"], ["Bodas religiosas", "sacr"], ["Catecismo y preparación de sacramentos", "sacr"],
  ["Ministerio cristiano", "grupo"], ["Ministerio juvenil", "grupo"], ["Ministerio de damas", "grupo"], ["Ministerio de varones", "grupo"], ["Alabanza y coro", "grupo"], ["Estudio bíblico y células", "grupo"], ["Escuela dominical", "grupo"],
  // Subcategorías del catálogo que el prototipo no trae en SUBG (§6 #19): tienda = precios de la caja; botánica = solo directorio y contacto.
  ["Tienda de artículos religiosos", "tienda"], ["Tradiciones espirituales y botánica", "tienda"]];
/* kind(b) del prototipo: el tipo forzado gana; si no, la primera subcategoría (en su orden) que tenga tipo; si ninguna, culto. */
export const kindFeDe = (subs: string[], override?: string | null): KindFe =>
  override && (KINDS_FE as string[]).includes(override) ? (override as KindFe) : subs.map((s) => KS_FE.find((k) => k[0] === s)?.[1]).find((k): k is KindFe => !!k) ?? "culto";
export const conHorarios = (k: KindFe) => k !== "ayuda" && k !== "fun" && k !== "tienda";
export const pideUnHorario = (k: KindFe) => k === "misa" || k === "culto"; // onboarding min 1 (L268): al menos una misa o un culto

/* Atajos del panel (dash2-cat.js MISA L132 y CULTO L133): [corto es, corto en, día, minuto, largo es, largo en]. La hora libre se
   escribe en «Otro horario». */
export type Atajo = [string, string, number, number, string, string];
export const MISA: Atajo[] = [["Sáb 6 PM", "Sat 6 PM", 6, 1080, "sábado 6 PM", "Saturday 6 PM"], ["Dom 8 AM", "Sun 8 AM", 0, 480, "domingo 8 AM", "Sunday 8 AM"],
  ["Dom 12 PM", "Sun 12 PM", 0, 720, "domingo 12 PM", "Sunday 12 PM"], ["Mié 7 PM", "Wed 7 PM", 3, 1140, "miércoles 7 PM", "Wednesday 7 PM"]];
export const CULTO: Atajo[] = [["Dom 10 AM", "Sun 10 AM", 0, 600, "domingo 10 AM", "Sunday 10 AM"], ["Dom 11 AM", "Sun 11 AM", 0, 660, "domingo 11 AM", "Sunday 11 AM"],
  ["Mié 7 PM", "Wed 7 PM", 3, 1140, "miércoles 7 PM", "Wednesday 7 PM"], ["Vie 7 PM", "Fri 7 PM", 5, 1140, "viernes 7 PM", "Friday 7 PM"], ["Sáb 9:30 AM", "Sat 9:30 AM", 6, 570, "sábado 9:30 AM", "Saturday 9:30 AM"]];
export const atajosDe = (k: KindFe) => (k === "misa" ? MISA : CULTO);
/* El nombre que lleva un horario puesto con un atajo. */
export const NOMBRE_ATAJO: Record<"misa" | "culto", Bi> = { misa: { es: "Misa en español", en: "Spanish mass" }, culto: { es: "Culto", en: "Service" } };

/* AYUDA GRATIS · SALE EN BUSCAR (dash2-cat.js AYUDA L134): cada una es un filtro de Buscar con el mismo nombre. */
export type HelpFe = "despensa" | "ropa" | "transporte" | "jovenes" | "ninos" | "bodas";
export const AYUDA: [HelpFe, string, string][] = [["despensa", "Despensa de comida", "Food pantry"], ["ropa", "Ropa", "Clothing"], ["transporte", "Transporte los días de servicio", "Rides on service days"],
  ["jovenes", "Grupo de jóvenes", "Youth group"], ["ninos", "Escuela bíblica para niños", "Kids Bible school"], ["bodas", "Bodas y quinceañeras", "Weddings and quinceañeras"]];
/* CADA CUÁNTO PUEDE VENIR UNA FAMILIA (FREQ L135). */
export type FreqFe = "semana" | "quince" | "mes";
export const FREQ: [FreqFe, string, string, string, string][] = [["semana", "Una vez por semana", "Once a week", "Una caja por familia a la semana.", "One box per family per week."],
  ["quince", "Cada 15 días", "Every 15 days", "Una caja por familia cada 15 días.", "One box per family every 15 days."], ["mes", "Una vez al mes", "Once a month", "Una caja por familia al mes.", "One box per family per month."]];
export const REP = ["3–5", "5–7", "7–10"] as const;
export type RepFe = (typeof REP)[number];
/* Etiquetas cortas de la ficha (neg-fe-kind.js HELP L38). */
export const HELP: [string, string, string][] = [["despensa", "Despensa", "Food pantry"], ["ropa", "Ropa", "Clothing"], ["transporte", "Transporte", "Rides"], ["jovenes", "Jóvenes", "Youth"], ["ninos", "Niños", "Kids"], ["sinid", "Sin papeles", "No papers"]];

/* Líneas fijas (§1c, verbatim; nunca se suavizan). */
export const LINEA_FE: Bi = { es: "La ayuda de la iglesia es gratis; nunca se cobra por despensa, ropa ni oración.", en: "Church help is free; food, clothing and prayer are never charged." };
export const LINEA_FUN: Bi = { es: "El precio es el total por escrito antes de firmar: nada se agrega después.", en: "The price is the written total before you sign: nothing is added later." };
export const LINEA_TIENDA: Bi = { es: "El precio de aquí es el de la caja.", en: "The price here is the price at the register." };
export const LINEA_AYUDA: Bi = { es: "La ayuda aquí es gratis; nunca se cobra por comida, ropa ni oración.", en: "Help here is free; food, clothing and prayer are never charged." };
/* LINE (kind L40–41): «otra» = mezquita o sinagoga. */
export function lineaFe(k: KindFe, subs: string[]): Bi {
  const otra = subs.some((s) => s === "Mezquita" || s === "Sinagoga");
  return k === "fun" ? LINEA_FUN : k === "tienda" ? LINEA_TIENDA : otra || !(k === "misa" || k === "culto") ? LINEA_AYUDA : LINEA_FE;
}
/* El donativo nunca se cobra (§3): siempre con esta frase. */
export const DONATIVO: Bi = { es: "Donativo sugerido · si no puedes, no se cobra.", en: "Suggested donation · if you cannot, there is no charge." };
/* REGLAS · NO SE APAGAN (L488 y L501). */
export const REGLAS_FE: [Bi, Bi][] = [[{ es: "La ayuda es gratis", en: "Help is free" }, { es: "El donativo siempre es sugerido; si no puedes, no se cobra.", en: "Donations are always suggested; if you cannot, there is no charge." }],
  [{ es: "Nadie pregunta tu estatus", en: "Nobody asks your status" }, { es: "Ni para la despensa ni para los sacramentos.", en: "Not for the pantry nor for sacraments." }]];
export const REGLAS_FUN: [Bi, Bi][] = [[{ es: "El precio es el total", en: "The price is the total" }, { es: "Por escrito antes de firmar; nada se agrega después.", en: "In writing before signing; nothing is added later." }],
  [{ es: "Sin presión", en: "No pressure" }, { es: "La familia decide con calma; no se cobra por preguntar.", en: "The family decides calmly; asking is free." }]];

/* Formas de un servicio de Iglesias (neg-fe-listing.js fe; §4ia): gratis · donativo sugerido · precio total (solo funeraria) ·
   curso con grupos (catecismo; sin matrícula en la app). */
export type FormaFe = "gratis" | "don" | "tot" | "curso";
export const FORMAS_FE: FormaFe[] = ["gratis", "don", "tot", "curso"];
export const FE_DE_ITEM = (k: string | null, fe: string | undefined): FormaFe => (k === "curso" ? "curso" : fe === "don" || fe === "tot" ? fe : "gratis");

export const DIA_FE: [string, string, string, string][] = [["Dom", "Sun", "domingo", "Sunday"], ["Lun", "Mon", "lunes", "Monday"], ["Mar", "Tue", "martes", "Tuesday"], ["Mié", "Wed", "miércoles", "Wednesday"],
  ["Jue", "Thu", "jueves", "Thursday"], ["Vie", "Fri", "viernes", "Friday"], ["Sáb", "Sat", "sábado", "Saturday"]];
export const horaFe = horaInsc;
export const cortoFe = (dow: number, min: number, es: boolean) => `${DIA_FE[dow]![es ? 0 : 1]} ${horaFe(min)}`;
export const largoFe = (dow: number, min: number, es: boolean) => `${DIA_FE[dow]![es ? 2 : 3]} ${horaFe(min)}`;
export const LANG_FE: Record<"es" | "en" | "bil" | "otro", Bi> = { es: { es: "Español", en: "Spanish" }, bil: { es: "Español e inglés", en: "Spanish and English" }, en: { es: "Inglés", en: "English" }, otro: { es: "Otro idioma", en: "Other language" } };
export const QUE_FE: Record<"misa" | "culto" | "grupo" | "oracion", Bi> = { misa: { es: "Misa", en: "Mass" }, culto: { es: "Culto o servicio", en: "Service" }, grupo: { es: "Grupo", en: "Group" }, oracion: { es: "Oración", en: "Prayer" } };

export type HorarioFe = { id: string; dow: number; min: number; label: Bi; lang: "es" | "en" | "bil" | "otro"; kind: "misa" | "culto" | "grupo" | "oracion" };
export type HerrFe = {
  kind: KindFe; forzado: boolean; subs: string[]; horarios: HorarioFe[];
  bil: boolean; help: HelpFe[]; sinid: boolean; freq: FreqFe; agotado: boolean; catequesis: boolean; hayCurso: boolean;
  h24: boolean; plan: boolean; rep: RepFe; repatria: boolean; totales: { id: string; name: Bi; cents: number }[]; hoy: string;
};

export function tituloFe(h: Pick<HerrFe, "kind">, es: boolean) {
  return h.kind === "fun" ? (es ? "Precios y repatriación" : "Prices and repatriation") : h.kind === "ayuda" ? (es ? "La ayuda de hoy" : "Today's help") : es ? "Horarios y ayuda" : "Schedule and help";
}
const lst = (L: string[], y: string) => (L.length <= 1 ? L.join("") : `${L.slice(0, -1).join(", ")} ${y} ${L[L.length - 1]}`);
/* Tarjeta del buscador (apply L256–258): «Misa en español: domingo 12 PM y sábado 6 PM»; con varios nombres, «Culto: domingo 11 AM ·
   Jóvenes: viernes 7 PM» (hasta dos nombres y tres horas cada uno). */
export function etaHorarios(H: HorarioFe[], es: boolean) {
  const G: { l: string; d: string[] }[] = [];
  for (const x of [...H].sort((p, q) => p.dow - q.dow || p.min - q.min)) {
    const l = es ? x.label.es : x.label.en || x.label.es, g = G.find((z) => z.l === l);
    if (g) g.d.push(largoFe(x.dow, x.min, es)); else G.push({ l, d: [largoFe(x.dow, x.min, es)] });
  }
  return G.slice(0, 2).map((g) => `${g.l}: ${lst(g.d.slice(0, 3), es ? "y" : "and")}`).join(" · ");
}
const usd = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
/* summary L315–317 (la fila de Tu herramienta y el Super Admin). */
export function resumenFe(h: HerrFe, es: boolean) {
  if (h.kind === "tienda") return es ? "Por contacto: la gente llama o escribe" : "By contact: people call or message";
  if (h.kind === "ayuda") { const f = FREQ.find((x) => x[0] === h.freq) ?? FREQ[0]!; return `${h.agotado ? (es ? "Se acabó por hoy · " : "Out for today · ") : ""}${h.sinid ? (es ? "sin papeles" : "no papers") : es ? "piden ID" : "ID required"} · ${f[es ? 1 : 2].toLowerCase()}`; }
  if (h.kind === "fun") return [h.h24 ? (es ? "24 horas" : "24 hours") : es ? "Con horario" : "Set hours", h.totales.length ? h.totales.map((t) => usd(t.cents)).join(" / ") : es ? "sin precios totales" : "no total prices",
    h.plan ? (es ? "plan de pagos" : "payment plan") : "", h.repatria ? (es ? `repatriación ${h.rep} días` : `repatriation ${h.rep} days`) : ""].filter(Boolean).join(" · ");
  const cl = h.horarios.map((x) => cortoFe(x.dow, x.min, es));
  return `${h.kind === "misa" ? (es ? "Misa en español: " : "Spanish mass: ") : es ? "Servicios: " : "Services: "}${cl.join(" · ") || (es ? "sin horario" : "no schedule")}${h.bil ? (es ? " · también en inglés" : " · also in English") : ""} · ${h.help.length}${h.help.length === 1 ? (es ? " ayuda gratis" : " free help program") : es ? " ayudas gratis" : " free help programs"}`;
}
