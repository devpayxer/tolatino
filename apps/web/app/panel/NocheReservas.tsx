"use client";
/* Mesas y lista en el panel (4nc · huecos #3 y #4 del plan: el diseño solo trae «Esta noche»; compuesto con los bloques del panel).
   Hoy: «Mesas que esperan tu respuesta» (vencen en `reply_min`), «Mesas de esta noche» (con código; Llegaron · No llegaron · No entró:
   sin identificación) y «La lista de esta noche» para la puerta (buscar por nombre o código; «Entraron N de M»; teléfono primero).
   El detalle: personas, hora, ocasión, nota, depósito, lo de la puerta, cuántas mesas de ese tipo quedan esa noche; Confirmar (cobra el
   depósito) · Otra hora · No hay mesa; «Cancelar la mesa» con motivo (devolución completa). «Pasó la noche» no es un botón: el barrido
   cierra la noche a las 6 AM. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { hNoche, nocheCorta, usdN } from "@/lib/noche-comun";
import type { FilaNoche, NochePanelV, nocheHoy } from "@/lib/noche-reservas";
import { nocheCancelarNeg, nocheMarcar, nocheResponder } from "./acciones-noche";
import type { Ctx, Editor } from "./Panel";

type Sec = { blocks: (Bloque | null)[]; ed: Editor | null };
type Bi = { es: string; en: string };
export type NocPanel = { hoy?: Awaited<ReturnType<typeof nocheHoy>>; det?: NochePanelV | null };
const OCC: Record<string, [string, string]> = { bailar: ["A bailar", "Dancing"], cumple: ["Cumpleaños", "Birthday"], despedida: ["Despedida", "Farewell"], celebra: ["Celebración", "Celebration"] };

function tagDe(c: Ctx, x: FilaNoche): [string, string] {
  const { E2 } = c;
  if (x.st === "pending") return [x.resp != null ? E2(`RESPONDE EN ${x.resp} MIN`, `REPLY IN ${x.resp} MIN`) : E2("VENCE", "EXPIRES"), "action"];
  if (x.st === "change_proposed") return [E2("ESPERA AL CLIENTE", "AWAITING CLIENT"), "ink"];
  if (x.st === "done") return x.detalle === "noid" ? [E2("SIN IDENTIFICACIÓN", "NO ID"), "danger"] : x.detalle === "nollegaron" ? [E2("NO LLEGARON", "NO-SHOW"), "neutral"] : [E2("CERRADA", "CLOSED"), "neutral"];
  if (x.llego || (x.inN ?? 0) > 0) return [x.k === "lista" ? E2(`ENTRARON ${x.inN} DE ${x.pax}`, `${x.inN} OF ${x.pax} IN`) : E2("LLEGARON", "ARRIVED"), "signal"];
  return [E2("CONFIRMADA", "CONFIRMED"), "signal"];
}

export function hoyNoche(c: Ctx): Bloque[] {
  const { E2, es, ui } = c, H = c.noc?.hoy, nm = (b: Bi) => (es ? b.es : b.en || b.es);
  if (!H) return [];
  const out: Bloque[] = [];
  const fila = (x: FilaNoche): Fila => {
    const [tag, tone] = tagDe(c, x);
    return { key: x.numero, icon: x.k === "lista" ? "check" : "drink", t: `${x.who} · ${nm(x.svc)} · ${x.pax} ${x.pax === 1 ? E2("persona", "person") : E2("personas", "people")}`,
      s: `${x.numero} · ${x.esHoy ? E2("esta noche", "tonight") : nocheCorta(x.night, es)} · ${hNoche(x.llega)}${x.code ? ` · ${E2("código", "code")} ${x.code}` : ""}${x.dep ? ` · ${E2("depósito", "deposit")} ${usdN(x.dep)}` : ""}`,
      tag, tone, chev: true, onClick: () => c.det(`noche:${x.numero}`) };
  };
  if (H.esperan.length) out.push({ type: "rows", k: `${E2("MESAS QUE ESPERAN TU RESPUESTA", "TABLES AWAITING YOUR REPLY")} · ${H.esperan.length}`, items: H.esperan.map(fila) });
  if (H.mesas.length) out.push({ type: "rows", k: `${E2("MESAS DE ESTA NOCHE", "TONIGHT'S TABLES")} · ${H.mesas.length}`, items: H.mesas.map(fila) });
  if (H.lista.length) {
    const vivas = H.lista.filter((x) => x.st === "confirmed"), total = vivas.reduce((n, x) => n + x.pax, 0), dentro = vivas.reduce((n, x) => n + (x.inN ?? 0), 0);
    const q = String(ui.nqLista ?? "").trim().toLowerCase();
    const L = vivas.filter((x) => !q || x.who.toLowerCase().includes(q) || (x.code ?? "").includes(q) || x.numero.toLowerCase().includes(q));
    out.push({ type: "group", k: `${E2("LA LISTA DE ESTA NOCHE", "TONIGHT'S LIST")} · ${E2(`ENTRARON ${dentro} DE ${total}`, `${dentro} OF ${total} IN`)}` });
    out.push({ type: "field", k: E2("BUSCAR POR NOMBRE O CÓDIGO", "SEARCH BY NAME OR CODE"), val: String(ui.nqLista ?? ""), max: 30, ph: E2("Ej.: Ana o 4821", "e.g. Ana or 4821"), onChange: (v) => c.setUi({ nqLista: v.slice(0, 30) }) });
    for (const x of L.slice(0, 40)) out.push({ type: "step", t: `${x.who} · ${x.code ?? "—"}`, s: E2(`${x.pax} en la lista · llega ${hNoche(x.llega)}`, `${x.pax} on the list · arrives ${hNoche(x.llega)}`), v: `${x.inN ?? 0}/${x.pax}`,
      onM: () => c.run(() => nocheMarcar(c.d.id, x.numero, "entraron", Math.max(0, (x.inN ?? 0) - 1)), E2("Listo.", "Done.")),
      onP: () => c.run(() => nocheMarcar(c.d.id, x.numero, "entraron", Math.min(x.pax, (x.inN ?? 0) + 1)), E2("Entró.", "Got in.")) });
    if (!L.length) out.push({ type: "note", tone: "info", icon: "search", t: E2("Nadie en la lista con ese nombre o código.", "Nobody on the list with that name or code.") });
  }
  return out;
}

export function nocheDetalle(c: Ctx): Sec {
  const { E2, es, ui } = c, x = c.noc?.det, nm = (b: Bi) => (es ? b.es : b.en || b.es);
  if (!x) return { blocks: [{ type: "head", t: E2("Reserva no encontrada", "Booking not found"), onBack: c.closeDet }, { type: "empty", icon: "drink", t: E2("Esa reserva no existe", "That booking does not exist"), s: E2("Puede ser de otro negocio.", "It may belong to another business.") }], ed: null };
  const lista = x.k === "lista";
  const stL = ({ pending: E2("ESPERA TU RESPUESTA", "AWAITING YOUR REPLY"), change_proposed: E2("PROPUSISTE OTRA HORA", "YOU PROPOSED ANOTHER TIME"), confirmed: lista ? E2("EN LA LISTA", "ON THE LIST") : E2("CONFIRMADA", "CONFIRMED"),
    declined: E2("NO HABÍA MESA", "NO TABLE"), expired: E2("VENCIÓ", "EXPIRED"), cancelled: E2("CANCELADA", "CANCELLED"), done: E2("CERRADA", "CLOSED") } as Record<string, string>)[x.st] ?? x.st.toUpperCase();
  const pay = x.pay === "held" ? E2("retenido", "held") : x.pay === "captured" ? E2("cobrado", "charged") : x.pay === "released" ? E2("liberado", "released") : x.pay === "refunded" ? E2("devuelto", "refunded") : "—";
  const out: (Bloque | null)[] = [
    { type: "head", eye: `${lista ? E2("LISTA", "LIST") : E2("MESA", "TABLE")} · ${stL}`, t: x.numero, s: `${x.who} · ${x.esHoy ? E2("esta noche", "tonight") : nocheCorta(x.night, es)} · ${hNoche(x.llega)}`, onBack: c.closeDet },
    x.st === "pending" ? { type: "note", tone: "info", icon: "clock", t: x.resp != null ? E2(`Responde en ${x.resp} min. Si no, vence y se le libera el depósito.`, `Reply within ${x.resp} min. Otherwise it expires and the deposit is released.`) : E2("Está por vencer.", "About to expire.") } : null,
    { type: "kv", items: [
      { k: lista ? E2("LISTA", "LIST") : E2("MESA", "TABLE"), v: nm(x.svc) }, { k: E2("PERSONAS", "PEOPLE"), v: String(x.pax) }, { k: E2("LLEGAN", "ARRIVE"), v: hNoche(x.llega) },
      ...(x.occ && OCC[x.occ] ? [{ k: E2("OCASIÓN", "OCCASION"), v: OCC[x.occ]![es ? 0 : 1] }] : []),
      { k: E2("EN LA PUERTA", "AT THE DOOR"), v: nm(x.puerta) }, { k: E2("EDAD", "AGE"), v: E2(`${x.edad}+ con identificación`, `${x.edad}+ with ID`) },
      ...(lista ? [] : [{ k: E2("DEPÓSITO", "DEPOSIT"), v: x.dep ? `${usdN(x.dep)} · ${pay}` : E2("Sin depósito", "No deposit") }]),
      ...(x.code ? [{ k: E2("CÓDIGO", "CODE"), v: x.code }] : []),
      ...(x.cupo != null && x.st === "pending" ? [{ k: E2("SI CONFIRMAS, QUEDAN", "IF YOU CONFIRM, LEFT"), v: E2(`${x.cupo} ${x.cupo === 1 ? "mesa" : "mesas"} de este tipo esa noche`, `${x.cupo} ${x.cupo === 1 ? "table" : "tables"} of this kind that night`) }] : []),
    ] },
    x.nota ? { type: "note", tone: "ink", icon: "bubble", t: `«${x.nota}»` } : null,
  ];
  if (x.st === "pending") {
    const otra = ui.nOtra === x.numero;
    out.push({ type: "acts", items: [
      { l: E2("Confirmar", "Confirm"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => nocheResponder(c.d.id, x.numero, "confirmar"), x.dep ? E2("Confirmada: se cobró el depósito y le llegó su código.", "Confirmed: the deposit was charged and they got their code.") : E2("Confirmada: le llegó su código.", "Confirmed: they got their code.")) },
      { l: E2("Otra hora", "Another time"), v: "secondary", icon: "clock", off: c.pending || !x.slots.length, onClick: () => c.setUi({ nOtra: otra ? null : x.numero }) },
      { l: E2("No hay mesa", "No table"), v: "ghost", icon: "close", off: c.pending, onClick: () => c.run(() => nocheResponder(c.d.id, x.numero, "nohay"), E2("Listo: el cliente sabe y se liberó su depósito.", "Done: the client knows and the deposit was released.")) }] });
    if (otra) out.push({ type: "chips", k: E2("¿A QUÉ HORA SÍ TIENES MESA?", "WHAT TIME DO YOU HAVE A TABLE?"), help: E2("EL CLIENTE TIENE 30 MIN PARA ACEPTAR", "THE CLIENT HAS 30 MIN TO ACCEPT"),
      items: x.slots.map((m) => ({ l: hNoche(m), v: "filter", onClick: () => c.run(() => nocheResponder(c.d.id, x.numero, "otra", m), E2(`Propusiste las ${hNoche(m)}.`, `You proposed ${hNoche(m)}.`), () => c.setUi({ nOtra: null })) })) });
  }
  if (x.st === "confirmed" && x.esHoy) {
    if (lista) out.push({ type: "step", t: E2("Entraron", "Got in"), s: E2(`De ${x.pax} en la lista. Pagan en la puerta lo que dice «En la puerta».`, `Of ${x.pax} on the list. They pay at the door what “At the door” says.`), v: `${x.inN ?? 0}/${x.pax}`,
      onM: () => c.run(() => nocheMarcar(c.d.id, x.numero, "entraron", Math.max(0, (x.inN ?? 0) - 1)), E2("Listo.", "Done.")), onP: () => c.run(() => nocheMarcar(c.d.id, x.numero, "entraron", Math.min(x.pax, (x.inN ?? 0) + 1)), E2("Entró.", "Got in.")) });
    else if (!x.llego) {
      const yaPuede = x.nowN >= x.llega + x.hold;
      out.push({ type: "acts", items: [
        { l: E2("Llegaron", "They arrived"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => nocheMarcar(c.d.id, x.numero, "llegaron"), E2("Listo: llegaron.", "Done: they arrived.")) },
        { l: E2("No llegaron", "No-show"), v: "secondary", icon: "clock", off: c.pending || !yaPuede, onClick: () => c.run(() => nocheMarcar(c.d.id, x.numero, "nollegaron"), E2("Marcada: no llegaron. El depósito se queda contigo.", "Marked: no-show. You keep the deposit.")) },
        { l: E2("No entró: sin identificación", "Turned away: no ID"), v: "ghost", icon: "warning", off: c.pending, onClick: () => c.run(() => nocheMarcar(c.d.id, x.numero, "noid"), E2("Marcada: no entró sin identificación.", "Marked: turned away without ID.")) }] });
      if (!yaPuede) out.push({ type: "note", tone: "info", icon: "clock", t: E2(`«No llegaron» se puede marcar desde las ${hNoche(x.llega + x.hold)} (su mesa se guarda ${x.hold} min).`, `“No-show” can be marked from ${hNoche(x.llega + x.hold)} (the table is held ${x.hold} min).`) });
    }
  }
  if (x.st === "confirmed" && !lista && !x.llego) {
    const k = `ncx:${x.numero}`, mot = (ui[k] as string | undefined) ?? null;
    if (mot == null) out.push({ type: "acts", items: [{ l: E2("Cancelar la mesa", "Cancel the table"), v: "ghost", icon: "close", off: c.pending, onClick: () => c.setUi({ [k]: "" }) }] });
    else {
      out.push({ type: "note", tone: "danger", icon: "warning", t: E2("Si cancelas, el cliente recibe todo su depósito y queda en tu historial. Escribe el motivo: el cliente lo ve.", "If you cancel, the client gets their full deposit back and it stays on your record. Write the reason: the client sees it.") });
      out.push({ type: "field", k: E2("MOTIVO", "REASON"), val: mot, max: 200, ph: E2("Ej.: evento privado esa noche", "E.g. private event that night"), onChange: (v) => c.setUi({ [k]: v.slice(0, 200) }) });
      out.push({ type: "acts", items: [
        { l: E2("Sí, cancelar y devolver", "Yes, cancel and refund"), v: "primary", icon: "close", off: c.pending || mot.trim().length < 4, onClick: () => c.run(() => nocheCancelarNeg(c.d.id, x.numero, mot), E2("Cancelada: el cliente recibe todo su depósito.", "Cancelled: the client gets the full deposit back."), () => c.setUi({ [k]: null })) },
        { l: E2("No, volver", "No, go back"), v: "ghost", off: c.pending, onClick: () => c.setUi({ [k]: null }) }] });
    }
  }
  if (x.motivoNeg) out.push({ type: "note", tone: "ink", icon: "close", t: E2(`Cancelaste: «${x.motivoNeg}».`, `You cancelled: “${x.motivoNeg}”.`) });
  out.push({ type: "rows", k: E2("LÍNEA DE TIEMPO", "TIMELINE"), items: x.linea.map((e, i): Fila => ({ key: `e${i}`, icon: "clock", t: e.note ? nm(e.note) : verbo(e.kind, es),
    s: new Date(e.at).toLocaleString(es ? "es-US" : "en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) })) });
  return { blocks: out, ed: null };
}
function verbo(k: string, es: boolean) {
  const V: Record<string, [string, string]> = { night_list: ["Se anotó en la lista", "Joined the list"], night_sent: ["Pidió la mesa", "Requested the table"], night_ok: ["Confirmaste", "You confirmed"], night_no: ["No había mesa", "No table"],
    night_alt: ["Propusiste otra hora", "You proposed another time"], alt_accepted: ["Aceptó la otra hora", "Accepted the other time"], alt_declined: ["No le sirvió la otra hora", "The other time did not work"],
    night_exp: ["Venció sin respuesta", "Expired without reply"], night_cx: ["Canceló", "Cancelled"], night_cx_kept: ["Canceló después del corte", "Cancelled after the cutoff"], night_biz_cx: ["Cancelaste", "You cancelled"],
    night_in: ["Entraron", "Got in"], night_noshow: ["No llegaron", "No-show"], night_noid: ["No entró: sin identificación", "Turned away: no ID"], cancelled: ["Cancelada", "Cancelled"],
    payment_captured: ["Se cobró el depósito", "Deposit charged"], payment_released: ["Se liberó el depósito", "Deposit released"], refund: ["Se devolvió el depósito", "Deposit refunded"] };
  const v = V[k]; return v ? v[es ? 0 : 1] : k;
}
