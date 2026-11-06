"use client";
/* Pedidos en el panel (Panel v2 · reqRow, Hoy, detBlocks de un pedido, Clientes y Lo que vendes › Pedidos en línea).
   Todo lo decide el servidor (lib/pedidos.ts); aquí solo se arma con los bloques del sistema. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { AjustesPed, DetallePed, Fila as FilaPed, FiltroPed, pedidosHoy, pedidosLista } from "@/lib/pedidos";
import { menuAjustes } from "./acciones-menu";
import { pedidoPaso, pedidosAjustes, pedidosModulo } from "./acciones-pedidos";
import type { Ctx, Editor } from "./Panel";
import { clientesTabs, hoyMesas } from "./Reservas";

export type PedPanel = {
  hoy?: Awaited<ReturnType<typeof pedidosHoy>>; lista?: Awaited<ReturnType<typeof pedidosLista>>; f?: FiltroPed; q?: string;
  det?: DetallePed | null; aj?: AjustesPed;
};
type Sec = { blocks: (Bloque | null)[]; ed: Editor | null; tail?: (Bloque | null)[] };
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const TG = (E2: Ctx["E2"]): Record<string, [string, string] | undefined> => ({
  ok: [E2("ACEPTADO", "ACCEPTED"), "signal"], ready: [E2("LISTO PARA RECOGER", "READY"), "signal"], done: [E2("LISTO", "DONE"), "neutral"],
  no: [E2("NO SE PUDO", "DECLINED"), "danger"], exp: [E2("SIN RESPUESTA", "NO REPLY"), "danger"], cx: [E2("CANCELADO", "CANCELLED"), "neutral"],
});

/* Responder o mover un pedido; el aviso dice lo que ve el cliente. */
function paso(c: Ctx, x: FilaPed, p: "aceptar" | "rechazar" | "listo" | "entregado") {
  const { E2 } = c, n = x.who.split(" ")[0];
  const t = { aceptar: E2(`${n} ya lo ve en su pedido.`, `${n} now sees it in their order.`), rechazar: E2(`${n} ya ve que no se pudo.`, `${n} now sees it could not be done.`),
    listo: E2(`${n} ya ve que está listo para recoger.`, `${n} now sees it is ready for pickup.`), entregado: E2("Anotado · Entregado.", "Noted · Delivered.") }[p];
  c.run(() => pedidoPaso(c.d.id, x.numero, p), t);
}

/* Fila de un pedido (reqRow): pendiente con Aceptar / Rechazar; los demás con su etiqueta. Abre el detalle. */
export function reqRow(c: Ctx, x: FilaPed, conActs = true): Fila {
  const { E2, es } = c, tg = TG(E2)[x.st];
  return {
    icon: "bag", t: `${E2("Pedido", "Order")} #${x.numero} · ${x.modo}`, s: `${x.who} · ${es ? x.s.es : x.s.en}`, r: money(x.amt),
    tag: tg ? tg[0] : null, tone: tg ? tg[1] : "neutral", chev: !conActs, onClick: () => c.det(`ped:${x.numero}`),
    acts: conActs && x.st === "pend" ? [{ l: E2("Aceptar", "Accept"), v: "primary", icon: "check", onClick: () => paso(c, x, "aceptar") }, { l: E2("Rechazar", "Decline"), v: "secondary", icon: null, onClick: () => paso(c, x, "rechazar") }] : undefined,
    bd: x.st === "pend" ? "1.5px solid var(--tl-ink)" : undefined,
  };
}

/* Hoy: cifras, los que esperan respuesta y la agenda de hoy. */
export function hoyPedidos(c: Ctx): (Bloque | null)[] {
  // Pedidos y reservaciones de mesa juntos: lo que espera respuesta primero (Panel v2 · DASH-HOY).
  const { E2, d } = c, H = c.ped?.hoy, M = hoyMesas(c), pend = [...(H?.pend ?? []).map((x) => reqRow(c, x)), ...M.pend], agenda = [...(H?.agenda ?? []).map((x) => reqRow(c, x, false)), ...M.agenda];
  const cols2 = c.desk && c.w >= 1100 && !c.ruta.det ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)";
  const out: (Bloque | null)[] = [{ type: "kpis", cols: c.desk ? "repeat(4,minmax(0,1fr))" : undefined, items: [
    { k: E2("ESPERAN TU RESPUESTA", "AWAITING YOU"), v: String(pend.length), bg: pend.length ? "var(--tl-ink)" : undefined, fg: pend.length ? "var(--tl-white)" : undefined, bd: pend.length ? "none" : undefined, sFg: "rgba(255,255,255,.65)", s: pend.length ? E2("responde en menos de 10 min", "reply within 10 min") : undefined },
    { k: E2("HOY EN TU AGENDA", "ON TODAY’S AGENDA"), v: String(agenda.length) },
    { k: E2("VENDIDO HOY", "SOLD TODAY"), v: `$${((H?.vendido ?? 0) / 100).toFixed(0)}` },
    { k: E2("VISTAS HOY", "VIEWS TODAY"), v: String(d.kpis.viewsToday) },
  ] }];
  if (!d.pro) out.push({ type: "note", tone: "warn", icon: "star", t: d.usadosMes >= d.tope
    ? E2(`Free: llegaste a ${d.tope} de ${d.tope} pedidos o citas en línea este mes. Hasta el día 1, los vecinos te llaman o te escriben. Con Pro no hay límite.`, `Free: you reached ${d.tope} of ${d.tope} online orders or bookings this month. Until the 1st, neighbors call or message you. Pro has no limit.`)
    : E2(`Free: ${d.usadosMes} de ${d.tope} pedidos o citas en línea este mes. Al llegar a ${d.tope}, te contactan por teléfono.`, `Free: ${d.usadosMes} of ${d.tope} online orders or bookings this month. After ${d.tope}, clients call you.`) });
  out.push({ type: "rows", k: E2("ESPERAN TU RESPUESTA", "AWAITING YOUR REPLY"), cols: cols2, items: pend });
  if (!pend.length) out.push({ type: "empty", icon: "check", t: E2("Nada pendiente", "Nothing pending"), s: E2("Te avisamos al instante cuando llegue algo.", "We alert you the moment something arrives.") });
  if (agenda.length) out.push({ type: "rows", k: E2("HOY EN TU AGENDA", "TODAY’S AGENDA"), link: E2("Ver Clientes", "See Clients"), onLink: () => c.go("cli"), cols: cols2, items: agenda });
  return out;
}

/* Detalle de un pedido (detBlocks): cliente, prometido, pago, nota, platos, total, historial y lo que sigue. */
export function pedidoDetalle(c: Ctx): Sec {
  const { E2, es } = c, x = c.ped?.det;
  if (!x) return { blocks: [{ type: "head", t: E2("Pedido no encontrado", "Order not found"), onBack: c.closeDet }, { type: "empty", icon: "bag", t: E2("Ese pedido no existe", "That order does not exist"), s: E2("Puede ser de otro negocio.", "It may belong to another business.") }], ed: null };
  const out: (Bloque | null)[] = [
    { type: "head", eye: `${E2("PEDIDO", "ORDER")} · ${x.who.toUpperCase()}`, t: `${E2("Pedido", "Order")} #${x.numero} · ${x.modo}`, s: es ? x.s.es : x.s.en, onBack: c.closeDet },
    { type: "kv", items: [{ k: E2("CLIENTE", "CLIENT"), v: x.who }, { k: E2("PROMETIDO", "PROMISED"), v: x.listo }, { k: E2("PAGO", "PAYMENT"), v: E2("En el local", "At the store") }] },
  ];
  if (x.nota) out.push({ type: "note", tone: "warn", icon: "edit", t: `${E2("Nota del cliente: ", "Client note: ")}${x.nota}` });
  out.push({ type: "rows", k: E2("DETALLE", "DETAIL"), items: [
    ...x.lineas.map((l): Fila => ({ icon: "check", ibg: "var(--tl-paper)", ifg: "rgba(11,14,18,.6)", t: `${l.q} × ${es ? l.name.es : l.name.en || l.name.es}`,
      s: [l.opts.map((o) => (es ? o.es : o.en || o.es)).join(" · "), l.nota ? `“${l.nota}”` : ""].filter(Boolean).join(" · ") || undefined, r: money(l.cents), compact: true, chev: false })),
    { icon: "wallet", t: E2("Total", "Total"), s: `${E2("platos", "items")} ${money(x.sub)} · ${E2("impuestos", "taxes")} ${money(x.tax)}`, r: money(x.amt), compact: true, chev: false },
  ] });
  if (x.tl.length) out.push({ type: "timeline", k: E2("HISTORIAL", "HISTORY"), items: x.tl.map((t, i) => ({ t: es ? t.t.es : t.t.en, s: t.at, now: i === x.tl.length - 1 }))
    .concat(x.st === "pend" ? [{ t: E2("Tu respuesta", "Your reply"), s: E2("AHORA", "NOW"), future: true } as never] : []) });
  const row = reqRow(c, x);
  if (row.acts?.length) out.push({ type: "acts", pt: "4px", items: row.acts.map((a) => ({ ...a, off: c.pending })) });
  if (x.st === "pend") out.push({ type: "note", tone: "info", t: E2(`Pagan en el local al recoger. Si no respondes antes de las ${x.responde}, se cancela solo.`, `They pay at the store at pickup. If you do not reply by ${x.responde}, it cancels on its own.`) });
  if (x.st === "ok") out.push({ type: "acts", items: [{ l: E2("Listo para recoger", "Ready for pickup"), v: "primary", icon: "check", off: c.pending, onClick: () => paso(c, x, "listo") }] });
  if (x.st === "ready") out.push({ type: "acts", items: [{ l: E2("Entregado", "Delivered"), v: "primary", icon: "check", off: c.pending, onClick: () => paso(c, x, "entregado") }] });
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
  const F = c.form("ped:" + d.id, { prep: a.prep, sched: a.sched, auto: a.auto, cashP: a.cashP, cashD: a.cashD, tip: a.tip }), v = F.d, pk = v.prep + a.busy;
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
    { icon: "card", t: E2("Tarjeta en la app", "Card in the app"), s: E2("Conecta tus cobros para recibir tarjeta.", "Connect payouts to take cards."), tgOn: false, lock: true, onTg: () => c.toast(E2("Los cobros con tarjeta llegan pronto.", "Card payouts are coming soon.")) },
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
  const faltaP = a.pickup && !v.cashP, faltaD = a.delivery && !(v.cashD && !ext);
  if (faltaP || faltaD) out.push({ type: "note", tone: "warn", t: `${F.dirty ? E2("Para guardar falta: ", "To save, add: ") : E2("Hoy falta: ", "Missing today: ")}${[faltaP ? E2("cómo te pagan en pickup", "how they pay for pickup") : "", faltaD ? E2("cómo te pagan en delivery", "how they pay for delivery") : ""].filter(Boolean).join(" · ")}.` });
  if (a.on && !a.admOff) out.push({ type: "acts", items: [{ l: E2("Apagar Pedidos en línea", "Turn off Online orders"), v: "secondary", icon: null, onClick: () => c.run(() => pedidosModulo(d.id, false), E2("Pedidos en línea apagado.", "Online orders off.")) }] });
  const ed: Editor = { F, l: E2("Guardar", "Save"), valid: !faltaP && !faltaD, apply: (x: typeof v) => pedidosAjustes(d.id, x), toast: E2("Guardado · el cliente ya lo ve así.", "Saved · clients see it like this now.") };
  return { blocks: out, ed };
}
