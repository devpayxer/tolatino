"use client";
/* Lo que vendes › Tu herramienta de Fiestas («Calendario y depósito»). Diseño: Panel v2 · dash2-cat.js TOOLS['NEG-FIESTA']
   (blocksD, state L193); plan fase4-fiestas-transporte.md §4t y §5. Cada toque se guarda en el servidor (acciones-fiesta.ts)
   y la página y Buscar lo dicen al momento («Libre este sábado»). El calendario es un hueco del diseño (#1 del plan),
   compuesto con chips por fin de semana y un campo para cualquier otra fecha (REVISION). */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { resumenFiesta } from "@/lib/fiestas-comun";
import { fiestaDia, fiestaGuardar, type FiestaIn } from "./acciones-fiesta";
import type { Ctx, Sec } from "./Panel";

const usd = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
const DS = { es: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
const MS = { es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
const lock = (t: string, s: string): Fila => ({ icon: "lock", ibg: "rgba(11,14,18,.06)", ifg: "var(--tl-ink)", t, s, compact: true });
const sumar = (ymd: string, n: number) => { const d = new Date(`${ymd}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/* La fila de Lo que vendes (entre Servicios y Citas). */
export function filaHerramientaFiesta(c: Ctx): Fila | null {
  const h = c.svc?.fiesta, { E2 } = c;
  if (!h) return null;
  return { icon: "calendar", t: E2("Calendario y depósito", "Calendar and deposit"), s: resumenFiesta(h, c.es), tag: E2("TU HERRAMIENTA", "YOUR TOOL"), tone: "action", chev: true, onClick: () => c.go("mod", "herramienta") };
}

export function herramientaFiestaBloques(c: Ctx): Sec {
  const h = c.svc!.fiesta!, { E2, es } = c, cols2 = c.desk ? "repeat(2,minmax(0,1fr))" : undefined;
  const ok = E2("Guardado · tu página ya lo dice.", "Saved · your page says so now.");
  const save = (p: FiestaIn) => c.run(() => fiestaGuardar(c.d.id, p), ok);
  const diaL = (ymd: string) => { const d = new Date(`${ymd}T12:00:00Z`); return es ? `${DS.es[d.getUTCDay()]} ${d.getUTCDate()} ${MS.es[d.getUTCMonth()]}` : `${DS.en[d.getUTCDay()]} ${MS.en[d.getUTCMonth()]} ${d.getUTCDate()}`; };
  // Los fines de semana (vie, sáb, dom) de las próximas 9 semanas: lo que más se aparta.
  const finde: string[] = [];
  for (let i = 0; i < 63; i++) { const d = sumar(h.hoy, i), w = new Date(`${d}T12:00:00Z`).getUTCDay(); if (w === 5 || w === 6 || w === 0) finde.push(d); }
  const est = (d: string) => h.dias.find((x) => x.day === d);
  const otra = (c.ui.fiOtra as string | undefined) ?? "";
  const out: (Bloque | null)[] = [
    { type: "head", eye: E2("LO QUE VENDES · TU HERRAMIENTA", "WHAT YOU SELL · YOUR TOOL"), onBack: () => c.go("mod"), t: E2("Calendario y depósito", "Calendar and deposit"),
      s: E2("Las fechas que ya están tomadas y lo que se deja para apartar una. Tu página dice «Libre el sábado» u «Ocupada» con esto.", "The dates already taken and what it takes to hold one. Your page says “Free on Saturday” or “Booked” from this.") },
    { type: "step", t: E2("Depósito para apartar la fecha", "Deposit to hold the date"), s: E2("Se retiene al pedir y se cobra cuando confirmas. Si no confirmas, se libera completo.", "Held when they ask and charged when you confirm. If you do not confirm, it is fully released."),
      v: h.dep ? usd(h.dep) : E2("Sin depósito", "No deposit"), onM: () => save({ dep: Math.max(0, h.dep - 5000) }), onP: () => save({ dep: Math.min(300000, h.dep + 5000) }) },
    { type: "step", t: E2("Invitados como máximo", "Maximum guests"), s: E2("Si piden más, la app dice «No caben». En 0 no aplica (DJ, fotos…).", "If they ask for more, the app says “Won’t fit”. At 0 it does not apply (DJ, photos…)."),
      v: h.guests ? String(h.guests) : E2("No aplica", "N/A"), onM: () => save({ guests: !h.guests || h.guests <= 10 ? null : h.guests - 10 }), onP: () => save({ guests: Math.min(1000, (h.guests ?? 0) + 10) }) },
    { type: "step", t: E2("Eventos el mismo día", "Events the same day"), s: E2("Cuántas fiestas puedes atender en un día. Al llenarse, la fecha sale ocupada.", "How many parties you can serve in a day. When full, the date shows as booked."),
      v: String(h.perDay), onM: () => save({ perDay: Math.max(1, h.perDay - 1) }), onP: () => save({ perDay: Math.min(20, h.perDay + 1) }) },
    { type: "step", t: E2("Hasta dónde vas", "How far you travel"), s: E2("Millas desde tu dirección. En 0 solo en tu local.", "Miles from your address. At 0 only at your place."),
      v: h.zone ? `${h.zone} mi` : E2("Solo aquí", "Here only"), onM: () => save({ zone: Math.max(0, (h.zone ?? 0) - 5) }), onP: () => save({ zone: Math.min(150, (h.zone ?? 0) + 5) }) },
    { type: "chips", k: E2("SE APARTA EN LA APP HASTA", "BOOKED IN THE APP UP TO"), help: E2("MÁS LEJOS: «LLAMA PARA ESA FECHA»", "FURTHER OUT: “CALL FOR THAT DATE”"),
      items: ([90, 180, 365] as const).map((d) => ({ l: E2(`${d} días`, `${d} days`), v: h.ahead === d ? "selected" : "filter", onClick: () => save({ ahead: d }) })) },
    { type: "group", k: E2("TUS FECHAS · TOCA PARA MARCAR OCUPADA O LIBRE", "YOUR DATES · TAP TO MARK BOOKED OR FREE") },
    { type: "chips", items: finde.map((d) => { const e = est(d), res = e?.reservas.length ?? 0;
      return { l: `${diaL(d)}${res ? ` · ${e!.reservas.map((r) => r.num).join(", ")}` : e?.manual ? E2(" · ocupada", " · booked") : ""}`, v: e?.ocupada ? "selected" : "filter",
        onClick: () => c.run(() => fiestaDia(c.d.id, d, !e?.manual), e?.manual ? E2(`Libre el ${diaL(d)}.`, `Free on ${diaL(d)}.`) : E2(`Ocupada el ${diaL(d)}.`, `Booked on ${diaL(d)}.`)) }; }) },
    { type: "field", k: E2("OTRA FECHA · AAAA-MM-DD", "ANOTHER DATE · YYYY-MM-DD"), val: otra, max: 10, ph: sumar(h.hoy, 90), onChange: (v) => c.setUi({ fiOtra: v.replace(/[^0-9-]/g, "").slice(0, 10) }) },
    { type: "acts", items: [
      { l: E2("Marcar ocupada", "Mark booked"), v: "secondary", icon: "calendar", off: c.pending || !/^\d{4}-\d{2}-\d{2}$/.test(otra), onClick: () => c.run(() => fiestaDia(c.d.id, otra, true), E2("Ocupada.", "Booked."), () => c.setUi({ fiOtra: "" })) },
      { l: E2("Marcar libre", "Mark free"), v: "ghost", icon: "check", off: c.pending || !/^\d{4}-\d{2}-\d{2}$/.test(otra), onClick: () => c.run(() => fiestaDia(c.d.id, otra, false), E2("Libre.", "Free."), () => c.setUi({ fiOtra: "" })) }] },
  ];
  const lejos = h.dias.filter((x) => x.ocupada && !finde.includes(x.day));
  if (lejos.length) out.push({ type: "rows", k: E2("OTRAS FECHAS OCUPADAS", "OTHER BOOKED DATES"), cols: cols2, items: lejos.map((x): Fila => ({ key: x.day, icon: "calendar", t: diaL(x.day), s: x.reservas.length ? x.reservas.map((r) => r.num).join(", ") : E2("Marcada por ti", "Marked by you"), compact: true, chev: false })) });
  out.push({ type: "rows", k: E2("REGLAS · NO SE APAGAN", "RULES · ALWAYS ON"), cols: cols2, items: [
    lock(E2("La fecha no es suya hasta que confirmas", "The date is not theirs until you confirm"), E2("Pedir una fecha no la aparta.", "Asking for a date does not hold it.")),
    lock(E2("Lo que no está escrito, no está incluido", "What is not written is not included"), E2("El paquete dice lo que incluye.", "The package says what it includes.")),
    lock(E2("Una fecha con fiesta no se libera", "A date with a party cannot be freed"), E2("Primero se cancela la fiesta.", "Cancel the party first."))] });
  return { blocks: out, ed: null };
}
