"use client";
/* El pedido del mercado en el panel (4p · hueco #2 del plan: el diseño no trae «pesar», compuesto con los bloques del panel).
   Hoy: los que esperan que aceptes (10 min) y los de hoy. El detalle: aceptar / no puedo; por cada línea por libra el PESO REAL
   y la FOTO DE LA BALANZA (obligatoria); «No hay» → quitarlo o proponer otro producto (el cliente acepta en 10 min); «Mandar al
   cliente» (el total real nunca pasa lo retenido sin su OK: 9n-4 «Pedir OK por $X más»); listo / en camino; lo recogió / entregado (se cobra lo
   real si no lo aprobó). 9n-4: el sustituto también puede ser por libra (se pesa con su foto).
   9n · Envío con el repartidor: con repartidores en la app, «Está listo · para el repartidor» y el despacho de Comida (ofrecer con cuenta regresiva,
   asignar, el código de recogida, el mapa en vivo y la prueba). Desde que el repartidor lo tiene, aquí se ve SU estado: «Va en camino» y
   «Entregado» son suyos (y ahí se cobra lo real). Sin repartidor, el mercado lo lleva como antes. */
import { ayudaCita } from "./Citas";
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { FilaMerc, MercadoVista } from "@/lib/mercado";
import type { AjustesPed } from "@/lib/pedidos";
import { subirFoto } from "@/lib/subir-foto";
import { mercNoHay, mercPaso, mercPesar } from "./acciones-mercado";
import { repAsignar, repOfertaCancelar, repOfrecer, repRecogido } from "./acciones-repartidores";
import { rutaBloque, type RutaUi } from "./RutaPanel";
import type { Ctx, Editor } from "./Panel";

type Sec = { blocks: (Bloque | null)[]; ed: Editor | null };
type Bi = { es: string; en: string };
export type MercPanel = { hoy?: FilaMerc[]; det?: MercadoVista | null; prods?: { id: string; name: Bi; cents: number; k: string }[]; aj?: AjustesPed };
const money = (c: number) => `$${(c / 100).toFixed(2)}`;

export function hoyMercado(c: Ctx): Bloque[] {
  const { E2 } = c, L = c.mped?.hoy ?? [];
  if (!L.length) return [];
  const pend = L.filter((x) => x.st === "pending").length;
  const tag = (x: FilaMerc) => x.st === "pending" ? E2("ACEPTA EN 10 MIN", "ACCEPT IN 10 MIN") : x.st === "done" ? E2("ENTREGADO", "DONE")
    : x.detalle === "preparando" ? E2("POR PESAR", "TO WEIGH") : x.detalle === "pesado" ? E2("ESPERA AL CLIENTE", "AWAITING CLIENT")
    : x.detalle === "listo" ? (x.modo === "delivery" ? (x.rep ? E2("REPARTIDOR ASIGNADO", "DRIVER ASSIGNED") : E2("LISTO · POR SALIR", "READY · TO GO OUT")) : E2("LISTO", "READY"))
    : x.rep ? E2("EN CAMINO · REPARTIDOR", "ON THE WAY · DRIVER") : E2("EN CAMINO", "ON THE WAY");
  return [{ type: "rows", k: `${E2("PEDIDOS DEL MERCADO", "MARKET ORDERS")}${pend ? ` · ${pend} ${E2("POR ACEPTAR", "TO ACCEPT")}` : ""}`, items: L.map((x): Fila => ({
    key: x.numero, icon: x.modo === "delivery" ? "truck" : "bag", t: `${x.who} · ${x.n} ${x.n === 1 ? E2("artículo", "item") : E2("artículos", "items")} · ${E2("estimado ", "estimate ")}${money(x.est)}`,
    s: `${x.numero} · ${x.modo === "delivery" ? E2("envío", "delivery") : "pickup"} · ${x.cuando}${x.rep ? ` · ${x.rep}` : ""}`, tag: tag(x), tone: x.st === "pending" ? "action" : x.detalle === "preparando" ? "ink" : "signal", chev: true, onClick: () => c.det(`merc:${x.numero}`) })) }];
}

/* 9n · El envío y el repartidor (los mismos bloques del despacho de Comida, Pedidos.tsx): quién lo lleva y en qué va, la oferta con su cuenta
   regresiva, a quién asignarlo, el código de recogida, el mapa en vivo y la prueba de la entrega. El panel nunca ve el código del cliente. */
function repartoMerc(c: Ctx, x: MercadoVista): (Bloque | null)[] {
  const { E2, es } = c, k = x.reparto, D = x.detalle, out: (Bloque | null)[] = [];
  if (x.modo !== "delivery" || !k) return out;
  const vivo = x.st === "confirmed";
  if (vivo && k.rep) {
    out.push(rutaBloque(c.ui.ruta as RutaUi | undefined, x.numero, es, k.rep.nombre));
    const st = D === "camino" ? (k.llego ? E2("Llegó con el pedido", "Arrived with the order") : E2("Va en camino", "On the way")) : k.empezo ? E2("Va por el pedido", "Heading to pick it up") : E2("Asignado · lo ve en su app", "Assigned · they see it in their app");
    out.push({ type: "rows", k: E2("REPARTIDOR", "DRIVER"), items: [{ icon: "truck", t: k.rep.nombre, s: st, tag: D === "camino" ? E2("EN CAMINO", "ON THE WAY") : null, tone: "signal", chev: false, compact: true,
      acts: [{ l: E2("Quitar", "Remove"), v: "secondary", off: c.pending, onClick: () => { if (window.confirm(E2(`¿Quitarle el pedido a ${k.rep!.nombre}? Lo ofreces a otro o lo terminas tú.`, `Remove the order from ${k.rep!.nombre}? You offer it to someone else or finish it yourself.`))) c.run(() => repAsignar(c.d.id, x.numero, null), E2("Quitado. Ofrécelo a otro o llévalo tú.", "Removed. Offer it to someone else or take it yourself.")); } }] }] });
    if (k.recogida && !k.recogido && D === "listo") out.push({ type: "rows", k: E2("CÓDIGO DE RECOGIDA", "PICKUP CODE"), items: [{ icon: "lock", t: k.recogida, s: E2("Díselo al repartidor cuando le des el pedido. El cliente no lo ve.", "Tell it to the driver when you hand over the order. The customer does not see it."), chev: false, compact: true,
      acts: [{ l: E2("Ya se lo di", "Already handed over"), v: "secondary", off: c.pending, onClick: () => c.run(() => repRecogido(c.d.id, x.numero), E2("Listo: puede marcar «Recogí».", "Done: they can mark “Picked up”.")) }] }] });
    out.push({ type: "note", tone: "info", icon: "check", t: x.aprobado ? E2(`Lo entrega ${k.rep.nombre} con prueba (foto o el código del cliente). El cliente ya aprobó el cobro.`, `${k.rep.nombre} delivers it with proof (photo or the customer's code). The client already approved the charge.`)
      : E2(`Lo entrega ${k.rep.nombre} con prueba (foto o el código del cliente). Al marcar «Entregado» se cobra lo real (${money(Math.min(x.t.real, x.t.ret))}) y se libera el resto.`, `${k.rep.nombre} delivers it with proof (photo or the customer's code). When they mark “Delivered”, the real total (${money(Math.min(x.t.real, x.t.ret))}) is charged and the rest released.`) });
  } else if (vivo && D === "listo") {
    if (k.oferta) out.push({ type: "note", tone: "info", icon: "clock", t: E2(`Ofrecido ${k.oferta.a ? `a ${k.oferta.a}` : "a tus repartidores en línea"} · vence en ${k.oferta.seg} s${k.oferta.rechazos ? ` · ${k.oferta.rechazos} lo rechazaron` : ""}. El primero que acepta va por él.`,
      `Offered ${k.oferta.a ? `to ${k.oferta.a}` : "to your online drivers"} · expires in ${k.oferta.seg} s${k.oferta.rechazos ? ` · ${k.oferta.rechazos} declined` : ""}. The first to accept heads there.`),
      cta: E2("Cancelar oferta", "Cancel offer"), onCta: () => c.run(() => repOfertaCancelar(c.d.id, x.numero), E2("Oferta cancelada.", "Offer cancelled.")) });
    else {
      const R = (c.reps ?? []).filter((r) => r.estado === "active").sort((p, q) => Number(q.enLinea) - Number(p.enLinea));
      if (R.some((r) => r.enLinea)) out.push({ type: "acts", items: [{ l: E2("Ofrecer a los que están en línea", "Offer to online drivers"), v: "primary", icon: "clock", off: c.pending, onClick: () => c.run(() => repOfrecer(c.d.id, x.numero, null), E2("Ofrecido. Te avisamos cuando alguien lo acepte.", "Offered. We will tell you when someone accepts.")) }] });
      if (R.length) out.push({ type: "rows", k: E2("¿QUIÉN LO LLEVA?", "WHO TAKES IT?"), items: R.map((r) => ({ key: r.id, icon: "truck", t: r.nombre, s: `${r.enLinea ? E2("en línea", "online") : E2("fuera de línea", "offline")}${r.hoy.activos ? ` · ${r.hoy.activos} ${E2("en curso", "active")}` : ""}`, tag: r.enLinea ? E2("EN LÍNEA", "ONLINE") : null, tone: "signal", chev: false, compact: true,
        acts: [{ l: E2("Asignar", "Assign"), v: "primary", off: c.pending, onClick: () => c.run(() => repAsignar(c.d.id, x.numero, r.id), E2(`Asignado a ${r.nombre}. Ya le llegó el aviso.`, `Assigned to ${r.nombre}. They got the notice.`)) },
          ...(r.enLinea ? [{ l: E2("Ofrecer", "Offer"), v: "secondary", off: c.pending, onClick: () => c.run(() => repOfrecer(c.d.id, x.numero, r.id), E2(`Ofrecido a ${r.nombre}.`, `Offered to ${r.nombre}.`)) }] : [])] })) });
      else out.push({ type: "note", tone: "info", icon: "truck", t: E2("Sin repartidores activos: invítalos en Entrega, o llévalo tú.", "No active drivers: invite them in Delivery, or take it yourself."), cta: E2("Entrega", "Delivery"), onCta: () => c.go("dlv") });
    }
    out.push({ type: "acts", items: [{ l: E2("Va en camino · lo llevo yo", "On the way · I take it"), v: "secondary", icon: "truck", off: c.pending, onClick: () => c.run(() => mercPaso(c.d.id, x.numero, "camino"), E2("Listo: el cliente sabe que va en camino.", "Done: the client knows it is on the way.")) }] });
  }
  // La prueba de la entrega (foto privada o el código del cliente) y los mensajes del repartidor al cliente.
  if (k.prueba.length) {
    const PR: Record<string, [string, string]> = { foto: ["foto", "photo"], codigo: ["código del cliente", "customer code"], negocio: ["marcado por tu equipo", "marked by your team"] };
    out.push({ type: "rows", k: E2("PRUEBA DE ENTREGA", "PROOF OF DELIVERY"), items: [{ icon: "image", t: k.prueba.map((p) => (PR[p] ?? [p, p])[es ? 0 : 1]).join(" · "), s: E2("Queda como evidencia si el cliente reclama.", "It is kept as evidence if the customer complains."), chev: false, compact: true,
      acts: k.foto ? [{ l: E2("Ver foto", "See photo"), v: "secondary", icon: "image", onClick: () => window.open(`/api/entrega/foto/${k.foto}`, "_blank", "noopener") }] : undefined }] });
  }
  return out;
}

export function mercadoDetalle(c: Ctx): Sec {
  const { E2, es, ui } = c, x = c.mped?.det, nm = (b: Bi) => (es ? b.es : b.en || b.es);
  if (!x) return { blocks: [{ type: "head", t: E2("Pedido no encontrado", "Order not found"), onBack: c.closeDet }, { type: "empty", icon: "bag", t: E2("Ese pedido no existe", "That order does not exist"), s: E2("Puede ser de otro negocio.", "It may belong to another business.") }], ed: null };
  const t = x.t, D = x.detalle, pesando = x.st === "confirmed" && (D === "preparando" || D === "pesado") && !x.aprobado;
  const stL = x.st === "pending" ? E2("POR ACEPTAR", "TO ACCEPT") : x.st === "confirmed" ? ({ preparando: E2("POR PESAR", "TO WEIGH"), pesado: E2("ESPERA AL CLIENTE", "AWAITING CLIENT"), listo: E2("LISTO", "READY"), camino: E2("EN CAMINO", "ON THE WAY") } as Record<string, string>)[D ?? ""] ?? ""
    : x.st === "done" ? E2("ENTREGADO", "DONE") : x.st === "declined" ? E2("NO PUDISTE", "DECLINED") : x.st === "expired" ? E2("VENCIÓ", "EXPIRED") : E2("CANCELADO", "CANCELLED");
  const subL = ({ call: E2("Llámame", "Call me"), similar: E2("Uno parecido, con su OK", "A similar one, with their OK"), no: E2("No sustituir", "Do not substitute") } as Record<string, string>)[x.sub] ?? x.sub;
  const out: (Bloque | null)[] = [
    { type: "head", eye: `${E2("PEDIDO DEL MERCADO", "MARKET ORDER")} · ${stL}`, t: x.numero, s: `${x.modo === "delivery" ? E2("Envío", "Delivery") : "Pickup"} · ${new Intl.DateTimeFormat(es ? "es-US" : "en-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(x.cuando)).replace(/\./g, "")}`, onBack: c.closeDet },
    { type: "kv", items: [{ k: E2("ESTIMADO", "ESTIMATE"), v: money(t.est) }, { k: E2("PESO REAL", "REAL TOTAL"), v: money(t.real) }, { k: x.local ? E2("PAGA", "PAYS") : E2("RETENIDO", "HELD"), v: x.local ? E2("En el mercado", "At the market") : money(t.ret) }, { k: E2("SI ALGO NO HAY", "IF SOMETHING IS OUT"), v: subL }] },
    x.nota ? { type: "note", tone: "ink", icon: "bubble", t: `«${x.nota}»` } : null,
  ];
  if (x.st === "pending") out.push({ type: "acts", items: [
    { l: E2("Aceptar", "Accept"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => mercPaso(c.d.id, x.numero, "aceptar"), E2("Aceptado. Ahora arma y pesa.", "Accepted. Now prepare and weigh.")) },
    { l: E2("No puedo", "I can’t"), v: "secondary", icon: "close", off: c.pending, onClick: () => c.run(() => mercPaso(c.d.id, x.numero, "rechazar"), E2("Listo: el cliente sabe y se liberó su retención.", "Done: the client knows and the hold was released.")) }] });
  // Líneas: pesar con foto, «no hay» (quitar o proponer).
  const L = x.lineas.filter((l) => l.st !== "removed");
  out.push({ type: "group", k: E2("SUS PRODUCTOS", "THEIR PRODUCTS") });
  for (const l of L) {
    const prop = x.props.find((p) => p.line === l.id);
    const s = l.st === "out" ? (prop ? E2(`No hay · propusiste ${nm(prop.name)} · espera al cliente`, `Out · you proposed ${nm(prop.name)} · awaiting client`) : E2("No hay · no se cobra", "Out · not charged"))
      : l.peso ? (l.lbReal != null ? E2(`Pidió ${l.lb} lb · pesó ${l.lbReal} lb`, `Asked ${l.lb} lb · weighed ${l.lbReal} lb`) : E2(`${l.lb} lb · por pesar`, `${l.lb} lb · to weigh`)) : `× ${l.q}`;
    out.push({ type: "rows", items: [{ key: l.id, icon: l.peso ? "scale" : "bag", t: `${nm(l.name)}${l.subOf ? E2(" · cambio aceptado", " · accepted swap") : ""}`, s: `${s}${l.ops.length ? ` · ${l.ops.join(" · ")}` : ""}`,
      r: l.st === "out" ? "$0.00" : money(l.lbReal != null || !l.peso ? l.final : l.est), tag: l.peso && l.lbReal == null && l.st === "ok" ? E2("PESAR", "WEIGH") : null, tone: "action", chev: false }] });
    if (!pesando || l.st !== "ok") continue;
    const k = `mw:${l.id}`, w = (ui[k] as { lb: string; foto: { id: string; url: string } | null } | undefined) ?? { lb: l.lbReal != null ? String(l.lbReal) : "", foto: null };
    if (l.peso) {
      out.push({ type: "field", k: `${E2("PESO REAL · LB", "REAL WEIGHT · LB")} · ${nm(l.name).toUpperCase()}`, val: w.lb, im: "decimal", ph: String(l.lb), onChange: (v) => c.setUi({ [k]: { ...w, lb: v.replace(/[^0-9.]/g, "").slice(0, 6) } }) });
      out.push({ type: "photos", k: `${E2("FOTO DE LA BALANZA · OBLIGATORIA", "SCALE PHOTO · REQUIRED")} · ${nm(l.name).toUpperCase()}`, cols: 3, items: w.foto ? [{ key: w.foto.id, bg: `url("${w.foto.url}")` }] : (l.foto ? [{ key: l.foto, bg: `url("${l.foto}")`, tag: E2("GUARDADA", "SAVED") }] : []),
        addL: `${E2("Foto de", "Photo of")} ${nm(l.name)}`, onAdd: () => c.pickFiles(false, async (fs) => { const r = await subirFoto(fs[0]!, "privado"); if (r.ok && r.id && r.url) c.setUi({ [k]: { ...w, foto: { id: r.id, url: r.url } } }); else c.toast(r.mensaje ? r.mensaje[es ? "es" : "en"] : E2("No se pudo subir la foto.", "Couldn’t upload the photo.")); }) });
    }
    const elegir = ui.mNoHay === l.id;
    out.push({ type: "acts", items: [
      ...(l.peso ? [{ l: `${E2("Guardar peso de", "Save weight of")} ${nm(l.name)}`, v: "primary" as const, icon: "scale", off: c.pending || !w.lb || !w.foto, onClick: () => c.run(() => mercPesar(c.d.id, x.numero, l.id, w.lb, w.foto!.id), E2("Peso guardado con su foto.", "Weight saved with its photo."), () => c.setUi({ [k]: undefined })) }] : []),
      { l: `${E2("No hay", "Out of")} ${nm(l.name)}`, v: "secondary", icon: "warning", off: c.pending, onClick: () => c.setUi({ mNoHay: elegir ? null : l.id }) }] });
    if (elegir) {
      const P = (c.mped?.prods ?? []).filter((p) => !L.some((z) => z.name.es === p.name.es));
      out.push({ type: "note", tone: "info", t: x.sub === "no" ? E2("Pidió no sustituir: quítalo.", "They asked not to substitute: remove it.") : x.sub === "call" ? E2("Pidió que lo llames. Si acepta un cambio, propónlo aquí; si no contesta en 10 min, se quita.", "They asked you to call. If they accept a swap, propose it here; if no answer in 10 min, it is removed.") : E2("Propón uno parecido: lo acepta en 10 min o se quita.", "Propose a similar one: they accept within 10 min or it is removed.") },
        { type: "acts", items: [{ l: E2("Quitar · no se cobra", "Remove · not charged"), v: "secondary", icon: "close", off: c.pending, onClick: () => c.run(() => mercNoHay(c.d.id, x.numero, l.id, null), E2("Quitado: no se cobra.", "Removed: not charged."), () => c.setUi({ mNoHay: null })) }] });
      if (x.sub !== "no" && P.length) out.push({ type: "rows", k: E2("PROPONER EN SU LUGAR", "PROPOSE INSTEAD"), items: P.slice(0, 12).map((p): Fila => ({ key: `s${p.id}`, icon: p.k === "peso" ? "scale" : "bag", t: nm(p.name), r: `${money(p.cents)}${p.k === "peso" ? "/lb" : ""}`, compact: true, chev: true,
        onClick: () => c.run(() => mercNoHay(c.d.id, x.numero, l.id, p.id), E2("Propuesto: el cliente tiene 10 minutos.", "Proposed: the client has 10 minutes."), () => c.setUi({ mNoHay: null })) })) });
    }
  }
  if (pesando) {
    out.push({ type: "note", tone: "ink", icon: "scale", t: x.local ? E2(`Total real ${money(t.real)} · lo paga en el mercado.`, `Real total ${money(t.real)} · paid at the market.`) : t.mas > 0 ? (x.okMas != null ? E2(`Pediste su OK por ${money(x.okMas)} más: espera su respuesta. Si dice que no, corta menos y manda el peso otra vez.`, `You asked their OK for ${money(x.okMas)} more: wait for the answer. If they say no, cut less and send the weight again.`) : x.noMas ? E2(`No quiso pagar más: corta menos y manda el peso otra vez (total real ${money(t.real)}, retenido ${money(t.ret)}).`, `They did not want to pay more: cut less and send the weight again (real total ${money(t.real)}, held ${money(t.ret)}).`) : E2(`El total real (${money(t.real)}) pasa lo retenido (${money(t.ret)}) por ${money(t.mas)}: corta menos o pide su OK. Sin su OK no se cobra más.`, `The real total (${money(t.real)}) is over the hold (${money(t.ret)}) by ${money(t.mas)}: cut less or ask their OK. Without their OK no more is charged.`)) : E2(`Total real ${money(t.real)} de ${money(t.ret)} retenidos.`, `Real total ${money(t.real)} of ${money(t.ret)} held.`) });
    const pedirMas = !x.local && t.mas > 0 && x.okMas == null;
    if (pedirMas) out.push({ type: "acts", items: [{ l: `${E2("Pedir OK por ", "Ask OK for ")}${money(t.mas)}${E2(" más", " more")}`, v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => mercPaso(c.d.id, x.numero, "mas"), E2("Mandado: el cliente ve el peso y te dice si está bien pagar más.", "Sent: the client sees the weight and tells you if paying more is OK.")) }] });
    else if (D === "preparando" || (D === "pesado" && x.noMas && t.mas === 0)) out.push({ type: "acts", items: [{ l: E2("Mandar al cliente", "Send to the client"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => mercPaso(c.d.id, x.numero, "mandar"), E2("Mandado: el cliente ve el peso y las fotos.", "Sent: the client sees the weight and photos.")) }] });
  }
  // 9n · Con repartidores en la app, el envío queda «listo para el repartidor»; sin ellos, «Va en camino» como antes.
  const conRep = x.modo === "delivery" && !!x.reparto?.conRepartidores;
  if (x.st === "confirmed" && D === "pesado" && (x.local || (t.mas === 0 && !x.noMas))) out.push({ type: "acts", items: [{ l: x.modo === "delivery" ? (conRep ? E2("Está listo · para el repartidor", "Ready · for the driver") : E2("Va en camino", "On the way")) : E2("Está listo", "It’s ready"), v: "primary", icon: x.modo === "delivery" ? "truck" : "bag", off: c.pending,
    onClick: () => c.run(() => mercPaso(c.d.id, x.numero, "listo"), conRep ? E2("Listo: ya se puede ofrecer a tus repartidores.", "Done: it can now be offered to your drivers.") : E2("Listo: el cliente lo sabe.", "Done: the client knows.")) }] });
  out.push(...repartoMerc(c, x));
  const propio = x.modo !== "delivery" || (D === "camino" && !x.reparto?.rep);
  if (x.st === "confirmed" && (D === "listo" || D === "camino") && propio) out.push({ type: "acts", items: [{ l: x.modo === "delivery" ? E2("Entregado", "Delivered") : E2("Lo recogió", "Picked up"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => mercPaso(c.d.id, x.numero, "entregado"), x.local ? E2("Listo.", "Done.") : E2("Listo: se cobró lo real y se liberó el resto.", "Done: the real total was charged and the rest released.")) }] });
  if (t.cobrado) out.push({ type: "note", tone: "ok", icon: "check", t: E2(`Cobrado ${money(t.cobrado)}${t.liberado ? ` · liberado ${money(t.liberado)}` : ""}.`, `Charged ${money(t.cobrado)}${t.liberado ? ` · released ${money(t.liberado)}` : ""}.`) });
  out.push(...ayudaCita(c, x.numero, E2("el cliente", "the client")));
  out.push({ type: "rows", k: E2("LÍNEA DE TIEMPO", "TIMELINE"), items: x.eventos.filter((e) => e.t.es).map((e, i): Fila => ({ key: `e${i}`, icon: "clock", t: nm(e.t), s: new Date(e.at).toLocaleTimeString(es ? "es-US" : "en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }), compact: true, chev: false })) });
  return { blocks: out, ed: null };
}
