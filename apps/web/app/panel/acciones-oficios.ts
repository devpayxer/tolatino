"use server";
/* Servicios de Auto y Hogar y Tu herramienta desde el panel (Lo que vendes). Mismo sitio, miembro activo con acceso a
   «Lo que vendes» (parte cat), datos limpios en el servidor (lib/oficios.ts limpiarOficio), una línea en la auditoría y
   los filtros de la categoría recalculados (nunca se editan a mano). Nada se borra. Mostrar, quitar y ordenar un servicio
   usan las acciones de Servicios (acciones-servicios.ts), que valen para cualquier negocio con servicios. */
import type { PoolClient } from "pg";
import { mismoOrigen } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { limpiarOficio, recalcularFiltros, rubroDe, type Attrs } from "@/lib/oficios";
import { accesoPanel, type Acceso } from "@/lib/panel";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
const ID = /^\d{1,18}$/;
const txt = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, max) : "");
const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

async function hacer(id: string, fn: (c: PoolClient, a: Acceso, cat: string) => Promise<Res | null>): Promise<Res & { id?: string }> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof id === "string" ? await accesoPanel(id, "cat") : null;
  if (!a) return SIN_ACCESO;
  return tx(async (c) => {
    const cat = (await c.query<{ cat: string }>(`select category_id as cat from businesses where id = $1`, [a.negocio.id])).rows[0]?.cat ?? "";
    if (!rubroDe(cat)) return no("Esto es para talleres y servicios del hogar.", "This is for auto shops and home services.");
    const r = await fn(c, a, cat);
    if (!r || r.ok) await recalcularFiltros(c, a.negocio.id);
    return r ?? { ok: true };
  });
}
async function auditar(c: PoolClient, a: Acceso, action: string, before: unknown, after: unknown) {
  await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, $5::jsonb, $6::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(before ?? null), JSON.stringify(after ?? null)]);
}

/* ── Un servicio (dash2-asv asvDet · Hogar con sus formas de cobrar) ── */
export type OficioForm = { name: string; en: string; desc: string; descEn: string; sec: string; newSec: string; k: string; cents: number; dur: number | null; a: Attrs; foto: string | null; visible: boolean };
export async function oficioGuardar(negocio: string, itemId: string, p: OficioForm): Promise<Res & { id?: string }> {
  let nuevoId: string | undefined;
  const r = await hacer(negocio, async (c, a, cat) => {
    const name = txt(p?.name, 50), en = txt(p?.en, 50), desc = txt(p?.desc, 140), descEn = txt(p?.descEn, 140);
    if (name.length < 2) return no("Escribe el nombre del servicio.", "Type the service name.");
    const v = limpiarOficio(rubroDe(cat)!, { k: p?.k, cents: p?.cents, dur: p?.dur, a: p?.a });
    if (!v.ok) return no(v.es, v.en);
    const foto = typeof p?.foto === "string" && /^(https?:\/\/|\/)[^\s"']{1,500}$/.test(p.foto) ? p.foto : null;
    let sec: string | null = ID.test(String(p?.sec ?? "")) ? String(p.sec) : null;
    if (sec && !(await c.query(`select 1 from item_sections where id = $1 and business_id = $2 and module = 'svc' and removed_at is null`, [sec, a.negocio.id])).rowCount) sec = null;
    const nueva = txt(p?.newSec, 30);
    if (!sec && nueva) sec = (await c.query<{ id: string }>(`insert into item_sections (business_id, module, name, sort) values ($1, 'svc', $2::jsonb, (select coalesce(max(sort), -1) + 1 from item_sections where business_id = $1 and module = 'svc')) returning id::text`,
      [a.negocio.id, JSON.stringify({ es: nueva, en: nueva })])).rows[0]!.id;
    if (!sec) return no("Elige la sección.", "Pick the section.");
    const x = v.v, vals = [a.negocio.id, sec, JSON.stringify({ es: name, en }), JSON.stringify({ es: desc, en: descEn }), x.cents, x.dur, ["desde", "cotiza", "pres"].includes(x.k), x.k, JSON.stringify(x.a), foto ? [foto] : [], p?.visible !== false];
    if (itemId === "new") {
      nuevoId = (await c.query<{ id: string }>(
        `insert into items (business_id, module, section_id, name, descr, price_cents, duration_min, price_from, svc_kind, svc_attrs, photos, sell, sort)
         values ($1, 'svc', $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9::jsonb, $10, $11, (select coalesce(max(sort), -1) + 1 from items where business_id = $1 and module = 'svc')) returning id::text`, vals)).rows[0]!.id;
    } else {
      if (!ID.test(itemId)) return no("Ese servicio no existe.", "That service does not exist.");
      const u = await c.query(`update items set section_id = $2, name = $3::jsonb, descr = $4::jsonb, price_cents = $5, duration_min = $6, price_from = $7, svc_kind = $8, svc_attrs = $9::jsonb, photos = $10, sell = $11, updated_at = now()
                               where id = $12 and business_id = $1 and module = 'svc' and removed_at is null`, [...vals, itemId]);
      if (!u.rowCount) return no("Ese servicio ya no está.", "That service is gone.");
    }
    await auditar(c, a, itemId === "new" ? "servicio.crear" : "servicio.editar", null, { servicio: name, cobra: x.k, precio: usd(x.cents), dura: x.a.days ? `${x.a.days[0]}–${x.a.days[1]} días` : x.dur ? `${x.dur} min` : "—" });
    return null;
  });
  return { ...r, id: nuevoId };
}

/* ── Tu herramienta (dash2-cat.js blocksB): cada toque se guarda (como el diseño). ── */
export type HerramientaIn = { rate?: number; warr?: [number, number]; cut?: number; zone?: number; h24?: boolean };
export async function herramientaGuardar(negocio: string, p: HerramientaIn): Promise<Res> {
  return hacer(negocio, async (c, a, cat) => {
    const auto = cat === "NEG-AUTO", set: string[] = [], vals: unknown[] = [a.negocio.id], after: Record<string, string> = {};
    const put = (col: string, v: unknown, l: string, txtV: string) => { vals.push(v); set.push(`${col} = $${vals.length}`); after[l] = txtV; };
    if (p?.rate !== undefined) { const r = Math.round(Number(p.rate)); if (!(r >= 4000 && r <= 25000 && r % 500 === 0)) return no("La tarifa va de $40 a $250, de 5 en 5.", "The rate goes from $40 to $250, in steps of 5."); put("labor_rate_cents", r, "tarifa", `$${r / 100}/h`); }
    if (auto && p?.warr !== undefined) { const w = Array.isArray(p.warr) ? [Number(p.warr[0]), Number(p.warr[1])] : []; if (![[3, 3000], [12, 12000], [24, 24000]].some((x) => x[0] === w[0] && x[1] === w[1])) return no("Elige la garantía.", "Pick the warranty."); put("warranty_months", w[0], "garantia", `${w[0]} meses · ${w[1]} mi`); vals.push(w[1]); set.push(`warranty_miles = $${vals.length}`); }
    if (auto && p?.cut !== undefined) { const h = Number(p.cut); if (![11, 12, 14, 15].includes(h)) return no("Elige la hora.", "Pick the time."); put("same_day_cutoff_h", h, "mismo_dia_antes_de", `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`); }
    if (!auto && p?.h24 !== undefined) put("h24", !!p.h24, "emergencias_24h", p.h24 ? "sí" : "no");
    if (!auto && p?.zone !== undefined) {
      const z = Number(p.zone); if (![10, 15, 20, 30].includes(z)) return no("Elige hasta dónde vas.", "Pick how far you go.");
      await c.query(`update businesses set service_radius_mi = $2, updated_at = now() where id = $1`, [a.negocio.id, z]); after.zona = `${z} mi`;
    }
    await c.query(`insert into trade_settings (business_id) values ($1) on conflict (business_id) do nothing`, [a.negocio.id]);
    if (set.length) await c.query(`update trade_settings set ${set.join(", ")}, updated_by = $${vals.length + 1}, updated_at = now() where business_id = $1`, [...vals, a.yo.id]);
    if (!Object.keys(after).length) return no("Nada que guardar.", "Nothing to save.");
    await auditar(c, a, "herramienta.guardar", null, after);
    return null;
  });
}

/* ── Citas de un taller o servicio del hogar: el depósito por forma de cobrar, por trabajo grande y con mínimo. ── */
export type CitasOficioIn = { auto: boolean; resp: number; dep: number; cxh: number; pick: boolean; kinds: string[]; bigOver: number | null; big: number | null; min: number | null };
export async function citasOficioGuardar(negocio: string, p: CitasOficioIn): Promise<Res> {
  return hacer(negocio, async (c, a, cat) => {
    const resp = [15, 30, 60, 180].includes(Number(p?.resp)) ? Number(p.resp) : 30, cxh = [2, 4, 12, 24, 72].includes(Number(p?.cxh)) ? Number(p.cxh) : 2;
    const cent = (v: unknown, max: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n <= max && n % 500 === 0 ? n : null; };
    const dep = cent(p?.dep, 50000) ?? 0, big = cent(p?.big, 100000), bigOver = cent(p?.bigOver, 10_000_000), min = cent(p?.min, 10_000_000);
    const K = cat === "NEG-AUTO" ? ["fijo", "diag", "lav", "goma", "insp"] : ["visita", "fijo", "hora", "area", "pres"];
    const kinds = (Array.isArray(p?.kinds) ? p.kinds : []).map(String).filter((k) => K.includes(k));
    if (big != null && (bigOver == null || bigOver <= 0)) return no("Di desde qué precio es un trabajo grande.", "Say from what price a job is big.");
    await c.query(`insert into booking_policies (business_id, auto_approve, response_min, deposit_cents, cancel_free_h, staff_pick, deposit_kinds, deposit_big_over_cents, deposit_big_cents, deposit_min_price_cents, updated_by, updated_at)
                   values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
                   on conflict (business_id) do update set auto_approve = $2, response_min = $3, deposit_cents = $4, cancel_free_h = $5, staff_pick = $6, deposit_kinds = $7, deposit_big_over_cents = $8,
                     deposit_big_cents = $9, deposit_min_price_cents = $10, updated_by = $11, updated_at = now()`,
      [a.negocio.id, !!p?.auto, resp, dep, cxh, p?.pick !== false, kinds, big != null ? bigOver : null, big, min, a.yo.id]);
    await auditar(c, a, "citas.reglas", null, { al_instante: p?.auto ? "sí" : "no", contesta_en: `${resp} min`, deposito: usd(dep), solo_en: kinds.join(", ") || "todos", trabajo_grande: big != null ? `${usd(big)} desde ${usd(bigOver ?? 0)}` : "—", cancelar_gratis: `${cxh} h` });
    return null;
  });
}
