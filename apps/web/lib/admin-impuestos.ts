import "server-only";
/* 9n-19 · Super Admin › Planes › Impuestos (LAUNCH L471): las reglas de tax_rules por ciudad y categoría — la vigente de cada par y las
   programadas — con quién y por qué. Solo lectura; el cambio es una regla NUEVA desde una fecha (acciones-planes.ts impuestoProgramar).
   s.cities: las ciudades de su rol (vacío = todas) o la elegida en el selector. */
import type { Staff } from "./admin";
import { db } from "./db";

export type ReglaImpuesto = { id: string; ciudadId: string; ciudad: string; cat: string; partes: number; mano: number; desde: string; vigente: boolean; motivo: string | null };

export async function reglasImpuesto(s: Staff): Promise<ReglaImpuesto[]> {
  const r = await db().query<{ id: string; city_id: string; ciudad: string; cat: string; parts_bp: number; labor_bp: number; desde: string; vigente: boolean; reason: string | null }>(
    `with v as (select distinct on (city_id, category_id) id from tax_rules where effective_from <= now() order by city_id, category_id, effective_from desc, id desc)
     select t.id::text, t.city_id, c.name as ciudad, t.category_id as cat, t.parts_bp, t.labor_bp, t.effective_from::text as desde, (t.id in (select id from v)) as vigente, t.reason
       from tax_rules t join cities c on c.id = t.city_id
      where (t.id in (select id from v) or t.effective_from > now()) and (cardinality($1::text[]) = 0 or t.city_id = any($1::text[]))
      order by c.sort, c.name, t.category_id, t.effective_from`, [s.cities]);
  return r.rows.map((x) => ({ id: x.id, ciudadId: x.city_id, ciudad: x.ciudad, cat: x.cat, partes: x.parts_bp, mano: x.labor_bp, desde: x.desde, vigente: x.vigente, motivo: x.reason }));
}
