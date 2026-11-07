import "server-only";
import type { PoolClient } from "pg";

/* 4ne · Vigilancia de la puerta (fase4-noche.md §4ne, §6 #2). Cada vez que pasa algo que puede ser un abuso del local, se
   cuentan las veces de los últimos 30 días; desde la tercera se abre un caso en el Super Admin (uno abierto por local, el
   índice único de queue_items lo garantiza). No decide nada solo: una persona mira y, si hace falta, pausa mesas y lista. */
export const UMBRAL_NOCHE = 3;
export type ColaNoche = "mesa" | "noid";
/* Qué cuenta en cada cola (también lo usan el caso del Super Admin y la Analítica). */
export const INCIDENTE_SQL: Record<ColaNoche, string> = {
  // El local canceló una mesa ya confirmada, o el cliente pidió ayuda porque no le respetaron la mesa o la lista.
  mesa: `((o.cancelled_by = 'business' and o.confirmed_at is not null and o.details->>'k' <> 'lista')
          or exists (select 1 from help_requests h where h.operation_id = o.id and h.reason in ('mesa', 'lista')))`,
  // «No entró: sin identificación» en una mesa con depósito (el depósito se queda con el local).
  noid: `(o.status_detail = 'noid' and coalesce(o.deposit_cents, 0) > 0)`,
};
export async function vigilarNoche(c: PoolClient, negocio: string, cola: ColaNoche) {
  const r = (await c.query<{ n: number; city: string }>(
    `select count(*)::int as n, max(o.city_id) as city from operations o
      where o.business_id = $1 and o.kind = 'night' and o.night_date > current_date - 30 and ${INCIDENTE_SQL[cola]}`, [negocio])).rows[0];
  if (!r || r.n < UMBRAL_NOCHE) return false;
  await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority) values ($1, 'business', $2, $2, $3, 'normal') on conflict do nothing`, [cola, negocio, r.city]);
  return true;
}
