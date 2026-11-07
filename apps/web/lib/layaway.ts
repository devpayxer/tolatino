import "server-only";
import type { PoolClient } from "pg";
import { db, tx } from "./db";

/* Layaway: plan de pagos de Tiendas (Fase 4 · bloque 4r). Diseño: neg-tienda-flow.js (abono del plan) y plan §4r.
   - Solo artículos «en plan» (shop_kind 'plan') de una Tienda con plan en Tu herramienta y cobro con tarjeta. Se recoge en la
     tienda al terminar de pagar (sin envío).
   - El acuerdo por escrito se arma aquí (terminos) y se guarda tal cual lo aceptó la persona: hora, IP y versión. No cambia.
   - El abono se RETIENE al apartar (con la persona en la app) y se COBRA cuando la tienda confirma que lo tiene; si no lo
     tiene, se libera completo. Cada pago se paga en la app («Pagar $X», con la persona presente: nada se cobra solo) o en la
     tienda («Pagó en la tienda», sin comisión). Lo pagado sale de los pagos; nunca se escribe a mano.
   - Atrasado: el día después de la fecha. Con 14 días de atraso la tienda puede cancelar el plan; la persona puede cancelarlo
     cuando quiera. Se devuelve lo abonado menos el cargo (cancel_pct de lo abonado); lo pagado en la app vuelve por la tarjeta y
     lo pagado en la tienda lo devuelve la tienda. La unidad vuelve al estante.
   - Terminó de pagar → «Listo para recoger» → la tienda marca «Lo recogió». */
type Bi = { es: string; en: string };
type Q = PoolClient | ReturnType<typeof db>;
type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi };
const no = (es: string, en: string): { ok: false; msg: Bi } => ({ ok: false, msg: { es, en } });
const money = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
const NUM = /^A-\d{1,10}$/;
export { VERSION_PLAN, DIAS_PARA_CANCELAR, cuotas, terminos, type ReglaPlan } from "./layaway-comun";
import { DIAS_PARA_CANCELAR, cuotas, terminos, VERSION_PLAN, type ReglaPlan } from "./layaway-comun";

/* La regla del plan de la tienda (Tu herramienta) — solo si la tienda tiene plan y cobra con tarjeta ahora. */
export async function reglaPlan(negocio: string): Promise<ReglaPlan | null> {
  const r = (await db().query<{ pct: number; n: number; cada: number; cargo: number }>(
    `select r.lay_down_pct as pct, r.lay_payments as n, r.lay_every_days as cada, r.lay_cancel_pct as cargo from retail_settings r join businesses b on b.id = r.business_id
      where r.business_id = $1 and b.category_id = 'NEG-TIENDA' and r.layaway`, [negocio])).rows[0];
  if (!r || !(r.pct >= 5 && r.pct <= 50) || !(r.n >= 1 && r.n <= 12) || !(r.cada >= 7 && r.cada <= 31) || !(r.cargo >= 0 && r.cargo <= 20)) return null;
  const T = await (await import("./cobros")).tarjetaDe(negocio);
  return T.on ? { pct: r.pct, n: r.n, cada: r.cada, cargo: r.cargo } : null;
}
/* Dentro de la transacción del apartado: guarda el plan aceptado y sus pagos (0 = abono). */
export async function crearPlan(c: PoolClient, x: { opId: string; city: string; negocio: string; total: number; r: ReglaPlan; ip: string | null }) {
  const { abono, pagos } = cuotas(x.total, x.r);
  const id = (await c.query<{ id: string }>(
    `insert into layaway_plans (operation_id, city_id, total_cents, down_pct, down_cents, n_payments, every_days, cancel_pct, terms, accepted_ip, accepted_version)
     values ($1::bigint, $2, $3::int, $4, $5::int, $6, $7, $8, $9::jsonb, $10, $11) returning id::text`,
    [x.opId, x.city, x.total, x.r.pct, abono, x.r.n, x.r.cada, x.r.cargo, JSON.stringify(terminos(x.negocio, x.total, x.r)), x.ip ? x.ip.slice(0, 64) : null, VERSION_PLAN])).rows[0]!.id;
  await c.query(`insert into layaway_payments (plan_id, seq, due_at, amount_cents) values ($1::bigint, 0, now(), $2::int)`, [id, abono]);
  for (let i = 0; i < pagos.length; i++) await c.query(`insert into layaway_payments (plan_id, seq, amount_cents) values ($1::bigint, $2, $3::int)`, [id, i + 1, pagos[i]]);
  return id;
}

/* ── Lectura ── */
export type PagoPlan = { seq: number; monto: number; vence: string | null; st: "due" | "paid" | "late" | "waived"; donde: "app" | "store" | null; pagado: string | null };
export type PlanVista = { id: string; st: string; total: number; abono: number; pct: number; n: number; cada: number; cargo: number; terminos: Bi; aceptado: string; version: string;
  pagado: number; enApp: number; enTienda: number; falta: number; siguiente: PagoPlan | null; pagos: PagoPlan[]; atrasoDias: number; puedeCancelarTienda: boolean;
  // Si se cancelara hoy: el cargo, lo que vuelve por la tarjeta y lo que devuelve la tienda.
  siCancela: { cargo: number; app: number; tienda: number }; cancelado: { cargo: number } | null };
export async function planDe(opId: string, c: Q = db()): Promise<PlanVista | null> {
  const p = (await c.query<{ id: string; st: string; total: number; abono: number; pct: number; n: number; cada: number; cargo: number; terminos: Bi; aceptado: string; version: string; kept: number }>(
    `select id::text, status as st, total_cents as total, down_cents as abono, down_pct as pct, n_payments as n, every_days as cada, cancel_pct as cargo, terms as terminos, accepted_at as aceptado, accepted_version as version, fee_kept_cents as kept
       from layaway_plans where operation_id = $1::bigint`, [opId])).rows[0];
  if (!p) return null;
  const pagos = (await c.query<PagoPlan>(`select seq, amount_cents as monto, due_at as vence, status as st, paid_where as donde, paid_at as pagado from layaway_payments where plan_id = $1::bigint order by seq`, [p.id])).rows;
  const enApp = Number((await c.query<{ n: number }>(`select coalesce(sum(p.amount_cents - p.refunded_cents), 0)::int as n from payments p where p.operation_id = $1::bigint and p.kind in ('deposit', 'balance') and p.status in ('captured', 'partially_refunded', 'refunded')`, [opId])).rows[0]!.n);
  const enTienda = pagos.filter((x) => x.st === "waived").reduce((s, x) => s + x.monto, 0);
  const pagado = pagos.filter((x) => x.st === "paid" || x.st === "waived").reduce((s, x) => s + x.monto, 0);
  const siguiente = pagos.find((x) => x.seq >= 1 && (x.st === "due" || x.st === "late")) ?? null;
  const tarde = pagos.filter((x) => x.st === "late" && x.vence).map((x) => new Date(x.vence!).getTime());
  const atrasoDias = tarde.length ? Math.floor((Date.now() - Math.min(...tarde)) / 86400000) : 0;
  const cargo = Math.round((pagado * p.cargo) / 100), app = Math.max(0, enApp - cargo), tienda = Math.max(0, pagado - cargo - app);
  return { id: p.id, st: p.st, total: p.total, abono: p.abono, pct: p.pct, n: p.n, cada: p.cada, cargo: p.cargo, terminos: p.terminos, aceptado: p.aceptado, version: p.version,
    pagado, enApp, enTienda, falta: p.total - pagado, siguiente, pagos, atrasoDias, puedeCancelarTienda: p.st === "late" && atrasoDias >= DIAS_PARA_CANCELAR,
    siCancela: { cargo, app, tienda }, cancelado: p.st === "cancelled" ? { cargo: p.kept } : null };
}
async function ev(c: Q, opId: string, kind: string, actor: "user" | "business" | "system", actorId: string | null, note: Bi) {
  await c.query(`insert into operation_events (operation_id, kind, actor, actor_id, note) values ($1::bigint, $2, $3, $4, $5::jsonb)`, [opId, kind, actor, actorId, JSON.stringify(note)]);
}
/* Estado del plan según sus pagos: pagado si no falta nada; atrasado si hay uno vencido; si no, activo. */
async function recalcular(c: Q, planId: string): Promise<{ listo: boolean }> {
  const r = (await c.query<{ falta: number; tarde: number; prox: string | null }>(
    `select count(*) filter (where status in ('due', 'late'))::int as falta, count(*) filter (where status = 'late')::int as tarde, min(due_at) filter (where status in ('due', 'late')) as prox
       from layaway_payments where plan_id = $1::bigint`, [planId])).rows[0]!;
  const st = r.falta === 0 ? "paid" : r.tarde ? "late" : "active";
  const u = await c.query(`update layaway_plans set status = $2, next_due_at = $3, updated_at = now() where id = $1::bigint and status in ('active', 'late') returning id`, [planId, st, r.prox]);
  return { listo: st === "paid" && !!u.rowCount };
}
type OpPlan = { op: string; numero: string; biz: string; bname: string; uid: string; cliente: string; plan: string; st: string; sms: boolean };
async function opDe(where: string, args: unknown[], c: Q = db()): Promise<OpPlan | null> {
  return (await c.query<OpPlan>(
    `select o.id::text as op, o.number as numero, o.business_id as biz, b.name as bname, o.user_id::text as uid, coalesce(nullif(u.first_name, ''), 'Cliente') as cliente, lp.id::text as plan, lp.status as st,
            coalesce((o.details->>'sms')::boolean, true) as sms
       from operations o join layaway_plans lp on lp.operation_id = o.id join businesses b on b.id = o.business_id join users u on u.id = o.user_id where o.kind = 'hold' and ${where}`, args)).rows[0] ?? null;
}
const hrefC = (x: OpPlan) => ({ href: `/apartado/${x.numero}`, ref: ["apartado", x.numero] as [string, string], sinSms: !x.sms });
const hrefN = (x: OpPlan) => ({ href: `/panel/${x.biz}/hoy?det=apt:${x.numero}`, ref: ["apartado", x.numero] as [string, string] });
const fechaL = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-US", { timeZone: "America/New_York", weekday: "short", day: "numeric", month: "short" }) : "");

/* La tienda confirmó que lo tiene: se cobra el abono y empieza el calendario. Idempotente (también lo usa la reparación). */
export async function activarPlan(opId: string): Promise<void> {
  const cob = await import("./cobros");
  await cob.cobrarOperacion(opId);
  const r = await tx(async (c) => {
    const p = (await c.query<{ id: string; cada: number; pid: string | null }>(
      `select lp.id::text, lp.every_days as cada, (select p.id::text from payments p where p.operation_id = lp.operation_id and p.kind = 'deposit' and p.status = 'captured' limit 1) as pid
         from layaway_plans lp join operations o on o.id = lp.operation_id where lp.operation_id = $1::bigint and lp.status = 'pending' and o.status = 'confirmed' for update of lp`, [opId])).rows[0];
    if (!p?.pid) return null;
    await c.query(`update layaway_payments set status = 'paid', paid_at = now(), paid_where = 'app', payment_id = $2::bigint where plan_id = $1::bigint and seq = 0`, [p.id, p.pid]);
    await c.query(`update layaway_payments set due_at = now() + make_interval(days => seq * $2::int) where plan_id = $1::bigint and seq >= 1`, [p.id, p.cada]);
    await c.query(`update layaway_plans set status = 'active', next_due_at = now() + make_interval(days => $2::int), updated_at = now() where id = $1::bigint`, [p.id, p.cada]);
    await ev(c, opId, "lay_accepted", "system", null, { es: "La tienda confirmó: se cobró el abono y empieza el plan", en: "Store confirmed: down payment charged, plan started" });
    return p.id;
  });
  if (!r) return;
  const x = await opDe("o.id = $1::bigint", [opId]), v = await planDe(opId);
  if (x && v) await (await import("./avisos")).avisar(x.uid, "lay_abono", { negocio: x.bname, monto: money(v.abono), pago: money(v.siguiente?.monto ?? 0), fecha: fechaL(v.siguiente?.vence ?? null) }, hrefC(x));
}
/* Un apartado en plan que no siguió antes de empezar (no lo tenían, canceló, venció): el plan queda cerrado; el abono se libera aparte. */
export async function cerrarPlanPendiente(c: Q, opId: string, st: "declined" | "cancelled") {
  await c.query(`update layaway_plans set status = $2, cancelled_at = now(), updated_at = now() where operation_id = $1::bigint and status = 'pending'`, [opId, st]);
}

/* ── Pagar un pago en la app (con la persona presente): se retiene y se cobra en el acto ── */
export async function pagarCuota(userId: string, numero: string, pm: string): Promise<Res<{ monto: number; listo: boolean }>> {
  if (!NUM.test(String(numero)) || typeof pm !== "string" || !/^pm_[A-Za-z0-9_]{3,80}$/.test(pm)) return no("Elige la tarjeta con que pagas.", "Choose the card you pay with.");
  const x = await opDe("o.number = $1 and o.user_id = $2", [numero, userId]);
  if (!x) return no("Ese plan no existe.", "That plan does not exist.");
  if (x.st !== "active" && x.st !== "late") return no("Este plan no tiene pagos pendientes.", "This plan has no pending payments.");
  const cob = await import("./cobros"), { pasarela } = await import("./pagos/pasarela"), T = await cob.tarjetaDe(x.biz);
  if (!T.on || !T.cuenta) return no("La tienda no está cobrando con tarjeta ahora. Paga en la tienda.", "The store is not taking cards right now. Pay at the store.");
  let pi: string | null = null;
  try {
    const r = await tx(async (c): Promise<Res<{ pid: string; monto: number; fee: number; seq: number }>> => {
      await c.query(`select 1 from layaway_plans where id = $1::bigint for update`, [x.plan]);
      const s = (await c.query<{ seq: number; monto: number }>(`select seq, amount_cents as monto from layaway_payments where plan_id = $1::bigint and seq >= 1 and status in ('due', 'late') order by seq limit 1`, [x.plan])).rows[0];
      if (!s) return no("Ya pagaste todo el plan.", "You already paid the whole plan.");
      const ya = (await c.query<{ id: string; st: string }>(`select id::text, status as st from payments where operation_id = $1::bigint and kind = 'balance' and seq = $2 and status in ('held', 'captured')`, [x.op, s.seq])).rows[0];
      if (ya) return no("Ese pago ya se está procesando. Actualiza la pantalla.", "That payment is already being processed. Refresh the screen.");
      const ret = await cob.retenerPedido({ negocio: x.biz, cuenta: T.cuenta!, clave: `lay-${x.plan}-${s.seq}`, total: s.monto, subtotal: s.monto, pm, userId, numero: x.numero, tipo: "apt" }, c);
      if (!ret.ok) return no(ret.mensaje.es, ret.mensaje.en);
      pi = ret.pi;
      if (ret.estado === "accion") return no("Tu banco pide una verificación extra que todavía no hacemos aquí. Prueba con otra tarjeta o paga en la tienda.", "Your bank asks for an extra verification we can't do here yet. Try another card or pay at the store.");
      const pid = (await c.query<{ id: string }>(
        `insert into payments (operation_id, user_id, business_id, city_id, kind, seq, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, simulated, payment_method)
         select $1::bigint, $2, $3, o.city_id, 'balance', $4, 'card', $5, $6::int, $6::int, $7::int, 'held', $8, $9, now(), $10, $11 from operations o where o.id = $1::bigint returning id::text`,
        [x.op, userId, x.biz, s.seq, ret.pi, s.monto, ret.comision, ret.marca, ret.ultimos4, ret.pi.startsWith("pi_sim_"), pm])).rows[0]!.id;
      return { ok: true, pid, monto: s.monto, fee: ret.comision, seq: s.seq };
    });
    if (!r.ok) { if (pi) await pasarela.liberar(pi).catch(() => undefined); return r; }
    pi = null;
    const l = await liquidarCuota(r.pid);
    if (!l.ok) return no("El banco no aprobó el cobro. Prueba con otra tarjeta o paga en la tienda.", "The bank did not approve the charge. Try another card or pay at the store.");
    return { ok: true, monto: r.monto, listo: l.listo };
  } catch (e) {
    if (pi) await pasarela.liberar(pi).catch(() => undefined);
    throw e;
  }
}
/* Cobra un pago del plan retenido y lo marca pagado. Idempotente: también lo usa la reparación. */
export async function liquidarCuota(paymentId: string): Promise<{ ok: boolean; listo: boolean }> {
  const { pasarela } = await import("./pagos/pasarela");
  const p = (await db().query<{ id: string; pi: string; monto: number; fee: number; seq: number; op: string; st: string }>(
    `select id::text, stripe_payment_intent as pi, amount_cents as monto, fee_cents as fee, seq, operation_id::text as op, status as st from payments where id = $1::bigint and kind = 'balance'`, [paymentId])).rows[0];
  if (!p || p.st !== "held") return { ok: p?.st === "captured", listo: false };
  const r = await pasarela.cobrar(p.pi, p.monto, Math.min(p.fee, p.monto));
  if (!r.ok) { await db().query(`update payments set failure_code = $2, updated_at = now() where id = $1::bigint`, [p.id, r.codigo ?? "error"]); return { ok: false, listo: false }; }
  const hecho = await tx(async (c) => {
    const u = await c.query(`update payments set status = 'captured', captured_at = now(), failure_code = null, updated_at = now() where id = $1::bigint and status = 'held'`, [p.id]);
    if (!u.rowCount) return null;
    const plan = (await c.query<{ id: string }>(`select id::text from layaway_plans where operation_id = $1::bigint for update`, [p.op])).rows[0]!.id;
    await c.query(`update layaway_payments set status = 'paid', paid_at = now(), paid_where = 'app', payment_id = $3::bigint where plan_id = $1::bigint and seq = $2 and status in ('due', 'late')`, [plan, p.seq, p.id]);
    await ev(c, p.op, "lay_paid", "user", null, { es: `Pagó ${money(p.monto)} del plan en la app (pago ${p.seq})`, en: `Paid ${money(p.monto)} of the plan in the app (payment ${p.seq})` });
    return recalcular(c, plan);
  });
  if (hecho) await avisarPago(p.op, p.monto, hecho.listo);
  return { ok: true, listo: !!hecho?.listo };
}
async function avisarPago(opId: string, monto: number, listo: boolean) {
  const x = await opDe("o.id = $1::bigint", [opId]), v = await planDe(opId), av = await import("./avisos");
  if (!x || !v) return;
  if (listo) {
    await av.avisar(x.uid, "lay_listo", { negocio: x.bname }, hrefC(x));
    await av.avisarNegocio(x.biz, "biz_apartado", { cliente: x.cliente, que: "terminó de pagar su plan · tenlo listo para recoger" }, hrefN(x));
  } else await av.avisar(x.uid, "lay_pagado", { negocio: x.bname, monto: money(monto), falta: money(v.falta) }, hrefC(x));
}

/* ── La tienda: «Pagó en la tienda» (el pago que sigue; sin comisión) ── */
export async function pagoEnTienda(negocio: string, numero: string, actorId: string): Promise<Res> {
  const x = NUM.test(String(numero)) ? await opDe("o.number = $1 and o.business_id = $2", [numero, negocio]) : null;
  if (!x) return no("Ese plan no existe.", "That plan does not exist.");
  let monto = 0;
  const r = await tx(async (c): Promise<Res<{ listo: boolean }>> => {
    const st = (await c.query<{ st: string }>(`select status as st from layaway_plans where id = $1::bigint for update`, [x.plan])).rows[0]!.st;
    if (st !== "active" && st !== "late") return no("Este plan no tiene pagos pendientes.", "This plan has no pending payments.");
    const s = (await c.query<{ seq: number; monto: number }>(`select seq, amount_cents as monto from layaway_payments where plan_id = $1::bigint and seq >= 1 and status in ('due', 'late') order by seq limit 1`, [x.plan])).rows[0];
    if (!s) return no("Ya pagó todo el plan.", "The plan is fully paid.");
    if ((await c.query(`select 1 from payments where operation_id = $1::bigint and kind = 'balance' and seq = $2 and status = 'held'`, [x.op, s.seq])).rowCount) return no("Ese pago se está cobrando en la app ahora mismo.", "That payment is being charged in the app right now.");
    await c.query(`update layaway_payments set status = 'waived', paid_at = now(), paid_where = 'store' where plan_id = $1::bigint and seq = $2`, [x.plan, s.seq]);
    await ev(c, x.op, "lay_paid", "business", actorId, { es: `Pagó ${money(s.monto)} del plan en la tienda (pago ${s.seq})`, en: `Paid ${money(s.monto)} of the plan at the store (payment ${s.seq})` });
    monto = s.monto;
    return { ok: true, ...(await recalcular(c, x.plan)) };
  });
  if (!r.ok) return r;
  await avisarPago(x.op, monto, r.listo);
  return { ok: true };
}

/* ── Cancelar el plan: lo abonado menos el cargo; lo de la app vuelve por la tarjeta; la unidad vuelve al estante ── */
export async function cancelarPlan(f: { numero: string; userId?: string; negocio?: string }, por: "user" | "business" | "admin", actorId: string | null): Promise<Res<{ devuelto: number; tienda: number }>> {
  if (!NUM.test(String(f.numero))) return no("Ese plan no existe.", "That plan does not exist.");
  const x = f.userId ? await opDe("o.number = $1 and o.user_id = $2", [f.numero, f.userId]) : f.negocio ? await opDe("o.number = $1 and o.business_id = $2", [f.numero, f.negocio]) : await opDe("o.number = $1", [f.numero]);
  if (!x) return no("Ese plan no existe.", "That plan does not exist.");
  const v0 = await planDe(x.op);
  if (!v0 || (v0.st !== "active" && v0.st !== "late")) return no("Este plan ya no está vivo.", "This plan is no longer active.");
  if (por === "business" && !v0.puedeCancelarTienda) return no(`Solo puedes cancelar un plan con ${DIAS_PARA_CANCELAR} días de atraso.`, `You can only cancel a plan ${DIAS_PARA_CANCELAR} days late.`);
  const r = await tx(async (c): Promise<Res<{ cargo: number }>> => {
    const u = await c.query(`update layaway_plans set status = 'cancelled', cancelled_at = now(), cancelled_by = $2, updated_at = now() where id = $1::bigint and status in ('active', 'late')`, [x.plan, por]);
    if (!u.rowCount) return no("Este plan ya no está vivo.", "This plan is no longer active.");
    const v = (await planDe(x.op, c))!;
    // fee_kept_cents se fija una vez (es lo que se queda la tienda); el disparador no lo protege porque nace en 0.
    await c.query(`update layaway_plans set fee_kept_cents = $2::int where id = $1::bigint`, [x.plan, v.siCancela.cargo]);
    const o = await c.query(`update operations set status = 'cancelled', cancelled_at = now(), cancelled_by = $2, status_detail = 'plan_cancelado', updated_at = now() where id = $1::bigint and status = 'confirmed'`, [x.op, por === "admin" ? "system" : por]);
    if (o.rowCount) {
      // La unidad que estaba guardada para el plan vuelve al estante.
      await c.query(`update item_variants vv set stock_left = least(9999, vv.stock_left + l.qty), updated_at = now() from operation_lines l where l.operation_id = $1::bigint and l.variant_id = vv.id and l.status = 'ok'`, [x.op]);
      await c.query(`update items i set stock_left = i.stock_left + l.qty, updated_at = now() from operation_lines l where l.operation_id = $1::bigint and l.item_id = i.id and l.status = 'ok' and l.variant_id is null and i.stock_mode = 'qty'`, [x.op]);
    }
    await ev(c, x.op, "lay_cancelled", por === "user" ? "user" : por === "business" ? "business" : "system", actorId, { es: `Plan cancelado · cargo ${money(v.siCancela.cargo)} · se devuelven ${money(v.siCancela.app)} por la tarjeta${v.siCancela.tienda ? ` y ${money(v.siCancela.tienda)} en la tienda` : ""}`, en: `Plan cancelled · fee ${money(v.siCancela.cargo)} · ${money(v.siCancela.app)} back to the card${v.siCancela.tienda ? ` and ${money(v.siCancela.tienda)} at the store` : ""}` });
    return { ok: true, cargo: v.siCancela.cargo };
  });
  if (!r.ok) return r;
  const dev = await reembolsarPlan(x.op);
  // Lo abonado menos el cargo: por la tarjeta vuelve lo cobrado en la app menos el cargo; el resto lo devuelve la tienda.
  const v = (await planDe(x.op))!, tienda = Math.max(0, v.pagado - r.cargo - dev.objetivo);
  const av = await import("./avisos"), msg = `Te devuelven ${money(dev.objetivo)} a tu tarjeta${tienda ? ` y la tienda te devuelve ${money(tienda)}` : ""} (lo abonado menos ${v.cargo} %).`;
  await av.avisar(x.uid, "lay_cancelado", { negocio: x.bname, devuelto: msg }, hrefC(x));
  await av.avisarNegocio(x.biz, "biz_apartado", { cliente: x.cliente, que: por === "user" ? `canceló su plan · ${tienda ? `devuélvele ${money(tienda)} de lo que pagó en la tienda` : "vuelve al estante"}` : "plan cancelado · vuelve al estante" }, hrefN(x));
  return { ok: true, devuelto: dev.objetivo, tienda };
}
/* Devuelve por la tarjeta lo que toca de un plan cancelado (lo cobrado en la app menos lo que falte del cargo), del pago más
   nuevo al más viejo. Idempotente por pago: si una devolución falla, la reparación la vuelve a intentar. */
export async function reembolsarPlan(opId: string): Promise<{ objetivo: number; devuelto: number }> {
  const cob = await import("./cobros");
  const p = (await db().query<{ id: string; kept: number }>(
    `select lp.id::text, lp.fee_kept_cents as kept from layaway_plans lp where lp.operation_id = $1::bigint and lp.status = 'cancelled'`, [opId])).rows[0];
  if (!p) return { objetivo: 0, devuelto: 0 };
  const P = (await db().query<{ id: string; amount: number; refunded: number }>(
    `select id::text, amount_cents as amount, refunded_cents as refunded from payments where operation_id = $1::bigint and kind in ('deposit', 'balance') and status in ('captured', 'partially_refunded', 'refunded') order by id desc`, [opId])).rows;
  // El cargo se toma primero de lo cobrado en la app; lo que sobre del cargo sale de lo pagado en la tienda.
  const cobrado = P.reduce((s, x) => s + x.amount, 0), objetivo = Math.max(0, cobrado - p.kept);
  let falta = objetivo - P.reduce((s, x) => s + x.refunded, 0), devuelto = 0;
  for (const x of P) {
    if (falta <= 0) break;
    const n = Math.min(falta, x.amount - x.refunded);
    if (n <= 0) continue;
    const r = await cob.devolverPago({ paymentId: x.id, centavos: n, por: "policy", actorId: null, motivo: "Plan cancelado: lo abonado menos el cargo", idem: `lay-cx-${p.id}-${x.id}` });
    if (r.ok) { falta -= n; devuelto += n; }
  }
  return { objetivo, devuelto };
}

/* ── El barrido (idempotente): aviso 2 días antes, atrasado al pasar la fecha ── */
export async function barrerPlanes(f: { negocio?: string; userId?: string; numero?: string }): Promise<void> {
  const W = f.numero ? "o.number = $1" : f.negocio ? "o.business_id = $1" : f.userId ? "o.user_id = $1" : "true", A = f.numero ? [f.numero] : f.negocio ? [f.negocio] : f.userId ? [f.userId] : [];
  const L = (await db().query<{ op: string; plan: string; seq: number; monto: number; vence: string; tarde: boolean }>(
    `select o.id::text as op, lp.id::text as plan, lpp.seq, lpp.amount_cents as monto, lpp.due_at as vence, lpp.due_at < now() as tarde
       from layaway_payments lpp join layaway_plans lp on lp.id = lpp.plan_id join operations o on o.id = lp.operation_id
      where ${W} and lp.status in ('active', 'late') and lpp.seq >= 1 and ((lpp.status = 'due' and lpp.due_at < now()) or (lpp.status = 'due' and lpp.reminded_at is null and lpp.due_at < now() + interval '2 days')) limit 50`, A)).rows;
  const av = await import("./avisos");
  for (const y of L) {
    const x = await opDe("o.id = $1::bigint", [y.op]);
    if (!x) continue;
    if (y.tarde) {
      const u = await tx(async (c) => {
        const k = await c.query(`update layaway_payments set status = 'late', late_noticed_at = now() where plan_id = $1::bigint and seq = $2 and status = 'due'`, [y.plan, y.seq]);
        if (!k.rowCount) return false;
        await recalcular(c, y.plan);
        await ev(c, y.op, "lay_late", "system", null, { es: `Pago ${y.seq} atrasado (${money(y.monto)})`, en: `Payment ${y.seq} late (${money(y.monto)})` });
        return true;
      });
      if (u) { await av.avisar(x.uid, "lay_atrasado", { negocio: x.bname, monto: money(y.monto) }, hrefC(x)); await av.avisarNegocio(x.biz, "biz_apartado", { cliente: x.cliente, que: `se atrasó en su plan (${money(y.monto)})` }, hrefN(x)); }
    } else {
      const k = await db().query(`update layaway_payments set reminded_at = now() where plan_id = $1::bigint and seq = $2 and reminded_at is null`, [y.plan, y.seq]);
      if (k.rowCount) await av.avisar(x.uid, "lay_pronto", { negocio: x.bname, monto: money(y.monto), fecha: fechaL(y.vence) }, hrefC(x));
    }
  }
}

/* Lo que quedó a medias con el plan: abono retenido de un apartado confirmado → cobrar y empezar; pago retenido → cobrar;
   plan cancelado con devolución pendiente → devolver. */
export async function repararPlanes(negocio: string) {
  const L = (await db().query<{ op: string; pid: string; kind: string; ost: string }>(
    `select o.id::text as op, p.id::text as pid, p.kind, o.status as ost from payments p join operations o on o.id = p.operation_id join layaway_plans lp on lp.operation_id = o.id
      where p.business_id = $1 and p.status = 'held' and p.kind in ('deposit', 'balance') and o.kind = 'hold' limit 20`, [negocio])).rows;
  for (const x of L) {
    if (x.kind === "balance") await liquidarCuota(x.pid);
    else if (x.ost === "confirmed") await activarPlan(x.op);
    else if (x.ost !== "pending") await (await import("./cobros")).liberarOperacion(x.op);
  }
  const C = (await db().query<{ op: string }>(
    `select o.id::text as op from layaway_plans lp join operations o on o.id = lp.operation_id where o.business_id = $1 and lp.status = 'cancelled'
        and (select coalesce(sum(amount_cents - refunded_cents), 0) from payments p where p.operation_id = o.id and p.kind in ('deposit', 'balance') and p.status in ('captured', 'partially_refunded')) > lp.fee_kept_cents limit 10`, [negocio])).rows;
  for (const x of C) await reembolsarPlan(x.op);
}
