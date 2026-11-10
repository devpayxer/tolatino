import "server-only";
import type { PoolClient } from "pg";
import { db, tx } from "./db";
import { pasarela, type Retencion } from "./pagos/pasarela";

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
  const r = await pasarela.retener({ centavos: x.total, comision: fee, destino: x.cuenta, pm: x.pm, cliente, idem: `ord-${x.clave}-${x.pm.slice(-24)}` /* otra tarjeta = otro intento; la misma = idempotente */, meta: { order: x.numero, business_id: x.negocio } });
  return { ...r, comision: fee };
}
export async function registrarRetencion(c: Q, x: { opId: string; userId: string; negocio: string; city: string | null; total: number; comision: number; r: Extract<Retencion, { ok: true }>; pm?: string; kind?: "full" | "deposit" }) {
  await c.query(
    `insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, simulated, payment_method)
     values ($1::bigint, $2, $3, $4, $11, 'card', $5, $6, $6, $7, 'held', $8, $9, now(), $10, $12)`,
    [x.opId, x.userId, x.negocio, x.city, x.r.pi, x.total, x.comision, x.r.marca, x.r.ultimos4, x.r.pi.startsWith("pi_sim_"), x.kind ?? "full", x.pm && /^pm_[A-Za-z0-9_]{3,200}$/.test(x.pm) ? x.pm : null]);
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

/* Liberar lo retenido (el pedido no se dio). Avisa a la persona. */
export async function liberarOperacion(opId: string) {
  const p = (await db().query<{ id: string; pi: string; amount: number; uid: string; num: string; kind: string }>(
    `select p.id::text, p.stripe_payment_intent as pi, p.amount_cents as amount, p.user_id::text as uid, o.number as num, o.kind from payments p join operations o on o.id = p.operation_id
      where p.operation_id = $1::bigint and p.kind in ('full', 'deposit') and p.status = 'held'`, [opId])).rows[0];
  if (!p) return;
  const r = await pasarela.liberar(p.pi);
  if (!r.ok) return;
  const hecho = await tx(async (c) => {
    const u = await c.query(`update payments set status = 'released', released_at = now(), updated_at = now() where id = $1 and status = 'held'`, [p.id]);
    if (!u.rowCount) return false;
    await c.query(`update operations set pay_status = 'released' where id = $1::bigint`, [opId]);
    await evento(c, opId, "payment_released", { es: `Se liberaron ${money(p.amount)} retenidos`, en: `${money(p.amount)} held was released` });
    return true;
  });
  const R = refDe(p.kind, p.num);
  if (hecho) await (await import("./avisos")).avisar(p.uid, "pay_released", { monto: money(p.amount), num: R.num }, { href: R.href, ref: R.ref });
}

/* Repara lo que quedó a medias (una llamada a la pasarela que falló): retenido de un pedido que ya no se da → liberar;
   retenido de uno aceptado → cobrar. Una solicitud con otra hora propuesta (change_proposed) sigue VIVA: su retención no se
   toca (4v: se liberaba el depósito mientras el cliente decidía; guardián reparaVivas). Barato: índice por negocio y solo los retenidos. */
export async function repararPagos(negocio: string) {
  const L = (await db().query<{ op: string; st: string }>(
    `select p.operation_id::text as op, o.status as st from payments p join operations o on o.id = p.operation_id
      where p.business_id = $1 and p.status = 'held' and o.status not in ('pending', 'change_proposed') and o.kind not in ('market_order', 'hold', 'tickets') limit 20`, [negocio])).rows;
  for (const x of L) {
    if (x.st === "confirmed" || x.st === "done") await cobrarOperacion(x.op);
    else await liberarOperacion(x.op);
  }
  // Pedido del mercado (4p): nunca se captura lo retenido completo; se cobra lo que pesó (liquidarMercado) o se libera.
  await (await import("./mercado")).repararMercado(negocio);
  // Envío de la tienda (4q-2): se cobra lo que se envió (cobrarApartado), nunca lo retenido completo; o se libera.
  await (await import("./apartados")).repararApartados(negocio);
  // Auto y Hogar (4d): estimado y «algo más» (liquidaciones a medias, retenciones que vencen).
  await (await import("./estimados")).repararEstimados(negocio);
}

/* Devolver dinero de un cobro (total o parcial). Lo hace el negocio (desde su pedido) o To'Latino (Soporte o
   Transacciones). Idempotente por `idem`. La comisión baja en proporción. */
export async function devolverPago(x: { paymentId: string; centavos: number; por: "business" | "admin" | "policy"; actorId: string | null; motivo: string; idem: string }): Promise<{ ok: true } | { ok: false; msg: { es: string; en: string } }> {
  const p = (await db().query<{ id: string; pi: string; amount: number; refunded: number; status: string; uid: string; num: string; brand: string | null; l4: string | null; op: string; kind: string; plataforma: boolean }>(
    `select p.id::text, p.stripe_payment_intent as pi, p.amount_cents as amount, p.refunded_cents + coalesce((select sum(r.amount_cents) from refunds r where r.payment_id = p.id and r.status = 'pending'), 0)::int as refunded,
            p.status, p.user_id::text as uid, o.number as num, o.kind, p.card_brand as brand, p.card_last4 as l4, p.operation_id::text as op, p.transfer_group is not null as plataforma
       from payments p join operations o on o.id = p.operation_id where p.id = $1::bigint`, [x.paymentId])).rows[0];
  if (!p) return { ok: false, msg: { es: "Ese cobro no existe.", en: "That charge does not exist." } };
  const ya = (await db().query(`select 1 from refunds where idem_key = $1`, [x.idem])).rowCount;
  if (ya) return { ok: true };
  if (!["captured", "partially_refunded"].includes(p.status)) return { ok: false, msg: { es: "Solo se devuelve lo que ya se cobró.", en: "Only charged money can be refunded." } };
  const n = Math.round(x.centavos);
  if (!(n > 0) || n > p.amount - p.refunded) return { ok: false, msg: { es: `Puedes devolver hasta ${money(p.amount - p.refunded)}.`, en: `You can refund up to ${money(p.amount - p.refunded)}.` } };
  // 6d · Lo pendiente de una devolución de boletos ya cuenta (refunded suma las pendientes); un cobro de la plataforma (boletos) no tiene
  // transferencia ni comisión de destino que revertir.
  const r = await pasarela.devolver(p.pi, n, x.idem, { plataforma: p.plataforma });
  if (!r.ok) return { ok: false, msg: { es: "Stripe no pudo hacer la devolución. Prueba de nuevo en un momento.", en: "Stripe could not make the refund. Try again in a moment." } };
  await tx(async (c) => {
    await c.query(`insert into refunds (payment_id, amount_cents, reason, initiated_by, actor_id, stripe_refund_id, status, idem_key) values ($1, $2, $3, $4, $5, $6, 'done', $7)`,
      [p.id, n, x.motivo.slice(0, 300), x.por, x.actorId, r.id ?? null, x.idem]);
    const u = (await c.query<{ status: string }>(
      `update payments set refunded_cents = refunded_cents + $2, status = case when refunded_cents + $2 >= amount_cents then 'refunded' else 'partially_refunded' end, updated_at = now()
        where id = $1 returning status`, [p.id, n])).rows[0]!;
    await c.query(`update operations set pay_status = $2 where id = $1::bigint`, [p.op, u.status]);
    await evento(c, p.op, "refunded", { es: `Devolución de ${money(n)}`, en: `Refund of ${money(n)}` });
  });
  const tarjeta = p.brand && p.l4 ? `${({ visa: "Visa", mastercard: "Mastercard", mc: "Mastercard", amex: "Amex", discover: "Discover", disc: "Discover" } as Record<string, string>)[p.brand] ?? p.brand} ·· ${p.l4}` : "tarjeta";
  const R = refDe(p.kind, p.num);
  await (await import("./avisos")).avisar(p.uid, "pay_refund", { monto: money(n), num: R.num, tarjeta }, { href: R.href, ref: R.ref });
  return { ok: true };
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
  eventos?: { filas: import("./evt-liquidacion").FilaLiq[]; deuda: number };
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
