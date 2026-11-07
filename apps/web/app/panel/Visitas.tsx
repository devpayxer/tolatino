"use client";
/* Visitas en el panel (4ie · hueco #3 del plan: compuesto con los bloques del panel, como Inscripciones). Hoy: «Esperan tu respuesta»
   (quién, qué propiedad o carro, a qué hora, carro a cambio; vencen a las 4 h hábiles y nunca después de la hora − 1 h) con Confirmar ·
   Otra hora · No se puede, y «Hoy» con Pasó · No vino. Lo que vendes › Visitas (o Pruebas de manejo): las que esperan, las de hoy, las
   próximas, por propiedad o carro y las pasadas. El detalle: lo que se copió al enviar (el total), la licencia («dice que la tiene
   vigente»; nunca el número), el carro a cambio, la nota y la dirección del cliente de una prueba en casa SOLO confirmada (cada vista queda
   en la auditoría). Nada se cobra. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { pagoTexto, puertaTexto, usd as usdA } from "@/lib/autos-comun";
import { ANIMALES_SERVICIO, EHO, mudarteTexto, usd } from "@/lib/inmuebles-comun";
import { QUE, cuandoVis, type Bi, type TradeIn } from "@/lib/visitas-inm-comun";
import type { FilaVis, VisDetalle, VisPanel } from "@/lib/visitas-inm";
import { visCancelarNeg, visMarcar, visResponder } from "./acciones-vis";
import { ayudaCita } from "./Citas";
import type { Ctx, Editor } from "./Panel";

type Sec = { blocks: (Bloque | null)[]; ed: Editor | null };
export type VisP = { dl: boolean; panel?: VisPanel; det?: VisDetalle | null };
const nm = (c: Ctx, b: Bi | null | undefined) => (b ? (c.es ? b.es : b.en || b.es) : "");
const venceL = (c: Ctx, t: string | null) => {
  if (!t) return "";
  const m = Math.max(0, Math.round((Date.parse(t) - Date.now()) / 60000));
  return m >= 60 ? c.E2(`RESPONDE EN ${Math.floor(m / 60)} H`, `REPLY IN ${Math.floor(m / 60)} H`) : c.E2(`RESPONDE EN ${m} MIN`, `REPLY IN ${m} MIN`);
};
const tradeL = (c: Ctx, t: TradeIn | null) => (t ? c.E2(`da a cambio un ${t.year} ${t.make} ${t.model}`, `trade-in ${t.year} ${t.make} ${t.model}`) : "");
const bi = (t: Bi, es: boolean) => (es ? t.es : t.en || t.es);
/* Vivienda justa (guardián viviendaJusta): la propiedad que se pinta lleva el pie de igualdad de oportunidad y la nota de animales de servicio. */
function pie(es: boolean): Bloque {
  return { type: "note", tone: "ink", icon: "home", t: `${bi(EHO, es)} · ${bi(ANIMALES_SERVICIO, es)}` };
}
const icono = (x: { que: string }) => (x.que === "prueba" ? "car" : x.que === "visita" ? "key" : "calendar");

function fila(c: Ctx, x: FilaVis, acts = false): Fila {
  const { E2 } = c;
  const [tag, tone] = x.estado === "pending" ? [venceL(c, x.vence), "action"] : x.estado === "change_proposed" ? [E2("ESPERA A LA PERSONA", "AWAITING CLIENT"), "ink"]
    : x.estado === "confirmed" ? [x.hoy ? E2("HOY", "TODAY") : E2("CONFIRMADA", "CONFIRMED"), "signal"] : x.detalle === "noshow" ? [E2("NO VINO", "NO-SHOW"), "ink"]
    : x.estado === "done" ? [E2("PASÓ", "HAPPENED"), "signal"] : x.estado === "expired" ? [E2("VENCIÓ", "EXPIRED"), "ink"] : x.estado === "declined" ? [E2("NO SE PUDO", "DECLINED"), "ink"] : [E2("CANCELADA", "CANCELLED"), "ink"];
  const base: Fila = { key: x.numero, icon: icono(x), t: `${x.cliente} · ${nm(c, QUE[x.que].t)}`,
    s: [x.numero, nm(c, x.item), cuandoVis(x.dia, x.min, c.es), x.enCasa ? E2("en su casa", "at their home") : "", tradeL(c, x.trade)].filter(Boolean).join(" · "), tag, tone, chev: !acts, onClick: () => c.det(`vis:${x.numero}`) };
  if (acts && x.estado === "pending") return { ...base, acts: [
    { l: E2("Confirmar", "Confirm"), v: "primary", off: c.pending, onClick: () => c.run(() => visResponder(c.d.id, x.numero, "confirmar"), E2("Confirmada: le llegó el aviso con la dirección.", "Confirmed: they got the notice with the address.")) },
    { l: E2("Otra hora", "Another time"), v: "secondary", off: c.pending, onClick: () => c.det(`vis:${x.numero}`) },
    { l: E2("No se puede", "Cannot"), v: "ghost", off: c.pending, onClick: () => c.run(() => visResponder(c.d.id, x.numero, "nopuede"), E2("Listo: la persona sabe. No se cobró nada.", "Done: they know. Nothing was charged.")) }] };
  if (acts && x.estado === "confirmed" && x.yaPaso) return { ...base, acts: [
    { l: E2("Pasó", "It happened"), v: "primary", off: c.pending, onClick: () => c.run(() => visMarcar(c.d.id, x.numero, "paso"), E2("Listo: le pedimos su reseña.", "Done: we asked for their review.")) },
    { l: E2("No vino", "No-show"), v: "ghost", off: c.pending, onClick: () => c.run(() => visMarcar(c.d.id, x.numero, "no_vino"), E2("Anotado: no vino. No hay multa.", "Noted: no-show. No penalty.")) }] };
  return base;
}

export function hoyVis(c: Ctx): Bloque[] {
  const { E2 } = c, P = c.vis?.panel;
  if (!P) return [];
  const out: Bloque[] = [];
  if (P.esperan.length) out.push({ type: "rows", k: `${E2("ESPERAN TU RESPUESTA", "AWAITING YOUR REPLY")} · ${P.esperan.length}`, items: P.esperan.map((x) => fila(c, x, true)) });
  if (P.hoy.length) out.push({ type: "rows", k: `${E2("VISITAS DE HOY", "TODAY'S VISITS")} · ${P.hoy.length}`, items: P.hoy.map((x) => fila(c, x, true)) });
  return out;
}

/* La fila de Lo que vendes. */
export function filaVisitas(c: Ctx): Fila | null {
  const { E2 } = c, X = c.svc;
  if (!X || !(X.inm || X.autos)) return null;
  const dl = !!X.autos;
  return { icon: dl ? "car" : "key", t: dl ? E2("Pruebas de manejo", "Test drives") : E2("Visitas", "Visits"),
    s: dl ? E2("Las que esperan tu respuesta, las de hoy y las próximas, por carro. La prueba es gratis.", "Pending, today's and upcoming, by car. Test drives are free.")
      : E2("Las que esperan tu respuesta, las de hoy y las próximas, por propiedad. Ver es gratis.", "Pending, today's and upcoming, by property. Viewing is free."),
    chev: true, onClick: () => c.go("mod", "visitas") };
}

export function visitasBloques(c: Ctx): Sec {
  const { E2 } = c, P = c.vis?.panel, dl = !!c.vis?.dl;
  const out: (Bloque | null)[] = [{ type: "head", eye: E2("LO QUE VENDES", "WHAT YOU SELL"), t: dl ? E2("Pruebas de manejo", "Test drives") : E2("Visitas", "Visits"), onBack: () => c.go("mod"),
    s: E2("Respondes cada solicitud en 4 horas de tu horario. Nada se cobra: ni por ver ni por la prueba. Si se renta o se vende, las que estaban vivas se cancelan solas, sin culpa de nadie.",
      "Reply to each request within 4 of your business hours. Nothing is charged: not to view, not to test drive. If it gets rented or sold, live requests are cancelled automatically, with no one at fault.") }];
  if (!P) return { blocks: out, ed: null };
  out.push({ type: "kpis", cols: "repeat(3,minmax(0,1fr))", items: [{ k: E2("ESPERAN", "PENDING"), v: String(P.esperan.length) }, { k: E2("HOY", "TODAY"), v: String(P.hoy.length) }, { k: E2("PRÓXIMAS", "UPCOMING"), v: String(P.proximas.length) }] });
  if (P.esperan.length) out.push({ type: "rows", k: E2("ESPERAN TU RESPUESTA", "AWAITING YOUR REPLY"), items: P.esperan.map((x) => fila(c, x, true)) });
  if (P.hoy.length) out.push({ type: "rows", k: E2("HOY", "TODAY"), items: P.hoy.map((x) => fila(c, x, true)) });
  if (P.proximas.length) out.push({ type: "rows", k: E2("PRÓXIMAS", "UPCOMING"), items: P.proximas.map((x) => fila(c, x)) });
  if (P.porItem.length) out.push({ type: "rows", k: dl ? E2("POR CARRO · 90 DÍAS", "BY CAR · 90 DAYS") : E2("POR PROPIEDAD · 90 DÍAS", "BY PROPERTY · 90 DAYS"),
    items: P.porItem.map((x): Fila => ({ key: `i${x.id}`, icon: dl ? "car" : "key", t: nm(c, x.item), s: E2(`${x.vivas} vivas · ${x.total} en 90 días`, `${x.vivas} live · ${x.total} in 90 days`), compact: true })) });
  if (P.pasadas.length) out.push({ type: "rows", k: E2("PASADAS", "PAST"), items: P.pasadas.slice(0, 30).map((x) => fila(c, x)) });
  if (!P.esperan.length && !P.hoy.length && !P.proximas.length && !P.pasadas.length) out.push({ type: "empty", icon: dl ? "car" : "key", t: dl ? E2("Todavía no hay pruebas de manejo", "No test drives yet") : E2("Todavía no hay visitas", "No visits yet"),
    s: E2("Cuando alguien la pida desde tu página, la ves aquí y en Hoy.", "When someone requests one from your page, you see it here and in Today.") });
  return { blocks: out, ed: null };
}

export function visDetalleBloques(c: Ctx): Sec {
  const { E2, es, ui } = c, x = c.vis?.det;
  if (!x) return { blocks: [{ type: "head", t: E2("Solicitud no encontrada", "Request not found"), onBack: c.closeDet }, { type: "empty", icon: "calendar", t: E2("Esa solicitud no existe", "That request does not exist"), s: E2("Puede ser de otro negocio.", "It may belong to another business.") }], ed: null };
  const Q = QUE[x.que], cp = x.copia, prueba = x.que === "prueba";
  const stL = ({ pending: E2("ESPERA TU RESPUESTA", "AWAITING YOUR REPLY"), change_proposed: E2("PROPUSISTE OTRA HORA", "YOU PROPOSED ANOTHER TIME"), confirmed: E2("CONFIRMADA", "CONFIRMED"),
    declined: E2("NO SE PUDO", "DECLINED"), expired: E2("VENCIÓ", "EXPIRED"), cancelled: E2("CANCELADA", "CANCELLED"), done: x.detalle === "noshow" ? E2("NO VINO", "NO-SHOW") : E2("PASÓ", "HAPPENED") } as Record<string, string>)[x.estado] ?? x.estado.toUpperCase();
  const total = x.que === "visita" ? (cp.moveIn != null ? `${usd(cp.moveIn)} · ${mudarteTexto({ rent: cp.rent, dep: cp.dep, appFee: cp.appFee, fees: cp.fees, moveIn: cp.moveIn }, es)}` : cp.price != null ? usd(cp.price) : "")
    : prueba && cp.puerta ? `${usdA(cp.puerta.otd)} · ${puertaTexto(cp.puerta, es)}${cp.est ? `. ${pagoTexto(cp.est, es)}` : ""}` : cp.svcCents ? usd(cp.svcCents) : "";
  const donde = x.que === "precal" || x.que === "oferta" ? E2("Llamas al teléfono de su cuenta", "You call the phone on their account")
    : x.enCasa ? (x.casa ? `${x.casa.calle}, ${x.casa.zip}` : E2("En su casa · la dirección se ve cuando confirmas", "At their home · the address shows once you confirm")) : x.direccion ?? x.zona;
  const out: (Bloque | null)[] = [
    { type: "head", eye: `${nm(c, Q.t).toUpperCase()} · ${stL}`, t: x.numero, s: `${x.cliente} · ${nm(c, x.item)}`, onBack: c.closeDet },
    x.estado === "pending" && x.vence ? { type: "note", tone: "info", icon: "clock", t: E2(`Responde antes de ${new Date(x.vence).toLocaleString("es-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" })}. Si no, vence y la hora vuelve a quedar libre.`, `Reply before ${new Date(x.vence).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" })}. Otherwise it expires and the time is free again.`).replace(/\.\./g, ".") } : null,
    { type: "kv", items: [
      { k: E2("QUÉ", "WHAT"), v: nm(c, Q.t) }, { k: prueba ? E2("CARRO", "CAR") : x.que === "visita" ? E2("PROPIEDAD", "PROPERTY") : E2("SERVICIO", "SERVICE"), v: `${nm(c, x.item)}${nm(c, x.sub) ? ` · ${nm(c, x.sub)}` : ""}` },
      { k: E2("CUÁNDO", "WHEN"), v: cuandoVis(x.dia, x.min, es) }, { k: E2("DÓNDE", "WHERE"), v: donde },
      ...(total ? [{ k: x.que === "visita" ? (cp.moveIn != null ? E2("PARA MUDARTE · LO QUE VIO", "TO MOVE IN · WHAT THEY SAW") : E2("PRECIO · LO QUE VIO", "PRICE · WHAT THEY SAW")) : prueba ? E2("EN LA PUERTA · LO QUE VIO", "OUT THE DOOR · WHAT THEY SAW") : E2("PRECIO", "PRICE"), v: total }] : []),
      ...(prueba ? [{ k: E2("LICENCIA", "LICENSE"), v: x.licencia ? E2("Dice que la tiene vigente (la enseña en persona)", "Says it is valid (shows it in person)") : "—" }] : []),
      ...(x.trade ? [{ k: E2("A CAMBIO", "TRADE-IN"), v: `${x.trade.year} ${x.trade.make} ${x.trade.model}${x.trade.miles != null ? ` · ${x.trade.miles.toLocaleString("en-US")} ${E2("millas", "miles")}` : ""}` }] : []),
    ] },
    x.nota ? { type: "note", tone: "ink", icon: "bubble", t: `«${x.nota}»` } : null,
    x.que === "visita" ? pie(es) : null,
  ];
  if (x.casa) out.push({ type: "note", tone: "info", icon: "shield", t: E2("La dirección de su casa solo la ves tú y tu equipo, y solo con la prueba confirmada. Cada vista queda registrada y se borra a los 30 días.", "Only you and your team see their home address, and only with the test drive confirmed. Each view is logged and it is deleted after 30 days.") });
  if (x.estado === "pending") {
    const otra = ui.vOtra === x.numero;
    out.push({ type: "acts", items: [
      { l: E2("Confirmar", "Confirm"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => visResponder(c.d.id, x.numero, "confirmar"), E2("Confirmada: le llegó el aviso con la dirección.", "Confirmed: they got the notice with the address.")) },
      { l: E2("Otra hora", "Another time"), v: "secondary", icon: "calendar", off: c.pending || !x.otras.length, onClick: () => c.setUi({ vOtra: otra ? null : x.numero }) },
      { l: E2("No se puede", "Cannot"), v: "ghost", icon: "close", off: c.pending, onClick: () => c.run(() => visResponder(c.d.id, x.numero, "nopuede"), E2("Listo: la persona sabe. No se cobró nada.", "Done: they know. Nothing was charged.")) }] });
    if (otra) out.push({ type: "chips", k: E2("¿A QUÉ HORA SÍ PUEDES?", "WHAT TIME WORKS?"), help: E2("LA PERSONA TIENE HASTA 24 H PARA ACEPTAR", "THEY HAVE UP TO 24 H TO ACCEPT"),
      items: x.otras.map((h) => ({ l: cuandoVis(h.dia, h.min, es), v: "filter", onClick: () => c.run(() => visResponder(c.d.id, x.numero, "otra", h.id), E2("Propusiste otra hora.", "You proposed another time."), () => c.setUi({ vOtra: null })) })) });
  }
  if (x.estado === "confirmed") {
    const k = `vcx:${x.numero}`, mot = (ui[k] as string | undefined) ?? null;
    if (mot == null) out.push({ type: "acts", items: [
      ...(x.yaPaso ? [{ l: E2("Pasó", "It happened"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => visMarcar(c.d.id, x.numero, "paso"), E2("Listo: le pedimos su reseña.", "Done: we asked for their review.")) },
        { l: E2("No vino", "No-show"), v: "secondary", off: c.pending, onClick: () => c.run(() => visMarcar(c.d.id, x.numero, "no_vino"), E2("Anotado: no vino. No hay multa.", "Noted: no-show. No penalty.")) }] : []),
      { l: E2("Cancelar", "Cancel"), v: "ghost", icon: "close", off: c.pending, onClick: () => c.setUi({ [k]: "" }) }] });
    else {
      out.push({ type: "note", tone: "danger", icon: "warning", t: E2("Si cancelas una confirmada, queda en tu historial. Escribe el motivo: la persona lo ve.", "If you cancel a confirmed one, it stays on your record. Write the reason: they see it.") });
      out.push({ type: "field", k: E2("MOTIVO", "REASON"), val: mot, max: 200, ph: E2("Ej.: se nos dañó el carro de prueba", "E.g. the demo car broke down"), onChange: (v) => c.setUi({ [k]: v.slice(0, 200) }) });
      out.push({ type: "acts", items: [
        { l: E2("Sí, cancelar", "Yes, cancel"), v: "primary", icon: "close", off: c.pending || mot.trim().length < 4, onClick: () => c.run(() => visCancelarNeg(c.d.id, x.numero, mot), E2("Cancelada: la persona sabe.", "Cancelled: they know."), () => c.setUi({ [k]: null })) },
        { l: E2("No, volver", "No, go back"), v: "ghost", off: c.pending, onClick: () => c.setUi({ [k]: null }) }] });
    }
  }
  if (x.motivoNeg) out.push({ type: "note", tone: "ink", icon: "close", t: E2(`Cancelaste: «${x.motivoNeg}».`, `You cancelled: “${x.motivoNeg}”.`) });
  // 4if: la ayuda con la visita o la prueba (responder en 24 h; si aceptas devolver, lo devuelves fuera de la app y la persona lo confirma).
  out.push(...ayudaCita(c, x.numero, x.cliente));
  out.push({ type: "rows", k: E2("LÍNEA DE TIEMPO", "TIMELINE"), items: x.historial.map((e, i): Fila => ({ key: `e${i}`, icon: "clock", t: e.note ? nm(c, e.note) : verbo(e.kind, es),
    s: new Date(e.at).toLocaleString(es ? "es-US" : "en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) })) });
  return { blocks: out, ed: null };
}
function verbo(k: string, es: boolean) {
  const V: Record<string, [string, string]> = { vis_sent: ["Lo pidió", "Requested"], vis_ok: ["Confirmaste", "You confirmed"], vis_no: ["No se pudo", "Declined"], vis_alt: ["Propusiste otra hora", "You proposed another time"],
    alt_accepted: ["Aceptó la otra hora", "Accepted the other time"], alt_declined: ["No le sirvió la otra hora", "The other time did not work"], vis_exp: ["Venció sin respuesta", "Expired without reply"],
    vis_cx: ["Canceló", "Cancelled"], vis_biz_cx: ["Cancelaste", "You cancelled"], vis_done: ["Pasó", "It happened"], vis_noshow: ["No vino", "No-show"], vis_remind: ["Le recordamos 2 horas antes", "Reminded 2 hours before"],
    vis_listing_gone: ["Se canceló: el anuncio ya no estaba", "Cancelled: the listing was gone"], vis_gone_sent: ["Le avisamos que ya no estaba", "We told them it was gone"] };
  const v = V[k]; return v ? v[es ? 0 : 1] : k;
}
