import "server-only";
import type { Staff } from "./admin";
import { cfgSql } from "./config";
import { db } from "./db";
import { slugCat } from "./directorio";

/* ADM-CAT · Catálogo (Super Admin.dc.html secCat / catDetail / filtDetail): las 17 categorías con sus subcategorías,
   los sinónimos de Buscar, lo que se busca sin oferta, los filtros de cada categoría y los módulos. Todo sale de la
   base: lo que se cambia aquí lo leen la página de categoría y Buscar. */
const NOMBRE = (a: string) => `nullif(trim(coalesce(${a}.first_name, '') || ' ' || coalesce(${a}.last_name, '')), '')`;

export async function categoriasAdmin() {
  return (await db().query<{ id: string; es: string; en: string; icon: string; op_kind: string | null; line: string | null; subs: number; off: number; negocios: number; pro: number; filtros: number; filtros_off: number }>(
    `select c.id, c.name->>'es' as es, c.name->>'en' as en, c.icon, c.op_kind, c.fixed_line->>'es' as line,
            (select count(*)::int from subcategories s where s.category_id = c.id and s.status = 'on') as subs,
            (select count(*)::int from subcategories s where s.category_id = c.id and s.status = 'off') as off,
            (select count(*)::int from businesses b where b.category_id = c.id and b.status = 'active') as negocios,
            (select count(*)::int from businesses b join business_stats_cache st on st.business_id = b.id where b.category_id = c.id and b.status = 'active' and st.plan = 'pro') as pro,
            (select count(*)::int from filter_options f where f.category_id = c.id) as filtros,
            (select count(*)::int from filter_options f where f.category_id = c.id and not f.active) as filtros_off
       from categories c order by negocios desc, c.sort`)).rows;
}

export async function categoriaAdmin(id: string) {
  if (!/^NEG-[A-Z]+$/.test(id)) return null;
  const c = (await db().query<{ id: string; es: string; en: string; icon: string; op_kind: string | null; line: { es: string; en: string } | null; title: string | null; capitulos: number }>(
    `select id, name->>'es' as es, name->>'en' as en, icon, op_kind, fixed_line as line, page->'title'->>'es' as title,
            coalesce(jsonb_array_length(page->'chapters'), 0) as capitulos from categories where id = $1`, [id])).rows[0];
  if (!c) return null;
  const [subs, negocios, rapidos, hist] = await Promise.all([
    db().query<{ id: string; es: string; en: string; status: string; n: number; equipo: boolean; reason: string | null }>(
      `select s.id, s.name->>'es' as es, s.name->>'en' as en, s.status, s.created_by is not null as equipo, s.status_reason as reason,
              (select count(*)::int from businesses b where b.subcategory_ids @> array[s.id] and b.status = 'active') as n
         from subcategories s where s.category_id = $1 order by s.sort, s.id`, [id]),
    db().query<{ id: string; name: string; plan: string; verified: boolean; cover: string | null }>(
      `select b.id, b.name, coalesce(st.plan, 'free') as plan, coalesce(st.verified, false) as verified,
              (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as cover
         from businesses b left join business_stats_cache st on st.business_id = b.id where b.category_id = $1 and b.status = 'active'
        order by (st.plan = 'pro') desc nulls last, st.review_count desc nulls last, b.name limit 4`, [id]),
    db().query<{ label: string }>(`select label->>'es' as label from filter_options where category_id = $1 and quick and active order by sort`, [id]),
    historial(["category", "subcategory"], id),
  ]);
  return { ...c, subs: subs.rows, negocios: negocios.rows, rapidos: rapidos.rows.map((x) => x.label), historial: hist };
}

/* Historial de lo que el equipo cambió en el catálogo (auditoría, solo inserción). `clave` acota a una categoría. */
export async function historial(kinds: string[], clave: string | null) {
  return (await db().query<{ action: string; target_id: string; before: unknown; after: unknown; reason: string | null; at: string; quien: string | null }>(
    `select e.action, e.target_id, e.before, e.after, e.reason, e.at, ${NOMBRE("a")} as quien
       from audit_entries e left join users a on a.id::text = e.actor_id
      where e.target_kind = any($1::text[]) and ($2::text is null or e.target_id = $2 or e.target_id like $2 || '-%' or e.meta->>'categoria' = $2)
      order by e.at desc limit 20`, [kinds, clave])).rows;
}

/* Sinónimos de Buscar, agrupados por lo que el vecino escribe: «pelado → corte, barberia». */
export const SIN_POR_PAGINA = 30;
export async function sinonimos(q: string, pag: number) {
  const t = q.trim().toLowerCase().slice(0, 60);
  const p = [t, SIN_POR_PAGINA, (Math.min(100, Math.max(1, pag)) - 1) * SIN_POR_PAGINA];
  const base = `select lower(s.term) as term, s.lang,
                       array_agg(case when s.target_kind = 'filter' then 'filtro: ' || s.target else s.target end order by s.target) as destinos,
                       bool_or(s.active) as on, bool_and(s.active) as todo_on, bool_or(s.created_by is not null and s.created_by <> 'semilla') as equipo
                  from synonyms s where s.target_kind in ('query', 'filter')
                 group by lower(s.term), s.lang
                having $1 = '' or lower(s.term) like '%' || $1 || '%' or bool_or(lower(s.target) like '%' || $1 || '%')`;
  const [filas, total] = await Promise.all([
    db().query<{ term: string; lang: string; destinos: string[]; on: boolean; todo_on: boolean; equipo: boolean }>(`${base} order by 1 limit $2 offset $3`, p),
    db().query<{ n: number }>(`select count(*)::int as n from (${base}) x`, [t]),
  ]);
  return { filas: filas.rows, total: total.rows[0]?.n ?? 0 };
}

/* Lo que los vecinos buscan y no existe (pidieron «Avísame cuando haya»), 30 días, en las ciudades de quien mira. */
export async function sinOferta(s: Staff) {
  return (await db().query<{ q: string; cat: string | null; n: number }>(
    `select min(a.query) as q, (array_agg(c.name->>'es') filter (where c.id is not null))[1] as cat, count(distinct a.user_id)::int as n
       from search_alerts a left join categories c on c.id = a.filters->>'cat'
         or trim(both '-' from regexp_replace(lower(unaccent(c.short->>'es')), '[^a-z0-9]+', '-', 'g')) = a.filters->>'cat'
      where a.removed_at is null and a.created_at > now() - interval '30 days' and (cardinality($1::text[]) = 0 or a.city_id = any($1::text[]))
      group by lower(a.query) order by n desc, 1 limit 50`, [s.cities])).rows;
}

/* Filtros de una categoría, por grupo, con su interruptor. */
export async function filtrosAdmin(id: string) {
  if (!/^NEG-[A-Z]+$/.test(id)) return null;
  const c = (await db().query<{ es: string; short: string }>(`select name->>'es' as es, short->>'es' as short from categories where id = $1`, [id])).rows[0];
  if (!c) return null;
  const [r, hist] = await Promise.all([
    db().query<{ id: string; group_key: string; grupo: string; key: string; es: string; quick: boolean; active: boolean; negocios: number }>(
      `select f.id::text, f.group_key, f.group_label->>'es' as grupo, f.key, f.label->>'es' as es, f.quick, f.active,
              (select count(*)::int from businesses b where b.category_id = f.category_id and b.status = 'active' and b.filter_values @> array[f.key]) as negocios
         from filter_options f where f.category_id = $1 order by f.sort, f.id`, [id]),
    historial(["filter"], id),
  ]);
  return { id, es: c.es, slug: slugCat(c.short), opciones: r.rows, historial: hist };
}

export async function modulosAdmin() {
  const [m, c] = await Promise.all([
    db().query<{ key: string; es: string }>(`select key, name->>'es' as es from module_types order by key`),
    db().query<{ id: string; short: string; mods: string[] }>(`select id, short->>'es' as short, array(select jsonb_array_elements_text(allowed_modules)) as mods from categories where status = 'on' order by sort`),
  ]);
  return m.rows.map((x) => ({ ...x, cats: c.rows.filter((k) => k.mods.includes(x.key)).map((k) => k.short) }));
}

/* Catálogo › Seguros (4h-3): el catálogo de Pensilvania con cuántos consultorios lo aceptan y cuántas personas lo
   guardaron en Mis seguros. Ocultar uno lo saca de Tu herramienta, de la ficha y de «Tu seguro» (nada se borra). */
export async function segurosAdmin() {
  return (await db().query<{ key: string; kind: "pub" | "priv"; es: string; en: string; hidden: boolean; planes: number; consultorios: number; personas: number }>(
    `select i.key, i.kind, i.name->>'es' as es, i.name->>'en' as en, i.hidden, jsonb_array_length(i.plans) as planes,
            (select count(*)::int from health_settings h where i.key = any(h.insurers)) as consultorios,
            (select count(*)::int from user_insurances u where u.insurer = i.key and u.removed_at is null) as personas
       from insurers i where i.state = 'PA' order by i.kind desc, i.sort, i.key`)).rows;
}


/* Catálogo › Vivienda justa (4ib · §3): las frases que no pueden ir en un anuncio de Bienes Raíces. Las de fábrica (lib/vivienda-justa.ts)
   no se apagan; las demás las agrega o apaga un Admin con auditoría. Nada se borra. */
export async function frasesViviendaJusta() {
  const { esBase } = await import("./vivienda-justa");
  const L = (await db().query<{ id: string; phrase: string; lang: "es" | "en"; active: boolean; quien: string | null }>(
    `select f.id::text, f.phrase, f.lang, f.active, ${NOMBRE("u")} as quien from fair_housing_phrases f left join users u on u.id = f.created_by order by f.lang desc, f.phrase`)).rows;
  const frenadas = (await db().query<{ n: number }>(`select count(*)::int as n from audit_entries where action = 'inm.vivienda_justa.frenada' and at > now() - interval '30 days'`)).rows[0]?.n ?? 0;
  return { filas: L.map((x) => ({ ...x, base: esBase(x.phrase) })), frenadas, historial: await historial(["fair_housing"], null) };
}

/* Catálogo › Cargo del dealer (4ic · §3): el tope de PA del cargo del dealer (platform_config, A VERIFICAR cada año), cuántos dealers lo
   usan y quién está en el tope. Solo un Admin lo cambia; el cambio recalcula los totales en la puerta por lotes. Es un valor de
   Configuración (5i, lib/config.ts): se cambia aquí porque baja a los dealers que lo pasan. */
export async function cargoDealer() {
  const x = (await db().query<{ tope: number; nota: string | null; dealers: number; enTope: number; carros: number }>(
    `select ${cfgSql("dealer_doc_fee_cap_cents")} as tope,
            (select help->>'es' from config_keys where key = 'dealer_doc_fee_cap_cents') as nota,
            (select count(*)::int from dealer_settings) as dealers,
            (select count(*)::int from dealer_settings where doc_fee_cents >= ${cfgSql("dealer_doc_fee_cap_cents")}) as "enTope",
            (select count(*)::int from vehicle_listings where status in ('lot', 'pending')) as carros`)).rows[0]!;
  return { ...x, historial: await historial(["platform_config"], "dealer_doc_fee_cap_cents") };
}
