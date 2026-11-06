"use server";
/* ADM-NEG · 360° › Dinero · acciones: pausar y reanudar los pagos al banco de un negocio (prototipo payHold). Permiso
   tx:aprobar, solo negocios de tus ciudades, con motivo y en la auditoría. Se sigue cobrando; lo cobrado no sale al banco
   hasta reanudar. Con Stripe real el calendario de pagos pasa a manual; si Stripe no responde, no cambia nada. */
import { auditar, staff } from "@/lib/admin";
import { avisarNegocio } from "@/lib/avisos";
import { db, tx } from "@/lib/db";
import { pasarela } from "@/lib/pagos/pasarela";
import type { ResAdm } from "./acciones-colas";

export async function pagosPausar(negocio: string, pausar: boolean, motivo: string): Promise<ResAdm> {
  const s = await staff();
  if (!s || !s.puede("tx", "aprobar")) return { ok: false, mensaje: "Tu rol no pausa pagos." };
  const m = String(motivo ?? "").trim().slice(0, 300), id = String(negocio ?? "");
  if (m.length < 3) return { ok: false, mensaje: "Escribe el motivo: queda en la auditoría." };
  const a = (await db().query<{ acct: string; paused: boolean; city: string; name: string }>(
    `select a.stripe_account_id as acct, a.payouts_paused as paused, b.city_id as city, b.name from stripe_accounts a join businesses b on b.id = a.business_id
      where a.business_id = $1 and (cardinality($2::text[]) = 0 or b.city_id = any($2::text[]))`, [id, s.cities])).rows[0];
  if (!a) return { ok: false, mensaje: "Ese negocio no tiene cuenta de cobro en tus ciudades." };
  if (a.paused === !!pausar) return { ok: true, mensaje: pausar ? "Los pagos ya estaban en pausa." : "Los pagos ya estaban activos." };
  if (!(await pasarela.cuentaPagos(a.acct, !!pausar))) return { ok: false, mensaje: "Stripe no respondió. No cambió nada; inténtalo otra vez." };
  const hecho = await tx(async (c) => {
    const r = await c.query(`update stripe_accounts set payouts_paused = $2, paused_reason = case when $2 then $3 else null end, paused_at = case when $2 then now() else null end,
                                   paused_by = case when $2 then $4::uuid else null end, updated_at = now() where business_id = $1 and payouts_paused <> $2`, [id, !!pausar, m, s.id]);
    if (!r.rowCount) return false;
    await auditar(c, { actor: s.id, action: pausar ? "negocio.pagos.pausar" : "negocio.pagos.reanudar", targetKind: "business", targetId: id, city: a.city,
      before: { pagos: pausar ? "activos" : "en pausa" }, after: { pagos: pausar ? "en pausa" : "activos" }, reason: m });
    return true;
  });
  if (!hecho) return { ok: true, mensaje: "Ya estaba así." };
  await avisarNegocio(id, pausar ? "pay_hold" : "pay_resume", { negocio: a.name }, { href: `/panel/${id}/cobros` }).catch(() => undefined);
  return { ok: true, mensaje: pausar ? "Pagos en pausa. El dueño recibió el aviso." : "Pagos reanudados: salen el próximo martes." };
}
