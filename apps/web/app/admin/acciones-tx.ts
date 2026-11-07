"use server";
/* ADM-TX · Exportar lo filtrado a CSV. Permiso tx:exportar, acotado a las ciudades de quien exporta; queda en la auditoría. */
import { auditar, staff } from "@/lib/admin";
import { filasExportTx, leerFiltrosTx } from "@/lib/admin-tx";
import { csv } from "@/lib/csv";
import { devolverPago } from "@/lib/cobros";
import { db, tx } from "@/lib/db";
import type { ResAdm } from "./acciones-colas";

export async function exportarTx(filtros: Record<string, string>): Promise<ResAdm & { archivo?: string; nombre?: string }> {
  const s = await staff();
  if (!s || !s.puede("tx", "exportar")) return { ok: false, mensaje: "Tu rol no exporta datos." };
  const f = leerFiltrosTx(filtros && typeof filtros === "object" ? filtros : {});
  const filas = await filasExportTx(s, f);
  await tx((c) => auditar(c, { actor: s.id, action: "transacciones.exportar", targetKind: "report", targetId: "tx", after: { reporte: "Transacciones", filas: filas.length, formato: "CSV" }, reason: "Exportar desde Transacciones" }));
  return { ok: true, mensaje: "Descargado. Quedó en la auditoría.", archivo: csv(["#", "Fecha", "Tipo", "Negocio", "Cliente", "Total", "Estado"], filas), nombre: `tolatino-transacciones-${new Date().toISOString().slice(0, 10)}.csv` };
}

/* ADM-TX · Devolver dinero de un pedido pagado con tarjeta (total o parcial). Permiso tx:aprobar, en tus ciudades; el
   motivo lo ve el cliente y queda en la auditoría. La comisión de To'Latino baja en proporción. */
export async function devolverTx(numero: string, monto: string, motivo: string, clave: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("tx", "aprobar")) return { ok: false, mensaje: "Tu rol no devuelve dinero." };
  if (!/^([CFV]-)?\d{1,12}$/.test(String(numero ?? "")) || !/^[0-9a-f-]{36}$/.test(String(clave ?? ""))) return { ok: false, mensaje: "Ese pedido no existe." };
  const cents = Math.round((parseFloat(String(monto ?? "").replace(/[^0-9.]/g, "")) || 0) * 100);
  const p = (await db().query<{ id: string; city: string | null }>(
    `select p.id::text, p.city_id as city from payments p join operations o on o.id = p.operation_id where o.number = $1 and ((o.kind in ('order', 'trip') and p.kind = 'full') or (o.kind in ('appointment', 'party') and p.kind = 'deposit'))
        and (cardinality($2::text[]) = 0 or p.city_id = any($2::text[]))`, [String(numero), s.cities])).rows[0];
  if (!p) return { ok: false, mensaje: "Ese pedido no se pagó con tarjeta (o no es de tus ciudades)." };
  const r = await devolverPago({ paymentId: p.id, centavos: cents, por: "admin", actorId: s.id, motivo: String(motivo ?? "").trim(), idem: `adm-${clave}` });
  if (!r.ok) return { ok: false, mensaje: r.msg.es };
  await tx((c) => auditar(c, { actor: s.id, action: "transacciones.devolver", targetKind: "payment", targetId: p.id, city: p.city, after: { [({ C: "cita", F: "fiesta", V: "viaje" } as Record<string, string>)[String(numero)[0]!] ?? "pedido"]: /^[CFV]-/.test(String(numero)) ? String(numero) : `#${numero}`, monto: `$${(cents / 100).toFixed(2)}` }, reason: String(motivo ?? "").trim() }));
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
