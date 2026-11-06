import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "../db";
import { ENTORNO } from "../entorno";
import { ErrorStripe, stripe } from "./stripe";

/* La pasarela de pagos: Stripe de verdad (con STRIPE_SECRET_KEY) o el simulador propio del sandbox (sin clave). El resto
   de la app no sabe cuál corre. CANDADO: en producción el simulador no existe; sin clave, la tarjeta queda apagada. */
export type ModoPago = "stripe" | "simulador" | "apagado";
export function modoPago(): ModoPago {
  if (process.env.STRIPE_SECRET_KEY) return "stripe";
  return ENTORNO === "produccion" ? "apagado" : "simulador";
}
if (ENTORNO === "produccion" && process.env.TOLATINO_PAGOS_SIMULADOR === "1") throw new Error("CANDADO: el simulador de pagos no puede existir en producción.");

export type Retencion = { ok: true; pi: string; estado: "retenido" | "accion"; secreto?: string; marca: string | null; ultimos4: string | null }
  | { ok: false; codigo: string; mensaje: { es: string; en: string } };
export type EstadoCuenta = { cargos: boolean; pagos: boolean; pide: string[]; banco: string | null };

const RECHAZO: Record<string, [string, string]> = {
  card_declined: ["Tu banco la rechazó. Prueba con otra tarjeta.", "Your bank declined it. Try another card."],
  insufficient_funds: ["Tu banco dice que no hay fondos suficientes. Prueba con otra tarjeta.", "Your bank says there are not enough funds. Try another card."],
  expired_card: ["Esa tarjeta ya venció. Prueba con otra.", "That card has expired. Try another."],
  incorrect_cvc: ["El código de seguridad no coincide. Revísalo.", "The security code does not match. Check it."],
  processing_error: ["Tu banco no respondió. Prueba de nuevo en un momento.", "Your bank did not respond. Try again in a moment."],
};
const traducir = (codigo: string | null): { es: string; en: string } => { const x = RECHAZO[codigo ?? ""] ?? RECHAZO.card_declined!; return { es: x[0], en: x[1] }; };

/* ── Simulador (solo sandbox): tarjetas de prueba como las de Stripe. El número nunca llega al servidor: el navegador
   manda pm_sim_<marca>_<últimos4>. 0002 = rechazada · 9995 = sin fondos · 0069 = vencida · el resto, aprobada. ── */
const SIM_PM = /^pm_sim_(visa|mc|amex|disc)_(\d{4})(?:_[0-9a-f]{8})?$/;
function simRechazo(l4: string) { return l4 === "0002" ? "card_declined" : l4 === "9995" ? "insufficient_funds" : l4 === "0069" ? "expired_card" : null; }
const simId = (p: string) => `${p}_sim_${randomBytes(9).toString("hex")}`;

type InRetener = { centavos: number; comision: number; destino: string; pm: string; cliente?: string | null; idem: string; meta: Record<string, string> };
/* La evidencia de una disputa con los nombres de campo de Stripe (la prueba de contrato los compara con el objeto disputa
   de la especificación: stripe-mock no valida los campos dentro de «evidence»). */
export function evidenciaStripe(e: { texto: string; producto: string; cliente: string; fecha: string; envio?: string | null }) {
  return { uncategorized_text: e.texto.slice(0, 20000), product_description: e.producto.slice(0, 20000), customer_name: e.cliente, service_date: e.fecha, ...(e.envio ? { shipping_address: e.envio.slice(0, 500) } : {}) };
}
export const pasarela = {
  modo: modoPago,

  async retener(x: InRetener): Promise<Retencion> {
    if (modoPago() === "simulador") {
      const m = SIM_PM.exec(x.pm);
      if (!m) return { ok: false, codigo: "card_declined", mensaje: { es: "Esa tarjeta no es de prueba. En el sandbox usa 4242 4242 4242 4242.", en: "That is not a test card. In the sandbox use 4242 4242 4242 4242." } };
      const ya = (await db().query<{ id: string; status: string }>(`select id, status from sim_intents where id = $1`, [`pi_sim_${x.idem}`])).rows[0];
      if (ya) return ya.status === "failed" ? { ok: false, codigo: "card_declined", mensaje: traducir("card_declined") } : { ok: true, pi: ya.id, estado: "retenido", marca: m[1]!, ultimos4: m[2]! };
      const r = simRechazo(m[2]!);
      await db().query(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, card) values ($1, $2, $3, $4, $5, $6)`,
        [`pi_sim_${x.idem}`, x.centavos, x.comision, x.destino, r ? "failed" : "requires_capture", x.pm]);
      return r ? { ok: false, codigo: r, mensaje: traducir(r) } : { ok: true, pi: `pi_sim_${x.idem}`, estado: "retenido", marca: m[1]!, ultimos4: m[2]! };
    }
    if (modoPago() === "apagado") return { ok: false, codigo: "apagado", mensaje: { es: "El pago con tarjeta no está disponible. Paga en el local.", en: "Card payment is not available. Pay at the store." } };
    try {
      const pi = await stripe<{ id: string; status: string; client_secret: string; payment_method?: { card?: { brand?: string; last4?: string } } }>("POST", "/v1/payment_intents", {
        amount: x.centavos, currency: "usd", capture_method: "manual", confirm: true, payment_method: x.pm, customer: x.cliente ?? undefined,
        automatic_payment_methods: { enabled: true, allow_redirects: "never" }, application_fee_amount: x.comision, // tarjeta y billeteras, sin salir de la app transfer_data: { destination: x.destino }, metadata: x.meta, expand: ["payment_method"],
      }, { idem: `ret-${x.idem}` });
      const card = pi.payment_method?.card;
      if (pi.status === "requires_capture") return { ok: true, pi: pi.id, estado: "retenido", marca: card?.brand ?? null, ultimos4: card?.last4 ?? null };
      if (pi.status === "requires_action") return { ok: true, pi: pi.id, estado: "accion", secreto: pi.client_secret, marca: card?.brand ?? null, ultimos4: card?.last4 ?? null };
      return { ok: false, codigo: pi.status, mensaje: traducir(null) };
    } catch (e) {
      const err = e instanceof ErrorStripe ? e : null;
      return { ok: false, codigo: err?.rechazo ?? err?.codigo ?? "error", mensaje: err?.tipo === "red" ? traducir("processing_error") : traducir(err?.rechazo ?? err?.codigo ?? null) };
    }
  },

  /* Cobro directo a To'Latino (suscripción Pro): sin negocio de destino, con la tarjeta guardada del que paga, fuera de
     sesión. Idempotente por `idem` (un cobro por período). */
  async cobrarDirecto(x: { centavos: number; pm: string; cliente?: string | null; idem: string; meta: Record<string, string> }): Promise<{ ok: true; id: string } | { ok: false; codigo: string; mensaje: { es: string; en: string } }> {
    if (modoPago() === "simulador") {
      const m = SIM_PM.exec(x.pm);
      if (!m) return { ok: false, codigo: "card_declined", mensaje: traducir("card_declined") };
      const id = `pi_sim_${x.idem}`, ya = (await db().query<{ status: string }>(`select status from sim_intents where id = $1`, [id])).rows[0];
      if (ya) return ya.status === "succeeded" ? { ok: true, id } : { ok: false, codigo: "card_declined", mensaje: traducir("card_declined") };
      const r = simRechazo(m[2]!);
      await db().query(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, card) values ($1, $2, 0, 'tolatino', $3, $4, $5)`, [id, x.centavos, r ? "failed" : "succeeded", r ? 0 : x.centavos, x.pm]);
      return r ? { ok: false, codigo: r, mensaje: traducir(r) } : { ok: true, id };
    }
    if (modoPago() === "apagado") return { ok: false, codigo: "apagado", mensaje: { es: "El cobro con tarjeta no está disponible.", en: "Card charging is not available." } };
    try {
      const pi = await stripe<{ id: string; status: string }>("POST", "/v1/payment_intents", {
        amount: x.centavos, currency: "usd", customer: x.cliente ?? undefined, payment_method: x.pm, off_session: true, confirm: true, metadata: x.meta,
      }, { idem: `dir-${x.idem}` });
      return pi.status === "succeeded" ? { ok: true, id: pi.id } : { ok: false, codigo: pi.status, mensaje: traducir(null) };
    } catch (e) {
      const err = e instanceof ErrorStripe ? e : null;
      return { ok: false, codigo: err?.rechazo ?? err?.codigo ?? "error", mensaje: traducir(err?.rechazo ?? err?.codigo ?? null) };
    }
  },

  /* Cobrar lo retenido (el negocio aceptó). Idempotente: si ya se cobró, no vuelve a cobrar. */
  async cobrar(pi: string, centavos: number, comision: number): Promise<{ ok: boolean; codigo?: string }> {
    if (pi.startsWith("pi_sim_")) {
      const r = await db().query(`update sim_intents set status = 'succeeded', captured_cents = $2, fee_cents = $3 where id = $1 and status in ('requires_capture', 'succeeded')`, [pi, centavos, comision]);
      return { ok: !!r.rowCount };
    }
    try { await stripe("POST", `/v1/payment_intents/${encodeURIComponent(pi)}/capture`, { amount_to_capture: centavos, application_fee_amount: comision }, { idem: `cob-${pi}` }); return { ok: true }; }
    catch (e) { if (e instanceof ErrorStripe && e.codigo === "payment_intent_unexpected_state") return { ok: true }; return { ok: false, codigo: e instanceof ErrorStripe ? e.codigo ?? e.tipo : "error" }; }
  },

  /* Liberar lo retenido sin cobrar (no se dio el pedido). */
  async liberar(pi: string): Promise<{ ok: boolean }> {
    if (pi.startsWith("pi_sim_")) { await db().query(`update sim_intents set status = 'canceled' where id = $1 and status = 'requires_capture'`, [pi]); return { ok: true }; }
    try { await stripe("POST", `/v1/payment_intents/${encodeURIComponent(pi)}/cancel`, {}, { idem: `lib-${pi}` }); return { ok: true }; }
    catch (e) { return { ok: e instanceof ErrorStripe && e.codigo === "payment_intent_unexpected_state" }; }
  },

  /* Devolver (total o parcial) lo cobrado. La transferencia al negocio se revierte en proporción y la comisión también. */
  async devolver(pi: string, centavos: number, idem: string): Promise<{ ok: boolean; id?: string; codigo?: string }> {
    if (pi.startsWith("pi_sim_")) {
      const r = await db().query(`update sim_intents set refunded_cents = refunded_cents + $2 where id = $1 and status = 'succeeded' and refunded_cents + $2 <= captured_cents`, [pi, centavos]);
      return r.rowCount ? { ok: true, id: `re_sim_${idem}` } : { ok: false, codigo: "amount_too_large" };
    }
    try {
      const r = await stripe<{ id: string }>("POST", "/v1/refunds", { payment_intent: pi, amount: centavos, reverse_transfer: true, refund_application_fee: true }, { idem: `dev-${idem}` });
      return { ok: true, id: r.id };
    } catch (e) { return { ok: false, codigo: e instanceof ErrorStripe ? e.codigo ?? e.tipo : "error" }; }
  },

  /* ── Cuentas de cobro (Connect Express) ── */
  /* `clave` = el negocio (su cuenta) o «m-<miembro>» (la cuenta propia de una silla rentada, 3d). */
  async cuentaCrear(clave: string, nombre: string, o: { mcc?: string; meta?: Record<string, string> } = {}): Promise<string> {
    if (modoPago() === "simulador") return `acct_sim_${clave}`;
    const a = await stripe<{ id: string }>("POST", "/v1/accounts", {
      type: "express", country: "US", capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      business_type: "individual", business_profile: { name: nombre, mcc: o.mcc ?? "5812" }, metadata: o.meta ?? { business_id: clave },
    }, { idem: `acct-${clave}` });
    return a.id;
  },
  async cuentaEnlace(cuenta: string, volver: string, otraVez: string): Promise<string> {
    if (cuenta.startsWith("acct_sim_")) return `/api/pagos/simulador/alta?cuenta=${encodeURIComponent(cuenta)}&volver=${encodeURIComponent(volver)}`;
    const l = await stripe<{ url: string }>("POST", "/v1/account_links", { account: cuenta, type: "account_onboarding", return_url: volver, refresh_url: otraVez });
    return l.url;
  },
  async cuentaPanel(cuenta: string): Promise<string | null> {
    if (cuenta.startsWith("acct_sim_")) return null;
    const l = await stripe<{ url: string }>("POST", `/v1/accounts/${encodeURIComponent(cuenta)}/login_links`, {});
    return l.url;
  },
  /* Disputas (contracargos). Responder: la evidencia va en un solo envío (submit). Aceptar: se cierra y el banco devuelve.
     En el simulador (dp_sim_…) no hay banco: la app guarda el estado. */
  async disputaResponder(id: string, e: { texto: string; producto: string; cliente: string; fecha: string; envio?: string | null }): Promise<boolean> {
    if (id.startsWith("dp_sim_") || modoPago() === "simulador") return true;
    try {
      await stripe("POST", `/v1/disputes/${encodeURIComponent(id)}`, { evidence: evidenciaStripe(e), submit: true }, { idem: `dpr-${id}` });
      return true;
    } catch { return false; }
  },
  async disputaAceptar(id: string): Promise<boolean> {
    if (id.startsWith("dp_sim_") || modoPago() === "simulador") return true;
    try { await stripe("POST", `/v1/disputes/${encodeURIComponent(id)}/close`, {}, { idem: `dpc-${id}` }); return true; }
    catch (e) { return e instanceof ErrorStripe && /closed|already/i.test(e.message); }
  },
  /* Pausar o reanudar los pagos al banco (Super Admin). Con Stripe el calendario pasa a manual y vuelve a semanal (martes);
     en el simulador basta la marca en stripe_accounts. */
  async cuentaPagos(cuenta: string, pausar: boolean): Promise<boolean> {
    if (cuenta.startsWith("acct_sim_")) return true;
    try {
      await stripe("POST", `/v1/accounts/${encodeURIComponent(cuenta)}`, { settings: { payouts: { schedule: pausar ? { interval: "manual" } : { interval: "weekly", weekly_anchor: "tuesday" } } } });
      return true;
    } catch { return false; }
  },
  async cuentaLeer(cuenta: string): Promise<EstadoCuenta | null> {
    if (cuenta.startsWith("acct_sim_")) return null; // el simulador escribe el estado al completar el alta
    const a = await stripe<{ charges_enabled: boolean; payouts_enabled: boolean; requirements?: { currently_due?: string[] }; external_accounts?: { data?: { last4?: string }[] } }>(
      "GET", `/v1/accounts/${encodeURIComponent(cuenta)}`);
    return { cargos: a.charges_enabled, pagos: a.payouts_enabled, pide: a.requirements?.currently_due ?? [], banco: a.external_accounts?.data?.[0]?.last4 ?? null };
  },

  /* Cliente de Stripe de la persona (para guardar tarjetas). */
  async cliente(userId: string): Promise<string | null> {
    if (modoPago() !== "stripe") return null;
    const ya = (await db().query<{ c: string | null }>(`select stripe_customer_id as c from users where id = $1`, [userId])).rows[0]?.c;
    if (ya) return ya;
    const c = await stripe<{ id: string }>("POST", "/v1/customers", { metadata: { user_id: userId } }, { idem: `cus-${userId}` });
    await db().query(`update users set stripe_customer_id = $2 where id = $1 and stripe_customer_id is null`, [userId, c.id]);
    return c.id;
  },
  simId,
};
