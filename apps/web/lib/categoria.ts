import "server-only";
import { db } from "./db";
import { foto, slugCat } from "./directorio";
import type { Lang } from "./idioma";

/* Página de categoría (APP-NEG-CAT). El servidor decide: qué mosaico está elegido, qué filtros existen (solo los
   activos en filter_options), el orden y la página. La configuración sale de categories.page (+ page_admin). */

type Bi = { es: string; en: string };
export type Regla = { subs?: string[]; tag?: string; attr?: string; value?: string; cap_gte?: number };
export type Mosaico = { key: string; label: Bi; match: Regla | null; photo: string | null; flag: string | null };
export type Pagina = {
  title: Bi; hero: string | null; search_ph: Bi; craving: Bi; stats_tag: string; stats_label: Bi; map_label: Bi;
  band: { title: Bi; sub: Bi; cta: Bi; sub_key: string | null; match: Regla | null; code: string | null } | null;
  rows: { key: string; title: Bi; kind: "photo" | "chip"; all_first: boolean; all_photo: string | null; items: Mosaico[]; more: Mosaico[]; more_label: Bi | null }[];
  chapters: { key: string; title: Bi; items: Mosaico[] }[];
  quick5: { key: string; icon: string }[];
};
export type Filtro = { key: string; group: string; groupLabel: string; label: string; quick: boolean; icon: string | null };
export const ORDENES = ["rel", "near", "top", "rev"] as const;
export type Orden = (typeof ORDENES)[number];
export const POR_PAGINA = 10;
const PAGINA_MAX = 100; // tope de páginas: nadie navega más allá; protege la base de offsets enormes.

export async function categoriaPorSlug(slug: string) {
  const r = await db().query<{ id: string; es: string; page: Pagina; page_admin: Partial<Pagina> }>(
    `select id, short->>'es' as es, page, page_admin from categories where status = 'on' order by sort`);
  const c = r.rows.find((x) => slugCat(x.es) === slug);
  if (!c || !c.page || !("title" in c.page)) return null;
  return { id: c.id, page: { ...c.page, ...c.page_admin } as Pagina };
}

export async function filtros(cat: string, lang: Lang): Promise<Filtro[]> {
  const r = await db().query<Filtro>(
    `select key, group_key as "group", group_label->>$2 as "groupLabel", label->>$2 as label, quick, icon
       from filter_options where category_id = $1 and active order by sort`, [cat, lang]);
  return r.rows;
}

/* Todos los mosaicos que la página ofrece (filas, «ver todas», capítulos y la banda), por clave. */
export function mosaicos(p: Pagina): Map<string, Regla> {
  const m = new Map<string, Regla>();
  for (const r of p.rows) for (const t of [...r.items, ...r.more]) if (t.match) m.set(t.key, t.match);
  for (const g of p.chapters) for (const t of g.items) if (t.match) m.set(t.key, t.match);
  if (p.band?.sub_key && p.band.match) m.set(p.band.sub_key, p.band.match);
  return m;
}

export type Pedido = { ciudad: string; cat: string; sub: Regla | null; filtros: string[]; orden: Orden; pagina: number };
export type Resultado = {
  id: string; cat: string; name: string; pro: boolean; verified: boolean; rating: number | null; reviews: number; mi: number | null;
  radius: number | null; fromHome: boolean; phone: string | null; lat: number | null; lng: number | null;
  subs: string[]; tags: string[]; attrs: Record<string, unknown>; open: boolean; photo: string | null;
};

/* Condiciones SQL de un mosaico y de los filtros. Los valores siempre van como parámetros. */
function condiciones(p: Pedido, params: unknown[]) {
  const w: string[] = [];
  const add = (v: unknown) => { params.push(v); return `$${params.length}`; };
  const s = p.sub;
  if (s) {
    if (s.subs?.length) w.push(`b.subcategory_ids && ${add(s.subs)}::text[]`);
    if (s.tag) w.push(`b.filter_values @> array[${add(s.tag)}]::text[]`);
    if (s.attr && s.value != null) w.push(`(jsonb_typeof(b.category_attrs->${add(s.attr)}) = 'array' and b.category_attrs->$${params.length} ? ${add(String(s.value))})`);
    if (s.cap_gte != null) w.push(`(b.category_attrs->>'cap' is null or (b.category_attrs->>'cap')::numeric >= ${add(s.cap_gte)})`);
  }
  for (const f of p.filtros) {
    if (f === "open") w.push(`negocio_abierto(b.id, t.t)`);
    else if (f === "verified") w.push(`s.verified`);
    else if (f === "r45") w.push(`s.rating_avg >= 4.5`);
    else w.push(`b.filter_values @> array[${add(f)}]::text[]`);
  }
  return w.length ? " and " + w.join(" and ") : "";
}

/* Columnas de un negocio en una lista (todas derivadas del servidor; la tarjeta no calcula nada). */
export const CTE = `with c as (select center, timezone, default_radius from cities where id = $1),
          t as (select (now() at time zone c.timezone) as t from c)`;
export const COLUMNAS = `b.id, b.category_id as cat, b.name, s.plan = 'pro' as pro, s.verified, s.rating_avg::float as rating,
                   s.review_count as reviews,
                   case when b.geo is null then null else round((st_distance(b.geo, c.center) / 1609.34)::numeric, 1)::float end as mi,
                   b.service_radius_mi as radius, b.works_from_home as "fromHome", b.phone,
                   st_y(b.geo::geometry) as lat, st_x(b.geo::geometry) as lng,
                   b.subcategory_ids as subs, b.filter_values as tags, b.category_attrs as attrs,
                   negocio_abierto(b.id, t.t) as open,
                   coalesce(s.rating_avg, 0) * ln(s.review_count + 2) as score,
                   extract(day from t.t)::int as dia`;
export const DESDE = `from businesses b join business_stats_cache s on s.business_id = b.id, c, t
             where b.city_id = $1 and b.status = 'active'
               and (b.geo is null or st_dwithin(b.geo, c.center, c.default_radius * 1609.34))`;
export const FOTO = (x: string) =>
  `(select m.url from media m where m.owner_kind = 'business' and m.owner_id = ${x}.id and m.status = 'visible' order by m.sort limit 1) as photo`;
export const conFoto = <X extends { photo: string | null }>(x: X) => ({ ...x, photo: foto(x.photo) });

export async function resultados(p: Pedido): Promise<{ items: Resultado[]; total: number; pagina: number; paginas: number }> {
  const params: unknown[] = [p.ciudad, p.cat];
  const extra = condiciones(p, params);
  const pagina = Math.max(0, Math.min(p.pagina, PAGINA_MAX - 1));
  params.push(pagina * POR_PAGINA);
  const off = `$${params.length}`;
  // Pro primero siempre (prototipo negVals). En «Relevancia» los Pro rotan cada día para repartir la vitrina.
  const orden = {
    rel: `case when pro then mod(rn - mod(dia, greatest(npro, 1)) + npro, greatest(npro, 1)) end, score desc, id`,
    near: `mi asc nulls last, id`,
    top: `rating desc nulls last, id`,
    rev: `reviews desc, id`,
  }[p.orden];
  const r = await db().query<Resultado & { total: string }>(
    `${CTE},
          base as (select ${COLUMNAS} ${DESDE} and b.category_id = $2${extra}),
          r as (
            select *, (row_number() over (partition by pro order by score desc, id) - 1)::int as rn,
                   (count(*) filter (where pro) over ())::int as npro, count(*) over () as total
              from base)
     select r.*, ${FOTO("r")} from r order by pro desc, ${orden} limit ${POR_PAGINA} offset ${off}`,
    params,
  );
  const total = Number(r.rows[0]?.total ?? 0);
  const paginas = Math.max(1, Math.min(PAGINA_MAX, Math.ceil(total / POR_PAGINA)));
  const items = r.rows.map(({ total: _t, ...x }) => conFoto(x));
  return { items, total, pagina, paginas };
}

/* Destacados de la ciudad (APP-NEG-HOME): Pro, con foto y abiertos ahora; la vitrina rota cada día. */
export async function destacados(ciudad: string, n: number): Promise<Resultado[]> {
  const r = await db().query<Resultado>(
    `${CTE},
          base as (select ${COLUMNAS} ${DESDE} and s.plan = 'pro' and negocio_abierto(b.id, t.t)
                     and exists (select 1 from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible')),
          r as (select *, (row_number() over (order by id) - 1)::int as rn, count(*) over ()::int as npro from base)
     select r.*, ${FOTO("r")} from r order by mod(rn - mod(dia, greatest(npro, 1)) + npro, greatest(npro, 1)) limit $2`,
    [ciudad, n],
  );
  return r.rows.map(conFoto);
}

/* Nuevos en el barrio: los que se unieron en los últimos 60 días, el más reciente primero. */
export async function nuevos(ciudad: string, n: number): Promise<Resultado[]> {
  const r = await db().query<Resultado>(
    `${CTE}
     select ${COLUMNAS}, ${FOTO("b")} ${DESDE} and b.created_at > now() - interval '60 days'
      order by b.created_at desc, s.plan = 'pro' desc, b.id limit $2`,
    [ciudad, n],
  );
  return r.rows.map(conFoto);
}

/* Cuántos negocios activos tiene cada categoría en la ciudad (tarjetas de Negocios). */
export async function conteos(ciudad: string): Promise<Map<string, number>> {
  const r = await db().query<{ cat: string; n: number }>(
    `select category_id as cat, count(*)::int as n from businesses where city_id = $1 and status = 'active' group by category_id`, [ciudad]);
  return new Map(r.rows.map((x) => [x.cat, x.n]));
}

/* Línea de la portada: cuántos hay, cuántos abiertos y cuántos con el atributo estrella de la categoría. */
export async function cifras(ciudad: string, cat: string, tag: string) {
  const r = await db().query<{ total: number; abiertos: number; con: number }>(
    `with c as (select timezone from cities where id = $1), t as (select (now() at time zone c.timezone) as t from c)
     select count(*)::int as total, (count(*) filter (where negocio_abierto(b.id, t.t)))::int as abiertos,
            (count(*) filter (where b.filter_values @> array[$3]::text[]))::int as con
       from businesses b, t where b.city_id = $1 and b.category_id = $2 and b.status = 'active'`,
    [ciudad, cat, tag],
  );
  return r.rows[0] ?? { total: 0, abiertos: 0, con: 0 };
}

/* Horario de la semana de los negocios listados (una sola consulta) y la hora local de la ciudad. */
export async function horarios(ciudad: string, ids: string[]) {
  const [h, t] = await Promise.all([
    db().query<{ id: string; weekday: number; open: boolean; ranges: [string, string][] }>(
      `select business_id as id, weekday, open, ranges from business_hours where module = '' and business_id = any($1::text[])`, [ids]),
    db().query<{ dow: number; hm: string }>(
      `select extract(dow from t)::int as dow, to_char(t, 'HH24:MI') as hm from (select now() at time zone timezone as t from cities where id = $1) x`, [ciudad]),
  ]);
  const porId = new Map<string, { weekday: number; open: boolean; ranges: [string, string][] }[]>();
  for (const x of h.rows) (porId.get(x.id) ?? porId.set(x.id, []).get(x.id)!).push(x);
  return { porId, ahora: t.rows[0] ?? { dow: 0, hm: "00:00" } };
}

/* Nombres de subcategorías (para la línea de la tarjeta). */
export async function nombresSub(ids: string[], lang: Lang) {
  if (!ids.length) return new Map<string, string>();
  const r = await db().query<{ id: string; n: string }>(`select id, name->>$2 as n from subcategories where id = any($1::text[])`, [ids, lang]);
  return new Map(r.rows.map((x) => [x.id, x.n]));
}

export async function guardados(userId: string | null, ids: string[]) {
  if (!userId || !ids.length) return new Set<string>();
  const r = await db().query<{ id: string }>(
    `select target_id as id from favorites where user_id = $1 and kind = 'business' and target_id = any($2::text[])`, [userId, ids]);
  return new Set(r.rows.map((x) => x.id));
}
