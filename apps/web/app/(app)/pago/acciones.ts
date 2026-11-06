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
  const n = (await db().query<{ n: number }>(`select count(*)::int as n from payment_methods where user_id = $1 and status = 'active'`, [u.id])).rows[0]!.n;
  if (n >= 10) return no("Tienes 10 tarjetas guardadas. Quita una en Mi cuenta.", "You have 10 saved cards. Remove one in My account.");
  let t: { pm: string; marca: string; l4: string; vence: string; sim: boolean };
  if (pasarela.modo() === "simulador") {
    const m = /^pm_sim_(visa|mc|amex|disc)_(\d{4})$/.exec(String(pm ?? ""));
    if (!m || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(String(vence ?? ""))) return no("Revisa la tarjeta.", "Check the card.");
    t = { pm: `${m[0]}_${randomBytes(4).toString("hex")}`, marca: m[1]!, l4: m[2]!, vence: String(vence), sim: true };
  } else if (pasarela.modo() === "stripe") {
    if (!/^pm_[A-Za-z0-9]{6,60}$/.test(String(pm ?? ""))) return no("Revisa la tarjeta.", "Check the card.");
    try {
      const cliente = await pasarela.cliente(u.id);
      const x = await stripe<{ id: string; card: { brand: string; last4: string; exp_month: number; exp_year: number } }>("POST", `/v1/payment_methods/${pm}/attach`, { customer: cliente });
      t = { pm: x.id, marca: x.card.brand, l4: x.card.last4, vence: `${String(x.card.exp_month).padStart(2, "0")}/${String(x.card.exp_year).slice(-2)}`, sim: false };
    } catch { return no("Stripe no pudo guardar la tarjeta. Úsala sin guardar o prueba otra.", "Stripe could not save the card. Use it without saving or try another."); }
  } else return no("El pago con tarjeta no está disponible.", "Card payment is not available.");
  const ya = (await db().query<{ pm: string }>(`select stripe_pm_id as pm from payment_methods where user_id = $1 and status = 'active' and brand = $2 and last4 = $3 and exp = $4`, [u.id, t.marca, t.l4, t.vence])).rows[0];
  if (ya) return { ok: true, tarjeta: { pm: ya.pm, marca: t.marca, ultimos4: t.l4, vence: t.vence, def: n === 0 } };
  await db().query(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, simulated) values ($1, $2, $3, $4, $5, $6, $7)`, [u.id, t.pm, t.marca, t.l4, t.vence, n === 0, t.sim]);
  return { ok: true, tarjeta: { pm: t.pm, marca: t.marca, ultimos4: t.l4, vence: t.vence, def: n === 0 } };
}
