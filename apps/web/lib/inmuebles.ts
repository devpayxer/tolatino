import "server-only";
import type { Pool, PoolClient } from "pg";
import { db } from "./db";
import type { Bi } from "./inscripciones-comun";
import {
  DIAS_PRECAL, ENGANCHE_MIN, ENGANCHES, KINDS_PROP, PROP, TOPE_PROP_FREE, UTIL, alMes, conCuota, kindInmDe, sinPropiedades, soloZona, usd, visible,
  type Deal, type EstadoProp, type HerrInm, type KindProp, type Laundry, type PropInm, type Util, type VisitaPat,
} from "./inmuebles-comun";
import { revisarTexto } from "./vivienda-justa";

/* Bienes Raíces (Fase 4 · bloque 4ib). Plan: docs/diseno/plan/fase4-iglesias-inmuebles-autos.md §2 «0092», §3, §4ib y §5. Diseño:
   dash2-cat.js L508–533 («Propiedades y visitas» · «Casas en venta» · «Préstamos y requisitos» · «Cuartos y lo que incluye»), apply
   L268–280 (tarjeta y filtros), state L190–191.
   - Cada propiedad es un ítem (svc_kind 'renta' | 'venta') con su fila en property_listings. El servidor valida todo y calcula «Para
     mudarte» (renta + depósito + solicitud + lo obligatorio) y la cuota ESTIMADA de venta; el cliente solo los muestra.
   - ÚNICO archivo (con lib/visitas-inm*.ts en 4ie) que lee la dirección exacta (addr_line, geom) de una propiedad (guardián
     direccionAlConfirmar): aquí solo para el panel del propio negocio.
   - Vivienda justa: nombre, descripción, lo que piden, contrato y otro pago pasan por revisarTexto; si salta, no se guarda nada y queda
     la frase en la auditoría (la cola «Vivienda justa» llega en 4ig). Lo que piden nunca lleva números (SSN, ITIN, cuentas).
   - Horas de visita = class_groups de un día (purpose 'visita'), 14 días adelante desde el patrón semanal; el barrido las rehace.
   - Aquí no se mueve dinero: ver es gratis, nada se cobra ni se retiene (guardián sinDineroEnVisitas). */
type Q = Pool | PoolClient;
type R = { ok: true; id?: string } | { ok: false; es: string; en: string };
const err = (es: string, en: string): R => ({ ok: false, es, en });
const ID = /^\d{1,18}$/, FOTO = /^(https?:\/\/|\/)[^\s"']{1,500}$/, FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HOY_SQL = `(now() at time zone ci.timezone)::date`;
const txt = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, n) : "");
const bi = (v: unknown, n: number): Bi => ({ es: txt((v as Bi | undefined)?.es, n), en: txt((v as Bi | undefined)?.en, n) });
const entero = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : NaN; };
/* Lo que piden dice QUÉ papeles, nunca números: ni seguro social ni ITIN (9 dígitos), ni cuentas o tarjetas (§3). */
const NUMEROS = /\d{3}[-\s]?\d{2}[-\s]?\d{4}|\d{9,}/;
const VIVIENDA = (k: KindProp) => !["local", "oficina", "bodega", "cocina", "salon", "almacen", "parqueo"].includes(k);

/* La cuota ESTIMADA de una casa (siempre se muestra con «estimada»): principal e intereses a la tasa y el plazo de referencia, más
   impuestos y seguro como un porcentaje anual del precio. Constantes de referencia, a revisar antes de abrir (LAUNCH-CHECKLIST). */
export const EST_TASA_ANUAL = 0.0675;
export const EST_MESES = 360;
export const EST_IMP_SEG_ANUAL = 0.025;
export function cuotaEstimada(precioCents: number, pct: number) {
  const prestamo = precioCents * (1 - pct / 100), r = EST_TASA_ANUAL / 12;
  const pi = (prestamo * r) / (1 - Math.pow(1 + r, -EST_MESES));
  return Math.round((pi + (precioCents * EST_IMP_SEG_ANUAL) / 12) / 100) * 100;
}
/* «Para mudarte» y la cuota, de las columnas guardadas (una sola fuente). */
function montos(x: { kind: KindProp; rent: number | null; price: number | null; dep: number; fee: number; fees: { cents: number }[]; pct: number | null }) {
  const moveIn = x.rent != null && alMes(x.kind) ? x.rent + x.dep + x.fee + x.fees.reduce((s, f) => s + (Number(f.cents) || 0), 0) : null;
  const cuota = x.price != null && conCuota(x.kind) && x.pct ? cuotaEstimada(x.price, x.pct) : null;
  return { moveIn, cuota };
}
async function recalcularMontos(c: Q, item: string) {
  const x = (await c.query<{ kind: KindProp; rent: number | null; price: number | null; dep: number; fee: number; fees: { cents: number }[]; pct: number | null }>(
    `select kind, rent_cents as rent, price_cents as price, deposit_cents as dep, app_fee_cents as fee, fees, est_down_pct::float as pct from property_listings where item_id = $1`, [item])).rows[0];
  if (!x) return;
  const m = montos(x);
  await c.query(`update property_listings set move_in_cents = $2, est_payment_cents = $3, updated_at = now() where item_id = $1`, [item, m.moveIn, m.cuota]);
  await c.query(`update items set price_cents = coalesce($2, $3, price_cents), updated_at = now() where id = $1`, [item, x.rent, x.price]);
}

type FilaB = { subs: string[]; fv: string[]; ca: Record<string, any> | null; hay: boolean; ov: string | null; itin: boolean | null; s8: boolean | null; pets: boolean | null; down: number | null;
  pre: number | null; soft: boolean | null; com: boolean | null; libre: string | null; util: boolean | null; mueb: boolean | null; hoy: string; pro: boolean; nmls: string | null; gratis: number; fechas: string[] };
type FilaP = Omit<PropInm, "visitas" | "fees"> & { fees: { label: Bi; cents: number }[] | null; vp: VisitaPat[] | null };

export async function herramientaInm(negocio: string, c: Q = db()): Promise<HerrInm | null> {
  const b = (await c.query<FilaB>(
    `select coalesce((select array_agg(sc.name->>'es' order by array_position(b.subcategory_ids, sc.id)) from subcategorias_vivas sc where sc.id = any(b.subcategory_ids)), '{}') as subs,
            b.filter_values as fv, b.category_attrs as ca, s.business_id is not null as hay, s.kind_override as ov, s.itin, s.s8, s.pets, s.min_down_pct::float as down, s.prequal_days as pre,
            s.soft_pull as soft, s.buyer_no_commission as com, s.free_from::text as libre, s.util, s.furnished as mueb, ${HOY_SQL}::text as hoy,
            coalesce((select plan = 'pro' from business_stats_cache x where x.business_id = b.id), false) as pro,
            (select l.number from licenses l where l.business_id = b.id and l.kind = 'nmls_inm' and l.status = 'valid' order by l.verified_at desc nulls last limit 1) as nmls,
            (select count(*)::int from items i where i.business_id = b.id and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live' and not i.is_extra
               and coalesce(i.svc_kind, '') not in ('renta', 'venta') and i.price_cents = 0) as gratis,
            array[${HOY_SQL}::text, (date_trunc('month', ${HOY_SQL}) + interval '1 month')::date::text, (date_trunc('month', ${HOY_SQL}) + interval '1 month 14 days')::date::text,
                  (date_trunc('month', ${HOY_SQL}) + interval '2 months')::date::text] as fechas
       from businesses b join cities ci on ci.id = b.city_id left join inm_settings s on s.business_id = b.id where b.id = $1 and b.category_id = 'NEG-INMUEBLE'`, [negocio])).rows[0];
  if (!b) return null;
  const P = await c.query<FilaP>(
    `select i.id::text, pl.kind, i.svc_kind as deal, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, i.photos as fotos, pl.beds, pl.baths::float as baths, pl.sqft,
            pl.rent_cents as rent, pl.price_cents as price, pl.deposit_cents as dep, pl.app_fee_cents as "appFee", pl.fees, pl.move_in_cents as "moveIn", pl.est_payment_cents as cuota,
            pl.est_down_pct::float as "downPct", pl.available_on::text as disponible, pl.furnished, pl.pets, pl.s8, pl.ssn_required as "ssnReq", pl.utilities, pl.parking, pl.laundry,
            pl.papers, pl.lease, pl.senior_62 as senior, pl.senior_status as "seniorSt", pl.addr_line as addr, pl.zip, pl.geom is not null as ubicada, pl.addr_public as "addrPublic",
            pl.status, case when i.status = 'hidden' then coalesce(i.hidden_reason, '') end as adm, i.svc_attrs->'visit_pattern' as vp, coalesce((i.svc_attrs->>'cupo')::int, 1) as cupo,
            (select count(*)::int from class_groups g join cities ci on ci.id = g.city_id where g.item_id = i.id and g.purpose = 'visita' and g.status in ('open', 'started') and g.starts_on >= ${HOY_SQL}) as horas
       from property_listings pl join items i on i.id = pl.item_id where pl.business_id = $1 and i.removed_at is null order by i.sort, i.id`, [negocio]);
  const fv = b.fv ?? [], onb = (b.ca?.onb ?? {}) as { tool?: Record<string, unknown>; own?: { acc?: string[] } }, acc = onb.own?.acc ?? [];
  return {
    kind: kindInmDe(b.subs, b.ov), forzado: !!b.ov, subs: b.subs, pro: b.pro, hoy: b.hoy, fechas: b.fechas,
    props: P.rows.map((p) => ({ ...p, fees: p.fees ?? [], visitas: Array.isArray(p.vp) ? p.vp : [], vp: undefined } as unknown as PropInm)),
    // Sin fila todavía: lo que dice hoy la página o lo que se dijo en Publica tu negocio (como state() L190–191).
    itin: b.itin ?? (fv.includes("itin") || onb.tool?.itin === true), s8: b.s8 ?? (fv.includes("s8") || acc.includes("s8")), pets: b.pets ?? (fv.includes("mascotas") || onb.tool?.pets === true),
    minDown: b.down ?? 10, prequal: b.pre ?? 2, softPull: b.soft ?? false, sinCom: b.com ?? fv.includes("nocom"), libre: b.libre, util: b.util ?? fv.includes("utilidades"), mueble: b.mueb ?? fv.includes("amueblado"),
    nmls: b.nmls, gratis: b.gratis,
  };
}
export const inmPanel = herramientaInm;

/* ── Free: 5 propiedades a la vista (el servidor lo hace cumplir) ── */
async function topeFree(c: Q, negocio: string, excepto: string | null): Promise<R | null> {
  const x = (await c.query<{ pro: boolean; n: number }>(
    `select coalesce((select plan = 'pro' from business_stats_cache where business_id = $1), false) as pro,
            (select count(*)::int from property_listings pl join items i on i.id = pl.item_id where pl.business_id = $1 and i.removed_at is null and i.status = 'live'
               and pl.status in ('available', 'pending') and ($2::bigint is null or pl.item_id <> $2::bigint)) as n`, [negocio, excepto])).rows[0]!;
  if (!x.pro && x.n >= TOPE_PROP_FREE) return err(`Con Free se ven ${TOPE_PROP_FREE} propiedades. Marca una como rentada, vendida u oculta, o pasa a Pro.`, `On Free, ${TOPE_PROP_FREE} properties show. Mark one rented, sold or hidden, or go Pro.`);
  return null;
}

/* ── La propiedad: crear o guardar (todo revisado aquí) ── */
export type PropIn = {
  deal: Deal; kind: KindProp; name: Bi; desc: Bi; fotos: string[]; beds: number | null; baths: number | null; sqft: number | null;
  rent: number | null; price: number | null; dep: number; appFee: number; fee: { label: Bi; cents: number } | null; downPct: number | null;
  disponible: string | null; furnished: boolean; pets: boolean; s8: boolean; ssnReq: boolean; utilities: Util[]; parking: boolean; laundry: Laundry;
  papers: Bi; lease: Bi; mayores: boolean; addr: string; zip: string; lat?: number | null; lng?: number | null; soloZona: boolean; visitas: VisitaPat[]; cupo: number;
};
const limpiarVisitas = (v: unknown): VisitaPat[] | null => {
  const L = (Array.isArray(v) ? v : []).slice(0, 15).map((x) => ({ dow: entero((x as VisitaPat)?.dow), min: entero((x as VisitaPat)?.min), on: (x as VisitaPat)?.on !== false }));
  if (L.length > 14 || L.some((x) => !(x.dow >= 0 && x.dow <= 6) || !(x.min >= 360 && x.min <= 1320 && x.min % 15 === 0))) return null;
  if (new Set(L.map((x) => `${x.dow}:${x.min}`)).size !== L.length) return null;
  return L.sort((a, b) => a.dow - b.dow || a.min - b.min);
};

export async function guardarPropiedad(c: PoolClient, negocio: string, itemId: string, p0: PropIn, actor: string): Promise<R> {
  const b = (await c.query<{ city: string; hoy: string }>(`select b.city_id as city, ${HOY_SQL}::text as hoy from businesses b join cities ci on ci.id = b.city_id where b.id = $1 and b.category_id = 'NEG-INMUEBLE' for update of b`, [negocio])).rows[0];
  if (!b) return err("Esto es para Bienes Raíces.", "This is for real estate.");
  const p = (p0 ?? {}) as PropIn, nueva = itemId === "new";
  if (!nueva && !ID.test(String(itemId))) return err("Esa propiedad no existe.", "That property does not exist.");
  const antes = nueva ? null : (await c.query<{ deal: Deal; kind: KindProp; status: EstadoProp; senior: string }>(
    `select i.svc_kind as deal, pl.kind, pl.status, pl.senior_status as senior from property_listings pl join items i on i.id = pl.item_id where pl.item_id = $1::bigint and pl.business_id = $2 and i.removed_at is null for update of pl`, [itemId, negocio])).rows[0];
  if (!nueva && !antes) return err("Esa propiedad ya no está.", "That property is gone.");
  const deal = String(p.deal) as Deal, kind = String(p.kind) as KindProp;
  if (deal !== "renta" && deal !== "venta") return err("Elige si se renta o se vende.", "Pick rent or sale.");
  if (antes && antes.deal !== deal) return err("Una propiedad no cambia de renta a venta: agrega otra.", "A property does not switch between rent and sale: add another one.");
  if (!KINDS_PROP.includes(kind) || !PROP[kind][deal]) return err("Elige qué es.", "Pick what it is.");
  const name = bi(p.name, 60), desc = bi(p.desc, 300), papers = bi(p.papers, 200), lease = bi(p.lease, 80);
  if (name.es.length < 3) return err("Escribe el nombre, por ejemplo «2 recámaras · Alter St».", "Type the name, e.g. “2 bedrooms · Alter St”.");
  const fotos = (Array.isArray(p.fotos) ? p.fotos : []).filter((u) => typeof u === "string" && FOTO.test(u)).slice(0, 8);
  const beds = p.beds == null ? null : entero(p.beds), baths = p.baths == null ? null : Number(p.baths), sqft = p.sqft == null || p.sqft === 0 ? null : entero(p.sqft);
  if (beds != null && !(beds >= 0 && beds <= 12)) return err("Las recámaras van de 0 a 12.", "Bedrooms go from 0 to 12.");
  if (baths != null && !(baths >= 0 && baths <= 12 && Number.isInteger(baths * 2))) return err("Los baños van de medio en medio, hasta 12.", "Baths go in halves, up to 12.");
  if (sqft != null && !(sqft >= 20 && sqft <= 2000000)) return err("Revisa los pies cuadrados.", "Check the square feet.");
  // Dinero: en dólares enteros; el depósito no pasa de 2 meses de renta (§6 #5).
  let rent: number | null = null, price: number | null = null, dep = 0, appFee = 0, pct: number | null = null;
  const fees: { label: Bi; cents: number }[] = [];
  if (deal === "renta") {
    rent = entero(p.rent); dep = entero(p.dep ?? 0); appFee = entero(p.appFee ?? 0);
    if (!(rent >= 500 && rent <= 10000000 && rent % 100 === 0)) return err("Pon la renta en dólares.", "Set the rent in dollars.");
    if (!PROP[kind].per) {
      if (!(dep >= 0 && dep % 100 === 0)) return err("Pon el depósito en dólares (0 si no hay).", "Set the deposit in dollars (0 if none).");
      if (dep > 2 * rent) return err("El depósito no puede pasar de 2 meses de renta.", "The deposit cannot be more than 2 months of rent.");
      if (!(appFee >= 0 && appFee <= 10000 && appFee % 100 === 0)) return err("La cuota de solicitud va de $0 a $100.", "The application fee goes from $0 to $100.");
      if (p.fee && (txt(p.fee.label?.es, 40) || entero(p.fee.cents))) {
        const l = bi(p.fee.label, 40), fc = entero(p.fee.cents);
        if (l.es.length < 2) return err("Escribe qué es el otro pago, por ejemplo «Último mes».", "Name the other payment, e.g. “Last month”.");
        if (!(fc >= 100 && fc <= rent && fc % 100 === 0)) return err("El otro pago va en dólares y no pasa de un mes de renta.", "The other payment is in dollars and no more than one month of rent.");
        fees.push({ label: { es: l.es, en: l.en || l.es }, cents: fc });
      }
    } else { dep = 0; appFee = 0; }
  } else {
    price = entero(p.price);
    if (!(price >= 100000 && price <= 2000000000 && price % 100 === 0)) return err("Pon el precio en dólares.", "Set the price in dollars.");
    if (conCuota(kind)) { pct = Number(p.downPct ?? 10); if (!(ENGANCHES as readonly number[]).includes(pct)) return err("Elige el enganche para la cuota estimada.", "Pick the down payment for the estimated payment."); }
  }
  const disponible = p.disponible == null || p.disponible === "" ? null : String(p.disponible);
  if (disponible && (!FECHA.test(disponible) || Number.isNaN(Date.parse(disponible)))) return err("Revisa la fecha desde cuándo.", "Check the available date.");
  const utilities = [...new Set((Array.isArray(p.utilities) ? p.utilities : []).map(String))].filter((u): u is Util => UTIL.some((x) => x[0] === u));
  const laundry = (["no", "edificio", "unidad"] as const).includes(p.laundry) ? p.laundry : "no";
  if ([papers.es, papers.en, desc.es, desc.en].some((t) => NUMEROS.test(t))) return err("No escribas números de seguro social, ITIN ni de cuentas: solo qué papeles piden.", "Do not type Social Security, ITIN or account numbers: only which papers are needed.");
  if (kind === "mayores" && p.mayores !== true) return err("Para «mayores de 62» confirma que es vivienda para mayores bajo la excepción de la ley.", "For “62 and over”, confirm it is senior housing under the legal exemption.");
  // La dirección: la calle y el número y el código postal; el servidor la ubica con los tramos de calle del Censo (dir_ubicar, sin terceros).
  const addr = txt(p.addr, 120), zip = txt(p.zip, 5);
  if (addr.length < 4 || !/\d/.test(addr)) return err("Escribe la calle y el número.", "Type the street and number.");
  if (!/^\d{5}$/.test(zip)) return err("El código postal tiene 5 números.", "ZIP has 5 digits.");
  const zona = soloZona(kind) || p.soloZona === true;
  // Si la dirección no sale (cuartos y «solo la zona»), tampoco puede ir en el nombre ni en la descripción.
  const sinDir = (t: string) => !` ${t.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `.includes(` ${addr.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `);
  if (zona && ![name.es, name.en, desc.es, desc.en].every(sinDir)) return err("Con «solo la zona», la dirección no va en el nombre ni en la descripción: llega al confirmar la visita.", "With “zone only”, the address cannot be in the name or description: it arrives when the visit is confirmed.");
  const visitas = limpiarVisitas(p.visitas), cupo = entero(p.cupo ?? 1);
  if (!visitas) return err("Revisa las horas de visita (de 6 AM a 10 PM, sin repetir).", "Check the viewing times (6 AM to 10 PM, no repeats).");
  if (!(cupo >= 1 && cupo <= 10)) return err("Cada hora de visita es para 1 a 10 personas.", "Each viewing time is for 1 to 10 people.");
  const estado: EstadoProp = antes?.status ?? "available";
  if (deal === "renta" && VIVIENDA(kind) && visible(estado) && !visitas.some((v) => v.on)) return err("Deja al menos una hora de visita.", "Keep at least one viewing time.");
  // Vivienda justa: si una frase salta, no se guarda nada y la frase queda en la auditoría (§3).
  const fr = await revisarTexto([name.es, desc.es, papers.es, lease.es, ...fees.map((f) => f.label.es)], [name.en, desc.en, papers.en, lease.en, ...fees.map((f) => f.label.en)], c);
  if (fr) {
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after, reason) values ('user', $1, 'inm.vivienda_justa.frenada', 'business', $2, $3, $4::jsonb, $5)`,
      [actor, negocio, b.city, JSON.stringify({ propiedad: name.es, frase: fr.frase }), "Frase de la lista de vivienda justa"]);
    return err(`No puede ir «${fr.frase}»: la ley de vivienda justa no deja preferir ni excluir a nadie por quién vive. Quítalo y guarda otra vez.`,
      `“${fr.frase}” cannot be used: fair housing law does not allow preferring or excluding anyone by who lives there. Remove it and save again.`);
  }
  if (nueva) { const t = await topeFree(c, negocio, null); if (t) return t; }
  const lat = Number(p.lat), lng = Number(p.lng);
  const pin = Number.isFinite(lat) && Number.isFinite(lng) && lat > 39.5 && lat < 42.5 && lng > -80.6 && lng < -74.6 ? { lat, lng } : null;
  const u = pin ?? (await c.query<{ lat: number; lng: number }>(`select lat, lng from dir_ubicar($1, $2) limit 1`, [addr, zip])).rows[0] ?? null;
  const m = montos({ kind, rent, price, dep, fee: appFee, fees, pct });
  const attrs = { visit_pattern: visitas, cupo };
  let id = itemId;
  if (nueva) {
    id = (await c.query<{ id: string }>(
      `insert into items (business_id, module, name, descr, price_cents, duration_min, svc_kind, svc_attrs, photos, sell, sort)
       values ($1, 'svc', $2::jsonb, $3::jsonb, $4, 30, $5, $6::jsonb, $7, true, (select coalesce(max(sort), -1) + 1 from items where business_id = $1 and module = 'svc')) returning id::text`,
      [negocio, JSON.stringify({ es: name.es, en: name.en || name.es }), JSON.stringify({ es: desc.es, en: desc.en || desc.es }), rent ?? price, deal, JSON.stringify(attrs), fotos])).rows[0]!.id;
  } else {
    await c.query(`update items set name = $2::jsonb, descr = $3::jsonb, price_cents = $4, photos = $5, svc_attrs = svc_attrs || $6::jsonb, updated_at = now() where id = $1::bigint and business_id = $7`,
      [id, JSON.stringify({ es: name.es, en: name.en || name.es }), JSON.stringify({ es: desc.es, en: desc.en || desc.es }), rent ?? price, fotos, JSON.stringify(attrs), negocio]);
  }
  const senior = kind === "mayores", seniorSt = senior ? (antes?.senior === "ok" && antes.kind === "mayores" ? "ok" : "review") : "none";
  const V = [id, negocio, b.city, kind, beds, baths, sqft, rent, price, dep, appFee, JSON.stringify(fees), m.moveIn, m.cuota, pct, disponible, !!p.furnished, !!p.pets, !!p.s8, !!p.ssnReq, utilities, !!p.parking, laundry,
    papers.es ? JSON.stringify({ es: papers.es, en: papers.en || papers.es }) : null, lease.es ? JSON.stringify({ es: lease.es, en: lease.en || lease.es }) : null, senior, seniorSt, addr, zip, u?.lng ?? null, u?.lat ?? null, !zona];
  await c.query(
    `insert into property_listings (item_id, business_id, city_id, kind, beds, baths, sqft, rent_cents, price_cents, deposit_cents, app_fee_cents, fees, move_in_cents, est_payment_cents, est_down_pct,
        available_on, furnished, pets, s8, ssn_required, utilities, parking, laundry, papers, lease, senior_62, senior_status, addr_line, zip, geom, addr_public)
     values ($1::bigint, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15, $16::date, $17, $18, $19, $20, $21::text[], $22, $23, $24::jsonb, $25::jsonb, $26, $27, $28, $29,
        case when $30::float8 is null then null else st_setsrid(st_point($30::float8, $31::float8), 4326)::geography end, $32)
     on conflict (item_id) do update set kind = excluded.kind, beds = excluded.beds, baths = excluded.baths, sqft = excluded.sqft, rent_cents = excluded.rent_cents, price_cents = excluded.price_cents,
        deposit_cents = excluded.deposit_cents, app_fee_cents = excluded.app_fee_cents, fees = excluded.fees, move_in_cents = excluded.move_in_cents, est_payment_cents = excluded.est_payment_cents,
        est_down_pct = excluded.est_down_pct, available_on = excluded.available_on, furnished = excluded.furnished, pets = excluded.pets, s8 = excluded.s8, ssn_required = excluded.ssn_required,
        utilities = excluded.utilities, parking = excluded.parking, laundry = excluded.laundry, papers = excluded.papers, lease = excluded.lease, senior_62 = excluded.senior_62,
        senior_status = excluded.senior_status, addr_line = excluded.addr_line, zip = excluded.zip, geom = excluded.geom, addr_public = excluded.addr_public, updated_at = now()`, V);
  await horasVisita(c, negocio, id);
  return { ok: true, id };
}

/* ── Estado: Disponible · Apartada · Rentada · Vendida · Oculta ── */
export async function cambiarEstadoPropiedad(c: PoolClient, negocio: string, itemId: string, st0: string): Promise<R> {
  if (!ID.test(String(itemId))) return err("Esa propiedad no existe.", "That property does not exist.");
  const st = String(st0) as EstadoProp;
  if (!["available", "pending", "rented", "sold", "hidden"].includes(st)) return err("Elige el estado.", "Pick the status.");
  const x = (await c.query<{ deal: Deal; kind: KindProp; status: EstadoProp; vp: VisitaPat[] | null }>(
    `select i.svc_kind as deal, pl.kind, pl.status, i.svc_attrs->'visit_pattern' as vp from property_listings pl join items i on i.id = pl.item_id
      where pl.item_id = $1::bigint and pl.business_id = $2 and i.removed_at is null for update of pl`, [itemId, negocio])).rows[0];
  if (!x) return err("Esa propiedad ya no está.", "That property is gone.");
  if (x.status === st) return { ok: true };
  if (st === "rented" && x.deal !== "renta") return err("«Rentada» es de las propiedades en renta.", "“Rented” is for rentals.");
  if (st === "sold" && x.deal !== "venta") return err("«Vendida» es de las propiedades en venta.", "“Sold” is for properties for sale.");
  if (visible(st) && !visible(x.status)) {
    const t = await topeFree(c, negocio, itemId); if (t) return t;
    if (x.deal === "renta" && VIVIENDA(x.kind) && !(x.vp ?? []).some((v) => v.on !== false)) return err("Deja al menos una hora de visita.", "Keep at least one viewing time.");
  }
  await c.query(`update property_listings set status = $2, status_at = now(), updated_at = now() where item_id = $1::bigint`, [itemId, st]);
  await horasVisita(c, negocio, itemId);
  return { ok: true };
}

/* ── Horas de visita: el patrón semanal → grupos de un día (cupo 1 a 10), 14 días adelante. Lo que ya no va se cancela si nadie la
   pidió (las pedidas las maneja 4ie); una propiedad que no está a la vista no tiene horas. ── */
export async function horasVisita(c: Q, negocio: string, itemId?: string) {
  const L = (await c.query<{ id: string; city: string; vp: VisitaPat[] | null; cupo: number; vivo: boolean; hoy: string; ahora: number }>(
    `select i.id::text, pl.city_id as city, i.svc_attrs->'visit_pattern' as vp, coalesce((i.svc_attrs->>'cupo')::int, 1) as cupo,
            (pl.status in ('available', 'pending') and i.status = 'live' and i.removed_at is null) as vivo, ${HOY_SQL}::text as hoy,
            (extract(hour from now() at time zone ci.timezone) * 60 + extract(minute from now() at time zone ci.timezone))::int as ahora
       from property_listings pl join items i on i.id = pl.item_id join cities ci on ci.id = pl.city_id
      where pl.business_id = $1 and ($2::bigint is null or pl.item_id = $2::bigint)`, [negocio, itemId ?? null])).rows;
  for (const p of L) {
    const quiero = !p.vivo ? [] : (await c.query<{ dia: string; min: number }>(
      `with pat as (select (e->>'dow')::int as dow, (e->>'min')::int as min from jsonb_array_elements($1::jsonb) e where coalesce((e->>'on')::boolean, true))
       select d::date::text as dia, pat.min from generate_series($2::date, $2::date + 13, interval '1 day') d join pat on pat.dow = extract(dow from d)::int
        where d::date > $2::date or pat.min > $3 + 60 order by 1, 2`, [JSON.stringify(p.vp ?? []), p.hoy, p.ahora])).rows;
    const hay = (await c.query<{ id: string; dia: string; min: number; ocup: number }>(
      `select id::text, starts_on::text as dia, start_min as min, seats_booked + seats_outside as ocup from class_groups
        where item_id = $1::bigint and purpose = 'visita' and status in ('open', 'started') and starts_on >= $2::date`, [p.id, p.hoy])).rows;
    const k = (d: string, m: number) => `${d}|${m}`, Q = new Set(quiero.map((x) => k(x.dia, x.min))), H = new Set(hay.map((x) => k(x.dia, x.min)));
    const fuera = hay.filter((x) => !Q.has(k(x.dia, x.min)) && x.ocup === 0).map((x) => x.id);
    if (fuera.length) await c.query(`update class_groups set status = 'cancelled', cancel_reason = 'Ya no hay visita a esa hora', updated_at = now() where id = any($1::bigint[])`, [fuera]);
    for (const x of quiero.filter((z) => !H.has(k(z.dia, z.min))))
      await c.query(
        `insert into class_groups (business_id, city_id, item_id, label, starts_on, ends_on, dows, start_min, dur_min, seats_total, purpose)
         select $1, $2, $3::bigint, jsonb_build_object('es', 'Visita · ' || (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[extract(dow from $4::date)::int + 1], 'en', 'Viewing · ' || (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[extract(dow from $4::date)::int + 1]),
                $4::date, $4::date, '{}'::smallint[], $5, 30, $6, 'visita'
          where not exists (select 1 from class_groups where item_id = $3::bigint and purpose = 'visita' and status <> 'cancelled' and starts_on = $4::date and start_min = $5)`,
        [negocio, p.city, p.id, x.dia, x.min, p.cupo]);
    await c.query(`update class_groups set seats_total = $2, updated_at = now() where item_id = $1::bigint and purpose = 'visita' and status = 'open' and seats_total <> $2 and seats_booked + seats_outside <= $2`, [p.id, p.cupo]);
  }
}

/* ── Tu herramienta: un toque a la vez (dash2-cat.js L508–533). Los montos son los de la propiedad (una sola fuente). ── */
export type InmIn = {
  sinSsn?: boolean; itin?: boolean; pets?: boolean; minDown?: number; prequal?: number; soft?: boolean; sinCom?: boolean; libre?: string; util?: boolean; mueble?: boolean;
  estado?: { item: string; status: string }; renta?: { item: string; cents: number }; deposito?: { item: string; cents: number }; precio?: { item: string; cents: number };
  visita?: { item: string; i: number; on: boolean };
};
export async function guardarHerramientaInm(c: PoolClient, negocio: string, p: InmIn, actor: string): Promise<R> {
  const b = (await c.query<{ city: string }>(`select city_id as city from businesses where id = $1 and category_id = 'NEG-INMUEBLE' for update`, [negocio])).rows[0];
  if (!b) return err("Esto es para Bienes Raíces.", "This is for real estate.");
  const h = (await herramientaInm(negocio, c))!;
  if (sinPropiedades(h.kind)) return err("Lo tuyo va en Servicios: ahí pones cada servicio y su precio.", "Yours goes in Services: add each service and its price there.");
  // La primera vez se guarda lo que ya dice la página (para no apagar nada sin querer).
  await c.query(`insert into inm_settings (business_id, city_id, itin, s8, pets, min_down_pct, prequal_days, soft_pull, buyer_no_commission, util, furnished, updated_by)
                 values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) on conflict (business_id) do nothing`,
    [negocio, b.city, h.itin, h.s8, h.pets, h.minDown, h.prequal, h.softPull, h.sinCom, h.util, h.mueble, actor]);
  const set = (sql: string, v: unknown[]) => c.query(`update inm_settings set ${sql}, updated_by = $${v.length + 2}, updated_at = now() where business_id = $1`, [negocio, ...v, actor]);
  const prop = (id: unknown) => h.props.find((x) => x.id === String(id) && !x.adm);
  const rentas = `business_id = $1 and rent_cents is not null and kind not in ('local', 'oficina', 'bodega', 'cocina', 'salon', 'almacen', 'parqueo')`;
  const cuartos = `business_id = $1 and kind in ('cuarto', 'compartida')`;

  if (p.sinSsn !== undefined) { await set(`itin = $2`, [p.sinSsn === true]); await c.query(`update property_listings set ssn_required = $2, updated_at = now() where ${rentas}`, [negocio, p.sinSsn !== true]); return { ok: true }; }
  if (p.itin !== undefined) { await set(`itin = $2`, [p.itin === true]); return { ok: true }; }
  if (p.pets !== undefined) { await set(`pets = $2`, [p.pets === true]); await c.query(`update property_listings set pets = $2, updated_at = now() where ${rentas}`, [negocio, p.pets === true]); return { ok: true }; }
  if (p.minDown !== undefined) { if (h.kind !== "hipo" || !(ENGANCHE_MIN as readonly number[]).includes(Number(p.minDown))) return err("Elige el enganche mínimo.", "Pick the minimum down payment."); await set(`min_down_pct = $2`, [Number(p.minDown)]); return { ok: true }; }
  if (p.prequal !== undefined) { if (h.kind !== "hipo" || !(DIAS_PRECAL as readonly number[]).includes(Number(p.prequal))) return err("Elige los días.", "Pick the days."); await set(`prequal_days = $2`, [Number(p.prequal)]); return { ok: true }; }
  if (p.soft !== undefined) { if (h.kind !== "hipo") return err("Esto es para préstamos.", "This is for loans."); await set(`soft_pull = $2`, [p.soft === true]); return { ok: true }; }
  if (p.sinCom !== undefined) { await set(`buyer_no_commission = $2`, [p.sinCom === true]); return { ok: true }; }
  if (p.libre !== undefined) {
    if (!h.fechas.includes(String(p.libre))) return err("Elige la fecha.", "Pick the date.");
    await set(`free_from = $2::date`, [p.libre]); await c.query(`update property_listings set available_on = $2::date, updated_at = now() where ${cuartos} and status in ('available', 'pending')`, [negocio, p.libre]); return { ok: true };
  }
  if (p.util !== undefined) {
    await set(`util = $2`, [p.util === true]);
    await c.query(`update property_listings set utilities = case when $2 then array(select distinct unnest(utilities || array['luz', 'agua', 'internet'])) else array(select unnest(utilities) except select unnest(array['luz', 'agua', 'internet'])) end, updated_at = now() where ${cuartos}`, [negocio, p.util === true]);
    return { ok: true };
  }
  if (p.mueble !== undefined) { await set(`furnished = $2`, [p.mueble === true]); await c.query(`update property_listings set furnished = $2, updated_at = now() where ${cuartos}`, [negocio, p.mueble === true]); return { ok: true }; }
  if (p.estado !== undefined) { if (!prop(p.estado?.item)) return err("Esa propiedad ya no está.", "That property is gone."); return cambiarEstadoPropiedad(c, negocio, String(p.estado.item), String(p.estado.status)); }
  if (p.renta !== undefined || p.deposito !== undefined) {
    const x = prop((p.renta ?? p.deposito)!.item), v = entero((p.renta ?? p.deposito)!.cents);
    if (!x || x.rent == null) return err("Esa propiedad ya no está.", "That property is gone.");
    if (p.renta !== undefined) {
      if (!(v >= 500 && v <= 10000000 && v % 100 === 0)) return err("Pon la renta en dólares.", "Set the rent in dollars.");
      if (x.dep > 2 * v) return err("El depósito no puede pasar de 2 meses de renta. Baja primero el depósito.", "The deposit cannot be more than 2 months of rent. Lower the deposit first.");
      await c.query(`update property_listings set rent_cents = $2, updated_at = now() where item_id = $1::bigint`, [x.id, v]);
    } else {
      if (PROP[x.kind].per) return err("Esta propiedad no lleva depósito.", "This property has no deposit.");
      if (!(v >= 0 && v % 100 === 0)) return err("Pon el depósito en dólares.", "Set the deposit in dollars.");
      if (v > 2 * x.rent) return err(`El depósito no puede pasar de 2 meses de renta (${usd(2 * x.rent)}).`, `The deposit cannot be more than 2 months of rent (${usd(2 * x.rent)}).`);
      await c.query(`update property_listings set deposit_cents = $2, updated_at = now() where item_id = $1::bigint`, [x.id, v]);
    }
    await recalcularMontos(c, x.id); return { ok: true };
  }
  if (p.precio !== undefined) {
    const x = prop(p.precio?.item), v = entero(p.precio?.cents);
    if (!x || x.price == null) return err("Esa propiedad ya no está.", "That property is gone.");
    if (!(v >= 100000 && v <= 2000000000 && v % 100 === 0)) return err("Pon el precio en dólares.", "Set the price in dollars.");
    await c.query(`update property_listings set price_cents = $2, updated_at = now() where item_id = $1::bigint`, [x.id, v]);
    await recalcularMontos(c, x.id); return { ok: true };
  }
  if (p.visita !== undefined) {
    const x = prop(p.visita?.item), i = entero(p.visita?.i);
    if (!x || !(i >= 0 && i < x.visitas.length)) return err("Esa hora de visita ya no está.", "That viewing time is gone.");
    const L = x.visitas.map((v, j) => (j === i ? { ...v, on: p.visita!.on === true } : v));
    if (x.deal === "renta" && VIVIENDA(x.kind) && visible(x.status) && !L.some((v) => v.on !== false)) return err("Deja al menos una hora de visita.", "Keep at least one viewing time.");
    await c.query(`update items set svc_attrs = svc_attrs || jsonb_build_object('visit_pattern', $2::jsonb), updated_at = now() where id = $1::bigint`, [x.id, JSON.stringify(L)]);
    await horasVisita(c, negocio, x.id); return { ok: true };
  }
  return err("No hay nada que guardar.", "Nothing to save.");
}

/* ── Los filtros de Bienes Raíces que salen de los datos (nunca se editan a mano) y la tarjeta del buscador (apply L268–280). Lo que
   nadie deriva (esp, linea, y10, verified…) se conserva. ── */
const DER = ["rentar", "comprar", "cuarto", "sinssn", "itin", "s8", "mascotas", "utilidades", "amueblado", "primera", "gratis", "visita", "nocom"];
type Tj = Record<string, Bi>;
const esBi = (v: unknown): v is Bi => !!v && typeof v === "object" && typeof (v as Bi).es === "string";

export async function recalcularFiltrosInm(c: Q, negocio: string) {
  const b = (await c.query<{ fv: string[]; ca: Record<string, unknown> | null; hay: boolean; hoy: string; vis: number }>(
    `select b.filter_values as fv, b.category_attrs as ca, exists (select 1 from inm_settings s where s.business_id = b.id) as hay, ${HOY_SQL}::text as hoy,
            (select count(*)::int from class_groups g join items i on i.id = g.item_id join property_listings pl on pl.item_id = i.id
              where g.business_id = b.id and g.purpose = 'visita' and g.status in ('open', 'started') and g.starts_on >= ${HOY_SQL}
                and g.seats_total - g.seats_booked - g.seats_outside > 0 and i.status = 'live' and i.removed_at is null and pl.status in ('available', 'pending')) as vis
       from businesses b join cities ci on ci.id = b.city_id where b.id = $1 and b.category_id = 'NEG-INMUEBLE'`, [negocio])).rows[0];
  if (!b || !b.hay) return;
  const h = (await herramientaInm(negocio, c))!, F = new Set<string>(), ca = b.ca ?? {}, tj0 = (ca.tarjeta && typeof ca.tarjeta === "object" ? ca.tarjeta : {}) as Record<string, unknown>;
  const V = h.props.filter((p) => visible(p.status) && !p.adm), R = V.filter((p) => p.deal === "renta"), Rv = R.filter((p) => VIVIENDA(p.kind)), S = V.filter((p) => p.deal === "venta");
  const Cu = R.filter((p) => soloZona(p.kind)), tj: Tj = {};
  if (R.length) F.add("rentar");
  if (S.length || h.kind === "venta" || h.kind === "hipo") F.add("comprar");
  if (Cu.length) F.add("cuarto");
  // Los papeles que ACEPTAN (nunca a quién): de las propiedades; sin propiedades, lo que dice la herramienta.
  const sinSsn = Rv.length ? Rv.some((p) => !p.ssnReq) : h.kind === "rent" || h.kind === "cuarto" ? h.itin : false;
  if (sinSsn) F.add("sinssn");
  if (sinSsn || h.itin) F.add("itin");
  if (Rv.length ? Rv.some((p) => p.s8) : h.s8) F.add("s8");
  if (Rv.length ? Rv.some((p) => p.pets) : h.pets) F.add("mascotas");
  if (Rv.some((p) => p.utilities.length)) F.add("utilidades");
  if (V.some((p) => p.furnished)) F.add("amueblado");
  if (h.subs.some((s) => s === "Programas para primer comprador" || s === "Ayuda con el enganche")) F.add("primera");
  if (h.kind === "derechos") F.add("gratis");
  if (b.vis > 0) F.add("visita");
  if (h.sinCom && (h.kind === "venta" || S.length)) F.add("nocom");
  const n = (x: number, uno: string, varios: string) => `${x} ${x === 1 ? uno : varios}`;
  if (h.kind === "hipo") {
    tj.eta = { es: `Precalificación en ${n(h.prequal, "día", "días")}`, en: `Pre-qualification in ${n(h.prequal, "day", "days")}` };
    const pc = `${String(h.minDown).replace(/\.0$/, "")} %`;
    tj.fee = { es: `Precalificación gratis · enganche desde ${pc}${h.itin ? " con ITIN" : ""}`, en: `Free pre-qualification · ${pc.replace(" %", "%")} down${h.itin ? " with ITIN" : ""}` };
  } else if (h.kind === "venta") {
    tj.eta = { es: n(S.length, "casa en venta", "casas en venta"), en: n(S.length, "home for sale", "homes for sale") };
    if (S.length) { const d = usd(Math.min(...S.map((p) => p.price ?? 0))); tj.fee = { es: `Desde ${d}${h.sinCom ? " · comprador sin comisión" : ""}`, en: `From ${d}${h.sinCom ? " · no buyer commission" : ""}` }; }
  } else if (h.kind === "cuarto") {
    const f = h.libre ? h.libre : null, fl = (es: boolean) => (f ? (f <= h.hoy ? (es ? " desde hoy" : " from today") : ` ${es ? "desde el" : "from"} ${new Intl.DateTimeFormat(es ? "es-US" : "en-US", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(f + "T00:00:00Z")).replace(".", "")}`) : "");
    tj.eta = Cu.length ? { es: `${n(Cu.length, "cuarto libre", "cuartos libres")}${fl(true)}`, en: `${n(Cu.length, "room free", "rooms free")}${fl(false)}` } : { es: "Sin cuartos libres", en: "No rooms free" };
    if (Cu.length) { const d = usd(Math.min(...Cu.map((p) => p.rent ?? 0))); tj.fee = { es: `${d} al mes${h.util ? " con luz, agua e internet" : ""}`, en: `${d} a month${h.util ? " with power, water and internet" : ""}` }; }
  } else if (h.kind === "rent" || h.kind === "comercial" || h.kind === "alm") {
    tj.eta = h.kind === "rent" ? { es: n(R.length, "propiedad disponible", "propiedades disponibles"), en: n(R.length, "property available", "properties available") }
      : { es: n(V.length, "espacio disponible", "espacios disponibles"), en: n(V.length, "space available", "spaces available") };
    const mv = R.filter((p) => p.moveIn != null);
    if (mv.length) tj.fee = mv.every((p) => !p.appFee && !p.fees.length) ? { es: "Para mudarte: primer mes + depósito, sin cargos extra", en: "To move in: first month + deposit, no extra fees" }
      : { es: `Para mudarte desde ${usd(Math.min(...mv.map((p) => p.moveIn!)))}`, en: `Move in from ${usd(Math.min(...mv.map((p) => p.moveIn!)))}` };
  }
  const fv = [...(b.fv ?? []).filter((x) => !DER.includes(x)), ...F];
  // Lo que se derivó la última vez y hoy ya no aplica se quita (inm_der); lo que puso el prototipo y nadie deriva se conserva.
  const antes = Array.isArray(ca.inm_der) ? (ca.inm_der as string[]) : [], nuevo: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(tj0)) if (esBi(v) && !antes.includes(k)) nuevo[k] = v;
  Object.assign(nuevo, tj);
  await c.query(`update businesses set filter_values = $2, category_attrs = coalesce(category_attrs, '{}'::jsonb) || $3::jsonb, updated_at = now() where id = $1`,
    [negocio, fv, JSON.stringify({ tarjeta: nuevo, inm_der: Object.keys(tj) })]);
  await c.query(`update inm_settings set derived_on = $2::date where business_id = $1`, [negocio, b.hoy]);
}

/* El barrido (cada minuto): una vez al día por negocio rehace las horas de visita 14 días adelante, la tarjeta y los filtros; las horas
   que ya pasaron se cierran. */
export async function barrerInm(): Promise<number> {
  await db().query(`update class_groups g set status = 'finished', updated_at = now() from cities c where c.id = g.city_id and g.purpose = 'visita' and g.status in ('open', 'started')
                      and g.starts_on < (now() at time zone c.timezone)::date`);
  const L = (await db().query<{ id: string }>(
    `select s.business_id as id from inm_settings s join businesses b on b.id = s.business_id join cities ci on ci.id = b.city_id
      where b.status = 'active' and s.derived_on is distinct from ${HOY_SQL} order by s.derived_on nulls first limit 200`)).rows;
  for (const x of L) { await horasVisita(db(), x.id); await recalcularFiltrosInm(db(), x.id); }
  return L.length;
}
