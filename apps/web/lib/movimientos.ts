import "server-only";
import { db } from "./db";

/* 9m · Mi cuenta › Pagos y movimientos (L773, L936): todo lo que se cobró, se retuvo, se liberó o se devolvió a la persona, de cada módulo (pedidos,
   citas, mesas, boletos, apartados, rentas…), con su tarjeta (marca y últimos 4) y el enlace a su orden. Solo lo suyo (payments.user_id). Lo
   devuelto sale como un movimiento aparte con su estado (en camino o hecho). Cursor por fecha e id (sin OFFSET). Derivado de payments y refunds:
   aquí no se escribe nada. */
export type Movimiento = {
  id: string; tipo: "cobro" | "retenido" | "liberado" | "devolucion" | "fallo"; at: string; centavos: number; negocio: string | null; numero: string | null;
  href: string | null; tarjeta: string | null; estado: string; kind: string | null;
};
const RUTA: Record<string, (n: string) => string> = {
  order: (n) => `/pedido/${n}`, table: (n) => `/reserva/${n}`, appointment: (n) => `/cita/${n}`, tickets: (n) => `/eventos/orden/${n}`, private_event: (n) => `/privado/${n}`,
  hold: (n) => `/apartado/${n}`, rental: (n) => `/renta/${n}`, trip: (n) => `/viaje/${n}`, night: (n) => `/noche/${n}`, enrollment: (n) => `/insc/${n}`, visit: (n) => `/vis/${n}`,
};

export async function misMovimientos(userId: string, cursor: string | null, n = 30): Promise<{ items: Movimiento[]; mas: string | null }> {
  const [ca, ci] = (cursor ?? "").split("|");
  const desde = ca && /^\d{4}-\d{2}-\d{2}T/.test(ca) ? ca : null;
  const r = await db().query<{ id: string; tipo: Movimiento["tipo"]; at: string; centavos: number; negocio: string | null; numero: string | null; kind: string | null; brand: string | null; last4: string | null; estado: string }>(
    `with m as (
       select 'p' || p.id as id,
              case when p.status = 'failed' then 'fallo' when p.status = 'held' then 'retenido' when p.status = 'released' then 'liberado' else 'cobro' end as tipo,
              coalesce(p.captured_at, p.held_at, p.created_at) as at, case when p.status = 'held' then coalesce(p.held_cents, p.amount_cents) else p.amount_cents end as centavos,
              b.name as negocio, o.number as numero, o.kind, p.card_brand as brand, p.card_last4 as last4, p.status as estado
         from payments p left join operations o on o.id = p.operation_id left join businesses b on b.id = p.business_id
        where p.user_id = $1
       union all
       select 'r' || r.id, 'devolucion', r.created_at, r.amount_cents, b.name, o.number, o.kind, p.card_brand, p.card_last4, r.status
         from refunds r join payments p on p.id = r.payment_id left join operations o on o.id = p.operation_id left join businesses b on b.id = p.business_id
        where p.user_id = $1)
     select id, tipo, to_char(at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as at, centavos, negocio, numero, kind, brand, last4, estado
       from m where ($2::timestamptz is null or (at, id) < ($2::timestamptz, $3::text))
      order by m.at desc, m.id desc limit $4`, [userId, desde, ci ?? "", n + 1]);
  const items = r.rows.slice(0, n).map((x) => ({ id: x.id, tipo: x.tipo, at: x.at, centavos: x.centavos, negocio: x.negocio, numero: x.numero, kind: x.kind, estado: x.estado,
    href: x.numero && x.kind && RUTA[x.kind] ? RUTA[x.kind]!(x.numero) : null, tarjeta: x.last4 ? `${x.brand ?? ""} ·· ${x.last4}`.trim() : null }));
  const u = r.rows.length > n ? items.at(-1)! : null;
  return { items, mas: u ? `${u.at}|${u.id}` : null };
}
