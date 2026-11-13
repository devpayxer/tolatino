import "server-only";
import type { Staff } from "./admin";
import { db } from "./db";

/* ADM-CONT · Contenido (Super Admin.dc.html secCont / contRow; fase5-comunidad.md §4 5i): todo lo que escribe un vecino o un negocio,
   en una lista con búsqueda, filtros y CURSOR (nunca offset). Las 7 pestañas del prototipo: Todo · Publicaciones · Comentarios · Hoy en
   el barrio · Reseñas · Auto-moderación · Cuenta oficial; novedades, sus comentarios y vacantes salen en Todo con el filtro «Tipo».
   Filtros: ciudad, tipo, estado (se ve / oculto), con reporte, votos negativos, 10+ votos, autor (desde Usuarios 360°), rango mínimo
   del autor y «de invitados» (vive en otra ciudad). Ocultar avisa al autor con el motivo; nada se borra. Acotado a las ciudades de
   quien mira. Las borradas por su autor no salen aquí. */
export type TabCont = "all" | "pub" | "ccm" | "rev";
export type TipoCont = "rev" | "nov" | "cm" | "vac" | "pub" | "ccm";
export type FiltrosCont = { tab: TabCont; q: string; tipo: TipoCont | null; ciudad: string | null; estado: "vis" | "hid" | null; rep: boolean; neg: boolean; top: boolean;
  autor: string | null; rango: number | null; inv: boolean; c: string | null };
export const POR_PAGINA_CONT = 20;
const TABS = new Set<TabCont>(["all", "pub", "ccm", "rev"]);
const TIPOS = new Set<TipoCont>(["rev", "nov", "cm", "vac", "pub", "ccm"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CURSOR = /^[01]\|\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z\|(rev|nov|cm|vac|pub|ccm)\|\d{1,18}$/;
export function leerFiltrosCont(sp: Record<string, string | undefined>): FiltrosCont {
  // Las pestañas de antes (nov, cm, vac) siguen funcionando como Todo con su tipo.
  const viejo = sp.tab === "nov" || sp.tab === "cm" || sp.tab === "vac" ? (sp.tab as TipoCont) : null;
  const tab = (TABS.has(sp.tab as TabCont) ? sp.tab : "all") as TabCont;
  const rango = Number(sp.rk);
  return {
    tab, q: String(sp.q ?? "").trim().slice(0, 60), tipo: viejo ?? (tab === "all" && TIPOS.has(sp.tipo as TipoCont) ? (sp.tipo as TipoCont) : null),
    ciudad: /^[a-z0-9-]{2,20}$/.test(sp.ciudad ?? "") ? sp.ciudad! : null, estado: sp.est === "vis" || sp.est === "hid" ? sp.est : sp.hid === "1" ? "hid" : null,
    rep: sp.rep === "1", neg: sp.neg === "1", top: sp.top === "1", autor: UUID.test(sp.autor ?? "") ? sp.autor! : null,
    rango: Number.isInteger(rango) && rango >= 2 && rango <= 10 ? rango : null, inv: sp.inv === "1", c: CURSOR.test(sp.c ?? "") ? sp.c! : null,
  };
}
export type FilaCont = { k: TipoCont; id: string; biz: string; bname: string; who: string; uid: string | null; rango: number | null; inv: boolean; oficial: boolean; ciudad: string;
  text: string; extra: string | null; up: number; dn: number; at: string; hidden: boolean; why: string | null; rep: number; pin: boolean; lock: boolean; cur: string };

const NOMBRE = (u: string) => `coalesce(nullif(trim(coalesce(${u}.first_name, '') || ' ' || left(coalesce(${u}.last_name, ''), 1)), ''), ${u}.phone)`;
const RANGO = (u: string) => `(select cp.rank_level::int from community_profiles cp where cp.user_id = ${u})`;
/* Una sola consulta con UNION ALL: cada tipo trae lo mismo (tipo, id, negocio, autor, su id y rango, invitado, oficial, texto, votos,
   fecha, oculto, reportes, ciudad). */
const PARTES: Record<TipoCont, string> = {
  rev: `select 'rev' as k, r.id::text as id, r.business_id as biz, b.name as bname, ${NOMBRE("u")} as who, u.id::text as uid, ${RANGO("u.id")} as rango, false as inv, false as oficial,
          coalesce(r.body, '') as text, r.stars::text as extra, r.helpful_count as up, 0 as dn, r.created_at as at, r.status = 'hidden' as hidden, r.hidden_reason as why,
          (select count(*)::int from content_reports x where x.target_kind = 'review' and x.target_id = r.id::text and x.status = 'open') as rep, false as pin, false as lock, r.city_id
        from reviews r join businesses b on b.id = r.business_id join users u on u.id = r.user_id where r.status <> 'removed'`,
  nov: `select 'nov', p.id::text, p.business_id, b.name, b.name, null::text, null::int, false, false, p.title || coalesce('. ' || nullif(p.body, ''), ''), p.kind,
          (select count(*)::int from post_votes v where v.post_id = p.id and v.v = 1), (select count(*)::int from post_votes v where v.post_id = p.id and v.v = -1),
          p.created_at, p.hidden_at is not null, p.hidden_reason,
          (select count(*)::int from content_reports x where x.target_kind = 'post' and x.target_id = p.id::text and x.status = 'open'), p.pinned, false, p.city_id
        from business_posts p join businesses b on b.id = p.business_id where p.status <> 'removed'`,
  cm: `select 'cm', c.id::text, p.business_id, b.name, ${NOMBRE("u")}, u.id::text, ${RANGO("u.id")}, false, false, c.body, p.title,
         (select count(*)::int from post_comment_votes v where v.comment_id = c.id), 0, c.created_at, c.status = 'hidden', null::text,
         (select count(*)::int from content_reports x where x.target_kind = 'comment' and x.target_id = c.id::text and x.status = 'open'), false, false, p.city_id
       from post_comments c join business_posts p on p.id = c.post_id join businesses b on b.id = p.business_id join users u on u.id = c.user_id where c.status <> 'removed'`,
  vac: `select 'vac', j.id::text, j.business_id, b.name, b.name, null::text, null::int, false, false, (j.title->>'es') || coalesce('. ' || nullif(j.descr->>'es', ''), ''), '$' || (j.pay_from_cents / 100.0)::numeric(8,2)::text || '/h',
          (select count(*)::int from job_applications a where a.job_id = j.id), 0, j.created_at, j.hidden_at is not null, j.hidden_reason, 0, false, false, j.city_id
        from job_postings j join businesses b on b.id = j.business_id where j.status <> 'removed'`,
  // Comunidad (5a): el autor es un vecino o la cuenta oficial; «negocio» = el recomendado, si lo hay.
  pub: `select 'pub', p.id::text, coalesce(p.business_id, ''), coalesce(b.name, ''),
          case when p.author_kind = 'official' then coalesce(oa.name->>'es', 'Cuenta oficial') else ${NOMBRE("u")} end, u.id::text, ${RANGO("u.id")}, p.guest_from_city_id is not null, p.author_kind = 'official',
          p.body, p.kind, p.up_n, p.down_n, p.created_at, p.status = 'hidden', p.hidden_reason,
          (select count(*)::int from content_reports x where x.target_kind = 'com_post' and x.target_id = p.id::text and x.status = 'open'),
          coalesce(p.pinned_until > now(), false), p.comments_locked_at is not null, p.city_id
        from com_posts p left join users u on u.id = p.author_user_id left join businesses b on b.id = p.business_id
        left join city_official_accounts oa on p.author_kind = 'official' and oa.city_id = p.city_id where p.status <> 'deleted'`,
  // Comentarios de la Comunidad (5b): «extra» = la publicación donde está (para el hilo); «negocio» = el que recomienda, si lo hay.
  ccm: `select 'ccm', c.id::text, coalesce(c.business_id, ''), coalesce(b.name, ''), ${NOMBRE("u")}, u.id::text, ${RANGO("u.id")}, false, false,
          c.body, c.post_id::text, c.up_n, c.down_n, c.created_at, c.status = 'hidden', c.hidden_reason,
          (select count(*)::int from content_reports x where x.target_kind = 'com_comment' and x.target_id = c.id::text and x.status = 'open'), false, false, c.city_id
        from com_comments c join users u on u.id = c.author_user_id left join businesses b on b.id = c.business_id where c.status <> 'deleted'`,
};
const COLS = "(k, id, biz, bname, who, uid, rango, inv, oficial, text, extra, up, dn, at, hidden, why, rep, pin, lock, city_id)";
/* 9b-3 · A escala (1 M de publicaciones y 5 M de comentarios en la carga), una UNION de todo ordenada por «con reporte» y fecha juntaba y
   ordenaba TODO en cada vista. Ahora cada tipo aporta dos trozos: lo reportado (desde los reportes abiertos, que son pocos) y lo más nuevo sin
   reporte (por el índice de fecha, ya filtrado y desde el cursor, con un tope de una página + 1); la página sale de juntar esos trozos. Es la
   misma lista y el mismo orden: lo de una página está siempre dentro de los trozos. */
const REPORTE: Record<TipoCont, { kind: string; col: string } | null> = {
  rev: { kind: "review", col: "r.id" }, nov: { kind: "post", col: "p.id" }, cm: { kind: "comment", col: "c.id" }, vac: null,
  pub: { kind: "com_post", col: "p.id" }, ccm: { kind: "com_comment", col: "c.id" },
};
export async function listaContenido(s: Staff, f: FiltrosCont) {
  const tipos: TipoCont[] = f.tab === "pub" ? ["pub"] : f.tab === "ccm" ? ["ccm"] : f.tab === "rev" ? ["rev"] : f.tipo ? [f.tipo] : (Object.keys(PARTES) as TipoCont[]);
  const w: string[] = ["(cardinality($1::text[]) = 0 or x.city_id = any($1::text[]))"], v: unknown[] = [s.cities];
  const add = (sql: string, val: unknown) => { v.push(val); w.push(sql.replace(/\$\?/g, `$${v.length}`)); };
  if (f.q) add(`(x.text ilike $? or x.who ilike $? or x.bname ilike $?)`, `%${f.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`);
  if (f.ciudad) add("x.city_id = $?", f.ciudad);
  if (f.estado) w.push(f.estado === "hid" ? "x.hidden" : "not x.hidden");
  if (f.neg) w.push("x.dn > 0");
  if (f.top) w.push("x.up - x.dn >= 10");
  if (f.autor) add("x.uid = $?", f.autor);
  if (f.rango) add("coalesce(x.rango, 1) >= $?::int", f.rango);
  if (f.inv) w.push("x.inv");
  // El cursor (con reporte, fecha, tipo, id): dentro de cada trozo, para que su tope cuente desde ahí.
  // En lo reportado el cursor compara (fecha, tipo, id) dentro de esa parte; en lo demás, si el cursor todavía está en lo reportado, entra todo
  // (va después), y si no, (fecha, tipo, id) con «fecha ≤» para que el índice de fecha empiece ahí (comparar «con reporte» fila por fila lo recorría entero).
  let curR = "", curN = "", rCur = 1;
  if (f.c) {
    const [r, at, k, id] = f.c.split("|"); rCur = Number(r); v.push(at, k, id);
    const t = `(x.at, x.k, x.id) < ($${v.length - 2}::timestamptz, $${v.length - 1}::text, $${v.length}::text)`;
    curR = ` and ${t}`;
    curN = rCur === 1 ? "" : ` and x.at <= $${v.length - 2}::timestamptz and ${t}`;
  }
  const LIM = POR_PAGINA_CONT + 1, trozos: string[] = [];
  for (const t of tipos) {
    const R = REPORTE[t], base = PARTES[t];
    const abierto = R ? `exists (select 1 from content_reports cr where cr.target_kind = '${R.kind}' and cr.target_id = ${R.col}::text and cr.status = 'open')` : "false";
    // Lo reportado: los que tienen un reporte abierto (desde content_reports_abiertos_idx). Solo si el cursor todavía está en esa parte.
    if (R && rCur === 1) trozos.push(`(select * from (${base} and ${R.col} in (select cr.target_id::bigint from content_reports cr where cr.target_kind = '${R.kind}' and cr.status = 'open' and cr.target_id ~ '^[0-9]{1,18}$')) x${COLS}
      where ${w.join(" and ")}${curR} order by x.at desc, x.k desc, x.id desc limit ${LIM})`);
    // Lo demás: lo más nuevo sin reporte, por fecha.
    if (!f.rep) trozos.push(`(select * from (${base} and not ${abierto}) x${COLS} where ${w.join(" and ")}${curN} order by x.at desc, x.k desc, x.id desc limit ${LIM})`);
  }
  const [L, cab, ciu] = await Promise.all([
    trozos.length ? db().query<FilaCont>(`select y.k, y.id, y.biz, y.bname, y.who, y.uid, y.rango, y.inv, y.oficial, ci.name as ciudad, y.text, y.extra, y.up, y.dn, to_char(y.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, y.hidden, y.why, y.rep, y.pin, y.lock,
              (y.rep > 0)::int || '|' || to_char(y.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || y.k || '|' || y.id as cur
         from (${trozos.join("\nunion all\n")}) y left join cities ci on ci.id = y.city_id order by (y.rep > 0)::int desc, y.at desc, y.k desc, y.id desc limit ${LIM}`, v) : Promise.resolve({ rows: [] as FilaCont[] }),
    // Las cifras de arriba: los totales del conteo por ciudad (el barrido lo rehace cada 10 min); reportes, ocultos, Hoy y el lote, al momento.
    db().query<{ rev: number; pub: number; ccm: number; rep: number; hid: number; hoy: number; lote: number }>(
      `select coalesce((select sum(total) from content_counts_cache where k = 'rev' and (cardinality($1::text[]) = 0 or city_id = any($1::text[]))), 0)::int as rev,
              coalesce((select sum(total) from content_counts_cache where k = 'pub' and (cardinality($1::text[]) = 0 or city_id = any($1::text[]))), 0)::int as pub,
              coalesce((select sum(total) from content_counts_cache where k = 'ccm' and (cardinality($1::text[]) = 0 or city_id = any($1::text[]))), 0)::int as ccm,
              (select count(distinct (cr.target_kind, cr.target_id))::int from content_reports cr where cr.status = 'open' and cr.target_kind in ('review', 'post', 'comment', 'com_post', 'com_comment')
                  and (cardinality($1::text[]) = 0 or cr.city_id = any($1::text[]) or cr.city_id is null)) as rep,
              (select count(*)::int from com_posts p where p.status = 'hidden' and (cardinality($1::text[]) = 0 or p.city_id = any($1::text[])))
                + (select count(*)::int from com_comments c where c.status = 'hidden' and (cardinality($1::text[]) = 0 or c.city_id = any($1::text[])))
                + (select count(*)::int from reviews r where r.status = 'hidden' and (cardinality($1::text[]) = 0 or r.city_id = any($1::text[])))
                + (select count(*)::int from business_posts p where p.status <> 'removed' and p.hidden_at is not null and (cardinality($1::text[]) = 0 or p.city_id = any($1::text[]))) as hid,
              (select count(*)::int from business_posts p where p.status = 'live' and p.hidden_at is null and p.hoy_off_at is null and p.publish_at > now() - interval '24 hours'
                  and post_en_hoy(p) and (cardinality($1::text[]) = 0 or p.city_id = any($1::text[]))) as hoy,
              (select count(*)::int from (select distinct cr.target_kind, cr.target_id from content_reports cr where cr.status = 'open' and cr.target_kind in ('com_post', 'com_comment') and cr.target_id ~ '^[0-9]{1,18}$') r
                  where (r.target_kind = 'com_post' and exists (select 1 from com_posts p where p.id = r.target_id::bigint and p.status = 'visible' and (cardinality($1::text[]) = 0 or p.city_id = any($1::text[]))))
                     or (r.target_kind = 'com_comment' and exists (select 1 from com_comments c where c.id = r.target_id::bigint and c.status = 'visible' and (cardinality($1::text[]) = 0 or c.city_id = any($1::text[]))))) as lote`, [s.cities]),
    // Todas las ciudades de quien mira: las abiertas o con algo escrito son filtro; todas son destino de «Mover de ciudad».
    db().query<{ id: string; name: string; filtro: boolean }>(`select id, name, status = 'on' or exists (select 1 from com_posts p where p.city_id = cities.id) as filtro from cities where cardinality($1::text[]) = 0 or id = any($1::text[]) order by name`, [s.cities]),
  ]);
  const filas = L.rows.slice(0, POR_PAGINA_CONT);
  return { filas, sig: L.rows.length > POR_PAGINA_CONT ? filas[filas.length - 1]!.cur : null, cab: cab.rows[0]!, ciudades: ciu.rows.filter((x) => x.filtro), destinos: ciu.rows };
}
/* 9b-3 · El barrido: los totales de Contenido (content_counts_cache) cada 10 minutos. */
export async function contenidoAlDia(): Promise<number> {
  return (await db().query<{ n: number }>(`select contenido_al_dia() as n`)).rows[0]?.n ?? 0;
}
export type ListaCont = Awaited<ReturnType<typeof listaContenido>>;

/* El hilo como en la Comunidad (MEM 700, threadDetail): la publicación con su autor, rango, tema, fotos, encuesta, negocio y votos, y todos
   sus comentarios (también los ocultos, marcados), las raíces por votos y sus respuestas debajo; el comentario de origen va marcado.
   El Super Admin ve siempre el original (sin traducción). Acotado a las ciudades de quien mira. */
export type CmAdm = { id: string; parent: string | null; who: string; uid: string; rango: number; body: string; at: string; up: number; dn: number; score: number; status: string; why: string | null;
  biz: string | null; rep: number; hiddenBy: string | null };
export async function hiloAdmin(s: Staff, id: string) {
  if (!/^\d{1,18}$/.test(id)) return null;
  const p = (await db().query<{ id: string; kind: string; topic: string | null; body: string; at: string; city_id: string; ciudad: string; status: string; why: string | null; hiddenBy: string | null;
    oficial: boolean; who: string; uid: string | null; rango: number; inv: string | null; biz: string | null; opts: string[] | null; conteo: number[] | null; fotos: string[];
    up: number; dn: number; score: number; cms: number; rep: number; fijada: boolean; cerrados: boolean }>(
    `select p.id::text, p.kind, p.topic, p.body, to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, p.city_id, ci.name as ciudad, p.status, p.hidden_reason as why, p.hidden_by as "hiddenBy",
            p.author_kind = 'official' as oficial, case when p.author_kind = 'official' then coalesce(oa.name->>'es', 'Cuenta oficial') else ${NOMBRE("u")} end as who, u.id::text as uid,
            coalesce(${RANGO("u.id")}, 1) as rango, gc.name as inv, b.name as biz, p.poll_options as opts, p.poll_counts as conteo,
            coalesce((select array_agg(m.url order by m.sort) from media m where m.owner_kind = 'com_post' and m.owner_id = p.id::text and m.status = 'visible'), '{}') as fotos,
            p.up_n as up, p.down_n as dn, p.score, p.comments_n as cms,
            (select count(*)::int from content_reports x where x.target_kind = 'com_post' and x.target_id = p.id::text and x.status = 'open') as rep,
            coalesce(p.pinned_until > now(), false) as fijada, p.comments_locked_at is not null as cerrados
       from com_posts p join cities ci on ci.id = p.city_id left join users u on u.id = p.author_user_id left join businesses b on b.id = p.business_id
       left join cities gc on gc.id = p.guest_from_city_id left join city_official_accounts oa on p.author_kind = 'official' and oa.city_id = p.city_id
      where p.id = $1::bigint and p.status <> 'deleted' and (cardinality($2::text[]) = 0 or p.city_id = any($2::text[]))`, [id, s.cities])).rows[0];
  if (!p) return null;
  const C = (await db().query<CmAdm>(
    `select c.id::text, c.parent_id::text as parent, ${NOMBRE("u")} as who, u.id::text as uid, coalesce(${RANGO("u.id")}, 1) as rango, c.body,
            to_char(c.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, c.up_n as up, c.down_n as dn, c.score, c.status, c.hidden_reason as why, b.name as biz,
            (select count(*)::int from content_reports x where x.target_kind = 'com_comment' and x.target_id = c.id::text and x.status = 'open') as rep, c.hidden_by as "hiddenBy"
       from com_comments c join users u on u.id = c.author_user_id left join businesses b on b.id = c.business_id
      where c.post_id = $1::bigint and c.status <> 'deleted' order by c.parent_id nulls first, c.score desc, c.id limit 500`, [id])).rows;
  const raices = C.filter((c) => !c.parent), hijos = (r: string) => C.filter((c) => c.parent === r).sort((a, b) => Number(a.id) - Number(b.id));
  return { p, comentarios: raices.flatMap((r) => [r, ...hijos(r.id)]) };
}
export type HiloAdmin = NonNullable<Awaited<ReturnType<typeof hiloAdmin>>>;

/* 5e · Contenido › Hoy en el barrio: lo que sale ahora en Hoy de las ciudades de quien mira (la misma regla post_en_hoy de la base) y lo
   que To'Latino retiró en las últimas 24 h, con su origen (la novedad de qué negocio, quién la publicó y cuándo) y cuánto le queda. */
export type FilaHoy = { id: string; biz: string; bname: string; kind: string; title: string; quien: string | null; at: string; quedan: number; enHoy: boolean;
  off: string | null; offAt: string | null; offBy: string | null; city_id: string; seguidores: number };
export async function hoyAdmin(s: Staff) {
  const r = await db().query<FilaHoy>(
    `select p.id::text, p.business_id as biz, b.name as bname, p.kind, p.title,
            coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), null) as quien,
            to_char(p.publish_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at,
            greatest(1, ceil(extract(epoch from least(p.publish_at + interval '24 hours', coalesce(p.ends_at, 'infinity'::timestamptz)) - now()) / 3600))::int as quedan,
            post_en_hoy(p) as "enHoy", p.hoy_off_reason as off, to_char(p.hoy_off_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "offAt",
            coalesce(nullif(trim(coalesce(o.first_name, '') || ' ' || left(coalesce(o.last_name, ''), 1)), ''), null) as "offBy", p.city_id,
            (select count(*)::int from follows f where f.target_kind = 'business' and f.target_id = p.business_id) as seguidores
       from business_posts p join businesses b on b.id = p.business_id left join users u on u.id = p.created_by left join users o on o.id = p.hoy_off_by
      where p.status = 'live' and p.publish_at > now() - interval '24 hours' and p.publish_at <= now() and (cardinality($1::text[]) = 0 or p.city_id = any($1::text[]))
        and (post_en_hoy(p) or p.hoy_off_at is not null)
      order by (p.hoy_off_at is not null), p.publish_at desc, p.id desc limit 200`, [s.cities]);
  return { filas: r.rows, enHoy: r.rows.filter((x) => x.enHoy).length, negocios: new Set(r.rows.filter((x) => x.enHoy).map((x) => x.biz)).size, retiradas: r.rows.filter((x) => x.off).length };
}
export type HoyAdmin = Awaited<ReturnType<typeof hoyAdmin>>;
