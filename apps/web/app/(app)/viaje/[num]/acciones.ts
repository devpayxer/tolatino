"use server";
/* El viaje del cliente: cancelar (con la regla de 24 h), aceptar la otra salida o «No me sirve». El servidor decide. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { headers } from "next/headers";
import { aceptarPrecio, rechazarPrecio } from "@/lib/envios";
import { viajeCliente } from "@/lib/viajes";

export async function viajeAccion(numero: string, que: "cancelar" | "aceptar" | "nogracias") {
  if (!(await mismoOrigen())) return { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  if (!["cancelar", "aceptar", "nogracias"].includes(String(que))) return { ok: false as const, msg: { es: "No se pudo.", en: "Could not do it." } };
  return viajeCliente(u.id, String(numero ?? ""), que);
}

/* La mudanza: aceptar el precio cerrado (versión exacta, con la tarjeta: se retiene y se cobra) o «No, gracias». */
export async function precioAccion(numero: string, que: "aceptar" | "no", version: number, pm: string | null, clave: string) {
  if (!(await mismoOrigen())) return { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  if (que === "no") return rechazarPrecio(u.id, String(numero ?? ""));
  if (que !== "aceptar") return { ok: false as const, msg: { es: "No se pudo.", en: "Could not do it." } };
  const h = await headers(), ip = (h.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || h.get("x-real-ip");
  return aceptarPrecio(u.id, String(numero ?? ""), Number(version), pm == null ? null : String(pm), ip, String(clave ?? ""));
}
