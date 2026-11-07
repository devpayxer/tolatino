"use server";
/* Bienes Raíces desde el panel (4ib · fase4-iglesias-inmuebles-autos.md §4ib y §5): la propiedad (crear o guardar), su estado y «Tu
   herramienta» (un toque a la vez). Mismo sitio, miembro activo con acceso a «Lo que vendes» (parte cat), datos revisados en lib/inmuebles.ts
   (vivienda justa, depósito ≤ 2 meses, «Para mudarte» y la cuota estimada los calcula el servidor), una línea en la auditoría y la tarjeta
   y los filtros de Buscar recalculados en la misma transacción. Nada se cobra: ver es gratis. */
import { mismoOrigen } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { cambiarEstadoPropiedad, guardarHerramientaInm, guardarPropiedad, recalcularFiltrosInm, type InmIn, type PropIn } from "@/lib/inmuebles";
import { accesoPanel } from "@/lib/panel";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
const auditoria = `insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('user', $1, $2, 'business', $3, $4, $5::jsonb)`;
/* Al crear una propiedad, la fila de Tu herramienta nace con lo que dice la página (los filtros se derivan desde ese momento). */
const conFila = `insert into inm_settings (business_id, city_id) select id, city_id from businesses where id = $1 on conflict (business_id) do nothing`;

export async function inmGuardar(negocio: string, itemId: string, p: PropIn): Promise<Res & { id?: string }> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof negocio === "string" ? await accesoPanel(negocio, "cat") : null;
  if (!a || typeof itemId !== "string") return SIN_ACCESO;
  return tx(async (c) => {
    const r = await guardarPropiedad(c, a.negocio.id, itemId, p, a.yo.id);
    if (!r.ok) return no(r.es, r.en);
    await c.query(auditoria, [a.yo.id, itemId === "new" ? "inm.propiedad.crear" : "inm.propiedad.editar", a.negocio.id, a.negocio.city_id,
      JSON.stringify({ propiedad: String(p?.name?.es ?? "").slice(0, 60), item: r.id })]);
    await c.query(conFila, [a.negocio.id]);
    await recalcularFiltrosInm(c, a.negocio.id);
    return { ok: true, id: r.id };
  });
}

export async function inmEstado(negocio: string, itemId: string, status: string): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof negocio === "string" ? await accesoPanel(negocio, "cat") : null;
  if (!a) return SIN_ACCESO;
  return tx(async (c) => {
    const r = await cambiarEstadoPropiedad(c, a.negocio.id, String(itemId), String(status));
    if (!r.ok) return no(r.es, r.en);
    await c.query(auditoria, [a.yo.id, "inm.propiedad.estado", a.negocio.id, a.negocio.city_id, JSON.stringify({ item: String(itemId), estado: String(status) })]);
    await c.query(conFila, [a.negocio.id]);
    await recalcularFiltrosInm(c, a.negocio.id);
    return { ok: true };
  });
}

export async function inmHerramienta(negocio: string, p: InmIn): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof negocio === "string" ? await accesoPanel(negocio, "cat") : null;
  if (!a) return SIN_ACCESO;
  return tx(async (c) => {
    const r = await guardarHerramientaInm(c, a.negocio.id, p ?? {}, a.yo.id);
    if (!r.ok) return no(r.es, r.en);
    await c.query(auditoria, [a.yo.id, "inm.herramienta", a.negocio.id, a.negocio.city_id, JSON.stringify(p ?? {})]);
    await recalcularFiltrosInm(c, a.negocio.id);
    return { ok: true };
  });
}
