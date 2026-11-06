"use client";
/* Apartados en el panel (4f-3; el diseño no trae esta pantalla del panel: hueco #5 del plan, compuesta con sus bloques).
   Hoy: los que esperan que confirmes (arriba), los que tienes guardados y los recogidos de hoy. El detalle: lo que apartó,
   cuándo pasa y «Lo tengo · guárdalo», «Falta uno» (eliges cuál), «No lo tengo» y, guardado, «Lo recogió». */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { ApartadoFila } from "@/lib/apartados";
import { apartadoAccionPanel } from "./acciones-apartados";
import type { Ctx, Editor } from "./Panel";

type Sec = { blocks: (Bloque | null)[]; ed: Editor | null };
const money = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
const MES = { es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] };
const DIA = { es: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
const hL = (m: number) => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`; };

function cuando(es: boolean, f: string, m: number) { const d = new Date(`${f}T12:00:00Z`); return `${es ? `${DIA.es[d.getUTCDay()]} ${d.getUTCDate()} ${MES.es[d.getUTCMonth()]}` : `${DIA.en[d.getUTCDay()]} ${MES.en[d.getUTCMonth()]} ${d.getUTCDate()}`} · ${hL(m)}`; }

export function hoyApartados(c: Ctx): Bloque[] {
  const { E2, es } = c, L = c.citas?.apartados ?? [];
  if (!L.length) return [];
  const pend = L.filter((x) => x.st === "pending").length;
  return [{ type: "rows", k: `${E2("APARTADOS", "HOLDS")}${pend ? ` · ${pend} ${E2("POR CONFIRMAR", "TO CONFIRM")}` : ""}`, items: L.map((x: ApartadoFila): Fila => ({
    key: x.numero, icon: "bag", t: `${x.cliente} · ${x.n} ${x.n === 1 ? E2("artículo", "item") : E2("artículos", "items")} · ${money(x.tot)}`, s: `#${x.numero} · ${E2("pasa el ", "comes ")}${cuando(es, x.dia, x.hora)}`,
    tag: x.st === "pending" ? E2("CONFIRMA QUE LO TIENES", "CONFIRM STOCK") : x.st === "change_proposed" ? E2("ESPERA AL CLIENTE", "AWAITING CLIENT") : x.st === "confirmed" ? E2("GUARDADO", "HELD") : E2("RECOGIDO", "PICKED UP"),
    tone: x.st === "pending" ? "action" : x.st === "confirmed" ? "signal" : "neutral", chev: true, onClick: () => c.det(`apt:${x.numero}`) })) }];
}

export function apartadoDetalle(c: Ctx): Sec {
  const { E2, es } = c, x = c.citas?.aptDet;
  if (!x) return { blocks: [{ type: "head", t: E2("Apartado no encontrado", "Hold not found"), onBack: c.closeDet }, { type: "empty", icon: "bag", t: E2("Ese apartado no existe", "That hold does not exist"), s: E2("Puede ser de otro negocio.", "It may belong to another business.") }], ed: null };
  const nm = (b: { es: string; en: string }) => (es ? b.es : b.en || b.es), nombre = x.cliente.split(" ")[0];
  const stL = { pending: E2("POR CONFIRMAR", "TO CONFIRM"), change_proposed: E2("FALTA ALGO · ESPERA AL CLIENTE", "ITEM MISSING · AWAITING CLIENT"), confirmed: E2("GUARDADO", "HELD"), declined: E2("NO LO TENÍAS", "NOT IN STOCK"), expired: E2("VENCIÓ", "EXPIRED"), cancelled: E2("CANCELADO", "CANCELLED"), done: E2("RECOGIDO", "PICKED UP") }[x.st];
  const vivas = x.lineas.filter((l) => l.st !== "removed");
  const out: (Bloque | null)[] = [
    { type: "head", eye: `${E2("APARTADO", "HOLD")} · ${stL}`, t: `#${x.numero}`, s: `${x.cliente} · ${money(x.tot)} ${E2("en la caja", "at the register")}`, onBack: c.closeDet },
    { type: "rows", k: E2("LO QUE APARTÓ", "WHAT THEY HELD"), items: vivas.map((l): Fila => ({ key: l.id, ...(l.foto ? { img: `url("${l.foto}")` } : { imgIni: (l.n.es || "?").slice(0, 1) }), imgW: "44px", t: nm(l.n), s: `× ${l.qty} · ${money(l.precio)}`, r: l.st === "out" ? E2("No había", "Out") : money(l.total), tag: l.st === "out" ? E2("FALTA", "MISSING") : null, tone: "danger", chev: false })) },
    { type: "kv", items: [{ k: E2("CLIENTE", "CLIENT"), v: x.cliente }, { k: E2("PASA", "COMES"), v: cuando(es, x.dia, x.hora) }, { k: E2("CÓMO", "HOW"), v: E2("Recoge en la tienda · paga en la caja", "Picks up in store · pays at the register") }] },
    x.nota ? { type: "note", tone: "ink", icon: "bubble", t: `«${x.nota}»` } : null,
  ];
  const acc = (a: Parameters<typeof apartadoAccionPanel>[2], ok: string, after?: () => void) => c.run(() => apartadoAccionPanel(c.d.id, x.numero, a), ok, after);
  if (x.st === "pending") {
    const resp = new Date(x.responde), hh = Math.max(0, Math.round((resp.getTime() - Date.now()) / 60000));
    out.push({ type: "note", tone: "info", icon: "clock", t: E2(`Confirma que lo tienes ${hh >= 60 ? `en las próximas ${Math.floor(hh / 60)} h` : `en ${hh} min`}; si no, vence y ${nombre} lo sabe. Las unidades ya están reservadas.`, `Confirm you have it ${hh >= 60 ? `within ${Math.floor(hh / 60)} h` : `within ${hh} min`}; otherwise it expires and ${nombre} is told. The units are already reserved.`) });
    const eligiendo = !!c.ui.aptF;
    if (!eligiendo) out.push({ type: "acts", items: [
      { l: E2("Lo tengo · guárdalo", "I have it · hold it"), v: "primary", icon: "check", off: c.pending, onClick: () => acc({ que: "tengo" }, E2(`Listo: ${nombre} sabe que se lo guardas 48 horas.`, `Done: ${nombre} knows you hold it 48 hours.`)) },
      ...(vivas.length > 1 ? [{ l: E2("Falta uno", "One is missing"), v: "secondary" as const, icon: "warning", off: c.pending, onClick: () => c.setUi({ aptF: true }) }] : []),
      { l: E2("No lo tengo", "Not in stock"), v: "secondary", icon: "close", off: c.pending, onClick: () => acc({ que: "no" }, E2(`Listo: ${nombre} sabe que no lo tienes.`, `Done: ${nombre} knows you do not have it.`)) }] });
    else {
      out.push({ type: "rows", k: E2("¿QUÉ FALTA?", "WHAT IS MISSING?"), items: vivas.map((l): Fila => ({ key: `f${l.id}`, icon: "warning", t: nm(l.n), s: `× ${l.qty}`, chev: true, onClick: () => acc({ que: "falta", linea: l.id }, E2(`Listo: ${nombre} decide si sigue con lo demás.`, `Done: ${nombre} decides whether to keep the rest.`), () => c.setUi({ aptF: false })) })) });
      out.push({ type: "acts", items: [{ l: E2("Volver", "Back"), v: "secondary", icon: "close", off: c.pending, onClick: () => c.setUi({ aptF: false }) }] });
    }
  } else if (x.st === "confirmed") {
    out.push({ type: "note", tone: "info", icon: "info", t: E2(`Guárdalo hasta ${new Date(x.hasta).toLocaleString("es-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}. Cobras ${money(x.tot)} en la caja. Si no pasa, vuelve solo al estante.`, `Keep it until ${new Date(x.hasta).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}. Collect ${money(x.tot)} at the register. If they do not come, it returns to the shelf on its own.`) });
    out.push({ type: "acts", items: [{ l: E2("Lo recogió", "Picked up"), v: "primary", icon: "check", off: c.pending, onClick: () => acc({ que: "recogio" }, E2("Listo: recogido.", "Done: picked up.")) }] });
  } else if (x.st === "change_proposed") out.push({ type: "note", tone: "info", icon: "clock", t: E2(`${nombre} decide si quita lo que falta y sigue con lo demás, o cancela.`, `${nombre} decides whether to remove the missing item and keep the rest, or cancel.`) });
  else out.push({ type: "note", tone: "info", icon: "info", t: x.st === "done" ? E2(`Recogido · ${money(x.tot)} en la caja.`, `Picked up · ${money(x.tot)} at the register.`) : x.st === "expired" ? E2("Venció: las unidades volvieron al estante.", "Expired: the units went back on the shelf.") : x.st === "declined" ? E2("No lo tenías: esos artículos quedaron en 0 en tu Tienda.", "Not in stock: those items are now at 0 in your Shop.") : E2("Cancelado: las unidades volvieron al estante.", "Cancelled: the units went back on the shelf.") });
  return { blocks: out, ed: null };
}
