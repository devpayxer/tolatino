"use server";
import { mismoOrigen } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { accesoPanel } from "@/lib/panel";
import { rentaNegocio, type QueNegocio } from "@/lib/rentas";
import type { Res } from "./acciones";

/* Rentas de herramienta (4f-2) desde el panel: la recogió (se cobra la renta y se retiene el depósito), la devolvió (se
   libera; los días tarde salen del depósito), la devolvió con un daño (foto y monto; el cliente decide) o cancelar el
   apartado. Pide «Hoy y pedidos» (ord). Queda en la auditoría. */
const SIN = { ok: false as const, mensaje: { es: "No tienes acceso a esta parte del panel.", en: "You don’t have access to this part of the dashboard." } };
const QUE = new Set(["recogio", "devolvio", "cancelar", "dano"]);
export async function rentaAccionPanel(id: string, numero: string, a: QueNegocio): Promise<Res> {
  if (!(await mismoOrigen())) return SIN;
  const x = typeof id === "string" ? await accesoPanel(id, "ord") : null;
  if (!x) return SIN;
  if (!a || !QUE.has(String(a.que))) return { ok: false, mensaje: { es: "Esa acción no existe.", en: "That action does not exist." } };
  // 9n · La auditoría entra en la misma transacción que el paso de la renta (guardián auditoriaEnLaTransaccion).
  const r = await rentaNegocio(x.negocio.id, String(numero ?? ""), a, x.yo.id, (c) => c.query(
    `insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, null, $5::jsonb)`,
    [x.yo.id, `renta.${a.que}`, x.negocio.id, x.negocio.city_id, JSON.stringify({ renta: numero, ...(a.que === "dano" ? { dano_cents: a.cents, nota: a.nota } : {}) })]));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  return { ok: true };
}

/* ── 9n-16 · Editor de lo que se renta (LAUNCH «Editor de artículos de Tienda/Renta»): nombre, descripción, precio por día, depósito,
   unidades y fotos; en Transporte, las millas incluidas por día y la milla de más. Pide «Lo que vendes» (cat). Las unidades nunca bajan de
   las que la gente tiene apartadas o fuera (stock_left = unidades − vivas). Quitar = removed_at (nada se borra) y solo sin rentas vivas. ── */
export type ArtIn = { n: string; nEn: string; d: string; dEn: string; p: number; dep: number; unidades: number; fotos: string[]; mpd: number | null; mi: number | null };
const noA = (es: string, en: string) => ({ ok: false as const, mensaje: { es, en } });
const lim = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, max) : "");
const FOTO_A = /^(https?:\/\/|\/)[^\s"']{1,500}$/;
const entero = (v: unknown, a: number, b: number) => (typeof v === "number" && Number.isInteger(v) && v >= a && v <= b ? v : null);

export async function articuloRentaGuardar(negocio: string, itemId: string, x: ArtIn): Promise<Res & { id?: string }> {
  if (!(await mismoOrigen())) return SIN;
  const a = typeof negocio === "string" ? await accesoPanel(negocio, "cat") : null;
  if (!a || typeof itemId !== "string" || !(itemId === "new" || /^\d{1,18}$/.test(itemId))) return SIN;
  const n = lim(x?.n, 60), nEn = lim(x?.nEn, 60), d = lim(x?.d, 280), dEn = lim(x?.dEn, 280);
  const p = entero(x?.p, 100, 100000), dep = entero(x?.dep, 0, 500000), u = entero(x?.unidades, 1, 99);
  const fotos = (Array.isArray(x?.fotos) ? x.fotos : []).filter((f) => typeof f === "string" && FOTO_A.test(f)).slice(0, 4);
  if (n.length < 2) return noA("Escribe el nombre de lo que rentas.", "Type the name of what you rent.");
  if (p == null || p % 100) return noA("El precio por día va de $1 a $1,000, en dólares enteros.", "The daily price goes from $1 to $1,000, in whole dollars.");
  if (dep == null || dep % 500) return noA("El depósito va de $0 a $5,000, de 5 en 5 dólares.", "The deposit goes from $0 to $5,000, in steps of $5.");
  if (u == null) return noA("Las unidades van de 1 a 99.", "Units go from 1 to 99.");
  let nuevo: string | undefined;
  const r = await tx(async (c) => {
    const b = (await c.query<{ veh: boolean; renta: boolean }>(`select category_id = 'NEG-TRANS' as veh, 'renta' = any(modules_on) as renta from businesses where id = $1`, [a.negocio.id])).rows[0];
    if (!b?.renta) return noA("Tu página no tiene «Renta» encendida.", "Your page does not have “Rentals” on.");
    const mpd = b.veh ? entero(x?.mpd, 0, 2000) : null, mi = b.veh ? entero(x?.mi, 0, 500) : null;
    if (b.veh && (mpd == null || mi == null)) return noA("Pon las millas incluidas por día y el precio de la milla de más (0 si no cobras).", "Set the miles included per day and the price per extra mile (0 if you don’t charge).");
    const attrs = b.veh ? { mpd, mi } : {};
    const name = JSON.stringify({ es: n, en: nEn || n }), descr = JSON.stringify({ es: d, en: dEn || d });
    if (itemId === "new") {
      const cuantos = Number((await c.query<{ n: string }>(`select count(*) as n from items where business_id = $1 and module = 'renta' and removed_at is null`, [a.negocio.id])).rows[0]!.n);
      if (cuantos >= 60) return noA("Llegaste a 60 cosas para rentar: quita una para agregar otra.", "You reached 60 rental items: remove one to add another.");
      nuevo = (await c.query<{ id: string }>(
        `insert into items (business_id, module, name, descr, price_cents, deposit_cents, stock_mode, stock_left, photos, svc_attrs, sell, sort)
         values ($1, 'renta', $2::jsonb, $3::jsonb, $4, $5, 'qty', $6, $7, $8::jsonb, true, coalesce((select max(sort) + 1 from items where business_id = $1 and module = 'renta'), 0)) returning id::text`,
        [a.negocio.id, name, descr, p, dep, u, fotos, JSON.stringify(attrs)])).rows[0]!.id;
      await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, 'renta.articulo.crear', 'business', $2, $3, null, $4::jsonb)`,
        [a.yo.id, a.negocio.id, a.negocio.city_id, JSON.stringify({ articulo: n, por_dia: p, deposito: dep, unidades: u, ref: { item: nuevo } })]);
      return { ok: true as const };
    }
    const it = (await c.query<{ n: string; p: number; dep: number; libres: number }>(
      `select name->>'es' as n, price_cents as p, deposit_cents as dep, stock_left as libres from items where id = $1::bigint and business_id = $2 and module = 'renta' and removed_at is null for update`, [itemId, a.negocio.id])).rows[0];
    if (!it) return noA("Ese artículo ya no está.", "That item is gone.");
    const vivas = Number((await c.query<{ n: string }>(`select count(*) as n from rentals where item_id = $1::bigint and status in ('held', 'out')`, [itemId])).rows[0]!.n);
    if (u < vivas) return noA(`La gente tiene ${vivas} apartadas o fuera: no bajes de ${vivas} unidades.`, `People have ${vivas} on hold or out: don’t go below ${vivas} units.`);
    await c.query(`update items set name = $3::jsonb, descr = $4::jsonb, price_cents = $5, deposit_cents = $6, stock_mode = 'qty', stock_left = $7, photos = $8, svc_attrs = coalesce(svc_attrs, '{}'::jsonb) || $9::jsonb, updated_at = now()
                    where id = $1::bigint and business_id = $2`, [itemId, a.negocio.id, name, descr, p, dep, u - vivas, fotos, JSON.stringify(attrs)]);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, 'renta.articulo.editar', 'business', $2, $3, $4::jsonb, $5::jsonb)`,
      [a.yo.id, a.negocio.id, a.negocio.city_id, JSON.stringify({ articulo: it.n, por_dia: it.p, deposito: it.dep, unidades: it.libres + vivas }), JSON.stringify({ articulo: n, por_dia: p, deposito: dep, unidades: u, ref: { item: itemId } })]);
    return { ok: true as const };
  });
  return r.ok ? { ok: true, id: nuevo ?? itemId } : r;
}

export async function articuloRentaQuitar(negocio: string, itemId: string): Promise<Res> {
  if (!(await mismoOrigen())) return SIN;
  const a = typeof negocio === "string" ? await accesoPanel(negocio, "cat") : null;
  if (!a || typeof itemId !== "string" || !/^\d{1,18}$/.test(itemId)) return SIN;
  return tx(async (c) => {
    const it = (await c.query<{ n: string }>(`select name->>'es' as n from items where id = $1::bigint and business_id = $2 and module = 'renta' and removed_at is null for update`, [itemId, a.negocio.id])).rows[0];
    if (!it) return noA("Ese artículo ya no está.", "That item is gone.");
    if ((await c.query(`select 1 from rentals where item_id = $1::bigint and status in ('held', 'out') limit 1`, [itemId])).rowCount)
      return noA("Alguien lo tiene apartado o rentado: quítalo cuando lo devuelvan. Mientras, apágalo para que no se aparte más.", "Someone has it on hold or rented: remove it once it is returned. Meanwhile, turn it off so no one else holds it.");
    await c.query(`update items set removed_at = now(), sell = false, updated_at = now() where id = $1::bigint`, [itemId]);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, 'renta.articulo.quitar', 'business', $2, $3, $4::jsonb, null)`,
      [a.yo.id, a.negocio.id, a.negocio.city_id, JSON.stringify({ articulo: it.n, ref: { item: itemId } })]);
    return { ok: true as const };
  });
}

/* Encender / apagar: apagado no sale en la Tienda; lo ya apartado o rentado sigue. */
export async function articuloRentaVisible(negocio: string, itemId: string, visible: boolean): Promise<Res> {
  if (!(await mismoOrigen())) return SIN;
  const a = typeof negocio === "string" ? await accesoPanel(negocio, "cat") : null;
  if (!a || typeof itemId !== "string" || !/^\d{1,18}$/.test(itemId)) return SIN;
  return tx(async (c) => {
    const r = (await c.query<{ n: string }>(`update items set sell = $3, updated_at = now() where id = $1::bigint and business_id = $2 and module = 'renta' and removed_at is null returning name->>'es' as n`, [itemId, a.negocio.id, !!visible])).rows[0];
    if (!r) return noA("Ese artículo ya no está.", "That item is gone.");
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, null, $5::jsonb)`,
      [a.yo.id, visible ? "renta.encender" : "renta.apagar", a.negocio.id, a.negocio.city_id, JSON.stringify({ articulo: r.n, ref: { item: itemId } })]);
    return { ok: true as const };
  });
}
