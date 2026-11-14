import "server-only";
import type { PoolClient } from "pg";
import { db, tx } from "./db";
import { detectarIdioma } from "./traductor";
import { quedanEnHoy } from "./hoy";

/* Novedades (prototipo novVals / panel sub 'nov' / det 'nov:'; modelo «BusinessPost»). Solo Pro. En vivo, programada y
   terminada se derivan de las fechas; «oculta» = la ocultó To'Latino. La oferta se cobra de verdad: el menú y el pedido
   usan oferta_precio() mientras está en vivo. Votos, encuesta, guardar, comentarios y seguir piden sesión. */
type Bi = { es: string; en: string };
export type Tipo = "oferta" | "hoy" | "aviso" | "encuesta" | "novedad";
export type Enlace = "none" | "item" | "menu" | "tel" | "web" | "event" | "job";
export const TIPOS: Tipo[] = ["oferta", "hoy", "aviso", "encuesta", "novedad"];
export const MAX_FOTOS_POST = 4;
const nombreCorto = (f: string | null, l: string | null) => `${(f ?? "").trim()}${l ? ` ${l.trim().slice(0, 1).toUpperCase()}.` : ""}`.trim() || "Vecino";
const iso = (col: string) => `to_char((${col}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

/* El estado que ve el dueño: en vivo, programada, terminada (detenida o vencida) u oculta por To'Latino. */
const ESTADO_SQL = `case when p.hidden_at is not null then 'adm' when p.status = 'stopped' or (p.ends_at is not null and p.ends_at <= now()) then 'done'
                         when p.publish_at > now() then 'prog' else 'live' end`;

export type Comentario = { id: string; name: string; ini: string; h: number; body: string; lang: "es" | "en"; up: number; mine: boolean; reply: string | null; propio: boolean };
export type Post = {
  id: string; kind: Tipo; title: string; body: string; fotos: string[]; h: number; pinned: boolean; ends: string | null;
  link: Enlace; item: { id: string; name: Bi; ph: string | null; cents: number } | null; url: string | null;
  /* 6b · Una novedad con enlace a un evento: su próxima fecha en vivo (si no está en vivo, la novedad no sale: post_en_vivo). */
  evento: { href: string; t: Bi; dia: string } | null;
  /* 9n-2 · Una novedad con botón «Ver vacante»: la vacante abierta (si ya no está abierta, el botón no sale). */
  vacante: { href: string; t: Bi } | null;
  was: number | null; now: number | null; aviso: { day: string; hrs: string; hrsT: string } | null;
  poll: { opts: { l: string; n: number }[]; mine: number | null; total: number; closesH: number | null } | null;
  score: number; myVote: number; saved: boolean; cm: Comentario[];
  /* 5e · horas que le quedan en Hoy en el barrio (null = no sale en Hoy). */
  hoy: number | null;
};

/* Pestaña Novedades de la ficha. Las de «solo seguidores» solo las ve quien sigue. */
export async function novedadesFicha(negocio: string, userId: string | null) {
  const b = (await db().query<{ name: string; pro: boolean; on: boolean; tel: string | null; fol: boolean; seguidores: number }>(
    `select b.name, coalesce(s.plan, 'free') = 'pro' as pro, ('nov' = any(b.modules_on) and not (b.modules_off ? 'nov')) as on, b.phone as tel,
            coalesce($2::uuid is not null and exists (select 1 from follows f where f.follower_user_id = $2::uuid and f.target_kind = 'business' and f.target_id = b.id), false) as fol,
            (select count(*)::int from follows f where f.target_kind = 'business' and f.target_id = b.id) as seguidores
       from businesses b left join business_stats_cache s on s.business_id = b.id where b.id = $1 and b.status = 'active'`, [negocio, userId])).rows[0];
  if (!b || !b.pro || !b.on) return null;
  const r = await db().query<{
    id: string; kind: Tipo; title: string; body: string; fotos: string[]; h: number; pinned: boolean; ends: string | null; link_kind: Enlace; url: string | null;
    was: number | null; now: number | null; aviso: Post["aviso"]; poll: string[] | null; poll_n: number[]; poll_mine: number | null; closes_h: number | null;
    score: number; my_vote: number; saved: boolean; item_id: string | null; item_name: Bi | null; item_ph: string | null; item_cents: number | null; ev: { href: string; t: Bi; dia: string } | null; vac: { href: string; t: Bi } | null;
  }>(
    `select p.id::text, p.kind, p.title, p.body, p.pinned, p.link_kind, p.url, p.price_was_cents as was, p.price_now_cents as now, p.aviso, p.poll,
            floor(extract(epoch from now() - p.publish_at) / 3600)::int as h, ${iso("p.ends_at")} as ends,
            case when p.ends_at is null then null else ceil(extract(epoch from p.ends_at - now()) / 3600)::int end as closes_h,
            (select coalesce(array_agg(m.url order by m.sort, m.created_at), '{}') from media m where m.owner_kind = 'post' and m.owner_id = p.id::text and m.status = 'visible') as fotos,
            array(select (select count(*)::int from post_poll_votes v where v.post_id = p.id and v.opt = o) from generate_series(0, coalesce(cardinality(p.poll), 0) - 1) o) as poll_n,
            (select v.opt from post_poll_votes v where v.post_id = p.id and v.user_id = $2::uuid) as poll_mine,
            coalesce((select sum(v.v)::int from post_votes v where v.post_id = p.id), 0) as score,
            coalesce((select v.v from post_votes v where v.post_id = p.id and v.user_id = $2::uuid), 0) as my_vote,
            coalesce($2::uuid is not null and exists (select 1 from post_saves s where s.post_id = p.id and s.user_id = $2::uuid), false) as saved,
            i.id::text as item_id, i.name as item_name, i.photos[1] as item_ph, coalesce(oferta_precio(i.id, $2::uuid), i.price_cents) as item_cents,
            case when p.link_kind = 'event' then (select json_build_object('href', '/eventos/' || e.slug || '?fecha=' || d.id, 't', e.title, 'dia', d.local_date::text) from events e join event_dates d on d.event_id = e.id
                                                   where e.id = p.event_id and d.listable and d.ends_at > now() order by d.starts_at limit 1) end as ev,
            case when p.link_kind = 'job' then (select json_build_object('href', '/n/' || p.business_id || '/empleo/' || j.id, 't', j.title) from job_postings j where j.id = p.job_id and j.business_id = p.business_id and vacante_en_vivo(j)) end as vac
       from business_posts p left join items i on i.id = p.item_id and i.removed_at is null and i.status = 'live'
      where p.business_id = $1 and post_en_vivo(p)
        and (p.audience = 'all' or exists (select 1 from follows f where f.follower_user_id = $2::uuid and f.target_kind = 'business' and f.target_id = p.business_id))
      order by p.pinned desc, p.publish_at desc limit 50`, [negocio, userId]);
  const ids = r.rows.map((x) => x.id), enHoy = ids.length ? await quedanEnHoy(negocio) : new Map<string, number>();
  const cms = ids.length ? (await db().query<{ id: string; post: string; first_name: string | null; last_name: string | null; h: number; body: string; lang: "es" | "en"; up: number; mine: boolean; reply: string | null; propio: boolean }>(
    `select c.id::text, c.post_id::text as post, u.first_name, u.last_name, floor(extract(epoch from now() - c.created_at) / 3600)::int as h, c.body, c.lang, c.reply,
            (select count(*)::int from post_comment_votes v where v.comment_id = c.id) as up,
            coalesce($2::uuid is not null and exists (select 1 from post_comment_votes v where v.comment_id = c.id and v.user_id = $2::uuid), false) as mine,
            c.user_id = $2::uuid as propio
       from post_comments c join users u on u.id = c.user_id where c.post_id = any($1::bigint[]) and c.status = 'visible' order by c.created_at limit 500`, [ids, userId])).rows : [];
  const posts: Post[] = r.rows.map((x) => ({
    id: x.id, kind: x.kind, title: x.title, body: x.body, fotos: x.fotos, h: Math.max(0, x.h), pinned: x.pinned, ends: x.ends, link: x.link_kind, url: x.url, was: x.was, now: x.now, aviso: x.aviso,
    item: x.item_id && x.item_name ? { id: x.item_id, name: x.item_name, ph: x.item_ph, cents: x.item_cents ?? 0 } : null, evento: x.ev, vacante: x.vac,
    poll: x.poll ? { opts: x.poll.map((l, i) => ({ l, n: x.poll_n[i] ?? 0 })), mine: x.poll_mine, total: x.poll_n.reduce((a, n) => a + n, 0), closesH: x.closes_h } : null,
    score: x.score, myVote: x.my_vote, saved: x.saved, hoy: enHoy.get(x.id) ?? null,
    cm: cms.filter((c) => c.post === x.id).map((c) => { const name = nombreCorto(c.first_name, c.last_name); return { id: c.id, name, ini: name.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase(), h: Math.max(0, c.h), body: c.body, lang: c.lang, up: c.up, mine: c.mine, reply: c.reply, propio: c.propio }; }),
  }));
  return { negocio: { id: negocio, name: b.name, tel: b.tel }, fol: b.fol, seguidores: b.seguidores, posts };
}
export type NovedadesFicha = NonNullable<Awaited<ReturnType<typeof novedadesFicha>>>;

/* Una vista por persona (o dispositivo) y día. */
export async function verNovedades(negocio: string, viewer: string) {
  await db().query(
    `insert into post_views (post_id, viewer) select p.id, $2 from business_posts p where p.business_id = $1 and post_en_vivo(p) on conflict do nothing`, [negocio, viewer.slice(0, 80)]);
}

type Res = { ok: true } | { ok: false; msg: Bi };
const no = (es: string, en: string): Res => ({ ok: false, msg: { es, en } });
/* La publicación sale ahora y la persona puede verla (las de «solo seguidores», si sigue). */
async function visible(c: PoolClient, id: string, userId: string) {
  if (!/^\d{1,18}$/.test(id)) return null;
  return (await c.query<{ id: string; kind: Tipo; poll: string[] | null; business_id: string }>(
    `select p.id::text, p.kind, p.poll, p.business_id from business_posts p where p.id = $1::bigint and post_en_vivo(p)
        and (p.audience = 'all' or exists (select 1 from follows f where f.follower_user_id = $2 and f.target_kind = 'business' and f.target_id = p.business_id)) for share`, [id, userId])).rows[0] ?? null;
}
const NO_ESTA = () => no("Esta publicación ya no está.", "This post is no longer available.");

export async function votarPost(userId: string, id: string, v: number): Promise<Res> {
  if (v !== 1 && v !== -1) return no("Voto no válido.", "Invalid vote.");
  return tx(async (c) => {
    if (!(await visible(c, id, userId))) return NO_ESTA();
    const cur = (await c.query<{ v: number }>(`select v from post_votes where post_id = $1::bigint and user_id = $2`, [id, userId])).rows[0]?.v;
    if (cur === v) await c.query(`delete from post_votes where post_id = $1::bigint and user_id = $2`, [id, userId]);
    else await c.query(`insert into post_votes (post_id, user_id, v) values ($1::bigint, $2, $3) on conflict (post_id, user_id) do update set v = excluded.v, created_at = now()`, [id, userId, v]);
    return { ok: true } as const;
  });
}
export async function votarEncuesta(userId: string, id: string, opt: number): Promise<Res> {
  return tx(async (c) => {
    const p = await visible(c, id, userId);
    if (!p || p.kind !== "encuesta" || !p.poll) return NO_ESTA();
    if (!Number.isInteger(opt) || opt < 0 || opt >= p.poll.length) return no("Esa opción no existe.", "That option does not exist.");
    const r = await c.query(`insert into post_poll_votes (post_id, user_id, opt) values ($1::bigint, $2, $3) on conflict do nothing`, [id, userId, opt]);
    return r.rowCount ? ({ ok: true } as const) : no("Ya votaste en esta encuesta.", "You already voted in this poll.");
  });
}
export async function guardarPost(userId: string, id: string): Promise<Res> {
  return tx(async (c) => {
    if (!(await visible(c, id, userId))) return NO_ESTA();
    const d = await c.query(`delete from post_saves where post_id = $1::bigint and user_id = $2`, [id, userId]);
    if (!d.rowCount) await c.query(`insert into post_saves (post_id, user_id) values ($1::bigint, $2)`, [id, userId]);
    return { ok: true } as const;
  });
}
export async function comentarPost(userId: string, id: string, texto: string): Promise<Res> {
  const t = String(texto ?? "").trim();
  if (!t) return no("Escribe tu comentario.", "Write your comment.");
  if (t.length > 300) return no("Máximo 300 letras.", "300 characters max.");
  const det = await detectarIdioma(t); // 5h: antes de la transacción; si no se sabe, el idioma de la app de quien comenta
  return tx(async (c) => {
    if (!(await visible(c, id, userId))) return NO_ESTA();
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from post_comments where user_id = $1 and created_at > now() - interval '1 hour'`, [userId])).rows[0]!.n;
    if (n >= 30) return no("Escribiste muchos comentarios seguidos. Prueba en un rato.", "Too many comments in a row. Try again later.");
    await c.query(`insert into post_comments (post_id, user_id, body, lang) values ($1::bigint, $2, $3, coalesce($4, (select case when u.lang = 'en' then 'en' else 'es' end from users u where u.id = $2), 'es'))`, [id, userId, t, det]);
    return { ok: true } as const;
  });
}
export async function likeComentario(userId: string, id: string): Promise<Res> {
  if (!/^\d{1,18}$/.test(id)) return no("Ese comentario no existe.", "That comment does not exist.");
  return tx(async (c) => {
    const k = (await c.query<{ post: string; user_id: string }>(`select post_id::text as post, user_id from post_comments where id = $1::bigint and status = 'visible'`, [id])).rows[0];
    if (!k || !(await visible(c, k.post, userId))) return no("Ese comentario ya no está.", "That comment is gone.");
    const d = await c.query(`delete from post_comment_votes where comment_id = $1::bigint and user_id = $2`, [id, userId]);
    if (!d.rowCount) await c.query(`insert into post_comment_votes (comment_id, user_id) values ($1::bigint, $2)`, [id, userId]);
    return { ok: true } as const;
  });
}
/* Seguir / dejar de seguir un negocio (Seguir negocios = Favoritos del plan: avisos de ofertas y cambios). */
export async function seguirNegocio(userId: string, negocio: string): Promise<{ ok: true; fol: boolean } | { ok: false; msg: Bi }> {
  return tx(async (c) => {
    const b = (await c.query(`select 1 from businesses where id = $1 and status = 'active'`, [negocio])).rowCount;
    if (!b) return { ok: false as const, msg: { es: "Ese negocio no existe.", en: "That business does not exist." } };
    const d = await c.query(`delete from follows where follower_user_id = $1 and target_kind = 'business' and target_id = $2`, [userId, negocio]);
    if (!d.rowCount) await c.query(`insert into follows (follower_user_id, target_kind, target_id) values ($1, 'business', $2)`, [userId, negocio]);
    return { ok: true as const, fol: !d.rowCount };
  });
}

/* ── Panel (Tu página › Novedades) ─────────────────────────────────────────────────────────────────────────── */
export type FilaNov = {
  id: string; kind: Tipo; title: string; body: string; st: "live" | "prog" | "done" | "adm"; hidden: string | null; pinned: boolean;
  publish: string; ends: string | null; views: number; saves: number; cm: number; tz: string;
  /* 5e · Hoy en el barrio: horas que le quedan (null = no sale) y, si To'Latino la retiró de Hoy, el motivo. */
  hoy: number | null; hoyOff: string | null;
};
const FILA_NOV = `p.id::text, p.kind, p.title, p.body, ${ESTADO_SQL} as st, p.hidden_reason as hidden, p.pinned, ${iso("p.publish_at")} as publish, ${iso("p.ends_at")} as ends,
  (select count(*)::int from post_views v where v.post_id = p.id) as views, (select count(*)::int from post_saves s where s.post_id = p.id) as saves,
  (select count(*)::int from post_comments c where c.post_id = p.id and c.status = 'visible') as cm, ci.timezone as tz,
  case when post_en_hoy(p) then greatest(1, ceil(extract(epoch from least(p.publish_at + interval '24 hours', coalesce(p.ends_at, 'infinity'::timestamptz)) - now()) / 3600))::int end as hoy,
  p.hoy_off_reason as "hoyOff"`;
export async function novedadesPanel(negocio: string) {
  const [L, m] = await Promise.all([
    db().query<FilaNov>(`select ${FILA_NOV} from business_posts p join cities ci on ci.id = p.city_id where p.business_id = $1 and p.status <> 'removed'
      order by case ${ESTADO_SQL} when 'live' then 0 when 'prog' then 1 when 'adm' then 2 else 3 end, p.publish_at desc limit 100`, [negocio]),
    db().query<{ on: boolean; off: { reason: string } | null; seguidores: number }>(
      `select 'nov' = any(modules_on) as on, modules_off->'nov' as off, (select count(*)::int from follows f where f.target_kind = 'business' and f.target_id = b.id) as seguidores from businesses b where b.id = $1`, [negocio]),
  ]);
  return { filas: L.rows, on: m.rows[0]?.on ?? false, pausa: m.rows[0]?.off?.reason ?? null, seguidores: m.rows[0]?.seguidores ?? 0 };
}
/* 6b · El botón «Evento» del editor: los eventos del negocio que puede llevar una novedad (la novedad sale solo con el evento en vivo). */
export async function eventosNovedad(negocio: string) {
  return (await db().query<{ id: string; t: Bi; dia: string; vivo: boolean }>(
    `select e.id::text, e.title as t, e.start_date::text as dia, exists (select 1 from event_dates d where d.event_id = e.id and d.listable and d.ends_at > now()) as vivo
       from events e where e.business_id = $1 and e.status not in ('cancelled', 'rejected', 'done') order by e.start_date, e.id limit 40`, [negocio])).rows;
}
/* 9n-2 · Las vacantes abiertas del negocio para el botón «Ver vacante» de una novedad. */
export async function vacantesNovedad(negocio: string) {
  return (await db().query<{ id: string; t: Bi }>(`select j.id::text, j.title as t from job_postings j where j.business_id = $1 and j.status = 'live' and j.hidden_at is null order by j.published_at desc nulls last, j.id desc limit 40`, [negocio])).rows;
}
export type NovPanel = Awaited<ReturnType<typeof novedadesPanel>>;

export type NovEdit = {
  id: string; kind: Tipo; title: string; body: string; link: Enlace; item: string | null; url: string; was: number | null; now: number | null;
  aviso: { day: string; hrs: string; hrsT: string } | null; poll: string[]; audience: "all" | "fol"; fotos: { id: string; url: string }[]; evento: string | null; job: string | null;
};
export async function novedadPanel(negocio: string, id: string) {
  if (!/^\d{1,18}$/.test(id)) return null;
  const p = (await db().query<FilaNov & { link_kind: Enlace; item_id: string | null; url: string | null; was: number | null; now: number | null; aviso: NovEdit["aviso"]; poll: string[] | null; audience: "all" | "fol"; item_name: Bi | null; item_ph: string | null; item_cents: number | null; event_id: string | null; job_id: string | null; avisada: boolean }>(
    `select ${FILA_NOV}, p.link_kind, p.item_id::text, p.url, p.price_was_cents as was, p.price_now_cents as now, p.aviso, p.poll, p.audience, p.event_id::text as event_id, p.job_id::text as job_id, p.followers_notified_at is not null as avisada,
            i.name as item_name, i.photos[1] as item_ph, i.price_cents as item_cents
       from business_posts p join cities ci on ci.id = p.city_id left join items i on i.id = p.item_id
      where p.business_id = $1 and p.id = $2::bigint and p.status <> 'removed'`, [negocio, id])).rows[0];
  if (!p) return null;
  const [fotos, cms] = await Promise.all([
    db().query<{ id: string; url: string }>(`select id::text, url from media where owner_kind = 'post' and owner_id = $1 and status = 'visible' order by sort, created_at`, [id]),
    db().query<{ id: string; first_name: string | null; last_name: string | null; body: string; h: number; up: number; reply: string | null }>(
      `select c.id::text, u.first_name, u.last_name, c.body, floor(extract(epoch from now() - c.created_at) / 3600)::int as h, c.reply,
              (select count(*)::int from post_comment_votes v where v.comment_id = c.id) as up
         from post_comments c join users u on u.id = c.user_id where c.post_id = $1::bigint and c.status = 'visible' order by c.created_at`, [id]),
  ]);
  // 9n-2 · PEDIDOS que salieron de la novedad (L310): en una OFERTA, los pedidos entregados o en curso con ese plato al precio de la oferta mientras estuvo en vivo
  // (el precio de la oferta es el que se cobra: oferta_precio). Se calcula al leer; nada se guarda dos veces.
  const ped = p.kind === "oferta" && p.item_id && p.now ? (await db().query<{ n: number; uds: number; cents: number }>(
    `select count(distinct o.id)::int as n, coalesce(sum(l.qty), 0)::int as uds, coalesce(sum(l.line_total_cents), 0)::int as cents
       from operation_lines l join operations o on o.id = l.operation_id join business_posts bp on bp.id = $1::bigint
      where o.business_id = $2 and o.kind = 'order' and o.status in ('pending', 'confirmed', 'done') and l.item_id = bp.item_id and l.unit_price_cents = bp.price_now_cents
        and o.sent_at >= bp.publish_at and o.sent_at <= coalesce(bp.stopped_at, bp.ends_at, now())`, [id, negocio])).rows[0]! : null;
  return {
    ...p, pedidos: ped, fotos: fotos.rows, item: p.item_id && p.item_name ? { id: p.item_id, name: p.item_name, ph: p.item_ph, cents: p.item_cents ?? 0 } : null,
    cms: cms.rows.map((c) => ({ id: c.id, name: nombreCorto(c.first_name, c.last_name), body: c.body, h: Math.max(0, c.h), up: c.up, reply: c.reply })),
  };
}
export type NovPanelDet = NonNullable<Awaited<ReturnType<typeof novedadPanel>>>;

/* Guardar (nueva o editar). El servidor revisa todo: tipo, título, plato del negocio, precios de oferta (menor que el
   normal; el normal sale del menú si no se dice), encuesta de 2 a 4 opciones, enlace https, fotos propias (hasta 4),
   cuándo sale (ahora o una fecha futura) y cuándo vence. */
export type NovIn = {
  id?: string | null; kind: string; title: string; body?: string; link?: string; item?: string | null; url?: string; was?: number | null; now?: number | null;
  aviso?: { day?: string; hrs?: string; hrsT?: string } | null; poll?: string[]; audience?: string; ends?: string; prog?: { d: number; m: number } | null; fotos?: string[];
  evento?: string | null; job?: string | null; avisar?: boolean;
};
export async function guardarNovedad(negocio: string, p: NovIn, actorId: string): Promise<{ ok: true; id: string } | { ok: false; msg: Bi }> {
  const kind = TIPOS.includes(p.kind as Tipo) ? (p.kind as Tipo) : null;
  if (!kind) return { ok: false, msg: { es: "Elige qué publicas.", en: "Pick what you post." } };
  const title = String(p.title ?? "").trim().slice(0, 60), body = String(p.body ?? "").trim().slice(0, 280);
  if (title.length < 3) return { ok: false, msg: { es: "Ponle un título de 3 letras o más.", en: "Give it a title of 3+ characters." } };
  const linkOk: Enlace[] = kind === "oferta" ? ["item"] : kind === "hoy" || kind === "novedad" ? ["none", "item", "menu", "tel", "web", "event", "job"] : ["none"];
  const link = (linkOk.includes(p.link as Enlace) ? p.link : linkOk[0]) as Enlace;
  const fotos = Array.isArray(p.fotos) ? [...new Set(p.fotos.filter((x): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/.test(x)))] : [];
  if (fotos.length > MAX_FOTOS_POST) return { ok: false, msg: { es: "Hasta 4 fotos.", en: "Up to 4 photos." } };
  const poll = kind === "encuesta" ? (Array.isArray(p.poll) ? p.poll : []).map((x) => String(x ?? "").trim().slice(0, 40)).filter(Boolean) : [];
  if (kind === "encuesta" && (poll.length < 2 || poll.length > 4)) return { ok: false, msg: { es: "Pon al menos 2 opciones.", en: "Add at least 2 options." } };
  const url = link === "web" ? String(p.url ?? "").trim() : "";
  if (link === "web" && !/^https:\/\/[^\s/$.?#].[^\s]*$/i.test(url)) return { ok: false, msg: { es: "El enlace tiene que empezar con https://", en: "The link must start with https://" } };
  const HRS = ["closed", "late", "early", "ext"];
  const aviso = kind === "aviso" ? { day: String(p.aviso?.day ?? "").trim().slice(0, 30), hrs: HRS.includes(String(p.aviso?.hrs)) ? String(p.aviso?.hrs) : "closed", hrsT: String(p.aviso?.hrsT ?? "").trim().slice(0, 30) } : null;
  if (aviso && !aviso.day) return { ok: false, msg: { es: "Di qué día.", en: "Say which day." } };
  const audience = p.audience === "fol" ? "fol" : "all";
  const ENDS = ["3pm", "24h", "semana", "no"], ends = ENDS.includes(String(p.ends)) ? String(p.ends) : "24h";
  return tx(async (c) => {
    const b = (await c.query<{ city_id: string; tz: string; pro: boolean }>(
      `select b.city_id, ci.timezone as tz, coalesce(s.plan, 'free') = 'pro' as pro from businesses b join cities ci on ci.id = b.city_id left join business_stats_cache s on s.business_id = b.id where b.id = $1 for update of b`, [negocio])).rows[0];
    if (!b) return { ok: false as const, msg: { es: "Ese negocio no existe.", en: "That business does not exist." } };
    if (!b.pro) return { ok: false as const, msg: { es: "Novedades es de Pro.", en: "Updates is a Pro feature." } };
    let item: { id: string; cents: number } | null = null;
    if (link === "item") {
      item = /^\d{1,18}$/.test(String(p.item ?? "")) ? (await c.query<{ id: string; cents: number }>(`select id::text, price_cents as cents from items where id = $1::bigint and business_id = $2 and removed_at is null`, [p.item, negocio])).rows[0] ?? null : null;
      if (!item) return { ok: false as const, msg: { es: "Elige qué está en oferta.", en: "Pick what is on sale." } };
    }
    // 6b · «Ver evento»: un evento de este negocio que no esté cancelado, no aprobado ni terminado.
    let evento: string | null = null;
    if (link === "event") {
      evento = /^\d{1,18}$/.test(String(p.evento ?? "")) ? (await c.query<{ id: string }>(`select id::text from events where id = $1::bigint and business_id = $2 and status not in ('cancelled', 'rejected', 'done')`, [p.evento, negocio])).rows[0]?.id ?? null : null;
      if (!evento) return { ok: false as const, msg: { es: "Elige el evento del botón.", en: "Pick the event for the button." } };
    }
    // 9n-2 · «Ver vacante»: una vacante ABIERTA de este negocio.
    let job: string | null = null;
    if (link === "job") {
      job = /^\d{1,18}$/.test(String(p.job ?? "")) ? (await c.query<{ id: string }>(`select id::text from job_postings where id = $1::bigint and business_id = $2 and status = 'live' and hidden_at is null`, [p.job, negocio])).rows[0]?.id ?? null : null;
      if (!job) return { ok: false as const, msg: { es: "Elige la vacante del botón.", en: "Pick the opening for the button." } };
    }
    let was: number | null = null, now: number | null = null;
    if (kind === "oferta") {
      // El precio normal es siempre el del menú (nada de «antes» inventados); la oferta tiene que ser menor.
      now = Math.round(Number(p.now) * 100); was = item!.cents;
      if (!(now > 0) || !(was > 0)) return { ok: false as const, msg: { es: "Pon el precio normal y el de la oferta.", en: "Set the regular and the deal price." } };
      if (now >= was) return { ok: false as const, msg: { es: "El precio de la oferta tiene que ser menor que el normal.", en: "The deal price must be lower than the regular one." } };
    }
    // Cuándo sale: ahora o un día de esta semana a una hora (en la hora del negocio). Cuándo vence: hoy 3 PM, 24 h,
    // esta semana o sin fecha.
    const pd = p.prog && Number.isInteger(p.prog.d) && p.prog.d >= 0 && p.prog.d <= 6 && Number.isInteger(p.prog.m) && p.prog.m >= 0 && p.prog.m < 1440 ? p.prog : null;
    const pubQ = pd ? (await c.query<{ pub: string; ok: boolean }>(
      `select x::text as pub, x > now() as ok from (select (date_trunc('day', now() at time zone $1) + make_interval(days => $2::int, mins => $3::int)) at time zone $1 as x) y`, [b.tz, pd.d, pd.m])).rows[0]! : null;
    if (pubQ && !pubQ.ok) return { ok: false as const, msg: { es: "Esa hora ya pasó. Elige una que venga.", en: "That time has passed. Pick an upcoming one." } };
    const pub = pubQ ? new Date(pubQ.pub) : null;
    const t = (await c.query<{ pub: string; fin: string | null }>(
      `with x as (select coalesce($1::timestamptz, now()) as pub)
       select pub::text, (case $2 when '3pm' then (date_trunc('day', pub at time zone $3) + interval '15 hours') at time zone $3
                                  when '24h' then pub + interval '24 hours'
                                  when 'semana' then (date_trunc('week', pub at time zone $3) + interval '6 days 23 hours 59 minutes') at time zone $3
                                  else null end)::text as fin from x`, [pub ? pub.toISOString() : null, ends, b.tz])).rows[0]!;
    if (t.fin && new Date(t.fin) <= new Date(t.pub)) return { ok: false as const, msg: { es: "Ya pasaron las 3 PM de ese día: elige otro vencimiento.", en: "3 PM has already passed that day: pick another end." } };
    const vals = [kind, title, body, link, item?.id ?? null, url || null, was, now, aviso, kind === "encuesta" ? poll : null, audience, t.pub, t.fin, evento, job];
    let id: string;
    if (p.id) {
      if (!/^\d{1,18}$/.test(String(p.id))) return { ok: false as const, msg: { es: "Esa publicación no existe.", en: "That post does not exist." } };
      const u = await c.query<{ id: string }>(
        `update business_posts set kind = $3, title = $4, body = $5, link_kind = $6, item_id = $7, url = $8, price_was_cents = $9, price_now_cents = $10, aviso = $11, poll = $12,
                audience = $13, publish_at = $14, ends_at = $15, event_id = $16::bigint, job_id = $17::bigint, status = 'live', stopped_at = null, updated_at = now()
          where id = $1::bigint and business_id = $2 and status <> 'removed' and hidden_at is null returning id::text`, [p.id, negocio, ...vals]);
      if (!u.rows[0]) return { ok: false as const, msg: { es: "Esa publicación ya no se puede editar.", en: "That post can no longer be edited." } };
      id = u.rows[0].id;
    } else {
      const n = (await c.query<{ n: number }>(`select count(*)::int as n from business_posts where business_id = $1 and created_at > now() - interval '1 day'`, [negocio])).rows[0]!.n;
      if (n >= 20) return { ok: false as const, msg: { es: "Publicaste muchas novedades hoy. Prueba mañana.", en: "You posted many updates today. Try tomorrow." } };
      id = (await c.query<{ id: string }>(
        `insert into business_posts (business_id, city_id, kind, title, body, link_kind, item_id, url, price_was_cents, price_now_cents, aviso, poll, audience, publish_at, ends_at, event_id, job_id, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::bigint, $17::bigint, $18) returning id::text`, [negocio, b.city_id, ...vals, actorId])).rows[0]!.id;
      // Publicar la primera enciende Novedades en la página (el dueño lo puede apagar).
      await c.query(`update businesses set modules_on = array(select distinct x from unnest(modules_on || array['nov']) x) where id = $1 and not ('nov' = any(modules_on))`, [negocio]);
    }
    // 9n-2 · Fotos de TU GALERÍA (L301): las de la página del negocio se COPIAN a la novedad (la galería no cambia); las subidas nuevas pasan como siempre.
    const gal = fotos.length ? (await c.query<{ id: string }>(`select id::text from media where id = any($1::uuid[]) and owner_kind = 'business' and owner_id = $2 and status = 'visible' and not private`, [fotos, negocio])).rows.map((x) => x.id) : [];
    for (let i = 0; i < fotos.length; i++) {
      if (!gal.includes(fotos[i]!)) continue;
      const n = (await c.query<{ id: string }>(`insert into media (owner_kind, owner_id, url, w, h, credit, sort, uploaded_by) select 'post', $1, url, w, h, credit, 0, $3 from media where id = $2::uuid returning id::text`, [id, fotos[i], actorId])).rows[0]!;
      fotos[i] = n.id;
    }
    if (fotos.length) {
      const ok = await c.query(
        `update media set owner_kind = 'post', owner_id = $1, sort = array_position($3::uuid[], id)
          where id = any($3::uuid[]) and status = 'visible' and ((owner_kind = 'user' and uploaded_by = $2) or (owner_kind = 'post' and owner_id = $1))`, [id, actorId, fotos]);
      if (ok.rowCount !== fotos.length) throw Object.assign(new Error("foto ajena"), { fotoAjena: true });
    }
    await c.query(`update media set status = 'removed', removed_reason = 'autor', removed_at = now() where owner_kind = 'post' and owner_id = $1 and status = 'visible' and not (id = any($2::uuid[]))`, [id, fotos]);
    return { ok: true as const, id };
  }).catch((e: { fotoAjena?: boolean }) => (e?.fotoAjena ? { ok: false as const, msg: { es: "Una de las fotos ya no está. Súbela otra vez.", en: "One of the photos is gone. Upload it again." } } : Promise.reject(e)));
}

/* Acciones de una fila: detener, publicar ya, publicar de nuevo (24 h), fijar (una a la vez), quitar. */
export type PasoNov = "detener" | "ya" | "otravez" | "fijar" | "desfijar" | "quitar";
export async function pasoNovedad(negocio: string, id: string, paso: PasoNov): Promise<Res> {
  if (!/^\d{1,18}$/.test(id)) return no("Esa publicación no existe.", "That post does not exist.");
  return tx(async (c) => {
    const p = (await c.query<{ st: string }>(`select ${ESTADO_SQL} as st from business_posts p where p.business_id = $1 and p.id = $2::bigint and p.status <> 'removed' for update`, [negocio, id])).rows[0];
    if (!p) return no("Esa publicación ya no está.", "That post is gone.");
    if (p.st === "adm" && paso !== "quitar") return no("To'Latino ocultó esta publicación.", "To'Latino hid this post.");
    const Q: Record<PasoNov, [string[], string]> = {
      detener: [["live", "prog"], `status = 'stopped', stopped_at = now(), pinned = false`],
      ya: [["prog"], `publish_at = now(), ends_at = case when ends_at is null then null else now() + (ends_at - publish_at) end`],
      otravez: [["done"], `status = 'live', stopped_at = null, publish_at = now(), ends_at = now() + interval '24 hours'`],
      fijar: [["live"], `pinned = true`],
      desfijar: [["live", "prog", "done"], `pinned = false`],
      quitar: [["live", "prog", "done", "adm"], `status = 'removed', pinned = false`],
    };
    const [desde, set] = Q[paso];
    if (!desde.includes(p.st)) return no("Esta publicación ya cambió. Actualiza la pantalla.", "This post already changed. Refresh the screen.");
    if (paso === "fijar") await c.query(`update business_posts set pinned = false, updated_at = now() where business_id = $1 and pinned`, [negocio]);
    await c.query(`update business_posts set ${set}, updated_at = now() where id = $1::bigint`, [id]);
    return { ok: true } as const;
  });
}
/* El dueño responde un comentario (280 letras); sale como «Respuesta del negocio». */
export async function responderComentario(negocio: string, comentario: string, texto: string, actorId: string): Promise<Res> {
  const t = String(texto ?? "").trim();
  if (!t) return no("Escribe tu respuesta.", "Write your reply.");
  if (t.length > 280) return no("Máximo 280 letras.", "280 characters max.");
  if (!/^\d{1,18}$/.test(comentario)) return no("Ese comentario no existe.", "That comment does not exist.");
  const r = await db().query(
    `update post_comments c set reply = $3, reply_at = now(), reply_by = $4 from business_posts p
      where c.id = $2::bigint and p.id = c.post_id and p.business_id = $1 and c.status = 'visible'`, [negocio, comentario, t, actorId]);
  return r.rowCount ? { ok: true } : no("Ese comentario ya no está.", "That comment is gone.");
}
/* Encender / apagar Novedades en la página (las publicaciones se quedan guardadas). */
export async function moduloNovedades(negocio: string, on: boolean): Promise<Res> {
  await db().query(on ? `update businesses set modules_on = array(select distinct x from unnest(modules_on || array['nov']) x) where id = $1`
    : `update businesses set modules_on = array_remove(modules_on, 'nov') where id = $1`, [negocio]);
  return { ok: true };
}

/* Lo que vende el negocio (para «Algo que vendes» y la oferta en el editor). */
export async function itemsNovedad(negocio: string) {
  return (await db().query<{ id: string; name: string; cents: number; ph: string | null; sell: boolean }>(
    `select i.id::text, i.name->>'es' as name, i.price_cents as cents, i.photos[1] as ph, i.sell from items i
      where i.business_id = $1 and i.module = 'menu' and i.removed_at is null and i.status = 'live' order by i.featured desc, i.sort, i.id limit 200`, [negocio])).rows;
}

/* 9n-2 · «Avisar a tus seguidores» (L297): la novedad EN VIVO le llega a quien guarda el negocio (su campana; sin SMS, sin push) por su aviso de «Lo que traen hoy»
   (las ofertas, por «Ofertas», con tope de UNA al día por persona: lo que dice Mi cuenta › Avisos). Lo decide el servidor: una sola vez por novedad (la fila se marca
   en la misma escritura), solo si ya salió y no la ocultó To'Latino, hasta 2 novedades avisadas por negocio cada 24 horas, y a un máximo de 2000 seguidores por vez. */
export const MAX_AVISOS_DIA = 2, MAX_SEGUIDORES_AVISO = 2000;
export async function avisarSeguidores(negocio: string, id: string, actorId: string): Promise<{ ok: true; n: number } | { ok: false; msg: Bi }> {
  if (!/^\d{1,18}$/.test(id)) return { ok: false, msg: { es: "Esa publicación no existe.", en: "That post does not exist." } };
  const r = await tx(async (c) => {
    const p = (await c.query<{ kind: string; title: string; name: string; lista: boolean; ya: boolean; hoy: number }>(
      `select p.kind, p.title, b.name, (p.status = 'live' and p.hidden_at is null and p.publish_at <= now() and (p.ends_at is null or p.ends_at > now())) as lista, p.followers_notified_at is not null as ya,
              (select count(*)::int from business_posts q where q.business_id = p.business_id and q.followers_notified_at > now() - interval '24 hours') as hoy
         from business_posts p join businesses b on b.id = p.business_id where p.business_id = $1 and p.id = $2::bigint and p.status <> 'removed' for update of p`, [negocio, id])).rows[0];
    if (!p) return { ok: false as const, msg: { es: "Esa publicación ya no está.", en: "That post is gone." } };
    if (p.ya) return { ok: false as const, msg: { es: "Ya les avisaste a tus seguidores de esta novedad.", en: "You already told your followers about this update." } };
    if (!p.lista) return { ok: false as const, msg: { es: "Solo se avisa de una novedad que ya está en vivo.", en: "Only an update that is already live can be announced." } };
    if (p.hoy >= MAX_AVISOS_DIA) return { ok: false as const, msg: { es: `Ya avisaste ${MAX_AVISOS_DIA} novedades hoy. Mañana puedes avisar otra.`, en: `You already announced ${MAX_AVISOS_DIA} updates today. You can announce another tomorrow.` } };
    await c.query(`update business_posts set followers_notified_at = now() where id = $1::bigint`, [id]);
    const L = (await c.query<{ id: string }>(
      `select f.follower_user_id::text as id from follows f join users u on u.id = f.follower_user_id and u.status = 'active'
        where f.target_kind = 'business' and f.target_id = $1 and f.follower_user_id <> $2::uuid and coalesce(u.notif_prefs->>(case when $3::text = 'oferta' then 'of' else 'hoy' end), '') <> 'false'
          and ($3::text <> 'oferta' or not exists (select 1 from notifications n where n.user_id = f.follower_user_id and n.tpl = 'nov_oferta_seguidores' and n.created_at > now() - interval '1 day'))
        order by f.follower_user_id limit ${MAX_SEGUIDORES_AVISO}`, [negocio, actorId, p.kind])).rows.map((x) => x.id);
    return { ok: true as const, L, kind: p.kind, title: p.title, name: p.name };
  });
  if (!r.ok) return r;
  if (r.L.length) await (await import("./avisos")).avisarMuchos(r.L, r.kind === "oferta" ? "nov_oferta_seguidores" : "nov_seguidores", { es: { negocio: r.name, titulo: r.title }, en: { negocio: r.name, titulo: r.title } }, { href: `/n/${negocio}`, ref: ["post", id], actor: actorId });
  return { ok: true, n: r.L.length };
}
