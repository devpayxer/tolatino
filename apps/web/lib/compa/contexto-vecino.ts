import "server-only";
import { valor } from "../config";
import { db } from "../db";
import type { Lang } from "./modelo";
import { tapar } from "./tapar";
import { usd } from "../dinero-comun";
import { dosIdiomas } from "@/lib/dos-idiomas";

/* 7c · Lo que El Compa sabe de un VECINO (fase7-compa.md §3 «Qué datos ve»; guardianes compaSoloSusDatos y compaSinDatosSensibles). Recibe
   SOLO el id de la sesión y lee lo que esa persona ya ve en Mi cuenta: su nombre de pila, idioma, ciudad y sus últimas compa_contexto_ops
   operaciones (tipo, número, negocio, estado TAL CUAL lo dice el servidor, cuándo, total). Nunca: otra persona, teléfonos, direcciones,
   tarjetas, mensajes privados, reseñas ajenas, nada del Super Admin, ni Salud, Profesionales, Niños o inscripciones (ninos-privado.ts:
   «Nunca en … El Compa»), ni una operación con datos privados (op_private).
   Al modelo no le llegan ids: cada operación va como op1, op2…; el mapa ref → operación se queda en el servidor y una acción solo vale si
   su ref está en ESTE mapa (y la base vuelve a revisar que la operación es de la persona al confirmar). Todo pasa por tapar(). */
export type OpRef = { id: string; numero: string; kind: string; status: string; detail: string | null; pago: string | null; negocio: string; negocioId: string; cancelableGratis: boolean };
export type ContextoVecino = { datos: Record<string, unknown>; refs: Map<string, OpRef>; texto: string; confirmadas: boolean; canceladas: boolean; ciudad: string; lang: Lang };

/* Las solicitudes que El Compa puede preparar para cancelar (cancel_request): pendientes, sin cobro, de estos tipos (CANCELABLES en acciones.ts). */
export const KINDS_CANCELABLES = ["appointment", "table"] as const;
const TIPO = (es: unknown): Record<string, string> => {
  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);
  return {
  order: E2("pedido", "order"), market_order: E2("pedido del mercado", "market order"), hold: E2("apartado", "layaway hold"), appointment: E2("cita", "appointment"),
  quote: E2("solicitud de presupuesto", "quote request"), party: E2("fiesta", "party"), private_event: E2("evento privado", "private event"), table: E2("reservación de mesa", "table reservation"),
  night: E2("noche", "night out"), trip: E2("viaje", "trip"), visit: E2("visita", "visit"), tickets: E2("boletos", "tickets"), rental: E2("renta", "rental"), plan: E2("plan de pagos", "payment plan"),
};
};
const ESTADO = (es: unknown): Record<string, string> => {
  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);
  return {
  pending: E2("solicitud enviada, todavía sin confirmar", "request sent, not confirmed yet"), change_proposed: E2("el negocio propuso un cambio", "the business proposed a change"),
  confirmed: E2("confirmada", "confirmed"), declined: E2("no aceptada por el negocio", "declined by the business"), expired: E2("vencida sin respuesta", "expired without an answer"),
  cancelled: E2("cancelada", "cancelled"), done: E2("terminada", "completed"),
};
};

export async function contextoVecino(userId: string, lang: Lang): Promise<ContextoVecino> {
  const n = await valor("compa_contexto_ops");
  const [P, O] = await Promise.all([
    db().query<{ nombre: string | null; ciudad: string; ciudad_nombre: string | null; lang: string }>(
      `select u.first_name as nombre, coalesce(u.home_city_id, 'hzl') as ciudad, c.name as ciudad_nombre, u.lang from users u left join cities c on c.id = coalesce(u.home_city_id, 'hzl') where u.id = $1`, [userId]),
    db().query<{ id: string; number: string; kind: string; status: string; detail: string | null; pago: string | null; negocio: string; nid: string; cuando: string; total: number }>(
      `select o.id::text, o.number, o.kind, o.status, o.status_detail as detail, o.pay_status as pago, b.name as negocio, b.id as nid,
              to_char(coalesce(o.scheduled_at, o.sent_at) at time zone coalesce(ci.timezone, 'America/New_York'), 'YYYY-MM-DD HH24:MI') as cuando, o.total_cents as total
         from operations o join businesses b on b.id = o.business_id left join cities ci on ci.id = o.city_id
        where o.user_id = $1
          and o.kind not in ('enrollment')
          and not (o.kind = 'appointment' and coalesce(o.details->>'rubro', '') in ('salud', 'pro'))
          and not exists (select 1 from op_private p where p.operation_id = o.id)
        order by o.sent_at desc limit $2`, [userId, n]),
  ]);
  const p = P.rows[0], es = lang === "es";
  const refs = new Map<string, OpRef>();
  const ops = O.rows.map((o, i) => {
    const ref = `op${i + 1}`;
    const cancelableGratis = (KINDS_CANCELABLES as readonly string[]).includes(o.kind) && o.status === "pending" && !o.detail && (o.pago == null || o.pago === "held");
    refs.set(ref, { id: o.id, numero: o.number, kind: o.kind, status: o.status, detail: o.detail, pago: o.pago, negocio: o.negocio, negocioId: o.nid, cancelableGratis });
    return { ref, numero: o.number, tipo: (TIPO(es)[o.kind] ?? o.kind), negocio: tapar(o.negocio).texto, estado: (ESTADO(es)[o.status] ?? o.status),
      cuando: o.cuando, total: o.total > 0 ? usd(o.total) : null, cancelable_gratis: cancelableGratis };
  });
  const datos = { persona: { nombre: tapar(p?.nombre ?? "").texto || null, idioma: lang, ciudad: p?.ciudad_nombre ?? null }, operaciones: ops };
  return { datos, refs, texto: JSON.stringify(datos), confirmadas: O.rows.some((o) => o.status === "confirmed"), canceladas: O.rows.some((o) => o.status === "cancelled"), ciudad: p?.ciudad ?? "hzl", lang };
}
