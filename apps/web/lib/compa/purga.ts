import "server-only";
import { db } from "../db";

/* 7i · La purga por retención (fase7-compa §3 «Retención», §6 #7, D5). «Nada se borra (estados)»: la purga VACÍA el texto y deja la fila, el
   estado y las cifras. La decide la base (compa_purgar, 0124), que solo admite esa actualización una vez en cada tabla de solo inserción:
   - Retención: una conversación de El Compa CERRADA que empezó hace más de compa_retener_meses (Configuración › El Compa) queda en cifras
     (resultado, motivo, uso, gasto): sin lo que dijo la persona ni lo que contestó, sin el resumen al pasar a una persona, sin la pregunta de
     «Lo que El Compa no supo» ni la nota de una marca, sin los borradores del copiloto y sin el teléfono cifrado.
   - Cuenta borrada (D5): pasado users.delete_at (el pedido + 30 días) sus casos de Soporte (mensajes, resumen, dispositivo y el copiloto de
     esos casos) y sus conversaciones cerradas. Las fotos privadas de esos casos: el archivo sale del almacenamiento y la fila queda borrada
     (como las fotos de una ayuda, lib/ayuda-cita.ts purgarFotosAyuda). Lo de Stripe queda en Stripe.
   Lo corre el barrido central cada minuto, hasta `lim` de cada una por pasada. */
export type Purga = { retencion: number; casos: number; borradas: number; fotos: number };
export async function barrerRetencion(lim = 500): Promise<Purga> {
  const r = (await db().query<{ x: { retencion: number; casos: number; borradas: number } }>(`select compa_purgar($1) as x`, [lim])).rows[0]!.x;
  // Las fotos de los casos ya purgados (cuenta borrada) que siguen en el almacenamiento.
  const F = (await db().query<{ id: string; url: string }>(
    `select m.id::text, m.url from media m join support_cases c on m.owner_kind = 'support' and m.owner_id = c.id::text
      where c.purged_at is not null and m.private and m.status = 'visible' limit 50`)).rows;
  if (F.length) {
    const { borrarObjeto, mediosListos } = await import("../medios");
    for (const m of F) {
      if (mediosListos() && m.url.startsWith("privado/")) await borrarObjeto(m.url);
      await db().query(`update media set status = 'removed', removed_reason = 'Borrada con la cuenta (30 días)', url = 'privado/borrada', purged_at = now() where id = $1::uuid`, [m.id]);
    }
  }
  return { ...r, fotos: F.length };
}
