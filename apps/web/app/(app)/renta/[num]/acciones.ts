"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { rentaCliente, type QueCliente } from "@/lib/rentas";

/* La persona sobre su renta: ya no la necesita, un día más, cambiar la tarjeta, o decidir sobre un daño. */
type Bi = { es: string; en: string };
const QUE = new Set<QueCliente>(["cancelar", "dia", "tarjeta", "dano_ok", "dano_no"]);
export async function rentaAccion(numero: string, que: QueCliente, pm?: string): Promise<{ ok: true } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  if (!QUE.has(que)) return { ok: false, msg: { es: "Esa acción no existe.", en: "That action does not exist." } };
  const r = await rentaCliente(u.id, String(numero ?? ""), que, typeof pm === "string" ? pm : undefined);
  return r.ok ? { ok: true } : { ok: false, msg: r.msg };
}
