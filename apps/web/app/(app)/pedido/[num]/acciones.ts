"use server";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { cancelarDelCliente, lineasComoCarrito } from "@/lib/pedidos";

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
