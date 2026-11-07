"use client";
/* Las fiestas en el panel (4v · hueco #3 del plan: el diseño solo trae «Tu herramienta»; compuesto con los bloques del panel).
   Hoy: «Fiestas que esperan tu respuesta» (24 h) y las próximas. El detalle: qué celebran, invitados, dónde y a cuántas millas,
   el depósito, «Otra solicitud para ese día» si choca; Confirmar (ocupa el día y, si se llena, declina solas las demás) ·
   Otra hora · No puedo; confirmada: el acuerdo por escrito, «Cancelar la fecha» con motivo (devolución completa) y, pasada la
   fiesta, «Terminó». */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { diaFiesta, EVT } from "@/lib/fiestas-comun";
import type { FiestaPanelV, FilaFiesta } from "@/lib/fiestas-reservas";
import { fiestaCancelarNeg, fiestaResponder, fiestaTerminar } from "./acciones-fiesta";
import type { Ctx, Editor } from "./Panel";

type Sec = { blocks: (Bloque | null)[]; ed: Editor | null };
type Bi = { es: string; en: string };
export type FiesPanel = { hoy?: FilaFiesta[]; det?: FiestaPanelV | null };
const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const horaL = (m: number) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")} ${m < 720 ? "AM" : "PM"}`;
const restan = (ms: number | null) => { if (!ms) return null; const h = (ms - Date.now()) / 36e5; return h > 0 ? Math.max(1, Math.round(h)) : 0; };

export function hoyFiestas(c: Ctx): Bloque[] {
  const { E2, es } = c, L = c.fies?.hoy ?? [], nm = (b: Bi) => (es ? b.es : b.en || b.es);
  if (!L.length) return [];
  const esperan = L.filter((x) => x.st === "pending"), resto = L.filter((x) => x.st !== "pending");
  const fila = (x: FilaFiesta): Fila => {
    const ev = EVT.find((z) => z[0] === x.e), h = restan(x.resp);
    return { key: x.numero, icon: x.visita ? "pin" : "party", t: `${x.who} · ${x.visita ? E2("Visita", "Tour") : ev ? (es ? ev[1] : ev[2]) : nm(x.svc)}${x.g ? ` · ${x.g} ${E2("invitados", "guests")}` : ""}`,
      s: `${x.numero} · ${diaFiesta(x.ymd, es)} · ${horaL(x.m)}${x.mismoDia ? E2(` · otra solicitud ese día`, ` · another request that day`) : ""}`,
      tag: x.st === "pending" ? (h ? E2(`RESPONDE EN ${h} H`, `REPLY IN ${h} H`) : E2("VENCE", "EXPIRES")) : x.st === "change_proposed" ? E2("ESPERA AL CLIENTE", "AWAITING CLIENT") : x.pasada ? E2("¿TERMINÓ?", "DONE?") : E2("CONFIRMADA", "CONFIRMED"),
      tone: x.st === "pending" ? "action" : x.st === "change_proposed" ? "ink" : "signal", chev: true, onClick: () => c.det(`fiesta:${x.numero}`) };
  };
  const out: Bloque[] = [];
  if (esperan.length) out.push({ type: "rows", k: `${E2("FIESTAS QUE ESPERAN TU RESPUESTA", "PARTIES AWAITING YOUR REPLY")} · ${esperan.length}`, items: esperan.map(fila) });
  if (resto.length) out.push({ type: "rows", k: E2("PRÓXIMAS FIESTAS", "UPCOMING PARTIES"), items: resto.map(fila) });
  return out;
}

export function fiestaDetalle(c: Ctx): Sec {
  const { E2, es, ui } = c, x = c.fies?.det, nm = (b: Bi) => (es ? b.es : b.en || b.es);
  if (!x) return { blocks: [{ type: "head", t: E2("Fiesta no encontrada", "Party not found"), onBack: c.closeDet }, { type: "empty", icon: "party", t: E2("Esa fiesta no existe", "That party does not exist"), s: E2("Puede ser de otro negocio.", "It may belong to another business.") }], ed: null };
  const ev = EVT.find((z) => z[0] === x.e), dia = diaFiesta(x.ymd, es);
  const stL = ({ pending: E2("ESPERA TU RESPUESTA", "AWAITING YOUR REPLY"), change_proposed: E2("PROPUSISTE OTRA HORA", "YOU PROPOSED ANOTHER TIME"), confirmed: E2("CONFIRMADA", "CONFIRMED"), declined: E2("NO PUDISTE", "DECLINED"),
    expired: E2("VENCIÓ", "EXPIRED"), cancelled: E2("CANCELADA", "CANCELLED"), done: E2("TERMINADA", "DONE") } as Record<string, string>)[x.st] ?? x.st.toUpperCase();
  const h = restan(x.resp), resto = Math.max(0, x.tot - x.dep);
  const out: (Bloque | null)[] = [
    { type: "head", eye: `${x.visita ? E2("VISITA AL SALÓN", "VENUE TOUR") : E2("FIESTA", "PARTY")} · ${stL}`, t: x.numero, s: `${x.who} · ${dia} · ${horaL(x.m)}`, onBack: c.closeDet },
    x.st === "pending" ? { type: "note", tone: "info", icon: "clock", t: h ? E2(`Responde en ${h} h. Si no, vence y se le libera el depósito.`, `Reply within ${h} h. Otherwise it expires and the deposit is released.`) : E2("Está por vencer.", "About to expire.") } : null,
    { type: "kv", items: [
      { k: E2("SERVICIO", "SERVICE"), v: `${nm(x.svc)}${x.k === "unid" && x.qty > 1 ? ` × ${x.qty}` : x.horas ? ` · ${x.horas} h` : ""}` },
      ...(x.visita ? [] : [{ k: E2("CELEBRAN", "CELEBRATING"), v: ev ? (es ? ev[1] : ev[2]) : "—" }, { k: E2("INVITADOS", "GUESTS"), v: x.g ? String(x.g) : "—" }]),
      { k: E2("DÓNDE", "WHERE"), v: x.donde && x.donde.k !== "local" ? `${x.donde.t}${x.donde.mi != null ? ` · ${x.donde.mi} mi` : ""}` : E2("En tu local", "At your place") },
      { k: E2("TOTAL", "TOTAL"), v: x.k === "cotiza" ? `${E2("Desde ", "From ")}${money(x.tot)}` : money(x.tot) },
      { k: E2("DEPÓSITO", "DEPOSIT"), v: x.dep ? `${money(x.dep)} · ${x.pay === "held" ? E2("retenido", "held") : x.pay === "captured" ? E2("cobrado", "charged") : x.pay === "released" ? E2("liberado", "released") : x.pay === "refunded" ? E2("devuelto", "refunded") : "—"}` : E2("Sin depósito", "No deposit") },
    ] },
    x.nota ? { type: "note", tone: "ink", icon: "bubble", t: `«${x.nota}»` } : null,
  ];
  if (x.otras.length && ["pending", "change_proposed"].includes(x.st)) out.push({ type: "note", tone: "warn", icon: "warning", t: E2(`Otra solicitud para ese día: ${x.otras.map((o) => `${o.numero} (${o.who}, ${horaL(o.m)}, ${o.st === "confirmed" ? "confirmada" : "esperando"})`).join(" · ")}. Si confirmas y se llena el día, las demás se declinan solas.`, `Another request for that day: ${x.otras.map((o) => `${o.numero} (${o.who}, ${horaL(o.m)}, ${o.st === "confirmed" ? "confirmed" : "waiting"})`).join(" · ")}. If you confirm and the day fills, the others are declined automatically.`) });
  if (x.st === "pending") {
    const otra = ui.fOtra === x.numero;
    out.push({ type: "acts", items: [
      { l: E2("Confirmar", "Confirm"), v: "primary", icon: "check", off: c.pending || x.ocupadoManual, onClick: () => c.run(() => fiestaResponder(c.d.id, x.numero, "confirmar"), x.visita ? E2("Visita confirmada.", "Tour confirmed.") : E2("Confirmada: la fecha es suya, se cobró el depósito y se mandó el acuerdo.", "Confirmed: the date is theirs, the deposit was charged and the agreement sent.")) },
      { l: E2("Otra hora", "Another time"), v: "secondary", icon: "clock", off: c.pending || !x.libreHoras.length, onClick: () => c.setUi({ fOtra: otra ? null : x.numero }) },
      { l: E2("No puedo", "I can’t"), v: "ghost", icon: "close", off: c.pending, onClick: () => c.run(() => fiestaResponder(c.d.id, x.numero, "nopuedo"), E2("Listo: el cliente sabe y se liberó su depósito.", "Done: the client knows and the deposit was released.")) }] });
    if (x.ocupadoManual) out.push({ type: "note", tone: "warn", icon: "calendar", t: E2("Marcaste ese día como ocupado en tu calendario. Libéralo en Calendario y depósito para confirmar, o usa «No puedo».", "You marked that day as booked in your calendar. Free it in Calendar and deposit to confirm, or use “Can’t”.") });
    if (otra) out.push({ type: "chips", k: E2("¿A QUÉ HORA SÍ PUEDES ESE DÍA?", "WHAT TIME CAN YOU DO THAT DAY?"), help: E2("EL CLIENTE TIENE 24 H PARA ACEPTAR", "THE CLIENT HAS 24 H TO ACCEPT"),
      items: x.libreHoras.map((m) => ({ l: horaL(m), v: "filter", onClick: () => c.run(() => fiestaResponder(c.d.id, x.numero, "otra", m), E2(`Propusiste las ${horaL(m)}.`, `You proposed ${horaL(m)}.`), () => c.setUi({ fOtra: null })) })) });
  }
  if (x.st === "change_proposed" && x.alt != null) out.push({ type: "note", tone: "info", icon: "clock", t: E2(`Propusiste las ${horaL(x.alt)}. Si no le sirve o no contesta en 24 h, se libera su depósito.`, `You proposed ${horaL(x.alt)}. If it does not work or they do not reply within 24 h, the deposit is released.`) });
  if (x.st === "confirmed" && !x.visita && x.acuerdo) out.push({ type: "note", tone: "ok", icon: "check", t: E2(`Acuerdo por escrito · versión ${x.acuerdo.v}: total ${money(x.acuerdo.fee)}, depósito ${money(x.acuerdo.credit)} (cobrado en la app), resto ${money(resto)} que te paga directo. Cancela gratis hasta ${x.cancel} días antes.`, `Written agreement · version ${x.acuerdo.v}: total ${money(x.acuerdo.fee)}, deposit ${money(x.acuerdo.credit)} (charged in the app), rest ${money(resto)} paid to you directly. Free cancellation up to ${x.cancel} days before.`) });
  if (x.st === "confirmed" && x.pasada) out.push({ type: "acts", items: [{ l: E2("Terminó", "It’s done"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => fiestaTerminar(c.d.id, x.numero), E2("Listo: le pedimos su reseña.", "Done: we asked for their review.")) }] });
  if (x.st === "confirmed" && !x.pasada) {
    const k = `fcx:${x.numero}`, mot = (ui[k] as string | undefined) ?? null;
    if (mot == null) out.push({ type: "acts", items: [{ l: x.visita ? E2("Cancelar la visita", "Cancel the tour") : E2("Cancelar la fecha", "Cancel the date"), v: "ghost", icon: "close", off: c.pending, onClick: () => c.setUi({ [k]: "" }) }] });
    else {
      out.push({ type: "note", tone: "danger", icon: "warning", t: E2("Si cancelas, el cliente recibe su depósito completo y queda en tu historial. Escribe el motivo: el cliente lo ve.", "If you cancel, the client gets the full deposit back and it stays on your record. Write the reason: the client sees it.") });
      out.push({ type: "field", k: E2("MOTIVO", "REASON"), val: mot, max: 200, ph: E2("Ej.: se nos dañó el aire del salón", "E.g. the venue A/C broke down"), onChange: (v) => c.setUi({ [k]: v.slice(0, 200) }) });
      out.push({ type: "acts", items: [
        { l: E2("Sí, cancelar y devolver", "Yes, cancel and refund"), v: "primary", icon: "close", off: c.pending || mot.trim().length < 4, onClick: () => c.run(() => fiestaCancelarNeg(c.d.id, x.numero, mot), E2("Cancelada: el cliente recibe su depósito completo.", "Cancelled: the client gets the full deposit back."), () => c.setUi({ [k]: null })) },
        { l: E2("No, volver", "No, go back"), v: "ghost", off: c.pending, onClick: () => c.setUi({ [k]: null }) }] });
    }
  }
  if (x.motivoNeg) out.push({ type: "note", tone: "ink", icon: "close", t: E2(`Cancelaste: «${x.motivoNeg}».`, `You cancelled: “${x.motivoNeg}”.`) });
  out.push({ type: "rows", k: E2("LÍNEA DE TIEMPO", "TIMELINE"), items: x.eventos.map((e, i): Fila => ({ key: `e${i}`, icon: "clock", t: e.note ? nm(e.note) : verbo(e.kind, es), s: new Date(e.at).toLocaleString(es ? "es-US" : "en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }), compact: true, chev: false })) });
  return { blocks: out, ed: null };
}
function verbo(k: string, es: boolean) {
  const V: Record<string, [string, string]> = { sent: ["Pidió la fecha", "Requested the date"], accepted: ["Confirmaste", "You confirmed"], declined: ["No pudiste", "You declined"], change_proposed: ["Propusiste otra hora", "You proposed another time"],
    alt_accepted: ["Aceptó la otra hora", "Accepted the other time"], alt_declined: ["No le sirvió la otra hora", "The other time did not work"], expired: ["Venció sin respuesta", "Expired without reply"], cancelled: ["Cancelada", "Cancelled"], done: ["Terminó", "Done"],
    payment_captured: ["Se cobró el depósito", "Deposit charged"], payment_released: ["Se liberó el depósito", "Deposit released"], refund: ["Se devolvió el depósito", "Deposit refunded"] };
  const v = V[k]; return v ? v[es ? 0 : 1] : k;
}
