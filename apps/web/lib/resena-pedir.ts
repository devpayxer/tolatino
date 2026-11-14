import "server-only";
import { db } from "./db";

/* 9n-2 · «Pedir reseña» en un pedido entregado (L248): el negocio le pregunta al cliente «¿Cómo estuvo?» por la campana y, si no abrió la app, por SMS.
   Reglas (las decide el servidor): solo un pedido ENTREGADO de ESTE negocio; dentro de los 14 días; UNA vez por pedido (pedirlo otra vez no manda otro
   aviso); una vez cada 7 días por cliente en el mismo negocio (no se le insiste); y no si ya escribió su reseña. Nada se borra: `review_requests` solo se
   inserta. El cliente nunca ve a quién se lo pidió dentro del negocio; ve «{negocio} quiere saber cómo estuvo» y su pedido, donde ya escribe su reseña (2g). */
type Bi = { es: string; en: string };
export type ResPedir = { ok: true } | { ok: false; msg: Bi };
const no = (es: string, en: string): ResPedir => ({ ok: false, msg: { es, en } });

export type EstadoPedir = { puede: boolean; pedida: string | null; hecha: boolean; motivo: Bi | null };

/* Lo que el panel muestra en un pedido entregado. */
export async function estadoPedirResena(negocio: string, numero: string): Promise<EstadoPedir> {
  const r = (await db().query<{ id: string; uid: string; st: string; dias: number; pedida: string | null; hecha: boolean; reciente: boolean }>(
    `select o.id::text, o.user_id::text as uid, o.status as st, floor(extract(epoch from now() - coalesce(o.done_at, o.updated_at)) / 86400)::int as dias,
            (select q.requested_at::text from review_requests q where q.operation_id = o.id) as pedida,
            exists (select 1 from reviews v where v.operation_id = o.id and v.status <> 'removed') as hecha,
            exists (select 1 from review_requests q where q.business_id = o.business_id and q.user_id = o.user_id and q.requested_at > now() - interval '7 days' and q.operation_id <> o.id) as reciente
       from operations o where o.business_id = $1 and o.number = $2 and o.kind = 'order'`, [negocio, numero])).rows[0];
  if (!r || r.st !== "done") return { puede: false, pedida: null, hecha: false, motivo: null };
  if (r.hecha) return { puede: false, pedida: r.pedida, hecha: true, motivo: null };
  if (r.pedida) return { puede: false, pedida: r.pedida, hecha: false, motivo: null };
  if (r.dias > 14) return { puede: false, pedida: null, hecha: false, motivo: { es: "Pasaron más de 14 días: ya no se pide.", en: "More than 14 days have passed: it can no longer be asked." } };
  if (r.reciente) return { puede: false, pedida: null, hecha: false, motivo: { es: "Ya le pediste una reseña esta semana. Espera unos días.", en: "You already asked for a review this week. Wait a few days." } };
  return { puede: true, pedida: null, hecha: false, motivo: null };
}

export async function pedirResena(negocio: string, numero: string, actorId: string): Promise<ResPedir> {
  if (!/^\d{1,12}$/.test(String(numero))) return no("Ese pedido no existe.", "That order does not exist.");
  const e = await estadoPedirResena(negocio, numero);
  if (e.hecha) return no("Ya escribió su reseña.", "They already wrote their review.");
  if (e.pedida) return no("Ya se la pediste.", "You already asked.");
  if (!e.puede) return { ok: false, msg: e.motivo ?? { es: "Ese pedido todavía no se entrega.", en: "That order has not been delivered yet." } };
  const o = (await db().query<{ id: string; uid: string; city: string; negocio: string }>(
    `select o.id::text, o.user_id::text as uid, o.city_id as city, b.name as negocio from operations o join businesses b on b.id = o.business_id where o.business_id = $1 and o.number = $2 and o.kind = 'order'`, [negocio, numero])).rows[0];
  if (!o) return no("Ese pedido no existe.", "That order does not exist.");
  // El índice único por pedido es el candado: dos toques a la vez mandan UN solo aviso.
  const ins = await db().query(`insert into review_requests (operation_id, business_id, city_id, user_id, requested_by) values ($1::bigint, $2, $3, $4::uuid, $5::uuid) on conflict (operation_id) do nothing`, [o.id, negocio, o.city, o.uid, actorId]);
  if (!ins.rowCount) return no("Ya se la pediste.", "You already asked.");
  await db().query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, after) values ('user', $1, 'pedido.pedir_resena', 'business', $2, $3, $4::jsonb)`, [actorId, negocio, o.city, JSON.stringify({ pedido: `#${numero}` })]);
  const { avisar } = await import("./avisos");
  await avisar(o.uid, "resena_pedir", { negocio: o.negocio, num: numero }, { href: `/pedido/${numero}`, ref: ["order", numero] });
  return { ok: true };
}
