"use server";
/* 6a · Super Admin › Eventos y boletos y Colas › Eventos a revisar. Permisos (adm-data.js PERM evt): decidir y verificar al
   organizador piden evt:aprobar (Admin y Ciudad); ocultar del módulo y bloquear la publicación, evt:retirar (Admin). Cada decisión la
   toma lib/evt-revision.ts con la fila bloqueada, la auditoría, el libro de revisión y el aviso al negocio con el motivo. */
import { revalidatePath } from "next/cache";
import { auditar, requerir } from "@/lib/admin";
import { db, tx } from "@/lib/db";
import { decidirEvento, ocultarEvento, organizadorPaso, type Decision } from "@/lib/evt-revision";
import type { ResAdm } from "./acciones-colas";

const no = (mensaje: string): ResAdm => ({ ok: false, mensaje });
const motivoOk = (m: unknown) => (typeof m === "string" ? m.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 500) : "");
const listo = () => { revalidatePath("/admin/eventos"); revalidatePath("/admin/colas"); revalidatePath("/admin"); };

export async function evtDecidir(id: string, d: Decision, razon: string | null, nota: string): Promise<ResAdm> {
  const s = await requerir("evt", "aprobar");
  if (d !== "aprobar" && d !== "cambios" && d !== "rechazar") return no("Esa decisión no existe.");
  const r = await decidirEvento(s, String(id), d, typeof razon === "string" ? razon : null, motivoOk(nota));
  if (r.err) return no(r.err);
  listo();
  return { ok: true, mensaje: d === "aprobar" ? "Publicado. El negocio recibe el aviso." : d === "cambios" ? "Cambios pedidos. El negocio recibe el motivo." : "No aprobado. El negocio recibe el motivo y puede apelar." };
}

export async function evtOcultar(id: string, ocultar: boolean, motivo: string): Promise<ResAdm> {
  const s = await requerir("evt", "retirar");
  const r = await ocultarEvento(s, String(id), !!ocultar, motivoOk(motivo));
  if (r.err) return no(r.err);
  listo();
  return { ok: true, mensaje: ocultar ? "Oculto del módulo. El organizador recibe el motivo y puede apelar." : "Visible otra vez." };
}

export async function evtOrganizador(negocio: string, paso: "verificar" | "quitar_verificado" | "bloquear" | "desbloquear", motivo: string): Promise<ResAdm> {
  const s = await requerir("evt", paso === "bloquear" || paso === "desbloquear" ? "retirar" : "aprobar");
  if (!["verificar", "quitar_verificado", "bloquear", "desbloquear"].includes(paso)) return no("Ese paso no existe.");
  const r = await organizadorPaso(s, String(negocio), paso, motivoOk(motivo));
  if (r.err) return no(r.err);
  listo();
  revalidatePath(`/admin/negocios/${negocio}`);
  return { ok: true, mensaje: paso === "verificar" ? "Verificado: sus eventos se publican al enviarlos." : paso === "quitar_verificado" ? "Sus eventos vuelven a pasar por revisión." : paso === "bloquear" ? "Bloqueado. El negocio recibe el motivo y puede apelar." : "Puede publicar otra vez." };
}

/* 6c · Buscar boleto: Reenviar (evt:editar) · Reemitir (evt:editar; sube la versión del QR) · Anular con motivo (evt:retirar). */
export async function evtBoleto(code: string, paso: "reenviar" | "reemitir" | "anular", motivo: string): Promise<ResAdm> {
  const s = await requerir("evt", paso === "anular" ? "retirar" : "editar");
  if (!["reenviar", "reemitir", "anular"].includes(paso)) return no("Ese paso no existe.");
  const r = await (await import("@/lib/boletos-admin")).accionBoletoAdmin(s, String(code), paso, motivoOk(motivo));
  if (r.err) return no(r.err);
  revalidatePath("/admin/eventos");
  return { ok: true, mensaje: paso === "reenviar" ? "Le llegó un aviso con sus boletos." : paso === "reemitir" ? "QR nuevo. El anterior ya no entra; le avisamos." : "Boleto anulado. Le avisamos con el motivo." };
}

/* 6e · La ficha del evento: «Cancelar y devolver todo» (regla del módulo: cancela el evento → devolución total; evt:retirar, Admin) y
   «Congelar ventas» / «Descongelar» (evt:editar): el organizador no la reabre. Todo con motivo, aviso y auditoría; el dinero lo decide
   lib/evt-cambios.ts (idempotente por orden, reanudable por el barrido). Solo eventos de las ciudades de quien decide. */
export async function evtCancelarAdmin(id: string, motivo: string): Promise<ResAdm> {
  const s = await requerir("evt", "retirar");
  const m = motivoOk(motivo);
  if (m.length < 4) return no("Escribe el motivo: lo ven los que iban.");
  const r = await (await import("@/lib/evt-cambios")).cancelarEvento({ tipo: "admin", userId: s.id, cities: s.cities }, String(id), "event", null, "admin", m);
  if (!r.ok) return no(r.msg.es);
  await tx((c) => auditar(c, { actor: s.id, action: "evento.cancelar", targetKind: "event", targetId: String(id), after: { devueltas: r.devueltas, pendientes: r.pendientes, regla: "cancela el evento → devolución total" }, reason: m }));
  listo();
  return { ok: true, mensaje: r.pendientes ? `Cancelado. ${r.devueltas} órdenes devueltas; las ${r.pendientes} que faltan las sigue el barrido.` : `Cancelado. ${r.devueltas} órdenes devueltas al 100 %; avisamos a cada persona en To'Latino.` };
}
export async function evtCongelar(id: string, congelar: boolean, motivo: string): Promise<ResAdm> {
  const s = await requerir("evt", "editar");
  const m = motivoOk(motivo);
  const r = await (await import("@/lib/evt-cambios")).congelarVenta({ tipo: "admin", userId: s.id, cities: s.cities }, String(id), !!congelar, m);
  if (!r.ok) return no(r.msg.es);
  await tx((c) => auditar(c, { actor: s.id, action: congelar ? "evento.venta.congelar" : "evento.venta.descongelar", targetKind: "event", targetId: String(id), after: { venta: congelar ? "congelada" : "abierta" }, reason: m }));
  listo();
  return { ok: true, mensaje: congelar ? "Venta congelada. El organizador recibe el motivo y no la puede reabrir." : "Venta abierta otra vez." };
}

/* 6e · Liquidaciones de eventos (Finanzas: tx:aprobar retiene o suelta; tx:exportar baja el CSV). */
export async function liqRetener(id: string, motivo: string): Promise<ResAdm> {
  const s = await requerir("tx", "aprobar");
  const r = await (await import("@/lib/evt-liquidacion")).retenerLiquidacion(s, String(id), motivoOk(motivo));
  if (!r.ok) return no(r.msg);
  revalidatePath("/admin/eventos/liquidaciones");
  return { ok: true, mensaje: "Retenida. El organizador ve el motivo en Cobros." };
}
export async function liqSoltar(id: string, motivo: string): Promise<ResAdm> {
  const s = await requerir("tx", "aprobar");
  const r = await (await import("@/lib/evt-liquidacion")).soltarLiquidacion(s, String(id), motivoOk(motivo));
  if (!r.ok) return no(r.msg);
  revalidatePath("/admin/eventos/liquidaciones"); revalidatePath("/admin/colas");
  return { ok: true, mensaje: "Soltada: se paga en el siguiente barrido si la fecha ya llegó a su martes." };
}
export async function liqCsv(st: string | null, q: string): Promise<ResAdm & { archivo?: string; nombre?: string }> {
  const s = await requerir("tx", "exportar");
  const L = await import("@/lib/evt-liquidacion"), { csv } = await import("@/lib/csv");
  const d = await L.liquidacionesAdmin(s, st, String(q ?? ""));
  await tx((c) => auditar(c, { actor: s.id, action: "evento.liquidaciones_exportar", targetKind: "report", targetId: "liquidaciones", after: { filas: d.filas.length }, reason: "Exportar liquidaciones de eventos" }));
  return { ok: true, mensaje: "Descargado. Quedó en la auditoría.", archivo: csv(L.CSV_LIQ, L.liquidacionesCsv(d.filas)), nombre: `tolatino-liquidaciones-eventos-${new Date().toISOString().slice(0, 10)}.csv` };
}

/* 6e · Colas › «Organizadores que cancelan»: bloquear la publicación (evt:retirar; avisa con el motivo y se puede apelar) o cerrar como
   revisado. Decide quien puede decidir colas (colas:aprobar) en sus ciudades. */
export async function evtCasoCancela(caso: string, bloquear: boolean, motivo: string): Promise<ResAdm> {
  const s = await requerir("colas", "aprobar");
  if (bloquear && !s.puede("evt", "retirar")) return no("Tu rol no bloquea organizadores.");
  const m = motivoOk(motivo);
  if (m.length < 4) return no("Escribe el motivo.");
  const q = (await db().query<{ biz: string | null; city: string | null; st: string }>(`select business_id as biz, city_id as city, status as st from queue_items where id = $1::bigint and queue = 'evtcx'`, [String(caso)])).rows[0];
  if (!q || !q.biz || (s.cities.length && (!q.city || !s.cities.includes(q.city)))) return no("Ese caso no existe.");
  if (q.st !== "open") return no("Este caso ya se decidió.");
  if (bloquear) { const r = await organizadorPaso(s, q.biz, "bloquear", m); if (r.err) return no(r.err); }
  await tx(async (c) => {
    await c.query(`update queue_items set status = 'decided', decision = $2, reason = $3, decided_by = $4, decided_at = now() where id = $1::bigint and status = 'open'`, [String(caso), bloquear ? "bloquear" : "revisado", m, s.id]);
    await auditar(c, { actor: s.id, action: bloquear ? "evento.cola_cancela.bloquear" : "evento.cola_cancela.revisado", targetKind: "case", targetId: String(caso), city: q.city, before: { caso: "abierto" }, after: { caso: bloquear ? "organizador bloqueado" : "revisado, sin cambios" }, reason: m });
  });
  listo();
  return { ok: true, mensaje: bloquear ? "Bloqueado. El organizador recibe el motivo y puede apelar." : "Caso cerrado como revisado." };
}
