import "server-only";
import type { PoolClient } from "pg";
import { valores } from "./config";
import { db, tx } from "./db";
import { pasarela } from "./pagos/pasarela";
import { CLAVE, DEVOLUCION, anotarPago, capturarCobro, cobrar, devolucionEstado, devolverPatrocinio, devolverPendientes, devolverYDecir, errorDePuestos, fechasPeriodo, money, soltarRetenido, tarjetaDe, type Bi, type Cobro, type PatAdm, type Recibo, type ResPat } from "./patrocinio";
import type { TarjetaEvt } from "./evt-publico";
import { llave } from "./llaves-proveedores";

/* C-003 · Patrocinados de la página de Eventos (canvas tolatino-master+, entrega/cambios.md C-003; migración 0174). Usa la misma caja que el
   patrocinio de un negocio (lib/patrocinio.ts: cobrar, el libro, la tarjeta, errorDePuestos, fechasPeriodo):
   - Quien publica el evento (el negocio organizador) compra uno de los 6 puestos de Eventos de su ciudad (patrocinio_evt_puestos), por 1 semana,
     1 mes o «hasta el evento». «Hasta el evento» solo existe si el evento todavía no llega: cobra el precio de la semana por cada semana o
     fracción hasta el día del evento, termina cuando termina el evento y no se renueva.
   - El servidor decide TODO: el precio sale de Configuración (patrocinio_evt_*_cents), las fechas de la zona de la ciudad y del evento, los
     puestos de la base (patrocinio_evt_reglas los vuelve a revisar con candado al insertar). La pantalla manda qué duración, desde cuándo, qué
     tarjeta y una clave por intento; nunca un monto (guardián patrocinioEventoDelServidor).
   - Un cobro por clave (idem = evento + clave del intento), dentro de la transacción del candado de la ciudad. El libro es sponsorship_payments
     (kind 'evento'); la conciliación diaria ya lo lee.
   - Un evento cancelado o que ya pasó termina su patrocinio solo (el barrido); la vitrina tampoco lo muestra (pide la fecha listable). Cancelado:
     se devuelven los días enteros que no se usaron (0175, 'sin_usar').
   - Evento oculto, en revisión o con Eventos apagado en su negocio (ninguna fecha listable, pero sigue por venir): el patrocinio se PAUSA (no sale
     ni cuenta vistas; guarda su puesto). Cuando vuelve a verse, sigue y se alarga lo que duró la pausa, si cabe (los puestos de la ciudad, el
     siguiente patrocinio del mismo evento y el fin del evento mandan); lo que no cupo se devuelve al terminar ('pausa').
   - En las apps de las tiendas no se compra (como Pro): la compra es en la web (compraDigitalAqui, en las acciones). */

export type DurE = "week" | "month" | "until_event";
const no = (es: string, en: string): ResPat => ({ ok: false, msg: { es, en } });
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^\d{1,18}$/;
const ISO = (col: string) => `to_char(${col} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5);
const sumar = (d: string, n: number) => { const [y, m, x] = d.split("-").map(Number); return new Date(Date.UTC(y!, m! - 1, x! + n)).toISOString().slice(0, 10); };

export type PrecioEvt = { week: number; month: number; puestos: number; diasAdelante: number };
export async function preciosEvento(): Promise<PrecioEvt> {
  const v = await valores("patrocinio_evt_semana_cents", "patrocinio_evt_mes_cents", "patrocinio_evt_puestos", "patrocinio_dias_adelante");
  return { week: v.patrocinio_evt_semana_cents, month: v.patrocinio_evt_mes_cents, puestos: v.patrocinio_evt_puestos, diasAdelante: v.patrocinio_dias_adelante };
}

/* El evento: de quién es, su ciudad, si está cancelado, y su próxima fecha viva (día local) y cuándo termina el evento (varios días: el último día;
   una serie: la próxima fecha; uno solo: su fecha). Sin fecha viva por delante: `dia` es null (ya pasó o no está publicado). */
type EvtPat = { id: string; slug: string; titulo: Bi; negocio: string; ciudad: string; ciudadN: string; tz: string; status: string; ciudadOn: boolean; hoy: string; dia: string | null; fin: string | null; entry: string; kind: string };
async function eventoPat(c: PoolClient | null, id: string, negocio: string | null): Promise<EvtPat | null> {
  if (!ID.test(id)) return null;
  return (await (c ?? db()).query<EvtPat>(
    `select e.id::text, e.slug, e.title as titulo, e.business_id as negocio, e.city_id as ciudad, ci.name as "ciudadN", ci.timezone as tz, e.status, ci.status = 'on' as "ciudadOn",
            (now() at time zone ci.timezone)::date::text as hoy, n.local_date::text as dia, e.entry, e.kind,
            ${ISO(`case when e.kind = 'span' then (select max(d.ends_at) from event_dates d where d.event_id = e.id and d.listable and d.ends_at > now()) else n.ends_at end`)} as fin
       from events e join cities ci on ci.id = e.city_id
       left join lateral (select d.local_date, d.ends_at from event_dates d where d.event_id = e.id and d.listable and d.ends_at > now() order by d.starts_at, d.id limit 1) n on true
      where e.id = $1::bigint and ($2::text is null or e.business_id = $2)`, [id, negocio])).rows[0] ?? null;
}
const vivoEvt = (e: EvtPat) => e.status !== "cancelled" && !!e.dia && !!e.fin;

/* El período de un patrocinio de este evento: 1 semana o 1 mes desde hoy (o desde otro día, a medianoche de la ciudad), o «hasta el evento»
   (desde hoy hasta que termina el evento; solo si el evento es después del día en que empieza). El precio lo pone el servidor. */
type Periodo = { a: string; b: string; dia: string; hasta: string; precio: number; semanas: number | null };
async function periodo(c: PoolClient | null, e: EvtPat, dur: DurE, desde: "hoy" | string, P: PrecioEvt): Promise<Periodo | null> {
  const q = (c ?? db()).query.bind(c ?? db()) as PoolClient["query"];
  if (dur === "until_event") {
    const sd = desde === "hoy" ? e.hoy : desde;
    if (!e.dia || !e.fin || e.dia <= sd) return null;
    const r = (await q<{ a: string }>(`select ${ISO(`case when $2::text = 'hoy' then now() else ($2::date::timestamp at time zone $1) end`)} as a`, [e.tz, desde === "hoy" ? "hoy" : desde])).rows[0]!;
    const semanas = Math.max(1, Math.ceil(diasEntre(sd, e.dia) / 7));
    // Termina cuando termina el evento (b); se muestra el día del evento (una noche que pasa de la medianoche sigue siendo «hasta el evento»).
    return { a: r.a, b: e.fin, dia: sd, hasta: e.dia, precio: P.week * semanas, semanas };
  }
  const f = await fechasPeriodo(c, e.ciudad, desde, dur, { tabla: "event_sponsorships", negocio: e.negocio, evento: e.id });
  if (!f) return null;
  const h = (await q<{ hasta: string }>(`select (($1::timestamptz) at time zone $2)::date::text as hasta`, [f.b, e.tz])).rows[0]!;
  return { a: f.a, b: f.b, dia: f.dia, hasta: h.hasta, precio: dur === "week" ? P.week : P.month, semanas: null };
}

/* Puestos libres de Eventos en la ciudad para un período; sin puestos, desde cuándo se libera uno (el primer fin de un patrocinio desde el que
   cabe uno más durante un período igual). */
async function puestosLibresEvt(ciudad: string, a: string, b: string, puestos: number, dur: DurE): Promise<{ libres: number; libre: string | null }> {
  const r = (await db().query<{ n: number; libre: string | null }>(
    `select patrocinio_evt_a_la_vez($1, $2::timestamptz, $3::timestamptz, null) as n,
            (select ${ISO("min(x.t)")} from (select distinct s.ends_at as t from event_sponsorships s
               where s.city_id = $1 and s.status in ('reservado', 'activo') and s.ends_at > $2::timestamptz) x
              where patrocinio_evt_a_la_vez($1, x.t, case when $5 = 'until_event' then greatest($3::timestamptz, x.t + interval '1 hour') when $5 = 'month' then x.t + interval '1 month' else x.t + interval '7 days' end, null) < $4) as libre`,
    [ciudad, a, b, puestos, dur])).rows[0]!;
  return { libres: Math.max(0, puestos - r.n), libre: r.n >= puestos ? r.libre : null };
}

/* Para la pantalla de elegir: con esa duración y desde ese día, qué fechas quedan, cuántos puestos libres hay y el precio; sin puestos, desde
   qué día se libera uno. Solo lectura: al pagar se vuelve a revisar todo con candado. null = esa duración no existe para este evento. */
export type ConsultaE = { desde: string; hasta: string; a: string; b: string; libres: number; puestos: number; libre: string | null; max: string; precio: number; semanas: number | null } | null;
export async function consultarPuestosEvento(negocio: string, evento: string, dur: DurE, desde: string): Promise<ConsultaE> {
  if (desde !== "hoy" && !FECHA.test(desde)) return null;
  const e = await eventoPat(null, evento, negocio);
  if (!e || !vivoEvt(e)) return null;
  const P = await preciosEvento(), max = maxInicio(e, P, dur);
  if (desde !== "hoy" && (desde < e.hoy || desde > max)) return null;
  const f = await periodo(null, e, dur, desde === e.hoy ? "hoy" : desde, P);
  if (!f) return null;
  const l = await puestosLibresEvt(e.ciudad, f.a, f.b, P.puestos, dur);
  const libre = l.libre ? (await db().query<{ d: string }>(`select ($1::timestamptz at time zone $2)::date::text as d`, [l.libre, e.tz])).rows[0]!.d : null;
  return { desde: f.dia, hasta: f.hasta, a: f.a, b: f.b, libres: l.libres, puestos: P.puestos, libre, max, precio: f.precio, semanas: f.semanas };
}
/* «Renovar otra semana / otro mes» de un evento (24 nov): las fechas y el precio del período que SE VA A COBRAR, calculados igual que en
   comprarPatrocinioEvento con renovarDe (empieza el día en que termina el que tiene; si ese día es hoy, desde ahora; con la cadena del mes). Sin el
   tope de patrocinio_dias_adelante, como al pagar una renovación (consultarPuestosEvento lo exige y con un fin a más de 60 días no devolvía nada).
   Solo lectura: no cambia qué se cobra ni cuándo (guardián patrocinioRenovarFechas). */
export async function consultarRenovacionEvento(negocio: string, evento: string, renovarDe: string, dur: "week" | "month"): Promise<ConsultaE> {
  if (!ID.test(renovarDe)) return null;
  const e = await eventoPat(null, evento, negocio);
  if (!e || !vivoEvt(e) || !e.ciudadOn) return null;
  const v = (await db().query<{ dia: string }>(`select (s.ends_at at time zone $3)::date::text as dia from event_sponsorships s where s.id = $1::bigint and s.event_id = $2::bigint and s.status in ('activo', 'reservado')`,
    [renovarDe, evento, e.tz])).rows[0];
  if (!v) return null;
  const P = await preciosEvento();
  const desde = v.dia === e.hoy ? "hoy" : v.dia;
  const f = await periodo(null, e, dur, desde, P);
  if (!f) return null;
  // Lo mismo que rechaza el cobro de una renovación (comprarPatrocinioEvento): empieza antes de hoy, o después del evento.
  if (f.dia < e.hoy || f.dia > e.dia!) return null;
  const l = await puestosLibresEvt(e.ciudad, f.a, f.b, P.puestos, dur);
  const libre = l.libre ? (await db().query<{ d: string }>(`select ($1::timestamptz at time zone $2)::date::text as d`, [l.libre, e.tz])).rows[0]!.d : null;
  return { desde: f.dia, hasta: f.hasta, a: f.a, b: f.b, libres: l.libres, puestos: P.puestos, libre, max: maxInicio(e, P, dur), precio: f.precio, semanas: f.semanas };
}
/* El último día en que puede empezar: hasta patrocinio_dias_adelante y nunca después del evento («hasta el evento»: antes del día del evento). */
const maxInicio = (e: EvtPat, P: PrecioEvt, dur: DurE) => { const m = sumar(e.hoy, P.diasAdelante), tope = dur === "until_event" ? sumar(e.dia!, -1) : e.dia!; return m < tope ? m : tope; };

export type CompraEvtIn = { dur: DurE; desde: "hoy" | string; pm: string; renovar: boolean; clave: string; renovarDe?: string | null };
/* Comprar (o reservar desde el día que se libera un puesto, o «Renovar otra semana»). `quien` = la persona del panel con Cobros y Eventos. */
export async function comprarPatrocinioEvento(negocio: string, evento: string, quien: string, x: CompraEvtIn): Promise<ResPat> {
  if (x.dur !== "week" && x.dur !== "month" && x.dur !== "until_event") return no("Elige 1 semana, 1 mes o hasta el evento.", "Choose 1 week, 1 month or until the event.");
  if (!CLAVE.test(String(x.clave ?? ""))) return no("Vuelve a intentarlo.", "Try again.");
  if (x.desde !== "hoy" && !FECHA.test(String(x.desde ?? ""))) return no("Elige cuándo empieza.", "Choose when it starts.");
  const card = await tarjetaDe(quien, String(x.pm ?? ""));
  if (!card) return no("Elige una tarjeta guardada.", "Choose a saved card.");
  const e = await eventoPat(null, evento, negocio);
  if (!e) return no("Ese evento no es de tu negocio.", "That event is not your business’s.");
  if (!vivoEvt(e)) return no("Tu evento tiene que estar publicado y por venir para patrocinarlo.", "Your event has to be live and upcoming to sponsor it.");
  if (!e.ciudadOn) return no("Tu ciudad todavía no abre: el patrocinio se compra cuando abra.", "Your city is not open yet: sponsorships can be bought once it opens.");
  const P = await preciosEvento();
  // «Renovar otra semana / otro mes»: empieza cuando termina el que tiene.
  let desde = x.desde, renovarDe: string | null = null;
  if (x.renovarDe) {
    if (x.dur === "until_event" || !ID.test(String(x.renovarDe))) return no("Ese patrocinio ya terminó.", "That sponsorship already ended.");
    const v = (await db().query<{ dia: string }>(`select (s.ends_at at time zone $3)::date::text as dia from event_sponsorships s where s.id = $1::bigint and s.event_id = $2::bigint and s.status in ('activo', 'reservado')`,
      [x.renovarDe, evento, e.tz])).rows[0];
    if (!v) return no("Ese patrocinio ya terminó.", "That sponsorship already ended.");
    desde = v.dia; renovarDe = String(x.renovarDe);
  }
  if (desde !== "hoy" && desde === e.hoy) desde = "hoy";
  const f = await periodo(null, e, x.dur, desde, P);
  if (!f) return no("«Hasta el evento» es solo para un evento que todavía no llega.", "«Until the event» is only for an event that has not happened yet.");
  if (f.dia < e.hoy) return no("Elige hoy o un día que viene.", "Choose today or an upcoming day.");
  if (f.dia > maxInicio(e, P, x.dur) && !renovarDe) return no("Ese día ya no sirve: el patrocinio empieza antes del evento.", "That day no longer works: the sponsorship starts before the event.");
  if (renovarDe && f.dia > e.dia!) return no("Tu evento ya habrá pasado: no hace falta renovar.", "Your event will be over by then: no need to renew.");
  const centavos = f.precio, idem = `pat-evento-${evento}-${x.clave}`;
  // Ya se hizo con esta clave (doble toque, o la red se cortó después de cobrar): lo mismo otra vez.
  const ya = (await db().query<{ id: string }>(`select ref_id::text as id from sponsorship_payments where idem_key = $1`, [idem])).rows[0];
  if (ya) return { ok: true, id: ya.id };
  const empiezaHoy = desde === "hoy" || (!!renovarDe && Date.parse(f.a) <= Date.now());
  const renovar = x.dur !== "until_event" && !!x.renovar;
  let retenido: string | null = null, otroMonto: { id: string; cobrado: number } | null = null;
  try {
    const r = await tx(async (c): Promise<ResPat & { aviso?: { hasta: string } }> => {
      await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`patevt:${e.ciudad}`]);
      const cruza = (await c.query(`select 1 from event_sponsorships where event_id = $1::bigint and status in ('reservado', 'activo') and starts_at < $3::timestamptz and ends_at > $2::timestamptz`, [evento, f.a, f.b])).rowCount;
      if (cruza) return no("Este evento ya tiene un patrocinio en esas fechas.", "This event already has a sponsorship on those dates.");
      const vivos = (await c.query<{ n: number }>(`select patrocinio_evt_a_la_vez($1, $2::timestamptz, $3::timestamptz, null) as n`, [e.ciudad, f.a, f.b])).rows[0]!.n;
      if (vivos >= P.puestos) return { ok: false, sinPuestos: true, msg: { es: "Ya no quedan puestos en esas fechas. No se cobró nada.", en: "There are no slots left on those dates. Nothing was charged." } };
      const cobro: Cobro = { kind: "evento", negocio, ciudad: e.ciudad, payer: quien, pm: card.pm, centavos, idem, razon: renovarDe ? "renovacion" : "compra", meta: { business_id: negocio, event_id: evento, duration: x.dur }, enSesion: true };
      const p = await cobrar(cobro);
      // 3-D Secure: la hoja del banco (verificar) y la pantalla vuelve a mandar lo mismo con la misma clave; no se guardó nada.
      if (!p.ok) return { ok: false, msg: p.msg, ...(p.verificar ? { verificar: p.verificar } : {}) };
      if (p.retenido) retenido = p.pi;
      const id = (await c.query<{ id: string }>(
        `insert into event_sponsorships (event_id, business_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, card_pm, auto_renew, renewed_from)
         values ($1::bigint, $2, $3, $4::timestamptz, $5::timestamptz, $6, $7, $8, $9, $10, $11, $12::bigint) returning id::text`,
        [evento, negocio, e.ciudad, f.a, f.b, x.dur, empiezaHoy ? "activo" : "reservado", centavos, quien, card.pm, renovar, renovarDe])).rows[0]!.id;
      const cobrado = await capturarCobro(p, centavos);
      await anotarPago(c, { ...cobro, centavos: cobrado, ref: id, pi: p.pi, marca: p.marca, l4: p.l4 });
      otroMonto = { id, cobrado };
      await c.query(`update sponsorship_waits set status = 'compro' where kind = 'evento' and business_id = $1 and status = 'espera'`, [negocio]);
      await auditarEvento(c, quien, evento, e.ciudad, renovarDe ? "patrocinio_evento.renovar" : "patrocinio_evento.comprar",
        { patrocinio: id, negocio, duracion: x.dur, desde: f.a, hasta: f.b, monto: money(centavos), semanas: f.semanas, renovar_solo: renovar, estado: empiezaHoy ? "activo" : "reservado" });
      return { ok: true, id, estado: empiezaHoy ? "activo" : "reservado", aviso: { hasta: f.b } };
    });
    if (r.ok && r.estado === "activo" && r.aviso) await avisoEvt(evento, "biz_patevt_activo", { hasta: r.aviso.hasta, monto: money(centavos) }).catch(() => undefined);
    // 25 nov (revisión de 621f214) · Stripe capturó otro monto que el pedido: el equipo de dinero lo sabe (fuera de la transacción, ya guardada).
    const om = otroMonto as { id: string; cobrado: number } | null;
    if (r.ok && om) await (await import("./dinero-alertas")).alertarOtroMonto("event_sponsorships", om.id, centavos, om.cobrado, { negocio, ciudad: e.ciudad, que: { es: `Patrocinio del evento ${om.id}`, en: `Event sponsorship ${om.id}` } });
    return r;
  } catch (er) {
    const sc = await soltarRetenido(retenido, er);
    if (sc) return sc;
    const d = errorDePuestos(er);
    if (d) return String((er as Error)?.message ?? "").includes("patrocinio_cruza") ? no("Este evento ya tiene un patrocinio en esas fechas.", "This event already has a sponsorship on those dates.") : d;
    if (String((er as Error)?.message ?? "").includes("patrocinio_evt_evento")) return no("Tu evento tiene que estar publicado y por venir para patrocinarlo. No se cobró nada.", "Your event has to be live and upcoming to sponsor it. Nothing was charged.");
    throw er;
  }
}

export async function auditarEvento(c: PoolClient | null, actor: string, evento: string, ciudad: string, action: string, after: unknown, reason: string | null = null, kind: "user" | "staff" | "system" = "user") {
  await (c ?? db()).query(`insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after, reason) values ($1, $2, $3, 'event', $4, $5, null, $6::jsonb, $7)`,
    [kind, kind === "system" ? null : actor, action, evento, ciudad, JSON.stringify(after ?? null), reason]);
}

/* «Avísame si se libera un puesto» (Eventos de la ciudad). */
export async function avisameLibreEvento(negocio: string, evento: string, quien: string): Promise<ResPat> {
  const e = await eventoPat(null, evento, negocio);
  if (!e) return no("Ese evento no es de tu negocio.", "That event is not your business’s.");
  await db().query(`insert into sponsorship_waits (kind, business_id, category_id, city_id, user_id) values ('evento', $1, null, $2, $3) on conflict do nothing`, [negocio, e.ciudad, quien]);
  return { ok: true };
}

/* Renovación sola (1 semana o 1 mes; «hasta el evento» no se renueva). La tarjeta es la del pago. */
export async function renovarSoloEvento(negocio: string, evento: string, quien: string, id: string, on: boolean): Promise<ResPat> {
  if (!ID.test(String(id)) || !ID.test(String(evento))) return no("Ese patrocinio no existe.", "That sponsorship does not exist.");
  // 9n · El cambio y su auditoría, en la misma transacción (guardián auditoriaEnLaTransaccion).
  const r = await tx(async (c) => {
    const r = await c.query<{ city_id: string }>(`update event_sponsorships set auto_renew = $4 where id = $1::bigint and event_id = $2::bigint and business_id = $3 and status in ('activo', 'reservado')
      and card_pm is not null and duration <> 'until_event' returning city_id`, [id, evento, negocio, !!on]);
    if (r.rowCount) await auditarEvento(c, quien, evento, r.rows[0]!.city_id, on ? "patrocinio_evento.renovar_solo_on" : "patrocinio_evento.renovar_solo_off", { patrocinio: id });
    return r;
  });
  if (!r.rowCount) return no("Ese patrocinio ya terminó.", "That sponsorship already ended.");
  return { ok: true };
}

/* «Terminar antes» (el organizador): deja de salir ya; lo pagado no se devuelve (lo dice la pantalla antes de confirmar). «Cancelar reserva» (no
   empezó): se devuelve todo (lo decide la base, 'todo'). */
export async function terminarPorDuenoEvento(negocio: string, evento: string, quien: string, id: string): Promise<ResPat> {
  if (!ID.test(String(id)) || !ID.test(String(evento))) return no("Ese patrocinio no existe.", "That sponsorship does not exist.");
  const r = await tx(async (c) => {
    const r = await c.query<{ city_id: string; status: string; refund_cents: number | null }>(
    `update event_sponsorships set status = case when status = 'reservado' then 'cancelado' else 'terminado' end, end_kind = 'dueno', ended_at = now(), ended_by = $4, auto_renew = false,
            ${DEVOLUCION("case when status = 'reservado' then 'todo' else 'nada' end", "'reserva_cancelada'", true)}
      where id = $1::bigint and event_id = $2::bigint and business_id = $3 and status in ('activo', 'reservado') returning city_id, status, refund_cents`, [id, evento, negocio, quien]);
    const x = r.rows[0];
    if (x) await auditarEvento(c, quien, evento, x.city_id, "patrocinio_evento.terminar", { patrocinio: id, estado: x.status, devolver: x.refund_cents ? money(x.refund_cents) : null });
    return r;
  });
  if (!r.rowCount) return no("Ese patrocinio ya terminó.", "That sponsorship already ended.");
  return devolverYDecir("evento", id, r.rows[0]!.refund_cents);
}

/* ── El panel (Eventos › el evento › Patrocinar) ── */
export type FilaPatE = { id: string; estado: "reservado" | "activo" | "terminado" | "cancelado"; dur: DurE; desde: string; hasta: string; precio: number; renovar: boolean; tarjeta: string | null;
  fin: string | null; finKind: string | null; finMotivo: string | null; vistas: number; entraron: number; boletos: number; dias: number; dia: number;
  /* 0175 · En pausa (el evento no se ve), los días de pausa (cerrados y la abierta) y lo devuelto. */
  pausado: boolean; pausaDias: number; devuelto: number };
export type PatEvtPanel = {
  evento: { id: string; slug: string; titulo: Bi; ciudad: string; ciudadN: string; tz: string; dia: string | null; vivo: boolean; entry: string };
  precios: PrecioEvt; libres: { week: ConsultaE; month: ConsultaE; until_event: ConsultaE }; hoy: string; previa: TarjetaEvt | null;
  vivo: FilaPatE | null; siguiente: FilaPatE | null; pasados: FilaPatE[]; recibos: Recibo[];
  espera: boolean; tarjetas: { pm: string; marca: string; ultimos4: string; vence: string; def: boolean }[]; modo: "stripe" | "simulador" | "apagado"; pk: string | null;
};
const FILA = `s.id::text, s.status as estado, s.duration as dur, to_char(s.starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as desde,
  to_char(s.ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hasta, s.price_cents as precio, s.auto_renew as renovar,
  (select upper(pm.brand) || ' ·· ' || pm.last4 from payment_methods pm where pm.stripe_pm_id = s.card_pm) as tarjeta,
  to_char(s.ended_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as fin, s.end_kind as "finKind", s.end_reason as "finMotivo",
  coalesce(st.views, 0)::int as vistas, coalesce(st.entries, 0)::int as entraron, coalesce(st.orders, 0)::int as boletos,
  greatest(1, ceil(extract(epoch from s.ends_at - s.starts_at) / 86400))::int as dias, least(greatest(1, ceil(extract(epoch from now() - s.starts_at) / 86400))::int, greatest(1, ceil(extract(epoch from s.ends_at - s.starts_at) / 86400))::int) as dia,
  s.paused_at is not null as pausado, floor((s.paused_secs + coalesce(extract(epoch from now() - s.paused_at), 0)) / 86400)::int as "pausaDias",
  coalesce((select r.amount_cents from sponsorship_payments r where r.kind = 'evento' and r.ref_id = s.id and r.reason = 'devolucion'), 0)::int as devuelto`;

export async function patEvtPanel(negocio: string, evento: string, userId: string, lang: "es" | "en"): Promise<PatEvtPanel | null> {
  const e = await eventoPat(null, evento, negocio);
  if (!e) return null;
  const vivoE = vivoEvt(e);
  const [lw, lm, lu, filas, rec, esp, tj, previa, P] = await Promise.all([
    vivoE ? consultarPuestosEvento(negocio, evento, "week", "hoy") : Promise.resolve(null),
    vivoE ? consultarPuestosEvento(negocio, evento, "month", "hoy") : Promise.resolve(null),
    vivoE ? consultarPuestosEvento(negocio, evento, "until_event", "hoy") : Promise.resolve(null),
    db().query<FilaPatE>(`select ${FILA} from event_sponsorships s left join sponsorship_stats st on st.kind = 'evento' and st.ref_id = s.id where s.event_id = $1::bigint and s.business_id = $2 order by s.starts_at desc, s.id desc limit 20`, [evento, negocio]),
    db().query<Recibo>(
      `select to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, p.amount_cents as monto, coalesce(upper(p.card_brand) || ' ·· ' || p.card_last4, '—') as tarjeta, p.reason as razon, p.refund_days as dias
         from sponsorship_payments p join event_sponsorships s on s.id = p.ref_id where p.kind = 'evento' and s.event_id = $1::bigint and p.business_id = $2 order by p.created_at desc limit 24`, [evento, negocio]),
    db().query(`select 1 from sponsorship_waits where kind = 'evento' and business_id = $1 and status = 'espera'`, [negocio]),
    (await import("./cobros")).misTarjetas(userId),
    vivoE ? (await import("./evt-publico")).tarjetaDeEvento(evento, lang === "es") : Promise.resolve(null),
    preciosEvento(),
  ]);
  const vivo = filas.rows.find((x) => x.estado === "activo") ?? null;
  const siguiente = filas.rows.filter((x) => x.estado === "reservado").sort((a, b) => a.desde.localeCompare(b.desde))[0] ?? null;
  return {
    evento: { id: e.id, slug: e.slug, titulo: e.titulo, ciudad: e.ciudad, ciudadN: e.ciudadN, tz: e.tz, dia: e.dia, vivo: vivoE, entry: e.entry },
    precios: P, libres: { week: lw, month: lm, until_event: lu }, hoy: e.hoy, previa, vivo, siguiente,
    pasados: filas.rows.filter((x) => x.estado === "terminado" || x.estado === "cancelado").slice(0, 10), recibos: rec.rows, espera: !!esp.rowCount, tarjetas: tj,
    modo: pasarela.modo(), pk: await llave("STRIPE_PUBLISHABLE_KEY"),
  };
}
/* Para la ficha del evento en el panel: si tiene un patrocinio vivo (el botón dice «Patrocinio» en vez de «Patrocinar»). */
export async function patEvtVivo(negocio: string, evento: string): Promise<boolean> {
  if (!ID.test(evento)) return false;
  return !!(await db().query(`select 1 from event_sponsorships where event_id = $1::bigint and business_id = $2 and status in ('activo', 'reservado') limit 1`, [evento, negocio])).rowCount;
}

/* ── Avisos al organizador ── */
export async function avisoEvt(evento: string, tpl: string, v: { hasta?: string; monto?: string; tarjeta?: string; motivo?: string | Bi; n?: string; total?: string }) {
  const x = (await db().query<{ negocio: string; titulo: Bi; ciudad: string; tz: string }>(
    `select e.business_id as negocio, e.title as titulo, ci.name as ciudad, ci.timezone as tz from events e join cities ci on ci.id = e.city_id where e.id = $1::bigint`, [evento])).rows[0];
  if (!x) return;
  const fh = (l: string) => new Intl.DateTimeFormat(l, { timeZone: x.tz, day: "numeric", month: "short" }).format(new Date(v.hasta!)).replace(/\./g, "");
  const hasta: string | Bi = v.hasta ? { es: fh("es-US"), en: fh("en-US") } : "";
  await (await import("./avisos")).avisarNegocio(x.negocio, tpl, { evento: x.titulo, ciudad: x.ciudad, hasta, monto: v.monto ?? "", tarjeta: v.tarjeta ?? "", motivo: v.motivo ?? "", n: v.n ?? "", total: v.total ?? "" },
    { href: `/panel/${x.negocio}/eventos?det=evt:pat:${evento}` });
}

/* ── El barrido (cada minuto, lib/barrido.ts) ── */
/* Termina el patrocinio de un evento cancelado (devolviendo los días que no se usaron) o que ya pasó (sin fechas programadas por delante), empieza
   los reservados que ya tocan, pausa lo de un evento que no se ve (oculto, en revisión o con Eventos apagado) y lo sigue cuando vuelve a verse
   (alargándolo lo que duró la pausa, si cabe), vence los que terminaron (renovando los de 1 semana o 1 mes que lo piden, si el evento sigue por
   venir, cobra y hay puesto), avisa a quien pidió «Avísame», hace las devoluciones pendientes y pone al día los boletos que llegaron por el patrocinio. */
export async function barrerPatrociniosEventos(): Promise<{ terminaron: number; empezaron: number; vencieron: number; renovados: number; pausados: number; siguieron: number }> {
  let terminaron = 0, empezaron = 0, vencieron = 0, renovados = 0, pausados = 0, siguieron = 0;
  // Evento cancelado: su patrocinio termina (y lo reservado se cancela) y se devuelven los días enteros que no se usaron (una reserva: todo).
  const cx = await db().query<{ evento: string }>(
    `update event_sponsorships s set status = case when s.status = 'reservado' then 'cancelado' else 'terminado' end, end_kind = 'evento_cancelado', ended_at = now(), auto_renew = false,
            ${DEVOLUCION("'sin_usar'", "'evento_cancelado'", true, "s.")}
       from events e where e.id = s.event_id and s.status in ('activo', 'reservado') and e.status = 'cancelled' returning s.event_id::text as evento`);
  for (const x of cx.rows) { terminaron++; await avisoEvt(x.evento, "biz_patevt_cancelado", {}).catch(() => undefined); }
  // Evento que ya pasó (ninguna fecha programada que no haya terminado): termina. Lo que estuvo en pausa y no se pudo alargar se devuelve.
  const pa = await db().query<{ evento: string }>(
    `update event_sponsorships s set status = case when s.status = 'reservado' then 'cancelado' else 'terminado' end, end_kind = 'evento_paso', ended_at = now(), auto_renew = false,
            ${DEVOLUCION("'pausa'", "'pausa'", true, "s.")}
      where s.status in ('activo', 'reservado') and not exists (select 1 from event_dates d where d.event_id = s.event_id and d.status = 'scheduled' and d.ends_at > now())
      returning s.event_id::text as evento`);
  for (const x of pa.rows) { terminaron++; await avisoEvt(x.evento, "biz_patevt_termino", {}).catch(() => undefined); }
  const emp = await db().query<{ evento: string; hasta: string; precio: number }>(
    `update event_sponsorships set status = 'activo' where status = 'reservado' and starts_at <= now() and ends_at > now()
     returning event_id::text as evento, to_char(ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hasta, price_cents as precio`);
  for (const x of emp.rows) { empezaron++; await avisoEvt(x.evento, "biz_patevt_activo", { hasta: x.hasta, monto: money(x.precio) }).catch(() => undefined); }
  // Pausa: el evento sigue por venir y no está cancelado, pero ninguna fecha se ve (oculto, en revisión, sin aprobar o con Eventos apagado en su
  // negocio). No sale en la vitrina ni cuenta vistas; guarda su puesto.
  const pz = await db().query<{ evento: string }>(
    `update event_sponsorships s set paused_at = now()
      where s.status = 'activo' and s.paused_at is null
        and exists (select 1 from events e where e.id = s.event_id and e.status <> 'cancelled')
        and exists (select 1 from event_dates d where d.event_id = s.event_id and d.status = 'scheduled' and d.ends_at > now())
        and not exists (select 1 from event_dates d where d.event_id = s.event_id and d.listable and d.ends_at > now())
      returning s.event_id::text as evento`);
  for (const x of pz.rows) { pausados++; await avisoEvt(x.evento, "biz_patevt_pausa", {}).catch(() => undefined); }
  // 9t9 · Cada patrocinio por su cuenta (lib/barrido-uno.ts): antes el error de uno se tragaba (solo el registro) y la tarea salía bien; ahora los demás
  // siguen igual y la tarea sale fallida diciendo cuál. Los que siguen tocando (falló, o Stripe no contestó) van por tandas sin repetirse en la corrida.
  const U = await import("./barrido-uno"), B = new U.Fallos("patrociniosEventos");
  // Vuelve a verse: sigue, alargado lo que duró la pausa (si cabe).
  await U.porTandas(B, 200, async (vistos) => (await db().query<{ id: string }>(
    `select s.id::text from event_sponsorships s where s.status = 'activo' and s.paused_at is not null and not (s.id = any($1::bigint[]))
        and exists (select 1 from event_dates d where d.event_id = s.event_id and d.listable and d.ends_at > now()) order by s.paused_at, s.id limit 200`, [vistos])).rows, (x) => `seguir ${x.id}`, async ({ id }) => {
    const r = await reanudarUno(id);
    if (!r) return;
    siguieron++;
    await avisoEvt(r.evento, "biz_patevt_sigue", { hasta: r.hasta }).catch(() => undefined);
  }, { clave: (x) => x.id });
  await db().query(`update event_sponsorships set status = 'terminado', end_kind = 'vencio', ended_at = now(), auto_renew = false where status = 'reservado' and ends_at <= now()`);
  // Lo que está en pausa no vence: espera a que el evento vuelva (y se alargue) o a que pase (y se devuelva lo que no se usó).
  await U.porTandas(B, 200, async (vistos) => (await db().query<{ id: string }>(
    `select id::text from event_sponsorships where status = 'activo' and paused_at is null and ends_at <= now() and not (id = any($1::bigint[])) order by ends_at, event_sponsorships.id limit 200`, [vistos])).rows,
  (x) => `vencer ${x.id}`, async ({ id }) => {
    const r = await vencerUnoEvt(id);
    if (!r) return;
    if (r.r === "renovado") renovados++; else vencieron++;
    await avisoEvt(r.evento, r.tpl, r.v).catch(() => undefined);
  }, { clave: (x) => x.id });
  // «Avísame si se libera un puesto»: hay uno libre esta semana en Eventos de su ciudad.
  const W = (await db().query<{ id: string; negocio: string; ciudad: string }>(
    `select w.id::text, w.business_id as negocio, w.city_id as ciudad from sponsorship_waits w where w.kind = 'evento' and w.status = 'espera'
        and patrocinio_evt_a_la_vez(w.city_id, now(), now() + interval '7 days', null) < cfg_int('patrocinio_evt_puestos') order by w.id limit 200`)).rows;
  await B.cada(W, (w) => `espera ${w.id}`, async (w) => {
    const u = await db().query(`update sponsorship_waits set status = 'avisado', notified_at = now() where id = $1::bigint and status = 'espera'`, [w.id]);
    if (!u.rowCount) return;
    const ci = (await db().query<{ n: string }>(`select name as n from cities where id = $1`, [w.ciudad])).rows[0]?.n ?? "";
    await (await import("./avisos")).avisarNegocio(w.negocio, "biz_patevt_libre", { ciudad: ci }, { href: `/panel/${w.negocio}/eventos` }).catch(() => undefined);
  });
  // Lo que se decidió devolver (evento cancelado, pausa que no cupo) y todavía no está en el libro: a la pasarela, con su llave.
  await devolverPendientes("evento");
  await db().query(`select patrocinio_evt_cifras_al_dia()`);
  B.fin();
  return { terminaron, empezaron, vencieron, renovados, pausados, siguieron };
}

/* Sigue un patrocinio en pausa cuyo evento volvió a verse: la pausa se cierra y el fin se alarga lo que falta devolver de las pausas, pero nunca
   más allá del fin del evento, del siguiente patrocinio del mismo evento ni del primer momento en que ya no queda puesto en la ciudad (la base lo
   vuelve a revisar con el candado al mover el fin). Lo que no cupo queda para devolverse al terminar ('pausa'). */
async function reanudarUno(id: string): Promise<{ evento: string; hasta: string } | null> {
  return tx(async (c) => {
    const s = (await c.query<{ evento: string; ciudad: string; pausa: number; ext: number }>(
      `select s.event_id::text as evento, s.city_id as ciudad, s.paused_secs + greatest(0, floor(extract(epoch from now() - s.paused_at)))::int as pausa, s.extended_secs as ext
         from event_sponsorships s where s.id = $1::bigint and s.status = 'activo' and s.paused_at is not null for update`, [id])).rows[0];
    if (!s) return null;
    await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`patevt:${s.ciudad}`]);
    const al = (await c.query<{ n: number }>(
      `with x as (select s.ends_at as b, s.ends_at + make_interval(secs => $2::int) as meta, s.event_id, s.city_id from event_sponsorships s where s.id = $1::bigint),
            t as (select x.b, least(x.meta,
                    greatest(x.b, coalesce((select max(d.ends_at) from event_dates d where d.event_id = x.event_id and d.status = 'scheduled'), x.b)),
                    coalesce((select min(o.starts_at) from event_sponsorships o where o.event_id = x.event_id and o.id <> $1::bigint and o.status in ('reservado', 'activo') and o.starts_at >= x.b), x.meta),
                    case when patrocinio_evt_a_la_vez(x.city_id, x.b, x.b + interval '1 second', $1::bigint) >= cfg_int('patrocinio_evt_puestos') then x.b else x.meta end,
                    coalesce((select min(o.starts_at) from event_sponsorships o where o.city_id = x.city_id and o.id <> $1::bigint and o.status in ('reservado', 'activo')
                                and o.starts_at > x.b and o.starts_at < x.meta
                                and patrocinio_evt_a_la_vez(x.city_id, o.starts_at, o.starts_at + interval '1 second', $1::bigint) >= cfg_int('patrocinio_evt_puestos')), x.meta)) as fin from x)
       select greatest(0, floor(extract(epoch from t.fin - t.b)))::int as n from t`, [id, Math.max(0, s.pausa - s.ext)])).rows[0]!.n;
    const u = (await c.query<{ hasta: string }>(
      `update event_sponsorships set paused_secs = $2::int, paused_at = null, extended_secs = extended_secs + $3::int, ends_at = ends_at + make_interval(secs => $3::int)
        where id = $1::bigint returning to_char(ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hasta`, [id, s.pausa, al])).rows[0]!;
    await auditarEvento(c, "system", s.evento, s.ciudad, "patrocinio_evento.sigue", { patrocinio: id, pausa_dias: Math.floor(s.pausa / 86400), alargado_s: al, hasta: u.hasta }, null, "system");
    return { evento: s.evento, hasta: u.hasta };
  });
}

/* Un patrocinio de evento que llegó a su fin: con «renovar» encendido (1 semana o 1 mes), si el evento sigue por venir, se cobra el siguiente período
   (el precio de hoy) con la tarjeta del pago, si hay puesto; si no, termina y se avisa por qué. Una sola vez: la llave es la del período que termina. */
const YA_COBRADA: Bi = { es: "la renovación ya estaba cobrada y no se aplicó: la revisa To'Latino", en: "the renewal was already charged and was not applied: To'Latino reviews it" };
type VencidoE = { r: "renovado" | "termino"; evento: string; tpl: string; v: { hasta?: string; monto?: string; tarjeta?: string; motivo?: string | Bi } };
/* 9t5 · Uno solo, sin esperar al siguiente barrido: la renovación en camino que la consulta a la pasarela ya resolvió (lib/cobro-fuera.ts ›
   resolverCobroFuera) se cierra por el mismo vencimiento (vencerUnoEvt), con su aviso. */
export async function renovacionConsultadaEvt(id: string): Promise<void> {
  const r = await vencerUnoEvt(id);
  if (r) await avisoEvt(r.evento, r.tpl, r.v).catch(() => undefined);
}
async function vencerUnoEvt(id: string): Promise<VencidoE | null> {
  return tx(async (c) => {
    const s = (await c.query<{ id: string; event_id: string; business_id: string; city_id: string; duration: DurE; auto_renew: boolean; card_pm: string | null; payer_user_id: string; fin: string }>(
      `select s.id::text, s.event_id::text, s.business_id, s.city_id, s.duration, s.auto_renew, s.card_pm, s.payer_user_id, ((s.ends_at at time zone ci.timezone)::date)::text as fin
         from event_sponsorships s join cities ci on ci.id = s.city_id where s.id = $1::bigint and s.status = 'activo' and s.ends_at <= now() for update of s`, [id])).rows[0];
    if (!s) return null;
    // Lo que estuvo en pausa y no se pudo alargar se devuelve al terminar ('pausa'; devolverPendientes al final del barrido).
    const terminar = async (motivo: Bi | null) => { await c.query(`update event_sponsorships set status = 'terminado', end_kind = 'vencio', ended_at = now(), renew_note = $2, ${DEVOLUCION("'pausa'", "'pausa'", true)} where id = $1::bigint`, [id, motivo?.es ?? null]); };
    const e = await eventoPat(c, s.event_id, s.business_id);
    // 9t4 · Una renovación ya mandada a Stripe que no contestó (offsession_charges en camino) se termina con SU llave y SU monto sin volver a mirar el
    // puesto, la tarjeta ni el evento (Stripe pudo cobrarla); una anotada que nunca salió se suelta si ya no aplica (lib/patrocinio.ts › vencerUno).
    const CF = await import("./cobro-fuera");
    const camino = await CF.enCamino("patrocinio_evento", id), mandada = !!camino?.enviada;
    if (!mandada && (!s.auto_renew || !s.card_pm || s.duration === "until_event" || !e)) {
      if (camino) await CF.soltarSinMandar(camino.id, "no_renueva");
      await terminar(null); return { r: "termino", evento: s.event_id, tpl: "biz_patevt_termino", v: {} };
    }
    await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`patevt:${s.city_id}`]);
    const P = await preciosEvento();
    let motivo: Bi | null = null;
    if (!mandada && (!e || !vivoEvt(e) || (e.dia && e.dia < s.fin))) motivo = { es: "el evento ya pasó", en: "the event is over" };
    const f = motivo || s.duration === "until_event" ? null : (await fechasPeriodo(c, s.city_id, s.fin, s.duration, { tabla: "event_sponsorships", negocio: s.business_id, evento: s.event_id }))!;
    if (f && !mandada && (await c.query<{ n: number }>(`select patrocinio_evt_a_la_vez($1, $2::timestamptz, $3::timestamptz, $4::bigint) as n`, [s.city_id, f.a, f.b, id])).rows[0]!.n >= P.puestos) motivo = { es: "no quedaba puesto", en: "there was no slot left" };
    const tarjeta = motivo ? null : mandada ? { pm: camino!.pm } : s.card_pm ? await tarjetaDe(s.payer_user_id, s.card_pm) : null;
    if (!motivo && !tarjeta) motivo = { es: "la tarjeta ya no está guardada", en: "the card is no longer saved" };
    if (motivo && camino && !mandada) await CF.soltarSinMandar(camino.id, motivo.en.replace(/\W+/g, "_").slice(0, 60));
    if (!motivo && f && tarjeta) {
      const centavos = s.duration === "week" ? P.week : P.month, idem = `pat-evento-renov-${id}`;
      // Una renovación ya anotada se cobra con SU monto (el de Configuración el día que se anotó), nunca con otro.
      const aCobrar = camino?.monto ?? centavos;
      const cobro: Cobro = { kind: "evento", negocio: s.business_id, ciudad: s.city_id, payer: s.payer_user_id, pm: tarjeta.pm, centavos: aCobrar, idem, razon: "renovacion", meta: { business_id: s.business_id, event_id: s.event_id, duration: s.duration }, ref: id };
      const p = await cobrar(cobro);
      // Stripe no contestó: nada cambia (el patrocinio no termina ni se avisa); el próximo paso del barrido la termina con la misma llave.
      if (!p.ok && p.enCamino) return null;
      if (p.ok) {
        // El cierre de la intención va en ESTA transacción (con el patrocinio nuevo y el libro): una vez.
        // 9t5 · marcarHecho no pudo: si la intención ya estaba HECHA con el patrocinio todavía vivo (un arreglo a mano, un fallo: en el flujo normal el
        // cierre y la renovación van en la misma transacción), no se queda mudo en cada barrido: termina con su motivo y el equipo de dinero decide
        // (offsession_unapplied, una vez). Nunca se cobra otra vez.
        if (!(await CF.marcarHecho(c, p.intencion!, p.pi))) {
          const ia = await CF.intencion(p.intencion!);
          if (ia?.st !== "done") return null;
          await terminar(YA_COBRADA);
          await CF.alertaSinAplicar(ia, { es: `el patrocinio ${id} seguía vivo con su renovación ya cobrada.`, en: `sponsorship ${id} was still live with its renewal already charged.` });
          return { r: "termino", evento: s.event_id, tpl: "biz_patevt_no_renovo", v: { motivo: YA_COBRADA } };
        }
        const monto = p.centavos ?? aCobrar;
        await c.query(`update event_sponsorships set status = 'terminado', end_kind = 'vencio', ended_at = now(), ${DEVOLUCION("'pausa'", "'pausa'", true)} where id = $1::bigint`, [id]);
        await c.query("savepoint renueva");
        let nid: string | null = null;
        try {
          nid = (await c.query<{ id: string }>(
            `insert into event_sponsorships (event_id, business_id, city_id, starts_at, ends_at, duration, status, price_cents, payer_user_id, card_pm, auto_renew, renewed_from)
             values ($1::bigint, $2, $3, $4::timestamptz, $5::timestamptz, $6, 'activo', $7, $8, $9, true, $10::bigint) returning id::text`,
            [s.event_id, s.business_id, s.city_id, f.a, f.b, s.duration, monto, s.payer_user_id, tarjeta.pm, id])).rows[0]!.id;
        } catch (er) {
          // Ya mandada y sin puesto (otro lo tomó mientras Stripe no contestaba): el cobro salió y no se aplica; lo decide el equipo de dinero.
          if (!errorDePuestos(er)) throw er;
          await c.query("rollback to savepoint renueva");
          await c.query(`update event_sponsorships set renew_note = $2 where id = $1::bigint`, [id, "no quedaba puesto"]);
          const ia = await CF.intencion(p.intencion!);
          if (ia) await CF.alertaSinAplicar(ia, { es: `al renovar el patrocinio de evento ${id} ya no quedaba puesto.`, en: `when renewing event sponsorship ${id} there was no slot left.` });
          return { r: "termino", evento: s.event_id, tpl: "biz_patevt_no_renovo", v: { motivo: { es: "no quedaba puesto", en: "there was no slot left" } } };
        }
        await anotarPago(c, { ...cobro, centavos: monto, idem: p.idem ?? idem, ref: nid!, pi: p.pi, marca: p.marca, l4: p.l4 });
        await auditarEvento(c, s.payer_user_id, s.event_id, s.city_id, "patrocinio_evento.renovado_solo", { patrocinio: nid, de: id, monto: money(monto), hasta: f.b });
        const tj = p.marca && p.l4 ? `${p.marca.toUpperCase()} ·· ${p.l4}` : "";
        return { r: "renovado", evento: s.event_id, tpl: "biz_patevt_renovado", v: { hasta: f.b, monto: money(monto), tarjeta: tj } };
      }
      motivo = { es: p.msg.es.replace(/\.$/, "").toLowerCase(), en: p.msg.en.replace(/\.$/, "").toLowerCase() };
    }
    motivo ??= { es: "no se pudo renovar", en: "it could not be renewed" };
    await terminar(motivo);
    return { r: "termino", evento: s.event_id, tpl: "biz_patevt_no_renovo", v: { motivo: motivo! } };
  });
}

/* ── Super Admin › Crecimiento › Patrocinios (grupo Eventos) ── */
export async function patrociniosEventosAdmin(ciudades: string[], ciudad: string | null, lang: "es" | "en", desde: string | null, estado: "vivos" | "terminados" | "todos" = "vivos"): Promise<{ filas: PatAdm[]; mas: string | null; activos: number; reservados: number }> {
  const cur = desde && ID.test(desde) ? desde : null;
  const v: unknown[] = [ciudades, ciudad, lang];
  const w = `(cardinality($1::text[]) = 0 or s.city_id = any($1::text[])) and ($2::text is null or s.city_id = $2)`;
  const est = estado === "vivos" ? `and s.status in ('activo', 'reservado')` : estado === "terminados" ? `and s.status in ('terminado', 'cancelado')` : "";
  // Cursor por id (sin offset): lo nuevo primero. Una consulta para la página con lo pagado y las cifras (sin N+1).
  const r = await db().query<PatAdm>(
    `select s.id::text, 'evento' as kind, s.business_id as negocio, b.name as nombre, coalesce(nullif(e.title->>$3, ''), e.title->>'es') as evento,
            ${lang === "en" ? "'Events · '" : "'Eventos · '"} || ci.name as donde, s.city_id as ciudad, s.status as estado,
            to_char(s.starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as desde, to_char(s.ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hasta,
            s.price_cents as precio, coalesce(pg.n, 0)::int as pagado, coalesce(pg.dev, 0)::int as devuelto, s.auto_renew as renovar, s.end_kind as "finKind", s.end_reason as "finMotivo",
            coalesce(st.views, 0)::int as vistas, coalesce(st.entries, 0)::int as entraron, coalesce(st.orders, 0)::int as pedidos,
            case when s.status in ('activo', 'reservado') then (select d.cents from patrocinio_devolucion('sin_usar', s.price_cents, s.starts_at, s.ends_at, s.extended_secs, s.paused_secs, s.paused_at, now(), ci.timezone) d) else 0 end as "aDevolver",
            s.paused_at is not null as pausado
       from event_sponsorships s join events e on e.id = s.event_id join businesses b on b.id = s.business_id join cities ci on ci.id = s.city_id
       left join sponsorship_stats st on st.kind = 'evento' and st.ref_id = s.id
       left join lateral (select sum(p.amount_cents) filter (where p.reason <> 'devolucion') as n, sum(p.amount_cents) filter (where p.reason = 'devolucion') as dev
                            from sponsorship_payments p where p.kind = 'evento' and p.ref_id = s.id) pg on true
      where ${w} ${est} ${cur ? `and s.id < $4::bigint` : ""}
      order by s.id desc limit 41`, cur ? [...v, cur] : v);
  const filas = r.rows.slice(0, 40);
  const k = (await db().query<{ a: number; r: number }>(`select count(*) filter (where s.status = 'activo')::int as a, count(*) filter (where s.status = 'reservado')::int as r from event_sponsorships s where s.status in ('activo', 'reservado') and ${w}`, [ciudades, ciudad])).rows[0]!;
  return { filas, mas: r.rows.length > 40 ? filas.at(-1)!.id : null, activos: k.a, reservados: k.r };
}
/* Terminar (Super Admin, mkt:editar): con motivo, auditado y avisado al organizador. Con «Devolver lo que no se usó» (encendido de entrada), la
   base decide cuánto ('sin_usar', sin contar la pausa como usada) y va a la pasarela. La pantalla solo dice sí o no: nunca un monto. */
export async function terminarPorAdminEvento(staffId: string, ciudades: string[], id: string, motivo: string, devolver: boolean): Promise<ResPat> {
  const m = String(motivo ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!ID.test(String(id))) return no("Ese patrocinio no existe.", "That sponsorship does not exist.");
  if (m.length < 3) return no("Escribe el motivo.", "Write the reason.");
  const r = await tx(async (c) => {
    const s = (await c.query<{ evento: string; ciudad: string; estado: string }>(`select event_id::text as evento, city_id as ciudad, status as estado from event_sponsorships where id = $1::bigint for update`, [id])).rows[0];
    if (!s) return no("Ese patrocinio no existe.", "That sponsorship does not exist.");
    if (ciudades.length && !ciudades.includes(s.ciudad)) return no("Esa ciudad no es tuya.", "That city is not yours.");
    if (s.estado !== "activo" && s.estado !== "reservado") return no("Ya terminó.", "It is already over.");
    const d = (await c.query<{ cents: number | null }>(
      `update event_sponsorships set status = case when status = 'reservado' then 'cancelado' else 'terminado' end, end_kind = 'admin', end_reason = $2, ended_at = now(), ended_by = $3, auto_renew = false,
              ${DEVOLUCION("case when $4::boolean then 'sin_usar' else 'nada' end", "'admin'", true)}
        where id = $1::bigint returning refund_cents as cents`, [id, m, staffId, devolver === true])).rows[0]!;
    await auditarEvento(c, staffId, s.evento, s.ciudad, "mkt.patrocinio_evento.terminar", { patrocinio: id, antes: s.estado, despues: s.estado === "reservado" ? "cancelado" : "terminado", devolver: d.cents ? money(d.cents) : null }, m, "staff");
    return { ok: true, evento: s.evento, devolver: d.cents ?? 0 } as ResPat & { evento: string; devolver: number };
  });
  if (!r.ok || !("evento" in r)) return r;
  await avisoEvt(String(r.evento), "biz_patevt_admin", { motivo: m }).catch(() => undefined);
  const quiere = (r as { devolver?: number }).devolver ?? 0, dev = quiere ? await devolverPatrocinio("evento", id) : 0;
  return { ok: true, devuelto: dev, msg: quiere
    ? (dev ? { es: `Patrocinio terminado. Se devolvieron ${money(dev)} a su tarjeta. Quedó en la auditoría.`, en: `Sponsorship ended. ${money(dev)} was refunded to the card. It is in the audit log.` }
      // 9t8 · Stripe dijo que no: no se reintenta sola (alerta al equipo de dinero); sin respuesta, el barrido la termina con la misma llave.
      : (await devolucionEstado("evento", id)) === "failed"
        ? { es: "Patrocinio terminado. Stripe no aceptó la devolución: el equipo de dinero tiene la alerta para hacerla por fuera. Quedó en la auditoría.", en: "Sponsorship ended. Stripe did not accept the refund: the money team has the alert to make it outside Stripe. It is in the audit log." }
        : { es: "Patrocinio terminado. La devolución sigue pendiente: el barrido la reintenta. Quedó en la auditoría.", en: "Sponsorship ended. The refund is still pending: the sweep retries it. It is in the audit log." })
    : { es: "Patrocinio terminado sin devolver. Quedó en la auditoría.", en: "Sponsorship ended with no refund. It is in the audit log." } };
}
