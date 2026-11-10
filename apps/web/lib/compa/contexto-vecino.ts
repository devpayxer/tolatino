import "server-only";
import { valor } from "../config";
import { db } from "../db";
import type { Lang } from "./modelo";
import { tapar } from "./tapar";

/* 7c · Lo que El Compa sabe de un VECINO (fase7-compa.md §3 «Qué datos ve»; guardianes compaSoloSusDatos y compaSinDatosSensibles). Recibe
   SOLO el id de la sesión y lee lo que esa persona ya ve en Mi cuenta: su nombre de pila, idioma, ciudad y sus últimas compa_contexto_ops
   operaciones (tipo, número, negocio, estado TAL CUAL lo dice el servidor, cuándo, total). Nunca: otra persona, teléfonos, direcciones,
   tarjetas, mensajes privados, reseñas ajenas, nada del Super Admin, ni Salud, Profesionales, Niños o inscripciones (ninos-privado.ts:
   «Nunca en … El Compa»), ni una operación con datos privados (op_private).
   Al modelo no le llegan ids: cada operación va como op1, op2…; el mapa ref → operación se queda en el servidor y una acción solo vale si
   su ref está en ESTE mapa (y la base vuelve a revisar que la operación es de la persona al confirmar). Todo pasa por tapar(). */
export type OpRef = { id: string; numero: string; kind: string; status: string; detail: string | null; pago: string | null; negocio: string; negocioId: string; cancelableGratis: boolean };
export type ContextoVecino = { datos: Record<string, unknown>; refs: Map<string, OpRef>; texto: string; confirmadas: boolean; ciudad: string; lang: Lang };

/* Las solicitudes que El Compa puede preparar para cancelar (cancel_request): pendientes, sin cobro, de estos tipos (CANCELABLES en acciones.ts). */
export const KINDS_CANCELABLES = ["appointment", "table"] as const;
const TIPO: Record<string, [string, string]> = {
  order: ["pedido", "order"], market_order: ["pedido del mercado", "market order"], hold: ["apartado", "layaway hold"], appointment: ["cita", "appointment"],
  quote: ["solicitud de presupuesto", "quote request"], party: ["fiesta", "party"], private_event: ["evento privado", "private event"], table: ["reservación de mesa", "table reservation"],
  night: ["noche", "night out"], trip: ["viaje", "trip"], visit: ["visita", "visit"], tickets: ["boletos", "tickets"], rental: ["renta", "rental"], plan: ["plan de pagos", "payment plan"],
};
const ESTADO: Record<string, [string, string]> = {
  pending: ["solicitud enviada, todavía sin confirmar", "request sent, not confirmed yet"], change_proposed: ["el negocio propuso un cambio", "the business proposed a change"],
  confirmed: ["confirmada", "confirmed"], declined: ["no aceptada por el negocio", "declined by the business"], expired: ["vencida sin respuesta", "expired without an answer"],
  cancelled: ["cancelada", "cancelled"], done: ["terminada", "completed"],
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
    return { ref, numero: o.number, tipo: (TIPO[o.kind] ?? [o.kind, o.kind])[es ? 0 : 1], negocio: tapar(o.negocio).texto, estado: (ESTADO[o.status] ?? [o.status, o.status])[es ? 0 : 1],
      cuando: o.cuando, total: o.total > 0 ? `$${(o.total / 100).toFixed(2)}` : null, cancelable_gratis: cancelableGratis };
  });
  const datos = { persona: { nombre: tapar(p?.nombre ?? "").texto || null, idioma: lang, ciudad: p?.ciudad_nombre ?? null }, operaciones: ops };
  return { datos, refs, texto: JSON.stringify(datos), confirmadas: O.rows.some((o) => o.status === "confirmed"), ciudad: p?.ciudad ?? "hzl", lang };
}
