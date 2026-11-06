"use server";
/* ADM-TX · Exportar lo filtrado a CSV. Permiso tx:exportar, acotado a las ciudades de quien exporta; queda en la auditoría. */
import { auditar, staff } from "@/lib/admin";
import { filasExportTx, leerFiltrosTx } from "@/lib/admin-tx";
import { csv } from "@/lib/csv";
import { tx } from "@/lib/db";
import type { ResAdm } from "./acciones-colas";

export async function exportarTx(filtros: Record<string, string>): Promise<ResAdm & { archivo?: string; nombre?: string }> {
  const s = await staff();
  if (!s || !s.puede("tx", "exportar")) return { ok: false, mensaje: "Tu rol no exporta datos." };
  const f = leerFiltrosTx(filtros && typeof filtros === "object" ? filtros : {});
  const filas = await filasExportTx(s, f);
  await tx((c) => auditar(c, { actor: s.id, action: "transacciones.exportar", targetKind: "report", targetId: "tx", after: { reporte: "Transacciones", filas: filas.length, formato: "CSV" }, reason: "Exportar desde Transacciones" }));
  return { ok: true, mensaje: "Descargado. Quedó en la auditoría.", archivo: csv(["#", "Fecha", "Tipo", "Negocio", "Cliente", "Total", "Estado"], filas), nombre: `tolatino-transacciones-${new Date().toISOString().slice(0, 10)}.csv` };
}
