"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { planCliente } from "@/lib/planes";

/* La persona sobre su plan: saltar la próxima, pausar un mes, reanudar, cancelar o cambiar la tarjeta. */
type Bi = { es: string; en: string };
const QUE = new Set(["saltar", "pausar", "reanudar", "cancelar", "tarjeta"]);
export async function planAccion(numero: string, que: "saltar" | "pausar" | "reanudar" | "cancelar" | "tarjeta", pm?: string): Promise<{ ok: true } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  if (!QUE.has(que)) return { ok: false, msg: { es: "Esa acción no existe.", en: "That action does not exist." } };
  const r = await planCliente(u.id, String(numero ?? ""), que, typeof pm === "string" ? pm : undefined);
  return r.ok ? { ok: true } : { ok: false, msg: r.msg };
}
