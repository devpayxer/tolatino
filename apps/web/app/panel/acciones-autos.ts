"use server";
/* Venta de Autos desde el panel (4ic · fase4-iglesias-inmuebles-autos.md §4ic y §5): el vehículo (crear o guardar), su estado, el total en
   la puerta en vivo y «Tu herramienta» (un toque a la vez). Mismo sitio, miembro activo con acceso a «Lo que vendes» (parte cat), datos
   revisados en lib/autos.ts (VIN con su dígito, cargo ≤ tope de PA; el total en la puerta y el pago de ejemplo los calcula el servidor),
   una línea en la auditoría y la tarjeta y los filtros de Buscar recalculados en la misma transacción. Nada se cobra: la prueba es gratis. */
import { mismoOrigen } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { cambiarEstadoCarro, cotizarCarro, guardarCarro, guardarHerramientaAutos, recalcularFiltrosAutos, type AutosIn, type CarroIn } from "@/lib/autos";
import type { Bhph, Pago, Puerta } from "@/lib/autos-comun";
import { accesoPanel } from "@/lib/panel";
import { avisarRetiradas } from "@/lib/visitas-inm";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
const auditoria = `insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('user', $1, $2, 'business', $3, $4, $5::jsonb)`;

export async function autosGuardar(negocio: string, itemId: string, p: CarroIn): Promise<Res & { id?: string; puerta?: Puerta }> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof negocio === "string" ? await accesoPanel(negocio, "cat") : null;
  if (!a || typeof itemId !== "string") return SIN_ACCESO;
  return tx(async (c) => {
    const r = await guardarCarro(c, a.negocio.id, itemId, p, a.yo.id);
    if (!r.ok) return no(r.es, r.en);
    await c.query(auditoria, [a.yo.id, itemId === "new" ? "autos.carro.crear" : "autos.carro.editar", a.negocio.id, a.negocio.city_id,
      JSON.stringify({ item: r.id, vin: String(p?.vin ?? "").slice(0, 17), precio: r.puerta?.price, en_la_puerta: r.puerta?.otd })]);
    await recalcularFiltrosAutos(c, a.negocio.id);
    return { ok: true, id: r.id, puerta: r.puerta };
  });
}

export async function autosEstado(negocio: string, itemId: string, status: string): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof negocio === "string" ? await accesoPanel(negocio, "cat") : null;
  if (!a) return SIN_ACCESO;
  const r0 = await tx(async (c): Promise<Res> => {
    const r = await cambiarEstadoCarro(c, a.negocio.id, String(itemId), String(status));
    if (!r.ok) return no(r.es, r.en);
    await c.query(auditoria, [a.yo.id, "autos.carro.estado", a.negocio.id, a.negocio.city_id, JSON.stringify({ item: String(itemId), estado: String(status) })]);
    await recalcularFiltrosAutos(c, a.negocio.id);
    return { ok: true };
  });
  // 4ie · Las visitas que se cancelaron porque se rentó, se vendió o se ocultó: el aviso sale ya confirmado el cambio.
  if (r0.ok) await avisarRetiradas(a.negocio.id).catch(() => undefined);
  return r0;
}

export async function autosHerramienta(negocio: string, p: AutosIn): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof negocio === "string" ? await accesoPanel(negocio, "cat") : null;
  if (!a) return SIN_ACCESO;
  const r0 = await tx(async (c): Promise<Res> => {
    const r = await guardarHerramientaAutos(c, a.negocio.id, p ?? {}, a.yo.id);
    if (!r.ok) return no(r.es, r.en);
    await c.query(auditoria, [a.yo.id, "autos.herramienta", a.negocio.id, a.negocio.city_id, JSON.stringify(p ?? {})]);
    await recalcularFiltrosAutos(c, a.negocio.id);
    return { ok: true };
  });
  // 4ie · Las visitas que se cancelaron porque se rentó, se vendió o se ocultó: el aviso sale ya confirmado el cambio.
  if (r0.ok) await avisarRetiradas(a.negocio.id).catch(() => undefined);
  return r0;
}

/* El total en la puerta de un precio, mientras el dueño lo escribe: lo calcula el servidor (impuesto de la ciudad, placas, cargo ≤ tope)
   y el editor solo lo muestra. Solo lee: no guarda nada. */
export async function autosTotal(negocio: string, priceCents: number): Promise<{ ok: true; puerta: Puerta; est: Pago | null; bhph: Bhph | null } | { ok: false }> {
  if (!(await mismoOrigen())) return { ok: false };
  const a = typeof negocio === "string" ? await accesoPanel(negocio, "cat") : null;
  if (!a) return { ok: false };
  const r = await cotizarCarro(a.negocio.id, Number(priceCents));
  return r ? { ok: true, ...r } : { ok: false };
}
