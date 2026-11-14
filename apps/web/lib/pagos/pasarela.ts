import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db, tx } from "../db";
import { ENTORNO } from "../entorno";
import { ErrorStripe, stripe, stripeArchivo } from "./stripe";
/* 8i · Una cuenta de revisión de Apple o Google no paga con tarjeta: cada cobro con la tarjeta de la persona lo pregunta primero (guardián revisionAcotada). */
const pagoRevision = async () => (await import("../tiendas/revision")).pagoBloqueado();
class SinSaldoSim extends Error {}

/* La pasarela de pagos: Stripe de verdad (con STRIPE_SECRET_KEY) o el simulador propio del sandbox (sin clave). El resto
   de la app no sabe cuál corre. CANDADO: en producción el simulador no existe; sin clave, la tarjeta queda apagada. */
export type ModoPago = "stripe" | "simulador" | "apagado";
export function modoPago(): ModoPago {
  if (process.env.STRIPE_SECRET_KEY) return "stripe";
  return ENTORNO === "produccion" ? "apagado" : "simulador";
}
if (ENTORNO === "produccion" && process.env.TOLATINO_PAGOS_SIMULADOR === "1") throw new Error("CANDADO: el simulador de pagos no puede existir en producción.");

export type Retencion = { ok: true; pi: string; estado: "retenido" | "accion"; secreto?: string; marca: string | null; ultimos4: string | null; huella?: string | null; verificar?: Verificar }
  | { ok: false; codigo: string; mensaje: { es: string; en: string } };
/* 9k · 3-D Secure: lo que la hoja necesita para completar la verificación del banco (Stripe.js handleNextAction, o confirmCardPayment con la tarjeta
   guardada en una renovación fuera de sesión; en el sandbox, la verificación simulada). El monto es solo para mostrarlo: lo decidió el servidor. */
export type Verificar = { pi: string; secreto: string; monto: number; pm: string | null; vence: string; renovacion: boolean };
/* Quién paga (para guardar la verificación pendiente a su nombre: solo esa persona la completa). Sin esto, un «requires_action» sigue como antes. */
export type Quien = { id: string; negocio?: string | null; ciudad?: string | null };
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
/* 9k · 4000 0027 6000 3184: el banco SIEMPRE pide 3-D Secure (como la tarjeta de prueba de Stripe). */
const SIM_3DS = "3184";
/* 9k · La huella simulada (card.fingerprint): la misma marca y los mismos 4 dan la misma huella en cualquier cuenta, como una tarjeta física. */
export const huellaSim = (marca: string, l4: string) => `fpsim${createHash("sha256").update(`tl-sim-card:${marca}:${l4}`).digest("hex").slice(0, 20)}`;
const huellaDePm = (pm: string) => { const m = SIM_PM.exec(pm); return m ? huellaSim(m[1]!, m[2]!) : null; };
const secretoSim = (pi: string) => `${pi}_secret_sim`;

/* 9k · La verificación pendiente o hecha de este cobro (por la llave que manda el flujo). */
async function accionPrevia(base: string) {
  return (await db().query<{ pi: string; status: string; viva: boolean; n: number; vence: string; pm: string | null; monto: number }>(
    `select pi, status, expires_at > now() as viva, (select count(*)::int from payment_actions where base_idem = $1::text) as n, pm, amount_cents as monto,
            to_char(expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as vence
       from payment_actions where base_idem = $1::text order by created_at desc limit 1`, [base])).rows[0] ?? null;
}
async function registrarAccion(x: { pi: string; base: string; idem: string; quien: Quien; kind: "en_sesion" | "renovacion"; monto: number; pm: string | null; secreto: string; minutos?: number }): Promise<Verificar> {
  const r = (await db().query<{ vence: string }>(
    `insert into payment_actions (pi, base_idem, idem, user_id, business_id, city_id, kind, amount_cents, pm, expires_at)
     values ($1::text, $2::text, $3::text, $4::uuid, $5::text, $6::text, $7::text, $8::int, $9::text, now() + make_interval(mins => coalesce($10::int, cfg_int('verificacion_min'))))
     on conflict (pi) do update set pi = excluded.pi
     returning to_char(expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as vence`,
    [x.pi, x.base, x.idem, x.quien.id, x.quien.negocio ?? null, x.quien.ciudad ?? null, x.kind, x.monto, x.pm && /^pm_[A-Za-z0-9_]{3,200}$/.test(x.pm) ? x.pm : null, x.minutos ?? null])).rows[0]!;
  return { pi: x.pi, secreto: x.secreto, monto: x.monto, pm: x.pm, vence: r.vence, renovacion: x.kind === "renovacion" };
}
export { registrarAccion };
const VERIFICAR_MSG = { es: "Tu banco pide confirmar que eres tú. Confírmalo para seguir.", en: "Your bank asks you to confirm it is you. Confirm it to continue." };
const simId = (p: string) => `${p}_sim_${randomBytes(9).toString("hex")}`;

// fuera: la persona no está en la app (renovar una retención de más de 7 días con su tarjeta guardada).
type InRetener = { centavos: number; comision: number; destino: string; pm: string; cliente?: string | null; idem: string; meta: Record<string, string>; fuera?: boolean; usuario?: Quien };
/* La evidencia de una disputa con los nombres de campo de Stripe (la prueba de contrato los compara con el objeto disputa
   de la especificación: stripe-mock no valida los campos dentro de «evidence»). */
export type ArchivosEvidencia = { recibo?: string; conversacion?: string; entrega?: string; otro?: string };
export function evidenciaStripe(e: { texto: string; producto: string; cliente: string; fecha: string; envio?: string | null; archivos?: ArchivosEvidencia }) {
  const a = e.archivos ?? {};
  // 9k · Los archivos subidos por la API de archivos (file_…): recibo, conversación con el cliente y la constancia de entrega.
  return { uncategorized_text: e.texto.slice(0, 20000), product_description: e.producto.slice(0, 20000), customer_name: e.cliente, service_date: e.fecha, ...(e.envio ? { shipping_address: e.envio.slice(0, 500) } : {}),
    ...(a.recibo ? { receipt: a.recibo } : {}), ...(a.conversacion ? { customer_communication: a.conversacion } : {}), ...(a.entrega ? { shipping_documentation: a.entrega } : {}), ...(a.otro ? { uncategorized_file: a.otro } : {}) };
}
export const pasarela = {
  modo: modoPago,

  async retener(x: InRetener): Promise<Retencion> {
    { const rv = await pagoRevision(); if (rv) return { ok: false, codigo: "revision", mensaje: rv }; }
    // 9k · 3-D Secure: si este mismo cobro ya pidió verificar, se sigue donde quedó (pendiente → la hoja otra vez; verificada → retenido, sin cobrar
    // otra vez); si venció o falló, es un intento nuevo con otra llave.
    const v = await this.verificacionPrevia(x.idem, !!x.usuario);
    if (v && "r" in v) return v.r;
    const idem = v?.idem ?? x.idem;
    if (modoPago() === "simulador") {
      const m = SIM_PM.exec(x.pm);
      if (!m) return { ok: false, codigo: "card_declined", mensaje: { es: "Esa tarjeta no es de prueba. En el sandbox usa 4242 4242 4242 4242.", en: "That is not a test card. In the sandbox use 4242 4242 4242 4242." } };
      const id = `pi_sim_${idem}`, h = huellaSim(m[1]!, m[2]!);
      const ya = (await db().query<{ id: string; status: string }>(`select id, status from sim_intents where id = $1`, [id])).rows[0];
      if (ya && ya.status !== "requires_action") return ya.status === "failed" ? { ok: false, codigo: "card_declined", mensaje: traducir("card_declined") } : { ok: true, pi: ya.id, estado: "retenido", marca: m[1]!, ultimos4: m[2]!, huella: h };
      const r = simRechazo(m[2]!), pide = m[2] === SIM_3DS;
      if (!ya) await db().query(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, card) values ($1, $2, $3, $4, $5, $6)`,
        [id, x.centavos, x.comision, x.destino, r ? "failed" : pide ? "requires_action" : "requires_capture", x.pm]);
      if (r) return { ok: false, codigo: r, mensaje: traducir(r) };
      if (pide) return { ok: true, pi: id, estado: "accion", secreto: secretoSim(id), marca: m[1]!, ultimos4: m[2]!, huella: h,
        verificar: x.usuario ? await registrarAccion({ pi: id, base: x.idem, idem, quien: x.usuario, kind: "en_sesion", monto: x.centavos, pm: x.pm, secreto: secretoSim(id) }) : undefined };
      return { ok: true, pi: id, estado: "retenido", marca: m[1]!, ultimos4: m[2]!, huella: h };
    }
    if (modoPago() === "apagado") return { ok: false, codigo: "apagado", mensaje: { es: "El pago con tarjeta no está disponible. Paga en el local.", en: "Card payment is not available. Pay at the store." } };
    try {
      const pi = await stripe<{ id: string; status: string; client_secret: string; payment_method?: { card?: { brand?: string; last4?: string; fingerprint?: string } } }>("POST", "/v1/payment_intents", {
        amount: x.centavos, currency: "usd", capture_method: "manual", confirm: true, payment_method: x.pm, customer: x.cliente ?? undefined, off_session: x.fuera ? true : undefined,
        // Tarjeta y billeteras, sin salir de la app. El dinero va al negocio (destino) y To'Latino cobra su comisión.
        automatic_payment_methods: { enabled: true, allow_redirects: "never" }, application_fee_amount: x.comision, transfer_data: { destination: x.destino }, metadata: x.meta, expand: ["payment_method"],
      }, { idem: `ret-${idem}` });
      const card = pi.payment_method?.card;
      if (pi.status === "requires_capture") return { ok: true, pi: pi.id, estado: "retenido", marca: card?.brand ?? null, ultimos4: card?.last4 ?? null, huella: card?.fingerprint ?? null };
      if (pi.status === "requires_action") return { ok: true, pi: pi.id, estado: "accion", secreto: pi.client_secret, marca: card?.brand ?? null, ultimos4: card?.last4 ?? null, huella: card?.fingerprint ?? null,
        verificar: x.usuario ? await registrarAccion({ pi: pi.id, base: x.idem, idem, quien: x.usuario, kind: "en_sesion", monto: x.centavos, pm: x.pm, secreto: pi.client_secret }) : undefined };
      return { ok: false, codigo: pi.status, mensaje: traducir(null) };
    } catch (e) {
      const err = e instanceof ErrorStripe ? e : null;
      return { ok: false, codigo: err?.rechazo ?? err?.codigo ?? "error", mensaje: err?.tipo === "red" ? traducir("processing_error") : traducir(err?.rechazo ?? err?.codigo ?? null) };
    }
  },

  /* 6c · Boletos: el cobro queda en la plataforma (sin destino ni comisión en el cargo) con `transfer_group` = el evento; al
     organizador se le transfiere después de la fecha, neto de comisión (6e). Así cancelar siempre devuelve el 100 % (fase6 §3, §6 #2).
     Retener (captura manual) y luego capturar, como el resto de la app; idempotente por `idem` (el apartado y la tarjeta). */
  async retenerPlataforma(x: { centavos: number; pm: string; cliente?: string | null; idem: string; grupo: string; meta: Record<string, string>; usuario?: Quien }): Promise<Retencion> {
    { const rv = await pagoRevision(); if (rv) return { ok: false, codigo: "revision", mensaje: rv }; }
    const v = await this.verificacionPrevia(x.idem, !!x.usuario);
    if (v && "r" in v) return v.r;
    const idem = v?.idem ?? x.idem;
    if (modoPago() === "simulador") {
      const m = SIM_PM.exec(x.pm);
      if (!m) return { ok: false, codigo: "card_declined", mensaje: { es: "Esa tarjeta no es de prueba. En el sandbox usa 4242 4242 4242 4242.", en: "That is not a test card. In the sandbox use 4242 4242 4242 4242." } };
      const id = `pi_sim_${idem}`, h = huellaSim(m[1]!, m[2]!);
      const ya = (await db().query<{ status: string }>(`select status from sim_intents where id = $1`, [id])).rows[0];
      if (ya && ya.status !== "requires_action") return ya.status === "failed" ? { ok: false, codigo: "card_declined", mensaje: traducir("card_declined") } : { ok: true, pi: id, estado: "retenido", marca: m[1]!, ultimos4: m[2]!, huella: h };
      const r = simRechazo(m[2]!), pide = m[2] === SIM_3DS;
      if (!ya) await db().query(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, card) values ($1, $2, 0, 'tolatino', $3, $4) on conflict (id) do nothing`,
        [id, x.centavos, r ? "failed" : pide ? "requires_action" : "requires_capture", x.pm]);
      if (r) return { ok: false, codigo: r, mensaje: traducir(r) };
      if (pide) return { ok: true, pi: id, estado: "accion", secreto: secretoSim(id), marca: m[1]!, ultimos4: m[2]!, huella: h,
        verificar: x.usuario ? await registrarAccion({ pi: id, base: x.idem, idem, quien: x.usuario, kind: "en_sesion", monto: x.centavos, pm: x.pm, secreto: secretoSim(id) }) : undefined };
      return { ok: true, pi: id, estado: "retenido", marca: m[1]!, ultimos4: m[2]!, huella: h };
    }
    if (modoPago() === "apagado") return { ok: false, codigo: "apagado", mensaje: { es: "El pago con tarjeta no está disponible.", en: "Card payment is not available." } };
    try {
      const pi = await stripe<{ id: string; status: string; client_secret: string; payment_method?: { card?: { brand?: string; last4?: string; fingerprint?: string } } }>("POST", "/v1/payment_intents", {
        amount: x.centavos, currency: "usd", capture_method: "manual", confirm: true, payment_method: x.pm, customer: x.cliente ?? undefined,
        automatic_payment_methods: { enabled: true, allow_redirects: "never" }, transfer_group: x.grupo, metadata: x.meta, expand: ["payment_method"],
      }, { idem: `bol-${idem}` });
      const card = pi.payment_method?.card;
      if (pi.status === "requires_capture") return { ok: true, pi: pi.id, estado: "retenido", marca: card?.brand ?? null, ultimos4: card?.last4 ?? null, huella: card?.fingerprint ?? null };
      if (pi.status === "requires_action") return { ok: true, pi: pi.id, estado: "accion", secreto: pi.client_secret, marca: card?.brand ?? null, ultimos4: card?.last4 ?? null, huella: card?.fingerprint ?? null,
        verificar: x.usuario ? await registrarAccion({ pi: pi.id, base: x.idem, idem, quien: x.usuario, kind: "en_sesion", monto: x.centavos, pm: x.pm, secreto: pi.client_secret }) : undefined };
      return { ok: false, codigo: pi.status, mensaje: traducir(null) };
    } catch (e) {
      const err = e instanceof ErrorStripe ? e : null;
      return { ok: false, codigo: err?.rechazo ?? err?.codigo ?? "error", mensaje: err?.tipo === "red" ? traducir("processing_error") : traducir(err?.rechazo ?? err?.codigo ?? null) };
    }
  },
  /* Capturar lo retenido de un cobro de la plataforma (sin comisión en la captura: no hay destino). Idempotente. */
  async capturarPlataforma(pi: string, centavos: number): Promise<{ ok: boolean; codigo?: string }> {
    if (pi.startsWith("pi_sim_")) {
      const r = await db().query(`update sim_intents set status = 'succeeded', captured_cents = $2 where id = $1 and status in ('requires_capture', 'succeeded')`, [pi, centavos]);
      return { ok: !!r.rowCount };
    }
    try { await stripe("POST", `/v1/payment_intents/${encodeURIComponent(pi)}/capture`, { amount_to_capture: centavos }, { idem: `cap-${pi}` }); return { ok: true }; }
    catch (e) {
      // Ya capturado (repetido) = bien; cancelado o vencido = no se cobró (se mira el estado, nunca se supone).
      if (e instanceof ErrorStripe && e.codigo === "payment_intent_unexpected_state") {
        const x = await stripe<{ status: string }>("GET", `/v1/payment_intents/${encodeURIComponent(pi)}`).catch(() => null);
        return x?.status === "succeeded" ? { ok: true } : { ok: false, codigo: x?.status ?? "unexpected_state" };
      }
      return { ok: false, codigo: e instanceof ErrorStripe ? e.codigo ?? e.tipo : "error" };
    }
  },

  /* 6e · La liquidación del martes: transferir lo del organizador desde el saldo de la plataforma a su cuenta conectada (Stripe Transfers),
     con el `transfer_group` del evento. Idempotente por `idem` (la llave de la liquidación de esa fecha: una sola transferencia por fecha,
     también en el simulador). El monto lo decide la base (event_settlements); aquí solo se manda. */
  async transferir(x: { centavos: number; destino: string; grupo: string; idem: string; meta: Record<string, string> }): Promise<{ ok: boolean; id?: string; codigo?: string }> {
    // Una cuenta simulada solo recibe del simulador, y el simulador solo paga a cuentas simuladas.
    if ((modoPago() === "simulador") !== x.destino.startsWith("acct_sim_")) return { ok: false, codigo: "modo" };
    if (modoPago() === "simulador") {
      const id = `tr_sim_${x.idem}`.slice(0, 200);
      await db().query(`insert into sim_transfers (id, destination, amount_cents, transfer_group) values ($1, $2, $3, $4) on conflict (id) do nothing`, [id, x.destino, x.centavos, x.grupo]);
      const t = (await db().query<{ amount_cents: number; destination: string }>(`select amount_cents, destination from sim_transfers where id = $1`, [id])).rows[0];
      // La misma llave con otro monto o destino es un error (como Stripe con Idempotency-Key).
      return t && t.amount_cents === x.centavos && t.destination === x.destino ? { ok: true, id } : { ok: false, codigo: "idempotency_error" };
    }
    if (modoPago() === "apagado") return { ok: false, codigo: "apagado" };
    try {
      const t = await stripe<{ id: string }>("POST", "/v1/transfers", { amount: x.centavos, currency: "usd", destination: x.destino, transfer_group: x.grupo, metadata: x.meta }, { idem: x.idem });
      return { ok: true, id: t.id };
    } catch (e) { return { ok: false, codigo: e instanceof ErrorStripe ? e.codigo ?? e.tipo : "error" }; }
  },
  /* 6e · Revertir (parte de) una transferencia: un ajuste después de pagar que no tiene liquidación siguiente donde descontarse. */
  async revertirTransferencia(transfer: string, centavos: number, idem: string): Promise<{ ok: boolean; id?: string; codigo?: string }> {
    if (transfer.startsWith("tr_sim_")) {
      const id = `trr_sim_${idem}`.slice(0, 200);
      const r = await tx(async (c) => {
        const nueva = (await c.query(`insert into sim_transfer_reversals (id, transfer_id, amount_cents) values ($1, $2, $3) on conflict (id) do nothing returning id`, [id, transfer, centavos])).rowCount;
        if (!nueva) return (await c.query<{ amount_cents: number }>(`select amount_cents from sim_transfer_reversals where id = $1`, [id])).rows[0]?.amount_cents === centavos;
        const u = await c.query(`update sim_transfers set reversed_cents = reversed_cents + $2 where id = $1 and reversed_cents + $2 <= amount_cents`, [transfer, centavos]);
        if (!u.rowCount) throw new SinSaldoSim();
        return true;
      }).catch((e) => { if (e instanceof SinSaldoSim) return false; throw e; });
      return r ? { ok: true, id } : { ok: false, codigo: "amount_too_large" };
    }
    try {
      const r = await stripe<{ id: string }>("POST", `/v1/transfers/${encodeURIComponent(transfer)}/reversals`, { amount: centavos }, { idem });
      return { ok: true, id: r.id };
    } catch (e) { return { ok: false, codigo: e instanceof ErrorStripe ? e.codigo ?? e.tipo : "error" }; }
  },

  /* Cobro directo a To'Latino (suscripción Pro): sin negocio de destino, con la tarjeta guardada del que paga, fuera de
     sesión. Idempotente por `idem` (un cobro por período). */
  async cobrarDirecto(x: { centavos: number; pm: string; cliente?: string | null; idem: string; meta: Record<string, string> }): Promise<{ ok: true; id: string } | { ok: false; codigo: string; mensaje: { es: string; en: string }; pi?: string; secreto?: string }> {
    { const rv = await pagoRevision(); if (rv) return { ok: false, codigo: "revision", mensaje: rv }; }
    if (modoPago() === "simulador") {
      const m = SIM_PM.exec(x.pm);
      if (!m) return { ok: false, codigo: "card_declined", mensaje: traducir("card_declined") };
      const id = `pi_sim_${x.idem}`, ya = (await db().query<{ status: string }>(`select status from sim_intents where id = $1`, [id])).rows[0];
      if (ya) return ya.status === "succeeded" ? { ok: true, id } : ya.status === "requires_action" ? { ok: false, codigo: "authentication_required", mensaje: VERIFICAR_MSG, pi: id, secreto: secretoSim(id) } : { ok: false, codigo: "card_declined", mensaje: traducir("card_declined") };
      // 9k · Fuera de sesión con 3-D Secure: el banco pide al dueño confirmar (la renovación lo avisa con un enlace a la hoja).
      const r = simRechazo(m[2]!), pide = m[2] === SIM_3DS;
      await db().query(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, card, capture_method) values ($1, $2, 0, 'tolatino', $3, $4, $5, 'automatic')`,
        [id, x.centavos, r ? "failed" : pide ? "requires_action" : "succeeded", r || pide ? 0 : x.centavos, x.pm]);
      return r ? { ok: false, codigo: r, mensaje: traducir(r) } : pide ? { ok: false, codigo: "authentication_required", mensaje: VERIFICAR_MSG, pi: id, secreto: secretoSim(id) } : { ok: true, id };
    }
    if (modoPago() === "apagado") return { ok: false, codigo: "apagado", mensaje: { es: "El cobro con tarjeta no está disponible.", en: "Card charging is not available." } };
    try {
      const pi = await stripe<{ id: string; status: string; client_secret?: string }>("POST", "/v1/payment_intents", {
        amount: x.centavos, currency: "usd", customer: x.cliente ?? undefined, payment_method: x.pm, off_session: true, confirm: true, metadata: x.meta,
      }, { idem: `dir-${x.idem}` });
      if (pi.status === "requires_action") return { ok: false, codigo: "authentication_required", mensaje: VERIFICAR_MSG, pi: pi.id, secreto: pi.client_secret };
      return pi.status === "succeeded" ? { ok: true, id: pi.id } : { ok: false, codigo: pi.status, mensaje: traducir(null) };
    } catch (e) {
      const err = e instanceof ErrorStripe ? e : null;
      // Fuera de sesión, el banco que pide autenticar responde «authentication_required» con el PaymentIntent: el dueño lo confirma con su tarjeta.
      if (err?.codigo === "authentication_required" && err.intento?.id) return { ok: false, codigo: "authentication_required", mensaje: VERIFICAR_MSG, pi: err.intento.id, secreto: err.intento.client_secret };
      return { ok: false, codigo: err?.rechazo ?? err?.codigo ?? "error", mensaje: traducir(err?.rechazo ?? err?.codigo ?? null) };
    }
  },

  /* Cobro fuera de sesión para un negocio (el plan de cada mes): captura automática con la tarjeta guardada, la comisión
     de To'Latino y el resto al negocio. Idempotente por `idem` (un cobro por período). */
  async cobrarFuera(x: { centavos: number; comision: number; destino: string; pm: string; cliente?: string | null; idem: string; meta: Record<string, string> }): Promise<{ ok: true; id: string; marca: string | null; ultimos4: string | null } | { ok: false; codigo: string; mensaje: { es: string; en: string } }> {
    { const rv = await pagoRevision(); if (rv) return { ok: false, codigo: "revision", mensaje: rv }; }
    if (modoPago() === "simulador") {
      const m = SIM_PM.exec(x.pm);
      if (!m) return { ok: false, codigo: "card_declined", mensaje: traducir("card_declined") };
      const id = `pi_sim_${x.idem}`, ya = (await db().query<{ status: string }>(`select status from sim_intents where id = $1`, [id])).rows[0];
      if (ya) return ya.status === "succeeded" ? { ok: true, id, marca: m[1]!, ultimos4: m[2]! } : { ok: false, codigo: "card_declined", mensaje: traducir("card_declined") };
      const r = simRechazo(m[2]!);
      await db().query(`insert into sim_intents (id, amount_cents, fee_cents, destination, status, captured_cents, card) values ($1, $2, $3, $4, $5, $6, $7)`, [id, x.centavos, x.comision, x.destino, r ? "failed" : "succeeded", r ? 0 : x.centavos, x.pm]);
      return r ? { ok: false, codigo: r, mensaje: traducir(r) } : { ok: true, id, marca: m[1]!, ultimos4: m[2]! };
    }
    if (modoPago() === "apagado") return { ok: false, codigo: "apagado", mensaje: { es: "El cobro con tarjeta no está disponible.", en: "Card charging is not available." } };
    try {
      const pi = await stripe<{ id: string; status: string; payment_method?: { card?: { brand?: string; last4?: string } } }>("POST", "/v1/payment_intents", {
        amount: x.centavos, currency: "usd", customer: x.cliente ?? undefined, payment_method: x.pm, off_session: true, confirm: true,
        application_fee_amount: x.comision, transfer_data: { destination: x.destino }, metadata: x.meta, expand: ["payment_method"],
      }, { idem: `fue-${x.idem}` });
      const card = pi.payment_method?.card;
      return pi.status === "succeeded" ? { ok: true, id: pi.id, marca: card?.brand ?? null, ultimos4: card?.last4 ?? null } : { ok: false, codigo: pi.status, mensaje: traducir(null) };
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
    if (pi.startsWith("pi_sim_")) { await db().query(`update sim_intents set status = 'canceled' where id = $1 and status in ('requires_capture', 'requires_action')`, [pi]); return { ok: true }; }
    try { await stripe("POST", `/v1/payment_intents/${encodeURIComponent(pi)}/cancel`, {}, { idem: `lib-${pi}` }); return { ok: true }; }
    catch (e) { return { ok: e instanceof ErrorStripe && e.codigo === "payment_intent_unexpected_state" }; }
  },

  /* Devolver (total o parcial) lo cobrado. La transferencia al negocio se revierte en proporción y la comisión también. */
  /* 6d · `plataforma`: un cobro que quedó en To'Latino (boletos, transfer_group): no hay transferencia ni comisión de destino que revertir.
     El simulador devuelve una sola vez por llave (sim_refunds), como Stripe con la misma Idempotency-Key: reintentar no devuelve dos veces. */
  async devolver(pi: string, centavos: number, idem: string, o: { plataforma?: boolean } = {}): Promise<{ ok: boolean; id?: string; codigo?: string }> {
    if (pi.startsWith("pi_sim_")) {
      const id = `re_sim_${idem}`.slice(0, 200);
      // Primero la llave (on conflict: la segunda vez, o dos a la vez, no devuelve otra vez); luego el saldo, con su tope.
      const r = await tx(async (c) => {
        const nueva = (await c.query(`insert into sim_refunds (id, payment_intent, amount_cents) values ($1, $2, $3) on conflict (id) do nothing returning id`, [id, pi, centavos])).rowCount;
        if (!nueva) return (await c.query<{ amount_cents: number }>(`select amount_cents from sim_refunds where id = $1`, [id])).rows[0]?.amount_cents === centavos;
        const u = await c.query(`update sim_intents set refunded_cents = refunded_cents + $2 where id = $1 and status = 'succeeded' and refunded_cents + $2 <= captured_cents`, [pi, centavos]);
        if (!u.rowCount) throw new SinSaldoSim();
        return true;
      }).catch((e) => { if (e instanceof SinSaldoSim) return false; throw e; });
      return r ? { ok: true, id } : { ok: false, codigo: "amount_too_large" };
    }
    try {
      const r = await stripe<{ id: string }>("POST", "/v1/refunds", o.plataforma ? { payment_intent: pi, amount: centavos } : { payment_intent: pi, amount: centavos, reverse_transfer: true, refund_application_fee: true }, { idem: `dev-${idem}` });
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
      // 9k · Los pagos al banco, fijos los martes (decisión del fundador; Configuración › Dinero «pagos_banco_dia»).
      settings: { payouts: { schedule: { interval: "weekly", weekly_anchor: "tuesday" } } },
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
  async disputaResponder(id: string, e: { texto: string; producto: string; cliente: string; fecha: string; envio?: string | null; archivos?: ArchivosEvidencia }): Promise<boolean> {
    if (id.startsWith("dp_sim_") || modoPago() === "simulador") {
      // 9k · El «banco» del sandbox recibe lo mismo que Stripe (campos y archivos) y pasa a revisar.
      if (!id.startsWith("dp_sim_")) return true;
      await db().query(`insert into sim_dispute_submissions (dispute_id, evidence) values ($1, $2::jsonb)`, [id, JSON.stringify(evidenciaStripe(e))]);
      await db().query(`update sim_disputes set status = 'under_review' where id = $1 and status = 'needs_response'`, [id]);
      return true;
    }
    try {
      await stripe("POST", `/v1/disputes/${encodeURIComponent(id)}`, { evidence: evidenciaStripe(e), submit: true }, { idem: `dpr-${id}` });
      return true;
    } catch { return false; }
  },
  async disputaAceptar(id: string): Promise<boolean> {
    if (id.startsWith("dp_sim_") || modoPago() === "simulador") { if (id.startsWith("dp_sim_")) await db().query(`update sim_disputes set status = 'lost' where id = $1 and status in ('needs_response', 'under_review')`, [id]); return true; }
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

  /* ── 9k · 3-D Secure ── */
  /* La verificación previa del mismo cobro (por la llave del flujo). `r`: lo que se contesta sin volver a cobrar; `idem`: la llave nueva si la
     anterior venció o falló. Sin quien paga (un flujo que todavía no completa la verificación), nada cambia. */
  async verificacionPrevia(base: string, conQuien: boolean): Promise<{ r: Retencion } | { idem: string } | null> {
    if (!conQuien || modoPago() === "apagado") return null;
    const a = await accionPrevia(base);
    if (!a) return null;
    if (a.status === "pendiente" || a.status === "verificada") {
      const s = await this.intento(a.pi);
      if (s?.estado === "requires_capture") return { r: { ok: true, pi: a.pi, estado: "retenido", marca: s.marca, ultimos4: s.ultimos4, huella: s.huella } };
      if (a.status === "pendiente" && a.viva && (s?.estado === "requires_action" || s?.estado === "requires_payment_method")) {
        const secreto = s.secreto ?? secretoSim(a.pi);
        return { r: { ok: true, pi: a.pi, estado: "accion", secreto, marca: s.marca, ultimos4: s.ultimos4, huella: s.huella, verificar: { pi: a.pi, secreto, monto: a.monto, pm: a.pm, vence: a.vence, renovacion: false } } };
      }
    }
    return { idem: `${base}-v${a.n}` };
  },
  /* El estado de un PaymentIntent (después de la verificación, o para conciliar uno suelto). Se mira; nunca se supone. */
  async intento(pi: string): Promise<{ estado: string; monto: number; capturado: number; secreto: string | null; marca: string | null; ultimos4: string | null; huella: string | null } | null> {
    if (pi.startsWith("pi_sim_")) {
      const s = (await db().query<{ status: string; amount_cents: number; captured_cents: number; card: string }>(`select status, amount_cents, captured_cents, card from sim_intents where id = $1`, [pi])).rows[0];
      if (!s) return null;
      const m = SIM_PM.exec(s.card);
      return { estado: s.status, monto: s.amount_cents, capturado: s.captured_cents, secreto: secretoSim(pi), marca: m?.[1] ?? null, ultimos4: m?.[2] ?? null, huella: huellaDePm(s.card) };
    }
    if (modoPago() !== "stripe") return null;
    try {
      const x = await stripe<{ status: string; amount: number; amount_received: number; client_secret: string; payment_method?: { card?: { brand?: string; last4?: string; fingerprint?: string } } }>(
        "GET", `/v1/payment_intents/${encodeURIComponent(pi)}`, { expand: ["payment_method"] });
      const c = x.payment_method?.card;
      return { estado: x.status, monto: x.amount, capturado: x.amount_received, secreto: x.client_secret, marca: c?.brand ?? null, ultimos4: c?.last4 ?? null, huella: c?.fingerprint ?? null };
    } catch { return null; }
  },
  /* Sandbox: el «banco» del simulador contesta la verificación (la hoja la muestra como la de un banco). Solo pasa de requires_action a retenido
     (o cobrado, si era un cobro automático) o a rechazado; nunca en producción ni con Stripe de verdad. */
  async simBanco(pi: string, aprobar: boolean): Promise<boolean> {
    if (modoPago() !== "simulador" || !pi.startsWith("pi_sim_")) return false;
    const r = await db().query(
      `update sim_intents set status = case when not $2::boolean then 'failed' when capture_method = 'automatic' then 'succeeded' else 'requires_capture' end,
              captured_cents = case when $2::boolean and capture_method = 'automatic' then amount_cents else captured_cents end
        where id = $1::text and status = 'requires_action'`, [pi, aprobar]);
    return !!r.rowCount;
  },

  /* ── 9k · La huella de la tarjeta (card.fingerprint) ── */
  async huella(pm: string): Promise<string | null> {
    const s = huellaDePm(pm);
    if (s) return s;
    if (modoPago() !== "stripe" || !/^pm_[A-Za-z0-9]{6,60}$/.test(pm)) return null;
    try { return (await stripe<{ card?: { fingerprint?: string } }>("GET", `/v1/payment_methods/${encodeURIComponent(pm)}`)).card?.fingerprint ?? null; }
    catch { return null; }
  },

  /* ── 9k · Disputas: archivos de evidencia (API de archivos, purpose dispute_evidence) y el «banco» del sandbox ── */
  async subirEvidencia(x: { cuerpo: Buffer; nombre: string; tipo: string; idem: string; sim: boolean }): Promise<{ ok: true; id: string } | { ok: false }> {
    const sha = createHash("sha256").update(x.cuerpo).digest("hex");
    if (x.sim || modoPago() === "simulador") {
      if (modoPago() !== "simulador") return { ok: false };
      const id = `file_sim_${sha.slice(0, 24)}`;
      await db().query(`insert into sim_files (id, purpose, bytes, sha256) values ($1, 'dispute_evidence', $2, $3) on conflict (id) do nothing`, [id, x.cuerpo.length, sha]);
      return { ok: true, id };
    }
    try { return { ok: true, id: (await stripeArchivo({ cuerpo: x.cuerpo, nombre: x.nombre, tipo: x.tipo, idem: x.idem })).id }; }
    catch { return { ok: false }; }
  },
  async simDisputa(id: string, pi: string, centavos: number, estado: "needs_response" | "won" | "lost"): Promise<void> {
    if (modoPago() !== "simulador" || !id.startsWith("dp_sim_")) return;
    await db().query(`insert into sim_disputes (id, payment_intent, amount_cents, status) values ($1, $2, $3, $4) on conflict (id) do update set status = excluded.status`, [id, pi, centavos, estado]);
  },

  /* ── 9k · Pagos al banco del sandbox: el martes, cada cuenta simulada (no pausada) cobra su saldo (lo capturado neto de comisión y devoluciones,
     más lo transferido neto de reversiones, menos lo ya pagado). Una vez por cuenta y fecha, como Stripe con su calendario. ── */
  async simPagarAlBanco(cuentas: string[], dia: string): Promise<{ id: string; destino: string; centavos: number; nuevo: boolean }[]> {
    if (modoPago() !== "simulador" || !cuentas.length || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return [];
    const r = await db().query<{ id: string; destino: string; centavos: number; nuevo: boolean }>(
      `with c as (select unnest($1::text[]) as a),
            s as (select c.a,
                         coalesce((select sum((i.captured_cents - i.refunded_cents) - (i.fee_cents::bigint * (i.captured_cents - i.refunded_cents) / nullif(i.captured_cents, 0)))
                                     from sim_intents i where i.destination = c.a and i.status = 'succeeded' and i.captured_cents > 0), 0)
                         + coalesce((select sum(t.amount_cents - t.reversed_cents) from sim_transfers t where t.destination = c.a), 0)
                         - coalesce((select sum(p.amount_cents) from sim_payouts p where p.destination = c.a and p.status <> 'failed'), 0) as saldo
                    from c where c.a ~ '^acct_sim_'),
            n as (insert into sim_payouts (id, destination, amount_cents, arrival_date)
                  select 'po_sim_' || substr(md5(s.a), 1, 16) || '_' || replace($2::text, '-', ''), s.a, s.saldo::int, $2::date + 2 from s where s.saldo > 0
                  on conflict (id) do nothing returning id, destination, amount_cents)
       select id, destination as destino, amount_cents as centavos, true as nuevo from n
       union all
       select p.id, p.destination, p.amount_cents, false from sim_payouts p
        where p.id in (select 'po_sim_' || substr(md5(a), 1, 16) || '_' || replace($2::text, '-', '') from c) and p.id not in (select id from n)`,
      [cuentas, dia]);
    return r.rows;
  },

  /* ── 9k · Conciliación: lo que dice «Stripe» de un día (UTC). Con Stripe de verdad, la API (paginada de 100 en 100; los payouts, por cuenta
     conectada con su cabecera); en el sandbox, el simulador. Solo lectura. ── */
  async delDia(desde: Date, hasta: Date, cuentas: string[]): Promise<LadoStripe> {
    if (modoPago() === "simulador") {
      const q = <T extends Record<string, unknown>>(s: string) => db().query<T>(s, [desde.toISOString(), hasta.toISOString()]).then((r) => r.rows);
      const [I, R, T, V, P, D] = await Promise.all([
        q<{ id: string; monto: number; capturado: number; devuelto: number; estado: string }>(`select id, amount_cents as monto, captured_cents as capturado, refunded_cents as devuelto, status as estado from sim_intents where created_at >= $1::timestamptz and created_at < $2::timestamptz`),
        q<{ id: string; pi: string; monto: number }>(`select id, payment_intent as pi, amount_cents as monto from sim_refunds where created_at >= $1::timestamptz and created_at < $2::timestamptz`),
        q<{ id: string; destino: string; monto: number; revertido: number }>(`select id, destination as destino, amount_cents as monto, reversed_cents as revertido from sim_transfers where created_at >= $1::timestamptz and created_at < $2::timestamptz`),
        q<{ id: string; transfer: string; monto: number }>(`select id, transfer_id as transfer, amount_cents as monto from sim_transfer_reversals where created_at >= $1::timestamptz and created_at < $2::timestamptz`),
        q<{ id: string; cuenta: string; monto: number; estado: string }>(`select id, destination as cuenta, amount_cents as monto, status as estado from sim_payouts where created_at >= $1::timestamptz and created_at < $2::timestamptz`),
        q<{ id: string; pi: string; monto: number; estado: string }>(`select id, payment_intent as pi, amount_cents as monto, status as estado from sim_disputes where created_at >= $1::timestamptz and created_at < $2::timestamptz`),
      ]);
      return { intents: I, refunds: R, transfers: T, reversals: V, payouts: P, disputes: D };
    }
    if (modoPago() !== "stripe") return { intents: [], refunds: [], transfers: [], reversals: [], payouts: [], disputes: [] };
    const rango = { gte: Math.floor(desde.getTime() / 1000), lt: Math.floor(hasta.getTime() / 1000) };
    const todo = async <T extends { id: string }>(ruta: string, extra: Record<string, unknown> = {}, cuenta?: string): Promise<T[]> => {
      const out: T[] = [];
      let tras: string | undefined;
      for (let i = 0; i < 1000; i++) {
        const p = await stripe<{ data: T[]; has_more: boolean }>("GET", ruta, { limit: 100, created: rango, ...(tras ? { starting_after: tras } : {}), ...extra }, cuenta ? { cuenta } : {});
        out.push(...p.data);
        if (!p.has_more || !p.data.length) break;
        tras = p.data[p.data.length - 1]!.id;
      }
      return out;
    };
    const [I, R, T, D] = await Promise.all([
      todo<{ id: string; amount: number; amount_received: number; status: string; latest_charge?: { amount_refunded?: number } | string | null }>("/v1/payment_intents", { expand: ["data.latest_charge"] }),
      todo<{ id: string; payment_intent: string | null; amount: number; status: string }>("/v1/refunds"),
      todo<{ id: string; destination: string; amount: number; amount_reversed: number; reversals?: { data?: { id: string; amount: number; created: number }[] } }>("/v1/transfers"),
      todo<{ id: string; payment_intent: string | null; amount: number; status: string }>("/v1/disputes"),
    ]);
    const P: LadoStripe["payouts"] = [];
    for (const a of cuentas.filter((x) => /^acct_[A-Za-z0-9]+$/.test(x))) for (const p of await todo<{ id: string; amount: number; status: string }>("/v1/payouts", {}, a)) P.push({ id: p.id, cuenta: a, monto: p.amount, estado: p.status });
    return {
      intents: I.map((x) => ({ id: x.id, monto: x.amount, capturado: x.amount_received, devuelto: typeof x.latest_charge === "object" && x.latest_charge ? x.latest_charge.amount_refunded ?? 0 : 0, estado: x.status })),
      refunds: R.filter((x) => x.status !== "failed" && x.status !== "canceled").map((x) => ({ id: x.id, pi: x.payment_intent ?? "", monto: x.amount })),
      transfers: T.map((x) => ({ id: x.id, destino: x.destination, monto: x.amount, revertido: x.amount_reversed })),
      reversals: T.flatMap((x) => (x.reversals?.data ?? []).filter((v) => v.created >= rango.gte && v.created < rango.lt).map((v) => ({ id: v.id, transfer: x.id, monto: v.amount }))),
      payouts: P,
      disputes: D.map((x) => ({ id: x.id, pi: x.payment_intent ?? "", monto: x.amount, estado: x.status })),
    };
  },
};
/* Lo que dice «Stripe» de un día, para la conciliación (lib/conciliacion.ts compara cada objeto con el libro propio). */
export type LadoStripe = {
  intents: { id: string; monto: number; capturado: number; devuelto: number; estado: string }[];
  refunds: { id: string; pi: string; monto: number }[];
  transfers: { id: string; destino: string; monto: number; revertido: number }[];
  reversals: { id: string; transfer: string; monto: number }[];
  payouts: { id: string; cuenta: string; monto: number; estado: string }[];
  disputes: { id: string; pi: string; monto: number; estado: string }[];
};

