import "server-only";
import type { Pool, PoolClient } from "pg";
import { db, tx } from "./db";
import { cfgSql } from "./config";
import { horasPrueba, retirarAnuncio } from "./visitas-inm";
import type { Bi } from "./inscripciones-comun";
import {
  BODIES, BODY, DRIVE, FUEL, GARANTIAS_DEALER, MESES_BHPH, MESES_PAGO, TOPE_CARROS_FREE, TRANS, anioCoincide, anioDeVin, conCdl, conInventario, kindAutosDe, limpiarVin, nombreCarro,
  pideMillas, sinVin, usd, vinValido, visibleCarro,
  type Bhph, type Body, type CarroAuto, type Drive, type EstadoCarro, type Fuel, type Garantia, type HerrAutos, type KindAutos, type Pago, type Puerta, type Titulo, type Trans,
} from "./autos-comun";

/* Venta de Autos (Fase 4 · bloque 4ic). Plan: docs/diseno/plan/fase4-iglesias-inmuebles-autos.md §2 «0093», §3 «Precio en la puerta (Autos)»,
   §4ic y §5. Diseño: dash2-cat.js L429–443 («Inventario del lote»), apply L214–224 (tarjeta y filtros), state L190 (lo de base), summary L321.
   - Cada vehículo es un ítem (svc_kind 'auto') con su fila en vehicle_listings. El servidor valida todo (VIN con su dígito verificador) y
     calcula el total en la puerta con UNA fórmula (enLaPuerta): precio + impuesto de la ciudad (tax_rules) + placas y título del dealer +
     cargo del dealer (nunca más que el tope de PA en platform_config). La base comprueba la suma (check en 0093).
   - El pago de ejemplo (pagoEjemplo) sale del total en la puerta menos el enganche, con la tasa y los meses del dealer; sin los tres no
     existe (Regulation Z) y siempre se escribe «estimado, sujeto a aprobación» (autos-comun pagoTexto). Compre aquí pague aquí: enganche +
     pago a la semana × semanas = total pagado, con la tasa que resulta (totalBhph).
   - Cada toque de Tu herramienta recalcula los totales de TODOS los carros del negocio en la misma transacción; un cambio del tope o del
     impuesto los recalcula por lotes, por cursor (recalcularTodosPorLotes; el barrido sigue donde quedó).
   - Aquí no se mueve dinero: la prueba de manejo es gratis y nada se cobra ni se aparta en la app (guardián sinDineroEnVisitas). */
type Q = Pool | PoolClient;
type R = { ok: true; id?: string; puerta?: Puerta } | { ok: false; es: string; en: string };
const err = (es: string, en: string): R => ({ ok: false, es, en });
const ID = /^\d{1,18}$/, FOTO = /^(https?:\/\/|\/)[^\s"']{1,500}$/;
const HOY_SQL = `(now() at time zone ci.timezone)::date`;
const TOPE_KEY = "dealer_doc_fee_cap_cents" as const; // 5i · valor de Configuración (lib/config.ts)
const txt = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, n) : "");
const bi = (v: unknown, n: number): Bi => ({ es: txt((v as Bi | undefined)?.es, n), en: txt((v as Bi | undefined)?.en, n) });
const entero = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : NaN; };
/* La descripción no promete pagos: el pago al mes, a la semana y el enganche los calcula el servidor con la tasa y los meses (Regulation Z). */
const PAGO_SUELTO = /\$\s?\d[\d,.]*\s*(al mes|a la semana|por mes|por semana|mensual|semanal|\/\s?(mes|semana|mo|wk|week|month)\b|a month|a week|per month|per week|monthly|weekly)|(enganche|down( payment)?)\s*(de\s*|of\s*)?\$\s?\d|\$\s?\d[\d,.]*\s*(de\s+)?(enganche|down\b)/i;

/* ── El total en la puerta: la ÚNICA fórmula (guardián totalEnLaPuerta). Impuesto redondeado al centavo como la base (check en 0093). ── */
export function enLaPuerta(price: number, taxBp: number, tags: number, fee: number): Puerta {
  const tax = Math.floor((price * taxBp + 5000) / 10000);
  return { price, taxBp, tax, tags, fee, otd: price + tax + tags + fee };
}
/* El pago de ejemplo: nunca sin enganche, tasa (APR) y meses juntos. Sale del total en la puerta menos el enganche. */
export function pagoEjemplo(otd: number, enganche: number | null, aprBp: number | null, meses: number | null): Pago | null {
  if (enganche == null || aprBp == null || meses == null || !(MESES_PAGO as readonly number[]).includes(meses) || !(enganche >= 0) || !(aprBp >= 0)) return null;
  const P = otd - enganche;
  if (P <= 0) return null;
  const r = aprBp / 10000 / 12, pago = Math.round(r === 0 ? P / meses : (P * r) / (1 - Math.pow(1 + r, -meses)));
  return { down: enganche, aprBp, months: meses, pago, total: enganche + pago * meses };
}
/* Compre aquí pague aquí (L47, L222): semanas = meses × 52 / 12; total pagado = enganche + pago × semanas; la tasa que resulta (APR)
   sale de lo que se financia (total en la puerta − enganche). Si los pagos no cubren el total en la puerta, no hay plan para ese carro. */
export function totalBhph(otd: number, enganche: number, semana: number, meses: number): Bhph | null {
  const weeks = Math.round((meses * 52) / 12), total = enganche + semana * weeks, fin = otd - enganche;
  if (!(MESES_BHPH as readonly number[]).includes(meses) || fin <= 0 || total < otd) return null;
  const vp = (i: number) => (i === 0 ? semana * weeks : (semana * (1 - Math.pow(1 + i, -weeks))) / i);
  let lo = 0, hi = 1;
  for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2; if (vp(m) > fin) lo = m; else hi = m; }
  const aprBp = Math.round(((lo + hi) / 2) * 52 * 10000);
  return aprBp > 20000 ? null : { down: enganche, week: semana, weeks, months: meses, total, aprBp };
}

/* ── Lo de cada negocio: la herramienta (o lo de base), el tope y el impuesto de su ciudad ── */
type FilaB = { subs: string[]; fv: string[]; ca: Record<string, any> | null; city: string; hay: boolean; ov: string | null; fee: number | null; tags: number | null; fin: boolean | null; itin: boolean | null;
  nc: boolean | null; idown: number | null; apr: number | null; term: number | null; trade: boolean | null; casa: boolean | null; rep: boolean | null; gar: number | null;
  bd: number | null; bw: number | null; bm: number | null; lot: number | null; pro: boolean; tope: number; tax: number | null; lic: string | null; v30: number;
  tp: { dow: number; min: number; on: boolean }[] | null; tc: number | null; th: number };
type FilaC = Omit<CarroAuto, "puerta" | "est" | "bhph"> & { price: number; taxBp: number; tax: number; tagsC: number; feeC: number; otd: number;
  ed: number | null; ea: number | null; em: number | null; ep: number | null; et: number | null; bd: number | null; bw: number | null; bk: number | null; bt: number | null; ba: number | null };

export async function herramientaAutos(negocio: string, c: Q = db()): Promise<HerrAutos | null> {
  const b = (await c.query<FilaB>(
    `select coalesce((select array_agg(sc.name->>'es' order by array_position(b.subcategory_ids, sc.id)) from subcategorias_vivas sc where sc.id = any(b.subcategory_ids)), '{}') as subs,
            b.filter_values as fv, b.category_attrs as ca, b.city_id as city, s.business_id is not null as hay, s.kind_override as ov, s.doc_fee_cents as fee, s.tags_cents as tags, s.fin, s.itin,
            s.no_credit as nc, s.itin_down_cents as idown, s.apr_bp as apr, s.term_m as term, s.trade, s.home_test as casa, s.reports_credit as rep, s.warranty_default as gar,
            s.bhph_down_cents as bd, s.bhph_week_cents as bw, s.bhph_months as bm, s.lot_total as lot,
            coalesce((select plan = 'pro' from business_stats_cache x where x.business_id = b.id), false) as pro,
            ${cfgSql(TOPE_KEY)} as tope,
            (select t.parts_bp from tax_rules t where t.city_id = b.city_id and t.category_id = 'NEG-DEALER' and t.effective_from <= now() order by t.effective_from desc, t.id desc limit 1) as tax,
            (select l.number from licenses l where l.business_id = b.id and l.kind = 'pa_dealer' and l.status = 'valid' order by l.verified_at desc nulls last limit 1) as lic,
            (select count(*)::int from vehicle_listings v where v.business_id = b.id and v.status = 'sold' and v.status_at > now() - interval '30 days') as v30,
            s.test_pattern as tp, s.test_cupo as tc,
            (select count(*)::int from class_groups g where g.business_id = b.id and g.purpose = 'prueba' and g.status = 'open' and g.seats_total > g.seats_booked + g.seats_outside) as th
       from businesses b left join dealer_settings s on s.business_id = b.id where b.id = $1 and b.category_id = 'NEG-DEALER'`, [negocio])).rows[0];
  if (!b) return null;
  const C = await c.query<FilaC>(
    `select i.id::text, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.photos as fotos, v.vin, v.year, v.make, v.model, v.trim_level as trim, v.body, v.miles, v.engine_hours as hours,
            v.transmission as trans, v.fuel, v.drivetrain as drive, v.title, v.history_report as history, v.history_src as "historySrc", v.pa_inspection as inspeccion, v.warranty,
            v.warranty_months as "wMonths", v.warranty_miles as "wMiles", v.street_legal as street, v.cdl, v.price_cents as price, v.tax_bp as "taxBp", v.tax_cents as tax, v.tags_cents as "tagsC",
            v.doc_fee_cents as "feeC", v.otd_cents as otd, v.est_down_cents as ed, v.est_apr_bp as ea, v.est_months as em, v.est_payment_cents as ep, v.est_total_cents as et,
            v.bhph_down_cents as bd, v.bhph_week_cents as bw, v.bhph_weeks as bk, v.bhph_total_cents as bt, v.bhph_apr_bp as ba, v.status,
            case when i.status = 'hidden' then coalesce(i.hidden_reason, '') end as adm
       from vehicle_listings v join items i on i.id = v.item_id where v.business_id = $1 and i.removed_at is null order by i.sort, i.id`, [negocio]);
  const fv = b.fv ?? [], onb = (b.ca?.onb ?? {}) as { tool?: Record<string, unknown>; own?: Record<string, unknown> };
  const itin = b.itin ?? (fv.includes("itin") || onb.tool?.itin === true), garOnb = Number(onb.tool?.gar ?? 0);
  return {
    kind: kindAutosDe(b.subs, b.ov), forzado: !!b.ov, subs: b.subs, pro: b.pro, tope: b.tope, taxBp: b.tax, lic: b.lic, vendidos30: b.v30,
    carros: C.rows.map((x) => ({
      id: x.id, name: x.name, desc: x.desc, fotos: x.fotos, vin: x.vin, year: x.year, make: x.make, model: x.model, trim: x.trim, body: x.body, miles: x.miles, hours: x.hours, trans: x.trans, fuel: x.fuel,
      drive: x.drive, title: x.title, history: x.history, historySrc: x.historySrc, inspeccion: x.inspeccion, warranty: x.warranty, wMonths: x.wMonths, wMiles: x.wMiles, street: x.street, cdl: x.cdl,
      status: x.status, adm: x.adm, puerta: { price: x.price, taxBp: x.taxBp, tax: x.tax, tags: x.tagsC, fee: x.feeC, otd: x.otd },
      est: x.ep != null ? { down: x.ed!, aprBp: x.ea!, months: x.em!, pago: x.ep, total: x.et! } : null,
      bhph: x.bt != null ? { down: x.bd!, week: x.bw!, weeks: x.bk!, months: Math.round((x.bk! * 12) / 52), total: x.bt, aprBp: x.ba! } : null,
    })),
    // Sin fila todavía: lo que dice hoy la página o lo que se dijo en Publica tu negocio (como state() L190).
    fin: b.fin ?? (itin || onb.own?.fin === "si" || onb.own?.fin === "itin"), itin, noCredit: b.nc ?? fv.includes("sincredito"), itinDown: b.idown ?? 150000, aprBp: b.apr, termM: b.term,
    trade: b.trade ?? (fv.includes("tradein") || onb.tool?.trade === true), casa: b.casa ?? fv.includes("casa"), reporta: b.rep ?? fv.includes("reporta"),
    garantia: b.gar ?? (garOnb === 6 ? 6 : garOnb > 0 || fv.includes("garantia") ? 3 : 0),
    fee: Math.min(b.fee ?? Math.max(0, Math.round(Number(onb.tool?.fee ?? 0)) * 100), b.tope), tags: b.tags ?? 15000, lot: b.lot ?? 0,
    bhphDown: b.bd ?? 99900, bhphWeek: b.bw ?? 9500, bhphMonths: b.bm ?? 18,
    prueba: { pattern: Array.isArray(b.tp) ? b.tp : [], cupo: b.tc ?? 1, horas: b.th },
  };
}
export const autosPanel = herramientaAutos;

/* La fila de Tu herramienta nace con lo que dice la página (para no apagar nada sin querer). */
export async function asegurarFila(c: PoolClient, negocio: string, actor: string | null) {
  const h = await herramientaAutos(negocio, c);
  if (!h) return;
  await c.query(
    `insert into dealer_settings (business_id, city_id, doc_fee_cents, tags_cents, fin, itin, no_credit, itin_down_cents, trade, home_test, reports_credit, warranty_default, lot_total, updated_by)
     select id, city_id, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13 from businesses where id = $1 on conflict (business_id) do nothing`,
    [negocio, h.fee, h.tags, h.fin, h.itin, h.noCredit, h.itinDown, h.trade, h.casa, h.reporta, h.garantia, Math.max(h.lot, h.carros.filter((x) => visibleCarro(x.status)).length), actor]);
}

/* ── Los totales de TODOS los carros del negocio (los vendidos se quedan como se vendieron): el tope, el impuesto de hoy, placas, cargo,
   el pago de ejemplo y compre aquí pague aquí. Una sola escritura por lote (sin N+1). Devuelve cuántos cambiaron. ── */
export async function recalcularTotales(c: PoolClient, negocio: string): Promise<number> {
  const h = await herramientaAutos(negocio, c);
  if (!h || h.taxBp == null) return 0;
  const s = (await c.query<{ fee: number; tags: number; lot: number }>(`select doc_fee_cents as fee, tags_cents as tags, lot_total as lot from dealer_settings where business_id = $1 for update`, [negocio])).rows[0];
  if (!s) return 0;
  const fee = Math.min(s.fee, h.tope);
  if (fee !== s.fee) await c.query(`update dealer_settings set doc_fee_cents = $2, updated_at = now() where business_id = $1`, [negocio, fee]);
  const vis = h.carros.filter((x) => visibleCarro(x.status)).length;
  if (s.lot < vis) await c.query(`update dealer_settings set lot_total = $2 where business_id = $1`, [negocio, vis]);
  const financia = h.fin && h.kind !== "bhph";
  const U: [string, Puerta, Pago | null, Bhph | null][] = [];
  for (const x of h.carros) {
    if (x.status === "sold") continue;
    const p = enLaPuerta(x.puerta.price, h.taxBp, s.tags, fee);
    const e = financia ? pagoEjemplo(p.otd, h.itinDown, h.aprBp, h.termM) : null;
    const bh = h.kind === "bhph" ? totalBhph(p.otd, h.bhphDown, h.bhphWeek, h.bhphMonths) : null;
    if (JSON.stringify([p, e, bh]) !== JSON.stringify([x.puerta, x.est, x.bhph])) U.push([x.id, p, e, bh]);
  }
  if (!U.length) return 0;
  const col = <T,>(f: (u: (typeof U)[number]) => T) => U.map(f);
  await c.query(
    `update vehicle_listings v set tax_bp = u.tb, tax_cents = u.tx, tags_cents = u.tg, doc_fee_cents = u.fe, otd_cents = u.ot,
            est_down_cents = u.ed, est_apr_bp = u.ea, est_months = u.em, est_payment_cents = u.ep, est_total_cents = u.et,
            bhph_down_cents = u.bd, bhph_week_cents = u.bw, bhph_weeks = u.bk, bhph_total_cents = u.bt, bhph_apr_bp = u.ba, updated_at = now()
       from unnest($1::bigint[], $2::int[], $3::int[], $4::int[], $5::int[], $6::int[], $7::int[], $8::int[], $9::smallint[], $10::int[], $11::int[], $12::int[], $13::int[], $14::smallint[], $15::int[], $16::int[])
            as u(id, tb, tx, tg, fe, ot, ed, ea, em, ep, et, bd, bw, bk, bt, ba)
      where v.item_id = u.id and v.business_id = $17`,
    [col((u) => u[0]), col((u) => u[1].taxBp), col((u) => u[1].tax), col((u) => u[1].tags), col((u) => u[1].fee), col((u) => u[1].otd),
      col((u) => u[2]?.down ?? null), col((u) => u[2]?.aprBp ?? null), col((u) => u[2]?.months ?? null), col((u) => u[2]?.pago ?? null), col((u) => u[2]?.total ?? null),
      col((u) => u[3]?.down ?? null), col((u) => u[3]?.week ?? null), col((u) => u[3]?.weeks ?? null), col((u) => u[3]?.total ?? null), col((u) => u[3]?.aprBp ?? null), negocio]);
  return U.length;
}

/* ── Free: 5 vehículos a la vista (el servidor lo hace cumplir) ── */
async function topeFree(c: Q, negocio: string, excepto: string | null): Promise<R | null> {
  const x = (await c.query<{ pro: boolean; n: number }>(
    `select coalesce((select plan = 'pro' from business_stats_cache where business_id = $1), false) as pro,
            (select count(*)::int from vehicle_listings v join items i on i.id = v.item_id where v.business_id = $1 and i.removed_at is null and i.status = 'live'
               and v.status in ('lot', 'pending') and ($2::bigint is null or v.item_id <> $2::bigint)) as n`, [negocio, excepto])).rows[0]!;
  if (!x.pro && x.n >= TOPE_CARROS_FREE) return err(`Con Free se ven ${TOPE_CARROS_FREE} vehículos. Marca uno como vendido u oculto, o pasa a Pro.`, `On Free, ${TOPE_CARROS_FREE} vehicles show. Mark one sold or hidden, or go Pro.`);
  return null;
}

/* ── El total en la puerta de un precio, para el editor (en vivo, sin guardar) ── */
export async function cotizarCarro(negocio: string, priceCents: number): Promise<{ puerta: Puerta; est: Pago | null; bhph: Bhph | null } | null> {
  const h = await herramientaAutos(negocio);
  const p = entero(priceCents);
  if (!h || h.taxBp == null || !(p >= 10000 && p <= 50000000)) return null;
  const puerta = enLaPuerta(p, h.taxBp, h.tags, Math.min(h.fee, h.tope));
  return { puerta, est: h.fin && h.kind !== "bhph" ? pagoEjemplo(puerta.otd, h.itinDown, h.aprBp, h.termM) : null, bhph: h.kind === "bhph" ? totalBhph(puerta.otd, h.bhphDown, h.bhphWeek, h.bhphMonths) : null };
}

/* ── El vehículo: crear o guardar (todo revisado aquí) ── */
export type CarroIn = {
  vin: string; year: number | null; make: string; model: string; trim: string; body: Body; miles: number | null; hours: number | null; trans: Trans | null; fuel: Fuel | null; drive: Drive | null;
  title: Titulo; history: boolean; historySrc: string; inspeccion: boolean; warranty: Garantia; wMonths: number | null; wMiles: number | null; street: boolean; cdl: boolean;
  price: number; desc: Bi; fotos: string[];
};
export async function guardarCarro(c: PoolClient, negocio: string, itemId: string, p0: CarroIn, actor: string): Promise<R> {
  const b = (await c.query<{ city: string; anio: number }>(`select b.city_id as city, extract(year from ${HOY_SQL})::int as anio from businesses b join cities ci on ci.id = b.city_id where b.id = $1 and b.category_id = 'NEG-DEALER' for update of b`, [negocio])).rows[0];
  if (!b) return err("Esto es para Venta de Autos.", "This is for car dealers.");
  const p = (p0 ?? {}) as CarroIn, nuevo = itemId === "new";
  if (!nuevo && !ID.test(String(itemId))) return err("Ese vehículo no existe.", "That vehicle does not exist.");
  const antes = nuevo ? null : (await c.query<{ status: EstadoCarro }>(
    `select v.status from vehicle_listings v join items i on i.id = v.item_id where v.item_id = $1::bigint and v.business_id = $2 and i.removed_at is null for update of v`, [itemId, negocio])).rows[0];
  if (!nuevo && !antes) return err("Ese vehículo ya no está.", "That vehicle is gone.");
  const body = String(p.body) as Body;
  if (!BODIES.includes(body)) return err("Elige qué es: carro, SUV, pickup…", "Pick what it is: car, SUV, pickup…");
  // VIN: 17 letras y números con su dígito verificador; el año sale del VIN si no se escribió.
  const vin = limpiarVin(p.vin ?? "");
  let year = p.year == null || (p.year as unknown) === "" ? NaN : entero(p.year);
  if (vin && !vinValido(vin)) return err("Ese VIN no es válido: revisa las 17 letras y números (sin I, O ni Q).", "That VIN is not valid: check the 17 letters and numbers (no I, O or Q).");
  if (Number.isNaN(year) && vin) year = anioDeVin(vin, b.anio) ?? NaN;
  if (!(year >= 1900 && year <= b.anio + 2)) return err("Escribe el año del modelo.", "Type the model year.");
  if (!vin && !sinVin(body, year)) return err("Escribe el VIN (17 letras y números): está en el parabrisas y en la puerta del chofer.", "Type the VIN (17 letters and numbers): it is on the windshield and the driver’s door.");
  if (vin && !anioCoincide(vin, year)) return err("El VIN dice que es de otro año (la letra 10). Revisa el año o el VIN.", "The VIN says a different year (10th character). Check the year or the VIN.");
  if (vin) {
    const dup = (await c.query(`select 1 from vehicle_listings where business_id = $1 and vin = $2 and status <> 'sold' and ($3::bigint is null or item_id <> $3::bigint)`, [negocio, vin, nuevo ? null : itemId])).rowCount;
    if (dup) return err("Ese VIN ya está en tu inventario.", "That VIN is already in your inventory.");
  }
  const make = txt(p.make, 30), model = txt(p.model, 40), trim = txt(p.trim, 40) || null;
  if (!make) return err("Escribe la marca.", "Type the make.");
  if (!model) return err("Escribe el modelo.", "Type the model.");
  const miles = p.miles == null || (p.miles as unknown) === "" ? null : entero(p.miles), hours = body === "bote" && p.hours != null && (p.hours as unknown) !== "" ? entero(p.hours) : null;
  if (pideMillas(body) && miles == null) return err("Escribe el millaje.", "Type the mileage.");
  if (miles != null && !(miles >= 0 && miles <= 2000000)) return err("Revisa el millaje.", "Check the mileage.");
  if (hours != null && !(hours >= 0 && hours <= 100000)) return err("Revisa las horas de motor.", "Check the engine hours.");
  const trans = TRANS.some((x) => x[0] === p.trans) ? p.trans : null, fuel = FUEL.some((x) => x[0] === p.fuel) ? p.fuel : null, drive = DRIVE.some((x) => x[0] === p.drive) ? p.drive : null;
  const title = (["limpio", "reconstruido", "salvage"] as Titulo[]).includes(p.title) ? p.title : null;
  if (!title) return err("Elige el título: limpio, reconstruido o salvage.", "Pick the title: clean, rebuilt or salvage.");
  const history = p.history === true, historySrc = history ? txt(p.historySrc, 30) || null : null;
  if (historySrc && historySrc.length < 2) return err("Escribe de quién es el historial (ej. Carfax).", "Type who provides the history (e.g. Carfax).");
  const warranty = (["como_esta", "dealer", "fabrica", "certificado"] as Garantia[]).includes(p.warranty) ? p.warranty : null;
  if (!warranty) return err("Elige la garantía (o «se vende como está»).", "Pick the warranty (or “sold as is”).");
  const wMonths = warranty === "como_esta" ? null : entero(p.wMonths), wMiles = warranty === "como_esta" || p.wMiles == null || (p.wMiles as unknown) === "" ? null : entero(p.wMiles);
  if (wMonths != null && !(wMonths >= 1 && wMonths <= 120)) return err("La garantía va de 1 a 120 meses.", "Warranty goes from 1 to 120 months.");
  if (wMiles != null && !(wMiles >= 100 && wMiles <= 200000)) return err("Revisa las millas de la garantía.", "Check the warranty miles.");
  // Salvage: no va por la calle hasta pasar la inspección de PA (siempre).
  const street = title === "salvage" ? false : p.street !== false && (BODY[body].calle || p.street === true), cdl = conCdl(body) && p.cdl === true;
  const price = entero(p.price);
  if (!(price >= 10000 && price <= 50000000 && price % 100 === 0)) return err("Pon el precio en dólares (antes de impuesto, placas y cargos).", "Set the price in dollars (before tax, tags and fees).");
  const desc = bi(p.desc, 300);
  if ([desc.es, desc.en].some((t) => PAGO_SUELTO.test(t))) return err("El pago al mes, a la semana y el enganche los calcula To’Latino con la tasa y los meses: quítalos de la descripción.", "Monthly or weekly payments and down payments are calculated by To’Latino with the rate and term: remove them from the description.");
  const fotos = (Array.isArray(p.fotos) ? p.fotos : []).filter((u) => typeof u === "string" && FOTO.test(u)).slice(0, 12);
  if (nuevo) { const t = await topeFree(c, negocio, null); if (t) return t; }
  // El total en la puerta: impuesto de la ciudad, placas y cargo de la herramienta (nunca más que el tope).
  await asegurarFila(c, negocio, actor);
  const h = (await herramientaAutos(negocio, c))!;
  if (h.taxBp == null) return err("Falta el impuesto de tu ciudad: To’Latino lo revisa.", "Your city’s tax is missing: To’Latino will check it.");
  const puerta = enLaPuerta(price, h.taxBp, h.tags, Math.min(h.fee, h.tope));
  const est = h.fin && h.kind !== "bhph" ? pagoEjemplo(puerta.otd, h.itinDown, h.aprBp, h.termM) : null, bh = h.kind === "bhph" ? totalBhph(puerta.otd, h.bhphDown, h.bhphWeek, h.bhphMonths) : null;
  const nombre = nombreCarro(year, make, model, trim);
  let id = itemId;
  if (nuevo) {
    id = (await c.query<{ id: string }>(
      `insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, photos, sell, sort)
       values ($1, 'svc', $2::jsonb, $3::jsonb, $4, 30, 'auto', '{}'::jsonb, $5, true, (select coalesce(max(sort), -1) + 1 from items where business_id = $1 and module = 'svc')) returning id::text`,
      [negocio, JSON.stringify({ es: nombre, en: nombre }), JSON.stringify({ es: desc.es, en: desc.en || desc.es }), price, fotos])).rows[0]!.id;
  } else {
    await c.query(`update items set name = $2::jsonb, descr = $3::jsonb, price_cents = $4, photos = $5, updated_at = now() where id = $1::bigint and business_id = $6`,
      [id, JSON.stringify({ es: nombre, en: nombre }), JSON.stringify({ es: desc.es, en: desc.en || desc.es }), price, fotos, negocio]);
  }
  await c.query(
    `insert into vehicle_listings (item_id, business_id, city_id, vin, year, make, model, trim_level, body, miles, engine_hours, transmission, fuel, drivetrain, title, history_report, history_src,
        pa_inspection, warranty, warranty_months, warranty_miles, street_legal, cdl, price_cents, tax_bp, tax_cents, tags_cents, doc_fee_cents, otd_cents,
        est_down_cents, est_apr_bp, est_months, est_payment_cents, est_total_cents, bhph_down_cents, bhph_week_cents, bhph_weeks, bhph_total_cents, bhph_apr_bp)
     values ($1::bigint, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39)
     on conflict (item_id) do update set vin = excluded.vin, year = excluded.year, make = excluded.make, model = excluded.model, trim_level = excluded.trim_level, body = excluded.body,
        miles = excluded.miles, engine_hours = excluded.engine_hours, transmission = excluded.transmission, fuel = excluded.fuel, drivetrain = excluded.drivetrain, title = excluded.title,
        history_report = excluded.history_report, history_src = excluded.history_src, pa_inspection = excluded.pa_inspection, warranty = excluded.warranty, warranty_months = excluded.warranty_months,
        warranty_miles = excluded.warranty_miles, street_legal = excluded.street_legal, cdl = excluded.cdl, price_cents = excluded.price_cents, tax_bp = excluded.tax_bp, tax_cents = excluded.tax_cents,
        tags_cents = excluded.tags_cents, doc_fee_cents = excluded.doc_fee_cents, otd_cents = excluded.otd_cents, est_down_cents = excluded.est_down_cents, est_apr_bp = excluded.est_apr_bp,
        est_months = excluded.est_months, est_payment_cents = excluded.est_payment_cents, est_total_cents = excluded.est_total_cents, bhph_down_cents = excluded.bhph_down_cents,
        bhph_week_cents = excluded.bhph_week_cents, bhph_weeks = excluded.bhph_weeks, bhph_total_cents = excluded.bhph_total_cents, bhph_apr_bp = excluded.bhph_apr_bp, updated_at = now()`,
    [id, negocio, b.city, vin || null, year, make, model, trim, body, miles, hours, trans, fuel, drive, title, history, historySrc, p.inspeccion === true, warranty, wMonths, wMiles, street, cdl,
      price, puerta.taxBp, puerta.tax, puerta.tags, puerta.fee, puerta.otd, est?.down ?? null, est?.aprBp ?? null, est?.months ?? null, est?.pago ?? null, est?.total ?? null,
      bh?.down ?? null, bh?.week ?? null, bh?.weeks ?? null, bh?.total ?? null, bh?.aprBp ?? null]);
  await recalcularTotales(c, negocio); // «Carros en el lote» nunca menos de los que están en la app
  return { ok: true, id, puerta };
}

/* ── Estado: En el lote · Apartado en persona · Vendido · Oculto (L441). Vender baja «Carros en el lote»; volver al lote lo sube. ── */
export async function cambiarEstadoCarro(c: PoolClient, negocio: string, itemId: string, st0: string, desdeHerramienta = false): Promise<R> {
  if (!ID.test(String(itemId))) return err("Ese vehículo no existe.", "That vehicle does not exist.");
  const st = String(st0) as EstadoCarro;
  if (!["lot", "pending", "sold", "hidden"].includes(st)) return err("Elige el estado.", "Pick the status.");
  const x = (await c.query<{ status: EstadoCarro; vin: string | null }>(
    `select v.status, v.vin from vehicle_listings v join items i on i.id = v.item_id where v.item_id = $1::bigint and v.business_id = $2 and i.removed_at is null for update of v`, [itemId, negocio])).rows[0];
  if (!x) return err("Ese vehículo ya no está.", "That vehicle is gone.");
  if (x.status === st) return { ok: true };
  if (visibleCarro(st) && !visibleCarro(x.status)) { const t = await topeFree(c, negocio, itemId); if (t) return t; }
  if (desdeHerramienta && st === "sold") {
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from vehicle_listings v join items i on i.id = v.item_id where v.business_id = $1 and v.status in ('lot', 'pending') and i.status = 'live' and i.removed_at is null`, [negocio])).rows[0]!.n;
    if (n <= 1) return err("Deja al menos un carro en la app.", "Keep at least one car in the app.");
  }
  if (x.status === "sold" && x.vin && (await c.query(`select 1 from vehicle_listings where business_id = $1 and vin = $2 and status <> 'sold' and item_id <> $3::bigint`, [negocio, x.vin, itemId])).rowCount)
    return err("Ese VIN ya está en tu inventario.", "That VIN is already in your inventory.");
  await asegurarFila(c, negocio, null);
  await c.query(`update vehicle_listings set status = $2, status_at = now(), updated_at = now() where item_id = $1::bigint`, [itemId, st]);
  if (st === "sold" && x.status !== "sold") await c.query(`update dealer_settings set lot_total = greatest(lot_total - 1, 0) where business_id = $1`, [negocio]);
  if (x.status === "sold" && st !== "sold") await c.query(`update dealer_settings set lot_total = lot_total + 1 where business_id = $1`, [negocio]);
  // 4ie · Vendido u oculto: las pruebas de manejo vivas de ese carro se cancelan sin culpa en esta misma transacción (el aviso sale después).
  if (st === "sold" || st === "hidden") await retirarAnuncio(c, negocio, itemId, st === "sold" ? "sold" : "hidden");
  await recalcularTotales(c, negocio);
  return { ok: true };
}

/* ── Tu herramienta: un toque a la vez (dash2-cat.js L429–443). Cada toque recalcula los totales de todos los carros (misma transacción). ── */
export type AutosIn = {
  fin?: boolean; itin?: boolean; noCredit?: boolean; trade?: boolean; casa?: boolean; reporta?: boolean; enganche?: number; garantia?: number; cargo?: number; lote?: number;
  pago?: { aprBp: number; meses: number } | null; bhphEng?: number; bhphSem?: number; bhphMeses?: number;
  estado?: { item: string; status: string }; precio?: { item: string; cents: number };
  prueba?: { pattern: { dow: number; min: number; on: boolean }[]; cupo: number };
};
export async function guardarHerramientaAutos(c: PoolClient, negocio: string, p: AutosIn, actor: string): Promise<R> {
  const b = (await c.query<{ city: string }>(`select city_id as city from businesses where id = $1 and category_id = 'NEG-DEALER' for update`, [negocio])).rows[0];
  if (!b) return err("Esto es para Venta de Autos.", "This is for car dealers.");
  await asegurarFila(c, negocio, actor);
  const h = (await herramientaAutos(negocio, c))!;
  if (!conInventario(h.kind)) return err("Lo tuyo va en Servicios: ahí pones cada servicio y su precio.", "Yours goes in Services: add each service and its price there.");
  const set = (sql: string, v: unknown[]) => c.query(`update dealer_settings set ${sql}, updated_by = $${v.length + 2}, updated_at = now() where business_id = $1`, [negocio, ...v, actor]);
  const carro = (id: unknown) => h.carros.find((x) => x.id === String(id) && x.adm == null);
  const bhph = h.kind === "bhph";
  let r: R = { ok: true };
  if (p.fin !== undefined) { if (bhph) return err("Compre aquí pague aquí usa enganche y pago a la semana.", "Buy here pay here uses down payment and weekly payment."); await set(p.fin === true ? `fin = true` : `fin = false, itin = false, no_credit = false`, []); }
  else if (p.itin !== undefined) { await set(p.itin === true ? `itin = true, fin = ${bhph ? "fin" : "true"}` : `itin = false`, []); }
  else if (p.noCredit !== undefined) { await set(p.noCredit === true ? `no_credit = true, fin = ${bhph ? "fin" : "true"}` : `no_credit = false`, []); }
  else if (p.trade !== undefined) await set(`trade = $2`, [p.trade === true]);
  else if (p.casa !== undefined) await set(`home_test = $2`, [p.casa === true]);
  else if (p.reporta !== undefined) { if (!bhph) return err("Esto es para compre aquí pague aquí.", "This is for buy here pay here."); await set(`reports_credit = $2`, [p.reporta === true]); }
  else if (p.enganche !== undefined) {
    const v = entero(p.enganche);
    if (!(v >= 50000 && v <= 2000000 && v % 10000 === 0)) return err("El enganche va desde $500, de $100 en $100.", "The down payment starts at $500, in $100 steps.");
    await set(`itin_down_cents = $2`, [v]);
  } else if (p.garantia !== undefined) {
    const g = entero(p.garantia);
    if (!(GARANTIAS_DEALER as readonly number[]).includes(g)) return err("Elige la garantía.", "Pick the warranty.");
    await set(`warranty_default = $2`, [g]);
    // La garantía del dealer en motor y transmisión va a cada carro que no trae la de fábrica (lo mismo que la Buyers Guide).
    await c.query(`update vehicle_listings set warranty = $2, warranty_months = $3, warranty_miles = $4, updated_at = now() where business_id = $1 and status <> 'sold' and warranty in ('como_esta', 'dealer')`,
      [negocio, g ? "dealer" : "como_esta", g || null, g ? g * 1000 : null]);
  } else if (p.cargo !== undefined) {
    const v = entero(p.cargo);
    if (!(v >= 0 && v % 100 === 0)) return err("El cargo del dealer va en dólares.", "The dealer fee is in dollars.");
    if (v > h.tope) return err(`El cargo del dealer no puede pasar del tope de PA (${usd(h.tope)}).`, `The dealer fee cannot exceed the PA cap (${usd(h.tope)}).`);
    await set(`doc_fee_cents = $2`, [v]);
  } else if (p.lote !== undefined) {
    const v = entero(p.lote), vis = h.carros.filter((x) => visibleCarro(x.status)).length;
    if (!(v >= vis && v <= 5000)) return err(`En el lote hay al menos los ${vis} que están en la app.`, `The lot has at least the ${vis} in the app.`);
    await set(`lot_total = $2`, [v]);
  } else if (p.pago !== undefined) {
    if (bhph) return err("Compre aquí pague aquí usa enganche y pago a la semana.", "Buy here pay here uses down payment and weekly payment.");
    if (p.pago === null) await set(`apr_bp = null, term_m = null`, []);
    else {
      const apr = entero(p.pago.aprBp), m = entero(p.pago.meses);
      if (!(apr >= 0 && apr <= 3000 && apr % 10 === 0)) return err("La tasa va de 0 % a 30 %.", "The rate goes from 0% to 30%.");
      if (!(MESES_PAGO as readonly number[]).includes(m)) return err("Elige los meses.", "Pick the term.");
      await set(`apr_bp = $2, term_m = $3, fin = true`, [apr, m]);
    }
  } else if (p.bhphEng !== undefined || p.bhphSem !== undefined || p.bhphMeses !== undefined) {
    if (!bhph) return err("Esto es para compre aquí pague aquí.", "This is for buy here pay here.");
    if (p.bhphEng !== undefined) { const v = entero(p.bhphEng); if (!(v >= 0 && v <= 1000000 && v % 10000 === 0)) return err("El enganche va de $100 en $100.", "The down payment goes in $100 steps."); await set(`bhph_down_cents = $2`, [v]); }
    else if (p.bhphSem !== undefined) { const v = entero(p.bhphSem); if (!(v >= 2500 && v <= 100000 && v % 500 === 0)) return err("El pago a la semana va desde $25, de $5 en $5.", "The weekly payment starts at $25, in $5 steps."); await set(`bhph_week_cents = $2`, [v]); }
    else { const v = entero(p.bhphMeses); if (!(MESES_BHPH as readonly number[]).includes(v)) return err("Elige los meses.", "Pick the months."); await set(`bhph_months = $2`, [v]); }
  } else if (p.estado !== undefined) {
    if (!carro(p.estado?.item)) return err("Ese vehículo ya no está.", "That vehicle is gone.");
    return cambiarEstadoCarro(c, negocio, String(p.estado.item), String(p.estado.status), true);
  } else if (p.precio !== undefined) {
    const x = carro(p.precio?.item), v = entero(p.precio?.cents);
    if (!x || x.status === "sold") return err("Ese vehículo ya no está.", "That vehicle is gone.");
    if (!(v >= 10000 && v <= 50000000 && v % 100 === 0)) return err("Pon el precio en dólares.", "Set the price in dollars.");
    // El precio nuevo con su total (la misma fórmula); el pago de ejemplo y compre aquí pague aquí los rehace recalcularTotales abajo.
    const q = enLaPuerta(v, x.puerta.taxBp, x.puerta.tags, x.puerta.fee);
    await c.query(`update vehicle_listings set price_cents = $2, tax_cents = $3, otd_cents = $4, est_down_cents = null, est_apr_bp = null, est_months = null, est_payment_cents = null, est_total_cents = null,
                    bhph_down_cents = null, bhph_week_cents = null, bhph_weeks = null, bhph_total_cents = null, bhph_apr_bp = null, updated_at = now() where item_id = $1::bigint`, [x.id, v, q.tax, q.otd]);
    await c.query(`update items set price_cents = $2, updated_at = now() where id = $1::bigint`, [x.id, v]);
  } else if (p.prueba !== undefined) {
    // 4ie · Horas de prueba de manejo «cualquier carro»: de 6 AM a 10 PM, cada media hora, sin repetir, hasta 21; de 1 a 5 a la misma hora.
    const L = Array.isArray(p.prueba?.pattern) ? p.prueba.pattern : [], cupo = entero(p.prueba?.cupo);
    const P = L.map((v) => ({ dow: entero(v?.dow), min: entero(v?.min), on: v?.on !== false }));
    if (P.length > 21 || P.some((v) => !(v.dow >= 0 && v.dow <= 6 && v.min >= 360 && v.min <= 1320 && v.min % 30 === 0)) || new Set(P.map((v) => `${v.dow}:${v.min}`)).size !== P.length)
      return err("Revisa las horas de prueba (de 6 AM a 10 PM, sin repetir).", "Check the test drive times (6 AM to 10 PM, no repeats).");
    if (!(cupo >= 1 && cupo <= 5)) return err("Cada hora de prueba es para 1 a 5 personas.", "Each test drive time is for 1 to 5 people.");
    await set(`test_pattern = $2::jsonb, test_cupo = $3`, [JSON.stringify(P.sort((a, b) => a.dow - b.dow || a.min - b.min)), cupo]);
    await horasPrueba(c, negocio);
  } else r = err("No hay nada que guardar.", "Nothing to save.");
  if (r.ok) await recalcularTotales(c, negocio);
  return r;
}

/* ── Los filtros de Venta de Autos que salen de los datos (nunca se editan a mano) y la tarjeta del buscador (apply L214–224). Lo que nadie
   deriva (esp, y10, verified, prueba hasta 4ie, flota…) se conserva. Sin términos de crédito sueltos en la tarjeta (Regulation Z): el
   enganche, el pago y la tasa van juntos en cada carro. ── */
const DER = ["itin", "sincredito", "enganche", "garantia", "tradein", "limpio", "casa", "reporta", "prueba"];
type Tj = Record<string, Bi>;
const esBi = (v: unknown): v is Bi => !!v && typeof v === "object" && typeof (v as Bi).es === "string";

export async function recalcularFiltrosAutos(c: Q, negocio: string) {
  const b = (await c.query<{ fv: string[]; ca: Record<string, unknown> | null; hay: boolean; hoy: string }>(
    `select b.filter_values as fv, b.category_attrs as ca, exists (select 1 from dealer_settings s where s.business_id = b.id) as hay, ${HOY_SQL}::text as hoy
       from businesses b join cities ci on ci.id = b.city_id where b.id = $1 and b.category_id = 'NEG-DEALER'`, [negocio])).rows[0];
  if (!b || !b.hay) return;
  const h = (await herramientaAutos(negocio, c))!, F = new Set<string>(), ca = b.ca ?? {}, tj0 = (ca.tarjeta && typeof ca.tarjeta === "object" ? ca.tarjeta : {}) as Record<string, unknown>, tj: Tj = {};
  const V = h.carros.filter((x) => visibleCarro(x.status) && x.adm == null), bhph = h.kind === "bhph";
  if (h.itin) F.add("itin");
  if (bhph || h.noCredit || h.subs.includes("Sin crédito")) F.add("sincredito");
  if ((h.itin && h.itinDown <= 150000) || (bhph && h.bhphDown <= 150000)) F.add("enganche");
  if (h.garantia > 0 || V.some((x) => x.warranty !== "como_esta")) F.add("garantia");
  if (h.trade) F.add("tradein");
  if (V.length && V.every((x) => x.title === "limpio" && x.history)) F.add("limpio");
  if (h.casa) F.add("casa");
  if (bhph && h.reporta) F.add("reporta");
  if (h.prueba.horas > 0) F.add("prueba"); // 4ie: alguna hora de prueba de manejo abierta
  if (conInventario(h.kind)) {
    const n = Math.max(h.lot, V.length), uno = n === 1;
    tj.eta = h.kind === "moto" ? { es: `${n} ${uno ? "vehículo" : "vehículos"} en la tienda`, en: `${n} ${uno ? "vehicle" : "vehicles"} in store` }
      : h.kind === "rv" ? { es: `${n} ${uno ? "vehículo" : "vehículos"} en el lote`, en: `${n} ${uno ? "vehicle" : "vehicles"} on the lot` }
      : h.kind === "work" ? { es: `${n} ${uno ? "van o camión" : "vans y camiones"} en el lote`, en: `${n} ${uno ? "van or truck" : "vans and trucks"} on the lot` }
      : { es: `${n} ${uno ? "carro" : "carros"} en el lote`, en: `${n} ${uno ? "car" : "cars"} on the lot` };
    if (bhph) tj.fee = { es: "Sin crédito · el total que pagas, por escrito en cada carro", en: "No credit · the total you pay, in writing on every car" };
    else if (h.itin) tj.fee = { es: "Financian con ITIN · tasa, meses y enganche por escrito", en: "ITIN financing · rate, term and down payment in writing" };
    else if (h.garantia) tj.fee = { es: `Garantía de ${h.garantia} meses en motor y transmisión`, en: `${h.garantia}-month powertrain warranty` };
    else if (h.casa) tj.fee = { es: "Prueba de manejo en tu casa", en: "Test drive at your home" };
  }
  const fv = [...(b.fv ?? []).filter((x) => !DER.includes(x)), ...F];
  // Lo que se derivó la última vez y hoy ya no aplica se quita (autos_der); lo que puso el prototipo y nadie deriva se conserva.
  const antes = Array.isArray(ca.autos_der) ? (ca.autos_der as string[]) : [], nuevo: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(tj0)) if (esBi(v) && !antes.includes(k) && !(k in tj)) nuevo[k] = v;
  // Una tarjeta del prototipo con un término de crédito suelto (enganche o pago sin tasa) no se queda (Regulation Z).
  for (const k of Object.keys(nuevo)) { const v = nuevo[k] as Bi; if (/enganche|\bdown\b|a la semana|a week|al mes|a month/i.test(`${v.es} ${v.en}`)) delete nuevo[k]; }
  Object.assign(nuevo, tj);
  await c.query(`update businesses set filter_values = $2, category_attrs = coalesce(category_attrs, '{}'::jsonb) || $3::jsonb, updated_at = now() where id = $1`,
    [negocio, fv, JSON.stringify({ tarjeta: nuevo, autos_der: Object.keys(tj) })]);
  await c.query(`update dealer_settings set derived_on = $2::date where business_id = $1`, [negocio, b.hoy]);
}

/* ── El tope del cargo del dealer (solo el Super Admin, con auditoría en su acción): los cargos que pasan bajan al tope en la misma
   transacción; los totales de los carros se rehacen después por lotes (recalcularTodosPorLotes). ── */
export async function cambiarTopeCargo(c: PoolClient, cents: number): Promise<{ bajados: string[] } | null> {
  // 5i · El valor lo escribe cambiarConfig (lib/config.ts: límites y auditoría); aquí solo lo que hace además: bajar a los que pasan.
  const v = entero(cents);
  if (!(v >= 0 && v <= 200000 && v % 100 === 0)) return null;
  const bajados = (await c.query<{ id: string }>(`update dealer_settings set doc_fee_cents = $1, updated_at = now() where doc_fee_cents > $1 returning business_id as id`, [v])).rows.map((x) => x.id);
  return { bajados };
}

/* La firma de lo que mueve los totales de todos: el tope y la última regla de impuesto de Autos. Si cambia, se recalcula todo por lotes. */
async function firmaTotales(): Promise<string> {
  const x = (await db().query<{ tope: number; tax: string | null }>(
    `select ${cfgSql(TOPE_KEY)} as tope, (select max(id)::text from tax_rules where category_id = 'NEG-DEALER') as tax`)).rows[0]!;
  return `${x.tope}:${x.tax ?? "-"}`;
}
/* Por cursor (business_id), de 100 en 100, cada lote en su transacción corta: nadie queda bloqueado. Guarda dónde va en platform_config
   («autos_totales»: hecha · objetivo · cursor) para que el barrido siga donde quedó. max = cuántos negocios como mucho en esta vuelta. */
export async function recalcularTodosPorLotes(max = Number.MAX_SAFE_INTEGER): Promise<number> {
  const firma = await firmaTotales();
  const st = ((await db().query<{ v: { hecha?: string; objetivo?: string; cursor?: string | null } }>(`select value as v from platform_config where key = 'autos_totales'`)).rows[0]?.v ?? {});
  if (st.hecha === firma && !st.cursor) return 0;
  let cursor = st.objetivo === firma ? st.cursor ?? "" : "", n = 0;
  const guarda = (v: object) => db().query(`insert into platform_config (key, value, note) values ('autos_totales', $1::jsonb, 'Recalculo por lotes de los totales en la puerta (cursor)') on conflict (key) do update set value = excluded.value, updated_at = now()`, [JSON.stringify(v)]);
  while (n < max) {
    const L = (await db().query<{ id: string }>(`select business_id as id from dealer_settings where business_id > $1 order by business_id limit 100`, [cursor])).rows;
    for (const x of L) await tx(async (c) => { await recalcularTotales(c, x.id); await recalcularFiltrosAutos(c, x.id); });
    n += L.length;
    if (L.length < 100) { await guarda({ hecha: firma, objetivo: firma, cursor: null }); return n; }
    cursor = L[L.length - 1]!.id;
    await guarda({ hecha: st.hecha ?? null, objetivo: firma, cursor });
  }
  return n;
}

/* El barrido (cada minuto): sigue el recálculo por lotes si cambió el tope o el impuesto, y una vez al día por negocio rehace los
   totales, la tarjeta y los filtros. */
export async function barrerAutos(): Promise<number> {
  const n = await recalcularTodosPorLotes(300);
  const L = (await db().query<{ id: string }>(
    `select s.business_id as id from dealer_settings s join businesses b on b.id = s.business_id join cities ci on ci.id = b.city_id
      where b.status = 'active' and s.derived_on is distinct from ${HOY_SQL} order by s.derived_on nulls first limit 200`)).rows;
  for (const x of L) await tx(async (c) => { await recalcularTotales(c, x.id); await recalcularFiltrosAutos(c, x.id); });
  return n + L.length;
}

export type { HerrAutos, KindAutos };
