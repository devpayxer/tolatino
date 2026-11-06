"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { guardarResena, listaResenas, marcarUtil, quitarResena, reportarResena, type ResenaIn } from "@/lib/resenas";

/* Reseñas desde la ficha. Leer no pide cuenta; Útil, Reportar, publicar y quitar sí (y que la persona pueda publicar:
   una cuenta silenciada no publica). El servidor decide verificada, el dato del pedido y quién ve la respuesta. */
type Bi = { es: string; en: string };
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NO_ORIGEN: Bi = { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." };
const ENTRA: Bi = { es: "Entra para seguir.", en: "Sign in to continue." };
const CALLADO: Bi = { es: "Tu cuenta no puede publicar por ahora.", en: "Your account cannot post right now." };

// solo lectura
export async function masResenas(negocio: string, q: { f?: string; star?: number; sort?: string; cursor?: string | null }) {
  if (typeof negocio !== "string" || !ID.test(negocio)) return { cards: [], n: 0, cursor: null };
  const u = await yo();
  return listaResenas(negocio, u?.id ?? null, q && typeof q === "object" ? q : {});
}

export async function utilResena(id: string): Promise<{ ok: true; on: boolean; n: number } | { ok: false; msg: Bi; entrar?: true }> {
  if (!(await mismoOrigen())) return { ok: false, msg: NO_ORIGEN };
  const u = await yo();
  if (!u) return { ok: false, entrar: true, msg: ENTRA };
  return marcarUtil(u.id, String(id ?? ""));
}

export async function reportarRes(id: string, motivo: string, nota: string): Promise<{ ok: true } | { ok: false; msg: Bi; entrar?: true }> {
  if (!(await mismoOrigen())) return { ok: false, msg: NO_ORIGEN };
  const u = await yo();
  if (!u) return { ok: false, entrar: true, msg: ENTRA };
  const r = await reportarResena(u.id, String(id ?? ""), String(motivo ?? ""), String(nota ?? ""));
  return r.ok ? { ok: true } : r;
}

export async function publicarResena(p: ResenaIn): Promise<{ ok: true } | { ok: false; msg: Bi; entrar?: true }> {
  if (!(await mismoOrigen())) return { ok: false, msg: NO_ORIGEN };
  const u = await yo();
  if (!u?.first_name) return { ok: false, entrar: true, msg: ENTRA };
  if (u.estado !== "active") return { ok: false, msg: CALLADO };
  if (!p || typeof p !== "object" || typeof p.negocio !== "string" || !ID.test(p.negocio)) return { ok: false, msg: { es: "Ese negocio no existe.", en: "That business does not exist." } };
  const r = await guardarResena(u.id, { ...p, lang: u.lang });
  return r.ok ? { ok: true } : r;
}

export async function quitarMiResena(negocio: string): Promise<{ ok: true } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return { ok: false, msg: NO_ORIGEN };
  const u = await yo();
  if (!u) return { ok: false, msg: ENTRA };
  if (typeof negocio !== "string" || !ID.test(negocio)) return { ok: false, msg: { es: "Ese negocio no existe.", en: "That business does not exist." } };
  const r = await quitarResena(u.id, negocio);
  return r.ok ? { ok: true } : r;
}
