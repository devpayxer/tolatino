"use server";
/* Comunidad · acciones del vecino (muro, publicar, la publicación). Todo pide sesión y que la llamada venga de nuestra página;
   las reglas las decide lib/comunidad.ts (filtro, sanciones, límites, negocio propio, rango). */
import { dispositivo, mismoOrigen, yo } from "@/lib/cuenta";
import { borrar, deshacerBorrar, editar, guardar, muro, negociosParaRecomendar, publicar, votar, votarEncuesta, type Entrada } from "@/lib/comunidad";
import type { Filtros } from "@/lib/comunidad-comun";
import { ubicacion } from "@/lib/ubicacion";

type Bi = { es: string; en: string };
const NO_ORIGEN: Bi = { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." };
const ENTRA: Bi = { es: "Entra para seguir.", en: "Sign in to continue." };
async function quien() {
  if (!(await mismoOrigen())) return { e: { ok: false as const, msg: NO_ORIGEN } };
  const u = await yo();
  return u ? { u } : { e: { ok: false as const, entrar: true as const, msg: ENTRA } };
}
const texto = (x: unknown, n: number) => String(x ?? "").slice(0, n);
const lista = (x: unknown, n: number, largo: number) => (Array.isArray(x) ? x.slice(0, n + 1).map((y) => texto(y, largo + 1)) : []);
function entrada(p: Partial<Entrada>): Entrada {
  return {
    kind: texto(p?.kind, 20) as Entrada["kind"], body: texto(p?.body, 1001), topic: p?.topic ? texto(p.topic, 20) : null, business: p?.business ? texto(p.business, 80) : null,
    para: lista(p?.para, 3, 40), opts: lista(p?.opts, 4, 60), dias: Number(p?.dias) || 0, fotos: lista(p?.fotos, 4, 36), noEsMio: p?.noEsMio === true,
  };
}

export async function comPublicar(p: Partial<Entrada>) {
  const q = await quien();
  if (q.e) return q.e;
  const loc = await ubicacion(q.u);
  return publicar(q.u.id, loc.c.id, entrada(p));
}
export async function comEditar(id: string, p: Partial<Entrada>) {
  const q = await quien();
  if (q.e) return q.e;
  const e = entrada({ ...p, kind: "publicacion" });
  return editar(q.u.id, texto(id, 20), { body: e.body, topic: e.topic, para: e.para, fotos: e.fotos });
}
export async function comBorrar(id: string) { const q = await quien(); return q.e ?? borrar(q.u.id, texto(id, 20)); }
export async function comDeshacer(id: string) { const q = await quien(); return q.e ?? deshacerBorrar(q.u.id, texto(id, 20)); }
export async function comVotar(id: string, v: number) {
  const q = await quien();
  if (q.e) return q.e;
  return votar(q.u.id, texto(id, 20), v === 1 ? 1 : -1, await dispositivo(false));
}
export async function comEncuesta(id: string, opt: number) { const q = await quien(); return q.e ?? votarEncuesta(q.u.id, texto(id, 20), Number(opt)); }
export async function comGuardar(id: string) { const q = await quien(); return q.e ?? guardar(q.u.id, texto(id, 20)); }

// solo lectura (con sesión): la página siguiente del muro.
export async function comPagina(f: Filtros, cursor: string) {
  const q = await quien();
  if (q.e) return q.e;
  const loc = await ubicacion(q.u);
  const F: Filtros = { tab: f?.tab === "sig" ? "sig" : "todo", kind: (["pregunta", "recomendacion", "encuesta", "publicacion"] as const).find((k) => k === f?.kind) ?? null,
    dist: ([5, 10, 30] as const).find((d) => d === f?.dist) ?? 0, orden: f?.orden === "new" ? "new" : "top" };
  return { ok: true as const, ...(await muro(q.u.id, loc.c.id, loc, F, texto(cursor, 80))) };
}
// solo lectura (con sesión): negocios de la ciudad para recomendar.
export async function comNegocios(qs: string) {
  const q = await quien();
  if (q.e) return { ok: true as const, items: [] };
  const loc = await ubicacion(q.u);
  return { ok: true as const, items: await negociosParaRecomendar(loc.c.id, texto(qs, 60)) };
}
