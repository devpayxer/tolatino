"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { citaAyudaCliente, pedirAyudaCita, type AccionAyuda, type AyudaCitaIn } from "@/lib/ayuda-cita";

/* Ayuda con la cita (APP-NEG-CITA-AYUDA): pedirla y responder a lo que dijo el negocio. Solo quien pidió la cita; el
   servidor decide qué se puede pedir y cuánto vuelve a la tarjeta. */
type Bi = { es: string; en: string };
type R = { ok: true; mensaje?: Bi } | { ok: false; msg: Bi };
const NO: R = { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
export async function ayudaCitaPedir(numero: string, p: AyudaCitaIn): Promise<R> {
  if (!(await mismoOrigen())) return NO;
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  const r = await pedirAyudaCita(u.id, String(numero ?? ""), p ?? { reason: "" });
  return r.ok ? { ok: true } : r;
}
export async function ayudaCitaResponder(numero: string, accion: AccionAyuda, clave: string): Promise<R> {
  if (!(await mismoOrigen())) return NO;
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para seguir.", en: "Sign in to continue." } };
  if (!["entendido", "aceptar", "revisar", "devuelto", "nodevuelto"].includes(accion)) return { ok: false, msg: { es: "Esa acción no existe.", en: "That action does not exist." } };
  const r = await citaAyudaCliente(u.id, String(numero ?? ""), accion, String(clave ?? ""));
  return r.ok ? { ok: true, mensaje: r.mensaje } : r;
}
