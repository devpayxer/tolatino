"use server";
/* Tu herramienta de Mercados («Balanza y pedidos») y Tiendas («Tallas y apartados») desde el panel (4n, fase4-mercados-tiendas
   §6): cada toque se guarda. Mismo sitio, miembro activo con acceso a «Lo que vendes» (parte cat), datos revisados AQUÍ, una
   línea en la auditoría y los filtros de la categoría recalculados. Lo ya pedido o apartado guarda su copia y no cambia. */
import type { PoolClient } from "pg";
import { mismoOrigen } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { accesoPanel, type Acceso } from "@/lib/panel";
import { herramientaRetail, recalcularFiltrosRetail } from "@/lib/retail";
import type { HerrMerc, HerrTienda } from "@/lib/retail-comun";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
const ID = /^\d{1,18}$/;

async function hacer(id: string, cat: "NEG-MERC" | "NEG-TIENDA", fn: (c: PoolClient, a: Acceso) => Promise<Res | null>): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof id === "string" ? await accesoPanel(id, "cat") : null;
  if (!a) return SIN_ACCESO;
  return tx(async (c) => {
    const k = (await c.query<{ cat: string }>(`select category_id as cat from businesses where id = $1 for update`, [a.negocio.id])).rows[0]?.cat;
    if (k !== cat) return cat === "NEG-MERC" ? no("Esto es para mercados.", "This is for markets.") : no("Esto es para tiendas.", "This is for shops.");
    const r = await fn(c, a);
    if (r && !r.ok) return r;
    await recalcularFiltrosRetail(c, a.negocio.id);
    return r ?? { ok: true };
  });
}
async function auditar(c: PoolClient, a: Acceso, action: string, after: unknown, before: unknown = null) {
  await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, $5::jsonb, $6::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, before == null ? null : JSON.stringify(before), JSON.stringify(after)]);
}
const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const SI = (b: boolean) => (b ? "sí" : "no");

/* ── Mercados · «Balanza y pedidos» ── */
export type MercIn = { pk?: boolean; env?: boolean; fee?: number; min?: number; ebt?: boolean; cash?: boolean; pesa?: boolean; sub?: string; cap?: number };
export async function mercGuardar(negocio: string, p: MercIn): Promise<Res> {
  return hacer(negocio, "NEG-MERC", async (c, a) => {
    const h0 = (await herramientaRetail(a.negocio.id, c)) as HerrMerc | null;
    if (!h0) return no("No encontramos el negocio.", "Business not found.");
    const h = { ...h0 }, after: Record<string, string> = {};
    if (p?.pk !== undefined) { h.pk = !!p.pk; after.pickup = SI(h.pk); }
    if (p?.env !== undefined) { h.env = !!p.env; after.envio_a_casa = SI(h.env); }
    if (!h.pk && !h.env) return no("Deja al menos una forma.", "Keep at least one.");
    if (p?.fee !== undefined) { const n = Math.round(Number(p.fee)); if (!(n >= 0 && n <= 5000 && n % 50 === 0)) return no("El envío va de $0 a $50, de 50 centavos en 50.", "Delivery goes from $0 to $50, in 50-cent steps."); h.fee = n; after.costo_del_envio = n ? usd(n) : "gratis"; }
    if (p?.min !== undefined) { const n = Math.round(Number(p.min)); if (!(n >= 0 && n <= 50000 && n % 500 === 0)) return no("El mínimo va de $0 a $500, de 5 en 5.", "The minimum goes from $0 to $500, in steps of 5."); h.min = n; after.minimo_para_envio = n ? usd(n) : "sin mínimo"; }
    if (p?.sub !== undefined) { if (!["call", "similar", "no"].includes(String(p.sub))) return no("Elige qué hacer si algo no hay.", "Pick what to do if something is out."); h.sub = p.sub as HerrMerc["sub"]; after.si_algo_no_hay = { call: "llamar", similar: "uno parecido", no: "quitarlo" }[h.sub]; }
    if (p?.cap !== undefined) { const n = Math.round(Number(p.cap)); if (!(n >= 1 && n <= 30)) return no("De 1 a 30 pedidos por franja.", "From 1 to 30 orders per slot."); h.cap = n; after.pedidos_por_franja = String(n); }
    for (const [k, l] of [["ebt", "ebt_snap"], ["cash", "efectivo"], ["pesa", "se_pesa_delante"]] as const) if (p?.[k] !== undefined) { h[k] = !!p[k]; after[l] = SI(h[k]); }
    if (!Object.keys(after).length) return no("Nada que guardar.", "Nothing to save.");
    await c.query(`insert into delivery_settings (business_id, pickup, delivery, fee_cents, min_order_cents) values ($1, $2, $3, $4, $5)
                   on conflict (business_id) do update set pickup = $2, delivery = $3, fee_cents = $4, min_order_cents = $5, updated_at = now()`, [a.negocio.id, h.pk, h.env, h.fee, h.min]);
    await c.query(`insert into retail_settings (business_id, ebt, cash, weighs_front, sub_default, slot_cap, updated_by) values ($1, $2, $3, $4, $5, $6, $7)
                   on conflict (business_id) do update set ebt = $2, cash = $3, weighs_front = $4, sub_default = $5, slot_cap = $6, updated_by = $7, updated_at = now()`,
      [a.negocio.id, h.ebt, h.cash, h.pesa, h.sub, h.cap, a.yo.id]);
    // «Se pesa delante» también vive en category_attrs (lo lee la tarjeta del buscador).
    await c.query(`update businesses set category_attrs = jsonb_set(category_attrs, '{weighs_in_front}', to_jsonb($2::boolean)) where id = $1`, [a.negocio.id, h.pesa]);
    await auditar(c, a, "herramienta.mercado", after);
    return null;
  });
}

/* Precio por libra (−/+ 10¢) y «Se acabó hoy» de un producto del mercado. */
export async function mercPrecioLb(negocio: string, item: string, cents: number): Promise<Res> {
  return hacer(negocio, "NEG-MERC", async (c, a) => {
    const n = Math.round(Number(cents));
    if (!ID.test(String(item)) || !(n >= 10 && n <= 99900)) return no("El precio por libra va de 10¢ a $999.", "The price per pound goes from 10¢ to $999.");
    const r = (await c.query<{ antes: number; name: string }>(`update items i set price_cents = $3, updated_at = now() from items o where i.id = o.id and i.id = $2::bigint and i.business_id = $1 and i.module = 'shop' and i.shop_kind = 'peso' and i.removed_at is null
      returning o.price_cents as antes, i.name->>'es' as name`, [a.negocio.id, item, n])).rows[0];
    if (!r) return no("Ese producto no se vende por libra.", "That product is not sold by the pound.");
    await auditar(c, a, "producto.precio_lb", { producto: r.name, precio: `${usd(n)}/lb` }, { producto: r.name, precio: `${usd(r.antes)}/lb` });
    return null;
  });
}
export async function mercAgotado(negocio: string, item: string, agotado: boolean): Promise<Res> {
  return hacer(negocio, "NEG-MERC", async (c, a) => {
    if (!ID.test(String(item))) return no("Ese producto no existe.", "That product does not exist.");
    const r = (await c.query<{ name: string }>(`update items set sold_out = $3, sold_out_until = 'hoy', sold_out_at = case when $3 then now() else null end, updated_at = now()
      where id = $2::bigint and business_id = $1 and module = 'shop' and removed_at is null returning name->>'es' as name`, [a.negocio.id, item, !!agotado])).rows[0];
    if (!r) return no("Ese producto no existe.", "That product does not exist.");
    await auditar(c, a, "producto.agotado_hoy", { producto: r.name, agotado_hoy: SI(!!agotado) });
    return null;
  });
}

/* ── Tiendas · «Tallas y apartados» ── */
export type TiendaIn = { hold?: number; lay?: boolean; down?: number; pagos?: number; cada?: number; cargo?: number; dev?: number; cash?: boolean; ship?: boolean; shipFee?: number; shipFree?: number; shipDays?: string };
export async function tiendaGuardar(negocio: string, p: TiendaIn): Promise<Res> {
  return hacer(negocio, "NEG-TIENDA", async (c, a) => {
    const h0 = (await herramientaRetail(a.negocio.id, c)) as HerrTienda | null;
    if (!h0) return no("No encontramos el negocio.", "Business not found.");
    const h = { ...h0 }, after: Record<string, string> = {};
    if (p?.hold !== undefined) { if (![24, 48, 72].includes(Number(p.hold))) return no("Guardas un apartado 24, 48 o 72 horas.", "You hold an item 24, 48 or 72 hours."); h.hold = Number(p.hold) as HerrTienda["hold"]; after.guardas_un_apartado = `${h.hold} h`; }
    if (p?.lay !== undefined) { h.lay = !!p.lay; after.layaway = SI(h.lay); }
    if (p?.down !== undefined) { const n = Math.round(Number(p.down)); if (!(n >= 10 && n <= 50 && n % 5 === 0)) return no("El abono va de 10 % a 50 %.", "The down payment goes from 10% to 50%."); h.down = n; after.abono = `${n} %`; }
    if (p?.pagos !== undefined) { const n = Math.round(Number(p.pagos)); if (!(n >= 2 && n <= 6)) return no("De 2 a 6 pagos.", "From 2 to 6 payments."); h.pagos = n; after.pagos = String(n); }
    if (p?.cada !== undefined) { if (![7, 14, 30].includes(Number(p.cada))) return no("Cada 7, 14 o 30 días.", "Every 7, 14 or 30 days."); h.cada = Number(p.cada) as HerrTienda["cada"]; after.cada = `${h.cada} días`; }
    if (p?.cargo !== undefined) { const n = Math.round(Number(p.cargo)); if (!(n >= 0 && n <= 10)) return no("El cargo por no terminar va de 0 % a 10 %.", "The cancellation fee goes from 0% to 10%."); h.cargo = n; after.cargo_si_no_termina = `${n} %`; }
    if (p?.dev !== undefined) { const n = Math.round(Number(p.dev)); if (!(n >= 0 && n <= 90)) return no("Los cambios van de 0 a 90 días.", "Returns go from 0 to 90 days."); h.dev = n; after.cambios_con_recibo = n ? `${n} días` : "no acepta"; }
    if (p?.cash !== undefined) { h.cash = !!p.cash; after.efectivo = SI(h.cash); }
    if (p?.ship !== undefined) { h.ship = !!p.ship; after.envio_por_correo = SI(h.ship); }
    if (p?.shipFee !== undefined) { const n = Math.round(Number(p.shipFee)); if (!(n >= 0 && n <= 20000 && n % 100 === 0)) return no("El envío va de $0 a $200, de dólar en dólar.", "Shipping goes from $0 to $200, a dollar at a time."); h.shipFee = n; after.costo_del_envio = n ? usd(n) : "gratis"; }
    if (p?.shipFree !== undefined) { const n = Math.round(Number(p.shipFree)); if (!(n >= 0 && n <= 500000 && n % 500 === 0)) return no("«Gratis desde» va de $0 a $5,000.", "“Free over” goes from $0 to $5,000."); h.shipFree = n; after.envio_gratis_desde = n ? usd(n) : "nunca"; }
    if (p?.shipDays !== undefined) { if (!["1-2", "3-5", "5-7"].includes(String(p.shipDays))) return no("Llega en 1–2, 3–5 o 5–7 días.", "Arrives in 1–2, 3–5 or 5–7 days."); h.shipDays = p.shipDays as HerrTienda["shipDays"]; after.llega_en = `${h.shipDays} días`; }
    if (!Object.keys(after).length) return no("Nada que guardar.", "Nothing to save.");
    await c.query(`insert into delivery_settings (business_id, pickup, delivery, ship, ship_fee_cents, ship_free_over_cents, ship_days) values ($1, true, false, $2, $3, $4, $5)
                   on conflict (business_id) do update set ship = $2, ship_fee_cents = $3, ship_free_over_cents = $4, ship_days = $5, updated_at = now()`, [a.negocio.id, h.ship, h.shipFee, h.shipFree, h.shipDays]);
    await c.query(`insert into retail_settings (business_id, hold_hours, layaway, lay_down_pct, lay_payments, lay_every_days, lay_cancel_pct, returns_days, cash, updated_by) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                   on conflict (business_id) do update set hold_hours = $2, layaway = $3, lay_down_pct = $4, lay_payments = $5, lay_every_days = $6, lay_cancel_pct = $7, returns_days = $8, cash = $9, updated_by = $10, updated_at = now()`,
      [a.negocio.id, h.hold, h.lay, h.down, h.pagos, h.cada, h.cargo, h.dev, h.cash, a.yo.id]);
    await c.query(`update businesses set category_attrs = jsonb_set(category_attrs, '{hold_hours}', to_jsonb($2::int)) where id = $1`, [a.negocio.id, h.hold]);
    await auditar(c, a, "herramienta.tienda", after);
    return null;
  });
}
/* Cuántas quedan de una talla (−/+ 1). Una talla en 0 no se aparta. */
export async function tallaExistencia(negocio: string, variante: string, delta: number): Promise<Res> {
  return hacer(negocio, "NEG-TIENDA", async (c, a) => {
    const d = Math.round(Number(delta));
    if (!ID.test(String(variante)) || ![-1, 1].includes(d)) return no("Esa talla no existe.", "That size does not exist.");
    const r = (await c.query<{ antes: number; ahora: number; label: string; name: string }>(
      `update item_variants v set stock_left = greatest(0, least(9999, v.stock_left + $3)), updated_by = $4, updated_at = now() from item_variants o, items i
        where v.id = o.id and i.id = v.item_id and v.id = $2::bigint and v.business_id = $1 and v.removed_at is null
        returning o.stock_left as antes, v.stock_left as ahora, v.label, i.name->>'es' as name`, [a.negocio.id, variante, d, a.yo.id])).rows[0];
    if (!r) return no("Esa talla no existe.", "That size does not exist.");
    await auditar(c, a, "talla.existencia", { producto: r.name, talla: r.label, quedan: String(r.ahora) }, { producto: r.name, talla: r.label, quedan: String(r.antes) });
    return null;
  });
}
