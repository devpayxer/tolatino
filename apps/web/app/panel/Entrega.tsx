"use client";
/* Entrega (Panel v2 · dlvBlocks, revisión 25 oct): cómo entregas (Delivery, Pickup), cómo se recoge, zona y costo,
   tiempo y horario, quién entrega (mi equipo o una app externa) y «Así lo ve el cliente». Tus repartidores, Despacho y
   Cuadre de efectivo llegan con la app Repartidor (ver docs/REVISION.md). El servidor valida y guarda (entregaAjustes). */
import type { PanelBloqueT as Bloque } from "@tolatino/ui";
import { entregaAjustes, type EntregaIn } from "./acciones-pedidos";
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
  // El pago en delivery vive en Pedidos en línea: si falta, se dice aquí.
  if (v.delivery && a.delivery && !a.cashD && !a.card) out.push({ type: "note", tone: "warn", t: E2("Falta cómo te pagan en delivery: enciende «Efectivo al entregar» en Pedidos en línea.", "Missing how they pay on delivery: turn on “Cash on delivery” in Online orders."), cta: E2("Pedidos en línea", "Online orders"), onCta: () => c.go("mod", "pedidos") });
  if (none && F.dirty) out.push({ type: "note", tone: "warn", t: E2("Para guardar falta: una forma de entrega.", "To save, add: a delivery method.") });
  const ed: Editor = { F, l: E2("Guardar", "Save"), valid: !none, apply: (x: EntregaIn) => entregaAjustes(d.id, x), toast: E2("Guardado · el cliente ya lo ve así.", "Saved · clients see it like this now.") };
  return { blocks: out, ed };
}
