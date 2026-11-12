/* 9b-1 · «Hoy» (y cualquier fecha de calendario) en la zona de la ciudad, nunca en UTC. `new Date().toISOString().slice(0, 10)` es la fecha
   de Greenwich: en Hazleton, de las 7 u 8 PM a la medianoche ya es «mañana» (wal8g lo cazó: un certificado que vence en 10 días decía 11 de
   noche; los filtros «Libre este sábado» y «Disponible hoy» se recalculaban a las 7 PM y no a la medianoche). Guardián hoyEnLaCiudad. */
export const ZONA_CIUDADES = "America/New_York";
export function hoyEn(zona: string = ZONA_CIUDADES, d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
