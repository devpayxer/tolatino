import "server-only";
import type { Pool, PoolClient } from "pg";
import { db, tx } from "./db";
import { hora } from "./pedir";

/* Reseñas (prototipo revAdd / revWVals / revSVals; modelo «Review»). Una por persona y negocio; se publica al instante.
   Verificada = viene de un pedido o una mesa terminada de esa persona en ese negocio (el servidor la elige; el cliente no
   puede decir «verificada»). El dato del pedido (hora prometida, hora real, cuántos minutos tarde) lo pone el servidor y
   no se edita. El negocio Pro responde; nadie la borra: el autor la quita (removed) y To'Latino la oculta con motivo. */

type Bi = { es: string; en: string };
export type Src = "dl" | "pk" | "rsv" | "cita" | "vis";
export type Respuestas = { taste?: -1 | 0 | 1; hot?: -1 | 0 | 1; val?: -1 | 0 | 1; wait?: "a" | "b" | "c" };
export type Hechos = { promised?: string; done?: string; late?: number };
export type Tarjeta = {
  id: string; name: string; ini: string; mine: boolean; cnt: number; d: number; editada: boolean; src: Src; stars: number;
  answers: Respuestas; facts: Hechos; body: string; fotos: string[]; rec: Bi[]; reply: { text: string; d: number } | null;
  help: number; helpOn: boolean; reported: boolean; pro?: string | null; // la cita fue con esa persona (3d)
};

export const MIN_TEXTO = 20, MAX_TEXTO = 1000, MAX_FOTOS = 6, EDITAR_H = 48, PAGINA = 6;
// Teléfonos y correos: la reseña no se publica con ellos (mismo patrón que el prototipo).
export const PII = /(\d[\s().-]*){10}|\S+@\S+\.\S+/;
const VERIFICADA_DIAS = 30;

const nombreCorto = (f: string | null, l: string | null) => `${(f ?? "").trim()}${l ? ` ${l.trim().slice(0, 1).toUpperCase()}.` : ""}`.trim() || "Vecino";
const iniciales = (s: string) => s.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();

/* Columnas de una tarjeta. $2 = la persona que mira (o null). */
const TARJETA_SQL = `
  r.id::text, r.user_id = $2::uuid as mine, u.first_name, u.last_name, r.src, r.stars, r.answers, r.facts, r.body, r.rec,
  (now()::date - r.created_at::date) as d, r.edited_at is not null as editada, r.helpful_count as help,
  case when b.pro then r.reply end as reply, case when b.pro and r.reply_at is not null then (now()::date - r.reply_at::date) end as reply_d,
  (select count(*)::int from reviews x where x.user_id = r.user_id and x.status = 'visible') as cnt,
  (select coalesce(array_agg(m.url order by m.sort, m.created_at), '{}') from media m where m.owner_kind = 'review' and m.owner_id = r.id::text and m.status = 'visible') as fotos,
  coalesce($2::uuid is not null and exists (select 1 from review_helpful h where h.review_id = r.id and h.user_id = $2::uuid), false) as help_on,
  coalesce($2::uuid is not null and exists (select 1 from content_reports c where c.target_kind = 'review' and c.target_id = r.id::text and c.reporter_user_id = $2::uuid), false) as reported,
  (select coalesce(jsonb_agg(i.name order by array_position(r.rec, i.id::text)), '[]') from items i where i.business_id = r.business_id and i.id::text = any(r.rec) and i.removed_at is null) as rec_names,
  (select split_part(m.display_name, ' ', 1) from operations o join business_members m on m.id = o.member_id where o.id = r.operation_id and o.kind = 'appointment') as con_pro`;
type FilaT = {
  id: string; mine: boolean; first_name: string | null; last_name: string | null; src: Src; stars: number; answers: Respuestas; facts: Hechos; body: string;
  rec: string[]; d: number; editada: boolean; help: number; reply: string | null; reply_d: number | null; cnt: number; fotos: string[]; help_on: boolean; reported: boolean; rec_names: Bi[]; con_pro: string | null;
};
const tarjeta = (x: FilaT): Tarjeta => {
  const name = nombreCorto(x.first_name, x.last_name);
  return {
    id: x.id, name, ini: iniciales(name), mine: x.mine, cnt: x.cnt, d: x.d, editada: x.editada, src: x.src, stars: x.stars, answers: x.answers ?? {}, facts: x.facts ?? {},
    body: x.body, fotos: x.fotos ?? [], rec: x.rec_names ?? [], reply: x.reply ? { text: x.reply, d: x.reply_d ?? 0 } : null, help: x.help, helpOn: x.help_on, reported: x.reported, pro: x.con_pro ?? null,
  };
};
const NEG_SQL = `(select b.id, b.name, coalesce(s.plan, 'free') = 'pro' as pro from businesses b left join business_stats_cache s on s.business_id = b.id where b.id = $1 and b.status = 'active') b`;

/* La operación terminada que hace verificada una reseña: pedido entregado/recogido o mesa terminada (no «no llegaron»),
   de esa persona en ese negocio, de los últimos 30 días y sin reseña. Con número, esa; sin número, la más reciente. */
export type OpResena = { id: string; numero: string; kind: "order" | "table" | "appointment"; src: Src; hoy: boolean; lineas: string[] };
export async function opParaResena(c: PoolClient | ReturnType<typeof db>, negocio: string, userId: string, numero?: string | null): Promise<OpResena | null> {
  const r = await c.query<{ id: string; number: string; kind: "order" | "table" | "appointment"; mode: string | null; hoy: boolean; lineas: string[] }>(
    `select o.id::text, o.number, o.kind, o.mode, (o.done_at at time zone ci.timezone)::date = (now() at time zone ci.timezone)::date as hoy,
            (select coalesce(array_agg(l.name->>'es' order by l.id), '{}') from operation_lines l where l.operation_id = o.id) as lineas
       from operations o join cities ci on ci.id = o.city_id
      where o.business_id = $1 and o.user_id = $2 and o.kind in ('order', 'table', 'appointment') and o.status = 'done' and coalesce(o.status_detail, '') <> 'noshow'
        and o.done_at > now() - interval '${VERIFICADA_DIAS} days' and ($3::text is null or o.number = $3)
        and not exists (select 1 from reviews r where r.operation_id = o.id and r.status <> 'removed')
      order by o.done_at desc limit 1`, [negocio, userId, numero ?? null]);
  const o = r.rows[0];
  if (!o) return null;
  return { id: o.id, numero: o.number, kind: o.kind, src: o.kind === "table" ? "rsv" : o.kind === "appointment" ? "cita" : o.mode === "delivery" ? "dl" : "pk", hoy: o.hoy, lineas: o.lineas };
}

/* Lo que va en la ficha: cifras, barras, verificadas, lo que importa (Comida, de pedidos calificados en 90 días), los más
   recomendados, la reseña propia y las destacadas del Resumen. Todo derivado de las reseñas visibles. */
/* miembro: la página de una silla (3d) muestra solo las reseñas de citas con esa persona. */
const DE_MIEMBRO = (miembro?: string | null) => (miembro && /^[0-9a-f-]{36}$/.test(miembro) ? ` and operation_id in (select o.id from operations o where o.kind = 'appointment' and o.member_id = '${miembro}'::uuid)` : "");
export async function resumenResenas(negocio: string, userId: string | null, miembro?: string | null) {
  const fm = DE_MIEMBRO(miembro);
  const b = (await db().query<{ id: string; name: string; pro: boolean; food: boolean; dlv: boolean }>(
    `select b.id, b.name, coalesce(s.plan, 'free') = 'pro' as pro, b.category_id = 'NEG-FOOD' as food, coalesce(d.delivery, false) as dlv
       from businesses b left join business_stats_cache s on s.business_id = b.id left join delivery_settings d on d.business_id = b.id
      where b.id = $1 and b.status = 'active'`, [negocio])).rows[0];
  if (!b) return null;
  const [cifras, asp, top, mia, dest, op] = await Promise.all([
    db().query<{ n: number; avg: number | null; s5: number; s4: number; s3: number; s2: number; s1: number; ver: number }>(
      `select count(*)::int as n, round(avg(stars)::numeric, 1)::float as avg, count(*) filter (where stars = 5)::int as s5, count(*) filter (where stars = 4)::int as s4,
              count(*) filter (where stars = 3)::int as s3, count(*) filter (where stars = 2)::int as s2, count(*) filter (where stars = 1)::int as s1,
              count(*) filter (where src <> 'vis')::int as ver
         from reviews where business_id = $1 and status = 'visible'${fm}`, [negocio]),
    // Lo que importa en la comida: solo pedidos calificados en To'Latino en los últimos 90 días.
    db().query<{ orders: number; hot: number | null; time: number | null; val: number | null; taste: number | null }>(
      `select count(*)::int as orders,
              round(100.0 * count(*) filter (where (answers->>'hot')::int = 1) / nullif(count(*) filter (where answers ? 'hot'), 0))::int as hot,
              round(100.0 * count(*) filter (where (facts->>'late')::int <= 5) / nullif(count(*) filter (where facts ? 'late'), 0))::int as time,
              round(100.0 * count(*) filter (where (answers->>'val')::int = 1) / nullif(count(*) filter (where answers ? 'val'), 0))::int as val,
              round(avg(stars) filter (where answers ? 'taste')::numeric, 1)::float as taste
         from reviews where business_id = $1 and status = 'visible' and src in ('dl', 'pk') and created_at > now() - interval '90 days'`, [negocio]),
    db().query<{ id: string; name: Bi; ph: string | null; n: number }>(
      `select i.id::text, i.name, i.photos[1] as ph, count(*)::int as n
         from reviews r cross join lateral unnest(r.rec) as k join items i on i.id::text = k and i.business_id = r.business_id and i.removed_at is null and i.status = 'live'
        where r.business_id = $1 and r.status = 'visible' group by i.id order by n desc, i.id limit 6`, [negocio]),
    // La propia: en la página solo si se ve (una oculta por To'Latino no sale, ni para su autor).
    userId ? db().query<FilaT & { visible: boolean }>(`select ${TARJETA_SQL}, r.status = 'visible' as visible from reviews r join users u on u.id = r.user_id cross join ${NEG_SQL} where r.business_id = $1 and r.user_id = $2::uuid and r.status <> 'removed' limit 1`, [negocio, userId]) : null,
    // Resumen: Pro = las 2 mejores (★4+, más útiles); Free = las 3 más recientes. La propia va primero.
    db().query<FilaT>(
      `select ${TARJETA_SQL} from reviews r join users u on u.id = r.user_id cross join ${NEG_SQL}
        where r.business_id = $1 and r.status = 'visible'${fm} and ($2::uuid is null or r.user_id <> $2::uuid) and (not b.pro or r.stars >= 4)
        order by case when b.pro then r.helpful_count else 0 end desc, r.created_at desc limit 3`, [negocio, userId]),
    userId ? opParaResena(db(), negocio, userId) : null,
  ]);
  const c = cifras.rows[0]!, a = asp.rows[0]!, m0 = mia?.rows[0], mine = m0?.visible ? tarjeta(m0) : null, tengo = !!m0;
  const n = c.n, pct = (k: number) => (n ? Math.round((100 * k) / n) : 0);
  const destacadas = (mine && mine.stars ? [mine] : []).concat(dest.rows.map(tarjeta)).slice(0, b.pro ? 2 : 3);
  return {
    negocio: { id: b.id, name: b.name, pro: b.pro, food: b.food, dlv: b.dlv },
    n, avg: c.avg, ver: c.ver, bars: [[5, pct(c.s5)], [4, pct(c.s4)], [3, pct(c.s3)], [2, pct(c.s2)], [1, pct(c.s1)]] as [number, number][],
    asp: b.food && a.orders > 0 ? { orders: a.orders, hot: a.hot, time: a.time, val: a.val, taste: a.taste } : null,
    top: top.rows.map((x) => ({ id: x.id, name: x.name, ph: x.ph, n: x.n })),
    mine: fm ? null : mine, tengo, destacadas, miembro: fm ? miembro! : null,
    // «TU PEDIDO DE HOY · ¿Cómo estuvo?»: solo si terminó hoy y aún no tiene reseña.
    prompt: !tengo && op?.hoy ? { numero: op.numero, kind: op.kind } : null,
  };
}
export type ResumenResenas = NonNullable<Awaited<ReturnType<typeof resumenResenas>>>;

/* Pestaña Reseñas: filtros, orden y «Ver más» por cursor (sin saltos aunque lleguen reseñas nuevas). La propia va arriba
   en la primera página y no se repite. */
export type Filtro = "all" | "ver" | "ph" | "reply" | "crit";
export type Orden = "rec" | "help" | "hi" | "lo";
const ORDEN_SQL: Record<Orden, { by: string; key: string }> = {
  rec: { by: "r.created_at desc, r.id desc", key: "(extract(epoch from r.created_at) * 1000)::bigint" }, help: { by: "r.helpful_count desc, r.id desc", key: "r.helpful_count" },
  hi: { by: "r.stars desc, r.id desc", key: "r.stars" }, lo: { by: "r.stars asc, r.id desc", key: "r.stars" },
};
export async function listaResenas(negocio: string, userId: string | null, q: { f?: string; star?: number; sort?: string; cursor?: string | null; miembro?: string | null }) {
  const f: Filtro = (["all", "ver", "ph", "reply", "crit"] as const).includes(q.f as Filtro) ? (q.f as Filtro) : "all";
  const sort: Orden = (["rec", "help", "hi", "lo"] as const).includes(q.sort as Orden) ? (q.sort as Orden) : "rec";
  const star = Number.isInteger(q.star) && q.star! >= 1 && q.star! <= 5 ? q.star! : 0;
  const w = [`r.business_id = $1`, `r.status = 'visible'`];
  if (DE_MIEMBRO(q.miembro)) w.push(`true${DE_MIEMBRO(q.miembro).replace(" and operation_id", " and r.operation_id")}`);
  const filtro: Record<Filtro, string> = {
    all: "true", ver: "r.src <> 'vis'", reply: "b.pro and r.reply is not null", crit: "r.stars <= 3",
    ph: "exists (select 1 from media m where m.owner_kind = 'review' and m.owner_id = r.id::text and m.status = 'visible')",
  };
  w.push(filtro[f]);
  const v: unknown[] = [negocio, userId];
  if (star) { v.push(star); w.push(`r.stars = $${v.length}`); }
  const base = w.join(" and ");
  // Cursor: «clave:id» del último de la página anterior.
  const cur = typeof q.cursor === "string" && /^-?\d{1,15}:\d{1,18}$/.test(q.cursor) ? q.cursor.split(":") : null;
  const pag = [...v], wp = [base, "($2::uuid is null or r.user_id <> $2::uuid)"];
  if (cur) {
    pag.push(Number(cur[0]), cur[1]);
    const k = ORDEN_SQL[sort].key, a = `$${pag.length - 1}`, i = `$${pag.length}::bigint`;
    wp.push(sort === "lo" ? `(${k} > ${a} or (${k} = ${a} and r.id < ${i}))` : `(${k} < ${a} or (${k} = ${a} and r.id < ${i}))`);
  }
  const [lista, cuenta, mia] = await Promise.all([
    db().query<FilaT & { k: number }>(
      `select ${TARJETA_SQL}, ${ORDEN_SQL[sort].key}::bigint as k from reviews r join users u on u.id = r.user_id cross join ${NEG_SQL}
        where ${wp.join(" and ")} order by ${ORDEN_SQL[sort].by} limit ${PAGINA + 1}`, pag),
    db().query<{ n: number }>(`select count(*)::int as n from reviews r cross join ${NEG_SQL} where ${base} and ($2::uuid is null or true)`, v),
    !cur && userId ? db().query<FilaT>(`select ${TARJETA_SQL} from reviews r join users u on u.id = r.user_id cross join ${NEG_SQL} where ${base} and r.user_id = $2::uuid limit 1`, v) : null,
  ]);
  const filas = lista.rows.slice(0, PAGINA), ult = filas[filas.length - 1];
  return {
    cards: (mia?.rows[0] ? [tarjeta(mia.rows[0])] : []).concat(filas.map(tarjeta)),
    n: cuenta.rows[0]!.n, cursor: lista.rows.length > PAGINA && ult ? `${ult.k}:${ult.id}` : null,
  };
}

/* Escribir / editar (APP-NEG-RESENA): el negocio, la visita verificada que se puede reseñar, la reseña propia (para
   editar) y los platos para «¿Qué recomiendas?» (los del pedido; si no, los del menú). */
export async function paraEscribir(negocio: string, userId: string, numero: string | null) {
  const b = (await db().query<{ id: string; name: string; pro: boolean; food: boolean; logo: string | null; subs: string | null; ciudad: string }>(
    `select b.id, b.name, coalesce(s.plan, 'free') = 'pro' as pro, b.category_id = 'NEG-FOOD' as food, ci.name as ciudad,
            (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as logo,
            (select string_agg(sc.name->>'es', ' · ' order by array_position(b.subcategory_ids, sc.id)) from (select * from subcategorias_vivas where id = any(b.subcategory_ids) limit 2) sc) as subs
       from businesses b join cities ci on ci.id = b.city_id left join business_stats_cache s on s.business_id = b.id where b.id = $1 and b.status = 'active'`, [negocio])).rows[0];
  if (!b) return null;
  const mia = (await db().query<FilaT & { op: string | null; numero: string | null; puede: boolean; hasta: string }>(
    `select ${TARJETA_SQL}, r.operation_id::text as op, o.number as numero, r.created_at > now() - interval '${EDITAR_H} hours' as puede,
            to_char((r.created_at + interval '${EDITAR_H} hours') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hasta
       from reviews r join users u on u.id = r.user_id left join operations o on o.id = r.operation_id cross join ${NEG_SQL}
      where r.business_id = $1 and r.user_id = $2::uuid and r.status <> 'removed' limit 1`, [negocio, userId])).rows[0];
  const op = mia ? null : await opParaResena(db(), negocio, userId, numero);
  // El dato del pedido que se va a guardar (se muestra antes de publicar; no se edita).
  const hechos = op?.kind === "order" ? await hechosDe(db(), op.id) : mia ? mia.facts ?? {} : {};
  const fotos = mia ? (await db().query<{ id: string; url: string }>(
    `select id::text, url from media where owner_kind = 'review' and owner_id = $1 and status = 'visible' order by sort, created_at`, [mia.id])).rows : [];
  const opId = mia?.op ?? op?.id ?? null;
  const pool = (await db().query<{ id: string; name: Bi }>(
    opId
      ? `select distinct on (i.id) i.id::text, i.name from operation_lines l join items i on i.id = l.item_id where l.operation_id = $2::bigint and i.business_id = $1 and i.removed_at is null limit 6`
      : `select i.id::text, i.name from items i left join item_sections s on s.id = i.section_id
          where i.business_id = $1 and i.module = 'menu' and i.removed_at is null and i.status = 'live' and i.sell order by i.featured desc, s.sort nulls last, i.sort limit 6`,
    opId ? [negocio, opId] : [negocio])).rows;
  return {
    negocio: { id: b.id, name: b.name, pro: b.pro, food: b.food, logo: b.logo, ciudad: b.ciudad, meta: [b.subs, b.ciudad].filter(Boolean).join(" · ") },
    op, hechos, mia: mia ? { ...tarjeta(mia), puede: mia.puede, hasta: mia.hasta, numero: mia.numero, fotoIds: fotos } : null,
    pool: pool.map((x) => ({ id: x.id, name: x.name })),
  };
}
export type ParaEscribir = NonNullable<Awaited<ReturnType<typeof paraEscribir>>>;

/* El dato del pedido (no se edita): hora prometida, hora real y minutos tarde. Pickup: prometido = la hora de listo
   (o la programada) contra cuando lo marcaron listo; delivery: el final de «llega entre» contra cuando lo entregaron. */
async function hechosDe(c: PoolClient | Pool, opId: string): Promise<Hechos> {
  const o = (await c.query<{ prom: number | null; real: number | null; late: number | null }>(
    `with o as (
       select o.*, ci.timezone as tz,
              case when o.mode = 'delivery' and o.details ? 'eta'
                   then (date_trunc('day', o.sent_at at time zone ci.timezone) + make_interval(mins => (o.details->'eta'->>'d2')::int)) at time zone ci.timezone
                   else coalesce(o.scheduled_at, o.ready_at) end as prom,
              coalesce((select e.at from operation_events e where e.operation_id = o.id and e.kind = case when o.mode = 'delivery' then 'delivered' else 'ready' end order by e.at limit 1), o.done_at) as real
         from operations o join cities ci on ci.id = o.city_id where o.id = $1::bigint and o.kind = 'order')
     select extract(hour from prom at time zone tz)::int * 60 + extract(minute from prom at time zone tz)::int as prom,
            extract(hour from real at time zone tz)::int * 60 + extract(minute from real at time zone tz)::int as real,
            round(extract(epoch from real - prom) / 60)::int as late
       from o`, [opId])).rows[0];
  if (!o || o.prom == null || o.real == null || o.late == null) return {};
  return { promised: hora(o.prom), done: hora(o.real), late: o.late };
}

const OK3 = (v: unknown) => (v === 1 || v === 0 || v === -1 ? (v as -1 | 0 | 1) : undefined);
function limpiarRespuestas(a: unknown, ord: boolean): Respuestas {
  const x = (a && typeof a === "object" ? a : {}) as Record<string, unknown>, r: Respuestas = {};
  const t = OK3(x.taste), h = OK3(x.hot), v = OK3(x.val);
  if (t !== undefined) r.taste = t;
  if (h !== undefined) r.hot = h;
  if (v !== undefined) r.val = v;
  // Cuánto esperó: solo sin pedido (con pedido sale del dato del pedido).
  if (!ord && (x.wait === "a" || x.wait === "b" || x.wait === "c")) r.wait = x.wait;
  return r;
}

export type ResenaIn = { negocio: string; numero?: string | null; visitante?: boolean; stars: number; answers?: unknown; rec?: unknown; body: string; fotos?: unknown; lang?: string };
type Res = { ok: true; id: string } | { ok: false; msg: Bi };
const no = (es: string, en: string): Res => ({ ok: false, msg: { es, en } });

/* Publicar o guardar cambios. Una por negocio; editar solo 48 h (estrellas, lo que importa, recomienda, texto, fotos;
   la visita no cambia). Fotos: solo las que subió la persona (o ya eran de su reseña). */
export async function guardarResena(userId: string, p: ResenaIn): Promise<Res> {
  const stars = Number(p.stars), body = String(p.body ?? "").trim();
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return no("Elige tu calificación.", "Pick your rating.");
  if (body.length < MIN_TEXTO) return no(`Escribe al menos ${MIN_TEXTO} letras.`, `Write at least ${MIN_TEXTO} characters.`);
  if (body.length > MAX_TEXTO) return no(`Máximo ${MAX_TEXTO} letras.`, `${MAX_TEXTO} characters max.`);
  if (PII.test(body)) return no("Quita teléfonos y correos: por seguridad, la reseña no se publica con ellos.", "Remove phones and emails: for safety, reviews cannot include them.");
  const fotos = Array.isArray(p.fotos) ? [...new Set(p.fotos.filter((x): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/.test(x)))] : [];
  if (fotos.length > MAX_FOTOS) return no(`Hasta ${MAX_FOTOS} fotos.`, `Up to ${MAX_FOTOS} photos.`);
  const rec0 = Array.isArray(p.rec) ? [...new Set(p.rec.filter((x): x is string => typeof x === "string" && /^\d{1,18}$/.test(x)))].slice(0, 12) : [];
  const lang = p.lang === "en" ? "en" : "es";
  return tx(async (c) => {
    const b = (await c.query<{ id: string; city_id: string }>(`select id, city_id from businesses where id = $1 and status = 'active' for share`, [p.negocio])).rows[0];
    if (!b) return no("Ese negocio no existe.", "That business does not exist.");
    // Solo platos de ese negocio.
    const rec = rec0.length ? (await c.query<{ id: string }>(`select id::text from items where business_id = $1 and id::text = any($2) and removed_at is null`, [b.id, rec0])).rows.map((x) => x.id) : [];
    const ya = (await c.query<{ id: string; src: Src; puede: boolean; status: string }>(
      `select id::text, src, created_at > now() - interval '${EDITAR_H} hours' as puede, status from reviews where business_id = $1 and user_id = $2 and status <> 'removed' for update`, [b.id, userId])).rows[0];
    let id: string;
    if (ya) {
      if (!ya.puede) return no("Ya pasaron las 48 horas para editarla.", "The 48 hours to edit it have passed.");
      if (ya.status === "hidden") return no("To'Latino ocultó esta reseña; no se puede editar.", "To'Latino hid this review; it cannot be edited.");
      const answers = limpiarRespuestas(p.answers, ya.src === "dl" || ya.src === "pk");
      await c.query(`update reviews set stars = $2, body = $3, answers = $4, rec = $5, lang = $6, edited_at = now() where id = $1::bigint`, [ya.id, stars, body, answers, rec, lang]);
      id = ya.id;
    } else {
      const op = p.visitante ? null : await opParaResena(c, b.id, userId, typeof p.numero === "string" && /^[A-Z0-9-]{1,20}$/i.test(p.numero) ? p.numero : null);
      if (!p.visitante && p.numero && !op) return no("Ese pedido no se puede reseñar (no es tuyo, no terminó o ya tiene reseña).", "That order cannot be reviewed (not yours, not finished or already reviewed).");
      const src: Src = op?.src ?? "vis", ord = src === "dl" || src === "pk";
      const facts = op && op.kind === "order" ? await hechosDe(c, op.id) : {};
      const answers = limpiarRespuestas(p.answers, ord);
      const r = await c.query<{ id: string }>(
        `insert into reviews (business_id, city_id, user_id, operation_id, src, stars, body, lang, answers, facts, rec)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) on conflict do nothing returning id::text`,
        [b.id, b.city_id, userId, op?.id ?? null, src, stars, body, lang, answers, facts, rec]);
      if (!r.rows[0]) return no("Ya tienes una reseña de este negocio.", "You already have a review for this business.");
      id = r.rows[0].id;
    }
    // Fotos: las nuevas pasan de la persona a la reseña; las que quitó se marcan quitadas (nada se borra).
    if (fotos.length) {
      const ok = await c.query(
        `update media set owner_kind = 'review', owner_id = $1, sort = array_position($3::uuid[], id)
          where id = any($3::uuid[]) and uploaded_by = $2 and status = 'visible' and (owner_kind = 'user' or (owner_kind = 'review' and owner_id = $1))`, [id, userId, fotos]);
      if (ok.rowCount !== fotos.length) throw Object.assign(new Error("foto ajena"), { fotoAjena: true });
    }
    await c.query(`update media set status = 'removed', removed_reason = 'autor', removed_at = now() where owner_kind = 'review' and owner_id = $1 and status = 'visible' and not (id = any($2::uuid[]))`, [id, fotos]);
    await c.query(`select reviews_stats($1)`, [b.id]);
    return { ok: true, id } as const;
  }).catch((e: { fotoAjena?: boolean }) => (e?.fotoAjena ? no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.") : Promise.reject(e)));
}

/* Quitar la propia reseña (el «Borrar» de la pantalla): sale de la página; queda guardada como quitada por el autor. */
export async function quitarResena(userId: string, negocio: string): Promise<Res> {
  return tx(async (c) => {
    const r = await c.query<{ id: string }>(`update reviews set status = 'removed', hidden_at = now(), hidden_reason = 'autor' where business_id = $1 and user_id = $2 and status = 'visible' returning id::text`, [negocio, userId]);
    if (!r.rows[0]) return no("Esa reseña ya no está.", "That review is gone.");
    await c.query(`select reviews_stats($1)`, [negocio]);
    return { ok: true, id: r.rows[0].id } as const;
  });
}

/* «Útil»: una marca por persona; no en la propia. Devuelve el conteo nuevo. */
export async function marcarUtil(userId: string, id: string): Promise<{ ok: true; on: boolean; n: number } | { ok: false; msg: Bi }> {
  if (!/^\d{1,18}$/.test(id)) return { ok: false, msg: { es: "Esa reseña no existe.", en: "That review does not exist." } };
  return tx(async (c) => {
    const r = (await c.query<{ user_id: string }>(`select user_id from reviews where id = $1::bigint and status = 'visible' for update`, [id])).rows[0];
    if (!r) return { ok: false as const, msg: { es: "Esa reseña ya no está.", en: "That review is gone." } };
    if (r.user_id === userId) return { ok: false as const, msg: { es: "No puedes marcar tu propia reseña.", en: "You cannot mark your own review." } };
    const del = await c.query(`delete from review_helpful where review_id = $1::bigint and user_id = $2`, [id, userId]);
    if (!del.rowCount) await c.query(`insert into review_helpful (review_id, user_id) values ($1::bigint, $2)`, [id, userId]);
    const n = (await c.query<{ n: number }>(`update reviews set helpful_count = (select count(*) from review_helpful where review_id = $1::bigint) where id = $1::bigint returning helpful_count as n`, [id])).rows[0]!.n;
    return { ok: true as const, on: !del.rowCount, n };
  });
}

/* Reportar una reseña: queda visible mientras una persona de To'Latino la revisa (cola «Reportes de contenido», 24 h). */
export const MOTIVOS = ["fake", "off", "pii", "spam", "coi", "otro"] as const;
export async function reportarResena(userId: string, id: string, motivo: string, nota: string): Promise<Res> {
  if (!/^\d{1,18}$/.test(id)) return no("Esa reseña no existe.", "That review does not exist.");
  if (!(MOTIVOS as readonly string[]).includes(motivo)) return no("Elige qué pasa con esta reseña.", "Pick what is wrong with it.");
  const n = String(nota ?? "").trim().slice(0, 300) || null;
  return tx(async (c) => {
    const r = (await c.query<{ user_id: string; business_id: string; city_id: string }>(`select user_id, business_id, city_id from reviews where id = $1::bigint and status = 'visible'`, [id])).rows[0];
    if (!r) return no("Esa reseña ya no está.", "That review is gone.");
    if (r.user_id === userId) return no("No puedes reportar tu propia reseña.", "You cannot report your own review.");
    const hoy = (await c.query<{ n: number }>(`select count(*)::int as n from content_reports where reporter_user_id = $1 and created_at > now() - interval '1 day'`, [userId])).rows[0]!.n;
    if (hoy >= 20) return no("Mandaste muchos reportes hoy. Prueba mañana.", "You sent many reports today. Try tomorrow.");
    const ins = await c.query(
      `insert into content_reports (target_kind, target_id, business_id, city_id, reporter_user_id, reason, note) values ('review', $1, $2, $3, $4, $5, $6)
       on conflict (target_kind, target_id, reporter_user_id) do nothing`, [id, r.business_id, r.city_id, userId, motivo, n]);
    if (ins.rowCount) await abrirCaso(c, id, r.business_id, r.city_id);
    return { ok: true, id } as const;
  });
}
export async function abrirCaso(c: PoolClient, reviewId: string, negocio: string, ciudad: string) {
  await c.query(
    `insert into queue_items (queue, subject_kind, subject_id, business_id, city_id) values ('rep', 'review', $1, $2, $3)
     on conflict (queue, subject_kind, subject_id) where status = 'open' do nothing`, [reviewId, negocio, ciudad]);
}

/* APP-NEG-RESENA-ESTADO: la reseña propia y su estado (publicada, el negocio respondió, en revisión, revisada). */
export async function miResena(negocio: string, userId: string) {
  const x = (await db().query<FilaT & { tz: string; estado: string | null; status: string; hidden_reason: string | null; pub: string; rep: string | null; disp: string | null; hasta: string; puede: boolean; pro: boolean; bname: string }>(
    `select ${TARJETA_SQL}, r.review_state as estado, r.status, r.hidden_reason, b.pro, b.name as bname, (select ci.timezone from cities ci where ci.id = r.city_id) as tz,
            to_char((r.created_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as pub, to_char((r.reply_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as rep,
            to_char((r.review_state_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as disp,
            to_char((r.created_at + interval '${EDITAR_H} hours') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hasta, r.created_at > now() - interval '${EDITAR_H} hours' as puede
       from reviews r join users u on u.id = r.user_id cross join ${NEG_SQL}
      where r.business_id = $1 and r.user_id = $2::uuid and r.status <> 'removed' limit 1`, [negocio, userId])).rows[0];
  if (!x) return null;
  return { card: tarjeta(x), estado: x.estado as "disp" | "kept" | null, oculta: x.status === "hidden", motivo: x.hidden_reason, pro: x.pro, negocio: { id: negocio, name: x.bname },
    t: { pub: x.pub, rep: x.rep, disp: x.disp }, hasta: x.hasta, puede: x.puede, tz: x.tz };
}
export type MiResena = NonNullable<Awaited<ReturnType<typeof miResena>>>;

/* ── Panel del negocio (Panel v2 · sub resenas y det rev:) ───────────────────────────────────────────────────────── */
export type FiltroPanel = "all" | "norep" | "5" | "low";
export type FilaPanel = { id: string; stars: number; who: string; text: string; d: number; src: Src; extra: Bi | null; replied: boolean; estado: "disp" | "kept" | null };
const PANEL_SQL = `r.id::text, r.stars, u.first_name, u.last_name, r.body, (now()::date - r.created_at::date) as d, r.src, r.facts, r.answers, r.reply is not null as replied, r.review_state as estado`;
type FilaPanelDb = { id: string; stars: number; first_name: string | null; last_name: string | null; body: string; d: number; src: Src; facts: Hechos; answers: Respuestas; replied: boolean; estado: "disp" | "kept" | null };
/* «Dato del pedido · no se edita» en una línea (Llegó caliente · A tiempo · Vale lo que cuesta). */
function extraDe(x: { src: Src; facts: Hechos; answers: Respuestas }): Bi | null {
  const es: string[] = [], en: string[] = [], dl = x.src === "dl";
  const h = x.answers?.hot, l = x.facts?.late, v = x.answers?.val;
  if (h === 1) { es.push(dl ? "Llegó caliente" : "Caliente"); en.push(dl ? "Arrived hot" : "Hot"); }
  else if (h === 0) { es.push("Tibio"); en.push("Lukewarm"); }
  else if (h === -1) { es.push(dl ? "Llegó frío" : "Frío"); en.push(dl ? "Arrived cold" : "Cold"); }
  if (typeof l === "number") { if (l <= 5) { es.push(dl ? "A tiempo" : "Listo a la hora"); en.push(dl ? "On time" : "Ready on time"); } else { es.push(`${l} min tarde`); en.push(`${l} min late`); } }
  if (v === 1) { es.push("Vale lo que cuesta"); en.push("Worth the price"); } else if (v === -1) { es.push("Caro para lo que es"); en.push("Pricey for what it is"); }
  return es.length ? { es: es.join(" · "), en: en.join(" · ") } : null;
}
const filaPanel = (x: FilaPanelDb): FilaPanel => ({ id: x.id, stars: x.stars, who: nombreCorto(x.first_name, x.last_name), text: x.body, d: x.d, src: x.src, extra: extraDe(x), replied: x.replied, estado: x.estado });

export async function resenasPanel(negocio: string, f: FiltroPanel) {
  const w: Record<FiltroPanel, string> = { all: "true", norep: "r.reply is null", "5": "r.stars = 5", low: "r.stars <= 2" };
  const [k, filas] = await Promise.all([
    db().query<{ n: number; avg: number | null; norep: number; pos: number; ver: number; crit: number }>(
      `select count(*)::int as n, round(avg(stars)::numeric, 1)::float as avg, count(*) filter (where reply is null)::int as norep,
              count(*) filter (where stars >= 4)::int as pos, count(*) filter (where src <> 'vis')::int as ver, count(*) filter (where reply is null and stars <= 3)::int as crit
         from reviews where business_id = $1 and status = 'visible'`, [negocio]),
    db().query<FilaPanelDb>(`select ${PANEL_SQL} from reviews r join users u on u.id = r.user_id where r.business_id = $1 and r.status = 'visible' and ${w[f] ?? "true"} order by r.created_at desc limit 100`, [negocio]),
  ]);
  return { k: k.rows[0]!, filas: filas.rows.map(filaPanel) };
}
export type ResenasPanel = Awaited<ReturnType<typeof resenasPanel>>;

/* Hoy: las que esperan respuesta (solo Pro las responde). */
export async function resenasSinResponder(negocio: string) {
  const r = await db().query<FilaPanelDb>(`select ${PANEL_SQL} from reviews r join users u on u.id = r.user_id where r.business_id = $1 and r.status = 'visible' and r.reply is null order by r.created_at desc limit 5`, [negocio]);
  return r.rows.map(filaPanel);
}

export async function resenaPanel(negocio: string, id: string) {
  if (!/^\d{1,18}$/.test(id)) return null;
  const x = (await db().query<FilaPanelDb & { reply: string | null }>(`select ${PANEL_SQL}, r.reply from reviews r join users u on u.id = r.user_id where r.business_id = $1 and r.id = $2::bigint and r.status = 'visible'`, [negocio, id])).rows[0];
  return x ? { ...filaPanel(x), reply: x.reply } : null;
}
export type ResenaPanelDet = NonNullable<Awaited<ReturnType<typeof resenaPanel>>>;

/* El negocio Pro responde una vez (5 a 300 letras). Free no responde. */
export async function responderResena(negocio: string, id: string, texto: string, actorId: string): Promise<Res> {
  const t = String(texto ?? "").trim();
  if (t.length < 5) return no("Escribe al menos 5 letras.", "Write at least 5 characters.");
  if (t.length > 300) return no("Máximo 300 letras.", "300 characters max.");
  if (!/^\d{1,18}$/.test(id)) return no("Esa reseña no existe.", "That review does not exist.");
  const pro = (await db().query<{ pro: boolean }>(`select coalesce(plan, 'free') = 'pro' as pro from business_stats_cache where business_id = $1`, [negocio])).rows[0]?.pro;
  if (!pro) return no("Responder reseñas es de Pro.", "Replying to reviews is a Pro feature.");
  const r = await db().query<{ id: string }>(
    `update reviews set reply = $3, reply_at = now(), reply_by = $4 where business_id = $1 and id = $2::bigint and status = 'visible' and reply is null returning id::text`, [negocio, id, t, actorId]);
  return r.rows[0] ? { ok: true, id } : no("Esta reseña ya tiene respuesta o ya no está.", "This review already has a reply or is gone.");
}

/* «Pedir revisión a To'Latino»: la reseña sigue visible; entra a la cola Reportes de contenido (48 h). */
export async function pedirRevision(negocio: string, id: string, actorId: string): Promise<Res> {
  if (!/^\d{1,18}$/.test(id)) return no("Esa reseña no existe.", "That review does not exist.");
  return tx(async (c) => {
    const r = (await c.query<{ city_id: string; estado: string | null }>(`select city_id, review_state as estado from reviews where business_id = $1 and id = $2::bigint and status = 'visible' for update`, [negocio, id])).rows[0];
    if (!r) return no("Esa reseña ya no está.", "That review is gone.");
    if (r.estado) return no("Ya pediste revisarla.", "You already asked for a review.");
    await c.query(`update reviews set review_state = 'disp', review_state_at = now() where id = $1::bigint`, [id]);
    await c.query(
      `insert into content_reports (target_kind, target_id, business_id, city_id, reporter_user_id, by_business, reason) values ('review', $1, $2, $3, $4, true, 'negocio')
       on conflict (target_kind, target_id, reporter_user_id) do update set status = 'open', by_business = true, reason = 'negocio', created_at = now()`, [id, negocio, r.city_id, actorId]);
    await abrirCaso(c, id, negocio, r.city_id);
    return { ok: true, id } as const;
  });
}
