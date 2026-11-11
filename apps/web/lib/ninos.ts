import "server-only";
import type { Pool, PoolClient } from "pg";
import { db } from "./db";
import { herramientaEdu } from "./edu";
import { fechaCorta, precioInsc, type Bi } from "./inscripciones-comun";
import { edadTexto, esCuidado, kindNinosDe, libresNinos, usdN0, type HerrNinos, type LicNinos } from "./ninos-comun";

/* Niños (Fase 4 · bloque 4eb). Plan: docs/diseno/plan/fase4-edu-ninos-deporte.md §2, §3, §4eb y §5. Diseño: dash2-cat.js L465–471
   (guardería y cuidado en casa: cupos por edad, precio por semana sin subsidio, CCIS, extendido, comidas, turno de noche) y L449–463
   con NIK (los demás: lo que ofreces, la espera de la evaluación; sin plan de pagos), apply L234–236 (tarjeta y filtros).
   - «lic» NO se toca aquí: lo pone y lo quita la base al verificar o retirar la licencia del DHS (licencias_refrescar, 0086).
   - El cuidado sin licencia del DHS vigente no recibe solicitudes por la app (§6 #9); niñera y nana nunca (§6 #10).
   - Los cupos por edad (care_openings) son cupos libres, no una lista de niños. Los datos de los niños viven en lib/ninos-privado.ts. */
type Q = Pool | PoolClient;
const HOY_SQL = `(now() at time zone ci.timezone)::date`;

export async function herramientaNinos(negocio: string, c: Q = db()): Promise<HerrNinos | null> {
  const b = (await c.query<{ subs: string[]; ov: string | null; fv: string[]; edad: [number, number] | null; amin: number | null; amax: number | null; ccis: boolean | null; ext: boolean | null;
    meals: boolean | null; night: boolean | null; tr: boolean | null; med: boolean | null; espera: number | null; semana: number | null; casa: boolean | null; esp: boolean | null }>(
    `select coalesce((select array_agg(sc.name->>'es') from subcategorias_vivas sc where sc.id = any(b.subcategory_ids)), '{}') as subs, s.kind_override as ov, b.filter_values as fv,
            case when jsonb_typeof(b.category_attrs->'edad') = 'array' then array[(b.category_attrs->'edad'->>0)::int, (b.category_attrs->'edad'->>1)::int] end as edad,
            s.age_min as amin, s.age_max as amax, s.ccis, s.extended as ext, s.meals, s.night, s.transport as tr, s.medicaid as med, s.eval_wait_w as espera, s.week_cents as semana, s.home_based as casa, s.esp
       from businesses b left join insc_settings s on s.business_id = b.id where b.id = $1 and b.category_id = 'NEG-NINOS'`, [negocio])).rows[0];
  if (!b) return null;
  const kind = kindNinosDe(b.subs, b.ov), cuidado = esCuidado(kind), fv = b.fv ?? [];
  const L = (await c.query<{ status: string; number: string | null; vence: string | null }>(
    `select status, number, next_review::text as vence from licenses where business_id = $1 and kind = 'pa_dhs_childcare' and status not in ('withdrawn', 'not_found', 'revoked') order by (status = 'valid') desc, id desc limit 1`, [negocio])).rows[0];
  const lic: LicNinos = !L ? { estado: "none", numero: null, vence: null } : { estado: L.status === "valid" ? "valid" : L.status === "expired" ? "expired" : "review", numero: L.number, vence: L.vence };
  const bandas = cuidado ? (await c.query<{ id: string; label: Bi; min: number; max: number; libres: number }>(
    `select id::text, label, band_min as min, band_max as max, openings as libres from care_openings where business_id = $1 and removed_at is null order by sort, care_openings.id`, [negocio])).rows : [];
  const edad: [number, number] | null = b.amin != null && b.amax != null ? [b.amin, b.amax] : b.edad;
  return {
    kind, forzado: !!b.ov, cuidado, edad, lic, bandas, semana: b.semana, ccis: b.ccis ?? fv.includes("subsidio"), ext: b.ext ?? fv.includes("extendido"), comidas: b.meals ?? fv.includes("comidas"),
    noche: b.night ?? fv.includes("noche"), casa: b.casa ?? kind === "casa", esp: b.esp ?? fv.includes("esp"), transporte: b.tr ?? fv.includes("transporte"), medicaid: b.med ?? fv.includes("seguro"),
    espera: b.espera, edu: cuidado || kind === "ninera" ? null : await herramientaEdu(negocio, c),
    recibe: kind === "ninera" ? false : cuidado ? lic.estado === "valid" : true,
  };
}

/* Lo que manda el panel (un toque a la vez). */
export type NinosIn = { banda?: string; libres?: number; semana?: number; ccis?: boolean; ext?: boolean; comidas?: boolean; noche?: boolean; esp?: boolean; transporte?: boolean; medicaid?: boolean;
  espera?: number; edad?: [number, number]; nuevaBanda?: { min: number; max: number; label?: string } };
type R = { ok: true } | { ok: false; es: string; en: string };
const err = (es: string, en: string): R => ({ ok: false, es, en });

export async function guardarNinos(c: PoolClient, negocio: string, p: NinosIn, actor: string): Promise<R> {
  const b = (await c.query<{ city: string }>(`select city_id as city from businesses where id = $1 and category_id = 'NEG-NINOS' for update`, [negocio])).rows[0];
  if (!b) return err("Esto es para Niños.", "This is for kids businesses.");
  const h = (await herramientaNinos(negocio, c))!;
  await c.query(`insert into insc_settings (business_id, city_id, rubro, home_based, updated_by) values ($1, $2, 'ninos', $3, $4) on conflict (business_id) do nothing`, [negocio, b.city, h.kind === "casa", actor]);
  const set = (col: string, v: unknown) => c.query(`update insc_settings set ${col} = $2, updated_by = $3, updated_at = now() where business_id = $1`, [negocio, v, actor]);
  if (p.banda !== undefined) {
    if (!h.cuidado) return err("Los cupos por edad son de guardería y cuidado en casa.", "Openings by age are for daycare and home care.");
    if (!/^\d{1,18}$/.test(String(p.banda))) return err("Esa edad no existe.", "That age band does not exist.");
    const max = h.casa ? 6 : 20, n = Math.round(Number(p.libres));
    if (!(n >= 0 && n <= max)) return err(`Los cupos van de 0 a ${max}.`, `Openings go from 0 to ${max}.`);
    const r = await c.query(`update care_openings set openings = $3, updated_at = now() where id = $1 and business_id = $2 and removed_at is null`, [p.banda, negocio, n]);
    return r.rowCount ? { ok: true } : err("Esa edad no existe.", "That age band does not exist.");
  }
  if (p.nuevaBanda) {
    if (!h.cuidado) return err("Los cupos por edad son de guardería y cuidado en casa.", "Openings by age are for daycare and home care.");
    const mn = Math.round(Number(p.nuevaBanda.min)), mx = Math.round(Number(p.nuevaBanda.max));
    if (!(mn >= 0 && mx <= 12 && mn <= mx)) return err("Elige las edades (0 a 12 años).", "Pick the ages (0 to 12).");
    if (h.bandas.length >= 6) return err("Hasta 6 grupos de edad.", "Up to 6 age groups.");
    const es = mn === mx ? (mn === 0 ? "Bebés" : `${mn} años`) : mn === 0 ? `Bebés a ${mx} años` : `${mn} a ${mx} años`, en = mn === mx ? (mn === 0 ? "Babies" : `Age ${mn}`) : mn === 0 ? `Babies to ${mx}` : `Ages ${mn}–${mx}`;
    await c.query(`insert into care_openings (business_id, city_id, band_min, band_max, label, openings, sort) values ($1, $2, $3, $4, $5::jsonb, 0, $6)`, [negocio, b.city, mn, mx, JSON.stringify({ es, en }), h.bandas.length]);
    return { ok: true };
  }
  if (p.semana !== undefined) {
    const v = Math.round(Number(p.semana));
    if (!(v >= 5000 && v <= 60000 && v % 500 === 0)) return err("El precio por semana va de $50 a $600.", "The weekly price goes from $50 to $600.");
    await set("week_cents", v); return { ok: true };
  }
  if (p.espera !== undefined) {
    const v = Math.round(Number(p.espera));
    if (!(v >= 1 && v <= 12)) return err("La espera va de 1 a 12 semanas.", "The wait goes from 1 to 12 weeks.");
    await set("eval_wait_w", v); return { ok: true };
  }
  if (p.edad !== undefined) {
    const [mn, mx] = (Array.isArray(p.edad) ? p.edad.map((x) => Math.round(Number(x))) : [NaN, NaN]) as [number, number];
    if (!(mn >= 0 && mx <= 18 && mn <= mx)) return err("Elige las edades que atiendes.", "Pick the ages you serve.");
    await c.query(`update insc_settings set age_min = $2, age_max = $3, updated_by = $4, updated_at = now() where business_id = $1`, [negocio, mn, mx, actor]); return { ok: true };
  }
  const TG: [keyof NinosIn, string][] = [["ccis", "ccis"], ["ext", "extended"], ["comidas", "meals"], ["noche", "night"], ["esp", "esp"], ["transporte", "transport"], ["medicaid", "medicaid"]];
  for (const [k, col] of TG) if (p[k] !== undefined) { if (typeof p[k] !== "boolean") return err("No hay nada que guardar.", "Nothing to save."); await set(col, p[k]); return { ok: true }; }
  return err("No hay nada que guardar.", "Nothing to save.");
}

/* Los filtros de Niños que salen de los datos (nunca se editan a mano) y la tarjeta del buscador. «lic» lo pone la base (licencias). */
const DER = ["subsidio", "comidas", "extendido", "noche", "transporte", "esp", "cupos", "finde", "tarde", "seguro", "gratis1", "presencial"];
export async function recalcularFiltrosNinos(c: Q, negocio: string) {
  const b = (await c.query<{ fv: string[]; hay: boolean; hoy: string }>(
    `select b.filter_values as fv, exists (select 1 from insc_settings s where s.business_id = b.id) as hay, ${HOY_SQL}::text as hoy
       from businesses b join cities ci on ci.id = b.city_id where b.id = $1 and b.category_id = 'NEG-NINOS'`, [negocio])).rows[0];
  if (!b || !b.hay) return;
  const h = (await herramientaNinos(negocio, c))!, F = new Set<string>();
  if (h.ccis) F.add("subsidio");
  if (h.comidas) F.add("comidas");
  if (h.ext) F.add("extendido");
  if (h.esp) F.add("esp");
  if (h.transporte) F.add("transporte");
  if (h.medicaid) F.add("seguro");
  if (h.noche) F.add("noche");
  const V = (h.edu?.cursos ?? []).filter((x) => x.vende), G = V.flatMap((x) => x.grupos).filter((g) => g.estado === "open" && g.libres > 0);
  if (G.some((g) => g.min != null && g.min >= 840 && g.min < 1020)) F.add("tarde");
  if (G.some((g) => g.min != null && g.min >= 1020)) F.add("noche");
  if (G.some((g) => g.dows.includes(0) || g.dows.includes(6))) F.add("finde");
  if (V.some((x) => x.g1)) F.add("gratis1");
  // «Hay cupo»: cupos por edad libres (cuidado con licencia) o un grupo abierto con cupo; nunca para quien no recibe por la app.
  if (h.recibe && (h.cuidado ? libresNinos(h) > 0 : G.length > 0)) F.add("cupos");
  const fv = [...(b.fv ?? []).filter((x) => !DER.includes(x)), ...F];
  // La tarjeta: «Quedan 3 cupos · 2 a 5 años» / «Lista de espera · 2 a 5 años» y «Acepta CCIS (subsidio) · $235 la semana sin subsidio».
  const tj: Record<string, Bi> = {};
  if (h.cuidado) {
    const tot = libresNinos(h), ed = (es: boolean) => (h.edad ? ` · ${edadTexto(h.edad, es)}` : "");
    tj.eta = !h.recibe ? { es: `Llama para pedir cupo${ed(true)}`, en: `Call to ask for a spot${ed(false)}` }
      : tot ? { es: `Quedan ${tot} cupos${ed(true)}`, en: `${tot} spots left${ed(false)}` } : { es: `Lista de espera${ed(true)}`, en: `Waitlist${ed(false)}` };
    if (h.semana) tj.fee = h.ccis ? { es: `Acepta CCIS (subsidio) · ${usdN0(h.semana)} la semana sin subsidio`, en: `Accepts CCIS (subsidy) · ${usdN0(h.semana)} a week without it` }
      : { es: `${usdN0(h.semana)} la semana`, en: `${usdN0(h.semana)} a week` };
  } else if (h.kind === "terapia" && h.espera) {
    tj.eta = { es: `Evaluación en ${h.espera} ${h.espera === 1 ? "semana" : "semanas"}`, en: `Evaluation within ${h.espera} ${h.espera === 1 ? "week" : "weeks"}` };
  } else {
    const prox = V.flatMap((x) => x.grupos.filter((g) => g.estado === "open" && g.libres > 0 && g.inicio >= b.hoy).map((g) => ({ x, g }))).sort((p, q) => p.g.inicio.localeCompare(q.g.inicio))[0];
    if (prox) tj.eta = { es: `${prox.x.name.es}: empieza el ${fechaCorta(prox.g.inicio, true)}`, en: `${prox.x.name.en || prox.x.name.es}: starts ${fechaCorta(prox.g.inicio, false)}` };
    const pr = V[0];
    if (pr) tj.fee = pr.cents ? { es: precioInsc(pr.cents, pr.k, true) + (pr.g1 ? " · primera clase gratis" : ""), en: precioInsc(pr.cents, pr.k, false) + (pr.g1 ? " · first class free" : "") }
      : { es: "Gratis si calificas", en: "Free if you qualify" };
  }
  const edad = h.edad ? JSON.stringify(h.edad) : null;
  await c.query(
    `update businesses set filter_values = $2,
            category_attrs = (coalesce(category_attrs, '{}'::jsonb) - 'edad') || case when $4::jsonb is null then '{}'::jsonb else jsonb_build_object('edad', $4::jsonb) end
                             || jsonb_build_object('tarjeta', (coalesce(category_attrs->'tarjeta', '{}'::jsonb) - 'eta' - 'fee') || $3::jsonb), updated_at = now()
      where id = $1`, [negocio, fv, JSON.stringify(tj), edad]);
  await c.query(`update insc_settings set derived_on = $2::date where business_id = $1`, [negocio, b.hoy]);
}

/* El barrido (cada minuto): recalcula los lugares de Niños cuyo día cambió (un grupo que empezó ya no es «el próximo»). */
export async function barrerNinos(): Promise<number> {
  const L = (await db().query<{ id: string }>(
    `select s.business_id as id from insc_settings s join businesses b on b.id = s.business_id join cities ci on ci.id = b.city_id
      where s.rubro = 'ninos' and b.status = 'active' and s.derived_on is distinct from ${HOY_SQL} order by s.derived_on nulls first limit 500`)).rows;
  for (const x of L) await recalcularFiltrosNinos(db(), x.id);
  return L.length;
}
