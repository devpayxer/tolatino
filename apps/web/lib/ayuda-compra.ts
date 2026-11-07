import "server-only";
import { db } from "./db";
import type { CabezaAyuda } from "@/app/(app)/cita/[num]/ayuda/AyudaCita";

/* La cabeza de la ayuda con un pedido del mercado (M-…) o un apartado (A-…): lo mismo que la pantalla de ayuda usa de una
   cita (negocio, «qué fue», total y lo pagado en la app). Solo para quien hizo el pedido. */
export async function cabezaAyudaCompra(userId: string, numero: string): Promise<CabezaAyuda | null> {
  if (!/^[MA]-\d{1,10}$/.test(numero)) return null;
  const o = (await db().query<{ numero: string; nombre: string; tel: string | null; foto: string | null; total: number; app: number; n: number; kind: string }>(
    `select o.number as numero, b.name as nombre, b.phone as tel, b.logo_url as foto, o.total_cents as total, o.kind,
            coalesce((select sum(p.amount_cents - p.refunded_cents) from payments p where p.operation_id = o.id and p.status in ('captured', 'partially_refunded')), 0)::int as app,
            (select coalesce(sum(case when l.weight_est is not null then 1 else l.qty end), 0)::int from operation_lines l where l.operation_id = o.id and l.status = 'ok') as n
       from operations o join businesses b on b.id = o.business_id where o.number = $1 and o.user_id = $2 and o.kind in ('market_order', 'hold')`, [numero, userId])).rows[0];
  if (!o) return null;
  const que = o.kind === "market_order" ? { es: `Pedido ${o.numero} · ${o.n} ${o.n === 1 ? "artículo" : "artículos"}`, en: `Order ${o.numero} · ${o.n} ${o.n === 1 ? "item" : "items"}` }
    : { es: `Apartado ${o.numero} · ${o.n} ${o.n === 1 ? "artículo" : "artículos"}`, en: `Hold ${o.numero} · ${o.n} ${o.n === 1 ? "item" : "items"}` };
  return { numero: o.numero, negocio: { nombre: o.nombre, telefono: o.tel, foto: o.foto }, con: null, model: "biz" as CabezaAyuda["model"], svc: que, dep: o.app, pro: null, total: o.app || o.total };
}

/* 4z · La cabeza de la ayuda con una fiesta (F-…) o un viaje (V-…): el negocio, el servicio y el día, y lo pagado en la app. */
export async function cabezaAyudaReserva(userId: string, numero: string): Promise<CabezaAyuda | null> {
  if (!/^[FVNI]-\d{1,10}$/.test(numero)) return null;
  const o = (await db().query<{ numero: string; nombre: string; tel: string | null; foto: string | null; total: number; app: number; svc: { es: string; en: string } | null; dia: string }>(
    `select o.number as numero, b.name as nombre, b.phone as tel, b.logo_url as foto, o.total_cents as total, o.details->'svc' as svc,
            coalesce(to_char(o.scheduled_at at time zone ci.timezone, 'DD/MM'), to_char((o.details->>'starts_on')::date, 'DD/MM'), to_char(o.sent_at at time zone ci.timezone, 'DD/MM')) as dia,
            coalesce((select sum(p.amount_cents - p.refunded_cents) from payments p where p.operation_id = o.id and p.status in ('captured', 'partially_refunded')), 0)::int as app
       from operations o join businesses b on b.id = o.business_id join cities ci on ci.id = o.city_id where o.number = $1 and o.user_id = $2 and o.kind in ('party', 'trip', 'night', 'enrollment')`, [numero, userId])).rows[0];
  if (!o) return null;
  const que = { es: `${o.svc?.es ?? (numero.startsWith("F-") ? "Fiesta" : numero.startsWith("N-") ? "Noche" : numero.startsWith("I-") ? "Inscripción" : "Viaje")} · ${o.dia}`, en: `${o.svc?.en || o.svc?.es || (numero.startsWith("F-") ? "Party" : numero.startsWith("N-") ? "Night" : numero.startsWith("I-") ? "Enrollment" : "Trip")} · ${o.dia}` };
  return { numero: o.numero, negocio: { nombre: o.nombre, telefono: o.tel, foto: o.foto }, con: null, model: "biz" as CabezaAyuda["model"], svc: que, dep: o.app, pro: null, total: o.app || o.total };
}
