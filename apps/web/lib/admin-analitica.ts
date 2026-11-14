import "server-only";
import { cfgSql } from "./config";
import { COLAS, slaCase, type Cola } from "./colas";
import { dbAnalisis } from "./db-analisis";

/* ADM-ANALIT · Analítica (Super Admin.dc.html secAnalit) con lo que existe en la Fase 1: gente y negocios, el embudo
   del directorio (de buscar a contactar), soporte y confianza, búsquedas sin oferta y exportar. Todo sale de la base:
   eventos propios (app_events), actividad por día (user_days), cuentas, negocios y colas. Acotado a las ciudades de quien
   mira (vacío = todas). Dinero y Comunidad llegan con sus módulos. */
export const PERIODOS = [7, 30, 90] as const;
const scope = (col: string) => `(cardinality($1::text[]) = 0 or ${col} = any($1::text[]))`;

export async function gente(s: Alcance, dias: number) {
  const [u, b, ret, cats] = await Promise.all([
    dbAnalisis().query<{ n: number; nuevos: number; activos: number }>(
      `select count(*)::int as n,
              count(*) filter (where created_at > now() - make_interval(days => $2))::int as nuevos,
              count(*) filter (where exists (select 1 from user_days d where d.user_id = u.id and d.day > (now() at time zone 'America/New_York')::date - least($2, 30)))::int as activos
         from users u where u.status not in ('deleted', 'merged') and not u.is_test and ${scope("u.home_city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ n: number; pro: number; ver: number }>(
      `select count(*)::int as n, count(*) filter (where st.plan = 'pro')::int as pro, count(*) filter (where st.verified)::int as ver
         from businesses b left join business_stats_cache st on st.business_id = b.id where b.status = 'active' and ${scope("b.city_id")}`, [s.cities]),
    // Retención: de las cuentas nuevas del período, cuántas volvieron el día 1, 7 y 30 (solo las que ya tienen esa edad).
    dbAnalisis().query<{ k: number; base: number; vuelven: number }>(
      `with c as (select u.id, (u.created_at at time zone 'America/New_York')::date as d0 from users u
                   where u.created_at > now() - make_interval(days => $2) and not u.is_test and ${scope("u.home_city_id")})
       select k, count(*) filter (where c.d0 + k <= (now() at time zone 'America/New_York')::date)::int as base,
              count(*) filter (where c.d0 + k <= (now() at time zone 'America/New_York')::date and exists (select 1 from user_days x where x.user_id = c.id and x.day = c.d0 + k))::int as vuelven
         from c, unnest(array[1, 7, 30]) k group by k order by k`, [s.cities, Math.max(dias, 31)]),
    dbAnalisis().query<{ id: string; short: string; n: number; pro: number }>(
      `select k.id, k.short->>'es' as short, count(b.id)::int as n, count(b.id) filter (where st.plan = 'pro')::int as pro
         from categories k left join businesses b on b.category_id = k.id and b.status = 'active' and ${scope("b.city_id")}
         left join business_stats_cache st on st.business_id = b.id group by k.id, k.short, k.sort order by n desc, k.sort`, [s.cities]),
  ]);
  return { u: u.rows[0]!, b: b.rows[0]!, retencion: ret.rows, cats: cats.rows };
}

/* Embudo del directorio en el período: personas (cuenta o dispositivo) que buscaron o abrieron una categoría, que
   abrieron una ficha y que tocaron Llamar, WhatsApp o Cómo llegar. Eventos propios, sin robots. */
export async function embudo(s: Alcance, dias: number) {
  // 9b-3 · Una sola pasada por los eventos del período (las particiones de esos meses), solo de los cuatro nombres del embudo, y «quién» como
  // uuid (la cuenta o, sin cuenta, el dispositivo): antes eran tres pasadas sobre todos los eventos con «quién» convertido a texto (410 ms con
  // 5 M de eventos en la carga).
  const r = await dbAnalisis().query<{ paso: string; n: number }>(
    `with e as (select coalesce(user_id, device) as quien, name from app_events
                 where at > now() - make_interval(days => $2) and name in ('buscar', 'ver_categoria', 'ver_ficha', 'contactar') and ${scope("city_id")}
                   and coalesce(user_id, device) is not null)
     select x.paso, x.n from (select count(distinct quien) filter (where name in ('buscar', 'ver_categoria'))::int as b, count(distinct quien) filter (where name = 'ver_ficha')::int as f,
                                     count(distinct quien) filter (where name = 'contactar')::int as c from e) t
       cross join lateral (values ('buscar', t.b), ('ficha', t.f), ('contactar', t.c)) as x(paso, n)`, [s.cities, dias]);
  const m = Object.fromEntries(r.rows.map((x) => [x.paso, x.n]));
  return { buscar: m.buscar ?? 0, ficha: m.ficha ?? 0, contactar: m.contactar ?? 0 };
}

/* Soporte y confianza: sancionados, colas abiertas y plazo cumplido de lo decidido en el período. */
export async function confianza(s: Alcance, dias: number) {
  const sla = slaCase(cfgSql), slas = await (await import("./admin-colas")).slasColas();
  const [sanc, abiertas, cumplido, rep] = await Promise.all([
    dbAnalisis().query<{ n: number }>(
      `select count(distinct x.target_id)::int as n from sanctions x left join users u on u.id::text = x.target_id
        where x.target_kind = 'user' and x.lifted_at is null and (x.ends_at is null or x.ends_at > now()) and ${scope("u.home_city_id")}`, [s.cities]),
    dbAnalisis().query<{ queue: Cola; n: number }>(`select q.queue, count(*)::int as n from queue_items q where q.status = 'open' and ${scope("q.city_id")} group by 1 order by 2 desc`, [s.cities]),
    dbAnalisis().query<{ total: number; a_tiempo: number }>(
      `select count(*)::int as total, count(*) filter (where extract(epoch from q.decided_at - q.opened_at) <= ${sla} * 3600)::int as a_tiempo
         from queue_items q where q.status = 'decided' and q.decided_at > now() - make_interval(days => $2) and ${scope("q.city_id")}`, [s.cities, dias]),
    // 9g · Reportes por cada 1,000 operaciones y casos de Soporte (L209): cuántos, nunca de quién (los cobros de un plan ya contratado no son operaciones nuevas).
    dbAnalisis().query<{ reportes: number; operaciones: number; casos: number }>(
      `select (select count(*) from content_reports x where x.created_at > now() - make_interval(days => $2) and ${scope("x.city_id")})::int as reportes,
              (select count(*) from operations o where o.sent_at > now() - make_interval(days => $2) and o.kind <> 'plan' and ${scope("o.city_id")})::int as operaciones,
              (select count(*) from support_cases c where c.created_at > now() - make_interval(days => $2) and c.status <> 'merged' and ${scope("c.city_id")})::int as casos`, [s.cities, dias]),
  ]);
  return { sancionados: sanc.rows[0]?.n ?? 0, abiertas: abiertas.rows.map((x) => ({ ...x, es: COLAS[x.queue]?.es ?? x.queue, sla: slas[x.queue] ?? 24 })), cumplido: cumplido.rows[0]!, rep: rep.rows[0]! };
}

/* Doctores y Profesionales (fase4-salud-pro §4m): seguro aceptado, «no aceptamos su seguro», no llegó, tiempo de respuesta,
   consultas que terminan en contratar, «cobró el total» de las reseñas y los motivos de ayuda. Solo cifras: ni motivos de
   consulta, ni notas, ni seguros de nadie. */
export async function saludPro(s: Alcance, dias: number) {
  const [sal, pro, rev, ayuda] = await Promise.all([
    dbAnalisis().query<{ n: number; conseg: number; segok: number; segno: number; hechas: number; noshow: number; resp: number | null }>(
      `select count(*)::int as n,
              count(*) filter (where coalesce(o.details->'seguro'->>'kind', 'none') <> 'none')::int as conseg,
              count(*) filter (where coalesce(o.details->'seguro'->>'kind', 'none') <> 'none' and (o.details->'seguro'->>'acepta')::boolean)::int as segok,
              count(*) filter (where exists (select 1 from operation_events e where e.operation_id = o.id and e.kind = 'declined' and e.note->>'es' like 'No aceptan su seguro%'))::int as segno,
              count(*) filter (where o.status = 'done')::int as hechas, count(*) filter (where o.status_detail = 'noshow')::int as noshow,
              round(avg(extract(epoch from o.answered_at - o.sent_at) / 60) filter (where o.answered_at is not null))::int as resp
         from operations o where o.kind = 'appointment' and o.details->>'rubro' = 'salud' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ n: number; consultas: number; contrato: number; total: number; resp: number | null }>(
      `select count(*)::int as n, count(*) filter (where o.status = 'done' or o.status_detail in ('consulted', 'quote', 'hired'))::int as consultas,
              count(*) filter (where o.status_detail in ('hired', 'done'))::int as contrato,
              count(*) filter (where exists (select 1 from written_totals t where t.operation_id = o.id))::int as total,
              round(avg(extract(epoch from o.answered_at - o.sent_at) / 60) filter (where o.answered_at is not null))::int as resp
         from operations o where o.kind = 'appointment' and o.details->>'rubro' = 'pro' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ cobro: number; base: number }>(
      `select count(*) filter (where (r.answers->>'cobro')::int = 1)::int as cobro, count(*) filter (where r.answers ? 'cobro')::int as base
         from reviews r join businesses b on b.id = r.business_id where b.category_id = 'NEG-PRO' and r.status = 'visible' and r.created_at > now() - make_interval(days => $2) and ${scope("b.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ rub: string; reason: string; n: number }>(
      `select o.details->>'rubro' as rub, h.reason, count(*)::int as n from help_requests h join operations o on o.id = h.operation_id
        where o.details->>'rubro' in ('salud', 'pro') and h.created_at > now() - make_interval(days => $2) and ${scope("h.city_id")} group by 1, 2 order by 3 desc`, [s.cities, dias]),
  ]);
  return { sal: sal.rows[0]!, pro: pro.rows[0]!, rev: rev.rows[0]!, ayuda: ayuda.rows };
}

/* Mercados y Tiendas (4s): solo cifras. Mercado: % con foto de cada peso, estimado contra cobrado, sustituciones aceptadas,
   no aceptados / vencidos, tiempo de aceptación. Tienda: apartados recogidos / vencidos, % falta talla, envíos, planes
   terminados / cancelados y «precio de la caja = publicado» de las reseñas. Y los motivos de ayuda de los dos. */
export async function mercadosTiendas(s: Alcance, dias: number) {
  const [merc, tienda, rev, ayuda] = await Promise.all([
    dbAnalisis().query<{ n: number; hechos: number; pesados: number; confoto: number; est: number; cob: number; sustOk: number; sustN: number; noacep: number; resp: number | null }>(
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
    dbAnalisis().query<{ n: number; recogidos: number; vencidos: number; talla: number; envios: number; planes: number; pagados: number; cancelados: number }>(
      `select count(*)::int as n, count(*) filter (where o.status = 'done')::int as recogidos, count(*) filter (where o.status = 'expired')::int as vencidos,
              count(*) filter (where exists (select 1 from change_proposals cp where cp.operation_id = o.id and cp.line_id is not null))::int as talla,
              count(*) filter (where o.mode = 'delivery')::int as envios,
              count(lp.id)::int as planes, count(lp.id) filter (where lp.status = 'paid')::int as pagados, count(lp.id) filter (where lp.status = 'cancelled')::int as cancelados
         from operations o join businesses b on b.id = o.business_id left join layaway_plans lp on lp.operation_id = o.id
        where o.kind = 'hold' and b.category_id = 'NEG-TIENDA' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ caja: number; base: number; pes: number; pbase: number }>(
      `select count(*) filter (where (r.answers->>'caja')::int = 1)::int as caja, count(*) filter (where r.answers ? 'caja')::int as base,
              count(*) filter (where (r.facts->>'fotoPeso')::boolean or (r.answers->>'peso')::int = 1)::int as pes, count(*) filter (where r.facts ? 'fotoPeso' or r.answers ? 'peso')::int as pbase
         from reviews r join businesses b on b.id = r.business_id where b.category_id in ('NEG-MERC', 'NEG-TIENDA') and r.status = 'visible' and r.created_at > now() - make_interval(days => $2) and ${scope("b.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ rub: string; reason: string; n: number }>(
      `select case when o.kind = 'market_order' then 'merc' else 'tienda' end as rub, h.reason, count(*)::int as n from help_requests h join operations o on o.id = h.operation_id
        where o.kind in ('market_order', 'hold') and h.created_at > now() - make_interval(days => $2) and ${scope("h.city_id")} group by 1, 2 order by 3 desc`, [s.cities, dias]),
  ]);
  return { merc: merc.rows[0]!, tienda: tienda.rows[0]!, rev: rev.rows[0]!, ayuda: ayuda.rows };
}

/* 4z-3 · Fiestas y Transporte (solo cifras). Fiestas: % confirmadas en 24 h, vencidas, fechas canceladas por el negocio y los
   depósitos (retenidos / cobrados / devueltos / se quedaron). Transporte: % de salidas a la hora (departed_at − run_at ≤ 15 min),
   ocupación de asientos, cancelaciones tardías (la mitad), salidas canceladas y ayudas «cobró más» por cada 100 viajes. */
export async function fiestasTransporte(s: Alcance, dias: number) {
  const [fi, dep, vi, sal, ayuda] = await Promise.all([
    dbAnalisis().query<{ n: number; conf24: number; vencidas: number; cxNeg: number; hechas: number }>(
      `select count(*)::int as n,
              count(*) filter (where o.confirmed_at is not null and o.confirmed_at - o.sent_at <= interval '24 hours')::int as conf24,
              count(*) filter (where o.status = 'expired')::int as vencidas,
              count(*) filter (where o.status = 'cancelled' and o.cancelled_by = 'business')::int as "cxNeg",
              count(*) filter (where o.status = 'done')::int as hechas
         from operations o where o.kind = 'party' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ ret: number; cob: number; dev: number; quedo: number }>(
      `select coalesce(sum(p.amount_cents) filter (where p.status = 'held'), 0)::int as ret,
              coalesce(sum(p.amount_cents - p.refunded_cents) filter (where p.status in ('captured', 'partially_refunded')), 0)::int as cob,
              coalesce(sum(p.refunded_cents), 0)::int as dev,
              coalesce(sum(p.amount_cents - p.refunded_cents) filter (where p.status in ('captured', 'partially_refunded') and coalesce((o.details->>'perdio')::boolean, false)), 0)::int as quedo
         from payments p join operations o on o.id = p.operation_id where o.kind = 'party' and p.kind = 'deposit' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ n: number; hechos: number; mitad: number; cxSalida: number; cobroMas: number }>(
      `select count(*)::int as n, count(*) filter (where o.status = 'done')::int as hechos,
              count(*) filter (where coalesce((o.details->>'cobroMitad')::int, 0) > 0)::int as mitad,
              count(*) filter (where o.cancel_reason = 'salida')::int as "cxSalida",
              (select count(*)::int from help_requests h join operations o2 on o2.id = h.operation_id where o2.kind = 'trip' and h.reason = 'cobro' and h.created_at > now() - make_interval(days => $2) and ${scope("o2.city_id")}) as "cobroMas"
         from operations o where o.kind = 'trip' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ salidas: number; aTiempo: number; conPas: number; canceladas: number; asientos: number; ocupados: number }>(
      `select count(*) filter (where r.departed_at is not null)::int as salidas,
              count(*) filter (where r.departed_at is not null and r.departed_at - r.run_at <= interval '15 minutes')::int as "aTiempo",
              count(*) filter (where r.seats_booked + r.seats_outside > 0)::int as "conPas",
              count(*) filter (where r.status = 'cancelled' and r.cancel_reason is not null)::int as canceladas,
              coalesce(sum(r.seats_total) filter (where r.status in ('departed', 'arrived')), 0)::int as asientos,
              coalesce(sum(r.seats_booked + r.seats_outside) filter (where r.status in ('departed', 'arrived')), 0)::int as ocupados
         from trip_runs r where r.run_at > now() - make_interval(days => $2) and r.run_at < now() and ${scope("r.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ rub: string; reason: string; n: number }>(
      `select case when o.kind = 'party' then 'fiesta' else 'trans' end as rub, h.reason, count(*)::int as n from help_requests h join operations o on o.id = h.operation_id
        where o.kind in ('party', 'trip') and h.created_at > now() - make_interval(days => $2) and ${scope("h.city_id")} group by 1, 2 order by 3 desc`, [s.cities, dias]),
  ]);
  return { fi: fi.rows[0]!, dep: dep.rows[0]!, vi: vi.rows[0]!, sal: sal.rows[0]!, ayuda: ayuda.rows };
}

/* 4ne · Analítica › Noche (fase4-noche.md §4ne): mesas confirmadas en 60 min, vencidas, no respetadas; depósitos retenidos /
   cobrados / devueltos / que se quedaron; % de la lista que entró; veces que el cover sube después de publicado esa misma noche;
   % «fila como decía» en reseñas; ayudas «cobraron más cover» por cada 100 noches; licencias de licor vencidas. Solo cifras;
   todo por ciudad (city_id) y con índices (operations_noche_idx, night_posts_noche_idx). */
export async function noche(s: Alcance, dias: number) {
  const { INCIDENTE_SQL } = await import("./noche-vigilar");
  const [me, dep, li, cov, fila, ay, lic] = await Promise.all([
    dbAnalisis().query<{ n: number; conf60: number; vencidas: number; noResp: number }>(
      `select count(*)::int as n,
              count(*) filter (where o.confirmed_at is not null and o.confirmed_at - o.sent_at <= interval '60 minutes')::int as conf60,
              count(*) filter (where o.status = 'expired')::int as vencidas,
              count(*) filter (where ${INCIDENTE_SQL.mesa})::int as "noResp"
         from operations o where o.kind = 'night' and o.details->>'k' <> 'lista' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ ret: number; cob: number; dev: number; quedo: number }>(
      `select coalesce(sum(p.amount_cents) filter (where p.status = 'held'), 0)::int as ret,
              coalesce(sum(p.amount_cents - p.refunded_cents) filter (where p.status in ('captured', 'partially_refunded')), 0)::int as cob,
              coalesce(sum(p.refunded_cents), 0)::int as dev,
              coalesce(sum(p.amount_cents - p.refunded_cents) filter (where p.status in ('captured', 'partially_refunded')
                and (coalesce((o.details->>'perdio')::boolean, false) or o.status_detail in ('nollegaron', 'noid'))), 0)::int as quedo
         from payments p join operations o on o.id = p.operation_id where o.kind = 'night' and p.kind = 'deposit' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ n: number; cerradas: number; entro: number; noches: number }>(
      `select count(*) filter (where o.details->>'k' = 'lista')::int as n,
              count(*) filter (where o.details->>'k' = 'lista' and o.status = 'done')::int as cerradas,
              count(*) filter (where o.details->>'k' = 'lista' and o.status = 'done' and o.status_detail = 'entro')::int as entro,
              count(*) filter (where o.status = 'done')::int as noches
         from operations o where o.kind = 'night' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    // Una subida = una publicación del cover de esa noche más alta que la anterior de la misma noche (night_posts, solo inserción).
    dbAnalisis().query<{ sube: number; locales: number }>(
      `select count(*)::int as sube, count(distinct business_id)::int as locales from (
         select p.business_id, (p.value->>'cents')::int as c, lag((p.value->>'cents')::int) over (partition by p.business_id, p.night order by p.at, p.id) as antes
           from night_posts p where p.field = 'cover' and p.night > current_date - $2::int and ${scope("p.city_id")}) x
        where x.antes is not null and x.c > x.antes`, [s.cities, dias]),
    dbAnalisis().query<{ n: number; ok: number }>(
      `select count(*) filter (where r.answers ? 'filaOk')::int as n, count(*) filter (where r.answers->>'filaOk' = 'a')::int as ok
         from reviews r join operations o on o.id = r.operation_id where o.kind = 'night' and r.status <> 'removed' and r.created_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ reason: string; n: number }>(
      `select h.reason, count(*)::int as n from help_requests h join operations o on o.id = h.operation_id
        where o.kind = 'night' and h.created_at > now() - make_interval(days => $2) and ${scope("h.city_id")} group by 1 order by 2 desc`, [s.cities, dias]),
    dbAnalisis().query<{ vencidas: number; total: number }>(
      `select count(*) filter (where l.status = 'expired' or (l.status = 'valid' and l.next_review < current_date))::int as vencidas, count(*)::int as total
         from licenses l join businesses b on b.id = l.business_id where l.kind = 'pa_plcb' and ${scope("b.city_id")}`, [s.cities]),
  ]);
  return { me: me.rows[0]!, dep: dep.rows[0]!, li: li.rows[0]!, cov: cov.rows[0]!, fila: fila.rows[0]!, ayuda: ay.rows, lic: lic.rows[0]! };
}

/* Analítica › Educación · Niños · Deporte (4eg · fase4-edu-ninos-deporte.md §4eg): solo cifras, nunca datos de un niño ni de un inscrito. */
export async function inscripcionesAnalitica(s: Alcance, dias: number) {
  const [me, gr, mat, esp, baja, rev, ay, lic] = await Promise.all([
    dbAnalisis().query<{ n: number; conf24: number; vencidas: number; edu: number; ninos: number; dep: number }>(
      `select count(*)::int as n, count(*) filter (where o.confirmed_at is not null and o.confirmed_at - o.sent_at <= interval '24 hours')::int as conf24,
              count(*) filter (where o.status = 'expired')::int as vencidas, count(*) filter (where o.details->>'rubro' = 'edu')::int as edu,
              count(*) filter (where o.details->>'rubro' = 'ninos')::int as ninos, count(*) filter (where o.details->>'rubro' = 'dep')::int as dep
         from operations o where o.kind = 'enrollment' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ cancelados: number; vivos: number; ocupados: number; cupos: number }>(
      `select count(*) filter (where g.status = 'cancelled' and g.updated_at > now() - make_interval(days => $2))::int as cancelados,
              count(*) filter (where g.status in ('open', 'started'))::int as vivos,
              coalesce(sum(g.seats_booked + g.seats_outside) filter (where g.status in ('open', 'started')), 0)::int as ocupados,
              coalesce(sum(g.seats_total) filter (where g.status in ('open', 'started')), 0)::int as cupos
         from class_groups g where g.purpose = 'insc' and ${scope("g.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ ret: number; cob: number; dev: number; quedo: number }>(
      `select coalesce(sum(p.amount_cents) filter (where p.status = 'held'), 0)::int as ret,
              coalesce(sum(p.amount_cents - p.refunded_cents) filter (where p.status in ('captured', 'partially_refunded')), 0)::int as cob,
              coalesce(sum(p.refunded_cents), 0)::int as dev,
              coalesce(sum(p.amount_cents - p.refunded_cents) filter (where p.status in ('captured', 'partially_refunded') and coalesce((o.details->>'perdio')::boolean, false)), 0)::int as quedo
         from payments p join operations o on o.id = p.operation_id where o.kind = 'enrollment' and p.kind = 'deposit' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ esperando: number; dias: number | null; ofrecidas: number; tomadas: number }>(
      `select count(*) filter (where w.status = 'waiting')::int as esperando,
              round(avg(extract(epoch from coalesce(w.updated_at, now()) - w.created_at) / 86400) filter (where w.status in ('accepted', 'waiting')), 1)::float as dias,
              count(*) filter (where w.status in ('offered', 'accepted', 'expired') and w.offered_until is not null)::int as ofrecidas, count(*) filter (where w.status = 'accepted')::int as tomadas
         from waitlist_entries w where w.created_at > now() - make_interval(days => $2) and ${scope("w.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ pedidas: number; en72: number }>(
      `select count(*)::int as pedidas,
              count(*) filter (where exists (select 1 from operation_events e2 where e2.operation_id = e.operation_id and e2.kind = 'insc_cancel_ok' and e2.at <= e.at + interval '72 hours'))::int as en72
         from operation_events e join operations o on o.id = e.operation_id where e.kind = 'insc_cancel_req' and e.at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ tn: number; tok: number; cn: number; cok: number }>(
      `select count(*) filter (where r.answers ? 'totalOk')::int as tn, count(*) filter (where (r.answers->>'totalOk')::int = 1)::int as tok,
              count(*) filter (where r.answers ? 'certOk')::int as cn, count(*) filter (where (r.answers->>'certOk')::int = 1)::int as cok
         from reviews r join operations o on o.id = r.operation_id where o.kind = 'enrollment' and r.status <> 'removed' and r.created_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ rub: string; reason: string; n: number }>(
      `select o.details->>'rubro' as rub, h.reason, count(*)::int as n from help_requests h join operations o on o.id = h.operation_id
        where o.kind = 'enrollment' and h.created_at > now() - make_interval(days => $2) and ${scope("h.city_id")} group by 1, 2 order by 3 desc`, [s.cities, dias]),
    dbAnalisis().query<{ vigentes: number; vencidas: number; cuidado: number }>(
      `select count(distinct l.business_id) filter (where l.status = 'valid' and (l.next_review is null or l.next_review >= current_date))::int as vigentes,
              count(distinct l.business_id) filter (where l.status = 'expired' or (l.status = 'valid' and l.next_review < current_date))::int as vencidas,
              (select count(*)::int from businesses b2 where b2.category_id = 'NEG-NINOS' and b2.status = 'active' and ${scope("b2.city_id")}) as cuidado
         from licenses l join businesses b on b.id = l.business_id where l.kind = 'pa_dhs_childcare' and ${scope("b.city_id")}`, [s.cities]),
  ]);
  return { me: me.rows[0]!, gr: gr.rows[0]!, mat: mat.rows[0]!, esp: esp.rows[0]!, baja: baja.rows[0]!, rev: rev.rows[0]!, ayuda: ay.rows, lic: lic.rows[0]! };
}


/* Analítica › Iglesias · Bienes Raíces · Autos (4ig · fase4-iglesias-inmuebles-autos.md §4ig): solo cifras por ciudad, en una consulta por
   cosa (sin N+1). Nunca personas por religión (ni la denominación ni quién va a qué iglesia) ni datos de crédito (no existen en la base). */
export const CATS_4I = ["NEG-FE", "NEG-INMUEBLE", "NEG-DEALER"];
export async function feInmAutos(s: Alcance, dias: number) {
  const [vis, dias2, vivos, rev, ay, est, lic, fe, vj] = await Promise.all([
    // Visitas y pruebas de manejo pedidas en el período. A tiempo = confirmada: el servidor solo deja confirmar antes del plazo (4 h hábiles,
    // nunca después de la hora − 1 h; al confirmar, respond_by se limpia) y el barrido vence las demás, así que confirmed_at ya es «a tiempo».
    dbAnalisis().query<{ rub: string; n: number; items: number; atiempo: number; vencidas: number; noshow: number; pasaron: number }>(
      `select o.details->>'rubro' as rub, count(*)::int as n, count(distinct o.details->>'item_id')::int as items,
              count(*) filter (where o.confirmed_at is not null)::int as atiempo,
              count(*) filter (where o.status = 'expired')::int as vencidas,
              count(*) filter (where o.status = 'done' and o.status_detail = 'noshow')::int as noshow,
              count(*) filter (where o.status = 'done' and o.status_detail is distinct from 'noshow')::int as pasaron
         from operations o where o.kind = 'visit' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")} group by 1`, [s.cities, dias]),
    // Días desde que se publicó hasta que se rentó o se vendió (las que cambiaron de estado en el período).
    dbAnalisis().query<{ que: string; n: number; dias: number | null }>(
      `select pl.status as que, count(*)::int as n, round(avg(extract(epoch from pl.status_at - pl.created_at) / 86400)::numeric, 1)::float as dias
         from property_listings pl where pl.status in ('rented', 'sold') and pl.status_at > now() - make_interval(days => $2) and ${scope("pl.city_id")} group by 1
       union all
       select 'carro', count(*)::int, round(avg(extract(epoch from v.status_at - v.created_at) / 86400)::numeric, 1)::float
         from vehicle_listings v where v.status = 'sold' and v.status_at > now() - make_interval(days => $2) and ${scope("v.city_id")}`, [s.cities, dias]),
    // Propiedades y carros a la vista hoy, por ciudad.
    dbAnalisis().query<{ ciudad: string; props: number; carros: number }>(
      `select ci.name as ciudad, coalesce(p.n, 0)::int as props, coalesce(v.n, 0)::int as carros
         from cities ci
         left join (select pl.city_id, count(*) as n from property_listings pl join items i on i.id = pl.item_id join businesses b on b.id = pl.business_id
                     where pl.status in ('available', 'pending') and i.status = 'live' and i.removed_at is null and b.status = 'active' group by 1) p on p.city_id = ci.id
         left join (select v.city_id, count(*) as n from vehicle_listings v join items i on i.id = v.item_id join businesses b on b.id = v.business_id
                     where v.status in ('lot', 'pending') and i.status = 'live' and i.removed_at is null and b.status = 'active' group by 1) v on v.city_id = ci.id
        where ${scope("ci.id")} and (ci.status = 'on' or p.n > 0 or v.n > 0) order by ci.name`, [s.cities]),
    // «El total fue el que vi»: Para mudarte (Bienes Raíces) y En la puerta (Autos), de las reseñas de visitas del período.
    dbAnalisis().query<{ mn: number; mok: number; pn: number; pok: number }>(
      `select count(*) filter (where r.answers ? 'mudarOk')::int as mn, count(*) filter (where (r.answers->>'mudarOk')::int = 1)::int as mok,
              count(*) filter (where r.answers ? 'puertaOk')::int as pn, count(*) filter (where (r.answers->>'puertaOk')::int = 1)::int as pok
         from reviews r join operations o on o.id = r.operation_id where o.kind = 'visit' and r.status <> 'removed' and r.created_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    // Ayudas de visitas (y de fechas de Iglesias) por motivo.
    dbAnalisis().query<{ rub: string; reason: string; n: number }>(
      `select case when o.kind = 'visit' then o.details->>'rubro' else 'fe' end as rub, h.reason, count(*)::int as n
         from help_requests h join operations o on o.id = h.operation_id join businesses b on b.id = h.business_id
        where (o.kind = 'visit' or (o.kind = 'enrollment' and b.category_id = 'NEG-FE')) and h.created_at > now() - make_interval(days => $2) and ${scope("h.city_id")} group by 1, 2 order by 3 desc`, [s.cities, dias]),
    // Anuncios (o «Pedir fecha») pausados por una posible estafa: en el período y en pausa hoy.
    dbAnalisis().query<{ periodo: number; hoy: number; sancion: number }>(
      `select count(*) filter (where h.paused_at > now() - make_interval(days => $2))::int as periodo,
              count(*) filter (where h.paused_at is not null and h.unpaused_at is null)::int as hoy,
              (select count(*)::int from queue_items q where q.queue = 'estafa' and q.decision = 'sancion' and q.decided_at > now() - make_interval(days => $2) and ${scope("q.city_id")}) as sancion
         from help_requests h where h.paused_at is not null and ${scope("h.city_id")}`, [s.cities, dias]),
    // Licencias de las tres: vigentes, por vencer (14 días), vencidas y en revisión, por categoría.
    dbAnalisis().query<{ cat: string; vigentes: number; porvencer: number; vencidas: number; revision: number }>(
      `select k.category_id as cat,
              count(*) filter (where l.status = 'valid' and (l.next_review is null or l.next_review >= current_date))::int as vigentes,
              count(*) filter (where l.status = 'valid' and l.next_review between current_date and current_date + ${cfgSql("lic_aviso_dias")})::int as porvencer,
              count(*) filter (where l.status = 'expired' or (l.status = 'valid' and l.next_review < current_date))::int as vencidas,
              count(*) filter (where l.status = 'review')::int as revision
         from licenses l join license_kinds k on k.key = l.kind join businesses b on b.id = l.business_id
        where k.category_id = any($2::text[]) and b.status = 'active' and ${scope("b.city_id")} group by 1`, [s.cities, CATS_4I]),
    // Iglesias: fechas, catecismo y consejería pedidos por la app y cuántos se respondieron en 48 h. Sin denominación ni quién.
    dbAnalisis().query<{ n: number; en48: number; vencidas: number }>(
      `select count(*)::int as n, count(*) filter (where o.confirmed_at is not null and o.confirmed_at - o.sent_at <= interval '48 hours')::int as en48,
              count(*) filter (where o.status = 'expired')::int as vencidas
         from operations o join businesses b on b.id = o.business_id where o.kind = 'enrollment' and b.category_id = 'NEG-FE' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    // Vivienda justa: textos frenados en el período y declaraciones de mayores por revisar.
    dbAnalisis().query<{ frenadas: number; mayores: number }>(
      `select (select count(*)::int from audit_entries a where a.action = 'inm.vivienda_justa.frenada' and a.at > now() - make_interval(days => $2) and ${scope("a.city_id")}) as frenadas,
              (select count(*)::int from property_listings pl join items i on i.id = pl.item_id where pl.senior_62 and pl.senior_status = 'review' and i.removed_at is null and ${scope("pl.city_id")}) as mayores`, [s.cities, dias]),
  ]);
  const V = (r: string) => vis.rows.find((x) => x.rub === r) ?? { rub: r, n: 0, items: 0, atiempo: 0, vencidas: 0, noshow: 0, pasaron: 0 };
  return { inm: V("inm"), dealer: V("dealer"), dias: dias2.rows, vivos: vivos.rows, rev: rev.rows[0]!, ayuda: ay.rows, estafa: est.rows[0]!, lic: lic.rows, fe: fe.rows[0]!, vj: vj.rows[0]! };
}

/* 5i · Analítica › Comunidad (fase5-comunidad.md §4 5i): publicaciones, comentarios, % de preguntas resueltas, tiempo a la primera respuesta,
   vecinos activos por rango, reportes por cada 1,000 publicaciones, apelaciones levantadas, monedas emitidas y canjeadas y canjes por negocio.
   SOLO lee las vistas de 0105 (por ciudad y día local, sin personas) y com_activos_por_rango() (cuántos, nunca quiénes): guardián
   analiticaSinPersonas. El período cuenta días locales completos desde hoy hacia atrás. */
export async function comunidadAnalitica(s: Alcance, dias: number) {
  const DESDE = `(now() at time zone 'America/New_York')::date - ($2::int - 1)`;
  const [tot, ciu, rk, neg] = await Promise.all([
    dbAnalisis().query<{ publicaciones: number; comentarios: number; preguntas: number; resueltas: number; con_respuesta: number; min_primera: number; reportes: number;
      levantadas: number; decididas: number; emitidas: number; canjeadas: number; devueltas: number; canjes: number; usados: number }>(
      `select coalesce(sum(a.publicaciones), 0)::int as publicaciones, coalesce(sum(a.comentarios), 0)::int as comentarios, coalesce(sum(a.preguntas), 0)::int as preguntas,
              coalesce(sum(a.resueltas), 0)::int as resueltas, coalesce(sum(a.con_respuesta), 0)::int as con_respuesta, coalesce(sum(a.min_primera), 0)::float8 as min_primera,
              coalesce(sum(a.reportes), 0)::int as reportes, coalesce(sum(a.apelaciones_levantadas), 0)::int as levantadas, coalesce(sum(a.apelaciones_decididas), 0)::int as decididas,
              coalesce(sum(a.monedas_emitidas), 0)::int as emitidas, coalesce(sum(a.monedas_canjeadas), 0)::int as canjeadas, coalesce(sum(a.monedas_devueltas), 0)::int as devueltas,
              coalesce(sum(a.canjes), 0)::int as canjes, coalesce(sum(a.canjes_usados), 0)::int as usados
         from com_analitica_dia_cache a where a.dia >= ${DESDE} and ${scope("a.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ ciudad: string; publicaciones: number; comentarios: number; preguntas: number; resueltas: number; reportes: number }>(
      `select ci.name as ciudad, coalesce(sum(a.publicaciones), 0)::int as publicaciones, coalesce(sum(a.comentarios), 0)::int as comentarios,
              coalesce(sum(a.preguntas), 0)::int as preguntas, coalesce(sum(a.resueltas), 0)::int as resueltas, coalesce(sum(a.reportes), 0)::int as reportes
         from cities ci left join com_analitica_dia_cache a on a.city_id = ci.id and a.dia >= ${DESDE}
        where ${scope("ci.id")} group by ci.id, ci.name having ci.id = any(array(select id from cities where status = 'on')) or coalesce(sum(a.publicaciones), 0) > 0 order by ci.name`, [s.cities, dias]),
    // 9b-3 · 7 · 30 · 90 días: del resumen por ciudad (com_activos_cache, cada 10 min; juntar a todos los que publicaron, comentaron o votaron
    // tardaba 1,3 s con 1 M de vecinos). Otro período, en el momento.
    [7, 30, 90].includes(dias)
      ? dbAnalisis().query<{ rango: number; activos: number; nombre: string | null }>(
        `select a.rango::int as rango, sum(a.activos)::int as activos, r.name->>'es' as nombre from com_activos_cache a left join ranks r on r.level = a.rango
          where a.dias = $2 and ${scope("a.city_id")} group by a.rango, r.name order by a.rango`, [s.cities, dias])
      : dbAnalisis().query<{ rango: number; activos: number; nombre: string | null }>(
        `select a.rango::int as rango, a.activos, r.name->>'es' as nombre from com_activos_por_rango($1::text[], (${DESDE})::timestamp at time zone 'America/New_York') a
           left join ranks r on r.level = a.rango order by a.rango`, [s.cities, dias]),
    dbAnalisis().query<{ negocio: string; ciudad: string; canjes: number; usados: number; monedas: number }>(
      `select k.negocio, ci.name as ciudad, sum(k.canjes)::int as canjes, sum(k.usados)::int as usados, sum(k.monedas)::int as monedas
         from com_canjes_negocio_dia k join cities ci on ci.id = k.city_id where k.dia >= ${DESDE} and ${scope("k.city_id")}
        group by k.business_id, k.negocio, ci.name order by 3 desc, 1 limit 20`, [s.cities, dias]),
  ]);
  return { t: tot.rows[0]!, ciudades: ciu.rows, rangos: rk.rows, negocios: neg.rows };
}

/* 6j · Analítica › Eventos (fase6-eventos.md §4 6j): vistas → guardados → RSVP / compras, bruto, comisión, devuelto, asistencia y no-show,
   lista de espera convertida, incidencias por cada 1,000 entradas y el evento privado (pedidas → con propuesta → aceptadas, depósito,
   canceladas a tiempo y tarde), por ciudad, formato y día. SOLO lee las vistas de 0115 (por ciudad, día local y formato, sin personas),
   los nombres de los formatos y de las ciudades y, por organizador, evt_ventas_negocio_dia (un negocio no es una persona): guardián
   analiticaSinPersonas. El período cuenta días locales completos desde hoy hacia atrás. */
export async function eventosAnalitica(s: Alcance, dias: number) {
  const DESDE = `(now() at time zone 'America/New_York')::date - ($2::int - 1)`;
  const SUM = `coalesce(sum(a.vistas), 0)::int as vistas, coalesce(sum(a.guardados), 0)::int as guardados, coalesce(sum(a.rsvp), 0)::int as rsvp, coalesce(sum(a.rsvp_personas), 0)::int as rsvp_personas,
               coalesce(sum(a.ordenes), 0)::int as ordenes, coalesce(sum(a.boletos), 0)::int as boletos, coalesce(sum(a.cortesias), 0)::int as cortesias, coalesce(sum(a.bruto), 0)::float8 as bruto,
               coalesce(sum(a.comision), 0)::float8 as comision, coalesce(sum(a.devuelto), 0)::float8 as devuelto, coalesce(sum(a.espera), 0)::int as espera,
               coalesce(sum(a.espera_convertidos), 0)::int as espera_convertidos, coalesce(sum(a.incidencias), 0)::int as incidencias`;
  type T = { vistas: number; guardados: number; rsvp: number; rsvp_personas: number; ordenes: number; boletos: number; cortesias: number; bruto: number; comision: number; devuelto: number; espera: number; espera_convertidos: number; incidencias: number };
  const [tot, fmt, ciu, asi, neg, evp] = await Promise.all([
    dbAnalisis().query<T>(`select ${SUM} from evt_analitica_dia_cache a where a.dia >= ${DESDE} and ${scope("a.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<T & { formato: string; label: string }>(
      `select f.key as formato, f.label->>'es' as label, ${SUM} from event_formats f left join evt_analitica_dia_cache a on a.format = f.key and a.dia >= ${DESDE} and ${scope("a.city_id")}
        group by f.key, f.label, f.sort order by f.sort`, [s.cities, dias]),
    dbAnalisis().query<T & { ciudad: string }>(
      `select ci.name as ciudad, ${SUM} from cities ci left join evt_analitica_dia_cache a on a.city_id = ci.id and a.dia >= ${DESDE}
        where ${scope("ci.id")} group by ci.id, ci.name having ci.id = any(array(select id from cities where status = 'on')) or coalesce(sum(a.vistas), 0) + coalesce(sum(a.ordenes), 0) > 0 order by ci.name`, [s.cities, dias]),
    dbAnalisis().query<{ fechas: number; esperados: number; entraron: number; rsvp_van: number; rsvp_llegaron: number; incidencias: number }>(
      `select coalesce(sum(x.fechas), 0)::int as fechas, coalesce(sum(x.esperados), 0)::int as esperados, coalesce(sum(x.entraron), 0)::int as entraron,
              coalesce(sum(x.rsvp_van), 0)::int as rsvp_van, coalesce(sum(x.rsvp_llegaron), 0)::int as rsvp_llegaron, coalesce(sum(x.incidencias), 0)::int as incidencias
         from evt_asistencia_dia_cache x where x.dia >= ${DESDE} and ${scope("x.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ negocio: string; ciudad: string; ordenes: number; bruto: number; comision: number; devuelto: number }>(
      `select v.negocio, ci.name as ciudad, sum(v.ordenes)::int as ordenes, sum(v.bruto)::float8 as bruto, sum(v.comision)::float8 as comision, sum(v.devuelto)::float8 as devuelto
         from evt_ventas_negocio_dia_cache v join cities ci on ci.id = v.city_id where v.dia >= ${DESDE} and ${scope("v.city_id")}
        group by v.business_id, v.negocio, ci.name order by 4 desc, 1 limit 15`, [s.cities, dias]),
    dbAnalisis().query<{ pedidas: number; con_propuesta: number; sin_respuesta: number; aceptadas: number; deposito: number; a_tiempo: number; tarde: number; negocio: number }>(
      `select coalesce(sum(x.pedidas), 0)::int as pedidas, coalesce(sum(x.con_propuesta), 0)::int as con_propuesta, coalesce(sum(x.sin_respuesta), 0)::int as sin_respuesta,
              coalesce(sum(x.aceptadas), 0)::int as aceptadas, coalesce(sum(x.deposito), 0)::float8 as deposito, coalesce(sum(x.canceladas_a_tiempo), 0)::int as a_tiempo,
              coalesce(sum(x.canceladas_tarde), 0)::int as tarde, coalesce(sum(x.canceladas_negocio), 0)::int as negocio
         from evp_analitica_dia_cache x where x.dia >= ${DESDE} and ${scope("x.city_id")}`, [s.cities, dias]),
  ]);
  return { t: tot.rows[0]!, formatos: fmt.rows, ciudades: ciu.rows, asistencia: asi.rows[0]!, negocios: neg.rows, evp: evp.rows[0]! };
}

/* 7i · Analítica › El Compa y Soporte (fase7-compa §2 0124): SOLO las vistas sin personas compa_analitica_dia (ciudad, día local, nivel y canal) y
   soporte_analitica_dia (ciudad, día local y tema) y los nombres de las ciudades. La espera de la IA: promedio del período (suma ÷ llamadas) y el p95
   del peor día (los percentiles de cada día no se suman); la primera respuesta de Soporte igual. */
export async function compaSoporteAnalitica(s: Alcance, dias: number) {
  const DESDE = `(now() at time zone 'America/New_York')::date - ($2::int - 1)`;
  const CS = `coalesce(sum(a.conversaciones), 0)::int as conversaciones, coalesce(sum(a.resolvio_solo), 0)::int as resolvio_solo, coalesce(sum(a.accion), 0)::int as accion,
              coalesce(sum(a.a_persona), 0)::int as a_persona, coalesce(sum(a.al_dueno), 0)::int as al_dueno, coalesce(sum(a.sin_ia), 0)::int as sin_ia,
              coalesce(sum(a.con_ia), 0)::int as con_ia, coalesce(sum(a.al_tope), 0)::int as al_tope, coalesce(sum(a.gasto_microusd), 0)::float8 as gasto`;
  type C = { conversaciones: number; resolvio_solo: number; accion: number; a_persona: number; al_dueno: number; sin_ia: number; con_ia: number; al_tope: number; gasto: number };
  const SS = `coalesce(sum(x.casos), 0)::int as casos, coalesce(sum(x.desde_compa), 0)::int as desde_compa, coalesce(sum(x.de_negocios), 0)::int as de_negocios,
              coalesce(sum(x.alta), 0)::int as alta, coalesce(sum(x.con_respuesta), 0)::int as con_respuesta, coalesce(sum(x.plazo_cumplido), 0)::int as plazo_cumplido,
              coalesce(sum(x.plazo_vencido), 0)::int as plazo_vencido, coalesce(sum(x.primera_suma_seg), 0)::float8 as primera_suma, max(x.primera_p90_seg)::int as primera_p90_max,
              coalesce(sum(x.resueltos), 0)::int as resueltos, coalesce(sum(x.csat_si), 0)::int as csat_si, coalesce(sum(x.csat_no), 0)::int as csat_no, coalesce(sum(x.devuelto_cents), 0)::float8 as devuelto`;
  type S = { casos: number; desde_compa: number; de_negocios: number; alta: number; con_respuesta: number; plazo_cumplido: number; plazo_vencido: number; primera_suma: number;
    primera_p90_max: number | null; resueltos: number; csat_si: number; csat_no: number; devuelto: number };
  const [tot, motivos, uso, canal, ciu, sop, temas, sopCiu] = await Promise.all([
    dbAnalisis().query<C & { marcadas: number; no_supo: number; a_reglas: number; apagado: number; limite: number; espera_suma: number; esperas: number; p95_max: number | null }>(
      `select ${CS}, coalesce(sum(a.marcadas), 0)::int as marcadas, coalesce(sum(a.no_supo), 0)::int as no_supo, coalesce(sum(a.a_reglas), 0)::int as a_reglas,
              coalesce(sum(a.apagado), 0)::int as apagado, coalesce(sum(a.limite), 0)::int as limite, coalesce(sum(a.espera_suma_ms), 0)::float8 as espera_suma,
              coalesce(sum(a.esperas), 0)::int as esperas, max(a.espera_p95_ms)::int as p95_max
         from compa_analitica_dia_cache a where a.dia >= ${DESDE} and ${scope("a.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ dinero: number; cuenta: number; seguridad: number; pidio: number; no_supo: number; dueno: number }>(
      `select coalesce(sum(a.persona_dinero), 0)::int as dinero, coalesce(sum(a.persona_cuenta), 0)::int as cuenta, coalesce(sum(a.persona_seguridad), 0)::int as seguridad,
              coalesce(sum(a.persona_pidio), 0)::int as pidio, coalesce(sum(a.persona_no_supo), 0)::int as no_supo, coalesce(sum(a.al_dueno), 0)::int as dueno
         from compa_analitica_dia_cache a where a.dia >= ${DESDE} and ${scope("a.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<C & { uso: string }>(`select a.uso, ${CS} from compa_analitica_dia_cache a where a.dia >= ${DESDE} and ${scope("a.city_id")} group by a.uso order by 2 desc`, [s.cities, dias]),
    dbAnalisis().query<C & { canal: string }>(`select a.canal, ${CS} from compa_analitica_dia_cache a where a.dia >= ${DESDE} and ${scope("a.city_id")} group by a.canal order by 2 desc`, [s.cities, dias]),
    dbAnalisis().query<C & { ciudad: string; id: string }>(
      `select ci.id, ci.name as ciudad, ${CS}
         from cities ci left join compa_analitica_dia_cache a on a.city_id = ci.id and a.dia >= ${DESDE}
        where ${scope("ci.id")} group by ci.id, ci.name having ci.id = any(array(select id from cities where status = 'on')) or coalesce(sum(a.conversaciones), 0) > 0 order by ci.name`, [s.cities, dias]),
    dbAnalisis().query<S>(`select ${SS} from soporte_analitica_dia_cache x where x.dia >= ${DESDE} and ${scope("x.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<S & { tema: string }>(`select x.tema, ${SS} from soporte_analitica_dia_cache x where x.dia >= ${DESDE} and ${scope("x.city_id")} group by x.tema order by 2 desc`, [s.cities, dias]),
    dbAnalisis().query<S & { id: string }>(`select x.city_id as id, ${SS} from soporte_analitica_dia_cache x where x.dia >= ${DESDE} and ${scope("x.city_id")} group by x.city_id`, [s.cities, dias]),
  ]);
  const vacio: S = { casos: 0, desde_compa: 0, de_negocios: 0, alta: 0, con_respuesta: 0, plazo_cumplido: 0, plazo_vencido: 0, primera_suma: 0, primera_p90_max: null, resueltos: 0, csat_si: 0, csat_no: 0, devuelto: 0 };
  const sc = new Map(sopCiu.rows.map((x) => [x.id, x]));
  return { t: tot.rows[0]!, motivos: motivos.rows[0]!, usos: uso.rows, canales: canal.rows, ciudades: ciu.rows.map((x) => ({ ...x, ...(sc.get(x.id) ?? vacio) })), sop: sop.rows[0]!, temas: temas.rows };
}

/* 8i · Analítica › Apps (fase8-apps.md §4 8i): por app y plataforma, sin personas (solo cuentas de sesiones, eventos y errores).
   - Instalaciones activas = teléfonos distintos (dispositivo de la sesión) con una sesión de esa app vista en 7 y en 30 días.
   - Versiones: sesiones vistas en el período por versión.
   - Avisos: tokens de push vivos (aceptaron) frente a las respuestas «negado» o «ahora no» de la hoja previa en el período.
   - Errores por sesión: errores de la app en el período ÷ sesiones vistas en el período.
   - Aperturas de la app (app_abrir). Enlaces que abren la app o la web: llegan con 8b (enlaces universales; espera el dominio).
   Acotado a las ciudades de quien mira por la ciudad de la cuenta de la sesión (vacío = todas). */
export async function appsAnalitica(s: Alcance, dias: number) {
  const [inst, vers, push, err, abre] = await Promise.all([
    dbAnalisis().query<{ app: string; plat: string; n7: number; n30: number }>(
      `select x.app, x.platform as plat, count(distinct x.device) filter (where x.last_seen_at > now() - interval '7 days')::int as n7, count(distinct x.device)::int as n30
         from sessions x join users u on u.id = x.user_id
        where x.platform in ('ios', 'android') and x.last_seen_at > now() - interval '30 days' and not u.is_test and ${scope("u.home_city_id")}
        group by 1, 2 order by 1, 2`, [s.cities]),
    dbAnalisis().query<{ app: string; plat: string; version: string | null; n: number }>(
      `select x.app, x.platform as plat, x.app_version as version, count(*)::int as n from sessions x join users u on u.id = x.user_id
        where x.platform in ('ios', 'android') and x.last_seen_at > now() - make_interval(days => $2) and not u.is_test and ${scope("u.home_city_id")}
        group by 1, 2, 3 order by 1, 2, n desc`, [s.cities, dias]),
    dbAnalisis().query<{ app: string; plat: string; vivos: number; negados: number; ahora_no: number }>(
      `with t as (select p.app, p.platform as plat, count(*)::int as vivos from push_tokens p join users u on u.id = p.user_id
                   where p.revoked_at is null and p.platform in ('ios', 'android') and not u.is_test and ${scope("u.home_city_id")} group by 1, 2),
            r as (select e.app, e.plat, count(*) filter (where e.props->>'respuesta' = 'negado')::int as negados, count(*) filter (where e.props->>'respuesta' = 'ahora_no')::int as ahora_no
                    from app_events e where e.name = 'permiso_respuesta' and e.props->>'permiso' = 'avisos' and e.app is not null and e.at > now() - make_interval(days => $2) and ${scope("e.city_id")} group by 1, 2)
       select coalesce(t.app, r.app) as app, coalesce(t.plat, r.plat) as plat, coalesce(t.vivos, 0) as vivos, coalesce(r.negados, 0) as negados, coalesce(r.ahora_no, 0) as ahora_no
         from t full join r on r.app = t.app and r.plat = t.plat order by 1, 2`, [s.cities, dias]),
    dbAnalisis().query<{ app: string; plat: string; errores: number; sesiones: number }>(
      `with e as (select g.app, g.platform as plat, count(*)::int as errores, count(distinct v.session_hash)::int as sesiones from app_error_events v join app_error_groups g on g.id = v.group_id
                   where v.at > now() - make_interval(days => $1) and not v.is_test and g.platform in ('ios', 'android') group by 1, 2),
            s as (select x.app, x.platform as plat, count(*)::int as n from sessions x where x.platform in ('ios', 'android') and x.last_seen_at > now() - make_interval(days => $1) group by 1, 2)
       select coalesce(e.app, s.app) as app, coalesce(e.plat, s.plat) as plat, coalesce(e.errores, 0) as errores, coalesce(s.n, 0) as sesiones from e full join s on s.app = e.app and s.plat = e.plat order by 1, 2`, [dias]),
    dbAnalisis().query<{ app: string; plat: string; n: number }>(
      `select app, plat, count(*)::int as n from app_events where name = 'app_abrir' and app is not null and at > now() - make_interval(days => $2) and ${scope("city_id")} group by 1, 2 order by 1, 2`, [s.cities, dias]),
  ]);
  return { instalaciones: inst.rows, versiones: vers.rows, avisos: push.rows, errores: err.rows, aperturas: abre.rows };
}

/* ── 9g · La Analítica completa (fase9-apertura.md §4 9g; admin-dashboard.md ADM-ANALIT; prototipo secAnalit «Dinero»). Todo por la base de análisis
   (dbAnalisis) y, donde hay derivado, del derivado que llena el barrido (metricas_*). Sin personas: solo cuántos, montos y nombres de negocios. ── */
export type Alcance = { cities: string[] };
const DESDE_DIA = `(now() at time zone 'America/New_York')::date - ($2::int - 1)`;

/* Dinero (ADM-ANALIT «ingresos»): lo cobrado por tipo de operación, la comisión, las devoluciones, el ticket promedio, las citas que no llegaron, lo
   vendido por semana (8 semanas, neto de devoluciones), el período anterior para la comparación, Pro (MRR, pagando, en prueba, prueba → pago) y el
   dinero por estado de los cobros del período. */
export async function dinero(s: Alcance, dias: number) {
  type Tipo = { tipo: string; operaciones: number; bruto: number; comision: number; devoluciones: number; devuelto: number; cerradas: number; no_llegaron: number };
  const [tipos, antes, semanas, pro, foto, estados] = await Promise.all([
    dbAnalisis().query<Tipo>(
      `select x.tipo, sum(x.operaciones)::int as operaciones, sum(x.bruto_cents)::float8 as bruto, sum(x.comision_cents)::float8 as comision, sum(x.devoluciones)::int as devoluciones,
              sum(x.devuelto_cents)::float8 as devuelto, sum(x.cerradas)::int as cerradas, sum(x.no_llegaron)::int as no_llegaron
         from metricas_dinero_dia x where x.dia >= ${DESDE_DIA} and ${scope("x.city_id")} group by x.tipo order by 3 desc`, [s.cities, dias]),
    dbAnalisis().query<{ bruto: number; comision: number; operaciones: number }>(
      `select coalesce(sum(x.bruto_cents), 0)::float8 as bruto, coalesce(sum(x.comision_cents), 0)::float8 as comision, coalesce(sum(x.operaciones), 0)::int as operaciones
         from metricas_dinero_dia x where x.dia >= ${DESDE_DIA} - $2::int and x.dia < ${DESDE_DIA} and ${scope("x.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ semana: string; neto: number }>(
      `select to_char(w.semana, 'YYYY-MM-DD') as semana, coalesce(sum(x.bruto_cents - x.devuelto_cents), 0)::float8 as neto
         from generate_series(date_trunc('week', (now() at time zone 'America/New_York')::date) - interval '49 days', date_trunc('week', (now() at time zone 'America/New_York')::date), interval '7 days') w(semana)
         left join metricas_dinero_dia x on x.dia >= w.semana::date and x.dia < w.semana::date + 7 and ${scope("x.city_id")}
        group by w.semana order by w.semana`, [s.cities]),
    dbAnalisis().query<{ iniciadas: number; con_tarjeta: number; terminadas: number; primeros: number; cobrado: number; a_free: number }>(
      `select coalesce(sum(x.pruebas_iniciadas), 0)::int as iniciadas, coalesce(sum(x.pruebas_con_tarjeta), 0)::int as con_tarjeta, coalesce(sum(x.pruebas_terminadas), 0)::int as terminadas,
              coalesce(sum(x.primeros_cobros), 0)::int as primeros, coalesce(sum(x.cobrado_cents), 0)::float8 as cobrado, coalesce(sum(x.a_free), 0)::int as a_free
         from metricas_pro_dia x where x.dia >= ${DESDE_DIA} and ${scope("x.city_id")}`, [s.cities, dias]),
    // La foto más nueva de cada ciudad (MRR, Pro pagando, en prueba).
    dbAnalisis().query<{ mrr: number; pagando: number; prueba: number; dia: string | null }>(
      `select coalesce(sum(f.mrr_cents), 0)::float8 as mrr, coalesce(sum(f.pro_pagando), 0)::int as pagando, coalesce(sum(f.en_prueba), 0)::int as prueba, max(f.dia)::text as dia
         from (select distinct on (x.city_id) x.city_id, x.dia, x.mrr_cents, x.pro_pagando, x.en_prueba from metricas_pro_dia x
                where x.mrr_cents is not null and ${scope("x.city_id")} order by x.city_id, x.dia desc) f`, [s.cities]),
    dbAnalisis().query<{ estado: string; monto: number; devuelto: number; n: number }>(
      `select p.status as estado, coalesce(sum(p.amount_cents - p.refunded_cents), 0)::float8 as monto, coalesce(sum(p.refunded_cents), 0)::float8 as devuelto, count(*)::int as n
         from payments p where p.created_at > now() - make_interval(days => $2) and ${scope("p.city_id")} group by p.status`, [s.cities, dias]),
  ]);
  return { tipos: tipos.rows, antes: antes.rows[0]!, semanas: semanas.rows, pro: pro.rows[0]!, foto: foto.rows[0]!, estados: estados.rows };
}

/* Retención por cohorte semanal (metricas_retencion): las últimas 12 semanas; de los que ya tienen la edad, cuántos volvieron el día 1, 7 y 30. */
export async function retencionCohortes(s: Alcance) {
  return (await dbAnalisis().query<{ cohorte: string; nuevos: number; base_d1: number; d1: number; base_d7: number; d7: number; base_d30: number; d30: number }>(
    `select to_char(x.cohorte, 'YYYY-MM-DD') as cohorte, sum(x.nuevos)::int as nuevos, sum(x.base_d1)::int as base_d1, sum(x.d1)::int as d1, sum(x.base_d7)::int as base_d7, sum(x.d7)::int as d7,
            sum(x.base_d30)::int as base_d30, sum(x.d30)::int as d30
       from metricas_retencion x where x.cohorte >= date_trunc('week', (now() at time zone 'America/New_York')::date)::date - 77 and ${scope("x.city_id")}
      group by x.cohorte order by x.cohorte desc`, [s.cities])).rows;
}

/* Embudos completos (ADM-ANALIT «Embudos»): el vecino (de registrarse a volver), el negocio paso a paso en «Publica tu negocio» (los borradores que
   empezaron en el período y hasta dónde llegaron), y de buscar a que el negocio acepte. Personas distintas, nunca quiénes. */
const PASOS_NEGOCIO = ["B1", "C1", "D1", "E1", "F1"] as const;
export async function embudos(s: Alcance, dias: number) {
  const [vec, neg, op] = await Promise.all([
    dbAnalisis().query<{ registrados: number; usaron: number; contactaron: number; volvieron: number }>(
      `with u as (select u.id, (u.created_at at time zone 'America/New_York')::date as d0 from users u
                   where u.created_at > now() - make_interval(days => $2) and not u.is_test and ${scope("u.home_city_id")}),
            e as (select distinct a.user_id from app_events a where a.at > now() - make_interval(days => $2) and a.user_id is not null and a.name in ('buscar', 'ver_categoria', 'ver_ficha')),
            c as (select t.user_id from contact_taps t where t.at > now() - make_interval(days => $2) and t.user_id is not null
                  union select o.user_id from operations o where o.sent_at > now() - make_interval(days => $2) and o.kind <> 'plan')
       select count(*)::int as registrados, count(*) filter (where u.id in (select user_id from e))::int as usaron, count(*) filter (where u.id in (select user_id from c))::int as contactaron,
              count(*) filter (where exists (select 1 from user_days d where d.user_id = u.id and d.day > u.d0))::int as volvieron
         from u`, [s.cities, dias]),
    dbAnalisis().query<{ paso: string; n: number; publicaron: number }>(
      `select d.step as paso, count(*)::int as n, count(*) filter (where d.completed_at is not null)::int as publicaron
         from onboarding_drafts d join users u on u.id = d.user_id
        where d.started_at > now() - make_interval(days => $2) and ${scope("u.home_city_id")} group by d.step`, [s.cities, dias]),
    dbAnalisis().query<{ buscaron: number; ficha: number; contactaron: number; enviaron: number; aceptadas: number }>(
      `with e as (select coalesce(user_id, device) as quien, name from app_events
                   where at > now() - make_interval(days => $2) and name in ('buscar', 'ver_categoria', 'ver_ficha', 'contactar') and ${scope("city_id")} and coalesce(user_id, device) is not null),
            o as (select o.user_id, (o.confirmed_at is not null or o.status in ('confirmed', 'done')) as acepto from operations o
                   where o.sent_at > now() - make_interval(days => $2) and o.kind <> 'plan' and ${scope("o.city_id")})
       select (select count(distinct quien) filter (where name in ('buscar', 'ver_categoria')) from e)::int as buscaron, (select count(distinct quien) filter (where name = 'ver_ficha') from e)::int as ficha,
              (select count(distinct quien) filter (where name = 'contactar') from e)::int as contactaron, (select count(distinct user_id) from o)::int as enviaron,
              (select count(distinct user_id) filter (where acepto) from o)::int as aceptadas`, [s.cities, dias]),
  ]);
  // (Los cobros de un plan ya contratado, kind 'plan', no son un pedido nuevo: no cuentan como «enviaron».)
  // Un borrador queda en su último paso: llegó a ese y a todos los de antes (H1 = publicado, llegó a todos).
  const orden = (p: string) => (p === "H1" ? 99 : (PASOS_NEGOCIO as readonly string[]).indexOf(p));
  const pasos = PASOS_NEGOCIO.map((k, i) => ({ paso: k, n: neg.rows.reduce((a, x) => a + (orden(x.paso) >= i ? x.n : x.publicaron), 0) }));
  const publicaron = neg.rows.reduce((a, x) => a + x.publicaron, 0);
  return { vecino: vec.rows[0]!, negocio: { pasos, publicaron }, operacion: op.rows[0]! };
}

/* Búsquedas sin resultado (search_logs, L203): lo que buscaron 2 o más personas distintas y no encontró nada. La búsqueda de una sola persona no
   sale (puede ser un nombre). Todas las búsquedas sin cuenta cuentan como UNA persona (no se sabe si fue la misma). Sin quién. */
export async function busquedasSinResultado(s: Alcance, dias: number) {
  return (await dbAnalisis().query<{ q: string; n: number; personas: number }>(
    `select min(x.query) as q, count(*)::int as n, (count(distinct x.user_id) + (count(*) filter (where x.user_id is null) > 0)::int)::int as personas
       from search_logs x where x.results = 0 and x.at > now() - make_interval(days => $2) and ${scope("x.city_id")}
      group by lower(trim(x.query)) having count(distinct x.user_id) + (count(*) filter (where x.user_id is null) > 0)::int >= 2 order by 3 desc, 2 desc limit 20`, [s.cities, dias])).rows;
}

/* Contactos desde semillas (L175) y vistas sin repetidos (L127): los toques de «Llamar» en un negocio que aún no reclamó su página y las vistas de las
   fichas (todas, y una por persona o teléfono y día). */
export async function contactosYVistas(s: Alcance, dias: number) {
  const [sem, top, vis] = await Promise.all([
    dbAnalisis().query<{ toques: number; semillas: number; reclamadas: number }>(
      `select (select count(*) from contact_taps t join seed_listings x on x.id = t.seed_id where t.at > now() - make_interval(days => $2) and ${scope("x.city_id")})::int as toques,
              (select count(distinct t.seed_id) from contact_taps t join seed_listings x on x.id = t.seed_id where t.at > now() - make_interval(days => $2) and ${scope("x.city_id")})::int as semillas,
              (select count(*) from seed_listings x where x.status = 'claimed' and x.claimed_at > now() - make_interval(days => $2) and ${scope("x.city_id")})::int as reclamadas`, [s.cities, dias]),
    dbAnalisis().query<{ nombre: string; toques: number; reclamada: boolean }>(
      `select x.name as nombre, count(*)::int as toques, (x.status = 'claimed') as reclamada from contact_taps t join seed_listings x on x.id = t.seed_id
        where t.at > now() - make_interval(days => $2) and ${scope("x.city_id")} group by x.id, x.name, x.status order by 2 desc, 1 limit 8`, [s.cities, dias]),
    dbAnalisis().query<{ vistas: number; unicos: number }>(
      `select coalesce(sum(v.n), 0)::int as vistas, coalesce(sum(v.unicos), 0)::int as unicos from business_views_daily v join businesses b on b.id = v.business_id
        where v.day >= ${DESDE_DIA} and ${scope("b.city_id")}`, [s.cities, dias]),
  ]);
  return { semillas: sem.rows[0]!, top: top.rows, vistas: vis.rows[0]! };
}

/* Hogar y Auto (fase 4g, LAUNCH L452): aprobado contra cobrado del estimado, llegó en la franja (Hogar: «Llegué» antes del final de la franja de 2 h),
   tiempo de respuesta a las emergencias y cuántos pre-estimados y presupuestos terminan en cita. Solo cifras. */
export async function hogarAuto(s: Alcance, dias: number) {
  const [sol, vis, est] = await Promise.all([
    dbAnalisis().query<{ pre: number; pre_cita: number; em: number; em_ok: number; em_min: number | null; pq: number; pq_cita: number }>(
      `select count(*) filter (where r.mode = 'pre')::int as pre, count(*) filter (where r.mode = 'pre' and r.operation_id is not null)::int as pre_cita,
              count(*) filter (where r.mode = 'em')::int as em, count(*) filter (where r.mode = 'em' and r.accepted_at is not null)::int as em_ok,
              round(avg(extract(epoch from r.accepted_at - r.created_at) / 60) filter (where r.mode = 'em' and r.accepted_at is not null))::int as em_min,
              count(*) filter (where r.mode = 'pq')::int as pq, count(*) filter (where r.mode = 'pq' and r.operation_id is not null)::int as pq_cita
         from service_requests r where r.created_at > now() - make_interval(days => $2) and ${scope("r.city_id")}`, [s.cities, dias]),
    dbAnalisis().query<{ rubro: string; visitas: number; llegaron: number; en_franja: number; no_llego: number }>(
      `select case b.category_id when 'NEG-HOGAR' then 'hogar' else 'auto' end as rubro, count(*)::int as visitas,
              count(*) filter (where a.at is not null)::int as llegaron, count(*) filter (where a.at <= o.scheduled_at + interval '120 minutes')::int as en_franja,
              count(*) filter (where o.status_detail = 'noshow')::int as no_llego
         from operations o join businesses b on b.id = o.business_id
         left join lateral (select min(e.at) as at from operation_events e where e.operation_id = o.id and e.kind = 'arrived') a on true
        where o.kind = 'appointment' and b.category_id in ('NEG-HOGAR', 'NEG-AUTO') and o.scheduled_at > now() - make_interval(days => $2) and o.scheduled_at < now()
          and o.status in ('done', 'confirmed') and ${scope("o.city_id")} group by 1`, [s.cities, dias]),
    dbAnalisis().query<{ con: number; aprobado: number; cobrado: number; extra: number }>(
      `select count(distinct l.operation_id)::int as con, coalesce(sum(l.line_total_cents) filter (where l.decision = 'ok'), 0)::float8 as aprobado,
              coalesce(sum(coalesce(l.final_cents, l.line_total_cents)) filter (where l.decision = 'ok'), 0)::float8 as cobrado,
              count(*) filter (where l.is_extra and l.decision = 'ok')::int as extra
         from estimate_lines l join operations o on o.id = l.operation_id
        where o.status = 'done' and o.done_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
  ]);
  const V = (r: string) => vis.rows.find((x) => x.rubro === r) ?? { rubro: r, visitas: 0, llegaron: 0, en_franja: 0, no_llego: 0 };
  return { sol: sol.rows[0]!, hogar: V("hogar"), auto: V("auto"), est: est.rows[0]! };
}

/* Ciudad viva (pantallas-iniciales.md §2, ADM-HOME): por ciudad abierta o por abrir, el % de negocios semilla reclamados, publicaciones de vecinos
   (7 días), recomendaciones de vecinos (30 días) y vecinos activos (7 días). */
export async function ciudadViva(s: Alcance) {
  return (await dbAnalisis().query<{ id: string; ciudad: string; status: string; semillas: number; reclamadas: number; posts7: number; recs30: number; activos7: number }>(
    `select ci.id, ci.name as ciudad, ci.status,
            (select count(*) from seed_listings x where x.city_id = ci.id and x.status in ('shown', 'claimed'))::int as semillas,
            (select count(*) from seed_listings x where x.city_id = ci.id and x.status = 'claimed')::int as reclamadas,
            (select count(*) from com_posts p where p.city_id = ci.id and p.status <> 'deleted' and p.author_kind = 'user' and p.created_at > now() - interval '7 days')::int as posts7,
            (select count(*) from recommendations r where r.city_id = ci.id and r.status <> 'draft' and r.created_at > now() - interval '30 days')::int as recs30,
            (select count(distinct d.user_id) from user_days d where d.city_id = ci.id and d.day > (now() at time zone 'America/New_York')::date - 7)::int as activos7
       from cities ci where ci.status <> 'off' and ${scope("ci.id")} order by ci.status = 'on' desc, ci.name`, [s.cities])).rows;
}
