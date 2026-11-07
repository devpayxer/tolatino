"use server";
/* Tu herramienta de Transporte desde el panel (4w, fase4-fiestas-transporte §4w y §5): cada toque se guarda. Mismo sitio,
   miembro activo con acceso a «Lo que vendes» (parte cat), datos revisados AQUÍ y en lib/transporte.ts, una línea en la auditoría
   y los filtros de Buscar recalculados. «Quedan» no se edita: se edita lo vendido en la oficina. */
import { mismoOrigen } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { accesoPanel } from "@/lib/panel";
import { guardarTrans, recalcularFiltrosTrans, salidaHoy, venderFuera, type TransIn } from "@/lib/transporte";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
async function entrar(id: unknown) { if (!(await mismoOrigen())) return null; return typeof id === "string" ? accesoPanel(id, "cat") : null; }

export async function transGuardar(negocio: string, p: TransIn): Promise<Res> {
  const a = await entrar(negocio); if (!a) return SIN_ACCESO;
  return tx(async (c) => {
    const k = (await c.query<{ cat: string }>(`select category_id as cat from businesses where id = $1 for update`, [a.negocio.id])).rows[0]?.cat;
    if (k !== "NEG-TRANS") return no("Esto es para Transporte.", "This is for transport businesses.");
    const r = await guardarTrans(c, a.negocio.id, p ?? {}, a.yo.id);
    if (!r.ok) return no(r.es, r.en);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('user', $1, 'transporte.herramienta', 'business', $2, $3, $4::jsonb)`,
      [a.yo.id, a.negocio.id, a.negocio.city_id, JSON.stringify(p ?? {})]);
    await recalcularFiltrosTrans(c, a.negocio.id);
    return { ok: true };
  });
}
export async function transFuera(negocio: string, run: string, delta: number): Promise<Res> {
  const a = await entrar(negocio); if (!a) return SIN_ACCESO;
  return tx(async (c) => {
    const r = await venderFuera(c, a.negocio.id, String(run ?? ""), Number(delta));
    if (!r.ok) return no(r.es, r.en);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('user', $1, 'transporte.vendido_fuera', 'business', $2, $3, $4::jsonb)`,
      [a.yo.id, a.negocio.id, a.negocio.city_id, JSON.stringify({ salida: run, cambio: Number(delta) })]);
    return { ok: true };
  });
}
export async function transSalida(negocio: string, run: string, sale: boolean): Promise<Res> {
  const a = await entrar(negocio); if (!a) return SIN_ACCESO;
  return tx(async (c) => {
    const r = await salidaHoy(c, a.negocio.id, String(run ?? ""), !!sale);
    if (!r.ok) return no(r.es, r.en);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('user', $1, 'transporte.salida', 'business', $2, $3, $4::jsonb)`,
      [a.yo.id, a.negocio.id, a.negocio.city_id, JSON.stringify({ salida: run, sale: !!sale })]);
    return { ok: true };
  });
}
