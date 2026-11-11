import "server-only";
import type { PoolClient } from "pg";
import { firmarQR, matrizQR } from "./boletos-qr";
import { validarCodigo, normalizarCodigo } from "./codigos-evt";
import { comision } from "./cobros";
import { valores } from "./config";
import { dispositivo } from "./cuenta";
import { db, tx } from "./db";
import { ENTORNO } from "./entorno";
import { bi, diaCorto, dinero, sumarDias, valeL, type Bi } from "./evt-comun";
import { pasarela } from "./pagos/pasarela";

/* 6c · Boletos, mesas, extras y códigos: apartar, comprar en nuestra hoja, el boleto y Mis boletos (fase6-eventos.md §3 y §4 6c).
   El servidor decide TODO: precio, existencias, apartado, código, comisión y quién ve qué. El teléfono manda ids y cantidades
   (BoletosIn no trae montos: guardián dineroDelServidor) y muestra lo que vuelve.
   - Existencias sin sobreventa: apartar = una transacción con `update … set held_n = held_n + q where … and sold_n + held_n + q <= quantity`
     (y lo mismo en mesas, extras y el código); si una fila no alcanza, nada se aparta. El check de la tabla es la última barrera
     (guardián boletosSinSobreventa). Agotado es derivado.
   - El apartado vence a evt_apartado_min (Configuración): el barrido lo suelta (vencerApartados) y toda lectura suelta antes los
     vencidos de esa fecha; el contador de la pantalla es solo pantalla (guardián apartadoLoLlevaElServidor).
   - Comprar: candado del apartado (doble toque = una sola orden) → apartado vivo (o se aparta otra vez; si ya no hay: «Se acabaron
     mientras pagabas. No se cobró nada.») → AUTORIZAR la tarjeta (retenerPlataforma, captura manual, idempotente por apartado +
     tarjeta) → se anota la autorización en el apartado → transacción: held → sold, la orden B-…, los boletos con su comisión de
     fee_rules «bol» (5 % + $1 por boleto, sale de lo del organizador: el precio que ve el cliente es el total) → CAPTURAR. Si la captura
     falla: los boletos se anulan, la existencia vuelve y se libera la autorización (guardián nadaSeCobraSinBoleto).
   - El dinero queda en la plataforma (transfer_group = el evento); al organizador se le transfiere después de la fecha (6e).
   - Nadie ve los boletos de otro: toda lectura del cliente va por su user_id; el panel, por su negocio; el admin, por su permiso. */
type Q = Pick<PoolClient, "query">;
const ID = /^\d{1,18}$/, UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, NUM_B = /^B-\d{1,10}$/, CODIGO_BOL = /^TL-[A-HJ-NP-Z2-9]{3}-[2-9]{4}$/;
export { NUM_B, CODIGO_BOL };
class NoBol extends Error { constructor(public msg: Bi, public extra: Record<string, unknown> = {}) { super(msg.es); } }
const no = (es: string, en: string, extra: Record<string, unknown> = {}) => new NoBol({ es, en }, extra);
type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi; vencido?: true; tarjeta?: true; agotado?: true; entrar?: true };

/* Lo que manda el teléfono: ids y cantidades. Nunca precios ni totales. */
export type BoletosIn = { fecha: string; boletos: { id: string; q: number }[]; mesa: string | null; extras: string[]; codigo: string | null };
type Linea = { k: "t" | "m" | "a"; id: string; q: number; unit: number; n: Bi; seats?: number };

/* ── La venta de una fecha: qué se puede hacer ahora (lo decide el servidor) ── */
export type EstadoVenta = "abierta" | "pausada" | "cerrada" | "pasado" | "free" | "sin_cobros";
type FilaVenta = {
  eid: string; slug: string; title: Bi; est: string; entry: string; biz: string; bname: string; mpp: number | null; edad: number; fid: string; ldate: string; city: string; tz: string;
  listable: boolean; dst: string; pasado: boolean; cerrada: boolean; pro: boolean; cuenta: string | null; h0: number; hasta: string; img: string | null; dark: boolean; venue: string;
  kind: "single" | "series" | "span"; span: number; inicio: string;
};
export async function filaVenta(q: Q, fecha: string): Promise<FilaVenta | null> {
  return (await q.query<FilaVenta>(
    `select e.id::text as eid, e.slug, e.title, e.status as est, e.entry, b.id as biz, b.name as bname, e.max_per_person as mpp, e.min_age as edad, d.id::text as fid,
            d.local_date::text as ldate, d.city_id as city, ci.timezone as tz, d.listable, d.status as dst, d.ends_at <= now() as pasado, bol_venta_hasta(e, d) <= now() as cerrada,
            coalesce(st.plan, 'free') = 'pro' as pro, (select a.stripe_account_id from stripe_accounts a where a.business_id = b.id and a.charges_enabled and not a.payouts_paused) as cuenta,
            (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0,
            to_char(bol_venta_hasta(e, d) at time zone ci.timezone, 'FMHH12:MI AM') as hasta, f.dark,
            case when e.venue_mode = 'other' then e.venue_name else b.name end as venue, e.kind, e.span_days as span, e.start_date::text as inicio,
            (select m.url from media m where m.owner_kind = 'event' and m.owner_id = e.id::text and m.status = 'visible' order by m.sort, m.created_at limit 1) as img
       from event_dates d join events e on e.id = d.event_id join businesses b on b.id = e.business_id join cities ci on ci.id = d.city_id join event_formats f on f.key = e.format
       left join business_stats_cache st on st.business_id = b.id
      where d.id = $1::bigint`, [fecha])).rows[0] ?? null;
}
/* Free (§6 #5): el módulo Eventos con boletos es Pro. Cobros: cuenta de cobro habilitada y sin pagos retenidos, del modo que corre
   (simulada solo en el sandbox; real solo con la clave de Stripe). */
export function estadoDe(v: FilaVenta): EstadoVenta | null {
  if (!v.listable || v.dst !== "scheduled" || v.entry !== "tickets") return null;
  // 6f · Un evento de varios días vende en su ancla (el último día): las demás fechas no venden por sí solas.
  if (v.kind === "span" && v.ldate !== sumarDias(v.inicio, v.span - 1)) return null;
  if (v.pasado) return "pasado";
  if (v.est === "paused") return "pausada";
  if (v.est !== "live") return null;
  if (v.cerrada) return "cerrada";
  if (!v.pro) return "free";
  const modo = pasarela.modo();
  if (!v.cuenta || modo === "apagado" || v.cuenta.startsWith("acct_sim_") !== (modo === "simulador")) return "sin_cobros";
  return "abierta";
}
export function textoVenta(e: EstadoVenta, hasta: string, es: boolean): string {
  const E2 = (a: string, b: string) => (es ? a : b);
  return e === "pausada" ? E2("El organizador pausó la venta por ahora. Los que compraron entran igual.", "The organizer paused sales for now. Those who bought still get in.")
    : e === "cerrada" ? E2(`La venta en línea cerró (${hasta}). En la puerta no se venden boletos.`, `Online sales closed (${hasta}). No tickets are sold at the door.`)
    : e === "pasado" ? E2("Este evento ya terminó.", "This event has ended.")
    : e === "free" || e === "sin_cobros" ? E2("El organizador todavía no vende boletos en To'Latino.", "The organizer does not sell tickets on To'Latino yet.")
    : "";
}

/* ── La pantalla de boletos (APP-EVT-BOLETOS) ── */
export type PantallaBoletos = {
  evento: { id: string; slug: string; title: string; dia: string; h0: number; venue: string; img: string | null; dark: boolean; edad: number; org: string };
  fecha: string; estado: EstadoVenta; aviso: string; apartadoMin: number; maxOrden: number; maxPersona: number; yaTengo: number; conCodigos: boolean;
  tipos: { id: string; n: string; s: string; p: number; quedan: number; vale: string }[];
  mesas: { id: string; z: string; seats: number; min: number; dep: number; quedan: number }[];
  extras: { id: string; n: string; s: string; p: number; mesa: boolean; quedan: number | null }[];
  vivo: string | null; // un apartado vivo de esta persona para esta fecha (volver a pagar)
  /* 6f · Varios días: «VIE 20 NOV – DOM 22 NOV · 3 DÍAS» (cada boleto dice para qué día vale). */
  rango: string | null;
};
/* Lo que queda de un tipo: su existencia y, en varios días, el aforo libre del día más lleno de los días que vale (event_day_stock). */
const QUEDAN_T = `greatest(0, least(s.quantity - s.sold_n - s.held_n, coalesce((select min(k.capacity - k.sold_n - k.held_n) from event_day_stock k join event_dates z on z.id = k.event_date_id
                    where z.event_id = t.event_id and z.status = 'scheduled' and k.capacity > 0 and (t.valid_day is null or z.day_index = t.valid_day)), 2147483647)))::int`;
export async function pantallaBoletos(fecha: string, userId: string | null, es: boolean): Promise<PantallaBoletos | null> {
  if (!ID.test(String(fecha))) return null;
  await vencerApartados({ fecha });
  await primeroLaFila(fecha);
  const v = await filaVenta(db(), fecha);
  const estado = v ? estadoDe(v) : null;
  if (!v || !estado) return null;
  const cfg = await valores("evt_apartado_min", "evt_boletos_por_orden_max", "evt_boletos_persona_fecha_max");
  const dev = userId ? await dispositivo(false) : null;
  const [T, M, A, C, ya, vivo] = await Promise.all([
    db().query<{ id: string; n: Bi; s: Bi; p: number; quedan: number; dy: number | null }>(
      `select t.id::text, t.name as n, t.note as s, t.price_cents as p, ${QUEDAN_T} as quedan, t.valid_day as dy
         from ticket_types t join ticket_stock s on s.ticket_type_id = t.id and s.event_date_id = $2::bigint
        where t.event_id = $1::bigint and not t.off and (t.sales_end_at is null or t.sales_end_at > now()) and bol_tipo_hasta(t.id) > now() order by t.sort, t.id`, [v.eid, fecha]),
    db().query<{ id: string; z: Bi; seats: number; min: number; dep: number; quedan: number }>(
      `select t.id::text, t.zone as z, t.seats, t.min_spend_cents as min, t.deposit_cents as dep, greatest(0, s.quantity - s.sold_n - s.held_n)::int as quedan
         from event_tables t join table_stock s on s.table_id = t.id and s.event_date_id = $2::bigint where t.event_id = $1::bigint and not t.off order by t.sort, t.id`, [v.eid, fecha]),
    db().query<{ id: string; n: Bi; s: Bi; p: number; mesa: boolean; quedan: number | null }>(
      `select id::text, name as n, descr as s, price_cents as p, table_only as mesa, case when quantity is null then null else greatest(0, quantity - sold_n - held_n) end::int as quedan
         from event_addons where event_id = $1::bigint and not off order by sort, event_addons.id`, [v.eid]),
    db().query<{ n: number }>(`select count(*)::int as n from discount_codes where event_id = $1::bigint and status = 'on' and used_n + held_n < uses_max`, [v.eid]),
    userId ? entradasDe(db(), fecha, userId, dev, null, null) : Promise.resolve(0),
    userId ? db().query<{ id: string }>(`select id::text from ticket_holds where user_id = $1 and event_date_id = $2::bigint and status = 'held' and expires_at > now() order by created_at desc limit 1`, [userId, fecha]) : Promise.resolve({ rows: [] as { id: string }[] }),
  ]);
  const nm = (x: Bi) => bi(x, es);
  return {
    evento: { id: v.eid, slug: v.slug, title: nm(v.title), dia: v.ldate, h0: v.h0, venue: v.venue, img: v.img, dark: v.dark, edad: v.edad, org: v.bname },
    fecha, estado, aviso: textoVenta(estado, v.hasta, es), apartadoMin: cfg.evt_apartado_min, maxOrden: cfg.evt_boletos_por_orden_max,
    maxPersona: Math.min(cfg.evt_boletos_persona_fecha_max, v.mpp ?? 1000), yaTengo: ya, conCodigos: (C.rows[0]?.n ?? 0) > 0,
    tipos: T.rows.map((t) => ({ id: t.id, n: nm(t.n), s: nm(t.s), p: t.p, quedan: t.quedan, vale: v.kind === "span" ? valeL(t.dy, v.inicio, v.span, es) : "" })),
    mesas: M.rows.map((m) => ({ id: m.id, z: nm(m.z), seats: m.seats, min: m.min, dep: m.dep, quedan: m.quedan })),
    extras: A.rows.map((a) => ({ id: a.id, n: nm(a.n), s: nm(a.s), p: a.p, mesa: a.mesa, quedan: a.quedan })),
    vivo: vivo.rows[0]?.id ?? null,
    rango: v.kind === "span" ? `${diaCorto(v.inicio, es).toUpperCase()} – ${diaCorto(sumarDias(v.inicio, v.span - 1), es).toUpperCase()} · ${v.span} ${es ? "DÍAS" : "DAYS"}` : null,
  };
}

/* La ficha del evento: si se vende ahora, por qué no, y lo que queda de cada boleto y mesa. */
export type VentaFicha = { estado: EstadoVenta; aviso: string; agotado: boolean; espera: number; pol: { cancelarH: number; transferirH: number }; tipos: { n: string; s: string; p: number; quedan: number; vale: string }[]; mesas: { z: string; seats: number; min: number; dep: number; quedan: number }[] };
export async function ventaFicha(fecha: string, es: boolean): Promise<VentaFicha | null> {
  if (!ID.test(String(fecha))) return null;
  await vencerApartados({ fecha });
  await primeroLaFila(fecha);
  const v = await filaVenta(db(), fecha), estado = v ? estadoDe(v) : null;
  if (!v || !estado) return null;
  const [T, M, W, cfg] = await Promise.all([
    db().query<{ n: Bi; s: Bi; p: number; quedan: number; dy: number | null; corte: boolean }>(
      `select t.name as n, t.note as s, t.price_cents as p, ${QUEDAN_T} as quedan, t.valid_day as dy, bol_tipo_hasta(t.id) <= now() as corte
         from ticket_types t join ticket_stock s on s.ticket_type_id = t.id and s.event_date_id = $2::bigint where t.event_id = $1::bigint and not t.off order by t.sort, t.id`, [v.eid, fecha]),
    db().query<{ z: Bi; seats: number; min: number; dep: number; quedan: number }>(
      `select t.zone as z, t.seats, t.min_spend_cents as min, t.deposit_cents as dep, greatest(0, s.quantity - s.sold_n - s.held_n)::int as quedan
         from event_tables t join table_stock s on s.table_id = t.id and s.event_date_id = $2::bigint where t.event_id = $1::bigint and not t.off order by t.sort, t.id`, [v.eid, fecha]),
    db().query<{ n: number }>(`select count(*)::int as n from waitlist where event_date_id = $1::bigint and status = 'waiting'`, [fecha]),
    valores("bol_cancelar_h", "bol_transferir_h"),
  ]);
  // 6d · Agotado = no queda ningún boleto (la lista de espera se abre con eso; una mesa libre se sigue vendiendo).
  const agotado = T.rows.every((x) => x.quedan === 0) && M.rows.every((x) => x.quedan === 0);
  return { estado, aviso: textoVenta(estado, v.hasta, es), agotado, espera: W.rows[0]?.n ?? 0, pol: { cancelarH: cfg.bol_cancelar_h, transferirH: cfg.bol_transferir_h },
    tipos: T.rows.map((x) => ({ n: bi(x.n, es), s: bi(x.s, es), p: x.p, quedan: x.corte ? 0 : x.quedan, vale: v.kind === "span" ? valeL(x.dy, v.inicio, v.span, es) : "" })),
    mesas: M.rows.map((x) => ({ z: bi(x.z, es), seats: x.seats, min: x.min, dep: x.dep, quedan: x.quedan })) };
}

/* Entradas de una persona para una fecha: boletos vivos (por cuenta, dispositivo o la misma tarjeta guardada) + apartados vivos. */
export async function entradasDe(q: Q, fecha: string, userId: string, dev: string | null, pm: string | null, sinApartado: string | null): Promise<number> {
  return (await q.query<{ n: number }>(
    `select (coalesce((select sum(t.admits) from tickets t join operations o on o.id = t.operation_id left join ticket_holds h on h.operation_id = o.id
                        where t.event_date_id = $1::bigint and t.status in ('valid', 'used') and t.kind = 'paid'
                          and (o.user_id = $2 or ($3::uuid is not null and h.device = $3::uuid)
                               or ($4::text is not null and exists (select 1 from payments p where p.operation_id = o.id and p.payment_method = $4)))), 0)
           + coalesce((select sum(admits_n) from ticket_holds where event_date_id = $1::bigint and status = 'held' and expires_at > now()
                         and (user_id = $2 or ($3::uuid is not null and device = $3::uuid)) and ($5::uuid is null or id <> $5::uuid)), 0))::int as n`,
    [fecha, userId, dev, pm, sinApartado])).rows[0]?.n ?? 0;
}

/* ── Apartar (al tocar «Continuar»): todo o nada, dentro de una transacción ── */
export async function apartar(userId: string, raw: BoletosIn): Promise<Res<{ apartado: string }>> {
  const fecha = String(raw?.fecha ?? "");
  if (!ID.test(fecha)) return { ok: false, msg: { es: "Esa fecha no existe.", en: "That date does not exist." } };
  const boletos = (Array.isArray(raw?.boletos) ? raw.boletos : []).slice(0, 16).map((b) => ({ id: String(b?.id ?? ""), q: Math.floor(Number(b?.q)) }))
    .filter((b) => ID.test(b.id) && b.q > 0);
  if (boletos.some((b) => !(b.q >= 1 && b.q <= 50)) || new Set(boletos.map((b) => b.id)).size !== boletos.length) return { ok: false, msg: { es: "Revisa las cantidades.", en: "Check the quantities." } };
  const mesa = raw?.mesa != null && ID.test(String(raw.mesa)) ? String(raw.mesa) : null;
  const extras = [...new Set((Array.isArray(raw?.extras) ? raw.extras : []).map(String).filter((x) => ID.test(x)))].slice(0, 12);
  const codigo = raw?.codigo ? normalizarCodigo(raw.codigo) : "";
  if (!boletos.length && !mesa) return { ok: false, msg: { es: "Elige al menos un boleto o una mesa.", en: "Pick at least one ticket or a table." } };
  const dev = await dispositivo(false);
  const cfg = await valores("evt_apartado_min", "evt_boletos_por_orden_max", "evt_boletos_persona_fecha_max", "evt_apartados_vivos_max");
  await vencerApartados({ fecha });
  // 6d · Lo que se liberó es primero para la lista de espera (en orden); lo que nadie de la fila puede usar queda para todos.
  await primeroLaFila(fecha);
  const v0 = await filaVenta(db(), fecha);
  if (!v0 || estadoDe(v0) == null) return { ok: false, msg: { es: "Esa fecha no está a la venta.", en: "That date is not on sale." } };
  let codigoId: string | null = null;
  if (codigo) {
    if (!boletos.length) return { ok: false, msg: { es: "El código vale para boletos, no para la mesa.", en: "The code is for tickets, not the table." } };
    const c = await validarCodigo(userId, dev, v0.eid, codigo);
    if (!c.ok) return { ok: false, msg: c.msg };
    codigoId = c.id;
  }
  try {
    const id = await tx(async (c) => {
      const v = await filaVenta(c, fecha);
      const est = v ? estadoDe(v) : null;
      if (!v || est !== "abierta") throw no(v && est ? textoVenta(est, v.hasta, true) || "Esa fecha no está a la venta." : "Esa fecha no está a la venta.", v && est ? textoVenta(est, v.hasta, false) || "That date is not on sale." : "That date is not on sale.");
      // Volver a elegir reemplaza el apartado anterior de esta fecha.
      for (const h of (await c.query<{ id: string }>(`select id::text from ticket_holds where user_id = $1 and event_date_id = $2::bigint and status = 'held' order by ticket_holds.id`, [userId, fecha])).rows) await soltarEn(c, h.id, "released");
      const vivos = (await c.query<{ n: number }>(`select count(*)::int as n from ticket_holds where user_id = $1 and status = 'held' and expires_at > now()`, [userId])).rows[0]?.n ?? 0;
      if (vivos >= cfg.evt_apartados_vivos_max) throw no("Tienes otras compras de boletos abiertas. Termina o deja vencer una.", "You have other ticket checkouts open. Finish one or let it expire.");
      const nTk = boletos.reduce((s, b) => s + b.q, 0);
      if (nTk > cfg.evt_boletos_por_orden_max) throw no(`Hasta ${cfg.evt_boletos_por_orden_max} boletos por orden.`, `Up to ${cfg.evt_boletos_por_orden_max} tickets per order.`);
      const lineas: Linea[] = [];
      // Boletos (por id, siempre en el mismo orden: dos compras a la vez no se traban).
      for (const b of [...boletos].sort((x, y) => Number(x.id) - Number(y.id))) {
        const r = (await c.query<{ p: number; n: Bi }>(
          `update ticket_stock s set held_n = s.held_n + $3, updated_at = now() from ticket_types t
            where s.ticket_type_id = t.id and t.id = $1::bigint and t.event_id = $4::bigint and not t.off and (t.sales_end_at is null or t.sales_end_at > now()) and bol_tipo_hasta(t.id) > now()
              and s.event_date_id = $2::bigint and s.sold_n + s.held_n + $3 <= s.quantity
          returning t.price_cents as p, t.name as n`, [b.id, fecha, b.q, v.eid])).rows[0];
        if (!r) {
          const x = (await c.query<{ quedan: number; n: Bi }>(`select greatest(0, s.quantity - s.sold_n - s.held_n)::int as quedan, t.name as n from ticket_stock s join ticket_types t on t.id = s.ticket_type_id
                                                              where t.id = $1::bigint and t.event_id = $2::bigint and s.event_date_id = $3::bigint and not t.off`, [b.id, v.eid, fecha])).rows[0];
          if (!x) throw no("Ese boleto ya no se vende.", "That ticket is no longer sold.");
          throw no(x.quedan ? `${x.n.es}: solo quedan ${x.quedan}.` : `${x.n.es}: agotado.`, x.quedan ? `${x.n.en || x.n.es}: only ${x.quedan} left.` : `${x.n.en || x.n.es}: sold out.`, { agotado: true });
        }
        lineas.push({ k: "t", id: b.id, q: b.q, unit: r.p, n: r.n });
      }
      if (mesa) {
        const r = (await c.query<{ dep: number; n: Bi; seats: number }>(
          `update table_stock s set held_n = s.held_n + 1, updated_at = now() from event_tables t
            where s.table_id = t.id and t.id = $1::bigint and t.event_id = $3::bigint and not t.off and s.event_date_id = $2::bigint and s.sold_n + s.held_n + 1 <= s.quantity
          returning t.deposit_cents as dep, t.zone as n, t.seats`, [mesa, fecha, v.eid])).rows[0];
        if (!r) throw no("Esa mesa se agotó. Elige otra.", "That table sold out. Pick another.", { agotado: true });
        lineas.push({ k: "m", id: mesa, q: 1, unit: r.dep, n: r.n, seats: r.seats });
      }
      for (const a of [...extras].sort((x, y) => Number(x) - Number(y))) {
        const r = (await c.query<{ p: number; n: Bi }>(
          `update event_addons set held_n = held_n + 1, updated_at = now() where id = $1::bigint and event_id = $2::bigint and not off and (not table_only or $3)
              and (quantity is null or sold_n + held_n + 1 <= quantity) returning price_cents as p, name as n`, [a, v.eid, !!mesa])).rows[0];
        if (!r) throw no("Ese extra ya no está (o va solo con mesa).", "That extra is not available (or comes only with a table).", { agotado: true });
        lineas.push({ k: "a", id: a, q: 1, unit: r.p, n: r.n });
      }
      // Máximo por persona y fecha (cuenta + dispositivo; la tarjeta se mira al pagar). Las entradas de una mesa cuentan.
      const admits = lineas.reduce((s, l) => s + (l.k === "t" ? l.q : l.k === "m" ? l.seats ?? 1 : 0), 0);
      const maxP = Math.min(cfg.evt_boletos_persona_fecha_max, v.mpp ?? 1000), ya = await entradasDe(c, fecha, userId, dev, null, null);
      if (ya + admits > maxP) throw no(`Hasta ${maxP} entradas por persona para esta fecha${ya ? ` (ya tienes ${ya})` : ""}.`, `Up to ${maxP} entries per person for this date${ya ? ` (you already have ${ya})` : ""}.`);
      // El código: el uso se aparta con la fila bloqueada; una vez por persona y evento.
      const subTk = lineas.filter((l) => l.k === "t").reduce((s, l) => s + l.unit * l.q, 0);
      let desc = 0;
      if (codigoId) {
        const k = (await c.query<{ kind: string; value: number }>(`update discount_codes set held_n = held_n + 1 where id = $1::bigint and event_id = $2::bigint and status = 'on' and used_n + held_n < uses_max returning kind, value`, [codigoId, v.eid])).rows[0];
        if (!k) throw no("Ese código ya se usó todas las veces.", "That code has been used up.");
        if ((await c.query(`select 1 from ticket_holds where code_id = $1::bigint and user_id = $2 and status in ('held', 'converted')`, [codigoId, userId])).rowCount) throw no("Ya usaste ese código en este evento.", "You already used that code for this event.");
        desc = descuentoDe(k.kind, k.value, subTk, nTk);
      }
      const sub = lineas.reduce((s, l) => s + l.unit * l.q, 0), total = sub - desc;
      if (!(total > 0)) throw no("Revisa tu orden.", "Check your order.");
      return (await c.query<{ id: string }>(
        `insert into ticket_holds (user_id, device, event_id, event_date_id, city_id, lines, code_id, subtotal_cents, discount_cents, total_cents, tickets_n, admits_n, expires_at)
         values ($1, $2, $3::bigint, $4::bigint, $5, $6::jsonb, $7::bigint, $8, $9, $10, $11, $12, now() + make_interval(mins => $13::int)) returning id::text`,
        [userId, dev, v.eid, fecha, v.city, JSON.stringify(lineas), codigoId, sub, desc, total, nTk + (mesa ? 1 : 0), Math.max(1, admits), cfg.evt_apartado_min])).rows[0]!.id;
    });
    return { ok: true, apartado: id };
  } catch (e) {
    if (e instanceof NoBol) return { ok: false, msg: e.msg, ...(e.extra as object) };
    // 6f · El aforo de un día (varios días) lo cuenta la base: si un día no alcanza, nada se aparta.
    if ((e as { constraint?: string }).constraint === "event_day_stock_cupo") return { ok: false, msg: { es: "Un día de los que elegiste ya llegó a su aforo. Elige otro día o menos boletos.", en: "One of the days you picked reached its capacity. Pick another day or fewer tickets." }, agotado: true };
    throw e;
  }
}

/* El descuento baja los boletos (no la mesa ni los extras) y nunca deja un boleto en menos de $2 (cubre la comisión de 5 % + $1). */
function descuentoDe(kind: string, value: number, subTk: number, nTk: number) {
  return Math.max(0, Math.min(kind === "pct" ? Math.round((subTk * value) / 100) : value, subTk - 200 * nTk));
}
/* «Aplicar» en la pantalla de boletos: el servidor dice si el código vale y cuánto baja con lo elegido (sin apartar nada). Cuenta como
   intento (límite de intentos). Al continuar, apartar() lo vuelve a decidir con la fila del código bloqueada. */
export async function previoCodigo(userId: string, fecha: string, boletosRaw: unknown, codigoRaw: unknown): Promise<{ ok: true; codigo: string; descuento: number } | { ok: false; msg: Bi }> {
  if (!ID.test(String(fecha))) return { ok: false, msg: { es: "Esa fecha no existe.", en: "That date does not exist." } };
  const v = await filaVenta(db(), fecha);
  if (!v || estadoDe(v) !== "abierta") return { ok: false, msg: { es: "Esa fecha no está a la venta.", en: "That date is not on sale." } };
  const B = (Array.isArray(boletosRaw) ? boletosRaw : []).slice(0, 16).map((b: { id?: unknown; q?: unknown }) => ({ id: String(b?.id ?? ""), q: Math.floor(Number(b?.q)) })).filter((b) => ID.test(b.id) && b.q >= 1 && b.q <= 50);
  if (!B.length) return { ok: false, msg: { es: "Elige tus boletos y después aplica el código.", en: "Pick your tickets, then apply the code." } };
  const codigo = normalizarCodigo(codigoRaw), dev = await dispositivo(false);
  const c = await validarCodigo(userId, dev, v.eid, codigo);
  if (!c.ok) return { ok: false, msg: c.msg };
  const k = (await db().query<{ kind: string; value: number; libre: boolean; usado: boolean }>(
    `select kind, value, used_n + held_n < uses_max as libre, exists (select 1 from ticket_holds h where h.code_id = d.id and h.user_id = $2 and h.status in ('held', 'converted')) as usado
       from discount_codes d where id = $1::bigint`, [c.id, userId])).rows[0];
  if (!k?.libre) return { ok: false, msg: { es: "Ese código ya se usó todas las veces.", en: "That code has been used up." } };
  if (k.usado) return { ok: false, msg: { es: "Ya usaste ese código en este evento.", en: "You already used that code for this event." } };
  const P = (await db().query<{ id: string; p: number }>(`select id::text, price_cents as p from ticket_types where event_id = $1::bigint and id = any($2::bigint[]) and not off`, [v.eid, B.map((b) => b.id)])).rows;
  const subTk = B.reduce((s, b) => s + (P.find((x) => x.id === b.id)?.p ?? 0) * b.q, 0), nTk = B.reduce((s, b) => s + b.q, 0);
  return { ok: true, codigo, descuento: descuentoDe(k.kind, k.value, subTk, nTk) };
}

/* Soltar un apartado (dentro de una transacción): la existencia vuelve. `vencido` solo suelta si de verdad venció. */
async function soltarEn(c: Q, holdId: string, estado: "expired" | "released"): Promise<boolean> {
  const h = (await c.query<{ id: string; fid: string; eid: string; lines: Linea[]; code: string | null }>(
    `select id::text, event_date_id::text as fid, event_id::text as eid, lines, code_id::text as code from ticket_holds
      where id = $1::uuid and status = 'held' ${estado === "expired" ? "and expires_at <= now()" : ""} for update`, [holdId])).rows[0];
  if (!h) return false;
  for (const l of h.lines) {
    if (l.k === "t") await c.query(`update ticket_stock set held_n = held_n - $3, updated_at = now() where ticket_type_id = $1::bigint and event_date_id = $2::bigint`, [l.id, h.fid, l.q]);
    else if (l.k === "m") await c.query(`update table_stock set held_n = held_n - 1, updated_at = now() where table_id = $1::bigint and event_date_id = $2::bigint`, [l.id, h.fid]);
    else await c.query(`update event_addons set held_n = held_n - 1, updated_at = now() where id = $1::bigint`, [l.id]);
  }
  if (h.code) await c.query(`update discount_codes set held_n = held_n - 1 where id = $1::bigint`, [h.code]);
  await c.query(`update ticket_holds set status = $2 where id = $1::uuid`, [h.id, estado]);
  return true;
}
/* Volver a apartar lo de un apartado vencido (al pagar). Todo o nada; false si ya no alcanza. */
async function reapartarEn(c: Q, h: { id: string; fid: string; eid: string; lines: Linea[]; code: string | null }, minutos: number): Promise<boolean> {
  for (const l of h.lines) {
    const r = l.k === "t" ? await c.query(`update ticket_stock set held_n = held_n + $3 where ticket_type_id = $1::bigint and event_date_id = $2::bigint and sold_n + held_n + $3 <= quantity`, [l.id, h.fid, l.q])
      : l.k === "m" ? await c.query(`update table_stock set held_n = held_n + 1 where table_id = $1::bigint and event_date_id = $2::bigint and sold_n + held_n + 1 <= quantity`, [l.id, h.fid])
      : await c.query(`update event_addons set held_n = held_n + 1 where id = $1::bigint and (quantity is null or sold_n + held_n + 1 <= quantity)`, [l.id]);
    if (!r.rowCount) return false;
  }
  if (h.code && !(await c.query(`update discount_codes set held_n = held_n + 1 where id = $1::bigint and status = 'on' and used_n + held_n < uses_max`, [h.code])).rowCount) return false;
  await c.query(`update ticket_holds set status = 'held', expires_at = now() + make_interval(mins => $2::int) where id = $1::uuid`, [h.id, minutos]);
  return true;
}

/* 6e · Cancelar una fecha: todo lo apartado de esas fechas se suelta (la existencia vuelve) dentro de la transacción de la cancelación. */
export async function soltarApartadosDe(c: Q, fechas: string[]): Promise<number> {
  const L = (await c.query<{ id: string }>(`select id::text from ticket_holds where event_date_id = any($1::bigint[]) and status = 'held'`, [fechas])).rows;
  let n = 0;
  for (const h of L) if (await soltarEn(c, h.id, "released")) n++;
  return n;
}
/* «Cambiar» en la pantalla de pago: soltar mi apartado (la existencia vuelve al momento). */
export async function soltarApartado(userId: string, holdId: string): Promise<boolean> {
  if (!UUID.test(holdId)) return false;
  const r = await tx(async (c) => {
    const h = (await c.query<{ fid: string; wl: string | null }>(`select event_date_id::text as fid, waitlist_id::text as wl from ticket_holds where id = $1::uuid and user_id = $2`, [holdId, userId])).rows[0];
    if (!h || !(await soltarEn(c, holdId, "released"))) return null;
    // 6d · Soltar una oferta de la lista de espera = salir de la lista; el lugar pasa a la siguiente.
    if (h.wl) await c.query(`update waitlist set status = 'left' where id = $1::bigint and status = 'offered'`, [h.wl]);
    return h;
  });
  if (r) await primeroLaFila(r.fid);
  return !!r;
}
/* 6d · Antes de apartar o de mostrar lo que queda: si hay lista de espera, lo libre se le ofrece primero (lib/espera.ts). */
async function primeroLaFila(fecha: string) {
  const e = await import("./espera");
  if (await e.hayFila(fecha)) await e.ofrecer(fecha).catch(() => 0);
}

/* Barrido (cada minuto, y al leer una fecha): suelta los apartados vencidos y libera la autorización que quedó sin orden. */
export async function vencerApartados(o: { fecha?: string } = {}): Promise<number> {
  const L = (await db().query<{ id: string }>(
    `select id::text from ticket_holds where status = 'held' and expires_at <= now() ${o.fecha ? "and event_date_id = $1::bigint" : ""} order by expires_at limit 300`, o.fecha ? [o.fecha] : [])).rows;
  let n = 0;
  for (const h of L) if (await tx((c) => soltarEn(c, h.id, "expired")).catch(() => false)) n++;
  if (!o.fecha) {
    const P = (await db().query<{ id: string; pi: string }>(
      `select id::text, payment_intent as pi from ticket_holds where status in ('expired', 'released') and payment_intent is not null and operation_id is null and pi_released_at is null limit 50`)).rows;
    for (const p of P) {
      const r = await pasarela.liberar(p.pi).catch(() => ({ ok: false }));
      if (r.ok) await db().query(`update ticket_holds set pi_released_at = now(), pay_attempts = pay_attempts + 1 where id = $1::uuid`, [p.id]);
    }
  }
  return n;
}

/* ── La pantalla de pago (APP-EVT-PAGO) ── */
export type PantallaPago = {
  apartado: string; estado: "held" | "expired" | "released" | "converted"; numero: string | null; segundos: number; fecha: string;
  evento: { slug: string; title: string; dia: string; h0: number; venue: string; edad: number; org: string; img: string | null; dark: boolean };
  lineas: { k: "t" | "m" | "a"; n: string; q: number; unit: number; seats?: number }[]; subtotal: number; descuento: number; total: number; boletos: number;
  espera: boolean; // 6d · una oferta de la lista de espera («SE LIBERÓ UN LUGAR»)
};
export async function pantallaPago(userId: string, holdId: string, es: boolean): Promise<PantallaPago | null> {
  if (!UUID.test(String(holdId))) return null;
  const h = (await db().query<{ id: string; st: string; fid: string; lines: Linea[]; sub: number; desc: number; total: number; seg: number; num: string | null; tn: number; espera: boolean }>(
    `select h.id::text, h.status as st, h.event_date_id::text as fid, h.lines, h.subtotal_cents as sub, h.discount_cents as desc, h.total_cents as total,
            greatest(0, extract(epoch from h.expires_at - now()))::int as seg, o.number as num, h.tickets_n as tn, h.waitlist_id is not null as espera
       from ticket_holds h left join operations o on o.id = h.operation_id where h.id = $1::uuid and h.user_id = $2`, [holdId, userId])).rows[0];
  if (!h) return null;
  const v = await filaVenta(db(), h.fid);
  if (!v) return null;
  const vencido = h.st === "held" && h.seg <= 0;
  return {
    apartado: h.id, estado: vencido ? "expired" : (h.st as PantallaPago["estado"]), numero: h.num, segundos: h.seg, fecha: h.fid,
    evento: { slug: v.slug, title: bi(v.title, es), dia: v.ldate, h0: v.h0, venue: v.venue, edad: v.edad, org: v.bname, img: v.img, dark: v.dark },
    lineas: h.lines.map((l) => ({ k: l.k, n: bi(l.n, es), q: l.q, unit: l.unit, seats: l.seats })), subtotal: h.sub, descuento: h.desc, total: h.total, boletos: h.tn, espera: h.espera,
  };
}

/* ── Pagar (en nuestra hoja) ── */
const limpiarNombre = (x: unknown) => String(x ?? "").replace(/[\u0000-\u001F\u007F]/g, "").replace(/\d{3,}/g, "").trim().slice(0, 40);
export async function pagarBoletos(userId: string, holdId: string, pmRaw: unknown, nombresRaw: unknown, entorno: string): Promise<Res<{ numero: string }>> {
  if (!UUID.test(String(holdId))) return { ok: false, msg: { es: "Esa compra no existe.", en: "That purchase does not exist." } };
  const pm = typeof pmRaw === "string" && /^pm_[A-Za-z0-9_]{3,200}$/.test(pmRaw) ? pmRaw : null;
  if (!pm) return { ok: false, msg: { es: "Elige la tarjeta.", en: "Choose the card." }, tarjeta: true };
  const nombres = (Array.isArray(nombresRaw) ? nombresRaw : []).slice(0, 60).map(limpiarNombre);
  const cfg = await valores("evt_apartado_min", "evt_boletos_persona_fecha_max");
  const dev = await dispositivo(false);
  const c = await db().connect();
  let pi: string | null = null, convertido = false;
  try {
    await c.query("begin");
    // Candado del apartado: dos toques (o dos pestañas) = una sola orden. No bloquea la fila: la autorización se anota aparte.
    await c.query(`select pg_advisory_xact_lock(hashtext('bol:' || $1))`, [holdId]);
    type H = { id: string; st: string; fid: string; eid: string; lines: Linea[]; code: string | null; sub: number; desc: number; total: number; vivo: boolean; num: string | null; admits: number; city: string; intento: number; wl: string | null };
    const leerH = async (lock: boolean) => (await c.query<H>(
      `select h.id::text, h.status as st, h.event_date_id::text as fid, h.event_id::text as eid, h.lines, h.code_id::text as code, h.subtotal_cents as sub, h.discount_cents as desc,
              h.total_cents as total, h.expires_at > now() as vivo, o.number as num, h.admits_n as admits, h.city_id as city, h.pay_attempts as intento, h.waitlist_id::text as wl
         from ticket_holds h left join operations o on o.id = h.operation_id where h.id = $1::uuid and h.user_id = $2 ${lock ? "for update of h" : ""}`, [holdId, userId])).rows[0];
    let h = await leerH(false);
    if (!h) throw no("Esa compra no existe.", "That purchase does not exist.");
    if (h.st === "converted" && h.num) { await c.query("commit"); return { ok: true, numero: h.num }; }
    if (h.st === "released") throw no("Soltaste estos boletos. Vuelve a elegirlos.", "You let these tickets go. Pick them again.", { vencido: true });
    const v = await filaVenta(c, h.fid), est = v ? estadoDe(v) : null;
    if (!v || est !== "abierta") {
      await tx((x) => soltarEn(x, holdId, "released")).catch(() => undefined);
      throw no(`${v && est ? textoVenta(est, v.hasta, true) : "Esa fecha ya no está a la venta."} No se cobró nada.`, `${v && est ? textoVenta(est, v.hasta, false) : "That date is no longer on sale."} Nothing was charged.`, { vencido: true });
    }
    // Mientras paga, el apartado no vence (2 min de margen); el contador de la pantalla es solo pantalla.
    if (h.st === "held" && h.vivo) await db().query(`update ticket_holds set expires_at = greatest(expires_at, now() + interval '2 minutes') where id = $1::uuid and status = 'held' and expires_at > now()`, [holdId]);
    // 6d · Una oferta de la lista de espera vencida no se vuelve a apartar: ya pasó a la siguiente persona.
    if (h.wl && (h.st === "expired" || !h.vivo)) throw no("Tu turno venció y el lugar pasó a la siguiente persona. No se cobró nada. Puedes anotarte otra vez.", "Your turn expired and the spot went to the next person. Nothing was charged. You can join again.", { vencido: true });
    // Vencido: se aparta otra vez (en su propia transacción); si ya no hay, no se cobra. Antes, lo libre es de la lista de espera.
    if (h.st === "expired" || !h.vivo) {
      await primeroLaFila(h.fid);
      const otra = await tx(async (x) => {
        if (h!.st === "held") await soltarEn(x, holdId, "expired");
        return reapartarEn(x, h!, cfg.evt_apartado_min);
      }).catch(() => false);
      if (!otra) throw no("Se acabaron mientras pagabas. No se cobró nada.", "They sold out while you were paying. Nothing was charged.", { vencido: true, agotado: true });
      h = (await leerH(false))!;
    }
    // Máximo por persona con la tarjeta (otra cuenta con la misma tarjeta guardada cuenta).
    const ya = await entradasDe(c, h.fid, userId, dev, pm, holdId), maxP = Math.min(cfg.evt_boletos_persona_fecha_max, v.mpp ?? 1000);
    if (ya + h.admits > maxP) throw no(`Hasta ${maxP} entradas por persona para esta fecha. No se cobró nada.`, `Up to ${maxP} entries per person for this date. Nothing was charged.`);
    // 1) Autorizar la tarjeta (no cobra todavía).
    const cliente = await pasarela.cliente(userId).catch(() => null);
    const ret = await pasarela.retenerPlataforma({ centavos: h.total, pm, cliente, idem: `${holdId}-${pm.slice(-24)}-${h.intento}`, grupo: `evt-${h.eid}`, meta: { hold: holdId, event_id: h.eid, business_id: v.biz } });
    if (!ret.ok) throw no(`No se cobró nada y tus boletos siguen guardados. ${ret.mensaje.es}`, `Nothing was charged and your tickets are still held. ${ret.mensaje.en}`, { tarjeta: true });
    pi = ret.pi;
    await db().query(`update ticket_holds set payment_intent = $2, pi_released_at = null where id = $1::uuid and status = 'held'`, [holdId, pi]);
    if (ret.estado === "accion") throw no("Tu banco pide una verificación extra. Prueba con otra tarjeta. No se cobró nada.", "Your bank asks for an extra verification. Try another card. Nothing was charged.", { tarjeta: true });
    // 2) La orden y los boletos, con el apartado bloqueado y todavía vivo.
    h = await leerH(true);
    if (!h || h.st !== "held") throw no("Se acabaron mientras pagabas. No se cobró nada.", "They sold out while you were paying. Nothing was charged.", { vencido: true, agotado: true });
    const numero = `B-${(await c.query<{ n: string }>(`select nextval('ticket_order_seq')::text as n`)).rows[0]!.n}`;
    const det = { event_id: h.eid, event_date_id: h.fid, title: v.title, venue: v.venue, local_date: v.ldate, h0: v.h0 };
    const op = (await c.query<{ id: string }>(
      `insert into operations (number, kind, city_id, business_id, user_id, status, details, subtotal_cents, discount_cents, total_cents, pay_mode, confirmed_at, client_key, is_test)
       values ($1, 'tickets', $2, $3, $4, 'confirmed', $5::jsonb, $6, $7, $8, 'app', now(), $9::uuid, $10) returning id::text`,
      [numero, h.city, v.biz, userId, JSON.stringify(det), h.sub, h.desc, h.total, holdId, entorno !== "produccion"])).rows[0]!.id;
    // Lo apartado pasa a vendido (la misma fila: si algo no cuadra, la base lo rechaza).
    const nTk = h.lines.filter((l) => l.k === "t").reduce((s, l) => s + l.q, 0);
    let fee = 0, ix = 0, restoDesc = h.desc;
    const subTk = h.lines.filter((l) => l.k === "t").reduce((s, l) => s + l.unit * l.q, 0);
    for (const l of h.lines) {
      await c.query(`insert into operation_lines (operation_id, item_id, name, qty, unit_price_cents, line_total_cents, tax_pct, options) values ($1::bigint, null, $2::jsonb, $3, $4, $5, 0, $6::jsonb)`,
        [op, JSON.stringify(l.n), l.q, l.unit, l.unit * l.q, JSON.stringify([{ k: l.k, id: l.id }])]);
      if (l.k === "t") {
        const u = await c.query(`update ticket_stock set held_n = held_n - $3, sold_n = sold_n + $3, updated_at = now() where ticket_type_id = $1::bigint and event_date_id = $2::bigint and held_n >= $3`, [l.id, h.fid, l.q]);
        if (!u.rowCount) throw new Error("existencia de boletos descuadrada");
        for (let i = 0; i < l.q; i++) {
          ix++;
          // El descuento se reparte entre los boletos (el último lleva el resto); la comisión es la del precio pagado.
          const d = ix === nTk ? restoDesc : Math.min(restoDesc, Math.floor((h.desc * l.unit) / Math.max(1, subTk)));
          restoDesc -= d;
          const pagado = l.unit - d, f = Math.min(await comision(c, "bol", pagado, 1), pagado);
          fee += f;
          await c.query(`insert into tickets (event_date_id, event_id, city_id, ticket_type_id, operation_id, holder_user_id, holder_name, admits, kind, price_cents, fee_cents, discount_cents)
                         values ($1::bigint, $2::bigint, $3, $4::bigint, $5::bigint, $6, $7, 1, 'paid', $8, $9, $10)`, [h.fid, h.eid, h.city, l.id, op, userId, nombres[ix - 1] || null, pagado, f, d]);
        }
      } else if (l.k === "m") {
        const u = await c.query(`update table_stock set held_n = held_n - 1, sold_n = sold_n + 1, updated_at = now() where table_id = $1::bigint and event_date_id = $2::bigint and held_n >= 1`, [l.id, h.fid]);
        if (!u.rowCount) throw new Error("existencia de mesas descuadrada");
        const f = Math.min(await comision(c, "bol", l.unit, 1), l.unit);
        fee += f;
        await c.query(`insert into tickets (event_date_id, event_id, city_id, table_id, operation_id, holder_user_id, holder_name, admits, kind, price_cents, fee_cents)
                       values ($1::bigint, $2::bigint, $3, $4::bigint, $5::bigint, $6, $7, $8, 'paid', $9, $10)`, [h.fid, h.eid, h.city, l.id, op, userId, nombres[nTk] || null, l.seats ?? 1, l.unit, f]);
      } else {
        const u = await c.query(`update event_addons set held_n = held_n - 1, sold_n = sold_n + 1, updated_at = now() where id = $1::bigint and held_n >= 1`, [l.id]);
        if (!u.rowCount) throw new Error("existencia de extras descuadrada");
      }
    }
    const extrasT = h.lines.filter((l) => l.k === "a").reduce((s, l) => s + l.unit, 0);
    if (extrasT) fee += Math.min(await comision(c, "bol", extrasT, 0), extrasT); // extras: el porcentaje, sin el fijo por boleto
    if (h.code) await c.query(`update discount_codes set held_n = held_n - 1, used_n = used_n + 1 where id = $1::bigint and held_n >= 1`, [h.code]);
    await c.query(`insert into payments (operation_id, user_id, business_id, city_id, kind, method, stripe_payment_intent, amount_cents, held_cents, fee_cents, status, card_brand, card_last4, held_at, simulated, payment_method, transfer_group)
                   values ($1::bigint, $2, $3, $4, 'full', 'card', $5, $6, $6, $7, 'held', $8, $9, now(), $10, $11, $12)`,
      [op, userId, v.biz, h.city, pi, h.total, Math.min(fee, h.total), ret.marca, ret.ultimos4, pi.startsWith("pi_sim_"), pm, `evt-${h.eid}`]);
    await c.query(`update operations set pay_status = 'held' where id = $1::bigint`, [op]);
    await c.query(`update ticket_holds set status = 'converted', operation_id = $2::bigint where id = $1::uuid`, [holdId, op]);
    if (h.wl) await c.query(`update waitlist set status = 'converted' where id = $1::bigint and status = 'offered'`, [h.wl]);
    await c.query(`insert into ticket_log (ticket_id, operation_id, city_id, kind, by_user, by_kind) select id, operation_id, city_id, 'emitido', $2, 'user' from tickets where operation_id = $1::bigint`, [op, userId]);
    await c.query(`insert into operation_events (operation_id, kind, actor, actor_id) values ($1::bigint, 'tickets_sold', 'user', $2)`, [op, userId]);
    await c.query("commit");
    convertido = true;
    // 3) Capturar. Si falla, los boletos se anulan, la existencia vuelve y se libera la autorización: nada se cobra sin boleto ni boleto sin cobro.
    const cap = await pasarela.capturarPlataforma(pi, h.total);
    if (!cap.ok) {
      await anularPorCobro(op, pi, cap.codigo ?? "error");
      return { ok: false, msg: { es: "Tu banco no completó el cobro. No se cobró nada.", en: "Your bank did not complete the charge. Nothing was charged." }, tarjeta: true };
    }
    await marcarCobrado(op);
    await despuesDeVender(op).catch(() => undefined);
    return { ok: true, numero };
  } catch (e) {
    if (!convertido) {
      await c.query("rollback").catch(() => undefined);
      if (pi) await pasarela.liberar(pi).catch(() => undefined);
      if (pi) await db().query(`update ticket_holds set pi_released_at = now(), pay_attempts = pay_attempts + 1 where id = $1::uuid and operation_id is null`, [holdId]).catch(() => undefined);
    }
    if (e instanceof NoBol) return { ok: false, msg: e.msg, ...(e.extra as object) };
    throw e;
  } finally {
    c.release();
  }
}
async function marcarCobrado(op: string) {
  await tx(async (c) => {
    const u = await c.query(`update payments set status = 'captured', captured_at = now(), failure_code = null, updated_at = now() where operation_id = $1::bigint and kind = 'full' and status = 'held'`, [op]);
    if (!u.rowCount) return;
    await c.query(`update operations set pay_status = 'captured' where id = $1::bigint`, [op]);
    await c.query(`insert into operation_events (operation_id, kind, actor, note) select $1::bigint, 'payment_captured', 'system', jsonb_build_object('es', 'Se cobraron ' || to_char(amount_cents / 100.0, 'FM999990.00') || ' dólares', 'en', to_char(amount_cents / 100.0, 'FM999990.00') || ' dollars charged') from payments where operation_id = $1::bigint and kind = 'full'`, [op]);
  });
}
/* La captura falló: los boletos se anulan, la existencia vuelve (vendidos → disponibles), el código se devuelve y se libera la tarjeta. */
async function anularPorCobro(op: string, pi: string, codigo: string) {
  await tx(async (c) => {
    const o = (await c.query<{ st: string }>(`select status as st from operations where id = $1::bigint and kind = 'tickets' for update`, [op])).rows[0];
    if (!o || o.st !== "confirmed") return;
    const h = (await c.query<{ fid: string; lines: Linea[]; code: string | null }>(`select event_date_id::text as fid, lines, code_id::text as code from ticket_holds where operation_id = $1::bigint`, [op])).rows[0];
    await c.query(`update tickets set status = 'void', void_reason = 'El cobro no se completó' where operation_id = $1::bigint and status = 'valid'`, [op]);
    await c.query(`insert into ticket_log (ticket_id, operation_id, city_id, kind, by_kind, reason) select id, operation_id, city_id, 'cobro_fallido', 'system', $2 from tickets where operation_id = $1::bigint`, [op, codigo.slice(0, 60)]);
    for (const l of h?.lines ?? []) {
      if (l.k === "t") await c.query(`update ticket_stock set sold_n = sold_n - $3 where ticket_type_id = $1::bigint and event_date_id = $2::bigint`, [l.id, h!.fid, l.q]);
      else if (l.k === "m") await c.query(`update table_stock set sold_n = sold_n - 1 where table_id = $1::bigint and event_date_id = $2::bigint`, [l.id, h!.fid]);
      else await c.query(`update event_addons set sold_n = sold_n - 1 where id = $1::bigint`, [l.id]);
    }
    if (h?.code) await c.query(`update discount_codes set used_n = used_n - 1 where id = $1::bigint and used_n >= 1`, [h.code]);
    await c.query(`update operations set status = 'cancelled', cancelled_at = now(), cancelled_by = 'system', cancel_reason = 'El cobro no se completó', pay_status = 'released' where id = $1::bigint`, [op]);
    await c.query(`update payments set status = 'released', released_at = now(), failure_code = $2, updated_at = now() where operation_id = $1::bigint and kind = 'full' and status = 'held'`, [op, codigo.slice(0, 60)]);
    await c.query(`insert into operation_events (operation_id, kind, actor) values ($1::bigint, 'payment_failed', 'system')`, [op]);
  });
  await pasarela.liberar(pi).catch(() => undefined);
}
/* Lo que quedó a medias (la app se cortó entre la orden y la captura): capturar o anular. Lo corre el barrido. */
export async function repararBoletos(): Promise<number> {
  const L = (await db().query<{ op: string; pi: string; total: number; ok: boolean }>(
    `select p.operation_id::text as op, p.stripe_payment_intent as pi, p.amount_cents as total, o.status = 'confirmed' as ok
       from payments p join operations o on o.id = p.operation_id
      where p.transfer_group is not null and p.status = 'held' and o.kind = 'tickets' and p.held_at < now() - interval '2 minutes' limit 50`)).rows;
  for (const x of L) {
    if (!x.ok) { await anularPorCobro(x.op, x.pi, "orden_cancelada"); continue; }
    const r = await pasarela.capturarPlataforma(x.pi, x.total);
    if (r.ok) { await marcarCobrado(x.op); await despuesDeVender(x.op).catch(() => undefined); } else await anularPorCobro(x.op, x.pi, r.codigo ?? "error");
  }
  return L.length;
}

/* Avisos y recibo (una vez por orden: el aviso por la orden, el correo por su idem_key). */
async function despuesDeVender(op: string) {
  const o = (await db().query<{ num: string; uid: string; biz: string; title: Bi; n: number; mesa: number; fecha: string; h0: number; dia: string }>(
    `select o.number as num, o.user_id::text as uid, o.business_id as biz, o.details->'title' as title,
            (select count(*)::int from tickets t where t.operation_id = o.id and t.ticket_type_id is not null) as n,
            (select count(*)::int from tickets t where t.operation_id = o.id and t.table_id is not null) as mesa,
            o.details->>'event_date_id' as fecha, (o.details->>'h0')::int as h0, o.details->>'local_date' as dia
       from operations o where o.id = $1::bigint and o.kind = 'tickets' and o.pay_status = 'captured'`, [op])).rows[0];
  if (!o) return;
  if ((await db().query(`select 1 from notifications where tpl = 'bol_comprado' and ref_kind = 'tickets' and ref_id = $1`, [o.num])).rowCount) return;
  const { avisar, avisarNegocio } = await import("./avisos");
  const { diaCorto, hora } = await import("./evt-comun");
  const cuantos = [o.n ? `${o.n} ${o.n === 1 ? "boleto" : "boletos"}` : "", o.mesa ? "1 mesa" : ""].filter(Boolean).join(" y ");
  await avisar(o.uid, "bol_comprado", { evento: o.title.es, num: o.num, cuantos, cuando: `${diaCorto(o.dia, true)} · ${hora(o.h0)}` }, { href: `/eventos/orden/${o.num}`, ref: ["tickets", o.num] });
  await avisarNegocio(o.biz, "evt_venta", { evento: o.title.es, cuantos, num: o.num }, { href: `/panel/${o.biz}/eventos?det=evt:${(await db().query<{ e: string }>(`select details->>'event_id' as e from operations where id = $1::bigint`, [op])).rows[0]?.e ?? ""}`, ref: ["tickets", o.num] });
  await (await import("./correo/recibos")).reciboBoletos(op);
}

/* ── Lo que ve el cliente: la orden, Mis boletos y un boleto (solo los suyos) ── */
export type BoletoVista = {
  code: string; tipo: string; nombre: string | null; admits: number; mesa: boolean; estado: "valid" | "used" | "void" | "refunded" | "replaced"; precio: number;
  qr: string | null; matriz: boolean[][] | null;
  // 6d · Transferencia pendiente (a «••23», hasta cuándo se puede recibir): mientras tanto NO hay QR (el anterior quedó anulado).
  envio: { a: string; hasta: string } | null; cortesia: boolean;
  /* 6f · Varios días: para qué días vale («Vale solo el sáb 21 nov» / «Vale los 3 días»). */
  vale: string;
  /* 6g · La puerta: a qué hora entró (la primera entrada, hora de la ciudad) y si un pase usado todavía entra otro día. */
  entro: string | null; sigue: boolean;
};
type FilaB = { id: string; code: string; fid: string; ver: number; admits: number; st: BoletoVista["estado"]; tn: Bi | null; mz: Bi | null; nombre: string | null; precio: number; envio: { a: string; hasta: string } | null; comp: boolean;
  vd: number[]; sp: { ini: string; n: number } | null; entro: string | null; sigue: boolean };
async function vistaBoleto(b: FilaB, es: boolean, conQR: boolean): Promise<BoletoVista> {
  const vale = b.st === "valid" || b.st === "used";
  // Con una transferencia pendiente no se firma ningún QR (guardián qrViejoNoEntra): nadie tiene uno vigente hasta que se reciba o se deshaga.
  const qr = conQR && vale && !b.envio ? await firmarQR({ id: b.id, fecha: b.fid, ver: b.ver, admits: b.admits }) : null;
  return { code: b.code, tipo: b.comp ? (es ? "Cortesía" : "Comp") : b.tn ? bi(b.tn, es) : b.mz ? bi(b.mz, es) : "", nombre: b.nombre, admits: b.admits, mesa: !!b.mz, estado: b.st, precio: b.precio, qr, matriz: qr ? matrizQR(qr) : null,
    envio: b.envio, cortesia: b.comp, vale: b.sp ? valeL(b.vd.length >= b.sp.n ? null : b.vd[0], b.sp.ini, b.sp.n, es) : "",
    entro: b.entro ? (() => { const [h = 0, m = 0] = b.entro.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; })() : null, sigue: !!b.sigue };
}
const SEL_B = `select t.id::text, t.code, t.event_date_id::text as fid, t.qr_ver as ver, t.admits, t.status as st, tt.name as tn, et.zone as mz, coalesce(t.holder_name, t.comp_name) as nombre, t.price_cents as precio,
                      t.kind = 'comp' as comp, t.valid_days::int[] as vd,
                      (select case when e2.kind = 'span' then json_build_object('ini', e2.start_date::text, 'n', e2.span_days) end from events e2 where e2.id = t.event_id) as sp,
                      (select to_char(min(x.first_at) at time zone (select timezone from cities where id = t.city_id), 'HH24:MI') from ticket_entries x where x.ticket_id = t.id) as entro,
                      t.status = 'used' and exists (select 1 from event_dates z where z.id = any(bol_fechas_validas(t.id)) and z.ends_at > now()
                        and not exists (select 1 from ticket_entries x where x.ticket_id = t.id and x.event_date_id = z.id and x.entered_n >= t.admits)) as sigue,
                      (select json_build_object('a', '••' || x.to_last2, 'hasta', to_char(x.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')) from ticket_transfers x
                        where x.ticket_id = t.id and x.status = 'pending' and x.kind = 'transfer') as envio
                 from tickets t left join ticket_types tt on tt.id = t.ticket_type_id left join event_tables et on et.id = t.table_id`;
/* 6d · Hasta cuándo se transfiere, se cancela y se cambia el nombre (Configuración), y si se puede ahora. */
export type Ventanas = { transferir: boolean; transferirHasta: string; cancelar: boolean; cancelarHasta: string; horasCancelar: number; horasTransferir: number };
async function ventanas(fid: string): Promise<Ventanas> {
  const r = (await db().query<{ t: boolean; th: string; c: boolean; ch: string; hc: number; ht: number }>(
    `select e.status in ('live', 'paused') and d.status = 'scheduled' and d.starts_at - make_interval(hours => cfg_int('bol_transferir_h')) > now() as t,
            to_char((d.starts_at - make_interval(hours => cfg_int('bol_transferir_h'))) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as th,
            e.status in ('live', 'paused') and d.status = 'scheduled' and d.starts_at - make_interval(hours => cfg_int('bol_cancelar_h')) > now() as c,
            to_char((d.starts_at - make_interval(hours => cfg_int('bol_cancelar_h'))) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as ch,
            cfg_int('bol_cancelar_h') as hc, cfg_int('bol_transferir_h') as ht
       from event_dates d join events e on e.id = d.event_id where d.id = $1::bigint`, [fid])).rows[0]!;
  return { transferir: r.t, transferirHasta: r.th, cancelar: r.c, cancelarHasta: r.ch, horasCancelar: r.hc, horasTransferir: r.ht };
}

export type OrdenVista = {
  numero: string; estado: string; pago: string | null; at: string; evento: { tz: string; slug: string; fecha: string; title: string; dia: string; h0: number; h1: number; venue: string; addr: string | null; lat: number | null; lng: number | null; edad: number; dark: boolean; img: string | null; org: string; start: string; end: string; pasado: boolean; hoy: boolean;
    /* 6f · Varios días: «vie 20 nov – dom 22 nov · 3 días» (la orden vive en el último día). */
    rango: string | null };
  boletos: BoletoVista[]; lineas: { n: string; q: number; unit: number }[]; subtotal: number; descuento: number; total: number; tarjeta: string | null; devuelto: number;
  // 6d · Ventanas, devoluciones de la orden (pendiente = en camino) y si tiene una ayuda abierta.
  ventanas: Ventanas; devoluciones: { monto: number; estado: string; por: string; at: string }[]; ayuda: string | null;
};
export async function ordenBoletos(userId: string, numero: string, es: boolean): Promise<OrdenVista | null> {
  if (!NUM_B.test(String(numero))) return null;
  const o = (await db().query<{ id: string; st: string; pay: string | null; at: string; sub: number; desc: number; total: number; fid: string; l: { name: Bi; qty: number; unit: number }[];
    brand: string | null; l4: string | null; dev: number }>(
    `select o.id::text, o.status as st, o.pay_status as pay, to_char(o.sent_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, o.subtotal_cents as sub, o.discount_cents as desc, o.total_cents as total,
            o.details->>'event_date_id' as fid, (select coalesce(json_agg(json_build_object('name', l.name, 'qty', l.qty, 'unit', l.unit_price_cents) order by l.id), '[]') from operation_lines l where l.operation_id = o.id) as l,
            p.card_brand as brand, p.card_last4 as l4, coalesce(p.refunded_cents, 0) as dev
       from operations o left join payments p on p.operation_id = o.id and p.kind = 'full' where o.number = $1 and o.kind = 'tickets' and o.user_id = $2 and o.pay_mode = 'app'`, [numero, userId])).rows[0];
  if (!o) return null;
  const ev = await eventoDeFecha(o.fid, es);
  if (!ev) return null;
  const [B, V, D, A] = await Promise.all([
    db().query<FilaB>(`${SEL_B} where t.operation_id = $1::bigint and t.holder_user_id = $2 order by t.table_id nulls first, t.id`, [o.id, userId]),
    ventanas(o.fid),
    db().query<{ monto: number; estado: string; por: string; at: string }>(`select r.amount_cents as monto, r.status as estado, r.initiated_by as por, to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
                                                                             from refunds r join payments p on p.id = r.payment_id where p.operation_id = $1::bigint order by r.id`, [o.id]),
    db().query<{ n: string }>(`select number as n from help_requests where operation_id = $1::bigint and user_id = $2`, [o.id, userId]),
  ]);
  return {
    numero, estado: o.st, pago: o.pay, at: o.at, evento: ev, boletos: await Promise.all(B.rows.map((b) => vistaBoleto(b, es, !ev.pasado))),
    lineas: o.l.map((l) => ({ n: bi(l.name, es), q: l.qty, unit: l.unit })), subtotal: o.sub, descuento: o.desc, total: o.total,
    tarjeta: o.brand && o.l4 ? `${o.brand.toUpperCase()} ·· ${o.l4}` : null, devuelto: o.dev,
    ventanas: V, devoluciones: D.rows, ayuda: A.rows[0]?.n ?? null,
  };
}
async function eventoDeFecha(fid: string, es: boolean): Promise<OrdenVista["evento"] | null> {
  const { DIRECCION_EVENTO, PUNTO_EVENTO } = await import("./punto");
  const r = (await db().query<{ tz: string; slug: string; title: Bi; ldate: string; h0: number; h1: number; venue: string; addr: string | null; lat: number | null; lng: number | null; edad: number; dark: boolean; img: string | null; org: string; start: string; end: string; pasado: boolean; hoy: boolean; ini: string | null; sn: number }>(
    `select ci.timezone as tz, e.slug, e.title, d.local_date::text as ldate, case when e.kind = 'span' then e.start_date::text end as ini, e.span_days as sn,
            (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0,
            (extract(epoch from d.ends_at - d.starts_at) / 60)::int + (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h1,
            case when e.venue_mode = 'other' then e.venue_name else b.name end as venue, ${DIRECCION_EVENTO("e", "b")} as addr, ${PUNTO_EVENTO("e", "b")}, e.min_age as edad, f.dark,
            (select m.url from media m where m.owner_kind = 'event' and m.owner_id = e.id::text and m.status = 'visible' order by m.sort, m.created_at limit 1) as img, b.name as org,
            to_char(d.starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as start, to_char(d.ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "end",
            d.ends_at <= now() as pasado, d.local_date = (now() at time zone ci.timezone)::date as hoy
       from event_dates d join events e on e.id = d.event_id join businesses b on b.id = e.business_id join cities ci on ci.id = d.city_id join event_formats f on f.key = e.format where d.id = $1::bigint`, [fid])).rows[0];
  if (!r) return null;
  return { tz: r.tz, slug: r.slug, fecha: fid, title: bi(r.title, es), dia: r.ldate, h0: r.h0, h1: r.h1, venue: r.venue, addr: r.addr, lat: r.lat, lng: r.lng, edad: r.edad, dark: r.dark, img: r.img, org: r.org, start: r.start, end: r.end, pasado: r.pasado, hoy: r.hoy,
    rango: r.ini ? `${diaCorto(r.ini, es)} – ${diaCorto(r.ldate, es)} · ${r.sn} ${es ? "días" : "days"}` : null };
}

/* Mi cuenta › Boletos: próximos y pasados (por fecha), con el estado de cada boleto. Sin QR en la lista (se abre cada uno). */
export type MisBoletos = { proximos: GrupoMis[]; pasados: GrupoMis[] };
export type GrupoMis = { numero: string; slug: string; fecha: string; title: string; dia: string; h0: number; venue: string; img: string | null; dark: boolean; n: number; mesa: boolean; vivos: number; devueltos: number; codigos: string[];
  /* 6d · Recibido de otra persona (transferencia o cortesía): se abre el boleto, no la orden (la orden es de quien pagó). Transferidos = los que diste. */
  recibido: boolean; transferidos: number; enviando: number };
export async function misBoletos(userId: string, es: boolean): Promise<MisBoletos> {
  const r = (await db().query<{ num: string; slug: string; fid: string; title: Bi; ldate: string; h0: number; venue: string; img: string | null; dark: boolean; n: number; mesa: boolean; vivos: number; dev: number; codigos: string[]; pasado: boolean; recibido: boolean; transferidos: number; enviando: number }>(
    `select o.number as num, e.slug, d.id::text as fid, e.title, d.local_date::text as ldate,
            (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0,
            case when e.venue_mode = 'other' then e.venue_name else b.name end as venue, f.dark,
            (select m.url from media m where m.owner_kind = 'event' and m.owner_id = e.id::text and m.status = 'visible' order by m.sort, m.created_at limit 1) as img,
            count(t.id)::int as n, bool_or(t.table_id is not null) as mesa, count(t.id) filter (where t.status in ('valid', 'used'))::int as vivos,
            count(t.id) filter (where t.status = 'refunded')::int as dev, array_agg(t.code order by (t.status = 'valid') desc, t.id) as codigos, d.ends_at <= now() as pasado,
            o.user_id <> $1 as recibido, count(t.id) filter (where t.status = 'replaced')::int as transferidos,
            count(t.id) filter (where exists (select 1 from ticket_transfers x where x.ticket_id = t.id and x.status = 'pending' and x.kind = 'transfer'))::int as enviando
       from tickets t join operations o on o.id = t.operation_id join event_dates d on d.id = t.event_date_id join events e on e.id = d.event_id join businesses b on b.id = e.business_id
       join cities ci on ci.id = d.city_id join event_formats f on f.key = e.format
      where t.holder_user_id = $1 and o.status <> 'cancelled'
      group by o.id, e.id, d.id, b.name, ci.timezone, f.dark order by d.starts_at desc limit 100`, [userId])).rows;
  // Un grupo cuyos boletos están todos transferidos (o enviándose) no tiene QR vivo «tuyo», pero sigue en Próximos mientras se envía.
  const g = (x: (typeof r)[number]): GrupoMis => ({ numero: x.num, slug: x.slug, fecha: x.fid, title: bi(x.title, es), dia: x.ldate, h0: x.h0, venue: x.venue, img: x.img, dark: x.dark, n: x.n, mesa: x.mesa, vivos: x.vivos, devueltos: x.dev, codigos: x.codigos,
    recibido: x.recibido, transferidos: x.transferidos, enviando: x.enviando });
  // Próximos: lo que todavía entra; lo que ya pasó, o sin boletos vivos (devueltos o anulados), va a Pasados.
  return { proximos: r.filter((x) => !x.pasado && (x.vivos > 0 || x.enviando > 0)).reverse().map(g), pasados: r.filter((x) => x.pasado || (x.vivos === 0 && x.enviando === 0)).map(g) };
}
export async function misBoletosN(userId: string | null): Promise<number> {
  if (!userId) return 0;
  return (await db().query<{ n: number }>(`select count(*)::int as n from tickets t join event_dates d on d.id = t.event_date_id where t.holder_user_id = $1 and t.status = 'valid' and d.ends_at > now()`, [userId])).rows[0]?.n ?? 0;
}
export async function miBoleto(userId: string, code: string, es: boolean): Promise<{ b: BoletoVista; numero: string; evento: OrdenVista["evento"]; mia: boolean; ventanas: Ventanas } | null> {
  if (!CODIGO_BOL.test(String(code))) return null;
  const b = (await db().query<FilaB & { num: string; mia: boolean }>(`${SEL_B.replace("select t.id::text", "select o.number as num, o.user_id = $2 and o.pay_mode = 'app' as mia, t.id::text")} join operations o on o.id = t.operation_id where t.code = $1 and t.holder_user_id = $2`, [code, userId])).rows[0];
  if (!b) return null;
  const ev = await eventoDeFecha(b.fid, es);
  if (!ev) return null;
  // mia = la compró esta persona (vuelve a su orden); recibido de otra persona = vuelve a Mis boletos.
  return { b: await vistaBoleto(b, es, !ev.pasado), numero: b.num, evento: ev, mia: b.mia, ventanas: await ventanas(b.fid) };
}

/* ── Panel › Eventos › la ficha: lo vendido (evView). Solo de su negocio; compradores con nombre + inicial (sin teléfono ni correo). ── */
export type VentasPanel = {
  venta: EstadoVenta | null; aviso: string; pro: boolean; cobros: boolean;
  kpi: { vendidos: number; capacidad: number; mesas: number; mesasCap: number; ordenes: number; bruto: number; comision: number; descuentos: number; extras: number; depositos: number; neto: number };
  tipos: { id: string; n: string; p: number; vendidos: number; quedan: number; cap: number }[];
  mesas: { n: string; quien: string; num: string }[];
  compradores: { quien: string; num: string; boletos: number; mesa: boolean; extras: boolean; at: string; vivos: number; devuelto: number }[];
  fecha: string | null;
};
export async function ventasPanel(negocio: string, eventoId: string, fechaVer: string | null = null): Promise<VentasPanel | null> {
  if (!ID.test(eventoId)) return null;
  const e = (await db().query<{ id: string; kind: string }>(`select id::text, kind from events where id = $1::bigint and business_id = $2 and entry = 'tickets'`, [eventoId, negocio])).rows[0];
  if (!e) return null;
  // 6f · En una serie, todo es de LA FECHA QUE ESTÁS VIENDO (la próxima, si no se elige otra); un evento de varios días vende en su ancla.
  const d = (await db().query<{ fid: string }>(
    `select id::text as fid from event_dates where event_id = $1::bigint and ($2::bigint is null or id = $2::bigint) and status <> 'skipped'
        and ($3 <> 'span' or id = evt_ancla($1::bigint)) order by (ends_at > now()) desc, starts_at limit 1`, [eventoId, fechaVer && ID.test(fechaVer) ? fechaVer : null, e.kind])).rows[0];
  const f = e.kind === "series" ? d?.fid ?? "0" : null;
  if (d) await vencerApartados({ fecha: d.fid });
  const v = d ? await filaVenta(db(), d.fid) : null, est = v ? estadoDe(v) : null;
  const [T, M, K, C] = await Promise.all([
    db().query<{ id: string; n: Bi; p: number; vendidos: number; quedan: number; cap: number }>(
      `select t.id::text as id, t.name as n, t.price_cents as p, coalesce(sum(s.sold_n), 0)::int as vendidos, coalesce(sum(greatest(0, s.quantity - s.sold_n - s.held_n)), 0)::int as quedan, coalesce(sum(s.quantity), 0)::int as cap
         from ticket_types t left join ticket_stock s on s.ticket_type_id = t.id and ($2::bigint is null or s.event_date_id = $2::bigint) where t.event_id = $1::bigint and (not t.off or exists (select 1 from ticket_stock z where z.ticket_type_id = t.id and z.sold_n > 0))
        group by t.id order by t.sort, t.id`, [eventoId, f]),
    db().query<{ n: Bi; quien: string; num: string }>(
      `select et.zone as n, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), 'Vecino') as quien, o.number as num
         from tickets t join event_tables et on et.id = t.table_id join operations o on o.id = t.operation_id join users u on u.id = o.user_id
        where t.event_id = $1::bigint and t.status in ('valid', 'used') and ($2::bigint is null or t.event_date_id = $2::bigint) order by t.id limit 60`, [eventoId, f]),
    db().query<{ vendidos: number; capacidad: number; mesas: number; mesascap: number; ordenes: number; bruto: number; comision: number; descuentos: number; extras: number; depositos: number }>(
      `select (select count(*)::int from tickets where event_id = $1::bigint and ticket_type_id is not null and status in ('valid', 'used') and kind = 'paid' and ($3::bigint is null or event_date_id = $3::bigint)) as vendidos,
              (select coalesce(sum(s.quantity), 0)::int from ticket_stock s join ticket_types t on t.id = s.ticket_type_id where t.event_id = $1::bigint and not t.off and ($3::bigint is null or s.event_date_id = $3::bigint)) as capacidad,
              (select count(*)::int from tickets where event_id = $1::bigint and table_id is not null and status in ('valid', 'used') and ($3::bigint is null or event_date_id = $3::bigint)) as mesas,
              (select coalesce(sum(s.quantity), 0)::int from table_stock s join event_tables t on t.id = s.table_id where t.event_id = $1::bigint and not t.off and ($3::bigint is null or s.event_date_id = $3::bigint)) as mesascap,
              count(o.id)::int as ordenes, coalesce(sum(p.amount_cents - p.refunded_cents), 0)::int as bruto,
              -- 6d · La comisión que To'Latino cede cuando el organizador devuelve no se cuenta (ticket_refund_lines.fee_waived_cents).
              coalesce(sum(p.fee_cents - coalesce((select sum(l.fee_waived_cents) from ticket_refund_lines l where l.operation_id = o.id), 0)), 0)::int as comision,
              coalesce(sum(o.discount_cents), 0)::int as descuentos,
              (select coalesce(sum(l.line_total_cents), 0)::int from operation_lines l join operations z on z.id = l.operation_id where z.kind = 'tickets' and z.status = 'confirmed' and (z.details->>'event_id')::bigint = $1::bigint
                  and ($3::bigint is null or (z.details->>'event_date_id')::bigint = $3::bigint) and l.options->0->>'k' = 'a') as extras,
              (select coalesce(sum(price_cents), 0)::int from tickets where event_id = $1::bigint and table_id is not null and status in ('valid', 'used') and ($3::bigint is null or event_date_id = $3::bigint)) as depositos
         from operations o join payments p on p.operation_id = o.id and p.kind = 'full' and p.status in ('captured', 'partially_refunded')
        where o.kind = 'tickets' and o.business_id = $2 and o.status = 'confirmed' and (o.details->>'event_id')::bigint = $1::bigint and ($3::bigint is null or (o.details->>'event_date_id')::bigint = $3::bigint)`, [eventoId, negocio, f]),
    db().query<{ quien: string; num: string; boletos: number; mesa: boolean; extras: boolean; at: string; vivos: number; devuelto: number }>(
      `select coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), 'Vecino') as quien, o.number as num,
              (select count(*)::int from tickets t where t.operation_id = o.id and t.ticket_type_id is not null and t.status <> 'replaced') as boletos,
              (select count(*)::int from tickets t where t.operation_id = o.id and t.status = 'valid') as vivos,
              coalesce((select sum(r.amount_cents) from refunds r join payments p on p.id = r.payment_id where p.operation_id = o.id and r.status in ('pending', 'done')), 0)::int as devuelto,
              exists (select 1 from tickets t where t.operation_id = o.id and t.table_id is not null) as mesa,
              exists (select 1 from operation_lines l where l.operation_id = o.id and l.options->0->>'k' = 'a') as extras,
              to_char(o.sent_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
         from operations o join users u on u.id = o.user_id
        where o.kind = 'tickets' and o.pay_mode = 'app' and o.business_id = $2 and o.status = 'confirmed' and (o.details->>'event_id')::bigint = $1::bigint
          and ($3::bigint is null or (o.details->>'event_date_id')::bigint = $3::bigint) order by o.id desc limit 100`, [eventoId, negocio, f]),
  ]);
  const k = K.rows[0]!;
  return {
    venta: est, aviso: est ? textoVenta(est, v!.hasta, true) : "", pro: !!v?.pro, cobros: !!v?.cuenta, fecha: d?.fid ?? null,
    kpi: { vendidos: k.vendidos, capacidad: k.capacidad, mesas: k.mesas, mesasCap: k.mesascap, ordenes: k.ordenes, bruto: k.bruto, comision: k.comision, descuentos: k.descuentos, extras: k.extras, depositos: k.depositos, neto: Math.max(0, k.bruto - k.comision) },
    tipos: T.rows.map((t) => ({ id: t.id, n: t.n.es, p: t.p, vendidos: t.vendidos, quedan: t.quedan, cap: t.cap })),
    mesas: M.rows.map((m) => ({ n: m.n.es, quien: m.quien, num: m.num })),
    compradores: C.rows,
  };
}
/* «Reenviar boletos» desde el panel: un aviso en la app a quien compró (sin SMS ni datos del comprador para el negocio). */
export async function reenviarDesdePanel(negocio: string, numero: string): Promise<boolean> {
  if (!NUM_B.test(numero)) return false;
  const o = (await db().query<{ uid: string; title: Bi; id: string }>(`select user_id::text as uid, details->'title' as title, id::text from operations where number = $1 and kind = 'tickets' and business_id = $2 and status = 'confirmed'`, [numero, negocio])).rows[0];
  if (!o) return false;
  await db().query(`insert into ticket_log (ticket_id, operation_id, city_id, kind, by_kind) select id, operation_id, city_id, 'reenviado', 'business' from tickets where operation_id = $1::bigint`, [o.id]);
  await (await import("./avisos")).avisar(o.uid, "bol_reenviado", { evento: o.title.es }, { href: `/eventos/orden/${numero}`, ref: ["tickets", numero] });
  return true;
}
/* Lo vendido de cada evento para la lista del panel (barra de venta de evrow). */
export async function vendidosPorEvento(negocio: string): Promise<Record<string, number>> {
  const r = (await db().query<{ e: string; n: number }>(`select t.event_id::text as e, count(*)::int as n from tickets t join events e on e.id = t.event_id where e.business_id = $1 and t.ticket_type_id is not null and t.status in ('valid', 'used') group by t.event_id`, [negocio])).rows;
  return Object.fromEntries(r.map((x) => [x.e, x.n]));
}

export const dineroBol = dinero;
export const esPrueba = () => ENTORNO !== "produccion";
