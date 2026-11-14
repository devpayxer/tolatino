"use client";
/* Entrega (Panel v2 · dlvBlocks, revisión 25 oct): cómo entregas (Delivery, Pickup), cómo se recoge, zona y costo,
   tiempo y horario, quién entrega (mi equipo o una app externa) y «Así lo ve el cliente». Con «Mi equipo»: Tus repartidores
   (invitar con código, quitar), quién está en línea y el cuadre de efectivo de hoy (plan apps-delivery-checkin §1.5; sin
   diseño propio: compuesto, ver REVISION). El despacho (asignar) vive en el detalle de cada pedido. */
import type { PanelBloqueT as Bloque } from "@tolatino/ui";
import { entregaAjustes, type EntregaIn } from "./acciones-pedidos";
import { repInvitar, repPruebas, repQuitar } from "./acciones-repartidores";
import type { Ctx, Editor } from "./Panel";

type Sec = { blocks: (Bloque | null)[]; ed: Editor | null };
const mn = (c: number) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;
const ZONA: Record<number, [string, string]> = { 1: ["Unas cuadras a la redonda", "A few blocks around"], 3: ["Tu barrio y los de al lado", "Your neighborhood and nearby"], 5: ["Casi toda la ciudad", "Most of the city"], 10: ["La ciudad y pueblos cercanos", "The city and nearby towns"] };
export const extL = (ext: string | null, es: boolean) => (ext === "doordash" ? "DoorDash" : ext === "uber_eats" ? "Uber Eats" : es ? "una app externa" : "an external app");

export function entregaBloques(c: Ctx): Sec {
  const { E2, es, d } = c, a = c.ped?.aj;
  const out: (Bloque | null)[] = [{ type: "head", t: E2("Entrega", "Delivery"), s: E2("Cómo llegan tus pedidos. La usa Menú.", "How your orders get there. Used by Menu.") }];
  if (!a) return { blocks: out, ed: null };
  if (a.dlvAdm) out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`To’Latino pausó tu delivery: en tu página solo sale pickup. Motivo: ${a.dlvAdm}`, `To’Latino paused your delivery: your page only offers pickup. Reason: ${a.dlvAdm}`) });
  if (a.admOff) out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`To’Latino pausó tus Pedidos en línea: nadie puede pedir en la app. Motivo: ${a.admOff}`, `To’Latino paused your Online orders: nobody can order in the app. Reason: ${a.admOff}`) });
  else if (!a.on) out.push({ type: "note", tone: "info", icon: "bag", t: E2("Pedidos en línea está apagado: esto se aplica cuando lo enciendas.", "Online orders is off: this applies once you turn it on."), cta: E2("Pedidos en línea", "Online orders"), onCta: () => c.go("mod", "pedidos") });

  const base: EntregaIn = { delivery: a.delivery, pickup: a.pickup, pkNote: (es ? a.pickupNote?.es : a.pickupNote?.en) ?? "", zone: a.zone, fee: a.fee, free: a.free, min: a.min, travel: a.travel, dEnd: a.dEnd, who: a.who, ext: a.ext };
  const F = c.form<EntregaIn>(`dlv:${d.id}`, base), v = F.d;
  const pk = a.prep + a.busy, dl = [pk + v.travel, pk + 2 * v.travel];
  const chips = <K extends keyof EntregaIn>(k: string, key: K, ops: [EntregaIn[K], string][], help?: string): Bloque => ({ type: "chips", k, help, items: ops.map(([n, l]) => ({ l, v: v[key] === n ? "selected" : "filter", onClick: () => F.set({ [key]: n } as Partial<EntregaIn>) })) });

  out.push({ type: "group", k: E2("CÓMO ENTREGAS", "HOW YOU DELIVER"), first: true }, { type: "rows", items: [
    { icon: "truck", t: "Delivery", s: E2("Llevas el pedido a la casa", "You bring it to their home"), tgOn: v.delivery, onTg: () => F.set({ delivery: !v.delivery }), chev: false },
    { icon: "store", t: "Pickup", s: E2("Lo recogen en tu local", "They pick it up at your place"), tgOn: v.pickup, onTg: () => F.set({ pickup: !v.pickup }), chev: false },
  ] });
  const none = !v.delivery && !v.pickup;
  if (none) out.push({ type: "note", tone: "warn", t: E2("Con todo apagado nadie puede pedir en la app. Enciende al menos una.", "With everything off nobody can order in the app. Turn on at least one.") });
  if (v.pickup) out.push({ type: "group", k: "PICKUP" }, { type: "field", k: E2("CÓMO SE RECOGE · OPCIONAL", "HOW TO PICK UP · OPTIONAL"), val: v.pkNote, max: 120, onChange: (x) => F.set({ pkNote: x }),
    ph: E2("Ej. Pide en la caja con tu número de pedido.", "e.g. Ask at the register with your order number."), help: E2("Lo ve el cliente al pedir y en su pedido.", "The client sees it when ordering and in their order."), count: `${v.pkNote.length}/120` });
  if (v.delivery) {
    out.push({ type: "group", k: E2("ZONA Y COSTO", "AREA AND FEE") },
      chips(E2("HASTA DÓNDE LLEVAS", "HOW FAR YOU DELIVER"), "zone", [1, 3, 5, 10].map((z) => [z, `${z} mi`] as [number, string]), (es ? ZONA[v.zone]![0] : ZONA[v.zone]![1]).toUpperCase()),
      chips(E2("LO QUE COBRAS POR LLEVARLO", "DELIVERY FEE"), "fee", [[0, E2("Gratis", "Free")], [200, "$2"], [300, "$3"], [400, "$4"], [500, "$5"]]));
    if (v.fee) out.push(chips(E2("GRATIS DESDE", "FREE FROM"), "free", [[0, E2("Nunca", "Never")], [2500, "$25"], [4000, "$40"], [6000, "$60"]]));
    out.push(chips(E2("PEDIDO MÍNIMO PARA DELIVERY", "DELIVERY MINIMUM"), "min", [[0, E2("Sin mínimo", "No minimum")], [1000, "$10"], [1500, "$15"], [2000, "$20"], [2500, "$25"]]));
    if (v.fee && v.free && v.min >= v.free) out.push({ type: "note", tone: "info", t: E2("Tu mínimo es igual o mayor que «gratis desde»: todos los delivery salen gratis.", "Your minimum is at or above “free from”: every delivery is free.") });
    out.push({ type: "group", k: E2("TIEMPO Y HORARIO", "TIME AND HOURS") },
      chips(E2("TIEMPO DE CAMINO", "TRAVEL TIME"), "travel", [[10, "10–20 min"], [15, "15–30 min"], [20, "20–40 min"]], `${E2("LLEGA EN ", "ARRIVES IN ")}${dl[0]}–${dl[1]} MIN`),
      { type: "rows", items: [{ icon: "clock", t: `${E2("Preparación: ", "Prep: ")}${pk} min`, s: E2("Se cambia en Pedidos en línea. El cliente ve preparación + camino.", "Change it in Online orders. The client sees prep + travel."), onClick: () => c.go("mod", "pedidos") }] },
      chips(E2("ÚLTIMO DELIVERY", "LAST DELIVERY"), "dEnd", [[0, E2("Con tu último pedido", "With your last order")], [30, E2("30 min antes de cerrar", "30 min before closing")], [60, E2("1 h antes de cerrar", "1 h before closing")]]));
    out.push({ type: "group", k: E2("QUIÉN ENTREGA", "WHO DELIVERS") }, chips("", "who", [["team", E2("Mi equipo", "My team")], ["external", E2("Una app externa", "An external app")]]));
    if (v.who === "external") out.push(chips(E2("CUÁL", "WHICH ONE"), "ext", [["doordash", "DoorDash"], ["uber_eats", "Uber Eats"], ["other", E2("Otra", "Other")]]),
      { type: "note", tone: "info", t: E2(`Tomas el pedido aquí y lo mandas por ${extL(v.ext, true)}. Pegas el enlace de seguimiento en el pedido y el cliente lo ve. Con una app externa no se cobra efectivo al entregar.`, `You take the order here and send it through ${extL(v.ext, false)}. Paste the tracking link on the order and the client sees it. External apps do not collect cash on delivery.`) });
  }
  const VW: [string, string][] = [
    ...(v.delivery ? [
      ["truck", E2(`Delivery hasta ${v.zone} mi · envío ${v.fee ? `${mn(v.fee)}${v.free ? `, gratis desde ${mn(v.free)}` : ""}` : "gratis"}${v.min ? ` · mínimo ${mn(v.min)}` : ""} · llega en ${dl[0]}–${dl[1]} min.`, `Delivery up to ${v.zone} mi · fee ${v.fee ? `${mn(v.fee)}${v.free ? `, free from ${mn(v.free)}` : ""}` : "free"}${v.min ? ` · minimum ${mn(v.min)}` : ""} · arrives in ${dl[0]}–${dl[1]} min.`)],
      ["pin", E2("Si vive más lejos: «No llega a tu dirección · pide pickup».", "If they live farther: “Does not reach your address · order pickup”.")],
    ] as [string, string][] : []),
    ...(v.delivery && v.who === "external" ? [["car", E2(`Lo lleva ${extL(v.ext, true)} y lo sigue con el enlace.`, `Delivered by ${extL(v.ext, false)}; they follow it with the link.`)]] as [string, string][] : []),
    ...(v.pickup ? [["store", `${E2(`Pickup · listo en ${pk} min`, `Pickup · ready in ${pk} min`)}${v.pkNote.trim() ? ` · «${v.pkNote.trim()}»` : ""}.`]] as [string, string][] : []),
  ];
  if (VW.length) out.push({ type: "rows", k: E2("ASÍ LO VE EL CLIENTE", "HOW THE CLIENT SEES IT"), items: VW.map(([icon, t]) => ({ icon, t, compact: true, chev: false })) });
  // Tus repartidores (con «Mi equipo»): la app To'Latino Repartidor en su teléfono.
  if (a.delivery && a.who === "team" && c.reps) {
    const R = c.reps, inv = c.ui.repInv as { n: string; t: string } | undefined, cod = c.ui.repCod as string | undefined;
    const VH: Record<string, [string, string]> = { pie: ["a pie", "on foot"], bici: ["bici", "bike"], moto: ["moto", "motorbike"], auto: ["auto", "car"], camioneta: ["camioneta", "van"] };
    out.push({ type: "group", k: E2(`TUS REPARTIDORES · ${R.filter((x) => x.estado === "active").length}`, `YOUR DRIVERS · ${R.filter((x) => x.estado === "active").length}`) });
    if (R.length) out.push({ type: "rows", items: R.map((x) => ({ key: x.id, icon: "truck", t: x.nombre,
      s: x.estado === "invited" ? E2(`Invitado · código ${x.codigo ?? "—"} · que entre a tolatino.com/repartidor con su teléfono`, `Invited · code ${x.codigo ?? "—"} · they open tolatino.com/repartidor with their phone`)
        : `${(VH[x.vehiculo ?? ""] ?? ["", ""])[es ? 0 : 1]}${x.enLinea ? E2(" · en línea", " · online") : E2(" · fuera de línea", " · offline")} · ${x.hoy.entregas} ${E2("hoy", "today")}${x.hoy.activos ? ` · ${x.hoy.activos} ${E2("en curso", "active")}` : ""}`,
      tag: x.estado === "invited" ? E2("INVITADO", "INVITED") : x.enLinea ? E2("EN LÍNEA", "ONLINE") : null, tone: x.enLinea ? "signal" : "neutral", chev: false,
      acts: [{ l: x.estado === "invited" ? E2("Cancelar", "Cancel") : E2("Quitar", "Remove"), v: "secondary", off: c.pending,
        onClick: () => { if (window.confirm(E2(`¿Quitar a ${x.nombre}?`, `Remove ${x.nombre}?`))) c.run(() => repQuitar(d.id, x.id, ""), E2("Quitado. Lo que tenía asignado queda sin repartidor.", "Removed. Their assigned orders are unassigned.")); } }] })) });
    if (cod) out.push({ type: "note", tone: "ok", icon: "check", t: E2(`Dale este código: ${cod}. Que abra tolatino.com/repartidor, entre con su teléfono y escriba el código. Vence en 7 días.`, `Give them this code: ${cod}. They open tolatino.com/repartidor, sign in with their phone and type the code. It expires in 7 days.`), cta: E2("Listo", "Done"), onCta: () => c.setUi({ repCod: undefined }) });
    if (inv) {
      out.push({ type: "field", k: E2("NOMBRE", "NAME"), val: inv.n, onChange: (v: string) => c.setUi({ repInv: { ...inv, n: v.slice(0, 40) } }) });
      out.push({ type: "field", k: E2("TELÉFONO · CON ESE NÚMERO ENTRA", "PHONE · THEY SIGN IN WITH IT"), val: inv.t, onChange: (v: string) => c.setUi({ repInv: { ...inv, t: v.replace(/[^0-9()\- ]/g, "").slice(0, 16) } }) });
      out.push({ type: "acts", items: [{ l: E2("Crear código", "Create code"), v: "primary", icon: "check", off: c.pending || inv.n.trim().length < 2 || inv.t.replace(/\D/g, "").length < 10,
        onClick: () => c.run(() => repInvitar(d.id, inv.n, inv.t), undefined, (r) => c.setUi({ repInv: undefined, repCod: r?.codigo })) }, { l: E2("Cancelar", "Cancel"), v: "secondary", onClick: () => c.setUi({ repInv: undefined }) }] });
    } else out.push({ type: "acts", items: [{ l: E2("Invitar repartidor", "Invite a driver"), v: "secondary", icon: "plus", onClick: () => c.setUi({ repInv: { n: "", t: "" } }) }] });
    // 9n · Lo que pide el negocio al recoger y al entregar (se guarda al tocar; queda en la auditoría).
    out.push({ type: "rows", k: E2("AL RECOGER Y AL ENTREGAR", "AT PICKUP AND DELIVERY"), items: [
      { icon: "lock", t: E2("Código de recogida", "Pickup code"), s: E2("Cada pedido trae un código de 4 números en su detalle: se lo dices al repartidor cuando le das el pedido.", "Each order has a 4-digit code in its detail: tell it to the driver when you hand over the order."),
        tgOn: a.pickupCode, onTg: () => c.run(() => repPruebas(d.id, a.proof, !a.pickupCode), a.pickupCode ? E2("Ya no se pide el código de recogida.", "Pickup code no longer required.") : E2("Listo: el repartidor escribe el código al recoger.", "Done: the driver types the code at pickup.")), chev: false },
      { icon: "camera", t: E2("Prueba de entrega", "Proof of delivery"), s: E2("El repartidor toma una foto de la entrega o escribe el código que le dice el cliente. Sin prueba no se marca «Entregado».", "The driver takes a delivery photo or types the code the customer gives them. Without proof it cannot be marked “Delivered”."),
        tgOn: a.proof, onTg: () => c.run(() => repPruebas(d.id, !a.proof, a.pickupCode), a.proof ? E2("Ya no se pide prueba de entrega.", "Proof of delivery no longer required.") : E2("Listo: cada entrega lleva foto o código.", "Done: every delivery has a photo or a code.")), chev: false },
    ] });
    const cuadre = R.filter((x) => x.hoy.efectivo > 0);

    if (cuadre.length) out.push({ type: "rows", k: E2("EFECTIVO DE HOY · LO ENTREGAN AL CERRAR", "TODAY'S CASH · THEY HAND IT IN AT CLOSING"), items: cuadre.map((x) => ({ key: `c${x.id}`, icon: "dollar", t: x.nombre, s: `${x.hoy.entregas} ${x.hoy.entregas === 1 ? E2("entrega", "delivery") : E2("entregas", "deliveries")}`, r: mn(x.hoy.efectivo), chev: false, compact: true })) });
  }
  // El pago en delivery vive en Pedidos en línea: si falta, se dice aquí.
  if (v.delivery && a.delivery && !a.cashD && !a.card) out.push({ type: "note", tone: "warn", t: E2("Falta cómo te pagan en delivery: enciende «Efectivo al entregar» en Pedidos en línea.", "Missing how they pay on delivery: turn on “Cash on delivery” in Online orders."), cta: E2("Pedidos en línea", "Online orders"), onCta: () => c.go("mod", "pedidos") });
  if (none && F.dirty) out.push({ type: "note", tone: "warn", t: E2("Para guardar falta: una forma de entrega.", "To save, add: a delivery method.") });
  const ed: Editor = { F, l: E2("Guardar", "Save"), valid: !none, apply: (x: EntregaIn) => entregaAjustes(d.id, x), toast: E2("Guardado · el cliente ya lo ve así.", "Saved · clients see it like this now.") };
  return { blocks: out, ed };
}
