/* Noche · «Esta noche» (4na · fase4-noche.md §2, §4na y §5 · dash2-cat.js blocksC L387–396, summary L322, apply L283–286):
   tipos y textos que comparten el servidor, el panel, la ficha y el Super Admin (sin acceso a la base).
   Las horas de la noche van en minutos desde las 12 PM (540 = 9 PM, 660 = 11 PM, 780 = 1 AM): la noche pasa de las 24. */
export type Bi = { es: string; en: string };
export type KindNoche = "club" | "salsa" | "urbano" | "banda" | "bar" | "sport" | "karaoke" | "billar" | "cerve" | "lounge" | "show" | "dj" | "promo" | "salon";
/* DJ, promotor y salón trabajan por fecha: no tienen «Esta noche» (sin cover, sin fila). */
export const POR_FECHA: KindNoche[] = ["dj", "promo", "salon"];
/* La fila «ahora» vale 60 minutos desde que el local la puso; después sale con su hora (Preguntas #4). Nunca se inventa. */
export const FILA_VIVA_MIN = 60;
export const MUSICA: [string, string, string][] = [["m:bachata", "Bachata", "Bachata"], ["m:salsa", "Salsa", "Salsa"], ["m:tipico", "Típico", "Típico"], ["m:reggaeton", "Reguetón", "Reggaeton"],
  ["m:banda", "Banda y norteño", "Banda and norteño"], ["m:envivo", "En vivo", "Live"], ["m:mixto", "Mixto", "Mixed"]];
export const FILAS: [number, string, string][] = [[0, "Sin fila", "No line"], [10, "10 min", "10 min"], [20, "20 min", "20 min"], [35, "30 min o más", "30+ min"]];
export const LISTA_HORAS = [540, 600, 660, 720, 780];

export type NocheDia = { fecha: string; dow: number; abre: boolean; cover: number; distinto: boolean };
/* Lo de una noche: el cover que se paga en la puerta, si sube después de cierta hora, la edad, la lista y a qué hora cierra. */
export type EstaNoche = { fecha: string; dow: number; cuando: "hoy" | "manana" | "dia"; cover: number; after: { min: number; cents: number } | null; edad: 18 | 21;
  lista: number | null; cierra: number | null };
export type FilaNoche = { min: number; at: string; viva: boolean; hoy: boolean; anoche: boolean; dow: number; hora: number };
export type HerrNoche = {
  kind: KindNoche; forzado: boolean; porFecha: boolean;
  cover: number; afterMin: number | null; afterCents: number | null; byDow: Record<string, number>; edad: 18 | 21;
  lista: boolean; listaHasta: number | null; listaTope: number | null;
  fila: FilaNoche | null; musica: string[]; musicaNota: Bi | null; vestimenta: Bi | null;
  hoy: string; abreHoy: boolean;
  // Las 7 noches desde hoy (hoy incluida) y la próxima que abre (hoy si abre).
  noches: NocheDia[]; prox: EstaNoche | null;
};

const DIA: [string, string][] = [["domingo", "Sunday"], ["lunes", "Monday"], ["martes", "Tuesday"], ["miércoles", "Wednesday"], ["jueves", "Thursday"], ["viernes", "Friday"], ["sábado", "Saturday"]];
const DIA3: [string, string][] = [["dom", "Sun"], ["lun", "Mon"], ["mar", "Tue"], ["mié", "Wed"], ["jue", "Thu"], ["vie", "Fri"], ["sáb", "Sat"]];
export const diaNoche = (dow: number, es: boolean) => DIA[dow]![es ? 0 : 1];
export const dia3Noche = (dow: number, es: boolean) => DIA3[dow]![es ? 0 : 1];
/* 540 → «9 PM» · 690 → «11:30 PM» · 780 → «1 AM». */
export function hNoche(m: number): string {
  const t = (720 + m) % 1440, h = Math.floor(t / 60), mm = t % 60;
  return `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
}
export const usdN = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: c % 100 ? 2 : 0, minimumFractionDigits: c % 100 ? 2 : 0 })}`;

/* La línea de la tarjeta del buscador (eta, L39–40): «Hoy: cover $10 · $15 después de las 11 PM · 21+» / «Mañana: sin cover · 21+». */
export function etaNoche(e: EstaNoche, es: boolean): string {
  const E2 = (a: string, b: string) => (es ? a : b);
  const cuando = e.cuando === "hoy" ? E2("Hoy", "Tonight") : e.cuando === "manana" ? E2("Mañana", "Tomorrow") : E2(`El ${diaNoche(e.dow, true)}`, diaNoche(e.dow, false));
  const cv = e.cover ? E2(`cover ${usdN(e.cover)}`, `${usdN(e.cover)} cover`) : E2("sin cover", "no cover");
  const af = e.after ? E2(` · ${usdN(e.after.cents)} después de las ${hNoche(e.after.min)}`, ` · ${usdN(e.after.cents)} after ${hNoche(e.after.min)}`) : "";
  return `${cuando}: ${cv}${af} · ${e.edad}+`;
}
/* La fila con su hora real (fee, L41): «Fila ahora: ~10 min» solo si la puso hace 60 min o menos; si no, «Fila anoche a las 11:30 PM:
   ~15 min» o «Fila el sáb a las …». Sin fila publicada, nada. */
export function filaTexto(f: FilaNoche | null, es: boolean): string | null {
  if (!f) return null;
  const E2 = (a: string, b: string) => (es ? a : b);
  if (f.viva) return f.min ? E2(`Fila ahora: ~${f.min} min`, `Line now: ~${f.min} min`) : E2("Sin fila ahora", "No line now");
  const cuando = f.hoy ? E2(`a las ${hNoche(f.hora)}`, `at ${hNoche(f.hora)}`) : f.anoche ? E2(`anoche a las ${hNoche(f.hora)}`, `last night at ${hNoche(f.hora)}`)
    : E2(`el ${dia3Noche(f.dow, true)} a las ${hNoche(f.hora)}`, `on ${dia3Noche(f.dow, false)} at ${hNoche(f.hora)}`);
  return f.min ? E2(`Fila ${cuando}: ~${f.min} min`, `Line ${cuando}: ~${f.min} min`) : E2(`Sin fila ${cuando}`, `No line ${cuando}`);
}
/* La línea de Lo que vendes y del 360 del Super Admin (summary L322): «Cover $10 · 21+ · lista hasta las 11 PM · fila 15 min · vie $15». */
export function resumenNoche(h: HerrNoche, es: boolean): string {
  const E2 = (a: string, b: string) => (es ? a : b);
  if (h.porFecha) return E2("Trabajas por fecha: sin cover ni fila.", "You work by date: no cover or line.");
  const dist = Object.entries(h.byDow).filter(([, v]) => v !== h.cover).map(([d, v]) => `${dia3Noche(Number(d), es)} ${v ? usdN(v) : E2("gratis", "free")}`);
  return [h.cover ? `${E2("Cover", "Cover")} ${usdN(h.cover)}` : E2("Sin cover", "No cover"), `${h.edad}+`,
    h.lista && h.listaHasta != null ? E2(`lista hasta las ${hNoche(h.listaHasta)}`, `list until ${hNoche(h.listaHasta)}`) : E2("sin lista", "no list"),
    h.fila ? (h.fila.min ? E2(`fila ${h.fila.min} min`, `line ${h.fila.min} min`) : E2("sin fila", "no line")) : E2("fila sin poner", "line not set"), ...dist].join(" · ");
}
/* Lo que el panel manda al guardar «Esta noche» (el servidor valida todo). igual = «Igual todas las noches» (borra los distintos). */
export type NocheIn = { cover?: number; after?: { min: number; cents: number } | null; byDow?: { d: number; cents: number | null }; igual?: boolean; edad?: number; lista?: number | null;
  tope?: number | null; fila?: number; musica?: string[]; nota?: string | null; vestimenta?: string | null };
export const tituloNoche = (es: boolean) => (es ? "Esta noche" : "Tonight");

/* Una línea del historial de lo publicado (Super Admin y Ayuda): «Cover $15» · «Fila 20 min» · «Lista hasta las 11 PM»… */
export function postTexto(field: string, v: unknown, es: boolean): string {
  const E2 = (a: string, b: string) => (es ? a : b), o = (v ?? {}) as Record<string, unknown>;
  if (field === "cover") return `${E2("Cover", "Cover")} ${Number(o.cents) ? usdN(Number(o.cents)) : E2("gratis", "free")}`;
  if (field === "after") return v == null ? E2("Igual toda la noche", "Same all night") : E2(`${usdN(Number(o.cents))} después de las ${hNoche(Number(o.min))}`, `${usdN(Number(o.cents))} after ${hNoche(Number(o.min))}`);
  if (field === "by_dow") return o.igual ? E2("Igual todas las noches", "Same every night") : `${E2("El", "On")} ${diaNoche(Number(o.d), es)}: ${o.cents == null ? E2("igual que esta noche", "same as tonight") : Number(o.cents) ? usdN(Number(o.cents)) : E2("gratis", "free")}`;
  if (field === "age") return `${E2("Edad", "Age")} ${Number(v)}+`;
  if (field === "list") return v == null ? E2("Sin lista", "No list") : o.until != null ? E2(`Lista hasta las ${hNoche(Number(o.until))}`, `List until ${hNoche(Number(o.until))}`) : o.cap == null ? E2("Lista sin tope", "List with no cap") : E2(`Tope de la lista: ${o.cap}`, `List cap: ${o.cap}`);
  if (field === "line") return Number(v) ? E2(`Fila ${Number(v)} min`, `Line ${Number(v)} min`) : E2("Sin fila", "No line");
  if (field === "music") return Array.isArray(v) ? `${E2("Música", "Music")}: ${v.map((m) => MUSICA.find((x) => x[0] === m)?.[es ? 1 : 2] ?? m).join(", ")}` : `${E2("Quién toca", "Who plays")}: ${o.nota ?? E2("(quitado)", "(removed)")}`;
  if (field === "dress") return `${E2("Vestimenta", "Dress code")}: ${v ?? E2("(quitado)", "(removed)")}`;
  return field;
}
export const KINDS_LOCAL: [KindNoche, string][] = [["club", "Discoteca"], ["salsa", "Salsa y bachata"], ["urbano", "Urbano"], ["banda", "Banda y cantina"], ["bar", "Bar"], ["sport", "Bar deportivo"],
  ["karaoke", "Karaoke"], ["billar", "Billar"], ["cerve", "Cervecería"], ["lounge", "Lounge"], ["show", "Espectáculos"], ["dj", "DJ (por fecha)"], ["promo", "Promotor (por fecha)"], ["salon", "Salón (por fecha)"]];

/* ── Ficha de Noche (4nb · neg-noche.js line L77–78, neg-noche-listing.js priceFor L108–113) ── */
export const LINEA_NOCHE: Bi = { es: "El cover que ves es el que pagas en la puerta.", en: "The cover you see is the one you pay at the door." };
export function precioNoche(s: { k: string; cents: number; until: number | null; pax: number | null; hr: boolean }, es: boolean): { l: string; s: string } {
  const E2 = (a: string, b: string) => (es ? a : b);
  if (s.k === "lista") return { l: s.cents ? usdN(s.cents) : E2("Gratis", "Free"), s: s.until != null ? E2(`CON LA LISTA HASTA LAS ${hNoche(s.until)}`, `ON THE LIST UNTIL ${hNoche(s.until)}`) : "" };
  if (s.k === "cover") return { l: s.cents ? usdN(s.cents) : E2("Sin cover", "No cover"), s: s.cents ? E2("EN LA PUERTA", "AT THE DOOR") : "" };
  if (s.k === "mesa") return { l: s.hr ? `${usdN(s.cents)}${E2("/hora", "/hr")}` : s.cents ? `${E2("Mínimo ", "Minimum ")}${usdN(s.cents)}` : E2("Sin mínimo", "No minimum"), s: s.pax ? E2(`HASTA ${s.pax} PERSONAS`, `UP TO ${s.pax} PEOPLE`) : "" };
  if (s.k === "vip") return { l: s.cents ? `${E2("Mínimo ", "Minimum ")}${usdN(s.cents)}` : E2("Sin mínimo", "No minimum"), s: s.pax ? E2(`HASTA ${s.pax} PERSONAS`, `UP TO ${s.pax} PEOPLE`) : "" };
  if (s.k === "fecha") return { l: s.cents ? `${E2("Desde ", "From ")}${usdN(s.cents)}` : E2("Por cotización", "By quote"), s: s.pax ? E2(`HASTA ${s.pax} PERSONAS`, `UP TO ${s.pax} GUESTS`) : E2("POR FECHA", "PER DATE") };
  return { l: usdN(s.cents), s: E2("BOLETO", "TICKET") };
}
/* «$10 · $15 después de las 11 PM» / «Sin cover». */
export const coverTexto = (e: EstaNoche, es: boolean) => (e.cover ? `${usdN(e.cover)}${e.after ? (es ? ` · ${usdN(e.after.cents)} después de las ${hNoche(e.after.min)}` : ` · ${usdN(e.after.cents)} after ${hNoche(e.after.min)}`) : ""}` : es ? "Sin cover" : "No cover");
/* La fila en la ficha: «~15 min» / «Sin fila», cuándo la puso (solo «Ahora» si es viva) y la etiqueta del riel. */
export const filaCorta = (f: FilaNoche, es: boolean) => (f.min ? `~${f.min} min` : es ? "Sin fila" : "No line");
export function filaCuando(f: FilaNoche, es: boolean): string {
  const E2 = (a: string, b: string) => (es ? a : b);
  if (f.viva) return E2(`Ahora · lo puso el local a las ${hNoche(f.hora)}.`, `Now · posted by the venue at ${hNoche(f.hora)}.`);
  const c = f.hoy ? E2(`Hoy a las ${hNoche(f.hora)}`, `Today at ${hNoche(f.hora)}`) : f.anoche ? E2(`Anoche a las ${hNoche(f.hora)}`, `Last night at ${hNoche(f.hora)}`)
    : E2(`El ${dia3Noche(f.dow, true)} a las ${hNoche(f.hora)}`, `On ${dia3Noche(f.dow, false)} at ${hNoche(f.hora)}`);
  return `${c}${E2(". En vivo desde que abren.", ". Live from opening.")}`;
}
export const filaEtiqueta = (f: FilaNoche, es: boolean) => (f.viva ? (es ? "FILA AHORA" : "LINE NOW") : f.hoy ? (es ? "FILA HOY" : "LINE TODAY") : f.anoche ? (es ? "FILA ANOCHE" : "LINE LAST NIGHT")
  : es ? `FILA EL ${dia3Noche(f.dow, true).toUpperCase()}` : `LINE ON ${dia3Noche(f.dow, false).toUpperCase()}`);
/* «2026-11-07» → «sáb 7 nov» (nunca la fecha en crudo en pantalla). */
export function nocheCorta(fecha: string, es: boolean): string {
  const d = new Date(`${fecha}T12:00:00Z`), M = es ? ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return es ? `${dia3Noche(d.getUTCDay(), true)} ${d.getUTCDate()} ${M[d.getUTCMonth()]}` : `${dia3Noche(d.getUTCDay(), false)} ${M[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
