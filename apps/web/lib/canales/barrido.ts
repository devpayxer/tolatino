import "server-only";
import { avisar, avisarNegocio } from "../avisos";
import { db } from "../db";

/* 9l · Los avisos que salen solos (el barrido central, cada minuto; cada uno UNA vez por objeto con notif_once, que es de solo inserción):
   - pedidosTarde():    «Tu pedido va tarde» (L345): un pedido aceptado que pasó su hora de listo por pedido_tarde_min y no está listo.
   - recomendados():    «{negocio} ya está en To'Latino» (L60, L143): al vecino que lo recomendó, cuando el negocio publica su página.
   - busquedas():       «Avísame cuando haya» (L84): un negocio nuevo en la ciudad que coincide con lo que la persona buscó (una vez por alerta).
   - pruebaPro():       la prueba de Pro (L126): «Te quedan 10 días» (día 20) y «Hoy termina» (último día), a las 10 AM de la ciudad, solo sin tarjeta
                        (con tarjeta, Pro sigue solo; «pasó a Free» ya sale al terminar: pro_free).
   - resumenSemanal():  los lunes desde las 9 AM de la ciudad: al negocio, su semana (push); al vecino con «Resumen semanal del barrio», su correo.
   Nunca lanza una tarea entera por un objeto. */
const una = async (k: string) => ((await db().query(`insert into notif_once (key) values ($1) on conflict do nothing`, [k.slice(0, 200)])).rowCount ?? 0) > 0;

export async function pedidosTarde(): Promise<number> {
  const L = (await db().query<{ id: string; uid: string; num: string; negocio: string }>(
    `select o.id::text, o.user_id::text as uid, o.number as num, b.name as negocio from operations o join businesses b on b.id = o.business_id
      where o.kind = 'order' and o.status = 'confirmed' and o.stage in ('preparing', 'accepted') and o.ready_at is not null
        and o.ready_at < now() - make_interval(mins => cfg_int('pedido_tarde_min')) and o.ready_at > now() - interval '6 hours'
        and not exists (select 1 from notif_once n where n.key = 'ord_tarde:' || o.id::text) order by o.ready_at limit 200`)).rows;
  let n = 0;
  for (const o of L) if (await una(`ord_tarde:${o.id}`)) { await avisar(o.uid, "ord_tarde", { num: o.num, negocio: o.negocio }, { href: `/pedido/${o.num}`, ref: ["order", o.num] }); n++; }
  return n;
}

/* «Hoy tienes mesa» (la promesa de Detalles: «Avísame por SMS cuando confirmen y el día de la reservación»): una mesa confirmada para hoy, desde 4 horas antes
   (no antes de las 9 AM de la ciudad). El SMS solo si la persona lo pidió en la reservación (avisarMesa lo lee). */
export async function recordatorioMesas(): Promise<number> {
  const L = (await db().query<{ id: string; num: string }>(
    `select o.id::text, o.number as num from operations o join cities c on c.id = o.city_id
      where o.kind = 'table' and o.status = 'confirmed' and o.scheduled_at > now() and o.scheduled_at <= now() + interval '4 hours'
        and (o.scheduled_at at time zone c.timezone)::date = (now() at time zone c.timezone)::date and extract(hour from now() at time zone c.timezone) >= 9
        and not exists (select 1 from notif_once n where n.key = 'rsv_hoy:' || o.id::text) order by o.scheduled_at limit 200`)).rows;
  let n = 0;
  for (const o of L) if (await una(`rsv_hoy:${o.id}`)) { await (await import("../avisos")).avisarMesa(o.num, "rsv_hoy"); n++; }
  return n;
}

export async function recomendados(): Promise<number> {
  const L = (await db().query<{ id: string; uid: string; negocio: string; bid: string }>(
    `select r.id::text, r.by_user_id::text as uid, b.name as negocio, b.id as bid from recommendations r join businesses b on b.id = r.business_id
      where r.status = 'joined' and b.status = 'active' and not r.is_mine and r.created_at > now() - interval '1 year'
        and not exists (select 1 from notif_once n where n.key = 'rec_publico:' || r.id::text) order by r.id limit 200`)).rows;
  let n = 0;
  for (const r of L) if (await una(`rec_publico:${r.id}`)) { await avisar(r.uid, "rec_publico", { negocio: r.negocio }, { href: `/n/${r.bid}`, ref: ["recommendation", r.id] }); n++; }
  return n;
}

export async function busquedas(): Promise<number> {
  // Lo buscado (sin comodines del que escribe) contra el nombre del negocio o el de su categoría; solo negocios que llegaron DESPUÉS de la alerta.
  const L = (await db().query<{ id: string; uid: string; q: string; ciudad: string; negocio: string; bid: string }>(
    `select a.id::text, a.user_id::text as uid, a.query as q, ci.name as ciudad, b.name as negocio, b.id as bid
       from search_alerts a join cities ci on ci.id = a.city_id
       cross join lateral (select b.id, b.name from businesses b left join categories k on k.id = b.category_id
                            where b.city_id = a.city_id and b.status = 'active' and b.created_at > a.created_at and length(trim(a.query)) >= 2
                              and (b.name ilike '%' || replace(replace(trim(a.query), '%', ''), '_', '') || '%' or k.name::text ilike '%' || replace(replace(trim(a.query), '%', ''), '_', '') || '%')
                            order by b.created_at limit 1) b
      where a.removed_at is null and a.notified_at is null and a.created_at > now() - interval '180 days' order by a.id limit 200`)).rows;
  let n = 0;
  for (const a of L) {
    const r = await db().query(`update search_alerts set notified_at = now() where id = $1::bigint and notified_at is null`, [a.id]);
    if (!r.rowCount) continue;
    await avisar(a.uid, "busqueda_hay", { que: a.q.slice(0, 40), ciudad: a.ciudad, negocio: a.negocio }, { href: `/n/${a.bid}`, ref: ["search_alert", a.id] });
    n++;
  }
  return n;
}

export async function pruebaPro(): Promise<number> {
  const L = (await db().query<{ b: string; n: string; tipo: "d20" | "ultimo"; fin: string }>(
    `select s.business_id as b, bz.name as n, s.trial_ends_at::text as fin,
            case when (s.trial_ends_at at time zone c.timezone)::date = (now() at time zone c.timezone)::date then 'ultimo' else 'd20' end as tipo
       from subscriptions s join businesses bz on bz.id = s.business_id join cities c on c.id = bz.city_id
      where s.status = 'trial' and s.trial_choice = 'none' and s.trial_ends_at > now() and extract(hour from now() at time zone c.timezone) >= 10
        and ((s.trial_ends_at at time zone c.timezone)::date = (now() at time zone c.timezone)::date
             or (s.trial_ends_at - now() <= interval '10 days' and s.trial_ends_at - now() > interval '9 days'))
      limit 200`)).rows;
  let n = 0;
  for (const s of L) if (await una(`pro_${s.tipo}:${s.b}:${s.fin}`)) { await avisarNegocio(s.b, s.tipo === "d20" ? "pro_d20" : "pro_ultimo", { negocio: s.n }, { href: `/panel/${s.b}/cobros/plan` }); n++; }
  return n;
}

/* «To'Latino abrió en {ciudad}» (L345; la promesa de la landing y de «Pide tu ciudad»: UN mensaje, el día que abre): quien está en la lista de espera de una
   ciudad que ya está abierta (cities.status = 'on') y todavía no recibió el aviso. Una vez por persona y ciudad (notified_at + notif_once): si el asistente de
   apertura (9i) ya avisó y marcó la lista, aquí no sale nada. */
export async function aperturas(): Promise<number> {
  const L = (await db().query<{ id: string; uid: string; city: string; ciudad: string }>(
    `select w.id::text, w.user_id::text as uid, c.id as city, c.name as ciudad from city_waitlist w join cities c on c.id = w.city_id
      where c.status = 'on' and w.user_id is not null and w.removed_at is null and w.notified_at is null order by w.id limit 300`)).rows;
  const base = (process.env.TOLATINO_URL || "https://pruebas.tolatino.com").replace(/\/$/, "");
  let n = 0;
  for (const w of L) {
    const r = await db().query(`update city_waitlist set notified_at = now() where id = $1::bigint and notified_at is null`, [w.id]);
    if (!r.rowCount) continue;
    await db().query(`update early_access set notified_at = now() where user_id = $1::uuid and city_id = $2 and notified_at is null`, [w.uid, w.city]).catch(() => undefined);
    if (await una(`ciudad_abierta:${w.city}:${w.uid}`)) { await avisar(w.uid, "ciudad_abierta", { ciudad: w.ciudad, enlace: `${base}/` }, { href: "/", ref: ["city", w.city] }); n++; }
  }
  return n;
}

/* Los lunes desde las 9 AM (hora de la ciudad); una vez por semana ISO. */
export async function resumenSemanal(): Promise<{ negocios: number; vecinos: number }> {
  const B = (await db().query<{ b: string; n: string; semana: string; vistas: number; ops: number; resenas: number }>(
    `select b.id as b, b.name as n, to_char(now() at time zone c.timezone, 'IYYY-IW') as semana,
            coalesce((select sum(v.n)::int from business_views_daily v where v.business_id = b.id and v.day > (now() at time zone c.timezone)::date - 7), 0) as vistas,
            (select count(*)::int from operations o where o.business_id = b.id and o.sent_at > now() - interval '7 days' and o.kind <> 'plan') as ops,
            (select count(*)::int from reviews r where r.business_id = b.id and r.created_at > now() - interval '7 days') as resenas
       from businesses b join cities c on c.id = b.city_id
      where b.status = 'active' and extract(isodow from now() at time zone c.timezone) = 1 and extract(hour from now() at time zone c.timezone) >= 9
        and not exists (select 1 from notif_once x where x.key = 'biz_semana:' || b.id || ':' || to_char(now() at time zone c.timezone, 'IYYY-IW'))
      order by b.id limit 200`)).rows;
  let negocios = 0;
  for (const x of B) {
    if (!(await una(`biz_semana:${x.b}:${x.semana}`)) || x.vistas + x.ops + x.resenas === 0) continue;
    await avisarNegocio(x.b, "biz_resumen_semana", { negocio: x.n, vistas: x.vistas, ops: x.ops, resenas: x.resenas }, { href: `/panel/${x.b}` });
    negocios++;
  }
  // El correo del vecino (Mi cuenta › Avisos › «Resumen semanal del barrio», apagado de fábrica; solo a un correo confirmado).
  const U = (await db().query<{ id: string; email: string; lang: string; city: string; ciudad: string; semana: string }>(
    `select u.id::text, u.email::text as email, coalesce(u.lang, 'es') as lang, u.home_city_id as city, c.name as ciudad, to_char(now() at time zone c.timezone, 'IYYY-IW') as semana
       from users u join cities c on c.id = u.home_city_id
      where coalesce((u.notif_prefs->>'mailW')::boolean, false) and coalesce(u.email_verified, false) and u.email is not null and u.status not in ('deleted', 'merged')
        and extract(isodow from now() at time zone c.timezone) = 1 and extract(hour from now() at time zone c.timezone) >= 9
        and not exists (select 1 from notif_once x where x.key = 'mail_semana:' || u.id::text || ':' || to_char(now() at time zone c.timezone, 'IYYY-IW'))
      order by u.id limit 200`)).rows;
  let vecinos = 0;
  for (const u of U) {
    if (!(await una(`mail_semana:${u.id}:${u.semana}`))) continue;
    await correoSemanal(u).catch(() => undefined);
    vecinos++;
  }
  return { negocios, vecinos };
}
async function correoSemanal(u: { id: string; email: string; lang: string; city: string; ciudad: string; semana: string }) {
  const es = u.lang !== "en";
  const [N, E] = await Promise.all([
    db().query<{ n: string }>(`select name as n from businesses where city_id = $1 and status = 'active' and created_at > now() - interval '7 days' order by created_at desc limit 5`, [u.city]),
    db().query<{ t: { es: string; en: string }; dia: string }>(
      `select e.title as t, to_char(min(d.starts_at) at time zone c.timezone, 'DD/MM') as dia from events e join event_dates d on d.event_id = e.id join cities c on c.id = e.city_id
        where e.city_id = $1 and e.status = 'live' and d.status = 'scheduled' and d.starts_at between now() and now() + interval '7 days' group by e.id, e.title, c.timezone order by min(d.starts_at) limit 5`, [u.city]),
  ]);
  const { BASE_URL, encolar } = await import("../correo"), { marco } = await import("../correo/plantillas");
  const filas: [string, string][] = [...N.rows.map((x): [string, string] => [x.n, es ? "Nuevo" : "New"]), ...E.rows.map((x): [string, string] => [es ? x.t.es : x.t.en || x.t.es, x.dia])];
  const { html, text } = marco({ es, pre: es ? `Tu semana en ${u.ciudad}` : `Your week in ${u.ciudad}`, titulo: es ? `Esta semana en ${u.ciudad}` : `This week in ${u.ciudad}`,
    intro: filas.length ? (es ? "Negocios nuevos y lo que viene en los próximos 7 días." : "New businesses and what is coming in the next 7 days.") : (es ? "Una semana tranquila: no hubo negocios nuevos ni eventos en los próximos 7 días." : "A quiet week: no new businesses or events in the next 7 days."),
    filas, cta: { l: es ? "Abrir To'Latino" : "Open To'Latino", href: `${BASE_URL()}/` },
    pie: es ? "Te llega porque encendiste «Resumen semanal del barrio». Para no recibirlo: Mi cuenta › Avisos." : "You get this because you turned on «Weekly neighborhood digest». To stop: My account › Notifications." });
  await encolar({ userId: u.id, city: u.city, to: u.email, tpl: "weekly", subject: es ? `Esta semana en ${u.ciudad} · To'Latino` : `This week in ${u.ciudad} · To'Latino`, html, text, idem: `semana-${u.id}-${u.semana}` });
}

/* El barrido de 9l: todo lo de arriba (el único camino de los SMS y la retención del correo a Soporte corren aparte en lib/barrido.ts). */
export async function barrerCanales9l() {
  return { tarde: await pedidosTarde(), mesas: await recordatorioMesas(), rec: await recomendados(), busq: await busquedas(), pro: await pruebaPro(), abre: await aperturas(), semana: await resumenSemanal() };
}
