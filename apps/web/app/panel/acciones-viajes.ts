"use server";
/* Los viajes desde el panel (4y-1): responder (Confirmar · Otra salida · No hay cupo), la salida (va tarde · salió · llegó ·
   cancelar con motivo, devolución completa a todos), Abordó / No llegó y el vehículo completo (salió · llegó). Miembro activo
   con acceso a «Hoy y pedidos» (parte ord). El servidor decide todo y cada paso queda en la línea de tiempo del viaje. */
import { mismoOrigen } from "@/lib/cuenta";
import { accesoPanel } from "@/lib/panel";
import { abordo, cancelarSalida, pasoSalida, pasoViaje, responderViaje } from "@/lib/viajes";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
const r2 = (r: { ok: true } | { ok: false; msg: { es: string; en: string } }): Res => (r.ok ? { ok: true } : { ok: false, mensaje: r.msg });
async function entrar(id: unknown) {
  if (!(await mismoOrigen())) return null;
  if (typeof id !== "string") return null;
  const a = await accesoPanel(id, "ord");
  return a && a.negocio.category_id === "NEG-TRANS" ? a : null;
}

export async function viajeResponder(id: string, numero: string, paso: "confirmar" | "otra" | "nopuedo", run?: string, day?: string, m?: number): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  if (!["confirmar", "otra", "nopuedo"].includes(paso)) return no("Ese paso no existe.", "That step does not exist.");
  return r2(await responderViaje(a.negocio.id, String(numero ?? ""), paso, a.yo.id, paso === "otra" ? { run: run == null ? undefined : String(run), day: day == null ? undefined : String(day), m: m == null ? undefined : Number(m) } : undefined));
}
export async function viajeSalida(id: string, run: string, paso: "tarde" | "salio" | "llego", min?: number): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  if (!["tarde", "salio", "llego"].includes(paso)) return no("Ese paso no existe.", "That step does not exist.");
  return r2(await pasoSalida(a.negocio.id, String(run ?? ""), paso, a.yo.id, min == null ? undefined : Number(min)));
}
export async function viajeCancelarSalida(id: string, run: string, motivo: string): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  return r2(await cancelarSalida(a.negocio.id, String(run ?? ""), String(motivo ?? ""), a.yo.id));
}
export async function viajeAbordo(id: string, numero: string, si: boolean): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  return r2(await abordo(a.negocio.id, String(numero ?? ""), si === true, a.yo.id));
}
export async function viajePasoPriv(id: string, numero: string, paso: "salio" | "llego"): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  if (!["salio", "llego"].includes(paso)) return no("Ese paso no existe.", "That step does not exist.");
  return r2(await pasoViaje(a.negocio.id, String(numero ?? ""), paso, a.yo.id));
}
