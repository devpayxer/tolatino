import "server-only";
import { db } from "./db";

/* 9m · Retiros del fabricante (recalls, L524) con los datos PÚBLICOS de NHTSA, sin pagar y sin llamar a nadie al mostrar una página: el archivo de
   retiros se baja una vez al mes (infra/retiros/generar.sh → vehicle_recalls) y aquí se cruza por marca, modelo y año. Lo que dicen los datos
   públicos es «este modelo y año tiene N retiros»; si ESTE carro (su VIN) ya se arregló lo confirma el dealer o nhtsa.gov con el VIN (la página lo
   dice así, sin inventar). «No lo manejes» (do_not_drive) va primero. */
export type Retiro = { campana: string; componente: string | null; resumen: string | null; arreglo: string | null; fecha: string | null; noManejar: boolean };
export type RetirosModelo = { cargados: boolean; porCarro: Record<string, Retiro[]> };

const norm = (s: string | null | undefined) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();

export async function retirosDe(carros: { id: string; make: string | null; model: string | null; year: number | null }[]): Promise<RetirosModelo> {
  const cargados = ((await db().query(`select 1 from geo_loads where kind = 'retiros' and status = 'ok' limit 1`)).rowCount ?? 0) > 0;
  const L = carros.filter((c) => c.make && c.model && c.year);
  if (!L.length) return { cargados, porCarro: {} };
  const r = await db().query<{ k: string; campaign: string; component: string | null; summary: string | null; remedy: string | null; fecha: string | null; dnd: boolean }>(
    `with c (k, make, model, year) as (select * from unnest($1::text[], $2::text[], $3::text[], $4::int[]))
     select c.k, v.campaign, v.component, left(v.summary, 600) as summary, left(v.remedy, 400) as remedy, to_char(v.report_date, 'MM/DD/YYYY') as fecha, v.do_not_drive as dnd
       from c join vehicle_recalls v on upper(v.make) = c.make and upper(v.model) = c.model and v.year = c.year
      order by c.k, v.do_not_drive desc, v.report_date desc nulls last limit 400`,
    [L.map((c) => c.id), L.map((c) => norm(c.make)), L.map((c) => norm(c.model)), L.map((c) => c.year)]);
  const porCarro: Record<string, Retiro[]> = {};
  for (const x of r.rows) (porCarro[x.k] ??= []).push({ campana: x.campaign, componente: x.component, resumen: x.summary, arreglo: x.remedy, fecha: x.fecha, noManejar: x.dnd });
  return { cargados, porCarro };
}
