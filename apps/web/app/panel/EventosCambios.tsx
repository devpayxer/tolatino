"use client";
/* 6e · Panel › Eventos › la ficha: cambios del evento y su dinero (Panel negocio v2.dc.html evView L2940: VENTA «Vendiendo / Venta pausada»,
   «Cambiar fecha u hora», «Cancelar evento» con QUÉ CANCELAS · ¿POR QUÉ? LO VEN LOS QUE IBAN · «Devolvemos $X completo a los N que
   compraron…» · «Sí, cancelar el evento» / «No cancelar», AVISOS A LOS QUE VAN con IDEAS y «Enviar a N personas», el aviso «Cambiaste la
   fecha (antes: …)», DINERO «Te llega · A tu banco el martes después del evento») y Panel › Cobros › PAGOS DE EVENTOS (por fecha: próxima ·
   pendiente · retenida con su motivo · en camino · pagada el martes). Compuesto con los bloques del panel (rows, chips, note, field, step,
   cal, acts, kv). Los montos son los del servidor (lib/evt-liquidacion.ts): esta pantalla no calcula dinero. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { bi, diaCorto, dinero, hora, type BorradorEvt } from "@/lib/evt-comun";
import type { EvtPanel } from "@/lib/evt";
import type { FilaLiq } from "@/lib/evt-liquidacion";
import { evtAvisar, evtCancelar, evtMover, evtPausar } from "./acciones-eventos";
import { calendario } from "./EventosPanel";
import type { Ctx } from "./Panel";

const MOTIVOS: [string, string, string][] = [["clima", "Mal tiempo", "Bad weather"], ["artista", "El artista no puede venir", "The artist cannot come"], ["local", "Problema en el local", "Problem at the venue"], ["planes", "Cambio de planes", "Change of plans"]];
const IDEAS: [string, string][] = [["Abrimos puertas 30 min antes.", "Doors open 30 min early."], ["Estacionamiento gratis detrás del local.", "Free parking behind the venue."], ["Esta noche hay artista invitado.", "Special guest tonight."]];
const fechaPago = (iso: string, es: boolean) => diaCorto(iso, es);
const cuando = (c: Ctx, iso: string) => new Date(iso).toLocaleString(c.es ? "es-US" : "en-US", { timeZone: c.d.hoy.tz, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/* Una fila de dinero de una fecha (la usan la ficha y Cobros). */
export function filaLiq(c: Ctx, x: FilaLiq, conEvento: boolean): Fila {
  const { E2, es } = c;
  const ST: Record<FilaLiq["st"], [string, string, string]> = {
    proxima: [E2("PRÓXIMA", "UPCOMING"), "neutral", E2(`Se paga el ${fechaPago(x.payOn, es)}`, `Paid on ${fechaPago(x.payOn, es)}`)],
    pendiente: [E2("PENDIENTE", "PENDING"), "action", E2(`Se paga el ${fechaPago(x.payOn, es)}`, `Paid on ${fechaPago(x.payOn, es)}`)],
    retenida: [E2("RETENIDA", "HELD"), "danger", x.motivo ? bi(x.motivo, es) : E2("Retenida", "Held")],
    pagando: [E2("EN CAMINO", "ON ITS WAY"), "action", E2("La transferencia va en camino a tu banco.", "The transfer is on its way to your bank.")],
    pagada: [E2("PAGADA", "PAID"), "signal", x.pagada ? E2(`Pagada el ${cuando(c, x.pagada)}`, `Paid on ${cuando(c, x.pagada)}`) : E2("Pagada", "Paid")],
    revertida: [E2("AJUSTADA", "ADJUSTED"), "neutral", E2("Se revirtió por una devolución después de pagar.", "Reversed for a refund after payout.")],
  };
  const [tag, tone, que] = ST[x.st];
  const partes = [`${E2("Bruto", "Gross")} ${dinero(x.bruto)}`, `${E2("comisión", "fee")} −${dinero(x.comision)}`, ...(x.devuelto ? [`${E2("devuelto", "refunded")} −${dinero(x.devuelto)}`] : []),
    ...(x.disputa ? [`${E2("disputas", "disputes")} −${dinero(x.disputa)}`] : []), ...(x.descontado ? [`${E2("ajuste anterior", "earlier adjustment")} −${dinero(x.descontado)}`] : [])];
  return { key: `liq${x.fecha}`, icon: x.st === "retenida" ? "lock" : "dollar", t: `${conEvento ? `${bi(x.evento, es)} · ` : ""}${diaCorto(x.dia, es)} · ${hora(x.h0)}${x.cancelada ? E2(" · cancelada", " · cancelled") : ""}`,
    s: `${que} · ${partes.join(" · ")}`, r: dinero(x.neto), tag, tone, chev: false };
}

/* DINERO DEL EVENTO (por fecha) en la ficha. */
function dineroBloques(c: Ctx): Bloque[] {
  const { E2 } = c, L = c.evt!.liq;
  if (!L || !L.filas.length) return [];
  return [
    { type: "rows", k: E2("DINERO DEL EVENTO · POR FECHA", "EVENT MONEY · BY DATE"), link: E2("Cobros", "Payouts"), onLink: () => c.go("pay"), items: L.filas.map((x) => filaLiq(c, x, false)) },
    { type: "note", tone: "ink", icon: "wallet", t: E2(`Te llega a tu banco el martes después de cada fecha: lo cobrado menos la comisión de To’Latino y lo devuelto. Con una disputa abierta, esa fecha espera a que se cierre.${L.deuda ? ` Se descuentan ${dinero(L.deuda)} de devoluciones de fechas ya pagadas.` : ""}`,
      `It reaches your bank the Tuesday after each date: what was charged minus To’Latino’s fee and refunds. With an open dispute, that date waits until it closes.${L.deuda ? ` ${dinero(L.deuda)} from refunds on dates already paid is deducted.` : ""}`) },
  ];
}

/* La ficha: estado de los cambios, VENTA, cambiar fecha u hora, cancelar, avisos y el dinero por fecha. */
export function cambiosBloques(c: Ctx, e: EvtPanel, v: BorradorEvt): (Bloque | null)[] {
  const { E2, es, ui } = c, X = c.evt!, K = X.cambios, out: (Bloque | null)[] = [];
  if (!K) return out;
  const tix = v.entrada === "tickets", live = e.st === "live" || e.st === "paused";
  // 6f · En una serie, «esta fecha» es la FECHA QUE ESTÁS VIENDO (cambiar u cancelar solo esa); en varios días, se cancela entero.
  const vivas = K.fechas.filter((f) => f.st === "scheduled" && !f.empezo), proxima = vivas.find((f) => f.id === X.fver) ?? vivas[0];
  // Lo que pasó.
  if (K.cancelacion) {
    const x = K.cancelacion;
    out.push({ type: "note", tone: "danger", icon: "ban", t: E2(`Cancelado · ${x.motivo}. ${tix ? `Devolvemos todo a cada comprador en 3–5 días hábiles: ${x.ordenes} ${x.ordenes === 1 ? "orden devuelta" : "órdenes devueltas"} (${dinero(x.devuelto)})${x.st === "running" || x.pendientes ? "; lo que falta sigue solo, sin que hagas nada" : ""}.` : "Avisamos a los que iban."}`,
      `Cancelled · ${MOTIVOS.find((m) => m[1] === x.motivo)?.[2] ?? x.motivo}. ${tix ? `Every buyer gets a full refund in 3–5 business days: ${x.ordenes} ${x.ordenes === 1 ? "order refunded" : "orders refunded"} (${dinero(x.devuelto)})${x.st === "running" || x.pendientes ? "; the rest continues on its own, nothing to do" : ""}.` : "We notified everyone going."}`) });
  }
  if (K.congelado) out.push({ type: "note", tone: "danger", icon: "lock", t: E2(`To’Latino congeló la venta: ${K.congelado}. Los que compraron entran igual.`, `To’Latino froze sales: ${K.congelado}. Buyers still get in.`) });
  else if (e.st === "paused") out.push({ type: "note", tone: "warn", icon: "clock", t: E2("Venta pausada: la página dice «Venta pausada». Los que ya compraron entran igual.", "Sales paused: the page says “Sales paused”. Buyers still get in.") });
  const mov = K.cambios.find((x) => x.kind === "moved" || x.kind === "time_changed");
  if (mov && live && proxima && mov.antes) out.push({ type: "note", tone: "info", icon: "calendar", t: E2(`Cambiaste la fecha (antes: ${mov.antes}). Avisamos a los que van; quien no pueda ir pide devolución completa.${K.eleccion ? ` ${K.eleccion.keep} se quedan · ${K.eleccion.refund} pidieron devolución · ${K.eleccion.sin} sin responder (se quedan).` : ""}`,
    `You changed the date (was: ${mov.antes}). We told everyone going; anyone who cannot go gets a full refund.${K.eleccion ? ` ${K.eleccion.keep} keep it · ${K.eleccion.refund} asked for a refund · ${K.eleccion.sin} no answer (they keep it).` : ""}`) });
  out.push(...dineroBloques(c));
  // Sin fechas por delante (ya pasó o se canceló) no hay nada que pausar, mover, cancelar ni avisar.
  if (!live || X.org.bloqueado || !proxima) return out;

  // AVISOS A LOS QUE VAN (push y en la app; nunca SMS: §6 #7).
  const op = ui.evMsg === e.id, T0 = String(ui.evMsgT ?? ""), quedan = Math.max(0, K.avisoMax - K.avisos.length);
  out.push({ type: "rows", k: E2(`AVISOS A LOS QUE VAN · ${K.avisos.length} DE ${K.avisoMax}`, `NOTICES TO ATTENDEES · ${K.avisos.length} OF ${K.avisoMax}`), link: quedan ? (op ? E2("Cerrar", "Close") : E2("Escribir aviso", "Write a notice")) : undefined,
    onLink: () => c.setUi({ evMsg: op ? null : e.id, evMsgT: "" }),
    items: K.avisos.length ? K.avisos.map((m, i) => ({ key: `av${i}`, icon: "bell", t: m.t, s: E2(`A ${m.n} personas · ${cuando(c, m.at)}`, `To ${m.n} people · ${cuando(c, m.at)}`), compact: true, chev: false }))
      : [{ key: "av", icon: "bell", t: E2("Sin avisos", "No notices"), s: E2("Cambio de hora, artista invitado, estacionamiento: les llega en la app y sale primero en «Antes de ir».", "Time change, guest artist, parking: they get it in the app and it shows first in “Before you go”."), compact: true, chev: false }] });
  if (op) out.push({ type: "chips", k: E2("IDEAS", "IDEAS"), items: IDEAS.map(([a, b]) => ({ l: E2(a, b), v: T0 === E2(a, b) ? "selected" : "filter", onClick: () => c.setUi({ evMsgT: E2(a, b) }) })) },
    { type: "field", k: E2("EL AVISO", "THE NOTICE"), area: true, rows: 3, val: T0, ph: E2("En pocas palabras.", "Keep it short."), count: `${T0.length}/160`, onChange: (x) => c.setUi({ evMsgT: x.slice(0, 160) }) },
    { type: "acts", items: [{ l: K.van ? E2(`Enviar a ${K.van} personas`, `Send to ${K.van} people`) : E2("Aún no va nadie", "Nobody is going yet"), v: "primary", icon: "bubble", off: c.pending || T0.trim().length < 5 || !K.van,
      onClick: () => c.run(() => evtAvisar(c.d.id, e.id, T0), (r) => E2(`Aviso enviado a ${r?.n ?? 0} personas en la app. También sale en la página del evento.`, `Notice sent to ${r?.n ?? 0} people in the app. It also shows on the event page.`), () => c.setUi({ evMsg: null, evMsgT: "" })) }] });

  // VENTA (solo con boletos): pausar / reanudar.
  if (tix) out.push({ type: "rows", k: E2("VENTA", "SALES"), items: [{ key: "venta", icon: "ticket", t: e.st === "paused" ? E2("Venta pausada", "Sales paused") : E2("Vendiendo", "Selling"),
    s: e.st === "paused" ? E2("La página dice «Venta pausada». Los que compraron entran igual.", "The page says “Sales paused”. Buyers still get in.") : E2("Páusala si se llenó el local o hay un problema.", "Pause it if the place is full or there is a problem."),
    tgOn: e.st !== "paused", chev: false, onTg: () => c.run(() => evtPausar(c.d.id, e.id, e.st !== "paused"), e.st === "paused" ? E2("Venta abierta otra vez.", "Sales open again.") : E2("Venta pausada.", "Sales paused.")) }] });

  // Cambiar fecha u hora (una fecha que no empezó).
  if (ui.evMv === e.id && proxima) {
    const Fm = c.form<BorradorEvt & { enviar: boolean }>(`det:evmv:${e.id}`, { ...v, dia: proxima.dia, h0: proxima.h0, h1: proxima.h1, enviar: false, rep: { k: "none", days: [], n: 1, skip: [] }, span: 1, dh: null }), d = Fm.d;
    const step = (t: string, val: number, set: (x: number) => void, min: number, max: number): Bloque => ({ type: "step", t, v: `${hora(val)}${val >= 1440 ? E2(" · día siguiente", " · next day") : ""}`, onM: () => set(Math.max(min, val - 30)), onP: () => set(Math.min(max, val + 30)) });
    const igual = d.dia === proxima.dia && d.h0 === proxima.h0 && d.h1 === proxima.h1;
    out.push({ type: "group", k: E2("CAMBIAR FECHA U HORA", "CHANGE DATE OR TIME") }, calendario(c, Fm, e),
      step(E2("Empieza", "Starts"), d.h0, (x) => Fm.set({ h0: x, h1: Math.max(x + 30, Math.min(x + 720, d.h1 + (x - d.h0))) }), 360, 1410), step(E2("Termina", "Ends"), d.h1, (x) => Fm.set({ h1: x }), d.h0 + 30, d.h0 + 720),
      { type: "note", tone: "warn", icon: "calendar", t: E2(`Antes: ${diaCorto(proxima.dia, true)} · ${hora(proxima.h0)}. Les avisamos a las ${proxima.personas} personas que van${tix ? "; quien compró puede quedarse con la nueva fecha o pedir la devolución total hasta que empiece" : ""}.`,
        `Was: ${diaCorto(proxima.dia, false)} · ${hora(proxima.h0)}. We notify the ${proxima.personas} people going${tix ? "; buyers can keep the new date or ask for a full refund until it starts" : ""}.`) },
      { type: "acts", items: [{ l: E2("Cambiar la fecha", "Change the date"), v: "primary", icon: "check", off: c.pending || igual, onClick: () => c.run(() => evtMover(c.d.id, proxima.id, { dia: d.dia, h0: d.h0, h1: d.h1 }), (r) => E2(`Listo. Avisamos a ${r?.avisados ?? 0} personas.`, `Done. We notified ${r?.avisados ?? 0} people.`), () => c.setUi({ evMv: null })) },
        { l: E2("No cambiar", "Keep it"), v: "secondary", onClick: () => c.setUi({ evMv: null }) }] });
    return out;
  }
  // Cancelar (QUÉ CANCELAS si hay varias fechas · ¿POR QUÉ? · lo que se devuelve · confirmar).
  if (ui.evCx === e.id && vivas.length) {
    const ser = vivas.length > 1 && K.kind !== "span", sc = (ui.evCxS as string) ?? (ser ? "date" : "event"), why = ui.evCxW as string | undefined;
    const sel = sc === "date" ? [proxima!] : vivas, nB = sel.reduce((s, f) => s + f.ordenes, 0), gB = sel.reduce((s, f) => s + f.monto, 0), nP = sel.reduce((s, f) => s + f.personas, 0);
    if (ser) out.push({ type: "chips", k: E2("QUÉ CANCELAS", "WHAT YOU CANCEL"), items: [["date", E2(`Solo el ${diaCorto(proxima!.dia, true)}`, `Only ${diaCorto(proxima!.dia, false)}`)], ["event", E2("Toda la serie", "The whole series")]].map(([k2, l]) => ({ l: l!, v: sc === k2 ? "selected" : "filter", onClick: () => c.setUi({ evCxS: k2 }) })) });
    out.push({ type: "chips", k: E2("¿POR QUÉ? LO VEN LOS QUE IBAN", "WHY? ATTENDEES SEE IT"), items: MOTIVOS.map(([k2, a, b]) => ({ l: E2(a, b), v: why === k2 ? "selected" : "filter", onClick: () => c.setUi({ evCxW: k2 }) })) },
      { type: "note", tone: "danger", icon: "warning", t: tix && nB ? E2(`Devolvemos ${dinero(gB)} completo a los ${nB} que compraron, en 3–5 días hábiles, y les avisamos. La comisión no se cobra y el costo de la tarjeta lo pone To’Latino. No se puede deshacer.`, `We refund the full ${dinero(gB)} to the ${nB} who bought, in 3–5 business days, and notify them. No fee is charged and To’Latino covers the card cost. This cannot be undone.`)
        : E2(`Avisamos a las ${nP} personas que iban. No se puede deshacer.`, `We notify the ${nP} people going. This cannot be undone.`) },
      { type: "acts", items: [{ l: sc === "date" && ser ? E2(`Sí, cancelar el ${diaCorto(proxima!.dia, true)}`, `Yes, cancel ${diaCorto(proxima!.dia, false)}`) : E2("Sí, cancelar el evento", "Yes, cancel the event"), v: "danger", icon: "ban", off: c.pending || !why,
        onClick: () => c.run(() => evtCancelar(c.d.id, e.id, sc === "date" ? "date" : "event", sc === "date" ? proxima!.id : null, why ?? "", ""), (r) => (tix && (r?.devueltas || r?.pendientes) ? E2("Cancelado. Devolvemos todo a los compradores.", "Cancelled. Buyers get everything back.") : E2("Cancelado. Avisamos a los que iban.", "Cancelled. We notified everyone going.")), () => c.setUi({ evCx: null, evCxW: null, evCxS: null })) },
        { l: E2("No cancelar", "Keep it"), v: "secondary", onClick: () => c.setUi({ evCx: null, evCxW: null, evCxS: null }) }] });
    return out;
  }
  if (vivas.length) out.push({ type: "acts", items: [
    ...(K.kind !== "span" ? [{ l: K.kind === "series" ? E2(`Cambiar el ${diaCorto(proxima!.dia, true)}`, `Change ${diaCorto(proxima!.dia, false)}`) : E2("Cambiar fecha u hora", "Change date or time"), icon: "calendar", onClick: () => c.setUi({ evMv: e.id, evCx: null }) }] : []),
    { l: K.kind !== "span" && vivas.length > 1 ? E2("Cancelar una fecha o la serie", "Cancel a date or the series") : E2("Cancelar evento", "Cancel event"), icon: "ban", onClick: () => c.setUi({ evCx: e.id, evMv: null }) }] });
  return out;
}

/* Panel › Cobros › PAGOS DE EVENTOS (los boletos se pagan aparte de los pedidos: por fecha, el martes después). */
export function pagosEventosBloques(c: Ctx, L: { filas: FilaLiq[]; deuda: number } | undefined): Bloque[] {
  const { E2 } = c;
  if (!L || !L.filas.length) return [];
  return [
    { type: "rows", k: E2("PAGOS DE EVENTOS · POR FECHA", "EVENT PAYOUTS · BY DATE"), items: L.filas.slice(0, 20).map((x) => ({ ...filaLiq(c, x, true), chev: true, onClick: () => c.nav(`/panel/${c.d.id}/eventos?det=evt:${x.eid}`) })) },
    { type: "note", tone: "info", icon: "info", t: E2(`Los boletos se cobran en To’Latino y se te transfieren el martes después de cada fecha, menos la comisión y lo devuelto. Así, si un evento se cancela, siempre se devuelve todo.${L.deuda ? ` Pendiente de descontar: ${dinero(L.deuda)} (devoluciones de fechas ya pagadas).` : ""}`,
      `Tickets are charged by To’Latino and transferred to you the Tuesday after each date, minus the fee and refunds. That way, if an event is cancelled, everything is always refunded.${L.deuda ? ` Still to deduct: ${dinero(L.deuda)} (refunds on dates already paid).` : ""}`) },
  ];
}
