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
  // 9t9 · Cada pago por su cuenta (lib/barrido-uno.ts): uno que no se anota no deja a los demás fuera del libro; la tarea sale fallida diciendo cuál.
  await (await import("./barrido-uno")).cadaUno("pagosAlBanco", await pasarela.simPagarAlBanco(C.map((x) => x.acct), h.hoy), (p) => p.id, async (p) => {
    const c = por.get(p.destino);
    const r = await db().query(
      `insert into payouts (stripe_payout_id, stripe_account_id, business_id, city_id, amount_cents, status, arrival_date, simulated)
       values ($1::text, $2::text, $3::text, $4::text, $5::int, 'paid', $6::date + 2, true) on conflict (stripe_payout_id) do nothing`,
      [p.id, p.destino, c?.biz ?? null, c?.city ?? null, p.centavos, h.hoy]);
    n += r.rowCount ?? 0;
  });
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

/* 9t2 · Pausar o reanudar los pagos al banco (Negocio 360° › Dinero, acciones-dinero.ts): la base ya tiene la decisión (payouts_paused) y
   payouts_sync_at dice que Stripe todavía no la confirmó. Aquí se le pide a Stripe ese estado (fijar el calendario: repetirlo no mueve dinero) y,
   si contesta, se limpia la marca solo si nadie cambió la decisión mientras tanto (el estado y la marca en el where). Lo llaman la acción y el
   barrido (sincronizarPausas), así que si el proceso muere entre la base y Stripe, el siguiente barrido deja los dos iguales. */
export async function aplicarPausaEnStripe(negocio: string): Promise<boolean> {
  const a = (await db().query<{ acct: string | null; paused: boolean; marca: string | null }>(
    `select stripe_account_id as acct, payouts_paused as paused, payouts_sync_at::text as marca from stripe_accounts where business_id = $1`, [negocio])).rows[0];
  if (!a || !a.marca) return true;
  if (a.acct && !(await pasarela.cuentaPagos(a.acct, a.paused).catch(() => false))) return false;
  await db().query(`update stripe_accounts set payouts_sync_at = null where business_id = $1 and payouts_sync_at = $2::timestamptz and payouts_paused = $3`, [negocio, a.marca, a.paused]);
  return true;
}
export async function sincronizarPausas(): Promise<number> {
  let n = 0;
  // 9t9 · Cada cuenta por su cuenta (lib/barrido-uno.ts): una que falla no deja a las demás sin su pausa; la tarea sale fallida diciendo cuál. Una que Stripe
  // no confirma sigue marcada (y primera): por tandas sin repetirla en la corrida, para que no tape a las de detrás.
  const U = await import("./barrido-uno"), B = new U.Fallos("pausasStripe");
  await U.porTandas(B, 50, async (vistos) => (await db().query<{ b: string }>(
    `select business_id as b from stripe_accounts where payouts_sync_at is not null and payouts_sync_at < now() - interval '1 minute' and not (business_id = any($1::text[]))
      order by payouts_sync_at, business_id limit 50`, [vistos])).rows, (x) => x.b, async (x) => { if (await aplicarPausaEnStripe(x.b)) n++; });
  B.fin();
  return n;
}
