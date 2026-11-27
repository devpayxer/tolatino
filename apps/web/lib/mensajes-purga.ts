import "server-only";
import { db } from "./db";
import { borrarConVariantes } from "./fotos-privadas";
import { mediosListos } from "./medios";

/* 9t · Las fotos de Mensajes que se subieron y NUNCA se enviaron (owner_id 'pendiente': se eligió una foto y se cerró la conversación, o se quitó
   antes de mandar). Pasadas 24 h ya no se pueden mandar (tomarFoto en lib/mensajes.ts pide < 24 h), así que el barrido saca el archivo del
   almacén privado y la fila queda con purged_at (nada se borra de la base; la dirección privada ya no la sirve: pide purged_at is null).
   Nunca toca una foto ya enviada (owner_id = el id del mensaje) ni una de otro tipo. Guardián fotosSinEnviarSePurgan; prueba msg9t §5b.
   9t (19 nov) · También las de Mensajes entre vecinos (owner_kind 'dm'; tomarFoto en lib/mensajes-vecinos.ts pide las mismas < 24 h); prueba dm9t §F5. */
export async function purgarFotosSinEnviar(): Promise<number> {
  if (!mediosListos()) return 0;
  // 27 nov (9t9, los barridos que no son de dinero, 2ª tanda) · Cada foto por su cuenta (lib/barrido-uno.ts): una que el almacén no deja borrar ya no se
  // salta en silencio (antes try/catch → continue y, con 200 así primeras en la tajada, ninguna otra salía nunca): las de detrás siguen, por tandas de 200
  // sin repetir en la corrida lo ya visto (la más vieja primero), y la tarea sale fallida diciendo cuál (se reintenta en la vuelta siguiente, como antes).
  const U = await import("./barrido-uno"), B = new U.Fallos("fotosSinEnviar");
  let n = 0;
  await U.porTandas(B, 200, async (vistos) => (await db().query<{ id: string; url: string; w: number | null; var_widths: number[] | null }>(
    `select id::text, url, w, var_widths from media
      where owner_kind in ('chat', 'dm') and owner_id = 'pendiente' and purged_at is null and created_at < now() - interval '24 hours' and url like 'privado/m/%'
        and not (id = any($1::uuid[]))
      order by created_at, media.id limit 200`, [vistos])).rows, (m) => m.id, async (m) => {
    // F3b · Con la maestra salen sus variantes (privado/m/<id>.w<ancho>.webp).
    await borrarConVariantes(m.url, m.w, m.var_widths);
    await db().query(`update media set purged_at = now(), status = 'removed', removed_reason = 'sin_enviar', removed_at = now()
                       where id = $1::uuid and owner_id = 'pendiente' and purged_at is null`, [m.id]);
    n++;
  });
  B.fin();
  return n;
}
