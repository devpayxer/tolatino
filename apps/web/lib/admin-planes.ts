import "server-only";
import type { Staff } from "./admin";
import { db } from "./db";
import { PRECIO_PRO, PRUEBA_DIAS, TOPE_FREE } from "./plan";

/* ADM-PLAN · Planes y suscripciones (Super Admin.dc.html secPlan): MRR, en prueba, cobro fallido, Free al techo; Planes
   (qué incluye cada uno), Suscripciones (estado de cada negocio de tus ciudades) y Comisiones (vigentes y programadas). */
export type TabPlan = "res" | "subs" | "fees" | "ing";
export type FilaSub = { negocio: string; nombre: string; estado: string; fin: string | null; ciclo: string; intentos: number; dueño: string | null; desde: string };
const CIUD = "(cardinality($1::text[]) = 0 or b.city_id = any($1::text[]))";
export async function datosPlanes(s: Staff, tab: TabPlan, est: string | null) {
  const [k, L, F] = await Promise.all([
    db().query<{ activos: number; anuales: number; prueba: number; prueba7: number; fallidos: number; cortesia: number; techo: number }>(
      `select count(*) filter (where x.status in ('active', 'canceling') and x.cycle = 'month')::int as activos, count(*) filter (where x.status in ('active', 'canceling') and x.cycle = 'year')::int as anuales,
              count(*) filter (where x.status = 'trial')::int as prueba, count(*) filter (where x.status = 'trial' and x.trial_ends_at < now() + interval '7 days')::int as prueba7,
              count(*) filter (where x.status = 'past_due')::int as fallidos, count(*) filter (where x.status = 'courtesy')::int as cortesia,
              (select count(*)::int from businesses b join business_stats_cache st on st.business_id = b.id join cities c on c.id = b.city_id
                where ${CIUD} and b.status = 'active' and st.plan = 'free'
                  and (select count(*) from operations o where o.business_id = b.id and o.kind <> 'table' and o.sent_at >= date_trunc('month', now() at time zone c.timezone) at time zone c.timezone) >= ${TOPE_FREE}) as techo
         from subscriptions x join businesses b on b.id = x.business_id where ${CIUD}`, [s.cities]),
    tab === "subs" ? db().query<FilaSub>(
      `select x.business_id as negocio, b.name as nombre, x.status as estado, x.cycle as ciclo, x.failed_attempts as intentos,
              to_char(coalesce(case x.status when 'trial' then x.trial_ends_at when 'courtesy' then x.courtesy_until when 'past_due' then x.next_attempt_at when 'ended' then x.ended_at else x.current_period_end end) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as fin,
              (select coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), u.phone) from users u where u.id = x.payer_user_id) as "dueño",
              to_char(x.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as desde
         from subscriptions x join businesses b on b.id = x.business_id where ${CIUD} and ($2::text is null or x.status = $2)
        order by case x.status when 'past_due' then 0 when 'trial' then 1 when 'canceling' then 2 when 'active' then 3 when 'courtesy' then 4 else 5 end, x.updated_at desc limit 200`, [s.cities, est]) : Promise.resolve({ rows: [] as FilaSub[] }),
    tab === "fees" ? db().query<{ id: string; kind: string; rate_bp: number; fixed_cents: number; desde: string; vigente: boolean; reason: string | null }>(
      `select f.id::text, f.kind, f.rate_bp, f.fixed_cents, to_char(f.effective_from at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as desde, f.effective_from <= now() as vigente, f.reason
         from fee_rules f where f.effective_from > now() or f.id in (select distinct on (kind) id from fee_rules where effective_from <= now() order by kind, effective_from desc, id desc)
        order by f.kind, f.effective_from`) : Promise.resolve({ rows: [] }),
  ]);
  const x = k.rows[0]!, precio = Math.round(PRECIO_PRO * 100);
  return { kpi: { ...x, mrr: x.activos * precio + Math.round((x.anuales * precio * 10) / 12) }, subs: L.rows, fees: F.rows, cfg: { precio, prueba: PRUEBA_DIAS, tope: TOPE_FREE } };
}
export type DatosPlanes = Awaited<ReturnType<typeof datosPlanes>>;

/* Ingresos (diseño secPlan · «ing»): comisiones de 8 semanas (lo cobrado con tarjeta, neto de devoluciones), cobros de Pro
   de 8 semanas, comisión por categoría en 90 días. Acotado a las ciudades de quien mira; semanas de lunes a domingo
   (hora del Este). Todo sale del libro propio (payments, subscription_events). */
export async function ingresos(s: Staff) {
  const C = "(cardinality($1::text[]) = 0 or b.city_id = any($1::text[]))";
  const [W, P, K] = await Promise.all([
    db().query<{ ini: string; fee: number; n: number }>(
      `with s as (select generate_series(date_trunc('week', now() at time zone 'America/New_York') - interval '7 weeks', date_trunc('week', now() at time zone 'America/New_York'), interval '1 week') as ini)
       select to_char(s.ini, 'YYYY-MM-DD') as ini,
              coalesce(sum(p.fee_cents * (p.amount_cents - p.refunded_cents) / nullif(p.amount_cents, 0)), 0)::int as fee, count(p.id)::int as n
         from s left join (payments p join businesses b on b.id = p.business_id and ${C})
           on p.status in ('captured', 'partially_refunded') and date_trunc('week', p.captured_at at time zone 'America/New_York') = s.ini
        group by s.ini order by s.ini`, [s.cities]),
    db().query<{ ini: string; pro: number }>(
      `with s as (select generate_series(date_trunc('week', now() at time zone 'America/New_York') - interval '7 weeks', date_trunc('week', now() at time zone 'America/New_York'), interval '1 week') as ini)
       select to_char(s.ini, 'YYYY-MM-DD') as ini, coalesce(sum(e.amount_cents), 0)::int as pro
         from s left join (subscription_events e join businesses b on b.id = e.business_id and ${C})
           on e.kind = 'charged' and date_trunc('week', e.at at time zone 'America/New_York') = s.ini
        group by s.ini order by s.ini`, [s.cities]),
    db().query<{ cat: string; fee: number }>(
      `select coalesce(c.name ->> 'es', b.category_id) as cat, sum(p.fee_cents * (p.amount_cents - p.refunded_cents) / nullif(p.amount_cents, 0))::int as fee
         from payments p join businesses b on b.id = p.business_id left join categories c on c.id = b.category_id
        where ${C} and p.status in ('captured', 'partially_refunded') and p.captured_at > now() - interval '90 days'
        group by 1 having sum(p.fee_cents) > 0 order by 2 desc limit 8`, [s.cities]),
  ]);
  return { semanas: W.rows.map((w, i) => ({ ...w, pro: P.rows[i]?.pro ?? 0 })), categorias: K.rows };
}
export type Ingresos = Awaited<ReturnType<typeof ingresos>>;
