import "server-only";
import { vencerCitas } from "./citas-flujo";
import { db } from "./db";
import { vencer } from "./pedidos";
import { vencerMesas } from "./reservas";

/* Mi cuenta (diseño «To'Latino Mi cuenta»: homeV, ordersV, citasV): lo de la persona, del servidor. Fechas al navegador en
   ISO con Z y la zona de la ciudad para mostrarlas. Listas con cursor (sent_at, id). Solo lo de quien pregunta. */
type Bi = { es: string; en: string };
const ISO = (x: string) => `to_char((${x}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const FOTO = `(select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1)`;

/* ── Pedidos ── */
export type FiltroPed = "todo" | "curso" | "hechos" | "cx";
export type EstPed = "curso" | "camino" | "hecho" | "cx" | "no" | "exp";
export type MiPedido = { num: string; biz: string; bname: string; foto: string | null; mode: "pickup" | "delivery"; st: EstPed; total: number; at: string; tz: string; mes: string; items: string[]; nItems: number; rev: boolean };
const EST_PED = `case when o.status in ('pending', 'confirmed') and coalesce(o.stage, '') not in ('delivered', 'picked_up') then (case when o.stage = 'on_the_way' then 'camino' else 'curso' end)
  when o.status = 'done' or o.stage in ('delivered', 'picked_up') then 'hecho' when o.status = 'declined' then 'no' when o.status = 'expired' then 'exp' else 'cx' end`;
const F_PED: Record<FiltroPed, string> = {
  todo: "true", curso: `(${EST_PED}) in ('curso', 'camino')`, hechos: `(${EST_PED}) = 'hecho'`, cx: `(${EST_PED}) in ('cx', 'no', 'exp')`,
};
export async function misPedidos(userId: string, f: FiltroPed, antes: string | null, lang: "es" | "en") {
  await vencer({ userId });
  const cur = antes && /^\d{1,18}$/.test(antes) ? antes : null;
  const [L, n] = await Promise.all([
    db().query<MiPedido>(
      `select o.number as num, o.business_id as biz, b.name as bname, ${FOTO} as foto, coalesce(o.mode, 'pickup') as mode, ${EST_PED} as st, o.total_cents as total,
              ${ISO("o.sent_at")} as at, c.timezone as tz, to_char(o.sent_at at time zone c.timezone, 'YYYY-MM') as mes,
              coalesce((select array_agg(case when l.qty > 1 then l.qty || ' × ' else '' end || coalesce(l.name->>$4, l.name->>'es') order by l.id) from operation_lines l where l.operation_id = o.id), '{}') as items,
              (select coalesce(sum(l.qty), 0)::int from operation_lines l where l.operation_id = o.id) as "nItems",
              exists (select 1 from reviews r where r.business_id = o.business_id and r.user_id = o.user_id and r.status <> 'removed') as rev, o.id::text as k
         from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id
        where o.user_id = $1 and o.kind = 'order' and ${F_PED[f]} and ($2::bigint is null or o.id < $2::bigint)
        order by o.id desc limit $3`, [userId, cur, 31, lang]),
    db().query<{ todo: number; curso: number; hechos: number; cx: number }>(
      `select count(*)::int as todo, count(*) filter (where ${F_PED.curso})::int as curso, count(*) filter (where ${F_PED.hechos})::int as hechos, count(*) filter (where ${F_PED.cx})::int as cx
         from operations o where o.user_id = $1 and o.kind = 'order'`, [userId]),
  ]);
  const rows = L.rows as (MiPedido & { k: string })[], mas = rows.length > 30;
  return { filas: rows.slice(0, 30).map(({ k: _k, ...x }) => x), sig: mas ? rows[29]!.k : null, n: n.rows[0]! };
}
export type MisPedidos = Awaited<ReturnType<typeof misPedidos>>;

/* ── Citas y reservas (hoy: mesas; las citas de belleza, salud y autos llegan con sus fases) ── */
export type EstMesa = "pend" | "alt" | "ok" | "in" | "done" | "nos" | "no" | "exp" | "cx";
export type MiReserva = { num: string; biz: string; bname: string; foto: string | null; st: EstMesa; at: string; tz: string; dia: number; p: number; area: string; rev: boolean; up: boolean;
  cita: boolean; svc: { es: string; en: string } | null; con: string | null }; // cita (Belleza): el servicio y con quién
const EST_MESA = `case when o.status = 'pending' then 'pend' when o.status = 'change_proposed' then 'alt' when o.status = 'confirmed' then (case when o.status_detail in ('seated', 'live') then 'in' else 'ok' end)
  when o.status = 'done' then (case when o.status_detail = 'noshow' then 'nos' else 'done' end) when o.status = 'declined' then 'no' when o.status = 'expired' then 'exp' else 'cx' end`;
const UP_MESA = `(o.status in ('pending', 'change_proposed', 'confirmed') and (o.scheduled_at at time zone c.timezone)::date >= (now() at time zone c.timezone)::date)`;
export async function misReservas(userId: string, f: "up" | "past", antes: string | null) {
  await Promise.all([vencerMesas({ userId }), vencerCitas({ userId })]);
  const cur = antes && /^\d{1,18}$/.test(antes) ? antes : null;
  const [L, n] = await Promise.all([
    db().query<MiReserva & { k: string }>(
      `select o.number as num, o.business_id as biz, b.name as bname, ${FOTO} as foto, ${EST_MESA} as st, ${ISO("o.scheduled_at")} as at, c.timezone as tz,
              ((o.scheduled_at at time zone c.timezone)::date - (now() at time zone c.timezone)::date)::int as dia, o.party_size as p, coalesce(o.details->>'area', 'salon') as area,
              exists (select 1 from reviews r where r.business_id = o.business_id and r.user_id = o.user_id and r.status <> 'removed') as rev, ${UP_MESA} as up, o.id::text as k,
              o.kind = 'appointment' as cita, o.details->'svc' as svc, (select split_part(m.display_name, ' ', 1) from business_members m where m.id = o.member_id) as con
         from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id
        where o.user_id = $1 and o.kind in ('table', 'appointment') and (${f === "up" ? UP_MESA : `not ${UP_MESA}`}) and ($2::bigint is null or o.id < $2::bigint)
        order by ${f === "up" ? "o.scheduled_at asc, o.id desc" : "o.id desc"} limit 31`, [userId, f === "up" ? null : cur]),
    db().query<{ up: number; past: number }>(
      `select count(*) filter (where ${UP_MESA})::int as up, count(*) filter (where not ${UP_MESA})::int as past
         from operations o join cities c on c.id = o.city_id where o.user_id = $1 and o.kind in ('table', 'appointment')`, [userId]),
  ]);
  const mas = f === "past" && L.rows.length > 30;
  return { filas: L.rows.slice(0, 30).map(({ k: _k, ...x }) => x), sig: mas ? L.rows[29]!.k : null, n: n.rows[0]! };
}
export type MisReservas = Awaited<ReturnType<typeof misReservas>>;

/* ── Resumen (USR-HOME) ── */
export type Agenda = { kind: "ped" | "mesa" | "iv"; at: string; tz: string; dia: number; t: string; biz: string; st: string; href: string; extra: number };
export async function resumen(userId: string) {
  await Promise.all([vencer({ userId }), vencerMesas({ userId })]);
  const q = db();
  const [ag, pend, mes, cnt] = await Promise.all([
    // Tu semana: pedidos en curso, reservaciones de los próximos 7 días y entrevistas.
    q.query<Agenda>(
      `(select 'ped' as kind, ${ISO("o.sent_at")} as at, c.timezone as tz, 0 as dia, b.name as t, o.business_id as biz, ${EST_PED} as st, '/pedido/' || o.number as href, 0 as extra
          from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id
         where o.user_id = $1 and o.kind = 'order' and o.status in ('pending', 'confirmed') and coalesce(o.stage, '') not in ('delivered', 'picked_up') order by o.id desc limit 3)
       union all
       (select 'mesa', ${ISO("o.scheduled_at")}, c.timezone, ((o.scheduled_at at time zone c.timezone)::date - (now() at time zone c.timezone)::date)::int, b.name, o.business_id, ${EST_MESA},
               '/reserva/' || o.number, o.party_size
          from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id
         where o.user_id = $1 and o.kind = 'table' and ${UP_MESA} and o.scheduled_at < now() + interval '8 days' order by o.scheduled_at limit 6)
       union all
       (select 'iv', ${ISO("a.interview_at")}, c.timezone, ((a.interview_at at time zone c.timezone)::date - (now() at time zone c.timezone)::date)::int, b.name, a.business_id,
               case when a.interview_confirmed then 'ok' else 'pend' end, '/solicitud/' || a.number, 0
          from job_applications a join businesses b on b.id = a.business_id join cities c on c.id = a.city_id
         where a.user_id = $1 and a.status = 'interview' and a.interview_at > now() and a.interview_at < now() + interval '8 days' order by a.interview_at limit 3)`, [userId]),
    // Pendiente de ti: respuestas que esperan a la persona y reseñas por escribir (lo terminado en 14 días, sin reseña).
    q.query<{ kind: "alt" | "iv" | "esp" | "rev" | "msg"; t: string; biz: string; href: string; at: string; tz: string; extra: string | null }>(
      `(select 'alt' as kind, b.name as t, o.business_id as biz, '/reserva/' || o.number as href, ${ISO("o.scheduled_at")} as at, c.timezone as tz, null::text as extra
          from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id where o.user_id = $1 and o.kind = 'table' and o.status = 'change_proposed' limit 3)
       union all
       (select 'iv', b.name, a.business_id, '/solicitud/' || a.number, ${ISO("a.interview_at")}, c.timezone, j.title->>'es'
          from job_applications a join businesses b on b.id = a.business_id join cities c on c.id = a.city_id join job_postings j on j.id = a.job_id
         where a.user_id = $1 and a.status = 'interview' and not a.interview_confirmed and a.interview_at > now() limit 3)
       union all
       (select 'msg', b.name, t.business_id, '/cuenta/mensajes/' || t.business_id, ${ISO("t.last_at")}, c.timezone,
              case when t.last_from <> 'system' then t.last_text when (select lang from users where id = $1) = 'en' then split_part(t.last_text, ' · ', 2) else split_part(t.last_text, ' · ', 1) end
          from chat_threads t join businesses b on b.id = t.business_id join cities c on c.id = b.city_id where t.user_id = $1 and t.user_unread > 0 order by t.last_at desc limit 3)
       union all
       (select 'esp', b.name, o.business_id, '/reserva/' || o.number, ${ISO("o.scheduled_at")}, c.timezone, o.party_size::text
          from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id where o.user_id = $1 and o.kind = 'table' and o.status = 'pending' limit 3)
       union all
       (select distinct on (o.business_id) 'rev', b.name, o.business_id, '/n/' || o.business_id || '/resena', ${ISO("coalesce(o.done_at, o.updated_at)")}, c.timezone, o.kind
          from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id
         where o.user_id = $1 and o.kind in ('order', 'table') and o.status = 'done' and coalesce(o.status_detail, '') <> 'noshow' and coalesce(o.done_at, o.updated_at) > now() - interval '14 days'
           and not exists (select 1 from reviews r where r.business_id = o.business_id and r.user_id = $1 and r.status <> 'removed')
         order by o.business_id, o.id desc limit 3)`, [userId]),
    // Tu apoyo al barrio · este mes (mes de la ciudad de la persona).
    q.query<{ gasto: number; negocios: number; pedidos: number; reservas: number; resenas: number }>(
      `with m as (select date_trunc('month', now() at time zone coalesce((select c.timezone from users u join cities c on c.id = u.home_city_id where u.id = $1), 'America/New_York')) as d)
       select coalesce(sum(o.total_cents) filter (where o.kind = 'order' and (o.status = 'done' or o.stage in ('delivered', 'picked_up'))), 0)::int as gasto,
              count(distinct o.business_id) filter (where (o.kind = 'order' and (o.status = 'done' or o.stage in ('delivered', 'picked_up'))) or (o.kind = 'table' and o.status = 'done' and coalesce(o.status_detail, '') <> 'noshow'))::int as negocios,
              count(*) filter (where o.kind = 'order' and o.status not in ('declined', 'expired', 'cancelled'))::int as pedidos,
              count(*) filter (where o.kind = 'table' and o.status not in ('declined', 'expired', 'cancelled'))::int as reservas,
              (select count(*)::int from reviews r where r.user_id = $1 and r.status <> 'removed' and r.created_at >= (select d from m)) as resenas
         from operations o join cities c on c.id = o.city_id where o.user_id = $1 and o.kind in ('order', 'table') and (o.sent_at at time zone c.timezone) >= (select d from m)`, [userId]),
    // Tarjeta de vecino y accesos.
    q.query<{ resenas: number; guardados: number; sigues: number; curso: number; proximas: number; solicitudes: number; foto: string | null; email: string | null }>(
      `select (select count(*)::int from reviews where user_id = $1 and status <> 'removed') as resenas,
              (select count(*)::int from favorites where user_id = $1) + (select count(*)::int from job_saves where user_id = $1) + (select count(*)::int from post_saves where user_id = $1) as guardados,
              (select count(*)::int from follows where follower_user_id = $1) as sigues,
              (select count(*)::int from operations o where o.user_id = $1 and o.kind = 'order' and o.status in ('pending', 'confirmed') and coalesce(o.stage, '') not in ('delivered', 'picked_up')) as curso,
              (select count(*)::int from operations o join cities c on c.id = o.city_id where o.user_id = $1 and o.kind = 'table' and ${UP_MESA}) as proximas,
              (select count(*)::int from job_applications where user_id = $1 and status in ('sent', 'seen', 'contact', 'interview')) as solicitudes,
              (select photo_url from users where id = $1) as foto, (select email::text from users where id = $1) as email`, [userId]),
  ]);
  const agenda = ag.rows.sort((a, b) => (a.kind === "ped" ? -1 : 0) - (b.kind === "ped" ? -1 : 0) || a.at.localeCompare(b.at));
  return { agenda, pend: pend.rows, mes: mes.rows[0]!, cnt: cnt.rows[0]! };
}
export type Resumen = Awaited<ReturnType<typeof resumen>>;
export type { Bi };

/* ── Guardados (USR-FAVORITOS, diseño favV): negocios que guardas o sigues, vacantes y novedades guardadas ── */
export async function misGuardados(userId: string) {
  const [N, V, P] = await Promise.all([
    db().query<{ id: string; name: string; foto: string | null; subs: string | null; rating: number | null; reviews: number; verified: boolean; open: boolean | null; saved: boolean; sigue: boolean }>(
      `with ids as (select target_id as id, created_at from favorites where user_id = $1 and kind = 'business'
                    union select target_id, created_at from follows where follower_user_id = $1 and target_kind = 'business')
       select b.id, b.name, ${FOTO} as foto,
              (select string_agg(sc.name->>'es', ' · ') from (select * from subcategorias_vivas where id = any(b.subcategory_ids) limit 1) sc) as subs,
              s.rating_avg::float as rating, coalesce(s.review_count, 0) as reviews, coalesce(s.verified, false) as verified,
              negocio_abierto(b.id, now() at time zone c.timezone) as open,
              exists (select 1 from favorites f where f.user_id = $1 and f.kind = 'business' and f.target_id = b.id) as saved,
              exists (select 1 from follows f where f.follower_user_id = $1 and f.target_kind = 'business' and f.target_id = b.id) as sigue
         from (select id, max(created_at) as at from ids group by id) x join businesses b on b.id = x.id and b.status = 'active'
         join cities c on c.id = b.city_id left join business_stats_cache s on s.business_id = b.id
        order by x.at desc limit 100`, [userId]),
    db().query<{ id: string; biz: string; bname: string; title: Bi; kind: string; payFrom: number; payTo: number | null; tips: boolean; foto: string | null }>(
      `select j.id::text, j.business_id as biz, b.name as bname, j.title, j.kind, j.pay_from_cents as "payFrom", j.pay_to_cents as "payTo", j.tips, ${FOTO} as foto
         from job_saves s join job_postings j on j.id = s.job_id join businesses b on b.id = j.business_id
        where s.user_id = $1 and vacante_en_vivo(j) order by s.created_at desc limit 100`, [userId]),
    db().query<{ id: string; biz: string; bname: string; title: string; kind: string; foto: string | null }>(
      `select p.id::text, p.business_id as biz, b.name as bname, p.title, p.kind, ${FOTO} as foto
         from post_saves s join business_posts p on p.id = s.post_id join businesses b on b.id = p.business_id
        where s.user_id = $1 and post_en_vivo(p) order by s.created_at desc limit 100`, [userId]),
  ]);
  return { negocios: N.rows, vacantes: V.rows, novedades: P.rows };
}
export type MisGuardados = Awaited<ReturnType<typeof misGuardados>>;

/* ── Reseñas (USR-RESENAS, diseño revV): escritas y por escribir (lo terminado en 30 días, una por negocio) ── */
export async function misResenas(userId: string) {
  const [R, P] = await Promise.all([
    db().query<{ id: string; biz: string; bname: string; foto: string | null; stars: number; body: string | null; reply: string | null; util: number; at: string; tz: string; st: string; why: string | null; verif: boolean }>(
      `select r.id::text, r.business_id as biz, b.name as bname, ${FOTO} as foto, r.stars, r.body, r.reply, r.helpful_count as util, ${ISO("r.created_at")} as at, c.timezone as tz,
              r.status as st, r.hidden_reason as why, r.operation_id is not null as verif
         from reviews r join businesses b on b.id = r.business_id join cities c on c.id = r.city_id
        where r.user_id = $1 and r.status <> 'removed' order by r.id desc limit 100`, [userId]),
    db().query<{ biz: string; bname: string; foto: string | null; num: string; kind: string; at: string; tz: string }>(
      `select distinct on (o.business_id) o.business_id as biz, b.name as bname, ${FOTO} as foto, o.number as num, o.kind, ${ISO("coalesce(o.done_at, o.updated_at)")} as at, c.timezone as tz
         from operations o join businesses b on b.id = o.business_id join cities c on c.id = o.city_id
        where o.user_id = $1 and o.kind in ('order', 'table') and o.status = 'done' and coalesce(o.status_detail, '') <> 'noshow' and coalesce(o.done_at, o.updated_at) > now() - interval '30 days'
          and not exists (select 1 from reviews r where r.business_id = o.business_id and r.user_id = $1 and r.status <> 'removed')
        order by o.business_id, o.id desc limit 20`, [userId]),
  ]);
  return { escritas: R.rows, porEscribir: P.rows };
}
export type MisResenas = Awaited<ReturnType<typeof misResenas>>;

/* ── Empleos: tus solicitudes ── */
export async function misSolicitudes(userId: string) {
  return (await db().query<{ num: string; job: string; biz: string; bname: string; foto: string | null; title: Bi; st: string; ivOk: boolean; iv: string | null; at: string; tz: string }>(
    `select a.number as num, a.job_id::text as job, a.business_id as biz, b.name as bname, ${FOTO} as foto, j.title, a.status as st, a.interview_confirmed as "ivOk",
            ${ISO("a.interview_at")} as iv, ${ISO("a.created_at")} as at, c.timezone as tz
       from job_applications a join job_postings j on j.id = a.job_id join businesses b on b.id = a.business_id join cities c on c.id = a.city_id
      where a.user_id = $1 order by a.id desc limit 100`, [userId])).rows;
}
export type MisSolicitudes = Awaited<ReturnType<typeof misSolicitudes>>;

/* Mi cuenta › Citas y reservas (4g-3): tus planes, rentas y apartados (abiertos en «Próximas», cerrados en «Pasadas»).
   Cada uno abre su página; los barridos corren al abrirla. */
export type MiOtro = { kind: "plan" | "rental" | "hold"; num: string; biz: string; bname: string; foto: string | null; st: string; abierto: boolean; svc: { es: string; en: string } | null; tot: number; at: string };
export async function misPlanesRentas(userId: string): Promise<MiOtro[]> {
  return (await db().query<MiOtro>(
    `select o.kind, o.number as num, o.business_id as biz, b.name as bname, ${FOTO} as foto,
            coalesce((select r.status from rentals r where r.operation_id = o.id), (select s.status from plan_subscriptions s where s.operation_id = o.id), o.status) as st,
            case o.kind when 'rental' then exists (select 1 from rentals r where r.operation_id = o.id and r.status in ('held', 'out'))
                        when 'plan' then exists (select 1 from plan_subscriptions s where s.operation_id = o.id and s.status <> 'cancelled')
                        else o.status in ('pending', 'change_proposed', 'confirmed') end as abierto,
            coalesce(o.details->'svc', o.details->'art') as svc, o.total_cents as tot, ${ISO("o.sent_at")} as at
       from operations o join businesses b on b.id = o.business_id where o.user_id = $1 and o.kind in ('plan', 'rental', 'hold') order by o.id desc limit 30`, [userId])).rows;
}

