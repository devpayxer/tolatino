"use server";
import { avisarAyuda } from "@/lib/ayuda";
import { avisarPedido } from "@/lib/avisos";
import { mismoOrigen } from "@/lib/cuenta";
import { db, tx } from "@/lib/db";
import { accesoPanel, type Acceso } from "@/lib/panel";
import { cambiarPaso, guardarSeguimiento, type Paso } from "@/lib/pedidos";
import { responderAyuda } from "@/lib/ayuda";
import type { Res } from "./acciones";

/* Pedidos desde el panel (Panel v2 · Hoy, Clientes y Lo que vendes › Pedidos en línea). Responder y mover un pedido
   pide acceso a «Hoy y pedidos» (ord); los ajustes de Pedidos en línea, a «Lo que vendes» (cat). Cada paso queda en la
   línea de tiempo del pedido y en la auditoría. */
const no = (es: string, en: string): Res => ({ ok: false, mensaje: { es, en } });
const SIN_ACCESO = no("No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
const PASOS = new Set<Paso>(["aceptar", "rechazar", "listo", "encamino", "entregado"]);
const ACCION: Record<Paso, string> = { aceptar: "pedido.aceptar", rechazar: "pedido.rechazar", listo: "pedido.listo", encamino: "pedido.en_camino", entregado: "pedido.entregado" };
const PASO_L: Record<Paso, string> = { aceptar: "Aceptado", rechazar: "Rechazado", listo: "Listo para recoger", encamino: "Salió en camino", entregado: "Entregado" };

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
  const AV = { aceptar: "ord_ok", rechazar: "ord_no", listo: "ord_ready", encamino: "ord_way" } as const;
  if (paso in AV) await avisarPedido(String(numero), AV[paso as keyof typeof AV]);
  return { ok: true };
}

/* 9n-2 · «Pedir reseña» (L248) en un pedido entregado: el cliente recibe «¿Cómo estuvo?» (campana y, si no abre la app, SMS). Una vez por pedido. */
export async function pedidoPedirResena(id: string, numero: string): Promise<Res> {
  const a = await entrar(id, "ord");
  if (!a) return SIN_ACCESO;
  const r = await (await import("@/lib/resena-pedir")).pedirResena(a.negocio.id, String(numero ?? ""), a.yo.id);
  return r.ok ? { ok: true } : { ok: false, mensaje: r.msg };
}

/* Delivery con una app externa: el enlace de seguimiento del pedido (el cliente lo ve en su pedido). */
export async function pedidoSeguimiento(id: string, numero: string, url: string): Promise<Res> {
  const a = await entrar(id, "ord");
  if (!a) return SIN_ACCESO;
  const r = await guardarSeguimiento(a.negocio.id, String(numero ?? ""), String(url ?? ""), a.yo.id);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "pedido.seguimiento", { pedido: `#${numero}` }, { pedido: `#${numero}`, enlace: String(url).slice(0, 300) });
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
export async function pedidosAjustes(id: string, p: { prep: number; sched: boolean; auto: boolean; cashP: boolean; cashD?: boolean; tip?: boolean; card?: boolean }): Promise<Res> {
  const a = await entrar(id, "cat");
  if (!a) return SIN_ACCESO;
  const prep = Math.round(Number(p?.prep));
  if (!(prep >= 5 && prep <= 120 && prep % 5 === 0)) return no("El tiempo de preparación va de 5 a 120 minutos.", "Prep time goes from 5 to 120 minutes.");
  // La tarjeta llega con los cobros: cada forma de entrega encendida necesita su efectivo, o nadie podría pagar.
  const e = (await db().query<{ pickup: boolean; delivery: boolean; who: string; cargos: boolean }>(
    `select coalesce(d.pickup, true) as pickup, coalesce(d.delivery, false) as delivery, coalesce(d.who, 'team') as who, coalesce((select charges_enabled from stripe_accounts where business_id = $1), false) as cargos
       from (select $1::text as id) x left join delivery_settings d on d.business_id = x.id`, [a.negocio.id])).rows[0] ?? { pickup: true, delivery: false, who: "team", cargos: false };
  const cashD = !!p.cashD && e.who !== "external"; // con una app externa no se cobra en efectivo al entregar
  // La tarjeta pide la cuenta de cobro activa (Cobros); sin ella, cada forma de entrega necesita su efectivo.
  if (p.card && !e.cargos) return no("Para cobrar con tarjeta, conecta tu cuenta en Cobros.", "To take cards, connect your account in Payouts.");
  const card = !!p.card && e.cargos;
  if (e.pickup && !p.cashP && !card) return no("Para guardar falta: cómo te pagan en pickup.", "To save, add: how they pay for pickup.");
  if (e.delivery && !cashD && !card) return no("Para guardar falta: cómo te pagan en delivery.", "To save, add: how they pay for delivery.");
  const antes = await tx(async (c) => {
    const x = (await c.query<{ prep: number; sched: boolean; auto: boolean; cash: boolean; cashd: boolean; tip: boolean; card: boolean }>(
      `select prep_min as prep, scheduled_orders as sched, auto_accept as auto, pay_cash_pickup as cash, pay_cash_delivery as cashd, ask_tip as tip, pay_card as card from delivery_settings where business_id = $1`, [a.negocio.id])).rows[0] ?? null;
    await c.query(
      `insert into delivery_settings (business_id, prep_min, scheduled_orders, auto_accept, pay_cash_pickup, pay_cash_delivery, ask_tip, pay_card) values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (business_id) do update set prep_min = $2, scheduled_orders = $3, auto_accept = $4, pay_cash_pickup = $5, pay_cash_delivery = $6, ask_tip = $7, pay_card = $8, updated_at = now()`,
      [a.negocio.id, prep, !!p.sched, !!p.auto, !!p.cashP, cashD, p.tip !== false, card]);
    return x;
  });
  const si = (v: boolean | undefined) => (v === undefined ? null : v ? "Sí" : "No");
  await auditar(a, "pedidos.ajustes",
    antes ? { preparacion: `${antes.prep} min`, programados: si(antes.sched), aceptar_al_instante: si(antes.auto), efectivo_al_recoger: si(antes.cash), efectivo_al_entregar: si(antes.cashd), propina: si(antes.tip), tarjeta: si(antes.card) } : null,
    { preparacion: `${prep} min`, programados: si(!!p.sched), aceptar_al_instante: si(!!p.auto), efectivo_al_recoger: si(!!p.cashP), efectivo_al_entregar: si(cashD), propina: si(p.tip !== false), tarjeta: si(card) });
  return { ok: true };
}

/* Entrega (DASH-ENTREGA): cómo entregas, zona y costo, tiempos y quién lleva. Pide el permiso «Entrega» (dlv). */
export type EntregaIn = { delivery: boolean; pickup: boolean; pkNote: string; zone: number; fee: number; free: number; min: number; travel: number; dEnd: number; who: "team" | "external"; ext: string | null };
const ZONAS = [1, 3, 5, 10], ENVIOS = [0, 200, 300, 400, 500], GRATIS = [0, 2500, 4000, 6000], MINIMOS = [0, 1000, 1500, 2000, 2500], CAMINO = [10, 15, 20], ULTIMO = [0, 30, 60];
export async function entregaAjustes(id: string, p: EntregaIn): Promise<Res> {
  const a = await entrar(id, "dlv");
  if (!a) return SIN_ACCESO;
  if (!p?.delivery && !p?.pickup) return no("Para guardar falta: una forma de entrega.", "To save, add: a delivery method.");
  const n = (v: unknown, ok: number[]) => ok.includes(Number(v));
  if (!n(p.zone, ZONAS) || !n(p.fee, ENVIOS) || !n(p.free, GRATIS) || !n(p.min, MINIMOS) || !n(p.travel, CAMINO) || !n(p.dEnd, ULTIMO) || !["team", "external"].includes(p.who))
    return no("Revisa la zona, el costo y los tiempos.", "Check the area, fee and times.");
  const ext = p.who === "external" && ["doordash", "uber_eats", "other"].includes(String(p.ext)) ? String(p.ext) : null;
  if (p.who === "external" && !ext) return no("Elige cuál app externa lleva tus pedidos.", "Pick which external app delivers your orders.");
  const nota = String(p.pkNote ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  const antes = await tx(async (c) => {
    const x = (await c.query<Record<string, unknown>>(
      `select pickup, delivery, zone_mi, fee_cents, free_over_cents, min_order_cents, travel_min, last_delivery_min, who, external_app, pickup_note->>'es' as nota from delivery_settings where business_id = $1`, [a.negocio.id])).rows[0] ?? null;
    await c.query(
      `insert into delivery_settings (business_id, pickup, delivery, pickup_note, zone_mi, fee_cents, free_over_cents, min_order_cents, travel_min, last_delivery_min, who, external_app)
       values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12)
       on conflict (business_id) do update set pickup = $2, delivery = $3, pickup_note = $4::jsonb, zone_mi = $5, fee_cents = $6, free_over_cents = $7, min_order_cents = $8,
         travel_min = $9, last_delivery_min = $10, who = $11, external_app = $12,
         pay_cash_delivery = case when $11 = 'external' then false else delivery_settings.pay_cash_delivery end, updated_at = now()`,
      [a.negocio.id, !!p.pickup, !!p.delivery, nota ? JSON.stringify({ es: nota, en: nota }) : null, Number(p.zone), Number(p.fee), Number(p.free), Number(p.min), Number(p.travel), Number(p.dEnd), p.who, ext]);
    return x;
  });
  const usd = (c: unknown) => (Number(c) ? `$${(Number(c) / 100).toFixed(0)}` : "—");
  const L = (x: Record<string, unknown> | null) => x && { pickup: x.pickup ? "Sí" : "No", delivery: x.delivery ? "Sí" : "No", zona: `${x.zone_mi} mi`, envio: usd(x.fee_cents), gratis_desde: usd(x.free_over_cents),
    minimo: usd(x.min_order_cents), camino: `${x.travel_min} min`, quien: x.who === "external" ? `App externa (${x.external_app})` : "Mi equipo", nota: x.nota ?? "" };
  await auditar(a, "entrega.ajustes", L(antes), L({ pickup: p.pickup, delivery: p.delivery, zone_mi: p.zone, fee_cents: p.fee, free_over_cents: p.free, min_order_cents: p.min, travel_min: p.travel, who: p.who, external_app: ext, nota }));
  return { ok: true };
}

/* Ayuda con el pedido: el negocio responde la solicitud del cliente (24 h). Pide acceso a «Hoy y pedidos». */
export async function ayudaResponder(id: string, numero: string, texto: string): Promise<Res> {
  const a = await entrar(id, "ord");
  if (!a) return SIN_ACCESO;
  const r = await responderAyuda(a.negocio.id, String(numero ?? ""), String(texto ?? ""), a.yo.id);
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "pedido.ayuda.responder", { pedido: String(numero) }, { respuesta: String(texto).trim().slice(0, 120) });
  await avisarAyuda(String(numero), "help_reply");
  return { ok: true };
}

/* Devolver dinero de un pedido pagado con tarjeta (total o parcial, con motivo). Solo el dueño (Cobros): mueve dinero.
   La comisión de To'Latino baja en proporción; el cliente recibe el aviso. Idempotente por la clave del intento. */
export async function pedidoDevolver(id: string, numero: string, centavos: number, motivo: string, clave: string): Promise<Res> {
  const a = await entrar(id, "pay");
  if (!a) return no("Solo el dueño puede devolver dinero.", "Only the owner can refund money.");
  if (!/^\d{1,12}$/.test(String(numero ?? "")) || !/^[0-9a-f-]{36}$/.test(String(clave ?? ""))) return no("Ese pedido no existe.", "That order does not exist.");
  const m = String(motivo ?? "").trim();
  if (m.length < 3) return no("Escribe el motivo: lo ve el cliente.", "Write the reason: the client sees it.");
  const p = (await db().query<{ id: string }>(
    `select p.id::text from payments p join operations o on o.id = p.operation_id where o.business_id = $1 and o.number = $2 and o.kind = 'order' and p.kind = 'full'`, [a.negocio.id, String(numero)])).rows[0];
  if (!p) return no("Este pedido no se pagó con tarjeta.", "This order was not paid by card.");
  const { devolverPago } = await import("@/lib/cobros");
  const r = await devolverPago({ paymentId: p.id, centavos: Math.round(Number(centavos)), por: "business", actorId: a.yo.id, motivo: m, idem: `neg-${clave}` });
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "pedido.devolver", { pedido: `#${numero}` }, { pedido: `#${numero}`, monto: `$${(Math.round(Number(centavos)) / 100).toFixed(2)}`, motivo: m.slice(0, 120) });
  return { ok: true };
}
