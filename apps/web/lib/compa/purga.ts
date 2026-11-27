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
  // 27 nov (9t9, los barridos que no son de dinero, 2ª tanda) · La purga de la base y cada foto por su cuenta (lib/barrido-uno.ts): una foto que el almacén
  // no deja borrar ya no deja sin purgar a las de detrás (antes cortaba la tarea; y en la tajada de 50 sin orden, con 50 así, ninguna otra salía nunca).
  // El caso purgado hace más tiempo primero, por tandas de 50 sin repetir en la corrida lo ya visto; la tarea sale fallida diciendo cuál.
  const U = await import("../barrido-uno"), B = new U.Fallos("compaRetencion");
  const r = (await B.uno("conversaciones y casos", async () => (await db().query<{ x: { retencion: number; casos: number; borradas: number } }>(`select compa_purgar($1) as x`, [lim])).rows[0]!.x))
    ?? { retencion: 0, casos: 0, borradas: 0 };
  // Las fotos de los casos ya purgados (cuenta borrada) que siguen en el almacenamiento.
  const { mediosListos } = await import("../medios");
  const { borrarConVariantes } = await import("../fotos-privadas");
  let fotos = 0;
  await U.porTandas(B, 50, async (vistos) => (await db().query<{ id: string; url: string; w: number | null; var_widths: number[] | null }>(
    `select m.id::text, m.url, m.w, m.var_widths from media m join support_cases c on m.owner_kind = 'support' and m.owner_id = c.id::text
      where c.purged_at is not null and m.private and m.status = 'visible' and not (m.id = any($1::uuid[]))
      order by c.purged_at, m.id limit 50`, [vistos])).rows, (m) => m.id, async (m) => {
    // F3b · Con la maestra salen sus variantes (privado/a/<id>.w<ancho>.webp).
    if (mediosListos() && m.url.startsWith("privado/")) await borrarConVariantes(m.url, m.w, m.var_widths);
    await db().query(`update media set status = 'removed', removed_reason = 'Borrada con la cuenta (30 días)', url = 'privado/borrada', purged_at = now() where id = $1::uuid`, [m.id]);
    fotos++;
  });
  B.fin();
  return { ...r, fotos };
}
