import "server-only";
import type { PoolClient } from "pg";
import { db } from "./db";

/* Servicios de Auto y Hogar (Fase 4 · 4a). Diseño: dash2-asv.js (Servicios de Auto, una sola lista para panel, ficha,
   Booking y Super Admin), neg-hogar-listing.js / neg-hogar-book.js (Hogar), dash2-cat.js blocksB (Tu herramienta).
   Cada servicio es un `items` (module 'svc') con su forma de cobrar (svc_kind) y los datos propios de esa forma en
   svc_attrs, que se validan AQUÍ (el cliente solo muestra). Plan: docs/diseno/plan/fase4-hogar-auto.md §2 y §4a. */
export type Bi = { es: string; en: string };
export type Rubro = "auto" | "hogar";
export const KINDS: Record<Rubro, string[]> = {
  auto: ["fijo", "desde", "cotiza", "diag", "lav", "goma", "insp", "grua"],
  hogar: ["visita", "fijo", "hora", "area", "pres", "emer", "plan"],
};
export type Extra = { n: Bi; p: number; m: number };
export type Attrs = {
  rng?: [number, number]; sz?: [number, number, number]; days?: [number, number]; w?: "espera" | "deja" | "ambos" | "dom" | "call"; walk?: boolean;
  per?: "eje" | "goma" | "sensor"; cred?: boolean; alt?: number; free?: boolean; mh?: number; u?: "pie2" | "cuarto" | "salida"; min?: number; sur?: number;
  fr?: "mes" | "temp"; cls?: string; sym?: string[]; inc?: Bi[]; no?: Bi[]; x?: Extra[];
};
export type Oficio = {
  id: string; sec: string | null; name: Bi; desc: Bi; k: string; cents: number; dur: number | null; a: Attrs; opts: { t: Bi; o: { n: Bi; p: number; m: number }[] }[];
  foto: string | null; oculto: boolean; adm: string | null; sort: number;
};
export type Herramienta = { rate: number; warrM: number | null; warrMi: number | null; cut: number | null; zone: number | null; h24: boolean; eta: number; bays: number | null };
export type PolOficio = { auto: boolean; resp: number; dep: number; cxh: number; pick: boolean; exp: number; kinds: string[]; bigOver: number | null; big: number | null; min: number | null };
export type OfiPanel = {
  rubro: Rubro; secciones: { id: string; name: Bi; sort: number }[]; servicios: Oficio[]; tool: Herramienta; pol: PolOficio; on: boolean;
  off: { svc: string | null; citas: string | null }; model: string;
  rentas: { id: string; n: Bi; p: number; dep: number; on: boolean; quedan: number }[];
};
export const rubroDe = (cat: string): Rubro | null => (cat === "NEG-AUTO" ? "auto" : cat === "NEG-HOGAR" ? "hogar" : null);
export const TOOL_DEF: Herramienta = { rate: 9500, warrM: 12, warrMi: 12000, cut: 14, zone: 20, h24: false, eta: 60, bays: null };

export async function oficiosPanel(negocio: string, cat: string): Promise<OfiPanel | null> {
  const rubro = rubroDe(cat);
  if (!rubro) return null;
  const [b, S, I, T, P, R] = await Promise.all([
    db().query<{ mods: string[]; off: Record<string, { reason?: string }> | null; zone: number | null; model: string }>(`select modules_on as mods, modules_off as off, service_radius_mi as zone, svc_model as model from businesses where id = $1`, [negocio]),
    db().query<{ id: string; name: Bi; sort: number }>(`select id::text, name, sort from item_sections where business_id = $1 and module = 'svc' and removed_at is null order by sort, id`, [negocio]),
    db().query<Oficio>(
      `select i.id::text, i.section_id::text as sec, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, coalesce(i.svc_kind, 'fijo') as k, i.price_cents as cents, i.duration_min as dur,
              i.svc_attrs as a, i.svc_opts as opts, i.photos[1] as foto, not i.sell as oculto, case when i.status = 'hidden' then coalesce(i.hidden_reason, '') end as adm, i.sort
         from items i where i.business_id = $1 and i.module = 'svc' and i.removed_at is null and not i.is_extra order by i.sort, i.id`, [negocio]),
    db().query<Herramienta>(`select labor_rate_cents as rate, warranty_months as "warrM", warranty_miles as "warrMi", same_day_cutoff_h as cut, h24, emergency_eta_min as eta, bays from trade_settings where business_id = $1`, [negocio]),
    db().query<PolOficio>(
      `select auto_approve as auto, response_min as resp, deposit_cents as dep, cancel_free_h as cxh, staff_pick as pick, expires_h as exp, deposit_kinds as kinds,
              deposit_big_over_cents as "bigOver", deposit_big_cents as big, deposit_min_price_cents as min from booking_policies where business_id = $1`, [negocio]),
    // 4f-2: lo que renta (Tu herramienta › RENTA DE HERRAMIENTA · APARTADA 48 H, encendido por artículo).
    db().query<{ id: string; n: Bi; p: number; dep: number; on: boolean; quedan: number }>(`select id::text, name as n, price_cents as p, deposit_cents as dep, sell as on, stock_left as quedan from items where business_id = $1 and module = 'renta' and removed_at is null order by sort, id`, [negocio]),
  ]);
  const x = b.rows[0];
  if (!x) return null;
  const off = x.off ?? {};
  return {
    rubro, secciones: S.rows, servicios: I.rows, model: x.model, rentas: R.rows,
    tool: { ...TOOL_DEF, ...(rubro === "hogar" ? { warrM: null, warrMi: null, cut: null } : {}), ...(T.rows[0] ?? {}), zone: x.zone ?? (rubro === "hogar" ? 20 : null) },
    pol: P.rows[0] ?? { auto: false, resp: 30, dep: 0, cxh: 2, pick: true, exp: 2, kinds: [], bigOver: null, big: null, min: null },
    on: (x.mods ?? []).includes("citas"), off: { svc: off.svc ? off.svc.reason ?? "" : null, citas: off.citas ? off.citas.reason ?? "" : null },
  };
}

/* Valida y limpia los datos de un servicio según su forma de cobrar (lo único que se guarda). Devuelve el error o los datos. */
const ent = (v: unknown, min: number, max: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : null; };
const txt = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim().slice(0, max) : "");
const bi = (v: unknown, max: number): Bi | null => { const o = (v ?? {}) as Partial<Bi>; const es = txt(o.es, max); return es ? { es, en: txt(o.en, max) } : null; };
export type OficioIn = { k: string; cents: number; dur: number | null; a: Attrs };
export function limpiarOficio(rubro: Rubro, p: { k?: unknown; cents?: unknown; dur?: unknown; a?: unknown }): { ok: true; v: OficioIn } | { ok: false; es: string; en: string } {
  const k = String(p?.k ?? "");
  if (!KINDS[rubro].includes(k)) return { ok: false, es: "Elige cómo lo cobras.", en: "Pick how you charge." };
  const s = (p?.a ?? {}) as Record<string, unknown>, a: Attrs = {};
  let cents = ent(p?.cents, 0, 2_000_000) ?? 0;
  const days = Array.isArray(s.days) ? [ent(s.days[0], 1, 30), ent(s.days[1], 1, 30)] : null;
  let dur: number | null = days && days[0] && days[1] ? null : ent(p?.dur, 5, 600);
  if (days && days[0] && days[1] && k !== "grua") a.days = [Math.min(days[0], days[1]), Math.max(days[0], days[1])];
  const L = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v.slice(0, n).map((z) => bi(z, max)).filter((z): z is Bi => !!z) : []);
  const inc = L(s.inc, 5, 90), no = L(s.no, 4, 90);
  if (inc.length) a.inc = inc;
  if (no.length) a.no = no;
  if (Array.isArray(s.sym)) a.sym = s.sym.map(String).filter((z) => /^[a-z]:[a-z0-9]{2,12}$/.test(z)).slice(0, 8);
  if (k !== "grua" && Array.isArray(s.x)) {
    const x = s.x.slice(0, 6).map((z) => { const o = (z ?? {}) as Record<string, unknown>, n = bi(o.n, 50); return n ? { n, p: ent(o.p, 0, 200000) ?? 0, m: ent(o.m, 0, 240) ?? 0 } : null; }).filter((z): z is Extra => !!z);
    if (x.length) a.x = x;
  }
  if (rubro === "auto") {
    if (k === "grua") { a.w = "call"; dur = null; }
    else { const w = String(s.w ?? "espera"); a.w = (["espera", "deja", "ambos", "dom"].includes(w) ? w : "espera") as Attrs["w"]; if (s.walk) a.walk = true; }
    if (k === "cotiza") {
      const lo = ent(Array.isArray(s.rng) ? s.rng[0] : null, 0, 5_000_000), hi = ent(Array.isArray(s.rng) ? s.rng[1] : null, 0, 5_000_000);
      if (!lo || !hi || hi < lo) return { ok: false, es: "Pon el rango: desde y hasta.", en: "Set the range: from and to." };
      a.rng = [lo, hi]; cents = lo;
    } else if (k === "lav") {
      const z = Array.isArray(s.sz) ? s.sz.map((v) => ent(v, 0, 200000) ?? 0) : [];
      if (z.length !== 3 || !z.every((v) => v > 0)) return { ok: false, es: "Pon el precio de cada tamaño.", en: "Set the price for each size." };
      a.sz = [z[0]!, z[1]!, z[2]!]; cents = z[0]!;
    } else if (k === "diag") {
      if (cents > 0) { if (s.cred) a.cred = true; }
      else { const alt = ent(s.alt, 0, 100000) ?? 0; if (!alt) return { ok: false, es: "Pon el precio si no hace el arreglo contigo.", en: "Set the price if they do not repair with you." }; a.alt = alt; }
    } else if (k === "desde" && !cents) return { ok: false, es: "Ponle precio.", en: "Set a price." };
    if (["fijo", "desde", "goma"].includes(k) && ["eje", "goma", "sensor"].includes(String(s.per))) a.per = String(s.per) as Attrs["per"];
  } else {
    if (k === "visita") { if (s.cred) a.cred = true; if (s.free) a.free = true; }
    if (k === "hora") { if (!cents) return { ok: false, es: "Pon el precio por hora.", en: "Set the hourly price." }; a.mh = ent(s.mh, 1, 8) ?? 1; }
    if (k === "area") {
      if (!cents) return { ok: false, es: "Pon el precio por unidad.", en: "Set the price per unit." };
      a.u = (["pie2", "cuarto", "salida"].includes(String(s.u)) ? String(s.u) : "pie2") as Attrs["u"];
      const min = ent(s.min, 0, 2_000_000); if (min) a.min = min;
    }
    if (k === "pres") {
      const lo = ent(Array.isArray(s.rng) ? s.rng[0] : null, 0, 10_000_000), hi = ent(Array.isArray(s.rng) ? s.rng[1] : null, 0, 10_000_000);
      if (lo && hi && hi >= lo) a.rng = [lo, hi];
      if (s.cred) a.cred = true;
    }
    if (k === "emer") { if (!cents) return { ok: false, es: "Ponle precio a la salida.", en: "Set the call-out price." }; const sur = ent(s.sur, 0, 100000); if (sur) a.sur = sur; }
    if (k === "plan") { if (!cents) return { ok: false, es: "Ponle precio al plan.", en: "Set the plan price." }; a.fr = s.fr === "temp" ? "temp" : "mes"; dur = dur ?? 60; }
    if (k === "fijo" && !cents) return { ok: false, es: "Ponle precio.", en: "Set a price." };
  }
  if (k !== "grua" && !a.days && !dur) return { ok: false, es: "Pon cuánto dura.", en: "Set how long it takes." };
  return { ok: true, v: { k, cents, dur, a } };
}

/* Los filtros que salen de los datos (nunca se editan a mano): se recalculan al guardar servicios o Tu herramienta.
   Auto: walkin · cita · domicilio · diagfree · garantia · h24 · grua · online · deposit. Hogar: cita · h24 · presfree · hora ·
   trabajo · plan · deposit · online · garantia. Las etiquetas que no salen de aquí (lic, seguro, ase…) se conservan. */
const DERIVADAS = ["walkin", "cita", "domicilio", "diagfree", "presfree", "hora", "trabajo", "plan", "h24", "grua", "online", "deposit", "garantia"];
export async function recalcularFiltros(c: PoolClient, negocio: string) {
  const r = (await c.query(
    `select b.category_id as cat, b.filter_values as fv, b.modules_on as mods, coalesce(t.h24, false) as h24, coalesce(t.warranty_months, 0) as warr, coalesce(p.deposit_cents, 0) as dep,
            coalesce((select jsonb_agg(jsonb_build_object('k', i.svc_kind, 'c', i.price_cents, 'a', i.svc_attrs)) from items i where i.business_id = b.id and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live'), '[]') as svc
       from businesses b left join trade_settings t on t.business_id = b.id left join booking_policies p on p.business_id = b.id where b.id = $1`, [negocio])).rows[0] as
    { cat: string; fv: string[]; mods: string[]; h24: boolean; warr: number; dep: number; svc: { k: string; c: number; a: Attrs }[] } | undefined;
  if (!r || !rubroDe(r.cat)) return;
  const S = r.svc, on = (r.mods ?? []).includes("citas"), F = new Set<string>();
  if (S.some((s) => s.a?.walk)) F.add("walkin");
  if (on && S.some((s) => !s.a?.walk && s.k !== "grua")) { F.add("cita"); F.add("online"); }
  if (S.some((s) => s.a?.w === "dom")) F.add("domicilio");
  if (S.some((s) => s.k === "diag" && (!s.c || s.a?.cred))) F.add("diagfree");
  if (S.some((s) => (s.k === "pres" && !s.c) || (s.k === "visita" && (s.a?.free || !s.c)))) F.add("presfree");
  if (S.some((s) => s.k === "hora")) F.add("hora");
  if (S.some((s) => ["fijo", "area"].includes(s.k)) && r.cat === "NEG-HOGAR") F.add("trabajo");
  if (S.some((s) => s.k === "plan")) F.add("plan");
  if (S.some((s) => s.k === "grua")) F.add("grua");
  if (r.h24 || S.some((s) => s.k === "emer")) F.add("h24");
  if (r.dep > 0 && on) F.add("deposit");
  if (r.warr > 0) F.add("garantia");
  const fv = [...(r.fv ?? []).filter((x) => !DERIVADAS.includes(x)), ...F];
  await c.query(`update businesses set filter_values = $2, updated_at = now() where id = $1`, [negocio, fv]);
}
