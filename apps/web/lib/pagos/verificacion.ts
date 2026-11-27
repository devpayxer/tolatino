import "server-only";
import { db } from "../db";
import { pasarela, type Retencion, type Verificar } from "./pasarela";

/* 9k · 3-D Secure (LAUNCH L355, L382, L759; fase9-apertura.md §4 9k). Cuando el banco pide verificar, el cobro queda en «requires_action» y la
   verificación pendiente queda a nombre de quien paga (payment_actions, migración 0141):
   - En la app (en sesión): el flujo devuelve `verificar` a la pantalla, la hoja la completa (Stripe.js handleNextAction; en el sandbox, la
     verificación simulada del banco) y la pantalla vuelve a enviar lo MISMO con la MISMA llave: la pasarela encuentra el cobro verificado y lo da por
     retenido (nunca cobra dos veces). Si nadie la completa en verificacion_min, el barrido suelta lo retenido.
   - Renovación de Pro (fuera de sesión): el dueño recibe el aviso con un enlace a /pago/verificar/<pi>; al confirmar, se completa el período.
   - 27 nov (LAUNCH 9q) · El depósito de una renta al recogerla (fuera de sesión, kind 'renta'): el cliente recibe el aviso renta_verify con el mismo enlace;
     al confirmar (aquí, o el webhook amount_capturable_updated) la renta sigue sola (lib/rentas.ts › trasVerificacionRenta: depósito retenido, renta
     cobrada); si nadie la confirma en verificacion_min, vence aquí y la renta aplica su fallo de siempre (falloRecoger).
   Solo quien paga completa su verificación; el servidor mira el estado en Stripe (nunca le cree a la pantalla). */
type Bi = { es: string; en: string };
export type ResVerificar = { ok: true; listo: boolean } | { ok: false; msg: Bi };

/* Lo que el flujo devuelve a la pantalla cuando el banco pide verificar (solo si la verificación quedó a nombre de quien paga). */
export function pideVerificar(ret: Retencion): { verificar: Verificar } | null {
  return ret.ok && ret.estado === "accion" && ret.verificar ? { verificar: ret.verificar } : null;
}

/* 9n-4 · El mismo camino en TODOS los flujos que cobran con la persona en la app (citas, visitas, inscripciones, noche, fiestas, viajes, evento
   privado, mudanzas, estimados y «algo más»; antes solo pedidos, mercado, tiendas, el plan de apartado y boletos): cuando el banco pide verificar
   (`requires_action`, nunca `requires_payment_method`: eso es una tarjeta rechazada), lo retenido NO se suelta ni se pide otra tarjeta: la verificación
   queda a nombre de quien paga y la pantalla abre la hoja y vuelve a enviar lo MISMO con la MISMA llave (la pasarela reusa el cobro verificado).
   El flujo ya deshizo su transacción: nada se guarda sin la verificación. Sin verificación a su nombre (un flujo que no pasó `usuario`), como antes. */
/* 26 nov (LAUNCH «el dinero dice lo que pasó» (1)) · La que se suelta va por cobros › soltarSuelta con lo que sabe quien la retuvo (ctx: de quién, cuánto,
   qué; sin él, solo el intento): nadie más sabe de ella, así que si Stripe no la suelta (o ya la había cobrado) el equipo de dinero tiene su alerta. */
export async function bancoPide(ret: Extract<Retencion, { ok: true }>, ctx?: import("../cobros").ContextoSuelta | null): Promise<{ ok: false; msg: Bi; tarjeta: true; verificar?: Verificar }> {
  const v = pideVerificar(ret);
  if (v) return { ok: false, msg: { es: "Tu banco pide confirmar que eres tú. Confírmalo y seguimos; no se cobró nada todavía.", en: "Your bank asks you to confirm it is you. Confirm it and we continue; nothing was charged yet." }, tarjeta: true, ...v };
  await (await import("../cobros")).soltarSuelta(ret.pi, ctx ?? { que: { es: "Retención que pidió verificación del banco sin poder completarla en la app", en: "Hold that asked for bank verification without a way to complete it in the app" }, monto: 0 });
  return { ok: false, msg: { es: "Tu banco pide una verificación extra. Prueba con otra tarjeta.", en: "Your bank asks for an extra verification. Try another card." }, tarjeta: true };
}

const fila = async (pi: string) => (await db().query<{ user_id: string; status: string; viva: boolean; kind: string; business_id: string | null; amount_cents: number; pm: string | null; vence: string; num: string | null }>(
  `select a.user_id::text, a.status, a.expires_at > now() as viva, a.kind, a.business_id, a.amount_cents, a.pm, to_char(a.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as vence,
          (select o.number from operations o where o.id = a.operation_id) as num
     from payment_actions a where a.pi = $1::text`, [pi])).rows[0] ?? null;
/* 27 nov (LAUNCH 9q) · La renta que esperaba esta verificación sigue sola (confirmada, rechazada o vencida): lib/rentas.ts › trasVerificacionRenta. */
const sigueRenta = async (pi: string) => (await import("../rentas")).trasVerificacionRenta(pi);

/* La verificación pendiente de una persona (la página de la renovación la abre por su enlace). Otra persona: «no existe». */
export async function verificacionDe(userId: string, pi: string): Promise<(Verificar & { estado: string; negocio: string | null; rentaNum: string | null }) | null> {
  if (!/^pi_[A-Za-z0-9_.:-]{3,250}$/.test(pi)) return null;
  const a = await fila(pi);
  if (!a || a.user_id !== userId) return null;
  const s = await pasarela.intento(pi);
  const renta = a.kind === "renta";
  return { pi, secreto: s?.secreto ?? "", monto: a.amount_cents, pm: a.pm, vence: a.vence, renovacion: a.kind === "renovacion", ...(renta ? { renta: true } : {}), estado: a.viva || a.status !== "pendiente" ? a.status : "vencida",
    negocio: renta ? null : a.business_id, rentaNum: renta ? a.num : null };
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
    // 27 nov (LAUNCH 9q) · La renta sigue sola (una vez: quien llega segundo, el webhook u otra pestaña, encuentra la intención ya cerrada).
    if (u.rowCount && a.kind === "renta") await sigueRenta(pi);
    return { ok: true, listo: true };
  }
  // Fuera de sesión (renovación, renta) el intento espera en «requires_payment_method» hasta que la hoja lo vuelve a confirmar: todavía no es un «no».
  if (s.estado === "requires_action" || (a.kind === "renta" && s.estado === "requires_payment_method")) return { ok: true, listo: false };
  const f = await db().query(`update payment_actions set status = 'fallo' where pi = $1::text and status = 'pendiente'`, [pi]);
  if (f.rowCount && a.kind === "renta") await sigueRenta(pi);
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
   Stripe y vence. Una renovación verificada ya se cobró (su período se completó al verificar): no se toca. C-002/C-003 · Tampoco la de un patrocinio
   que ya está en su libro (sponsorship_payments: se capturó al guardarlo); la de uno que nunca se guardó se suelta como cualquier otra. */
export async function vencerVerificaciones(): Promise<number> {
  // 26 nov (LAUNCH «el dinero dice lo que pasó» (1)) · La que ya tiene su alerta suelta:<pi> (no se soltó pasada la gracia, o Stripe ya la había cobrado) no se
  // vuelve a intentar: la tiene el equipo de dinero (y no tapa a las demás).
  const C = await import("../cobros");
  const L = (await db().query<{ pi: string; kind: string; uid: string; biz: string | null; city: string | null; amt: number; ultimo: boolean }>(
    `select a.pi, a.kind, a.user_id::text as uid, a.business_id as biz, a.city_id as city, a.amount_cents as amt, a.expires_at < now() - make_interval(mins => $1::int) as ultimo from payment_actions a
      where a.expires_at < now() and (a.status = 'pendiente' or (a.status = 'verificada' and a.kind = 'en_sesion'
            and not exists (select 1 from payments p where p.stripe_payment_intent = a.pi)
            and not exists (select 1 from sponsorship_payments s where s.pi = a.pi)
            and not exists (select 1 from payment_actions b where b.base_idem = a.base_idem and b.created_at > a.created_at)))
        and not exists (select 1 from money_alerts m where m.kind = 'hold_stuck' and m.subject_id = 'suelta:' || a.pi)
      order by a.expires_at limit 200`, [C.SUELTA_ESPERA_MIN])).rows;
  let n = 0;
  for (const x of L) {
    // Una retención verificada que sí entró al libro después (carrera con el flujo) no se suelta: se vuelve a mirar dentro del update.
    if (x.kind === "en_sesion" && (await db().query(`select 1 from payments where stripe_payment_intent = $1::text`, [x.pi])).rowCount) continue;
    // 26 nov · Por cobros › soltarSuelta: la que no se suelta se reintenta en el próximo barrido y, pasada la gracia (SUELTA_ESPERA_MIN después de vencer),
    // alerta y se deja (antes se reintentaba sin fin en silencio); la que Stripe ya había cobrado alerta en el acto. Guardián liberarSoloPorLaRegla.
    const r = await C.soltarSuelta(x.pi, { que: { es: x.kind === "renovacion" ? "Verificación del banco de una renovación de Pro que nadie completó a tiempo" : x.kind === "renta" ? "Verificación del banco del depósito de una renta que el cliente no completó a tiempo" : "Verificación del banco que nadie completó a tiempo (la retención no entró al libro)",
      en: x.kind === "renovacion" ? "Bank verification of a Pro renewal nobody completed in time" : x.kind === "renta" ? "Bank verification of a rental deposit the customer did not complete in time" : "Bank verification nobody completed in time (the hold never entered the books)" }, monto: x.amt, persona: x.uid, negocio: x.biz, ciudad: x.city, luego: "deja", ultimo: x.ultimo });
    if (r.e !== "liberada") continue;
    const u = await db().query(`update payment_actions set status = 'vencida' where pi = $1::text and status in ('pendiente', 'verificada') and expires_at < now()`, [x.pi]);
    n += u.rowCount ?? 0;
    // 27 nov (LAUNCH 9q) · La renta que la esperaba aplica su fallo de siempre (falloRecoger: cambia la tarjeta), una vez (quien venció la verificación).
    if (u.rowCount && x.kind === "renta") await sigueRenta(x.pi);
  }
  return n;
}
