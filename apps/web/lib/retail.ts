import "server-only";
import type { Pool, PoolClient } from "pg";
import { db } from "./db";
import { AGOTADO_SQL } from "./menu";
import type { HerrMerc, HerrRetail, HerrTienda } from "./retail-comun";

/* Tu herramienta de Mercados y Tiendas (4n · fase4-mercados-tiendas.md §6) y los filtros que salen de ella. Costo y mínimo del
   envío viven en delivery_settings (una sola fuente con Panel › Entrega); lo demás en retail_settings. Lo que ya enviaron los
   clientes copia precio, horas y condiciones: cambiar la herramienta no cambia un pedido o apartado vivo. */
export const rubroRetail = (cat: string): "merc" | "tienda" | null => (cat === "NEG-MERC" ? "merc" : cat === "NEG-TIENDA" ? "tienda" : null);

type Q = Pool | PoolClient;
export async function herramientaRetail(negocio: string, c: Q = db()): Promise<HerrRetail | null> {
  const b = (await c.query<{ cat: string; tz: string; fv: string[] }>(
    `select b.category_id as cat, ci.timezone as tz, b.filter_values as fv from businesses b join cities ci on ci.id = b.city_id where b.id = $1`, [negocio])).rows[0];
  const rub = b ? rubroRetail(b.cat) : null;
  if (!b || !rub) return null;
  const r = (await c.query<{ ebt: boolean; cash: boolean; weighs_front: boolean; sub_default: HerrMerc["sub"]; slot_cap: number; hold_hours: number; returns_days: number; layaway: boolean;
    lay_down_pct: number; lay_payments: number; lay_every_days: number; lay_cancel_pct: number }>(`select * from retail_settings where business_id = $1`, [negocio])).rows[0];
  const fv = new Set(b.fv ?? []);
  if (rub === "merc") {
    const d = (await c.query<{ pickup: boolean; delivery: boolean; fee_cents: number; min_order_cents: number }>(`select pickup, delivery, fee_cents, min_order_cents from delivery_settings where business_id = $1`, [negocio])).rows[0];
    const P = (await c.query<{ id: string; name: { es: string; en: string }; price: number; peso: boolean; ago: boolean }>(
      `select i.id::text, i.name, i.price_cents as price, i.shop_kind = 'peso' as peso, ${AGOTADO_SQL("i", "$2")} as ago from items i left join item_sections s on s.id = i.section_id
        where i.business_id = $1 and i.module = 'shop' and i.removed_at is null and i.status = 'live' and not i.in_store_only order by s.sort nulls last, i.sort, i.id limit 60`, [negocio, b.tz])).rows;
    return { rubro: "merc", pk: d ? d.pickup : fv.has("pickup"), env: d ? d.delivery : fv.has("envio"), fee: d?.fee_cents ?? 399, min: d?.min_order_cents ?? 0,
      ebt: r ? r.ebt : fv.has("ebt"), cash: r ? r.cash : fv.has("efectivo"), pesa: r ? r.weighs_front : true, sub: r?.sub_default ?? "call", cap: r?.slot_cap ?? 6, prods: P, cambiado: !!r } satisfies HerrMerc;
  }
  const V = (await c.query<{ iid: string; name: { es: string; en: string }; label: { es: string; en: string } | null; id: string; v: string; stock: number }>(
    `select i.id::text as iid, i.name, i.size_label as label, v.id::text, v.label as v, v.stock_left as stock from item_variants v join items i on i.id = v.item_id
      where v.business_id = $1 and v.removed_at is null and i.removed_at is null order by i.sort, i.id, v.sort, v.id`, [negocio])).rows;
  const inv: HerrTienda["inv"] = [];
  for (const x of V) {
    let it = inv.find((z) => z.id === x.iid);
    if (!it) { it = { id: x.iid, name: x.name, label: x.label ?? { es: "Talla", en: "Size" }, tallas: [] }; inv.push(it); }
    it.tallas.push({ id: x.id, label: x.v, stock: x.stock });
  }
  const sd = (await c.query<{ ship: boolean; ship_fee_cents: number; ship_free_over_cents: number; ship_days: "1-2" | "3-5" | "5-7" }>(`select ship, ship_fee_cents, ship_free_over_cents, ship_days from delivery_settings where business_id = $1`, [negocio])).rows[0];
  return { ship: sd?.ship ?? false, shipFee: sd?.ship_fee_cents ?? 0, shipFree: sd?.ship_free_over_cents ?? 0, shipDays: sd?.ship_days ?? "3-5", rubro: "tienda", hold: ((r?.hold_hours ?? 48) as 24 | 48 | 72), lay: r ? r.layaway : fv.has("layaway"), down: r?.lay_down_pct ?? 20, pagos: r?.lay_payments ?? 4, cada: ((r?.lay_every_days ?? 14) as 7 | 14 | 30),
    cargo: r?.lay_cancel_pct ?? 10, dev: r?.returns_days ?? 0, cash: r ? r.cash : fv.has("efectivo"), inv, cambiado: !!r } satisfies HerrTienda;
}

/* Los filtros de Mercados y Tiendas que salen de los datos (nunca se editan a mano). Los demás (estac, domingo, noche, esp,
   deli, mayoreo, remesas, países, y10…) se conservan tal cual: salen del horario, la subcategoría o el catálogo. */
const DER_M = ["pickup", "envio", "ebt", "efectivo", "pesa"];
const DER_T = ["apartado", "layaway", "envio", "efectivo", "tallas"];
const GRANDE = /^(2X|3X|4X|5X|XXL|XXXL)$/i;
export async function recalcularFiltrosRetail(c: PoolClient, negocio: string) {
  const b = (await c.query<{ cat: string; fv: string[]; mods: string[]; pro: boolean }>(
    `select b.category_id as cat, b.filter_values as fv, b.modules_on as mods, coalesce(s.plan, 'free') = 'pro' as pro from businesses b left join business_stats_cache s on s.business_id = b.id where b.id = $1`, [negocio])).rows[0];
  const rub = b ? rubroRetail(b.cat) : null;
  if (!b || !rub) return;
  const h = await herramientaRetail(negocio, c);
  if (!h) return;
  const F = new Set<string>();
  if (h.rubro === "merc") {
    if (h.pk) F.add("pickup");
    if (h.env) F.add("envio");
    if (h.ebt) F.add("ebt");
    if (h.cash) F.add("efectivo");
    if (h.pesa && h.prods.some((p) => p.peso)) F.add("pesa");
  } else {
    const d = (await c.query<{ delivery: boolean; ship: boolean }>(`select delivery, ship from delivery_settings where business_id = $1`, [negocio])).rows[0];
    if (b.pro && (b.mods ?? []).includes("pedidos")) F.add("apartado");
    if (h.lay) F.add("layaway");
    if (d && (d.delivery || d.ship)) F.add("envio");
    if (h.cash) F.add("efectivo");
    if (h.inv.some((it) => it.tallas.some((t) => GRANDE.test(t.label)))) F.add("tallas");
  }
  const der = rub === "merc" ? DER_M : DER_T, fv = [...(b.fv ?? []).filter((x) => !der.includes(x)), ...F];
  await c.query(`update businesses set filter_values = $2, updated_at = now() where id = $1`, [negocio, fv]);
}
