"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { citaCliente, type QueCliente } from "@/lib/citas-flujo";

/* El cliente sobre su cita (APP-NEG-CITA): cancelar, aceptar la otra hora o no, avisar que llega tarde. Solo quien la
   pidió; el servidor decide el depósito (devolver, liberar o se queda). */
type Bi = { es: string; en: string };
const QUE = new Set<QueCliente>(["cancelar", "aceptar", "nogracias", "tarde", "recibi"]);
export async function citaAccion(numero: string, que: QueCliente, extra?: number): Promise<{ ok: true } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  if (!QUE.has(que)) return { ok: false, msg: { es: "Esa acción no existe.", en: "That action does not exist." } };
  const r = await citaCliente(u.id, String(numero ?? ""), que, Number(extra));
  return r.ok ? { ok: true } : { ok: false, msg: r.msg };
}
