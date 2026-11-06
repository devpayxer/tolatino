import "server-only";
import type { Staff } from "./admin";
import { COLAS, type Cola } from "./colas";
import { db } from "./db";

/* ADM-ANALIT · Analítica (Super Admin.dc.html secAnalit) con lo que existe en la Fase 1: gente y negocios, el embudo
   del directorio (de buscar a contactar), soporte y confianza, búsquedas sin oferta y exportar. Todo sale de la base:
   eventos propios (app_events), actividad por día (user_days), cuentas, negocios y colas. Acotado a las ciudades de quien
   mira (vacío = todas). Dinero y Comunidad llegan con sus módulos. */
export const PERIODOS = [7, 30, 90] as const;
const scope = (col: string) => `(cardinality($1::text[]) = 0 or ${col} = any($1::text[]))`;

export async function gente(s: Staff, dias: number) {
  const [u, b, ret, cats] = await Promise.all([
    db().query<{ n: number; nuevos: number; activos: number }>(
      `select count(*)::int as n,
              count(*) filter (where created_at > now() - make_interval(days => $2))::int as nuevos,
              count(*) filter (where exists (select 1 from user_days d where d.user_id = u.id and d.day > (now() at time zone 'America/New_York')::date - least($2, 30)))::int as activos
         from users u where u.status not in ('deleted', 'merged') and not u.is_test and ${scope("u.home_city_id")}`, [s.cities, dias]),
    db().query<{ n: number; pro: number; ver: number }>(
      `select count(*)::int as n, count(*) filter (where st.plan = 'pro')::int as pro, count(*) filter (where st.verified)::int as ver
         from businesses b left join business_stats_cache st on st.business_id = b.id where b.status = 'active' and ${scope("b.city_id")}`, [s.cities]),
    // Retención: de las cuentas nuevas del período, cuántas volvieron el día 1, 7 y 30 (solo las que ya tienen esa edad).
    db().query<{ k: number; base: number; vuelven: number }>(
      `with c as (select u.id, (u.created_at at time zone 'America/New_York')::date as d0 from users u
                   where u.created_at > now() - make_interval(days => $2) and not u.is_test and ${scope("u.home_city_id")})
       select k, count(*) filter (where c.d0 + k <= (now() at time zone 'America/New_York')::date)::int as base,
              count(*) filter (where c.d0 + k <= (now() at time zone 'America/New_York')::date and exists (select 1 from user_days x where x.user_id = c.id and x.day = c.d0 + k))::int as vuelven
         from c, unnest(array[1, 7, 30]) k group by k order by k`, [s.cities, Math.max(dias, 31)]),
    db().query<{ id: string; short: string; n: number; pro: number }>(
      `select k.id, k.short->>'es' as short, count(b.id)::int as n, count(b.id) filter (where st.plan = 'pro')::int as pro
         from categories k left join businesses b on b.category_id = k.id and b.status = 'active' and ${scope("b.city_id")}
         left join business_stats_cache st on st.business_id = b.id group by k.id, k.short, k.sort order by n desc, k.sort`, [s.cities]),
  ]);
  return { u: u.rows[0]!, b: b.rows[0]!, retencion: ret.rows, cats: cats.rows };
}

/* Embudo del directorio en el período: personas (cuenta o dispositivo) que buscaron o abrieron una categoría, que
   abrieron una ficha y que tocaron Llamar, WhatsApp o Cómo llegar. Eventos propios, sin robots. */
export async function embudo(s: Staff, dias: number) {
  const r = await db().query<{ paso: string; n: number }>(
    `with e as (select coalesce(user_id::text, device::text) as quien, name from app_events
                 where at > now() - make_interval(days => $2) and ${scope("city_id")} and coalesce(user_id::text, device::text) is not null)
     select 'buscar' as paso, count(distinct quien)::int as n from e where name in ('buscar', 'ver_categoria')
     union all select 'ficha', count(distinct quien)::int from e where name = 'ver_ficha'
     union all select 'contactar', count(distinct quien)::int from e where name = 'contactar'`, [s.cities, dias]);
  const m = Object.fromEntries(r.rows.map((x) => [x.paso, x.n]));
  return { buscar: m.buscar ?? 0, ficha: m.ficha ?? 0, contactar: m.contactar ?? 0 };
}

/* Soporte y confianza: sancionados, colas abiertas y plazo cumplido de lo decidido en el período. */
export async function confianza(s: Staff, dias: number) {
  const sla = `case q.queue ${Object.entries(COLAS).map(([k, v]) => `when '${k}' then ${v.sla}`).join(" ")} else 24 end`;
  const [sanc, abiertas, cumplido] = await Promise.all([
    db().query<{ n: number }>(
      `select count(distinct x.target_id)::int as n from sanctions x left join users u on u.id::text = x.target_id
        where x.target_kind = 'user' and x.lifted_at is null and (x.ends_at is null or x.ends_at > now()) and ${scope("u.home_city_id")}`, [s.cities]),
    db().query<{ queue: Cola; n: number }>(`select q.queue, count(*)::int as n from queue_items q where q.status = 'open' and ${scope("q.city_id")} group by 1 order by 2 desc`, [s.cities]),
    db().query<{ total: number; a_tiempo: number }>(
      `select count(*)::int as total, count(*) filter (where extract(epoch from q.decided_at - q.opened_at) <= ${sla} * 3600)::int as a_tiempo
         from queue_items q where q.status = 'decided' and q.decided_at > now() - make_interval(days => $2) and ${scope("q.city_id")}`, [s.cities, dias]),
  ]);
  return { sancionados: sanc.rows[0]?.n ?? 0, abiertas: abiertas.rows.map((x) => ({ ...x, es: COLAS[x.queue]?.es ?? x.queue, sla: COLAS[x.queue]?.sla ?? 24 })), cumplido: cumplido.rows[0]! };
}
