"use server";
import { mismoOrigen } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { accesoPanel } from "@/lib/panel";
import { aceptarEm, responderSolicitud, type RespIn } from "@/lib/solicitudes";
import type { Res } from "./acciones";

/* Pre-estimados y presupuestos (4e) desde el panel: mandar un rango, «hay que verlo» o «no lo hacemos». Pide «Hoy y
   pedidos» (ord). Queda en la auditoría. */
export async function solicitudResponder(id: string, numero: string, f: RespIn): Promise<Res> {
  if (!(await mismoOrigen())) return { ok: false, mensaje: { es: "No tienes acceso a esta parte del panel.", en: "You don’t have access to this part of the dashboard." } };
  const a = typeof id === "string" ? await accesoPanel(id, "ord") : null;
  if (!a) return { ok: false, mensaje: { es: "No tienes acceso a esta parte del panel.", en: "You don’t have access to this part of the dashboard." } };
  const r = await responderSolicitud(a.negocio.id, String(numero ?? ""), a.yo.id, f);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await db().query(
    `insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, 'solicitud.responder', 'business', $2, $3, null, $4::jsonb)`,
    [a.yo.id, a.negocio.id, a.negocio.city_id, JSON.stringify({ solicitud: numero, respuesta: { rng: "Rango", see: "Hay que verlo", no: "No lo hace" }[String(f?.que)] ?? f?.que, desde: f?.lo ?? null, hasta: f?.hi ?? null })]);
  return { ok: true };
}

/* Emergencia 24/7: el primero que acepta la toma; se crea la visita «va en camino». */
export async function emergenciaAceptar(id: string, numero: string): Promise<Res & { cita?: string }> {
  if (!(await mismoOrigen())) return { ok: false, mensaje: { es: "No tienes acceso a esta parte del panel.", en: "You don’t have access to this part of the dashboard." } };
  const a = typeof id === "string" ? await accesoPanel(id, "ord") : null;
  if (!a) return { ok: false, mensaje: { es: "No tienes acceso a esta parte del panel.", en: "You don’t have access to this part of the dashboard." } };
  const r = await aceptarEm(a.negocio.id, String(numero ?? ""), a.yo.id, process.env.TOLATINO_ENTORNO ?? "pruebas");
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await db().query(
    `insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, 'emergencia.aceptar', 'business', $2, $3, null, $4::jsonb)`,
    [a.yo.id, a.negocio.id, a.negocio.city_id, JSON.stringify({ emergencia: numero, cita: r.cita })]);
  return { ok: true, cita: r.cita };
}
