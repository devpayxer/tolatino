import "server-only";
import { db } from "./db";
import { borrarObjeto, mediosListos } from "./medios";

/* 9t · Las fotos de Mensajes que se subieron y NUNCA se enviaron (owner_id 'pendiente': se eligió una foto y se cerró la conversación, o se quitó
   antes de mandar). Pasadas 24 h ya no se pueden mandar (tomarFoto en lib/mensajes.ts pide < 24 h), así que el barrido saca el archivo del
   almacén privado y la fila queda con purged_at (nada se borra de la base; la dirección privada ya no la sirve: pide purged_at is null).
   Nunca toca una foto ya enviada (owner_id = el id del mensaje) ni una de otro tipo. Guardián fotosSinEnviarSePurgan; prueba msg9t §5b. */
export async function purgarFotosSinEnviar(): Promise<number> {
  if (!mediosListos()) return 0;
  const r = await db().query<{ id: string; url: string }>(
    `select id::text, url from media
      where owner_kind = 'chat' and owner_id = 'pendiente' and purged_at is null and created_at < now() - interval '24 hours' and url like 'privado/m/%'
      order by created_at limit 200`);
  let n = 0;
  for (const m of r.rows) {
    try { await borrarObjeto(m.url); } catch { continue; }
    await db().query(`update media set purged_at = now(), status = 'removed', removed_reason = 'sin_enviar', removed_at = now()
                       where id = $1::uuid and owner_id = 'pendiente' and purged_at is null`, [m.id]);
    n++;
  }
  return n;
}
