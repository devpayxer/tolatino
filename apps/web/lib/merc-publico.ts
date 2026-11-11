import "server-only";
import { db } from "./db";
import { AGOTADO_SQL } from "./menu";
import { herramientaRetail } from "./retail";
import type { HerrMerc } from "./retail-comun";

/* La ficha de un mercado (4o · fase4-mercados-tiendas.md §4o, prototipo neg-merc-listing.js): los productos por sección con su
   precio (por libra se dice «/lb · SE COBRA LO QUE PESE»), corte o punto (grupo obligatorio de 1), lo que se acabó hoy, lo de 21+
   o solo en la tienda (no se pide) y si toma pedidos (Pro + pickup o envío + módulo encendido y sin pausa del Super Admin).
   El carrito vive en el teléfono; el servidor lo vuelve a revisar todo al pedir (4p). */
type Bi = { es: string; en: string };
export type ProdMerc = { id: string; sec: string | null; name: Bi; desc: Bi; foto: string | null; cents: number; k: "peso" | "unid" | "plato"; ebt: boolean; edad: number;
  tienda: boolean; ago: boolean; opc: { t: Bi; o: Bi[] } | null };
export type MercPublico = {
  negocio: { id: string; nombre: string; direccion: string | null; telefono: string | null; foto: string | null };
  pro: boolean; ord: boolean; secciones: { id: string; name: Bi }[]; prods: ProdMerc[]; h: HerrMerc; edad21: boolean;
};

export async function mercPublico(negocio: string): Promise<MercPublico | null> {
  const b = (await db().query<{ id: string; name: string; address: string | null; phone: string | null; foto: string | null; mods: string[]; off: Record<string, unknown> | null; cat: string; pro: boolean; tz: string }>(
    `select b.id, b.name, b.address, b.phone, (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as foto,
            b.modules_on as mods, b.modules_off as off, b.category_id as cat, coalesce(s.plan, 'free') = 'pro' as pro, ci.timezone as tz
       from businesses b join cities ci on ci.id = b.city_id left join business_stats_cache s on s.business_id = b.id where b.id = $1 and b.status = 'active'`, [negocio])).rows[0];
  if (!b || b.cat !== "NEG-MERC" || (b.off ?? {}).menu) return null;
  const h = (await herramientaRetail(negocio)) as HerrMerc | null;
  if (!h) return null;
  const [S, I] = await Promise.all([
    db().query<{ id: string; name: Bi }>(`select id::text, name from item_sections where business_id = $1 and module = 'shop' and visible and removed_at is null order by sort, item_sections.id`, [negocio]),
    db().query<ProdMerc & { g: { name: Bi; options: { es: string; en: string; on: boolean }[] } | null }>(
      `select i.id::text, i.section_id::text as sec, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.photos[1] as foto, i.price_cents as cents,
              coalesce(i.shop_kind, 'unid') as k, i.ebt, i.age_min as edad, i.in_store_only or not i.sell as tienda, ${AGOTADO_SQL("i", "$2")} as ago,
              (select jsonb_build_object('name', g.name, 'options', g.options) from option_groups g where g.id = any(i.group_ids) and g.required and g.removed_at is null order by g.id limit 1) as g
         from items i where i.business_id = $1 and i.module = 'shop' and i.removed_at is null and i.status = 'live' order by i.sort, i.id limit 200`, [negocio, b.tz]),
  ]);
  const prods = I.rows.map(({ g, ...x }) => ({ ...x, k: (["peso", "unid", "plato"].includes(x.k) ? x.k : "unid") as ProdMerc["k"], desc: { es: x.desc?.es ?? "", en: x.desc?.en ?? "" },
    opc: g ? { t: g.name, o: g.options.filter((o) => o.on).map((o) => ({ es: o.es, en: o.en || o.es })) } : null }));
  const ord = b.pro && (h.pk || h.env) && (b.mods ?? []).includes("pedidos") && !(b.off ?? {}).pedidos;
  return { negocio: { id: b.id, nombre: b.name, direccion: b.address, telefono: b.phone, foto: b.foto }, pro: b.pro, ord, secciones: S.rows, prods, h, edad21: prods.some((p) => p.edad === 21) };
}
