import "server-only";
import type { Staff } from "./admin";
import { db } from "./db";

/* ADM-CONT · Contenido (Super Admin.dc.html secCont / contRow): todo lo que escribe un vecino o un negocio y que ya existe
   (reseñas, novedades, comentarios de novedades, vacantes y publicaciones de la Comunidad), en una lista con búsqueda, filtros
   (con reporte, ocultos, votos negativos) y paginación. Ocultar avisa al autor con el motivo; nada se borra. Acotado a las ciudades
   de quien mira. Publicaciones (5a): también fijar y bloquear comentarios; las borradas por su autor no salen aquí. */
export type TabCont = "all" | "rev" | "nov" | "cm" | "vac" | "pub";
export type FiltrosCont = { tab: TabCont; q: string; rep: boolean; hid: boolean; neg: boolean; pag: number };
export const POR_PAGINA_CONT = 20;
const TABS = new Set<TabCont>(["all", "rev", "nov", "cm", "vac", "pub"]);
export function leerFiltrosCont(sp: Record<string, string | undefined>): FiltrosCont {
  const tab = (TABS.has(sp.tab as TabCont) ? sp.tab : "all") as TabCont;
  return { tab, q: String(sp.q ?? "").trim().slice(0, 60), rep: sp.rep === "1", hid: sp.hid === "1", neg: sp.neg === "1", pag: Math.max(1, Math.min(500, Number(sp.pag) || 1)) };
}
export type FilaCont = { k: "rev" | "nov" | "cm" | "vac" | "pub"; id: string; biz: string; bname: string; who: string; text: string; extra: string | null; up: number; dn: number; at: string; hidden: boolean; why: string | null; rep: number; pin: boolean; lock: boolean };

/* Una sola consulta con UNION ALL: cada tipo trae lo mismo (tipo, id, negocio, autor, texto, votos, fecha, oculto, reportes). */
const PARTES: Record<Exclude<TabCont, "all">, string> = {
  rev: `select 'rev' as k, r.id::text as id, r.business_id as biz, b.name as bname, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), u.phone) as who,
          coalesce(r.body, '') as text, r.stars::text as extra, r.helpful_count as up, 0 as dn, r.created_at as at, r.status = 'hidden' as hidden, r.hidden_reason as why,
          (select count(*)::int from content_reports x where x.target_kind = 'review' and x.target_id = r.id::text and x.status = 'open') as rep, false as pin, false as lock, r.city_id
        from reviews r join businesses b on b.id = r.business_id join users u on u.id = r.user_id where r.status <> 'removed'`,
  nov: `select 'nov', p.id::text, p.business_id, b.name, b.name, p.title || coalesce('. ' || nullif(p.body, ''), ''), p.kind,
          (select count(*)::int from post_votes v where v.post_id = p.id and v.v = 1), (select count(*)::int from post_votes v where v.post_id = p.id and v.v = -1),
          p.created_at, p.hidden_at is not null, p.hidden_reason,
          (select count(*)::int from content_reports x where x.target_kind = 'post' and x.target_id = p.id::text and x.status = 'open'), p.pinned, false, p.city_id
        from business_posts p join businesses b on b.id = p.business_id where p.status <> 'removed'`,
  cm: `select 'cm', c.id::text, p.business_id, b.name, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), u.phone), c.body, p.title,
         (select count(*)::int from post_comment_votes v where v.comment_id = c.id), 0, c.created_at, c.status = 'hidden', null::text,
         (select count(*)::int from content_reports x where x.target_kind = 'comment' and x.target_id = c.id::text and x.status = 'open'), false, false, p.city_id
       from post_comments c join business_posts p on p.id = c.post_id join businesses b on b.id = p.business_id join users u on u.id = c.user_id where c.status <> 'removed'`,
  vac: `select 'vac', j.id::text, j.business_id, b.name, b.name, (j.title->>'es') || coalesce('. ' || nullif(j.descr->>'es', ''), ''), '$' || (j.pay_from_cents / 100.0)::numeric(8,2)::text || '/h',
          (select count(*)::int from job_applications a where a.job_id = j.id), 0, j.created_at, j.hidden_at is not null, j.hidden_reason, 0, false, false, j.city_id
        from job_postings j join businesses b on b.id = j.business_id where j.status <> 'removed'`,
  // Comunidad (5a): el autor es un vecino o la cuenta oficial; «negocio» = el recomendado, si lo hay.
  pub: `select 'pub', p.id::text, coalesce(p.business_id, ''), coalesce(b.name, ''),
          case when p.author_kind = 'official' then coalesce(oa.name->>'es', 'Cuenta oficial') else coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), u.phone) end,
          p.body, p.kind, p.up_n, p.down_n, p.created_at, p.status = 'hidden', p.hidden_reason,
          (select count(*)::int from content_reports x where x.target_kind = 'com_post' and x.target_id = p.id::text and x.status = 'open'),
          coalesce(p.pinned_until > now(), false), p.comments_locked_at is not null, p.city_id
        from com_posts p left join users u on u.id = p.author_user_id left join businesses b on b.id = p.business_id
        left join city_official_accounts oa on p.author_kind = 'official' and oa.city_id = p.city_id where p.status <> 'deleted'`,
};
export async function listaContenido(s: Staff, f: FiltrosCont) {
  const partes = f.tab === "all" ? Object.values(PARTES) : [PARTES[f.tab]];
  const w: string[] = ["(cardinality($1::text[]) = 0 or x.city_id = any($1::text[]))"], v: unknown[] = [s.cities];
  if (f.q) { v.push(`%${f.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`); w.push(`(x.text ilike $${v.length} or x.who ilike $${v.length} or x.bname ilike $${v.length})`); }
  if (f.rep) w.push("x.rep > 0");
  if (f.hid) w.push("x.hidden");
  if (f.neg) w.push("x.dn > 0");
  const COLS = "(k, id, biz, bname, who, text, extra, up, dn, at, hidden, why, rep, pin, lock, city_id)";
  const base = `with x${COLS} as (${partes.join("\nunion all\n")}) select * from x where ${w.join(" and ")}`;
  const [L, n, cab] = await Promise.all([
    db().query<FilaCont>(`select k, id, biz, bname, who, text, extra, up, dn, to_char(at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, hidden, why, rep, pin, lock
       from (${base}) y order by (rep > 0) desc, at desc, id desc limit ${POR_PAGINA_CONT} offset ${(f.pag - 1) * POR_PAGINA_CONT}`, v),
    db().query<{ n: number }>(`select count(*)::int as n from (${base}) y`, v),
    db().query<{ rev: number; nov: number; cm: number; vac: number; pub: number; rep: number; hid: number }>(
      `with x${COLS} as (${Object.values(PARTES).join("\nunion all\n")}) select count(*) filter (where k = 'rev')::int as rev, count(*) filter (where k = 'nov')::int as nov,
              count(*) filter (where k = 'cm')::int as cm, count(*) filter (where k = 'vac')::int as vac, count(*) filter (where k = 'pub')::int as pub, count(*) filter (where rep > 0)::int as rep, count(*) filter (where hidden)::int as hid
         from x where cardinality($1::text[]) = 0 or x.city_id = any($1::text[])`, [s.cities]),
  ]);
  return { filas: L.rows, total: n.rows[0]!.n, cab: cab.rows[0]! };
}
export type ListaCont = Awaited<ReturnType<typeof listaContenido>>;
