"use server";
import { dispositivo, mismoOrigen, normalizarTelefono } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { accesoPanel, type Acceso } from "@/lib/panel";
import { abrirPuerta } from "@/lib/puerta";
import { asignarPortero, avisarInvitacion, cerrarIncidencia, cerrarSesionPanel, desasignarPortero, invitarPortero, quitarPortero, reglasPuerta, revocarTelefono, type ReglasIn } from "@/lib/puerta-equipo";
import type { Res } from "./acciones";

/* 6g · Panel › Eventos › PUERTA (PORTEROS · ESCANEAN EN LA PUERTA, REGLAS DE PUERTA, «Abrir modo puerta» y el Monitor). Todo pide la parte
   «evt» del equipo (el dueño siempre) y filtra por SU negocio; cada cambio queda en la auditoría del panel. Nada aquí toca dinero (D1). */
const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
async function entrar(id: unknown): Promise<Acceso | null> {
  if (!(await mismoOrigen()) || typeof id !== "string") return null;
  return accesoPanel(id, "evt");
}
async function auditar(a: Acceso, action: string, after: unknown, before: unknown = null) {
  await db().query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, $5::jsonb, $6::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(before), JSON.stringify(after ?? null)]);
}

export async function evtPorteroInvitar(negocio: string, nombre: string, tel: string, evento: string | null): Promise<Res & { codigo?: string }> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  const t = normalizarTelefono(String(tel ?? ""));
  if (!t) return no("Escribe su teléfono de 10 números.", "Write their 10-digit phone.");
  const r = await invitarPortero(a.negocio.id, a.yo.id, String(nombre ?? ""), t, evento == null ? null : String(evento));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "puerta.invitar", { nombre: String(nombre ?? "").trim().slice(0, 40), telefono: `··${t.slice(-4)}`, alcance: evento ? `evento ${evento}` : "todos" });
  await avisarInvitacion(a.negocio.id, r.id, t, r.codigo);
  return { ok: true, codigo: r.codigo };
}
export async function evtPorteroQuitar(negocio: string, id: string, motivo: string): Promise<Res> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  const r = await quitarPortero(a.negocio.id, String(id ?? ""), String(motivo ?? ""), a.yo.id);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "puerta.quitar", { portero: String(id), motivo: String(motivo ?? "").trim().slice(0, 200) });
  return { ok: true };
}
export async function evtPorteroAsignar(negocio: string, id: string, evento: string | null): Promise<Res> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  const r = await asignarPortero(a.negocio.id, String(id ?? ""), evento == null ? null : String(evento));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "puerta.asignar", { portero: String(id), alcance: evento ? `evento ${evento}` : "todos" });
  if (r.aviso) await (await import("@/lib/avisos")).avisar(r.aviso.uid, "puerta_asignado", r.aviso.vars, { href: r.aviso.href, ref: ["door_staff", String(id)] });
  return { ok: true };
}
export async function evtPorteroDesasignar(negocio: string, id: string, evento: string): Promise<Res> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  const r = await desasignarPortero(a.negocio.id, String(id ?? ""), String(evento ?? ""));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "puerta.desasignar", { portero: String(id), evento: String(evento) });
  return { ok: true };
}
export async function evtPuertaReglas(negocio: string, evento: string, reglas: ReglasIn): Promise<Res> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  const x = (reglas ?? {}) as Partial<ReglasIn>;
  const r = await reglasPuerta(a.negocio.id, String(evento ?? ""), { reentrada: x.reentrada === true, pideId: x.pideId === true, cierre: x.cierre == null ? null : Number(x.cierre), caps: (x.caps && typeof x.caps === "object" ? x.caps : {}) as Record<string, number> });
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "puerta.reglas", { evento: String(evento), reentrada: x.reentrada === true, pideId: x.pideId === true, cierre: x.cierre ?? null, caps: x.caps ?? {} }, r.antes ?? null);
  return { ok: true };
}
/* Modo puerta del panel: el dueño (o quien tenga «evt») abre SU sesión de puerta como miembro del negocio, con los mismos resultados. */
export async function evtPuertaAbrir(negocio: string, fecha: string, nombre: string): Promise<Res & { sesion?: string }> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  if (!/^\d{1,18}$/.test(String(fecha ?? "")) || !(await db().query(`select 1 from event_dates d join events e on e.id = d.event_id where d.id = $1::bigint and e.business_id = $2`, [fecha, a.negocio.id])).rowCount) return no("Esa fecha no es de tu negocio.", "That date is not yours.");
  const r = await abrirPuerta(a.yo.id, String(fecha), String(nombre ?? "") || "Panel", null, await dispositivo(false));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  return { ok: true, sesion: r.sesion };
}
export async function evtPuertaCerrarSesion(negocio: string, sesion: string): Promise<Res> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  const r = await cerrarSesionPanel(a.negocio.id, String(sesion ?? ""));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "puerta.cerrar_sesion", { sesion: String(sesion) });
  return { ok: true };
}
/* 6h · «Revocar este teléfono» (Monitor: cada puerta es un teléfono). Con auditoría. */
export async function evtPuertaRevocar(negocio: string, sesion: string): Promise<Res> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  const r = await revocarTelefono(a.negocio.id, String(sesion ?? ""));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "puerta.revocar_telefono", { sesion: String(sesion) });
  return { ok: true };
}
export async function evtIncidenciaCerrar(negocio: string, id: string, nota: string): Promise<Res> {
  const a = await entrar(negocio);
  if (!a) return SIN_ACCESO;
  const r = await cerrarIncidencia(a.negocio.id, String(id ?? ""), String(nota ?? ""), a.yo.id);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "puerta.incidencia_cerrar", { incidencia: String(id) });
  return { ok: true };
}
