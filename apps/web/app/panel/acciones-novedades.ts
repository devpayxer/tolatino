"use server";
import { mismoOrigen } from "@/lib/cuenta";
import type { PoolClient } from "pg";
import { avisarSeguidores, guardarNovedad, moduloNovedades, pasoNovedad, responderComentario, type NovIn, type PasoNov } from "@/lib/novedades";
import { accesoPanel, type Acceso } from "@/lib/panel";
import type { Res } from "./acciones";

/* Novedades desde el panel (Tu página › Novedades). Pide acceso a «Tu página»; cada cambio queda en la auditoría. */
const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
async function entrar(id: unknown): Promise<Acceso | null> {
  if (!(await mismoOrigen())) return null;
  return typeof id === "string" ? accesoPanel(id, "page") : null;
}
/* 9n · La auditoría va con el cliente de la transacción del cambio: entran juntos o ninguno (guardián auditoriaEnLaTransaccion). */
async function auditar(c: PoolClient, a: Acceso, action: string, after: unknown) {
  await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, null, $5::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(after ?? null)]);
}
const PASOS = new Set<PasoNov>(["detener", "ya", "otravez", "fijar", "desfijar", "quitar"]);

export async function novGuardar(id: string, p: NovIn): Promise<Res & { nid?: string; avisados?: number }> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const r = await guardarNovedad(a.negocio.id, p && typeof p === "object" ? p : ({} as NovIn), a.yo.id,
    (c, g) => auditar(c, a, p?.id ? "novedad.editar" : "novedad.publicar", { novedad: g.id, tipo: String(p?.kind ?? ""), titulo: String(p?.title ?? "").slice(0, 60) }));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  // 9n-2 · «Avisar a tus seguidores» (L297): una vez por novedad, solo si ya está en vivo, con tope por día; el servidor decide si sale.
  let avisados = 0;
  if (p?.avisar === true) { const v = await avisarSeguidores(a.negocio.id, r.id, a.yo.id, (c, x) => auditar(c, a, "novedad.avisar_seguidores", { novedad: r.id, n: x.L.length })); if (v.ok) avisados = v.n; }
  return { ok: true, nid: r.id, avisados };
}
/* 9n-2 · «Avisar a tus seguidores» desde el detalle de una novedad en vivo (una vez por novedad; hasta 2 al día). */
export async function novAvisar(id: string, nid: string): Promise<Res & { avisados?: number }> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const v = await avisarSeguidores(a.negocio.id, String(nid ?? ""), a.yo.id, (c, x) => auditar(c, a, "novedad.avisar_seguidores", { novedad: String(nid), n: x.L.length }));
  if (!v.ok) return { ok: false, mensaje: v.msg };
  return { ok: true, avisados: v.n };
}
export async function novPaso(id: string, nid: string, paso: PasoNov): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  if (!PASOS.has(paso)) return no("Esa acción no existe.", "That action does not exist.");
  const r = await pasoNovedad(a.negocio.id, String(nid ?? ""), paso, (c) => auditar(c, a, `novedad.${paso}`, { novedad: String(nid) }));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  return { ok: true };
}
export async function novResponder(id: string, comentario: string, texto: string): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const r = await responderComentario(a.negocio.id, String(comentario ?? ""), String(texto ?? ""), a.yo.id,
    (c) => auditar(c, a, "novedad.responder", { comentario: String(comentario), respuesta: String(texto).trim().slice(0, 280) }));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  return { ok: true };
}
export async function novModulo(id: string, on: boolean): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  await moduloNovedades(a.negocio.id, !!on, (c) => auditar(c, a, on ? "novedades.encender" : "novedades.apagar", null));
  return { ok: true };
}
