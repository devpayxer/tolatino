import "server-only";
import type { Staff } from "./admin";
import { db } from "./db";
import { aPanel, fuerza, prueba } from "./panel-reglas";
import { TLOnbNeg } from "./onb/datos";
import { telefonoBonito } from "./panel";

/* ADM-NEG · Negocios: lista con filtros y el 360° de un negocio. Todo acotado a las ciudades de la persona
   (staff_members.cities; vacío = todas). Paginado de a 14 (lista acotada por ciudad: OFFSET con tope, como la página
   de categoría; ver LAUNCH-CHECKLIST). */
export const POR_PAGINA = 14;
export type FiltrosNeg = { q: string; cat: string | null; plan: string[]; est: string[]; mas: string[]; orden: string; pag: number };

export function leerFiltros(sp: Record<string, string | undefined>): FiltrosNeg {
  const lista = (v: string | undefined, ok: string[]) => (v ?? "").split(",").filter((x) => ok.includes(x));
  return {
    q: (sp.q ?? "").trim().slice(0, 80),
    cat: /^NEG-[A-Z]+$/.test(sp.cat ?? "") ? sp.cat! : null,
    plan: lista(sp.plan, ["pro", "free", "prueba"]),
    est: lista(sp.est, ["activo", "temp", "oculto", "susp", "cerrado"]),
    mas: lista(sp.mas, ["ver", "nover", "rep", "weak", "norev", "noown"]),
    orden: ["pro", "top", "new", "rep", "weak"].includes(sp.orden ?? "") ? sp.orden! : "pro",
    pag: Math.min(100, Math.max(1, Number(sp.pag) || 1)),
  };
}

const ESTADO_SQL = `case when b.status = 'closed' then 'cerrado' when b.status = 'suspended' then 'susp' when b.status = 'hidden' then 'oculto'
  when b.temp_closed_until > now() then 'temp' else 'activo' end`;
const REPORTES_SQL = `(select count(*) from queue_items q where q.business_id = b.id and q.status = 'open' and q.queue = 'medios')`;

export async function listaNegocios(s: Staff, f: FiltrosNeg) {
  const w: string[] = ["b.status <> 'merged'"];
  const p: unknown[] = [];
  const add = (sql: string, ...v: unknown[]) => { for (const x of v) p.push(x); w.push(sql.replace(/\$(\d)/g, (_, n) => `$${p.length - v.length + Number(n)}`)); };
  if (s.cities.length) add("b.city_id = any($1::text[])", s.cities);
  if (f.q) {
    const dig = f.q.replace(/\D/g, "");
    add(`(lower(b.name) like '%' || lower($1) || '%' or b.id like '%' || lower($1) || '%' or coalesce(b.address, '') ilike '%' || $1 || '%'
          or ($2 <> '' and length($2) >= 4 and coalesce(b.phone, '') like '%' || $2 || '%')
          or exists (select 1 from subcategories sc where sc.id = any(b.subcategory_ids) and lower(sc.name->>'es') like '%' || lower($1) || '%'))`, f.q, dig);
  }
  const wCat = [...w], pCat = [...p];
  if (f.plan.length) add(`(($1 and coalesce(s.plan,'free') = 'pro') or ($2 and coalesce(s.plan,'free') = 'free') or ($3 and (b.category_attrs->'onb'->'trial'->>'until')::timestamptz > now()))`, f.plan.includes("pro"), f.plan.includes("free"), f.plan.includes("prueba"));
  if (f.est.length) add(`${ESTADO_SQL} = any($1::text[])`, f.est);
  if (f.mas.includes("ver")) w.push("coalesce(s.verified, false)");
  if (f.mas.includes("nover")) w.push("coalesce(s.plan,'free') = 'pro' and not coalesce(s.verified, false)");
  if (f.mas.includes("rep")) w.push(`${REPORTES_SQL} > 0`);
  if (f.mas.includes("weak")) w.push("coalesce(s.profile_strength, 0) < 70");
  if (f.mas.includes("norev")) w.push("coalesce(s.review_count, 0) = 0");
  if (f.mas.includes("noown")) w.push("b.owner_user_id is null");
  const whereCat = wCat.join(" and ");
  if (f.cat) add("b.category_id = $1", f.cat);
  const where = w.join(" and ");
  const orden = { pro: "(coalesce(s.plan,'free') = 'pro') desc, s.review_count desc nulls last, b.name", top: "coalesce(s.rating_avg, 0) * 1000 + coalesce(s.review_count, 0) desc, b.name",
    new: "b.created_at desc", rep: `${REPORTES_SQL} desc, b.name`, weak: "coalesce(s.profile_strength, 0) asc, b.name" }[f.orden];
  const desde = (f.pag - 1) * POR_PAGINA;
  const [filas, total, cats, cab] = await Promise.all([
    db().query<{ id: string; name: string; cat: string; cat_id: string; subs: string | null; plan: string; trial: boolean; verified: boolean; rating: number | null; reviews: number; perfil: number; estado: string; cover: string | null }>(
      `select b.id, b.name, c.name->>'es' as cat, b.category_id as cat_id,
              (select string_agg(sc.name->>'es', ', ' order by array_position(b.subcategory_ids, sc.id)) from subcategories sc where sc.id = any(b.subcategory_ids[1:2])) as subs,
              coalesce(s.plan,'free') as plan, coalesce((b.category_attrs->'onb'->'trial'->>'until')::timestamptz > now(), false) as trial,
              coalesce(s.verified, false) as verified, s.rating_avg::float as rating, coalesce(s.review_count, 0) as reviews, coalesce(s.profile_strength, 0) as perfil,
              ${ESTADO_SQL} as estado,
              (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as cover
         from businesses b join categories c on c.id = b.category_id left join business_stats_cache s on s.business_id = b.id
        where ${where} order by ${orden} limit ${POR_PAGINA} offset ${desde}`, p),
    db().query<{ n: number }>(`select count(*)::int as n from businesses b left join business_stats_cache s on s.business_id = b.id where ${where}`, p),
    db().query<{ cat: string; n: number }>(`select b.category_id as cat, count(*)::int as n from businesses b left join business_stats_cache s on s.business_id = b.id where ${whereCat} group by 1`, pCat),
    db().query<{ n: number; pro: number; ver: number }>(
      `select count(*)::int as n, count(*) filter (where s.plan = 'pro')::int as pro, count(*) filter (where s.verified)::int as ver
         from businesses b left join business_stats_cache s on s.business_id = b.id where b.status <> 'merged' and (cardinality($1::text[]) = 0 or b.city_id = any($1::text[]))`, [s.cities]),
  ]);
  return { filas: filas.rows, total: total.rows[0]?.n ?? 0, porCat: Object.fromEntries(cats.rows.map((x) => [x.cat, x.n])), cab: cab.rows[0] ?? { n: 0, pro: 0, ver: 0 } };
}

/* El 360° de un negocio: lo que ve el cliente, lo que hizo el dueño, lo que hizo el equipo. */
export async function negocio360(s: Staff, id: string) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 80) return null;
  const b = (await db().query<{
    id: string; name: string; cat: string; cat_id: string; city: string; ciudad: string; subs: string | null; status: string; estado: string;
    status_reason: string | null; status_at: string | null; temp_until: string | null; temp_reason: string | null; closed_today: boolean;
    phone: string | null; address: string | null; email: string | null; about: { es: string; en: string } | null; amen: string[]; logo: string | null;
    created: string; updated: string; plan: string; verified: boolean; rating: number | null; reviews: number; perfil: number; origin: string;
    owner_id: string | null; owner: string | null; owner_phone: string | null; trial_until: string | null; trial_days: number | null;
    mi: number | null; admin_edits: Record<string, { at: string; by: string }>; staff_hidden: boolean; op: string; from_home: boolean;
    items: number; email_ok: boolean; faqs: number; itemsw: [string, string] | null;
  }>(
    `select b.id, b.name, c.name->>'es' as cat, b.category_id as cat_id, b.city_id as city, ci.name as ciudad,
            (select string_agg(sc.name->>'es', ', ' order by array_position(b.subcategory_ids, sc.id)) from subcategories sc where sc.id = any(b.subcategory_ids[1:2])) as subs,
            b.status, ${ESTADO_SQL} as estado, b.status_reason, b.status_at, b.temp_closed_until as temp_until, b.temp_closed_reason as temp_reason,
            coalesce(b.closed_on = (now() at time zone ci.timezone)::date, false) as closed_today,
            b.phone, b.address, b.email, b.about, b.amenities as amen, b.logo_url as logo, b.created_at as created, b.updated_at as updated,
            coalesce(s.plan,'free') as plan, coalesce(s.verified,false) as verified, s.rating_avg::float as rating, coalesce(s.review_count,0) as reviews,
            perfil_fuerza(b.id) as perfil, b.origin, b.owner_user_id as owner_id,
            nullif(trim(coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'')), '') as owner, u.phone as owner_phone,
            b.category_attrs->'onb'->'trial'->>'until' as trial_until, (b.category_attrs->'onb'->'trial'->>'days')::int as trial_days,
            case when b.geo is null then null else round((st_distance(b.geo, ci.center) / 1609.34)::numeric, 1)::float end as mi,
            b.admin_edits, b.staff_hidden, b.operation as op, b.works_from_home as from_home,
            case when jsonb_typeof(b.category_attrs->'items') = 'array' then jsonb_array_length(b.category_attrs->'items') else 0 end as items,
            coalesce(u.email_verified, false) as email_ok, (select count(*)::int from faqs f where f.business_id = b.id) as faqs, null as itemsw
       from businesses b join categories c on c.id = b.category_id join cities ci on ci.id = b.city_id
       left join business_stats_cache s on s.business_id = b.id left join users u on u.id = b.owner_user_id
      where b.id = $1 and (cardinality($2::text[]) = 0 or b.city_id = any($2::text[]))`, [id, s.cities])).rows[0];
  if (!b) return null;
  const [fotos, horas, equipo, notas, historial, casos, sello, cifras] = await Promise.all([
    db().query<{ id: string; url: string; status: string; removed_reason: string | null; removed_note: string | null; sort: number }>(
      `select id, url, status, removed_reason, removed_note, sort from media where owner_kind = 'business' and owner_id = $1
         and (status = 'visible' or removed_reason = 'admin') order by status = 'visible' desc, sort, created_at`, [id]),
    db().query<{ weekday: number; open: boolean; ranges: [string, string][] }>(`select weekday, open, ranges from business_hours where business_id = $1 and module = '' order by weekday`, [id]),
    db().query<{ id: string; kind: string; status: string; name: string; role: { es: string } | null; since: number | null; phone: string | null; show: boolean; hidden: boolean; hidden_reason: string | null }>(
      `select id, kind, status, display_name as name, role, since_year as since, phone, show_on_page as show, hidden_by_admin is not null as hidden, hidden_reason
         from business_members where business_id = $1 and status <> 'removed' order by (kind = 'owner') desc, sort, id`, [id]),
    db().query<{ text: string; quien: string | null; at: string }>(
      `select n.text, u.first_name as quien, n.at from admin_notes n left join users u on u.id = n.by_staff where n.target_kind = 'business' and n.target_id = $1 order by n.at desc limit 20`, [id]),
    db().query<{ action: string; before: unknown; after: unknown; reason: string | null; at: string; quien: string | null; actor_kind: string }>(
      `select a.action, a.before, a.after, a.reason, a.at, coalesce(nullif(trim(coalesce(u.first_name,'') || ' ' || coalesce(left(u.last_name,1),'')), ''), 'Sistema') as quien, a.actor_kind
         from audit_entries a left join users u on u.id::text = a.actor_id
        where a.target_kind = 'business' and a.target_id = $1 and a.actor_kind = 'staff' order by a.at desc limit 6`, [id]),
    db().query<{ id: string; queue: string; opened_at: string; status: string }>(
      `select id::text, queue, opened_at, status from queue_items where business_id = $1 order by status = 'open' desc, opened_at desc limit 10`, [id]),
    db().query<{ status: string; note: string | null; at: string }>(`select status, note, created_at as at from verification_requests where business_id = $1 order by created_at desc limit 1`, [id]),
    db().query<{ v30: number; c30: number }>(
      `select (select coalesce(sum(n),0)::int from business_views_daily where business_id = $1 and day > current_date - 30) as v30,
              (select count(*)::int from contact_taps where business_id = $1 and at > now() - interval '30 days') as c30`, [id]),
  ]);
  const tr = prueba(b.trial_until, b.trial_days);
  const dias = aPanel(horas.rows), visibles = fotos.rows.filter((x) => x.status === "visible").length;
  const fz = fuerza({
    items: b.items, itemsW: ((TLOnbNeg.CFG?.[b.cat_id]?.items as [string, string] | undefined) ?? ["servicios", "services"]), galeria: visibles, about: !!b.about?.es, logo: !!b.logo,
    sello: b.verified, correo: b.email_ok, faqs: b.faqs, resenasSinResponder: 0, equipo: equipo.rows.filter((m) => m.kind !== "owner" && m.status === "active").length,
    aDomicilio: b.op === "casa", diasAbiertos: dias.filter((d) => d.on).length, amenidades: b.amen.length, pro: b.plan === "pro",
  });
  return {
    fuerza: fz,
    ...b, phone: telefonoBonito(b.phone), owner_phone: telefonoBonito(b.owner_phone), trial: tr && tr.on ? tr : null,
    fotos: fotos.rows, horas: dias, equipo: equipo.rows.map((m) => ({ ...m, phone: telefonoBonito(m.phone) })), notas: notas.rows, historial: historial.rows,
    casos: casos.rows, sello: sello.rows[0] ?? null, cifras: cifras.rows[0] ?? { v30: 0, c30: 0 },
    puede: { editar: s.puede("neg", "editar"), retirar: s.puede("neg", "retirar"), cerrar: s.puede("neg", "retirar") && s.role === "admin" },
  };
}
export type Negocio360 = NonNullable<Awaited<ReturnType<typeof negocio360>>>;
