/* Tu herramienta de Fiestas («Calendario y depósito»): tipos y textos que comparten el servidor, el panel y el Super Admin
   (sin acceso a la base). Plan: docs/diseno/plan/fase4-fiestas-transporte.md §4t y §5. */
export type DiaFiesta = { day: string; manual: boolean; reservas: { num: string }[]; ocupada: boolean };
export type HerrFiesta = {
  dep: number; guests: number | null; perDay: number; ahead: number; zone: number | null; cancel: number;
  // Las fechas de las próximas semanas: marcadas a mano o con reservas confirmadas (ocupada = derivado).
  dias: DiaFiesta[]; hoy: string; cambiado: boolean;
};
const usd = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
/* La línea de Lo que vendes y del 360 del Super Admin (dash2-cat.js summary L323). */
export function resumenFiesta(h: HerrFiesta, es: boolean): string {
  const E2 = (a: string, b: string) => (es ? a : b), n = h.dias.filter((d) => d.ocupada).length;
  return [`${n} ${n === 1 ? E2("fecha ocupada", "date booked") : E2("fechas ocupadas", "dates booked")}`, h.dep ? `${E2("depósito ", "deposit ")}${usd(h.dep)}` : E2("sin depósito", "no deposit"),
    h.guests ? `${E2("hasta ", "up to ")}${h.guests} ${E2("invitados", "guests")}` : "", h.zone ? `${E2("va hasta ", "travels up to ")}${h.zone} mi` : ""].filter(Boolean).join(" · ");
}

/* ── Ficha de Fiestas y «Tu fecha» (4u · neg-fiesta-listing.js EVT/GUESTS/WHERE L179–182, availOf L187–191, priceFor L210,
   metaOf L216). Lo mismo calcula el servidor (página) y el teléfono (la fecha sin sesión vive ahí). Al pedir la fecha (4v) el
   servidor lo vuelve a comprobar todo. ── */
export type Bi = { es: string; en: string };
export const EVT = [["quince", "Quinceañera", "Quinceañera"], ["boda", "Boda", "Wedding"], ["cumple", "Cumpleaños", "Birthday"], ["baby", "Baby shower", "Baby shower"],
  ["bautizo", "Bautizo", "Baptism"], ["grad", "Graduación", "Graduation"], ["empresa", "Empresa", "Company"]] as const;
export const GUESTS = [25, 50, 100, 150, 200, 300] as const;
export const WHERE = [["salon", "En un salón", "At a venue"], ["casa", "En mi casa o patio", "At home or backyard"], ["nose", "Aún no sé", "Not sure yet"]] as const;
export type TuFecha = { e: string; day: string; g: number | null; w: string };
export const LINEA_FIESTA: Bi = { es: "La fecha no es tuya hasta que te la confirmen.", en: "The date is not yours until they confirm it." };

const DSem = { es: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
const MSes = { es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
export const sumarDias = (ymd: string, n: number) => { const d = new Date(`${ymd}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
/* «sáb 26 sep» · «Sat Sep 26». */
export function diaFiesta(ymd: string, es: boolean): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  return es ? `${DSem.es[d.getUTCDay()]} ${d.getUTCDate()} ${MSes.es[d.getUTCMonth()]}` : `${DSem.en[d.getUTCDay()]} ${MSes.en[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
/* Los próximos sábados y domingos desde hoy (los días que más se piden). */
export function findes(hoy: string, n: number): string[] {
  const out: string[] = [];
  for (let i = 0; out.length < n && i < 400; i++) { const d = sumarDias(hoy, i), w = new Date(`${d}T12:00:00Z`).getUTCDay(); if (w === 6 || w === 0) out.push(d); }
  return out;
}
export const tuFechaValida = (x: unknown): x is TuFecha => {
  const f = x as TuFecha;
  return !!f && typeof f === "object" && /^\d{4}-\d{2}-\d{2}$/.test(String(f.day)) && !Number.isNaN(Date.parse(`${f.day}T12:00:00Z`))
    && (f.e === "" || EVT.some((z) => z[0] === f.e)) && (f.w === "" || WHERE.some((z) => z[0] === f.w))
    && (f.g == null || (Number.isInteger(f.g) && f.g >= 1 && f.g <= 2000));
};

/* Lo que la página sabe del calendario de un negocio (lo calcula el servidor). */
export type CalFiesta = { hoy: string; hasta: string; ocupadas: string[]; libres: string[]; guests: number | null };
export type Dispo = { ok: boolean; none: boolean; t: string; short: string; lejos?: boolean };
/* «Libre el sáb 26 sep · caben tus 150» · «Ocupada el sáb 26 sep · libre 3 oct y 10 oct» · «Caben hasta 120 · tú esperas 150». */
export function dispoFiesta(c: CalFiesta, fe: TuFecha | null, es: boolean, cap?: number | null): Dispo {
  const E2 = (a: string, b: string) => (es ? a : b), max = cap ?? c.guests;
  if (!fe) { const nx = c.libres[0]; return { ok: true, none: true, t: nx ? `${E2("Próxima fecha libre: ", "Next free date: ")}${diaFiesta(nx, es)}` : E2("Pregunta por fechas", "Ask for dates"), short: nx ? diaFiesta(nx, es) : "—" }; }
  if (fe.day < c.hoy) return { ok: false, none: false, t: E2("Esa fecha ya pasó. Cambia tu fecha.", "That date has passed. Change your date."), short: E2("Ya pasó", "Past") };
  if (fe.day > c.hasta) return { ok: false, none: false, lejos: true, t: E2(`No aparta tan lejos en la app: llama para el ${diaFiesta(fe.day, es)}.`, `Does not book that far ahead in the app: call about ${diaFiesta(fe.day, es)}.`), short: E2("Llama", "Call") };
  const libre = !c.ocupadas.includes(fe.day), caben = max == null || !fe.g || max >= fe.g;
  if (!caben) return { ok: false, none: false, t: E2(`Caben hasta ${max} · tú esperas ${fe.g}`, `Fits up to ${max} · you expect ${fe.g}`), short: E2("No caben", "Too small") };
  if (libre) return { ok: true, none: false, t: `${E2("Libre el ", "Free on ")}${diaFiesta(fe.day, es)}${max && fe.g ? E2(` · caben tus ${fe.g}`, ` · fits your ${fe.g}`) : ""}`, short: E2("Libre", "Free") };
  const alt = c.libres.filter((d) => d !== fe.day).slice(0, 2);
  return { ok: false, none: false, t: `${E2("Ocupada el ", "Booked on ")}${diaFiesta(fe.day, es)}${alt.length ? `${E2(" · libre ", " · free ")}${alt.map((d) => diaFiesta(d, es)).join(E2(" y ", " and "))}` : ""}`, short: E2("Ocupada", "Booked") };
}

/* Precio y rótulo de un servicio de fiesta (priceFor / metaOf). */
export type SvcFiesta = { id: string; sec: string | null; name: Bi; desc: Bi; cents: number; k: string; h: number | null; cap: number | null; mont: boolean; inc: Bi[]; u: Bi | null; per: number | null; min: number | null; foto: string | null };
const m$ = (c: number) => (c % 100 ? `$${(c / 100).toFixed(2)}` : `$${(c / 100).toLocaleString("en-US")}`);
export function precioFiesta(s: SvcFiesta, es: boolean): { l: string; s: string } {
  const E2 = (a: string, b: string) => (es ? a : b);
  if (s.k === "visita") return { l: E2("Gratis", "Free"), s: "" };
  if (s.k === "hora") return { l: `${m$(s.cents)}${E2("/hora", "/hr")}`, s: s.min ? `${E2("MÍNIMO ", "MIN ")}${s.min} H` : "" };
  if (s.k === "unid") return { l: `${m$(s.cents)}${E2(" por ", " per ")}${s.u ? (es ? s.u.es : s.u.en || s.u.es) : E2("unidad", "unit")}`, s: s.min ? `${E2("MÍNIMO ", "MIN ")}${s.min}` : "" };
  if (s.k === "cotiza") return { l: `${E2("Desde ", "From ")}${m$(s.cents)}`, s: E2("TOTAL POR ESCRITO", "WRITTEN TOTAL") };
  return { l: m$(s.cents), s: s.k === "pack" ? E2("PAQUETE", "PACKAGE") : "" };
}
export function metaFiesta(s: SvcFiesta, es: boolean): string {
  const E2 = (a: string, b: string) => (es ? a : b), a: string[] = [];
  if (s.k === "pack" && s.h) a.push(s.h === 1 ? E2("1 HORA", "1 HOUR") : E2(`${s.h} HORAS`, `${s.h} HOURS`));
  if (s.k === "visita") a.push(E2("VISITA · 30 MIN", "TOUR · 30 MIN"));
  if (s.cap) a.push(E2(`HASTA ${s.cap} INVITADOS`, `UP TO ${s.cap} GUESTS`));
  if (s.k === "unid" && s.per) a.push(E2(`1 CADA ${s.per} INVITADOS`, `1 PER ${s.per} GUESTS`));
  if (s.mont) a.push(E2("MONTAJE INCLUIDO", "SETUP INCLUDED"));
  return a.join(" · ");
}
