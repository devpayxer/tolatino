import "server-only";
import { cfgSql } from "./config";
import { db } from "./db";
import { borrarObjeto, mediosListos } from "./medios";

/* 9n · Lo que corre en el barrido para la entrega y las colas.
   - purgarFotosEntrega: la foto privada de una entrega se borra del almacenamiento a los `entrega_foto_dias` (Configuración › Repartidor), salvo
     si su pedido tiene una disputa abierta (es la evidencia). La fila de media queda con purged_at (nada se borra de la base).
   - soltarTomados: un caso de Colas tomado hace más de `cola_tomado_min` sin decidirse vuelve a «sin asignar» (queda en la auditoría). */
export async function purgarFotosEntrega(): Promise<number> {
  if (!mediosListos()) return 0;
  const r = await db().query<{ id: string; url: string }>(
    `select m.id::text, m.url from media m join operations o on o.id::text = m.owner_id
      where m.owner_kind = 'delivery' and m.private and m.purged_at is null and m.created_at < now() - make_interval(days => ${cfgSql("entrega_foto_dias")})
        and not exists (select 1 from disputes d where d.operation_id = o.id and d.status not in ('won', 'lost', 'closed', 'accepted'))
      order by m.created_at limit 200`);
  let n = 0;
  for (const m of r.rows) {
    try { await borrarObjeto(m.url); } catch { continue; }
    await db().query(`update media set purged_at = now(), status = 'removed', removed_reason = 'retencion' where id = $1::uuid and purged_at is null`, [m.id]);
    n++;
  }
  return n;
}
export async function soltarTomados(): Promise<number> {
  const r = await db().query<{ id: string; quien: string; city: string | null; queue: string }>(
    `update queue_items q set assigned_to = null, assigned_at = null from (select id, assigned_to from queue_items where status = 'open' and assigned_to is not null and assigned_at < now() - make_interval(mins => ${cfgSql("cola_tomado_min")}) for update skip locked) v
      where q.id = v.id returning q.id::text, v.assigned_to::text as quien, q.city_id as city, q.queue`);
  for (const x of r.rows)
    await db().query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after, reason) values ('system', null, 'cola.tomado_vencio', 'queue_item', $1, $2, $3::jsonb, null, $4)`,
      [x.id, x.city, JSON.stringify({ tomado: x.quien, cola: x.queue }), "Nadie lo decidió en el tiempo de Configuración › Colas"]);
  return r.rowCount ?? 0;
}
