"use server";
/* La fiesta del cliente: cancelar (con la regla que aplica), aceptar la otra hora o «No me sirve». El servidor decide. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { fiestaCliente, type QueFiesta } from "@/lib/fiestas-reservas";

export async function fiestaAccion(numero: string, que: QueFiesta) {
  if (!(await mismoOrigen())) return { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  if (!["cancelar", "aceptar", "nogracias"].includes(String(que))) return { ok: false as const, msg: { es: "No se pudo.", en: "Could not do it." } };
  return fiestaCliente(u.id, String(numero ?? ""), que);
}
