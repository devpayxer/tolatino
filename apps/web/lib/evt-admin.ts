import "server-only";
import { auditar, type Staff } from "./admin";
import { avisarNegocio } from "./avisos";
import { db, tx } from "./db";
import { diaCorto, hora, SENAL_L_UI, type Bi } from "./evt-comun";

/* 6j · Super Admin › Eventos y boletos completo (fase6-eventos.md §4 6j; admin-dashboard ADM-EVT L174–186, L74, L291):
   - Cupos y venta de UNA fecha en la ficha del evento: cada tipo de boleto, mesa y el aforo del día con lo vendido, apartado y lo que queda;
     «Ajustar cupo» (event_stock_overrides, solo inserción: el último ajuste manda aunque el organizador vuelva a guardar; la base no deja
     bajarlo de lo vendido + apartado) y «Extender ventas» (event_dates.sales_extended_until: la venta en línea cierra más tarde, nunca
     después de que empieza — en la puerta no se vende, D1). Los dos con motivo, event_changes, auditoría y aviso al organizador.
   - «Evento con sobreventa» (evt_sobreventa): la alerta viva. Con los checks de 0108 no debería salir nunca.
   - Confianza › Fraude: las señales de Eventos (evt_senales) con su caso abierto o no; «Abrir caso» va a Reportes de usuario (regla evt).
   - Usuarios 360° › Actividad (boletos, RSVP y entradas de una persona) y Negocios 360° › Eventos (liquidaciones y cancelaciones).
   - Catálogo de formatos y géneros (hueco #8): nombre y descripción ES/EN, encender o apagar un formato o un género, qué categorías
     publican cada formato y el orden de los géneros; nada se borra (enabled).
   Todo por las ciudades de quien mira (staff.cities; vacío = todas). El servidor decide. */
const ID = /^\d{1,18}$/, UUID = /^[0-9a-f-]{36}$/, GEN = /^[a-z0-9]{2,24}$/, FMT = /^[a-z]{2,16}$/, CAT = /^NEG-[A-Z]{2,12}$/;
type R = { ok: true; msg: string } | { ok: false; msg: string };
const no = (msg: string): R => ({ ok: false, msg });
const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const CIU = (col: string, i = 1) => `(cardinality($${i}::text[]) = 0 or ${col} = any($${i}::text[]))`;

/* ── Cupos y venta de una fecha (la ficha del Super Admin) ── */
export type CupoFila = { kind: "tipo" | "mesa" | "dia" | "rsvp"; ref: string | null; nombre: Bi; cantidad: number; vendidos: number; apartados: number; ajuste: { n: number; motivo: string; at: string } | null };
export type CuposFecha = { rsvp: boolean; fecha: string; dia: string; h0: number; empezo: boolean; tz: string; ventaHasta: string; ventaHastaH: string; corte: "start" | "doors" | "day_before"; extendida: string | null;
  extender: ("doors" | "start")[]; filas: CupoFila[] };
export async function cuposFecha(s: Staff, eventoId: string, fechaId: string | null): Promise<CuposFecha | null> {
  if (!ID.test(eventoId) || (fechaId && !ID.test(fechaId))) return null;
  const d = (await db().query<{ id: string; dia: string; h0: number; empezo: boolean; tz: string; hasta: string; hastaH: string; corte: CuposFecha["corte"]; ext: string | null; pm: boolean; im: boolean; entry: string }>(
    `select e.entry, d.id::text, d.local_date::text as dia, (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0,
            d.starts_at <= now() as empezo, ci.timezone as tz, to_char(bol_venta_hasta(e, d) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hasta,
            to_char(bol_venta_hasta(e, d) at time zone ci.timezone, 'FMHH12:MI AM') as "hastaH", e.sales_until as corte,
            to_char(d.sales_extended_until at time zone ci.timezone, 'FMHH12:MI AM') as ext,
            d.doors_at > bol_venta_hasta(e, d) as pm, d.starts_at > bol_venta_hasta(e, d) as im
       from event_dates d join events e on e.id = d.event_id join cities ci on ci.id = d.city_id
      where d.event_id = $1::bigint and ($2::bigint is null or d.id = $2::bigint) and d.status = 'scheduled' and e.entry in ('tickets', 'rsvp') and ${CIU("d.city_id", 3)}
      order by (d.starts_at < now()), d.starts_at limit 1`, [eventoId, fechaId, s.cities])).rows[0];
  if (!d) return null;
  const F = (await db().query<CupoFila & { at: string | null; an: number | null; am: string | null }>(
    `select 'tipo' as kind, t.id::text as ref, t.name as nombre, s.quantity as cantidad, s.sold_n as vendidos, s.held_n as apartados, o.quantity as an, o.reason as am, o.at::text as at, t.sort as k
       from ticket_stock s join ticket_types t on t.id = s.ticket_type_id
       left join lateral (select x.quantity, x.reason, x.at from event_stock_overrides x where x.event_date_id = s.event_date_id and x.kind = 'tipo' and x.ref_id = t.id order by x.id desc limit 1) o on true
      where s.event_date_id = $1::bigint and not t.off
     union all
     select 'mesa', t.id::text, t.zone, s.quantity, s.sold_n, s.held_n, o.quantity, o.reason, o.at::text, 100 + t.sort
       from table_stock s join event_tables t on t.id = s.table_id
       left join lateral (select x.quantity, x.reason, x.at from event_stock_overrides x where x.event_date_id = s.event_date_id and x.kind = 'mesa' and x.ref_id = t.id order by x.id desc limit 1) o on true
      where s.event_date_id = $1::bigint and not t.off
     union all
     select 'dia', null, '{"es":"Aforo del día","en":"Day capacity"}'::jsonb, s.capacity, s.sold_n, s.held_n, o.quantity, o.reason, o.at::text, 200
       from event_day_stock s
       left join lateral (select x.quantity, x.reason, x.at from event_stock_overrides x where x.event_date_id = s.event_date_id and x.kind = 'dia' order by x.id desc limit 1) o on true
      where s.event_date_id = $1::bigint
     order by k`, [d.id])).rows;
  // 9n-3 · Un evento con RSVP: el cupo es el del evento (0 = sin límite); «vendidos» son los lugares que ya se guardaron en ESTA fecha.
  if (d.entry === "rsvp") {
    const r = (await db().query<{ cantidad: number; vendidos: number; an: number | null; am: string | null; at: string | null }>(
      `select e.rsvp_capacity as cantidad, dd.rsvp_n as vendidos, o.quantity as an, o.reason as am, o.at::text as at
         from events e join event_dates dd on dd.id = $2::bigint
         left join lateral (select x.quantity, x.reason, x.at from event_stock_overrides x where x.event_id = e.id and x.kind = 'rsvp' order by x.id desc limit 1) o on true
        where e.id = $1::bigint`, [eventoId, d.id])).rows[0];
    if (r) F.push({ kind: "rsvp", ref: null, nombre: { es: "Cupo del RSVP (lugares)", en: "RSVP capacity (spots)" }, cantidad: r.cantidad, vendidos: r.vendidos, apartados: 0,
      ajuste: r.an != null ? { n: r.an, motivo: r.am ?? "", at: r.at ?? "" } : null, at: null, an: null, am: null });
  }
  // Solo se ofrece extender hacia más tarde que el cierre de ahora (lo calcula la base).
  return { rsvp: d.entry === "rsvp", fecha: d.id, dia: d.dia, h0: d.h0, empezo: d.empezo, tz: d.tz, ventaHasta: d.hasta, ventaHastaH: d.hastaH, corte: d.corte, extendida: d.ext,
    extender: d.entry === "rsvp" ? [] : [...(d.pm ? (["doors"] as const) : []), ...(d.im ? (["start"] as const) : [])],
    filas: F.map((x) => ({ kind: x.kind, ref: x.ref, nombre: x.nombre, cantidad: x.cantidad, vendidos: x.vendidos, apartados: x.apartados, ajuste: x.an != null ? { n: x.an, motivo: x.am ?? "", at: x.at ?? "" } : null })) };
}

type FechaAdm = { fid: string; eid: string; city: string; biz: string; title: Bi; dia: string; h0: number; empezo: boolean; st: string; est: string };
async function fechaAdm(c: Pick<import("pg").PoolClient, "query">, s: Staff, fechaId: string): Promise<FechaAdm | null> {
  if (!ID.test(fechaId)) return null;
  const r = (await c.query<FechaAdm>(
    `select d.id::text as fid, e.id::text as eid, d.city_id as city, e.business_id as biz, e.title, d.local_date::text as dia,
            (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0, d.starts_at <= now() as empezo, d.status as st, e.status as est
       from event_dates d join events e on e.id = d.event_id join cities ci on ci.id = d.city_id where d.id = $1::bigint for update of d`, [fechaId])).rows[0];
  if (!r || (s.cities.length && !s.cities.includes(r.city))) return null;
  return r;
}

/* «Ajustar cupo» de un tipo, una mesa o el aforo del día de una fecha. No baja de lo vendido + apartado (lo dice antes y la base lo vuelve a
   imponer con su check). */
export async function ajustarCupo(s: Staff, fechaId: string, kind: "tipo" | "mesa" | "dia" | "rsvp", ref: string | null, cantidadTxt: string, motivo: string): Promise<R> {
  const m = String(motivo ?? "").trim().slice(0, 500);
  if (m.length < 4) return no("Escribe el motivo: lo ve el organizador.");
  if (!["tipo", "mesa", "dia", "rsvp"].includes(kind) || (kind !== "dia" && kind !== "rsvp" && !ID.test(String(ref ?? "")))) return no("Ese cupo no existe.");
  const n = Number(String(cantidadTxt ?? "").replace(/[,\s]/g, ""));
  if (!Number.isInteger(n) || n < 0 || n > (kind === "rsvp" ? 20000 : 100000)) return no(`Escribe un número entero (de 0 a ${kind === "rsvp" ? "20,000" : "100,000"}).`);
  try {
    const r = await tx(async (c): Promise<R & { aviso?: { biz: string; v: Record<string, string> } }> => {
      const f = await fechaAdm(c, s, fechaId);
      if (!f) return no("Esa fecha no existe en tus ciudades.");
      if (f.st !== "scheduled" || !["live", "paused"].includes(f.est) || f.empezo) return no("Solo una fecha que no ha empezado de un evento publicado.");
      if (kind === "rsvp") {
        // 9n-3 · El cupo de un RSVP es del EVENTO (events.rsvp_capacity; 0 = sin límite). No baja de los lugares que ya se guardaron en ninguna fecha; el trigger
        // events_cupo lo vuelve a imponer y events_cupo_admin hace que el último ajuste de To'Latino mande sobre lo que vuelva a guardar el organizador.
        const ev = (await c.query<{ q: number; usado: number; entry: string }>(
          `select e.rsvp_capacity as q, coalesce((select max(d.rsvp_n) from event_dates d where d.event_id = e.id and d.status = 'scheduled'), 0) as usado, e.entry from events e where e.id = $1::bigint for update`, [f.eid])).rows[0];
        if (!ev || ev.entry !== "rsvp") return no("Ese evento no lleva RSVP.");
        if (n === ev.q) return no("Ya tiene ese cupo.");
        if (n > 0 && n < ev.usado) return no(`No baja de los lugares ya guardados: ${ev.usado}.`);
        await c.query(`insert into event_stock_overrides (event_id, event_date_id, city_id, kind, ref_id, quantity, before_qty, reason, by_user) values ($1::bigint, $2::bigint, $3, 'rsvp', null, $4, $5, $6, $7)`,
          [f.eid, fechaId, f.city, n, ev.q, m, s.id]);
        await c.query(`update events set rsvp_capacity = $2 where id = $1::bigint`, [f.eid, n]);
        const que = `Cupo del RSVP: ${ev.q || "sin límite"} a ${n || "sin límite"}`, queEn = `RSVP capacity: ${ev.q || "no limit"} to ${n || "no limit"}`;
        await c.query(`insert into event_changes (event_id, event_date_id, city_id, kind, before, after, reason_key, note, by_user, by_kind) values ($1::bigint, $2::bigint, $3, 'capacity_adjusted', $4, $5, 'admin', $6, $7, 'admin')`,
          [f.eid, fechaId, f.city, JSON.stringify({ cupo: ev.q }), JSON.stringify({ cupo: n, que: { es: que, en: queEn } }), m, s.id]);
        await auditar(c, { actor: s.id, action: "evento.cupo.ajustar", targetKind: "event", targetId: f.eid, city: f.city, before: { "Cupo del RSVP": ev.q }, after: { "Cupo del RSVP": n, fecha: f.dia }, reason: m });
        return { ok: true, msg: `Cupo ajustado: ${que}. El organizador recibe el aviso.`, aviso: { biz: f.biz, v: { evento: f.title.es, cuando: `${diaCorto(f.dia, true)} · ${hora(f.h0)}`, que, motivo: m } } };
      }
      const T = kind === "tipo" ? { t: "ticket_stock", k: "ticket_type_id", q: "quantity", n: "ticket_types", nc: "name" } : kind === "mesa" ? { t: "table_stock", k: "table_id", q: "quantity", n: "event_tables", nc: "zone" } : { t: "event_day_stock", k: null, q: "capacity", n: null, nc: null };
      const x = (await c.query<{ q: number; usado: number; nombre: Bi | null }>(
        `select s.${T.q} as q, s.sold_n + s.held_n as usado, ${T.n ? `(select y.${T.nc} from ${T.n} y where y.id = s.${T.k})` : "null::jsonb"} as nombre
           from ${T.t} s where s.event_date_id = $1::bigint ${T.k ? `and s.${T.k} = $2::bigint` : "and $2::text is null"} for update`, [fechaId, kind === "dia" ? null : ref])).rows[0];
      if (!x) return no("Ese cupo no existe en esa fecha.");
      if (n === x.q) return no("Ya tiene ese cupo.");
      if (n < x.usado) return no(`No baja de lo vendido y apartado: ${x.usado}.`);
      await c.query(`insert into event_stock_overrides (event_id, event_date_id, city_id, kind, ref_id, quantity, before_qty, reason, by_user) values ($1::bigint, $2::bigint, $3, $4, $5::bigint, $6, $7, $8, $9)`,
        [f.eid, fechaId, f.city, kind, kind === "dia" ? null : ref, n, x.q, m, s.id]);
      // El trigger evt_cupo_admin pone el último ajuste; el check de la tabla rechaza si no alcanza para lo vendido.
      await c.query(`update ${T.t} set ${T.q} = ${T.q}, updated_at = now() where event_date_id = $1::bigint ${T.k ? `and ${T.k} = $2::bigint` : "and $2::text is null"}`, [fechaId, kind === "dia" ? null : ref]);
      const que = `${x.nombre?.es ?? "Aforo del día"}: cupo de ${x.q} a ${n}`, queEn = `${x.nombre?.en || x.nombre?.es || "Day capacity"}: capacity from ${x.q} to ${n}`;
      await c.query(`insert into event_changes (event_id, event_date_id, city_id, kind, before, after, reason_key, note, by_user, by_kind) values ($1::bigint, $2::bigint, $3, 'capacity_adjusted', $4, $5, 'admin', $6, $7, 'admin')`,
        [f.eid, fechaId, f.city, JSON.stringify({ cupo: x.q }), JSON.stringify({ cupo: n, que: { es: que, en: queEn } }), m, s.id]);
      await auditar(c, { actor: s.id, action: "evento.cupo.ajustar", targetKind: "event", targetId: f.eid, city: f.city, before: { [x.nombre?.es ?? "Aforo del día"]: x.q }, after: { [x.nombre?.es ?? "Aforo del día"]: n, fecha: f.dia }, reason: m });
      return { ok: true, msg: `Cupo ajustado: ${que}. El organizador recibe el aviso.`, aviso: { biz: f.biz, v: { evento: f.title.es, cuando: `${diaCorto(f.dia, true)} · ${hora(f.h0)}`, que, motivo: m } } };
    });
    if (r.ok && r.aviso) await avisarNegocio(r.aviso.biz, "evt_ajuste_admin", r.aviso.v, { href: "/panel", ref: ["event_date", fechaId] });
    return r.ok ? { ok: true, msg: r.msg } : r;
  } catch (e) {
    if (/check|_check/.test(String((e as Error).message))) return no("No baja de lo vendido y apartado.");
    throw e;
  }
}

/* «Extender ventas»: la venta en línea de una fecha cierra a las puertas o al empezar (nunca después: en la puerta no se vende). Solo hacia
   más tarde que el corte del organizador. */
export async function extenderVenta(s: Staff, fechaId: string, hasta: "doors" | "start", motivo: string): Promise<R> {
  const m = String(motivo ?? "").trim().slice(0, 500);
  if (m.length < 4) return no("Escribe el motivo: lo ve el organizador.");
  if (hasta !== "doors" && hasta !== "start") return no("Elige hasta cuándo.");
  const r = await tx(async (c): Promise<R & { aviso?: { biz: string; v: Record<string, string> } }> => {
    const f = await fechaAdm(c, s, fechaId);
    if (!f) return no("Esa fecha no existe en tus ciudades.");
    if (f.st !== "scheduled" || !["live", "paused"].includes(f.est) || f.empezo) return no("Solo una fecha que no ha empezado de un evento publicado.");
    const x = (await c.query<{ antes: string; nueva: string; mas: boolean; antesH: string; nuevaH: string }>(
      `select bol_venta_hasta(e, d)::text as antes, (case $2 when 'doors' then d.doors_at else d.starts_at end)::text as nueva,
              (case $2 when 'doors' then d.doors_at else d.starts_at end) > bol_venta_hasta(e, d) as mas,
              to_char(bol_venta_hasta(e, d) at time zone ci.timezone, 'FMDD/FMMM FMHH12:MI AM') as "antesH",
              to_char((case $2 when 'doors' then d.doors_at else d.starts_at end) at time zone ci.timezone, 'FMDD/FMMM FMHH12:MI AM') as "nuevaH"
         from event_dates d join events e on e.id = d.event_id join cities ci on ci.id = d.city_id where d.id = $1::bigint`, [fechaId, hasta])).rows[0]!;
    if (!x.mas) return no("La venta ya cierra a esa hora o más tarde.");
    await c.query(`update event_dates set sales_extended_until = case $2 when 'doors' then doors_at else starts_at end, updated_at = now() where id = $1::bigint`, [fechaId, hasta]);
    const que = `la venta en línea cierra ${hasta === "doors" ? "al abrir las puertas" : "al empezar"} (${x.nuevaH}; antes ${x.antesH})`;
    const queEn = `online sales close ${hasta === "doors" ? "when doors open" : "when it starts"} (${x.nuevaH}; before ${x.antesH})`;
    await c.query(`insert into event_changes (event_id, event_date_id, city_id, kind, before, after, reason_key, note, by_user, by_kind) values ($1::bigint, $2::bigint, $3, 'sales_extended', $4, $5, 'admin', $6, $7, 'admin')`,
      [f.eid, fechaId, f.city, JSON.stringify({ hasta: x.antes }), JSON.stringify({ hasta: x.nueva, que: { es: que, en: queEn } }), m, s.id]);
    await auditar(c, { actor: s.id, action: "evento.venta.extender", targetKind: "event", targetId: f.eid, city: f.city, before: { venta_hasta: x.antesH }, after: { venta_hasta: x.nuevaH, fecha: f.dia }, reason: m });
    return { ok: true, msg: `Venta extendida: ${que}. El organizador recibe el aviso.`, aviso: { biz: f.biz, v: { evento: f.title.es, cuando: `${diaCorto(f.dia, true)} · ${hora(f.h0)}`, que, motivo: m } } };
  });
  if (r.ok && r.aviso) await avisarNegocio(r.aviso.biz, "evt_ajuste_admin", r.aviso.v, { href: "/panel", ref: ["event_date", fechaId] });
  return r.ok ? { ok: true, msg: r.msg } : r;
}

/* ── Alerta viva: evento con sobreventa ── */
export type Sobreventa = { kind: "tipo" | "mesa"; evento: string; titulo: Bi; dia: string; nombre: Bi; cantidad: number; vivos: number; ciudad: string };
export async function sobreventa(s: Staff): Promise<Sobreventa[]> {
  return (await db().query<Sobreventa>(
    `select v.kind, v.event_id::text as evento, e.title as titulo, d.local_date::text as dia,
            coalesce((select t.name from ticket_types t where v.kind = 'tipo' and t.id = v.ref_id), (select t.zone from event_tables t where v.kind = 'mesa' and t.id = v.ref_id)) as nombre,
            v.quantity as cantidad, v.vivos, ci.name as ciudad
       from evt_sobreventa v join events e on e.id = v.event_id join event_dates d on d.id = v.event_date_id join cities ci on ci.id = v.city_id
      where ${CIU("v.city_id")} order by d.starts_at limit 30`, [s.cities])).rows;
}

/* ── Confianza › Fraude: señales de Eventos ── */
export const SENAL_L = SENAL_L_UI;
export type SenalEvt = { kind: string; uid: string; quien: string; ciudad: string | null; n: number; at: string; caso: string | null; abierto: boolean };
export async function senalesEvt(s: Staff): Promise<SenalEvt[]> {
  return (await db().query<SenalEvt>(
    `select x.kind, x.user_id::text as uid, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), ''), 'Vecino') as quien, ci.name as ciudad,
            x.n, to_char(x.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, q.id::text as caso, coalesce(q.status = 'open', false) as abierto
       from evt_senales x join users u on u.id = x.user_id left join cities ci on ci.id = x.city_id
       left join lateral (select qi.id, qi.status from mod_flags f join queue_items qi on qi.id = f.queue_item_id
                           where f.target_kind = 'user' and f.target_id = x.user_id::text and f.rule_key = 'evt' order by f.id desc limit 1) q on true
      where ${CIU("x.city_id")} and u.status <> 'deleted' order by x.at desc limit 60`, [s.cities])).rows;
}
/* «Abrir caso»: Reportes de usuario con la marca de Eventos (la decide una persona con la escalera de sanciones y la apelación). Solo
   abre si la señal sigue viva para esa persona en las ciudades de quien decide. */
export async function abrirCasoEvt(s: Staff, userId: string, kind: string, motivo: string): Promise<R> {
  const m = String(motivo ?? "").trim().slice(0, 400);
  if (m.length < 4) return no("Escribe el motivo.");
  if (!UUID.test(userId) || !SENAL_L[kind]) return no("Esa señal no existe.");
  return tx(async (c): Promise<R> => {
    const x = (await c.query<{ n: number; city: string | null; staff: boolean }>(
      `select x.n, x.city_id as city, exists (select 1 from staff_members m where m.user_id = x.user_id and m.status = 'active') as staff
         from evt_senales x where x.user_id = $1::uuid and x.kind = $2 and ${CIU("x.city_id", 3)} limit 1`, [userId, kind, s.cities])).rows[0];
    if (!x) return no("Esa señal ya no está.");
    if (x.staff) return no("Es del equipo de To’Latino: se revisa desde Sistema › Equipo.");
    const { marcar } = await import("./moderacion");
    const caso = await marcar(c, { kind: "user", id: userId, regla: "evt", autor: userId, ciudad: x.city, detalle: `${SENAL_L[kind]!.t}: ${SENAL_L[kind]!.s(x.n)}. Abierto por el equipo desde Confianza › Fraude: ${m}` });
    if (!caso) return no("Esta cuenta no tiene ciudad: el caso no tiene a qué cola ir.");
    await auditar(c, { actor: s.id, action: "usuario.evt.caso", targetKind: "user", targetId: userId, city: x.city, before: { caso: "sin caso" }, after: { caso: "abierto en Reportes de usuario", senal: SENAL_L[kind]!.t }, reason: m });
    return { ok: true, msg: "Caso abierto en Colas › Reportes de usuario." };
  });
}

/* ── Usuarios 360° › Actividad: boletos, RSVP y entradas de una persona (lo ve el equipo con usr:ver; sin teléfonos de terceros) ── */
export async function actividadEventos(userId: string) {
  if (!UUID.test(userId)) return null;
  const [K, T, V, X] = await Promise.all([
    db().query<{ pedidos: number; citas: number; reservas: number; boletos: number; rsvp: number; privados: number }>(
      `select count(*) filter (where o.kind in ('order', 'market_order'))::int as pedidos, count(*) filter (where o.kind = 'appointment')::int as citas,
              count(*) filter (where o.kind in ('table', 'night'))::int as reservas, count(*) filter (where o.kind = 'private_event')::int as privados,
              (select count(*)::int from tickets t where t.holder_user_id = $1::uuid) as boletos, (select count(*)::int from rsvps r where r.user_id = $1::uuid) as rsvp
         from operations o where o.user_id = $1::uuid and o.kind in ('order', 'market_order', 'appointment', 'table', 'night', 'private_event') and coalesce(o.sent_at, o.confirmed_at) > now() - interval '90 days'`, [userId]),
    db().query<{ code: string; st: string; kind: string; evento: Bi; eid: string; dia: string; tipo: Bi | null; precio: number; num: string | null; entro: string | null; de: string | null; a: string | null; tz: string }>(
      `select t.code, t.status as st, t.kind, e.title as evento, e.id::text as eid, d.local_date::text as dia, coalesce(tt.name, et.zone) as tipo, t.price_cents - t.discount_cents as precio, o.number as num,
              to_char(en.first_at at time zone ci.timezone, 'FMHH12:MI AM') || coalesce(' · ' || en.first_door, '') as entro,
              (select 'recibido' from ticket_transfers z where z.new_ticket_id = t.id and z.status = 'claimed' limit 1) as de,
              (select case z.status when 'pending' then 'transfiriendo' else 'transferido' end from ticket_transfers z where z.ticket_id = t.id and z.status in ('pending', 'claimed') order by z.id desc limit 1) as a, ci.timezone as tz
         from tickets t join events e on e.id = t.event_id join event_dates d on d.id = t.event_date_id join cities ci on ci.id = t.city_id
         left join operations o on o.id = t.operation_id left join ticket_types tt on tt.id = t.ticket_type_id left join event_tables et on et.id = t.table_id
         left join ticket_entries en on en.ticket_id = t.id and en.event_date_id = t.event_date_id
        where t.holder_user_id = $1::uuid or (t.status = 'replaced' and exists (select 1 from ticket_transfers z where z.ticket_id = t.id and z.from_user_id = $1::uuid))
        order by t.id desc limit 20`, [userId]),
    db().query<{ evento: Bi; eid: string; dia: string; party: number; st: string; llegaron: number }>(
      `select e.title as evento, e.id::text as eid, d.local_date::text as dia, r.party, r.status as st, coalesce(r.arrived_n, 0) as llegaron
         from rsvps r join events e on e.id = r.event_id join event_dates d on d.id = r.event_date_id where r.user_id = $1::uuid order by r.id desc limit 12`, [userId]),
    db().query<{ devuelto: number; ordenes: number }>(
      `select coalesce(sum(l.amount_cents), 0)::int as devuelto, count(distinct l.operation_id)::int as ordenes from ticket_refund_lines l join operations o on o.id = l.operation_id where o.user_id = $1::uuid`, [userId]),
  ]);
  return { kpi: K.rows[0]!, boletos: T.rows, rsvp: V.rows, devuelto: X.rows[0]! };
}
export type Actividad360 = NonNullable<Awaited<ReturnType<typeof actividadEventos>>>;

/* ── Negocios 360° › Eventos: liquidaciones y cancelaciones del organizador ── */
export async function eventos360(negocio: string) {
  const [L, C] = await Promise.all([
    db().query<{ st: string; n: number; neto: number }>(
      `select s.status as st, count(*)::int as n, coalesce(sum(coalesce(s.net_cents, (evt_liq_calc(s.event_date_id)).base)), 0)::int as neto from event_settlements s where s.business_id = $1 group by 1`, [negocio]),
    db().query<{ evento: Bi; scope: string; reason: string; by: string; ordenes: number; devuelto: number; at: string }>(
      `select e.title as evento, x.scope, x.reason_key as reason, x.by_kind as by, x.orders_n as ordenes, x.refunded_cents as devuelto, to_char(x.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
         from event_cancellations x join events e on e.id = x.event_id where x.business_id = $1 order by x.created_at desc limit 10`, [negocio]),
  ]);
  return { liq: L.rows, cx: C.rows };
}
export type Eventos360 = Awaited<ReturnType<typeof eventos360>>;

/* ── Catálogo de formatos y géneros ── */
export type FormatoCat = { key: string; label: Bi; sub: Bi; icon: string; dark: boolean; on: boolean; eventos: number; cats: { id: string; on: boolean }[] };
export type GeneroCat = { key: string; label: Bi; on: boolean; sort: number; eventos: number };
export async function catalogoEvt() {
  const [F, G, C, K] = await Promise.all([
    db().query<{ key: string; label: Bi; sub: Bi; icon: string; dark: boolean; on: boolean; eventos: number }>(
      `select f.key, f.label, f.sub, f.icon, f.dark, f.enabled as on, (select count(*)::int from events e where e.format = f.key) as eventos from event_formats f order by f.sort`),
    db().query<GeneroCat>(`select g.key, g.label, g.enabled as on, g.sort, (select count(*)::int from events e where g.key = any(e.genres)) as eventos from event_genres g order by g.sort, g.key`),
    db().query<{ cat: string; format: string; on: boolean }>(`select category_id as cat, format, enabled as on from event_format_categories order by category_id, sort`),
    db().query<{ id: string; name: string }>(`select id, coalesce(name->>'es', id) as name from categories where id like 'NEG-%' order by sort, id`).catch(() => ({ rows: [] as { id: string; name: string }[] })),
  ]);
  return { formatos: F.rows.map((f) => ({ ...f, cats: C.rows.filter((c) => c.format === f.key).map((c) => ({ id: c.cat, on: c.on })) })) as FormatoCat[], generos: G.rows, categorias: K.rows };
}
export type CatalogoEvt = Awaited<ReturnType<typeof catalogoEvt>>;

const limpio = (t: unknown, max: number) => (typeof t === "string" ? t.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");
const TEL = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
export async function formatoGuardar(s: Staff, key: string, p: { es: string; en: string; subEs: string; subEn: string; on: boolean }, motivo: string): Promise<R> {
  const m = limpio(motivo, 500);
  if (m.length < 4) return no("Escribe el motivo.");
  if (!FMT.test(key)) return no("Ese formato no existe.");
  const L = { es: limpio(p.es, 40), en: limpio(p.en, 40) }, S = { es: limpio(p.subEs, 160), en: limpio(p.subEn, 160) };
  if (L.es.length < 3 || L.en.length < 3) return no("El nombre va de 3 a 40 letras, en español y en inglés.");
  if (S.es.length < 10 || S.en.length < 10) return no("La descripción va de 10 a 160 letras, en español y en inglés.");
  if ([L.es, L.en, S.es, S.en].some((x) => TEL.test(x))) return no("Sin teléfonos en el catálogo.");
  return tx(async (c): Promise<R> => {
    const a = (await c.query<{ label: Bi; sub: Bi; on: boolean }>(`select label, sub, enabled as on from event_formats where key = $1 for update`, [key])).rows[0];
    if (!a) return no("Ese formato no existe.");
    if (!p.on && a.on && (await c.query(`select 1 from event_formats where enabled and key <> $1`, [key])).rowCount === 0) return no("Tiene que quedar al menos un formato encendido.");
    if (JSON.stringify(a.label) === JSON.stringify(L) && JSON.stringify(a.sub) === JSON.stringify(S) && a.on === !!p.on) return no("No cambiaste nada.");
    await c.query(`update event_formats set label = $2, sub = $3, enabled = $4 where key = $1`, [key, JSON.stringify(L), JSON.stringify(S), !!p.on]);
    await auditar(c, { actor: s.id, action: "evento.catalogo.formato", targetKind: "event_format", targetId: key, before: { nombre: a.label.es, encendido: a.on ? "sí" : "no" }, after: { nombre: L.es, encendido: p.on ? "sí" : "no" }, reason: m });
    return { ok: true, msg: p.on ? "Guardado. Los negocios lo ven así al crear un evento." : "Apagado: ya no se ofrece al crear; los eventos que ya existen siguen igual." };
  });
}
export async function formatoCategoria(s: Staff, key: string, cat: string, on: boolean, motivo: string): Promise<R> {
  const m = limpio(motivo, 500);
  if (m.length < 4) return no("Escribe el motivo.");
  if (!FMT.test(key) || !CAT.test(cat)) return no("Esa categoría o ese formato no existen.");
  return tx(async (c): Promise<R> => {
    if (!(await c.query(`select 1 from event_formats where key = $1`, [key])).rowCount || !(await c.query(`select 1 from categories where id = $1`, [cat])).rowCount) return no("Esa categoría o ese formato no existen.");
    const a = (await c.query<{ on: boolean }>(`select enabled as on from event_format_categories where category_id = $1 and format = $2 for update`, [cat, key])).rows[0];
    if (a && a.on === on) return no(on ? "Esa categoría ya lo publica." : "Esa categoría ya no lo publica.");
    if (!a && !on) return no("Esa categoría ya no lo publica.");
    if (!on && (await c.query(`select 1 from event_format_categories where category_id = $1 and enabled and format <> $2`, [cat, key])).rowCount === 0) return no("Cada categoría publica al menos un formato.");
    if (a) await c.query(`update event_format_categories set enabled = $3 where category_id = $1 and format = $2`, [cat, key, on]);
    else await c.query(`insert into event_format_categories (category_id, format, sort, enabled) values ($1, $2, (select coalesce(max(sort), 0) + 1 from event_format_categories where category_id = $1), true)`, [cat, key]);
    await auditar(c, { actor: s.id, action: "evento.catalogo.categoria", targetKind: "event_format", targetId: key, before: { [cat]: a?.on ? "publica" : "no publica" }, after: { [cat]: on ? "publica" : "no publica" }, reason: m });
    return { ok: true, msg: on ? "Listo: esa categoría ya lo puede publicar." : "Listo: esa categoría ya no lo ofrece al crear (lo que ya existe sigue)." };
  });
}
export async function generoGuardar(s: Staff, key: string | null, p: { es: string; en: string; on: boolean; mover?: -1 | 0 | 1 }, motivo: string): Promise<R> {
  const m = limpio(motivo, 500);
  if (m.length < 4) return no("Escribe el motivo.");
  const L = { es: limpio(p.es, 30), en: limpio(p.en, 30) };
  if (L.es.length < 2 || L.en.length < 2) return no("El nombre va de 2 a 30 letras, en español y en inglés.");
  if (TEL.test(L.es) || TEL.test(L.en)) return no("Sin teléfonos en el catálogo.");
  return tx(async (c): Promise<R> => {
    if (!key) {
      const k = L.es.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24);
      if (!GEN.test(k)) return no("Ese nombre no sirve como género.");
      if ((await c.query(`select 1 from event_genres where key = $1 or lower(label->>'es') = lower($2)`, [k, L.es])).rowCount) return no("Ese género ya existe.");
      await c.query(`insert into event_genres (key, label, sort, enabled) values ($1, $2, (select coalesce(max(sort), 0) + 1 from event_genres), true)`, [k, JSON.stringify(L)]);
      await auditar(c, { actor: s.id, action: "evento.catalogo.genero_nuevo", targetKind: "event_genre", targetId: k, after: { nombre: L.es }, reason: m });
      return { ok: true, msg: "Género agregado: ya sale en el editor y en los filtros de Eventos." };
    }
    if (!GEN.test(key)) return no("Ese género no existe.");
    const a = (await c.query<{ label: Bi; on: boolean; sort: number }>(`select label, enabled as on, sort from event_genres where key = $1 for update`, [key])).rows[0];
    if (!a) return no("Ese género no existe.");
    if (p.mover) {
      const o = (await c.query<{ key: string; sort: number }>(`select key, sort from event_genres where ${p.mover < 0 ? "sort < $1 order by sort desc" : "sort > $1 order by sort"} limit 1 for update`, [a.sort])).rows[0];
      if (!o) return no(p.mover < 0 ? "Ya es el primero." : "Ya es el último.");
      await c.query(`update event_genres set sort = case key when $1 then $2::smallint when $3 then $4::smallint end where key in ($1, $3)`, [key, o.sort, o.key, a.sort]);
      await auditar(c, { actor: s.id, action: "evento.catalogo.genero_orden", targetKind: "event_genre", targetId: key, before: { orden: a.sort }, after: { orden: o.sort }, reason: m });
      return { ok: true, msg: "Orden guardado." };
    }
    if (JSON.stringify(a.label) === JSON.stringify(L) && a.on === !!p.on) return no("No cambiaste nada.");
    await c.query(`update event_genres set label = $2, enabled = $3 where key = $1`, [key, JSON.stringify(L), !!p.on]);
    await auditar(c, { actor: s.id, action: "evento.catalogo.genero", targetKind: "event_genre", targetId: key, before: { nombre: a.label.es, encendido: a.on ? "sí" : "no" }, after: { nombre: L.es, encendido: p.on ? "sí" : "no" }, reason: m });
    return { ok: true, msg: p.on ? "Guardado." : "Apagado: ya no se ofrece; los eventos que lo tienen lo siguen mostrando." };
  });
}

export const dinero = usd;
