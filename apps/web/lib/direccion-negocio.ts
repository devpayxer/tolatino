import "server-only";
import { db } from "./db";

/* 9m / 9n-23 · La dirección del negocio para Panel › Tu página › Dirección y mapa. SIN revisar quién la pide: la llaman solo quien ya revisó el
   acceso (direccionLeer en app/panel/acciones-direccion.ts, con accesoPanel; y datosPanel en la vista del equipo, después de accesoPanelSoloLectura). */
export type DirNegocio = { calle: string; zip: string; lat: number | null; lng: number | null; casa: boolean; fijadoPorEquipo: string | null; centro: [number, number] };

export async function direccionNegocio(negocio: string): Promise<DirNegocio | null> {
  const r = (await db().query<{ address: string | null; lat: number | null; lng: number | null; casa: boolean; fijado: string | null; clat: number; clng: number }>(
    `select b.address, st_y(b.geo::geometry) as lat, st_x(b.geo::geometry) as lng, b.works_from_home as casa,
            to_char(b.geo_fixed_at at time zone c.timezone, 'MM/DD/YYYY') as fijado, st_y(c.center::geometry) as clat, st_x(c.center::geometry) as clng
       from businesses b join cities c on c.id = b.city_id where b.id = $1`, [negocio])).rows[0];
  if (!r) return null;
  // La dirección se guarda como «calle, código postal» o solo la calle (las de antes): se separa el código postal si lo trae al final.
  const m = /^(.*?)(?:,\s*|\s+)(\d{5})$/.exec(r.address ?? "");
  return { calle: m ? m[1]!.trim() : r.address ?? "", zip: m ? m[2]! : "", lat: r.lat, lng: r.lng, casa: r.casa, fijadoPorEquipo: r.fijado, centro: [r.clat, r.clng] };
}
