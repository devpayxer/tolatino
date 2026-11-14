import "server-only";
import { db } from "../db";
import { pasarela, type Retencion, type Verificar } from "./pasarela";

/* 9k · 3-D Secure (LAUNCH L355, L382, L759; fase9-apertura.md §4 9k). Cuando el banco pide verificar, el cobro queda en «requires_action» y la
   verificación pendiente queda a nombre de quien paga (payment_actions, migración 0141):
   - En la app (en sesión): el flujo devuelve `verificar` a la pantalla, la hoja la completa (Stripe.js handleNextAction; en el sandbox, la
     verificación simulada del banco) y la pantalla vuelve a enviar lo MISMO con la MISMA llave: la pasarela encuentra el cobro verificado y lo da por
     retenido (nunca cobra dos veces). Si nadie la completa en verificacion_min, el barrido suelta lo retenido.
   - Renovación de Pro (fuera de sesión): el dueño recibe el aviso con un enlace a /pago/verificar/<pi>; al confirmar, se completa el período.
   Solo quien paga completa su verificación; el servidor mira el estado en Stripe (nunca le cree a la pantalla). */
type Bi = { es: string; en: string };
export type ResVerificar = { ok: true; listo: boolean } | { ok: false; msg: Bi };

/* Lo que el flujo devuelve a la pantalla cuando el banco pide verificar (solo si la verificación quedó a nombre de quien paga). */
export function pideVerificar(ret: Retencion): { verificar: Verificar } | null {
  return ret.ok && ret.estado === "accion" && ret.verificar ? { verificar: ret.verificar } : null;
}

const fila = async (pi: string) => (await db().query<{ user_id: string; status: string; viva: boolean; kind: string; business_id: string | null; amount_cents: number; pm: string | null; vence: string }>(
  `select user_id::text, status, expires_at > now() as viva, kind, business_id, amount_cents, pm, to_char(expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as vence
     from payment_actions where pi = $1::text`, [pi])).rows[0] ?? null;

/* La verificación pendiente de una persona (la página de la renovación la abre por su enlace). Otra persona: «no existe». */
export async function verificacionDe(userId: string, pi: string): Promise<(Verificar & { estado: string; negocio: string | null }) | null> {
  if (!/^pi_[A-Za-z0-9_.:-]{3,250}$/.test(pi)) return null;
  const a = await fila(pi);
  if (!a || a.user_id !== userId) return null;
  const s = await pasarela.intento(pi);
  return { pi, secreto: s?.secreto ?? "", monto: a.amount_cents, pm: a.pm, vence: a.vence, renovacion: a.kind === "renovacion", estado: a.viva || a.status !== "pendiente" ? a.status : "vencida", negocio: a.business_id };
}

/* Después de la hoja: el servidor mira el estado real del cobro. Retenido o cobrado → verificada (y, si era una renovación, el período se
   completa); rechazado → fallo; todavía pide → «tu banco no lo confirmó». */
export async function confirmarVerificacion(userId: string, pi: string): Promise<ResVerificar> {
  const a = /^pi_[A-Za-z0-9_.:-]{3,250}$/.test(pi) ? await fila(pi) : null;
  if (!a || a.user_id !== userId) return { ok: false, msg: { es: "Esa verificación no existe.", en: "That verification does not exist." } };
  if (a.status === "verificada") return { ok: true, listo: true };
  if (a.status !== "pendiente" || !a.viva) return { ok: false, msg: { es: "La verificación venció. Vuelve a intentarlo: no se cobró nada.", en: "The verification expired. Try again: nothing was charged." } };
  const s = await pasarela.intento(pi);
  if (!s) return { ok: false, msg: { es: "No pudimos ver la respuesta de tu banco. Prueba de nuevo en un momento.", en: "We could not see your bank's answer. Try again in a moment." } };
  if (s.estado === "requires_capture" || s.estado === "succeeded") {
    const u = await db().query(`update payment_actions set status = 'verificada' where pi = $1::text and status = 'pendiente'`, [pi]);
    if (u.rowCount && a.kind === "renovacion" && a.business_id) await (await import("../suscripcion")).completarRenovacion(a.business_id, pi);
    return { ok: true, listo: true };
  }
  if (s.estado === "requires_action") return { ok: true, listo: false };
  await db().query(`update payment_actions set status = 'fallo' where pi = $1::text and status = 'pendiente'`, [pi]);
  return { ok: false, msg: { es: "Tu banco no confirmó el pago. Prueba con otra tarjeta: no se cobró nada.", en: "Your bank did not confirm the payment. Try another card: nothing was charged." } };
}

/* Sandbox: la persona contesta al «banco» del simulador en la hoja (Confirmar / No fui yo). Solo su propia verificación pendiente. */
export async function simularBanco(userId: string, pi: string, aprobar: boolean): Promise<ResVerificar> {
  if (pasarela.modo() !== "simulador") return { ok: false, msg: { es: "Solo en el sandbox.", en: "Sandbox only." } };
  const a = /^pi_sim_/.test(pi) ? await fila(pi) : null;
  if (!a || a.user_id !== userId || a.status !== "pendiente" || !a.viva) return { ok: false, msg: { es: "Esa verificación no existe o ya venció.", en: "That verification does not exist or expired." } };
  await pasarela.simBanco(pi, aprobar);
  return confirmarVerificacion(userId, pi);
}

/* Barrido: lo que nadie verificó a tiempo, y lo verificado que el flujo nunca registró (la persona se fue después de verificar), se suelta en
   Stripe y vence. Una renovación verificada ya se cobró (su período se completó al verificar): no se toca. */
export async function vencerVerificaciones(): Promise<number> {
  const L = (await db().query<{ pi: string; kind: string }>(
    `select a.pi, a.kind from payment_actions a
      where a.expires_at < now() and (a.status = 'pendiente' or (a.status = 'verificada' and a.kind = 'en_sesion'
            and not exists (select 1 from payments p where p.stripe_payment_intent = a.pi)
            and not exists (select 1 from payment_actions b where b.base_idem = a.base_idem and b.created_at > a.created_at)))
      order by a.expires_at limit 200`)).rows;
  let n = 0;
  for (const x of L) {
    // Una retención verificada que sí entró al libro después (carrera con el flujo) no se suelta: se vuelve a mirar dentro del update.
    if (x.kind === "en_sesion" && (await db().query(`select 1 from payments where stripe_payment_intent = $1::text`, [x.pi])).rowCount) continue;
    const r = await pasarela.liberar(x.pi);
    if (!r.ok) continue;
    const u = await db().query(`update payment_actions set status = 'vencida' where pi = $1::text and status in ('pendiente', 'verificada') and expires_at < now()`, [x.pi]);
    n += u.rowCount ?? 0;
  }
  return n;
}
