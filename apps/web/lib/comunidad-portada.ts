import "server-only";
import { db } from "./db";
import { ISO, autores, sinBloqueos, SELLO_OFICIAL } from "./comunidad";

/* Lo de la Comunidad que sale fuera de la Comunidad (fase5-comunidad.md §4 5e): Negocios › «Recomendados por vecinos», Inicio ›
   Comunidad (la pregunta de la cuenta oficial) y Buscar › Vecinos. Lo público solo muestra negocios y la cuenta oficial (nunca a un
   vecino ni lo que escribió); lo de los vecinos (Buscar › Vecinos) pide sesión y pasa por sinBloqueos() (guardián buscarVecinosConSesion). */
type Bi = { es: string; en: string };

/* «Recomendados por vecinos»: los negocios activos de la ciudad que más recomiendan los vecinos (en publicaciones y en comentarios de los
   últimos 180 días), por los votos que esas recomendaciones juntaron y luego por cuántos vecinos distintos. Para quien mira con cuenta, sin
   lo de quien bloqueó o silenció (de ida y vuelta); sin cuenta, `viewer` es null y no hay bloqueos. Sale solo el negocio y cuántos. */
export type Recomendado = { id: string; nombre: string; vecinos: number; votos: number; rating: number | null; resenas: number; destacada: boolean };
export async function recomendadosPorVecinos(ciudad: string, viewer: string | null, n = 5): Promise<Recomendado[]> {
  // 9b-3 · Solo entre los 50 negocios con más votos de la ciudad (com_recomendados_cache, el barrido cada 10 min), recalculados aquí con los
  // bloqueos de quien mira; sin resumen todavía, entre todos. Agregar 180 días de la ciudad en cada vista tardaba 450 ms con 1 M de vecinos.
  // Quedar fuera de los 50 y entrar a los 5 de alguien exigiría que esa persona bloqueara a casi todos los que recomiendan a los de arriba.
  const cand = `(not exists (select 1 from com_recomendados_cache k where k.city_id = $1) or %s in (select k.business_id from com_recomendados_cache k where k.city_id = $1))`;
  const r = await db().query<Recomendado>(
    `with r as (
       select p.business_id as b, p.author_user_id as u, greatest(p.up_n, 0) as up, coalesce(p.featured_until > now(), false) as dest from com_posts p
        where p.city_id = $1 and p.kind = 'recomendacion' and p.status = 'visible' and p.publish_at <= now() and p.publish_at > now() - interval '180 days'
          and p.author_kind = 'user' and ${sinBloqueos("p.author_user_id", "$2::uuid")} and ${cand.replace("%s", "p.business_id")}
       union all
       select c.business_id, c.author_user_id, greatest(c.up_n, 0), false from com_comments c join com_posts p on p.id = c.post_id and p.status = 'visible'
        where c.city_id = $1 and c.business_id is not null and c.status = 'visible' and c.created_at > now() - interval '180 days'
          and ${sinBloqueos("c.author_user_id", "$2::uuid")} and ${cand.replace("%s", "c.business_id")})
     select id, nombre, vecinos, votos, rating, resenas, destacada from (
       select r.b as id, b.name as nombre, count(distinct r.u)::int as vecinos, sum(r.up)::int as votos, bs.rating_avg::float8 as rating, coalesce(bs.review_count, 0)::int as resenas,
              bool_or(r.dest) as destacada, row_number() over (order by sum(r.up) desc, count(distinct r.u) desc, b.name) as rn
         from r join businesses b on b.id = r.b and b.status = 'active' and b.city_id = $1 left join business_stats_cache bs on bs.business_id = b.id
        group by r.b, b.name, bs.rating_avg, bs.review_count) t
      where rn <= $3 or destacada order by rn limit $3 + 3`, [ciudad, viewer, Math.max(1, Math.min(10, n))]);
  // 5f · Una recomendación destacada (Sargento Mayor, 7 días) siempre sale, con «DESTACADA»; el orden sigue siendo el de los votos.
  return r.rows;
}

/* Inicio › Comunidad: lo que la cuenta oficial de la ciudad tiene fijado (o su última pregunta o encuesta de los últimos 7 días). Es
   público: es de To'Latino, no de un vecino. Con sus cifras reales (votos y comentarios). */
export type OficialPortada = { id: string; kind: string; body: string; at: string; nombre: Bi; foto: string; cms: number; up: number; fijada: boolean };
export async function oficialDeLaSemana(ciudad: string): Promise<OficialPortada | null> {
  const r = (await db().query<Omit<OficialPortada, "foto">>(
    `select p.id::text, p.kind, p.body, ${ISO("p.publish_at")} as at, oa.name as nombre, p.comments_n as cms, p.up_n as up, coalesce(p.pinned_until > now(), false) as fijada
       from com_posts p join city_official_accounts oa on oa.city_id = p.city_id
      where p.city_id = $1 and p.author_kind = 'official' and p.status = 'visible' and p.publish_at <= now()
        and (p.pinned_until > now() or (p.kind in ('pregunta', 'encuesta') and p.publish_at > now() - interval '7 days'))
      order by coalesce(p.pinned_until > now(), false) desc, p.publish_at desc, p.id desc limit 1`, [ciudad])).rows[0];
  return r ? { ...r, foto: SELLO_OFICIAL } : null;
}

/* Buscar › Vecinos: publicaciones de la ciudad que dicen lo que se buscó (índice GIN de tsv), ordenadas por los votos (hot), 10 por página
   con cursor (hot, id). Solo con cuenta: sin `viewer` no se lee nada. Sin lo de quien bloqueó o silenció, ni lo que la persona reportó. */
export type HalladoVecino = { id: string; who: string; foto: string | null; ini: string; oficial: boolean; at: string; body: string; score: number; cms: number };
export const VECINOS_POR_PAGINA = 10;
export async function buscarVecinos(viewer: string, ciudad: string, consulta: string, cursor: string | null, n = VECINOS_POR_PAGINA): Promise<{ items: HalladoVecino[]; mas: string | null; total: number }> {
  if (!viewer || !consulta) return { items: [], mas: null, total: 0 };
  const w: string[] = ["p.status = 'visible'", "p.publish_at <= now()", "p.city_id = $2", "p.tsv @@ to_tsquery('simple', $3)", sinBloqueos("p.author_user_id", "$1"),
    "not exists (select 1 from com_hidden_for h where h.user_id = $1 and h.target_kind = 'post' and h.target_id = p.id)"];
  const v: unknown[] = [viewer, ciudad, consulta];
  const contar = `select count(*)::int as n from (select 1 from com_posts p where ${w.join(" and ")} limit 100) x`;
  if (cursor && /^-?\d+(\.\d+)?(e[+-]?\d+)?\|\d{1,18}$/.test(cursor)) { const [a, b] = cursor.split("|"); v.push(a, b); w.push(`(p.hot, p.id) < ($4::float8, $5::bigint)`); }
  const lim = Math.max(1, Math.min(20, n));
  const [L, T] = await Promise.all([
    db().query<{ id: string; autor: string | null; oficial: Bi | null; at: string; body: string; score: number; cms: number; cur: string }>(
      `select p.id::text, p.author_user_id::text as autor, oa.name as oficial, ${ISO("p.publish_at")} as at, p.body, p.score, p.comments_n as cms, p.hot::text || '|' || p.id as cur
         from com_posts p left join city_official_accounts oa on p.author_kind = 'official' and oa.city_id = p.city_id
        where ${w.join(" and ")} order by p.hot desc, p.id desc limit ${lim + 1}`, v),
    db().query<{ n: number }>(contar, [viewer, ciudad, consulta]),
  ]);
  const filas = L.rows.slice(0, lim), A = await autores(filas.map((f) => f.autor).filter((x): x is string => !!x));
  return {
    items: filas.map((f) => { const a = f.autor ? A(f.autor) : null;
      return { id: f.id, who: a ? a.nombre : f.oficial?.es ?? "To'Latino", foto: a ? a.foto : SELLO_OFICIAL, ini: a ? a.ini : "TL", oficial: !a, at: f.at, body: f.body, score: f.score, cms: f.cms }; }),
    mas: L.rows.length > lim ? filas.at(-1)!.cur : null, total: T.rows[0]?.n ?? 0,
  };
}
