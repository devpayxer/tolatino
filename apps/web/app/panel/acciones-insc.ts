"use server";
/* Inscripciones desde el panel (4ee · fase4-edu-ninos-deporte.md §4ee): Confirmar · Otro grupo · No hay cupo; empezó / terminó (con
   certificado); cancelar una inscripción o el grupo entero (motivo obligatorio, devolución completa a todos); confirmar la baja de una
   membresía; ofrecer el cupo a la lista de espera; marcar la cuota del plan pagada en la escuela. Miembro activo con acceso a «Hoy y
   pedidos» (parte ord). El servidor decide todo (lib/inscripciones.ts). */
import { mismoOrigen } from "@/lib/cuenta";
import { cancelarGrupo, cancelarInscNegocio, confirmarBaja, marcarCuota, marcarGrupo, marcarInsc, ofrecerCupo, responderInsc, type PasoInsc } from "@/lib/inscripciones";
import { accesoPanel } from "@/lib/panel";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
const r2 = (r: { ok: true } | { ok: false; msg: { es: string; en: string } }): Res => (r.ok ? { ok: true } : { ok: false, mensaje: r.msg });
async function entrar(id: unknown) {
  if (!(await mismoOrigen())) return null;
  const a = typeof id === "string" ? await accesoPanel(id, "ord") : null;
  return a && ["NEG-EDU", "NEG-NINOS", "NEG-DEPORTE", "NEG-FE"].includes(a.negocio.category_id) ? a : null; // 4ie: Iglesias (fechas y catecismo, $0)
}
export async function inscResponder(id: string, numero: string, paso: PasoInsc, alt?: string): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  if (!["confirmar", "otro", "nohay"].includes(paso)) return no("Ese paso no existe.", "That step does not exist.");
  return r2(await responderInsc(a.negocio.id, String(numero ?? ""), paso, a.yo.id, alt == null ? undefined : String(alt)));
}
export async function inscMarcar(id: string, numero: string, que: "empezo" | "termino", cert?: boolean): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  if (!["empezo", "termino"].includes(que)) return no("Ese paso no existe.", "That step does not exist.");
  return r2(await marcarInsc(a.negocio.id, String(numero ?? ""), que, a.yo.id, cert === true));
}
export async function inscMarcarGrupo(id: string, grupo: string, que: "empezo" | "termino", cert?: boolean): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  if (!["empezo", "termino"].includes(que)) return no("Ese paso no existe.", "That step does not exist.");
  return r2(await marcarGrupo(a.negocio.id, String(grupo ?? ""), que, a.yo.id, cert === true));
}
export async function inscCancelarNeg(id: string, numero: string, motivo: string): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  return r2(await cancelarInscNegocio(a.negocio.id, String(numero ?? ""), String(motivo ?? ""), a.yo.id));
}
export async function inscCancelarGrupo(id: string, grupo: string, motivo: string): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  return r2(await cancelarGrupo(a.negocio.id, String(grupo ?? ""), String(motivo ?? ""), a.yo.id));
}
export async function inscConfirmarBaja(id: string, numero: string): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  return r2(await confirmarBaja(a.negocio.id, String(numero ?? ""), a.yo.id));
}
export async function inscOfrecer(id: string, entrada: string): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  return r2(await ofrecerCupo(a.negocio.id, String(entrada ?? ""), a.yo.id));
}
export async function inscCuota(id: string, numero: string, n: number): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  return r2(await marcarCuota(a.negocio.id, String(numero ?? ""), Number(n), a.yo.id));
}
