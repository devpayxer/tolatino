"use server";
/* ADM-TX · Exportar lo filtrado a CSV. Permiso tx:exportar, acotado a las ciudades de quien exporta; queda en la auditoría. */
import { auditar, staff } from "@/lib/admin";
import { filasExportTx, leerFiltrosTx } from "@/lib/admin-tx";
import { csv } from "@/lib/csv";
import { devolverOperacion } from "@/lib/cobros";
import { db, tx } from "@/lib/db";
import type { ResAdm } from "./acciones-colas";
import { rutaAdmin, type RutaAdmin } from "@/lib/ruta";
import { hoyEn } from "../../lib/fecha-local";

export async function exportarTx(filtros: Record<string, string>): Promise<ResAdm & { archivo?: string; nombre?: string }> {
  const s = await staff();
  if (!s || !s.puede("tx", "exportar")) return { ok: false, mensaje: "Tu rol no exporta datos." };
  const f = leerFiltrosTx(filtros && typeof filtros === "object" ? filtros : {});
  const filas = await filasExportTx(s, f);
  await tx((c) => auditar(c, { actor: s.id, action: "transacciones.exportar", targetKind: "report", targetId: "tx", after: { reporte: "Transacciones", filas: filas.length, formato: "CSV" }, reason: "Exportar desde Transacciones" }));
  return { ok: true, mensaje: "Descargado. Quedó en la auditoría.", archivo: csv(["#", "Fecha", "Tipo", "Negocio", "Cliente", "Total", "Estado"], filas), nombre: `tolatino-transacciones-${hoyEn()}.csv` };
}

/* ADM-TX · Devolver dinero de un pedido pagado con tarjeta (total o parcial). Permiso tx:aprobar, en tus ciudades; el
   motivo lo ve el cliente y queda en la auditoría. La comisión de To'Latino baja en proporción. */
export async function devolverTx(numero: string, monto: string, motivo: string, clave: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("tx", "aprobar")) return { ok: false, mensaje: "Tu rol no devuelve dinero." };
  if (!/^([CFVNIT]-|EP-|PL-)?\d{1,12}$/.test(String(numero ?? "")) || !/^[0-9a-f-]{36}$/.test(String(clave ?? ""))) return { ok: false, mensaje: "Ese pedido no existe." };
  const cents = Math.round((parseFloat(String(monto ?? "").replace(/[^0-9.]/g, "")) || 0) * 100);
  // 9k · La operación (de tus ciudades) y los cobros que se devuelven desde aquí según su tipo: el pedido y el viaje (el cobro completo), los depósitos
  // (en una cita, también el estimado, «algo más» y la visita: L448), los planes (un cobro por período) y las rentas (la renta; el depósito de seguridad
  // lo decide su flujo): L455. La devolución se reparte entre los cobros (devolverOperacion), una vez por llave.
  const o = (await db().query<{ id: string; kind: string; city: string | null }>(
    `select o.id::text, o.kind, o.city_id as city from operations o where o.number = $1 and o.kind in ('order', 'trip', 'appointment', 'party', 'night', 'enrollment', 'private_event', 'plan', 'rental')
        and (cardinality($2::text[]) = 0 or o.city_id = any($2::text[]))`, [String(numero), s.cities])).rows[0];
  const KINDS: Record<string, string[]> = { order: ["full"], trip: ["full"], appointment: ["deposit", "estimate", "extra", "visit"], party: ["deposit"], night: ["deposit"], enrollment: ["deposit"], private_event: ["deposit"], plan: ["plan"], rental: ["rental"] };
  const hay = o ? (await db().query(`select 1 from payments where operation_id = $1::bigint and kind = any($2::text[]) and status in ('captured', 'partially_refunded')`, [o.id, KINDS[o.kind] ?? []])).rowCount : 0;
  if (!o || !hay) return { ok: false, mensaje: "Ese pedido no se pagó con tarjeta (o no es de tus ciudades)." };
  const r = await devolverOperacion({ opId: o.id, centavos: cents, kinds: KINDS[o.kind]!, por: "admin", actorId: s.id, motivo: String(motivo ?? "").trim(), idem: `adm-${clave}` });
  if (!r.ok) return { ok: false, mensaje: r.msg.es };
  const p = { id: o.id, city: o.city };
  await tx((c) => auditar(c, { actor: s.id, action: "transacciones.devolver", targetKind: "operation", targetId: p.id, city: p.city, after: { [String(numero).startsWith("EP-") ? "evento_privado" : o.kind === "plan" ? "plan" : o.kind === "rental" ? "renta" : ({ C: "cita", F: "fiesta", V: "viaje", N: "noche", I: "inscripcion" } as Record<string, string>)[String(numero)[0]!] ?? "pedido"]: /^([A-Z]+)-/.test(String(numero)) ? String(numero) : `#${numero}`, monto: `$${(cents / 100).toFixed(2)}`, cobros: String(r.partes) }, reason: String(motivo ?? "").trim() }));
  return { ok: true, mensaje: `Devueltos $${(cents / 100).toFixed(2)}. El cliente ya lo sabe.` };
}

/* Sandbox: simular una disputa del banco sobre un cobro, y el resultado del banco después de responder (2r). Solo con el
   simulador de pagos (en producción las disputas llegan de Stripe). */
export async function disputaSimular(pago: string, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("tx", "aprobar")) return { ok: false, mensaje: "Tu rol no toca dinero." };
  const r = await (await import("@/lib/disputas")).simularDisputa(String(pago ?? "").replace(/\D/g, "") || "0", String(motivo ?? ""));
  return r.ok ? { ok: true, mensaje: "Disputa simulada: está en Colas › Disputas con el banco." } : { ok: false, mensaje: r.msg };
}
export async function disputaSimularResultado(pago: string, gana: boolean): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("tx", "aprobar")) return { ok: false, mensaje: "Tu rol no toca dinero." };
  const r = await (await import("@/lib/disputas")).simularResultado(String(pago ?? "").replace(/\D/g, "") || "0", !!gana);
  return r.ok ? { ok: true, mensaje: gana ? "El banco dio la razón: el dinero se queda." : "El banco dio la razón al cliente." } : { ok: false, mensaje: r.msg };
}

/* 8e · Transacciones › entrega › «Ver recorrido»: la ruta del repartidor (mientras no se purgue). Permiso tx:ver, en tus ciudades, con motivo que
   queda en la auditoría ANTES de ver nada (lib/ruta.ts › rutaAdmin). */
export async function verRutaTx(numero: string, motivo: string): Promise<ResAdm & { ruta?: RutaAdmin }> {
  const s = await staff();
  if (!s || !s.puede("tx", "ver")) return { ok: false, mensaje: "Tu rol no ve transacciones." };
  const r = await rutaAdmin(s, String(numero ?? ""), String(motivo ?? ""));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  return { ok: true, mensaje: "Recorrido abierto. Quedó en la auditoría con tu motivo.", ruta: r.r };
}
