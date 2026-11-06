"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { pedirPq, type PqIn } from "@/lib/solicitudes";

/* Pedir presupuesto a hasta 3. El servidor revisa los negocios (que tengan presupuesto y lleguen a tu casa) y las fotos. */
type Bi = { es: string; en: string };
export async function pedirPresupuestos(f: PqIn): Promise<{ ok: true; numero: string } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  return pedirPq(u.id, f);
}
