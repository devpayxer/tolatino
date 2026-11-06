"use server";
import { mismoOrigen } from "@/lib/cuenta";
import { db, tx } from "@/lib/db";
import { accesoPanel, type Acceso } from "@/lib/panel";
import { cambiarPaso, type Paso } from "@/lib/pedidos";
import type { Res } from "./acciones";

/* Pedidos desde el panel (Panel v2 · Hoy, Clientes y Lo que vendes › Pedidos en línea). Responder y mover un pedido
   pide acceso a «Hoy y pedidos» (ord); los ajustes de Pedidos en línea, a «Lo que vendes» (cat). Cada paso queda en la
   línea de tiempo del pedido y en la auditoría. */
const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
const PASOS = new Set<Paso>(["aceptar", "rechazar", "listo", "entregado"]);
const ACCION: Record<Paso, string> = { aceptar: "pedido.aceptar", rechazar: "pedido.rechazar", listo: "pedido.listo", entregado: "pedido.entregado" };
const PASO_L: Record<Paso, string> = { aceptar: "Aceptado", rechazar: "Rechazado", listo: "Listo para recoger", entregado: "Entregado" };

async function entrar(id: unknown, parte: string): Promise<Acceso | null> {
  if (!(await mismoOrigen())) return null;
  return typeof id === "string" ? accesoPanel(id, parte) : null;
}
async function auditar(a: Acceso, action: string, before: unknown, after: unknown) {
  await db().query(
    `insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, $2, 'business', $3, $4, $5::jsonb, $6::jsonb)`,
    [a.yo.id, action, a.negocio.id, a.negocio.city_id, JSON.stringify(before ?? null), JSON.stringify(after ?? null)]);
}

/* Aceptar · Rechazar · Listo para recoger · Entregado. */
export async function pedidoPaso(id: string, numero: string, paso: Paso): Promise<Res> {
  const a = await entrar(id, "ord");
  if (!a) return SIN_ACCESO;
  if (!PASOS.has(paso)) return no("Esa acción no existe.", "That action does not exist.");
  const r = await cambiarPaso(a.negocio.id, String(numero ?? ""), paso, a.yo.id);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, ACCION[paso], { pedido: `#${numero}` }, { pedido: `#${numero}`, paso: PASO_L[paso] });
  return { ok: true };
}

/* Encender o apagar el módulo Pedidos en línea (la página sigue con su menú). */
export async function pedidosModulo(id: string, on: boolean): Promise<Res> {
  const a = await entrar(id, "cat");
  if (!a) return SIN_ACCESO;
  await db().query(
    `update businesses set modules_on = case when $2 then array(select distinct x from unnest(modules_on || array['pedidos']) x) else array_remove(modules_on, 'pedidos') end, updated_at = now() where id = $1`,
    [a.negocio.id, !!on]);
  await auditar(a, on ? "pedidos.encender" : "pedidos.apagar", null, { modulo: "Pedidos en línea", estado: on ? "Encendido" : "Apagado" });
  return { ok: true };
}

/* Pedidos en línea: tiempo de preparación, programados, aceptar al instante y efectivo al recoger. */
export async function pedidosAjustes(id: string, p: { prep: number; sched: boolean; auto: boolean; cashP: boolean }): Promise<Res> {
  const a = await entrar(id, "cat");
  if (!a) return SIN_ACCESO;
  const prep = Math.round(Number(p?.prep));
  if (!(prep >= 5 && prep <= 120 && prep % 5 === 0)) return no("El tiempo de preparación va de 5 a 120 minutos.", "Prep time goes from 5 to 120 minutes.");
  // Hoy solo hay pickup y la tarjeta llega con los cobros: sin efectivo al recoger, nadie podría pagar.
  if (!p.cashP) return no("Para guardar falta: cómo te pagan en pickup.", "To save, add: how they pay for pickup.");
  const antes = await tx(async (c) => {
    const x = (await c.query<{ prep: number; sched: boolean; auto: boolean; cash: boolean }>(
      `select prep_min as prep, scheduled_orders as sched, auto_accept as auto, pay_cash_pickup as cash from delivery_settings where business_id = $1`, [a.negocio.id])).rows[0] ?? null;
    await c.query(
      `insert into delivery_settings (business_id, prep_min, scheduled_orders, auto_accept, pay_cash_pickup) values ($1, $2, $3, $4, $5)
       on conflict (business_id) do update set prep_min = $2, scheduled_orders = $3, auto_accept = $4, pay_cash_pickup = $5, updated_at = now()`,
      [a.negocio.id, prep, !!p.sched, !!p.auto, !!p.cashP]);
    return x;
  });
  const si = (v: boolean | undefined) => (v === undefined ? null : v ? "Sí" : "No");
  await auditar(a, "pedidos.ajustes",
    antes ? { preparacion: `${antes.prep} min`, programados: si(antes.sched), aceptar_al_instante: si(antes.auto), efectivo_al_recoger: si(antes.cash) } : null,
    { preparacion: `${prep} min`, programados: si(!!p.sched), aceptar_al_instante: si(!!p.auto), efectivo_al_recoger: si(!!p.cashP) });
  return { ok: true };
}
