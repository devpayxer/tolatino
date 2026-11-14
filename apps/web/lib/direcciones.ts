import "server-only";
import type { PoolClient } from "pg";
import { db, tx } from "./db";

/* Direcciones de entrega (Mi cuenta › Direcciones; modelo de datos · Address). El servidor ubica cada dirección con los
   tramos de calle del Censo (dir_ubicar, migración 0025): sin servicios de terceros. Nada se borra: removed_at. */
export type Calidad = "punto" | "numero" | "calle" | "puerta";
export type Direccion = {
  id: string; label: "casa" | "trabajo" | "otra"; street: string; apt: string | null; zip: string; instructions: string | null;
  isDefault: boolean; ciudad: { id: string; nombre: string } | null; ubicada: Calidad | null; lat: number | null; lng: number | null;
  lugar: string | null; estado: string | null; pin: boolean;
};
type Fila = { id: string; label: Direccion["label"]; street: string; apt: string | null; zip: string; instructions: string | null; is_default: boolean;
  city_id: string | null; city: string | null; geo_quality: Direccion["ubicada"]; lat: number | null; lng: number | null; place: string | null; state: string | null; pin: boolean };
const COLS = `a.id::text, a.label, a.street, a.apt, a.zip, a.instructions, a.is_default, a.city_id, c.name || ', ' || c.state as city, a.geo_quality,
  st_y(a.geo::geometry) as lat, st_x(a.geo::geometry) as lng, a.place, a.state, a.pin_at is not null as pin`;
const fila = (x: Fila): Direccion => ({ id: x.id, label: x.label, street: x.street, apt: x.apt, zip: x.zip, instructions: x.instructions, isDefault: x.is_default,
  ciudad: x.city_id ? { id: x.city_id, nombre: x.city ?? "" } : null, ubicada: x.geo_quality, lat: x.lat, lng: x.lng, lugar: x.place, estado: x.state, pin: x.pin });

/* ── 9m · Direcciones como DoorDash/Uber para todo EE. UU. (decisión AC), sin terceros ──
   Autocompletar mientras se escribe (dir_sugerir: prefijo por índice, el estado de quien busca primero y lo más cerca primero), «Usar mi ubicación»
   (dir_inversa: el GPS → la dirección más cercana, GIST) y el pin ajustable («la puerta está aquí»), todo de nuestra base (geo_points, geo_streets,
   geo_names: infra/direcciones/generar.sh). Presupuesto ≤ 100 ms (guardián autocompletarRapido); la consulta lleva su tope de tiempo para que una
   búsqueda rara nunca tape a las demás. El punto que se guarda lo decide el servidor: el pin de la persona solo vale cerca de lo que el servidor ubicó. */
export type Sugerencia = { linea: string; sub: string; calle: string; numero: string | null; zip: string; lugar: string | null; estado: string; lat: number; lng: number; calidad: "punto" | "numero" | "calle" };
export const TOPE_MS = 250; // la consulta se corta aquí (el presupuesto es 100 ms: esto solo protege a las demás)
export const PIN_MAX_M = 250; // el pin ajustado puede moverse hasta aquí de lo que el servidor ubicó

export async function sugerir(q: string, centro: { lat: number; lng: number; estado: string | null }, n = 6): Promise<Sugerencia[]> {
  const t = String(q ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (t.replace(/[^a-z0-9]/gi, "").length < 3) return [];
  return tx(async (c) => {
    await c.query(`set local statement_timeout = ${TOPE_MS}`);
    const r = await c.query<Sugerencia>(
      `select linea, sub, calle, numero, zip, lugar, estado, lat, lng, calidad from dir_sugerir($1, $2::float8, $3::float8, $4, $5::int)`,
      [t, centro.lat, centro.lng, centro.estado, Math.max(1, Math.min(8, n))]);
    return r.rows;
  }).catch(() => []);
}

export type Inversa = { calle: string; numero: string | null; zip: string | null; lugar: string | null; estado: string | null; lat: number; lng: number; calidad: "punto" | "numero" | "calle"; metros: number };
export async function inversa(lat: number, lng: number): Promise<Inversa | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return tx(async (c) => {
    await c.query(`set local statement_timeout = ${TOPE_MS}`);
    const r = await c.query<Inversa>(`select calle, numero, zip, lugar, estado, plat as lat, plng as lng, calidad, metros from dir_inversa($1::float8, $2::float8)`, [lat, lng]);
    return r.rows[0] ?? null;
  }).catch(() => null);
}

/* El punto que se guarda: lo que el servidor ubicó (la casa, el tramo o la calle) y, si la persona movió el pin, el pin, siempre que no se aleje más
   de PIN_MAX_M de eso (sin ubicación del servidor, el pin vale cerca del centro de su código postal). Lo usan Mis direcciones, Publica tu negocio y
   el panel (la dirección del negocio). */
type Q = { query: PoolClient["query"] };
export type Punto9m = { error: false; lat: number | null; lng: number | null; calidad: Calidad | null; movido: boolean; lugar: string | null; estado: string | null } | { error: true };
export async function puntoFinal(c: Q, street: string, zip: string, pin: { lat: number; lng: number } | null): Promise<Punto9m> {
  const u = (await c.query<{ lat: number; lng: number; calidad: Exclude<Calidad, "puerta">; lugar: string | null; estado: string | null }>(
    `select lat, lng, calidad, lugar, estado from dir_resolver($1, $2)`, [street, zip])).rows[0];
  const z = (await c.query<{ place: string | null; state: string | null; lat: number; lng: number }>(
    `select place, state, st_y(geom) as lat, st_x(geom) as lng from geo_zips where zip = $1`, [zip])).rows[0];
  let lat = u?.lat ?? null, lng = u?.lng ?? null, calidad: Calidad | null = u?.calidad ?? null, movido = false;
  if (pin && Number.isFinite(pin.lat) && Number.isFinite(pin.lng)) {
    const ref = u ?? z;
    const d = ref ? Number((await c.query<{ d: number }>(`select st_distance(st_point($1::float8, $2::float8)::geography, st_point($3::float8, $4::float8)::geography) as d`,
      [pin.lng, pin.lat, ref.lng, ref.lat])).rows[0]?.d ?? 1e9) : 1e9;
    if (d > (u ? PIN_MAX_M : 3000)) return { error: true };
    lat = pin.lat; lng = pin.lng; calidad = "puerta"; movido = true;
  }
  return { error: false, lat, lng, calidad, movido, lugar: u?.lugar ?? z?.place ?? null, estado: u?.estado ?? z?.state ?? null };
}

export async function misDirecciones(userId: string): Promise<Direccion[]> {
  const r = await db().query<Fila>(
    `select ${COLS} from user_addresses a left join cities c on c.id = a.city_id where a.user_id = $1 and a.removed_at is null order by a.is_default desc, a.created_at limit 20`, [userId]);
  return r.rows.map(fila);
}
export async function direccionDe(userId: string, id: string): Promise<Direccion | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const r = await db().query<Fila>(`select ${COLS} from user_addresses a left join cities c on c.id = a.city_id where a.id = $1 and a.user_id = $2 and a.removed_at is null`, [id, userId]);
  return r.rows[0] ? fila(r.rows[0]) : null;
}

/* La zona de entrega que se ve en Mi cuenta: los códigos postales de la ciudad que la persona está viendo (de ahí son
   los negocios a los que pide), y de qué ciudad es cada código postal nuestro. */
export async function zonaDe(userId: string) {
  const r = await db().query<{ name: string; zips: string[] }>(
    `select c.name, c.zips from users u join cities c on c.id = coalesce(u.viewing_city_id, u.home_city_id, 'hzl') where u.id = $1`, [userId]);
  const z = await db().query<{ zip: string; name: string }>(`select unnest(zips) as zip, name from cities`);
  return r.rows[0] ? { ...r.rows[0], ciudadDe: Object.fromEntries(z.rows.map((x) => [x.zip, x.name])) as Record<string, string> } : null;
}

type Bi = { es: string; en: string };
export type DireccionIn = { label?: string; street?: string; apt?: string; zip?: string; instructions?: string; isDefault?: boolean; pin?: { lat: number; lng: number } | null };
export type ResDir = { ok: true; id: string; fuera: boolean; ubicada: Direccion["ubicada"] } | { ok: false; msg: Bi; campo?: "street" | "zip" };
const limpio = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const LIMITE = 20;

export async function guardarDireccion(userId: string, id: string | null, d: DireccionIn): Promise<ResDir> {
  const label = ["casa", "trabajo", "otra"].includes(String(d?.label)) ? String(d.label) : "casa";
  const street = limpio(d?.street, 120), apt = limpio(d?.apt, 20), zip = limpio(d?.zip, 5), ins = limpio(d?.instructions, 160);
  if (street.length < 4 || !/\d/.test(street)) return { ok: false, campo: "street", msg: { es: "Escribe la calle y el número.", en: "Enter street and number." } };
  if (!/^\d{5}$/.test(zip)) return { ok: false, campo: "zip", msg: { es: "El código postal tiene 5 números.", en: "ZIP has 5 digits." } };
  if (id && !/^[0-9a-f-]{36}$/.test(id)) return { ok: false, msg: { es: "Esa dirección no existe.", en: "That address does not exist." } };
  return tx(async (c) => {
    await c.query(`select pg_advisory_xact_lock(hashtext('dir:' || $1))`, [userId]);
    if (!id) {
      const n = (await c.query<{ n: number }>(`select count(*)::int as n from user_addresses where user_id = $1 and removed_at is null`, [userId])).rows[0]!.n;
      if (n >= LIMITE) return { ok: false, msg: { es: `Puedes guardar hasta ${LIMITE} direcciones. Borra una que no uses.`, en: `You can save up to ${LIMITE} addresses. Delete one you don't use.` } };
    }
    // Dónde queda: la casa, el tramo con ese número o al menos la calle en ese código postal; con el pin de la persona si no se aleja de eso (9m).
    // Si no se encuentra, se guarda igual: sirve para recoger, pero no para delivery hasta que se corrija.
    const pin = d?.pin && typeof d.pin === "object" ? { lat: Number(d.pin.lat), lng: Number(d.pin.lng) } : null;
    const u = await puntoFinal(c, street, zip, pin);
    if (u.error) return { ok: false, msg: { es: `El pin quedó muy lejos de esa dirección. Ponlo en la puerta (hasta ${PIN_MAX_M} m de la dirección).`, en: `The pin is too far from that address. Put it at the door (within ${PIN_MAX_M} m of the address).` } };
    const city = (await c.query<{ id: string }>(`select id from cities where $1 = any(zips) limit 1`, [zip])).rows[0]?.id ?? null;
    const primera = !(await c.query(`select 1 from user_addresses where user_id = $1 and removed_at is null and ($2::uuid is null or id <> $2::uuid) limit 1`, [userId, id])).rowCount;
    const def = !!d?.isDefault || primera;
    if (def) await c.query(`update user_addresses set is_default = false, updated_at = now() where user_id = $1 and is_default and removed_at is null`, [userId]);
    const geo = `case when $8::float8 is null then null else st_setsrid(st_point($8::float8, $9::float8), 4326)::geography end`;
    const vals = [label, street, apt || null, zip, ins || null, city, def, u.lng, u.lat, u.calidad, u.lugar, u.estado, u.movido];
    let rid: string;
    if (id) {
      const r = await c.query<{ id: string }>(
        `update user_addresses set label = $1, street = $2, apt = $3, zip = $4, instructions = $5, city_id = $6, is_default = $7, geo = ${geo}, geo_quality = $10,
                place = $11, state = $12, pin_at = case when $13::boolean then now() end, updated_at = now()
          where id = $14 and user_id = $15 and removed_at is null returning id::text`, [...vals, id, userId]);
      if (!r.rows[0]) return { ok: false, msg: { es: "Esa dirección no existe.", en: "That address does not exist." } };
      rid = r.rows[0].id;
    } else {
      rid = (await c.query<{ id: string }>(
        `insert into user_addresses (label, street, apt, zip, instructions, city_id, is_default, geo, geo_quality, place, state, pin_at, user_id)
         values ($1, $2, $3, $4, $5, $6, $7, ${geo}, $10, $11, $12, case when $13::boolean then now() end, $14) returning id::text`, [...vals, userId])).rows[0]!.id;
    }
    return { ok: true, id: rid, fuera: !city, ubicada: u.calidad };
  });
}

export async function predeterminada(userId: string, id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return false;
  return tx(async (c) => {
    const ok = (await c.query(`select 1 from user_addresses where id = $1 and user_id = $2 and removed_at is null for update`, [id, userId])).rowCount;
    if (!ok) return false;
    await c.query(`update user_addresses set is_default = false, updated_at = now() where user_id = $1 and is_default and removed_at is null`, [userId]);
    await c.query(`update user_addresses set is_default = true, updated_at = now() where id = $1`, [id]);
    return true;
  });
}

export async function borrarDireccion(userId: string, id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return false;
  return tx(async (c) => {
    const r = await c.query(`update user_addresses set removed_at = now(), is_default = false, updated_at = now() where id = $1 and user_id = $2 and removed_at is null`, [id, userId]);
    if (!r.rowCount) return false;
    // Si era la predeterminada, la siguiente más antigua pasa a serlo.
    await c.query(`update user_addresses set is_default = true where id = (select id from user_addresses where user_id = $1 and removed_at is null order by created_at limit 1)
                     and not exists (select 1 from user_addresses where user_id = $1 and removed_at is null and is_default)`, [userId]);
    return true;
  });
}

/* El número de vecino («N.º 1,241 en Hazleton»): su lugar por fecha de entrada entre los de su ciudad. Derivado. */
export async function numeroVecino(userId: string) {
  const r = await db().query<{ n: number; ciudad: string | null; founder: boolean }>(
    `select (select count(*)::int from users v where v.home_city_id is not distinct from u.home_city_id and v.created_at <= u.created_at and v.status <> 'deleted') as n,
            c.name as ciudad, u.founder from users u left join cities c on c.id = u.home_city_id where u.id = $1`, [userId]);
  return r.rows[0] ?? null;
}
