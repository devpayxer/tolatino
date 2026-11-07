"use server";
/* El viaje del cliente: cancelar (con la regla de 24 h), aceptar la otra salida o «No me sirve». El servidor decide. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { viajeCliente } from "@/lib/viajes";

export async function viajeAccion(numero: string, que: "cancelar" | "aceptar" | "nogracias") {
  if (!(await mismoOrigen())) return { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  if (!["cancelar", "aceptar", "nogracias"].includes(String(que))) return { ok: false as const, msg: { es: "No se pudo.", en: "Could not do it." } };
  return viajeCliente(u.id, String(numero ?? ""), que);
}
