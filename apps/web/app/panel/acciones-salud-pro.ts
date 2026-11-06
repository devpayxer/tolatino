"use server";
/* Tu herramienta de Doctores y Profesionales desde el panel (4h-2, fase4-salud-pro.md §6): cada toque se guarda. Mismo
   sitio, miembro activo con acceso a «Lo que vendes» (parte cat), datos revisados AQUÍ, una línea en la auditoría y los
   filtros de la categoría recalculados. La tarifa del gobierno de un servicio fijo cambia el total de la página; un total
   que ya se mandó por escrito guarda su copia (4l) y no cambia. */
import type { PoolClient } from "pg";
import { mismoOrigen } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { accesoPanel, type Acceso } from "@/lib/panel";
import { catalogoSeguros, herramientaSP, recalcularFiltrosSP } from "@/lib/salud-pro";
import { LANGS_SALUD, type HerrSalud } from "@/lib/salud-pro-comun";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");

async function hacer(id: string, cat: "NEG-SALUD" | "NEG-PRO", fn: (c: PoolClient, a: Acceso) => Promise<Res | null>): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof id === "string" ? await accesoPanel(id, "cat") : null;
  if (!a) return SIN_ACCESO;
  return tx(async (c) => {
    const k = (await c.query<{ cat: string }>(`select category_id as cat from businesses where id = $1 for update`, [a.negocio.id])).rows[0]?.cat;
    if (k !== cat) return cat === "NEG-SALUD" ? no("Esto es para consultorios y clínicas.", "This is for clinics.") : no("Esto es para profesionales.", "This is for professionals.");
    const r = await fn(c, a);
    if (r && !r.ok) return r;
    await recalcularFiltrosSP(c, a.negocio.id);
    return r ?? { ok: true };
  });
}
async function auditar(c: PoolClient, a: Acceso, action: string, after: unknown) {
  await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, null, $5::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(after)]);
}

/* ── Doctores · «Seguros e idiomas» ── */
export type SaludIn = { ins?: string[]; sin?: boolean; cash?: number; langs?: string[]; tele?: boolean; nuevos?: boolean; wait?: number; escala?: boolean; sinid?: boolean; interp?: boolean };
export async function saludGuardar(negocio: string, p: SaludIn): Promise<Res> {
  return hacer(negocio, "NEG-SALUD", async (c, a) => {
    const h0 = (await herramientaSP(a.negocio.id, "salud", c)) as HerrSalud | null;
    if (!h0) return no("No encontramos el negocio.", "Business not found.");
    const h = { ...h0 }, after: Record<string, string> = {};
    if (p?.ins !== undefined) {
      const cat = await catalogoSeguros(c), L = Array.isArray(p.ins) ? [...new Set(p.ins.filter((k) => typeof k === "string" && cat.some((x) => x.key === k)))] : null;
      if (!L || L.length !== (p.ins as unknown[]).length) return no("Ese seguro no está en el catálogo.", "That insurer is not in the catalog.");
      h.ins = L; after.seguros = L.join(", ") || "ninguno";
    }
    if (p?.sin !== undefined) { h.sin = !!p.sin; after.sin_seguro = h.sin ? "sí" : "no"; }
    if (!h.sin && !h.ins.length) return no("Deja al menos un seguro o marca «Sin seguro».", "Keep at least one insurer or mark “No insurance”.");
    if (p?.cash !== undefined) { const n = Math.round(Number(p.cash)); if (!(n >= 2000 && n <= 40000 && n % 500 === 0)) return no("La consulta sin seguro va de $20 a $400, de 5 en 5.", "The uninsured visit goes from $20 to $400, in steps of 5."); h.cash = n; after.consulta_sin_seguro = `$${n / 100}`; }
    if (p?.langs !== undefined) {
      const L = Array.isArray(p.langs) ? [...new Set(p.langs.filter((l) => LANGS_SALUD.some((x) => x[0] === l)))] : [];
      if (!L.length) return no("Deja al menos un idioma.", "Keep at least one language.");
      h.langs = LANGS_SALUD.map((x) => x[0]).filter((l) => L.includes(l)); after.idiomas = h.langs.join(" · ");
    }
    let espera = false;
    if (p?.wait !== undefined) { const w = Math.round(Number(p.wait)); if (!(w >= 0 && w <= 180 && w % 5 === 0)) return no("La espera va de 0 a 180 minutos.", "The wait goes from 0 to 180 minutes."); h.wait = w; espera = true; after.espera = `~${w} min`; }
    for (const [k, l] of [["tele", "consulta_por_video"], ["nuevos", "pacientes_nuevos"], ["escala", "segun_ingresos"], ["sinid", "sin_papeles"], ["interp", "interprete"]] as const)
      if (p?.[k] !== undefined) { h[k] = !!p[k]; after[l] = h[k] ? "sí" : "no"; }
    if (!Object.keys(after).length) return no("Nada que guardar.", "Nothing to save.");
    await c.query(
      `insert into health_settings (business_id, insurers, uninsured, cash_cents, langs, tele, new_patients, walk_wait_min, walk_wait_at, sliding, no_id, interp, updated_by, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, case when $9 then now() end, $10, $11, $12, $13, now())
       on conflict (business_id) do update set insurers = excluded.insurers, uninsured = excluded.uninsured, cash_cents = excluded.cash_cents, langs = excluded.langs, tele = excluded.tele,
         new_patients = excluded.new_patients, walk_wait_min = excluded.walk_wait_min, walk_wait_at = case when $9 then now() else health_settings.walk_wait_at end,
         sliding = excluded.sliding, no_id = excluded.no_id, interp = excluded.interp, updated_by = excluded.updated_by, updated_at = now()`,
      [a.negocio.id, h.ins, h.sin, h.cash, h.langs, h.tele, h.nuevos, h.wait, espera, h.escala, h.sinid, h.interp, a.yo.id]);
    // La página y la tarjeta de Buscar leen lo mismo: seguros, precio sin seguro y espera (derivados, no se editan aparte).
    const pubs = ["medicaid", "medicare", "chip"].filter((k) => h.ins.includes(k)), NM: Record<string, string> = { medicaid: "Medicaid", medicare: "Medicare", chip: "CHIP" };
    const lst = (L: string[], y: string) => (L.length > 1 ? `${L.slice(0, -1).join(", ")}${y}${L[L.length - 1]}` : L[0] ?? "");
    const fee = { es: `${pubs.length ? lst(pubs.map((k) => NM[k]!), " y ") : h.ins.length ? "Seguros privados" : "Sin seguro"}${h.sin ? ` · sin seguro $${h.cash / 100}` : ""}`,
      en: `${pubs.length ? lst(pubs.map((k) => NM[k]!), " & ") : h.ins.length ? "Private insurance" : "Uninsured"}${h.sin ? ` · uninsured $${h.cash / 100}` : ""}` };
    const tocaFee = p?.ins !== undefined || p?.sin !== undefined || p?.cash !== undefined;
    await c.query(
      `update businesses set category_attrs = jsonb_set(jsonb_set(jsonb_set(category_attrs, '{ins}', to_jsonb($2::text[])), '{cash}', to_jsonb($3::int)), '{wait}', to_jsonb($4::int))
         || case when $5 then jsonb_build_object('tarjeta', coalesce(category_attrs->'tarjeta', '{}'::jsonb) || jsonb_build_object('fee', $6::jsonb)) else '{}'::jsonb end,
         updated_at = now() where id = $1`, [a.negocio.id, h.ins, h.cash / 100, h.wait, tocaFee, JSON.stringify(fee)]);
    await auditar(c, a, "herramienta.salud", after);
    return null;
  });
}

/* ── Profesionales · «Licencias y el total por escrito» (las licencias usan las acciones de Tu página › Licencias) ── */
export type ProIn = { days?: number; warr?: number; est?: boolean; cos?: number; cmp?: boolean; plan?: boolean; urgente?: boolean };
export async function proGuardar(negocio: string, p: ProIn): Promise<Res> {
  return hacer(negocio, "NEG-PRO", async (c, a) => {
    const set: string[] = [], vals: unknown[] = [a.negocio.id], after: Record<string, string> = {};
    const put = (col: string, v: unknown, l: string, t: string) => { vals.push(v); set.push(`${col} = $${vals.length}`); after[l] = t; };
    const n = (v: unknown) => Math.round(Number(v));
    if (p?.days !== undefined) { const d = n(p.days); if (!(d >= 1 && d <= 90)) return no("Los días van de 1 a 90.", "Days go from 1 to 90."); put("days", d, "listo_en", `${d} días`); }
    if (p?.warr !== undefined) { const w = n(p.warr); if (!(w >= 0 && w <= 365 && w % 15 === 0)) return no("La garantía va de 0 a 365 días, de 15 en 15.", "The warranty goes from 0 to 365 days, in steps of 15."); put("warranty_days", w, "garantia", `${w} días`); }
    if (p?.cos !== undefined) { const k = n(p.cos); if (!(k >= 1 && k <= 30)) return no("Las compañías van de 1 a 30.", "Insurers go from 1 to 30."); put("insurers_n", k, "companias", String(k)); }
    for (const [k, col, l] of [["est", "estimate_first", "presupuesto_antes"], ["cmp", "compares", "compara_precios"], ["plan", "payment_plan", "plan_de_pagos"], ["urgente", "urgent", "urgentes"]] as const)
      if (p?.[k] !== undefined) put(col, !!p[k], l, p[k] ? "sí" : "no");
    if (!set.length) return no("Nada que guardar.", "Nothing to save.");
    await c.query(`insert into pro_settings (business_id) values ($1) on conflict (business_id) do nothing`, [a.negocio.id]);
    await c.query(`update pro_settings set ${set.join(", ")}, updated_by = $${vals.length + 1}, updated_at = now() where business_id = $1`, [...vals, a.yo.id]);
    await auditar(c, a, "herramienta.pro", after);
    return null;
  });
}

/* EL TOTAL, POR ESCRITO: la tarifa del gobierno de un servicio de honorario fijo (dólares enteros; 0 = sin tarifa). */
export async function govGuardar(negocio: string, item: string, cents: number): Promise<Res> {
  return hacer(negocio, "NEG-PRO", async (c, a) => {
    const g = Math.round(Number(cents));
    if (!/^\d{1,18}$/.test(String(item))) return no("No encontramos el servicio.", "Service not found.");
    if (!(g >= 0 && g <= 5_000_000 && g % 100 === 0)) return no("La tarifa del gobierno va en dólares enteros.", "The government fee goes in whole dollars.");
    const r = await c.query<{ n: string; p: number }>(
      `update items set svc_attrs = case when $3 = 0 then coalesce(svc_attrs, '{}'::jsonb) - 'gov' else coalesce(svc_attrs, '{}'::jsonb) || jsonb_build_object('gov', $3::int) end, updated_at = now()
        where id = $2::bigint and business_id = $1 and module = 'svc' and svc_kind = 'fijo' and removed_at is null returning name->>'es' as n, price_cents as p`, [a.negocio.id, item, g]);
    if (!r.rows[0]) return no("Solo los servicios de honorario fijo llevan tarifa del gobierno.", "Only flat-fee services have a government fee.");
    await auditar(c, a, "herramienta.gobierno", { servicio: r.rows[0].n, gobierno: `$${(g / 100).toLocaleString("en-US")}`, total: `$${((r.rows[0].p + g) / 100).toLocaleString("en-US")}` });
    return null;
  });
}
