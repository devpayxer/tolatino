"use server";
/* Visitas, pruebas de manejo, citas, precalificaciones y ofertas desde el panel (4ie · fase4-iglesias-inmuebles-autos.md §4ie): Confirmar ·
   Otra hora · No se puede; Pasó · No vino; cancelar una confirmada con motivo. Miembro activo con acceso a «Hoy y pedidos» (parte ord) de un
   negocio de Bienes Raíces o Venta de Autos. El servidor decide todo (lib/visitas-inm.ts). Nada se cobra. */
import { mismoOrigen } from "@/lib/cuenta";
import { accesoPanel } from "@/lib/panel";
import { cancelarVisita, marcarVisita, responderVisita, type PasoVis } from "@/lib/visitas-inm";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
const r2 = (r: { ok: true } | { ok: false; msg: { es: string; en: string } }): Res => (r.ok ? { ok: true } : { ok: false, mensaje: r.msg });
async function entrar(id: unknown) {
  if (!(await mismoOrigen())) return null;
  const a = typeof id === "string" ? await accesoPanel(id, "ord") : null;
  return a && ["NEG-INMUEBLE", "NEG-DEALER"].includes(a.negocio.category_id) ? a : null;
}
export async function visResponder(id: string, numero: string, paso: PasoVis, alt?: string): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  if (!["confirmar", "otra", "nopuede"].includes(paso)) return no("Ese paso no existe.", "That step does not exist.");
  return r2(await responderVisita(a.negocio.id, String(numero ?? ""), paso, a.yo.id, alt == null ? undefined : String(alt)));
}
export async function visMarcar(id: string, numero: string, que: "paso" | "no_vino"): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  if (!["paso", "no_vino"].includes(que)) return no("Ese paso no existe.", "That step does not exist.");
  return r2(await marcarVisita(a.negocio.id, String(numero ?? ""), que, a.yo.id));
}
export async function visCancelarNeg(id: string, numero: string, motivo: string): Promise<Res> {
  const a = await entrar(id); if (!a) return SIN_ACCESO;
  return r2(await cancelarVisita({ negocio: a.negocio.id, actorId: a.yo.id }, String(numero ?? ""), String(motivo ?? "")));
}
