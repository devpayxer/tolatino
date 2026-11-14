"use server";
/* 9m · Panel › Tu página › Dirección y mapa (decisión AC): la dirección del negocio con las sugerencias de nuestra base y el pin ajustable en la puerta.
   El servidor decide el punto (la casa, el tramo o la calle de ese código postal; el pin solo cerca de eso, lib/direcciones.ts puntoFinal), guarda la
   dirección y el punto, y lo anota en la auditoría. Lo que el Super Admin corrigió (geo_fixed_*) queda en el historial; gana lo más reciente. */
import { mismoOrigen } from "@/lib/cuenta";
import { db, tx } from "@/lib/db";
import { PIN_MAX_M, puntoFinal } from "@/lib/direcciones";
import { accesoPanel } from "@/lib/panel";

type Bi = { es: string; en: string };
export type DirNegocio = { calle: string; zip: string; lat: number | null; lng: number | null; casa: boolean; fijadoPorEquipo: string | null; centro: [number, number] };
export type ResDirNeg = { ok: true } | { ok: false; mensaje: Bi };
const no = (es: string, en: string): ResDirNeg => ({ ok: false, mensaje: { es, en } });

export async function direccionLeer(negocio: string): Promise<DirNegocio | null> {
  const acc = await accesoPanel(negocio, "page");
  if (!acc) return null;
  const r = (await db().query<{ address: string | null; lat: number | null; lng: number | null; casa: boolean; fijado: string | null; clat: number; clng: number }>(
    `select b.address, st_y(b.geo::geometry) as lat, st_x(b.geo::geometry) as lng, b.works_from_home as casa,
            to_char(b.geo_fixed_at at time zone c.timezone, 'MM/DD/YYYY') as fijado, st_y(c.center::geometry) as clat, st_x(c.center::geometry) as clng
       from businesses b join cities c on c.id = b.city_id where b.id = $1`, [negocio])).rows[0];
  if (!r) return null;
  // La dirección se guarda como «calle, código postal» o solo la calle (las de antes): se separa el código postal si lo trae al final.
  const m = /^(.*?)(?:,\s*|\s+)(\d{5})$/.exec(r.address ?? "");
  return { calle: m ? m[1]!.trim() : r.address ?? "", zip: m ? m[2]! : "", lat: r.lat, lng: r.lng, casa: r.casa, fijadoPorEquipo: r.fijado, centro: [r.clat, r.clng] };
}

export async function direccionGuardar(negocio: string, x: { calle?: string; zip?: string; pin?: [number, number] | null }): Promise<ResDirNeg> {
  if (!(await mismoOrigen())) return no("No se pudo guardar.", "Could not save.");
  const acc = await accesoPanel(negocio, "page");
  if (!acc) return no("No tienes acceso a esta parte del panel.", "You do not have access to this part of the dashboard.");
  const calle = String(x?.calle ?? "").replace(/\s+/g, " ").trim().slice(0, 120), zip = String(x?.zip ?? "").trim();
  if (calle.length < 4 || !/\d/.test(calle)) return no("Escribe la calle y el número.", "Enter street and number.");
  if (!/^\d{5}$/.test(zip)) return no("El código postal tiene 5 números.", "ZIP has 5 digits.");
  const pin = Array.isArray(x?.pin) && x.pin.length === 2 ? { lat: Number(x.pin[0]), lng: Number(x.pin[1]) } : null;
  return tx(async (c) => {
    const b = (await c.query<{ address: string | null; lat: number | null; lng: number | null; city_id: string }>(
      `select address, st_y(geo::geometry) as lat, st_x(geo::geometry) as lng, city_id from businesses where id = $1 for update`, [negocio])).rows[0];
    if (!b) return no("Ese negocio no existe.", "That business does not exist.");
    const u = await puntoFinal(c, calle, zip, pin);
    if (u.error) return no(`El pin quedó muy lejos de esa dirección. Ponlo en la puerta (hasta ${PIN_MAX_M} m).`, `The pin is too far from that address. Put it at the door (within ${PIN_MAX_M} m).`);
    if (u.lat == null || u.lng == null) return no("No encontramos esa dirección en el mapa. Revisa la calle, el número y el código postal.", "We could not find that address on the map. Check the street, number and ZIP code.");
    const address = `${calle}, ${zip}`;
    await c.query(`update businesses set address = $2, geo = st_setsrid(st_point($3::float8, $4::float8), 4326)::geography, admin_edits = admin_edits - 'address', updated_at = now() where id = $1`,
      [negocio, address, u.lng, u.lat]);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, 'negocio.direccion', 'business', $2, $3, $4::jsonb, $5::jsonb)`,
      [acc.yo.id, negocio, b.city_id, JSON.stringify({ address: b.address, lat: b.lat, lng: b.lng }), JSON.stringify({ address, lat: u.lat, lng: u.lng, calidad: u.calidad })]);
    return { ok: true } as const;
  });
}
