"use server";
/* Menú del panel (Lo que vendes › Menú): platos, categorías, grupos de opciones, inventario y horarios. Cada acción:
   mismo sitio, miembro activo con acceso a «Lo que vendes» (parte cat), datos revisados en el servidor y una línea en la
   auditoría. Nada se borra (removed_at). Los pedidos ya hechos guardan su copia del plato: cambiar aquí no los toca. */
import { mismoOrigen } from "@/lib/cuenta";
import { db, tx } from "@/lib/db";
import { accesoPanel, type Acceso } from "@/lib/panel";
import type { PoolClient } from "pg";
import type { Res } from "./acciones";

type Bi = { es: string; en: string };
const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
const ID = /^\d{1,18}$/;
const txt = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, max) : "");
const TAGS = new Set(["pica", "veg", "sg", "mar", "lac", "hue", "nuez"]);
const avOk = (av: unknown): { f: number; t: number; d: number[] } | null => {
  if (!av || typeof av !== "object") return null;
  const a = av as { f: unknown; t: unknown; d: unknown };
  const f = Number(a.f), t = Number(a.t), d = Array.isArray(a.d) ? [...new Set(a.d.map(Number).filter((x) => Number.isInteger(x) && x >= 0 && x <= 6))] : [];
  if (!Number.isInteger(f) || !Number.isInteger(t) || f < 0 || t > 1440 || t - f < 30 || f % 30 || t % 30 || !d.length) return null;
  return { f, t, d: d.sort() };
};

async function entrar(id: unknown): Promise<Acceso | null> {
  if (!(await mismoOrigen())) return null;
  return typeof id === "string" ? accesoPanel(id, "cat") : null;
}
async function auditar(c: PoolClient, a: Acceso, action: string, before: unknown, after: unknown) {
  await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, $5::jsonb, $6::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(before ?? null), JSON.stringify(after ?? null)]);
}
async function hacer(id: string, fn: (c: PoolClient, a: Acceso) => Promise<Res | null>): Promise<Res> {
  const a = await entrar(id);
  if (!a) return SIN_ACCESO;
  const r = await tx((c) => fn(c, a));
  return r ?? { ok: true };
}
const hoyLocal = `(now() at time zone (select c.timezone from cities c join businesses b on b.city_id = c.id where b.id = $1) - interval '6 hours')::date`;

/* ── Plato: crear o guardar ── */
export type PlatoIn = {
  name: string; en: string; desc: string; descEn: string; price: string; sec: string; tax: number; photos: string[]; sell: boolean; ch: string[];
  ago: boolean; agoU: string; stk: string; left: number; par: number; maxQ: number; tags: string[]; extra: number; feat: boolean; avail: string; av: unknown; grp: string[];
};
export async function platoGuardar(negocio: string, itemId: string, p: PlatoIn): Promise<Res & { id?: string }> {
  if (!(await entrar(negocio))) return SIN_ACCESO;
  const nuevo = itemId === "new";
  if (!nuevo && !ID.test(itemId)) return no("Ese plato no existe.", "That item doesn’t exist.");
  const name = txt(p?.name, 60), en = txt(p?.en, 60), desc = txt(p?.desc, 140), descEn = txt(p?.descEn, 140);
  const cents = Math.round((parseFloat(String(p?.price ?? "").replace(/[^0-9.]/g, "")) || 0) * 100);
  if (name.length < 2) return no("Escribe el nombre del plato.", "Write the item name.");
  if (cents <= 0 || cents > 1_000_000) return no("Escribe el precio.", "Enter the price.");
  if (!ID.test(String(p?.sec))) return no("Elige la categoría.", "Pick the category.");
  const ch = (Array.isArray(p?.ch) ? p.ch : []).filter((x) => x === "dlv" || x === "pick");
  const sell = !!p?.sell;
  if (sell && !ch.length) return no("Enciende delivery o pickup, o apaga «Se pide en línea».", "Turn on delivery or pickup, or turn off “Ordered online”.");
  const avail = ["cat", "siempre", "own"].includes(p?.avail) ? p.avail : "cat", av = avail === "own" ? avOk(p?.av) : null;
  if (avail === "own" && !av) return no("Elige los días y las horas de su horario.", "Pick the days and hours.");
  const stk = ["none", "day", "qty"].includes(p?.stk) ? p.stk : "none";
  const left = Math.max(0, Math.min(stk === "qty" ? 999 : 300, Math.round(Number(p?.left) || 0))), par = Math.max(1, Math.min(300, Math.round(Number(p?.par) || 1)));
  const maxQ = Math.max(0, Math.min(99, Math.round(Number(p?.maxQ) || 0))), extra = Math.max(0, Math.min(60, Math.round((Number(p?.extra) || 0) / 5) * 5));
  const tags = [...new Set((Array.isArray(p?.tags) ? p.tags : []).filter((t) => TAGS.has(t)))];
  const tax = Number(p?.tax) === 0 ? 0 : 6, agoU = ["hoy", "vie", "manual"].includes(p?.agoU) ? p.agoU : "hoy";
  return hacer(negocio, async (c, a) => {
    const b = a.negocio.id;
    if (!(await c.query(`select 1 from item_sections where id = $1::bigint and business_id = $2 and removed_at is null`, [p.sec, b])).rowCount) return no("Esa categoría ya no existe.", "That category no longer exists.");
    const grp = [...new Set((Array.isArray(p?.grp) ? p.grp : []).filter((x) => ID.test(String(x))))];
    const okG = (await c.query<{ id: string }>(`select id::text from option_groups where business_id = $1 and removed_at is null and id = any($2::bigint[])`, [b, grp])).rows.map((x) => x.id);
    const grupos = grp.filter((x) => okG.includes(x));
    const prev = nuevo ? null : (await c.query<{ photos: string[]; name: Bi; price_cents: number; sold_out: boolean }>(`select photos, name, price_cents, sold_out from items where id = $1::bigint and business_id = $2 and removed_at is null for update`, [itemId, b])).rows[0];
    if (!nuevo && !prev) return no("Ese plato ya no está en tu menú.", "That item is no longer on your menu.");
    // Fotos: las que ya tenía el plato, las de la galería del negocio o las que la persona acaba de subir. Hasta 5.
    const fot = [...new Set((Array.isArray(p?.photos) ? p.photos : []).filter((u) => typeof u === "string" && u.length < 500))].slice(0, 5);
    const nuevas = fot.filter((u) => !(prev?.photos ?? []).includes(u));
    if (nuevas.length) {
      const mias = (await c.query<{ url: string }>(
        `select url from media where url = any($1::text[]) and status = 'visible' and ((owner_kind = 'business' and owner_id = $2) or (owner_kind = 'user' and owner_id = $3))`, [nuevas, b, a.yo.id])).rows.map((x) => x.url);
      if (nuevas.some((u) => !mias.includes(u))) return no("Vuelve a subir la foto.", "Upload the photo again.");
    }
    const vals = [b, p.sec, JSON.stringify({ es: name, en }), JSON.stringify({ es: desc, en: descEn }), cents, tax, fot, sell, ch, !!p?.ago, agoU, stk, left, par, maxQ, tags, extra, !!p?.feat, avail, av ? JSON.stringify(av) : null, grupos];
    let id = itemId;
    if (nuevo) {
      id = (await c.query<{ id: string }>(
        `insert into items (business_id, section_id, name, descr, price_cents, tax_pct, photos, sell, channels, sold_out, sold_out_until, stock_mode, stock_left, stock_par, max_qty, tags, extra_min, featured, avail, av, group_ids, sold_out_at, stock_day, sort)
         values ($1, $2::bigint, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20::jsonb, $21::bigint[], case when $10 then now() end, ${hoyLocal},
                 (select coalesce(max(sort), 0) + 1 from items where business_id = $1 and section_id = $2::bigint)) returning id::text`, vals)).rows[0]!.id;
    } else {
      await c.query(
        `update items set section_id = $2::bigint, name = $3::jsonb, descr = $4::jsonb, price_cents = $5, tax_pct = $6, photos = $7, sell = $8, channels = $9,
                sold_out = $10, sold_out_until = $11, sold_out_at = case when $10 and not sold_out then now() when not $10 then null else sold_out_at end,
                stock_mode = $12, stock_left = $13, stock_par = $14, stock_day = ${hoyLocal}, max_qty = $15, tags = $16, extra_min = $17, featured = $18, avail = $19, av = $20::jsonb,
                group_ids = $21::bigint[], updated_at = now()
          where id = $22::bigint and business_id = $1`, [...vals, itemId]);
    }
    await auditar(c, a, nuevo ? "menu.plato.agregar" : "menu.plato.editar", prev ? { plato: prev.name.es, precio: prev.price_cents } : null, { plato: name, precio: cents });
    return { ok: true, id } as Res & { id: string };
  });
}

/* ── Agotado / disponible de un plato ── */
export async function platoAgotar(negocio: string, itemId: string, agotar: boolean, hasta: string): Promise<Res> {
  if (!ID.test(itemId)) return no("Ese plato no existe.", "That item doesn’t exist.");
  const u = ["hoy", "vie", "manual"].includes(hasta) ? hasta : "hoy";
  return hacer(negocio, async (c, a) => {
    const n = (await c.query(
      `update items set sold_out = $3, sold_out_until = $4, sold_out_at = case when $3 then now() end,
              stock_left = case when not $3 and stock_mode <> 'none' and stock_left = 0 then case when stock_mode = 'day' then stock_par else 1 end else stock_left end,
              stock_day = case when not $3 and stock_mode <> 'none' then ${hoyLocal} else stock_day end, updated_at = now()
        where id = $2::bigint and business_id = $1 and removed_at is null returning name->>'es' as n`, [a.negocio.id, itemId, agotar, u])).rows[0];
    if (!n) return no("Ese plato ya no está en tu menú.", "That item is no longer on your menu.");
    await auditar(c, a, agotar ? "menu.plato.agotar" : "menu.plato.activar", null, { plato: n.n, hasta: agotar ? u : null });
    return null;
  });
}

/* ── Inventario: − / + en la cuenta (en 0 se agota solo) o empezar a contar ── */
export async function platoCuenta(negocio: string, itemId: string, delta: number, modo?: "day" | "qty"): Promise<Res> {
  if (!ID.test(itemId)) return no("Ese plato no existe.", "That item doesn’t exist.");
  return hacer(negocio, async (c, a) => {
    const b = a.negocio.id;
    if (modo) {
      const n = (await c.query(`update items set stock_mode = $3, stock_par = case when $3 = 'day' then 20 else stock_par end, stock_left = case when $3 = 'day' then 20 else 10 end, stock_day = ${hoyLocal}, sold_out = false, updated_at = now()
                                 where id = $2::bigint and business_id = $1 and removed_at is null and stock_mode = 'none'`, [b, itemId, modo])).rowCount;
      if (!n) return no("Ese plato ya se cuenta.", "That item is already counted.");
      await auditar(c, a, "menu.inventario.contar", null, { plato: itemId, modo });
      return null;
    }
    const d = Math.sign(Number(delta) || 0);
    const r = (await c.query<{ left: number }>(
      `update items i set stock_left = greatest(0, (case when i.stock_mode = 'day' and (i.stock_day is null or i.stock_day < ${hoyLocal}) then i.stock_par else i.stock_left end) + $3),
              stock_day = ${hoyLocal}, updated_at = now()
        where i.id = $2::bigint and i.business_id = $1 and i.removed_at is null and i.stock_mode <> 'none' returning i.stock_left as left`, [b, itemId, d])).rows[0];
    if (!r) return no("Ese plato no se cuenta.", "That item is not counted.");
    if (r.left === 0) await c.query(`update items set sold_out = true, sold_out_until = case when stock_mode = 'day' then 'hoy' else 'manual' end, sold_out_at = now() where id = $1::bigint`, [itemId]);
    else await c.query(`update items set sold_out = false where id = $1::bigint and sold_out and stock_left > 0`, [itemId]);
    return null;
  });
}

/* ── Ordenar un plato dentro de su categoría ── */
export async function platoMover(negocio: string, itemId: string, dir: number): Promise<Res> {
  if (!ID.test(itemId)) return no("Ese plato no existe.", "That item doesn’t exist.");
  return hacer(negocio, async (c, a) => {
    const L = (await c.query<{ id: string }>(`select id::text from items where business_id = $1 and section_id = (select section_id from items where id = $2::bigint and business_id = $1) and removed_at is null order by sort, id for update`, [a.negocio.id, itemId])).rows.map((x) => x.id);
    const i = L.indexOf(itemId), j = i + (dir < 0 ? -1 : 1);
    if (i < 0 || j < 0 || j >= L.length) return null;
    [L[i], L[j]] = [L[j]!, L[i]!];
    for (let k = 0; k < L.length; k++) await c.query(`update items set sort = $2 where id = $1::bigint`, [L[k], k]);
    return null;
  });
}

/* ── Duplicar / quitar un plato ── */
export async function platoDuplicar(negocio: string, itemId: string): Promise<Res & { id?: string }> {
  if (!ID.test(itemId)) return no("Ese plato no existe.", "That item doesn’t exist.");
  return hacer(negocio, async (c, a) => {
    const r = (await c.query<{ id: string }>(
      `insert into items (business_id, module, section_id, name, descr, price_cents, unit, tax_pct, photos, sell, channels, stock_mode, stock_left, stock_par, stock_day, max_qty, tags, extra_min, avail, av, group_ids, sort)
       select business_id, module, section_id, jsonb_set(name, '{es}', to_jsonb(left(name->>'es' || ' (copia)', 60))), descr, price_cents, unit, tax_pct, photos, sell, channels, stock_mode, stock_left, stock_par, stock_day, max_qty, tags, extra_min, avail, av, group_ids, sort + 1
         from items where id = $2::bigint and business_id = $1 and removed_at is null returning id::text`, [a.negocio.id, itemId])).rows[0];
    if (!r) return no("Ese plato ya no está en tu menú.", "That item is no longer on your menu.");
    await auditar(c, a, "menu.plato.duplicar", null, { de: itemId, nuevo: r.id });
    return { ok: true, id: r.id } as Res & { id: string };
  });
}

/* ── Cambios en lote (Seleccionar): agotar hoy, activar, mover, precio, dónde se pide, quitar ── */
export async function platosLote(negocio: string, ids: string[], op: string, val?: string): Promise<Res> {
  const L = [...new Set((Array.isArray(ids) ? ids : []).filter((x) => ID.test(String(x))))].slice(0, 500);
  if (!L.length) return no("Elige al menos un plato.", "Pick at least one item.");
  return hacer(negocio, async (c, a) => {
    const b = a.negocio.id, w = `business_id = $1 and id = any($2::bigint[]) and removed_at is null`;
    if (op === "ago") await c.query(`update items set sold_out = true, sold_out_until = 'hoy', sold_out_at = now(), updated_at = now() where ${w}`, [b, L]);
    else if (op === "on") await c.query(`update items set sold_out = false, sold_out_at = null, stock_left = case when stock_mode <> 'none' and stock_left = 0 then case when stock_mode = 'day' then stock_par else 1 end else stock_left end, stock_day = ${hoyLocal}, updated_at = now() where ${w}`, [b, L]);
    else if (op === "move") {
      if (!ID.test(String(val)) || !(await c.query(`select 1 from item_sections where id = $1::bigint and business_id = $2 and removed_at is null`, [val, b])).rowCount) return no("Esa categoría ya no existe.", "That category no longer exists.");
      await c.query(`update items set section_id = $3::bigint, updated_at = now() where ${w}`, [b, L, val]);
    } else if (op === "price") {
      // Redondea a $0.25 (diseño): +5 %, +10 %, +$0.50, +$1, −$1. Mínimo $0.25.
      const F: Record<string, string> = { p5: "price_cents * 1.05", p10: "price_cents * 1.10", a50: "price_cents + 50", a100: "price_cents + 100", m100: "price_cents - 100" };
      if (!F[String(val)]) return no("Elige el cambio de precio.", "Pick the price change.");
      await c.query(`update items set price_cents = greatest(25, round((${F[String(val)]}) / 25.0) * 25), updated_at = now() where ${w}`, [b, L]);
    } else if (op === "ch") {
      if (val === "ambos") await c.query(`update items set sell = true, channels = '{dlv,pick}', updated_at = now() where ${w}`, [b, L]);
      else if (val === "pick") await c.query(`update items set sell = true, channels = '{pick}', updated_at = now() where ${w}`, [b, L]);
      else if (val === "cat") await c.query(`update items set sell = false, updated_at = now() where ${w}`, [b, L]);
      else return no("Elige dónde se pide.", "Pick where it is ordered.");
    } else if (op === "del") await c.query(`update items set removed_at = now() where ${w}`, [b, L]);
    else return no("Esa acción no existe.", "That action doesn’t exist.");
    await auditar(c, a, `menu.lote.${op}`, null, { platos: L.length, valor: val ?? null });
    return null;
  });
}

/* ── Categoría: crear o guardar, mostrar u ocultar, ordenar, quitar (sus platos pasan a otra) ── */
export async function categoriaGuardar(negocio: string, secId: string, p: { name: string; en: string; avail: string; av: unknown; visible: boolean }): Promise<Res & { id?: string }> {
  const nuevo = secId === "new";
  if (!nuevo && !ID.test(secId)) return no("Esa categoría no existe.", "That category doesn’t exist.");
  const name = txt(p?.name, 40), en = txt(p?.en, 40), avail = p?.avail === "own" ? "own" : "siempre", av = avail === "own" ? avOk(p?.av) : null;
  if (name.length < 2) return no("Escribe el nombre de la categoría.", "Write the category name.");
  if (avail === "own" && !av) return no("Elige al menos un día.", "Pick at least one day.");
  return hacer(negocio, async (c, a) => {
    const b = a.negocio.id;
    if ((await c.query(`select 1 from item_sections where business_id = $1 and module = 'menu' and removed_at is null and lower(name->>'es') = lower($2) and id::text <> $3`, [b, name, secId])).rowCount)
      return no("Ya tienes una categoría con ese nombre.", "You already have a category with that name.");
    let id = secId;
    if (nuevo) id = (await c.query<{ id: string }>(`insert into item_sections (business_id, name, avail, av, visible, sort) values ($1, $2::jsonb, $3, $4::jsonb, $5, (select coalesce(max(sort), 0) + 1 from item_sections where business_id = $1)) returning id::text`,
      [b, JSON.stringify({ es: name, en }), avail, av ? JSON.stringify(av) : null, p?.visible !== false])).rows[0]!.id;
    else if (!(await c.query(`update item_sections set name = $3::jsonb, avail = $4, av = $5::jsonb, visible = $6, updated_at = now() where id = $2::bigint and business_id = $1 and removed_at is null`,
      [b, secId, JSON.stringify({ es: name, en }), avail, av ? JSON.stringify(av) : null, p?.visible !== false])).rowCount) return no("Esa categoría ya no existe.", "That category no longer exists.");
    await auditar(c, a, nuevo ? "menu.categoria.agregar" : "menu.categoria.editar", null, { categoria: name });
    return { ok: true, id } as Res & { id: string };
  });
}
export async function categoriaVisible(negocio: string, secId: string, visible: boolean): Promise<Res> {
  if (!ID.test(secId)) return no("Esa categoría no existe.", "That category doesn’t exist.");
  return hacer(negocio, async (c, a) => {
    if (!(await c.query(`update item_sections set visible = $3, updated_at = now() where id = $2::bigint and business_id = $1 and removed_at is null`, [a.negocio.id, secId, !!visible])).rowCount) return no("Esa categoría ya no existe.", "That category no longer exists.");
    await auditar(c, a, visible ? "menu.categoria.mostrar" : "menu.categoria.ocultar", null, { categoria: secId });
    return null;
  });
}
export async function categoriaMover(negocio: string, secId: string, dir: number): Promise<Res> {
  if (!ID.test(secId)) return no("Esa categoría no existe.", "That category doesn’t exist.");
  return hacer(negocio, async (c, a) => {
    const L = (await c.query<{ id: string }>(`select id::text from item_sections where business_id = $1 and module = 'menu' and removed_at is null order by sort, id for update`, [a.negocio.id])).rows.map((x) => x.id);
    const i = L.indexOf(secId), j = i + (dir < 0 ? -1 : 1);
    if (i < 0 || j < 0 || j >= L.length) return null;
    [L[i], L[j]] = [L[j]!, L[i]!];
    for (let k = 0; k < L.length; k++) await c.query(`update item_sections set sort = $2 where id = $1::bigint`, [L[k], k]);
    return null;
  });
}
export async function categoriaQuitar(negocio: string, secId: string, pasarA: string | null): Promise<Res> {
  if (!ID.test(secId)) return no("Esa categoría no existe.", "That category doesn’t exist.");
  return hacer(negocio, async (c, a) => {
    const b = a.negocio.id;
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from items where section_id = $1::bigint and business_id = $2 and removed_at is null`, [secId, b])).rows[0]!.n;
    if (n) {
      if (!pasarA || !ID.test(pasarA) || pasarA === secId || !(await c.query(`select 1 from item_sections where id = $1::bigint and business_id = $2 and removed_at is null`, [pasarA, b])).rowCount)
        return no("Elige a qué categoría pasan sus platos.", "Pick which category its items move to.");
      await c.query(`update items set section_id = $1::bigint, updated_at = now() where section_id = $2::bigint and business_id = $3 and removed_at is null`, [pasarA, secId, b]);
    }
    if (!(await c.query(`update item_sections set removed_at = now() where id = $1::bigint and business_id = $2 and removed_at is null`, [secId, b])).rowCount) return no("Esa categoría ya no existe.", "That category no longer exists.");
    await auditar(c, a, "menu.categoria.quitar", { categoria: secId, platos: n }, { pasan_a: pasarA });
    return null;
  });
}

/* ── Grupo de opciones: crear o guardar (con los platos que lo usan), agotar una opción, duplicar, quitar ── */
export async function grupoGuardar(negocio: string, grpId: string, p: { es: string; en: string; req: boolean; max: number; o: { es: string; en: string; p: string | number; on: boolean }[]; use: string[] }): Promise<Res & { id?: string }> {
  const nuevo = grpId === "new";
  if (!nuevo && !ID.test(grpId)) return no("Ese grupo no existe.", "That group doesn’t exist.");
  const es = txt(p?.es, 40), en = txt(p?.en, 40);
  const opts = (Array.isArray(p?.o) ? p.o : []).map((o) => ({ es: txt(o?.es, 40), en: txt(o?.en, 40), cents: Math.max(0, Math.min(100_000, Math.round((parseFloat(String(o?.p ?? "0").replace(/[^0-9.]/g, "")) || 0) * 100))), on: o?.on !== false })).filter((o) => o.es).slice(0, 30);
  if (es.length < 2) return no("Escribe el nombre del grupo.", "Write the group name.");
  if (!opts.length) return no("Agrega al menos una opción con nombre.", "Add at least one named option.");
  const max = Math.max(1, Math.min(Math.round(Number(p?.max) || 1), opts.length));
  const use = [...new Set((Array.isArray(p?.use) ? p.use : []).filter((x) => ID.test(String(x))))];
  return hacer(negocio, async (c, a) => {
    const b = a.negocio.id;
    let id = grpId;
    if (nuevo) id = (await c.query<{ id: string }>(`insert into option_groups (business_id, name, required, max_pick, options) values ($1, $2::jsonb, $3, $4, $5::jsonb) returning id::text`, [b, JSON.stringify({ es, en }), !!p?.req, max, JSON.stringify(opts)])).rows[0]!.id;
    else if (!(await c.query(`update option_groups set name = $3::jsonb, required = $4, max_pick = $5, options = $6::jsonb, updated_at = now() where id = $2::bigint and business_id = $1 and removed_at is null`,
      [b, grpId, JSON.stringify({ es, en }), !!p?.req, max, JSON.stringify(opts)])).rowCount) return no("Ese grupo ya no existe.", "That group no longer exists.");
    // Los platos que lo usan: se agrega al final de los que lo empiezan a usar; se quita de los que ya no.
    await c.query(`update items set group_ids = array_append(group_ids, $2::bigint), updated_at = now() where business_id = $1 and removed_at is null and id = any($3::bigint[]) and not ($2::bigint = any(group_ids))`, [b, id, use]);
    await c.query(`update items set group_ids = array_remove(group_ids, $2::bigint), updated_at = now() where business_id = $1 and removed_at is null and not (id = any($3::bigint[])) and $2::bigint = any(group_ids)`, [b, id, use]);
    await auditar(c, a, nuevo ? "menu.grupo.agregar" : "menu.grupo.editar", null, { grupo: es, opciones: opts.length, platos: use.length });
    return { ok: true, id } as Res & { id: string };
  });
}
export async function grupoOpcion(negocio: string, grpId: string, idx: number, on: boolean): Promise<Res> {
  if (!ID.test(grpId) || !Number.isInteger(idx) || idx < 0 || idx > 29) return no("Esa opción no existe.", "That option doesn’t exist.");
  return hacer(negocio, async (c, a) => {
    const r = (await c.query(`update option_groups set options = jsonb_set(options, array[$3::text, 'on'], to_jsonb($4::boolean)), updated_at = now()
                               where id = $2::bigint and business_id = $1 and removed_at is null and jsonb_array_length(options) > $3 returning id`, [a.negocio.id, grpId, idx, !!on])).rowCount;
    if (!r) return no("Esa opción ya no existe.", "That option no longer exists.");
    await auditar(c, a, on ? "menu.opcion.activar" : "menu.opcion.agotar", null, { grupo: grpId, opcion: idx });
    return null;
  });
}
export async function grupoDuplicar(negocio: string, grpId: string): Promise<Res & { id?: string }> {
  if (!ID.test(grpId)) return no("Ese grupo no existe.", "That group doesn’t exist.");
  return hacer(negocio, async (c, a) => {
    const r = (await c.query<{ id: string }>(`insert into option_groups (business_id, name, required, max_pick, options)
       select business_id, jsonb_set(name, '{es}', to_jsonb(left(name->>'es' || ' (copia)', 40))), required, max_pick, options from option_groups where id = $2::bigint and business_id = $1 and removed_at is null returning id::text`, [a.negocio.id, grpId])).rows[0];
    if (!r) return no("Ese grupo ya no existe.", "That group no longer exists.");
    return { ok: true, id: r.id } as Res & { id: string };
  });
}
export async function grupoQuitar(negocio: string, grpId: string): Promise<Res> {
  if (!ID.test(grpId)) return no("Ese grupo no existe.", "That group doesn’t exist.");
  return hacer(negocio, async (c, a) => {
    const b = a.negocio.id;
    if (!(await c.query(`update option_groups set removed_at = now() where id = $2::bigint and business_id = $1 and removed_at is null`, [b, grpId])).rowCount) return no("Ese grupo ya no existe.", "That group no longer exists.");
    await c.query(`update items set group_ids = array_remove(group_ids, $2::bigint), updated_at = now() where business_id = $1 and $2::bigint = any(group_ids)`, [b, grpId]);
    await auditar(c, a, "menu.grupo.quitar", { grupo: grpId }, null);
    return null;
  });
}

/* ── Horarios: pausa, tiempo extra, último pedido, aviso de pocos ── */
export async function menuAjustes(negocio: string, p: { pause?: string | null; busy?: number; last?: number; low?: number }): Promise<Res> {
  return hacer(negocio, async (c, a) => {
    const b = a.negocio.id;
    await c.query(`insert into menu_settings (business_id) values ($1) on conflict do nothing`, [b]);
    if (p && "pause" in p) {
      const k = p.pause;
      if (k === null) await c.query(`update menu_settings set pause_until = null, pause_kind = null, updated_at = now() where business_id = $1`, [b]);
      else if (k === "15" || k === "30" || k === "60") await c.query(`update menu_settings set pause_until = now() + make_interval(mins => $2), pause_kind = $3, updated_at = now() where business_id = $1`, [b, Number(k), k]);
      else if (k === "dia") await c.query(
        `update menu_settings set pause_until = (date_trunc('day', now() at time zone (select c.timezone from cities c join businesses x on x.city_id = c.id where x.id = $1)) + interval '30 hours') at time zone (select c.timezone from cities c join businesses x on x.city_id = c.id where x.id = $1),
                pause_kind = 'dia', updated_at = now() where business_id = $1`, [b]);
      else return no("Elige por cuánto.", "Pick how long.");
    }
    if (p && "busy" in p) { if (![0, 10, 20, 30].includes(Number(p.busy))) return no("Elige el tiempo extra.", "Pick the extra time."); await c.query(`update menu_settings set busy_min = $2, updated_at = now() where business_id = $1`, [b, Number(p.busy)]); }
    if (p && "last" in p) { if (![0, 15, 30, 45].includes(Number(p.last))) return no("Elige el último pedido.", "Pick the last order time."); await c.query(`update menu_settings set last_min = $2, updated_at = now() where business_id = $1`, [b, Number(p.last)]); }
    if (p && "low" in p) { if (![0, 2, 3, 5].includes(Number(p.low))) return no("Elige cuándo avisarte.", "Pick when to alert you."); await c.query(`update menu_settings set low_alert = $2, updated_at = now() where business_id = $1`, [b, Number(p.low)]); }
    await auditar(c, a, "menu.ajustes", null, p ?? null);
    return null;
  });
}
