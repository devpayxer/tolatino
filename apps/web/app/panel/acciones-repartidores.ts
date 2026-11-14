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
/* 9n · Ofrecer el pedido con cuenta regresiva (a uno o a todos los que están en línea), cancelar la oferta, confirmar que el repartidor lo
   recogió (sin el código) y lo que pide el negocio (prueba de entrega y código de recogida). */
export async function repOfrecer(id: string, numero: string, rid: string | null): Promise<Res> {
  const a = await entrar(id, "ord", "dlv");
  if (!a) return SIN_ACCESO;
  const { ofrecer } = await import("@/lib/repartidor-ofertas");
  const r = await ofrecer(a.negocio.id, String(numero ?? ""), a.yo.id, rid === null ? null : String(rid));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "pedido.ofrecer_repartidor", { pedido: `#${numero}`, a: rid ? "uno" : "en línea" });
  const { avisar } = await import("@/lib/avisos");
  for (const x of ("avisos" in r ? r.avisos ?? [] : [])) await avisar(x.uid, "drv_oferta", x.vars, { href: "/repartidor", ref: ["order", String(numero)] }).catch(() => undefined);
  return { ok: true };
}
export async function repOfertaCancelar(id: string, numero: string): Promise<Res> {
  const a = await entrar(id, "ord", "dlv");
  if (!a) return SIN_ACCESO;
  const { cancelarOferta } = await import("@/lib/repartidor-ofertas");
  const r = await cancelarOferta(a.negocio.id, String(numero ?? ""));
  if (!r.ok) return { ok: false, mensaje: r.msg };
  await auditar(a, "pedido.cancelar_oferta", { pedido: `#${numero}` });
  return { ok: true };
}
export async function repRecogido(id: string, numero: string): Promise<Res> {
  const a = await entrar(id, "ord", "dlv");
  if (!a) return SIN_ACCESO;
  const n = String(numero ?? "");
  const r = await db().query(`update delivery_codes dc set recogido_at = now() from operations o where o.id = dc.operation_id and o.business_id = $1 and o.number = $2 and o.status = 'confirmed' and o.driver_id is not null and dc.recogido_at is null`, [a.negocio.id, n]);
  if (!r.rowCount) return no("Ese pedido ya no espera que lo recojan.", "That order is no longer waiting for pickup.");
  await auditar(a, "pedido.recogido_sin_codigo", { pedido: `#${n}` });
  return { ok: true };
}
export async function repPruebas(id: string, prueba: boolean, recogida: boolean): Promise<Res> {
  const a = await entrar(id, "dlv");
  if (!a) return SIN_ACCESO;
  await db().query(`insert into delivery_settings (business_id, proof, pickup_code) values ($1, $2, $3) on conflict (business_id) do update set proof = excluded.proof, pickup_code = excluded.pickup_code, updated_at = now()`,
    [a.negocio.id, prueba === true, recogida === true]);
  await auditar(a, "entrega.pruebas", { prueba: prueba === true, recogida: recogida === true });
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
