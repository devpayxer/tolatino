"use client";
import { RESULTADO } from "@/lib/puerta-comun";
import type { escaneosBoleto } from "@/lib/puerta-admin";
/* 6c · ADM-EVT › Buscar boleto › el boleto (Super Admin.dc.html secEvt: VÁLIDO · USADO · DEVUELTO · ANULADO · REEMITIDO con Reenviar por SMS ·
   Reemitir · Anular con motivo). «Reenviar» manda un aviso a la cuenta (sin SMS: los boletos viven en la app, fase6 §2 0108). Compuesto con
   piezas del sistema (head, kv, rows, timeline, acts) como la ficha del evento. El servidor decide y audita. */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BoletoAdm } from "@/lib/boletos-admin";
import type { PaseAdm } from "@/lib/pases/admin";
import { diaCorto } from "@/lib/evt-comun";
import { evtBoleto } from "./acciones-eventos";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { useE } from "./idioma-admin";

type EF = (es: string, en: string) => string;
const ST = (E: EF): Record<string, [string, string]> => ({ valid: [E("VÁLIDO", "VALID"), "signal"], used: [E("USADO", "USED"), "neutral"], refunded: [E("DEVUELTO", "REFUNDED"), "neutral"], void: [E("ANULADO", "VOIDED"), "danger"], replaced: [E("TRANSFERIDO", "TRANSFERRED"), "neutral"] });
const LOG = (E: EF): Record<string, string> => ({ emitido: E("Emitido al pagar", "Issued on payment"), reenviado: E("Reenviado a su cuenta", "Resent to their account"), reemitido: E("QR reemitido (el anterior ya no entra)", "QR reissued (the previous one no longer works)"), anulado: E("Anulado", "Voided"), cobro_fallido: E("El cobro no se completó: anulado", "The charge didn’t go through: voided"),
  // 6d
  transfer_enviado: E("Enviado a otro teléfono (el QR anterior quedó anulado)", "Sent to another phone (the previous QR was voided)"), transfer_cancelado: E("Transferencia deshecha (QR nuevo)", "Transfer undone (new QR)"), transfer_vencido: E("Nadie lo recibió a tiempo: volvió con QR nuevo", "Nobody claimed it in time: it came back with a new QR"),
  transferido: E("Lo recibió otra persona (este boleto ya no entra)", "Someone else received it (this ticket no longer works)"), recibido: E("Recibido de otra persona", "Received from someone else"), cancelado: E("Cancelado por el comprador (devolución menos el cargo)", "Canceled by the buyer (refund minus the fee)"), devuelto: E("Devuelto por el organizador (100 %)", "Refunded by the organizer (100%)"),
  cortesia: E("Cortesía dada por el organizador", "Comp ticket given by the organizer"), cortesia_recibida: E("Cortesía recibida en su cuenta", "Comp ticket received in their account"), nombre: E("Cambió el nombre del boleto", "Ticket name changed") });
const EV = (E: EF): Record<string, string> => ({ tickets_sold: E("Orden pagada · boletos emitidos", "Order paid · tickets issued"), payment_captured: E("Cobrado en la tarjeta", "Charged to the card"), payment_failed: E("El cobro no se completó", "The charge didn’t go through"), refunded: E("Devolución", "Refund"),
  tickets_cancelled: E("El comprador canceló boletos", "The buyer canceled tickets"), tickets_refunded: E("El organizador devolvió boletos", "The organizer refunded tickets"), comp_given: E("Cortesía", "Comp ticket") });
const XST = (E: EF): Record<string, string> => ({ pending: E("ESPERANDO", "WAITING"), claimed: E("RECIBIDO", "RECEIVED"), cancelled: E("DESHECHO", "UNDONE"), expired: E("VENCIÓ", "EXPIRED") });
// 8g · Wallet: lo que pasó con cada pase (pass_log) y por qué quedó anulado.
const PLOG = (E: EF): Record<string, string> => ({ emitido: E("Emitido", "Issued"), descargado: E("Lo volvió a bajar", "Downloaded again"), actualizado: E("Actualizado (cambió el boleto, la fecha o el evento)", "Updated (the ticket, date or event changed)"), anulado: E("Anulado", "Voided"), registrado: E("Un teléfono lo sigue", "A phone follows it"),
  baja: E("Un teléfono dejó de seguirlo", "A phone stopped following it"), aviso: E("Aviso de cambio enviado a Apple", "Change notice sent to Apple"), aviso_fallo: E("El aviso a Apple no salió (se dejó de intentar)", "The notice to Apple didn’t go out (stopped retrying)"), google: E("Google Wallet al día", "Google Wallet up to date"), google_fallo: E("Google Wallet no respondió (se dejó de intentar)", "Google Wallet didn’t respond (stopped retrying)"), enviado: E("El teléfono bajó el pase al día", "The phone downloaded the updated pass") });
const PPOR = (E: EF): Record<string, string> => ({ boleto: E("el boleto ya no vale", "the ticket is no longer valid"), dueno: E("cambió de dueño", "changed owner"), fecha: E("la fecha se canceló", "the date was canceled"), evento: E("el evento se canceló", "the event was canceled") });
const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const cuando = (at: string, tz: string, en = false) => new Date(at).toLocaleString(en ? "en-US" : "es-US", { timeZone: tz, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function BoletoAdmin({ b, puede, escaneos = [], pases = [] }: { b: BoletoAdm; puede: { editar: boolean; retirar: boolean }; escaneos?: Awaited<ReturnType<typeof escaneosBoleto>>; pases?: PaseAdm[] }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024, E = useE(), en = E("", "x") === "x";
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  const tx = (x: { es: string; en?: string | null } | null | undefined) => (x ? (en ? x.en || x.es : x.es) : "");
  const ct = (at: string) => cuando(at, b.tz, en);
  const st = ST(E), lg = LOG(E), ev = EV(E), xst = XST(E), plog = PLOG(E), ppor = PPOR(E);
  const [tag, tone] = st[b.estado] ?? [b.estado, "neutral"];
  const head: Bloque = { type: "head", eye: `${tag} · ${b.ciudad.toUpperCase()}`, t: b.code, s: `${tx(b.evento)} · ${diaCorto(b.dia, !en)} · ${b.quien}`, onBack: () => router.push("/admin/eventos?tab=bol"), h1: desk ? 26 : 22 };
  if (conf) return <><PanelBloques bloques={[head]} h1={22} /><ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} /><Toast t={toast} desk={desk} /></>;
  const acts = [
    ...(puede.editar ? [{ l: E("Reenviar", "Resend"), icon: "share", onClick: () => setConf({ titulo: E(`Reenviar los boletos de ${b.num}`, `Resend the tickets for ${b.num}`), sub: E("Le llega un aviso en su cuenta con sus boletos. No cambia nada del boleto.", "They get a notification in their account with their tickets. Nothing about the ticket changes."), plantillas: [E("No encuentra sus boletos", "Can’t find their tickets"), E("Pidió ayuda por chat", "Asked for help by chat")], nota: "interna", hacer: (m) => evtBoleto(b.code, "reenviar", m) }) }] : []),
    ...(puede.editar && b.estado === "valid" ? [{ l: E("Reemitir", "Reissue"), icon: "ticket", onClick: () => setConf({ titulo: E(`Reemitir ${b.code}`, `Reissue ${b.code}`), sub: E("Sale un QR nuevo y el anterior deja de entrar (en línea y sin conexión). Le avisamos.", "A new QR is issued and the previous one stops working (online and offline). We notify them."), plantillas: [E("Compartió su QR por error", "Shared their QR by mistake"), E("Perdió el teléfono", "Lost their phone"), E("Disputa: QR usado por otra persona", "Dispute: QR used by someone else")], nota: "interna", hacer: (m) => evtBoleto(b.code, "reemitir", m) }) }] : []),
    ...(puede.retirar && b.estado === "valid" ? [{ l: E("Anular", "Void"), v: "danger", icon: "ban", onClick: () => setConf({ titulo: E(`¿Por qué se anula ${b.code}?`, `Why is ${b.code} being voided?`), sub: E("El boleto deja de entrar. No devuelve dinero (las devoluciones se hacen aparte). La persona recibe el motivo.", "The ticket stops working. No money is refunded (refunds are done separately). The person gets the reason."), peligro: true, plantillas: [E("Fraude confirmado por Confianza", "Fraud confirmed by Trust"), E("Contracargo del banco", "Bank chargeback"), E("Boleto duplicado", "Duplicate ticket")], nota: "persona", hacer: (m) => evtBoleto(b.code, "anular", m) }) }] : []),
  ];
  const bloques: Bloque[] = [head,
    { type: "note", tone: tone === "signal" && b.vigente ? "ok" : tone === "danger" ? "danger" : "ink", icon: "ticket", t: `${b.kind === "comp" ? E("CORTESÍA · ", "COMP TICKET · ") : ""}${tag}${b.motivo ? ` · ${b.motivo}` : ""} · ${E("QR versión", "QR version")} ${b.ver}${b.ver > 1 ? E(" (los anteriores no entran)", " (earlier ones don’t work)") : ""}${b.estado === "valid" && !b.vigente ? E(" · SE ESTÁ TRANSFIRIENDO: ningún QR entra", " · BEING TRANSFERRED: no QR works") : ""}${b.reemplazo ? E(` · ahora es ${b.reemplazo}`, ` · now ${b.reemplazo}`) : ""}` },
    ...(b.devolucion ? [{ type: "kv", cols: 2, items: [{ k: E("DEVOLUCIÓN", "REFUND"), v: `${usd(b.devolucion.monto)} · ${b.devolucion.estado === "done" ? E("hecha", "done") : b.devolucion.estado === "pending" ? E("en camino (se reintenta sola)", "on its way (retries on its own)") : E("falló", "failed")}` },
      { k: E("QUIÉN", "WHO"), v: b.devolucion.por === "buyer" ? E("El comprador canceló", "The buyer canceled") : b.devolucion.por === "business" ? E("El organizador devolvió", "The organizer refunded") : b.devolucion.por },
      { k: E("CARGO QUE SE QUEDA TO'LATINO", "FEE TO'LATINO KEEPS"), v: usd(b.devolucion.cargo) }, { k: E("COMISIÓN QUE TO'LATINO NO COBRA", "FEE TO'LATINO WAIVES"), v: usd(b.devolucion.cede) }] } as Bloque] : []),
    ...(b.transferencias.length ? [{ type: "rows", k: E(`TRANSFERENCIAS · ${b.transferencias.length}`, `TRANSFERS · ${b.transferencias.length}`), items: b.transferencias.map((x, i) => ({ key: `x${i}`, icon: "share", t: `${x.kind === "comp" ? E("Cortesía a un teléfono", "Comp ticket to a phone") : E(`De ${x.de}`, `From ${x.de}`)} → ${x.a}`, s: `${ct(x.at)}${x.nuevo ? E(` · nuevo boleto ${x.nuevo}`, ` · new ticket ${x.nuevo}`) : ""}`,
      tag: xst[x.estado] ?? x.estado, tone: x.estado === "claimed" ? "signal" : x.estado === "pending" ? "pro" : "neutral", compact: true, chev: !!x.nuevo && x.nuevo !== b.code, onClick: x.nuevo && x.nuevo !== b.code ? () => router.push(`/admin/eventos/boleto/${x.nuevo}`) : undefined })) } as Bloque] : []),
    { type: "kv", cols: 2, items: [{ k: E("EVENTO", "EVENT"), v: tx(b.evento) }, { k: E("FECHA", "DATE"), v: diaCorto(b.dia, !en) }, { k: E("TIPO", "TYPE"), v: (b.tipo ?? b.mesa) ? tx(b.tipo ?? b.mesa) : "—" }, { k: E("ENTRAN", "ADMITS"), v: String(b.admits) },
      { k: E("A NOMBRE DE", "NAME ON TICKET"), v: b.nombre || b.quien }, { k: E("CUENTA", "ACCOUNT"), v: b.tel4 ? `${b.quien} · ${E("tel.", "ph.")} ${b.tel4}` : b.kind === "comp" ? E("Sin cuenta todavía (cortesía)", "No account yet (comp ticket)") : b.quien }, { k: E("ORDEN", "ORDER"), v: b.num }, { k: E("PAGÓ POR ESTE BOLETO", "PAID FOR THIS TICKET"), v: usd(b.precio) },
      { k: E("COMISIÓN DE ESTE BOLETO", "FEE ON THIS TICKET"), v: usd(b.fee) }, { k: E("DESCUENTO", "DISCOUNT"), v: b.descuento ? `−${usd(b.descuento)}` : "—" }] },
    ...(b.pago ? [{ type: "kv", cols: 2, items: [{ k: E("PAGO", "PAYMENT"), v: b.pago.estado === "captured" ? E("Cobrado", "Charged") : b.pago.estado === "held" ? E("Retenido", "Held") : b.pago.estado === "released" ? E("Liberado", "Released") : b.pago.estado === "refunded" ? E("Devuelto", "Refunded") : b.pago.estado },
      { k: E("TOTAL DE LA ORDEN", "ORDER TOTAL"), v: usd(b.pago.monto) }, { k: E("COMISIÓN DE LA ORDEN", "ORDER FEE"), v: usd(b.pago.comision) }, { k: E("TARJETA", "CARD"), v: `${b.pago.tarjeta ?? "—"}${b.pago.simulado ? E(" · SIMULADO", " · SIMULATED") : ""}` }] } as Bloque] : []),
    { type: "rows", k: E(`BOLETOS DE LA ORDEN · ${b.hermanos.length}`, `TICKETS IN THE ORDER · ${b.hermanos.length}`), items: b.hermanos.map((h) => ({ key: h.code, icon: "ticket", t: h.code, tag: st[h.estado]?.[0] ?? h.estado, tone: st[h.estado]?.[1] ?? "neutral", compact: true, chev: h.code !== b.code, onClick: h.code !== b.code ? () => router.push(`/admin/eventos/boleto/${h.code}`) : undefined })) },
    { type: "timeline", k: E("LA ORDEN", "THE ORDER"), items: b.orden.map((o) => ({ t: ev[o.kind] ?? o.kind, s: ct(o.at) })) },
    { type: "timeline", k: E("EL BOLETO", "THE TICKET"), items: b.log.map((l) => ({ t: lg[l.kind] ?? l.kind, s: `${l.by === "staff" ? `TO’LATINO${l.quien ? ` · ${l.quien}` : ""}` : l.by === "business" ? E("EL NEGOCIO", "THE BUSINESS") : l.by === "user" ? E("LA PERSONA", "THE PERSON") : E("SISTEMA", "SYSTEM")} · ${ct(l.at)}${l.reason ? ` · ${l.reason}` : ""}` })) },
    // 6g · En la puerta: cada escaneo (resultado, puerta, quién y hora).
    ...(escaneos.length ? [{ type: "timeline", k: E("ESCANEOS EN LA PUERTA", "DOOR SCANS"), items: escaneos.map((x) => ({ t: `${x.resolucion === "duplicate" ? E("REPETIDO", "DUPLICATE") : tx(RESULTADO[x.res].t)}${x.k > 1 ? ` · ${x.k}` : ""}${x.dir === "out" ? E(" · salida", " · exit") : ""}${x.offline ? E(" · SIN CONEXIÓN", " · OFFLINE") : ""}`,
      s: `${x.puerta.toUpperCase()} · ${x.quien.toUpperCase()} · ${x.dia} ${x.hora}${x.motivo ? ` · ${E("A MANO", "BY HAND")}: ${x.motivo}` : ""}${x.offline ? E(` · HORA DEL TELÉFONO CORREGIDA · LLEGÓ ${x.llego}`, ` · PHONE TIME CORRECTED · ARRIVED ${x.llego}`) : ""}${x.desviado ? ` · ${E("RELOJ DESVIADO", "CLOCK OFF")}${x.desfase != null ? ` · ${x.desfase < 0 ? E("ADELANTADO", "AHEAD") : E("ATRASADO", "BEHIND")} ${Math.abs(Math.round(x.desfase / 1000))} S` : ""}` : ""}${x.corregido ? E(" · DECIDIDO OTRA VEZ AL SUBIR OTRA PUERTA", " · RE-DECIDED WHEN ANOTHER DOOR SYNCED") : ""}` })) } as Bloque] : [{ type: "note", tone: "info", icon: "key", t: E("Este boleto no ha pasado por la puerta.", "This ticket hasn’t been through the door.") } as Bloque]),
    // 8g · WALLET: los pases de este boleto (Apple / Google), si siguen vivos, qué teléfonos los siguen y lo que pasó con cada uno.
    ...(pases.length ? [{ type: "rows", k: `WALLET · ${pases.length} ${pases.length === 1 ? E("PASE", "PASS") : E("PASES", "PASSES")}`, items: pases.map((p) => ({ key: p.id, icon: "ticket", t: `${p.plat === "apple" ? "Apple Wallet" : "Google Wallet"} · ${p.serie}`,
        s: [`${E("versión", "version")} ${p.version}`, p.anulado ? `${E("anulado", "voided")} ${ct(p.anulado)}${p.por ? ` · ${ppor[p.por] ?? p.por}` : ""}` : `${E("emitido", "issued")} ${ct(p.emitido)}`,
          p.plat === "apple" ? `${p.telefonos} ${p.telefonos === 1 ? E("teléfono", "phone") : E("teléfonos", "phones")}${p.aviso.pendientes ? E(` · ${p.aviso.pendientes} por avisar`, ` · ${p.aviso.pendientes} to notify`) : ""}${p.aviso.at ? ` · ${E("último aviso", "last notice")} ${ct(p.aviso.at)} (${p.aviso.res ?? "—"})` : ""}`
            : p.google ? (p.google.al_dia ? E("Google al día", "Google up to date") : `${E("Google pendiente", "Google pending")}${p.google.error ? ` · ${p.google.error}` : ""}`) : ""].filter(Boolean).join(" · "),
        tag: p.anulado ? E("ANULADO", "VOIDED") : E("VIVO", "ACTIVE"), tone: p.anulado ? "neutral" : "signal" })) } as Bloque,
      // En el orden en que pasó (el número del libro: varias cosas caen en el mismo segundo).
      { type: "timeline", k: E("LOS PASES", "THE PASSES"), items: pases.flatMap((p) => p.log.map((l) => ({ t: `${p.plat === "apple" ? "APPLE" : "GOOGLE"} · ${plog[l.a] ?? l.a}`, s: `${ct(l.at)}${l.d ? ` · ${l.d}` : ""}`, n: Number(l.id) })))
        .sort((x, y) => y.n - x.n).slice(0, 30).map(({ t, s }) => ({ t, s })) } as Bloque]
      : [{ type: "note", tone: "info", icon: "ticket", t: E("Este boleto no está en Apple Wallet ni en Google Wallet.", "This ticket isn’t in Apple Wallet or Google Wallet.") } as Bloque]),
    { type: "note", tone: "ink", icon: "lock", t: E("Lo que ve la puerta: nombre e inicial, tipo, entradas y estado. Nunca el teléfono completo ni montos.", "What the door sees: name and initial, type, admits and status. Never the full phone number or amounts.") },
    ...(acts.length ? [{ type: "acts", items: acts } as Bloque] : []),
  ];
  return <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={bloques} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
