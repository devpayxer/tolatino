"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { rsvCliente } from "@/lib/reservas";

/* El cliente sobre su reservación (APP-NEG-RESERVA-ESTADO): cancelar, aceptar la hora propuesta o no, avisar que llega
   tarde, «Entendido» a un cambio que no se pudo. Solo quien la hizo. */
type Bi = { es: string; en: string };
export async function reservaAccion(numero: string, que: "cancelar" | "aceptar" | "nogracias" | "tarde" | "chgvisto", extra?: string | number): Promise<{ ok: true } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo.", en: "Could not do it." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  if (!["cancelar", "aceptar", "nogracias", "tarde", "chgvisto"].includes(que)) return { ok: false, msg: { es: "Esa acción no existe.", en: "That action does not exist." } };
  return rsvCliente(u.id, String(numero ?? ""), que, extra);
}
