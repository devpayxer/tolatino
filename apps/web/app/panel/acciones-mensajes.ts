"use server";
/* Mensajes desde el panel (Panel v2 · sec «msg»). Pide acceso a Mensajes (msg) o ser dueño. Contestar, compartir el
   teléfono de la página, quién lo lleva (Pro), bloquear y la respuesta automática fuera de horario. Bloquear y la
   respuesta automática quedan en la auditoría del negocio. */
import { mismoOrigen } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { asignarHilo, autoRespuesta, bloquearHilo, compartirTelefono, enviarNegocio, nuevosNegocio, reportarChat, type Msj, type ResM } from "@/lib/mensajes";
import { accesoPanel, type Acceso } from "@/lib/panel";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a Mensajes.", "You don’t have access to Messages.");
async function entrar(id: unknown): Promise<Acceso | null> {
  if (!(await mismoOrigen())) return null;
  return typeof id === "string" ? accesoPanel(id, "msg") : null;
}
const res = (r: ResM): Res => (r.ok ? { ok: true } : { ok: false, mensaje: r.msg });
async function auditar(a: Acceso, action: string, after: unknown) {
  await db().query(
    `insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, null, $5::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(after ?? null)]);
}

export async function mensajeResponder(id: string, hilo: string, texto: string): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  return res(await enviarNegocio(a.negocio.id, a.negocio.name, a.yo.id, String(hilo ?? ""), texto));
}
export async function mensajesNuevosNeg(id: string, hilo: string, desde: string): Promise<Msj[]> {
  const a = await entrar(id);
  if (!a) return [];
  return nuevosNegocio(a.negocio.id, String(hilo ?? ""), String(desde ?? "0"));
}
export async function mensajeTelefono(id: string, hilo: string): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  return res(await compartirTelefono(a.negocio.id, a.yo.id, String(hilo ?? "")));
}
export async function mensajeAsignar(id: string, hilo: string, quien: string | null): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const pro = (await db().query<{ p: string }>(`select coalesce(plan, 'free') as p from business_stats_cache where business_id = $1`, [a.negocio.id])).rows[0]?.p === "pro";
  if (!pro) return no("Repartir conversaciones es de Pro.", "Assigning conversations is a Pro feature.");
  return res(await asignarHilo(a.negocio.id, String(hilo ?? ""), quien && /^[0-9a-f-]{36}$/.test(quien) ? quien : null));
}
export async function mensajeBloquear(id: string, hilo: string, bloquear: boolean): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const r = await bloquearHilo(a.negocio.id, a.yo.id, String(hilo ?? ""), !!bloquear);
  if (r.ok) await auditar(a, bloquear ? "mensajes.bloquear" : "mensajes.desbloquear", { hilo: String(hilo) });
  return res(r);
}
export async function mensajeAuto(id: string, on: boolean): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const r = await autoRespuesta(a.negocio.id, !!on);
  if (r.ok) await auditar(a, "mensajes.auto", { on: !!on });
  return res(r);
}
export async function mensajeReportarNeg(id: string, hilo: string, motivo: string): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  return res(await reportarChat(a.yo.id, String(hilo ?? ""), "business", a.negocio.id, String(motivo ?? ""), ""));
}
