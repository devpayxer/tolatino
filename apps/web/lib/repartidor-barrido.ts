import "server-only";
import { cfgSql } from "./config";
import { db, tx } from "./db";
import { borrarConVariantes } from "./fotos-privadas";
import { mediosListos } from "./medios";

/* 9n · Lo que corre en el barrido para la entrega y las colas.
   - purgarFotosEntrega: la foto privada de una entrega se borra del almacenamiento a los `entrega_foto_dias` (Configuración › Repartidor), salvo
     si su pedido tiene una disputa abierta (es la evidencia). La fila de media queda con purged_at (nada se borra de la base).
   - soltarTomados: un caso de Colas tomado hace más de `cola_tomado_min` sin decidirse vuelve a «sin asignar» (queda en la auditoría). */
export async function purgarFotosEntrega(): Promise<number> {
  if (!mediosListos()) return 0;
  // 27 nov (9t9, los barridos que no son de dinero, 2ª tanda) · Cada foto por su cuenta (lib/barrido-uno.ts): una que el almacén no deja borrar ya no se
  // salta en silencio (antes try/catch → continue y, con 200 así primeras en la tajada, ninguna otra salía nunca): las de detrás siguen, por tandas de 200
  // sin repetir en la corrida lo ya visto (la más vieja primero), y la tarea sale fallida diciendo cuál (se reintenta en la vuelta siguiente, como antes).
  const U = await import("./barrido-uno"), B = new U.Fallos("fotosEntrega");
  let n = 0;
  await U.porTandas(B, 200, async (vistos) => (await db().query<{ id: string; url: string; w: number | null; var_widths: number[] | null }>(
    `select m.id::text, m.url, m.w, m.var_widths from media m join operations o on o.id::text = m.owner_id
      where m.owner_kind = 'delivery' and m.private and m.purged_at is null and m.created_at < now() - make_interval(days => ${cfgSql("entrega_foto_dias")})
        and not exists (select 1 from disputes d where d.operation_id = o.id and d.status not in ('won', 'lost', 'closed', 'accepted'))
        and not (m.id = any($1::uuid[]))
      order by m.created_at, m.id limit 200`, [vistos])).rows, (m) => m.id, async (m) => {
    // F3b · Con la maestra salen sus variantes (privado/e/<id>.w<ancho>.webp).
    await borrarConVariantes(m.url, m.w, m.var_widths);
    await db().query(`update media set purged_at = now(), status = 'removed', removed_reason = 'retencion' where id = $1::uuid and purged_at is null`, [m.id]);
    n++;
  });
  B.fin();
  return n;
}
export async function soltarTomados(): Promise<number> {
  // 9n · Soltar y su auditoría, en la misma transacción (guardián auditoriaEnLaTransaccion).
  // 27 nov (9t9, los barridos que no son de dinero, 2ª tanda) · Los renglones de auditoría en UNA escritura (antes un insert por elemento en un bucle:
  // dentro de la transacción, uno que fallaba deshacía todos, así que no es un barrido «por elemento»; ahora tampoco hay bucle).
  return tx(async (c) => {
    const r = await c.query<{ id: string; quien: string; city: string | null; queue: string }>(
      `update queue_items q set assigned_to = null, assigned_at = null from (select id, assigned_to from queue_items where status = 'open' and assigned_to is not null and assigned_at < now() - make_interval(mins => ${cfgSql("cola_tomado_min")}) for update skip locked) v
        where q.id = v.id returning q.id::text, v.assigned_to::text as quien, q.city_id as city, q.queue`);
    if (r.rows.length) await c.query(
      `insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after, reason)
       select 'system', null, 'cola.tomado_vencio', 'queue_item', x.id, x.city, jsonb_build_object('tomado', x.quien, 'cola', x.queue), null, $5
         from unnest($1::text[], $2::text[], $3::text[], $4::text[]) as x(id, city, quien, queue)`,
      [r.rows.map((x) => x.id), r.rows.map((x) => x.city), r.rows.map((x) => x.quien), r.rows.map((x) => x.queue), "Nadie lo decidió en el tiempo de Configuración › Colas"]);
    return r.rowCount ?? 0;
  });
}
