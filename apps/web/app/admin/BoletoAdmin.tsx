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
import { diaCorto } from "@/lib/evt-comun";
import { evtBoleto } from "./acciones-eventos";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";

const ST: Record<string, [string, string]> = { valid: ["VÁLIDO", "signal"], used: ["USADO", "neutral"], refunded: ["DEVUELTO", "neutral"], void: ["ANULADO", "danger"], replaced: ["TRANSFERIDO", "neutral"] };
const LOG: Record<string, string> = { emitido: "Emitido al pagar", reenviado: "Reenviado a su cuenta", reemitido: "QR reemitido (el anterior ya no entra)", anulado: "Anulado", cobro_fallido: "El cobro no se completó: anulado",
  // 6d
  transfer_enviado: "Enviado a otro teléfono (el QR anterior quedó anulado)", transfer_cancelado: "Transferencia deshecha (QR nuevo)", transfer_vencido: "Nadie lo recibió a tiempo: volvió con QR nuevo",
  transferido: "Lo recibió otra persona (este boleto ya no entra)", recibido: "Recibido de otra persona", cancelado: "Cancelado por el comprador (devolución menos el cargo)", devuelto: "Devuelto por el organizador (100 %)",
  cortesia: "Cortesía dada por el organizador", cortesia_recibida: "Cortesía recibida en su cuenta", nombre: "Cambió el nombre del boleto" };
const EV: Record<string, string> = { tickets_sold: "Orden pagada · boletos emitidos", payment_captured: "Cobrado en la tarjeta", payment_failed: "El cobro no se completó", refunded: "Devolución",
  tickets_cancelled: "El comprador canceló boletos", tickets_refunded: "El organizador devolvió boletos", comp_given: "Cortesía" };
const XST: Record<string, string> = { pending: "ESPERANDO", claimed: "RECIBIDO", cancelled: "DESHECHO", expired: "VENCIÓ" };
const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const cuando = (at: string, tz: string) => new Date(at).toLocaleString("es-US", { timeZone: tz, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function BoletoAdmin({ b, puede, escaneos = [] }: { b: BoletoAdm; puede: { editar: boolean; retirar: boolean }; escaneos?: Awaited<ReturnType<typeof escaneosBoleto>> }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  const [tag, tone] = ST[b.estado] ?? [b.estado, "neutral"];
  const head: Bloque = { type: "head", eye: `${tag} · ${b.ciudad.toUpperCase()}`, t: b.code, s: `${b.evento.es} · ${diaCorto(b.dia, true)} · ${b.quien}`, onBack: () => router.push("/admin/eventos?tab=bol"), h1: desk ? 26 : 22 };
  if (conf) return <><PanelBloques bloques={[head]} h1={22} /><ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} /><Toast t={toast} desk={desk} /></>;
  const acts = [
    ...(puede.editar ? [{ l: "Reenviar", icon: "share", onClick: () => setConf({ titulo: `Reenviar los boletos de ${b.num}`, sub: "Le llega un aviso en su cuenta con sus boletos. No cambia nada del boleto.", plantillas: ["No encuentra sus boletos", "Pidió ayuda por chat"], hacer: (m) => evtBoleto(b.code, "reenviar", m) }) }] : []),
    ...(puede.editar && b.estado === "valid" ? [{ l: "Reemitir", icon: "ticket", onClick: () => setConf({ titulo: `Reemitir ${b.code}`, sub: "Sale un QR nuevo y el anterior deja de entrar (en línea y sin conexión). Le avisamos.", plantillas: ["Compartió su QR por error", "Perdió el teléfono", "Disputa: QR usado por otra persona"], hacer: (m) => evtBoleto(b.code, "reemitir", m) }) }] : []),
    ...(puede.retirar && b.estado === "valid" ? [{ l: "Anular", v: "danger", icon: "ban", onClick: () => setConf({ titulo: `¿Por qué se anula ${b.code}?`, sub: "El boleto deja de entrar. No devuelve dinero (las devoluciones se hacen aparte). La persona recibe el motivo.", peligro: true, plantillas: ["Fraude confirmado por Confianza", "Contracargo del banco", "Boleto duplicado"], hacer: (m) => evtBoleto(b.code, "anular", m) }) }] : []),
  ];
  const bloques: Bloque[] = [head,
    { type: "note", tone: tone === "signal" && b.vigente ? "ok" : tone === "danger" ? "danger" : "ink", icon: "ticket", t: `${b.kind === "comp" ? "CORTESÍA · " : ""}${tag}${b.motivo ? ` · ${b.motivo}` : ""} · QR versión ${b.ver}${b.ver > 1 ? " (los anteriores no entran)" : ""}${b.estado === "valid" && !b.vigente ? " · SE ESTÁ TRANSFIRIENDO: ningún QR entra" : ""}${b.reemplazo ? ` · ahora es ${b.reemplazo}` : ""}` },
    ...(b.devolucion ? [{ type: "kv", cols: 2, items: [{ k: "DEVOLUCIÓN", v: `${usd(b.devolucion.monto)} · ${b.devolucion.estado === "done" ? "hecha" : b.devolucion.estado === "pending" ? "en camino (se reintenta sola)" : "falló"}` },
      { k: "QUIÉN", v: b.devolucion.por === "buyer" ? "El comprador canceló" : b.devolucion.por === "business" ? "El organizador devolvió" : b.devolucion.por },
      { k: "CARGO QUE SE QUEDA TO'LATINO", v: usd(b.devolucion.cargo) }, { k: "COMISIÓN QUE TO'LATINO NO COBRA", v: usd(b.devolucion.cede) }] } as Bloque] : []),
    ...(b.transferencias.length ? [{ type: "rows", k: `TRANSFERENCIAS · ${b.transferencias.length}`, items: b.transferencias.map((x, i) => ({ key: `x${i}`, icon: "share", t: `${x.kind === "comp" ? "Cortesía a un teléfono" : `De ${x.de}`} → ${x.a}`, s: `${cuando(x.at, b.tz)}${x.nuevo ? ` · nuevo boleto ${x.nuevo}` : ""}`,
      tag: XST[x.estado] ?? x.estado, tone: x.estado === "claimed" ? "signal" : x.estado === "pending" ? "pro" : "neutral", compact: true, chev: !!x.nuevo && x.nuevo !== b.code, onClick: x.nuevo && x.nuevo !== b.code ? () => router.push(`/admin/eventos/boleto/${x.nuevo}`) : undefined })) } as Bloque] : []),
    { type: "kv", cols: 2, items: [{ k: "EVENTO", v: b.evento.es }, { k: "FECHA", v: diaCorto(b.dia, true) }, { k: "TIPO", v: (b.tipo ?? b.mesa)?.es ?? "—" }, { k: "ENTRAN", v: String(b.admits) },
      { k: "A NOMBRE DE", v: b.nombre || b.quien }, { k: "CUENTA", v: b.tel4 ? `${b.quien} · tel. ${b.tel4}` : b.kind === "comp" ? "Sin cuenta todavía (cortesía)" : b.quien }, { k: "ORDEN", v: b.num }, { k: "PAGÓ POR ESTE BOLETO", v: usd(b.precio) },
      { k: "COMISIÓN DE ESTE BOLETO", v: usd(b.fee) }, { k: "DESCUENTO", v: b.descuento ? `−${usd(b.descuento)}` : "—" }] },
    ...(b.pago ? [{ type: "kv", cols: 2, items: [{ k: "PAGO", v: b.pago.estado === "captured" ? "Cobrado" : b.pago.estado === "held" ? "Retenido" : b.pago.estado === "released" ? "Liberado" : b.pago.estado === "refunded" ? "Devuelto" : b.pago.estado },
      { k: "TOTAL DE LA ORDEN", v: usd(b.pago.monto) }, { k: "COMISIÓN DE LA ORDEN", v: usd(b.pago.comision) }, { k: "TARJETA", v: `${b.pago.tarjeta ?? "—"}${b.pago.simulado ? " · SIMULADO" : ""}` }] } as Bloque] : []),
    { type: "rows", k: `BOLETOS DE LA ORDEN · ${b.hermanos.length}`, items: b.hermanos.map((h) => ({ key: h.code, icon: "ticket", t: h.code, tag: ST[h.estado]?.[0] ?? h.estado, tone: ST[h.estado]?.[1] ?? "neutral", compact: true, chev: h.code !== b.code, onClick: h.code !== b.code ? () => router.push(`/admin/eventos/boleto/${h.code}`) : undefined })) },
    { type: "timeline", k: "LA ORDEN", items: b.orden.map((o) => ({ t: EV[o.kind] ?? o.kind, s: cuando(o.at, b.tz) })) },
    { type: "timeline", k: "EL BOLETO", items: b.log.map((l) => ({ t: LOG[l.kind] ?? l.kind, s: `${l.by === "staff" ? `TO’LATINO${l.quien ? ` · ${l.quien}` : ""}` : l.by === "business" ? "EL NEGOCIO" : l.by === "user" ? "LA PERSONA" : "SISTEMA"} · ${cuando(l.at, b.tz)}${l.reason ? ` · ${l.reason}` : ""}` })) },
    // 6g · En la puerta: cada escaneo (resultado, puerta, quién y hora).
    ...(escaneos.length ? [{ type: "timeline", k: "ESCANEOS EN LA PUERTA", items: escaneos.map((x) => ({ t: `${RESULTADO[x.res].t.es}${x.k > 1 ? ` · ${x.k}` : ""}${x.dir === "out" ? " · salida" : ""}`, s: `${x.puerta.toUpperCase()} · ${x.quien.toUpperCase()} · ${x.dia} ${x.hora}${x.motivo ? ` · A MANO: ${x.motivo}` : ""}` })) } as Bloque] : [{ type: "note", tone: "info", icon: "key", t: "Este boleto no ha pasado por la puerta." } as Bloque]),
    { type: "note", tone: "ink", icon: "lock", t: "Lo que ve la puerta: nombre e inicial, tipo, entradas y estado. Nunca el teléfono completo ni montos." },
    ...(acts.length ? [{ type: "acts", items: acts } as Bloque] : []),
  ];
  return <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={bloques} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
