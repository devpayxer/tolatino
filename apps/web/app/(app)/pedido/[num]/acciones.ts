"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { cancelarDelCliente, lineasComoCarrito } from "@/lib/pedidos";
import { avisarAyuda, pedirAyuda, pedirRevisionAyuda, type AyudaIn } from "@/lib/ayuda";

/* El cliente sobre su pedido (APP-NEG-PEDIDO): cancelar gratis mientras el negocio no lo acepta, y traer las líneas para
   «Volver a pedir» o «Cancelar y editar». Solo quien hizo el pedido. */
type Bi = { es: string; en: string };
export type ResCli = { ok: true } | { ok: false; msg: Bi };

export async function cancelarPedido(numero: string, motivo: string): Promise<ResCli> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo cancelar.", en: "Could not cancel." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para cancelar.", en: "Sign in to cancel." } };
  return cancelarDelCliente(u.id, String(numero ?? ""), String(motivo ?? ""));
}

export async function lineasDelPedido(numero: string) {
  if (!(await mismoOrigen())) return [];
  const u = await yo();
  if (!u || !/^\d{1,12}$/.test(String(numero))) return [];
  return lineasComoCarrito(u.id, String(numero));
}

/* Ayuda con el pedido: abrir la solicitud y, después de la respuesta del negocio, pedir que To'Latino la revise. */
export async function ayudaPedir(numero: string, p: AyudaIn): Promise<ResCli> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra para pedir ayuda.", en: "Sign in to ask for help." } };
  const r = await pedirAyuda(u.id, String(numero ?? ""), p && typeof p === "object" ? p : { reason: "" });
  if (r.ok) await avisarAyuda(String(numero), "biz_help");
  return r.ok ? { ok: true } : r;
}
export async function ayudaRevision(numero: string): Promise<ResCli> {
  if (!(await mismoOrigen())) return { ok: false, msg: { es: "No se pudo. Recarga la página.", en: "Could not do it. Reload the page." } };
  const u = await yo();
  if (!u) return { ok: false, msg: { es: "Entra otra vez.", en: "Sign in again." } };
  const r = await pedirRevisionAyuda(u.id, String(numero ?? ""));
  return r.ok ? { ok: true } : r;
}
