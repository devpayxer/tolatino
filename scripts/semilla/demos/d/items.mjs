// «Lo que vende»: secciones y servicios de todos los negocios en un solo lote (idempotente por nombre).
import { s, n, j } from "./comun.mjs";

export function sqlItems(negocios) {
  const out = ["create temp table _i (b text, sec jsonb, secsort int, name jsonb, descr jsonb, cents int, dur int, kind text, attrs jsonb, pfrom boolean, photo text, sort int, dep int, module text, unit text, featured boolean) on commit drop;"];
  const rows = negocios.flatMap((b) => b.items.map((i) => `(${s(b.id)}, ${j(i.sec)}, ${i.secSort}, ${j(i.name)}, ${j(i.descr)}, ${n(i.cents)}, ${n(i.dur)}, ${s(i.kind)}, ${j(i.attrs || {})}, ${!!i.pfrom}, ${s(i.photo)}, ${i.sort}, ${n(i.dep || 0)}, ${s(i.module || "svc")}, ${s(i.unit || "u")}, ${!!i.featured})`));
  for (let k = 0; k < rows.length; k += 300) out.push(`insert into _i values\n${rows.slice(k, k + 300).join(",\n")};`);
  out.push(`insert into item_sections (business_id, module, name, sort)
select distinct i.b, 'svc', i.sec, i.secsort from _i i where i.module = 'svc' and not exists (select 1 from item_sections x where x.business_id = i.b and x.module = 'svc' and x.name->>'es' = i.sec->>'es' and x.removed_at is null);`);
  out.push(`insert into items (business_id, module, section_id, name, descr, price_cents, unit, duration_min, svc_kind, svc_attrs, price_from, photos, deposit_cents, featured, sort)
select i.b, i.module, (select x.id from item_sections x where x.business_id = i.b and x.module = 'svc' and x.name->>'es' = i.sec->>'es' and x.removed_at is null limit 1), i.name, i.descr, i.cents, i.unit, i.dur,
       case when i.module = 'svc' then i.kind end, i.attrs, i.pfrom, case when i.photo is null then '{}'::text[] else array[i.photo || '?auto=compress&cs=tinysrgb&h=600'] end, i.dep, i.featured, i.sort
  from _i i
 where not exists (select 1 from items x where x.business_id = i.b and x.module = i.module and x.name->>'es' = i.name->>'es' and x.removed_at is null);`);
  return out;
}
