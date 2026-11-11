import "server-only";
import type { PoolClient } from "pg";
import { db } from "./db";
import { PRO_DEF, PRO_LEGAL, proKind, type Aseguradora, type Bi, type HerrPro, type HerrSalud, type HerrSP } from "./salud-pro-comun";

/* Tu herramienta de Doctores (health_settings) y de Profesionales (pro_settings) · 4h-2 (fase4-salud-pro.md §6).
   Si el negocio todavía no la guardó, se lee de su página (category_attrs: ins, cash, wait) y de sus filtros. Los
   filtros de la categoría salen de aquí y de los servicios (recalcularFiltrosSP), nunca se editan a mano. */
export async function catalogoSeguros(c?: PoolClient): Promise<Aseguradora[]> {
  return (await (c ?? db()).query<Aseguradora>(`select key, kind, name from insurers where not hidden and state = 'PA' order by sort, key`)).rows;
}

export async function herramientaSP(negocio: string, rubro: "salud" | "pro", c?: PoolClient): Promise<HerrSP | null> {
  const q = c ?? db();
  const b = (await q.query<{ subs: string[]; fv: string[]; attrs: Record<string, unknown> }>(`select subcategory_ids as subs, filter_values as fv, category_attrs as attrs from businesses where id = $1`, [negocio])).rows[0];
  if (!b) return null;
  const svc = (await q.query<{ k: string; c: number; a: Record<string, unknown> }>(
    `select svc_kind as k, price_cents as c, coalesce(svc_attrs, '{}'::jsonb) as a from items where business_id = $1 and module = 'svc' and removed_at is null and sell and status = 'live'`, [negocio])).rows;
  const fv = new Set(b.fv ?? []);
  if (rubro === "salud") {
    const cat = await catalogoSeguros(c);
    const h = (await q.query<{ ins: string[]; sin: boolean; cash: number; langs: string[]; tele: boolean; nuevos: boolean; wait: number | null; escala: boolean; sinid: boolean; interp: boolean }>(
      `select insurers as ins, uninsured as sin, cash_cents as cash, langs, tele, new_patients as nuevos, walk_wait_min as wait, sliding as escala, no_id as sinid, interp from health_settings where business_id = $1`, [negocio])).rows[0];
    const walk = svc.some((s) => s.k === "walk");
    if (h) return { rubro, ...h, ins: h.ins.filter((k) => cat.some((x) => x.key === k)), wait: h.wait ?? 20, walk, cat } satisfies HerrSalud;
    const ins0 = Array.isArray(b.attrs?.ins) ? (b.attrs.ins as string[]).filter((k) => cat.some((x) => x.key === k)) : [];
    const cash0 = Math.round(Number(b.attrs?.cash ?? 85)) * 100;
    return { rubro, ins: ins0, sin: fv.has("sinseguro") || !ins0.length, cash: Math.max(2000, Math.min(40000, Math.round(cash0 / 500) * 500)), langs: ["es", "en"], tele: fv.has("tele"),
      nuevos: true, walk, wait: Math.max(0, Math.min(180, Number(b.attrs?.wait ?? 20) || 20)), escala: fv.has("escala"), sinid: fv.has("sinid"), interp: fv.has("interp"), cat };
  }
  const kind = proKind(b.subs), legal = PRO_LEGAL.includes(kind), D = PRO_DEF[kind] ?? { days: 2, warr: 0, est: true };
  const p = (await q.query<{ days: number; warr: number; est: boolean; cos: number | null; cmp: boolean; plan: boolean; urgente: boolean }>(
    `select days, warranty_days as warr, estimate_first as est, insurers_n as cos, compares as cmp, payment_plan as plan, urgent as urgente from pro_settings where business_id = $1`, [negocio])).rows[0];
  const gov = legal ? (await q.query<{ id: string; name: Bi; cents: number; gov: number }>(
    `select id::text, name, price_cents as cents, coalesce((svc_attrs->>'gov')::int, 0) as gov from items
      where business_id = $1 and module = 'svc' and removed_at is null and svc_kind = 'fijo' and (coalesce((svc_attrs->>'gov')::int, 0) > 0 or price_cents > 10000) order by sort, items.id`, [negocio])).rows : [];
  return {
    rubro, kind, legal, gov,
    days: p?.days ?? D.days, warr: p?.warr ?? D.warr, est: p?.est ?? D.est, cos: p?.cos ?? 6, cmp: p ? p.cmp : kind === "seg",
    plan: p ? p.plan : fv.has("plan"), urgente: p ? p.urgente : fv.has("urgente"),
  } satisfies HerrPro;
}

/* Los filtros de Doctores y Profesionales que salen de los datos. Los que no salen de aquí (hoy, noche, finde, niños,
   esp de Pro, presencial, sábado, y10, lic…) se conservan tal cual. */
const DER_S = ["walk", "cita", "online", "seguro", "medicaid", "medicare", "chip", "sinseguro", "escala", "sinid", "esp", "tele", "interp", "medesp"];
// «lic» la pone y la quita la base al verificar o retirar una licencia (licencias_refrescar): aquí no se toca.
const DER_P = ["walk", "cita", "online", "gratis", "fijo", "hora", "plan", "remoto", "urgente"];
export async function recalcularFiltrosSP(c: PoolClient, negocio: string) {
  const b = (await c.query<{ cat: string; fv: string[]; mods: string[] }>(`select category_id as cat, filter_values as fv, modules_on as mods from businesses where id = $1`, [negocio])).rows[0];
  if (!b || (b.cat !== "NEG-SALUD" && b.cat !== "NEG-PRO")) return;
  const salud = b.cat === "NEG-SALUD", h = await herramientaSP(negocio, salud ? "salud" : "pro", c);
  if (!h) return;
  const S = (await c.query<{ k: string; c: number; a: Record<string, unknown> }>(
    `select svc_kind as k, price_cents as c, coalesce(svc_attrs, '{}'::jsonb) as a from items where business_id = $1 and module = 'svc' and removed_at is null and sell and status = 'live'`, [negocio])).rows;
  const on = (b.mods ?? []).includes("citas"), F = new Set<string>();
  if (S.some((s) => s.k === "walk")) F.add("walk");
  if (on && S.some((s) => s.k !== "walk")) { F.add("cita"); F.add("online"); }
  if (h.rubro === "salud") {
    if (h.ins.length) F.add("seguro");
    for (const k of ["medicaid", "medicare", "chip"]) if (h.ins.includes(k)) F.add(k);
    if (h.sin) F.add("sinseguro");
    if (h.escala || S.some((s) => s.a?.esc === true)) F.add("escala");
    if (h.sinid) F.add("sinid");
    if (h.langs.includes("es")) F.add("esp");
    if (h.tele || S.some((s) => s.k === "tele")) F.add("tele");
    if (h.interp) F.add("interp");
    // «El médico habla español»: alguien del equipo con licencia VERIFICADA que habla español (nunca lo dice el negocio).
    if ((await c.query(`select 1 from licenses l join business_members m on m.id = l.member_id where l.business_id = $1 and l.status = 'valid' and m.status = 'active' and 'es' = any(m.languages) limit 1`, [negocio])).rowCount) F.add("medesp");
  } else {
    if (S.some((s) => s.k === "cons" && !s.c)) F.add("gratis");
    if (S.some((s) => s.k === "fijo")) F.add("fijo");
    if (S.some((s) => s.k === "hora")) F.add("hora");
    if (S.some((s) => s.a?.rem === true)) F.add("remoto");
    if (h.plan) F.add("plan");
    if (h.urgente) F.add("urgente");
  }
  const der = salud ? DER_S : DER_P, fv = [...(b.fv ?? []).filter((x) => !der.includes(x)), ...F];
  await c.query(`update businesses set filter_values = $2, updated_at = now() where id = $1`, [negocio, fv]);
}
