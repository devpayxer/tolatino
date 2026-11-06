"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { borrarDireccion, guardarDireccion, predeterminada, type DireccionIn, type ResDir } from "@/lib/direcciones";

/* Mi cuenta › Direcciones: guardar (el servidor la ubica), usar por defecto y borrar (queda como borrada). */
type Bi = { es: string; en: string };
const NO: Bi = { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." };

export async function guardarDir(id: string | null, d: DireccionIn): Promise<ResDir> {
  if (!(await mismoOrigen())) return { ok: false, msg: NO };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para guardar direcciones.", en: "Sign in to save addresses." } };
  return guardarDireccion(u.id, typeof id === "string" ? id : null, d && typeof d === "object" ? d : {});
}

export async function dirPredeterminada(id: string): Promise<{ ok: boolean }> {
  if (!(await mismoOrigen())) return { ok: false };
  const u = await yo();
  return { ok: !!u && (await predeterminada(u.id, String(id ?? ""))) };
}

export async function borrarDir(id: string): Promise<{ ok: boolean }> {
  if (!(await mismoOrigen())) return { ok: false };
  const u = await yo();
  return { ok: !!u && (await borrarDireccion(u.id, String(id ?? ""))) };
}
