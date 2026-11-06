"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { ENTORNO } from "@/lib/entorno";
import { alertaDe, alertaHora, avisarCitaNueva, enviarCita, horasCita, proximas, type CitaIn } from "@/lib/citas";

/* Pedir hora desde la ficha (pestaña Servicios → hoja → Booking). Ver las horas no pide cuenta; enviar sí. El servidor
   recalcula precio, duración, depósito y si la hora sigue libre: el cliente solo muestra. */
type Bi = { es: string; en: string };
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NO_ORIGEN: Bi = { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." };
const limpio = (q: { svc?: unknown; opts?: unknown; adds?: unknown; con?: unknown; i?: unknown }) => ({
  svc: String(q?.svc ?? ""), con: q?.con === "any" || UUID.test(String(q?.con)) ? String(q.con) : "any", i: Math.max(0, Math.min(13, Math.floor(Number(q?.i)) || 0)),
  opts: Object.fromEntries(Object.entries(q?.opts && typeof q.opts === "object" ? (q.opts as Record<string, unknown>) : {}).filter(([k, v]) => /^[0-2]$/.test(k) && Number.isInteger(v)).map(([k, v]) => [k, Number(v)])),
  adds: Array.isArray(q?.adds) ? q.adds.map(String).filter((a) => /^\d{1,18}$/.test(a)).slice(0, 10) : [],
});

// solo lectura
export async function horasDeCita(negocio: string, q: { svc: string; opts: Record<string, number>; adds: string[]; con: string; i: number }) {
  if (typeof negocio !== "string" || !ID.test(negocio)) return null;
  return horasCita(negocio, limpio(q));
}

// solo lectura
export async function proximasHoras(negocio: string, dur?: number) {
  if (typeof negocio !== "string" || !ID.test(negocio)) return {};
  return proximas(negocio, Math.max(10, Math.min(480, Math.floor(Number(dur)) || 40)));
}

export async function pedirCita(negocio: string, f: CitaIn): Promise<{ ok: true; numero: string; st: "pend" | "ok" } | { ok: false; msg: Bi; entrar?: true; tarjeta?: true; hora?: true }> {
  if (!(await mismoOrigen())) return { ok: false, msg: NO_ORIGEN };
  const u = await yo();
  if (!u?.first_name) return { ok: false, entrar: true, msg: { es: "Entra para pedir tu cita.", en: "Sign in to book." } };
  if (typeof negocio !== "string" || !ID.test(negocio) || !f || typeof f !== "object") return { ok: false, msg: { es: "Ese negocio no existe.", en: "That business does not exist." } };
  const r = await enviarCita(u.id, negocio, { ...f, ...limpio(f) }, ENTORNO);
  if (r.ok) await avisarCitaNueva(r.numero, u.first_name).catch(() => undefined);
  return r;
}

export async function avisameHora(negocio: string, con: string, i: number, on: boolean): Promise<{ ok: boolean; on: boolean; entrar?: true }> {
  if (!(await mismoOrigen())) return { ok: false, on: !on };
  const u = await yo();
  if (!u?.first_name) return { ok: false, on: false, entrar: true };
  if (typeof negocio !== "string" || !ID.test(negocio)) return { ok: false, on: !on };
  return { ok: true, on: await alertaHora(u.id, negocio, String(con ?? ""), Number(i), !!on) };
}

// solo lectura
export async function avisameEstado(negocio: string, con: string, i: number) {
  const u = await yo();
  if (!u || typeof negocio !== "string" || !ID.test(negocio)) return false;
  return alertaDe(u.id, negocio, String(con ?? ""), Number(i));
}
