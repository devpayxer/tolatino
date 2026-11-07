import "server-only";
import type { Staff } from "./admin";
import { herramientaSP } from "./salud-pro";
import { aceptaTexto, resumenSP } from "./salud-pro-comun";
import { herramientaRetail, rubroRetail } from "./retail";
import { resumenRetail } from "./retail-comun";
import { herramientaFiesta } from "./fiestas";
import { resumenFiesta } from "./fiestas-comun";
import { herramientaTrans } from "./transporte";
import { resumenTrans, tituloTrans } from "./transporte-comun";
import { herramientaNoche, historialNoche } from "./noche";
import { postTexto, resumenNoche } from "./noche-comun";
import { db } from "./db";
import { aPanel, fuerza, prueba } from "./panel-reglas";
import { TLOnbNeg } from "./onb/datos";
import { licenciasTodas } from "./licencias";
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
    items: number; email_ok: boolean; faqs: number; crit: number; itemsw: [string, string] | null;
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
            coalesce(u.email_verified, false) as email_ok, (select count(*)::int from faqs f where f.business_id = b.id) as faqs,
            (select count(*)::int from reviews rv where rv.business_id = b.id and rv.status = 'visible' and rv.reply is null and rv.stars <= 3) as crit, null as itemsw
       from businesses b join categories c on c.id = b.category_id join cities ci on ci.id = b.city_id
       left join business_stats_cache s on s.business_id = b.id left join users u on u.id = b.owner_user_id
      where b.id = $1 and (cardinality($2::text[]) = 0 or b.city_id = any($2::text[]))`, [id, s.cities])).rows[0];
  if (!b) return null;
  const [fotos, horas, equipo, notas, historial, casos, sello, cifras, lic, menu, mods] = await Promise.all([
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
    licenciasTodas(id),
    // Menú (Comida): los platos con su estado, para ocultar uno con motivo (el dueño lo ve en su panel).
    db().query<{ id: string; name: string; sec: string | null; cents: number; hidden: boolean; reason: string | null; module: string; dur: number | null; extra: boolean; own: boolean; k: string | null; a: Record<string, unknown>; sk: string | null; edad: number; tienda: boolean; tallas: string | null }>(
      `select i.id::text, i.name->>'es' as name, s.name->>'es' as sec, i.price_cents as cents, i.status = 'hidden' as hidden, i.hidden_reason as reason, i.module,
              i.duration_min as dur, i.is_extra as extra, i.sell as own, i.svc_kind as k, i.svc_attrs as a, i.shop_kind as sk, i.age_min as edad, i.in_store_only as tienda,
              (select string_agg(v.label || ' ' || v.stock_left, ' · ' order by v.sort) from item_variants v where v.item_id = i.id and v.removed_at is null) as tallas
         from items i left join item_sections s on s.id = i.section_id where i.business_id = $1 and i.module in ('menu', 'svc', 'shop') and i.removed_at is null order by i.module, s.sort, i.sort, i.id`, [id]),
    // Pedidos en línea de este mes (mes de la ciudad): los que cuentan para el techo Free y todos.
    db().query<{ off: Record<string, { reason: string; at: string }>; mes: number; free: number; cap: number | null; rmes: number; rpend: number; rsv: boolean }>(
      `select b.modules_off as off,
              (select count(*)::int from operations o where o.business_id = b.id and o.kind = 'order' and o.sent_at >= date_trunc('month', now() at time zone c.timezone) at time zone c.timezone) as mes,
              (select count(*)::int from operations o where o.business_id = b.id and o.kind = 'table' and o.sent_at >= date_trunc('month', now() at time zone c.timezone) at time zone c.timezone) as rmes,
              (select count(*)::int from operations o where o.business_id = b.id and o.kind = 'table' and o.status = 'pending') as rpend, 'rsv' = any(b.modules_on) as rsv,
              (select count(*)::int from operations o where o.business_id = b.id and o.kind = 'order' and o.free_quota_month = to_char(now() at time zone c.timezone, 'YYYY-MM')) as free,
              (select (value #>> '{}')::int from platform_config where key = 'free_ops_cap') as cap
         from businesses b join cities c on c.id = b.city_id where b.id = $1`, [id]),
  ]);
  const tr = prueba(b.trial_until, b.trial_days);
  const dias = aPanel(horas.rows), visibles = fotos.rows.filter((x) => x.status === "visible").length;
  const fz = fuerza({
    items: b.items, itemsW: ((TLOnbNeg.CFG?.[b.cat_id]?.items as [string, string] | undefined) ?? ["servicios", "services"]), galeria: visibles, about: !!b.about?.es, logo: !!b.logo,
    sello: b.verified, correo: b.email_ok, faqs: b.faqs, resenasSinResponder: b.crit ?? 0, equipo: equipo.rows.filter((m) => m.kind !== "owner" && m.status === "active").length,
    aDomicilio: b.op === "casa", diasAbiertos: dias.filter((d) => d.on).length, amenidades: b.amen.length, pro: b.plan === "pro",
  });
  return {
    fuerza: fz,
    ...b, phone: telefonoBonito(b.phone), owner_phone: telefonoBonito(b.owner_phone), trial: tr && tr.on ? tr : null,
    fotos: fotos.rows, horas: dias, equipo: equipo.rows.map((m) => ({ ...m, phone: telefonoBonito(m.phone) })), notas: notas.rows, historial: historial.rows,
    casos: casos.rows, sello: sello.rows[0] ?? null, licencias: lic, cifras: cifras.rows[0] ?? { v30: 0, c30: 0 },
    menu: menu.rows.filter((x) => x.module === 'menu'), servicios: menu.rows.filter((x) => x.module === 'svc' && x.k !== 'renta' && x.k !== 'venta' && x.k !== 'auto'), productos: menu.rows.filter((x) => x.module === 'shop'), modsOff: mods.rows[0]?.off ?? {}, pedidosMes: mods.rows[0]?.mes ?? 0, pedidosFree: mods.rows[0]?.free ?? 0, pedidosCap: mods.rows[0]?.cap ?? 10,
    // Tu herramienta (Auto y Hogar, 4a): solo lectura en el Super Admin.
    herramienta: (await db().query<{ rate: number; warrM: number | null; warrMi: number | null; cut: number | null; h24: boolean; zone: number | null }>(`select t.labor_rate_cents as rate, t.warranty_months as "warrM", t.warranty_miles as "warrMi", t.same_day_cutoff_h as cut, t.h24, b.service_radius_mi as zone from trade_settings t join businesses b on b.id = t.business_id where t.business_id = $1`, [id])).rows[0] ?? null,
    // Tu herramienta de Doctores y Profesionales (4h-2): el mismo resumen que ve el dueño, en solo lectura.
    // Mercados y Tiendas (4n): Tu herramienta en solo lectura.
    herramientaRetail: rubroRetail(b.cat_id) ? await (async () => { const h = await herramientaRetail(id); return h ? { titulo: h.rubro === "merc" ? "Balanza y pedidos" : "Tallas y apartados", resumen: resumenRetail(h, true) } : null; })() : null,
    herramientaTrans: b.cat_id === "NEG-TRANS" ? await (async () => { const h = await herramientaTrans(id); return h ? { titulo: tituloTrans(h.kind, true), resumen: resumenTrans(h, true), kind: h.kind, forzado: h.forzado } : null; })() : null,
    // Noche (4na · MEM 164 «Super Admin ve "Esta noche" siempre»): el resumen, el tipo y lo que publicó (historial).
    // Educación (4ea): «Grupos y cupos» siempre en solo lectura (summary L306) y cada curso con sus grupos.
    herramientaEdu: b.cat_id === "NEG-EDU" ? await (async () => { const h = await (await import("./edu")).herramientaEdu(id); if (!h) return null;
      const C = await import("./inscripciones-comun");
      return { resumen: C.resumenEdu(h, true), how: [h.how.presencial ? "presencial" : "", h.how.linea ? "en línea" : "", h.how.hibrido ? "híbrido" : "", h.how.esp ? "en español" : ""].filter(Boolean).join(" · "),
        cursos: h.cursos.map((x) => ({ id: x.id, t: x.name.es, vende: x.vende, s: [C.precioInsc(x.cents, x.k, true), x.k === "curso" ? `${x.sem ?? 0} semanas · ${x.hrs ?? 0} h` : "", x.mat ? `matrícula ${C.usdI(x.mat)}` : "", x.plan ? `${x.plan} pagos` : "", x.g1 ? "primera clase gratis" : "",
          x.cert ? `${x.oficial ? "certificado oficial" : "constancia"}: ${x.cert.es}` : "", `${x.grupos.filter((g) => g.estado === "open").length} grupos · ${x.grupos.reduce((a, g) => a + (g.estado === "open" ? g.libres : 0), 0)} cupos libres`].filter(Boolean).join(" · ") })) }; })() : null,
    // Niños (4eb): «Cupos y licencia» en solo lectura (summary L307), el tipo, la licencia del DHS y si recibe por la app.
    herramientaNinos: b.cat_id === "NEG-NINOS" ? await (async () => { const h = await (await import("./ninos")).herramientaNinos(id); if (!h) return null;
      const C = await import("./ninos-comun"), I = await import("./inscripciones-comun");
      return { kind: C.KINDS_NINOS.find((k) => k[0] === h.kind)?.[1] ?? h.kind, cuidado: h.cuidado, resumen: h.cuidado ? C.resumenNinos(h, true) : h.edu ? I.resumenEdu(h.edu, true) : "Solo contacto",
        edad: C.edadTexto(h.edad, true), lic: C.licTexto(h.lic, true), recibe: h.recibe,
        bandas: h.bandas.map((b) => `${b.label.es}: ${b.libres}`).join(" · ") }; })() : null,
    // Deporte (4ec): «Membresías y contrato» o «Liga e inscripciones» en solo lectura (summary L308).
    // Iglesias (4ia): «Horarios y ayuda», «La ayuda de hoy» o «Precios y repatriación» en solo lectura (summary L315–317).
    herramientaFe: b.cat_id === "NEG-FE" ? await (async () => { const h = await (await import("./fe")).herramientaFe(id); if (!h) return null;
      const C = await import("./fe-comun");
      return { titulo: h.kind === "tienda" ? "Por contacto" : C.tituloFe(h, true), resumen: C.resumenFe(h, true), kind: h.kind, forzado: h.forzado,
        horarios: h.horarios.map((x) => `${x.label.es} · ${C.cortoFe(x.dow, x.min, true)} · ${C.LANG_FE[x.lang].es}`), linea: C.lineaFe(h.kind, h.subs).es }; })() : null,
    // Bienes Raíces (4ib): «Propiedades y visitas» y sus variantes en solo lectura (summary L319), cada propiedad con su estado y sus montos
    // (calculados por el servidor), la línea fija y la declaración de mayores por revisar. La dirección exacta no sale aquí.
    herramientaInm: b.cat_id === "NEG-INMUEBLE" ? await (async () => { const h = await (await import("./inmuebles")).herramientaInm(id); if (!h) return null;
      const C = await import("./inmuebles-comun");
      return { titulo: C.sinPropiedades(h.kind) ? "Por servicios" : C.tituloInm(h, true), resumen: C.resumenAdminInm(h), kind: h.kind, forzado: h.forzado, linea: C.lineaInm(h.kind, h.subs).es,
        props: h.props.map((p) => ({ id: p.id, name: p.name.es, adm: p.adm, senior: p.senior ? p.seniorSt : null,
          sub: [C.PROP[p.kind].es, p.rent != null ? `${C.usd(p.rent)}${C.porL(p.kind, true)}` : p.price != null ? C.usd(p.price) : "", p.moveIn != null ? `Para mudarte ${C.usd(p.moveIn)}` : "",
            p.cuota != null ? C.cuotaTexto(p.cuota, p.downPct, true) : "", C.ESTADO[p.status][0], p.deal === "renta" ? (p.ssnReq ? "piden seguro social" : "sin seguro social") : "",
            p.addrPublic ? "dirección en su página" : "solo la zona", `${p.horas} horas de visita`].filter(Boolean).join(" · ") })) }; })() : null,
    // Venta de Autos (4ic): «Inventario del lote» en solo lectura (summary L321), cada vehículo con su total en la puerta (del servidor), la
    // línea fija y el cargo del dealer con el tope de PA.
    herramientaAutos: b.cat_id === "NEG-DEALER" ? await (async () => { const h = await (await import("./autos")).herramientaAutos(id); if (!h) return null;
      const C = await import("./autos-comun");
      return { titulo: C.conInventario(h.kind) ? C.tituloAutos(h, true) : "Por servicios", resumen: C.resumenAutos(h, true), kind: h.kind, forzado: h.forzado, linea: C.lineaAutos(h.kind, h.pro).es,
        cargo: `Cargo del dealer ${C.usd(h.fee)} · tope de PA ${C.usd(h.tope)} · placas y título ${C.usd(h.tags)}${h.taxBp != null ? ` · impuesto ${C.pctBp(h.taxBp)}` : " · falta el impuesto de la ciudad"}`,
        carros: h.carros.map((x) => ({ id: x.id, name: x.name.es, adm: x.adm, sub: [C.BODY[x.body].es, x.vin ? `VIN ${x.vin}` : "sin VIN", C.TITULO[x.title][0], x.miles != null ? `${x.miles.toLocaleString("en-US")} millas` : "",
          C.puertaTexto(x.puerta, true), x.est ? C.pagoTexto(x.est, true) : "", x.bhph ? C.bhphTexto(x.bhph, true) : "", x.title === "salvage" ? C.SALVAGE.es : "", C.ESTADO_CARRO[x.status][0]].filter(Boolean).join(" · ") })) }; })() : null,
    herramientaDep: b.cat_id === "NEG-DEPORTE" ? await (async () => { const h = await (await import("./deporte")).herramientaDeporte(id); if (!h) return null;
      const C = await import("./deporte-comun");
      return { titulo: h.memb || h.liga ? C.tituloDep(h, true) : "Por contacto", resumen: h.memb || h.liga ? C.resumenDep(h, true) : "Visita, club, tiro o nutrición: la gente llama o escribe", kind: h.kind,
        contrato: h.memb ? C.contratoTexto(h, true) : null }; })() : null,
    herramientaNoche: b.cat_id === "NEG-NOCHE" ? await (async () => { const h = await herramientaNoche(id); if (!h) return null;
      const H = await historialNoche(id, null, 12);
      return { resumen: resumenNoche(h, true), kind: h.kind, forzado: h.forzado, hist: H.map((p) => ({ t: postTexto(p.field, p.value, true), at: p.at, quien: p.quien })) }; })() : null,
    herramientaFiesta: b.cat_id === "NEG-FIESTA" ? await (async () => { const h = await herramientaFiesta(id); return h ? { resumen: resumenFiesta(h, true) } : null; })() : null,
    herramientaSP: b.cat_id === "NEG-SALUD" || b.cat_id === "NEG-PRO" ? await (async () => { const h = await herramientaSP(id, b.cat_id === "NEG-SALUD" ? "salud" : "pro"); return h ? { resumen: resumenSP(h, true, { ok: lic.filter((l) => l.status === "valid").length, rev: lic.filter((l) => l.status === "review").length }), gov: h.rubro === "pro" ? h.gov : [], acepta: h.rubro === "salud" && h.ins.length ? aceptaTexto(h, true) : null } : null; })() : null,
    rsvMes: mods.rows[0]?.rmes ?? 0, rsvPend: mods.rows[0]?.rpend ?? 0, rsvOn: !!mods.rows[0]?.rsv,
    puede: { editar: s.puede("neg", "editar"), retirar: s.puede("neg", "retirar"), cerrar: s.puede("neg", "retirar") && s.role === "admin" },
    // Contenido · reseñas (las 8 más recientes, visibles u ocultas; el caso abierto si alguien la reportó).
    resenas: (await db().query<{ id: string; name: string; stars: number; body: string; reply: boolean; status: string; hidden_reason: string | null; caso: string | null }>(
      `select r.id::text, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(left(u.last_name, 1), '')), ''), 'Vecino') as name, r.stars, r.body,
              r.reply is not null as reply, r.status, r.hidden_reason,
              (select q.id::text from queue_items q where q.queue = 'rep' and q.subject_kind = 'review' and q.subject_id = r.id::text and q.status = 'open' limit 1) as caso
         from reviews r join users u on u.id = r.user_id where r.business_id = $1 and r.status <> 'removed' order by r.id desc limit 8`, [b.id])).rows,
    // Contenido · novedades (hasta 20: primero las que no quitó el dueño, con su estado y votos).
    novedades: (await db().query<{ id: string; kind: string; title: string; body: string; st: string; hidden_reason: string | null; up: number; dn: number; h: number }>(
      `select p.id::text, p.kind, p.title, p.body, p.hidden_reason,
              case when p.hidden_at is not null then 'adm' when p.status = 'removed' then 'quitada' when p.status = 'stopped' then 'detenida'
                   when p.ends_at is not null and p.ends_at <= now() then 'terminada' when p.publish_at > now() then 'programada' else 'live' end as st,
              (select count(*)::int from post_votes v where v.post_id = p.id and v.v = 1) as up, (select count(*)::int from post_votes v where v.post_id = p.id and v.v = -1) as dn,
              floor(extract(epoch from now() - p.publish_at) / 3600)::int as h
         from business_posts p where p.business_id = $1 order by (p.status = 'removed'), p.id desc limit 20`, [b.id])).rows,
    // Contenido · vacantes (hasta 20: primero las abiertas), con sus solicitudes.
    vacantes: (await db().query<{ id: string; title: string; pay: number; payTo: number | null; st: string; hidden_reason: string | null; apps: number; h: number }>(
      `select j.id::text, j.title->>'es' as title, j.pay_from_cents as pay, j.pay_to_cents as "payTo", j.hidden_reason,
              case when j.hidden_at is not null then 'adm' else j.status end as st,
              (select count(*)::int from job_applications a where a.job_id = j.id) as apps,
              floor(extract(epoch from now() - coalesce(j.published_at, j.created_at)) / 3600)::int as h
         from job_postings j where j.business_id = $1 order by (j.status = 'removed'), (j.status = 'live') desc, j.id desc limit 20`, [b.id])).rows,
    resenasN: (await db().query<{ n: number; rep: number }>(`select count(*)::int as n, count(*) filter (where reply is not null)::int as rep from reviews where business_id = $1 and status <> 'removed'`, [b.id])).rows[0]!,
  };
}
export type Negocio360 = NonNullable<Awaited<ReturnType<typeof negocio360>>>;
