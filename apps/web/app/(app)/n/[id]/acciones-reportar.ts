"use server";
/* 9m · Reportar una novedad o una vacante desde su página (L299, L309). Con cuenta; el servidor decide (lib/reportar-contenido.ts). */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { reportarContenido, type ResRep } from "@/lib/reportar-contenido";

export async function contenidoReportar(kind: "post" | "job", id: string, motivo: string, nota: string): Promise<ResRep> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo.", en: "Could not." } };
  const u = await yo();
  if (!u?.first_name) return { ok: false, msg: { es: "Entra para reportar.", en: "Sign in to report." } };
  if (kind !== "post" && kind !== "job") return { ok: false, msg: { es: "No se pudo.", en: "Could not." } };
  return reportarContenido(u.id, kind, String(id ?? ""), String(motivo ?? ""), String(nota ?? ""));
}
