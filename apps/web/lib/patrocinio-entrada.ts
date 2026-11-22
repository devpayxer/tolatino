import "server-only";
import { db } from "./db";
import { dispositivo, mismoOrigen, yo } from "./cuenta";
import { contexto } from "./eventos";
import { contarEntrada } from "./patrocinio";

/* C-002 / C-003 · «Entraron» de un patrocinio: alguien tocó la tarjeta patrocinada (de un negocio o de un evento). Lo cuenta la base (patrocinio_entro):
   una vez por persona (o dispositivo) y día, solo mientras está activo; la gente del propio negocio y los robots no cuentan. Nunca rompe la pantalla.
   Llega por /api/toque (lib/contar-toque.ts · contarEntradaPatrocinio, la bandeja que sobrevive a la salida de la página); antes era una acción
   del servidor (app/(app)/acciones-patrocinio.ts) y se perdía al abrir tel: o el mapa en el mismo toque. Las reglas son las mismas, sin cambios;
   un reintento no cuenta dos veces (índice único por persona o dispositivo y día: on conflict do nothing).
   Archivo propio (no dentro de lib/patrocinio.ts): lib/patrocinio.ts es de DINERO y las pruebas din9t* lo cargan con sus «stubs» contados; lo que
   solo necesita el «entraron» (cuenta, eventos) no entra ahí. */
export async function entroPatrocinado(kind: "negocio" | "evento", id: string): Promise<void> {
  try {
    if (!(await mismoOrigen())) return;
    if ((kind !== "negocio" && kind !== "evento") || typeof id !== "string" || !/^\d{1,18}$/.test(id)) return;
    const [u, ctx] = await Promise.all([yo(), contexto()]);
    if (ctx.robot) return;
    if (u) {
      const tabla = kind === "negocio" ? "sponsorships" : "event_sponsorships";
      const propio = await db().query(`select 1 from ${tabla} s join business_members m on m.business_id = s.business_id where s.id = $1::bigint and m.user_id = $2 and m.status = 'active'`, [id, u.id]).catch(() => ({ rowCount: 0 }));
      if (propio.rowCount) return;
    }
    await contarEntrada(kind, id, u?.id ?? null, u ? null : await dispositivo(false));
  } catch (e) {
    console.error("[patrocinio] entro", e instanceof Error ? e.message : e);
  }
}
