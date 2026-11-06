"use server";
/* Mi cuenta › Mis seguros: guardar (solo los últimos 4 del número), elegir el principal y quitar (removed_at). */
import { mismoOrigen, yo } from "@/lib/cuenta";
import { guardarSeguro, quitarSeguro, seguroPrincipal, type SeguroIn } from "@/lib/mis-seguros";

type Bi = { es: string; en: string };
const NO: Bi = { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." };

export async function seguroGuardar(x: SeguroIn): Promise<{ ok: true; id: string } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return { ok: false, msg: NO };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para guardar tu seguro.", en: "Sign in to save your insurance." } };
  return guardarSeguro(u.id, x && typeof x === "object" ? x : { kind: "" });
}
export async function seguroUsar(id: string): Promise<{ ok: boolean }> {
  if (!(await mismoOrigen())) return { ok: false };
  const u = await yo();
  return { ok: !!u && (await seguroPrincipal(u.id, String(id ?? ""))) };
}
export async function seguroQuitar(id: string): Promise<{ ok: boolean }> {
  if (!(await mismoOrigen())) return { ok: false };
  const u = await yo();
  return { ok: !!u && (await quitarSeguro(u.id, String(id ?? ""))) };
}
