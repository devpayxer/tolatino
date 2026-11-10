import "server-only";
import { db } from "./db";
import { centroSQL, type Punto } from "./punto";
import { TIPO_HOY, type Historia, type PaginaHoy } from "./hoy-comun";
import { avisarMuchos } from "./avisos";

/* Hoy en el barrio (APP-COM-HOY, público; fase5-comunidad.md §4 5e). Sale de Novedades: una tarjeta por negocio con sus hasta 3
   avisos de menos de 24 h. La regla de qué entra vive en la base (post_en_hoy: en vivo, Pro, Novedades encendido, sin pausa, no
   oculta, no detenida, sin vencer, para todos, < 24 h y no retirada de Hoy) y esta consulta la usa siempre (guardián hoySoloEnVivo).
   Una consulta por página, agrupada por negocio, con cursor por (último aviso, negocio), sin offset. Nada de vecinos sale de aquí:
   solo negocios y lo que ellos publicaron. */
export const HISTORIAS_POR_PAGINA = 24;
const ISO = (c: string) => `to_char((${c}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const CURSOR = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z\|[a-z0-9-]{1,80}$/;

export async function hoyEnElBarrio(ciudad: string, cat: string | null, cursor: string | null, punto: Punto | null, limite = HISTORIAS_POR_PAGINA): Promise<PaginaHoy> {
  const centro = punto ? centroSQL(punto) : null;
  const v: unknown[] = [ciudad, cat];
  let despues = "";
  if (cursor && CURSOR.test(cursor)) { const [a, b] = cursor.split("|"); v.push(a, b); despues = `and (x.ult, x.business_id) < ($3::timestamptz, $4::text)`; }
  const n = Math.max(1, Math.min(48, limite));
  const r = await db().query<{ id: string; nombre: string; logo: string | null; mi: number | null; domicilio: boolean; ult: string; cur: string; avisos: { id: string; kind: string; texto: string; at: string; quedan: number; foto: string | null; ev: string | null }[] }>(
    `with v as (
       select p.id, p.business_id, p.kind, p.title, p.publish_at, p.ends_at, p.item_id, p.link_kind, p.event_id,
              row_number() over (partition by p.business_id order by p.publish_at desc, p.id desc) as rn,
              max(p.publish_at) over (partition by p.business_id) as ult
         from business_posts p join businesses b on b.id = p.business_id
        where p.city_id = $1 and p.status = 'live' and p.hidden_at is null and p.hoy_off_at is null and p.publish_at > now() - interval '24 hours'
          and post_en_hoy(p) and ($2::text is null or b.category_id = $2::text)),
     x as (select * from v where rn <= 3)
     select x.business_id as id, b.name as nombre,
            coalesce(b.logo_url, (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1)) as logo,
            ${centro ? `case when b.works_from_home or b.geo is null then null else round((st_distance(b.geo, ${centro}) / 1609.34)::numeric, 1)::float8 end` : "null::float8"} as mi,
            (b.works_from_home or b.geo is null) as domicilio,
            ${ISO("x.ult")} as ult, to_char(x.ult at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || x.business_id as cur,
            json_agg(json_build_object(
              'id', x.id::text, 'kind', x.kind, 'texto', x.title, 'at', ${ISO("x.publish_at")},
              'ev', case when x.link_kind = 'event' then (select '/eventos/' || e.slug from events e where e.id = x.event_id) end,
              'quedan', greatest(1, ceil(extract(epoch from least(x.publish_at + interval '24 hours', coalesce(x.ends_at, 'infinity'::timestamptz)) - now()) / 3600))::int,
              'foto', coalesce((select m.url from media m where m.owner_kind = 'post' and m.owner_id = x.id::text and m.status = 'visible' order by m.sort, m.created_at limit 1),
                               (select i.photos[1] from items i where i.id = x.item_id and i.removed_at is null),
                               (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1)))
              order by x.publish_at desc, x.id desc) as avisos
       from x join businesses b on b.id = x.business_id
      where true ${despues}
      group by x.business_id, x.ult, b.id
      order by x.ult desc, x.business_id desc
      limit ${n + 1}`, v);
  const filas = r.rows.slice(0, n);
  const historias: Historia[] = filas.map((h) => ({
    id: h.id, nombre: h.nombre, logo: h.logo, mi: h.mi, domicilio: h.domicilio,
    avisos: h.avisos.map((a) => ({ id: a.id, t: a.ev ? "ev" : TIPO_HOY[a.kind] ?? "nv", texto: a.texto, at: a.at, quedan: a.quedan, foto: a.foto, ev: a.ev })),
  }));
  return { historias, mas: r.rows.length > n ? filas.at(-1)!.cur : null };
}

/* ¿Cuánto le queda en Hoy a cada novedad de un negocio? (la ficha y el panel dicen «En Hoy en el barrio · quedan N h»). */
export async function quedanEnHoy(negocio: string): Promise<Map<string, number>> {
  const r = await db().query<{ id: string; h: number }>(
    `select p.id::text, greatest(1, ceil(extract(epoch from least(p.publish_at + interval '24 hours', coalesce(p.ends_at, 'infinity'::timestamptz)) - now()) / 3600))::int as h
       from business_posts p where p.business_id = $1 and p.status = 'live' and p.hidden_at is null and p.hoy_off_at is null
        and p.publish_at > now() - interval '24 hours' and post_en_hoy(p)`, [negocio]);
  return new Map(r.rows.map((x) => [x.id, x.h]));
}

/* Barrido: a quien sigue (guardó) un negocio le llega una vez «Hoy en un negocio que sigues» cuando una novedad entra a Hoy (también
   la programada, al salir). Sin SMS; respeta la preferencia «hoy» de cada persona. Lotes de 20 novedades por pasada. */
export async function avisarHoyGuardados(): Promise<number> {
  const L = (await db().query<{ id: string; negocio: string; nombre: string; titulo: string }>(
    `update business_posts p set hoy_avisado_at = now()
       from (select q.id from business_posts q where q.status = 'live' and q.hidden_at is null and q.hoy_off_at is null and q.hoy_avisado_at is null
               and q.publish_at > now() - interval '24 hours' and q.publish_at <= now() and post_en_hoy(q)
             order by q.publish_at limit 20 for update skip locked) s, businesses b
      where p.id = s.id and b.id = p.business_id
      returning p.id::text, p.business_id as negocio, b.name as nombre, p.title as titulo`)).rows;
  for (const x of L) {
    const ids = (await db().query<{ id: string }>(
      `select f.follower_user_id::text as id from follows f join users u on u.id = f.follower_user_id
        where f.target_kind = 'business' and f.target_id = $1 and coalesce((u.notif_prefs->>'hoy')::boolean, true)
          and cuenta_estado(u.status, u.status_until) in ('active', 'muted')`, [x.negocio])).rows.map((y) => y.id);
    await avisarMuchos(ids, "hoy_guardado", { es: { negocio: x.nombre, titulo: x.titulo }, en: { negocio: x.nombre, titulo: x.titulo } }, { href: `/n/${x.negocio}?tab=nov`, ref: ["business_post", x.id] });
  }
  return L.length;
}
