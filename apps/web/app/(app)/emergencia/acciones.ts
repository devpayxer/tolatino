"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { pedirEm, type EmIn } from "@/lib/solicitudes";

/* Pedir ayuda de emergencia: a todos los Pro 24/7 que hacen ese trabajo y llegan a tu casa. Hoy no se cobra nada. */
type Bi = { es: string; en: string };
export async function pedirEmergencia(f: EmIn): Promise<{ ok: true; numero: string } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  return pedirEm(u.id, f);
}
