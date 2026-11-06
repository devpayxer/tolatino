import "server-only";
import { db, tx } from "./db";

/* Direcciones de entrega (Mi cuenta › Direcciones; modelo de datos · Address). El servidor ubica cada dirección con los
   tramos de calle del Censo (dir_ubicar, migración 0025): sin servicios de terceros. Nada se borra: removed_at. */
export type Direccion = {
  id: string; label: "casa" | "trabajo" | "otra"; street: string; apt: string | null; zip: string; instructions: string | null;
  isDefault: boolean; ciudad: { id: string; nombre: string } | null; ubicada: "numero" | "calle" | null; lat: number | null; lng: number | null;
};
type Fila = { id: string; label: Direccion["label"]; street: string; apt: string | null; zip: string; instructions: string | null; is_default: boolean;
  city_id: string | null; city: string | null; geo_quality: Direccion["ubicada"]; lat: number | null; lng: number | null };
const COLS = `a.id::text, a.label, a.street, a.apt, a.zip, a.instructions, a.is_default, a.city_id, c.name || ', ' || c.state as city, a.geo_quality,
  st_y(a.geo::geometry) as lat, st_x(a.geo::geometry) as lng`;
const fila = (x: Fila): Direccion => ({ id: x.id, label: x.label, street: x.street, apt: x.apt, zip: x.zip, instructions: x.instructions, isDefault: x.is_default,
  ciudad: x.city_id ? { id: x.city_id, nombre: x.city ?? "" } : null, ubicada: x.geo_quality, lat: x.lat, lng: x.lng });

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
export type DireccionIn = { label?: string; street?: string; apt?: string; zip?: string; instructions?: string; isDefault?: boolean };
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
    // Dónde queda: la calle y el número en ese código postal (o al menos la calle). Si no se encuentra, se guarda igual:
    // sirve para recoger, pero no para delivery hasta que se corrija.
    const u = (await c.query<{ lat: number; lng: number; calidad: "numero" | "calle" }>(`select lat, lng, calidad from dir_ubicar($1, $2)`, [street, zip])).rows[0] ?? null;
    const city = (await c.query<{ id: string }>(`select id from cities where $1 = any(zips) limit 1`, [zip])).rows[0]?.id ?? null;
    const primera = !(await c.query(`select 1 from user_addresses where user_id = $1 and removed_at is null and ($2::uuid is null or id <> $2::uuid) limit 1`, [userId, id])).rowCount;
    const def = !!d?.isDefault || primera;
    if (def) await c.query(`update user_addresses set is_default = false, updated_at = now() where user_id = $1 and is_default and removed_at is null`, [userId]);
    const geo = `case when $8::float8 is null then null else st_setsrid(st_point($8::float8, $9::float8), 4326)::geography end`;
    const vals = [label, street, apt || null, zip, ins || null, city, def, u?.lng ?? null, u?.lat ?? null, u?.calidad ?? null];
    let rid: string;
    if (id) {
      const r = await c.query<{ id: string }>(
        `update user_addresses set label = $1, street = $2, apt = $3, zip = $4, instructions = $5, city_id = $6, is_default = $7, geo = ${geo}, geo_quality = $10, updated_at = now()
          where id = $11 and user_id = $12 and removed_at is null returning id::text`, [...vals, id, userId]);
      if (!r.rows[0]) return { ok: false, msg: { es: "Esa dirección no existe.", en: "That address does not exist." } };
      rid = r.rows[0].id;
    } else {
      rid = (await c.query<{ id: string }>(
        `insert into user_addresses (label, street, apt, zip, instructions, city_id, is_default, geo, geo_quality, user_id)
         values ($1, $2, $3, $4, $5, $6, $7, ${geo}, $10, $11) returning id::text`, [...vals, userId])).rows[0]!.id;
    }
    return { ok: true, id: rid, fuera: !city, ubicada: u?.calidad ?? null };
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
