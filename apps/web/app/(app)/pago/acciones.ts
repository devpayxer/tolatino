"use server";
import { randomBytes } from "node:crypto";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { pasarela } from "@/lib/pagos/pasarela";
import { stripe } from "@/lib/pagos/stripe";

/* Guardar una tarjeta para la próxima (PaymentMethod): solo la referencia de Stripe, la marca, los últimos 4 y el
   vencimiento. El número completo nunca llega a To'Latino: lo toma Stripe (o, en el sandbox, se queda en el navegador). */
type Bi = { es: string; en: string };
export type TarjetaG = { pm: string; marca: string; ultimos4: string; vence: string; def: boolean };
const no = (es: string, en: string) => ({ ok: false as const, msg: { es, en } as Bi });

export async function guardarTarjeta(pm: string, vence: string): Promise<{ ok: true; tarjeta: TarjetaG } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return no("No se pudo. Recarga la página.", "Could not do it. Reload the page.");
  const u = await yo();
  if (!u) return no("Entra para guardar tu tarjeta.", "Sign in to save your card.");
  // 8i · Una cuenta de revisión no guarda tarjetas (la base tampoco lo deja).
  if (await (await import("@/lib/tiendas/revision")).esCuentaRevision(u.id)) return no("Esta es una cuenta de revisión: no guarda tarjetas ni paga con tarjeta.", "This is a review account: it does not save cards or pay by card.");
  const n = (await db().query<{ n: number }>(`select count(*)::int as n from payment_methods where user_id = $1 and status = 'active'`, [u.id])).rows[0]!.n;
  if (n >= 10) return no("Tienes 10 tarjetas guardadas. Quita una en Mi cuenta.", "You have 10 saved cards. Remove one in My account.");
  let t: { pm: string; marca: string; l4: string; vence: string; sim: boolean; huella: string | null };
  if (pasarela.modo() === "simulador") {
    const m = /^pm_sim_(visa|mc|amex|disc)_(\d{4})$/.exec(String(pm ?? ""));
    if (!m || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(String(vence ?? ""))) return no("Revisa la tarjeta.", "Check the card.");
    t = { pm: `${m[0]}_${randomBytes(4).toString("hex")}`, marca: m[1]!, l4: m[2]!, vence: String(vence), sim: true, huella: await pasarela.huella(m[0]) };
  } else if (pasarela.modo() === "stripe") {
    if (!/^pm_[A-Za-z0-9]{6,60}$/.test(String(pm ?? ""))) return no("Revisa la tarjeta.", "Check the card.");
    try {
      const cliente = await pasarela.cliente(u.id);
      const x = await stripe<{ id: string; card: { brand: string; last4: string; exp_month: number; exp_year: number; fingerprint?: string } }>("POST", `/v1/payment_methods/${pm}/attach`, { customer: cliente });
      t = { pm: x.id, marca: x.card.brand, l4: x.card.last4, vence: `${String(x.card.exp_month).padStart(2, "0")}/${String(x.card.exp_year).slice(-2)}`, sim: false, huella: x.card.fingerprint ?? null };
    } catch { return no("Stripe no pudo guardar la tarjeta. Úsala sin guardar o prueba otra.", "Stripe could not save the card. Use it without saving or try another."); }
  } else return no("El pago con tarjeta no está disponible.", "Card payment is not available.");
  const ya = (await db().query<{ pm: string }>(`select stripe_pm_id as pm from payment_methods where user_id = $1 and status = 'active' and brand = $2 and last4 = $3 and exp = $4`, [u.id, t.marca, t.l4, t.vence])).rows[0];
  if (ya) return { ok: true, tarjeta: { pm: ya.pm, marca: t.marca, ultimos4: t.l4, vence: t.vence, def: n === 0 } };
  // 9k · La huella de la tarjeta (card.fingerprint): la misma tarjeta en otra cuenta da la misma (máximo por persona y la señal de Confianza).
  await db().query(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, simulated, card_fingerprint) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [u.id, t.pm, t.marca, t.l4, t.vence, n === 0, t.sim, t.huella && /^[A-Za-z0-9_]{6,64}$/.test(t.huella) ? t.huella : null]);
  return { ok: true, tarjeta: { pm: t.pm, marca: t.marca, ultimos4: t.l4, vence: t.vence, def: n === 0 } };
}

/* 9k · Quitar una tarjeta guardada (L360) desde Mi cuenta › Pagos: queda «removed» (nada se borra) y, con Stripe, se desliga del cliente. Si paga Pro
   de un negocio, no se quita: primero se cambia la tarjeta del plan. La predeterminada pasa a la más nueva que queda. */
export async function quitarTarjeta(pm: string): Promise<{ ok: true } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return no("No se pudo. Recarga la página.", "Could not do it. Reload the page.");
  const u = await yo();
  if (!u) return no("Entra para ver tus tarjetas.", "Sign in to see your cards.");
  if (!/^pm_[A-Za-z0-9_]{3,200}$/.test(String(pm ?? ""))) return no("Esa tarjeta no existe.", "That card does not exist.");
  const t = (await db().query<{ id: string; sim: boolean }>(`select id::text, simulated as sim from payment_methods where user_id = $1 and stripe_pm_id = $2 and status = 'active'`, [u.id, pm])).rows[0];
  if (!t) return no("Esa tarjeta no existe.", "That card does not exist.");
  const pro = (await db().query<{ n: string }>(`select b.name as n from subscriptions s join businesses b on b.id = s.business_id where s.card_pm = $1 and s.status in ('trial', 'active', 'canceling', 'past_due') limit 1`, [pm])).rows[0];
  if (pro) return no(`Esta tarjeta paga Pro de ${pro.n}. Cambia primero la tarjeta del plan en el panel.`, `This card pays ${pro.n} Pro. Change the plan's card in the dashboard first.`);
  if (!t.sim && pasarela.modo() === "stripe") { try { await stripe("POST", `/v1/payment_methods/${pm}/detach`, {}); } catch { /* ya desligada: se quita igual de la lista */ } }
  await db().query(`update payment_methods set status = 'removed', is_default = false where id = $1::bigint and status = 'active'`, [t.id]);
  await db().query(`update payment_methods set is_default = true where id = (select id from payment_methods where user_id = $1 and status = 'active' order by id desc limit 1)
                     and not exists (select 1 from payment_methods where user_id = $1 and status = 'active' and is_default)`, [u.id]);
  return { ok: true };
}

/* 9k · 3-D Secure: después de la hoja, el servidor mira la respuesta del banco (Stripe) y, si se confirmó, la verificación queda hecha y la pantalla
   vuelve a enviar lo mismo. En el sandbox, la hoja contesta por el «banco» simulado. Solo la verificación de quien está en la sesión. */
export async function verificarPago(pi: string): Promise<{ ok: true; listo: boolean } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return no("No se pudo. Recarga la página.", "Could not do it. Reload the page.");
  const u = await yo();
  if (!u) return no("Entra para seguir.", "Sign in to continue.");
  return (await import("@/lib/pagos/verificacion")).confirmarVerificacion(u.id, String(pi ?? ""));
}
export async function bancoSimulado(pi: string, aprobar: boolean): Promise<{ ok: true; listo: boolean } | { ok: false; msg: Bi }> {
  if (!(await mismoOrigen())) return no("No se pudo. Recarga la página.", "Could not do it. Reload the page.");
  const u = await yo();
  if (!u) return no("Entra para seguir.", "Sign in to continue.");
  return (await import("@/lib/pagos/verificacion")).simularBanco(u.id, String(pi ?? ""), !!aprobar);
}
