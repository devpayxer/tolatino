"use client";
/* Lo que vendes › Tu herramienta de Transporte. Diseño: Panel v2 · dash2-cat.js TOOLS['NEG-TRANS'] (tT L158, blocksC L405–411); plan
   fase4-fiestas-transporte.md §4w y §5. Por tipo: van «Salidas y asientos» (las salidas de hoy con «No sale hoy», lo vendido en la
   oficina y lo que queda, maletas incluidas y la maleta extra); caja «Salidas de la caja» (qué día sale y cuánto tarda); el resto
   «Disponibilidad y servicio» (disponible hoy, asiento de niño, rampa). REGLAS · NO SE APAGAN con candado. Cada toque se guarda. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { resumenTrans, tituloTrans } from "@/lib/transporte-comun";
import { transFuera, transGuardar, transSalida } from "./acciones-transporte";
import type { Ctx, Sec } from "./Panel";

const usd = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
const hL = (m: number) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")} ${m < 720 ? "AM" : "PM"}`;
const lock = (t: string, s: string): Fila => ({ icon: "lock", ibg: "rgba(11,14,18,.06)", ifg: "var(--tl-ink)", t, s, compact: true });

export function filaHerramientaTrans(c: Ctx): Fila | null {
  const h = c.svc?.trans, { E2 } = c;
  if (!h) return null;
  return { icon: h.kind === "caja" ? "bag" : "truck", t: tituloTrans(h.kind, c.es), s: resumenTrans(h, c.es), tag: E2("TU HERRAMIENTA", "YOUR TOOL"), tone: "action", chev: true, onClick: () => c.go("mod", "herramienta") };
}

export function herramientaTransBloques(c: Ctx): Sec {
  const h = c.svc!.trans!, { E2, es } = c, cols2 = c.desk ? "repeat(2,minmax(0,1fr))" : undefined, nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es);
  const ok = E2("Guardado · tu página ya lo dice.", "Saved · your page says so now.");
  const save = (p: Parameters<typeof transGuardar>[1]) => c.run(() => transGuardar(c.d.id, p), ok);
  const out: (Bloque | null)[] = [
    { type: "head", eye: E2("LO QUE VENDES · TU HERRAMIENTA", "WHAT YOU SELL · YOUR TOOL"), onBack: () => c.go("mod"), t: tituloTrans(h.kind, es),
      s: E2("Lo que el cliente ve antes de reservar: cuándo sales, cuántos asientos quedan y qué incluye el precio.", "What clients see before booking: when you leave, how many seats are left and what the price includes.") },
  ];
  if (h.tieneAsiento) {
    const hoyL = h.cuando === "hoy";
    out.push({ type: "rows", k: hoyL ? E2("PRÓXIMAS SALIDAS DE HOY · TOCA PARA «NO SALE»", "TODAY'S NEXT DEPARTURES · TAP FOR “NOT RUNNING”") : E2("SALIDAS DE MAÑANA · TOCA PARA «NO SALE»", "TOMORROW'S DEPARTURES · TAP FOR “NOT RUNNING”"), cols: cols2, items: h.salidas.map((s): Fila => ({
      key: s.run, icon: "clock", t: `${hL(s.m)} · ${nm(s.svc)}`,
      s: s.cancelada ? (hoyL ? E2("No sale hoy", "Not running today") : E2("No sale mañana", "Not running tomorrow")) : E2(`Quedan ${s.quedan} de ${s.total} · ${s.reservados} en la app · ${s.fuera} en la oficina`, `${s.quedan} of ${s.total} left · ${s.reservados} in the app · ${s.fuera} at the office`),
      tgOn: !s.cancelada, onTg: () => c.run(() => transSalida(c.d.id, s.run, s.cancelada), s.cancelada ? E2("Sale.", "Running.") : E2("No sale: tu página ya lo dice.", "Not running: your page says so.")) })) });
    const vivas = h.salidas.filter((s) => !s.cancelada);
    if (vivas.length) {
      out.push({ type: "group", k: E2("VENDIDOS EN LA OFICINA · SE DESCUENTAN DE LO QUE QUEDA", "SOLD AT THE OFFICE · TAKEN OFF WHAT IS LEFT") });
      for (const s of vivas) out.push({ type: "step", t: `${hL(s.m)} · ${nm(s.svc)}`, s: E2(`Quedan ${s.quedan} en la app`, `${s.quedan} left in the app`), v: String(s.fuera),
        onM: () => c.run(() => transFuera(c.d.id, s.run, -1), E2("Listo.", "Done.")), onP: () => c.run(() => transFuera(c.d.id, s.run, 1), E2("Listo: un asiento menos en la app.", "Done: one seat less in the app.")) });
    }
    out.push({ type: "chips", k: E2("MALETAS INCLUIDAS POR PERSONA", "BAGS INCLUDED PER PERSON"), items: [0, 1, 2, 3].map((n) => ({ l: n ? String(n) : E2("Ninguna", "None"), v: h.bags === n ? "selected" : "filter", onClick: () => save({ bags: n }) })) });
    out.push({ type: "step", t: E2("Maleta extra", "Extra bag"), s: h.extraBag == null ? E2("No vendes maleta extra.", "You do not sell extra bags.") : E2("Se paga al reservar; nada se cobra al subir.", "Paid when booking; nothing is charged when boarding."),
      v: h.extraBag == null ? E2("No", "No") : usd(h.extraBag), onM: () => save({ extraBag: h.extraBag == null || h.extraBag <= 500 ? null : h.extraBag - 500 }), onP: () => save({ extraBag: Math.min(20000, (h.extraBag ?? 0) + 500) }) });
  }
  if (h.kind === "caja") {
    out.push({ type: "chips", k: E2("LA CAJA SALE", "THE BOX SHIPS"), items: ([["sab", E2("El sábado", "Saturday")], ["mie", E2("El miércoles", "Wednesday")], ["15d", E2("Cada 15 días", "Every 2 weeks")]] as const).map(([k, l]) => ({ l, v: h.shipDay === k ? "selected" : "filter", onClick: () => save({ shipDay: k }) })) });
    out.push({ type: "chips", k: E2("LLEGA EN", "ARRIVES IN"), items: ([["2-3", E2("2 a 3 semanas", "2 to 3 weeks")], ["3-4", E2("3 a 4 semanas", "3 to 4 weeks")], ["4-6", E2("4 a 6 semanas", "4 to 6 weeks")]] as const).map(([k, l]) => ({ l, v: h.shipWeeks === k ? "selected" : "filter", onClick: () => save({ shipWeeks: k }) })) });
  }
  out.push({ type: "rows", k: E2("CUÁNDO Y CÓMO ATIENDES", "WHEN AND HOW YOU WORK"), cols: cols2, items: [
    { key: "hoy", icon: "clock", t: E2("Disponible hoy", "Available today"), s: E2("Sale en «Disponible hoy» en Buscar. Se apaga sola a medianoche.", "Shows under “Available today” in Search. Turns off at midnight."), tgOn: h.hoy, onTg: () => save({ hoy: !h.hoy }) },
    { key: "nino", icon: "users", t: E2("Asiento de niño", "Child seat"), s: E2("Tu página y Buscar lo dicen.", "Your page and Search say so."), tgOn: h.nino, onTg: () => save({ nino: !h.nino }) },
    { key: "rampa", icon: "users", t: E2("Rampa para silla de ruedas", "Wheelchair ramp"), s: E2("Tu página y Buscar lo dicen.", "Your page and Search say so."), tgOn: h.rampa, onTg: () => save({ rampa: !h.rampa }) },
  ] });
  out.push({ type: "rows", k: E2("REGLAS · NO SE APAGAN", "RULES · ALWAYS ON"), cols: cols2, items: [
    lock(E2("Precio cerrado antes de salir", "Price fixed before leaving"), E2("Lo que pagan al reservar es todo.", "What they pay when booking is everything.")),
    lock(E2("Cancelar gratis hasta 24 h antes", "Free cancellation up to 24 h before"), E2("Después, se cobra la mitad.", "After that, half is charged.")),
    lock(E2("Si no sales, se devuelve todo", "If you do not run, everything is refunded"), E2("A cada pasajero, con aviso.", "To every passenger, with notice.")),
  ] });
  if (h.forzado) out.push({ type: "note", tone: "info", icon: "info", t: E2("To’Latino ajustó el tipo de tu negocio. Si no es correcto, escríbenos.", "To’Latino adjusted your business type. If it is wrong, write to us.") });
  return { blocks: out, ed: null };
}
