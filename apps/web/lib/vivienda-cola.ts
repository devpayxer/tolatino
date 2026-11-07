import "server-only";
import type { Pool, PoolClient } from "pg";

/* 4ig · Colas › «Vivienda justa» (fase4-iglesias-inmuebles-autos.md §4ig). Dos clases de caso:
   - 'business': el negocio intentó guardar un texto con una frase de la lista (nada se guardó; la frase queda en la auditoría
     `inm.vivienda_justa.frenada`). Un caso abierto por negocio junta las frenadas de 30 días; si ya hay uno abierto, la nueva entra en él.
   - 'listing': una propiedad que se declara vivienda para mayores de 62 nace «por revisar» y abre su caso.
   La decisión (confirmar o no la declaración, revisado o advertencia) sale de aquí para que Negocios 360° y Colas hagan lo mismo. Nunca se
   guarda ni se muestra quién vive, ni datos de las personas que pidieron visitas. */
export async function abrirCasoFrenada(c: PoolClient, negocio: string, ciudad: string) {
  await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id) values ('vivienda', 'business', $1, $1, $2) on conflict do nothing`, [negocio, ciudad]);
}
export async function abrirCasoMayores(c: PoolClient, negocio: string, ciudad: string, itemId: string) {
  await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id) values ('vivienda', 'listing', $1, $2, $3) on conflict do nothing`, [String(itemId), negocio, ciudad]);
}

/* Confirmar o no la declaración de mayores. «No se confirma» oculta la propiedad con el motivo (el dueño la corrige o la cambia de tipo).
   Cierra el caso abierto de esa propiedad (si lo hay). Devuelve el nombre de la propiedad o un texto de error. */
export async function revisarMayores(c: PoolClient, negocio: string, itemId: string, confirma: boolean, motivo: string, staffId: string): Promise<{ ok: true; nombre: string } | { ok: false; error: string }> {
  const x = (await c.query<{ name: string; st: string }>(
    `select i.name->>'es' as name, pl.senior_status as st from property_listings pl join items i on i.id = pl.item_id
      where pl.item_id = $1::bigint and pl.business_id = $2 and pl.senior_62 for update of pl`, [itemId, negocio])).rows[0];
  if (!x) return { ok: false, error: "Esa propiedad no declara vivienda para mayores." };
  await c.query(`update property_listings set senior_status = $2, updated_at = now() where item_id = $1::bigint`, [itemId, confirma ? "ok" : "rejected"]);
  if (!confirma) await c.query(`update items set status = 'hidden', hidden_reason = $3, hidden_by = $4, updated_at = now() where id = $1::bigint and business_id = $2`, [itemId, negocio, `Vivienda para mayores no confirmada: ${motivo}`, staffId]);
  const I = await import("./inmuebles");
  await I.horasVisita(c, negocio, itemId);
  await I.recalcularFiltrosInm(c, negocio);
  await c.query(`update queue_items set status = 'decided', decision = $2, reason = $3, decided_by = $4, decided_at = now()
                  where queue = 'vivienda' and subject_kind = 'listing' and subject_id = $1 and status = 'open'`, [String(itemId), confirma ? "confirmar" : "rechazar", motivo, staffId]);
  return { ok: true, nombre: x.name };
}

/* Lo que necesita el caso para decidir. */
export async function datosCasoVivienda(c: Pool | PoolClient, kind: string, subject: string, negocio: string) {
  if (kind === "listing") {
    const p = (await c.query<{ id: string; name: string; st: string; senior: string; rent: number | null; zip: string | null; oculta: boolean; desde: string; razon: string | null }>(
      `select i.id::text, i.name->>'es' as name, pl.status as st, pl.senior_status as senior, pl.rent_cents as rent, pl.zip, i.status = 'hidden' as oculta,
              pl.created_at::text as desde, i.hidden_reason as razon
         from property_listings pl join items i on i.id = pl.item_id where pl.item_id = $1::bigint and pl.business_id = $2`, [subject, negocio])).rows[0];
    return { tipo: "mayores" as const, propiedad: p ?? null, frenadas: [] as { frase: string; propiedad: string; at: string; quien: string }[], total: 0, advertencias: 0 };
  }
  const L = (await c.query<{ frase: string; propiedad: string; at: string; quien: string }>(
    `select a.after->>'frase' as frase, coalesce(a.after->>'propiedad', '') as propiedad, a.at::text as at,
            coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), 'Alguien del negocio') as quien
       from audit_entries a left join users u on u.id::text = a.actor_id
      where a.action = 'inm.vivienda_justa.frenada' and a.target_id = $1 and a.at > now() - interval '30 days' order by a.at desc limit 12`, [negocio])).rows;
  const x = (await c.query<{ n: number; adv: number }>(
    `select (select count(*)::int from audit_entries a where a.action = 'inm.vivienda_justa.frenada' and a.target_id = $1 and a.at > now() - interval '30 days') as n,
            (select count(*)::int from sanctions where target_kind = 'business' and target_id = $1 and reason like 'Vivienda justa:%' and lifted_at is null) as adv`, [negocio])).rows[0];
  return { tipo: "frases" as const, propiedad: null, frenadas: L, total: x?.n ?? L.length, advertencias: x?.adv ?? 0 };
}
