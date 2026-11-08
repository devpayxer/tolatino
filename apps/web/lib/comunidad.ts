import "server-only";
import type { PoolClient } from "pg";
import { db, tx } from "./db";
import { centroSQL, type Punto } from "./punto";
import { EDITAR_MIN, DESHACER_S, RANGO_ENCUESTA, MAX_FOTOS, pareceEmergencia, revisarPublicacion, type Borrador, type Falla } from "./comunidad-filtro";
import { porcentajes, type Autor, type Filtros, type Pub } from "./comunidad-comun";
import { efectoSancion, limiteDia, noPuede, revisarAlEscribir, revisarFotosCom } from "./moderacion";
import { detectarIdioma, idiomaTexto } from "./traductor";

/* Comunidad · el muro, publicar y la publicación (APP-COM-FEED, APP-COM-NUEVO, APP-COM-POST; fase5-comunidad.md §4 5a).
   Todo pide sesión (comunidadSoloConCuenta): cada función recibe la persona que mira (viewer) y nada de vecinos sale sin ella.
   - muro(): UNA consulta indexada por página (20, cursor por (hot, id) o (publish_at, id), sin offset: feedConCursor), los votos y
     guardados propios en otra, y los perfiles de los autores de una caché de 60 s. Fijada de la ciudad arriba en «Todo».
   - Bloqueos: toda lista para una persona pasa por sinBloqueos() (bloqueo de ida y vuelta, silenciados por quien mira; bloqueoMutuo).
   - Ubicación: la publicación lleva el centro del barrio del autor (lo pone la base); la distancia se mide contra eso y se redondea.
   - Escribir: comunidad-filtro.ts (único lugar de las reglas) + lo que necesita la base (sanción, límites, negocio activo y no propio,
     rango para encuestas, fotos propias). Editar 30 min (la versión anterior queda en com_edits); borrar = estado, con Deshacer. */
type Bi = { es: string; en: string };
export type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi; campo?: Falla["campo"] };
export const no = (es: string, en: string, campo?: Falla["campo"]): { ok: false; msg: Bi; campo?: Falla["campo"] } => ({ ok: false, msg: { es, en }, campo });
export const ISO = (c: string) => `to_char((${c}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
export const ID = /^\d{1,18}$/;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const POR_PAGINA = 20;
/* El sello de la cuenta oficial «To'Latino {Ciudad}» (5e): el logo, nunca una foto de persona. */
export const SELLO_OFICIAL = "/assets/logo-tolatino.svg";

/* Lo que alguien no debe ver: quien lo bloqueó o a quien bloqueó (de ida y vuelta) y a quien silenció. `autor` es la columna del
   autor y `viewer` el parámetro de quien mira. Toda función de lib/comunidad*.ts que lista para una persona lo usa (guardián). */
export const sinBloqueos = (autor: string, viewer: string) =>
  `not exists (select 1 from user_blocks ub where ub.removed_at is null and ((ub.user_id = ${viewer} and ub.target_user_id = ${autor})
     or (ub.kind = 'block' and ub.user_id = ${autor} and ub.target_user_id = ${viewer})))`;
/* Solo bloqueos, de ida y vuelta (sin silencios): para las superficies de personas (perfil, listas de seguidores, mensajes, avisos,
   sugerencias). Silenciar solo esconde lo que la otra persona publica y comenta; bloquear la borra de todo, en los dos sentidos. */
export const sinBloqueo = (persona: string, viewer: string) =>
  `not exists (select 1 from user_blocks ub where ub.removed_at is null and ub.kind = 'block' and ((ub.user_id = ${viewer} and ub.target_user_id = ${persona})
     or (ub.user_id = ${persona} and ub.target_user_id = ${viewer})))`;

/* ¿La persona ya entró a la Comunidad? Bienvenida hecha, reglas aceptadas y declaró tener 18 años o más (nunca una fecha de
   nacimiento). Quien declaró ser menor no usa la Comunidad. */
export type Entrada18 = { ok: boolean; menor: boolean; falta: boolean };
export async function enComunidad(userId: string, c: Pick<PoolClient, "query"> = db()): Promise<Entrada18> {
  const r = (await c.query<{ adult: boolean | null; welcome: boolean; rules: boolean }>(
    `select cp.adult, cp.welcome_at is not null as welcome, cp.rules_ok_at is not null as rules from community_profiles cp where cp.user_id = $1`, [userId])).rows[0];
  if (r?.adult === false) return { ok: false, menor: true, falta: false };
  const ok = !!r && r.adult === true && r.welcome && r.rules;
  return { ok, menor: false, falta: !ok };
}

/* ── Perfiles de autores: 60 s en memoria (nombre corto, foto, rango). ── */
const cache = new Map<string, { at: number; a: Autor & { ciudad: string | null } }>();
export const ini = (n: string) => n.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
export const corto = (f: string | null, l: string | null) => `${(f ?? "").trim()}${l ? ` ${l.trim().slice(0, 1).toUpperCase()}.` : ""}`.trim() || "Vecino";
export async function autores(ids: string[]) {
  const ahora = Date.now(), faltan = [...new Set(ids)].filter((id) => !(cache.get(id) && ahora - cache.get(id)!.at < 60_000));
  if (faltan.length) {
    const r = await db().query<{ id: string; first_name: string | null; last_name: string | null; photo_url: string | null; rango: number; ciudad: string | null }>(
      `select u.id::text, u.first_name, u.last_name, u.photo_url, coalesce(cp.rank_level, 1) as rango, u.home_city_id as ciudad
         from users u left join community_profiles cp on cp.user_id = u.id where u.id = any($1::uuid[])`, [faltan]);
    for (const x of r.rows) { const n = corto(x.first_name, x.last_name); cache.set(x.id, { at: ahora, a: { id: x.id, nombre: n, ini: ini(n), foto: x.photo_url, rango: x.rango, oficial: false, ciudad: x.ciudad } }); }
  }
  return (id: string) => cache.get(id)?.a ?? { id, nombre: "Vecino", ini: "V", foto: null, rango: 1, oficial: false, ciudad: null };
}

/* Columnas de una publicación para la pantalla (una fila; negocio, barrio, invitado y fotos en la misma consulta). */
export const COLS = (centro: string | null) => `
  p.id::text as id, p.kind, p.topic, p.body, p.lang, p.author_kind, p.author_user_id::text as autor, p.city_id, p.status, p.hidden_reason,
  ${ISO("p.publish_at")} as at, p.edited_at is not null as editada, ${ISO("p.created_at + interval '" + EDITAR_MIN + " minutes'")} as editar_hasta,
  p.created_at > now() - interval '${EDITAR_MIN} minutes' as editable,
  coalesce(p.pinned_until > now(), false) as fijada, p.health_notice as salud, p.solved_at is not null as resuelta, p.comments_locked_at is not null as cerrados,
  p.looking_for as para, p.poll_options as opts, p.poll_counts as conteo, ${ISO("p.poll_ends_at")} as cierra, coalesce(p.poll_ends_at <= now(), false) as cerrada,
  p.up_n as up, p.down_n as dn, p.score, p.comments_n as cms, p.hot::text as hot_t, ${ISO("p.publish_at")} || '|' || p.id as cur_new, p.hot::text || '|' || p.id as cur_top,
  z.name as zona, case when gc.id is not null then gc.name || ', ' || gc.state end as invitado, oc.name || ', ' || oc.state as ciudad_nombre, oa.name as oficial,
  ${centro ? `round((st_distance(p.geom, ${centro}) / 1609.34)::numeric, 1)::float8` : "null::float8"} as mi,
  b.id as biz_id, b.name as biz_name, coalesce(bs.verified, false) as biz_ver, bs.rating_avg::float8 as biz_rating, bs.review_count as biz_reviews, sc.name as biz_sub,
  coalesce(b.logo_url, (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1)) as biz_foto,
  (select coalesce(array_agg(m.url order by m.sort, m.created_at), '{}') from media m where m.owner_kind = 'com_post' and m.owner_id = p.id::text and m.status = 'visible') as fotos,
  (select count(*)::int from media m where m.owner_kind = 'com_post' and m.owner_id = p.id::text and m.status = 'review') as revision`;
export const JOINS = `
  left join zones z on z.city_id = p.city_id and z.id = p.zone_id
  left join cities gc on gc.id = p.guest_from_city_id
  join cities oc on oc.id = p.city_id
  left join city_official_accounts oa on p.author_kind = 'official' and oa.city_id = p.city_id
  left join businesses b on b.id = p.business_id
  left join business_stats_cache bs on bs.business_id = b.id
  left join subcategorias_vivas sc on sc.id = b.subcategory_ids[1]`;
export type Fila = {
  id: string; kind: Pub["kind"]; topic: string | null; body: string; lang: Pub["lang"]; author_kind: string; autor: string | null; city_id: string; status: Pub["estado"]; hidden_reason: string | null;
  at: string; editada: boolean; editar_hasta: string; editable: boolean; fijada: boolean; salud: boolean; resuelta: boolean; cerrados: boolean;
  para: string[]; opts: string[] | null; conteo: number[]; cierra: string | null; cerrada: boolean; up: number; dn: number; score: number; cms: number;
  hot_t: string; cur_new: string; cur_top: string; zona: Bi | null; invitado: string | null; ciudad_nombre: string; oficial: Bi | null; mi: number | null;
  biz_id: string | null; biz_name: string | null; biz_ver: boolean; biz_rating: number | null; biz_reviews: number | null; biz_sub: Bi | null; biz_foto: string | null; fotos: string[]; revision: number;
};

/* Votos, guardados y voto de encuesta de quien mira, para una página entera (una consulta). */
async function propios(ids: string[], viewer: string) {
  if (!ids.length) return new Map<string, { v: number; s: boolean; o: number | null }>();
  const r = await db().query<{ id: string; v: number | null; s: boolean; o: number | null }>(
    `select x.id::text, v.v, s.post_id is not null as s, pv.opt as o
       from unnest($1::bigint[]) as x(id)
       left join com_votes v on v.target_kind = 'post' and v.target_id = x.id and v.user_id = $2
       left join com_saves s on s.post_id = x.id and s.user_id = $2
       left join com_poll_votes pv on pv.post_id = x.id and pv.user_id = $2`, [ids, viewer]);
  return new Map(r.rows.map((x) => [x.id, { v: x.v ?? 0, s: x.s, o: x.o }]));
}

/* La encuesta como la ve quien mira (prototipo: show = voted || closed): los votos y los % (los calcula el servidor) solo después
   de votar o al cerrar; antes no salen del servidor. */
export function encuesta(opts: string[], conteo: number[], mio: number | null, cierra: string, cerrada: boolean): NonNullable<Pub["encuesta"]> {
  const ver = mio != null || cerrada, n = opts.map((_, i) => (ver ? conteo[i] ?? 0 : 0)), pc = porcentajes(n);
  return { opts: opts.map((l, i) => ({ l, n: n[i]!, pc: pc[i]! })), mio, total: ver ? n.reduce((a, x) => a + x, 0) : 0, cierra, cerrada, ver };
}

export async function armar(filas: Fila[], viewer: string): Promise<Pub[]> {
  const [mio, A] = await Promise.all([propios(filas.map((f) => f.id), viewer), autores(filas.map((f) => f.autor).filter((x): x is string => !!x))]);
  return filas.map((f) => {
    const p = mio.get(f.id) ?? { v: 0, s: false, o: null }, oficial = f.author_kind === "official";
    const a: Autor = oficial ? { id: null, nombre: f.oficial?.es ?? "To'Latino", ini: "TL", foto: SELLO_OFICIAL, rango: 0, oficial: true } : (({ ciudad: _c, ...x }) => (void _c, x))(A(f.autor!));
    const lugar: Bi = oficial ? { es: f.ciudad_nombre, en: f.ciudad_nombre } : f.invitado ? { es: `Invitado · de ${f.invitado}`, en: `Visitor · from ${f.invitado}` } : f.zona ?? { es: f.ciudad_nombre, en: f.ciudad_nombre };
    const mia = !!f.autor && f.autor === viewer;
    const meta = (l: "es" | "en") => [f.biz_sub ? f.biz_sub[l].toUpperCase() : null, f.biz_rating && f.biz_reviews ? `★ ${f.biz_rating.toFixed(1)} (${f.biz_reviews})` : null].filter(Boolean).join(" · ");
    return {
      id: f.id, kind: f.kind, topic: f.topic, body: f.body, lang: f.lang, at: f.at, editada: f.editada, mia, editarHasta: mia && f.editable && f.status === "visible" ? f.editar_hasta : null,
      fijada: f.fijada, salud: f.salud, resuelta: f.resuelta, cerrados: f.cerrados, estado: f.status, motivo: mia ? f.hidden_reason : null,
      autor: a, lugar, invitado: !!f.invitado, mi: f.mi,
      negocio: f.biz_id ? { id: f.biz_id, nombre: f.biz_name!, meta: { es: meta("es"), en: meta("en") }, foto: f.biz_foto, verificado: f.biz_ver, para: f.para ?? [] } : null,
      fotos: f.fotos ?? [], revision: mia ? f.revision ?? 0 : 0,
      encuesta: f.opts ? encuesta(f.opts, f.conteo, p.o, f.cierra!, f.cerrada) : null,
      up: f.up, dn: f.dn, score: f.score, miVoto: p.v, guardada: p.s, comentarios: f.cms,
    };
  });
}

/* Perfil de la Comunidad de quien mira (se crea al entrar por primera vez). */
export async function miPerfil(userId: string) {
  await db().query(`insert into community_profiles (user_id) values ($1) on conflict (user_id) do nothing`, [userId]);
  const r = (await db().query<{ rango: number; first_name: string | null; last_name: string | null; photo_url: string | null; ciudad: string | null; estado: string; hasta: string | null; motivo: string | null }>(
    `select cp.rank_level as rango, u.first_name, u.last_name, u.photo_url, u.home_city_id as ciudad, cuenta_estado(u.status, u.status_until) as estado,
            ${ISO("u.status_until")} as hasta, u.status_reason as motivo
       from users u join community_profiles cp on cp.user_id = u.id where u.id = $1`, [userId])).rows[0]!;
  const n = corto(r.first_name, r.last_name);
  return { rango: r.rango, nombre: n, primer: (r.first_name ?? "").trim() || n, ini: ini(n), foto: r.photo_url, ciudad: r.ciudad, silenciado: r.estado === "muted" ? { hasta: r.hasta, motivo: r.motivo } : null };
}
export type MiPerfil = Awaited<ReturnType<typeof miPerfil>>;

/* El muro de una ciudad para una persona. `cursor` = el que devolvió la página anterior. */
export async function muro(viewer: string, ciudad: string, punto: Punto, f: Filtros, cursor: string | null) {
  const v: unknown[] = [viewer], w: string[] = ["p.status = 'visible'", "p.publish_at <= now()", sinBloqueos("p.author_user_id", "$1"),
    "not exists (select 1 from com_hidden_for h where h.user_id = $1 and h.target_kind = 'post' and h.target_id = p.id)"];
  const centro = f.dist ? centroSQL(punto) : null;
  if (f.tab === "sig") w.push("p.author_user_id in (select f.target_id::uuid from follows f where f.follower_user_id = $1 and f.target_kind = 'user')");
  else { v.push(ciudad); w.push(`p.city_id = $${v.length}`); }
  if (f.kind) { v.push(f.kind); w.push(`p.kind = $${v.length}`); }
  if (centro) { v.push(f.dist * 1609.34); w.push(`st_dwithin(p.geom, ${centro}, $${v.length})`); }
  const fijadaArriba = f.tab === "todo" && !f.kind;
  if (fijadaArriba) w.push("not coalesce(p.pinned_until > now(), false)");
  const top = f.orden === "top";
  if (cursor && /^(-?\d+(\.\d+)?(e[+-]?\d+)?|\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ)\|\d{1,18}$/.test(cursor)) {
    const [a, b] = cursor.split("|");
    v.push(a, b);
    w.push(top ? `(p.hot, p.id) < ($${v.length - 1}::float8, $${v.length}::bigint)` : `(p.publish_at, p.id) < ($${v.length - 1}::timestamptz, $${v.length}::bigint)`);
  }
  const orden = top ? "p.hot desc, p.id desc" : "p.publish_at desc, p.id desc";
  const [L, F] = await Promise.all([
    db().query<Fila>(`select ${COLS(centro)} from com_posts p ${JOINS} where ${w.join(" and ")} order by ${orden} limit ${POR_PAGINA + 1}`, v),
    fijadaArriba && !cursor
      ? db().query<Fila>(`select ${COLS(centro)} from com_posts p ${JOINS}
           where p.city_id = $2 and p.pinned_until > now() and p.status = 'visible' and p.publish_at <= now() and ${sinBloqueos("p.author_user_id", "$1")}
             and not exists (select 1 from com_hidden_for h where h.user_id = $1 and h.target_kind = 'post' and h.target_id = p.id)
           order by p.publish_at desc, p.id desc limit 1`, [viewer, ciudad])
      : Promise.resolve({ rows: [] as Fila[] }),
  ]);
  const filas = L.rows.slice(0, POR_PAGINA), mas = L.rows.length > POR_PAGINA ? (top ? filas.at(-1)!.cur_top : filas.at(-1)!.cur_new) : null;
  const pubs = await armar([...F.rows, ...filas], viewer);
  return { pubs, mas };
}
export type Muro = Awaited<ReturnType<typeof muro>>;

/* Una publicación (APP-COM-POST). El autor también ve la suya oculta (con el motivo). El hilo (comentarios, respuestas, votos,
   recomendados y la mejor respuesta) lo arma lib/comunidad-hilo.ts. */
export async function publicacion(id: string, viewer: string) {
  if (!ID.test(id)) return null;
  const r = (await db().query<Fila>(
    `select ${COLS(null)} from com_posts p ${JOINS}
      where p.id = $2::bigint and p.publish_at <= now() and ${sinBloqueos("p.author_user_id", "$1")}
        and (p.status = 'visible' or (p.status = 'hidden' and p.author_user_id = $1))
        and not exists (select 1 from com_hidden_for h where h.user_id = $1 and h.target_kind = 'post' and h.target_id = p.id)`, [viewer, id])).rows[0];
  if (!r) return null;
  const [pub] = await armar([r], viewer);
  return { pub: pub! };
}
export type Publicacion = NonNullable<Awaited<ReturnType<typeof publicacion>>>;

/* Negocios de la ciudad para recomendar (buscador de Publicar). */
export async function negociosParaRecomendar(ciudad: string, q: string) {
  const palabras = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z0-9]+/g)?.slice(0, 5) ?? [];
  if (!palabras.length) return [];
  const r = await db().query<{ id: string; name: string; sub: Bi | null; subs: Bi[]; foto: string | null; ver: boolean }>(
    `select b.id, b.name, sc.name as sub, coalesce((select array_agg(s.name order by s.sort) from subcategorias_vivas s where s.id = any(b.subcategory_ids)), '{}') as subs,
            coalesce(b.logo_url, (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1)) as foto,
            coalesce(bs.verified, false) as ver
       from businesses b left join business_stats_cache bs on bs.business_id = b.id left join subcategorias_vivas sc on sc.id = b.subcategory_ids[1]
      where b.city_id = $1 and b.status = 'active' and b.search_doc @@ to_tsquery('simple', $2)
      order by ts_rank(b.search_doc, to_tsquery('simple', $2)) desc, b.name limit 8`, [ciudad, palabras.map((p) => `${p}:*`).join(" & ")]);
  return r.rows.map((x) => ({ id: x.id, nombre: x.name, meta: x.sub ?? { es: "", en: "" }, subs: x.subs.slice(0, 4), foto: x.foto, verificado: x.ver }));
}
export type NegocioRec = Awaited<ReturnType<typeof negociosParaRecomendar>>[number];

/* ── Escribir ── */
type Quien = { estado: string; hasta: string | null; motivo: string | null; nueva: boolean; lang: string; rango: number; ciudadOn: boolean };
export async function quien(c: PoolClient, userId: string, ciudad: string): Promise<Quien | null> {
  return (await c.query<Quien>(
    `select cuenta_estado(u.status, u.status_until) as estado, ${ISO("u.status_until")} as hasta, u.status_reason as motivo, u.created_at > now() - interval '24 hours' as nueva,
            coalesce(u.lang, 'es') as lang, coalesce(cp.rank_level, 1) as rango, coalesce((select status = 'on' from cities where id = $2), false) as "ciudadOn"
       from users u left join community_profiles cp on cp.user_id = u.id where u.id = $1`, [userId, ciudad])).rows[0] ?? null;
}
export const fechaHasta = (iso: string | null, es: boolean) => iso ? new Date(iso).toLocaleDateString(es ? "es-US" : "en-US", { day: "numeric", month: "long", timeZone: "America/New_York" }) : "";

/* Un negocio que la persona maneja (dueña o en su equipo): no se lo recomienda a sí misma (guardián noTePromuevas). */
export async function esSuNegocio(c: PoolClient, userId: string, negocio: string) {
  return (await c.query(
    `select 1 from businesses b where b.id = $2 and (b.owner_user_id = $1 or exists (select 1 from business_members m where m.business_id = b.id and m.user_id = $1 and m.status = 'active'))`,
    [userId, negocio])).rowCount! > 0;
}

/* Fotos que la persona subió (y no se usan en otra cosa) pasan a la publicación; las que quitó al editar quedan retiradas. */
/* 5d · Una foto nueva entra «en revisión» (no se ve) y revisarFotosCom() la pasa por el modelo propio después de guardar; si el
   modelo la marca o no responde, se queda en revisión para una persona (regla img; nunca se publica una foto sin revisar). */
async function ponerFotos(c: PoolClient, userId: string, post: string, fotos: string[]) {
  const ids = fotos.filter((x) => UUID.test(x)).slice(0, MAX_FOTOS);
  if (ids.length !== fotos.length) return false;
  if (ids.length) {
    const r = await c.query(
      `update media set sort = array_position($3::uuid[], id) - 1, status = case when owner_kind = 'user' then 'review' else status end, owner_kind = 'com_post', owner_id = $1
        where id = any($3::uuid[]) and ((owner_kind = 'user' and uploaded_by = $2 and status = 'visible') or (owner_kind = 'com_post' and owner_id = $1 and status in ('visible', 'review')))`, [post, userId, ids]);
    if (r.rowCount !== ids.length) return false;
  }
  await c.query(`update media set status = 'removed', removed_reason = 'autor', removed_at = now() where owner_kind = 'com_post' and owner_id = $1 and status in ('visible', 'review') and not (id = any($2::uuid[]))`, [post, ids]);
  return true;
}

export type Entrada = Borrador;
export async function publicar(userId: string, ciudad: string, p: Entrada): Promise<Res<{ id: string; crisis: boolean; revision: number }>> {
  const f = revisarPublicacion(p);
  if (f) return { ok: false, msg: f.msg, campo: f.campo };
  // 5h · El idioma del texto (para «Ver traducción»): el traductor propio lo detecta antes de abrir la transacción; si no, el de la app.
  const det = await detectarIdioma(p.body);
  const r = await tx(async (c) => {
    const u = await quien(c, userId, ciudad);
    if (!u) return no("Entra para publicar.", "Sign in to post.");
    if (!u.ciudadOn) return no("La Comunidad de esta ciudad abre cuando abra la ciudad.", "This city's Community opens when the city opens.");
    // 5d · La sanción viva decide (silencio o «bloquear publicación»: hasta cuándo y por qué).
    const e = await efectoSancion(c, userId);
    if (!e.publicar) return noPuede(e, { es: "publicar", en: "post" });
    // Límite del día (día local; la mitad el primer día de la cuenta). Las borradas cuentan.
    const lim = await limiteDia(c, userId, "publicaciones");
    if (!lim.ok) return lim;
    if (p.kind === "encuesta" && u.rango < RANGO_ENCUESTA) return no("Las encuestas se abren en Cabo.", "Polls open at Corporal.", "tipo");
    let negocio: string | null = null;
    if (p.kind === "recomendacion") {
      const b = (await c.query<{ id: string }>(`select id from businesses where id = $1 and city_id = $2 and status = 'active'`, [String(p.business), ciudad])).rows[0];
      if (!b) return no("Ese negocio no está activo en esta ciudad.", "That business is not active in this city.", "negocio");
      if (await esSuNegocio(c, userId, b.id)) return no("No puedes recomendar tu propio negocio. Tu negocio publica en sus Novedades.", "You can't recommend your own business. Your business posts in its Updates.", "negocio");
      negocio = b.id;
    }
    const body = p.body.trim(), opts = p.kind === "encuesta" ? (p.opts ?? []).map((x) => x.trim()).filter(Boolean) : null;
    const topic = p.kind === "pregunta" ? p.topic || "otro" : p.topic || null;
    const para = p.kind === "recomendacion" ? (p.para ?? []).map((x) => x.trim()).filter(Boolean) : [];
    const r = (await c.query<{ id: string }>(
      `insert into com_posts (city_id, author_kind, author_user_id, kind, topic, body, lang, business_id, looking_for, poll_options, poll_ends_at, health_notice)
       values ($1, 'user', $2, $3, $4, $5, $6, $7, $8, $9, case when $10::int is null then null else now() + make_interval(days => $10::int) end, $11)
       returning id::text`,
      [ciudad, userId, p.kind, topic, body, idiomaTexto(det, u.lang), negocio, para, opts, p.kind === "encuesta" ? Number(p.dias) : null, pareceEmergencia(body)])).rows[0]!;
    if (p.kind !== "encuesta" && !(await ponerFotos(c, userId, r.id, p.fotos ?? []))) throw new FotosAjenas();
    // 5d · Las reglas que marcan (nunca ocultan solas): listas, parecidos repetidos, dónde vive alguien; autolesión → línea del 988.
    const rv = await revisarAlEscribir(c, { kind: "com_post", id: r.id, autor: userId, ciudad, texto: [body, ...para, ...(opts ?? [])].join(" \n") });
    return { ok: true as const, id: r.id, crisis: rv.crisis };
  }).catch((e) => {
    if (e instanceof FotosAjenas) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.", "fotos");
    if (String(e?.constraint ?? "").endsWith("_datos")) return no("No publiques teléfonos ni datos de nadie.", "Don't post phone numbers or anyone's details.", "texto");
    throw e;
  });
  if (!r.ok) return r;
  const { revision } = await revisarFotosCom(r.id);
  return { ok: true, id: r.id, crisis: r.crisis, revision };
}
class FotosAjenas extends Error {}

/* Editar: solo quien la escribió, en los primeros 30 minutos; el tipo, el negocio y las opciones no cambian. */
export async function editar(userId: string, id: string, p: Pick<Entrada, "body" | "topic" | "para" | "fotos">): Promise<Res<{ id: string; crisis: boolean; revision: number }>> {
  if (!ID.test(id)) return no("Esa publicación ya no está.", "That post is gone.");
  const det = await detectarIdioma(p.body); // 5h: si cambia el texto, su idioma se vuelve a detectar (y la traducción, por el hash)
  const r = await tx(async (c) => {
    const x = (await c.query<{ kind: Entrada["kind"]; body: string; business_id: string | null; poll_options: string[] | null; topic: string | null; a_tiempo: boolean; city_id: string }>(
      `select kind, body, business_id, poll_options, topic, created_at > now() - interval '${EDITAR_MIN} minutes' as a_tiempo, city_id
         from com_posts where id = $1::bigint and author_user_id = $2 and status = 'visible' for update`, [id, userId])).rows[0];
    if (!x) return no("Esa publicación ya no está.", "That post is gone.");
    if (!x.a_tiempo) return no(`Ya no se puede editar: pasaron ${EDITAR_MIN} minutos. Puedes borrarla y publicar otra.`, `It can no longer be edited: ${EDITAR_MIN} minutes have passed. You can delete it and post again.`);
    const u = await quien(c, userId, x.city_id);
    if (!u) return no("Tu cuenta no puede publicar ahora.", "Your account can't post right now.");
    const ef = await efectoSancion(c, userId);
    if (!ef.publicar) return noPuede(ef, { es: "publicar", en: "post" });
    const f = revisarPublicacion({ kind: x.kind, body: p.body, topic: p.topic, business: x.business_id, para: p.para, opts: x.poll_options ?? undefined, dias: 1, fotos: x.kind === "encuesta" ? [] : p.fotos, noEsMio: true });
    if (f) return { ok: false as const, msg: f.msg, campo: f.campo };
    const body = p.body.trim();
    if (body !== x.body) await c.query(`insert into com_edits (target_kind, target_id, old_body) values ('post', $1::bigint, $2)`, [id, x.body]);
    await c.query(`update com_posts set body = $2, topic = $3, looking_for = $4, edited_at = now(), health_notice = $5, lang = case when body = $2 then lang else $6 end where id = $1::bigint`,
      [id, body, x.kind === "pregunta" ? p.topic || x.topic || "otro" : p.topic || x.topic, x.kind === "recomendacion" ? (p.para ?? []).map((s) => s.trim()).filter(Boolean) : [], pareceEmergencia(body), idiomaTexto(det, u.lang)]);
    if (x.kind !== "encuesta" && !(await ponerFotos(c, userId, id, p.fotos ?? []))) throw new FotosAjenas();
    const rv = body !== x.body ? await revisarAlEscribir(c, { kind: "com_post", id, autor: userId, ciudad: x.city_id, texto: body }) : { crisis: false };
    return { ok: true as const, id, crisis: rv.crisis };
  }).catch((e) => {
    if (e instanceof FotosAjenas) return no("Una de las fotos ya no está. Súbela otra vez.", "One of the photos is gone. Upload it again.", "fotos");
    if (String(e?.constraint ?? "").endsWith("_datos")) return no("No publiques teléfonos ni datos de nadie.", "Don't post phone numbers or anyone's details.", "texto");
    throw e;
  });
  if (!r.ok) return r;
  const { revision } = await revisarFotosCom(id);
  return { ok: true, id, crisis: r.crisis, revision };
}

/* Borrar = estado «deleted» (nada se borra). Deshacer en los 10 s siguientes (el servidor da un margen de 5 s por la red). */
export async function borrar(userId: string, id: string): Promise<Res> {
  if (!ID.test(id)) return no("Esa publicación ya no está.", "That post is gone.");
  const r = await db().query(`update com_posts set status = 'deleted', deleted_at = now() where id = $1::bigint and author_user_id = $2 and status = 'visible'`, [id, userId]);
  return r.rowCount ? { ok: true } : no("Esa publicación ya no está.", "That post is gone.");
}
export async function deshacerBorrar(userId: string, id: string): Promise<Res> {
  if (!ID.test(id)) return no("Esa publicación ya no está.", "That post is gone.");
  const r = await db().query(
    `update com_posts set status = 'visible', deleted_at = null where id = $1::bigint and author_user_id = $2 and status = 'deleted' and deleted_at > now() - interval '${DESHACER_S + 5} seconds'`, [id, userId]);
  return r.rowCount ? { ok: true } : no("Ya no se puede deshacer.", "It can no longer be undone.");
}

/* Para editar: la publicación propia tal como está (solo en los 30 minutos). */
export async function paraEditar(userId: string, id: string) {
  if (!ID.test(id)) return null;
  const r = (await db().query<{ kind: Entrada["kind"]; body: string; topic: string | null; para: string[]; a_tiempo: boolean; biz: string | null; biz_name: string | null; opts: string[] | null }>(
    `select p.kind, p.body, p.topic, p.looking_for as para, p.created_at > now() - interval '${EDITAR_MIN} minutes' as a_tiempo, p.business_id as biz, b.name as biz_name, p.poll_options as opts
       from com_posts p left join businesses b on b.id = p.business_id where p.id = $1::bigint and p.author_user_id = $2 and p.status = 'visible'`, [id, userId])).rows[0];
  if (!r) return null;
  const fotos = (await db().query<{ id: string; url: string }>(`select id::text, url from media where owner_kind = 'com_post' and owner_id = $1 and status in ('visible', 'review') order by sort, created_at`, [id])).rows;
  return { ...r, fotos };
}

/* Para el muro de registro (sin cuenta): solo cifras y qué tipo de cosa pasó; ni nombres ni textos de vecinos. */
export async function resumenInvitado(ciudad: string) {
  const [n, act] = await Promise.all([
    db().query<{ vecinos: number; preguntas: number; negocios: number }>(
      `select (select count(*)::int from users u where u.home_city_id = $1 and u.phone_verified_at is not null and cuenta_estado(u.status, u.status_until) in ('active', 'muted')) as vecinos,
              (select count(*)::int from com_posts p where p.city_id = $1 and p.kind = 'pregunta' and p.status = 'visible' and p.publish_at > now() - interval '7 days') as preguntas,
              (select count(distinct p.business_id)::int from com_posts p where p.city_id = $1 and p.kind = 'recomendacion' and p.status = 'visible') as negocios`, [ciudad]),
    db().query<{ kind: Pub["kind"]; at: string }>(
      `select p.kind, ${ISO("p.publish_at")} as at from com_posts p where p.city_id = $1 and p.status = 'visible' and p.publish_at <= now() order by p.publish_at desc, p.id desc limit 3`, [ciudad]),
  ]);
  return { ...n.rows[0]!, actividad: act.rows };
}
export type ResumenInvitado = Awaited<ReturnType<typeof resumenInvitado>>;

