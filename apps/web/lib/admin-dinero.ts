import "server-only";
import type { Staff } from "./admin";
import { db } from "./db";
import { pasarela } from "./pagos/pasarela";

/* ADM-NEG · 360° › Dinero (Super Admin.dc.html, pestaña «din»): cobrado, retenido, devuelto y comisión (90 días); la cuenta
   de cobro (Stripe), los pagos semanales al banco y la pausa; el plan con sus facturas; los últimos cobros con tarjeta.
   Todo de lectura: las acciones están en app/admin/acciones-dinero.ts y acciones-planes.ts. */
export type Dinero = Awaited<ReturnType<typeof datosDinero>>;
export async function datosDinero(s: Staff, negocio: string) {
  const [k, cta, sem, sub, fac, L] = await Promise.all([
    db().query<{ cobrado: number; retenido: number; devuelto: number; comision: number; n: number }>(
      `select coalesce(sum(amount_cents) filter (where status in ('captured', 'partially_refunded', 'refunded')), 0)::int as cobrado,
              coalesce(sum(amount_cents) filter (where status = 'held'), 0)::int as retenido,
              coalesce(sum(refunded_cents), 0)::int as devuelto,
              coalesce(sum(fee_cents * (amount_cents - refunded_cents) / amount_cents) filter (where status in ('captured', 'partially_refunded')), 0)::int as comision,
              count(*)::int as n
         from payments where business_id = $1 and created_at > now() - interval '90 days'`, [negocio]),
    db().query<{ estado: string; banco: string | null; pide: string[]; pausado: boolean; motivo: string | null; desde: string | null; quien: string | null; sim: boolean }>(
      `select a.status as estado, a.bank_last4 as banco, a.requirements as pide, a.payouts_paused as pausado, a.paused_reason as motivo,
              to_char(a.paused_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as desde, a.simulated as sim,
              (select coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), 'Equipo') from users u where u.id = a.paused_by) as quien
         from stripe_accounts a where a.business_id = $1`, [negocio]),
    /* Pagos semanales: lo cobrado de cada semana (lunes a domingo, hora de la ciudad) menos devoluciones y comisión sale al
       banco el martes siguiente. Las últimas 6 semanas y la que corre. */
    db().query<{ ini: string; martes: string; neto: number; n: number }>(
      `with c as (select timezone as tz from cities where id = (select city_id from businesses where id = $1))
       select to_char(date_trunc('week', p.captured_at at time zone c.tz), 'YYYY-MM-DD') as ini,
              to_char((date_trunc('week', p.captured_at at time zone c.tz) + interval '8 days') at time zone c.tz at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as martes,
              sum(p.amount_cents - p.refunded_cents - p.fee_cents * (p.amount_cents - p.refunded_cents) / p.amount_cents)::int as neto, count(*)::int as n
         from payments p, c where p.business_id = $1 and p.status in ('captured', 'partially_refunded', 'refunded') and p.captured_at > now() - interval '50 days'
        group by 1, 2 order by 1 desc limit 7`, [negocio]),
    db().query<{ estado: string; ciclo: string; precio: number; fin: string | null; intentos: number; desde: string; usada: boolean }>(
      `select status as estado, cycle as ciclo, price_cents as precio, failed_attempts as intentos, trial_started_at is not null as usada,
              to_char(coalesce(case status when 'trial' then trial_ends_at when 'courtesy' then courtesy_until when 'past_due' then next_attempt_at when 'ended' then ended_at else current_period_end end) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as fin,
              to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as desde
         from subscriptions where business_id = $1`, [negocio]),
    db().query<{ id: string; kind: string; monto: number | null; at: string; intento: number | null; actor: string | null }>(
      `select e.id::text, e.kind, e.amount_cents as monto, to_char(e.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, (e.note ->> 'intento')::int as intento,
              (select coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), 'Equipo') from users u join staff_members m on m.user_id = u.id where u.id = e.actor_id limit 1) as actor
         from subscription_events e where e.business_id = $1 and e.kind in ('charged', 'failed', 'trial_extended', 'courtesy', 'courtesy_removed', 'ended')
        order by e.at desc, e.id desc limit 12`, [negocio]),
    db().query<{ op: string; num: string; quien: string; monto: number; comision: number; devuelto: number; estado: string; at: string; tarjeta: string | null }>(
      `select o.id::text as op, o.number as num, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), '—') as quien,
              p.amount_cents as monto, p.fee_cents as comision, p.refunded_cents as devuelto, p.status as estado,
              to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at,
              case when p.card_brand is not null and p.card_last4 is not null then upper(p.card_brand) || ' ·· ' || p.card_last4 end as tarjeta
         from payments p join operations o on o.id = p.operation_id join users u on u.id = p.user_id
        where p.business_id = $1 order by p.id desc limit 12`, [negocio]),
  ]);
  const ahora = Date.now(), c = cta.rows[0] ?? null;
  const pagos = sem.rows.filter((w) => w.neto > 0).map((w) => {
    const t = new Date(w.martes).getTime();
    return { martes: w.martes, monto: w.neto, n: w.n, st: c?.pausado && t > ahora - 7 * 86_400_000 ? "hold" : t > ahora ? "next" : "sent" } as const;
  });
  return {
    modo: pasarela.modo(),
    kpi: k.rows[0]!,
    cuenta: c,
    pagos,
    sub: sub.rows[0] ?? null,
    facturas: fac.rows,
    cobros: L.rows,
    puede: { pausar: s.puede("tx", "aprobar"), planE: s.puede("plan", "editar"), planA: s.puede("plan", "aprobar") },
  };
}
