"use server";
/* Evento privado desde el panel (6i). Mismo sitio, miembro activo del negocio; el servidor decide todo y cada paso queda en la línea de tiempo.
   - Los ajustes (interruptor y reglas): acceso a «Lo que vendes» (parte cat), auditoría antes → después.
   - Responder (propuesta, otra fecha, cambio, «No puedo») y cancelar un evento confirmado: acceso a «Hoy y pedidos» (parte ord).
   Lo que manda el panel son líneas (cantidad × precio unitario que pone el restaurante) y textos: la BASE calcula subtotal, impuesto, total y
   depósito; nunca llega un total ni un depósito desde aquí. Cancelar devuelve lo que calcula el servidor (todo lo cobrado). */
import { mismoOrigen } from "@/lib/cuenta";
import { cancelarEvpNegocio, guardarAjustesEvp, noPuedoEvp, proponerEvp, type AjustesIn, type PropuestaIn } from "@/lib/evento-privado";
import { accesoPanel } from "@/lib/panel";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
const r2 = (r: { ok: true } | { ok: false; msg: { es: string; en: string } }): Res => (r.ok ? { ok: true } : { ok: false, mensaje: r.msg });
async function entrar(id: unknown, parte: "ord" | "cat") { if (!(await mismoOrigen())) return null; return typeof id === "string" ? accesoPanel(id, parte) : null; }

export async function evpGuardar(id: string, p: AjustesIn): Promise<Res> {
  const a = await entrar(id, "cat"); if (!a) return SIN_ACCESO;
  return r2(await guardarAjustesEvp(a.negocio.id, a.yo.id, p && typeof p === "object" ? p : {}));
}
export async function evpProponer(id: string, numero: string, p: PropuestaIn): Promise<Res> {
  const a = await entrar(id, "ord"); if (!a) return SIN_ACCESO;
  if (!p || typeof p !== "object") return no("Revisa la propuesta.", "Check the proposal.");
  return r2(await proponerEvp(a.negocio.id, String(numero ?? ""), a.yo.id, p));
}
export async function evpNoPuedo(id: string, numero: string, motivo: string): Promise<Res> {
  const a = await entrar(id, "ord"); if (!a) return SIN_ACCESO;
  return r2(await noPuedoEvp(a.negocio.id, String(numero ?? ""), a.yo.id, String(motivo ?? "")));
}
export async function evpCancelarNeg(id: string, numero: string, motivo: string): Promise<Res> {
  const a = await entrar(id, "ord"); if (!a) return SIN_ACCESO;
  return r2(await cancelarEvpNegocio(a.negocio.id, String(numero ?? ""), a.yo.id, String(motivo ?? "")));
}
