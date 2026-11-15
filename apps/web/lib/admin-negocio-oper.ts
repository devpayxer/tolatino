import "server-only";
import { db } from "./db";
import { EST_TX, type EstTx } from "./admin-tx";

/* 9n-18 · Negocio 360° › Operación (Super Admin.dc.html, tab 'oper'): cómo trabaja el negocio con lo que le piden. Arriba, 90 días: operaciones,
   cuánto acepta de lo que le piden, en cuánto responde (promedio) y cuántas se cancelaron o no se dieron; 30 días: vistas, contactos (toques en
   su ficha), pedidos o citas y la conversión; las vistas de 7 días; lo que tocan en su ficha; si es Free, lo que le queda del mes. Abajo, sus
   operaciones de 90 días por tipo, de a 8 con cursor, cada una a Transacciones. Lee, no escribe; cifras desde la base (índices por negocio). */
export type FilaOper = { id: string; num: string; k: string; st: EstTx; quien: string; at: string; total: number };
export type Oper360 = {
  k90: { ops: number; acepta: number | null; resp: number | null; canc: number };
  k30: { vistas: number; contactos: number; ops: number; conv: number | null };
  dias: { d: string; n: number }[]; toques: { k: string; n: number }[]; free: { quedan: number; cap: number } | null;
  cuenta: Record<string, number>; filas: FilaOper[]; siguiente: string | null;
};
export const GRUPOS_OPER: Record<string, string[]> = {
  ped: ["order", "market_order"], cita: ["appointment", "visit", "enrollment", "party", "trip"], rsv: ["table", "night", "private_event"], bol: ["tickets"], apt: ["hold", "rental", "plan"],
};
const POR = 8;

export async function operacion360(id: string, grupo: string, antes: string | null): Promise<Oper360> {
  const kinds = GRUPOS_OPER[grupo] ?? null, cur = antes && /^\d{1,18}$/.test(antes) ? antes : null;
  const [K, D, T, F, C, L] = await Promise.all([
    db().query<{ ops: number; acepta: number | null; resp: number | null; canc: number; ops30: number; vistas: number; contactos: number }>(
      `select count(*)::int as ops,
              round(100.0 * count(*) filter (where o.confirmed_at is not null) / nullif(count(*) filter (where o.confirmed_at is not null or o.status in ('declined', 'expired')), 0))::int as acepta,
              round(avg(extract(epoch from o.answered_at - o.sent_at) / 60) filter (where o.answered_at is not null and o.answered_at >= o.sent_at))::int as resp,
              count(*) filter (where o.status in ('cancelled', 'expired') or o.status_detail = 'noshow')::int as canc,
              count(*) filter (where o.sent_at > now() - interval '30 days')::int as ops30,
              (select coalesce(sum(n), 0)::int from business_views_daily where business_id = $1 and day > current_date - 30) as vistas,
              (select count(*)::int from contact_taps where business_id = $1 and at > now() - interval '30 days') as contactos
         from operations o where o.business_id = $1 and o.sent_at > now() - interval '90 days' and not (o.kind = 'tickets' and o.pay_mode = 'none')`, [id]),
    db().query<{ d: string; n: number }>(
      `select g::date::text as d, coalesce(v.n, 0)::int as n from generate_series(current_date - 6, current_date, interval '1 day') g
         left join business_views_daily v on v.business_id = $1 and v.day = g::date order by g`, [id]),
    db().query<{ k: string; n: number }>(`select kind as k, count(*)::int as n from contact_taps where business_id = $1 and at > now() - interval '30 days' group by kind order by n desc limit 6`, [id]),
    db().query<{ plan: string; cap: number; usados: number }>(
      `select coalesce(s.plan, 'free') as plan, cfg_int('free_ops_cap') as cap,
              (select count(*)::int from operations o where o.business_id = b.id and o.kind <> 'table' and o.free_quota_month = to_char(now() at time zone c.timezone, 'YYYY-MM')) as usados
         from businesses b join cities c on c.id = b.city_id left join business_stats_cache s on s.business_id = b.id where b.id = $1`, [id]),
    db().query<{ k: string; n: number }>(
      `select o.kind as k, count(*)::int as n from operations o where o.business_id = $1 and o.sent_at > now() - interval '90 days' and not (o.kind = 'tickets' and o.pay_mode = 'none') group by o.kind`, [id]),
    db().query<FilaOper & { quien: string }>(
      `select o.id::text, o.number as num, o.kind as k, ${EST_TX} as st,
              coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(left(u.last_name, 1) || '.', '')), ''), 'Cliente') as quien,
              to_char(o.sent_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, coalesce(o.total_cents, 0) as total
         from operations o left join users u on u.id = o.user_id
        where o.business_id = $1 and o.sent_at > now() - interval '90 days' and not (o.kind = 'tickets' and o.pay_mode = 'none')
          and ($2::text[] is null or o.kind = any($2::text[])) and ($3::bigint is null or o.id < $3::bigint)
        order by o.id desc limit ${POR + 1}`, [id, kinds, cur]),
  ]);
  const k = K.rows[0]!, f = F.rows[0], cuenta: Record<string, number> = { all: 0 };
  for (const x of C.rows) { cuenta.all! += x.n; for (const [g, ks] of Object.entries(GRUPOS_OPER)) if (ks.includes(x.k)) cuenta[g] = (cuenta[g] ?? 0) + x.n; }
  const mas = L.rows.length > POR, filas = L.rows.slice(0, POR);
  return {
    k90: { ops: k.ops, acepta: k.acepta, resp: k.resp, canc: k.canc },
    k30: { vistas: k.vistas, contactos: k.contactos, ops: k.ops30, conv: k.vistas ? Math.round((1000 * k.ops30) / k.vistas) / 10 : null },
    dias: D.rows, toques: T.rows, free: f && f.plan !== "pro" ? { quedan: Math.max(0, f.cap - f.usados), cap: f.cap } : null,
    cuenta, filas, siguiente: mas ? filas.at(-1)!.id : null,
  };
}
