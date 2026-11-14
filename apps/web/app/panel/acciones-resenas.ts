"use server";
import { mismoOrigen } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { accesoPanel, type Acceso } from "@/lib/panel";
import { editarRespuesta, pedirRevision, responderResena } from "@/lib/resenas";
import type { Res } from "./acciones";

/* Reseñas desde el panel (Panel v2 · Tu página › Reseñas). Pide acceso a «Tu página» (page). El negocio Pro responde una
   vez; cualquiera pide revisión a To'Latino (la reseña sigue visible). Nunca se borra ni se edita una reseña desde aquí. */
const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");

async function entrar(id: unknown): Promise<Acceso | null> {
  if (!(await mismoOrigen())) return null;
  return typeof id === "string" ? accesoPanel(id, "page") : null;
}
async function auditar(a: Acceso, action: string, after: unknown) {
  await db().query(
    `insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, null, $5::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(after ?? null)]);
}

export async function resenaResponder(id: string, resena: string, texto: string, oferta = false): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const r = await responderResena(a.negocio.id, String(resena ?? ""), String(texto ?? ""), a.yo.id, oferta === true);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "resena.responder", { resena: String(resena), respuesta: String(texto).trim().slice(0, 300), propuesta: oferta === true });
  return { ok: true };
}

/* 9n-2 · Editar la respuesta (hasta 3 veces y dentro de 7 días; lo anterior queda en el historial). */
export async function resenaEditarRespuesta(id: string, resena: string, texto: string, oferta = false): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const r = await editarRespuesta(a.negocio.id, String(resena ?? ""), String(texto ?? ""), oferta === true, a.yo.id);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "resena.editar_respuesta", { resena: String(resena), respuesta: String(texto).trim().slice(0, 300), propuesta: oferta === true });
  return { ok: true };
}

export async function resenaRevision(id: string, resena: string): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const r = await pedirRevision(a.negocio.id, String(resena ?? ""), a.yo.id);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "resena.pedir_revision", { resena: String(resena) });
  return { ok: true };
}
