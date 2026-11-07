"use server";
/* «Horarios y ayuda», «La ayuda de hoy» y «Precios y repatriación» desde el panel (4ia · fase4-iglesias-inmuebles-autos.md §4ia y §5):
   cada toque se guarda. Mismo sitio, miembro activo con acceso a «Lo que vendes» (parte cat), datos revisados AQUÍ y en lib/fe.ts,
   una línea en la auditoría y la tarjeta y los filtros de Buscar recalculados en la misma transacción. */
import { mismoOrigen } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { guardarFe, recalcularFiltrosFe, type FeIn } from "@/lib/fe";
import { accesoPanel } from "@/lib/panel";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");

export async function feGuardar(negocio: string, p: FeIn): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof negocio === "string" ? await accesoPanel(negocio, "cat") : null;
  if (!a) return SIN_ACCESO;
  return tx(async (c) => {
    const r = await guardarFe(c, a.negocio.id, p ?? {}, a.yo.id);
    if (!r.ok) return no(r.es, r.en);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('user', $1, 'fe.herramienta', 'business', $2, $3, $4::jsonb)`,
      [a.yo.id, a.negocio.id, a.negocio.city_id, JSON.stringify(p ?? {})]);
    await recalcularFiltrosFe(c, a.negocio.id);
    return { ok: true };
  });
}
