"use client";
/* Pedidos en el panel (Panel v2 · reqRow, Hoy, detBlocks de un pedido, Clientes y Lo que vendes › Pedidos en línea).
   Todo lo decide el servidor (lib/pedidos.ts); aquí solo se arma con los bloques del sistema. */
import { nombreVisible } from "@/lib/textos-cuenta";
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { AjustesPed, DetallePed, Fila as FilaPed, FiltroPed, pedidosHoy, pedidosLista } from "@/lib/pedidos";
import { menuAjustes } from "./acciones-menu";
import type { Ayuda } from "@/lib/ayuda";
import { repAsignar, repOfertaCancelar, repOfrecer, repRecogido } from "./acciones-repartidores";
import { rutaBloque, type RutaUi } from "./RutaPanel";
import { ayudaResponder, pedidoDevolver, pedidoPaso, pedidoSeguimiento, pedidosAjustes, pedidosModulo } from "./acciones-pedidos";
import type { Ctx, Editor } from "./Panel";
import { clientesTabs, hoyMesas } from "./Reservas";
import { hoyCitas } from "./Citas";
import { uuid } from "@/lib/uuid";

export type PedPanel = {
  hoy?: Awaited<ReturnType<typeof pedidosHoy>>; lista?: Awaited<ReturnType<typeof pedidosLista>>; f?: FiltroPed; q?: string;
  det?: DetallePed | null; aj?: AjustesPed;
  // Ayuda con el pedido: la solicitud del pedido abierto y las que esperan respuesta (Hoy).
  ayuda?: Ayuda | null; ayudas?: (Ayuda & { num: string; quien: string })[];
};
type Sec = { blocks: (Bloque | null)[]; ed: Editor | null; tail?: (Bloque | null)[] };
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const PAGO_L: Record<string, [string, string]> = { held: ["retenido", "held"], captured: ["cobrado", "charged"], released: ["liberado", "released"], refunded: ["devuelto", "refunded"], partially_refunded: ["devuelto en parte", "partly refunded"], failed: ["falló", "failed"] };
const TG = (E2: Ctx["E2"]): Record<string, [string, string] | undefined> => ({
  ok: [E2("ACEPTADO", "ACCEPTED"), "signal"], ready: [E2("LISTO PARA RECOGER", "READY"), "signal"], out: [E2("EN CAMINO", "ON THE WAY"), "action"], done: [E2("LISTO", "DONE"), "neutral"],
  no: [E2("NO SE PUDO", "DECLINED"), "danger"], exp: [E2("SIN RESPUESTA", "NO REPLY"), "danger"], cx: [E2("CANCELADO", "CANCELLED"), "neutral"],
});

/* Responder o mover un pedido; el aviso dice lo que ve el cliente. */
function paso(c: Ctx, x: FilaPed, p: "aceptar" | "rechazar" | "listo" | "encamino" | "entregado") {
  const { E2, es } = c, n = nombreVisible(x.who, es).split(" ")[0];
  const t = { aceptar: E2(`${n} ya lo ve en su pedido.`, `${n} now sees it in their order.`), rechazar: E2(`${n} ya ve que no se pudo.`, `${n} now sees it could not be done.`),
    listo: E2(`${n} ya ve que está listo para recoger.`, `${n} now sees it is ready for pickup.`), encamino: E2(`${n} ya ve que va en camino.`, `${n} now sees it is on the way.`),
    entregado: E2("Anotado · Entregado.", "Noted · Delivered.") }[p];
  c.run(() => pedidoPaso(c.d.id, x.numero, p), t);
}

/* Fila de un pedido (reqRow): pendiente con Aceptar / Rechazar; los demás con su etiqueta. Abre el detalle. */
export function reqRow(c: Ctx, x: FilaPed, conActs = true): Fila {
  const { E2, es } = c, tg = TG(E2)[x.st];
  return {
    icon: x.modo === "Delivery" ? "truck" : "bag", t: `${E2("Pedido", "Order")} #${x.numero} · ${x.modo}`, s: `${nombreVisible(x.who, es)} · ${es ? x.s.es : x.s.en}`, r: money(x.amt),
    tag: tg ? tg[0] : null, tone: tg ? tg[1] : "neutral", chev: !conActs, onClick: () => c.det(`ped:${x.numero}`),
    acts: conActs && x.st === "pend" ? [{ l: E2("Aceptar", "Accept"), v: "primary", icon: "check", onClick: () => paso(c, x, "aceptar") }, { l: E2("Rechazar", "Decline"), v: "secondary", icon: null, onClick: () => paso(c, x, "rechazar") }] : undefined,
    bd: x.st === "pend" ? "1.5px solid var(--tl-ink)" : undefined,
  };
}

/* Hoy: cifras, los que esperan respuesta y la agenda de hoy. */
export function hoyPedidos(c: Ctx): (Bloque | null)[] {
  // Pedidos y reservaciones de mesa juntos: lo que espera respuesta primero (Panel v2 · DASH-HOY).
  const { E2, d } = c, H = c.ped?.hoy, M = hoyMesas(c), CI = hoyCitas(c), pend = [...(H?.pend ?? []).map((x) => reqRow(c, x)), ...M.pend, ...CI.pend], agenda = [...(H?.agenda ?? []).map((x) => reqRow(c, x, false)), ...M.agenda, ...CI.agenda];
  const cols2 = c.desk && c.w >= 1100 && !c.ruta.det ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)";
  // Lo que espera respuesta en los bloques propios de cada categoría (fiestas, viajes, mercado) también cuenta aquí:
  // la cifra de arriba es TODO lo que espera al negocio, y «Nada pendiente» solo sale si de verdad no hay nada.
  const otros = (c.fies?.hoy ?? []).filter((x) => x.st === "pending").length + (c.evp?.hoy ?? []).filter((x) => x.st === "pending" || x.detail === "counter" || x.detail === "change_req").length + (c.via?.hoy?.esperan ?? []).filter((x) => x.st === "pending" && x.detalle !== "precio").length + (c.mped?.hoy ?? []).filter((x) => x.st === "pending").length + (c.noc?.hoy?.esperan ?? []).filter((x) => x.st === "pending").length
    + (c.vis?.panel?.esperan ?? []).filter((x) => x.estado === "pending").length; // 4ie: visitas y pruebas de manejo
  const nPend = pend.length + otros;
  const out: (Bloque | null)[] = [{ type: "kpis", cols: c.desk ? "repeat(4,minmax(0,1fr))" : undefined, items: [
    { k: E2("ESPERAN TU RESPUESTA", "AWAITING YOU"), v: String(nPend), bg: nPend ? "var(--tl-ink)" : undefined, fg: nPend ? "var(--tl-white)" : undefined, bd: nPend ? "none" : undefined, sFg: "rgba(255,255,255,.65)", s: nPend ? (c.ped || c.mped ? E2("responde en menos de 10 min", "reply within 10 min") : E2("responde antes de que venza", "reply before it expires")) : undefined },
    { k: E2("HOY EN TU AGENDA", "ON TODAY’S AGENDA"), v: String(agenda.length) },
    { k: E2("VENDIDO HOY", "SOLD TODAY"), v: `$${((H?.vendido ?? 0) / 100).toFixed(0)}` },
    { k: E2("VISTAS HOY", "VIEWS TODAY"), v: String(d.kpis.viewsToday) },
  ] }];
  if (!d.pro) out.push({ type: "note", tone: "warn", icon: "star", t: d.usadosMes >= d.tope
    ? E2(`Free: llegaste a ${d.tope} de ${d.tope} pedidos o citas en línea este mes. Hasta el día 1, los vecinos te llaman o te escriben. Con Pro no hay límite.`, `Free: you reached ${d.tope} of ${d.tope} online orders or bookings this month. Until the 1st, neighbors call or message you. Pro has no limit.`)
    : E2(`Free: ${d.usadosMes} de ${d.tope} pedidos o citas en línea este mes. Al llegar a ${d.tope}, te contactan por teléfono.`, `Free: ${d.usadosMes} of ${d.tope} online orders or bookings this month. After ${d.tope}, clients call you.`) });
  if (pend.length || !otros) out.push({ type: "rows", k: E2("ESPERAN TU RESPUESTA", "AWAITING YOUR REPLY"), cols: cols2, items: pend });
  if (!nPend) out.push({ type: "empty", icon: "check", t: E2("Nada pendiente", "Nothing pending"), s: E2("Te avisamos al instante cuando llegue algo.", "We alert you the moment something arrives.") });
  if (agenda.length) out.push({ type: "rows", k: E2("HOY EN TU AGENDA", "TODAY’S AGENDA"), link: E2("Ver Clientes", "See Clients"), onLink: () => c.go("cli"), cols: cols2, items: agenda });
  return out;
}

/* Detalle de un pedido (detBlocks): cliente, prometido, pago, nota, platos, total, historial y lo que sigue. */
const MOT_AY: Record<string, [string, string]> = { falta: ["Falta algo", "Something is missing"], equivocado: ["Llegó algo equivocado", "Wrong item"], frio: ["Llegó frío o mal preparado", "Cold or poorly made"], danado: ["Llegó dañado o derramado", "Damaged or spilled"], tarde: ["Llegó tarde", "Arrived late"], nollego: ["No le llegó", "It never arrived"], pago: ["Problema con el pago", "Payment issue"], otro: ["Otro problema", "Something else"] };
const QUIERE_AY: Record<string, [string, string]> = { reponer: ["Pide que se lo repongan", "Asks for a replacement"], devolver: ["Pide que le devuelvan lo de esos platos", "Asks for a refund of those dishes"], avisar: ["Solo quiere que lo sepan", "Just wants you to know"] };
/* Ayuda con el pedido en el detalle (diseño Mi cuenta · solicitud; el negocio responde en 24 h). */
function ayudaBloques(c: Ctx, numero: string): (Bloque | null)[] {
  const { E2, es, d } = c, a = c.ped?.ayuda;
  if (!a) return [];
  const m = MOT_AY[a.reason] ?? MOT_AY.otro!, q = QUIERE_AY[a.wants] ?? QUIERE_AY.avisar!, txt = (c.ui.ayT as string | undefined) ?? "";
  const out: (Bloque | null)[] = [{ type: "group", k: `${E2("AYUDA CON EL PEDIDO · ", "ORDER HELP · ")}${a.number}` },
    { type: "kv", items: [{ k: E2("QUÉ PASÓ", "WHAT HAPPENED"), v: es ? m[0] : m[1] }, ...(a.items.length ? [{ k: E2("PLATOS", "DISHES"), v: a.items.map((x) => `${x.q} × ${x.n}`).join(" · ") }] : []), { k: E2("QUÉ QUIERE", "WANTS"), v: es ? q[0] : q[1] }, ...(a.body ? [{ k: E2("SU NOTA", "THEIR NOTE"), v: a.body }] : [])] }];
  if (a.status === "open") out.push(
    { type: "note", tone: "warn", icon: "clock", t: E2("Respóndele en 24 horas. Si no, To’Latino revisa el caso. Si pagó con tarjeta, puedes devolverle dinero desde el pedido; si pagó en el local, la devolución la arreglan ustedes.", "Reply within 24 hours. If not, To’Latino reviews the case. If they paid by card, you can refund from the order; if they paid in store, you settle the refund yourselves.") },
    { type: "field", area: true, rows: 3, max: 500, k: E2("TU RESPUESTA · LA VE EN SU PEDIDO", "YOUR REPLY · SHOWN ON THEIR ORDER"), val: txt, count: `${txt.length}/500`, ph: E2("Ej. Disculpa, te mandamos el plato que faltó en 30 minutos.", "e.g. Sorry, we'll send the missing dish in 30 minutes."), onChange: (v) => c.setUi({ ayT: v.slice(0, 500) }) },
    { type: "acts", items: [{ l: E2("Enviar respuesta", "Send reply"), v: "primary", icon: "check", off: txt.trim().length < 5 || c.pending, onClick: () => c.run(() => ayudaResponder(d.id, numero, txt), E2("Respuesta enviada. La ve en su pedido.", "Reply sent. They see it on their order."), () => c.setUi({ ayT: "" })) }] });
  else out.push({ type: "note", tone: a.status === "resolved" ? "ok" : a.status === "escalated" ? "warn" : "info", icon: a.status === "answered" ? "chat" : "shield",
    t: a.status === "answered" ? `${E2("Respondiste: ", "You replied: ")}“${a.reply ?? ""}”` : a.status === "escalated" ? E2("To’Latino está revisando el caso.", "To’Latino is reviewing the case.") : `${E2("To’Latino lo resolvió: ", "To’Latino resolved it: ")}${a.resolution ?? ""}` });
  return out;
}

export function pedidoDetalle(c: Ctx): Sec {
  const { E2, es } = c, x = c.ped?.det;
  if (!x) return { blocks: [{ type: "head", t: E2("Pedido no encontrado", "Order not found"), onBack: c.closeDet }, { type: "empty", icon: "bag", t: E2("Ese pedido no existe", "That order does not exist"), s: E2("Puede ser de otro negocio.", "It may belong to another business.") }], ed: null };
  const out: (Bloque | null)[] = [
    { type: "head", eye: `${E2("PEDIDO", "ORDER")} · ${nombreVisible(x.who, es).toUpperCase()}`, t: `${E2("Pedido", "Order")} #${x.numero} · ${x.modo}`, s: es ? x.s.es : x.s.en, onBack: c.closeDet },
    { type: "kv", items: [{ k: E2("CLIENTE", "CLIENT"), v: nombreVisible(x.who, es) }, { k: E2("PROMETIDO", "PROMISED"), v: x.entrega?.llega ?? x.listo }, { k: E2("PAGO", "PAYMENT"), v: x.pago ? `${E2("Tarjeta", "Card")}${x.pago.ultimos4 ? ` ·· ${x.pago.ultimos4}` : ""} · ${(PAGO_L[x.pago.estado] ?? [x.pago.estado, x.pago.estado])[es ? 0 : 1]}` : x.entrega ? E2("Efectivo al entregar", "Cash on delivery") : E2("En el local", "At the store") }] },
  ];
  // Delivery: a dónde, cómo se entrega y qué hacer al llegar (Checkout · cómo entregar), y el teléfono del cliente.
  const ENT = x.entrega;
  if (ENT?.to) {
    const AT: Record<string, [string, string]> = { timbre: ["Toca el timbre", "Ring the bell"], noTimbre: ["No toques el timbre", "Don't ring the bell"], llamar: ["Llámame al llegar", "Call me on arrival"], texto: ["Escríbeme al llegar", "Text me on arrival"] };
    out.push({ type: "rows", k: E2("ENTREGA", "DELIVER TO"), items: [
      { icon: "home", t: `${ENT.to.street}${ENT.to.apt ? `, ${ENT.to.apt}` : ""}`, s: `${ENT.to.zip}${ENT.to.mi != null ? ` · ${ENT.to.mi} mi` : ""}`, chev: false, compact: true,
        acts: [{ l: E2("Cómo llegar", "Directions"), v: "secondary", icon: "pin", onClick: () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${ENT.to!.street}, ${ENT.to!.zip}`)}`, "_blank", "noopener") },
          ...(x.telCliente ? [{ l: E2("Llamar", "Call"), v: "secondary", icon: "phone", onClick: () => { location.href = `tel:${x.telCliente}`; } }] : [])] },
      ...(ENT.drop ? [{ icon: ENT.drop.drop === "puerta" ? "home" : "users", t: ENT.drop.drop === "puerta" ? E2("Dejar en la puerta", "Leave at door") : E2("En la mano", "Hand it to me"),
        s: [ENT.drop.at.map((k) => (c.es ? AT[k]?.[0] : AT[k]?.[1])).filter(Boolean).join(" · "), ENT.drop.note ? `“${ENT.drop.note}”` : ""].filter(Boolean).join(" · ") || undefined, chev: false, compact: true } as Fila] : []),
    ] });
  }
  // 8e · Entrega › Despacho: el repartidor en el mapa mientras dura la entrega (lo trae el SSE; RutaPanel.tsx).
  if (ENT && !ENT.ext) out.push(rutaBloque(c.ui.ruta as RutaUi | undefined, x.numero, es, x.repartidor?.nombre ?? null));
  if (x.nota) out.push({ type: "note", tone: "warn", icon: "edit", t: `${E2("Nota del cliente: ", "Client note: ")}${x.nota}` });
  out.push({ type: "rows", k: E2("DETALLE", "DETAIL"), items: [
    ...x.lineas.map((l): Fila => ({ icon: "check", ibg: "var(--tl-paper)", ifg: "rgba(11,14,18,.6)", t: `${l.q} × ${es ? l.name.es : l.name.en || l.name.es}`,
      s: [l.opts.map((o) => (es ? o.es : o.en || o.es)).join(" · "), l.nota ? `“${l.nota}”` : ""].filter(Boolean).join(" · ") || undefined, r: money(l.cents), compact: true, chev: false })),
    { icon: "wallet", t: E2("Total", "Total"), s: [`${E2("platos", "items")} ${money(x.sub)}`, x.entrega ? `${E2("envío", "delivery")} ${money(x.envio)}` : "", x.propina ? `${E2("propina", "tip")} ${money(x.propina)}` : "", `${E2("impuestos", "taxes")} ${money(x.tax)}`].filter(Boolean).join(" · "), r: money(x.amt), compact: true, chev: false },
  ] });
  if (x.tl.length) out.push({ type: "timeline", k: E2("HISTORIAL", "HISTORY"), items: x.tl.map((t, i) => ({ t: es ? t.t.es : t.t.en, s: t.at, now: i === x.tl.length - 1 }))
    .concat(x.st === "pend" ? [{ t: E2("Tu respuesta", "Your reply"), s: E2("AHORA", "NOW"), future: true } as never] : []) });
  const row = reqRow(c, x);
  if (row.acts?.length) out.push({ type: "acts", pt: "4px", items: row.acts.map((a) => ({ ...a, off: c.pending })) });
  // 9a · Un pedido sin hora de respuesta (respond_by vacío: viejo o de la semilla) decía «antes de las null»: la frase del plazo solo sale con la hora.
  const plazo = x.responde;
  if (x.st === "pend" && x.pago) out.push({ type: "note", tone: "info", t: plazo
    ? E2(`Pagó con tarjeta: ${money(x.pago.monto)} retenidos. Se cobran cuando aceptas; si no respondes antes de las ${plazo}, se liberan y el pedido se cancela solo.`, `Paid by card: ${money(x.pago.monto)} held. Charged when you accept; if you do not reply by ${plazo}, it is released and the order cancels on its own.`)
    : E2(`Pagó con tarjeta: ${money(x.pago.monto)} retenidos. Se cobran cuando aceptas.`, `Paid by card: ${money(x.pago.monto)} held. Charged when you accept.`) });
  else if (x.st === "pend") {
    const corte = plazo ? E2(` Si no respondes antes de las ${plazo}, se cancela solo.`, ` If you do not reply by ${plazo}, it cancels on its own.`) : "";
    out.push({ type: "note", tone: "info", t: (ENT ? E2("Pagan en efectivo al recibir.", "They pay cash on delivery.") : E2("Pagan en el local al recoger.", "They pay at the store at pickup.")) + corte });
  }
  // Despacho (delivery con tu equipo): quién lo lleva. Se asigna a un repartidor activo; el repartidor recibe el aviso.
  if (ENT && x.equipo && !ENT.ext && (x.st === "ok" || x.st === "ready" || x.st === "out")) {
    const R = (c.reps ?? []).filter((r) => r.estado === "active").sort((p, q) => Number(q.enLinea) - Number(p.enLinea));
    const k9 = x.rep9n;
    if (x.repartidor) out.push({ type: "rows", k: E2("REPARTIDOR", "DRIVER"), items: [{ icon: "truck", t: x.repartidor.nombre, s: x.st === "out" ? E2("Va en camino", "On the way") : E2("Asignado · lo ve en su app", "Assigned · they see it in their app"), chev: false, compact: true,
      acts: x.st !== "out" ? [{ l: E2("Cambiar", "Change"), v: "secondary", off: c.pending, onClick: () => c.run(() => repAsignar(c.d.id, x.numero, null), E2("Quitado. Asígnalo a otro.", "Removed. Assign someone else.")) }] : undefined }] });
    // 9n · Una oferta abierta con su cuenta regresiva (el primero que acepta se la lleva); si vence, te llega el aviso.
    else if (k9?.oferta) out.push({ type: "note", tone: "info", icon: "clock", t: E2(`Ofrecido ${k9.oferta.a ? `a ${k9.oferta.a}` : "a tus repartidores en línea"} · vence en ${k9.oferta.seg} s${k9.oferta.rechazos ? ` · ${k9.oferta.rechazos} lo rechazaron` : ""}. El primero que acepta va por él.`,
      `Offered ${k9.oferta.a ? `to ${k9.oferta.a}` : "to your online drivers"} · expires in ${k9.oferta.seg} s${k9.oferta.rechazos ? ` · ${k9.oferta.rechazos} declined` : ""}. The first to accept heads there.`),
      cta: E2("Cancelar oferta", "Cancel offer"), onCta: () => c.run(() => repOfertaCancelar(c.d.id, x.numero), E2("Oferta cancelada.", "Offer cancelled.")) });
    else if (R.length) {
      if (R.some((r) => r.enLinea)) out.push({ type: "acts", items: [{ l: E2("Ofrecer a los que están en línea", "Offer to online drivers"), v: "primary", icon: "clock", off: c.pending, onClick: () => c.run(() => repOfrecer(c.d.id, x.numero, null), E2("Ofrecido. Te avisamos cuando alguien lo acepte.", "Offered. We will tell you when someone accepts.")) }] });
      out.push({ type: "rows", k: E2("¿QUIÉN LO LLEVA?", "WHO TAKES IT?"), items: R.map((r) => ({ key: r.id, icon: "truck", t: r.nombre, s: `${r.enLinea ? E2("en línea", "online") : E2("fuera de línea", "offline")}${r.hoy.activos ? ` · ${r.hoy.activos} ${E2("en curso", "active")}` : ""}`, tag: r.enLinea ? E2("EN LÍNEA", "ONLINE") : null, tone: "signal", chev: false, compact: true,
        acts: [{ l: E2("Asignar", "Assign"), v: "primary", off: c.pending, onClick: () => c.run(() => repAsignar(c.d.id, x.numero, r.id), E2(`Asignado a ${r.nombre}. Ya le llegó el aviso.`, `Assigned to ${r.nombre}. They got the notice.`)) },
          ...(r.enLinea ? [{ l: E2("Ofrecer", "Offer"), v: "secondary", off: c.pending, onClick: () => c.run(() => repOfrecer(c.d.id, x.numero, r.id), E2(`Ofrecido a ${r.nombre}.`, `Offered to ${r.nombre}.`)) }] : [])] })) });
    }
    // 9n · El código de recogida (solo lo ves tú): díselo al repartidor al darle el pedido.
    if (k9?.recogida && x.repartidor && !k9.recogido && x.st !== "out") out.push({ type: "rows", k: E2("CÓDIGO DE RECOGIDA", "PICKUP CODE"), items: [{ icon: "lock", t: k9.recogida, s: E2("Díselo al repartidor cuando le des el pedido. El cliente no lo ve.", "Tell it to the driver when you hand over the order. The customer does not see it."), chev: false, compact: true,
      acts: [{ l: E2("Ya se lo di", "Already handed over"), v: "secondary", off: c.pending, onClick: () => c.run(() => repRecogido(c.d.id, x.numero), E2("Listo: puede marcar «Recogí».", "Done: they can mark “Picked up”.")) }] }] });
    else out.push({ type: "note", tone: "info", icon: "truck", t: E2("Sin repartidores en la app: invítalos en Entrega, o marca tú «Salió en camino» y «Entregado».", "No drivers in the app: invite them in Delivery, or mark “Out for delivery” and “Delivered” yourself."), cta: E2("Entrega", "Delivery"), onCta: () => c.go("dlv") });
  }
  // 9n · La prueba de la entrega (foto privada o el código del cliente) y los mensajes del repartidor al cliente.
  if (x.rep9n && (x.rep9n.prueba.length || x.rep9n.mensajes)) {
    const PR: Record<string, [string, string]> = { foto: ["foto", "photo"], codigo: ["código del cliente", "customer code"], negocio: ["marcado por tu equipo", "marked by your team"] };
    out.push({ type: "rows", k: E2("PRUEBA DE ENTREGA", "PROOF OF DELIVERY"), items: [
      ...(x.rep9n.prueba.length ? [{ icon: "image", t: x.rep9n.prueba.map((p) => (PR[p] ?? [p, p])[es ? 0 : 1]).join(" · "), s: E2("Queda como evidencia si el cliente reclama.", "It is kept as evidence if the customer complains."), chev: false, compact: true,
        acts: x.rep9n.foto ? [{ l: E2("Ver foto", "See photo"), v: "secondary", icon: "image", onClick: () => window.open(`/api/entrega/foto/${x.rep9n!.foto}`, "_blank", "noopener") }] : undefined } as Fila] : []),
      ...(x.rep9n.mensajes ? [{ icon: "chat", t: E2(`El repartidor le escribió ${x.rep9n.mensajes} ${x.rep9n.mensajes === 1 ? "vez" : "veces"} al cliente`, `The driver wrote to the customer ${x.rep9n.mensajes} ${x.rep9n.mensajes === 1 ? "time" : "times"}`), chev: false, compact: true } as Fila] : []),
    ] });
  }
  // Tarjeta: devolver dinero (solo el dueño). La comisión baja en proporción; el cliente recibe el aviso.

  const pg = x.pago, puedeDev = !!pg && (pg.estado === "captured" || pg.estado === "partially_refunded") && (c.d.kind === "owner" || c.d.partes.includes("all"));
  if (pg && pg.devuelto) out.push({ type: "note", tone: "info", icon: "dollar", t: E2(`Devueltos ${money(pg.devuelto)} de ${money(pg.monto)} a la tarjeta del cliente.`, `${money(pg.devuelto)} of ${money(pg.monto)} refunded to the client's card.`) });
  if (puedeDev && !c.ui.dev) out.push({ type: "acts", items: [{ l: E2("Devolver dinero", "Refund money"), v: "secondary", icon: "dollar", onClick: () => c.setUi({ dev: { n: ((pg!.monto - pg!.devuelto) / 100).toFixed(2), m: "", k: uuid() } }) }] });
  if (puedeDev && c.ui.dev) {
    const dv = c.ui.dev as { n: string; m: string; k: string }, cents = Math.round((parseFloat(dv.n) || 0) * 100), max = pg!.monto - pg!.devuelto;
    out.push({ type: "group", k: E2("DEVOLVER DINERO", "REFUND MONEY") });
    out.push({ type: "field", k: E2(`MONTO · HASTA ${money(max)}`, `AMOUNT · UP TO ${money(max)}`), val: dv.n, onChange: (v: string) => c.setUi({ dev: { ...dv, n: v.replace(/[^0-9.]/g, "").slice(0, 8) } }) });
    out.push({ type: "field", k: E2("MOTIVO · LO VE EL CLIENTE", "REASON · THE CLIENT SEES IT"), val: dv.m, area: true, rows: 2, max: 200, count: `${dv.m.length}/200`, onChange: (v: string) => c.setUi({ dev: { ...dv, m: v.slice(0, 200) } }) });
    out.push({ type: "note", tone: "ink", icon: "info", t: E2("Vuelve a su tarjeta en 3 a 5 días hábiles. Si ya te pagamos esta semana, se descuenta del próximo martes.", "It goes back to their card in 3 to 5 business days. If we already paid you this week, it comes off next Tuesday.") });
    out.push({ type: "acts", items: [
      { l: cents > 0 && cents <= max ? `${E2("Devolver", "Refund")} ${money(cents)}` : E2("Revisa el monto", "Check the amount"), v: "primary", icon: "check", off: c.pending || !(cents > 0 && cents <= max) || dv.m.trim().length < 3,
        onClick: () => c.run(() => pedidoDevolver(c.d.id, x.numero, cents, dv.m, dv.k), E2("Devuelto. El cliente ya lo sabe.", "Refunded. The client already knows."), () => c.setUi({ dev: null })) },
      { l: E2("Cancelar", "Cancel"), v: "secondary", onClick: () => c.setUi({ dev: null }) }] });
  }
  // Panel v2 · detBlocks: pickup → Listo para recoger → Entregado; delivery → Salió en camino → Entregado.
  if (x.st === "ok") out.push({ type: "acts", items: [ENT ? { l: E2("Salió en camino", "Out for delivery"), v: "primary", icon: "truck", off: c.pending, onClick: () => paso(c, x, "encamino") }
    : { l: E2("Listo para recoger", "Ready for pickup"), v: "primary", icon: "check", off: c.pending, onClick: () => paso(c, x, "listo") }] });
  if (x.st === "ready" || x.st === "out") out.push({ type: "acts", items: [{ l: E2("Entregado", "Delivered"), v: "primary", icon: "check", off: c.pending, onClick: () => paso(c, x, "entregado") }] });
  // Con una app externa: el enlace de seguimiento que ve el cliente.
  if (ENT?.ext && (x.st === "ok" || x.st === "out")) {
    const key = `seg:${x.numero}`, val = (c.ui[key] as string | undefined) ?? ENT.seguimiento ?? "";
    out.push({ type: "field", k: E2("ENLACE DE SEGUIMIENTO", "TRACKING LINK"), val, ph: "https://", max: 300, onChange: (v) => c.setUi({ [key]: v }),
      help: ENT.seguimiento ? E2("El cliente ya lo ve en su pedido.", "The client already sees it in their order.") : E2("Pega el enlace de la app externa: el cliente lo ve en su pedido.", "Paste the external app's link: the client sees it in their order.") },
      { type: "acts", items: [{ l: E2("Guardar enlace", "Save link"), v: "secondary", icon: "check", off: c.pending || !val.trim() || val === ENT.seguimiento, onClick: () => c.run(() => pedidoSeguimiento(c.d.id, x.numero, val), E2("Enlace guardado: el cliente ya lo ve.", "Link saved: the client sees it now.")) }] });
  }
  out.push(...ayudaBloques(c, x.numero));
  return { blocks: out, ed: null };
}

/* Clientes › Pedidos: filtro, búsqueda por nombre o número y «Ver más». */
export function clientesBloques(c: Ctx): (Bloque | null)[] {
  const { E2 } = c, L = c.ped?.lista, f = c.ped?.f ?? "all", q = c.ui.cliQ ?? c.ped?.q ?? "";
  const cols2 = c.desk && c.w >= 1100 && !c.ruta.det ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)";
  const out: (Bloque | null)[] = [{ type: "head", t: E2("Clientes", "Clients"), s: E2("Todo lo que tus clientes te piden, en un solo lugar. Cada uno abre su detalle.", "Everything clients ask of you, in one place. Each opens its detail.") }];
  if (!L || !L.total) {
    out.push({ type: "empty", icon: "users", t: E2("Aún no hay clientes", "No clients yet"), s: E2("Comparte tu página para recibir los primeros.", "Share your page to get the first ones."), cta: E2("Ver mi página", "See my page"), onCta: () => window.open(`/n/${c.d.id}`, "_blank", "noopener") });
    return out;
  }
  const ir = (p: Record<string, string | null>) => {
    const s = new URLSearchParams();
    const v = { f, q: q.trim(), ...p };
    if (v.f && v.f !== "all") s.set("f", v.f);
    if (v.q) s.set("q", v.q);
    if (p.antes) s.set("antes", p.antes);
    c.nav(`/panel/${c.d.id}/clientes${s.size ? `?${s}` : ""}`);
  };
  out.push(clientesTabs(c, "ped") ?? { type: "tabs", items: [{ l: E2("Pedidos", "Orders"), n: L.pend ? String(L.pend) : undefined, on: true, onClick: () => ir({ antes: null }) }] });
  out.push({ type: "search", val: q, ph: E2("Buscar por nombre o número", "Search by name or number"),
    onChange: (v) => { c.setUi({ cliQ: v.slice(0, 40) }); clearTimeout((window as unknown as { _cliT?: number })._cliT); (window as unknown as { _cliT?: number })._cliT = window.setTimeout(() => ir({ q: v.slice(0, 40), antes: null }), 400); },
    onClear: () => { c.setUi({ cliQ: "" }); ir({ q: "", antes: null }); } });
  const FS: [FiltroPed, string][] = [["all", E2("Todas", "All")], ["pend", E2("Esperan tu respuesta", "Awaiting you")], ["cur", E2("Confirmadas y en curso", "Confirmed and ongoing")], ["done", E2("Terminadas", "Done")], ["no", E2("No se pudo", "Declined")]];
  out.push({ type: "chips", items: FS.map(([k, l]) => ({ l: `${l} · ${L.cuentas[k]}`, v: f === k ? "selected" : "filter", onClick: () => ir({ f: k, antes: null }) })) });
  out.push(L.filas.length ? { type: "rows", cols: cols2, items: L.filas.map((x) => reqRow(c, x)) }
    : { type: "empty", icon: "bag", t: q ? E2("Nadie con ese nombre", "Nobody by that name") : E2("Nada aquí", "Nothing here"), s: E2("Cambia el filtro para ver más.", "Change the filter to see more.") });
  if (L.mas) out.push({ type: "acts", items: [{ l: E2("Ver más", "See more"), v: "secondary", icon: null, onClick: () => ir({ antes: L.mas }) }] });
  return out;
}

/* Lo que vendes › fila del módulo Pedidos en línea (pedLine). */
export function pedLine(c: Ctx): string {
  const { E2 } = c, a = c.ped?.aj;
  if (!a) return "";
  if (a.admOff) return E2("Pausado por To’Latino", "Paused by To’Latino");
  if (!a.on) return E2("Apagado · tu página se ve, pero nadie pide en la app", "Off · your page shows but nobody orders in the app");
  if (!(a.pickup && (a.cashP || a.card)) && !(a.delivery && (a.cashD || a.card))) return E2("Sin forma de pago: nadie puede pedir", "No payment method: nobody can order");
  const modos = [a.pickup ? "Pickup" : "", a.delivery && !a.dlvAdm ? "Delivery" : ""].filter(Boolean).join(E2(" y ", " and "));
  return `${modos || E2("Sin forma de entrega", "No delivery method")}${E2(" · listo en ", " · ready in ")}${a.prep + a.busy} min${a.auto ? E2(" · aceptas al instante", " · instant accept") : ""}`;
}

/* Lo que vendes › Pedidos en línea (pedBlocks): tiempos, cómo aceptas, cómo te pagan y así lo ve el cliente. */
export function pedidosModBloques(c: Ctx): Sec {
  const { E2, d } = c, a = c.ped?.aj, H = c.ped?.hoy;
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("LO QUE VENDES", "WHAT YOU SELL"), t: E2("Pedidos en línea", "Online orders"), s: E2("Cómo te piden por la app: tiempos, cómo aceptas y cómo te pagan.", "How people order in the app: times, how you accept and how they pay."), onBack: () => c.go("mod") }];
  if (!a) return { blocks: out, ed: null };
  if (a.admOff) out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`To’Latino pausó tus Pedidos en línea: tu página se ve, pero nadie puede pedir en la app. Motivo: ${a.admOff}`, `To’Latino paused your Online orders: your page shows but nobody can order in the app. Reason: ${a.admOff}`) });
  else if (!a.on) out.push({ type: "note", tone: "info", icon: "bag", t: E2("Pedidos en línea está apagado: tu página se ve, pero nadie puede pedir en la app.", "Online orders is off: your page shows but nobody can order in the app."), cta: E2("Encender", "Turn on"), onCta: () => c.run(() => pedidosModulo(d.id, true), E2("Pedidos en línea encendido.", "Online orders on.")) });
  const RQ = [...(H?.pend ?? []), ...(H?.agenda ?? [])], nP = H?.pend.length ?? 0;
  if (RQ.length) out.push({ type: "rows", k: `${E2("PEDIDOS · ", "ORDERS · ")}${RQ.length}${nP ? E2(` · ${nP} POR ACEPTAR`, ` · ${nP} TO ACCEPT`) : ""}`, link: E2("Ver en Hoy", "See in Today"), onLink: () => c.go("hoy"), items: RQ.slice(0, 5).map((x) => reqRow(c, x)) });
  const M = c.menu?.cfg, pausa = M?.pause ? new Date(M.pause).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null;
  const F = c.form("ped:" + d.id, { prep: a.prep, sched: a.sched, auto: a.auto, cashP: a.cashP, cashD: a.cashD, tip: a.tip, card: a.card }), v = F.d, pk = v.prep + a.busy;
  const stOn = a.stripe === "enabled" || a.stripe === "restricted";
  const ext = a.delivery && a.who === "external", extN = a.ext === "doordash" ? "DoorDash" : a.ext === "uber_eats" ? "Uber Eats" : E2("una app externa", "an external app");
  const stT = a.admOff || !a.on ? E2("Hoy no recibes pedidos en la app", "No app orders today") : pausa ? `${E2("En pausa hasta ", "Paused until ")}${pausa}` : d.st.closedToday ? E2("Hoy cierras: no se pide", "Closed today: no orders") : d.st.open ? E2("Recibes pedidos ahora", "Taking orders now") : E2("Cerrado ahora", "Closed now");
  out.push({ type: "group", k: E2("HOY", "TODAY"), first: !RQ.length }, { type: "rows", items: [{ icon: "clock", t: stT, s: `${E2("Pickup listo en ", "Pickup ready in ")}${pk} min${a.busy ? E2(` · con +${a.busy} min por mucho trabajo`, ` · with +${a.busy} min busy`) : ""}`, chev: false }] });
  if (pausa) out.push({ type: "note", tone: "ink", icon: "clock", t: E2(`Pedidos en línea en pausa hasta las ${pausa}. Tu menú se sigue viendo.`, `Online orders paused until ${pausa}. Your menu still shows.`), cta: E2("Reanudar", "Resume"), onCta: () => c.run(() => menuAjustes(d.id, { pause: null }), E2("Pedidos en línea otra vez.", "Online orders back on.")) });
  out.push({ type: "rows", items: [{ icon: "bolt", t: E2("Mucho trabajo y último pedido", "Busy and last order"), s: `${a.busy ? `+${a.busy} min` : E2("Tiempo normal", "Normal time")} · ${a.last ? E2(`último pedido ${a.last} min antes de cerrar`, `last order ${a.last} min before closing`) : E2("se pide hasta que cierras", "orders until closing")}${E2(" · en Menú · Horarios", " · in Menu · Hours")}`, onClick: () => { c.setUi({ mv: "hrs" }); c.go("mod", "menu"); } }] });
  out.push({ type: "group", k: E2("TIEMPOS", "TIMES") });
  out.push({ type: "step", t: E2("Tiempo de preparación", "Prep time"), s: E2(`Pickup: el cliente ve «listo en ${pk} min».`, `Pickup: the client sees “ready in ${pk} min”.`), v: `${v.prep} min`, onM: () => F.set({ prep: Math.max(5, v.prep - 5) }), onP: () => F.set({ prep: Math.min(120, v.prep + 5) }) });
  out.push({ type: "rows", items: [{ icon: "calendar", t: E2("Pedidos programados", "Scheduled orders"), s: v.sched ? E2("El cliente elige una hora de hoy. Antes de abrir, pide para cuando abras.", "The client picks a time today. Before you open, they order for opening time.") : E2("Apagado: solo «lo antes posible» y solo con el local abierto.", "Off: only “as soon as possible” and only while open."), tgOn: v.sched, onTg: () => F.set({ sched: !v.sched }) }] });
  out.push({ type: "group", k: E2("CÓMO ACEPTAS", "HOW YOU ACCEPT") });
  out.push({ type: "rows", items: [{ icon: "check", t: E2("Aceptar pedidos al instante", "Accept orders instantly"), s: v.auto ? E2("Se aceptan solos mientras estés abierto y sin pausa. Igual llegan a Hoy para prepararlos.", "They are accepted on their own while you are open and not paused. They still arrive in Today.") : E2("Apagado: tú aceptas cada uno. Si no respondes en 10 min, se cancela solo.", "Off: you accept each one. If you do not reply in 10 min, it cancels on its own."), tgOn: v.auto, onTg: () => F.set({ auto: !v.auto }) }] });
  out.push({ type: "group", k: E2("CÓMO TE PAGAN", "HOW THEY PAY") });
  out.push({ type: "rows", items: [
    { icon: "card", t: E2("Tarjeta en la app", "Card in the app"), s: stOn ? E2("Se retiene al pedir y se cobra cuando aceptas.", "Held when ordering, charged when you accept.") : a.stripe === "pending" ? E2("Tu cuenta de cobro se está revisando.", "Your payout account is being reviewed.") : E2("Conecta tus cobros para recibir tarjeta.", "Connect payouts to take cards."),
      tgOn: stOn && !!v.card, lock: !stOn, onTg: () => (stOn ? F.set({ card: !v.card }) : c.go("pay")), ...(stOn ? {} : { onClick: () => c.go("pay") }) },
    ...(a.pickup ? [{ icon: "store", t: E2("Efectivo al recoger", "Cash at pickup"), s: E2("Pagan en tu caja. No se retiene nada.", "They pay at your register. Nothing is held."), tgOn: v.cashP, onTg: () => F.set({ cashP: !v.cashP }) }] : []),
    ...(a.delivery ? [{ icon: "dollar", t: E2("Efectivo al entregar", "Cash on delivery"), s: ext ? E2(`Con ${extN} no se cobra en efectivo: solo con tu equipo.`, `${extN} does not collect cash: only your own team.`) : E2("Cobra tu repartidor y lo cuadras en Entrega.", "Your driver collects and you settle it in Delivery."),
      tgOn: v.cashD && !ext, lock: ext, onTg: () => (ext ? c.go("dlv") : F.set({ cashD: !v.cashD })) }] : []),
  ] });
  if (a.delivery) out.push({ type: "rows", items: [{ icon: "dollar", t: E2("Pedir propina en delivery", "Ask for a tip on delivery"), s: v.tip ? E2("El cliente elige 15, 18 o 20 % u otra cantidad. Va completa a quien entrega.", "The client picks 15, 18 or 20% or another amount. All of it goes to the driver.") : E2("Apagado: el pago no pide propina.", "Off: checkout does not ask for a tip."), tgOn: v.tip, onTg: () => F.set({ tip: !v.tip }) }] });
  out.push({ type: "note", tone: "ink", icon: "shield", t: E2(`Siempre igual: ${v.auto ? "" : "el cliente cancela gratis mientras no aceptes. "}En los pedidos que pagan en tu local, To’Latino no cobra nada.`, `Always the same: ${v.auto ? "" : "the client cancels for free until you accept. "}On orders paid at your store, To’Latino takes nothing.`) });
  out.push({ type: "rows", k: E2("ASÍ LO VE EL CLIENTE", "HOW THE CLIENT SEES IT"), items: [
    ...(a.pickup ? [["store", E2(`Pickup: listo en ${pk} min.`, `Pickup: ready in ${pk} min.`)]] : []),
    ...(a.delivery ? [["truck", E2(`Delivery: llega en ${pk + a.travel}–${pk + 2 * a.travel} min.`, `Delivery: arrives in ${pk + a.travel}–${pk + 2 * a.travel} min.`)]] : []),
    ["calendar", v.sched ? E2("Puede pedir para más tarde hoy.", "Can order for later today.") : E2("Solo «lo antes posible».", "Only “as soon as possible”.")],
    ...(a.pickup ? [["card", v.cashP ? E2("Paga en efectivo al recoger.", "Pays cash at pickup.") : E2("No tiene cómo pagar el pickup.", "No way to pay for pickup.")]] : []),
    ...(a.delivery ? [["dollar", v.cashD && !ext ? E2(`Paga en efectivo al recibir${v.tip ? ", con propina si quiere" : ""}.`, `Pays cash on delivery${v.tip ? ", with a tip if they want" : ""}.`) : E2("No tiene cómo pagar el delivery.", "No way to pay for delivery.")]] : []),
    v.auto ? ["check", E2("Su pedido queda aceptado al instante.", "Their order is accepted instantly.")] : ["bubble", E2(`${d.name} lo acepta en unos minutos.`, `${d.name} accepts it within minutes.`)],
  ].map(([icon, t]) => ({ icon: icon!, t: t!, compact: true, chev: false })) });
  const conTarjeta = stOn && !!v.card, faltaP = a.pickup && !v.cashP && !conTarjeta, faltaD = a.delivery && !(v.cashD && !ext) && !conTarjeta;
  if (faltaP || faltaD) out.push({ type: "note", tone: "warn", t: `${F.dirty ? E2("Para guardar falta: ", "To save, add: ") : E2("Hoy falta: ", "Missing today: ")}${[faltaP ? E2("cómo te pagan en pickup", "how they pay for pickup") : "", faltaD ? E2("cómo te pagan en delivery", "how they pay for delivery") : ""].filter(Boolean).join(" · ")}.` });
  if (a.on && !a.admOff) out.push({ type: "acts", items: [{ l: E2("Apagar Pedidos en línea", "Turn off Online orders"), v: "secondary", icon: null, onClick: () => c.run(() => pedidosModulo(d.id, false), E2("Pedidos en línea apagado.", "Online orders off.")) }] });
  const ed: Editor = { F, l: E2("Guardar", "Save"), valid: !faltaP && !faltaD, apply: (x: typeof v) => pedidosAjustes(d.id, x), toast: E2("Guardado · el cliente ya lo ve así.", "Saved · clients see it like this now.") };
  return { blocks: out, ed };
}

/* Hoy · «Ayuda con pedidos»: las solicitudes que esperan tu respuesta (24 h). */
export function hoyAyudas(c: Ctx): Bloque[] {
  const { E2, es, d } = c, L = c.ped?.ayudas ?? [];
  if (!L.length) return [];
  return [{ type: "rows", k: E2("AYUDA CON PEDIDOS · RESPONDE EN 24 H", "ORDER HELP · REPLY WITHIN 24 H"), items: L.map((a) => ({ icon: "help", t: `${a.quien} · ${E2("Pedido", "Order")} #${a.num}`,
    s: `${(MOT_AY[a.reason] ?? MOT_AY.otro!)[es ? 0 : 1]}${a.items.length ? ` · ${a.items.map((x) => `${x.q} × ${x.n}`).join(", ")}` : ""}`, tag: E2("POR RESPONDER", "TO ANSWER"), tone: "action",
    onClick: () => c.nav(`/panel/${d.id}/hoy?det=ped:${a.num}`) })) }];
}
