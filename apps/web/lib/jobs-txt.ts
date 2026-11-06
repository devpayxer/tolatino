/* Textos de una vacante (prototipo jobCtx / TLJobP): pago, días, horario, idiomas, tipo y hace cuánto. Sin servidor. */
type Bi = { es: string; en: string };
/* Lo que nunca se pide para aplicar (el servidor lo rechaza; el editor lo avisa antes). */
export const PROHIBIDO = /\b(cv|curr[ií]cul\w*|resume|ssn|seguro social|social security|estatus|status|papeles|green ?card|itin|permiso de trabajo|work permit|ciudadan\w*|citizen\w*|dep[oó]sito para|pagar para aplicar|fee)\b/i;
const DL_ES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"], DL_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DCORTO = (es: boolean) => (es ? ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
export const DLETRA = (es: boolean) => (es ? ["L", "M", "M", "J", "V", "S", "D"] : ["M", "T", "W", "T", "F", "S", "S"]);
const d$ = (c: number) => `$${Number.isInteger(c / 100) ? c / 100 : (c / 100).toFixed(2)}`;
export const pagoL = (from: number, to: number | null, es: boolean) => `${d$(from)}${to && to > from ? `–${d$(to).slice(1)}` : ""}${es ? "/hora" : "/hr"}`;
export const pagoLargo = (from: number, to: number | null, tips: boolean, es: boolean) => `${d$(from)}${to && to > from ? `–${d$(to).slice(1)}` : ""}${es ? " por hora" : " an hour"}${tips ? (es ? " + propinas" : " + tips") : ""}`;
/* «Martes a domingo» si son seguidos (3 o más); si no, «lun · mié · vie». */
export function diasL(days: number[], es: boolean) {
  const d = [...days].sort((a, b) => a - b), L = es ? DL_ES : DL_EN;
  if (!d.length) return "—";
  if (d.length === 7) return es ? "Todos los días" : "Every day";
  const seguidos = d.every((x, i) => i === 0 || x === d[i - 1]! + 1);
  if (seguidos && d.length > 2) { const a = L[d[0]!]!, z = L[d[d.length - 1]!]!; return es ? `${a.charAt(0).toUpperCase()}${a.slice(1)} a ${z}` : `${a} to ${z}`; }
  return d.map((x) => DCORTO(es)[x]).join(" · ");
}
export const horaL = (m: number) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`; };
export const horarioL = (start: number, end: number) => `${horaL(start)} – ${horaL(end)}`;
export function idiomasL(les: string, len: string, es: boolean) {
  const n = (k: string) => (k === "es" ? (es ? "Español" : "Spanish") : es ? "Inglés" : "English");
  const need = [les === "need" ? "es" : null, len === "need" ? "en" : null].filter(Boolean) as string[];
  const plus = [les === "plus" ? "es" : null, len === "plus" ? "en" : null].filter(Boolean) as string[];
  return [need.map(n).join(" · "), ...plus.map((k) => `${n(k)}${es ? ", un plus" : " a plus"}`)].filter(Boolean).join(" · ") || "—";
}
export const tipoL = (k: string, es: boolean) => (k === "pt" ? (es ? "Medio tiempo" : "Part time") : k === "fds" ? (es ? "Fines de semana" : "Weekends") : es ? "Tiempo completo" : "Full time");
export const haceL = (d: number, es: boolean) => (d <= 0 ? (es ? "Hoy" : "Today") : d === 1 ? (es ? "Ayer" : "Yesterday") : es ? `Hace ${d} días` : `${d} days ago`);
export const bi = (x: Bi | null | undefined, es: boolean) => (x ? (es ? x.es : x.en || x.es) : "");
export const EXP_L = (es: boolean): Record<number, string> => ({ 0: es ? "Sin experiencia" : "No experience", 1: es ? "Menos de 1 año" : "Under 1 year", 3: es ? "1 a 3 años" : "1 to 3 years", 4: es ? "Más de 3 años" : "Over 3 years" });
