"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { aplicar, confirmarEntrevista, guardarVacanteCliente, retirarSolicitud, type AplicarIn } from "@/lib/jobs";

/* Jobs desde la ficha: guardar, aplicar, confirmar la entrevista y retirar. Todo pide sesión; el servidor revisa la
   vacante (en vivo), los requisitos y que la solicitud sea de la persona. */
type Bi = { es: string; en: string };
type R = { ok: true; numero?: string } | { ok: false; msg: Bi; entrar?: true };
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NO_ORIGEN: Bi = { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." };
const ENTRA: Bi = { es: "Entra para seguir.", en: "Sign in to continue." };
async function quien() {
  if (!(await mismoOrigen())) return { e: { ok: false as const, msg: NO_ORIGEN } };
  const u = await yo();
  return u ? { u } : { e: { ok: false as const, entrar: true as const, msg: ENTRA } };
}
export async function vacGuardar(job: string): Promise<R> { const q = await quien(); return q.e ?? guardarVacanteCliente(q.u.id, String(job ?? "")); }
export async function vacAplicar(negocio: string, p: AplicarIn): Promise<R> {
  const q = await quien();
  if (q.e) return q.e;
  if (typeof negocio !== "string" || !ID.test(negocio)) return { ok: false, msg: { es: "Ese negocio no existe.", en: "That business does not exist." } };
  return aplicar(q.u.id, negocio, p && typeof p === "object" ? p : ({} as AplicarIn));
}
export async function vacConfirmar(numero: string): Promise<R> { const q = await quien(); return q.e ?? confirmarEntrevista(q.u.id, String(numero ?? "")); }
export async function vacRetirar(numero: string): Promise<R> { const q = await quien(); return q.e ?? retirarSolicitud(q.u.id, String(numero ?? "")); }
