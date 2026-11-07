import "server-only";
import type { Pool, PoolClient } from "pg";
import { db } from "./db";
import type { HerrTrans, KindTrans, SalidaHoy } from "./transporte-comun";

/* Transporte (Fase 4 · bloque 4w). Plan: docs/diseno/plan/fase4-fiestas-transporte.md §2 y §4w. Diseño: neg-trans.js,
   neg-trans-listing.js, neg-trans-kind.js (kind por subcategoría), dash2-cat.js TOOLS['NEG-TRANS'].
   - El tipo del negocio sale de sus subcategorías (el Super Admin lo puede forzar). Decide el título y los bloques de Tu herramienta.
   - Las salidas de cada día (trip_runs) se crean al vuelo para los servicios por asiento. «Quedan» = asientos − vendidos en la
     oficina − reservados en la app: se deriva, nunca se escribe a mano.
   - Los filtros de Buscar (viaje, envío, precio cerrado, disponible hoy, equipaje, cruza estados, asiento de niño, rampa) salen de
     aquí y de los servicios; «Disponible hoy» vence a medianoche de la ciudad. */
type Q = Pool | PoolClient;
const KS: [string, KindTrans][] = [["Camioneta de larga distancia", "van"], ["Viajes entre estados", "van"], ["Shuttle entre ciudades", "van"], ["Traslado al aeropuerto", "air"], ["Chofer privado", "air"],
  ["Envíos a Latinoamérica", "caja"], ["Camión de mudanza con chofer", "mud"], ["Traslados médicos y de adultos mayores", "med"], ["Transporte escolar", "escolar"], ["Transporte de empleados", "emp"],
  ["Transporte de trabajadores", "emp"], ["Viajes locales", "taxi"], ["Conductor designado", "taxi"], ["Grúas", "grua"], ["Renta de autos", "renta"], ["Renta de camionetas", "renta"], ["Renta de remolques", "renta"],
  ["Camión de caja y hotshot", "cdl"], ["Tráiler y transporte CDL", "cdl"], ["Traslado de maquinaria", "cdl"], ["Traslado de vehículos", "cdl"], ["Traslado de botes y casas rodantes", "cdl"],
  ["Carga y flete", "mud"], ["Repartidor y mensajería", "courier"], ["Mensajería el mismo día", "courier"], ["Entrega de compras", "courier"], ["Repartidor de comida", "courier"], ["Reparto en moto", "courier"], ["Mensajería en bicicleta", "courier"]];

export async function kindTrans(negocio: string, c: Q = db()): Promise<{ kind: KindTrans; forzado: boolean } | null> {
  const r = (await c.query<{ cat: string; ov: KindTrans | null; subs: string[] }>(
    `select b.category_id as cat, s.kind_override as ov,
            coalesce((select array_agg(sc.name->>'es' order by array_position(b.subcategory_ids, sc.id)) from subcategorias_vivas sc where sc.id = any(b.subcategory_ids)), '{}') as subs
       from businesses b left join trans_settings s on s.business_id = b.id where b.id = $1`, [negocio])).rows[0];
  if (!r || r.cat !== "NEG-TRANS") return null;
  if (r.ov) return { kind: r.ov, forzado: true };
  for (const n of r.subs) { const m = KS.find((x) => x[0] === n); if (m) return { kind: m[1], forzado: false }; }
  return { kind: "taxi", forzado: false };
}

/* Las salidas de un día de los servicios por asiento (se crean si faltan; nunca se borran). */
export async function salidasDe(negocio: string, dia: string | null = null, c: Q = db()): Promise<SalidaHoy[]> {
  const b = (await c.query<{ city: string; tz: string; hoy: string }>(
    `select b.city_id as city, ci.timezone as tz, (now() at time zone ci.timezone)::date::text as hoy from businesses b join cities ci on ci.id = b.city_id where b.id = $1`, [negocio])).rows[0];
  if (!b) return [];
  const d = dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : b.hoy;
  await c.query(
    `insert into trip_runs (business_id, city_id, item_id, run_at, seats_total)
     select i.business_id, $2, i.id, ($3::date + make_interval(hours => h)) at time zone $4, least(56, greatest(1, coalesce((i.svc_attrs->>'pax')::int, 14)))
       from items i cross join lateral jsonb_array_elements_text(coalesce(i.svc_attrs->'sal', '[]'::jsonb)) as s(hs) cross join lateral (select hs::int as h) z
      where i.business_id = $1 and i.module = 'svc' and i.svc_kind = 'asiento' and i.removed_at is null and i.sell and i.status = 'live'
     on conflict (item_id, run_at) do nothing`, [negocio, b.city, d, b.tz]);
  return (await c.query<SalidaHoy>(
    `select r.id::text as run, r.item_id::text as item, i.name as svc, (extract(hour from r.run_at at time zone $3) * 60 + extract(minute from r.run_at at time zone $3))::int as m,
            r.seats_total as total, r.seats_outside as fuera, r.seats_booked as reservados, greatest(0, r.seats_total - r.seats_outside - r.seats_booked) as quedan, r.status = 'cancelled' as cancelada, r.run_at > now() as futura
       from trip_runs r join items i on i.id = r.item_id
      where r.business_id = $1 and (r.run_at at time zone $3)::date = $2::date and i.removed_at is null and i.svc_kind = 'asiento'
        and coalesce(i.svc_attrs->'sal', '[]'::jsonb) @> to_jsonb(extract(hour from r.run_at at time zone $3)::int)
      order by r.run_at, i.sort, i.id`, [negocio, d, b.tz])).rows;
}

export async function herramientaTrans(negocio: string, c: Q = db()): Promise<HerrTrans | null> {
  const k = await kindTrans(negocio, c);
  if (!k) return null;
  const s = (await c.query<{ bags: number; extra: number | null; hoy: boolean; nino: boolean; rampa: boolean; ship_day: HerrTrans["shipDay"]; ship_weeks: HerrTrans["shipWeeks"] }>(
    `select s.bags_included as bags, s.extra_bag_cents as extra, coalesce(s.available_today_on = (now() at time zone ci.timezone)::date, false) as hoy, s.child_seat as nino, s.ramp as rampa,
            s.ship_day, s.ship_weeks
       from trans_settings s join businesses b on b.id = s.business_id join cities ci on ci.id = b.city_id where s.business_id = $1`, [negocio])).rows[0];
  const asiento = (await c.query(`select 1 from items where business_id = $1 and module = 'svc' and svc_kind = 'asiento' and removed_at is null and sell and status = 'live' limit 1`, [negocio])).rowCount! > 0;
  const fecha = (await c.query<{ d: string }>(`select (now() at time zone ci.timezone)::date::text as d from businesses b join cities ci on ci.id = b.city_id where b.id = $1`, [negocio])).rows[0]!.d;
  let salidas = asiento ? (await salidasDe(negocio, null, c)).filter((x) => x.futura) : [], cuando: HerrTrans["cuando"] = "hoy";
  if (asiento && !salidas.length) { const man = (await c.query<{ d: string }>(`select ($1::date + 1)::text as d`, [fecha])).rows[0]!.d; salidas = await salidasDe(negocio, man, c); cuando = "manana"; }
  return { kind: k.kind, forzado: k.forzado, bags: s?.bags ?? 2, extraBag: s?.extra ?? null, hoy: !!s?.hoy, nino: !!s?.nino, rampa: !!s?.rampa, shipDay: s?.ship_day ?? null, shipWeeks: s?.ship_weeks ?? null,
    salidas, tieneAsiento: asiento, fecha, cuando };
}

/* Guardar Tu herramienta (valida aquí; el panel solo manda lo que tocó). */
export type TransIn = { bags?: number; extraBag?: number | null; hoy?: boolean; nino?: boolean; rampa?: boolean; shipDay?: string | null; shipWeeks?: string | null };
export async function guardarTrans(c: PoolClient, negocio: string, p: TransIn, actor: string): Promise<{ ok: true } | { ok: false; es: string; en: string }> {
  const set: string[] = [], v: unknown[] = [negocio, actor];
  const add = (col: string, val: unknown) => { v.push(val); set.push(`${col} = $${v.length}`); };
  if (p.bags !== undefined) { const n = Math.round(Number(p.bags)); if (!(n >= 0 && n <= 3)) return { ok: false, es: "Maletas: de 0 a 3.", en: "Bags: 0 to 3." }; add("bags_included", n); }
  if (p.extraBag !== undefined) { const n = p.extraBag == null ? null : Math.round(Number(p.extraBag)); if (n != null && !(n >= 0 && n <= 20000 && n % 100 === 0)) return { ok: false, es: "La maleta extra va en dólares enteros, hasta $200.", en: "Extra bag in whole dollars, up to $200." }; add("extra_bag_cents", n); }
  if (p.hoy !== undefined) { v.push(!!p.hoy); set.push(`available_today_on = case when $${v.length}::boolean then (select (now() at time zone ci.timezone)::date from businesses b join cities ci on ci.id = b.city_id where b.id = $1) end`); }
  if (p.nino !== undefined) add("child_seat", !!p.nino);
  if (p.rampa !== undefined) add("ramp", !!p.rampa);
  if (p.shipDay !== undefined) { if (p.shipDay != null && !["sab", "mie", "15d"].includes(p.shipDay)) return { ok: false, es: "Ese día no existe.", en: "That day does not exist." }; add("ship_day", p.shipDay); }
  if (p.shipWeeks !== undefined) { if (p.shipWeeks != null && !["2-3", "3-4", "4-6"].includes(p.shipWeeks)) return { ok: false, es: "Elige cuánto tarda.", en: "Pick how long it takes." }; add("ship_weeks", p.shipWeeks); }
  if (!set.length) return { ok: true };
  await c.query(`insert into trans_settings (business_id, updated_by) values ($1, $2) on conflict (business_id) do nothing`, [negocio, actor]);
  await c.query(`update trans_settings set ${set.join(", ")}, updated_by = $2, updated_at = now() where business_id = $1`, v);
  return { ok: true };
}

/* Vendidos en la oficina (hueco #6 del diseño: «quedan» no se edita; se edita lo vendido fuera de la app). */
export async function venderFuera(c: PoolClient, negocio: string, run: string, delta: number): Promise<{ ok: true } | { ok: false; es: string; en: string }> {
  if (!/^\d{1,18}$/.test(run) || ![1, -1].includes(delta)) return { ok: false, es: "Esa salida no existe.", en: "That departure does not exist." };
  const r = await c.query(`update trip_runs set seats_outside = seats_outside + $3, updated_at = now() where id = $1::bigint and business_id = $2 and status = 'scheduled'
                             and seats_outside + $3 >= 0 and seats_outside + $3 + seats_booked <= seats_total`, [run, negocio, delta]);
  return r.rowCount ? { ok: true } : delta > 0 ? { ok: false, es: "Ya no quedan asientos en esa salida.", en: "No seats left on that departure." } : { ok: false, es: "No hay vendidos en la oficina que quitar.", en: "No office sales to remove." };
}
/* «No sale hoy» / «Sale hoy». Con pasajeros de la app no se apaga aquí: se cancela la salida con su devolución (4y). */
export async function salidaHoy(c: PoolClient, negocio: string, run: string, sale: boolean): Promise<{ ok: true } | { ok: false; es: string; en: string }> {
  if (!/^\d{1,18}$/.test(run)) return { ok: false, es: "Esa salida no existe.", en: "That departure does not exist." };
  const x = (await c.query<{ booked: number; st: string; futura: boolean }>(`select seats_booked as booked, status as st, run_at > now() as futura from trip_runs where id = $1::bigint and business_id = $2 for update`, [run, negocio])).rows[0];
  if (!x) return { ok: false, es: "Esa salida no existe.", en: "That departure does not exist." };
  if (!x.futura) return { ok: false, es: "Esa salida ya pasó.", en: "That departure already left." };
  if (!sale && x.booked > 0) return { ok: false, es: `Tiene ${x.booked} pasajeros de la app: cancélala desde la salida para avisarles y devolverles.`, en: `It has ${x.booked} app passengers: cancel it from the departure to notify and refund them.` };
  await c.query(`update trip_runs set status = $3, cancel_reason = case when $3 = 'cancelled' then 'No sale hoy' end, updated_at = now() where id = $1::bigint and business_id = $2`, [run, negocio, sale ? "scheduled" : "cancelled"]);
  return { ok: true };
}

/* Los filtros de Transporte que salen de los datos (nunca se editan a mano). Los demás (24h, semana, esp, y10…) salen del
   horario, la subcategoría o el catálogo y se conservan. */
const DER = ["viaje", "envio", "cerrado", "hoy", "equipaje", "estados", "nino", "silla"];
export async function recalcularFiltrosTrans(c: Q, negocio: string) {
  const b = (await c.query<{ cat: string; fv: string[]; pro: boolean }>(
    `select b.category_id as cat, b.filter_values as fv, coalesce(st.plan, 'free') = 'pro' as pro from businesses b left join business_stats_cache st on st.business_id = b.id where b.id = $1`, [negocio])).rows[0];
  if (!b || b.cat !== "NEG-TRANS") return;
  const h = await herramientaTrans(negocio, c);
  const S = (await c.query<{ k: string; to: string; name: string }>(
    `select svc_kind as k, coalesce(svc_attrs->'to'->>'es', '') as "to", name->>'es' as name from items where business_id = $1 and module = 'svc' and removed_at is null and sell and status = 'live'`, [negocio])).rows;
  const lic = (await c.query(`select 1 from licenses where business_id = $1 and kind = 'fmcsa_mc' and status = 'valid' limit 1`, [negocio])).rowCount! > 0;
  const F = new Set<string>();
  if (S.some((x) => ["asiento", "priv", "cotiza"].includes(x.k))) F.add("viaje");
  if (S.some((x) => x.k === "caja")) F.add("envio");
  if (b.pro && S.length) F.add("cerrado");
  if (h?.hoy) F.add("hoy");
  if (h && h.bags > 0 && S.some((x) => x.k === "asiento")) F.add("equipaje");
  if (lic || S.some((x) => /\b(NY|NJ|New York|Nueva York|New Jersey|Washington Heights|Paterson|Passaic|JFK|Newark|EWR)\b/i.test(`${x.to} ${x.name}`))) F.add("estados");
  if (h?.nino) F.add("nino");
  if (h?.rampa) F.add("silla");
  const fv = [...(b.fv ?? []).filter((x) => !DER.includes(x)), ...F];
  await c.query(`update businesses set filter_values = $2, updated_at = now() where id = $1 and filter_values is distinct from $2`, [negocio, fv]);
}
/* «Disponible hoy» vence a medianoche: al mirar la categoría se recalculan los de la ciudad (una vez por ciudad y día). */
export async function refrescarTransCiudad(city: string) {
  const L = (await db().query<{ id: string }>(`select id from businesses where city_id = $1 and category_id = 'NEG-TRANS' and status = 'active' limit 300`, [city])).rows;
  for (const x of L) await recalcularFiltrosTrans(db(), x.id);
}
