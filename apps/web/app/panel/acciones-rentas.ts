"use server";
import { mismoOrigen } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { accesoPanel } from "@/lib/panel";
import { rentaNegocio, type QueNegocio } from "@/lib/rentas";
import type { Res } from "./acciones";

/* Rentas de herramienta (4f-2) desde el panel: la recogió (se cobra la renta y se retiene el depósito), la devolvió (se
   libera; los días tarde salen del depósito), la devolvió con un daño (foto y monto; el cliente decide) o cancelar el
   apartado. Pide «Hoy y pedidos» (ord). Queda en la auditoría. */
const SIN = { ok: false as const, mensaje: { es: "No tienes acceso a esta parte del panel.", en: "You don’t have access to this part of the dashboard." } };
const QUE = new Set(["recogio", "devolvio", "cancelar", "dano"]);
export async function rentaAccionPanel(id: string, numero: string, a: QueNegocio): Promise<Res> {
  if (!(await mismoOrigen())) return SIN;
  const x = typeof id === "string" ? await accesoPanel(id, "ord") : null;
  if (!x) return SIN;
  if (!a || !QUE.has(String(a.que))) return { ok: false, mensaje: { es: "Esa acción no existe.", en: "That action does not exist." } };
  const r = await rentaNegocio(x.negocio.id, String(numero ?? ""), a, x.yo.id);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await db().query(
    `insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, null, $5::jsonb)`,
    [x.yo.id, `renta.${a.que}`, x.negocio.id, x.negocio.city_id, JSON.stringify({ renta: numero, ...(a.que === "dano" ? { dano_cents: a.cents, nota: a.nota } : {}) })]);
  return { ok: true };
}
