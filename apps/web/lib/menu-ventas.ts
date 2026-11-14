/* 9n-2 · Lo más pedido de un menú: «Últimos 30 días» del plato (pedidos, vendido, puesto; L234) y «Populares» armado con lo más pedido (L234). Una sola definición
   para el panel y para la página: un plato entra en Populares con al menos POPULAR_MIN pedidos ENTREGADOS en los últimos 30 días (no por un solo pedido grande), los
   fijados por el negocio van primero y el total no pasa de POPULAR_MAX. Solo cuenta pedidos terminados (done) de ESTE negocio. Sin server-only: lo usan el servidor
   (lib/pedir.ts, lib/menu.ts) y las constantes, el panel (cliente). */
export const POPULAR_MIN = 3, POPULAR_MAX = 6, DIAS_VENTAS = 30;

/* La consulta (por negocio, $1). Un pedido cuenta UNA vez por plato aunque pida varias unidades; `uds` y `cents` suman lo pedido y lo cobrado. */
export const VENTAS_SQL = `select l.item_id::text as id, count(distinct l.operation_id)::int as pedidos, sum(l.qty)::int as uds, sum(l.line_total_cents)::int as cents
  from operation_lines l join operations o on o.id = l.operation_id
 where o.business_id = $1 and o.kind = 'order' and o.status = 'done' and o.sent_at > now() - interval '${DIAS_VENTAS} days' and l.item_id is not null
 group by l.item_id`;

export type Ventas30 = Record<string, { pedidos: number; uds: number; cents: number }>;

/* Los más pedidos, en orden (los que no llegan a POPULAR_MIN no entran). `fijados` van primero. */
export function populares(ventas: Ventas30, fijados: string[], existe: (id: string) => boolean = () => true): string[] {
  const auto = Object.entries(ventas)
    .filter(([id, v]) => v.pedidos >= POPULAR_MIN && existe(id) && !fijados.includes(id))
    .sort((a, b) => b[1].pedidos - a[1].pedidos || b[1].uds - a[1].uds || Number(a[0]) - Number(b[0])).map(([id]) => id);
  return [...fijados.filter(existe), ...auto].slice(0, POPULAR_MAX);
}
