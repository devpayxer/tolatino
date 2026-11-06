"use server";
import { headers } from "next/headers";
import { mismoOrigen } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { actualizarCuenta } from "@/lib/cobros";
import { pasarela } from "@/lib/pagos/pasarela";
import { accesoPanel, type Acceso } from "@/lib/panel";
import type { Res } from "./acciones";

/* Cobros con tarjeta (Panel v2 · DASH-COBROS · stripe): conectar la cuenta de cobro de Stripe, ver su estado y abrir el
   panel de Stripe (banco, datos fiscales). Solo quien tiene «Cobros» (el dueño): toca dinero. To'Latino nunca ve el SSN,
   el EIN ni los números del banco: los pide Stripe en su propia página. Todo queda en la auditoría. */
const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("Solo el dueño maneja los cobros.", "Only the owner manages payouts.");
async function entrar(id: unknown): Promise<Acceso | null> {
  if (!(await mismoOrigen())) return null;
  return typeof id === "string" ? accesoPanel(id, "pay") : null;
}
async function auditar(a: Acceso, action: string, after: unknown) {
  await db().query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, null, $5::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(after ?? null)]);
}
async function origen() { const h = await headers(); return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`; }

/* «Conectar con Stripe»: crea la cuenta (una por negocio) y devuelve el enlace para completarla en Stripe. */
export async function cobrosConectar(id: string): Promise<Res & { url?: string }> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  if (pasarela.modo() === "apagado") return no("Los cobros con tarjeta todavía no están encendidos en To’Latino.", "Card payouts are not on in To’Latino yet.");
  try {
    let acct = (await db().query<{ a: string }>(`select stripe_account_id as a from stripe_accounts where business_id = $1`, [a.negocio.id])).rows[0]?.a ?? null;
    if (!acct) {
      acct = await pasarela.cuentaCrear(a.negocio.id, a.negocio.name);
      await db().query(`insert into stripe_accounts (business_id, stripe_account_id, simulated) values ($1, $2, $3) on conflict (business_id) do nothing`, [a.negocio.id, acct, acct.startsWith("acct_sim_")]);
      await auditar(a, "cobros.conectar", { cuenta: "creada" });
    }
    const base = pasarela.modo() === "stripe" ? await origen() : "";
    const url = await pasarela.cuentaEnlace(acct, `${base}/panel/${a.negocio.id}/cobros?vuelta=1`, `${base}/panel/${a.negocio.id}/cobros?otra=1`);
    return { ok: true, url };
  } catch {
    return no("Stripe no respondió. Prueba de nuevo en un momento.", "Stripe did not respond. Try again in a moment.");
  }
}

/* Al volver de Stripe (o al abrir Cobros): lee el estado real de la cuenta y lo guarda. */
export async function cobrosActualizar(id: string): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  await actualizarCuenta(a.negocio.id).catch(() => undefined);
  return { ok: true };
}

/* «Cambiar banco» / «Completar en Stripe»: el panel de Stripe de la cuenta (ahí se cambia el banco con su verificación). */
export async function cobrosStripe(id: string): Promise<Res & { url?: string }> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const acct = (await db().query<{ a: string; on: boolean }>(`select stripe_account_id as a, charges_enabled as on from stripe_accounts where business_id = $1`, [a.negocio.id])).rows[0];
  if (!acct) return no("Primero conecta tu cuenta de cobro.", "Connect your payout account first.");
  if (acct.a.startsWith("acct_sim_")) return no("En el sandbox la cuenta es simulada: no hay panel de Stripe.", "In the sandbox the account is simulated: there is no Stripe dashboard.");
  try {
    const url = acct.on ? await pasarela.cuentaPanel(acct.a) : await pasarela.cuentaEnlace(acct.a, `${await origen()}/panel/${a.negocio.id}/cobros?vuelta=1`, `${await origen()}/panel/${a.negocio.id}/cobros?otra=1`);
    await auditar(a, "cobros.abrir_stripe", null);
    return url ? { ok: true, url } : no("No se pudo abrir Stripe.", "Could not open Stripe.");
  } catch { return no("Stripe no respondió. Prueba de nuevo en un momento.", "Stripe did not respond. Try again in a moment."); }
}

/* Plan Pro (Cobros y plan): seguir con Pro (o volver), pasar a Free y deshacer. Solo el dueño; paga con su tarjeta guardada. */
export async function planSeguir(id: string, pm: string, ciclo: "month" | "year"): Promise<Res & { cobrado?: boolean }> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const { seguirConPro } = await import("@/lib/suscripcion");
  const r = await seguirConPro(a.negocio.id, a.yo.id, String(pm ?? ""), ciclo === "year" ? "year" : "month");
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "plan.seguir_pro", { ciclo: ciclo === "year" ? "anual" : "mensual", cobrado: !!("cobrado" in r && r.cobrado) });
  return { ok: true, cobrado: "cobrado" in r ? r.cobrado : undefined };
}
export async function planFree(id: string): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const { pasarAFree } = await import("@/lib/suscripcion");
  const r = await pasarAFree(a.negocio.id, a.yo.id);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "plan.pasar_a_free", null);
  return { ok: true };
}
export async function planDeshacer(id: string): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const { deshacerFree } = await import("@/lib/suscripcion");
  const r = await deshacerFree(a.negocio.id, a.yo.id);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "plan.deshacer", null);
  return { ok: true };
}
