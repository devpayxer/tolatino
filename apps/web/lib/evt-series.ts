import "server-only";
import { db, tx } from "./db";
import { bi, diaCorto, hora, type Bi, type Linea } from "./evt-comun";

/* 6f · Series y eventos de varios días (fase6-eventos.md §4 6f; Panel v2 evView: FECHAS con Saltar / Volver a ponerla, QUIÉN SE PRESENTA ·
   SOLO ESTA FECHA, VENDIDOS POR DÍA). Las fechas las genera la base (evt_generar_fechas en 0111, al guardar y en el barrido); aquí:
   - saltarFecha: quitar una fecha de la serie (o volver a ponerla). Solo sin gente (boletos, RSVP, apartados, lista de espera): una fecha con
     gente se cancela con devolución (6e). La primera fecha no se salta: se cambia en el editor. No es un cambio que revise To'Latino (quita
     una fecha sin nadie). Queda en event_changes (date_skipped) y en la regla (rep.skip) también del cambio que espera revisión.
   - artistaDeFecha: «Cambiar artista solo esta fecha» (event_dates.lineup_override); avisa a los que van (push y en la app, sin SMS).
   - ventasPorDia: lo vendido (o apuntado) por día en los últimos 7 días de UNA fecha, en una sola consulta.
   - extenderSeries: el barrido (crea las fechas que el horizonte de Configuración ya alcanza y marca 'done' las fechas que pasaron).
   Quien llama ya pasó el acceso del panel (parte «evt» de SU negocio); cada consulta vuelve a filtrar por el negocio (IDOR). */
type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi };
const no = (es: string, en: string): { ok: false; msg: Bi } => ({ ok: false, msg: { es, en } });
const ID = /^\d{1,18}$/;
class NoS extends Error { constructor(public r: { ok: false; msg: Bi }) { super(r.msg.es); } }

export async function saltarFecha(negocio: string, userId: string, eventoId: string, fechaId: string, saltar: boolean): Promise<Res> {
  if (!ID.test(String(eventoId)) || !ID.test(String(fechaId))) return no("Esa fecha no existe.", "That date does not exist.");
  try {
    await tx(async (c) => {
      const e = (await c.query<{ kind: string; st: string; inicio: string; city: string; rep: { skip?: string[] } | null; prep: { skip?: string[] } | null }>(
        `select kind, status as st, start_date::text as inicio, city_id as city, rep, case when jsonb_typeof(pending->'rep') = 'object' then pending->'rep' end as prep from events where id = $1::bigint and business_id = $2 for update`, [eventoId, negocio])).rows[0];
      if (!e) throw new NoS(no("Ese evento no existe.", "That event does not exist."));
      if (e.kind !== "series") throw new NoS(no("Solo se salta una fecha de una serie.", "Only a date in a series can be skipped."));
      if (["cancelled", "rejected", "done"].includes(e.st)) throw new NoS(no("Este evento ya no se cambia.", "This event can no longer change."));
      const d = (await c.query<{ serie: string | null; st: string; futura: boolean; gente: boolean }>(
        `select serie_dia::text as serie, status as st, starts_at > now() as futura, evt_fecha_con_gente(id) as gente from event_dates where id = $1::bigint and event_id = $2::bigint for update`, [fechaId, eventoId])).rows[0];
      if (!d || !d.serie) throw new NoS(no("Esa fecha no existe.", "That date does not exist."));
      if (!d.futura) throw new NoS(no("Esa fecha ya empezó.", "That date already started."));
      if (saltar) {
        if (d.st !== "scheduled") throw new NoS(no("Esa fecha ya no está en pie.", "That date is no longer on."));
        if (d.serie === e.inicio) throw new NoS(no("La primera fecha no se salta: cámbiala en el editor.", "The first date cannot be skipped: change it in the editor."));
        if (d.gente) throw new NoS(no("Esa fecha ya tiene boletos vendidos o gente apuntada: no se puede saltar. Cancélala con devolución.", "That date already has tickets sold or people signed up: it cannot be skipped. Cancel it with refunds."));
      } else if (d.st !== "skipped") throw new NoS(no("Esa fecha no está saltada.", "That date is not skipped."));
      // La regla (y el cambio que espera revisión, si trae la regla) recuerda la fecha saltada; la base genera las fechas con eso.
      const nuevo = (x: string[] | undefined) => [...new Set([...(x ?? []).filter((y) => y !== d.serie), ...(saltar ? [d.serie!] : [])])].sort();
      await c.query(`update events set rep = jsonb_set(rep, '{skip}', $3::jsonb),
                       pending = case when pending is not null and jsonb_typeof(pending->'rep') = 'object' and pending->'rep'->>'k' <> 'none' then jsonb_set(pending, '{rep,skip}', $4::jsonb) else pending end
                      where id = $1::bigint and business_id = $2`, [eventoId, negocio, JSON.stringify(nuevo(e.rep?.skip)), JSON.stringify(nuevo(e.prep?.skip))]);
      await c.query(`insert into event_changes (event_id, event_date_id, city_id, kind, before, after, by_user, by_kind) values ($1::bigint, $2::bigint, $3, 'date_skipped', $4::jsonb, $5::jsonb, $6, 'business')`,
        [eventoId, fechaId, e.city, JSON.stringify({ dia: d.serie, st: d.st }), JSON.stringify({ dia: d.serie, st: saltar ? "skipped" : "scheduled" }), userId]);
      await c.query(`select evt_sincronizar_fechas($1::bigint)`, [eventoId]);
      const st = (await c.query<{ st: string }>(`select status as st from event_dates where id = $1::bigint`, [fechaId])).rows[0]?.st;
      if (st !== (saltar ? "skipped" : "scheduled")) throw new NoS(no("No se pudo: esa fecha ya no está en la serie.", "It could not be done: that date is no longer in the series."));
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof NoS) return e.r;
    throw e;
  }
}

/* «Cambiar artista solo esta fecha» (o volver al de siempre): el programa de esa fecha y el aviso a los que van. */
export async function artistaDeFecha(negocio: string, userId: string, fechaId: string, quienRaw: string | null): Promise<Res<{ avisados: number }>> {
  if (!ID.test(String(fechaId))) return no("Esa fecha no existe.", "That date does not exist.");
  const quien = quienRaw == null ? null : String(quienRaw).replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (quien !== null && quien.length < 2) return no("Escribe quién se presenta.", "Write who performs.");
  let r: { eid: string; t: Bi; slug: string; dia: string; h0: number; city: string } | null = null;
  try {
    r = await tx(async (c) => {
      const d = (await c.query<{ eid: string; t: Bi; slug: string; dia: string; h0: number; city: string; st: string; est: string; empezo: boolean; kind: string }>(
        `select e.id::text as eid, e.title as t, e.slug, d.local_date::text as dia, d.city_id as city, d.status as st, e.status as est, d.starts_at <= now() as empezo, e.kind,
                (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0
           from event_dates d join events e on e.id = d.event_id join cities ci on ci.id = d.city_id where d.id = $1::bigint and e.business_id = $2 for update of d`, [fechaId, negocio])).rows[0];
      if (!d) throw new NoS(no("Esa fecha no existe.", "That date does not exist."));
      if (d.kind !== "series" || d.st !== "scheduled" || d.empezo || !["live", "paused"].includes(d.est)) throw new NoS(no("Solo se cambia el artista de una fecha de una serie publicada que no empezó.", "The performer changes only on a date of a live series that has not started."));
      const L = (await c.query<Linea>(`select at_min as h, who, role from event_lineup where event_id = $1::bigint and removed_at is null and day_index = 0 order by sort, at_min`, [d.eid])).rows;
      if (!L.length) throw new NoS(no("Este evento no tiene line-up.", "This event has no line-up."));
      const nuevo = quien === null ? null : [{ ...L[0]!, who: quien }, ...L.slice(1)];
      await c.query(`update event_dates set lineup_override = $2::jsonb where id = $1::bigint`, [fechaId, nuevo ? JSON.stringify(nuevo) : null]);
      await c.query(`insert into event_changes (event_id, event_date_id, city_id, kind, before, after, by_user, by_kind) values ($1::bigint, $2::bigint, $3, 'lineup_changed', $4::jsonb, $5::jsonb, $6, 'business')`,
        [d.eid, fechaId, d.city, JSON.stringify({ quien: L[0]!.who }), JSON.stringify({ quien: quien ?? L[0]!.who }), userId]);
      return { eid: d.eid, t: d.t, slug: d.slug, dia: d.dia, h0: d.h0, city: d.city };
    });
  } catch (e) {
    if (e instanceof NoS) return e.r;
    throw e;
  }
  if (!r || quien === null) return { ok: true, avisados: 0 };
  // Avisar a los que van a ESA fecha (boletos vivos y RSVP): push y en la app, nunca SMS.
  const L = (await db().query<{ u: string }>(
    `select distinct u::text from (select holder_user_id as u from tickets where event_date_id = $1::bigint and status in ('valid', 'used') and holder_user_id is not null
                                   union select user_id from rsvps where event_date_id = $1::bigint and status = 'going') x`, [fechaId])).rows.map((x) => x.u);
  if (L.length) await (await import("./avisos")).avisarMuchos(L, "evt_artista",
    { es: { evento: r.t.es, cuando: `${diaCorto(r.dia, true)} · ${hora(r.h0)}`, quien }, en: { evento: bi(r.t, false), cuando: `${diaCorto(r.dia, false)} · ${hora(r.h0)}`, quien } },
    { href: `/eventos/${r.slug}?fecha=${fechaId}`, ref: ["evt_artista", `${fechaId}:${Date.now()}`] });
  return { ok: true, avisados: L.length };
}

/* VENDIDOS POR DÍA (o SE APUNTARON) de UNA fecha: los últimos 7 días en la zona de la ciudad, en una sola consulta. */
export async function ventasPorDia(negocio: string, fechaId: string): Promise<{ dias: string[]; n: number[] } | null> {
  if (!ID.test(String(fechaId))) return null;
  const r = (await db().query<{ dia: string; n: number }>(
    `with f as (select d.id, ci.timezone as tz, e.entry from event_dates d join events e on e.id = d.event_id join cities ci on ci.id = d.city_id where d.id = $1::bigint and e.business_id = $2),
          g as (select generate_series((now() at time zone (select tz from f))::date - 6, (now() at time zone (select tz from f))::date, interval '1 day')::date as dia)
     select g.dia::text, (case when (select entry from f) = 'tickets'
              then (select count(*) from tickets t where t.event_date_id = (select id from f) and t.kind = 'paid' and (t.created_at at time zone (select tz from f))::date = g.dia)
              else (select coalesce(sum(r.party), 0) from rsvps r where r.event_date_id = (select id from f) and (r.created_at at time zone (select tz from f))::date = g.dia) end)::int as n
       from g where exists (select 1 from f) order by g.dia`, [fechaId, negocio])).rows;
  if (!r.length) return null;
  return { dias: r.map((x) => x.dia), n: r.map((x) => x.n) };
}

/* Barrido: las series crean las fechas que el horizonte ya alcanza (evt_dias_adelante) y las fechas que pasaron quedan 'done'. */
export async function extenderSeries(): Promise<number> {
  return (await db().query<{ n: number }>(`select evt_extender_series() as n`)).rows[0]?.n ?? 0;
}
