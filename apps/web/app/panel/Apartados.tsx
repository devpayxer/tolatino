"use client";
/* Apartados en el panel (4f-3; el diseño no trae esta pantalla del panel: hueco #5 del plan, compuesta con sus bloques).
   Hoy: los que esperan que confirmes (arriba), los que tienes guardados y los recogidos de hoy. El detalle: lo que apartó,
   cuándo pasa y «Lo tengo · guárdalo», «Falta uno» (eliges cuál), «Falta esa talla» (ofreces la de al lado al mismo precio),
   «No lo tengo» y, guardado, «Lo recogió». Las horas que guardas salen de Tu herramienta (Tiendas: 24/48/72). */
import { ayudaCita } from "./Citas";
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
    key: x.numero, icon: "bag", t: `${x.cliente} · ${x.n} ${x.n === 1 ? E2("artículo", "item") : E2("artículos", "items")} · ${money(x.tot)}`, s: `#${x.numero} · ${x.ship ? E2("envío a su casa", "ship to home") : `${E2("pasa el ", "comes ")}${cuando(es, x.dia, x.hora)}`}`,
    tag: x.plan && x.st === "confirmed" ? (x.plan === "late" ? E2("PLAN · ATRASADO", "PLAN · LATE") : x.plan === "paid" ? E2("PAGADO · POR RECOGER", "PAID · TO PICK UP") : E2("EN PLAN", "ON LAYAWAY")) : x.st === "pending" ? E2("CONFIRMA QUE LO TIENES", "CONFIRM STOCK") : x.st === "change_proposed" ? E2("ESPERA AL CLIENTE", "AWAITING CLIENT") : x.ship ? (x.st === "confirmed" ? (x.etapa === "on_the_way" ? E2("EN CAMINO", "SHIPPED") : E2("POR ENVIAR", "TO SHIP")) : E2("ENTREGADO", "DELIVERED")) : x.st === "confirmed" ? E2("GUARDADO", "HELD") : E2("RECOGIDO", "PICKED UP"),
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
    { type: "rows", k: E2("LO QUE APARTÓ", "WHAT THEY HELD"), items: vivas.map((l): Fila => ({ key: l.id, ...(l.foto ? { img: `url("${l.foto}")` } : { imgIni: (l.n.es || "?").slice(0, 1) }), imgW: "44px", t: nm(l.n), s: `${l.talla ? `${E2("Talla", "Size")} ${l.talla} · ` : ""}× ${l.qty} · ${money(l.precio)}`, r: l.st === "out" ? (l.otra ? `${E2("Ofreciste la ", "Offered ")}${l.otra.label}` : E2("No había", "Out")) : money(l.total), tag: l.st === "out" ? E2("FALTA", "MISSING") : null, tone: "danger", chev: false })) },
    { type: "kv", items: x.ship ? [{ k: E2("CLIENTE", "CLIENT"), v: x.cliente }, { k: E2("ENVÍO A", "SHIP TO"), v: x.to ?? "—" }, { k: E2("ENVÍO", "SHIPPING"), v: x.envio ? money(x.envio) : E2("Gratis", "Free") }, { k: E2("PAGO", "PAYMENT"), v: x.cobrado != null ? `${E2("Cobrado ", "Charged ")}${money(x.cobrado)}` : `${E2("Retenido ", "Held ")}${money(x.retenido ?? x.tot)} · ${E2("se cobra al enviarlo", "charged when it ships")}` }]
      : [{ k: E2("CLIENTE", "CLIENT"), v: x.cliente }, { k: E2("PASA", "COMES"), v: cuando(es, x.dia, x.hora) }, { k: E2("CÓMO", "HOW"), v: E2("Recoge en la tienda · paga en la caja", "Picks up in store · pays at the register") }] },
    x.nota ? { type: "note", tone: "ink", icon: "bubble", t: `«${x.nota}»` } : null,
  ];
  const acc = (a: Parameters<typeof apartadoAccionPanel>[2], ok: string, after?: () => void) => c.run(() => apartadoAccionPanel(c.d.id, x.numero, a), ok, after);
  if (x.st === "pending") {
    const resp = new Date(x.responde), hh = Math.max(0, Math.round((resp.getTime() - Date.now()) / 60000));
    out.push({ type: "note", tone: "info", icon: "clock", t: E2(`Confirma que lo tienes ${hh >= 60 ? `en las próximas ${Math.floor(hh / 60)} h` : `en ${hh} min`}; si no, vence y ${nombre} lo sabe. Las unidades ya están reservadas.`, `Confirm you have it ${hh >= 60 ? `within ${Math.floor(hh / 60)} h` : `within ${hh} min`}; otherwise it expires and ${nombre} is told. The units are already reserved.`) });
    const eligiendo = !!c.ui.aptF && !x.plan, conTalla = x.plan ? [] : vivas.filter((l) => l.talla && l.alt.length), tl = conTalla.find((l) => l.id === c.ui.aptT);
    if (x.plan) out.push({ type: "note", tone: "info", icon: "info", t: E2(`Es un plan: al confirmar se cobra el abono de ${money(x.plan.abono)} y empieza el calendario (${x.plan.n} pagos cada ${x.plan.cada} días). Guárdalo mientras paga.`, `It is a layaway: confirming charges the ${money(x.plan.abono)} down payment and starts the schedule (${x.plan.n} payments every ${x.plan.cada} days). Keep it while they pay.`) });
    if (c.ui.aptT === "?" || tl) {
      // «Falta esa talla»: primero qué artículo (si hay varios) y luego qué talla ofreces; el cliente decide.
      if (!tl) out.push({ type: "rows", k: E2("¿QUÉ TALLA FALTA?", "WHICH SIZE IS OUT?"), items: conTalla.map((l): Fila => ({ key: `t${l.id}`, icon: "warning", t: `${nm(l.n)} · ${l.talla}`, s: `× ${l.qty}`, chev: true, onClick: () => c.setUi({ aptT: l.id }) })) });
      else out.push({ type: "rows", k: `${E2("OFRECER OTRA TALLA · ", "OFFER ANOTHER SIZE · ")}${nm(tl.n).toUpperCase()}`, items: tl.alt.map((v): Fila => ({ key: `v${v.id}`, icon: "bag", t: `${E2("Talla", "Size")} ${v.label}`, s: `${E2("Quedan ", "")}${v.quedan}${E2("", " left")} · ${E2("mismo precio", "same price")}`, chev: true,
        onClick: () => acc({ que: "talla", linea: tl.id, variante: v.id }, E2(`Listo: ${nombre} decide si quiere la ${v.label}.`, `Done: ${nombre} decides whether to take ${v.label}.`), () => c.setUi({ aptT: null })) })) });
      out.push({ type: "acts", items: [{ l: E2("Volver", "Back"), v: "secondary", icon: "close", off: c.pending, onClick: () => c.setUi({ aptT: null }) }] });
    } else if (!eligiendo) out.push({ type: "acts", items: [
      { l: E2("Lo tengo · guárdalo", "I have it · hold it"), v: "primary", icon: "check", off: c.pending, onClick: () => acc({ que: "tengo" }, E2(`Listo: ${nombre} sabe que se lo guardas ${x.horas} horas.`, `Done: ${nombre} knows you hold it ${x.horas} hours.`)) },
      ...(conTalla.length ? [{ l: E2("Falta esa talla · ofrecer otra", "Size is out · offer another"), v: "secondary" as const, icon: "warning", off: c.pending, onClick: () => c.setUi({ aptT: conTalla.length === 1 ? conTalla[0]!.id : "?" }) }] : []),
      ...(vivas.length > 1 && !x.plan ? [{ l: E2("Falta uno", "One is missing"), v: "secondary" as const, icon: "warning", off: c.pending, onClick: () => c.setUi({ aptF: true }) }] : []),
      { l: E2("No lo tengo", "Not in stock"), v: "secondary", icon: "close", off: c.pending, onClick: () => acc({ que: "no" }, E2(`Listo: ${nombre} sabe que no lo tienes.`, `Done: ${nombre} knows you do not have it.`)) }] });
    else {
      out.push({ type: "rows", k: E2("¿QUÉ FALTA?", "WHAT IS MISSING?"), items: vivas.map((l): Fila => ({ key: `f${l.id}`, icon: "warning", t: nm(l.n), s: `× ${l.qty}`, chev: true, onClick: () => acc({ que: "falta", linea: l.id }, E2(`Listo: ${nombre} decide si sigue con lo demás.`, `Done: ${nombre} decides whether to keep the rest.`), () => c.setUi({ aptF: false })) })) });
      out.push({ type: "acts", items: [{ l: E2("Volver", "Back"), v: "secondary", icon: "close", off: c.pending, onClick: () => c.setUi({ aptF: false }) }] });
    }
  } else if (x.st === "confirmed" && x.plan && x.plan.st !== "paid") {
    // Layaway vivo: lo pagado, lo que falta, el próximo pago; «Pagó en la tienda» y, con 14 días de atraso, cancelar el plan.
    const p = x.plan, f = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(es ? "es-US" : "en-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short" }) : "—");
    out.push({ type: "kv", items: [{ k: E2("PLAN", "PLAN"), v: `${money(p.pagado)} ${E2("de", "of")} ${money(p.total)}` }, { k: E2("FALTA", "LEFT"), v: money(p.falta) }, { k: E2("PRÓXIMO PAGO", "NEXT PAYMENT"), v: p.siguiente ? `${money(p.siguiente.monto)} · ${f(p.siguiente.vence)}${p.siguiente.st === "late" ? E2(" · ATRASADO", " · LATE") : ""}` : "—" }] });
    out.push({ type: "rows", k: E2("PAGOS", "PAYMENTS"), items: p.pagos.map((z): Fila => ({ key: `lp${z.seq}`, icon: z.st === "paid" || z.st === "waived" ? "check" : z.st === "late" ? "warning" : "clock", t: z.seq === 0 ? E2("Abono", "Down payment") : `${E2("Pago", "Payment")} ${z.seq}`, s: z.st === "paid" || z.st === "waived" ? `${f(z.pagado)} · ${z.donde === "store" ? E2("en la tienda", "at the store") : E2("en la app", "in the app")}` : f(z.vence), r: money(z.monto), tag: z.st === "late" ? E2("ATRASADO", "LATE") : null, tone: "danger", chev: false })) });
    out.push({ type: "acts", items: [
      ...(p.siguiente ? [{ l: `${E2("Pagó en la tienda", "Paid at the store")} · ${money(p.siguiente.monto)}`, v: "primary" as const, icon: "check", off: c.pending, onClick: () => acc({ que: "pagoTienda" }, E2("Listo: pago anotado.", "Done: payment recorded.")) }] : []),
      ...(p.puedeCancelarTienda ? [{ l: E2("Cancelar el plan", "Cancel the plan"), v: "secondary" as const, icon: "close", off: c.pending, onClick: () => acc({ que: "cancelarPlan" }, E2(`Listo: plan cancelado. Se devuelven ${money(p.siCancela.app)} por la tarjeta${p.siCancela.tienda ? `; tú devuelves ${money(p.siCancela.tienda)} de lo pagado en la tienda` : ""}.`, `Done: plan cancelled. ${money(p.siCancela.app)} goes back to the card${p.siCancela.tienda ? `; you return ${money(p.siCancela.tienda)} paid at the store` : ""}.`)) }] : [])] });
    if (!p.puedeCancelarTienda && p.st === "late") out.push({ type: "note", tone: "info", icon: "clock", t: E2(`Lleva ${p.atrasoDias} días de atraso. Con 14 puedes cancelar el plan (te quedas con el ${p.cargo} % de lo abonado).`, `${p.atrasoDias} days late. At 14 you can cancel the plan (you keep ${p.cargo}% of what was paid).`) });
  } else if (x.st === "confirmed" && x.ship) {
    // Envío de la tienda: «Enviado» (con el enlace de seguimiento si tienes) cobra lo que va; después «Entregado».
    if (x.etapa !== "on_the_way") {
      const key = `aptT:${x.numero}`, val = (c.ui[key] as string | undefined) ?? "";
      out.push({ type: "note", tone: "info", icon: "info", t: E2(`Envíalo antes de ${new Date(x.hasta).toLocaleString("es-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short" })}. Al marcarlo «Enviado» se cobran ${money(Math.min(x.tot, x.retenido ?? x.tot))} en la tarjeta de ${nombre}. Si no lo envías a tiempo, se libera.`, `Ship it before ${new Date(x.hasta).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short" })}. Marking it “Shipped” charges ${money(Math.min(x.tot, x.retenido ?? x.tot))} to ${nombre}’s card. If you do not ship in time, it is released.`) });
      out.push({ type: "field", k: E2("ENLACE DE SEGUIMIENTO (OPCIONAL)", "TRACKING LINK (OPTIONAL)"), val, ph: "https://", max: 300, onChange: (v: string) => c.setUi({ [key]: v }), help: E2("USPS, UPS, FedEx… El cliente lo ve en su pedido.", "USPS, UPS, FedEx… The client sees it in their order.") });
      out.push({ type: "acts", items: [{ l: E2("Enviado", "Shipped"), v: "primary", icon: "check", off: c.pending, onClick: () => acc({ que: "enviado", track: val.trim() || null }, E2(`Listo: enviado y cobrado. ${nombre} lo sabe.`, `Done: shipped and charged. ${nombre} knows.`)) }] });
    } else {
      out.push({ type: "note", tone: "info", icon: "info", t: x.track ? E2(`En camino · ${x.track}`, `On its way · ${x.track}`) : E2("En camino.", "On its way.") });
      out.push({ type: "acts", items: [{ l: E2("Entregado", "Delivered"), v: "primary", icon: "check", off: c.pending, onClick: () => acc({ que: "entregado" }, E2("Listo: entregado.", "Done: delivered.")) }] });
    }
  } else if (x.st === "confirmed" && x.plan) {
    out.push({ type: "note", tone: "info", icon: "check", t: E2(`Terminó de pagar el plan (${money(x.plan.total)}). Entrégaselo cuando pase.`, `The plan is fully paid (${money(x.plan.total)}). Hand it over when they come.`) });
    out.push({ type: "acts", items: [{ l: E2("Lo recogió", "Picked up"), v: "primary", icon: "check", off: c.pending, onClick: () => acc({ que: "recogio" }, E2("Listo: recogido.", "Done: picked up.")) }] });
  } else if (x.st === "confirmed") {
    out.push({ type: "note", tone: "info", icon: "info", t: E2(`Guárdalo hasta ${new Date(x.hasta).toLocaleString("es-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}. Cobras ${money(x.tot)} en la caja. Si no pasa, vuelve solo al estante.`, `Keep it until ${new Date(x.hasta).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}. Collect ${money(x.tot)} at the register. If they do not come, it returns to the shelf on its own.`) });
    out.push({ type: "acts", items: [{ l: E2("Lo recogió", "Picked up"), v: "primary", icon: "check", off: c.pending, onClick: () => acc({ que: "recogio" }, E2("Listo: recogido.", "Done: picked up.")) }] });
  } else if (x.st === "change_proposed") { const o = x.lineas.find((l) => l.st === "out" && l.otra); out.push({ type: "note", tone: "info", icon: "clock", t: o ? E2(`${nombre} decide si quiere la talla ${o.otra!.label} (no la apartes todavía), la quita o cancela. Tiene 24 horas.`, `${nombre} decides whether to take size ${o.otra!.label} (do not set it aside yet), remove it or cancel. They have 24 hours.`) : E2(`${nombre} decide si quita lo que falta y sigue con lo demás, o cancela.`, `${nombre} decides whether to remove the missing item and keep the rest, or cancel.`) }); }
  else out.push({ type: "note", tone: "info", icon: "info", t: x.st === "done" ? E2(`Recogido · ${money(x.tot)} en la caja.`, `Picked up · ${money(x.tot)} at the register.`) : x.st === "expired" ? E2("Venció: las unidades volvieron al estante.", "Expired: the units went back on the shelf.") : x.st === "declined" ? E2("No lo tenías: esos artículos quedaron en 0 en tu Tienda.", "Not in stock: those items are now at 0 in your Shop.") : E2("Cancelado: las unidades volvieron al estante.", "Cancelled: the units went back on the shelf.") });
  out.push(...ayudaCita(c, x.numero, nombre ?? x.cliente));
  return { blocks: out, ed: null };
}
