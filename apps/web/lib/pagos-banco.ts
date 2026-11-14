import "server-only";
import { db } from "./db";
import { pasarela } from "./pagos/pasarela";

/* 9k · Pagos al banco (Payout; LAUNCH L358, L829): cada negocio recibe lo suyo los MARTES (decisión del fundador; Configuración › Dinero
   «pagos_banco_dia»). Con Stripe de verdad, el calendario semanal de cada cuenta conectada (cuentaCrear lo fija; pausar lo pasa a manual y reanudar lo
   vuelve al martes) y el webhook payout.* escribe el libro propio (payouts). En el sandbox, el simulador paga el martes el saldo de cada cuenta simulada
   que no está pausada y el libro se escribe igual que con el webhook. La conciliación compara los dos lados cada día. */
type Bi = { es: string; en: string };

/* Barrido: el martes (hora del Este), una vez por cuenta y fecha. Con Stripe no hace nada (paga Stripe con su calendario). */
export async function pagarAlBanco(): Promise<number> {
  if (pasarela.modo() !== "simulador") return 0;
  const h = (await db().query<{ hoy: string; dow: number; dia: number }>(
    `select to_char((now() at time zone 'America/New_York')::date, 'YYYY-MM-DD') as hoy, extract(dow from now() at time zone 'America/New_York')::int as dow, cfg_int('pagos_banco_dia') as dia`)).rows[0]!;
  if (h.dow !== h.dia) return 0;
  const C = (await db().query<{ acct: string; biz: string; city: string | null }>(
    `select a.stripe_account_id as acct, a.business_id as biz, b.city_id as city from stripe_accounts a join businesses b on b.id = a.business_id
      where a.simulated and a.payouts_enabled and not a.payouts_paused order by a.business_id limit 20000`)).rows;
  if (!C.length) return 0;
  const por = new Map(C.map((x) => [x.acct, x]));
  let n = 0;
  for (const p of await pasarela.simPagarAlBanco(C.map((x) => x.acct), h.hoy)) {
    const c = por.get(p.destino);
    const r = await db().query(
      `insert into payouts (stripe_payout_id, stripe_account_id, business_id, city_id, amount_cents, status, arrival_date, simulated)
       values ($1::text, $2::text, $3::text, $4::text, $5::int, 'paid', $6::date + 2, true) on conflict (stripe_payout_id) do nothing`,
      [p.id, p.destino, c?.biz ?? null, c?.city ?? null, p.centavos, h.hoy]);
    n += r.rowCount ?? 0;
  }
  return n;
}

/* Webhook payout.created / updated / paid / failed / canceled de una cuenta conectada: el libro se pone al día (nada se borra; un pago terminado no
   vuelve; el monto no cambia: la base lo impone). */
export async function registrarPayout(cuenta: string, o: Record<string, unknown>): Promise<void> {
  const id = String(o.id ?? ""), st = String(o.status ?? "pending");
  if (!/^po_[A-Za-z0-9_-]{3,250}$/.test(id) || !/^acct_[A-Za-z0-9_-]{3,200}$/.test(cuenta)) return;
  const estado = ["pending", "in_transit", "paid", "failed", "canceled"].includes(st) ? st : "pending";
  const llega = Number(o.arrival_date ?? 0) ? new Date(Number(o.arrival_date) * 1000).toISOString().slice(0, 10) : null;
  await db().query(
    `insert into payouts (stripe_payout_id, stripe_account_id, business_id, city_id, amount_cents, status, arrival_date, failure_code)
     select $1::text, $2::text, a.business_id, b.city_id, $3::int, $4::text, $5::date, $6::text from (select 1) x
       left join stripe_accounts a on a.stripe_account_id = $2::text left join businesses b on b.id = a.business_id
     on conflict (stripe_payout_id) do update set status = case when payouts.status in ('paid', 'failed', 'canceled') then payouts.status else excluded.status end,
       arrival_date = coalesce(excluded.arrival_date, payouts.arrival_date), failure_code = coalesce(excluded.failure_code, payouts.failure_code)`,
    [id, cuenta, Math.max(0, Math.round(Number(o.amount ?? 0))), estado, llega, o.failure_code ? String(o.failure_code).slice(0, 60) : null]);
}

/* Panel › Cobros: los últimos pagos al banco del negocio (lo que de verdad salió, del libro). */
export async function pagosAlBancoDe(negocio: string): Promise<{ id: string; monto: number; estado: string; llega: string | null; at: string }[]> {
  return (await db().query<{ id: string; monto: number; estado: string; llega: string | null; at: string }>(
    `select stripe_payout_id as id, amount_cents as monto, status as estado, to_char(arrival_date, 'YYYY-MM-DD') as llega, to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
       from payouts where business_id = $1::text order by created_at desc, id desc limit 8`, [negocio])).rows;
}
export const ESTADO_PAYOUT: Record<string, Bi> = { pending: { es: "Programado", en: "Scheduled" }, in_transit: { es: "En camino", en: "In transit" }, paid: { es: "Llegó al banco", en: "Arrived" }, failed: { es: "Falló", en: "Failed" }, canceled: { es: "Cancelado", en: "Canceled" } };
