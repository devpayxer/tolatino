"use server";
/* C-002 / C-003 · «Entraron» de un patrocinio: alguien tocó la tarjeta patrocinada (de un negocio o de un evento). Lo cuenta la base (patrocinio_entro):
   una vez por persona (o dispositivo) y día, solo mientras está activo; la gente del propio negocio y los robots no cuentan. Nunca rompe la pantalla. */
import { db } from "@/lib/db";
import { dispositivo, mismoOrigen, yo } from "@/lib/cuenta";
import { contexto } from "@/lib/eventos";
import { contarEntrada } from "@/lib/patrocinio";

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
