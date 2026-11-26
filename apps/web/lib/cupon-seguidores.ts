import "server-only";
import type { QueryResult, QueryResultRow } from "pg";
import { db } from "./db";

/* 9n-21 · Cupón para seguidores (0169; diseño: Novedades «Cupón para seguidores» y el pago con «Código de cupón»). Lo decide SIEMPRE el servidor: el
   código lo escribe la persona, pero el descuento, si vale y cuánto, salen de la novedad del negocio. Vale si:
     · es una novedad «cupón» de ESE negocio, en vivo (publicada, sin terminar, sin ocultar) y con ese código;
     · quien pide sigue al negocio;
     · no lo ha usado (una vez por persona; si su pedido no siguió, el uso volvió: trigger operations_cupon_vuelve);
     · quedan usos (los «usado» no pasan de coupon_uses; crearPedido lo cuenta con el candado del negocio puesto);
     · el subtotal llega a la compra mínima.
   cuponDe() lo usa crearPedido dentro de su transacción; revisarCupon() solo responde «Aplicar» en la pantalla (no aparta nada). */
type Q = { query: <R extends QueryResultRow = any>(text: string, values?: unknown[]) => Promise<QueryResult<R>> };
type Bi = { es: string; en: string };
export type Cupon = { ok: true; post: string; code: string; off: number; min: number } | { ok: false; msg: Bi };
import { usd as money } from "./dinero-comun";
export const CODIGO = /^[A-Z0-9]{4,12}$/;

export async function cuponDe(c: Q, negocio: string, codigo: string, userId: string, sub: number): Promise<Cupon> {
  const code = String(codigo ?? "").trim().toUpperCase();
  const no = (es: string, en: string): Cupon => ({ ok: false, msg: { es, en } });
  if (!CODIGO.test(code)) return no("Este cupón no existe o ya venció.", "This coupon does not exist or has expired.");
  const p = (await c.query<{ id: string; off: number; min: number; uses: number; usados: number; sigue: boolean; mio: boolean }>(
    `select p.id::text, p.coupon_off_cents as off, p.coupon_min_cents as min, p.coupon_uses as uses,
            (select count(*)::int from follower_coupon_uses u where u.post_id = p.id and u.status = 'usado') as usados,
            exists (select 1 from follows f where f.follower_user_id = $3 and f.target_kind = 'business' and f.target_id = p.business_id) as sigue,
            exists (select 1 from follower_coupon_uses u where u.post_id = p.id and u.user_id = $3 and u.status = 'usado') as mio
       from business_posts p
      where p.business_id = $1 and p.kind = 'cupon' and p.coupon_code = $2 and p.status = 'live' and p.hidden_at is null
        and p.publish_at <= now() and p.ends_at > now()
      limit 1`, [negocio, code, userId])).rows[0];
  if (!p) return no("Este cupón no existe o ya venció.", "This coupon does not exist or has expired.");
  if (!p.sigue) return no("Este cupón es para quienes siguen al negocio. Síguelo y vuelve a aplicarlo.", "This coupon is for people who follow the business. Follow it and apply it again.");
  if (p.mio) return no("Ya usaste este cupón.", "You already used this coupon.");
  if (p.usados >= p.uses) return no("Este cupón ya se terminó.", "This coupon has run out.");
  if (sub < p.min) return no(`Este cupón es para pedidos de ${money(p.min)} o más.`, `This coupon is for orders of ${money(p.min)} or more.`);
  return { ok: true, post: p.id, code, off: Math.min(p.off, sub), min: p.min };
}

/* «Aplicar» en el pago: la misma revisión, sin apartar nada (el pedido la repite con el candado puesto). */
export async function revisarCupon(negocio: string, codigo: string, userId: string, sub: number): Promise<Cupon> {
  if (!/^[a-z0-9-]{1,80}$/.test(String(negocio ?? ""))) return { ok: false, msg: { es: "Ese negocio no existe.", en: "That business does not exist." } };
  return cuponDe(db(), negocio, codigo, userId, Math.max(0, Math.min(10_000_000, Math.round(Number(sub) || 0))));
}

/* El impuesto sobre lo que queda: el de cada línea, en la proporción que deja el descuento. */
export const impuestoConDescuento = (impuesto: number, sub: number, desc: number) => (sub > 0 && desc > 0 ? Math.round((impuesto * (sub - desc)) / sub) : impuesto);
