"use server";
/* Tu noche: salir de la lista / cancelar (con la regla de esa noche), aceptar la otra hora o «No me sirve». El servidor decide. */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { nocheCliente, type QueNoche } from "@/lib/noche-reservas";

export async function nocheAccion(numero: string, que: QueNoche) {
  if (!(await mismoOrigen())) return { ok: false as const, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false as const, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  if (!["cancelar", "aceptar", "nogracias"].includes(String(que))) return { ok: false as const, msg: { es: "No se pudo.", en: "Could not do it." } };
  return nocheCliente(u.id, String(numero ?? ""), que);
}
