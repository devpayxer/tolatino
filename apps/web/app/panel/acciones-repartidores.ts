"use server";
import { mismoOrigen, normalizarTelefono } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { accesoPanel, type Acceso } from "@/lib/panel";
import { asignarRepartidor, invitarRepartidor, quitarRepartidor } from "@/lib/repartidor";
import type { Res } from "./acciones";

/* Tus repartidores y el despacho (Panel › Entrega y el detalle del pedido). Invitar y quitar piden «Entrega» (dlv);
   asignar un pedido, «Hoy y pedidos» (ord) o «Entrega». Todo queda en la auditoría. */
const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
async function entrar(id: unknown, ...partes: string[]): Promise<Acceso | null> {
  if (!(await mismoOrigen()) || typeof id !== "string") return null;
  for (const p of partes) { const a = await accesoPanel(id, p); if (a) return a; }
  return null;
}
async function auditar(a: Acceso, action: string, after: unknown) {
  await db().query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, null, $5::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(after ?? null)]);
}

export async function repInvitar(id: string, nombre: string, tel: string): Promise<Res & { codigo?: string }> {
  const a = await entrar(id, "dlv");
  if (!a) return SIN_ACCESO;
  const t = normalizarTelefono(String(tel ?? ""));
  if (!t) return no("Escribe su teléfono de 10 números.", "Write their 10-digit phone.");
  const r = await invitarRepartidor(a.negocio.id, a.yo.id, String(nombre ?? ""), t);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "repartidor.invitar", { nombre: String(nombre ?? "").trim().slice(0, 40), telefono: `··${t.slice(-4)}` });
  return { ok: true, codigo: r.codigo };
}
export async function repQuitar(id: string, rid: string, motivo: string): Promise<Res> {
  const a = await entrar(id, "dlv");
  if (!a) return SIN_ACCESO;
  const r = await quitarRepartidor(a.negocio.id, String(rid ?? ""), String(motivo ?? ""));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "repartidor.quitar", { repartidor: String(rid) });
  return { ok: true };
}
export async function repAsignar(id: string, numero: string, rid: string | null): Promise<Res> {
  const a = await entrar(id, "ord", "dlv");
  if (!a) return SIN_ACCESO;
  const r = await asignarRepartidor(a.negocio.id, String(numero ?? ""), rid === null ? null : String(rid), a.yo.id);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, rid ? "pedido.asignar_repartidor" : "pedido.quitar_repartidor", { pedido: `#${numero}` });
  if (r.aviso) await (await import("@/lib/avisos")).avisar(r.aviso.uid, "drv_assigned", r.aviso.vars, { href: `/repartidor?p=${numero}`, ref: ["order", String(numero)] });
  return { ok: true };
}
