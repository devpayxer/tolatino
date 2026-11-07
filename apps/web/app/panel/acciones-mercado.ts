"use server";
/* El pedido del mercado desde el panel (4p): aceptar / no puedo, pesar con la foto de la balanza, «no hay» (quitar o proponer
   un sustituto), mandar el peso al cliente, listo / en camino y lo recogió / entregado. Mismo sitio, miembro activo con
   acceso a «Hoy y pedidos» (parte ord); el servidor decide todo y cada paso queda en la línea de tiempo del pedido. */
import { mismoOrigen } from "@/lib/cuenta";
import { noHay, pasoMercado, pesarLinea, type PasoMerc } from "@/lib/mercado";
import { accesoPanel } from "@/lib/panel";
import type { Res } from "./acciones";

const SIN: Res = { ok: false, mensaje: { es: "No tienes acceso a esta parte del panel.", en: "You don’t have access to this part of the dashboard." } };
async function entrar(id: unknown) { if (!(await mismoOrigen())) return null; return typeof id === "string" ? accesoPanel(id, "ord") : null; }
const r2 = (r: { ok: true } | { ok: false; msg: { es: string; en: string } }): Res => (r.ok ? { ok: true } : { ok: false, mensaje: r.msg });

export async function mercPaso(id: string, numero: string, paso: PasoMerc): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN;
  if (!["aceptar", "rechazar", "mandar", "listo", "entregado"].includes(paso)) return { ok: false, mensaje: { es: "Ese paso no existe.", en: "That step does not exist." } };
  return r2(await pasoMercado(a.negocio.id, String(numero ?? ""), paso, a.yo.id));
}
export async function mercPesar(id: string, numero: string, linea: string, lb: string, foto: string): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN;
  return r2(await pesarLinea(a.negocio.id, String(numero ?? ""), String(linea ?? ""), Number(String(lb ?? "").replace(",", ".")), String(foto ?? ""), a.yo.id));
}
export async function mercNoHay(id: string, numero: string, linea: string, sustituto: string | null): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN;
  return r2(await noHay(a.negocio.id, String(numero ?? ""), String(linea ?? ""), sustituto == null ? null : String(sustituto), a.yo.id));
}
