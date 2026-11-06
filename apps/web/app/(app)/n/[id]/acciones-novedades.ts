"use server";
import { dispositivo, mismoOrigen, yo } from "@/lib/cuenta";
import { comentarPost, guardarPost, likeComentario, seguirNegocio, verNovedades, votarEncuesta, votarPost } from "@/lib/novedades";

/* Novedades desde la ficha (votos, encuesta, guardar, comentar, Útil de un comentario, seguir). Todo pide sesión; una
   cuenta silenciada no comenta. Las vistas cuentan una por persona o dispositivo y día. */
type Bi = { es: string; en: string };
type R = { ok: true; fol?: boolean } | { ok: false; msg: Bi; entrar?: true };
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NO_ORIGEN: Bi = { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." };
const ENTRA: Bi = { es: "Entra para seguir.", en: "Sign in to continue." };
async function quien() {
  if (!(await mismoOrigen())) return { e: { ok: false as const, msg: NO_ORIGEN } };
  const u = await yo();
  return u ? { u } : { e: { ok: false as const, entrar: true as const, msg: ENTRA } };
}
export async function novVoto(id: string, v: number): Promise<R> { const q = await quien(); return q.e ?? votarPost(q.u.id, String(id ?? ""), Number(v)); }
export async function novEncuesta(id: string, opt: number): Promise<R> { const q = await quien(); return q.e ?? votarEncuesta(q.u.id, String(id ?? ""), Number(opt)); }
export async function novGuardar(id: string): Promise<R> { const q = await quien(); return q.e ?? guardarPost(q.u.id, String(id ?? "")); }
export async function novLikeComentario(id: string): Promise<R> { const q = await quien(); return q.e ?? likeComentario(q.u.id, String(id ?? "")); }
export async function novComentar(id: string, texto: string): Promise<R> {
  const q = await quien();
  if (q.e) return q.e;
  if (q.u.estado !== "active") return { ok: false, msg: { es: "Tu cuenta no puede publicar por ahora.", en: "Your account cannot post right now." } };
  return comentarPost(q.u.id, String(id ?? ""), String(texto ?? ""));
}
export async function seguir(negocio: string): Promise<R> {
  const q = await quien();
  if (q.e) return q.e;
  if (typeof negocio !== "string" || !ID.test(negocio)) return { ok: false, msg: { es: "Ese negocio no existe.", en: "That business does not exist." } };
  return seguirNegocio(q.u.id, negocio);
}
// solo lectura (cuenta vistas, sin datos personales)
export async function novVista(negocio: string) {
  if (typeof negocio !== "string" || !ID.test(negocio) || !(await mismoOrigen())) return;
  const u = await yo(), d = u ? null : await dispositivo(false);
  const viewer = u ? `u:${u.id}` : d ? `d:${d}` : null;
  if (viewer) await verNovedades(negocio, viewer);
}
