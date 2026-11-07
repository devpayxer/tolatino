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

/* Doctores y Profesionales (fase4-salud-pro §4m): seguro aceptado, «no aceptamos su seguro», no llegó, tiempo de respuesta,
   consultas que terminan en contratar, «cobró el total» de las reseñas y los motivos de ayuda. Solo cifras: ni motivos de
   consulta, ni notas, ni seguros de nadie. */
export async function saludPro(s: Staff, dias: number) {
  const [sal, pro, rev, ayuda] = await Promise.all([
    db().query<{ n: number; conseg: number; segok: number; segno: number; hechas: number; noshow: number; resp: number | null }>(
      `select count(*)::int as n,
              count(*) filter (where coalesce(o.details->'seguro'->>'kind', 'none') <> 'none')::int as conseg,
              count(*) filter (where coalesce(o.details->'seguro'->>'kind', 'none') <> 'none' and (o.details->'seguro'->>'acepta')::boolean)::int as segok,
              count(*) filter (where exists (select 1 from operation_events e where e.operation_id = o.id and e.kind = 'declined' and e.note->>'es' like 'No aceptan su seguro%'))::int as segno,
              count(*) filter (where o.status = 'done')::int as hechas, count(*) filter (where o.status_detail = 'noshow')::int as noshow,
              round(avg(extract(epoch from o.answered_at - o.sent_at) / 60) filter (where o.answered_at is not null))::int as resp
         from operations o where o.kind = 'appointment' and o.details->>'rubro' = 'salud' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    db().query<{ n: number; consultas: number; contrato: number; total: number; resp: number | null }>(
      `select count(*)::int as n, count(*) filter (where o.status = 'done' or o.status_detail in ('consulted', 'quote', 'hired'))::int as consultas,
              count(*) filter (where o.status_detail in ('hired', 'done'))::int as contrato,
              count(*) filter (where exists (select 1 from written_totals t where t.operation_id = o.id))::int as total,
              round(avg(extract(epoch from o.answered_at - o.sent_at) / 60) filter (where o.answered_at is not null))::int as resp
         from operations o where o.kind = 'appointment' and o.details->>'rubro' = 'pro' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    db().query<{ cobro: number; base: number }>(
      `select count(*) filter (where (r.answers->>'cobro')::int = 1)::int as cobro, count(*) filter (where r.answers ? 'cobro')::int as base
         from reviews r join businesses b on b.id = r.business_id where b.category_id = 'NEG-PRO' and r.status = 'visible' and r.created_at > now() - make_interval(days => $2) and ${scope("b.city_id")}`, [s.cities, dias]),
    db().query<{ rub: string; reason: string; n: number }>(
      `select o.details->>'rubro' as rub, h.reason, count(*)::int as n from help_requests h join operations o on o.id = h.operation_id
        where o.details->>'rubro' in ('salud', 'pro') and h.created_at > now() - make_interval(days => $2) and ${scope("h.city_id")} group by 1, 2 order by 3 desc`, [s.cities, dias]),
  ]);
  return { sal: sal.rows[0]!, pro: pro.rows[0]!, rev: rev.rows[0]!, ayuda: ayuda.rows };
}

/* Mercados y Tiendas (4s): solo cifras. Mercado: % con foto de cada peso, estimado contra cobrado, sustituciones aceptadas,
   no aceptados / vencidos, tiempo de aceptación. Tienda: apartados recogidos / vencidos, % falta talla, envíos, planes
   terminados / cancelados y «precio de la caja = publicado» de las reseñas. Y los motivos de ayuda de los dos. */
export async function mercadosTiendas(s: Staff, dias: number) {
  const [merc, tienda, rev, ayuda] = await Promise.all([
    db().query<{ n: number; hechos: number; pesados: number; confoto: number; est: number; cob: number; sustOk: number; sustN: number; noacep: number; resp: number | null }>(
      `select count(*)::int as n, count(*) filter (where o.status = 'done')::int as hechos,
              count(*) filter (where exists (select 1 from operation_lines l where l.operation_id = o.id and l.weight_final is not null))::int as pesados,
              count(*) filter (where exists (select 1 from operation_lines l where l.operation_id = o.id and l.weight_final is not null)
                                 and not exists (select 1 from operation_lines l where l.operation_id = o.id and l.weight_final is not null and l.weigh_photo_id is null))::int as confoto,
              coalesce(sum(coalesce((o.details->>'est_cents')::int, o.total_cents)) filter (where o.status = 'done' and o.pay_mode = 'app'), 0)::int as est,
              coalesce((select sum(p.amount_cents) from payments p join operations o2 on o2.id = p.operation_id where o2.kind = 'market_order' and p.status in ('captured', 'partially_refunded', 'refunded') and o2.sent_at > now() - make_interval(days => $2) and ${scope("o2.city_id")}), 0)::int as cob,
              (select count(*) filter (where cp.status = 'accepted')::int from change_proposals cp join operations o3 on o3.id = cp.operation_id where o3.kind = 'market_order' and o3.sent_at > now() - make_interval(days => $2) and ${scope("o3.city_id")}) as "sustOk",
              (select count(*)::int from change_proposals cp join operations o3 on o3.id = cp.operation_id where o3.kind = 'market_order' and cp.status in ('accepted', 'declined', 'expired') and o3.sent_at > now() - make_interval(days => $2) and ${scope("o3.city_id")}) as "sustN",
              count(*) filter (where o.status in ('declined', 'expired'))::int as noacep,
              round(avg(extract(epoch from o.answered_at - o.sent_at) / 60) filter (where o.answered_at is not null))::int as resp
         from operations o where o.kind = 'market_order' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    db().query<{ n: number; recogidos: number; vencidos: number; talla: number; envios: number; planes: number; pagados: number; cancelados: number }>(
      `select count(*)::int as n, count(*) filter (where o.status = 'done')::int as recogidos, count(*) filter (where o.status = 'expired')::int as vencidos,
              count(*) filter (where exists (select 1 from change_proposals cp where cp.operation_id = o.id and cp.line_id is not null))::int as talla,
              count(*) filter (where o.mode = 'delivery')::int as envios,
              count(lp.id)::int as planes, count(lp.id) filter (where lp.status = 'paid')::int as pagados, count(lp.id) filter (where lp.status = 'cancelled')::int as cancelados
         from operations o join businesses b on b.id = o.business_id left join layaway_plans lp on lp.operation_id = o.id
        where o.kind = 'hold' and b.category_id = 'NEG-TIENDA' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    db().query<{ caja: number; base: number; pes: number; pbase: number }>(
      `select count(*) filter (where (r.answers->>'caja')::int = 1)::int as caja, count(*) filter (where r.answers ? 'caja')::int as base,
              count(*) filter (where (r.facts->>'fotoPeso')::boolean or (r.answers->>'peso')::int = 1)::int as pes, count(*) filter (where r.facts ? 'fotoPeso' or r.answers ? 'peso')::int as pbase
         from reviews r join businesses b on b.id = r.business_id where b.category_id in ('NEG-MERC', 'NEG-TIENDA') and r.status = 'visible' and r.created_at > now() - make_interval(days => $2) and ${scope("b.city_id")}`, [s.cities, dias]),
    db().query<{ rub: string; reason: string; n: number }>(
      `select case when o.kind = 'market_order' then 'merc' else 'tienda' end as rub, h.reason, count(*)::int as n from help_requests h join operations o on o.id = h.operation_id
        where o.kind in ('market_order', 'hold') and h.created_at > now() - make_interval(days => $2) and ${scope("h.city_id")} group by 1, 2 order by 3 desc`, [s.cities, dias]),
  ]);
  return { merc: merc.rows[0]!, tienda: tienda.rows[0]!, rev: rev.rows[0]!, ayuda: ayuda.rows };
}

/* 4z-3 · Fiestas y Transporte (solo cifras). Fiestas: % confirmadas en 24 h, vencidas, fechas canceladas por el negocio y los
   depósitos (retenidos / cobrados / devueltos / se quedaron). Transporte: % de salidas a la hora (departed_at − run_at ≤ 15 min),
   ocupación de asientos, cancelaciones tardías (la mitad), salidas canceladas y ayudas «cobró más» por cada 100 viajes. */
export async function fiestasTransporte(s: Staff, dias: number) {
  const [fi, dep, vi, sal, ayuda] = await Promise.all([
    db().query<{ n: number; conf24: number; vencidas: number; cxNeg: number; hechas: number }>(
      `select count(*)::int as n,
              count(*) filter (where o.confirmed_at is not null and o.confirmed_at - o.sent_at <= interval '24 hours')::int as conf24,
              count(*) filter (where o.status = 'expired')::int as vencidas,
              count(*) filter (where o.status = 'cancelled' and o.cancelled_by = 'business')::int as "cxNeg",
              count(*) filter (where o.status = 'done')::int as hechas
         from operations o where o.kind = 'party' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    db().query<{ ret: number; cob: number; dev: number; quedo: number }>(
      `select coalesce(sum(p.amount_cents) filter (where p.status = 'held'), 0)::int as ret,
              coalesce(sum(p.amount_cents - p.refunded_cents) filter (where p.status in ('captured', 'partially_refunded')), 0)::int as cob,
              coalesce(sum(p.refunded_cents), 0)::int as dev,
              coalesce(sum(p.amount_cents - p.refunded_cents) filter (where p.status in ('captured', 'partially_refunded') and coalesce((o.details->>'perdio')::boolean, false)), 0)::int as quedo
         from payments p join operations o on o.id = p.operation_id where o.kind = 'party' and p.kind = 'deposit' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    db().query<{ n: number; hechos: number; mitad: number; cxSalida: number; cobroMas: number }>(
      `select count(*)::int as n, count(*) filter (where o.status = 'done')::int as hechos,
              count(*) filter (where coalesce((o.details->>'cobroMitad')::int, 0) > 0)::int as mitad,
              count(*) filter (where o.cancel_reason = 'salida')::int as "cxSalida",
              (select count(*)::int from help_requests h join operations o2 on o2.id = h.operation_id where o2.kind = 'trip' and h.reason = 'cobro' and h.created_at > now() - make_interval(days => $2) and ${scope("o2.city_id")}) as "cobroMas"
         from operations o where o.kind = 'trip' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    db().query<{ salidas: number; aTiempo: number; conPas: number; canceladas: number; asientos: number; ocupados: number }>(
      `select count(*) filter (where r.departed_at is not null)::int as salidas,
              count(*) filter (where r.departed_at is not null and r.departed_at - r.run_at <= interval '15 minutes')::int as "aTiempo",
              count(*) filter (where r.seats_booked + r.seats_outside > 0)::int as "conPas",
              count(*) filter (where r.status = 'cancelled' and r.cancel_reason is not null)::int as canceladas,
              coalesce(sum(r.seats_total) filter (where r.status in ('departed', 'arrived')), 0)::int as asientos,
              coalesce(sum(r.seats_booked + r.seats_outside) filter (where r.status in ('departed', 'arrived')), 0)::int as ocupados
         from trip_runs r where r.run_at > now() - make_interval(days => $2) and r.run_at < now() and ${scope("r.city_id")}`, [s.cities, dias]),
    db().query<{ rub: string; reason: string; n: number }>(
      `select case when o.kind = 'party' then 'fiesta' else 'trans' end as rub, h.reason, count(*)::int as n from help_requests h join operations o on o.id = h.operation_id
        where o.kind in ('party', 'trip') and h.created_at > now() - make_interval(days => $2) and ${scope("h.city_id")} group by 1, 2 order by 3 desc`, [s.cities, dias]),
  ]);
  return { fi: fi.rows[0]!, dep: dep.rows[0]!, vi: vi.rows[0]!, sal: sal.rows[0]!, ayuda: ayuda.rows };
}

/* 4ne · Analítica › Noche (fase4-noche.md §4ne): mesas confirmadas en 60 min, vencidas, no respetadas; depósitos retenidos /
   cobrados / devueltos / que se quedaron; % de la lista que entró; veces que el cover sube después de publicado esa misma noche;
   % «fila como decía» en reseñas; ayudas «cobraron más cover» por cada 100 noches; licencias de licor vencidas. Solo cifras;
   todo por ciudad (city_id) y con índices (operations_noche_idx, night_posts_noche_idx). */
export async function noche(s: Staff, dias: number) {
  const { INCIDENTE_SQL } = await import("./noche-vigilar");
  const [me, dep, li, cov, fila, ay, lic] = await Promise.all([
    db().query<{ n: number; conf60: number; vencidas: number; noResp: number }>(
      `select count(*)::int as n,
              count(*) filter (where o.confirmed_at is not null and o.confirmed_at - o.sent_at <= interval '60 minutes')::int as conf60,
              count(*) filter (where o.status = 'expired')::int as vencidas,
              count(*) filter (where ${INCIDENTE_SQL.mesa})::int as "noResp"
         from operations o where o.kind = 'night' and o.details->>'k' <> 'lista' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    db().query<{ ret: number; cob: number; dev: number; quedo: number }>(
      `select coalesce(sum(p.amount_cents) filter (where p.status = 'held'), 0)::int as ret,
              coalesce(sum(p.amount_cents - p.refunded_cents) filter (where p.status in ('captured', 'partially_refunded')), 0)::int as cob,
              coalesce(sum(p.refunded_cents), 0)::int as dev,
              coalesce(sum(p.amount_cents - p.refunded_cents) filter (where p.status in ('captured', 'partially_refunded')
                and (coalesce((o.details->>'perdio')::boolean, false) or o.status_detail in ('nollegaron', 'noid'))), 0)::int as quedo
         from payments p join operations o on o.id = p.operation_id where o.kind = 'night' and p.kind = 'deposit' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    db().query<{ n: number; cerradas: number; entro: number; noches: number }>(
      `select count(*) filter (where o.details->>'k' = 'lista')::int as n,
              count(*) filter (where o.details->>'k' = 'lista' and o.status = 'done')::int as cerradas,
              count(*) filter (where o.details->>'k' = 'lista' and o.status = 'done' and o.status_detail = 'entro')::int as entro,
              count(*) filter (where o.status = 'done')::int as noches
         from operations o where o.kind = 'night' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    // Una subida = una publicación del cover de esa noche más alta que la anterior de la misma noche (night_posts, solo inserción).
    db().query<{ sube: number; locales: number }>(
      `select count(*)::int as sube, count(distinct business_id)::int as locales from (
         select p.business_id, (p.value->>'cents')::int as c, lag((p.value->>'cents')::int) over (partition by p.business_id, p.night order by p.at, p.id) as antes
           from night_posts p where p.field = 'cover' and p.night > current_date - $2::int and ${scope("p.city_id")}) x
        where x.antes is not null and x.c > x.antes`, [s.cities, dias]),
    db().query<{ n: number; ok: number }>(
      `select count(*) filter (where r.answers ? 'filaOk')::int as n, count(*) filter (where r.answers->>'filaOk' = 'a')::int as ok
         from reviews r join operations o on o.id = r.operation_id where o.kind = 'night' and r.status <> 'removed' and r.created_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    db().query<{ reason: string; n: number }>(
      `select h.reason, count(*)::int as n from help_requests h join operations o on o.id = h.operation_id
        where o.kind = 'night' and h.created_at > now() - make_interval(days => $2) and ${scope("h.city_id")} group by 1 order by 2 desc`, [s.cities, dias]),
    db().query<{ vencidas: number; total: number }>(
      `select count(*) filter (where l.status = 'expired' or (l.status = 'valid' and l.next_review < current_date))::int as vencidas, count(*)::int as total
         from licenses l join businesses b on b.id = l.business_id where l.kind = 'pa_plcb' and ${scope("b.city_id")}`, [s.cities]),
  ]);
  return { me: me.rows[0]!, dep: dep.rows[0]!, li: li.rows[0]!, cov: cov.rows[0]!, fila: fila.rows[0]!, ayuda: ay.rows, lic: lic.rows[0]! };
}
