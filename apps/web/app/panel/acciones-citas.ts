"use server";
import { mismoOrigen } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { accesoPanel, type Acceso } from "@/lib/panel";
import { citaCambio, citaPaso, type PasoCita } from "@/lib/citas-flujo";
import { responderAyudaCita } from "@/lib/ayuda-cita";
import type { Res } from "./acciones";

/* Citas desde el panel (Hoy, Clientes y el detalle): Confirmar / Otra hora / No puedo; Llegó / No llegó / Terminada;
   aceptar o no el cambio que pide el cliente. Pide «Hoy y pedidos» (ord). Todo queda en la auditoría. */
const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
const PASOS = new Set<PasoCita>(["confirmar", "otra", "nopuedo", "llego", "nollego", "terminada", "recibido", "camino", "llegue", "empezar", "listo", "entregado", "nadie", "noseguro"]);
const PASO_L: Record<PasoCita, string> = { confirmar: "Confirmada", otra: "Otra hora propuesta", nopuedo: "No se pudo", llego: "Llegó · en atención", nollego: "No llegó", terminada: "Terminada",
  recibido: "Carro recibido", camino: "Va en camino", llegue: "Llegó a la casa", empezar: "Trabajando", listo: "Listo", entregado: "Entregado", nadie: "No había nadie", noseguro: "No aceptan su seguro" };

async function entrar(id: unknown): Promise<Acceso | null> {
  if (!(await mismoOrigen())) return null;
  return typeof id === "string" ? accesoPanel(id, "ord") : null;
}
async function auditar(a: Acceso, action: string, after: unknown) {
  await db().query(
    `insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, null, $5::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(after ?? null)]);
}

export async function citaResponder(id: string, numero: string, paso: PasoCita): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  if (!PASOS.has(paso)) return no("Esa acción no existe.", "That action does not exist.");
  const r = await citaPaso(a.negocio.id, String(numero ?? ""), paso, a.yo.id);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, `cita.${paso}`, { cita: numero, estado: PASO_L[paso] });
  return { ok: true };
}
export async function citaCambioResponder(id: string, numero: string, que: "aceptar" | "rechazar"): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  if (que !== "aceptar" && que !== "rechazar") return no("Esa acción no existe.", "That action does not exist.");
  const r = await citaCambio(a.negocio.id, String(numero ?? ""), que, a.yo.id);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, `cita.cambio.${que}`, { cita: numero, cambio: que === "aceptar" ? "Aceptado" : "No se pudo" });
  return { ok: true };
}

/* Ayuda con la cita (3e): responder en 24 h con una decisión (acepta, propone un monto o no puede) y un mensaje que el
   cliente ve. Devolver dinero a su tarjeta pide además el permiso de Cobros (solo el dueño). */
export async function citaAyudaResponder(id: string, numero: string, decision: "ok" | "alt" | "no", texto: string, monto: string | null, clave: string): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const pagar = typeof id === "string" && !!(await accesoPanel(id, "pay"));
  const r = await responderAyudaCita(a.negocio.id, String(numero ?? ""), { decision: String(decision ?? ""), texto: String(texto ?? ""), monto: monto == null ? null : String(monto), clave: String(clave ?? "") }, a.yo.id, pagar);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "cita.ayuda.responder", { cita: numero, decision: { ok: "Acepta", alt: "Propone un monto", no: "No puede" }[decision] ?? decision, monto: monto ?? null, respuesta: String(texto).trim().slice(0, 120) });
  return { ok: true };
}
