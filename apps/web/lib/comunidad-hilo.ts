import "server-only";
import type { PoolClient } from "pg";
import { avisar, avisarMuchos } from "./avisos";
import { db, tx } from "./db";
import { revisarComentario } from "./comunidad-filtro";
import { porcentajes, type Pub } from "./comunidad-comun";
import { ID, ISO, autores, corto, encuesta, esSuNegocio, fechaHasta, no, quien, sinBloqueos, type Res } from "./comunidad";

/* Comunidad · el hilo (APP-COM-POST; fase5-comunidad.md §4 5b): comentar, responder, recomendar un negocio en el comentario,
   votos ± en publicaciones y comentarios, «Me sirvió» (mejor respuesta), encuestas, guardar y el barrido que cierra encuestas.
   - hilo(): las raíces de 20 en 20 por votos (o recientes) con cursor, la mejor respuesta o la más votada destacada, los negocios
     recomendados en el hilo (com_thread_recs, derivado) con su % calculado aquí, y los votos propios en una consulta. Las
     respuestas llegan a pedido (respuestas()). Todo pasa por sinBloqueos() (bloqueoMutuo).
   - Escribir: el filtro (comunidad-filtro.ts, único lugar) antes de tocar la base; sanción, límites, comentarios cerrados,
     negocio activo y no propio. Nadie toca lo de alguien con quien hay un bloqueo (tocable() / comentarioTocable()).
   - Votar: com_votar() en la base (el mismo toque quita, el otro signo cambia; contadores, score y hot por triggers en la misma
     transacción). Ningún contador se escribe aquí (guardián saldoDerivado).
   - Avisos: a quien publicó, a quien contestas y a quien mencionas con «@Nombre», nunca a alguien con bloqueo de por medio. */
type Bi = { es: string; en: string };
export type OrdenHilo = "top" | "new";
export const POR_PAGINA_HILO = 20, POR_PAGINA_RESP = 50, DESTACAR_DESDE = 5, UMBRAL_VOTOS = 10;
const LIMITE_DIA_CM = 100;

export type AutorCm = { id: string; nombre: string; ini: string; foto: string | null; rango: number };
export type NegocioCm = { id: string; nombre: string; meta: Bi; foto: string | null; verificado: boolean };
export type Cm = {
  id: string; autor: AutorCm; body: string; at: string; up: number; dn: number; score: number; miVoto: number; mia: boolean;
  estado: "visible" | "hidden" | "deleted"; negocio: NegocioCm | null; mejor: boolean;
  respuestas: number; caras: { ini: string; foto: string | null }[]; replyTo: { id: string; nombre: string } | null;
};
export type Rec = { negocio: NegocioCm; votos: number; recomiendan: number; pct: number; comentario: string; quien: string; miVoto: number; mia: boolean };
export type Hilo = {
  raices: Cm[]; mas: string | null; destacada: Cm | null; kicker: "mejor" | "top" | null; recs: Rec[]; recsTodos: Rec[];
  puedeMarcar: boolean; resuelta: boolean; cerrados: boolean;
};

/* Columnas de un comentario (una fila; negocio recomendado con su meta y foto en la misma consulta). */
const CCOLS = `
  c.id::text as id, c.author_user_id::text as autor, c.body, ${ISO("c.created_at")} as at, c.up_n as up, c.down_n as dn, c.score, c.status,
  c.parent_id::text as parent, c.reply_to_id::text as reply_to, c.score::text || '|' || c.id as cur_top, c.id::text as cur_new,
  b.id as biz_id, b.name as biz_name, coalesce(bs.verified, false) as biz_ver, bs.rating_avg::float8 as biz_rating, bs.review_count as biz_reviews, sc.name as biz_sub,
  coalesce(b.logo_url, (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1)) as biz_foto`;
const CJOINS = `left join businesses b on b.id = c.business_id left join business_stats_cache bs on bs.business_id = b.id left join subcategorias_vivas sc on sc.id = b.subcategory_ids[1]`;
type FilaCm = {
  id: string; autor: string; body: string; at: string; up: number; dn: number; score: number; status: Cm["estado"]; parent: string | null; reply_to: string | null;
  cur_top: string; cur_new: string; biz_id: string | null; biz_name: string | null; biz_ver: boolean; biz_rating: number | null; biz_reviews: number | null; biz_sub: Bi | null; biz_foto: string | null;
  vivas?: number; caras?: string[] | null;
};
const metaNeg = (f: { biz_sub: Bi | null; biz_rating: number | null; biz_reviews: number | null }): Bi => {
  const m = (l: "es" | "en") => [f.biz_sub ? f.biz_sub[l].toUpperCase() : null, f.biz_rating && f.biz_reviews ? `★ ${f.biz_rating.toFixed(1)} (${f.biz_reviews})` : null].filter(Boolean).join(" · ");
  return { es: m("es"), en: m("en") };
};
const negocioDe = (f: FilaCm): NegocioCm | null => f.biz_id ? { id: f.biz_id, nombre: f.biz_name!, meta: metaNeg(f), foto: f.biz_foto, verificado: f.biz_ver } : null;

/* Votos de quien mira en una lista de comentarios (una consulta). */
async function misVotosCm(ids: string[], viewer: string) {
  if (!ids.length) return new Map<string, number>();
  const r = await db().query<{ id: string; v: number }>(`select target_id::text as id, v from com_votes where target_kind = 'comment' and target_id = any($1::bigint[]) and user_id = $2`, [ids, viewer]);
  return new Map(r.rows.map((x) => [x.id, x.v]));
}

async function armarCm(filas: FilaCm[], viewer: string, mejor: string | null): Promise<Cm[]> {
  const ids = filas.map((f) => f.id), quienes = filas.flatMap((f) => [f.autor, ...(f.caras ?? [])]);
  const [V, A] = await Promise.all([misVotosCm(ids, viewer), autores(quienes)]);
  // A quién contesta cada respuesta (el nombre sale de la caché de autores; la fila de la respuesta ya pasó por sinBloqueos).
  const rt = filas.filter((f) => f.reply_to && f.reply_to !== f.parent).map((f) => f.reply_to!);
  const RT = rt.length ? new Map((await db().query<{ id: string; autor: string }>(
    `select x.id::text, x.author_user_id::text as autor from com_comments x where x.id = any($1::bigint[]) and ${sinBloqueos("x.author_user_id", "$2")}`, [rt, viewer])).rows.map((x) => [x.id, x.autor])) : new Map<string, string>();
  const A2 = RT.size ? await autores([...RT.values()]) : A;
  return filas.map((f) => {
    const a = A(f.autor), vivo = f.status === "visible";
    return {
      id: f.id, autor: { id: a.id!, nombre: a.nombre, ini: a.ini, foto: a.foto, rango: a.rango }, body: vivo ? f.body : "", at: f.at,
      up: f.up, dn: f.dn, score: f.score, miVoto: V.get(f.id) ?? 0, mia: f.autor === viewer, estado: f.status, negocio: vivo ? negocioDe(f) : null, mejor: !!mejor && f.id === mejor,
      respuestas: f.vivas ?? 0, caras: (f.caras ?? []).map((u) => { const x = A(u); return { ini: x.ini, foto: x.foto }; }),
      replyTo: f.reply_to && f.reply_to !== f.parent && RT.get(f.reply_to) ? { id: f.reply_to, nombre: A2(RT.get(f.reply_to)!).nombre } : null,
    };
  });
}

/* La publicación tal como la puede ver quien mira (para el hilo y para escribir en él). */
type PostH = { id: string; autor: string | null; kind: string; city_id: string; best: string | null; cerrados: boolean; status: string; opts: number; abierta: boolean; body: string };
async function postPara(c: Pick<PoolClient, "query">, viewer: string, id: string, soloVisible: boolean) {
  return (await c.query<PostH>(
    `select p.id::text, p.author_user_id::text as autor, p.kind, p.city_id, p.best_comment_id::text as best, p.comments_locked_at is not null as cerrados, p.status,
            coalesce(cardinality(p.poll_options), 0) as opts, coalesce(p.poll_ends_at > now(), false) as abierta, p.body
       from com_posts p
      where p.id = $2::bigint and p.publish_at <= now() and ${sinBloqueos("p.author_user_id", "$1")}
        and ${soloVisible ? "p.status = 'visible'" : "(p.status = 'visible' or (p.status = 'hidden' and p.author_user_id = $1))"}
        and not exists (select 1 from com_hidden_for h where h.user_id = $1 and h.target_kind = 'post' and h.target_id = p.id)`, [viewer, id])).rows[0] ?? null;
}
/* Lo que se puede tocar (votar, comentar, encuesta, guardar): visible y sin bloqueos entre los dos. */
const tocable = (c: PoolClient, viewer: string, id: string) => postPara(c, viewer, id, true);
/* Un comentario que se puede tocar: visible, en una publicación visible, sin bloqueo con su autor ni con quien publicó. */
async function comentarioTocable(c: PoolClient, viewer: string, id: string) {
  return (await c.query<{ id: string; autor: string; post: string; parent: string | null; body: string }>(
    `select cm.id::text, cm.author_user_id::text as autor, cm.post_id::text as post, cm.parent_id::text as parent, cm.body
       from com_comments cm join com_posts p on p.id = cm.post_id
      where cm.id = $2::bigint and cm.status = 'visible' and p.status = 'visible' and p.publish_at <= now()
        and ${sinBloqueos("cm.author_user_id", "$1")} and ${sinBloqueos("p.author_user_id", "$1")}
        and not exists (select 1 from com_hidden_for h where h.user_id = $1 and h.target_kind = 'comment' and h.target_id = cm.id)`, [viewer, id])).rows[0] ?? null;
}

/* ── Leer ── */

/* El hilo de una publicación para quien mira. `cursor` = el de la página anterior (la destacada y los recomendados, solo en la primera). */
export async function hilo(postId: string, viewer: string, cursor: string | null, orden: OrdenHilo = "top"): Promise<Hilo | null> {
  if (!ID.test(postId)) return null;
  const p = await postPara(db(), viewer, postId, false);
  if (!p) return null;
  const top = orden === "top", v: unknown[] = [viewer, postId];
  const w: string[] = ["c.post_id = $2::bigint", "c.parent_id is null", "(c.status = 'visible' or c.replies_n > 0)", sinBloqueos("c.author_user_id", "$1"),
    "not exists (select 1 from com_hidden_for h where h.user_id = $1 and h.target_kind = 'comment' and h.target_id = c.id)"];
  if (p.best) { v.push(p.best); w.push(`c.id <> $${v.length}::bigint`); }
  if (cursor && (top ? /^-?\d{1,9}\|\d{1,18}$/ : /^\d{1,18}$/).test(cursor)) {
    if (top) { const [s, i] = cursor.split("|"); v.push(s, i); w.push(`(c.score < $${v.length - 1}::int or (c.score = $${v.length - 1}::int and c.id > $${v.length}::bigint))`); }
    else { v.push(cursor); w.push(`c.id < $${v.length}::bigint`); }
  }
  const VIVAS = `(select count(*)::int from com_comments r where r.parent_id = c.id and r.status = 'visible' and ${sinBloqueos("r.author_user_id", "$1")}) as vivas,
    (select array_agg(x.a) from (select r.author_user_id::text as a from com_comments r where r.parent_id = c.id and r.status = 'visible' and ${sinBloqueos("r.author_user_id", "$1")} order by r.id limit 3) x) as caras`;
  const primera = !cursor;
  const [L, M, R] = await Promise.all([
    db().query<FilaCm>(`select ${CCOLS}, ${VIVAS} from com_comments c ${CJOINS} where ${w.join(" and ")} order by ${top ? "c.score desc, c.id" : "c.id desc"} limit ${POR_PAGINA_HILO + 1}`, v),
    primera && p.best
      ? db().query<FilaCm>(`select ${CCOLS}, ${VIVAS} from com_comments c ${CJOINS} where c.id = $2::bigint and c.status = 'visible' and ${sinBloqueos("c.author_user_id", "$1")}
          and not exists (select 1 from com_hidden_for h where h.user_id = $1 and h.target_kind = 'comment' and h.target_id = c.id)`, [viewer, p.best])
      : Promise.resolve({ rows: [] as FilaCm[] }),
    primera
      ? db().query<FilaCm & { votos: number; recomiendan: number; mi: number | null }>(
          `select r.votes_n as votos, r.recs_n as recomiendan, mv.v as mi, ${CCOLS}
             from com_thread_recs r join com_comments c on c.id = r.top_comment_id ${CJOINS}
             left join com_votes mv on mv.target_kind = 'comment' and mv.target_id = r.top_comment_id and mv.user_id = $1
            where r.post_id = $2::bigint and r.recs_n > 0 and c.status = 'visible' and ${sinBloqueos("c.author_user_id", "$1")}
            order by r.votes_n desc, r.business_id limit 12`, [viewer, postId])
      : Promise.resolve({ rows: [] as (FilaCm & { votos: number; recomiendan: number; mi: number | null })[] }),
  ]);
  const filas = L.rows.slice(0, POR_PAGINA_HILO), mas = L.rows.length > POR_PAGINA_HILO ? (top ? filas.at(-1)!.cur_top : filas.at(-1)!.cur_new) : null;
  const todos = await armarCm([...M.rows, ...filas], viewer, p.best);
  const mejor = M.rows.length ? todos[0]! : null;
  let raices = mejor ? todos.slice(1) : todos;
  // La destacada (17d): la que le sirvió a quien preguntó; si no hay, la más votada con 5 votos o más (solo «Más votados», primera página).
  let destacada: Cm | null = mejor, kicker: Hilo["kicker"] = mejor ? "mejor" : null;
  if (!destacada && primera && top && raices.length > 1 && raices[0]!.estado === "visible" && raices[0]!.up >= DESTACAR_DESDE) { destacada = raices[0]!; kicker = "top"; raices = raices.slice(1); }
  // Recomendados en este hilo (17c): el negocio de la destacada no se repite; el % sale de los votos de los que quedan.
  const AR = await autores(R.rows.map((x) => x.autor));
  const recsTodos: Rec[] = R.rows.map((x) => ({ negocio: negocioDe(x)!, votos: x.votos, recomiendan: x.recomiendan, pct: 0, comentario: x.id, quien: AR(x.autor).nombre, miVoto: x.mi ?? 0, mia: x.autor === viewer }));
  const recs = recsTodos.filter((x) => !(destacada?.negocio && destacada.negocio.id === x.negocio.id));
  const pc = porcentajes(recs.map((x) => x.votos));
  recs.forEach((x, i) => { x.pct = pc[i]!; });
  return { raices, mas, destacada, kicker, recs, recsTodos, puedeMarcar: p.kind === "pregunta" && p.autor === viewer && p.status === "visible", resuelta: !!p.best, cerrados: p.cerrados };
}

/* Las respuestas de un comentario raíz, a pedido (en orden; de 50 en 50 con cursor). */
export async function respuestas(rootId: string, viewer: string, cursor: string | null) {
  if (!ID.test(rootId)) return null;
  const root = await db().query<{ post: string }>(
    `select c.post_id::text as post from com_comments c join com_posts p on p.id = c.post_id
      where c.id = $2::bigint and c.parent_id is null and p.status = 'visible' and ${sinBloqueos("c.author_user_id", "$1")} and ${sinBloqueos("p.author_user_id", "$1")}`, [viewer, rootId]);
  if (!root.rows[0]) return null;
  const v: unknown[] = [viewer, rootId], w: string[] = ["c.parent_id = $2::bigint", "c.status = 'visible'", sinBloqueos("c.author_user_id", "$1"),
    "not exists (select 1 from com_hidden_for h where h.user_id = $1 and h.target_kind = 'comment' and h.target_id = c.id)"];
  if (cursor && ID.test(cursor)) { v.push(cursor); w.push(`c.id > $${v.length}::bigint`); }
  const L = (await db().query<FilaCm>(`select ${CCOLS} from com_comments c ${CJOINS} where ${w.join(" and ")} order by c.id limit ${POR_PAGINA_RESP + 1}`, v)).rows;
  const filas = L.slice(0, POR_PAGINA_RESP);
  return { items: await armarCm(filas, viewer, null), mas: L.length > POR_PAGINA_RESP ? filas.at(-1)!.id : null };
}

/* ── Escribir ── */
export type EntradaCm = { body: string; business?: string | null; parent?: string | null; replyTo?: string | null };
type Aviso = { id: string; tpl: "com_comment" | "com_reply" | "com_mention" };

/* A quién se avisa de un comentario nuevo: quien publicó, el autor de la raíz si respondes, a quien contestas y los «@Nombre» del
   hilo. Nunca a uno mismo ni a alguien con bloqueo o silencio de por medio, en cualquiera de los dos sentidos. Uno por persona. */
async function aQuienAvisar(c: PoolClient, yo: string, p: PostH, parentAutor: string | null, replyAutor: string | null, body: string): Promise<Aviso[]> {
  const fichas = [...body.matchAll(/(?:^|[\s(])@([A-Za-zÁÉÍÓÚÑÜáéíóúñü]{2,30})(?:\s([A-ZÁÉÍÓÚÑ])\.)?/g)].slice(0, 5).map((m) => ({ n: m[1]!.toLowerCase(), i: m[2]?.toLowerCase() ?? null }));
  const cand = (await c.query<{ id: string; first_name: string | null; last_name: string | null }>(
    `select u.id::text, u.first_name, u.last_name from users u
      where u.id <> $1 and u.id in (select $2::uuid union select $3::uuid union select $4::uuid
              union select x.author_user_id from com_comments x where x.post_id = $5::bigint and x.status = 'visible' and cardinality($6::text[]) > 0)
        and ${sinBloqueos("u.id", "$1")} and ${sinBloqueos("$1", "u.id")}`,
    [yo, p.autor, parentAutor, replyAutor, p.id, fichas.map((f) => f.n)])).rows;
  const out = new Map<string, Aviso["tpl"]>();
  const poner = (id: string | null, tpl: Aviso["tpl"]) => { if (id && cand.some((x) => x.id === id) && !out.has(id)) out.set(id, tpl); };
  poner(replyAutor, "com_mention");
  for (const f of fichas) {
    const m = cand.filter((x) => (x.first_name ?? "").trim().toLowerCase().split(/\s+/)[0] === f.n && (!f.i || (x.last_name ?? "").trim().toLowerCase().startsWith(f.i)));
    if (m.length === 1) poner(m[0]!.id, "com_mention");
  }
  poner(parentAutor, "com_reply");
  poner(p.autor, "com_comment");
  return [...out].map(([id, tpl]) => ({ id, tpl }));
}

/* Comentar o responder (un nivel: la respuesta va bajo la raíz; si contestas a una respuesta, «@Nombre» y reply_to). */
export async function comentar(userId: string, postId: string, e: EntradaCm): Promise<Res<{ id: string }>> {
  const f = revisarComentario({ body: e.body, business: e.business });
  if (f) return { ok: false, msg: f.msg, campo: f.campo };
  if (!ID.test(postId) || (e.parent && !ID.test(e.parent)) || (e.replyTo && !ID.test(e.replyTo))) return no("Esa publicación ya no está.", "That post is gone.");
  const r = await tx(async (c) => {
    const p = await tocable(c, userId, postId);
    if (!p) return no("Esa publicación ya no está.", "That post is gone.");
    if (p.cerrados) return no("Los comentarios de esta publicación están cerrados.", "Comments on this post are closed.");
    const u = await quien(c, userId, p.city_id);
    if (!u) return no("Entra para comentar.", "Sign in to comment.");
    if (u.estado === "muted") return no(`No puedes comentar hasta el ${fechaHasta(u.hasta, true)}${u.motivo ? `: ${u.motivo}` : "."}`, `You can't comment until ${fechaHasta(u.hasta, false)}${u.motivo ? `: ${u.motivo}` : "."}`);
    if (u.estado !== "active") return no("Tu cuenta no puede comentar ahora.", "Your account can't comment right now.");
    // Límite: 100 comentarios en 24 h (la mitad si la cuenta es de hoy). Los borrados cuentan.
    const tope = u.nueva ? LIMITE_DIA_CM / 2 : LIMITE_DIA_CM;
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from com_comments where author_user_id = $1 and created_at > now() - interval '24 hours'`, [userId])).rows[0]!.n;
    if (n >= tope) return no(`Llegaste a ${tope} comentarios en 24 horas. Vuelve mañana.`, `You reached ${tope} comments in 24 hours. Come back tomorrow.`);
    let parentAutor: string | null = null, replyAutor: string | null = null, replyTo: string | null = null;
    if (e.parent) {
      const pa = await comentarioTocable(c, userId, e.parent);
      if (!pa || pa.post !== p.id || pa.parent) return no("Ese comentario ya no está.", "That comment is gone.");
      parentAutor = pa.autor;
      if (e.replyTo && e.replyTo !== e.parent) {
        const rt = await comentarioTocable(c, userId, e.replyTo);
        if (!rt || rt.parent !== e.parent) return no("Esa respuesta ya no está.", "That reply is gone.");
        replyAutor = rt.autor; replyTo = rt.id;
      }
    }
    let negocio: string | null = null;
    if (e.business) {
      const b = (await c.query<{ id: string }>(`select id from businesses where id = $1 and city_id = $2 and status = 'active'`, [String(e.business), p.city_id])).rows[0];
      if (!b) return no("Ese negocio no está activo en esta ciudad.", "That business is not active in this city.", "negocio");
      if (await esSuNegocio(c, userId, b.id)) return no("No puedes recomendar tu propio negocio. Tu negocio publica en sus Novedades.", "You can't recommend your own business. Your business posts in its Updates.", "negocio");
      negocio = b.id;
    }
    const body = e.body.trim();
    const id = (await c.query<{ id: string }>(
      `insert into com_comments (post_id, parent_id, reply_to_id, author_user_id, body, lang, business_id) values ($1::bigint, $2::bigint, $3::bigint, $4, $5, $6, $7) returning id::text`,
      [p.id, e.parent ?? null, replyTo, userId, body, u.lang === "en" ? "en" : "es", negocio])).rows[0]!.id;
    const avisos = await aQuienAvisar(c, userId, p, parentAutor, replyAutor, body);
    const menciones = avisos.filter((a) => a.tpl === "com_mention").map((a) => a.id);
    if (menciones.length) await c.query(`insert into com_mentions (comment_id, user_id) select $1::bigint, x from unnest($2::uuid[]) x on conflict do nothing`, [id, menciones]);
    return { ok: true as const, id, avisos, post: p.id };
  }).catch((err) => {
    if (String(err?.constraint ?? "").endsWith("_datos")) return no("No publiques teléfonos ni datos de nadie.", "Don't post phone numbers or anyone's details.", "texto");
    throw err;
  });
  if (!r.ok || !("avisos" in r)) return r;
  // Después de guardar (los avisos nunca rompen el comentario).
  const yo = (await autores([userId]))(userId), texto = (e.body.trim() || "").slice(0, 80) || "—";
  for (const a of r.avisos) await avisar(a.id, a.tpl, { nombre: yo.nombre, texto }, { href: `/comunidad/p/${r.post}#c${r.id}`, ref: ["com_comment", r.id], actor: userId });
  return { ok: true, id: r.id };
}

/* Borrar un comentario propio = estado «deleted» (nada se borra; si tiene respuestas queda «Comentario eliminado»). */
export async function borrarComentario(userId: string, id: string): Promise<Res> {
  if (!ID.test(id)) return no("Ese comentario ya no está.", "That comment is gone.");
  const r = await db().query(`update com_comments set status = 'deleted', deleted_at = now() where id = $1::bigint and author_user_id = $2 and status = 'visible'`, [id, userId]);
  return r.rowCount ? { ok: true } : no("Ese comentario ya no está.", "That comment is gone.");
}

/* Voto + / − en una publicación o un comentario: uno por persona; el mismo toque lo quita; el otro signo lo cambia; lo propio no
   se vota; si otra cuenta del mismo dispositivo ya votó, el voto queda callado (no mueve nada). Lo decide la base (com_votar). */
export async function votar(userId: string, kind: "post" | "comment", id: string, v: 1 | -1, device: string | null): Promise<Res<{ score: number; up: number; miVoto: number }>> {
  if (!ID.test(id) || (v !== 1 && v !== -1) || (kind !== "post" && kind !== "comment")) return no("Eso ya no está.", "That is gone.");
  const r = await tx(async (c) => {
    const t = kind === "post" ? await tocable(c, userId, id) : await comentarioTocable(c, userId, id);
    if (!t) return kind === "post" ? no("Esa publicación ya no está.", "That post is gone.") : no("Ese comentario ya no está.", "That comment is gone.");
    if (t.autor === userId) return no("Lo tuyo lo votan los demás.", "Others vote on your posts.");
    const mio = (await c.query<{ v: number }>(`select com_votar($1, $2::bigint, $3, $4::smallint, $5) as v`, [kind, id, userId, v, device])).rows[0]!.v;
    const s = (await c.query<{ score: number; up: number }>(`select score, up_n as up from ${kind === "post" ? "com_posts" : "com_comments"} where id = $1::bigint`, [id])).rows[0]!;
    // HOOK 5f (puntos): aquí se asienta el +/− de quien recibe el voto, solo si el voto cuenta (com_votes.counted) y una vez por voto.
    return { ok: true as const, score: s.score, up: s.up, miVoto: mio, autor: t.autor, body: t.body };
  });
  if (!r.ok) return r;
  // Llegó a 10 votos a favor: un aviso, una vez (si baja y vuelve a 10, no se repite).
  if (r.miVoto === 1 && r.up === UMBRAL_VOTOS && r.autor) {
    const ref = `${kind}:${id}`;
    const ya = (await db().query(`select 1 from notifications where user_id = $1 and tpl = 'com_votes_10' and ref_kind = 'com_votos' and ref_id = $2`, [r.autor, ref])).rowCount;
    if (!ya) {
      const u = (await db().query<{ lang: string }>(`select coalesce(lang, 'es') as lang from users where id = $1`, [r.autor])).rows[0];
      await avisar(r.autor, "com_votes_10", { que: u?.lang === "en" ? (kind === "post" ? "post" : "comment") : (kind === "post" ? "publicación" : "comentario"), texto: (r.body || "").slice(0, 60) },
        { href: `/comunidad/p/${kind === "post" ? id : (await db().query<{ p: string }>(`select post_id::text as p from com_comments where id = $1::bigint`, [id])).rows[0]?.p ?? ""}`, ref: ["com_votos", ref] });
    }
  }
  return { ok: true, score: r.score, up: r.up, miVoto: r.miVoto };
}

/* «Me sirvió»: solo quien preguntó, sobre un comentario raíz de otra persona. Marca RESUELTA y la mejor respuesta (una; se puede cambiar). */
export async function meSirvio(userId: string, postId: string, commentId: string): Promise<Res<{ mejor: string }>> {
  if (!ID.test(postId) || !ID.test(commentId)) return no("Esa publicación ya no está.", "That post is gone.");
  const r = await tx(async (c) => {
    const p = await tocable(c, userId, postId);
    if (!p) return no("Esa publicación ya no está.", "That post is gone.");
    if (p.autor !== userId || p.kind !== "pregunta") return no("Solo quien preguntó marca la respuesta que le sirvió.", "Only the person who asked can mark the answer that helped.");
    await c.query(`select 1 from com_posts where id = $1::bigint for update`, [p.id]);
    const cm = await comentarioTocable(c, userId, commentId);
    if (!cm || cm.post !== p.id || cm.parent) return no("Ese comentario ya no está.", "That comment is gone.");
    if (cm.autor === userId) return no("Marca la respuesta de un vecino, no la tuya.", "Mark a neighbor's answer, not yours.");
    const antes = (await c.query<{ b: string | null }>(`select best_comment_id::text as b from com_posts where id = $1::bigint`, [p.id])).rows[0]!.b;
    if (antes === cm.id) return { ok: true as const, mejor: cm.id, nuevo: false, autor: cm.autor, body: p.body };
    await c.query(`update com_posts set best_comment_id = $2::bigint where id = $1::bigint`, [p.id, cm.id]);
    // HOOK 5f (puntos): +10 a quien respondió (PTS «mejor respuesta»); al cambiarla, el asiento inverso a la anterior.
    return { ok: true as const, mejor: cm.id, nuevo: true, autor: cm.autor, body: p.body };
  });
  if (!r.ok) return r;
  if (r.nuevo) {
    const ya = (await db().query(`select 1 from notifications where user_id = $1 and tpl = 'com_best' and ref_kind = 'com_comment' and ref_id = $2`, [r.autor, r.mejor])).rowCount;
    if (!ya) {
      const yo = (await autores([userId]))(userId);
      await avisar(r.autor, "com_best", { nombre: yo.nombre, texto: r.body.slice(0, 60) }, { href: `/comunidad/p/${postId}#c${r.mejor}`, ref: ["com_comment", r.mejor], actor: userId });
    }
  }
  return { ok: true, mejor: r.mejor };
}

/* Encuesta: un voto por persona, no se cambia; abierta hasta su cierre (la base también lo impone). Devuelve los % del servidor. */
export async function votarEncuesta(userId: string, id: string, opt: number): Promise<Res<{ encuesta: NonNullable<Pub["encuesta"]> }>> {
  if (!ID.test(id) || !Number.isInteger(opt) || opt < 0 || opt > 3) return no("Esa encuesta ya no está.", "That poll is gone.");
  return tx(async (c) => {
    const p = await tocable(c, userId, id);
    if (!p || p.kind !== "encuesta" || opt >= p.opts) return no("Esa encuesta ya no está.", "That poll is gone.");
    if (!p.abierta) return no("Esta encuesta ya cerró.", "This poll is closed.");
    const r = await c.query(`insert into com_poll_votes (post_id, user_id, opt) values ($1::bigint, $2, $3) on conflict do nothing`, [id, userId, opt]);
    if (!r.rowCount) return no("Ya votaste: tu voto no se cambia.", "You already voted: your vote is final.");
    const x = (await c.query<{ opts: string[]; conteo: number[]; cierra: string; cerrada: boolean }>(
      `select poll_options as opts, poll_counts as conteo, ${ISO("poll_ends_at")} as cierra, poll_ends_at <= now() as cerrada from com_posts where id = $1::bigint`, [id])).rows[0]!;
    return { ok: true as const, encuesta: encuesta(x.opts, x.conteo, opt, x.cierra, x.cerrada) };
  }).catch((e) => {
    if (/ya cerró/.test(String(e?.message))) return no("Esta encuesta ya cerró.", "This poll is closed.");
    throw e;
  });
}

/* Guardar / quitar de guardados (USR-FAVORITOS › publicaciones). */
export async function guardar(userId: string, id: string): Promise<Res<{ guardada: boolean }>> {
  if (!ID.test(id)) return no("Esa publicación ya no está.", "That post is gone.");
  return tx(async (c) => {
    if (!(await tocable(c, userId, id))) return no("Esa publicación ya no está.", "That post is gone.");
    const d = await c.query(`delete from com_saves where post_id = $1::bigint and user_id = $2`, [id, userId]);
    if (d.rowCount) return { ok: true as const, guardada: false };
    await c.query(`insert into com_saves (post_id, user_id) values ($1::bigint, $2) on conflict do nothing`, [id, userId]);
    return { ok: true as const, guardada: true };
  });
}

/* ── Barrido (lib/barrido.ts «cerrarEncuestas») ── Las encuestas que vencieron se cierran y el resultado se avisa una vez a quien la
   publicó y a quienes votaron. poll_closed_at se marca en la misma sentencia que las elige: dos barridos a la vez no avisan dos veces. */
export async function barrerEncuestas() {
  const L = (await db().query<{ id: string; body: string; opts: string[]; conteo: number[]; autor: string | null; status: string }>(
    `update com_posts p set poll_closed_at = now()
      where p.id in (select x.id from com_posts x where x.kind = 'encuesta' and x.poll_closed_at is null and x.poll_ends_at <= now() order by x.poll_ends_at limit 200 for update skip locked)
      returning p.id::text, p.body, p.poll_options as opts, p.poll_counts as conteo, p.author_user_id::text as autor, p.status`)).rows;
  for (const p of L) {
    if (p.status !== "visible") continue;
    const total = p.conteo.reduce((a, x) => a + x, 0), pc = porcentajes(p.conteo), max = Math.max(0, ...p.conteo);
    const gana = p.opts.filter((_, i) => total && p.conteo[i] === max);
    const res = (es: boolean) => !total ? (es ? "Nadie votó." : "Nobody voted.")
      : gana.length > 1 ? (es ? `Empate entre ${gana.map((g) => `«${g}»`).join(" y ")}, de ${total} votos.` : `Tie between ${gana.map((g) => `«${g}»`).join(" and ")}, of ${total} votes.`)
      : (es ? `Ganó «${gana[0]}» con ${pc[p.conteo.indexOf(max)]}% de ${total} votos.` : `«${gana[0]}» won with ${pc[p.conteo.indexOf(max)]}% of ${total} votes.`);
    // Quienes votaron (sin quien tenga un bloqueo con quien la publicó: el aviso trae su texto).
    const quienes = (await db().query<{ u: string }>(`select v.user_id::text as u from com_poll_votes v where v.post_id = $1::bigint and ${sinBloqueos("$2::uuid", "v.user_id")}`, [p.id, p.autor])).rows.map((x) => x.u);
    const texto = p.body.slice(0, 60);
    await avisarMuchos([...(p.autor ? [p.autor] : []), ...quienes], "com_poll_closed", { es: { texto, resultado: res(true) }, en: { texto, resultado: res(false) } }, { href: `/comunidad/p/${p.id}`, ref: ["com_post", p.id], actor: p.autor });
  }
  return { cerradas: L.length };
}
