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

/* ── Ficha de Transporte (4x · neg-trans-listing.js priceFor L71–75, listingAdd L77–97) ── */
export type Bi = { es: string; en: string };
export const LINEA_TRANS: Bi = { es: "El precio del viaje es cerrado antes de salir.", en: "The trip price is fixed before you leave." };
export type SvcTrans = { id: string; sec: string | null; name: Bi; desc: Bi; cents: number; k: string; sal: number[]; pax: number | null; child: number | null; to: Bi | null; from: Bi | null;
  dmin: number | null; wait: number | null; inc: Bi[]; foto: string | null;
  // La próxima salida con asientos (por asiento): hora, si es hoy y cuántos quedan (el servidor la calcula).
  prox: { m: number; hoy: boolean; quedan: number } | null };
const m$ = (c: number) => (c % 100 ? `$${(c / 100).toFixed(2)}` : `$${(c / 100).toLocaleString("en-US")}`);
const hT = (m: number) => `${Math.floor(m / 60) % 12 || 12}${m % 60 ? `:${String(m % 60).padStart(2, "0")}` : ""} ${m < 720 ? "AM" : "PM"}`;
export function precioTrans(s: SvcTrans, es: boolean): { l: string; s: string } {
  const E2 = (a: string, b: string) => (es ? a : b);
  if (s.k === "asiento") return { l: m$(s.cents), s: `${E2("POR PERSONA", "PER PERSON")}${s.child ? E2(` · NIÑO ${m$(s.child)}`, ` · CHILD ${m$(s.child)}`) : ""}` };
  if (s.k === "caja") return { l: m$(s.cents), s: E2("POR CAJA O ENVÍO", "PER BOX OR DELIVERY") };
  if (s.k === "cotiza") return { l: `${E2("Desde ", "From ")}${m$(s.cents)}`, s: E2("CERRADO CON FOTOS", "FIXED FROM PHOTOS") };
  return { l: m$(s.cents), s: s.pax ? E2(`HASTA ${s.pax} ${s.pax === 1 ? "PERSONA" : "PERSONAS"}`, `UP TO ${s.pax} ${s.pax === 1 ? "PERSON" : "PEOPLE"}`) : "" };
}
export function metaTrans(s: SvcTrans, es: boolean): string {
  const E2 = (a: string, b: string) => (es ? a : b), a: string[] = [];
  if (s.k === "asiento") {
    if (s.sal.length) a.push(`${E2("SALE ", "DEPARTS ")}${s.sal.map((h) => hT(h * 60)).join(" · ")}`);
    if (s.prox) a.push(s.prox.quedan ? `${s.prox.hoy ? E2("HOY ", "TODAY ") : E2("MAÑANA ", "TOMORROW ")}${hT(s.prox.m)} · ${E2(`QUEDAN ${s.prox.quedan}`, `${s.prox.quedan} LEFT`)}` : E2("LLENO", "FULL"));
  }
  if (s.k === "priv" && s.wait && !s.inc.some((z) => /espera|wait/i.test(z.es))) a.push(E2(`ESPERA ${s.wait >= 60 ? `${s.wait / 60} H` : `${s.wait} MIN`}`, `${s.wait >= 60 ? `${s.wait / 60} H` : `${s.wait} MIN`} WAIT`));
  if (s.inc.length) a.push(`${E2("INCLUYE ", "INCLUDES ")}${s.inc.slice(0, 3).map((z) => (es ? z.es : z.en || z.es)).join(" · ")}`);
  return a.join(" · ").toUpperCase();
}
/* La licencia que hace falta para reservar en la app según el tipo (Preguntas #9). Sin requisito: mensajería, grúa, renta. */
export const LIC_TRANS: Partial<Record<KindTrans, string[]>> = { van: ["fmcsa_mc", "pa_puc"], air: ["pa_puc"], taxi: ["pa_puc"], med: ["pa_puc"], emp: ["pa_puc"], mud: ["pa_puc", "fmcsa_mc"], caja: ["fmc_oti"], cdl: ["usdot"], escolar: ["act_menores"] };
