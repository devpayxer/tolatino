"use server";
/* El total por escrito desde el panel (4l-2): pasó la consulta, mandar el total (versión nueva) y terminó el trámite. Pide
   «Hoy y pedidos» (ord); el servidor calcula el total; todo queda en la auditoría. */
import { mismoOrigen } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { accesoPanel } from "@/lib/panel";
import { mandarTotal, pasoPro, type TotalIn } from "@/lib/total-escrito";
import type { Res } from "./acciones";

const SIN_ACCESO: Res = { ok: false, mensaje: { es: "No tienes acceso a esta parte del panel.", en: "You don’t have access to this part of the dashboard." } };
async function auditar(negocio: string, city: string, actor: string, action: string, numero: string, after: unknown) {
  await db().query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, null, $5::jsonb)`,
    [actor, action, negocio, city, JSON.stringify({ consulta: numero, ...(after as object) })]);
}
export async function proPaso(negocio: string, numero: string, paso: "consulta" | "terminado"): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof negocio === "string" ? await accesoPanel(negocio, "ord") : null;
  if (!a || !["consulta", "terminado"].includes(paso)) return SIN_ACCESO;
  const r = await pasoPro(a.negocio.id, String(numero ?? ""), paso, a.yo.id);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a.negocio.id, a.negocio.city_id, a.yo.id, paso === "consulta" ? "consulta.paso" : "tramite.terminado", String(numero), {});
  return { ok: true };
}
export async function totalMandar(negocio: string, numero: string, f: TotalIn): Promise<Res> {
  if (!(await mismoOrigen())) return SIN_ACCESO;
  const a = typeof negocio === "string" ? await accesoPanel(negocio, "ord") : null;
  if (!a) return SIN_ACCESO;
  const r = await mandarTotal(a.negocio.id, String(numero ?? ""), f && typeof f === "object" ? f : { fee: 0, gov: 0 }, a.yo.id);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a.negocio.id, a.negocio.city_id, a.yo.id, "total.mandar", String(numero), { honorario: `$${Math.round(Number(f.fee)) / 100}`, gobierno: `$${Math.round(Number(f.gov ?? 0)) / 100}` });
  return { ok: true };
}
