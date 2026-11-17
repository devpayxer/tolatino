// Ronda 2 · NEG-EDU: liga cada matrícula con su grupo (details.group_id / item_id). Igual al de la ronda 1, pero también rellena
// la llave cuando existe con valor null (la ronda 1 la deja nula porque el detalle ya trae la llave vacía).
import { s, dateLit } from "../d/comun.mjs";

export function sqlGrupoDeMatricula2(ops) {
  const rows = ops.filter((o) => o.gref).map((o) => `(${s(o.ck)}, ${s(o.ph)}, ${s(o.b)}, ${s(o.gref.item)}, ${dateLit(o.gref.starts)})`);
  const out = ["create temp table _og (ck text, ph text, b text, item text, starts date) on commit drop;"];
  for (let k = 0; k < rows.length; k += 600) out.push(`insert into _og values\n${rows.slice(k, k + 600).join(",\n")};`);
  out.push(`update operations op set details = op.details || jsonb_build_object('group_id', g.id::text, 'item_id', i.id::text) from _og x, users u, items i, class_groups g
 where u.phone = x.ph and op.user_id = u.id and op.client_key = x.ck::uuid and i.business_id = x.b and i.name->>'es' = x.item and i.module = 'svc' and i.removed_at is null
   and g.business_id = x.b and g.item_id = i.id and g.starts_on = x.starts and g.purpose = 'insc' and coalesce(op.details->>'group_id', '') = '';`);
  return out;
}
