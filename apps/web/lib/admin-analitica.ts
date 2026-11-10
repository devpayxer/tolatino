import "server-only";
import { cfgSql } from "./config";
import type { Staff } from "./admin";
import { COLAS, slaCase, type Cola } from "./colas";
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
  const sla = slaCase(cfgSql), slas = await (await import("./admin-colas")).slasColas();
  const [sanc, abiertas, cumplido] = await Promise.all([
    db().query<{ n: number }>(
      `select count(distinct x.target_id)::int as n from sanctions x left join users u on u.id::text = x.target_id
        where x.target_kind = 'user' and x.lifted_at is null and (x.ends_at is null or x.ends_at > now()) and ${scope("u.home_city_id")}`, [s.cities]),
    db().query<{ queue: Cola; n: number }>(`select q.queue, count(*)::int as n from queue_items q where q.status = 'open' and ${scope("q.city_id")} group by 1 order by 2 desc`, [s.cities]),
    db().query<{ total: number; a_tiempo: number }>(
      `select count(*)::int as total, count(*) filter (where extract(epoch from q.decided_at - q.opened_at) <= ${sla} * 3600)::int as a_tiempo
         from queue_items q where q.status = 'decided' and q.decided_at > now() - make_interval(days => $2) and ${scope("q.city_id")}`, [s.cities, dias]),
  ]);
  return { sancionados: sanc.rows[0]?.n ?? 0, abiertas: abiertas.rows.map((x) => ({ ...x, es: COLAS[x.queue]?.es ?? x.queue, sla: slas[x.queue] ?? 24 })), cumplido: cumplido.rows[0]! };
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

/* Analítica › Educación · Niños · Deporte (4eg · fase4-edu-ninos-deporte.md §4eg): solo cifras, nunca datos de un niño ni de un inscrito. */
export async function inscripcionesAnalitica(s: Staff, dias: number) {
  const [me, gr, mat, esp, baja, rev, ay, lic] = await Promise.all([
    db().query<{ n: number; conf24: number; vencidas: number; edu: number; ninos: number; dep: number }>(
      `select count(*)::int as n, count(*) filter (where o.confirmed_at is not null and o.confirmed_at - o.sent_at <= interval '24 hours')::int as conf24,
              count(*) filter (where o.status = 'expired')::int as vencidas, count(*) filter (where o.details->>'rubro' = 'edu')::int as edu,
              count(*) filter (where o.details->>'rubro' = 'ninos')::int as ninos, count(*) filter (where o.details->>'rubro' = 'dep')::int as dep
         from operations o where o.kind = 'enrollment' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    db().query<{ cancelados: number; vivos: number; ocupados: number; cupos: number }>(
      `select count(*) filter (where g.status = 'cancelled' and g.updated_at > now() - make_interval(days => $2))::int as cancelados,
              count(*) filter (where g.status in ('open', 'started'))::int as vivos,
              coalesce(sum(g.seats_booked + g.seats_outside) filter (where g.status in ('open', 'started')), 0)::int as ocupados,
              coalesce(sum(g.seats_total) filter (where g.status in ('open', 'started')), 0)::int as cupos
         from class_groups g where g.purpose = 'insc' and ${scope("g.city_id")}`, [s.cities, dias]),
    db().query<{ ret: number; cob: number; dev: number; quedo: number }>(
      `select coalesce(sum(p.amount_cents) filter (where p.status = 'held'), 0)::int as ret,
              coalesce(sum(p.amount_cents - p.refunded_cents) filter (where p.status in ('captured', 'partially_refunded')), 0)::int as cob,
              coalesce(sum(p.refunded_cents), 0)::int as dev,
              coalesce(sum(p.amount_cents - p.refunded_cents) filter (where p.status in ('captured', 'partially_refunded') and coalesce((o.details->>'perdio')::boolean, false)), 0)::int as quedo
         from payments p join operations o on o.id = p.operation_id where o.kind = 'enrollment' and p.kind = 'deposit' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    db().query<{ esperando: number; dias: number | null; ofrecidas: number; tomadas: number }>(
      `select count(*) filter (where w.status = 'waiting')::int as esperando,
              round(avg(extract(epoch from coalesce(w.updated_at, now()) - w.created_at) / 86400) filter (where w.status in ('accepted', 'waiting')), 1)::float as dias,
              count(*) filter (where w.status in ('offered', 'accepted', 'expired') and w.offered_until is not null)::int as ofrecidas, count(*) filter (where w.status = 'accepted')::int as tomadas
         from waitlist_entries w where w.created_at > now() - make_interval(days => $2) and ${scope("w.city_id")}`, [s.cities, dias]),
    db().query<{ pedidas: number; en72: number }>(
      `select count(*)::int as pedidas,
              count(*) filter (where exists (select 1 from operation_events e2 where e2.operation_id = e.operation_id and e2.kind = 'insc_cancel_ok' and e2.at <= e.at + interval '72 hours'))::int as en72
         from operation_events e join operations o on o.id = e.operation_id where e.kind = 'insc_cancel_req' and e.at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    db().query<{ tn: number; tok: number; cn: number; cok: number }>(
      `select count(*) filter (where r.answers ? 'totalOk')::int as tn, count(*) filter (where (r.answers->>'totalOk')::int = 1)::int as tok,
              count(*) filter (where r.answers ? 'certOk')::int as cn, count(*) filter (where (r.answers->>'certOk')::int = 1)::int as cok
         from reviews r join operations o on o.id = r.operation_id where o.kind = 'enrollment' and r.status <> 'removed' and r.created_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    db().query<{ rub: string; reason: string; n: number }>(
      `select o.details->>'rubro' as rub, h.reason, count(*)::int as n from help_requests h join operations o on o.id = h.operation_id
        where o.kind = 'enrollment' and h.created_at > now() - make_interval(days => $2) and ${scope("h.city_id")} group by 1, 2 order by 3 desc`, [s.cities, dias]),
    db().query<{ vigentes: number; vencidas: number; cuidado: number }>(
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
export async function feInmAutos(s: Staff, dias: number) {
  const [vis, dias2, vivos, rev, ay, est, lic, fe, vj] = await Promise.all([
    // Visitas y pruebas de manejo pedidas en el período. A tiempo = confirmada: el servidor solo deja confirmar antes del plazo (4 h hábiles,
    // nunca después de la hora − 1 h; al confirmar, respond_by se limpia) y el barrido vence las demás, así que confirmed_at ya es «a tiempo».
    db().query<{ rub: string; n: number; items: number; atiempo: number; vencidas: number; noshow: number; pasaron: number }>(
      `select o.details->>'rubro' as rub, count(*)::int as n, count(distinct o.details->>'item_id')::int as items,
              count(*) filter (where o.confirmed_at is not null)::int as atiempo,
              count(*) filter (where o.status = 'expired')::int as vencidas,
              count(*) filter (where o.status = 'done' and o.status_detail = 'noshow')::int as noshow,
              count(*) filter (where o.status = 'done' and o.status_detail is distinct from 'noshow')::int as pasaron
         from operations o where o.kind = 'visit' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")} group by 1`, [s.cities, dias]),
    // Días desde que se publicó hasta que se rentó o se vendió (las que cambiaron de estado en el período).
    db().query<{ que: string; n: number; dias: number | null }>(
      `select pl.status as que, count(*)::int as n, round(avg(extract(epoch from pl.status_at - pl.created_at) / 86400)::numeric, 1)::float as dias
         from property_listings pl where pl.status in ('rented', 'sold') and pl.status_at > now() - make_interval(days => $2) and ${scope("pl.city_id")} group by 1
       union all
       select 'carro', count(*)::int, round(avg(extract(epoch from v.status_at - v.created_at) / 86400)::numeric, 1)::float
         from vehicle_listings v where v.status = 'sold' and v.status_at > now() - make_interval(days => $2) and ${scope("v.city_id")}`, [s.cities, dias]),
    // Propiedades y carros a la vista hoy, por ciudad.
    db().query<{ ciudad: string; props: number; carros: number }>(
      `select ci.name as ciudad, coalesce(p.n, 0)::int as props, coalesce(v.n, 0)::int as carros
         from cities ci
         left join (select pl.city_id, count(*) as n from property_listings pl join items i on i.id = pl.item_id join businesses b on b.id = pl.business_id
                     where pl.status in ('available', 'pending') and i.status = 'live' and i.removed_at is null and b.status = 'active' group by 1) p on p.city_id = ci.id
         left join (select v.city_id, count(*) as n from vehicle_listings v join items i on i.id = v.item_id join businesses b on b.id = v.business_id
                     where v.status in ('lot', 'pending') and i.status = 'live' and i.removed_at is null and b.status = 'active' group by 1) v on v.city_id = ci.id
        where ${scope("ci.id")} and (ci.status = 'on' or p.n > 0 or v.n > 0) order by ci.name`, [s.cities]),
    // «El total fue el que vi»: Para mudarte (Bienes Raíces) y En la puerta (Autos), de las reseñas de visitas del período.
    db().query<{ mn: number; mok: number; pn: number; pok: number }>(
      `select count(*) filter (where r.answers ? 'mudarOk')::int as mn, count(*) filter (where (r.answers->>'mudarOk')::int = 1)::int as mok,
              count(*) filter (where r.answers ? 'puertaOk')::int as pn, count(*) filter (where (r.answers->>'puertaOk')::int = 1)::int as pok
         from reviews r join operations o on o.id = r.operation_id where o.kind = 'visit' and r.status <> 'removed' and r.created_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    // Ayudas de visitas (y de fechas de Iglesias) por motivo.
    db().query<{ rub: string; reason: string; n: number }>(
      `select case when o.kind = 'visit' then o.details->>'rubro' else 'fe' end as rub, h.reason, count(*)::int as n
         from help_requests h join operations o on o.id = h.operation_id join businesses b on b.id = h.business_id
        where (o.kind = 'visit' or (o.kind = 'enrollment' and b.category_id = 'NEG-FE')) and h.created_at > now() - make_interval(days => $2) and ${scope("h.city_id")} group by 1, 2 order by 3 desc`, [s.cities, dias]),
    // Anuncios (o «Pedir fecha») pausados por una posible estafa: en el período y en pausa hoy.
    db().query<{ periodo: number; hoy: number; sancion: number }>(
      `select count(*) filter (where h.paused_at > now() - make_interval(days => $2))::int as periodo,
              count(*) filter (where h.paused_at is not null and h.unpaused_at is null)::int as hoy,
              (select count(*)::int from queue_items q where q.queue = 'estafa' and q.decision = 'sancion' and q.decided_at > now() - make_interval(days => $2) and ${scope("q.city_id")}) as sancion
         from help_requests h where h.paused_at is not null and ${scope("h.city_id")}`, [s.cities, dias]),
    // Licencias de las tres: vigentes, por vencer (14 días), vencidas y en revisión, por categoría.
    db().query<{ cat: string; vigentes: number; porvencer: number; vencidas: number; revision: number }>(
      `select k.category_id as cat,
              count(*) filter (where l.status = 'valid' and (l.next_review is null or l.next_review >= current_date))::int as vigentes,
              count(*) filter (where l.status = 'valid' and l.next_review between current_date and current_date + ${cfgSql("lic_aviso_dias")})::int as porvencer,
              count(*) filter (where l.status = 'expired' or (l.status = 'valid' and l.next_review < current_date))::int as vencidas,
              count(*) filter (where l.status = 'review')::int as revision
         from licenses l join license_kinds k on k.key = l.kind join businesses b on b.id = l.business_id
        where k.category_id = any($2::text[]) and b.status = 'active' and ${scope("b.city_id")} group by 1`, [s.cities, CATS_4I]),
    // Iglesias: fechas, catecismo y consejería pedidos por la app y cuántos se respondieron en 48 h. Sin denominación ni quién.
    db().query<{ n: number; en48: number; vencidas: number }>(
      `select count(*)::int as n, count(*) filter (where o.confirmed_at is not null and o.confirmed_at - o.sent_at <= interval '48 hours')::int as en48,
              count(*) filter (where o.status = 'expired')::int as vencidas
         from operations o join businesses b on b.id = o.business_id where o.kind = 'enrollment' and b.category_id = 'NEG-FE' and o.sent_at > now() - make_interval(days => $2) and ${scope("o.city_id")}`, [s.cities, dias]),
    // Vivienda justa: textos frenados en el período y declaraciones de mayores por revisar.
    db().query<{ frenadas: number; mayores: number }>(
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
export async function comunidadAnalitica(s: Staff, dias: number) {
  const DESDE = `(now() at time zone 'America/New_York')::date - ($2::int - 1)`;
  const [tot, ciu, rk, neg] = await Promise.all([
    db().query<{ publicaciones: number; comentarios: number; preguntas: number; resueltas: number; con_respuesta: number; min_primera: number; reportes: number;
      levantadas: number; decididas: number; emitidas: number; canjeadas: number; devueltas: number; canjes: number; usados: number }>(
      `select coalesce(sum(a.publicaciones), 0)::int as publicaciones, coalesce(sum(a.comentarios), 0)::int as comentarios, coalesce(sum(a.preguntas), 0)::int as preguntas,
              coalesce(sum(a.resueltas), 0)::int as resueltas, coalesce(sum(a.con_respuesta), 0)::int as con_respuesta, coalesce(sum(a.min_primera), 0)::float8 as min_primera,
              coalesce(sum(a.reportes), 0)::int as reportes, coalesce(sum(a.apelaciones_levantadas), 0)::int as levantadas, coalesce(sum(a.apelaciones_decididas), 0)::int as decididas,
              coalesce(sum(a.monedas_emitidas), 0)::int as emitidas, coalesce(sum(a.monedas_canjeadas), 0)::int as canjeadas, coalesce(sum(a.monedas_devueltas), 0)::int as devueltas,
              coalesce(sum(a.canjes), 0)::int as canjes, coalesce(sum(a.canjes_usados), 0)::int as usados
         from com_analitica_dia a where a.dia >= ${DESDE} and ${scope("a.city_id")}`, [s.cities, dias]),
    db().query<{ ciudad: string; publicaciones: number; comentarios: number; preguntas: number; resueltas: number; reportes: number }>(
      `select ci.name as ciudad, coalesce(sum(a.publicaciones), 0)::int as publicaciones, coalesce(sum(a.comentarios), 0)::int as comentarios,
              coalesce(sum(a.preguntas), 0)::int as preguntas, coalesce(sum(a.resueltas), 0)::int as resueltas, coalesce(sum(a.reportes), 0)::int as reportes
         from cities ci left join com_analitica_dia a on a.city_id = ci.id and a.dia >= ${DESDE}
        where ${scope("ci.id")} group by ci.id, ci.name having ci.id = any(array(select id from cities where status = 'on')) or coalesce(sum(a.publicaciones), 0) > 0 order by ci.name`, [s.cities, dias]),
    db().query<{ rango: number; activos: number; nombre: string | null }>(
      `select a.rango::int as rango, a.activos, r.name->>'es' as nombre from com_activos_por_rango($1::text[], (${DESDE})::timestamp at time zone 'America/New_York') a
         left join ranks r on r.level = a.rango order by a.rango`, [s.cities, dias]),
    db().query<{ negocio: string; ciudad: string; canjes: number; usados: number; monedas: number }>(
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
export async function eventosAnalitica(s: Staff, dias: number) {
  const DESDE = `(now() at time zone 'America/New_York')::date - ($2::int - 1)`;
  const SUM = `coalesce(sum(a.vistas), 0)::int as vistas, coalesce(sum(a.guardados), 0)::int as guardados, coalesce(sum(a.rsvp), 0)::int as rsvp, coalesce(sum(a.rsvp_personas), 0)::int as rsvp_personas,
               coalesce(sum(a.ordenes), 0)::int as ordenes, coalesce(sum(a.boletos), 0)::int as boletos, coalesce(sum(a.cortesias), 0)::int as cortesias, coalesce(sum(a.bruto), 0)::float8 as bruto,
               coalesce(sum(a.comision), 0)::float8 as comision, coalesce(sum(a.devuelto), 0)::float8 as devuelto, coalesce(sum(a.espera), 0)::int as espera,
               coalesce(sum(a.espera_convertidos), 0)::int as espera_convertidos, coalesce(sum(a.incidencias), 0)::int as incidencias`;
  type T = { vistas: number; guardados: number; rsvp: number; rsvp_personas: number; ordenes: number; boletos: number; cortesias: number; bruto: number; comision: number; devuelto: number; espera: number; espera_convertidos: number; incidencias: number };
  const [tot, fmt, ciu, asi, neg, evp] = await Promise.all([
    db().query<T>(`select ${SUM} from evt_analitica_dia a where a.dia >= ${DESDE} and ${scope("a.city_id")}`, [s.cities, dias]),
    db().query<T & { formato: string; label: string }>(
      `select f.key as formato, f.label->>'es' as label, ${SUM} from event_formats f left join evt_analitica_dia a on a.format = f.key and a.dia >= ${DESDE} and ${scope("a.city_id")}
        group by f.key, f.label, f.sort order by f.sort`, [s.cities, dias]),
    db().query<T & { ciudad: string }>(
      `select ci.name as ciudad, ${SUM} from cities ci left join evt_analitica_dia a on a.city_id = ci.id and a.dia >= ${DESDE}
        where ${scope("ci.id")} group by ci.id, ci.name having ci.id = any(array(select id from cities where status = 'on')) or coalesce(sum(a.vistas), 0) + coalesce(sum(a.ordenes), 0) > 0 order by ci.name`, [s.cities, dias]),
    db().query<{ fechas: number; esperados: number; entraron: number; rsvp_van: number; rsvp_llegaron: number; incidencias: number }>(
      `select coalesce(sum(x.fechas), 0)::int as fechas, coalesce(sum(x.esperados), 0)::int as esperados, coalesce(sum(x.entraron), 0)::int as entraron,
              coalesce(sum(x.rsvp_van), 0)::int as rsvp_van, coalesce(sum(x.rsvp_llegaron), 0)::int as rsvp_llegaron, coalesce(sum(x.incidencias), 0)::int as incidencias
         from evt_asistencia_dia x where x.dia >= ${DESDE} and ${scope("x.city_id")}`, [s.cities, dias]),
    db().query<{ negocio: string; ciudad: string; ordenes: number; bruto: number; comision: number; devuelto: number }>(
      `select v.negocio, ci.name as ciudad, sum(v.ordenes)::int as ordenes, sum(v.bruto)::float8 as bruto, sum(v.comision)::float8 as comision, sum(v.devuelto)::float8 as devuelto
         from evt_ventas_negocio_dia v join cities ci on ci.id = v.city_id where v.dia >= ${DESDE} and ${scope("v.city_id")}
        group by v.business_id, v.negocio, ci.name order by 4 desc, 1 limit 15`, [s.cities, dias]),
    db().query<{ pedidas: number; con_propuesta: number; sin_respuesta: number; aceptadas: number; deposito: number; a_tiempo: number; tarde: number; negocio: number }>(
      `select coalesce(sum(x.pedidas), 0)::int as pedidas, coalesce(sum(x.con_propuesta), 0)::int as con_propuesta, coalesce(sum(x.sin_respuesta), 0)::int as sin_respuesta,
              coalesce(sum(x.aceptadas), 0)::int as aceptadas, coalesce(sum(x.deposito), 0)::float8 as deposito, coalesce(sum(x.canceladas_a_tiempo), 0)::int as a_tiempo,
              coalesce(sum(x.canceladas_tarde), 0)::int as tarde, coalesce(sum(x.canceladas_negocio), 0)::int as negocio
         from evp_analitica_dia x where x.dia >= ${DESDE} and ${scope("x.city_id")}`, [s.cities, dias]),
  ]);
  return { t: tot.rows[0]!, formatos: fmt.rows, ciudades: ciu.rows, asistencia: asi.rows[0]!, negocios: neg.rows, evp: evp.rows[0]! };
}
