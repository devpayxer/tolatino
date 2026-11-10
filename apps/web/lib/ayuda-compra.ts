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

/* 4if · La cabeza de la ayuda con una visita, una prueba de manejo o una cita de Bienes Raíces o Autos (D-…): el negocio, lo pedido y el día, y
   LA COPIA del total que la persona vio al pedir («Para mudarte» o «En la puerta»): la ayuda compara con esa copia. Nada se cobró en la app. */
export async function cabezaAyudaVisita(userId: string, numero: string): Promise<CabezaAyuda | null> {
  if (!/^D-\d{1,10}$/.test(numero)) return null;
  const o = (await db().query<{ numero: string; nombre: string; tel: string | null; foto: string | null; item: { es: string; en: string } | null; que: string; dia: string; mud: number | null; otd: number | null; precio: number | null }>(
    `select o.number as numero, b.name as nombre, b.phone as tel, b.logo_url as foto, o.details->'item' as item, o.details->>'what' as que,
            to_char((o.details->>'dia')::date, 'DD/MM') as dia, (o.details->>'move_in_cents')::int as mud, (o.details#>>'{puerta,otd}')::int as otd, (o.details->>'price_cents')::int as precio
       from operations o join businesses b on b.id = o.business_id where o.number = $1 and o.user_id = $2 and o.kind = 'visit'`, [numero, userId])).rows[0];
  if (!o) return null;
  const que = { es: `${o.item?.es ?? "Visita"} · ${o.dia}`, en: `${o.item?.en || o.item?.es || "Visit"} · ${o.dia}` };
  const copia = o.mud != null ? { k: { es: "Para mudarte, lo que viste", en: "To move in, what you saw" }, cents: o.mud } : o.otd != null ? { k: { es: "En la puerta, lo que viste", en: "Out the door, what you saw" }, cents: o.otd }
    : o.precio != null ? { k: { es: "Precio que viste", en: "Price you saw" }, cents: o.precio } : null;
  return { numero: o.numero, negocio: { nombre: o.nombre, telefono: o.tel, foto: o.foto }, con: null, model: "biz" as CabezaAyuda["model"], svc: que, dep: 0, pro: null, total: 0, copia, que: o.que };
}

/* 6d · La cabeza de la ayuda con una orden de boletos (B-…, APP-EVT-AYUDA-PAGO): el organizador, el evento y su fecha, y lo pagado en la
   app (el cobro es de To'Latino). Solo para quien compró; una cortesía (sin cobro) no tiene ayuda con el pago. */
export async function cabezaAyudaBoletos(userId: string, numero: string): Promise<CabezaAyuda | null> {
  if (!/^B-\d{1,10}$/.test(numero)) return null;
  const o = (await db().query<{ numero: string; nombre: string; foto: string | null; total: number; app: number; title: { es: string; en: string } | null; dia: string; n: number }>(
    `select o.number as numero, b.name as nombre, b.logo_url as foto, o.total_cents as total, o.details->'title' as title, to_char((o.details->>'local_date')::date, 'DD/MM') as dia,
            coalesce((select sum(p.amount_cents - p.refunded_cents) from payments p where p.operation_id = o.id and p.status in ('captured', 'partially_refunded')), 0)::int as app,
            (select count(*)::int from tickets t where t.operation_id = o.id and t.status <> 'replaced') as n
       from operations o join businesses b on b.id = o.business_id where o.number = $1 and o.user_id = $2 and o.kind = 'tickets' and o.pay_mode = 'app'`, [numero, userId])).rows[0];
  if (!o) return null;
  const que = { es: `${o.title?.es ?? "Evento"} · ${o.dia} · ${o.n} ${o.n === 1 ? "boleto" : "boletos"}`, en: `${o.title?.en || o.title?.es || "Event"} · ${o.dia} · ${o.n} ${o.n === 1 ? "ticket" : "tickets"}` };
  // Sin teléfono del negocio: la ayuda con el pago la lleva To'Latino (no hay «Llamar»).
  return { numero: o.numero, negocio: { nombre: o.nombre, telefono: null, foto: o.foto }, con: null, model: "biz" as CabezaAyuda["model"], svc: que, dep: o.app, pro: null, total: o.app || o.total };
}
