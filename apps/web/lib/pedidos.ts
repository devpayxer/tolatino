import "server-only";
import type { PoolClient } from "pg";
import { cobrarOperacion, liberarOperacion, pagoDe, repararPagos, type PagoVista } from "./cobros";
import { db, tx } from "./db";
import type { Lang } from "./idioma";
import { hora } from "./pedir";

/* El ciclo de vida del pedido de Comida (Fase 2 · bloque 2c): el negocio acepta o rechaza en 10 minutos, lo marca listo
   y entregado; el cliente cancela gratis mientras no lo acepten. Sin tareas programadas: el pedido que nadie contestó
   se vence al leer (en el panel, en la página del pedido y antes de cada pedido nuevo) y su inventario vuelve.
   Cada paso queda en la línea de tiempo (operation_events, solo inserción). */

type Bi = { es: string; en: string };
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const hm2m = (hm: string) => { const [h = 0, m = 0] = hm.split(":").map(Number); return h * 60 + m; };

/* Devuelve al inventario lo que el pedido había descontado: stock siempre; la cuenta del día solo si es el mismo día. */
async function devolver(c: PoolClient, opId: string) {
  const ls = (await c.query<{ item_id: string; qty: number }>(`select item_id::text, sum(qty)::int as qty from operation_lines where operation_id = $1 and item_id is not null group by item_id`, [opId])).rows;
  for (const l of ls) {
    await c.query(
      `update items i set stock_left = least(9999, i.stock_left + $2), updated_at = now()
         from operations o join cities ci on ci.id = o.city_id
        where o.id = $3 and i.id = $1::bigint and i.business_id = o.business_id
          and (i.stock_mode = 'qty' or (i.stock_mode = 'day' and i.stock_day = (o.sent_at at time zone ci.timezone - interval '6 hours')::date))`,
      [l.item_id, l.qty, opId]);
  }
}

/* Vence los pedidos pendientes que nadie contestó a tiempo (de un negocio, de una persona o un pedido). Solo pedidos: las
   reservaciones tienen su propio vencer (lib/reservas.ts · vencerMesas). */
export async function vencer(f: { negocio?: string; userId?: string; numero?: string }) {
  const w: string[] = [], v: unknown[] = [];
  if (f.negocio) { v.push(f.negocio); w.push(`business_id = $${v.length}`); }
  if (f.userId) { v.push(f.userId); w.push(`user_id = $${v.length}::uuid`); }
  if (f.numero) { v.push(f.numero); w.push(`number = $${v.length}`); }
  if (!w.length) return;
  // Barato: solo si hay alguno (índice parcial de pendientes).
  const hay = await db().query(`select 1 from operations where kind = 'order' and status = 'pending' and respond_by <= now() and ${w.join(" and ")} limit 1`, v);
  if (!hay.rowCount) return;
  const vencidos = await tx(async (c) => {
    const ids = (await c.query<{ id: string }>(
      `update operations set status = 'expired', updated_at = now() where kind = 'order' and status = 'pending' and respond_by <= now() and ${w.join(" and ")} returning id::text`, v)).rows;
    for (const { id } of ids) {
      await devolver(c, id);
      await c.query(`insert into operation_events (operation_id, kind, actor, note) values ($1, 'expired', 'system', $2::jsonb)`, [id, JSON.stringify({ es: "Nadie contestó en 10 minutos", en: "No reply in 10 minutes" })]);
    }
    return ids;
  });
  // Lo retenido en tarjeta de un pedido que nadie aceptó se libera completo.
  for (const { id } of vencidos) await liberarOperacion(id);
}

/* ── Lo que ve el panel ── */
export type Est = "pend" | "ok" | "ready" | "out" | "done" | "no" | "exp" | "cx";
/* Aceptado y aún no entregado: en cocina, listo para recoger o en camino. Todo filtro de «en curso» pasa por aquí. */
export const enCurso = (s: Est) => s === "ok" || s === "ready" || s === "out";
export type Fila = { numero: string; who: string; modo: string; count: number; amt: number; st: Est; s: Bi; programado: string | null; responde: string | null };
type FilaDb = {
  number: string; first_name: string | null; last_name: string | null; mode: string | null; n: number; total_cents: number; status: string; stage: string | null;
  sent: string; mins: number; listo: string | null; programado: string | null; responde: string | null; hecho: string | null; cancelado: string | null; cancelled_by: string | null;
};
const estado = (x: { status: string; stage: string | null }): Est =>
  x.status === "pending" ? "pend" : x.status === "confirmed" ? (x.stage === "ready" ? "ready" : x.stage === "on_the_way" ? "out" : "ok") : x.status === "done" ? "done"
    : x.status === "declined" ? "no" : x.status === "expired" ? "exp" : "cx";
const quien = (a: string | null, b: string | null) => [a, b ? `${b[0]}.` : ""].filter(Boolean).join(" ") || "—";
function sub(x: FilaDb, st: Est): Bi {
  const n = x.n, art = { es: `${n} ${n === 1 ? "artículo" : "artículos"}`, en: `${n} ${n === 1 ? "item" : "items"}` };
  const hace = x.mins < 1 ? { es: "ahora", en: "now" } : x.mins < 60 ? { es: `hace ${x.mins} min`, en: `${x.mins} min ago` } : { es: `a las ${hora(hm2m(x.sent))}`, en: `at ${hora(hm2m(x.sent))}` };
  const prog = x.programado ? { es: ` · para las ${hora(hm2m(x.programado))}`, en: ` · for ${hora(hm2m(x.programado))}` } : { es: "", en: "" };
  switch (st) {
    case "pend": return { es: `${art.es}${prog.es} · ${hace.es}`, en: `${art.en}${prog.en} · ${hace.en}` };
    case "ok": if (!x.listo) return { es: `En cocina · ${art.es}`, en: `Cooking · ${art.en}` };
      return x.mode === "delivery" ? { es: `En cocina · sale ${hora(hm2m(x.listo))}`, en: `Cooking · leaves ${hora(hm2m(x.listo))}` } : { es: `En cocina · listo ${hora(hm2m(x.listo))}`, en: `Cooking · ready ${hora(hm2m(x.listo))}` };
    case "out": return { es: `En camino · ${art.es}`, en: `On the way · ${art.en}` };
    case "ready": return { es: `Listo para recoger · ${art.es}`, en: `Ready for pickup · ${art.en}` };
    case "done": return { es: `Entregado ${x.hecho ? hora(hm2m(x.hecho)) : ""}`.trim(), en: `Delivered ${x.hecho ? hora(hm2m(x.hecho)) : ""}`.trim() };
    case "no": return { es: `No se pudo · ${art.es}`, en: `Declined · ${art.en}` };
    case "exp": return { es: `Nadie contestó a tiempo · ${art.es}`, en: `No reply in time · ${art.en}` };
    default: return { es: `${x.cancelled_by === "user" ? "Lo canceló el cliente" : "Cancelado"}${x.cancelado ? ` a las ${hora(hm2m(x.cancelado))}` : ""}`, en: `${x.cancelled_by === "user" ? "Cancelled by the client" : "Cancelled"}${x.cancelado ? ` at ${hora(hm2m(x.cancelado))}` : ""}` };
  }
}
const COLS = `o.number, u.first_name, u.last_name, o.mode, (select coalesce(sum(qty), 0)::int from operation_lines l where l.operation_id = o.id) as n, o.total_cents, o.status, o.stage,
  to_char(o.sent_at at time zone c.timezone, 'HH24:MI') as sent, greatest(0, floor(extract(epoch from now() - o.sent_at) / 60))::int as mins,
  to_char(o.ready_at at time zone c.timezone, 'HH24:MI') as listo, to_char(o.scheduled_at at time zone c.timezone, 'HH24:MI') as programado,
  to_char(o.respond_by at time zone c.timezone, 'HH24:MI') as responde, to_char(o.done_at at time zone c.timezone, 'HH24:MI') as hecho,
  to_char(o.cancelled_at at time zone c.timezone, 'HH24:MI') as cancelado, o.cancelled_by`;
const fila = (x: FilaDb): Fila => {
  const st = estado(x);
  return { numero: x.number, who: quien(x.first_name, x.last_name), modo: x.mode === "delivery" ? "Delivery" : "Pickup", count: x.n, amt: x.total_cents, st, s: sub(x, st),
    programado: x.programado ? hora(hm2m(x.programado)) : null, responde: st === "pend" && x.responde ? hora(hm2m(x.responde)) : null };
};

/* Panel › Hoy: los que esperan respuesta, la agenda de hoy (aceptados, listos y en camino) y lo vendido hoy. */
export async function pedidosHoy(negocio: string) {
  await repararPagos(negocio).catch(() => undefined);
  await vencer({ negocio });
  const r = await db().query<FilaDb & { hoy: boolean }>(
    `select ${COLS}, (o.sent_at at time zone c.timezone)::date = (now() at time zone c.timezone)::date as hoy
       from operations o join users u on u.id = o.user_id join cities c on c.id = o.city_id
      where o.business_id = $1 and o.kind = 'order'
        and (o.status in ('pending', 'confirmed') or o.sent_at > now() - interval '36 hours')
      order by o.sent_at desc limit 200`, [negocio]);
  const filas = r.rows.map((x) => ({ ...fila(x), hoy: x.hoy }));
  const pend = filas.filter((x) => x.st === "pend").sort((a, b) => (a.responde ?? "").localeCompare(b.responde ?? ""));
  const agenda = filas.filter((x) => enCurso(x.st));
  const vendido = filas.filter((x) => x.hoy && (enCurso(x.st) || x.st === "done")).reduce((a, x) => a + x.amt, 0);
  return { pend, agenda, vendido };
}

/* Panel › Clientes › Pedidos: todos, con filtro, búsqueda por nombre o número y paginación por cursor. */
export type FiltroPed = "all" | "pend" | "cur" | "done" | "no";
const FILTROS: Record<FiltroPed, string> = {
  all: "true", pend: "o.status = 'pending'", cur: "o.status = 'confirmed'", done: "o.status = 'done'", no: "o.status in ('declined', 'expired', 'cancelled')",
};
export async function pedidosLista(negocio: string, f: FiltroPed, q: string, antes: string | null) {
  await vencer({ negocio });
  const v: unknown[] = [negocio];
  const w = ["o.business_id = $1", FILTROS[f] ?? "true"];
  const busca = q.trim().replace(/^#/, "").slice(0, 40);
  if (busca) { v.push(`%${busca.toLowerCase()}%`); w.push(`(o.number like $${v.length} or lower(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) like $${v.length})`); }
  if (antes && /^\d{1,12}$/.test(antes)) { v.push(antes); w.push(`o.id < (select id from operations where number = $${v.length})`); }
  const r = await db().query<FilaDb>(
    `select ${COLS} from operations o join users u on u.id = o.user_id join cities c on c.id = o.city_id
      where o.kind = 'order' and ${w.join(" and ")} order by o.id desc limit 31`, v);
  const filas = r.rows.slice(0, 30).map(fila);
  // Cuántos hay en cada filtro (con la búsqueda aplicada), para los chips.
  const vq = busca ? [negocio, `%${busca.toLowerCase()}%`] : [negocio];
  const wq = busca ? ` and (o.number like $2 or lower(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) like $2)` : "";
  const cu = (await db().query<Record<FiltroPed, number> & { pend_todo: number; total: number }>(
    `select count(*)::int as "all", count(*) filter (where ${FILTROS.pend})::int as pend, count(*) filter (where ${FILTROS.cur})::int as cur,
            count(*) filter (where ${FILTROS.done})::int as done, count(*) filter (where ${FILTROS.no})::int as "no",
            (select count(*)::int from operations where business_id = $1 and kind = 'order' and status = 'pending') as pend_todo,
            (select count(*)::int from operations where business_id = $1 and kind = 'order') as total
       from operations o join users u on u.id = o.user_id where o.business_id = $1 and o.kind = 'order'${wq}`, vq)).rows[0]!;
  return { filas, mas: r.rows.length > 30 ? filas[filas.length - 1]!.numero : null, pend: cu.pend_todo, total: cu.total,
    cuentas: { all: cu.all, pend: cu.pend, cur: cu.cur, done: cu.done, no: cu.no } as Record<FiltroPed, number> };
}

/* Panel › detalle de un pedido: cliente, prometido, pago, nota, platos, total e historial. */
export type EntregaPed = {
  to: { label: string; street: string; apt: string | null; zip: string; mi: number | null } | null; drop: { drop: string; at: string[]; note: string } | null;
  ext: string | null; seguimiento: string | null; llega: string | null;
};
export type DetallePed = Fila & {
  lineas: { q: number; name: Bi; opts: Bi[]; nota: string | null; cents: number }[]; nota: string | null; listo: string; sub: number; tax: number;
  envio: number; propina: number; entrega: EntregaPed | null; telCliente: string | null;
  tl: { t: Bi; at: string }[];
  pago: PagoVista | null; // tarjeta en la app (retenido, cobrado, liberado, devuelto)
  repartidor: { id: string; nombre: string } | null; equipo: boolean; // delivery con «Mi equipo»: quién lo lleva
  resena: import("./resena-pedir").EstadoPedir | null; // 9n-2 · «Pedir reseña» (solo en un pedido entregado)
  // 9n · El código de recogida (solo el negocio lo ve), la prueba de la entrega, la oferta abierta y los mensajes del repartidor al cliente.
  rep9n: { recogida: string | null; recogido: boolean; pideRec: boolean; pidePrueba: boolean; prueba: string[]; foto: string | null; oferta: { seg: number; a: string | null; rechazos: number } | null; mensajes: number } | null;
};
export async function pedidoNegocio(negocio: string, numero: string): Promise<DetallePed | null> {
  if (!/^\d{1,12}$/.test(numero)) return null;
  await vencer({ negocio, numero });
  const r = await db().query<FilaDb & { id: string; customer_note: string | null; subtotal_cents: number; tax_cents: number; delivery_cents: number; tip_cents: number;
    details: { to?: EntregaPed["to"]; drop?: EntregaPed["drop"]; ext?: string | null; tracking?: string | null; eta?: { d1: number; d2: number } }; phone: string; rid: string | null; rnombre: string | null; equipo: boolean }>(
    `select ${COLS}, o.id::text, o.customer_note, o.subtotal_cents, o.tax_cents, o.delivery_cents, o.tip_cents, o.details, u.phone,
            o.driver_id::text as rid, (select display_name from delivery_drivers where id = o.driver_id) as rnombre,
            coalesce((select who from delivery_settings where business_id = o.business_id), 'team') = 'team' as equipo
       from operations o join users u on u.id = o.user_id join cities c on c.id = o.city_id
      where o.business_id = $1 and o.number = $2 and o.kind = 'order'`, [negocio, numero]);
  const o = r.rows[0];
  if (!o) return null;
  const [ls, ev] = await Promise.all([
    db().query<{ q: number; name: Bi; options: { o: Bi }[]; instructions: string | null; total: number }>(
      `select qty as q, name, options, instructions, line_total_cents as total from operation_lines where operation_id = $1 order by id`, [o.id]),
    db().query<{ kind: string; actor: string; at: string; quien: string | null; note: Bi | null }>(
      `select e.kind, e.actor, to_char(e.at at time zone c.timezone, 'HH24:MI') as at, e.note,
              case when e.actor in ('member', 'business') then (select coalesce(nullif(u.first_name, ''), 'Alguien') from users u where u.id::text = e.actor_id) end as quien
         from operation_events e join operations o on o.id = e.operation_id join cities c on c.id = o.city_id
        where e.operation_id = $1 order by e.at, e.id`, [o.id]),
  ]);
  const pago = await pagoDe(o.id);
  const rep9n = o.mode === "delivery" ? await (async () => {
    const k = (await db().query<{ recogida: string | null; recogido: boolean; pide_rec: boolean; pide_prueba: boolean; prueba: string[] | null; foto: string | null; mensajes: number }>(
      `select dc.recogida, dc.recogido_at is not null as recogido, coalesce(s.pickup_code, false) as pide_rec, coalesce(s.proof, false) as pide_prueba,
              (select array_agg(p.kind order by p.kind) from delivery_proofs p where p.operation_id = o.id) as prueba,
              (select p.media_id::text from delivery_proofs p where p.operation_id = o.id and p.kind = 'foto') as foto,
              (select count(*)::int from delivery_messages m where m.operation_id = o.id) as mensajes
         from operations o left join delivery_codes dc on dc.operation_id = o.id left join delivery_settings s on s.business_id = o.business_id where o.id = $1::bigint`, [o.id])).rows[0];
    const of = o.status === "confirmed" && !o.rid ? await (await import("./repartidor-ofertas")).ofertaDe(negocio, numero) : null;
    return { recogida: k?.pide_rec && o.status === "confirmed" ? k.recogida : null, recogido: !!k?.recogido, pideRec: !!k?.pide_rec, pidePrueba: !!k?.pide_prueba, prueba: k?.prueba ?? [], foto: k?.foto ?? null,
      oferta: of ? { seg: of.seg, a: of.a, rechazos: of.rechazos } : null, mensajes: k?.mensajes ?? 0 };
  })() : null;
  const T: Record<string, (q: string | null) => Bi> = {
    sent: () => ({ es: "Llegó por To’Latino", en: "Came in through To’Latino" }),
    accepted: (q) => (q ? { es: `Aceptado por ${q}`, en: `Accepted by ${q}` } : { es: "Aceptado al instante", en: "Accepted instantly" }),
    declined: (q) => ({ es: `Rechazado${q ? ` por ${q}` : ""}`, en: `Declined${q ? ` by ${q}` : ""}` }),
    ready: (q) => ({ es: `Listo para recoger${q ? ` · ${q}` : ""}`, en: `Ready for pickup${q ? ` · ${q}` : ""}` }),
    on_the_way: (q) => ({ es: `Salió en camino${q ? ` · ${q}` : ""}`, en: `Out for delivery${q ? ` · ${q}` : ""}` }),
    delivered: (q) => (pago ? { es: `Entregado${q ? ` · ${q}` : ""}`, en: `Delivered${q ? ` · ${q}` : ""}` } : { es: `Entregado · cobrado en efectivo${q ? ` · ${q}` : ""}`, en: `Delivered · paid in cash${q ? ` · ${q}` : ""}` }),
    tracking: (q) => ({ es: `Enlace de seguimiento${q ? ` · ${q}` : ""}`, en: `Tracking link${q ? ` · ${q}` : ""}` }),
    driver_unassigned: (q) => ({ es: `Sin repartidor${q ? ` · ${q}` : ""}`, en: `Driver removed${q ? ` · ${q}` : ""}` }),
    picked_up: (q) => (pago ? { es: `Entregado${q ? ` · ${q}` : ""}`, en: `Delivered${q ? ` · ${q}` : ""}` } : { es: `Entregado · pagó en el local${q ? ` · ${q}` : ""}`, en: `Delivered · paid at the store${q ? ` · ${q}` : ""}` }),
    expired: () => ({ es: "Nadie contestó en 10 minutos", en: "No reply in 10 minutes" }),
    cancelled: () => ({ es: "Lo canceló el cliente", en: "Cancelled by the client" }),
  };
  return {
    ...fila(o), nota: o.customer_note, listo: (o.programado ?? o.listo) ? hora(hm2m((o.programado ?? o.listo)!)) : "—", sub: o.subtotal_cents, tax: o.tax_cents, envio: o.delivery_cents, propina: o.tip_cents,
    // El teléfono del cliente solo en delivery (para avisar al llegar).
    telCliente: o.mode === "delivery" ? o.phone : null,
    entrega: o.mode === "delivery" ? { to: o.details?.to ?? null, drop: o.details?.drop ?? null, ext: o.details?.ext ?? null, seguimiento: o.details?.tracking ?? null,
      llega: o.details?.eta ? `${hora(o.details.eta.d1)}–${hora(o.details.eta.d2)}` : null } : null,
    lineas: ls.rows.map((l) => ({ q: l.q, name: l.name, opts: (Array.isArray(l.options) ? l.options : []).map((x) => x.o), nota: l.instructions, cents: l.total })),
    tl: ev.rows.map((e) => ({ t: (T[e.kind] ?? (() => e.note ?? { es: e.kind, en: e.kind }))(e.quien), at: hora(hm2m(e.at)) })),
    pago, repartidor: o.rid && o.rnombre ? { id: o.rid, nombre: o.rnombre } : null, equipo: o.equipo, rep9n,
    resena: o.status === "done" ? await (await import("./resena-pedir")).estadoPedirResena(negocio, numero) : null,
  };

}

/* ── Lo que cambia el estado ── */
export type Paso = "aceptar" | "rechazar" | "listo" | "encamino" | "entregado";
const DESDE: Record<Paso, { status: string[]; stage?: (string | null)[]; mode?: string }> = {
  aceptar: { status: ["pending"] }, rechazar: { status: ["pending"] },
  listo: { status: ["confirmed"], stage: ["accepted", "preparing"], mode: "pickup" }, encamino: { status: ["confirmed"], stage: ["accepted", "preparing", "ready"], mode: "delivery" },
  entregado: { status: ["confirmed"] },
};
export type ResPaso = { ok: true } | { ok: false; msg: Bi };
export async function cambiarPaso(negocio: string, numero: string, paso: Paso, actorId: string): Promise<ResPaso> {
  if (!/^\d{1,12}$/.test(numero) || !DESDE[paso]) return { ok: false, msg: { es: "Ese pedido no existe.", en: "That order does not exist." } };
  await vencer({ negocio, numero });
  return tx(async (c) => {
    const o = (await c.query<{ id: string; status: string; stage: string | null; vivo: boolean; mode: string }>(
      `select id::text, status, stage, (status <> 'pending' or respond_by > now()) as vivo, coalesce(mode, 'pickup') as mode from operations where business_id = $1 and number = $2 and kind = 'order' for update`, [negocio, numero])).rows[0];
    if (!o) return { ok: false, msg: { es: "Ese pedido no existe.", en: "That order does not exist." } };
    const d = DESDE[paso];
    if (!d.status.includes(o.status) || (d.stage && !d.stage.includes(o.stage)) || (d.mode && d.mode !== o.mode) || !o.vivo) {
      const ya = o.status === "cancelled" ? { es: "El cliente ya lo canceló.", en: "The client already cancelled it." }
        : o.status === "expired" ? { es: "Pasaron los 10 minutos: el pedido se liberó.", en: "The 10 minutes passed: the order was released." }
          : { es: "Este pedido ya cambió. Actualiza la pantalla.", en: "This order already changed. Refresh the screen." };
      return { ok: false, msg: ya };
    }
    const set = {
      aceptar: `status = 'confirmed', stage = 'preparing', answered_at = now(), confirmed_at = now()`,
      rechazar: `status = 'declined', answered_at = now()`,
      listo: `stage = 'ready'`,
      encamino: `stage = 'on_the_way'`,
      entregado: o.mode === "delivery" ? `status = 'done', stage = 'delivered', done_at = now()` : `status = 'done', stage = 'picked_up', done_at = now()`,
    }[paso];
    // 9n · Un delivery con repartidor de un negocio que pide prueba: el negocio lo puede cerrar él mismo (se queda sin batería, lo entregó en
    // el local…) y la prueba queda con SU nombre («negocio»); la base exige una prueba (trigger operations_prueba).
    if (paso === "entregado" && o.mode === "delivery")
      await c.query(`insert into delivery_proofs (operation_id, city_id, kind, actor_id)
                     select o.id, o.city_id, 'negocio', $2 from operations o join delivery_settings s on s.business_id = o.business_id
                      where o.id = $1::bigint and o.driver_id is not null and s.proof and not exists (select 1 from delivery_proofs p where p.operation_id = o.id)
                     on conflict (operation_id, kind) do nothing`, [o.id, actorId]);
    await c.query(`update operations set ${set}, updated_at = now() where id = $1`, [o.id]);
    if (paso === "rechazar") await devolver(c, o.id);
    const kind = { aceptar: "accepted", rechazar: "declined", listo: "ready", encamino: "on_the_way", entregado: o.mode === "delivery" ? "delivered" : "picked_up" }[paso];
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1, $2, 'member', $3)`, [o.id, kind, actorId]);
    return { ok: true, op: o.id } as const;
  }).then(async (r) => {
    // La tarjeta: se cobra al aceptar; se libera si se rechaza (después de guardar el paso, fuera de la transacción).
    if (r.ok && "op" in r && paso === "aceptar") await cobrarOperacion(r.op as string);
    if (r.ok && "op" in r && paso === "rechazar") await liberarOperacion(r.op as string);
    if (r.ok && "op" in r && paso === "entregado") await (await import("./correo/recibos")).reciboPedido(r.op as string); // 2q: recibo por correo
    if (r.ok && "op" in r && paso === "entregado") await (await import("./avisos")).avisarEntregado(r.op as string); // 9l: «Tu pedido llegó»
    return r.ok ? { ok: true as const } : r;
  });
}

/* Con una app externa (DoorDash, Uber Eats…): el enlace de seguimiento que pega el negocio; el cliente lo ve en su pedido. */
export async function guardarSeguimiento(negocio: string, numero: string, url: string, actorId: string): Promise<ResPaso> {
  const u = String(url ?? "").trim().slice(0, 300);
  let ok = false;
  try { const x = new URL(u); ok = x.protocol === "https:" && !!x.hostname; } catch { ok = false; }
  if (!ok) return { ok: false, msg: { es: "Pega el enlace completo (empieza con https://).", en: "Paste the full link (starts with https://)." } };
  return tx(async (c) => {
    const o = (await c.query<{ id: string }>(
      `select id::text from operations where business_id = $1 and number = $2 and kind = 'order' and mode = 'delivery' and status = 'confirmed' for update`, [negocio, numero])).rows[0];
    if (!o) return { ok: false, msg: { es: "Este pedido ya cambió. Actualiza la pantalla.", en: "This order already changed. Refresh the screen." } };
    await c.query(`update operations set details = details || jsonb_build_object('tracking', $2::text), updated_at = now() where id = $1`, [o.id, u]);
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1, 'tracking', 'member', $2)`, [o.id, actorId]);
    return { ok: true } as const;
  });
}

/* El cliente cancela gratis mientras el negocio no lo acepta. */
export const MOTIVOS_CANCELAR = ["error", "tarda", "ya", "otra"] as const;
export async function cancelarDelCliente(userId: string, numero: string, motivo: string): Promise<ResPaso> {
  if (!/^\d{1,12}$/.test(numero)) return { ok: false, msg: { es: "Ese pedido no existe.", en: "That order does not exist." } };
  await vencer({ userId, numero });
  return tx(async (c) => {
    const o = (await c.query<{ id: string; status: string }>(
      `select id::text, status from operations where user_id = $1 and number = $2 and kind = 'order' for update`, [userId, numero])).rows[0];
    if (!o) return { ok: false, msg: { es: "Ese pedido no existe.", en: "That order does not exist." } };
    if (o.status !== "pending") return { ok: false, msg: o.status === "confirmed" ? { es: "El negocio ya lo aceptó: llama para cambiarlo.", en: "The business already accepted it: call to change it." } : { es: "Este pedido ya no está activo.", en: "This order is no longer active." } };
    const m = (MOTIVOS_CANCELAR as readonly string[]).includes(motivo) ? motivo : null;
    await c.query(`update operations set status = 'cancelled', cancelled_at = now(), cancelled_by = 'user', cancel_reason = $2, updated_at = now() where id = $1`, [o.id, m]);
    await devolver(c, o.id);
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1, 'cancelled', 'user', $2)`, [o.id, userId]);
    return { ok: true, op: o.id } as const;
  }).then(async (r) => {
    if (r.ok && "op" in r) await liberarOperacion(r.op as string);
    return r.ok ? { ok: true as const } : r;
  });
}

/* Para «Volver a pedir» y «Cancelar y editar»: las líneas como carrito (plato, opciones por grupo e índice). */
export async function lineasComoCarrito(userId: string, numero: string) {
  const r = await db().query<{ negocio: string; item_id: string | null; qty: number; options: { gid?: string; ix?: number; o: Bi }[]; instructions: string | null }>(
    `select o.business_id as negocio, l.item_id::text, l.qty, l.options, l.instructions
       from operation_lines l join operations o on o.id = l.operation_id where o.user_id = $1 and o.number = $2 order by l.id`, [userId, numero]);
  return r.rows.filter((l) => l.item_id).map((l) => {
    const ch: Record<string, number[]> = {}, k: Record<string, string[]> = {};
    for (const x of Array.isArray(l.options) ? l.options : []) if (x.gid != null && x.ix != null) { (ch[x.gid] ??= []).push(x.ix); (k[x.gid] ??= []).push(x.o.es); }
    return { negocio: l.negocio, id: l.item_id!, ch, k, q: l.qty, nt: l.instructions ?? "" };
  });
}

/* ── Pedidos en línea (ajustes del negocio, DeliverySettings) ── */
export type AjustesPed = {
  prep: number; sched: boolean; auto: boolean; cashP: boolean; card: boolean; on: boolean; admOff: string | null; pickupNote: Bi | null; busy: number; last: number;
  // Entrega (DASH-ENTREGA) y cómo se paga en delivery.
  pickup: boolean; delivery: boolean; cashD: boolean; tip: boolean; zone: number; fee: number; free: number; min: number; travel: number; dEnd: number;
  who: "team" | "external"; ext: "doordash" | "uber_eats" | "other" | null; dlvAdm: string | null;
  proof: boolean; pickupCode: boolean; // 9n · prueba de entrega y código de recogida (Mi equipo)
  stripe: "none" | "pending" | "enabled" | "restricted"; // la cuenta de cobro (Cobros): la tarjeta pide «enabled» o «restricted» con cargos
};
export async function ajustesPedidos(negocio: string): Promise<AjustesPed> {
  const r = await db().query<{ prep: number; sched: boolean; auto: boolean; cashp: boolean; card: boolean; on: boolean; adm: string | null; note: Bi | null; busy: number; last: number;
    pickup: boolean; delivery: boolean; cashd: boolean; tip: boolean; zone: number; fee: number; free: number; min: number; travel: number; dend: number; who: "team" | "external"; ext: AjustesPed["ext"]; dadm: string | null; stripe: string | null; cargos: boolean | null;
    proof: boolean | null; pcode: boolean | null }>(
    `select coalesce(d.prep_min, 20) as prep, coalesce(d.scheduled_orders, true) as sched, coalesce(d.auto_accept, false) as auto,
            coalesce(d.pay_cash_pickup, true) as cashp, coalesce(d.pay_card, false) as card, 'pedidos' = any(b.modules_on) as on,
            b.modules_off->'pedidos'->>'reason' as adm, d.pickup_note as note, coalesce(m.busy_min, 0) as busy, coalesce(m.last_min, 15) as last,
            coalesce(d.pickup, true) as pickup, coalesce(d.delivery, false) as delivery, coalesce(d.pay_cash_delivery, false) as cashd, coalesce(d.ask_tip, true) as tip,
            coalesce(d.zone_mi, 3) as zone, coalesce(d.fee_cents, 300) as fee, coalesce(d.free_over_cents, 0) as free, coalesce(d.min_order_cents, 0) as min,
            coalesce(d.travel_min, 15) as travel, coalesce(d.last_delivery_min, 0) as dend, coalesce(d.who, 'team') as who, d.external_app as ext,
            b.modules_off->'delivery'->>'reason' as dadm, sa.status as stripe, sa.charges_enabled as cargos, d.proof, d.pickup_code as pcode
       from businesses b left join delivery_settings d on d.business_id = b.id left join menu_settings m on m.business_id = b.id left join stripe_accounts sa on sa.business_id = b.id where b.id = $1`, [negocio]);
  const x = r.rows[0];
  return { prep: x?.prep ?? 20, sched: x?.sched ?? true, auto: x?.auto ?? false, cashP: x?.cashp ?? true, card: x?.card ?? false, on: !!x?.on, admOff: x?.adm ?? null, pickupNote: x?.note ?? null, busy: x?.busy ?? 0, last: x?.last ?? 15,
    pickup: x?.pickup ?? true, delivery: x?.delivery ?? false, cashD: x?.cashd ?? false, tip: x?.tip ?? true, zone: x?.zone ?? 3, fee: x?.fee ?? 300, free: x?.free ?? 0, min: x?.min ?? 0,
    travel: x?.travel ?? 15, dEnd: x?.dend ?? 0, who: x?.who ?? "team", ext: x?.ext ?? null, dlvAdm: x?.dadm ?? null, proof: !!x?.proof, pickupCode: !!x?.pcode,

    stripe: !x?.stripe ? "none" : x.cargos ? (x.stripe === "restricted" ? "restricted" : "enabled") : "pending" };
}

/* Cuántos pedidos esperan respuesta del negocio (pestañas de Clientes). */
export async function pedidosPendientes(negocio: string) {
  await vencer({ negocio });
  return (await db().query<{ n: number }>(`select count(*)::int as n from operations where business_id = $1 and kind = 'order' and status = 'pending'`, [negocio])).rows[0]?.n ?? 0;
}
