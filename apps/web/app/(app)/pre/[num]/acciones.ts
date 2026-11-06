"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { solicitudCliente } from "@/lib/solicitudes";

/* La persona sobre su solicitud: ya no la necesita, o mandarla otra vez si venció. */
type Bi = { es: string; en: string };
export async function solicitudAccion(numero: string, que: "cancelar" | "reenviar"): Promise<{ ok: true } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  if (que !== "cancelar" && que !== "reenviar") return { ok: false, msg: { es: "Esa acción no existe.", en: "That action does not exist." } };
  return solicitudCliente(u.id, String(numero ?? ""), que);
}
