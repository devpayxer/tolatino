import "server-only";
import type { PoolClient } from "pg";
import { anotarDevolucionTotal, ejecutarDevolucion } from "./boletos-despues";
import { cfgSql, valores } from "./config";
import { db, tx } from "./db";
import { bi, diaCorto, dinero, hora, type Bi } from "./evt-comun";

/* 6e · Cambios del evento (fase6-eventos.md §3 «Devoluciones», §4 6e, §6 #7, #21, #24). El servidor decide TODO:
   - Pausar / reanudar la venta (el organizador o To'Latino; congelada por To'Latino, el organizador no la reabre). «Los que compraron
     entran igual»: pausar no toca boletos.
   - Mover la fecha o la hora (una fecha que no empezó): event_changes guarda antes → después; avisa por SMS (crítico) a quien tiene
     boletos y a quien va con RSVP; quien compró antes del cambio elige hasta el nuevo inicio «Me quedo» o «Devolución total» (100 %, la
     comisión no se cobra); sin respuesta, se queda (§6 #21).
   - Cancelar una fecha o todo el evento (el organizador o To'Latino) con su motivo: la fecha deja de venderse y de salir, lo apartado se
     suelta, la lista de espera se cierra, las cortesías se anulan y CADA orden se devuelve al 100 % (boletos, mesa y extras; la comisión
     no se cobra y el costo de la tarjeta lo absorbe To'Latino, §6 #24) en lote: idempotente por orden (`evtcx-<cancelación>-<orden>`) y por
     boleto (la base), reanudable (el barrido sigue donde quedó si algo se corta), con la devolución en dos pasos de 6d (la pasarela que
     falla queda pendiente y el barrido la reintenta con la MISMA llave). Avisa una vez a cada persona (SMS crítico). Dos cancelaciones del
     mismo organizador en 90 días (Configuración) → caso en Colas «Organizadores que cancelan».
   - AVISOS A LOS QUE VAN: hasta evt_aviso_max por fecha (la base los cuenta), push y en la app; nunca SMS (§6 #7).
   Quien llama ya pasó el acceso (panel: parte «evt» de SU negocio; admin: permiso y ciudades); aquí se vuelve a filtrar por el dueño del
   evento en cada consulta (IDOR): un evento de otro negocio «no existe». */
type Q = Pick<PoolClient, "query">;
export type Quien = { tipo: "business"; negocio: string; userId: string } | { tipo: "admin"; userId: string; cities: string[] };
type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi };
class NoC extends Error { constructor(public msg: Bi) { super(msg.es); } }
const no = (es: string, en: string) => new NoC({ es, en });
const falla = (es: string, en: string): { ok: false; msg: Bi } => ({ ok: false, msg: { es, en } });
const atrapa = <T>(e: unknown): Res<T> => { if (e instanceof NoC) return { ok: false, msg: e.msg }; throw e; };
const ID = /^\d{1,18}$/, NUM_B = /^B-\d{1,10}$/, DIA = /^\d{4}-\d{2}-\d{2}$/;
export type MotivoCx = "clima" | "artista" | "local" | "planes";
export const MOTIVOS_CX: Record<MotivoCx | "admin", Bi> = {
  clima: { es: "Mal tiempo", en: "Bad weather" }, artista: { es: "El artista no puede venir", en: "The artist cannot come" },
  local: { es: "Problema en el local", en: "Problem at the venue" }, planes: { es: "Cambio de planes", en: "Change of plans" }, admin: { es: "Decisión de To'Latino", en: "To'Latino's decision" },
};
/* El dueño del evento en SQL: el negocio (panel) o las ciudades del equipo (admin). $1 = el evento; $2 = negocio o ciudades. */
const DUENO = (q: Quien) => (q.tipo === "business" ? "e.business_id = $2" : "(cardinality($2::text[]) = 0 or e.city_id = any($2::text[]))");
const arg = (q: Quien) => (q.tipo === "business" ? q.negocio : q.cities);
const byKind = (q: Quien) => (q.tipo === "business" ? "business" : "admin");
const limpiar = (x: unknown, n: number) => String(x ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
async function base() { return (await import("./correo")).BASE_URL(); }

/* ── Pausar / reanudar la venta ── */
export async function pausarVenta(q: Quien, eventoId: string, pausar: boolean): Promise<Res> {
  if (!ID.test(String(eventoId))) return falla("Ese evento no existe.", "That event does not exist.");
  try {
    await tx(async (c) => {
      const e = (await c.query<{ id: string; st: string; city: string; frozen: string | null }>(
        `select e.id::text, e.status as st, e.city_id as city, e.sales_frozen_reason as frozen from events e where e.id = $1::bigint and ${DUENO(q)} for update`, [eventoId, arg(q)])).rows[0];
      if (!e) throw no("Ese evento no existe.", "That event does not exist.");
      if (!["live", "paused"].includes(e.st)) throw no("Solo se pausa un evento publicado.", "Only a live event can be paused.");
      if (pausar === (e.st === "paused")) return;
      if (!pausar && e.frozen) throw no(`To'Latino congeló la venta: ${e.frozen}. Escríbenos desde tu panel › Más › Ayuda y Soporte.`, `To'Latino froze sales: ${e.frozen}. Write to us from your dashboard › More › Help and Support.`);
      // Reanudar solo vuelve a vender un evento que ya estaba publicado y aprobado (pausado); nunca publica algo sin revisión.
      if (pausar) await c.query(`update events set status = 'paused' where id = $1::bigint and status = 'live'`, [eventoId]);
      else await c.query(`update events set status = 'live' where id = $1::bigint and status = 'paused' and approved_at is not null`, [eventoId]);
      await c.query(`insert into event_changes (event_id, city_id, kind, before, after, by_user, by_kind) values ($1::bigint, $2, $3, $4::jsonb, $5::jsonb, $6, $7)`,
        [eventoId, e.city, pausar ? "paused" : "resumed", JSON.stringify({ venta: e.st }), JSON.stringify({ venta: pausar ? "paused" : "live" }), q.userId, byKind(q)]);
    });
    if (!pausar) { const F = (await db().query<{ id: string }>(`select id::text from event_dates where event_id = $1::bigint and status = 'scheduled' and ends_at > now()`, [eventoId])).rows; for (const f of F) await (await import("./espera")).ofrecer(f.id).catch(() => 0); }
    return { ok: true };
  } catch (e) { return atrapa(e); }
}

/* To'Latino congela (o descongela) la venta: el evento queda pausado y el organizador no la reabre; el negocio recibe el motivo. */
export async function congelarVenta(q: Extract<Quien, { tipo: "admin" }>, eventoId: string, congelar: boolean, motivo: string): Promise<Res> {
  if (!ID.test(String(eventoId))) return falla("Ese evento no existe.", "That event does not exist.");
  const m = limpiar(motivo, 300);
  if (m.length < 4) return falla("Escribe el motivo.", "Write the reason.");
  let aviso: { biz: string; t: Bi } | null = null;
  try {
    await tx(async (c) => {
      const e = (await c.query<{ st: string; city: string; frozen: boolean; biz: string; t: Bi }>(
        `select e.status as st, e.city_id as city, e.sales_frozen_at is not null as frozen, e.business_id as biz, e.title as t from events e where e.id = $1::bigint and ${DUENO(q)} for update`, [eventoId, arg(q)])).rows[0];
      if (!e) throw no("Ese evento no existe.", "That event does not exist.");
      if (!["live", "paused"].includes(e.st)) throw no("Solo se congela un evento publicado.", "Only a live event can be frozen.");
      if (congelar === e.frozen) return;
      if (congelar) await c.query(`update events set sales_frozen_at = now(), sales_frozen_by = $2, sales_frozen_reason = $3, status = 'paused' where id = $1::bigint`, [eventoId, q.userId, m]);
      else await c.query(`update events set sales_frozen_at = null, sales_frozen_by = null, sales_frozen_reason = null, status = 'live' where id = $1::bigint and status = 'paused' and approved_at is not null`, [eventoId]);
      await c.query(`insert into event_changes (event_id, city_id, kind, reason_key, note, by_user, by_kind) values ($1::bigint, $2, $3, 'admin', $4, $5, 'admin')`, [eventoId, e.city, congelar ? "frozen" : "unfrozen", m, q.userId]);
      if (congelar) aviso = { biz: e.biz, t: e.t };
    });
    if (aviso) { const a = aviso as { biz: string; t: Bi }; await (await import("./avisos")).avisarNegocio(a.biz, "evt_venta_congelada", { evento: a.t.es, motivo: m }, { href: `/panel/${a.biz}/eventos?det=evt:${eventoId}`, ref: ["event", eventoId] }); }
    return { ok: true };
  } catch (e) { return atrapa(e); }
}

/* ── Cambiar la fecha o la hora (una fecha que no empezó) ── */
export async function moverFecha(q: Quien, fechaId: string, x: { dia: unknown; h0: unknown; h1: unknown }): Promise<Res<{ cambio: string; avisados: number }>> {
  if (!ID.test(String(fechaId))) return falla("Esa fecha no existe.", "That date does not exist.");
  const dia = String(x?.dia ?? ""), h0 = Math.floor(Number(x?.h0)), h1 = Math.floor(Number(x?.h1));
  if (!DIA.test(dia) || !Number.isFinite(h0) || !Number.isFinite(h1) || h0 < 0 || h0 > 1439 || h1 <= h0 || h1 > h0 + 720) return falla("Revisa el día y las horas (termina después de empezar, hasta 12 h).", "Check the day and times (it ends after it starts, up to 12 h).");
  let r: { cambio: string; eid: string; kind: string; title: Bi; antes: string; ahora: string } | null = null;
  try {
    r = await tx(async (c) => {
      const d = (await c.query<{ eid: string; st: string; dst: string; empezo: boolean; pend: string | null; kind: string; dmin: number; tz: string; city: string; ldate: string; s0: number; s1: number; title: Bi; idx: number }>(
        `select e.id::text as eid, e.status as st, d.status as dst, d.starts_at <= now() as empezo, e.pending_status as pend, e.kind, e.doors_before_min as dmin, ci.timezone as tz, d.city_id as city,
                d.local_date::text as ldate, (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as s0,
                (extract(epoch from d.ends_at - d.starts_at) / 60)::int + (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as s1,
                e.title, d.day_index as idx
           from event_dates d join events e on e.id = d.event_id join cities ci on ci.id = d.city_id where d.id = $1::bigint and ${DUENO(q)} for update of d, e`, [fechaId, arg(q)])).rows[0];
      if (!d) throw no("Esa fecha no existe.", "That date does not exist.");
      if (!["live", "paused"].includes(d.st) || d.dst !== "scheduled") throw no("Solo se cambia una fecha publicada y en pie.", "Only a live date that is still on can change.");
      if (d.empezo) throw no("Esta fecha ya empezó: no se mueve.", "This date already started: it cannot move.");
      if (d.pend === "review") throw no("Tienes un cambio en revisión. Espera la respuesta de To'Latino y luego cambia la fecha.", "You have a change under review. Wait for To'Latino's answer, then change the date.");
      // 6f · Una fecha de una serie se mueve sola («esta fecha»: las demás siguen la regla); un día de un evento de varios días, no.
      if (d.kind === "span") throw no("Un día de un evento de varios días no se mueve solo. Cancela el evento con devolución y crea otro.", "A day of a multi-day event cannot move on its own. Cancel the event with refunds and create another.");
      if (dia === d.ldate && h0 === d.s0 && h1 === d.s1) throw no("No cambió nada.", "Nothing changed.");
      const t = (await c.query<{ s: string; f: string; p: string; futuro: boolean; dentro: boolean }>(
        `select ($1::date + make_interval(mins => $2))::timestamp at time zone $5 as s, ($1::date + make_interval(mins => $3))::timestamp at time zone $5 as f,
                (($1::date + make_interval(mins => $2))::timestamp at time zone $5) - make_interval(mins => $4) as p,
                ($1::date + make_interval(mins => $2))::timestamp at time zone $5 > now() + interval '1 hour' as futuro,
                $1::date <= (now() at time zone $5)::date + ${cfgSql("evt_dias_adelante")} as dentro`, [dia, h0, h1, d.dmin, d.tz])).rows[0]!;
      if (!t.futuro) throw no("La nueva fecha tiene que ser al menos en una hora.", "The new date has to be at least an hour from now.");
      if (!t.dentro) throw no("Esa fecha está demasiado lejos.", "That date is too far ahead.");
      await c.query(`update event_dates set starts_at = $2, ends_at = $3, doors_at = $4, local_date = $5::date, moved_at = case when $6 then now() else moved_at end where id = $1::bigint`, [fechaId, t.s, t.f, t.p, dia, d.kind === "series"]);
      if (d.kind === "single" && d.idx === 0) await c.query(`update events set start_date = $2::date, start_min = $3, end_min = $4 where id = $1::bigint`, [d.eid, dia, h0, h1]);
      // El RSVP guarda el lugar hasta las puertas nuevas; el recordatorio del día antes vuelve a salir para la fecha nueva.
      await (await import("./rsvp")).moverRsvps(c, fechaId, t.p);
      const kind = dia === d.ldate ? "time_changed" : "moved";
      const ch = (await c.query<{ id: string }>(`insert into event_changes (event_id, event_date_id, city_id, kind, before, after, by_user, by_kind) values ($1::bigint, $2::bigint, $3, $4, $5::jsonb, $6::jsonb, $7, $8) returning id::text`,
        [d.eid, fechaId, d.city, kind, JSON.stringify({ dia: d.ldate, h0: d.s0, h1: d.s1 }), JSON.stringify({ dia, h0, h1 }), q.userId, byKind(q)])).rows[0]!.id;
      return { cambio: ch, eid: d.eid, kind, title: d.title, antes: `${diaCorto(d.ldate, true)} · ${hora(d.s0)}`, ahora: `${diaCorto(dia, true)} · ${hora(h0)}` };
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return falla("Ya hay una fecha de este evento a esa hora.", "This event already has a date at that time.");
    return atrapa(e);
  }
  const avisados = await avisarCambio(r!.cambio);
  return { ok: true, cambio: r!.cambio, avisados };
}

/* Quién va a una fecha: los que tienen boletos vivos (pagados, recibidos o cortesía) y los que van con RSVP. */
async function quienesVan(q: Q, fechas: string[]): Promise<{ id: string; num: string | null }[]> {
  return (await q.query<{ id: string; num: string | null }>(
    `select u::text as id, max(num) as num from (
       select t.holder_user_id as u, case when o.user_id = t.holder_user_id and o.pay_mode = 'app' then o.number end as num
         from tickets t join operations o on o.id = t.operation_id where t.event_date_id = any($1::bigint[]) and t.status in ('valid', 'used') and t.holder_user_id is not null
       union all select r.user_id, null from rsvps r where r.event_date_id = any($1::bigint[]) and r.status = 'going') x
      group by u`, [fechas])).rows;
}
/* Los avisos de un cambio de fecha u hora (SMS crítico), una vez por persona y cambio (si se corta, el barrido manda lo que falte). */
async function avisarCambio(cambio: string): Promise<number> {
  const ch = (await db().query<{ fid: string; kind: string; t: Bi; slug: string; antes: { dia: string; h0: number }; ahora: { dia: string; h0: number } }>(
    `select x.event_date_id::text as fid, x.kind, e.title as t, e.slug, x.before as antes, x.after as ahora from event_changes x join events e on e.id = x.event_id where x.id = $1::bigint and x.kind in ('moved', 'time_changed')`, [cambio])).rows[0];
  if (!ch) return 0;
  const L = await quienesVan(db(), [ch.fid]), ya = await yaAvisados(ch.kind === "moved" ? "evt_movido" : "evt_hora_cambio", "evt_cambio", cambio);
  const { avisar } = await import("./avisos"), b = await base();
  let n = 0;
  for (const u of L) {
    if (ya.has(u.id)) continue;
    const href = u.num ? `/eventos/orden/${u.num}` : `/eventos/${ch.slug}?fecha=${ch.fid}`;
    await avisar(u.id, ch.kind === "moved" ? "evt_movido" : "evt_hora_cambio", { evento: ch.t.es, cuando: `${diaCorto(ch.ahora.dia, true)} · ${hora(ch.ahora.h0)}`, antes: `${diaCorto(ch.antes.dia, true)} · ${hora(ch.antes.h0)}`, enlace: `${b}${href}` },
      { href, ref: ["evt_cambio", cambio] });
    n++;
  }
  return n + ya.size;
}
async function yaAvisados(tpl: string, refKind: string, refId: string): Promise<Set<string>> {
  return new Set((await db().query<{ u: string }>(`select user_id::text as u from notifications where tpl = $1 and ref_kind = $2 and ref_id = $3`, [tpl, refKind, refId])).rows.map((x) => x.u));
}

/* ── «Me quedo con la nueva fecha» / «Devolución total» (quien pagó la orden, hasta el nuevo inicio; sin respuesta = se queda) ── */
export async function elegirCambio(userId: string, numero: string, eleccion: "keep" | "refund"): Promise<Res<{ monto: number; ya?: true }>> {
  if (!NUM_B.test(String(numero)) || !["keep", "refund"].includes(eleccion)) return falla("Esa orden no existe.", "That order does not exist.");
  let hecho: { rf: string | null; total: number; fid: string; title: Bi; biz: string; holders: string[] } | null = null;
  try {
    hecho = await tx(async (c) => {
      const o = (await c.query<{ id: string; fid: string; city: string; biz: string; title: Bi; ch: string | null; abierto: boolean }>(
        `select o.id::text, d.id::text as fid, o.city_id as city, o.business_id as biz, e.title,
                (select x.id::text from event_changes x where x.event_date_id = d.id and x.kind in ('moved', 'time_changed') and x.at > o.sent_at order by x.at desc, x.id desc limit 1) as ch,
                e.status in ('live', 'paused') and d.status = 'scheduled' and d.starts_at > now() as abierto
           from operations o join event_dates d on d.id = (o.details->>'event_date_id')::bigint join events e on e.id = d.event_id
          where o.number = $1 and o.kind = 'tickets' and o.user_id = $2 and o.pay_mode = 'app' and o.status = 'confirmed' for update of o`, [numero, userId])).rows[0];
      if (!o || !o.ch) throw no("Esta orden no tiene un cambio de fecha que elegir.", "This order has no date change to choose on.");
      const ya = (await c.query<{ choice: string; amt: number | null }>(`select x.choice, r.amount_cents as amt from ticket_choices x left join refunds r on r.id = x.refund_id where x.operation_id = $1::bigint and x.change_id = $2::bigint`, [o.id, o.ch])).rows[0];
      if (ya) { if (ya.choice !== eleccion) throw no("Ya elegiste para este cambio.", "You already chose for this change."); return { rf: null, total: ya.amt ?? 0, fid: o.fid, title: o.title, biz: o.biz, holders: [] }; }
      if (!o.abierto) throw no("La fecha nueva ya empezó: tus boletos valen para esa fecha.", "The new date already started: your tickets are for that date.");
      if (eleccion === "keep") {
        await c.query(`insert into ticket_choices (operation_id, change_id, user_id, city_id, choice) values ($1::bigint, $2::bigint, $3, $4, 'keep')`, [o.id, o.ch, userId, o.city]);
        return { rf: null, total: 0, fid: o.fid, title: o.title, biz: o.biz, holders: [] };
      }
      const r = await anotarDevolucionTotal(c, { op: o.id, por: "event_moved", actor: userId, byKind: "user", idem: `evtmv-${o.ch}-${o.id}`, motivo: "Cambió de fecha: devolución total", usados: false });
      if (!r.rf && !r.ya) throw no("Ya no hay boletos que devolver en esta orden.", "There are no tickets left to refund in this order.");
      await c.query(`insert into ticket_choices (operation_id, change_id, user_id, city_id, choice, refund_id) values ($1::bigint, $2::bigint, $3, $4, 'refund', $5::bigint)`, [o.id, o.ch, userId, o.city, r.rf]);
      return { rf: r.rf, total: r.total, fid: o.fid, title: o.title, biz: o.biz, holders: r.holders.filter((h) => h !== userId) };
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return { ok: true, monto: 0, ya: true };
    if (e instanceof Error && /devolucion_de_mas|devolucion_sin_cobro/.test(e.message)) return falla("Esta orden ya no tiene tanto por devolver.", "This order no longer has that much to refund.");
    return atrapa(e);
  }
  if (!hecho.rf) return { ok: true, monto: hecho.total };
  await ejecutarDevolucion(hecho.rf);
  const { avisar, avisarNegocio } = await import("./avisos");
  await avisar(userId, "evt_devolucion_total", { evento: hecho.title.es, monto: dinero(hecho.total) }, { href: `/eventos/orden/${numero}`, ref: ["tickets", numero] });
  for (const h of hecho.holders) await avisar(h, "bol_anulado", { codigo: "", evento: hecho.title.es, motivo: "Quien lo pagó pidió la devolución por el cambio de fecha" }, { href: "/cuenta/boletos", ref: ["tickets", numero] });
  await avisarNegocio(hecho.biz, "evt_devolucion", { evento: hecho.title.es, cuantos: "boletos", num: numero }, { href: `/panel/${hecho.biz}/eventos`, ref: ["tickets", numero] });
  await (await import("./espera")).ofrecer(hecho.fid).catch(() => 0);
  return { ok: true, monto: hecho.total };
}

/* ── Cancelar una fecha o todo el evento ── */
export async function cancelarEvento(q: Quien, eventoId: string, alcance: "date" | "event", fechaId: string | null, motivo: MotivoCx | "admin", nota: string): Promise<Res<{ cx: string; devueltas: number; pendientes: number }>> {
  if (!ID.test(String(eventoId)) || (fechaId !== null && !ID.test(String(fechaId)))) return falla("Ese evento no existe.", "That event does not exist.");
  if (!(motivo in MOTIVOS_CX) || (motivo === "admin") !== (q.tipo === "admin")) return falla("Elige el motivo.", "Pick the reason.");
  const n = limpiar(nota, 500);
  if (q.tipo === "admin" && n.length < 4) return falla("Escribe el motivo.", "Write the reason.");
  let cx: string;
  try {
    cx = await tx(async (c) => {
      const e = (await c.query<{ id: string; st: string; city: string; biz: string; kind: string }>(
        `select e.id::text, e.status as st, e.city_id as city, e.business_id as biz, e.kind from events e where e.id = $1::bigint and ${DUENO(q)} for update`, [eventoId, arg(q)])).rows[0];
      if (!e) throw no("Ese evento no existe.", "That event does not exist.");
      if (!["live", "paused"].includes(e.st)) throw no("Solo se cancela un evento publicado.", "Only a live event can be cancelled.");
      // 6f · Un evento de varios días se cancela entero (un pase vale todos los días: no se cancela un día suelto).
      if (e.kind === "span" && alcance === "date") throw no("Un evento de varios días se cancela entero.", "A multi-day event is cancelled as a whole.");
      const F = (await c.query<{ id: string }>(`select id::text from event_dates where event_id = $1::bigint and status = 'scheduled' and ends_at > now() order by starts_at for update`, [eventoId])).rows.map((x) => x.id);
      if (!F.length) throw no("Este evento ya no tiene fechas por delante.", "This event has no dates ahead.");
      let scope = alcance;
      if (scope === "date" && (!fechaId || !F.includes(fechaId))) throw no("Esa fecha ya no está en pie.", "That date is no longer on.");
      if (scope === "date" && F.length === 1) scope = "event";
      const fechas = scope === "date" ? [fechaId!] : F;
      const ch = (await c.query<{ id: string }>(`insert into event_changes (event_id, event_date_id, city_id, kind, reason_key, note, by_user, by_kind) values ($1::bigint, $2::bigint, $3, $4, $5, $6, $7, $8) returning id::text`,
        [eventoId, scope === "date" ? fechaId : null, e.city, scope === "date" ? "date_cancelled" : "cancelled", motivo, n || null, q.userId, byKind(q)])).rows[0]!.id;
      const id = (await c.query<{ id: string }>(
        `insert into event_cancellations (event_id, event_date_id, business_id, city_id, scope, change_id, reason_key, note, by_user, by_kind) values ($1::bigint, $2::bigint, $3, $4, $5, $6::bigint, $7, $8, $9, $10) returning id::text`,
        [eventoId, scope === "date" ? fechaId : null, e.biz, e.city, scope, ch, motivo, n || null, q.userId, byKind(q)])).rows[0]!.id;
      await c.query(`update event_dates set status = 'cancelled', cancel_reason = $2 where id = any($1::bigint[]) and status = 'scheduled'`, [fechas, MOTIVOS_CX[motivo].es]);
      if (scope === "event") await c.query(`update events set status = 'cancelled', cancelled_at = now(), cancelled_by = $2, cancel_reason = $3 where id = $1::bigint`, [eventoId, byKind(q), `${MOTIVOS_CX[motivo].es}${n ? ` · ${n}` : ""}`.slice(0, 500)]);
      // Lo apartado se suelta, la lista de espera se cierra y las cortesías se anulan (no hay dinero que devolver).
      await (await import("./boletos")).soltarApartadosDe(c, fechas);
      await c.query(`update waitlist set status = 'left' where event_date_id = any($1::bigint[]) and status in ('waiting', 'offered')`, [fechas]);
      await c.query(`update ticket_transfers set status = 'cancelled', ended_at = now() where event_date_id = any($1::bigint[]) and status = 'pending' and kind = 'comp'`, [fechas]);
      const comps = (await c.query<{ id: string }>(`update tickets set status = 'void', void_reason = 'Evento cancelado' where event_date_id = any($1::bigint[]) and kind = 'comp' and status in ('valid', 'used') returning id::text`, [fechas])).rows.map((x) => x.id);
      if (comps.length) await c.query(`insert into ticket_log (ticket_id, operation_id, city_id, kind, by_user, by_kind, reason) select id, operation_id, city_id, 'anulado', $2, $3, 'Evento cancelado' from tickets where id = any($1::bigint[])`,
        [comps, q.userId, q.tipo === "business" ? "business" : "staff"]);
      return id;
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return falla("Esta fecha ya se canceló.", "This date was already cancelled.");
    return atrapa(e);
  }
  // Las devoluciones: unas en el acto (evt_cancelar_lote); el resto, el barrido. Luego los avisos y la regla de Confianza.
  const lote = (await db().query<{ n: number }>(`select ${cfgSql("evt_cancelar_lote")} as n`)).rows[0]!.n; // de la base en el momento (sin la caché de 15 s)
  const p = await procesarCancelacion(cx, { ordenes: lote, ms: 20_000 });
  await avisarCancelacion(cx).catch(() => 0);
  await revisarCancelaciones(cx).catch(() => undefined);
  return { ok: true, cx, devueltas: p.ordenes, pendientes: p.quedan };
}

/* Las fechas de una cancelación (la fecha, o todas las canceladas del evento). */
async function fechasDe(q: Q, cx: { eid: string; fid: string | null }): Promise<string[]> {
  if (cx.fid) return [cx.fid];
  // Todo el evento: las fechas que canceló ESTA cancelación (una fecha cancelada antes tiene la suya).
  return (await q.query<{ id: string }>(`select d.id::text from event_dates d where d.event_id = $1::bigint and d.status = 'cancelled'
                                           and not exists (select 1 from event_cancellations y where y.event_date_id = d.id)`, [cx.eid])).rows.map((x) => x.id);
}
/* Las devoluciones de una cancelación, orden por orden (cada una en su transacción: si algo se corta, lo hecho queda hecho y lo demás lo
   sigue el barrido). Una orden con el cobro a medias (retenido) espera a que se cobre o se anule. Termina cuando no queda ningún boleto
   pagado vivo ni cobro a medias en esas fechas. */
export async function procesarCancelacion(cxId: string, lim: { ordenes: number; ms: number }): Promise<{ ordenes: number; quedan: number; hecha: boolean }> {
  const cx = (await db().query<{ id: string; eid: string; fid: string | null; by: string | null; kind: string; reason: MotivoCx | "admin"; st: string }>(
    `select id::text, event_id::text as eid, event_date_id::text as fid, by_user::text as by, by_kind as kind, reason_key as reason, status as st from event_cancellations where id = $1::bigint`, [cxId])).rows[0];
  if (!cx || cx.st !== "running") return { ordenes: 0, quedan: 0, hecha: true };
  const fechas = await fechasDe(db(), cx), t0 = Date.now(), saltar: string[] = [];
  const PEND = `o.kind = 'tickets' and o.status = 'confirmed' and (o.details->>'event_date_id')::bigint = any($1::bigint[])
                and exists (select 1 from tickets t where t.operation_id = o.id and t.kind = 'paid' and t.status in ('valid', 'used'))`;
  let n = 0;
  while (n < lim.ordenes && Date.now() - t0 < lim.ms) {
    const op = (await db().query<{ id: string }>(
      `select o.id::text from operations o where ${PEND} and not exists (select 1 from payments p where p.operation_id = o.id and p.status = 'held') and not (o.id = any($2::bigint[])) order by o.id limit 1`, [fechas, saltar])).rows[0]?.id;
    if (!op) break;
    const r = await tx(async (c) => {
      const d = await anotarDevolucionTotal(c, { op, por: "event_cancelled", actor: cx.by, byKind: cx.kind === "admin" ? "staff" : "business", idem: `evtcx-${cx.id}-${op}`, motivo: `Evento cancelado: ${MOTIVOS_CX[cx.reason].es}`, usados: true });
      // El costo de la tarjeta de lo devuelto (estimado: 2.9 % + 30 ¢ del cobro) lo absorbe To'Latino (§6 #24); queda para Confianza.
      const costo = d.total > 0 ? Math.round(d.total * 0.029) + 30 : 0;
      await c.query(`update event_cancellations set orders_n = orders_n + 1, refunded_cents = refunded_cents + $2, card_cost_cents = card_cost_cents + $3 where id = $1::bigint`, [cx.id, d.ya ? 0 : d.total, d.ya ? 0 : costo]);
      return d;
    }).catch((e) => { console.error("[evt-cambios] cancelación", cx.id, op, String((e as Error)?.message ?? e).slice(0, 200)); return null; });
    if (!r) { saltar.push(op); continue; }
    n++;
    if (r.rf) await ejecutarDevolucion(r.rf).catch(() => false);
  }
  const quedan = (await db().query<{ n: number; held: number }>(
    `select (select count(*)::int from operations o where ${PEND}) as n,
            (select count(*)::int from operations o join payments p on p.operation_id = o.id where o.kind = 'tickets' and (o.details->>'event_date_id')::bigint = any($1::bigint[]) and p.status = 'held') as held`, [fechas])).rows[0]!;
  const hecha = quedan.n === 0 && quedan.held === 0;
  if (hecha) await db().query(`update event_cancellations set status = 'done' where id = $1::bigint and status = 'running'`, [cx.id]);
  return { ordenes: n, quedan: quedan.n, hecha };
}

/* Los avisos de una cancelación (SMS crítico), una vez por persona: quien pagó («te devolvemos todo»), quien tiene un boleto o una cortesía
   («ya no entran») y quien va con RSVP. */
export async function avisarCancelacion(cxId: string): Promise<number> {
  const cx = (await db().query<{ id: string; eid: string; fid: string | null; scope: string; reason: MotivoCx | "admin"; note: string | null; t: Bi; slug: string; ldate: string; h0: number; biz: string }>(
    `select x.id::text, x.event_id::text as eid, x.event_date_id::text as fid, x.scope, x.reason_key as reason, x.note, e.title as t, e.slug,
            d.local_date::text as ldate, (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0, e.business_id as biz
       from event_cancellations x join events e on e.id = x.event_id
       join lateral (select * from event_dates z where z.id = coalesce(x.event_date_id, (select min(y.id) from event_dates y where y.event_id = x.event_id and y.status = 'cancelled'))) d on true
       join cities ci on ci.id = d.city_id where x.id = $1::bigint`, [cxId])).rows[0];
  if (!cx) return 0;
  const fechas = await fechasDe(db(), cx);
  const tpl = cx.scope === "date" ? "evt_fecha_cancelada" : "evt_cancelado", ya = await yaAvisados(tpl, "evt_cx", cx.id);
  const P = (await db().query<{ u: string; num: string }>(
    `select distinct on (o.user_id) o.user_id::text as u, o.number as num from operations o where o.kind = 'tickets' and o.pay_mode = 'app' and o.status = 'confirmed' and (o.details->>'event_date_id')::bigint = any($1::bigint[]) order by o.user_id, o.id desc`, [fechas])).rows;
  const H = (await db().query<{ u: string }>(`select distinct holder_user_id::text as u from tickets where event_date_id = any($1::bigint[]) and holder_user_id is not null`, [fechas])).rows.map((x) => x.u);
  const R = (await db().query<{ u: string }>(`select distinct user_id::text as u from rsvps where event_date_id = any($1::bigint[]) and status = 'going'`, [fechas])).rows.map((x) => x.u);
  const pago = new Map(P.map((x) => [x.u, x.num]));
  const motivo = `${MOTIVOS_CX[cx.reason].es}${cx.note && cx.reason !== "admin" ? ` (${cx.note.slice(0, 80)})` : ""}`;
  const { avisar } = await import("./avisos");
  let n = 0;
  for (const u of new Set([...pago.keys(), ...H, ...R])) {
    if (ya.has(u)) continue;
    const num = pago.get(u);
    const dinero = num ? "Te devolvemos todo lo que pagaste, cargos incluidos, en 3–5 días hábiles. No tienes que hacer nada." : H.includes(u) ? "Tus boletos ya no entran. No tienes que hacer nada." : "Si ibas, no tienes que hacer nada.";
    const href = num ? `/eventos/orden/${num}` : `/eventos/${cx.slug}`;
    await avisar(u, tpl, { evento: cx.t.es, cuando: `${diaCorto(cx.ldate, true)} · ${hora(cx.h0)}`, motivo, dinero }, { href, ref: ["evt_cx", cx.id] });
    n++;
  }
  return n;
}

/* Confianza (§6 #24): las cancelaciones de un organizador con boletos vendidos, en el plazo de Configuración, abren UN caso abierto. */
async function revisarCancelaciones(cxId: string) {
  await db().query(
    `insert into queue_items (queue, subject_kind, subject_id, business_id, city_id, priority)
     select 'evtcx', 'business', x.business_id, x.business_id, x.city_id, 'alta' from event_cancellations x
      where x.id = $1::bigint and x.by_kind = 'business'
        and (select count(*) from event_cancellations y where y.business_id = x.business_id and y.by_kind = 'business' and y.created_at > now() - make_interval(days => ${cfgSql("evt_cancelaciones_dias")})
               and exists (select 1 from tickets t where t.event_id = y.event_id and t.kind = 'paid' and (y.event_date_id is null or t.event_date_id = y.event_date_id)))
            >= ${cfgSql("evt_cancelaciones_confianza")}
     on conflict (queue, subject_kind, subject_id) where status = 'open' do nothing`, [cxId]);
}

/* Barrido: las cancelaciones que quedaron a medias siguen (y sus avisos), y los avisos de un cambio de fecha que se cortaron. */
export async function barrerCancelaciones(): Promise<number> {
  const L = (await db().query<{ id: string }>(`select id::text from event_cancellations where status = 'running' order by created_at limit 20`)).rows;
  let n = 0;
  for (const x of L) {
    const r = await procesarCancelacion(x.id, { ordenes: 200, ms: 20_000 });
    n += r.ordenes;
    await avisarCancelacion(x.id).catch(() => 0);
  }
  const C = (await db().query<{ id: string }>(
    `select x.id::text from event_changes x where x.kind in ('moved', 'time_changed') and x.at > now() - interval '2 days' and x.at < now() - interval '1 minute'
        and not exists (select 1 from notifications n where n.ref_kind = 'evt_cambio' and n.ref_id = x.id::text) order by x.at limit 20`)).rows;
  for (const x of C) await avisarCambio(x.id).catch(() => 0);
  return n;
}

/* ── AVISOS A LOS QUE VAN (push y en la app; nunca SMS) ── */
export async function avisarAsistentes(negocio: string, userId: string, eventoId: string, textoRaw: unknown): Promise<Res<{ n: number }>> {
  if (!ID.test(String(eventoId))) return falla("Ese evento no existe.", "That event does not exist.");
  const texto = limpiar(textoRaw, 160);
  if (texto.length < 5) return falla("Escribe el aviso (5 a 160 letras).", "Write the notice (5 to 160 characters).");
  let r: { id: string; L: string[]; t: Bi; org: string; slug: string; fid: string };
  try {
    r = await tx(async (c) => {
      const e = (await c.query<{ fid: string | null; t: Bi; org: string; slug: string; st: string }>(
        `select (select d.id::text from event_dates d where d.event_id = e.id and d.status = 'scheduled' and d.ends_at > now() order by d.starts_at limit 1) as fid, e.title as t, b.name as org, e.slug, e.status as st
           from events e join businesses b on b.id = e.business_id where e.id = $1::bigint and e.business_id = $2`, [eventoId, negocio])).rows[0];
      if (!e) throw no("Ese evento no existe.", "That event does not exist.");
      if (!["live", "paused"].includes(e.st) || !e.fid) throw no("Solo se avisa en un evento publicado con una fecha por delante.", "Notices go only on a live event with a date ahead.");
      const L = (await quienesVan(c, [e.fid])).map((x) => x.id);
      if (!L.length) throw no("Todavía no va nadie.", "Nobody is going yet.");
      const id = (await c.query<{ id: string }>(`insert into event_notices (event_id, event_date_id, city_id, text, by_user, sent_n) select event_id, id, city_id, $2, $3, $4 from event_dates where id = $1::bigint returning id::text`,
        [e.fid, texto, userId, L.length])).rows[0]!.id;
      return { id, L, t: e.t, org: e.org, slug: e.slug, fid: e.fid };
    });
  } catch (e) {
    // El tope lo decidió la base en el momento (cfg_int); el mensaje dice ese mismo número, no el de la caché de 15 s.
    if (e instanceof Error && /evt_aviso_max/.test(e.message)) { const m = (await db().query<{ m: number }>(`select ${cfgSql("evt_aviso_max")} as m`)).rows[0]!.m; return falla(`Hasta ${m} avisos por fecha. Ya los mandaste.`, `Up to ${m} notices per date. You already sent them.`); }
    return atrapa(e);
  }
  await (await import("./avisos")).avisarMuchos(r.L, "evt_aviso", { es: { evento: r.t.es, negocio: r.org, texto }, en: { evento: bi(r.t, false), negocio: r.org, texto } }, { href: `/eventos/${r.slug}?fecha=${r.fid}`, ref: ["evt_aviso", r.id] });
  return { ok: true, n: r.L.length };
}

/* ── Lo que ve el panel en la ficha del evento ── */
export type CambiosPanel = {
  congelado: string | null; avisoMax: number; avisos: { t: string; n: number; at: string }[];
  cambios: { kind: string; antes: string | null; ahora: string | null; motivo: string | null; by: string; at: string; que?: { es: string; en: string } | null; nota?: string | null }[];
  fechas: { id: string; dia: string; h0: number; h1: number; st: string; empezo: boolean; personas: number; monto: number; ordenes: number }[];
  cancelacion: { st: string; ordenes: number; devuelto: number; pendientes: number; motivo: string; at: string } | null;
  eleccion: { keep: number; refund: number; sin: number } | null; van: number; kind: string;
};
export async function cambiosPanel(negocio: string, eventoId: string): Promise<CambiosPanel | null> {
  if (!ID.test(eventoId)) return null;
  const e = (await db().query<{ frozen: string | null; kind: string }>(`select sales_frozen_reason as frozen, kind from events where id = $1::bigint and business_id = $2`, [eventoId, negocio])).rows[0];
  if (!e) return null;
  const [A, C, F, X, cfg] = await Promise.all([
    db().query<{ t: string; n: number; at: string }>(`select text as t, sent_n as n, to_char(at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at from event_notices where event_id = $1::bigint order by at desc limit 6`, [eventoId]),
    db().query<{ kind: string; b: { dia?: string; h0?: number } | null; a: { dia?: string; h0?: number; que?: { es: string; en: string } } | null; reason: string | null; by: string; at: string; note: string | null }>(
      `select kind, before as b, after as a, reason_key as reason, by_kind as by, to_char(at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, note from event_changes where event_id = $1::bigint order by at desc, id desc limit 12`, [eventoId]),
    db().query<{ id: string; dia: string; h0: number; h1: number; st: string; empezo: boolean; personas: number; monto: number; ordenes: number }>(
      `select d.id::text, d.local_date::text as dia, (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0,
              (extract(epoch from d.ends_at - d.starts_at) / 60)::int + (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h1,
              d.status as st, d.starts_at <= now() as empezo,
              (select count(distinct t.holder_user_id)::int from tickets t where t.event_date_id = d.id and t.status in ('valid', 'used')) + (select count(*)::int from rsvps r where r.event_date_id = d.id and r.status = 'going') as personas,
              coalesce((select sum(p.amount_cents - p.refunded_cents - coalesce((select sum(r.amount_cents) from refunds r where r.payment_id = p.id and r.status = 'pending'), 0))
                          from operations o join payments p on p.operation_id = o.id and p.kind = 'full' and p.status in ('captured', 'partially_refunded')
                         where o.kind = 'tickets' and o.status = 'confirmed' and (o.details->>'event_date_id')::bigint = d.id), 0)::int as monto,
              (select count(*)::int from operations o where o.kind = 'tickets' and o.pay_mode = 'app' and o.status = 'confirmed' and (o.details->>'event_date_id')::bigint = d.id
                  and exists (select 1 from tickets t where t.operation_id = o.id and t.status in ('valid', 'used'))) as ordenes
         from event_dates d join cities ci on ci.id = d.city_id where d.event_id = $1::bigint and d.status <> 'skipped' order by d.starts_at limit 120`, [eventoId]),
    db().query<{ st: string; ordenes: number; devuelto: number; reason: MotivoCx | "admin"; at: string; pendientes: number }>(
      `select x.status as st, x.orders_n as ordenes, x.refunded_cents as devuelto, x.reason_key as reason, to_char(x.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at,
              (select count(*)::int from refunds r join payments p on p.id = r.payment_id join operations o on o.id = p.operation_id
                where r.status = 'pending' and r.initiated_by = 'event_cancelled' and (o.details->>'event_id')::bigint = x.event_id) as pendientes
         from event_cancellations x where x.event_id = $1::bigint order by x.created_at desc limit 1`, [eventoId]),
    valores("evt_aviso_max"),
  ]);
  const ul = C.rows.find((x) => x.kind === "moved" || x.kind === "time_changed");
  const el = ul ? (await db().query<{ keep: number; refund: number; total: number }>(
    `select count(*) filter (where c.choice = 'keep')::int as keep, count(*) filter (where c.choice = 'refund')::int as refund,
            (select count(*)::int from operations o join event_changes x on x.id = (select id from event_changes where event_id = $1::bigint and kind in ('moved', 'time_changed') order by at desc, id desc limit 1)
              where o.kind = 'tickets' and o.pay_mode = 'app' and o.status = 'confirmed' and (o.details->>'event_date_id')::bigint = x.event_date_id and o.sent_at < x.at) as total
       from ticket_choices c where c.change_id = (select id from event_changes where event_id = $1::bigint and kind in ('moved', 'time_changed') order by at desc, id desc limit 1)`, [eventoId])).rows[0] : null;
  const fh = (x: { dia?: string; h0?: number } | null) => (x?.dia ? `${diaCorto(x.dia, true)} · ${hora(x.h0 ?? 0)}` : null);
  return {
    congelado: e.frozen, avisoMax: cfg.evt_aviso_max, avisos: A.rows, kind: e.kind,
    // 6j · Lo que ajustó To'Latino (cupo, venta extendida): qué y el motivo, para el panel y el Super Admin.
    cambios: C.rows.map((x) => ({ kind: x.kind, antes: fh(x.b), ahora: fh(x.a), motivo: x.reason ? MOTIVOS_CX[x.reason as MotivoCx]?.es ?? null : null, by: x.by, at: x.at,
      que: x.kind === "capacity_adjusted" || x.kind === "sales_extended" ? x.a?.que ?? null : null, nota: x.kind === "capacity_adjusted" || x.kind === "sales_extended" ? x.note : null })),
    fechas: F.rows, van: F.rows.filter((f) => f.st === "scheduled" && !f.empezo).reduce((s, f) => s + f.personas, 0),
    cancelacion: X.rows[0] ? { st: X.rows[0].st, ordenes: X.rows[0].ordenes, devuelto: X.rows[0].devuelto, pendientes: X.rows[0].pendientes, motivo: MOTIVOS_CX[X.rows[0].reason].es, at: X.rows[0].at } : null,
    eleccion: el ? { keep: el.keep, refund: el.refund, sin: Math.max(0, el.total - el.keep - el.refund) } : null,
  };
}

/* ── Lo que ve el cliente: la orden (cancelada o con cambio de fecha y su elección) y la ficha (cambió de fecha, último aviso) ── */
export type CambioOrden = {
  cancelada: { motivo: string; monto: number; enCamino: boolean } | null;
  movido: { antes: string; ahora: string; puede: boolean; eleccion: "keep" | "refund" | null } | null;
  avisos: { t: string; at: string }[];
};
export async function cambioOrden(userId: string, numero: string): Promise<CambioOrden | null> {
  if (!NUM_B.test(String(numero))) return null;
  const o = (await db().query<{ id: string; fid: string; eid: string; dst: string; est: string; sent: string; abierto: boolean }>(
    `select o.id::text, d.id::text as fid, d.event_id::text as eid, d.status as dst, e.status as est, o.sent_at::text as sent,
            e.status in ('live', 'paused') and d.status = 'scheduled' and d.starts_at > now() as abierto
       from operations o join event_dates d on d.id = (o.details->>'event_date_id')::bigint join events e on e.id = d.event_id
      where o.number = $1 and o.kind = 'tickets' and o.user_id = $2`, [numero, userId])).rows[0];
  if (!o) return null;
  const [X, M, A] = await Promise.all([
    db().query<{ reason: MotivoCx | "admin"; note: string | null }>(`select reason_key as reason, note from event_cancellations where event_id = $1::bigint and (event_date_id is null or event_date_id = $2::bigint) order by created_at limit 1`, [o.eid, o.fid]),
    db().query<{ id: string; b: { dia: string; h0: number }; a: { dia: string; h0: number }; despues: boolean; choice: string | null }>(
      `select x.id::text, x.before as b, x.after as a, x.at > $3::timestamptz as despues, (select c.choice from ticket_choices c where c.operation_id = $2::bigint and c.change_id = x.id) as choice
         from event_changes x where x.event_date_id = $1::bigint and x.kind in ('moved', 'time_changed') order by x.at desc, x.id desc limit 1`, [o.fid, o.id, o.sent]),
    db().query<{ t: string; at: string }>(`select text as t, to_char(at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at from event_notices where event_date_id = $1::bigint order by at desc limit 3`, [o.fid]),
  ]);
  const cancelada = o.dst === "cancelled" || o.est === "cancelled";
  const dev = cancelada ? (await db().query<{ m: number; pend: boolean }>(
    `select coalesce(sum(r.amount_cents), 0)::int as m, bool_or(r.status = 'pending') as pend from refunds r join payments p on p.id = r.payment_id where p.operation_id = $1::bigint and r.initiated_by = 'event_cancelled'`, [o.id])).rows[0] : null;
  const m = M.rows[0];
  return {
    cancelada: cancelada ? { motivo: X.rows[0] ? MOTIVOS_CX[X.rows[0].reason].es : "", monto: dev?.m ?? 0, enCamino: !!dev?.pend } : null,
    movido: m && m.despues && !cancelada ? { antes: `${diaCorto(m.b.dia, true)} · ${hora(m.b.h0)}`, ahora: `${diaCorto(m.a.dia, true)} · ${hora(m.a.h0)}`, puede: o.abierto && !m.choice, eleccion: (m.choice as "keep" | "refund" | null) ?? null } : null,
    avisos: A.rows,
  };
}
/* La ficha pública: si la fecha cambió (antes …) y el último aviso del organizador (sale primero en «Antes de ir»). */
export async function cambioFicha(fechaId: string): Promise<{ antes: string | null; aviso: string | null }> {
  if (!ID.test(fechaId)) return { antes: null, aviso: null };
  const [M, A] = await Promise.all([
    db().query<{ b: { dia: string; h0: number } }>(`select before as b from event_changes where event_date_id = $1::bigint and kind in ('moved', 'time_changed') and at > now() - interval '30 days' order by at desc, id desc limit 1`, [fechaId]),
    db().query<{ t: string }>(`select text as t from event_notices where event_date_id = $1::bigint order by at desc limit 1`, [fechaId]),
  ]);
  return { antes: M.rows[0] ? `${diaCorto(M.rows[0].b.dia, true)} · ${hora(M.rows[0].b.h0)}` : null, aviso: A.rows[0]?.t ?? null };
}
/* La ficha de un evento cancelado (ya no sale en Eventos): lo justo para decir que se canceló y qué pasa con el dinero. */
export async function fichaCancelada(slug: string, es: boolean): Promise<{ title: string; org: string; dia: string; h0: number; motivo: string; tix: boolean; img: string | null } | null> {
  const m = /^[a-z0-9-]{1,80}-(\d{1,18})$/.exec(String(slug ?? ""));
  if (!m) return null;
  const r = (await db().query<{ title: Bi; org: string; ldate: string; h0: number; reason: MotivoCx | "admin"; entry: string; img: string | null; slug: string }>(
    `select e.title, b.name as org, d.local_date::text as ldate, (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0,
            x.reason_key as reason, e.entry, e.slug,
            (select u.url from media u where u.owner_kind = 'event' and u.owner_id = e.id::text and u.status = 'visible' order by u.sort, u.created_at limit 1) as img
       from event_cancellations x join events e on e.id = x.event_id join businesses b on b.id = e.business_id
       join event_dates d on d.id = coalesce(x.event_date_id, (select min(y.id) from event_dates y where y.event_id = e.id and y.status = 'cancelled')) join cities ci on ci.id = d.city_id
      where e.id = $1::bigint and e.approved_at is not null and e.hidden_at is null and (e.status = 'cancelled' or not exists (select 1 from event_dates z where z.event_id = e.id and z.listable))
      order by x.created_at desc limit 1`, [m[1]])).rows[0];
  if (!r || r.slug !== slug) return null;
  return { title: bi(r.title, es), org: r.org, dia: r.ldate, h0: r.h0, motivo: bi(MOTIVOS_CX[r.reason], es), tix: r.entry === "tickets", img: r.img };
}
