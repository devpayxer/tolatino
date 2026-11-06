import "server-only";
import { db, tx } from "./db";
import type { Attrs, Bi } from "./oficios";

/* La ficha de un taller (Auto) o un servicio del hogar (Hogar) para el cliente (Fase 4 · 4b). Diseño: neg-auto-book.js
   (TLAutoBook: svcs, sheetVals, compat, depOf, Mi vehículo) y neg-hogar-book.js (TLHogarBook: Mi casa, zona, inquilino).
   El servidor decide si se puede pedir, con qué vehículo o casa, y el depósito; el cliente solo muestra. */
export type Rubro = "auto" | "hogar";
export type OficioPub = { id: string; sec: string | null; name: Bi; desc: Bi; k: string; cents: number; dur: number | null; a: Attrs; opts: { t: Bi; o: { n: Bi; p: number; m: number }[] }[]; foto: string | null };
export type Vehiculo = { id: string; year: number; make: string; model: string; mileage: number | null; size: string; tire: string | null; def: boolean };
export type Casa = { id: string; dir: string; label: string | null; kind: string; tenure: string; beds: number | null; baths: number | null; sqft: number | null; year: string | null; pets: string | null;
  heat: string | null; heatAge: string | null; wh: string | null; whAge: string | null; access: string | null; def: boolean; millas: number | null; enZona: boolean };
export type PolPub = { auto: boolean; resp: number; dep: number; cxh: number; exp: number; kinds: string[]; bigOver: number | null; big: number | null; min: number | null };
export type OficiosPublico = {
  rubro: Rubro; negocio: { id: string; nombre: string; direccion: string | null; telefono: string | null; foto: string | null };
  secciones: { id: string; name: Bi }[]; servicios: OficioPub[]; pol: PolPub; can: boolean; off: "pausa" | "tope" | "apagado" | null;
  tool: { rate: number; warrM: number | null; warrMi: number | null; cut: number | null; h24: boolean; eta: number; zone: number | null };
  compat: { veh: string[] | null; mk: string[] | null; tenure: string[] | null };
  vehiculos: Vehiculo[]; casas: Casa[]; dirs: { id: string; t: string }[]; hoy: string;
};
const TOPE_FREE = 10;

export async function oficiosPublico(negocio: string, userId: string | null): Promise<OficiosPublico | null> {
  const b = (await db().query<{ id: string; name: string; cat: string; address: string | null; phone: string | null; foto: string | null; mods: string[]; off: Record<string, unknown> | null; attrs: Record<string, unknown>;
    fv: string[]; plan: string; hoy: string; mes: string; zone: number | null }>(
    `select b.id, b.name, b.category_id as cat, b.address, b.phone, b.logo_url as foto, b.modules_on as mods, b.modules_off as off, b.category_attrs as attrs, b.filter_values as fv,
            coalesce(st.plan, 'free') as plan, (now() at time zone ci.timezone)::date::text as hoy, to_char(now() at time zone ci.timezone, 'YYYY-MM') as mes, b.service_radius_mi as zone
       from businesses b join cities ci on ci.id = b.city_id left join business_stats_cache st on st.business_id = b.id
      where b.id = $1 and b.status = 'active' and b.category_id in ('NEG-AUTO', 'NEG-HOGAR')`, [negocio])).rows[0];
  if (!b) return null;
  const rubro: Rubro = b.cat === "NEG-AUTO" ? "auto" : "hogar", mods = b.mods ?? [], off = b.off ?? {};
  if (!mods.includes("svc") || off.svc) return null;
  const [S, I, T, P, U] = await Promise.all([
    db().query<{ id: string; name: Bi }>(`select id::text, name from item_sections where business_id = $1 and module = 'svc' and removed_at is null order by sort, id`, [negocio]),
    db().query<OficioPub>(
      `select i.id::text, i.section_id::text as sec, i.name, coalesce(i.descr, '{"es":"","en":""}'::jsonb) as desc, coalesce(i.svc_kind, 'fijo') as k, i.price_cents as cents, i.duration_min as dur,
              i.svc_attrs as a, i.svc_opts as opts, i.photos[1] as foto
         from items i where i.business_id = $1 and i.module = 'svc' and i.removed_at is null and i.sell and i.status = 'live' and not i.is_extra order by i.sort, i.id`, [negocio]),
    db().query<OficiosPublico["tool"]>(`select labor_rate_cents as rate, warranty_months as "warrM", warranty_miles as "warrMi", same_day_cutoff_h as cut, h24, emergency_eta_min as eta, null::int as zone from trade_settings where business_id = $1`, [negocio]),
    db().query<PolPub>(`select auto_approve as auto, response_min as resp, deposit_cents as dep, cancel_free_h as cxh, expires_h as exp, deposit_kinds as kinds, deposit_big_over_cents as "bigOver", deposit_big_cents as big, deposit_min_price_cents as min from booking_policies where business_id = $1`, [negocio]),
    db().query<{ usados: number; cap: number }>(`select (select count(*)::int from operations where business_id = $1 and kind <> 'table' and free_quota_month = $2) as usados,
       coalesce((select (value #>> '{}')::int from platform_config where key = 'free_ops_cap'), $3) as cap`, [negocio, b.mes, TOPE_FREE]),
  ]);
  if (!I.rows.length) return null;
  const offC: OficiosPublico["off"] = !mods.includes("citas") ? "apagado" : off.citas ? "pausa" : b.plan !== "pro" && (U.rows[0]?.usados ?? 0) >= (U.rows[0]?.cap ?? TOPE_FREE) ? "tope" : null;
  const at = b.attrs ?? {}, fv = b.fv ?? [];
  // Con quién trabaja (Hogar): si el negocio marca solo dueños o landlords, el inquilino no puede pedir.
  const tenure = rubro === "hogar" && (fv.includes("dueno") || fv.includes("land") || fv.includes("inq")) ? ["inq", "dueno", "land"].filter((x) => fv.includes(x)) : null;
  return {
    rubro, negocio: { id: b.id, nombre: b.name, direccion: b.address, telefono: b.phone, foto: b.foto }, secciones: S.rows, servicios: I.rows.map((s) => ({ ...s, opts: Array.isArray(s.opts) ? s.opts : [] })),
    pol: P.rows[0] ?? { auto: false, resp: 30, dep: 0, cxh: 2, exp: 2, kinds: [], bigOver: null, big: null, min: null }, can: offC === null, off: offC,
    tool: { ...(T.rows[0] ?? { rate: 9500, warrM: null, warrMi: null, cut: null, h24: false, eta: 60 }), zone: b.zone },
    compat: { veh: Array.isArray(at.veh) ? (at.veh as string[]) : null, mk: Array.isArray(at.mk) ? (at.mk as string[]) : null, tenure },
    vehiculos: userId && rubro === "auto" ? await misVehiculos(userId) : [], casas: userId && rubro === "hogar" ? await misCasas(userId, negocio) : [],
    dirs: userId && rubro === "hogar" ? (await db().query<{ id: string; t: string }>(`select id::text, concat_ws(', ', street || coalesce(' ' || nullif(apt, ''), ''), zip) as t from user_addresses where user_id = $1 and removed_at is null order by is_default desc, created_at limit 20`, [userId])).rows : [], hoy: b.hoy,
  };
}

/* El depósito de un servicio (diseño depOf): solo si el negocio pide; por forma de cobrar (vacío = todas); un monto más alto
   desde el precio de «trabajo grande»; nunca en «sin cita», grúa, «desde» ni «se cotiza» más que el precio. */
export function depositoDe(pol: PolPub, s: Pick<OficioPub, "k" | "a">, precio: number) {
  if (!pol.dep || s.a?.walk || s.k === "grua" || s.k === "emer" || s.k === "plan") return 0;
  if (pol.kinds?.length && !pol.kinds.includes(s.k)) return 0;
  if (pol.min && precio < pol.min) return 0;
  const amt = pol.big && pol.bigOver && precio >= pol.bigOver ? pol.big : pol.dep;
  return precio > 0 && !["desde", "cotiza", "pres"].includes(s.k) ? Math.min(amt, precio) : amt;
}

/* ── Mi vehículo ── */
export async function misVehiculos(userId: string): Promise<Vehiculo[]> {
  return (await db().query<Vehiculo>(`select id::text, year, make, model, mileage, size, tire_size as tire, is_default as def from user_vehicles where user_id = $1 and removed_at is null order by is_default desc, created_at desc limit 10`, [userId])).rows;
}
export const MARCAS: [string, string][] = [["acura", "Acura"], ["alfa", "Alfa Romeo"], ["audi", "Audi"], ["bmw", "BMW"], ["buick", "Buick"], ["cadillac", "Cadillac"], ["chevy", "Chevrolet"], ["chrysler", "Chrysler"], ["dodge", "Dodge"], ["fiat", "Fiat"],
  ["ford", "Ford"], ["freightliner", "Freightliner"], ["genesis", "Genesis"], ["gmc", "GMC"], ["hino", "Hino"], ["honda", "Honda"], ["hyundai", "Hyundai"], ["infiniti", "Infiniti"], ["international", "International"], ["isuzu", "Isuzu"], ["jaguar", "Jaguar"], ["jeep", "Jeep"],
  ["kenworth", "Kenworth"], ["kia", "Kia"], ["landrover", "Land Rover"], ["lexus", "Lexus"], ["lincoln", "Lincoln"], ["mack", "Mack"], ["mazda", "Mazda"], ["mercedes", "Mercedes-Benz"], ["mini", "Mini"], ["mitsubishi", "Mitsubishi"], ["nissan", "Nissan"],
  ["peterbilt", "Peterbilt"], ["porsche", "Porsche"], ["ram", "Ram"], ["subaru", "Subaru"], ["tesla", "Tesla"], ["toyota", "Toyota"], ["vw", "Volkswagen"], ["volvo", "Volvo"], ["otra", "Otra marca"]];
export type VehiculoIn = { year: number; make: string; model: string; mileage?: number | null; size: string; tire?: string | null };
type Res = { ok: true; id: string } | { ok: false; msg: Bi };
export async function guardarVehiculo(userId: string, p: VehiculoIn): Promise<Res> {
  const year = Math.round(Number(p?.year)), make = String(p?.make ?? ""), model = String(p?.model ?? "").replace(/\s+/g, " ").trim().slice(0, 40), size = String(p?.size ?? "");
  if (!(year >= 1950 && year <= new Date().getFullYear() + 1)) return { ok: false, msg: { es: "Elige el año.", en: "Pick the year." } };
  if (!MARCAS.some((m) => m[0] === make)) return { ok: false, msg: { es: "Elige la marca.", en: "Pick the make." } };
  if (model.length < 1) return { ok: false, msg: { es: "Escribe el modelo.", en: "Type the model." } };
  if (!["c", "s", "v", "m", "d"].includes(size)) return { ok: false, msg: { es: "Elige el tipo de vehículo.", en: "Pick the vehicle type." } };
  const mi = p?.mileage == null || p.mileage === ("" as never) ? null : Math.round(Number(p.mileage));
  if (mi != null && !(mi >= 0 && mi <= 2_000_000)) return { ok: false, msg: { es: "Revisa el millaje.", en: "Check the mileage." } };
  const tire = p?.tire && /^[0-9]{3}\/[0-9]{2}R[0-9]{2}$/.test(String(p.tire)) ? String(p.tire) : null;
  return tx(async (c) => {
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from user_vehicles where user_id = $1 and removed_at is null`, [userId])).rows[0]!.n;
    if (n >= 10) return { ok: false as const, msg: { es: "Tienes 10 vehículos. Quita uno para agregar otro.", en: "You have 10 vehicles. Remove one to add another." } };
    await c.query(`update user_vehicles set is_default = false, updated_at = now() where user_id = $1 and is_default`, [userId]);
    const r = await c.query<{ id: string }>(`insert into user_vehicles (user_id, year, make, model, mileage, veh_type, size, tire_size, is_default) values ($1, $2, $3, $4, $5, $6, $7, $8, true) returning id::text`,
      [userId, year, make, model, mi, size === "v" ? "s" : size, size, tire]);
    return { ok: true as const, id: r.rows[0]!.id };
  });
}
export async function elegirVehiculo(userId: string, id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return false;
  return tx(async (c) => {
    const ok = (await c.query(`select 1 from user_vehicles where id = $1 and user_id = $2 and removed_at is null`, [id, userId])).rowCount;
    if (!ok) return false;
    await c.query(`update user_vehicles set is_default = (id = $2), updated_at = now() where user_id = $1 and removed_at is null`, [userId, id]);
    return true;
  });
}

/* ── Mi casa (sobre una de Mis direcciones; la zona del negocio se mide en el servidor) ── */
export async function misCasas(userId: string, negocio: string | null): Promise<Casa[]> {
  return (await db().query<Casa>(
    `select h.id::text, concat_ws(', ', a.street || coalesce(' ' || nullif(a.apt, ''), ''), a.zip) as dir, a.label, h.kind, h.tenure, h.beds, h.baths::float as baths, h.sqft, h.year_band as year, h.pets, h.heat, h.heat_age as "heatAge",
            h.water_heater as wh, h.wh_age as "whAge", h.access_note as access, h.is_default as def,
            case when b.geo is not null and a.geo is not null then round((ST_Distance(a.geo, b.geo) / 1609.344)::numeric, 1)::float end as millas,
            coalesce(b.id is null or a.geo is null or b.geo is null or ST_DWithin(a.geo, b.geo, coalesce(b.service_radius_mi, 20) * 1609.344), true) as "enZona"
       from user_homes h join user_addresses a on a.id = h.address_id left join businesses b on b.id = $2
      where h.user_id = $1 and h.removed_at is null and a.removed_at is null order by h.is_default desc, h.created_at desc limit 10`, [userId, negocio])).rows;
}
export type CasaIn = { address: string; kind: string; tenure: string; beds?: number | null; baths?: number | null; sqft?: number | null; year?: string | null; pets?: string | null; heat?: string | null; heatAge?: string | null; wh?: string | null; whAge?: string | null; access?: string | null };
export async function guardarCasa(userId: string, p: CasaIn): Promise<Res> {
  const en = <T extends string>(v: unknown, L: readonly T[]) => (L.includes(String(v) as T) ? (String(v) as T) : null);
  const kind = en(p?.kind, ["casa", "apto", "duplex", "movil"] as const), tenure = en(p?.tenure, ["dueno", "inq", "land"] as const);
  if (!/^[0-9a-f-]{36}$/.test(String(p?.address ?? ""))) return { ok: false, msg: { es: "Elige la dirección.", en: "Pick the address." } };
  if (!kind) return { ok: false, msg: { es: "Elige el tipo de casa.", en: "Pick the home type." } };
  if (!tenure) return { ok: false, msg: { es: "Di si eres dueño o inquilino.", en: "Say whether you own or rent." } };
  const beds = p?.beds == null ? null : Math.max(0, Math.min(5, Math.round(Number(p.beds)))), baths = p?.baths == null ? null : [1, 1.5, 2, 3].includes(Number(p.baths)) ? Number(p.baths) : null;
  const sqft = p?.sqft ? Math.max(100, Math.min(20000, Math.round(Number(p.sqft)))) : null, access = String(p?.access ?? "").replace(/\s+/g, " ").trim().slice(0, 120) || null;
  const AGE = ["5", "10", "20", "mas", "ns"] as const;
  return tx(async (c) => {
    if (!(await c.query(`select 1 from user_addresses where id = $1 and user_id = $2 and removed_at is null`, [p.address, userId])).rowCount) return { ok: false as const, msg: { es: "Esa dirección ya no está.", en: "That address is gone." } };
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from user_homes where user_id = $1 and removed_at is null`, [userId])).rows[0]!.n;
    if (n >= 10) return { ok: false as const, msg: { es: "Tienes 10 casas. Quita una para agregar otra.", en: "You have 10 homes. Remove one to add another." } };
    // Una casa por dirección: si ya existe, se actualiza.
    const ya = (await c.query<{ id: string }>(`select id::text from user_homes where user_id = $1 and address_id = $2 and removed_at is null`, [userId, p.address])).rows[0]?.id;
    await c.query(`update user_homes set is_default = false, updated_at = now() where user_id = $1 and is_default`, [userId]);
    const vals = [userId, p.address, kind, tenure, beds, baths, sqft, en(p?.year, ["pre50", "50", "80", "00"] as const), en(p?.pets, ["no", "perro", "gato", "otra"] as const),
      en(p?.heat, ["caldera", "horno", "bomba", "zocalo"] as const), en(p?.heatAge, AGE), en(p?.wh, ["gas", "elec", "sintanque", "aceite"] as const), en(p?.whAge, AGE), access];
    const id = ya ? (await c.query<{ id: string }>(`update user_homes set kind = $3, tenure = $4, beds = $5, baths = $6, sqft = $7, year_band = $8, pets = $9, heat = $10, heat_age = $11, water_heater = $12, wh_age = $13, access_note = $14, is_default = true, updated_at = now()
                                                     where id = $15 returning id::text`, [...vals, ya])).rows[0]!.id
      : (await c.query<{ id: string }>(`insert into user_homes (user_id, address_id, kind, tenure, beds, baths, sqft, year_band, pets, heat, heat_age, water_heater, wh_age, access_note, is_default)
                                        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true) returning id::text`, vals)).rows[0]!.id;
    return { ok: true as const, id };
  });
}
export async function elegirCasa(userId: string, id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return false;
  return tx(async (c) => {
    if (!(await c.query(`select 1 from user_homes where id = $1 and user_id = $2 and removed_at is null`, [id, userId])).rowCount) return false;
    await c.query(`update user_homes set is_default = (id = $2), updated_at = now() where user_id = $1 and removed_at is null`, [userId, id]);
    return true;
  });
}
