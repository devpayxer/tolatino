"use server";
import { mismoOrigen } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { accesoPanel, type Acceso } from "@/lib/panel";
import { ajustarFinal, mandarEstimado, pedirExtra, plantillas, type Plantilla } from "@/lib/estimados";
import type { Res } from "./acciones";

/* Estimado línea por línea (4d) desde el detalle de la cita: mandar el estimado (o una versión nueva), preguntar «algo
   más» con foto y bajar lo final. Pide «Hoy y pedidos» (ord). Todo queda en la auditoría. */
const SIN_ACCESO: Res = { ok: false, mensaje: { es: "No tienes acceso a esta parte del panel.", en: "You don’t have access to this part of the dashboard." } };
async function auditar(a: Acceso, action: string, after: unknown) {
  await db().query(
    `insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, null, $5::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(after ?? null)]);
}

export async function estimadoMandar(id: string, numero: string, lineas: unknown): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof id === "string" ? await accesoPanel(id, "ord") : null;
  if (!a) return SIN_ACCESO;
  const r = await mandarEstimado(a.negocio.id, String(numero ?? ""), a.yo.id, lineas);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "cita.estimado", { cita: numero, lineas: Array.isArray(lineas) ? lineas.length : 0 });
  return { ok: true };
}

export async function extraPedir(id: string, numero: string, linea: unknown): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof id === "string" ? await accesoPanel(id, "ord") : null;
  if (!a) return SIN_ACCESO;
  const r = await pedirExtra(a.negocio.id, String(numero ?? ""), a.yo.id, linea);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "cita.algo_mas", { cita: numero, que: String((linea as { t?: string } | null)?.t ?? "").slice(0, 90) });
  return { ok: true };
}

export async function finalAjustar(id: string, numero: string, finales: unknown): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof id === "string" ? await accesoPanel(id, "ord") : null;
  if (!a) return SIN_ACCESO;
  const r = await ajustarFinal(a.negocio.id, String(numero ?? ""), a.yo.id, finales);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "cita.lo_final", { cita: numero });
  return { ok: true };
}

// solo lectura
export async function plantillasEstimado(id: string): Promise<Plantilla[]> {
  const a = typeof id === "string" ? await accesoPanel(id, "ord") : null;
  if (!a) return [];
  return plantillas(a.negocio.category_id);
}
