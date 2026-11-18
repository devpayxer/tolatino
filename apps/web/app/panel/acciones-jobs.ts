"use server";
import { mismoOrigen } from "@/lib/cuenta";
import type { PoolClient } from "pg";
import { avisarSolicitud, guardarVacante, moduloJobs, pasoVacante, responderSolicitud, verSolicitud, type PasoVac, type VacIn } from "@/lib/jobs";
import { accesoPanel, type Acceso } from "@/lib/panel";
import type { Res } from "./acciones";

/* Jobs desde el panel (Lo que vendes › Jobs). Pide acceso a «Lo que vendes»; cada cambio queda en la auditoría. Las
   solicitudes traen datos personales (nombre y teléfono): solo las mueve quien tiene ese acceso. */
const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
async function entrar(id: unknown): Promise<Acceso | null> {
  if (!(await mismoOrigen())) return null;
  return typeof id === "string" ? accesoPanel(id, "cat") : null;
}
/* 9n · La auditoría va con el cliente de la transacción del cambio: entran juntos o ninguno (guardián auditoriaEnLaTransaccion). */
async function auditar(c: PoolClient, a: Acceso, action: string, after: unknown) {
  await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, null, $5::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(after ?? null)]);
}
const PASOS = new Set<PasoVac>(["pausar", "publicar", "cubrir", "quitar"]);
const RESP = new Set(["contact", "interview", "not_selected"]);

export async function vacGuardarP(id: string, p: VacIn): Promise<Res & { vid?: string }> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const r = await guardarVacante(a.negocio.id, p && typeof p === "object" ? p : ({} as VacIn), a.yo.id,
    (c, g) => auditar(c, a, p?.id ? "vacante.editar" : "vacante.publicar", { vacante: g.id, puesto: String(p?.t0 ?? "").slice(0, 50), publicada: p?.pub !== false }));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  return { ok: true, vid: r.id };
}
export async function vacPaso(id: string, vid: string, paso: PasoVac): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  if (!PASOS.has(paso)) return no("Esa acción no existe.", "That action does not exist.");
  const r = await pasoVacante(a.negocio.id, String(vid ?? ""), paso, (c) => auditar(c, a, `vacante.${paso}`, { vacante: String(vid) }));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  return { ok: true };
}
export async function vacVista(id: string, appId: string): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  await verSolicitud(a.negocio.id, String(appId ?? ""));
  return { ok: true };
}
export async function vacResponder(id: string, appId: string, paso: "contact" | "interview" | "not_selected", iv?: { d: number; h: number } | null): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  if (!RESP.has(paso)) return no("Esa acción no existe.", "That action does not exist.");
  const r = await responderSolicitud(a.negocio.id, String(appId ?? ""), paso, iv && typeof iv === "object" ? { d: Number(iv.d), h: Number(iv.h) } : null,
    (c) => auditar(c, a, `solicitud.${paso}`, { solicitud: String(appId), ...(paso === "interview" && iv ? { dia: Number(iv.d), hora: Number(iv.h) } : {}) }));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await avisarSolicitud(String(appId), paso);
  return { ok: true };
}
export async function vacModulo(id: string, on: boolean): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  await moduloJobs(a.negocio.id, !!on, (c) => auditar(c, a, on ? "jobs.encender" : "jobs.apagar", null));
  return { ok: true };
}
