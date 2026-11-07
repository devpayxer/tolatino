"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { apartadoCliente } from "@/lib/apartados";
import { pagarCuota } from "@/lib/layaway";

/* La persona sobre su apartado: cancelar, quitar lo que falta y seguir con lo demás, o aceptar la otra talla que le ofrecen. */
type Bi = { es: string; en: string };
export async function apartadoAccion(numero: string, que: "cancelar" | "quitar" | "otraTalla"): Promise<{ ok: true } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  if (que !== "cancelar" && que !== "quitar" && que !== "otraTalla") return { ok: false, msg: { es: "Esa acción no existe.", en: "That action does not exist." } };
  const r = await apartadoCliente(u.id, String(numero ?? ""), { que });
  return r.ok ? { ok: true } : { ok: false, msg: r.msg };
}

/* Layaway: pagar el pago que sigue del plan con la tarjeta elegida (la persona está en la app; se cobra en el acto). */
export async function pagarPlan(numero: string, pm: string): Promise<{ ok: true; monto: number; listo: boolean } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  return pagarCuota(u.id, String(numero ?? ""), String(pm ?? ""));
}
