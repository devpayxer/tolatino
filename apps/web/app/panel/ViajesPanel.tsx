"use client";
/* Los viajes en el panel (4y-1 · neg-trans-flow.js: el diseño trae «Salidas y asientos»; lo de Hoy se compone con los bloques del panel).
   Hoy: «Viajes que esperan tu respuesta», «Salidas» (cada salida con sus pasajeros, va tarde / salió / llegó / cancelar con motivo)
   y «Vehículo completo». El detalle del viaje: quién, cuántos, maletas, recogida, el dinero retenido; Confirmar (se cobra) ·
   Otra salida (las que tienen cupo) · No hay cupo; confirmado: Abordó / No llegó. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import type { FilaViaje, SalidaPanel, ViajePanelV } from "@/lib/viajes";
import { viajeAbordo, viajeCancelarSalida, viajePasoPriv, viajeResponder, viajeSalida } from "./acciones-viajes";
import type { Ctx, Editor } from "./Panel";

type Sec = { blocks: (Bloque | null)[]; ed: Editor | null };
type Bi = { es: string; en: string };
export type ViajesP = { hoy?: { esperan: FilaViaje[]; salidas: SalidaPanel[]; privados: FilaViaje[] }; det?: ViajePanelV | null };
const money = (c: number) => { const d = c / 100; return `$${d % 1 ? d.toFixed(2) : Math.round(d).toLocaleString("en-US")}`; };
const horaL = (m: number) => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, "0")} ${m < 720 ? "AM" : "PM"}`;
const HORAS = Array.from({ length: 18 }, (_, i) => (i + 5) * 60); // = HORAS_PRIV (lib/viajes)
const restan = (ms: number | null) => { if (!ms) return null; const h = (ms - Date.now()) / 36e5; return h > 0 ? Math.max(1, Math.round(h)) : 0; };
const DS = { es: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
const dia = (ymd: string, es: boolean) => { const d = new Date(`${ymd}T12:00:00Z`); return `${(es ? DS.es : DS.en)[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`; };
const pax = (x: FilaViaje, E2: (a: string, b: string) => string) => `${x.adults + x.kids} ${x.adults + x.kids === 1 ? E2("pasajero", "passenger") : E2("pasajeros", "passengers")}${x.kids ? E2(` (${x.kids} niño${x.kids > 1 ? "s" : ""})`, ` (${x.kids} child${x.kids > 1 ? "ren" : ""})`) : ""}`;

export function hoyViajes(c: Ctx): Bloque[] {
  const { E2, es } = c, H = c.via?.hoy, nm = (b: Bi) => (es ? b.es : b.en || b.es);
  if (!H) return [];
  const out: Bloque[] = [];
  const fila = (x: FilaViaje): Fila => {
    const h = restan(x.resp);
    return { key: x.numero, icon: x.k === "priv" ? "truck" : "users", t: `${x.who} · ${nm(x.svc)}`, s: `${x.numero} · ${dia(x.ymd, es)} · ${horaL(x.m)} · ${pax(x, E2)}`,
      tag: x.st === "pending" ? (h ? E2(`RESPONDE EN ${h} H`, `REPLY IN ${h} H`) : E2("VENCE", "EXPIRES")) : x.st === "change_proposed" ? E2("ESPERA AL CLIENTE", "AWAITING CLIENT") : x.detalle === "camino" ? E2("EN CAMINO", "ON THE WAY") : E2("CONFIRMADO", "CONFIRMED"),
      tone: x.st === "pending" ? "action" : x.st === "change_proposed" ? "ink" : "signal", chev: true, onClick: () => c.det(`viaje:${x.numero}`) };
  };
  if (H.esperan.length) out.push({ type: "rows", k: `${E2("VIAJES QUE ESPERAN TU RESPUESTA", "TRIPS AWAITING YOUR REPLY")} · ${H.esperan.length}`, items: H.esperan.map(fila) });
  if (H.salidas.length) out.push({ type: "rows", k: E2("SALIDAS CON PASAJEROS", "DEPARTURES WITH PASSENGERS"), items: H.salidas.map((r): Fila => {
    const n = r.pasajeros.reduce((a, x) => a + x.adults + x.kids, 0);
    return { key: `r${r.run}`, icon: "truck", t: `${nm(r.svc)} · ${dia(r.ymd, es)} · ${horaL(r.m)}`, s: E2(`${n} en la app · ${r.fuera} vendidos fuera · ${Math.max(0, r.total - r.fuera - r.booked)} libres`, `${n} in the app · ${r.fuera} sold outside · ${Math.max(0, r.total - r.fuera - r.booked)} open`),
      tag: r.st === "departed" ? E2("EN CAMINO", "ON THE WAY") : r.tarde != null ? E2(`TARDE · ${horaL(r.tarde)}`, `LATE · ${horaL(r.tarde)}`) : E2("PROGRAMADA", "SCHEDULED"), tone: r.st === "departed" ? "signal" : r.tarde != null ? "action" : "ink", chev: true, onClick: () => c.det(`salida:${r.run}`) };
  }) });
  if (H.privados.length) out.push({ type: "rows", k: E2("VEHÍCULO COMPLETO", "WHOLE VEHICLE"), items: H.privados.map(fila) });
  return out;
}

export function salidaDetalle(c: Ctx, run: string): Sec {
  const { E2, es, ui } = c, r = c.via?.hoy?.salidas.find((z) => z.run === run), nm = (b: Bi) => (es ? b.es : b.en || b.es);
  if (!r) return { blocks: [{ type: "head", t: E2("Salida", "Departure"), onBack: c.closeDet }, { type: "empty", icon: "truck", t: E2("Esa salida ya no tiene pasajeros", "That departure has no passengers"), s: E2("Puede que ya llegó o se canceló.", "It may have arrived or been cancelled.") }], ed: null };
  const n = r.pasajeros.reduce((a, x) => a + x.adults + x.kids, 0), k = `scx:${run}`, mot = (ui[k] as string | undefined) ?? null, tk = `str:${run}`;
  const out: (Bloque | null)[] = [
    { type: "head", eye: `${E2("SALIDA", "DEPARTURE")} · ${r.st === "departed" ? E2("EN CAMINO", "ON THE WAY") : E2("PROGRAMADA", "SCHEDULED")}`, t: `${dia(r.ymd, es)} · ${horaL(r.m)}`, s: nm(r.svc), onBack: c.closeDet },
    { type: "kv", items: [{ k: E2("ASIENTOS", "SEATS"), v: String(r.total) }, { k: E2("EN LA APP", "IN THE APP"), v: String(n) }, { k: E2("VENDIDOS FUERA", "SOLD OUTSIDE"), v: String(r.fuera) }, { k: E2("LIBRES", "OPEN"), v: String(Math.max(0, r.total - r.fuera - r.booked)) }] },
    r.tarde != null ? { type: "note", tone: "warn", icon: "clock", t: E2(`Avisaste que sale a las ${horaL(r.tarde)}.`, `You said it leaves at ${horaL(r.tarde)}.`) } : null,
    { type: "rows", k: E2("PASAJEROS", "PASSENGERS"), items: r.pasajeros.map((x): Fila => ({ key: x.numero, icon: "users", t: `${x.who} · ${pax(x, E2)}`, s: `${x.numero}${x.childSeat ? E2(" · asiento de niño", " · child seat") : ""}${x.bagsExtra ? E2(` · ${x.bagsExtra} maleta extra`, ` · ${x.bagsExtra} extra bag`) : ""}`,
      tag: x.abordo === "boarded" ? E2("ABORDÓ", "BOARDED") : x.abordo === "noshow" ? E2("NO LLEGÓ", "NO-SHOW") : undefined, tone: x.abordo === "boarded" ? "signal" : x.abordo === "noshow" ? "danger" : "ink", chev: true, onClick: () => c.det(`viaje:${x.numero}`) })) },
  ];
  if (r.st === "scheduled") {
    out.push({ type: "acts", items: [
      { l: E2("Salió", "It left"), v: "primary", icon: "truck", off: c.pending, onClick: () => c.run(() => viajeSalida(c.d.id, run, "salio"), E2("Listo: los pasajeros saben que va en camino.", "Done: passengers know it is on the way.")) },
      { l: E2("Va tarde", "Running late"), v: "secondary", icon: "clock", off: c.pending, onClick: () => c.setUi({ [tk]: !ui[tk] }) }] });
    if (ui[tk]) out.push({ type: "chips", k: E2("¿CUÁNTO TARDE?", "HOW LATE?"), help: E2("A CADA PASAJERO LE LLEGA LA NUEVA HORA", "EVERY PASSENGER GETS THE NEW TIME"),
      items: [10, 15, 20, 30, 45, 60].map((m) => ({ l: `${m} min`, v: "filter", onClick: () => c.run(() => viajeSalida(c.d.id, run, "tarde", m), E2("Listo: avisamos la nueva hora.", "Done: we sent the new time."), () => c.setUi({ [tk]: false })) })) });
    if (mot == null) out.push({ type: "acts", items: [{ l: E2("Cancelar la salida", "Cancel the departure"), v: "ghost", icon: "close", off: c.pending, onClick: () => c.setUi({ [k]: "" }) }] });
    else {
      out.push({ type: "note", tone: "danger", icon: "warning", t: E2(`Cada pasajero (${n}) recibe todo su dinero de vuelta y queda en tu historial. Escribe el motivo: lo ven.`, `Every passenger (${n}) gets all their money back and it stays on your record. Write the reason: they see it.`) });
      out.push({ type: "field", k: E2("MOTIVO", "REASON"), val: mot, max: 200, ph: E2("Ej.: la van se dañó", "E.g. the van broke down"), onChange: (v) => c.setUi({ [k]: v.slice(0, 200) }) });
      out.push({ type: "acts", items: [
        { l: E2("Sí, cancelar y devolver", "Yes, cancel and refund"), v: "primary", icon: "close", off: c.pending || mot.trim().length < 4, onClick: () => c.run(() => viajeCancelarSalida(c.d.id, run, mot), E2("Salida cancelada: todos reciben su dinero.", "Departure cancelled: everyone gets their money back."), () => c.setUi({ [k]: null })) },
        { l: E2("No, volver", "No, go back"), v: "ghost", off: c.pending, onClick: () => c.setUi({ [k]: null }) }] });
    }
  }
  if (r.st === "departed") out.push({ type: "acts", items: [{ l: E2("Llegó", "Arrived"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => viajeSalida(c.d.id, run, "llego"), E2("Listo: le pedimos su reseña a cada pasajero.", "Done: we asked every passenger for a review.")) }] });
  return { blocks: out, ed: null };
}

export function viajeDetalle(c: Ctx): Sec {
  const { E2, es, ui } = c, x = c.via?.det, nm = (b: Bi) => (es ? b.es : b.en || b.es);
  if (!x) return { blocks: [{ type: "head", t: E2("Viaje no encontrado", "Trip not found"), onBack: c.closeDet }, { type: "empty", icon: "truck", t: E2("Ese viaje no existe", "That trip does not exist"), s: E2("Puede ser de otro negocio.", "It may belong to another business.") }], ed: null };
  const stL = ({ pending: E2("ESPERA TU RESPUESTA", "AWAITING YOUR REPLY"), change_proposed: E2("PROPUSISTE OTRA SALIDA", "YOU PROPOSED ANOTHER DEPARTURE"), confirmed: x.detalle === "camino" ? E2("EN CAMINO", "ON THE WAY") : E2("CONFIRMADO", "CONFIRMED"),
    declined: E2("NO HABÍA CUPO", "NO ROOM"), expired: E2("VENCIÓ", "EXPIRED"), cancelled: E2("CANCELADO", "CANCELLED"), done: E2("LLEGÓ", "ARRIVED") } as Record<string, string>)[x.st] ?? x.st.toUpperCase();
  const h = restan(x.resp), payL = x.pay === "held" ? E2("retenido", "held") : x.pay === "captured" ? E2("cobrado", "charged") : x.pay === "released" ? E2("liberado", "released") : x.pay === "refunded" ? E2("devuelto", "refunded") : x.pay === "partially_refunded" ? E2("la mitad", "half") : "—";
  const out: (Bloque | null)[] = [
    { type: "head", eye: `${x.k === "priv" ? E2("VEHÍCULO COMPLETO", "WHOLE VEHICLE") : E2("ASIENTO", "SEAT")} · ${stL}`, t: x.numero, s: `${x.who} · ${dia(x.ymd, es)} · ${horaL(x.m)}`, onBack: c.closeDet },
    x.st === "pending" ? { type: "note", tone: "info", icon: "clock", t: h ? E2(`Responde en ${h} h. Si no, vence y se le libera el dinero.`, `Reply within ${h} h. Otherwise it expires and the money is released.`) : E2("Está por vencer.", "About to expire.") } : null,
    { type: "kv", items: [
      { k: E2("SERVICIO", "SERVICE"), v: nm(x.svc) },
      { k: E2("PASAJEROS", "PASSENGERS"), v: `${pax(x, E2)}${x.childSeat ? E2(" · asiento de niño", " · child seat") : ""}` },
      ...(x.bagsExtra ? [{ k: E2("MALETAS EXTRA", "EXTRA BAGS"), v: String(x.bagsExtra) }] : []),
      ...(x.pickup ? [{ k: E2("RECOGIDA", "PICKUP"), v: x.pickup }] : []),
      { k: E2("PRECIO CERRADO", "FIXED PRICE"), v: `${money(x.tot)} · ${payL}` },
    ] },
    x.nota ? { type: "note", tone: "ink", icon: "bubble", t: `«${x.nota}»` } : null,
  ];
  if (x.st === "pending") {
    const otra = ui.vOtra === x.numero;
    out.push({ type: "acts", items: [
      { l: E2("Confirmar", "Confirm"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => viajeResponder(c.d.id, x.numero, "confirmar"), E2("Confirmado: se cobró el viaje.", "Confirmed: the trip was charged.")) },
      { l: x.k === "asiento" ? E2("Otra salida", "Another departure") : E2("Otra hora", "Another time"), v: "secondary", icon: "clock", off: c.pending || (x.k === "asiento" && !x.otras.length), onClick: () => c.setUi({ vOtra: otra ? null : x.numero }) },
      { l: E2("No hay cupo", "No room"), v: "ghost", icon: "close", off: c.pending, onClick: () => c.run(() => viajeResponder(c.d.id, x.numero, "nopuedo"), E2("Listo: el cliente sabe y se liberó su dinero.", "Done: the client knows and the money was released.")) }] });
    if (otra && x.k === "priv") out.push({ type: "chips", k: E2(`¿A QUÉ HORA SÍ PUEDES EL ${dia(x.ymd, es).toUpperCase()}?`, `WHAT TIME CAN YOU DO ${dia(x.ymd, es).toUpperCase()}?`), help: E2("EL CLIENTE TIENE 24 H PARA ACEPTAR", "THE CLIENT HAS 24 H TO ACCEPT"),
      items: HORAS.filter((m) => m !== x.m && Math.abs(m - x.m) <= 240).map((m) => ({ l: horaL(m), v: "filter", onClick: () => c.run(() => viajeResponder(c.d.id, x.numero, "otra", undefined, x.ymd, m), E2(`Propusiste las ${horaL(m)}.`, `You proposed ${horaL(m)}.`), () => c.setUi({ vOtra: null })) })) });
    if (otra && x.k === "asiento") out.push({ type: "chips", k: E2("¿EN QUÉ SALIDA SÍ CABEN?", "WHICH DEPARTURE HAS ROOM?"), help: E2("EL CLIENTE TIENE 24 H PARA ACEPTAR", "THE CLIENT HAS 24 H TO ACCEPT"),
      items: x.otras.map((o) => ({ l: `${dia(o.ymd, es)} · ${horaL(o.m)} · ${o.quedan} ${E2("libres", "open")}`, v: "filter", onClick: () => c.run(() => viajeResponder(c.d.id, x.numero, "otra", o.run), E2(`Propusiste ${dia(o.ymd, es)} a las ${horaL(o.m)}.`, `You proposed ${dia(o.ymd, es)} at ${horaL(o.m)}.`), () => c.setUi({ vOtra: null })) })) });
  }
  if (x.st === "change_proposed" && x.alt) out.push({ type: "note", tone: "info", icon: "clock", t: E2(`Propusiste ${dia(x.alt.ymd, es)} a las ${horaL(x.alt.m)}. Si no le sirve o no contesta, se libera su dinero.`, `You proposed ${dia(x.alt.ymd, es)} at ${horaL(x.alt.m)}. If it does not work or they do not reply, the money is released.`) });
  if (x.st === "confirmed" && x.k === "asiento" && x.run) out.push({ type: "acts", items: [
    { l: E2("Abordó", "Boarded"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => viajeAbordo(c.d.id, x.numero, true), E2("Marcado: abordó.", "Marked: boarded.")) },
    { l: E2("No llegó", "No-show"), v: "ghost", icon: "close", off: c.pending, onClick: () => c.run(() => viajeAbordo(c.d.id, x.numero, false), E2("Marcado: no llegó. El cobro no cambia.", "Marked: no-show. The charge does not change.")) }] });
  if (x.st === "confirmed" && x.k === "priv") out.push({ type: "acts", items: [x.detalle === "camino"
    ? { l: E2("Llegó", "Arrived"), v: "primary", icon: "check", off: c.pending, onClick: () => c.run(() => viajePasoPriv(c.d.id, x.numero, "llego"), E2("Listo: le pedimos su reseña.", "Done: we asked for their review.")) }
    : { l: E2("Salió", "It left"), v: "primary", icon: "truck", off: c.pending, onClick: () => c.run(() => viajePasoPriv(c.d.id, x.numero, "salio"), E2("Listo: el cliente sabe que va en camino.", "Done: the client knows it is on the way.")) }] });
  out.push({ type: "rows", k: E2("LÍNEA DE TIEMPO", "TIMELINE"), items: x.eventos.map((e, i): Fila => ({ key: `e${i}`, icon: "clock", t: e.note ? nm(e.note) : verbo(e.kind, es), s: new Date(e.at).toLocaleString(es ? "es-US" : "en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }), compact: true, chev: false })) });
  return { blocks: out, ed: null };
}
function verbo(k: string, es: boolean) {
  const V: Record<string, [string, string]> = { sent: ["Reservó", "Booked"], accepted: ["Confirmaste", "You confirmed"], declined: ["No había cupo", "No room"], change_proposed: ["Propusiste otra salida", "You proposed another departure"],
    alt_accepted: ["Aceptó la otra salida", "Accepted the other departure"], alt_declined: ["No le sirvió la otra salida", "The other departure did not work"], expired: ["Venció sin respuesta", "Expired without reply"], cancelled: ["Cancelado", "Cancelled"],
    run_departed: ["Salió", "Left"], run_arrived: ["Llegó", "Arrived"], run_late: ["Va tarde", "Running late"], run_cancelled: ["Cancelaste la salida", "You cancelled the departure"], boarded: ["Abordó", "Boarded"], noshow: ["No llegó", "No-show"],
    payment_captured: ["Se cobró", "Charged"], payment_released: ["Se liberó el dinero", "Money released"], refund: ["Se devolvió el dinero", "Money refunded"] };
  const v = V[k]; return v ? v[es ? 0 : 1] : k;
}
