"use server";
/* «Cupos y licencia» de Niños desde el panel (4eb · fase4-edu-ninos-deporte.md §4eb y §5): cada toque se guarda. Mismo sitio, miembro
   activo con acceso a «Lo que vendes» (parte cat), datos revisados AQUÍ y en lib/ninos.ts, una línea en la auditoría y la tarjeta y los
   filtros de Buscar recalculados en la misma transacción. La licencia NO se toca aquí: va por Tu página › Licencias y la verifica
   To'Latino. Los grupos de los programas (fuera del cuidado) usan las acciones de Educación (acciones-edu.ts). */
import { mismoOrigen } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { guardarNinos, recalcularFiltrosNinos, type NinosIn } from "@/lib/ninos";
import { accesoPanel } from "@/lib/panel";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");

export async function ninosGuardar(negocio: string, p: NinosIn): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof negocio === "string" ? await accesoPanel(negocio, "cat") : null;
  if (!a) return SIN_ACCESO;
  return tx(async (c) => {
    const r = await guardarNinos(c, a.negocio.id, p ?? {}, a.yo.id);
    if (!r.ok) return no(r.es, r.en);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('user', $1, 'ninos.herramienta', 'business', $2, $3, $4::jsonb)`,
      [a.yo.id, a.negocio.id, a.negocio.city_id, JSON.stringify(p ?? {})]);
    await recalcularFiltrosNinos(c, a.negocio.id);
    return { ok: true };
  });
}
