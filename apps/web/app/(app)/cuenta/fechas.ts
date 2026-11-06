/* Fechas de Mi cuenta, en la zona de la ciudad: «lun 2 nov», «Noviembre 2026», la caja de fecha (NOV · 2) y la hora. */
const fmt = (iso: string, tz: string, es: boolean, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(es ? "es-US" : "en-US", { timeZone: tz, ...o }).format(new Date(iso)).replace(/\./g, "");
export const diaCorto = (iso: string, tz: string, es: boolean) => fmt(iso, tz, es, { weekday: "short", day: "numeric", month: "short" });
export const mesLargo = (iso: string, tz: string, es: boolean) => { const s = fmt(iso, tz, es, { month: "long", year: "numeric" }).replace(" de ", " "); return s.charAt(0).toUpperCase() + s.slice(1); };
export const horaDe = (iso: string, tz: string, es: boolean) => fmt(iso, tz, es, { hour: "numeric", minute: "2-digit" }).replace(/\s?([ap])\.?\s?m\.?/i, (_, x: string) => ` ${x.toUpperCase()}M`);
export const cajaFecha = (iso: string, tz: string, es: boolean) => ({ mo: fmt(iso, tz, es, { month: "short" }).toUpperCase(), dd: fmt(iso, tz, es, { day: "numeric" }) });
export const diaRel = (dia: number, iso: string, tz: string, es: boolean) => (dia === 0 ? (es ? "HOY" : "TODAY") : dia === 1 ? (es ? "MAÑANA" : "TOMORROW") : diaCorto(iso, tz, es).toUpperCase());
