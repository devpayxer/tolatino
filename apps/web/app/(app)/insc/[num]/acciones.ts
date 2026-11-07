"use server";
/* Tu inscripción: cancelar (o pedir la baja de una membresía), aceptar el otro grupo o «No me sirve». El servidor decide. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { inscCliente, type QueInsc } from "@/lib/inscripciones";

export async function inscAccion(numero: string, que: QueInsc) {
  if (!(await mismoOrigen())) return { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  if (!["cancelar", "aceptar", "nogracias"].includes(String(que))) return { ok: false as const, msg: { es: "No se pudo.", en: "Could not do it." } };
  return inscCliente(u.id, String(numero ?? ""), que);
}
