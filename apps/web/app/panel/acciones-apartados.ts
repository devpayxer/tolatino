"use server";
import { mismoOrigen } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { accesoPanel } from "@/lib/panel";
import { apartadoNegocio, type QueNegocioApt } from "@/lib/apartados";
import type { Res } from "./acciones";

/* Apartados (4f-3) desde el panel: lo tengo, falta uno, no lo tengo, lo recogió. Pide «Hoy y pedidos» (ord). Auditoría. */
const SIN = { ok: false as const, mensaje: { es: "No tienes acceso a esta parte del panel.", en: "You don’t have access to this part of the dashboard." } };
const QUE = new Set(["tengo", "no", "recogio", "falta", "talla", "enviado", "entregado"]);
export async function apartadoAccionPanel(id: string, numero: string, a: QueNegocioApt): Promise<Res> {
  if (!(await mismoOrigen())) return SIN;
  const x = typeof id === "string" ? await accesoPanel(id, "ord") : null;
  if (!x) return SIN;
  if (!a || !QUE.has(String(a.que))) return { ok: false, mensaje: { es: "Esa acción no existe.", en: "That action does not exist." } };
  const r = await apartadoNegocio(x.negocio.id, String(numero ?? ""), a, x.yo.id);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await db().query(
    `insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, null, $5::jsonb)`,
    [x.yo.id, `apartado.${a.que}`, x.negocio.id, x.negocio.city_id, JSON.stringify({ apartado: numero })]);
  return { ok: true };
}
