"use server";
/* «Esta noche» desde el panel (4na · fase4-noche.md §4na y §5): cada toque se guarda. Mismo sitio, miembro activo con acceso a
   «Lo que vendes» (parte cat), datos revisados AQUÍ y en lib/noche.ts, su fila en night_posts (lo hace guardarNoche en la misma
   transacción), una línea en la auditoría y la tarjeta y los filtros de Buscar recalculados. La fila también se cambia desde Hoy
   (la puerta): con acceso a «Hoy y pedidos» (parte ord) basta. */
import { mismoOrigen } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { guardarNoche, recalcularFiltrosNoche } from "@/lib/noche";
import type { NocheIn } from "@/lib/noche-comun";
import { accesoPanel } from "@/lib/panel";
import type { Res } from "./acciones";

const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");

async function guardar(a: NonNullable<Awaited<ReturnType<typeof accesoPanel>>>, p: NocheIn, accion: string): Promise<Res> {
  return tx(async (c) => {
    const k = (await c.query<{ cat: string }>(`select category_id as cat from businesses where id = $1 for update`, [a.negocio.id])).rows[0]?.cat;
    if (k !== "NEG-NOCHE") return no("Esto es para Vida Nocturna.", "This is for nightlife businesses.");
    const r = await guardarNoche(c, a.negocio.id, p ?? {}, a.yo.id);
    if (!r.ok) return no(r.es, r.en);
    await c.query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('user', $1, $2, 'business', $3, $4, $5::jsonb)`,
      [a.yo.id, accion, a.negocio.id, a.negocio.city_id, JSON.stringify(p ?? {})]);
    await recalcularFiltrosNoche(c, a.negocio.id);
    return { ok: true };
  });
}
export async function nocheGuardar(negocio: string, p: NocheIn): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof negocio === "string" ? await accesoPanel(negocio, "cat") : null;
  if (!a) return SIN_ACCESO;
  return guardar(a, p, "noche.herramienta");
}
/* Atajo de Hoy: solo la fila (basta «Hoy y pedidos» o «Lo que vendes»). */
export async function nocheFila(negocio: string, min: number): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof negocio === "string" ? (await accesoPanel(negocio, "ord")) ?? (await accesoPanel(negocio, "cat")) : null;
  if (!a) return SIN_ACCESO;
  return guardar(a, { fila: Number(min) }, "noche.fila");
}
