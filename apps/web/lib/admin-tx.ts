import "server-only";
import type { Staff } from "./admin";
import { db } from "./db";

/* ADM-TX · Transacciones (Super Admin.dc.html secTx / txRow): pedidos y reservaciones de los últimos 90 días de tus
   ciudades. Hoy todo se paga en el local o al recibir: no hay retenido, cobro con tarjeta, devoluciones ni comisión
   (llegan con Stripe, bloque 2d). Estados: pendiente · en curso · terminado · cancelado · no se dio (no lo aceptaron / sin respuesta). */
export type TabTx = "all" | "ped" | "rsv";
export type EstTx = "pend" | "curso" | "done" | "cx" | "no";
export type FiltrosTx = { tab: TabTx; q: string; st: EstTx[]; pag: number };
export const POR_PAGINA_TX = 20;
const ESTS = new Set<EstTx>(["pend", "curso", "done", "cx", "no"]);
export function leerFiltrosTx(sp: Record<string, string | undefined>): FiltrosTx {
  const tab = (["all", "ped", "rsv"].includes(sp.tab ?? "") ? sp.tab : "all") as TabTx;
  const st = String(sp.st ?? "").split(",").filter((x): x is EstTx => ESTS.has(x as EstTx));
  return { tab, q: String(sp.q ?? "").trim().slice(0, 60), st, pag: Math.max(1, Math.min(500, Number(sp.pag) || 1)) };
}
const EST = `case when o.status in ('pending', 'change_proposed') then 'pend'
  when o.status = 'confirmed' and (o.kind <> 'order' or coalesce(o.stage, '') not in ('delivered', 'picked_up')) then 'curso'
  when o.status = 'done' or o.stage in ('delivered', 'picked_up') then 'done' when o.status = 'cancelled' then 'cx' else 'no' end`;
export type FilaTx = { num: string; k: "order" | "table"; biz: string; bname: string; uid: string; quien: string; at: string; total: number; p: number | null; mode: string | null; st: EstTx; detalle: string | null };
function donde(s: Staff, f: FiltrosTx) {
  const w = ["o.kind in ('order', 'table')", "o.sent_at > now() - interval '90 days'", "(cardinality($1::text[]) = 0 or o.city_id = any($1::text[]))"], v: unknown[] = [s.cities];
  if (f.tab !== "all") w.push(f.tab === "ped" ? "o.kind = 'order'" : "o.kind = 'table'");
  if (f.st.length) { v.push(f.st); w.push(`(${EST}) = any($${v.length}::text[])`); }
  if (f.q) { v.push(`%${f.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`); w.push(`(o.number ilike $${v.length} or b.name ilike $${v.length} or o.business_id ilike $${v.length} or u.phone ilike $${v.length} or coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '') ilike $${v.length})`); }
  return { w: w.join(" and "), v };
}
const DESDE = `from operations o join businesses b on b.id = o.business_id and o.kind in ('order', 'table') join users u on u.id = o.user_id`;
export async function listaTx(s: Staff, f: FiltrosTx) {
  const { w, v } = donde(s, f);
  const [L, n, k] = await Promise.all([
    db().query<FilaTx>(
      `select o.number as num, o.kind as k, o.business_id as biz, b.name as bname, u.id::text as uid, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), u.phone) as quien,
              to_char(o.sent_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, o.total_cents as total, o.party_size as p, o.mode, ${EST} as st, o.cancelled_by as detalle
         ${DESDE} where ${w} order by o.id desc limit ${POR_PAGINA_TX} offset ${(f.pag - 1) * POR_PAGINA_TX}`, v),
    db().query<{ n: number }>(`select count(*)::int as n ${DESDE} where ${w}`, v),
    db().query<{ hoy: number; hoyc: number; done: number; donec: number; perdidos: number; rsv: number }>(
      `select count(*) filter (where o.sent_at > now() - interval '1 day')::int as hoy, coalesce(sum(o.total_cents) filter (where o.sent_at > now() - interval '1 day' and o.kind = 'order'), 0)::int as hoyc,
              count(*) filter (where (${EST}) = 'done' and o.kind = 'order')::int as done, coalesce(sum(o.total_cents) filter (where (${EST}) = 'done' and o.kind = 'order'), 0)::int as donec,
              count(*) filter (where (${EST}) in ('cx', 'no'))::int as perdidos, count(*) filter (where o.kind = 'table')::int as rsv
         from operations o where o.kind in ('order', 'table') and o.sent_at > now() - interval '90 days' and (cardinality($1::text[]) = 0 or o.city_id = any($1::text[]))`, [s.cities]),
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
  return r.rows.map((x) => [x.num, x.at, x.k === "order" ? "Pedido" : "Reservación", x.bname, x.quien, (x.total / 100).toFixed(2), ST[x.st] ?? x.st]);
}
