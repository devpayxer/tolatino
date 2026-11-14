import "server-only";
import { db } from "./db";
import { VENTAS_SQL, populares, type Ventas30 } from "./menu-ventas";

/* Menú del negocio (Panel v2 · Lo que vendes · Menú; modelo de datos §4). Lo que se calcula al leer, sin tareas
   programadas: «agotado hoy» vuelve a las 6 AM del día siguiente; «hasta el viernes», el viernes a las 6 AM; la
   cuenta del día vuelve a su número cada mañana (stock_day). Dinero en centavos. */
export type Bi = { es: string; en: string };
export type Av = { f: number; t: number; d: number[] };
export type MItem = {
  id: string; sec: string | null; name: Bi; desc: Bi; cents: number; tax: number; photos: string[]; sell: boolean; ch: string[];
  ago: boolean; agoU: string; stk: string; left: number; par: number; maxQ: number; tags: string[]; extra: number; feat: boolean;
  avail: string; av: Av | null; grp: string[]; hidden: boolean; hiddenReason: string | null; sort: number;
  // Mercados y Tiendas (4n): cómo se vende, EBT, 21+, solo en la tienda y tallas con lo que queda.
  shop: { k: string; ebt: boolean; edad: number; tienda: boolean; label: Bi | null; tallas: { id: string; label: string; stock: number }[] } | null;
};
export type MSec = { id: string; name: Bi; visible: boolean; avail: string; av: Av | null; sort: number };
export type MGrp = { id: string; name: Bi; required: boolean; max: number; options: { es: string; en: string; cents: number; on: boolean }[] };
export type MCfg = { last: number; pause: string | null; pauseKind: string | null; busy: number; low: number };
/* 9n-2 · `v30`: pedidos, unidades y dinero de cada plato en los últimos 30 días; `pop`: los que hoy salen en Populares (fijados + más pedidos). */
export type MenuPanel = { mod: "menu" | "shop"; sections: MSec[]; items: MItem[]; groups: MGrp[]; cfg: MCfg; off: { menu: string | null; pedidos: string | null }; v30: Ventas30; pop: string[] };

/* Expresiones SQL del estado real (zona de la ciudad del negocio). */
export const AGOTADO_SQL = (i: string, tz: string) => `(${i}.sold_out and (${i}.sold_out_until = 'manual' or ${i}.sold_out_at is null or (now() at time zone ${tz}) < case
    when ${i}.sold_out_until = 'hoy' then date_trunc('day', ${i}.sold_out_at at time zone ${tz}) + interval '30 hours'
    else date_trunc('day', ${i}.sold_out_at at time zone ${tz}) + make_interval(days => coalesce(nullif((12 - extract(dow from ${i}.sold_out_at at time zone ${tz})::int) % 7, 0), 7)) + interval '6 hours' end))`;
export const QUEDAN_SQL = (i: string, tz: string) => `(case when ${i}.stock_mode = 'day' and (${i}.stock_day is null or ${i}.stock_day < (now() at time zone ${tz} - interval '6 hours')::date) then ${i}.stock_par else ${i}.stock_left end)`;

export async function menuPanel(negocio: string, mod: "menu" | "shop" = "menu"): Promise<MenuPanel> {
  const tz = `(select c.timezone from cities c join businesses b on b.city_id = c.id where b.id = $1)`;
  const [s, i, g, c, b, vt] = await Promise.all([
    db().query<MSec>(`select id::text, name, visible, avail, av, sort from item_sections where business_id = $1 and module = $2 and removed_at is null order by sort, item_sections.id`, [negocio, mod]),
    db().query<MItem & { agotado: boolean; quedan: number }>(
      `select i.id::text, i.section_id::text as sec, i.name, i.descr as "desc", i.price_cents as cents, i.tax_pct::float as tax, i.photos, i.sell, i.channels as ch,
              ${AGOTADO_SQL("i", tz)} as agotado, i.sold_out_until as "agoU", i.stock_mode as stk, ${QUEDAN_SQL("i", tz)} as quedan, i.stock_par as par,
              i.max_qty as "maxQ", i.tags, i.extra_min as extra, i.featured as feat, i.avail, i.av, array(select x::text from unnest(i.group_ids) x) as grp,
              i.status = 'hidden' as hidden, i.hidden_reason as "hiddenReason", i.sort,
              case when i.module = 'shop' then jsonb_build_object('k', coalesce(i.shop_kind, 'unid'), 'ebt', i.ebt, 'edad', i.age_min, 'tienda', i.in_store_only, 'label', i.size_label,
                'tallas', coalesce((select jsonb_agg(jsonb_build_object('id', v.id::text, 'label', v.label, 'stock', v.stock_left) order by v.sort, v.id) from item_variants v where v.item_id = i.id and v.removed_at is null), '[]'::jsonb)) end as shop
         from items i where i.business_id = $1 and i.module = $2 and i.removed_at is null order by i.sort, i.id`, [negocio, mod]),
    db().query<MGrp & { max_pick: number }>(`select id::text, name, required, max_pick, options from option_groups where business_id = $1 and removed_at is null order by option_groups.id`, [negocio]),
    db().query<{ last_min: number; pause_until: string | null; pause_kind: string | null; busy_min: number; low_alert: number }>(
      `select last_min, case when pause_until > now() then pause_until end as pause_until, case when pause_until > now() then pause_kind end as pause_kind, busy_min, low_alert from menu_settings where business_id = $1`, [negocio]),
    db().query<{ off: Record<string, { reason?: string }> }>(`select modules_off as off from businesses where id = $1`, [negocio]),
    mod === "menu" ? db().query<{ id: string; pedidos: number; uds: number; cents: number }>(VENTAS_SQL, [negocio]) : Promise.resolve({ rows: [] as { id: string; pedidos: number; uds: number; cents: number }[] }),
  ]);
  const v30: Ventas30 = {};
  for (const r of vt.rows) v30[r.id] = { pedidos: r.pedidos, uds: r.uds, cents: r.cents };
  const cf = c.rows[0];
  const off = b.rows[0]?.off ?? {};
  return {
    mod, sections: s.rows,
    items: i.rows.map(({ agotado, quedan, ...x }) => ({ ...x, desc: x.desc?.es ? x.desc : { es: "", en: "" }, ago: agotado || (x.stk !== "none" && quedan <= 0), left: Math.max(0, quedan) })),
    groups: g.rows.map(({ max_pick, ...x }) => ({ ...x, max: max_pick })),
    cfg: { last: cf?.last_min ?? 15, pause: cf?.pause_until ?? null, pauseKind: cf?.pause_kind ?? null, busy: cf?.busy_min ?? 0, low: cf?.low_alert ?? 3 },
    off: { menu: off.menu?.reason ?? null, pedidos: off.pedidos?.reason ?? null },
    v30, pop: populares(v30, i.rows.filter((x) => x.feat && !x.hidden).map((x) => x.id)),
  };
}
