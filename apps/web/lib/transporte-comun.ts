/* Tu herramienta de Transporte (4w · fase4-fiestas-transporte.md §4w y §5 · dash2-cat.js TOOLS['NEG-TRANS'], tT L158, state L194,
   summary L324–325): tipos y textos que comparten el servidor, el panel y el Super Admin (sin acceso a la base). */
export type KindTrans = "van" | "air" | "caja" | "mud" | "med" | "emp" | "taxi" | "courier" | "cdl" | "grua" | "renta" | "escolar";
export type SalidaHoy = { run: string; item: string; svc: { es: string; en: string }; m: number; total: number; fuera: number; reservados: number; quedan: number; cancelada: boolean; futura: boolean };
export type HerrTrans = {
  kind: KindTrans; forzado: boolean; bags: number; extraBag: number | null; hoy: boolean; nino: boolean; rampa: boolean;
  shipDay: "sab" | "mie" | "15d" | null; shipWeeks: "2-3" | "3-4" | "4-6" | null; salidas: SalidaHoy[]; tieneAsiento: boolean; fecha: string;
  // Las próximas salidas: las de hoy que faltan; si ya salieron todas, las de mañana.
  cuando: "hoy" | "manana";
};
/* El título de Tu herramienta según el tipo (tT): van «Salidas y asientos», caja «Salidas de la caja», el resto «Disponibilidad y servicio». */
export const tituloTrans = (k: KindTrans, es: boolean) => (k === "van" ? (es ? "Salidas y asientos" : "Departures and seats") : k === "caja" ? (es ? "Salidas de la caja" : "Box departures") : es ? "Disponibilidad y servicio" : "Availability and service");
const SALE: Record<string, [string, string]> = { sab: ["el sábado", "on Saturday"], mie: ["el miércoles", "on Wednesday"], "15d": ["cada 15 días", "every 2 weeks"] };
/* La línea de Lo que vendes y del 360 del Super Admin (summary L324–325). */
export function resumenTrans(h: HerrTrans, es: boolean): string {
  const E2 = (a: string, b: string) => (es ? a : b);
  if (h.kind === "van" || h.tieneAsiento) {
    const vivas = h.salidas.filter((s) => !s.cancelada), quedan = vivas.reduce((n, s) => n + s.quedan, 0);
    const H = h.cuando === "hoy";
    return [H ? E2(`${vivas.length} salidas más hoy`, `${vivas.length} more departures today`) : E2(`${vivas.length} salidas mañana`, `${vivas.length} departures tomorrow`), H ? E2(`${quedan} asientos libres hoy`, `${quedan} seats left today`) : E2(`${quedan} asientos libres mañana`, `${quedan} seats left tomorrow`), h.bags ? E2(`${h.bags} maletas incluidas`, `${h.bags} bags included`) : ""].filter(Boolean).join(" · ");
  }
  return [h.kind === "caja" && h.shipDay ? `${E2("Sale ", "Ships ")}${SALE[h.shipDay]![es ? 0 : 1]}${h.shipWeeks ? E2(` · llega en ${h.shipWeeks.replace("-", " a ")} semanas`, ` · arrives in ${h.shipWeeks.replace("-", " to ")} weeks`) : ""}` : "",
    h.hoy ? E2("disponible hoy", "available today") : "", h.nino ? E2("asiento de niño", "child seat") : "", h.rampa ? E2("rampa", "ramp") : ""].filter(Boolean).join(" · ") || E2("Sin ajustes todavía", "No settings yet");
}
