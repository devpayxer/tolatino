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
import { useE2 } from "./idioma-admin";

type EF = (es: string, en: string) => string;
const ST = (E2: EF): Record<string, [string, string]> => ({ valid: [E2("VÁLIDO", "VALID"), "signal"], used: [E2("USADO", "USED"), "neutral"], refunded: [E2("DEVUELTO", "REFUNDED"), "neutral"], void: [E2("ANULADO", "VOIDED"), "danger"], replaced: [E2("TRANSFERIDO", "TRANSFERRED"), "neutral"] });
const LOG = (E2: EF): Record<string, string> => ({ emitido: E2("Emitido al pagar", "Issued on payment"), reenviado: E2("Reenviado a su cuenta", "Resent to their account"), reemitido: E2("QR reemitido (el anterior ya no entra)", "QR reissued (the previous one no longer works)"), anulado: E2("Anulado", "Voided"), cobro_fallido: E2("El cobro no se completó: anulado", "The charge didn’t go through: voided"),
  // 6d
  transfer_enviado: E2("Enviado a otro teléfono (el QR anterior quedó anulado)", "Sent to another phone (the previous QR was voided)"), transfer_cancelado: E2("Transferencia deshecha (QR nuevo)", "Transfer undone (new QR)"), transfer_vencido: E2("Nadie lo recibió a tiempo: volvió con QR nuevo", "Nobody claimed it in time: it came back with a new QR"),
  transferido: E2("Lo recibió otra persona (este boleto ya no entra)", "Someone else received it (this ticket no longer works)"), recibido: E2("Recibido de otra persona", "Received from someone else"), cancelado: E2("Cancelado por el comprador (devolución menos el cargo)", "Canceled by the buyer (refund minus the fee)"), devuelto: E2("Devuelto por el organizador (100 %)", "Refunded by the organizer (100%)"),
  cortesia: E2("Cortesía dada por el organizador", "Comp ticket given by the organizer"), cortesia_recibida: E2("Cortesía recibida en su cuenta", "Comp ticket received in their account"), nombre: E2("Cambió el nombre del boleto", "Ticket name changed") });
const EV = (E2: EF): Record<string, string> => ({ tickets_sold: E2("Orden pagada · boletos emitidos", "Order paid · tickets issued"), payment_captured: E2("Cobrado en la tarjeta", "Charged to the card"), payment_failed: E2("El cobro no se completó", "The charge didn’t go through"), refunded: E2("Devolución", "Refund"),
  tickets_cancelled: E2("El comprador canceló boletos", "The buyer canceled tickets"), tickets_refunded: E2("El organizador devolvió boletos", "The organizer refunded tickets"), comp_given: E2("Cortesía", "Comp ticket") });
const XST = (E2: EF): Record<string, string> => ({ pending: E2("ESPERANDO", "WAITING"), claimed: E2("RECIBIDO", "RECEIVED"), cancelled: E2("DESHECHO", "UNDONE"), expired: E2("VENCIÓ", "EXPIRED") });
// 8g · Wallet: lo que pasó con cada pase (pass_log) y por qué quedó anulado.
const PLOG = (E2: EF): Record<string, string> => ({ emitido: E2("Emitido", "Issued"), descargado: E2("Lo volvió a bajar", "Downloaded again"), actualizado: E2("Actualizado (cambió el boleto, la fecha o el evento)", "Updated (the ticket, date or event changed)"), anulado: E2("Anulado", "Voided"), registrado: E2("Un teléfono lo sigue", "A phone follows it"),
  baja: E2("Un teléfono dejó de seguirlo", "A phone stopped following it"), aviso: E2("Aviso de cambio enviado a Apple", "Change notice sent to Apple"), aviso_fallo: E2("El aviso a Apple no salió (se dejó de intentar)", "The notice to Apple didn’t go out (stopped retrying)"), google: E2("Google Wallet al día", "Google Wallet up to date"), google_fallo: E2("Google Wallet no respondió (se dejó de intentar)", "Google Wallet didn’t respond (stopped retrying)"), enviado: E2("El teléfono bajó el pase al día", "The phone downloaded the updated pass") });
const PPOR = (E2: EF): Record<string, string> => ({ boleto: E2("el boleto ya no vale", "the ticket is no longer valid"), dueno: E2("cambió de dueño", "changed owner"), fecha: E2("la fecha se canceló", "the date was canceled"), evento: E2("el evento se canceló", "the event was canceled") });
const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const cuando = (at: string, tz: string, en = false) => new Date(at).toLocaleString(en ? "en-US" : "es-US", { timeZone: tz, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function BoletoAdmin({ b, puede, escaneos = [], pases = [] }: { b: BoletoAdm; puede: { editar: boolean; retirar: boolean }; escaneos?: Awaited<ReturnType<typeof escaneosBoleto>>; pases?: PaseAdm[] }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024, { E2 } = useE2(), en = E2("", "x") === "x";
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  const tx = (x: { es: string; en?: string | null } | null | undefined) => (x ? (en ? x.en || x.es : x.es) : "");
  const ct = (at: string) => cuando(at, b.tz, en);
  const st = ST(E2), lg = LOG(E2), ev = EV(E2), xst = XST(E2), plog = PLOG(E2), ppor = PPOR(E2);
  const [tag, tone] = st[b.estado] ?? [b.estado, "neutral"];
  const head: Bloque = { type: "head", eye: `${tag} · ${b.ciudad.toUpperCase()}`, t: b.code, s: `${tx(b.evento)} · ${diaCorto(b.dia, !en)} · ${b.quien}`, onBack: () => router.push("/admin/eventos?tab=bol"), h1: desk ? 26 : 22 };
  if (conf) return <><PanelBloques bloques={[head]} h1={22} /><ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} /><Toast t={toast} desk={desk} /></>;
  const acts = [
    ...(puede.editar ? [{ l: E2("Reenviar", "Resend"), icon: "share", onClick: () => setConf({ titulo: E2(`Reenviar los boletos de ${b.num}`, `Resend the tickets for ${b.num}`), sub: E2("Le llega un aviso en su cuenta con sus boletos. No cambia nada del boleto.", "They get a notification in their account with their tickets. Nothing about the ticket changes."), plantillas: [E2("No encuentra sus boletos", "Can’t find their tickets"), E2("Pidió ayuda por chat", "Asked for help by chat")], nota: "interna", hacer: (m) => evtBoleto(b.code, "reenviar", m) }) }] : []),
    ...(puede.editar && b.estado === "valid" ? [{ l: E2("Reemitir", "Reissue"), icon: "ticket", onClick: () => setConf({ titulo: E2(`Reemitir ${b.code}`, `Reissue ${b.code}`), sub: E2("Sale un QR nuevo y el anterior deja de entrar (en línea y sin conexión). Le avisamos.", "A new QR is issued and the previous one stops working (online and offline). We notify them."), plantillas: [E2("Compartió su QR por error", "Shared their QR by mistake"), E2("Perdió el teléfono", "Lost their phone"), E2("Disputa: QR usado por otra persona", "Dispute: QR used by someone else")], nota: "interna", hacer: (m) => evtBoleto(b.code, "reemitir", m) }) }] : []),
    ...(puede.retirar && b.estado === "valid" ? [{ l: E2("Anular", "Void"), v: "danger", icon: "ban", onClick: () => setConf({ titulo: E2(`¿Por qué se anula ${b.code}?`, `Why is ${b.code} being voided?`), sub: E2("El boleto deja de entrar. No devuelve dinero (las devoluciones se hacen aparte). La persona recibe el motivo.", "The ticket stops working. No money is refunded (refunds are done separately). The person gets the reason."), peligro: true, plantillas: [E2("Fraude confirmado por Confianza", "Fraud confirmed by Trust"), E2("Contracargo del banco", "Bank chargeback"), E2("Boleto duplicado", "Duplicate ticket")], nota: "persona", hacer: (m) => evtBoleto(b.code, "anular", m) }) }] : []),
  ];
  const bloques: Bloque[] = [head,
    { type: "note", tone: tone === "signal" && b.vigente ? "ok" : tone === "danger" ? "danger" : "ink", icon: "ticket", t: `${b.kind === "comp" ? E2("CORTESÍA · ", "COMP TICKET · ") : ""}${tag}${b.motivo ? ` · ${b.motivo}` : ""} · ${E2("QR versión", "QR version")} ${b.ver}${b.ver > 1 ? E2(" (los anteriores no entran)", " (earlier ones don’t work)") : ""}${b.estado === "valid" && !b.vigente ? E2(" · SE ESTÁ TRANSFIRIENDO: ningún QR entra", " · BEING TRANSFERRED: no QR works") : ""}${b.reemplazo ? E2(` · ahora es ${b.reemplazo}`, ` · now ${b.reemplazo}`) : ""}` },
    ...(b.devolucion ? [{ type: "kv", cols: 2, items: [{ k: E2("DEVOLUCIÓN", "REFUND"), v: `${usd(b.devolucion.monto)} · ${b.devolucion.estado === "done" ? E2("hecha", "done") : b.devolucion.estado === "pending" ? E2("en camino (se reintenta sola)", "on its way (retries on its own)") : E2("falló", "failed")}` },
      { k: E2("QUIÉN", "WHO"), v: b.devolucion.por === "buyer" ? E2("El comprador canceló", "The buyer canceled") : b.devolucion.por === "business" ? E2("El organizador devolvió", "The organizer refunded") : b.devolucion.por },
      { k: E2("CARGO QUE SE QUEDA TO'LATINO", "FEE TO'LATINO KEEPS"), v: usd(b.devolucion.cargo) }, { k: E2("COMISIÓN QUE TO'LATINO NO COBRA", "FEE TO'LATINO WAIVES"), v: usd(b.devolucion.cede) }] } as Bloque] : []),
    ...(b.transferencias.length ? [{ type: "rows", k: E2(`TRANSFERENCIAS · ${b.transferencias.length}`, `TRANSFERS · ${b.transferencias.length}`), items: b.transferencias.map((x, i) => ({ key: `x${i}`, icon: "share", t: `${x.kind === "comp" ? E2("Cortesía a un teléfono", "Comp ticket to a phone") : E2(`De ${x.de}`, `From ${x.de}`)} → ${x.a}`, s: `${ct(x.at)}${x.nuevo ? E2(` · nuevo boleto ${x.nuevo}`, ` · new ticket ${x.nuevo}`) : ""}`,
      tag: xst[x.estado] ?? x.estado, tone: x.estado === "claimed" ? "signal" : x.estado === "pending" ? "pro" : "neutral", compact: true, chev: !!x.nuevo && x.nuevo !== b.code, onClick: x.nuevo && x.nuevo !== b.code ? () => router.push(`/admin/eventos/boleto/${x.nuevo}`) : undefined })) } as Bloque] : []),
    { type: "kv", cols: 2, items: [{ k: E2("EVENTO", "EVENT"), v: tx(b.evento) }, { k: E2("FECHA", "DATE"), v: diaCorto(b.dia, !en) }, { k: E2("TIPO", "TYPE"), v: (b.tipo ?? b.mesa) ? tx(b.tipo ?? b.mesa) : "—" }, { k: E2("ENTRAN", "ADMITS"), v: String(b.admits) },
      { k: E2("A NOMBRE DE", "NAME ON TICKET"), v: b.nombre || b.quien }, { k: E2("CUENTA", "ACCOUNT"), v: b.tel4 ? `${b.quien} · ${E2("tel.", "ph.")} ${b.tel4}` : b.kind === "comp" ? E2("Sin cuenta todavía (cortesía)", "No account yet (comp ticket)") : b.quien }, { k: E2("ORDEN", "ORDER"), v: b.num }, { k: E2("PAGÓ POR ESTE BOLETO", "PAID FOR THIS TICKET"), v: usd(b.precio) },
      { k: E2("COMISIÓN DE ESTE BOLETO", "FEE ON THIS TICKET"), v: usd(b.fee) }, { k: E2("DESCUENTO", "DISCOUNT"), v: b.descuento ? `−${usd(b.descuento)}` : "—" }] },
    ...(b.pago ? [{ type: "kv", cols: 2, items: [{ k: E2("PAGO", "PAYMENT"), v: b.pago.estado === "captured" ? E2("Cobrado", "Charged") : b.pago.estado === "held" ? E2("Retenido", "Held") : b.pago.estado === "released" ? E2("Liberado", "Released") : b.pago.estado === "refunded" ? E2("Devuelto", "Refunded") : b.pago.estado },
      { k: E2("TOTAL DE LA ORDEN", "ORDER TOTAL"), v: usd(b.pago.monto) }, { k: E2("COMISIÓN DE LA ORDEN", "ORDER FEE"), v: usd(b.pago.comision) }, { k: E2("TARJETA", "CARD"), v: `${b.pago.tarjeta ?? "—"}${b.pago.simulado ? E2(" · SIMULADO", " · SIMULATED") : ""}` }] } as Bloque] : []),
    { type: "rows", k: E2(`BOLETOS DE LA ORDEN · ${b.hermanos.length}`, `TICKETS IN THE ORDER · ${b.hermanos.length}`), items: b.hermanos.map((h) => ({ key: h.code, icon: "ticket", t: h.code, tag: st[h.estado]?.[0] ?? h.estado, tone: st[h.estado]?.[1] ?? "neutral", compact: true, chev: h.code !== b.code, onClick: h.code !== b.code ? () => router.push(`/admin/eventos/boleto/${h.code}`) : undefined })) },
    { type: "timeline", k: E2("LA ORDEN", "THE ORDER"), items: b.orden.map((o) => ({ t: ev[o.kind] ?? o.kind, s: ct(o.at) })) },
    { type: "timeline", k: E2("EL BOLETO", "THE TICKET"), items: b.log.map((l) => ({ t: lg[l.kind] ?? l.kind, s: `${l.by === "staff" ? `TO’LATINO${l.quien ? ` · ${l.quien}` : ""}` : l.by === "business" ? E2("EL NEGOCIO", "THE BUSINESS") : l.by === "user" ? E2("LA PERSONA", "THE PERSON") : E2("SISTEMA", "SYSTEM")} · ${ct(l.at)}${l.reason ? ` · ${l.reason}` : ""}` })) },
    // 6g · En la puerta: cada escaneo (resultado, puerta, quién y hora).
    ...(escaneos.length ? [{ type: "timeline", k: E2("ESCANEOS EN LA PUERTA", "DOOR SCANS"), items: escaneos.map((x) => ({ t: `${x.resolucion === "duplicate" ? E2("REPETIDO", "DUPLICATE") : tx(RESULTADO[x.res].t)}${x.k > 1 ? ` · ${x.k}` : ""}${x.dir === "out" ? E2(" · salida", " · exit") : ""}${x.offline ? E2(" · SIN CONEXIÓN", " · OFFLINE") : ""}`,
      s: `${x.puerta.toUpperCase()} · ${x.quien.toUpperCase()} · ${x.dia} ${x.hora}${x.motivo ? ` · ${E2("A MANO", "BY HAND")}: ${x.motivo}` : ""}${x.offline ? E2(` · HORA DEL TELÉFONO CORREGIDA · LLEGÓ ${x.llego}`, ` · PHONE TIME CORRECTED · ARRIVED ${x.llego}`) : ""}${x.desviado ? ` · ${E2("RELOJ DESVIADO", "CLOCK OFF")}${x.desfase != null ? ` · ${x.desfase < 0 ? E2("ADELANTADO", "AHEAD") : E2("ATRASADO", "BEHIND")} ${Math.abs(Math.round(x.desfase / 1000))} S` : ""}` : ""}${x.corregido ? E2(" · DECIDIDO OTRA VEZ AL SUBIR OTRA PUERTA", " · RE-DECIDED WHEN ANOTHER DOOR SYNCED") : ""}` })) } as Bloque] : [{ type: "note", tone: "info", icon: "key", t: E2("Este boleto no ha pasado por la puerta.", "This ticket hasn’t been through the door.") } as Bloque]),
    // 8g · WALLET: los pases de este boleto (Apple / Google), si siguen vivos, qué teléfonos los siguen y lo que pasó con cada uno.
    ...(pases.length ? [{ type: "rows", k: `WALLET · ${pases.length} ${pases.length === 1 ? E2("PASE", "PASS") : E2("PASES", "PASSES")}`, items: pases.map((p) => ({ key: p.id, icon: "ticket", t: `${p.plat === "apple" ? "Apple Wallet" : "Google Wallet"} · ${p.serie}`,
        s: [`${E2("versión", "version")} ${p.version}`, p.anulado ? `${E2("anulado", "voided")} ${ct(p.anulado)}${p.por ? ` · ${ppor[p.por] ?? p.por}` : ""}` : `${E2("emitido", "issued")} ${ct(p.emitido)}`,
          p.plat === "apple" ? `${p.telefonos} ${p.telefonos === 1 ? E2("teléfono", "phone") : E2("teléfonos", "phones")}${p.aviso.pendientes ? E2(` · ${p.aviso.pendientes} por avisar`, ` · ${p.aviso.pendientes} to notify`) : ""}${p.aviso.at ? ` · ${E2("último aviso", "last notice")} ${ct(p.aviso.at)} (${p.aviso.res ?? "—"})` : ""}`
            : p.google ? (p.google.al_dia ? E2("Google al día", "Google up to date") : `${E2("Google pendiente", "Google pending")}${p.google.error ? ` · ${p.google.error}` : ""}`) : ""].filter(Boolean).join(" · "),
        tag: p.anulado ? E2("ANULADO", "VOIDED") : E2("VIVO", "ACTIVE"), tone: p.anulado ? "neutral" : "signal" })) } as Bloque,
      // En el orden en que pasó (el número del libro: varias cosas caen en el mismo segundo).
      { type: "timeline", k: E2("LOS PASES", "THE PASSES"), items: pases.flatMap((p) => p.log.map((l) => ({ t: `${p.plat === "apple" ? "APPLE" : "GOOGLE"} · ${plog[l.a] ?? l.a}`, s: `${ct(l.at)}${l.d ? ` · ${l.d}` : ""}`, n: Number(l.id) })))
        .sort((x, y) => y.n - x.n).slice(0, 30).map(({ t, s }) => ({ t, s })) } as Bloque]
      : [{ type: "note", tone: "info", icon: "ticket", t: E2("Este boleto no está en Apple Wallet ni en Google Wallet.", "This ticket isn’t in Apple Wallet or Google Wallet.") } as Bloque]),
    { type: "note", tone: "ink", icon: "lock", t: E2("Lo que ve la puerta: nombre e inicial, tipo, entradas y estado. Nunca el teléfono completo ni montos.", "What the door sees: name and initial, type, admits and status. Never the full phone number or amounts.") },
    ...(acts.length ? [{ type: "acts", items: acts } as Bloque] : []),
  ];
  return <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={bloques} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}

/* dinero fijo: super admin (cifras de contabilidad del equipo, siempre con dos decimales) */
