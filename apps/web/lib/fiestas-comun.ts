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
