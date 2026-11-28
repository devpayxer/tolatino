import "server-only";
import { db } from "./db";
import { dispositivo, mismoOrigen, yo } from "./cuenta";
import { contexto } from "./eventos";

/* C-002 / C-003 · «Entraron» de un patrocinio: alguien tocó la tarjeta patrocinada (de un negocio o de un evento). Lo cuenta la base (patrocinio_entro):
   una vez por persona (o dispositivo) y día, solo mientras está activo; la gente del propio negocio y los robots no cuentan.
   Llega por /api/toque (lib/contar-toque.ts · contarEntradaPatrocinio, la bandeja que sobrevive a la salida de la página); antes era una acción
   del servidor (app/(app)/acciones-patrocinio.ts) y se perdía al abrir tel: o el mapa en el mismo toque. Las reglas son las mismas, sin cambios;
   un reintento no cuenta dos veces (índice único por persona o dispositivo y día: on conflict do nothing).
   22 nov (0211) · Con el id del toque de la bandeja (toque, un uuid) va por patrocinio_entro_toque: las MISMAS reglas (llama a patrocinio_entro) y
   además la base no cuenta dos veces el mismo toque (sponsorship_entries.tap_key, único; p. ej. un reintento que cruza la medianoche). Y un fallo
   de la base ya no se traga: sale como error, /api/toque contesta 500 y la bandeja reintenta (antes contestaba 204 y la entrada se perdía).
   Por eso no pasaba por la vieja contarEntrada (lib/patrocinio.ts; quitada el 28 nov, nadie la llamaba), que convertía un error de la base en «no contó».
   Archivo propio (no dentro de lib/patrocinio.ts): lib/patrocinio.ts es de DINERO y las pruebas din9t* lo cargan con sus «stubs» contados; lo que
   solo necesita el «entraron» (cuenta, eventos) no entra ahí. */
export async function entroPatrocinado(kind: "negocio" | "evento", id: string, toque: string | null = null): Promise<void> {
  if (!(await mismoOrigen())) return;
  if ((kind !== "negocio" && kind !== "evento") || typeof id !== "string" || !/^\d{1,18}$/.test(id)) return;
  if (toque !== null && (typeof toque !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(toque))) return;
  const [u, ctx] = await Promise.all([yo(), contexto()]);
  if (ctx.robot) return;
  if (u) {
    const tabla = kind === "negocio" ? "sponsorships" : "event_sponsorships";
    const propio = await db().query(`select 1 from ${tabla} s join business_members m on m.business_id = s.business_id where s.id = $1::bigint and m.user_id = $2 and m.status = 'active'`, [id, u.id]);
    if (propio.rowCount) return;
  }
  const dev = u ? null : await dispositivo(false);
  await db().query(`select patrocinio_entro_toque($1, $2::bigint, $3::uuid, $4::uuid, $5::uuid)`, [kind, id, u?.id ?? null, dev, toque]);
}
