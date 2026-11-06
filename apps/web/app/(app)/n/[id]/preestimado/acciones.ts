"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { pedirPre, type PreIn } from "@/lib/solicitudes";

/* Pedir un pre-estimado con fotos. El servidor revisa todo (servicio, vehículo o casa, zona, fotos suyas). */
type Bi = { es: string; en: string };
export async function pedirPreEstimado(f: PreIn): Promise<{ ok: true; numero: string } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  return pedirPre(u.id, f);
}
