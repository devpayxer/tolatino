import "server-only";
import type { PoolClient } from "pg";
import { db, tx, type AlGuardar } from "./db";
import { pasarela, type Retencion } from "./pagos/pasarela";
import { soloLectura } from "./vista-equipo";

/* Cobros con tarjeta de un pedido (Payment). Reglas (Super Admin › Planes › Comisiones, dash2-pay.js):
   - Se RETIENE el total al enviar; se COBRA cuando el negocio acepta (o al instante si acepta solo); se LIBERA completo si
     no se da (no lo acepta en 10 min, lo rechaza o el cliente cancela antes); se DEVUELVE total o parcial después.
   - Comisión de To'Latino: pedidos 10 % del subtotal (envío y propina van íntegros al negocio); el cargo de la tarjeta sale
     de la comisión. La regla vigente vive en fee_rules (nunca en el código del cliente).
   - El servidor decide los montos; cada movimiento es idempotente; si una llamada a la pasarela falla, `repararPagos` lo
     vuelve a intentar la próxima vez que alguien mira ese negocio (y el guardián del dinero lo reporta). */
type Q = PoolClient | ReturnType<typeof db>;

export async function comision(c: Q, kind: "ped" | "cita" | "bol" | "apt" | "rsv" | "plan" | "renta" | "merc" | "fiesta" | "viaje" | "noche" | "insc" | "evp", subtotal: number, n = 1): Promise<number> {
  const r = (await c.query<{ rate_bp: number; fixed_cents: number }>(
    `select rate_bp, fixed_cents from fee_rules where kind = $1 and effective_from <= now() order by effective_from desc, id desc limit 1`, [kind])).rows[0];
  if (!r) return 0;
  return Math.max(0, Math.round((subtotal * r.rate_bp) / 10000) + r.fixed_cents * n);
}

/* ¿Este negocio cobra con tarjeta ahora? Cuenta de cobro habilitada + interruptor del panel + pasarela disponible. */
export async function tarjetaDe(negocio: string): Promise<{ on: boolean; cuenta: string | null }> {
  const r = (await db().query<{ acct: string; on: boolean }>(
    `select a.stripe_account_id as acct, (a.charges_enabled and coalesce(d.pay_card, false)) as on from stripe_accounts a left join delivery_settings d on d.business_id = a.business_id
      where a.business_id = $1`, [negocio])).rows[0];
  if (!r || pasarela.modo() === "apagado") return { on: false, cuenta: null };
  // Una cuenta simulada solo cobra en el sandbox; una real, solo con la clave de Stripe.
  const sim = r.acct.startsWith("acct_sim_");
  if (sim !== (pasarela.modo() === "simulador")) return { on: false, cuenta: null };
  return { on: r.on, cuenta: r.acct };
}

/* Dentro de la transacción del pedido: retiene el total en la tarjeta. Idempotente por la clave del pedido. */
export async function retenerPedido(x: { negocio: string; cuenta: string; clave: string; total: number; subtotal: number; pm: string; userId: string; numero: string; tipo?: "ped" | "merc" | "apt" }, c: Q): Promise<Retencion & { comision: number }> {
  const fee = Math.min(await comision(c, x.tipo ?? "ped", x.subtotal), x.total);
  const cliente = await pasarela.cliente(x.userId).catch(() => null);
  // 9k · Con quien paga: si el banco pide 3-D Secure, la verificación queda a su nombre y la pantalla la completa en la hoja (lib/pagos/verificacion.ts).
  const r = await pasarela.retener({ centavos: x.total, comision: fee, destino: x.cuenta, pm: x.pm, cliente, idem: `ord-${x.clave}-${x.pm.slice(-24)}` /* otra tarjeta = otro intento; la misma = idempotente */, meta: { order: x.numero, business_id: x.negocio }, usuario: { id: x.userId, negocio: x.negocio } });
  return { ...r, comision: fee };
}
export async function registrarRetencion(c: Q, x: { opId: string; userId: string; negocio: string; city: string | null; total: number; comision: number; r: Extract<Retencion, { ok: true }>; pm?: string; kind?: "full" | "deposit" | "extra" }) {
  await c.query(
    `insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, simulated, payment_method, card_fingerprint)
     values ($1::bigint, $2, $3, $4, $11, 'card', $5, $6, $6, $7, 'held', $8, $9, now(), $10, $12, $13)`,
    [x.opId, x.userId, x.negocio, x.city, x.r.pi, x.total, x.comision, x.r.marca, x.r.ultimos4, x.r.pi.startsWith("pi_sim_"), x.kind ?? "full", x.pm && /^pm_[A-Za-z0-9_]{3,200}$/.test(x.pm) ? x.pm : null,
     x.r.huella && /^[A-Za-z0-9_]{6,64}$/.test(x.r.huella) ? x.r.huella : null]);
  await c.query(`update operations set pay_status = 'held' where id = $1::bigint`, [x.opId]);
  // La última tarjeta guardada que pagó queda como predeterminada (la que se rechazó deja de serlo).
  if (x.pm) await c.query(`update payment_methods set is_default = (stripe_pm_id = $2) where user_id = $1 and status = 'active' and exists (select 1 from payment_methods where user_id = $1 and stripe_pm_id = $2)`, [x.userId, x.pm]);
}

async function evento(c: Q, opId: string, kind: string, note: { es: string; en: string }) {
  await c.query(`insert into operation_events (operation_id, kind, actor, note) values ($1::bigint, $2, 'system', $3::jsonb)`, [opId, kind, JSON.stringify(note)]);
}
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
/* Cómo se nombra y a dónde lleva una operación en los avisos de dinero: pedido #1051 o cita C-4801. */
const refDe = (kind: string, num: string) => kind === "appointment"
  ? { num, href: `/cita/${num}`, ref: ["appointment", num] as [string, string] }
  : kind === "market_order" ? { num, href: `/mercado/${num}`, ref: ["order", num] as [string, string] }
  : kind === "hold" ? { num, href: `/apartado/${num}`, ref: ["apartado", num] as [string, string] }
  : kind === "party" ? { num, href: `/fiesta/${num}`, ref: ["party", num] as [string, string] }
  : kind === "trip" ? { num, href: `/viaje/${num}`, ref: ["trip", num] as [string, string] }
  : kind === "night" ? { num, href: `/noche/${num}`, ref: ["night", num] as [string, string] }
  : kind === "tickets" ? { num, href: `/eventos/orden/${num}`, ref: ["tickets", num] as [string, string] }
  : kind === "private_event" ? { num, href: `/privado/${num}`, ref: ["private_event", num] as [string, string] }
  : { num: `#${num}`, href: `/pedido/${num}`, ref: ["order", num] as [string, string] };

/* Cobrar lo retenido de una operación (el negocio aceptó). */
export async function cobrarOperacion(opId: string) {
  const p = (await db().query<{ id: string; pi: string; amount: number; fee: number }>(
    `select id::text, stripe_payment_intent as pi, amount_cents as amount, fee_cents as fee from payments where operation_id = $1::bigint and kind in ('full', 'deposit') and status = 'held'`, [opId])).rows[0];
  if (!p) return;
  const r = await pasarela.cobrar(p.pi, p.amount, p.fee);
  if (!r.ok) { await db().query(`update payments set failure_code = $2, updated_at = now() where id = $1`, [p.id, r.codigo ?? "error"]); return; }
  await tx(async (c) => {
    const u = await c.query(`update payments set status = 'captured', captured_at = now(), failure_code = null, updated_at = now() where id = $1 and status = 'held'`, [p.id]);
    if (!u.rowCount) return;
    await c.query(`update operations set pay_status = 'captured' where id = $1::bigint`, [opId]);
    await evento(c, opId, "payment_captured", { es: `Se cobraron ${money(p.amount)} en la tarjeta`, en: `${money(p.amount)} charged to the card` });
  });
}

/* Liberar lo retenido (el pedido no se dio). Avisa a la persona.
   25 nov (9v, cuarta tanda) · Dice qué pasó: «liberada» (se soltó, aquí o ya lo había hecho otro), «nada» (no había nada retenido) o «fallo» (la pasarela
   no la soltó: sigue retenida; el barrido, repararPagos, la vuelve a soltar). Quien tiene que decirle algo a la persona lo mira (devolverAlCancelar). */
export async function liberarOperacion(opId: string): Promise<"liberada" | "nada" | "fallo"> {
  const p = (await db().query<{ id: string; pi: string; amount: number; uid: string; num: string; kind: string }>(
    `select p.id::text, p.stripe_payment_intent as pi, p.amount_cents as amount, p.user_id::text as uid, o.number as num, o.kind from payments p join operations o on o.id = p.operation_id
      where p.operation_id = $1::bigint and p.kind in ('full', 'deposit') and p.status = 'held'`, [opId])).rows[0];
  if (!p) return "nada";
  const r = await pasarela.liberar(p.pi).catch(() => ({ ok: false }));
  if (!r.ok) return "fallo";
  const hecho = await tx(async (c) => {
    const u = await c.query(`update payments set status = 'released', released_at = now(), updated_at = now() where id = $1 and status = 'held'`, [p.id]);
    if (!u.rowCount) return false;
    await c.query(`update operations set pay_status = 'released' where id = $1::bigint`, [opId]);
    await evento(c, opId, "payment_released", { es: `Se liberaron ${money(p.amount)} retenidos`, en: `${money(p.amount)} held was released` });
    return true;
  });
  const R = refDe(p.kind, p.num);
  if (hecho) await (await import("./avisos")).avisar(p.uid, "pay_released", { monto: money(p.amount), num: R.num }, { href: R.href, ref: R.ref });
  return "liberada";
}

/* 25 nov (9v, quinta tanda) · Soltar lo retenido y decir qué pasó, para TODO el que suelta (vence, «No hay mesa», «No me sirve», el mercado no acepta, el
   apartado se cancela, el barrido): «liberada» (se soltó, aquí o ya lo había hecho otro), «nada» (no había nada retenido) o «retenida» (la pasarela no la
   soltó: sigue en la tarjeta; el barrido, repararPagos, la vuelve a soltar). Si quedó retenida, UNA alerta hold_stuck al equipo de dinero por cobro (sujeto
   liberar:<cobro>; se cierra sola cuando el cobro deja de estar retenido: dinero-alertas › cerrarAlertasResueltas). Antes cada uno tiraba lo que contestaba
   liberarOperacion y el aviso decía «Se liberó tu depósito» aunque Stripe no la hubiera soltado. Quien avisa lo mira (lib/devolucion-cancelar.ts ›
   sinSoltarCliente / sinSoltarNegocio). Guardián devueltoSoloSiSalio (11). */
export async function soltarRetencion(opId: string, motivo: Msg): Promise<import("./devolucion-cancelar").Soltada> {
  const l = await liberarOperacion(opId);
  if (l !== "fallo") return { e: l, monto: 0 };
  // La pasarela no soltó la retención: sigue en la tarjeta (el barrido, repararPagos, la vuelve a soltar). El equipo de dinero lo sabe, una vez por cobro.
  const h = (await db().query<{ id: string; amt: number; biz: string | null; city: string | null }>(
    `select y.id::text, y.amount_cents as amt, y.business_id as biz, y.city_id as city from payments y where y.operation_id = $1::bigint and y.kind in ('full', 'deposit') and y.status = 'held' order by y.id limit 1`, [opId])).rows[0];
  if (!h) return { e: "liberada", monto: 0 };
  await (await import("./dinero-alertas")).alertar("hold_stuck", `liberar:${h.id}`, { monto: h.amt, negocio: h.biz, ciudad: h.city, detalle: {
    es: `${motivo.es}: no se pudo soltar la retención de ${money(h.amt)} (Stripe no la soltó). No se cobró nada; el barrido la sigue soltando: si no se suelta, suéltala desde Stripe.`,
    en: `${motivo.en}: the ${money(h.amt)} hold could not be released (Stripe did not release it). Nothing was charged; the sweep keeps releasing it: if it does not come off, release it from Stripe.` } }).catch(() => undefined);
  return { e: "retenida", monto: h.amt };
}

/* 25 nov (regla 13) · La captura de una cancelación TARDE de lo retenido (el viaje, el evento privado) lanzó (la pasarela no contestó o falló): el
   llamador ya leyó la base y soltó la retención (o lo intentó). Queda en el registro y el equipo de dinero lo sabe, una vez por cobro: hold_stuck con
   sujeto captura:<cobro>, que no se cierra solo (alguien mira en Stripe que la captura de verdad no salió; si salió, el libro dice soltada con el dinero
   cobrado). Nunca tira: es el rastro de un fallo, no un paso del flujo. */
export async function alertarCapturaTarde(opId: string, numero: string, err: unknown, d: import("./devolucion-cancelar").DevCancelar | null) {
  const msg = String((err as Error)?.message ?? err).slice(0, 200);
  console.error(`[captura tarde] ${numero} (operación ${opId}): ${msg}`);
  try {
    const p = (await db().query<{ id: string; amt: number; biz: string | null; city: string | null }>(
      `select y.id::text, y.amount_cents as amt, y.business_id as biz, y.city_id as city from payments y where y.operation_id = $1::bigint and y.kind in ('full', 'deposit') order by y.id limit 1`, [opId])).rows[0];
    if (!p) return;
    await (await import("./dinero-alertas")).alertar("hold_stuck", `captura:${p.id}`, { monto: p.amt, negocio: p.biz, ciudad: p.city, detalle: d?.e === "liberada" ? {
      es: `${numero}: la captura tarde no salió (${msg}): se soltó la retención de ${money(p.amt)} y no se cobró nada. Revisa en Stripe que la captura no haya salido.`,
      en: `${numero}: the late capture did not go through (${msg}): the ${money(p.amt)} hold was released and nothing was charged. Check in Stripe that the capture did not go through.` }
      : d?.e === "retenida" ? {
      es: `${numero}: la captura tarde no salió (${msg}) y la retención de ${money(p.amt)} no se soltó todavía: el barrido la sigue soltando. Revisa el cobro en Stripe.`,
      en: `${numero}: the late capture did not go through (${msg}) and the ${money(p.amt)} hold has not been released yet: the sweep keeps releasing it. Check the charge in Stripe.` } : {
      es: `${numero}: la captura tarde dio error (${msg}); la base dice que el cobro de ${money(p.amt)} ya no está retenido. Revisa en Stripe qué pasó con él.`,
      en: `${numero}: the late capture failed (${msg}); the books say the ${money(p.amt)} charge is no longer on hold. Check in Stripe what happened to it.` } });
  } catch (e) { console.error(`[captura tarde] ${numero}: la alerta no se anotó: ${String((e as Error)?.message ?? e).slice(0, 200)}`); }
}

/* El motivo de la alerta hold_stuck cuando la suelta un barrido (nadie la pidió en ese momento). */
export const SWEEP: Msg = { es: "El barrido de pagos", en: "The payments sweep" };

/* Repara lo que quedó a medias (una llamada a la pasarela que falló): retenido de un pedido que ya no se da → liberar;
   retenido de uno aceptado → cobrar. Una solicitud con otra hora propuesta (change_proposed) sigue VIVA: su retención no se
   toca (4v: se liberaba el depósito mientras el cliente decidía; guardián reparaVivas). Barato: índice por negocio y solo los retenidos. */
export async function repararPagos(negocio: string) {
  if (soloLectura()) return; // 9n-23 · la vista del equipo (solo lectura) no cobra ni libera nada al mirar: lo hace el barrido de cada minuto
  const L = (await db().query<{ op: string; st: string }>(
    `select p.operation_id::text as op, o.status as st from payments p join operations o on o.id = p.operation_id
      where p.business_id = $1 and p.status = 'held' and o.status not in ('pending', 'change_proposed') and o.kind not in ('market_order', 'hold', 'tickets')
      order by p.held_at nulls first, p.id limit 20`, [negocio])).rows;
  // 9t9 · Cada cobro y cada paso por su cuenta (lib/barrido-uno.ts), lo más viejo primero: uno que falla no deja a los demás (ni al mercado, la tienda o
  // los estimados) sin reparar; al final, un solo error que dice cuáles.
  const B = new (await import("./barrido-uno")).Fallos(`pagos.reparar ${negocio}`);
  await B.cada(L, (x) => `op ${x.op}`, async (x) => {
    if (x.st === "confirmed" || x.st === "done") await cobrarOperacion(x.op);
    // Sigue retenida: la alerta hold_stuck ya la tiene el equipo (soltarRetencion) y el próximo barrido la vuelve a soltar.
    else if ((await soltarRetencion(x.op, SWEEP)).e === "retenida") return;
  });
  // Pedido del mercado (4p): nunca se captura lo retenido completo; se cobra lo que pesó (liquidarMercado) o se libera.
  await B.uno("mercado", async () => (await import("./mercado")).repararMercado(negocio));
  // Envío de la tienda (4q-2): se cobra lo que se envió (cobrarApartado), nunca lo retenido completo; o se libera.
  await B.uno("apartados", async () => (await import("./apartados")).repararApartados(negocio));
  // Auto y Hogar (4d): estimado y «algo más» (liquidaciones a medias, retenciones que vencen).
  await B.uno("estimados", async () => (await import("./estimados")).repararEstimados(negocio));
  B.fin();
}

/* Devolver dinero de un cobro (total o parcial). Lo hace el negocio (desde su pedido) o To'Latino (Soporte o
   Transacciones) o una política (cancelar a tiempo). Idempotente por `idem`. La comisión baja en proporción.
   21 nov (9t) · SIEMPRE en dos pasos, como los boletos (6d) y Soporte (support_refunds): la pasarela nunca va antes que la base.
   (1) anotarDevolucionPago, en una transacción con el cobro bloqueado: la devolución queda 'pending' con su llave (la base no deja que lo
       pendiente + lo hecho pase de lo cobrado: refunds_tope) y la auditoría de quien decide (alGuardar) entra ahí mismo.
   (2) ejecutarDevolucionPago: la pasarela con la MISMA llave (la misma llave nunca devuelve dos veces). El «sí» se cierra en otra transacción
       ('done', payments, la operación, una vez: update … where status = 'pending'). Un «no» de la pasarela la deja 'failed' y su saldo libre
       (la llave queda libre para otro intento). Sin respuesta (red, error de Stripe), sigue 'pending' y el barrido la vuelve a preguntar.
   Si el proceso muere entre (1) y (2) o entre el «sí» y el cierre, barrerDevolucionesPago la termina con la misma llave. */
type Msg = { es: string; en: string };
export type ResDevolucion = { ok: true } | { ok: false; msg: Msg; enCamino?: true };
type InDevolver = { paymentId: string; centavos: number; por: "business" | "admin" | "policy"; actorId: string | null; motivo: string; idem: string;
  /* 0209 · «Devolver otra vez» unos boletos: la devolución fallida de la que es (la base lo comprueba: refunds_otra_vez). */
  otraVezDe?: string;
  /* 9v · Nadie mira una pantalla que la pueda repetir (el negocio canceló y el sistema devuelve: devolverAlCancelar): un «no» de Stripe alerta al equipo. */
  nadieMira?: boolean };
const STRIPE_NO: Msg = { es: "Stripe no pudo hacer la devolución. Prueba de nuevo en un momento.", en: "Stripe could not make the refund. Try again in a moment." };
const enCamino = (n: number): Msg => ({ es: `Stripe no contestó. La devolución de ${money(n)} quedó en camino y se termina sola en unos minutos: no la repitas.`,
  en: `Stripe did not answer. The ${money(n)} refund is on its way and finishes by itself in a few minutes: do not repeat it.` });
/* Lo que la pasarela contesta SIN decir si devolvió (sin respuesta, error de Stripe, otra llamada con la misma llave en curso): la devolución
   sigue pendiente y se vuelve a preguntar con la misma llave. Cualquier otro código es un «no» de verdad. */
const SIN_RESPUESTA = new Set(["red", "api_error", "error", "rate_limit", "rate_limit_error", "lock_timeout", "idempotency_key_in_use", "idempotency_error"]);
/* Stripe guarda la respuesta de una llave 24 h: después, preguntar con la misma llave ya no es seguro (podría devolver otra vez). */
const HORAS_LLAVE = 23;

/* Paso 1, dentro de la transacción de quien llama. Devuelve la devolución (nueva o la que ya tenía esa llave). */
export async function anotarDevolucionPago(c: PoolClient, x: InDevolver, alGuardar?: AlGuardar<{ pago: string; centavos: number }>):
  Promise<{ ok: true; id: string; monto: number; estado: "pending" | "done" | "manual" } | { ok: false; msg: Msg }> {
  // Primero el candado del cobro; lo pendiente se suma DESPUÉS, en otra consulta: la que espera el candado ve así lo que la otra acaba de anotar
  // (una subconsulta en la misma sentencia del `for update` miraría la foto de antes de esperar).
  const p0 = (await c.query<{ id: string; amount: number; refunded: number; status: string }>(
    `select p.id::text, p.amount_cents as amount, p.refunded_cents as refunded, p.status from payments p where p.id = $1::bigint for update`, [x.paymentId])).rows[0];
  if (!p0) return { ok: false, msg: { es: "Ese cobro no existe.", en: "That charge does not exist." } };
  const p = { ...p0, refunded: p0.refunded + (await c.query<{ n: number }>(`select coalesce(sum(amount_cents), 0)::int as n from refunds where payment_id = $1::bigint and status = 'pending'`, [p0.id])).rows[0]!.n };
  // La misma llave = la misma devolución (hecha, en camino o resuelta a mano): no se anota ni se audita otra vez.
  const ya = (await c.query<{ id: string; st: string; amt: number; pid: string; mano: boolean }>(
    `select id::text, status as st, amount_cents as amt, payment_id::text as pid, manual_at is not null as mano from refunds where idem_key = $1`, [x.idem])).rows[0];
  if (ya) {
    if (ya.pid !== p.id || ya.st === "failed") return { ok: false, msg: { es: "Esa devolución ya no vale. Actualiza la pantalla.", en: "That refund is no longer valid. Refresh the screen." } };
    return { ok: true, id: ya.id, monto: ya.amt, estado: ya.mano ? "manual" : ya.st === "done" ? "done" : "pending" };
  }
  if (!["captured", "partially_refunded"].includes(p.status)) return { ok: false, msg: { es: "Solo se devuelve lo que ya se cobró.", en: "Only charged money can be refunded." } };
  const n = Math.round(x.centavos);
  // 6d · Lo pendiente ya cuenta (refunded suma las pendientes, también las de boletos).
  if (!(n > 0) || n > p.amount - p.refunded) return { ok: false, msg: { es: `Puedes devolver hasta ${money(p.amount - p.refunded)}.`, en: `You can refund up to ${money(p.amount - p.refunded)}.` } };
  // Otra devolución de este cobro (no de boletos) sigue en camino: hasta que termine no sale otra con otra llave (sin respuesta de Stripe, la
  // pantalla puede repetir con otra llave: sería devolver dos veces).
  const otra = (await c.query<{ amt: number }>(
    `select r.amount_cents as amt from refunds r where r.payment_id = $1::bigint and r.status = 'pending' and r.manual_at is null
        and not exists (select 1 from ticket_refund_lines l where l.refund_id = r.id) order by r.id limit 1`, [p.id])).rows[0];
  if (otra) return { ok: false, msg: { es: `Hay una devolución de ${money(otra.amt)} en camino para este cobro. Espera a que termine y vuelve a intentarlo.`, en: `A ${money(otra.amt)} refund is on its way for this charge. Wait for it to finish and try again.` } };
  const id = (await c.query<{ id: string }>(
    `insert into refunds (payment_id, amount_cents, reason, initiated_by, actor_id, status, idem_key, retry_of) values ($1::bigint, $2, $3, $4, $5, 'pending', $6, $7::bigint) returning id::text`,
    [p.id, n, x.motivo.slice(0, 300), x.por, x.actorId, x.idem, x.otraVezDe ?? null])).rows[0]!.id;
  await alGuardar?.(c, { pago: p.id, centavos: n });
  return { ok: true, id, monto: n, estado: "pending" };
}

/* Paso 2: la pasarela con la llave de la devolución y su cierre. Lo llama devolverPago (y quien anotó en su propia transacción) y el barrido.
   21 nov (9t2) · Pasadas HORAS_LLAVE desde que se anotó, Stripe ya no recuerda la llave: preguntar otra vez podría devolver dos veces. Desde ahí
   nadie la vuelve a mandar (ni el barrido ni un segundo toque de Colas o Soporte): queda en camino y el equipo de dinero la resuelve (alerta).
   alCerrar: lo que quien la pidió escribe en la MISMA transacción que la cierra (la respuesta de Soporte). */
export type AlCerrar = (c: PoolClient) => Promise<void>;
const VIEJA: Msg = { es: "Esta devolución lleva más de un día sin respuesta de Stripe: el equipo de dinero la revisa y la resuelve. No la repitas.",
  en: "This refund has had no answer from Stripe for over a day: the money team reviews and resolves it. Do not repeat it." };
/* 9t7 (0206) · La llave que va a Stripe: la de la fila la primera vez; si la consulta dijo que nunca llegó y la llave volvió a valer (key_n), OTRA llave
   (Stripe pudo guardar la respuesta de la anterior): la misma intención, con sus líneas, su caso y su auditoría. */
export const llaveDe = (idem: string, n: number) => (n > 0 ? `${idem}-r${n}` : idem);
export async function ejecutarDevolucionPago(id: string, o: { barrido?: boolean; alCerrar?: AlCerrar; nadieMira?: boolean } = {}): Promise<ResDevolucion> {
  const r = (await db().query<{ id: string; amt: number; idem: string; kn: number; st: string; mano: boolean; vieja: boolean; pi: string; plataforma: boolean; biz: string | null; city: string | null; por: string }>(
    `select r.id::text, r.amount_cents as amt, r.idem_key as idem, r.key_n as kn, r.status as st, r.manual_at is not null as mano, coalesce(r.key_from, r.created_at) <= now() - make_interval(hours => $2::int) as vieja,
            p.stripe_payment_intent as pi, p.transfer_group is not null as plataforma, r.initiated_by as por, p.business_id as biz, p.city_id as city
       from refunds r join payments p on p.id = r.payment_id where r.id = $1::bigint`, [id, HORAS_LLAVE])).rows[0];
  if (!r) return { ok: false, msg: STRIPE_NO };
  // Resuelta a mano (el cliente recibió su dinero fuera de Stripe): nunca se vuelve a pedir a Stripe (sería pagar dos veces).
  if (r.st === "done" || r.mano) return { ok: true };
  if (r.st !== "pending") return { ok: false, msg: STRIPE_NO };
  if (r.vieja) return { ok: false, msg: VIEJA, enCamino: true };
  // 9t7 · Que se manda (sent_at) y con qué dato buscable (gateway_ref), ANTES de la llamada y en una sentencia; el dato, solo la primera vez (un reintento de
  // una que salió sin él va sin él: la misma llave con otros parámetros, Stripe la rechaza).
  const m = (await db().query<{ gref: string | null }>(`update refunds set gateway_ref = case when sent_at is null then 'refunds:' || id else gateway_ref end, sent_at = coalesce(sent_at, now()), last_sent_at = now() where id = $1::bigint and status = 'pending' and manual_at is null returning gateway_ref as gref`, [r.id])).rows[0];
  if (!m) return { ok: false, msg: STRIPE_NO };
  // Un cobro de la plataforma (boletos) no tiene transferencia ni comisión de destino que revertir.
  const g = await pasarela.devolver(r.pi, r.amt, llaveDe(r.idem, r.kn), { plataforma: r.plataforma, ...(m.gref ? { meta: { tl_intencion: m.gref } } : {}) }).catch(() => ({ ok: false as const, id: undefined, codigo: "error" }));
  if (g.ok) return cerrarDevolucionPago(r.id, g.id ?? null, o.alCerrar);
  const codigo = String(g.codigo ?? "error").slice(0, 60);
  if (SIN_RESPUESTA.has(codigo)) {
    await db().query(`update refunds set attempts = least(10000, attempts + 1), last_error = left($2, 120) where id = $1::bigint and status = 'pending' and manual_at is null`, [r.id, codigo]);
    return { ok: false, msg: enCamino(r.amt), enCamino: true };
  }
  await fallarDevolucionPago(r, codigo, o.barrido || o.nadieMira || r.por === "policy" ? "stuck" : null);
  return { ok: false, msg: STRIPE_NO };
}
/* El «no» de Stripe (al mandarla, o lo que dijo la consulta pasada la llave: 9t7), una vez: 'failed' libera el saldo (el tope cuenta solo lo pendiente y lo
   hecho) y su llave, con la fila del caso de Soporte en la misma transacción. alerta: «stuck» cuando nadie mira la pantalla (el barrido, una política);
   «fallida» cuando lo dijo la consulta (alerta refund_failed, con la auditoría del cierre). nunca: la consulta dijo que nunca llegó y el cobro cambió. */
export async function fallarDevolucionPago(r: { id: string; amt: number; idem: string; biz: string | null; city: string | null }, codigo: string, alerta: "stuck" | "fallida" | null, nunca = false): Promise<boolean> {
  const f = await tx(async (c) => {
    // 'failed' libera el saldo (el tope cuenta solo lo pendiente y lo hecho) y su llave (la fila guarda la original con «~fallida-<id>»): el
    // mismo toque otra vez es otro intento, como antes, sin una fila que diga «hecha».
    const u = (await c.query<{ op: string; otra: string | null; raiz: string | null }>(
      `update refunds r set status = 'failed', attempts = least(10000, r.attempts + 1), last_error = left($2, 120), idem_key = left(r.idem_key, 180) || '~fallida-' || r.id::text
         from payments p where r.id = $1::bigint and r.status = 'pending' and r.manual_at is null and p.id = r.payment_id
       returning p.operation_id::text as op, r.retry_of::text as otra, (select split_part(x.idem_key, '~fallida-', 1) from refunds x where x.id = r.lines_of) as raiz`, [r.id, codigo])).rows[0];
    if (u?.otra) {
      // 0209 · La de otra vez de unos boletos: lo que la cancelación del evento contaba vuelve a restarse (devolverOtraVez lo había sumado).
      const cx = /^evtcx-(\d{1,18})-\d{1,18}$/.exec(u.raiz ?? "");
      if (cx) await c.query(`update event_cancellations set refunded_cents = greatest(0, refunded_cents - $2::int) where id = $1::bigint`, [cx[1], r.amt]);
    }
    if (u) {
      await evento(c, u.op, "refund_failed", { es: `Stripe no hizo la devolución de ${money(r.amt)}`, en: `Stripe did not make the ${money(r.amt)} refund` });
      // 9t2 · La fila del caso de Soporte (la misma llave) queda fallida con ella, en la misma transacción: nadie tiene que volver a tocar.
      await c.query(`update support_refunds set status = 'failed', fail_reason = left($2, 200), done_at = now() where idem_key = $1 and status = 'pending'`, [r.idem, STRIPE_NO.es]);
      if (alerta === "fallida") await (await import("./consulta-pasarela")).auditarCierre(c, "refunds", r.id, r.city, { estado: nunca ? "nunca llegó a Stripe y el cobro cambió: no se volvió a mandar" : "fallida", monto: money(r.amt) });
    }
    return u ? { otra: u.otra } : null;
  });
  // 0209 · Una devolución de otra vez de unos boletos que falla tiene SU alerta refund_failed (desde ella se puede devolver otra vez) y la de antes se reabre.
  if (f?.otra) {
    const { alertar, reabrirOtraVez } = await import("./dinero-alertas");
    await alertar("refund_failed", r.id, { monto: r.amt, negocio: r.biz, ciudad: r.city, detalle: {
      es: `La devolución de otra vez de ${money(r.amt)} de unos boletos (la fallida de antes: ${f.otra}) también falló: Stripe dijo que no (${codigo}). Los boletos siguen devueltos y su saldo volvió al cobro: decide con la persona si se le devuelve otra vez.`,
      en: `The ${money(r.amt)} refund made again for some tickets (the earlier failed one: ${f.otra}) also failed: Stripe said no (${codigo}). The tickets stay refunded and the balance is back on the charge: decide with the person whether to refund again.` } }).catch(() => undefined);
    await reabrirOtraVez(f.otra, r.id).catch(() => false);
    if (alerta === "stuck" || alerta === "fallida") return true;
  }
  // Desde el barrido, o en una devolución por política (cancelar a tiempo: la hace el sistema), nadie está mirando la pantalla: el equipo de dinero
  // lo sabe (una vez por devolución).
  if (f && alerta === "stuck") await (await import("./dinero-alertas")).alertar("refund_stuck", r.id, { monto: r.amt, negocio: r.biz, ciudad: r.city,
    detalle: { es: `Devolución de ${money(r.amt)}: al terminarla, Stripe dijo que no (${codigo}). Quedó fallida y su saldo libre: si todavía se debe, devuélvela otra vez.`,
      en: `Refund of ${money(r.amt)}: when finishing it, Stripe said no (${codigo}). It is now failed and its balance free: if it is still owed, refund it again.` } }).catch(() => undefined);
  // 9t7 · Lo dijo la consulta a la pasarela (pasada la llave): la alerta de una devolución que Stripe dio por fallida, una vez.
  if (f && alerta === "fallida") await (await import("./dinero-alertas")).alertar("refund_failed", r.id, { monto: r.amt, negocio: r.biz, ciudad: r.city, detalle: nunca
    ? { es: `Devolución de ${money(r.amt)}: nunca llegó a Stripe y el cobro cambió mientras tanto (se devolvió por otro lado, tiene una disputa o ya no le queda saldo), así que no se volvió a mandar. Quedó fallida y su saldo libre: si todavía se debe, devuélvela otra vez.`,
        en: `Refund of ${money(r.amt)}: it never reached Stripe and the charge changed meanwhile (refunded elsewhere, disputed or no balance left), so it was not sent again. It is now failed and its balance free: if it is still owed, refund it again.` }
    : { es: `Devolución de ${money(r.amt)}: Stripe la tiene como fallida (lo dijo la consulta, pasado un día sin respuesta). Quedó fallida y su saldo libre: si todavía se debe, devuélvela otra vez.`,
        en: `Refund of ${money(r.amt)}: Stripe has it as failed (the query said so, after a day with no answer). It is now failed and its balance free: if it is still owed, refund it again.` } }).catch(() => undefined);
  return !!f;
}

/* 9v (25 nov) · Lo que de verdad pasa con las devoluciones de una operación, para que su pantalla no diga «Te devolvemos todo» sin mirar: en camino (pendiente:
   Stripe no contestó y el barrido la sigue mandando con la misma llave) y fallida (Stripe dijo que no y nadie la volvió a hacer ni la resolvió a mano). Lo
   hecho ya lo dice refunded_cents (devueltoDelLibro). Guardián devueltoSoloSiSalio. */
export async function devolucionesDe(opId: string): Promise<{ camino: number; fallida: number }> {
  return (await db().query<{ camino: number; fallida: number }>(
    `select coalesce(sum(r.amount_cents) filter (where r.status = 'pending'), 0)::int as camino,
            coalesce(sum(r.amount_cents) filter (where r.status = 'failed' and r.manual_at is null and not exists (select 1 from refunds y where y.retry_of = r.id)), 0)::int as fallida
       from refunds r join payments p on p.id = r.payment_id where p.operation_id = $1::bigint`, [opId])).rows[0] ?? { camino: 0, fallida: 0 };
}

/* Lo devuelto de un cobro sale del libro (la suma de las devoluciones hechas), nunca de sumar otra vez: si el webhook charge.refunded ya lo había
   contado (greatest), no se cuenta dos veces. La usan el cierre de aquí y el de los boletos (lib/boletos-despues.ts). */
export async function devueltoDelLibro(c: Q, pid: string): Promise<{ st: string; op: string }> {
  return (await c.query<{ st: string; op: string }>(
    `with x as (select coalesce(sum(amount_cents), 0)::int as hecho from refunds where payment_id = $1::bigint and status = 'done')
     update payments p set refunded_cents = least(p.amount_cents, greatest(p.refunded_cents, x.hecho)),
            status = case when least(p.amount_cents, greatest(p.refunded_cents, x.hecho)) >= p.amount_cents then 'refunded' else 'partially_refunded' end, updated_at = now()
       from x where p.id = $1::bigint returning p.status as st, p.operation_id::text as op`, [pid])).rows[0]!;
}

/* El «sí» de la pasarela, en su transacción y una sola vez (lo devuelto, de devueltoDelLibro). Avisa a la persona solo quien la cierra.
   9t2 · En la MISMA transacción se cierra lo que esa devolución deja hecho en su caso (cerrarDelCaso, por su llave), la cierre quien la cierre:
   quien la pidió o el barrido. Lo del caso va ANTES del cobro (el mismo orden de candados que al anotar: el caso y después el cobro). */
/* 9t7 · porConsulta: la cerró lo que dijo la consulta a la pasarela (pasada la llave): su auditoría de sistema en la misma transacción. */
export async function cerrarDevolucionPago(id: string, stripeId: string | null, alCerrar?: AlCerrar, porConsulta = false): Promise<ResDevolucion> {
  const h = await tx(async (c) => {
    const u = (await c.query<{ pid: string; amt: number; idem: string; city: string | null; otra: string | null }>(
      `update refunds set status = 'done', stripe_refund_id = coalesce(stripe_refund_id, $2), done_at = now(), last_error = null
        where id = $1::bigint and status = 'pending' and manual_at is null returning payment_id::text as pid, amount_cents as amt, idem_key as idem, (select y.city_id from payments y where y.id = payment_id) as city, retry_of::text as otra`, [id, stripeId])).rows[0];
    if (!u) return null;
    if (porConsulta) await (await import("./consulta-pasarela")).auditarCierre(c, "refunds", id, u.city, { estado: "hecha", devolucion: stripeId, monto: money(u.amt) });
    await alCerrar?.(c);
    const caso = await cerrarDelCaso(c, { idem: u.idem, amt: u.amt }, !!alCerrar);
    const l = await devueltoDelLibro(c, u.pid);
    const p = (await c.query<{ uid: string; num: string; kind: string; brand: string | null; l4: string | null }>(
      `select p.user_id::text as uid, o.number as num, o.kind, p.card_brand as brand, p.card_last4 as l4 from payments p join operations o on o.id = p.operation_id where p.id = $1::bigint`, [u.pid])).rows[0]!;
    await c.query(`update operations set pay_status = $2 where id = $1::bigint`, [l.op, l.st]);
    await evento(c, l.op, "refunded", { es: `Devolución de ${money(u.amt)}`, en: `Refund of ${money(u.amt)}` });
    return { ...p, amt: u.amt, caso, otra: u.otra };
  });
  if (!h) {
    const st = (await db().query<{ st: string; mano: boolean }>(`select status as st, manual_at is not null as mano from refunds where id = $1::bigint`, [id])).rows[0];
    return st && (st.st === "done" || st.mano) ? { ok: true } : { ok: false, msg: STRIPE_NO };
  }
  const tarjeta = h.brand && h.l4 ? `${({ visa: "Visa", mastercard: "Mastercard", mc: "Mastercard", amex: "Amex", discover: "Discover", disc: "Discover" } as Record<string, string>)[h.brand] ?? h.brand} ·· ${h.l4}` : "tarjeta";
  const R = refDe(h.kind, h.num);
  await (await import("./avisos")).avisar(h.uid, "pay_refund", { monto: money(h.amt), num: R.num, tarjeta }, { href: R.href, ref: R.ref }).catch(() => undefined);
  if (h.caso) await (await import("./soporte")).avisarCaso(h.caso, "sop_resuelto").catch(() => undefined);
  // 0209 · La devolución de otra vez de unos boletos quedó hecha: la alerta de la fallida de antes se cierra sola, ya (el barrido también la cierra).
  if (h.otra) await (await import("./dinero-alertas")).cerrarAlertaSola("refund_failed", h.otra, { es: `Cerrada sola: la devolución de otra vez quedó hecha (${money(h.amt)}).`, en: `Closed by itself: the refund made again is done (${money(h.amt)}).` }).catch(() => false);
  return { ok: true };
}

/* 9t2 · Lo que una devolución hecha cierra en su caso, por su llave, en la transacción que la marca 'done' (una sola vez, la cierre quien la cierre):
   - Soporte (`tk-<clave>`, resolverYDevolver): la fila de support_refunds pasa a hecha, el caso suma lo devuelto y queda resuelto con «Te devolvimos»
     (y la respuesta del equipo: la pone quien la pidió con alCerrar o, si la cerró el barrido, la que quedó guardada al ir en camino), y su auditoría.
   - Ayuda de la cita (`ayb-h<solicitud>-p<cobro>`, el negocio devuelve; `ayc-<solicitud>-p<cobro>`, la persona acepta lo que el negocio propuso):
     help_requests.refunded_cents suma lo que de verdad salió. Nadie más lo suma. Devuelve el número del caso de Soporte (para avisar después). */
async function cerrarDelCaso(c: PoolClient, r: { idem: string; amt: number }, conRespuesta: boolean): Promise<string | null> {
  const ay = /^(?:ayb-h|ayc-)(\d{1,18})-p\d{1,18}$/.exec(r.idem);
  if (ay) { await c.query(`update help_requests set refunded_cents = refunded_cents + $2, updated_at = now() where id = $1::bigint`, [ay[1], r.amt]); return null; }
  // Soporte: lo cierra lib/soporte-equipo (la respuesta guardada, tapada, y el caso) en esta misma transacción.
  if (/^tk-[0-9a-f-]{36}$/.test(r.idem)) return (await import("./soporte-equipo")).cerrarCasoDevuelto(c, r.idem, r.amt, conRespuesta);
  return null;
}

export async function devolverPago(x: InDevolver, alGuardar?: AlGuardar<{ pago: string; centavos: number }>): Promise<ResDevolucion> {
  const a = await tx((c) => anotarDevolucionPago(c, x, alGuardar));
  if (!a.ok) return a;
  if (a.estado !== "pending") return { ok: true };
  return ejecutarDevolucionPago(a.id, { nadieMira: x.nadieMira });
}

/* 9v (25 nov, tercera tanda) · El NEGOCIO cancela (la salida de un viaje, una mesa de la noche, una inscripción o el grupo, una fecha de fiesta) y el sistema
   devuelve todo lo cobrado. Antes se tiraba lo que devolvía devolverPago y el aviso decía «Te devolvemos todo» con lo decidido; y como la pide el negocio
   (por 'business'), un «no» de Stripe no avisaba a nadie. Ahora nadie mira una pantalla que la repita (nadieMira: el «no» alerta al equipo de dinero, como
   una política; sin respuesta, el barrido la sigue y alerta si falla) y lo que pasó se lee de la base por su llave: hecha · en camino · fallida. Si ni
   siquiera se pudo anotar (otra devolución de ese cobro sigue en camino), también alerta. Lo retenido se libera; lo que no se cobró no se devuelve. Los
   textos (aviso y panel): lib/devolucion-cancelar.ts. Guardián devueltoSoloSiSalio.
   25 nov (cuarta tanda) · También cuando cancela QUIEN PAGÓ (por la regla: por "policy") y el evento privado: por y seQueda (lo que el negocio se queda por la
   regla, p. ej. la mitad de un viaje cancelado tarde; se devuelve el resto). Y la retención se mira: si la pasarela no la soltó, «retenida» y alerta
   hold_stuck al equipo (una vez por cobro; el barrido la sigue soltando), como el resto de lo que nadie mira. */
export async function devolverAlCancelar(o: { id: string; pay: string | null; pid: string | null; amount: number | null; refunded: number | null },
  x: { actorId: string | null; motivo: string; idem: string; por?: "business" | "policy"; seQueda?: number }): Promise<import("./devolucion-cancelar").DevCancelar> {
  const por = x.por ?? "business", quien = por === "business" ? { es: "lo canceló el negocio", en: "The business cancelled" } : { es: "lo canceló el cliente", en: "The client cancelled" };
  if (o.pay === "held") {
    // La retención se mira (soltarRetencion): la que la pasarela no soltó es «retenida» y alerta hold_stuck al equipo, una vez por cobro.
    const s = await soltarRetencion(o.id, { es: `${x.motivo} (${quien.es})`, en: quien.en });
    return s.e === "retenida" ? { e: "retenida", monto: s.monto } : { e: "liberada", monto: o.amount ?? 0 };
  }
  if (!o.pid || !o.amount || !["captured", "partially_refunded", "refunded"].includes(o.pay ?? "")) return { e: "nada", monto: 0 };
  const falta = o.amount - (o.refunded ?? 0) - Math.max(0, Math.round(x.seQueda ?? 0));
  if (falta <= 0) return x.seQueda ? { e: "nada", monto: 0 } : { e: "hecha", monto: o.refunded ?? 0 };
  const r = await devolverPago({ paymentId: o.pid, centavos: falta, por, actorId: x.actorId, motivo: x.motivo, idem: x.idem, nadieMira: true });
  if (r.ok) return { e: "hecha", monto: falta };
  // Lo que quedó en la base con esa llave (una fallida guarda la suya con «~fallida-<id>»).
  const f = (await db().query<{ st: string; amt: number; mano: boolean }>(
    `select status as st, amount_cents as amt, manual_at is not null as mano from refunds where payment_id = $1::bigint and split_part(idem_key, '~fallida-', 1) = $2 order by id desc limit 1`, [o.pid, x.idem])).rows[0];
  if (f && (f.st === "done" || f.mano)) return { e: "hecha", monto: f.amt };
  if (f?.st === "pending") return { e: "en_camino", monto: f.amt };
  if (!f) {
    const p = (await db().query<{ biz: string | null; city: string | null }>(`select business_id as biz, city_id as city from payments where id = $1::bigint`, [o.pid])).rows[0];
    await (await import("./dinero-alertas")).alertar("refund_stuck", `cancelacion:${x.idem}`.slice(0, 200), { monto: falta, negocio: p?.biz ?? null, ciudad: p?.city ?? null, detalle: {
      es: `${x.motivo} (${quien.es}): la devolución de ${money(falta)} no se pudo anotar (${r.msg.es}). El cliente no la recibió: revisa el cobro en Stripe y devuélvela.`,
      en: `${quien.en}: the ${money(falta)} refund could not be recorded (${r.msg.en}). The client did not get it: check the charge in Stripe and refund it.` } }).catch(() => undefined);
  }
  return { e: "fallida", monto: f?.amt ?? falta };
}

/* Barrido: las devoluciones de un cobro (no de boletos: esas las termina barrerDevolucionesBoletos) que quedaron pendientes (el proceso murió
   entre la intención y la pasarela, o entre el «sí» y el cierre, o Stripe no contestó) se preguntan otra vez con la MISMA llave mientras Stripe
   la recuerda; pasado eso no se pregunta más (podría devolver dos veces): el equipo de dinero lo revisa en Stripe y la resuelve a mano. */
export async function barrerDevolucionesPago(): Promise<number> {
  // 9t7 · Desde que su llave vale (created_at, o key_from si la consulta dijo que nunca llegó y la llave volvió a valer).
  const L = (await db().query<{ id: string }>(
    `select r.id::text from refunds r where r.status = 'pending' and r.manual_at is null and r.created_at < now() - interval '2 minutes'
        and coalesce(r.key_from, r.created_at) > now() - make_interval(hours => $1::int) and not exists (select 1 from ticket_refund_lines l where l.refund_id = r.id)
      order by r.created_at limit 50`, [HORAS_LLAVE])).rows;
  let n = 0;
  // 9t9 · Cada devolución por su cuenta (lib/barrido-uno.ts): antes el error de una se tragaba sin rastro; ahora queda en el registro y la tarea sale fallida.
  const B = new (await import("./barrido-uno")).Fallos("devolucionesPago");
  await B.cada(L, (r) => `devolucion ${r.id}`, async (r) => { if ((await ejecutarDevolucionPago(r.id, { barrido: true })).ok) n++; });
  // 9t7 · Las viejas: se le pregunta a la pasarela (lib/devolucion-consulta.ts, una vez cada CADA_MIN por devolución) y se cierran con lo que dijo, sin
  // llamar a Stripe con una llave de más de HORAS_LLAVE; las que no cierran (y las anotadas sin el dato buscable), la alerta refund_stuck, una vez.
  await B.uno("viejas", async () => { n += await (await import("./devolucion-consulta")).preguntarViejas(false); });
  B.fin();
  return n;
}
/* La alerta de una devolución que pasó HORAS_LLAVE sin respuesta (la usan este barrido y el de los boletos): una vez por devolución. 9t7 · conDato: se
   mandó con su dato buscable (el servidor le sigue preguntando a Stripe y la cierra con lo que diga); sin él (anotada antes de 0206), se mira en Stripe y
   se resuelve a mano (antes de marcarla, el servidor vuelve a preguntar). */
export async function alertaVieja(r: { id: string; amt: number; biz: string | null; city: string | null; n: number; err: string | null }, conDato = false) {
  await (await import("./dinero-alertas")).alertar("refund_stuck", r.id, { monto: r.amt, negocio: r.biz, ciudad: r.city, detalle: conDato
    ? { es: `Devolución de ${money(r.amt)} sin respuesta de Stripe en ${HORAS_LLAVE} h (${r.n} intentos, ${r.err ?? "sin motivo"}): ya no se manda con esa llave. El servidor le pregunta a Stripe y la cierra con lo que diga.`,
        en: `Refund of ${money(r.amt)} with no answer from Stripe in ${HORAS_LLAVE} h (${r.n} attempts, ${r.err ?? "no reason"}): it is not sent with that key again. The server asks Stripe and closes it with the answer.` }
    : { es: `Devolución de ${money(r.amt)} sin respuesta de Stripe en ${HORAS_LLAVE} h (${r.n} intentos, ${r.err ?? "sin motivo"}): se anotó sin el dato para buscarla en Stripe. Mira en Stripe si salió y resuélvela a mano (antes de marcarla, el servidor vuelve a preguntar).`,
        en: `Refund of ${money(r.amt)} with no answer from Stripe in ${HORAS_LLAVE} h (${r.n} attempts, ${r.err ?? "no reason"}): it was recorded without the data to find it in Stripe. Check in Stripe whether it went out and resolve it by hand (the server asks again before marking it).` } }).catch(() => undefined);
}
export const HORAS_LLAVE_STRIPE = HORAS_LLAVE;

/* 9t2 · Webhook charge.refund.updated: Stripe dio por fallida una devolución que ya estaba hecha (días después: la tarjeta se cerró, el banco la
   rechazó). En UNA transacción: la devolución pasa a 'failed' (su llave queda libre, como un «no»), lo devuelto del cobro vuelve a salir del libro
   (sin bajar de lo que el libro todavía cuenta como hecho), la operación lo dice y lo que el caso había sumado se resta. Después, la alerta al
   equipo de dinero (una vez): si todavía se debe, se devuelve otra vez. Una que no está en el libro (hecha desde Stripe) solo alerta. */
export async function devolucionFallidaEnStripe(stripeRefundId: string, motivo: string, monto: number): Promise<"anotada" | "fuera" | "ya"> {
  const why = String(motivo || "failed").slice(0, 60);
  const h = await tx(async (c) => {
    const r = (await c.query<{ id: string; amt: number; pid: string; idem: string; biz: string | null; city: string | null; otra: string | null; lineas: string }>(
      `update refunds r set status = 'failed', last_error = left($2, 120), idem_key = left(r.idem_key, 180) || '~fallida-' || r.id::text
         from payments p where r.stripe_refund_id = $1 and r.status = 'done' and p.id = r.payment_id
       returning r.id::text, r.amount_cents as amt, r.payment_id::text as pid, r.retry_of::text as otra, coalesce(r.lines_of, r.id)::text as lineas,
                 -- 0209 · Una devolución de otra vez de unos boletos lleva la llave de la de los boletos (la cancelación del evento se reconoce por ella).
                 split_part(coalesce((select x.idem_key from refunds x where x.id = r.lines_of), r.idem_key), '~fallida-', 1) as idem, p.business_id as biz, p.city_id as city`, [stripeRefundId, `stripe:${why}`])).rows[0];
    if (!r) return null;
    const ay = /^(?:ayb-h|ayc-)(\d{1,18})-p\d{1,18}$/.exec(r.idem), sq = /^sop-q(\d{1,18})$/.exec(r.idem);
    if (ay) await c.query(`update help_requests set refunded_cents = greatest(0, refunded_cents - $2), updated_at = now() where id = $1::bigint`, [ay[1], r.amt]);
    if (sq) await c.query(`update help_requests set refunded_cents = greatest(0, refunded_cents - $2), updated_at = now() where id = (select q.subject_id::bigint from queue_items q where q.id = $1::bigint and q.subject_kind = 'help_request')`, [sq[1], r.amt]);
    if (/^tk-/.test(r.idem)) await c.query(`update support_cases set refunded_cents = greatest(0, refunded_cents - $2) where id = (select case_id from support_refunds where idem_key = $1)`, [r.idem, r.amt]);
    // 9t3 · Boletos: los boletos se quedan devueltos (no se reponen solos ni se devuelve otra vez solo: lo decide una persona del equipo desde la
    // alerta) y lo que la cancelación del evento contaba como devuelto lo resta, aquí mismo (la llave de esa devolución: evtcx-<cancelación>-<orden>).
    // Lo que To'Latino había cedido de su comisión en esos boletos deja de contar con la devolución fallida (evt_liq_calc, 0199).
    const cx = /^evtcx-(\d{1,18})-\d{1,18}$/.exec(r.idem);
    if (cx) await c.query(`update event_cancellations set refunded_cents = greatest(0, refunded_cents - $2) where id = $1::bigint`, [cx[1], r.amt]);
    const bol = (await c.query<{ num: string; quien: string | null; codes: string | null; titulares: string | null }>(
      `select o.number as num, nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien,
              string_agg(t.code, ', ' order by t.id) as codes,
              string_agg(distinct nullif(trim(coalesce(h.first_name, '') || ' ' || left(coalesce(h.last_name, ''), 1)), ''), ', ') as titulares
         from ticket_refund_lines l join operations o on o.id = l.operation_id left join users u on u.id = o.user_id
         left join tickets t on t.id = l.ticket_id left join users h on h.id = t.holder_user_id
        where l.refund_id = $1::bigint group by o.number, u.first_name, u.last_name`, [r.lineas])).rows[0] ?? null;
    const l = (await c.query<{ st: string; op: string }>(
      `with x as (select coalesce(sum(amount_cents), 0)::int as hecho from refunds where payment_id = $1::bigint and status = 'done'),
            y as (select p.id, least(p.amount_cents, greatest(x.hecho, p.refunded_cents - $2::int)) as dev from payments p, x where p.id = $1::bigint)
       update payments p set refunded_cents = y.dev, status = case when y.dev >= p.amount_cents then 'refunded' when y.dev > 0 then 'partially_refunded' else 'captured' end, updated_at = now()
         from y where p.id = y.id and p.status in ('captured', 'partially_refunded', 'refunded') returning p.status as st, p.operation_id::text as op`, [r.pid, r.amt])).rows[0];
    if (l) {
      await c.query(`update operations set pay_status = $2 where id = $1::bigint`, [l.op, l.st]);
      await evento(c, l.op, "refund_failed", { es: `Stripe no pudo completar la devolución de ${money(r.amt)}: el dinero no llegó a la tarjeta`, en: `Stripe could not complete the ${money(r.amt)} refund: the money did not reach the card` });
    }
    return { ...r, bol };
  });
  const { alertar } = await import("./dinero-alertas");
  if (h?.bol) {
    // 9t3 · Qué boletos y de quién: una persona del equipo decide con eso (devolver otra vez o reponer el boleto); nada de eso pasa solo.
    const b = h.bol, quien = b.quien ?? "sin nombre", tit = b.titulares && b.titulares !== b.quien ? ` (a nombre de ${b.titulares})` : "", titEn = b.titulares && b.titulares !== b.quien ? ` (held by ${b.titulares})` : "";
    await alertar("refund_failed", h.id, { monto: h.amt, negocio: h.biz, ciudad: h.city, detalle: {
      es: `Stripe dio por fallida la devolución de ${money(h.amt)} de la orden de boletos ${b.num} de ${quien} (${why}): el dinero no llegó a la tarjeta. Boletos: ${b.codes ?? "solo extras"}${tit}. Siguen devueltos (no entran) y su saldo volvió al cobro: decide con la persona si se le devuelve otra vez o se le repone el boleto.`,
      en: `Stripe marked the ${money(h.amt)} refund of ticket order ${b.num} from ${quien} as failed (${why}): the money did not reach the card. Tickets: ${b.codes ?? "extras only"}${titEn}. They stay refunded (no entry) and the balance is back on the charge: decide with the person whether to refund again or reissue the ticket.` } }).catch(() => undefined);
    // 0209 · Era la devolución de otra vez: la alerta de la fallida de antes se reabre y dice dónde sigue.
    if (h.otra) await (await import("./dinero-alertas")).reabrirOtraVez(h.otra, h.id).catch(() => false);
    return "anotada";
  }
  if (!h) {
    const ya = (await db().query(`select 1 from refunds where stripe_refund_id = $1 and status = 'failed'`, [stripeRefundId])).rowCount;
    if (ya) return "ya";
    await alertar("refund_failed", stripeRefundId, { monto, detalle: { es: `Stripe dio por fallida la devolución ${stripeRefundId} de ${money(monto)} (${why}), que no está en nuestro libro: mírala en Stripe.`,
      en: `Stripe marked refund ${stripeRefundId} of ${money(monto)} as failed (${why}); it is not in our ledger: check it in Stripe.` } }).catch(() => undefined);
    return "fuera";
  }
  await alertar("refund_failed", h.id, { monto: h.amt, negocio: h.biz, ciudad: h.city, detalle: { es: `Stripe dio por fallida una devolución de ${money(h.amt)} que ya estaba hecha (${why}): el dinero no llegó a la tarjeta. Quedó fallida y su saldo volvió al cobro: si todavía se debe, devuélvela otra vez.`,
    en: `Stripe marked an already made ${money(h.amt)} refund as failed (${why}): the money did not reach the card. It is now failed and its balance is back on the charge: if it is still owed, refund it again.` } }).catch(() => undefined);
  return "anotada";
}

/* 9k · Devolver de una operación con varios cobros (L448: estimado + «algo más» + visita; L455: planes y rentas, un cobro por período). Se reparte entre
   los cobros con saldo, del de más saldo al de menos, y cada parte va por devolverPago con su propia llave (`<idem>-p<cobro>`): reintentar con la misma
   llave no devuelve dos veces lo que ya salió (las partes hechas se saltan y cuentan). El tope es lo que queda por devolver en esos cobros: lo decide el
   servidor. Si una parte falla, lo hecho queda hecho y el mensaje lo dice; el mismo toque otra vez sigue donde quedó.
   20 nov · alGuardar: la auditoría de quien decide entra con CADA parte, en la transacción que la anota (devolverPago): cada dinero que sale tiene
   su renglón en la misma transacción; una parte ya hecha (el reintento la salta) no se vuelve a auditar porque no se vuelve a mover. */
export async function devolverOperacion(x: { opId: string; centavos: number; kinds: string[]; por: "business" | "admin" | "policy"; actorId: string | null; motivo: string; idem: string }, alGuardar?: AlGuardar<{ pago: string; centavos: number; parte: number }>): Promise<{ ok: true; partes: number } | { ok: false; msg: { es: string; en: string }; enCamino?: true }> {
  const P = (await db().query<{ id: string; resto: number }>(
    // También los ya devueltos del todo: una parte hecha con esta llave cuenta aunque su cobro ya no tenga saldo (el reintento no la repite).
    `select p.id::text, case when p.status in ('captured', 'partially_refunded')
                             then p.amount_cents - p.refunded_cents - coalesce((select sum(r.amount_cents) from refunds r where r.payment_id = p.id and r.status = 'pending'), 0)::int else 0 end as resto
       from payments p where p.operation_id = $1::bigint and p.kind = any($2::text[]) and p.status in ('captured', 'partially_refunded', 'refunded')
      order by 2 desc, p.id desc limit 200`, [x.opId, x.kinds])).rows;
  const llaves = P.map((p) => `${x.idem}-p${p.id}`);
  const hechas = (await db().query<{ k: string; n: number }>(`select idem_key as k, amount_cents as n from refunds where idem_key = any($1::text[])`, [llaves])).rows;
  const ya = hechas.reduce((s, r) => s + r.n, 0), conLlave = new Set(hechas.map((r) => r.k));
  const n = Math.round(x.centavos);
  let falta = n - ya;
  if (!(n > 0)) return { ok: false, msg: { es: "Escribe cuánto se devuelve.", en: "Write how much to refund." } };
  if (falta <= 0) return { ok: true, partes: hechas.length };
  const libre = P.filter((p) => !conLlave.has(`${x.idem}-p${p.id}`)).reduce((s, p) => s + Math.max(0, p.resto), 0);
  if (falta > libre) return { ok: false, msg: { es: `Puedes devolver hasta ${money(libre + ya)}.`, en: `You can refund up to ${money(libre + ya)}.` } };
  let partes = hechas.length;
  for (const p of P) {
    if (falta <= 0) break;
    if (conLlave.has(`${x.idem}-p${p.id}`) || p.resto <= 0) continue;
    const q = Math.min(falta, p.resto);
    const parte = partes + 1;
    const d = await devolverPago({ paymentId: p.id, centavos: q, por: x.por, actorId: x.actorId, motivo: x.motivo, idem: `${x.idem}-p${p.id}` },
      alGuardar ? (c, h) => alGuardar(c, { ...h, parte }) : undefined);
    // 9t · Sin respuesta de Stripe, esa parte sigue en camino (cuenta como hecha para la llave: el mismo toque no la repite) y el barrido la termina.
    if (!d.ok && d.enCamino) return { ok: false, enCamino: true, msg: partes ? { es: `Se devolvieron ${money(n - falta)} de ${money(n)}; ${money(q)} quedó en camino (Stripe no contestó) y se termina sola.`, en: `${money(n - falta)} of ${money(n)} refunded; ${money(q)} is on its way (Stripe did not answer) and finishes by itself.` } : d.msg };
    if (!d.ok) return { ok: false, msg: partes ? { es: `Se devolvieron ${money(n - falta)} de ${money(n)}; Stripe no pudo con el resto. Toca otra vez para seguir.`, en: `${money(n - falta)} of ${money(n)} refunded; Stripe could not do the rest. Tap again to continue.` } : d.msg };
    falta -= q; partes++;
  }
  return { ok: true, partes };
}

/* 9t2 · Lo mismo que devolverOperacion, pero SOLO el paso 1 y dentro de la transacción de quien llama (la que bloquea su caso): cada parte queda
   'pending' con su llave (`<idem>-p<cobro>`) y su auditoría, todas juntas o ninguna. Devuelve las devoluciones que falta mandar a la pasarela
   (las nuevas y las de esta llave que siguen en camino); quien llama las manda después con ejecutarDevolucionPago. Las partes ya hechas con esta
   llave cuentan (repetir no devuelve dos veces). */
export async function anotarDevolucionOperacion(c: PoolClient, x: { opId: string; centavos: number; kinds: string[]; por: "business" | "admin" | "policy"; actorId: string | null; motivo: string; idem: string },
  alGuardar?: AlGuardar<{ pago: string; centavos: number; parte: number }>): Promise<{ ok: true; ids: string[] } | { ok: false; msg: Msg }> {
  const P = (await c.query<{ id: string; resto: number }>(
    `select p.id::text, case when p.status in ('captured', 'partially_refunded')
                             then p.amount_cents - p.refunded_cents - coalesce((select sum(r.amount_cents) from refunds r where r.payment_id = p.id and r.status = 'pending'), 0)::int else 0 end as resto
       from payments p where p.operation_id = $1::bigint and p.kind = any($2::text[]) and p.status in ('captured', 'partially_refunded', 'refunded')
      order by 2 desc, p.id desc limit 200`, [x.opId, x.kinds])).rows;
  const llaves = P.map((p) => `${x.idem}-p${p.id}`);
  const hechas = (await c.query<{ id: string; k: string; n: number; pend: boolean }>(
    `select id::text, idem_key as k, amount_cents as n, status = 'pending' and manual_at is null as pend from refunds where idem_key = any($1::text[])`, [llaves])).rows;
  const ya = hechas.reduce((s, r) => s + r.n, 0), conLlave = new Set(hechas.map((r) => r.k)), ids = hechas.filter((r) => r.pend).map((r) => r.id);
  const n = Math.round(x.centavos);
  if (!(n > 0)) return { ok: false, msg: { es: "Escribe cuánto se devuelve.", en: "Write how much to refund." } };
  let falta = n - ya;
  if (falta <= 0) return { ok: true, ids };
  const libre = P.filter((p) => !conLlave.has(`${x.idem}-p${p.id}`)).reduce((s, p) => s + Math.max(0, p.resto), 0);
  if (falta > libre) return { ok: false, msg: { es: `Puedes devolver hasta ${money(libre + ya)}.`, en: `You can refund up to ${money(libre + ya)}.` } };
  let partes = hechas.length;
  for (const p of P) {
    if (falta <= 0) break;
    if (conLlave.has(`${x.idem}-p${p.id}`) || p.resto <= 0) continue;
    const q = Math.min(falta, p.resto), parte = ++partes;
    const a = await anotarDevolucionPago(c, { paymentId: p.id, centavos: q, por: x.por, actorId: x.actorId, motivo: x.motivo, idem: `${x.idem}-p${p.id}` },
      alGuardar ? (c2, h) => alGuardar(c2, { ...h, parte }) : undefined);
    if (!a.ok) return a;
    if (a.estado === "pending") ids.push(a.id);
    falta -= q;
  }
  return { ok: true, ids };
}

/* El pago de una operación, para mostrarlo (cliente, panel, admin). */
export type PagoVista = { id: string; estado: string; monto: number; devuelto: number; comision: number; marca: string | null; ultimos4: string | null; simulado: boolean };
export async function pagoDe(opId: string): Promise<PagoVista | null> {
  const r = (await db().query<PagoVista>(
    `select id::text, status as estado, amount_cents as monto, refunded_cents as devuelto, fee_cents as comision, card_brand as marca, card_last4 as ultimos4, simulated as simulado
       from payments where operation_id = $1::bigint and kind = 'full'`, [opId])).rows[0];
  return r ?? null;
}

/* Panel › Cobros (DASH-COBROS): la cuenta de cobro, lo de esta semana (lunes a domingo) y los últimos cobros con tarjeta. */
export type CobrosPanel = {
  modo: "stripe" | "simulador" | "apagado";
  cuenta: { estado: "none" | "pending" | "enabled" | "restricted"; banco: string | null; pide: string[]; pausado: boolean; motivo: string | null; simulado: boolean };
  semana: { n: number; cobrado: number; comision: number; devuelto: number; neto: number; martes: string };
  cobros: { num: string; quien: string; monto: number; comision: number; devuelto: number; estado: string; at: string; tarjeta: string | null; disputa: string | null }[];
  tasa: number;
  /* 6e · Los pagos de eventos por fecha (lib/evt-liquidacion.ts); los pone la página del panel. */
  eventos?: import("./evt-liquidacion").LiqPanel;
};
export async function cobrosPanel(negocio: string): Promise<CobrosPanel> {
  await repararPagos(negocio).catch(() => undefined);
  const [a, s, L, f] = await Promise.all([
    db().query<{ status: string; bank: string | null; req: string[]; paused: boolean; why: string | null; sim: boolean }>(
      `select status, bank_last4 as bank, requirements as req, payouts_paused as paused, paused_reason as why, simulated as sim from stripe_accounts where business_id = $1`, [negocio]),
    db().query<{ n: number; cobrado: number; comision: number; devuelto: number; martes: string }>(
      `with c as (select timezone as tz from cities where id = (select city_id from businesses where id = $1)),
            w as (select date_trunc('week', now() at time zone c.tz) as ini from c)
       select count(*)::int as n, coalesce(sum(p.amount_cents), 0)::int as cobrado, coalesce(sum(p.fee_cents::bigint * (p.amount_cents - p.refunded_cents) / p.amount_cents), 0)::int as comision,
              coalesce(sum(p.refunded_cents), 0)::int as devuelto, to_char((select ini from w) + interval '8 days', 'YYYY-MM-DD') as martes
         from payments p, c, w where p.business_id = $1 and p.status in ('captured', 'partially_refunded', 'refunded') and p.captured_at at time zone c.tz >= w.ini and p.transfer_group is null`, [negocio]),
    db().query<{ num: string; quien: string; monto: number; comision: number; devuelto: number; estado: string; at: string; brand: string | null; l4: string | null; disputa: string | null }>(
      `select o.number as num, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), '—') as quien, p.amount_cents as monto, p.fee_cents as comision,
              p.refunded_cents as devuelto, p.status as estado, to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, p.card_brand as brand, p.card_last4 as l4,
              (select d.status from disputes d where d.payment_id = p.id order by d.id desc limit 1) as disputa
         from payments p join operations o on o.id = p.operation_id join users u on u.id = p.user_id
        where p.business_id = $1 and p.transfer_group is null order by p.id desc limit 30`, [negocio]), // 6e: los boletos (cobro de la plataforma) van en PAGOS DE EVENTOS
    db().query<{ r: number }>(`select rate_bp as r from fee_rules where kind = 'ped' and effective_from <= now() order by effective_from desc, id desc limit 1`),
  ]);
  const x = a.rows[0], k = s.rows[0]!;
  const neto = k.cobrado - k.devuelto - k.comision;
  return {
    modo: pasarela.modo(),
    cuenta: x ? { estado: x.status as CobrosPanel["cuenta"]["estado"], banco: x.bank, pide: x.req ?? [], pausado: x.paused, motivo: x.why, simulado: x.sim } : { estado: "none", banco: null, pide: [], pausado: false, motivo: null, simulado: false },
    semana: { n: k.n, cobrado: k.cobrado, comision: k.comision, devuelto: k.devuelto, neto: Math.max(0, neto), martes: k.martes },
    cobros: L.rows.map((r) => ({ num: r.num, quien: r.quien, monto: r.monto, comision: r.comision, devuelto: r.devuelto, estado: r.estado, at: r.at, tarjeta: r.brand && r.l4 ? `${r.brand.toUpperCase()} ·· ${r.l4}` : null, disputa: r.disputa })),
    tasa: f.rows[0]?.r ?? 1000,
  };
}

/* Lee el estado real de la cuenta en Stripe y lo guarda (al volver de Stripe y desde el webhook). */
export async function actualizarCuenta(negocio: string) {
  const acct = (await db().query<{ a: string; on: boolean }>(`select stripe_account_id as a, charges_enabled as on from stripe_accounts where business_id = $1`, [negocio])).rows[0];
  if (!acct) return;
  const e = await pasarela.cuentaLeer(acct.a);
  if (!e) return;
  await db().query(`update stripe_accounts set charges_enabled = $2, payouts_enabled = $3, requirements = $4::jsonb, bank_last4 = coalesce($5, bank_last4),
                           status = case when $2 and $3 and jsonb_array_length($4::jsonb) = 0 then 'enabled' when $2 or jsonb_array_length($4::jsonb) > 0 then 'restricted' else 'pending' end, updated_at = now()
                     where business_id = $1`, [negocio, e.cargos, e.pagos, JSON.stringify(e.pide.slice(0, 20)), e.banco]);
}

/* Las tarjetas guardadas de una persona (solo las del modo que corre: simuladas en el sandbox, reales con Stripe). */
export async function misTarjetas(userId: string) {
  const sim = pasarela.modo() === "simulador";
  return (await db().query<{ pm: string; marca: string; ultimos4: string; vence: string; def: boolean }>(
    `select stripe_pm_id as pm, brand as marca, last4 as ultimos4, exp as vence, is_default as def from payment_methods where user_id = $1 and status = 'active' and simulated = $2 order by is_default desc, id desc limit 10`, [userId, sim])).rows;
}
