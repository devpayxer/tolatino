import "server-only";
import type { Staff } from "./admin";
import { db } from "./db";

/* ADM-TX · Transacciones (Super Admin.dc.html secTx / txRow): pedidos, reservaciones y citas (3e: el depósito con
   tarjeta y la comisión de citas sobre el depósito) de los últimos 90 días de tus ciudades. Hoy todo se paga en el local o al recibir: no hay retenido, cobro con tarjeta, devoluciones ni comisión
   (llegan con Stripe, bloque 2d). Estados: pendiente · en curso · terminado · cancelado · no se dio (no lo aceptaron / sin respuesta). */
export type TabTx = "all" | "ped" | "rsv" | "cita" | "plan" | "renta" | "apt";
export type EstTx = "pend" | "curso" | "done" | "cx" | "no";
export type FiltrosTx = { tab: TabTx; q: string; st: EstTx[]; pag: number };
export const POR_PAGINA_TX = 20;
const ESTS = new Set<EstTx>(["pend", "curso", "done", "cx", "no"]);
export function leerFiltrosTx(sp: Record<string, string | undefined>): FiltrosTx {
  const tab = (["all", "ped", "rsv", "cita", "plan", "renta", "apt"].includes(sp.tab ?? "") ? sp.tab : "all") as TabTx;
  const st = String(sp.st ?? "").split(",").filter((x): x is EstTx => ESTS.has(x as EstTx));
  return { tab, q: String(sp.q ?? "").trim().slice(0, 60), st, pag: Math.max(1, Math.min(500, Number(sp.pag) || 1)) };
}
const EST = `case when o.status in ('pending', 'change_proposed') then 'pend'
  when o.status = 'confirmed' and (o.kind <> 'order' or coalesce(o.stage, '') not in ('delivered', 'picked_up')) then 'curso'
  when o.status = 'done' or o.stage in ('delivered', 'picked_up') then 'done' when o.status = 'cancelled' then 'cx' else 'no' end`;
export type FilaTx = { num: string; k: "order" | "table" | "appointment" | "plan" | "rental" | "hold"; svc: string | null; dep: number; biz: string; bname: string; uid: string; quien: string; at: string; total: number; p: number | null; mode: string | null; st: EstTx; detalle: string | null;
  pago: string | null; devuelto: number; comision: number; tarjeta: string | null; pid: string | null; disputa: string | null;
  // 4d: estimado de Auto y Hogar (versiones, aprobado, cobrado en la app y retenciones que no se pudieron renovar).
  estV: number; estAp: number; estCob: number; estFallo: number;
  // 4f: planes, rentas y apartados (lo cobrado con tarjeta en la app y lo retenido, de todos sus cobros).
  cob: number; reten: number };
function donde(s: Staff, f: FiltrosTx) {
  const w = ["o.kind in ('order', 'table', 'appointment', 'plan', 'rental', 'hold')", "o.sent_at > now() - interval '90 days'", "(cardinality($1::text[]) = 0 or o.city_id = any($1::text[]))"], v: unknown[] = [s.cities];
  if (f.tab !== "all") w.push(`o.kind = '${({ ped: "order", cita: "appointment", rsv: "table", plan: "plan", renta: "rental", apt: "hold" } as const)[f.tab]}'`);
  if (f.st.length) { v.push(f.st); w.push(`(${EST}) = any($${v.length}::text[])`); }
  if (f.q) { v.push(`%${f.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`); w.push(`(o.number ilike $${v.length} or b.name ilike $${v.length} or o.business_id ilike $${v.length} or u.phone ilike $${v.length} or coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '') ilike $${v.length})`); }
  return { w: w.join(" and "), v };
}
const DESDE = `from operations o join businesses b on b.id = o.business_id and o.kind in ('order', 'table', 'appointment', 'plan', 'rental', 'hold') join users u on u.id = o.user_id`;
export async function listaTx(s: Staff, f: FiltrosTx) {
  const { w, v } = donde(s, f);
  const [L, n, k] = await Promise.all([
    db().query<FilaTx>(
      `select o.number as num, o.kind as k, o.business_id as biz, b.name as bname, u.id::text as uid, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), u.phone) as quien,
              to_char(o.sent_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, o.total_cents as total, o.party_size as p, o.mode, ${EST} as st, o.cancelled_by as detalle,
              py.status as pago, coalesce(py.refunded_cents, 0) as devuelto, coalesce(py.fee_cents, 0) as comision, case when py.card_last4 is null then null else upper(py.card_brand) || ' ·· ' || py.card_last4 end as tarjeta,
              py.id::text as pid, (select d.status from disputes d where d.payment_id = py.id order by d.id desc limit 1) as disputa,
              o.details->'svc'->>'es' as svc, coalesce(o.deposit_cents, 0) as dep,
              (select count(distinct l.estimate_id)::int from estimate_lines l where l.operation_id = o.id and not l.is_extra) as "estV",
              (select coalesce(sum(coalesce(l.final_cents, l.line_total_cents)), 0)::int from estimate_lines l where l.operation_id = o.id and l.decision = 'ok') as "estAp",
              (select coalesce(sum(p2.amount_cents), 0)::int from payments p2 where p2.operation_id = o.id and p2.kind in ('estimate', 'extra') and p2.status in ('captured', 'partially_refunded', 'refunded')) as "estCob",
              (select count(*)::int from operation_events ev where ev.operation_id = o.id and ev.kind = 'hold_failed') as "estFallo",
              (select coalesce(sum(p3.amount_cents - p3.refunded_cents), 0)::int from payments p3 where p3.operation_id = o.id and p3.status in ('captured', 'partially_refunded')) as cob,
              (select coalesce(sum(coalesce(p3.held_cents, p3.amount_cents)), 0)::int from payments p3 where p3.operation_id = o.id and p3.status = 'held') as reten
         ${DESDE} left join payments py on py.operation_id = o.id and py.kind in ('full', 'deposit') where ${w} order by o.id desc limit ${POR_PAGINA_TX} offset ${(f.pag - 1) * POR_PAGINA_TX}`, v),
    db().query<{ n: number }>(`select count(*)::int as n ${DESDE} where ${w}`, v),
    db().query<{ hoy: number; hoyc: number; done: number; donec: number; perdidos: number; rsv: number; cit: number; citd: number; plan: number; renta: number; apt: number; ret: number; retc: number; com: number; dev: number; fallos: number }>(
      `select count(*) filter (where o.sent_at > now() - interval '1 day')::int as hoy, coalesce(sum(o.total_cents) filter (where o.sent_at > now() - interval '1 day' and o.kind = 'order'), 0)::int as hoyc,
              count(*) filter (where (${EST}) = 'done' and o.kind = 'order')::int as done, coalesce(sum(o.total_cents) filter (where (${EST}) = 'done' and o.kind = 'order'), 0)::int as donec,
              count(*) filter (where (${EST}) in ('cx', 'no'))::int as perdidos, count(*) filter (where o.kind = 'table')::int as rsv,
              count(*) filter (where o.kind = 'appointment')::int as cit, count(*) filter (where o.kind = 'plan')::int as plan, count(*) filter (where o.kind = 'rental')::int as renta, count(*) filter (where o.kind = 'hold')::int as apt, coalesce(sum(o.deposit_cents) filter (where o.kind = 'appointment' and (${EST}) in ('curso', 'done')), 0)::int as citd,
              (select count(*)::int from payments p where p.status = 'held' and (cardinality($1::text[]) = 0 or p.city_id = any($1::text[]))) as ret,
              (select coalesce(sum(amount_cents), 0)::int from payments p where p.status = 'held' and (cardinality($1::text[]) = 0 or p.city_id = any($1::text[]))) as retc,
              (select coalesce(sum(fee_cents * (amount_cents - refunded_cents) / amount_cents), 0)::int from payments p where p.status in ('captured', 'partially_refunded') and p.captured_at > now() - interval '90 days' and (cardinality($1::text[]) = 0 or p.city_id = any($1::text[]))) as com,
              (select coalesce(sum(refunded_cents), 0)::int from payments p where p.updated_at > now() - interval '90 days' and (cardinality($1::text[]) = 0 or p.city_id = any($1::text[]))) as dev,
              (select count(*)::int from operation_events ev join operations o2 on o2.id = ev.operation_id where ev.kind = 'hold_failed' and ev.at > now() - interval '90 days' and (cardinality($1::text[]) = 0 or o2.city_id = any($1::text[]))) as fallos
         from operations o where o.kind in ('order', 'table', 'appointment', 'plan', 'rental', 'hold') and o.sent_at > now() - interval '90 days' and (cardinality($1::text[]) = 0 or o.city_id = any($1::text[]))`, [s.cities]),
  ]);
  return { filas: L.rows, total: n.rows[0]!.n, kpi: k.rows[0]! };
}
export type ListaTx = Awaited<ReturnType<typeof listaTx>>;

/* Lo filtrado para exportar (hasta 5,000 filas); el CSV se arma en la acción, con las celdas neutralizadas. */
export async function filasExportTx(s: Staff, f: FiltrosTx) {
  const { w, v } = donde(s, f);
  const r = await db().query<{ num: string; at: string; k: string; bname: string; quien: string; total: number; st: string }>(
    `select o.number as num, to_char(o.sent_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, o.kind as k, b.name as bname,
            coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), u.phone) as quien, o.total_cents as total, ${EST} as st
       ${DESDE} where ${w} order by o.id desc limit 5000`, v);
  const ST: Record<string, string> = { pend: "Pendiente", curso: "En curso", done: "Terminado", cx: "Cancelado", no: "No se dio" };
  return r.rows.map((x) => [x.num, x.at, ({ order: "Pedido", appointment: "Cita", table: "Reservación", plan: "Plan", rental: "Renta", hold: "Apartado" } as Record<string, string>)[x.k] ?? x.k, x.bname, x.quien, (x.total / 100).toFixed(2), ST[x.st] ?? x.st]);
}
