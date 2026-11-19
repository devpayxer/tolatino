"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { guardarPlato } from "@/lib/platos-guardados";

/* 9t · Platos guardados: el corazón de la hoja del plato (y «Quitar» en Mi cuenta › Guardados). Pide sesión (sin sesión, la hoja manda a /entrar
   y vuelve al plato); el servidor decide si el plato sale hoy en su página (lib/platos-guardados.ts) y si se guarda o se quita. */
type Bi = { es: string; en: string };
type R = { ok: true; guardado: boolean } | { ok: false; msg: Bi; entrar?: true };
const NO_ORIGEN: Bi = { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." };
const ENTRA: Bi = { es: "Entra para seguir.", en: "Sign in to continue." };
async function quien() {
  if (!(await mismoOrigen())) return { e: { ok: false as const, msg: NO_ORIGEN } };
  const u = await yo();
  return u ? { u } : { e: { ok: false as const, entrar: true as const, msg: ENTRA } };
}
export async function platoGuardar(item: string): Promise<R> { const q = await quien(); return q.e ?? guardarPlato(q.u.id, String(item ?? "")); }
