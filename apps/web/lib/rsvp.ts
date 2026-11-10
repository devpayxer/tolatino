import "server-only";
import { avisar } from "./avisos";
import { db, tx } from "./db";
import { bi, diaCorto, hora, type Bi } from "./evt-comun";

/* 6b · RSVP de un evento gratis o con RSVP (fase6-eventos.md §2 0107 y §4 6b). La base decide el cupo: el trigger rsvps_antes bloquea la
   fila de la fecha (for update) antes de contar y rsvps_despues lleva el contador y vuelve a mirar el cupo; aquí solo se traduce la
   respuesta de la base a palabras. Con 3 personas a la vez por el último lugar, entra una y las demás ven «Cupo lleno».
   - rsvp(): «Voy» con personas (1 – party_max); si ya vas, cambia las personas (más personas = el cupo se vuelve a contar).
   - quitarRsvp(): «Ya no voy»: el lugar se libera para otro vecino (estado cancelado; nada se borra).
   - vencerRsvp() (barrido): pasadas las puertas + rsvp_guarda_min, el RSVP vence y el lugar se libera; al abrir puertas, el aviso de
     hasta cuándo se guarda.
   - barrerRecordatoriosEvt() (barrido): el día antes, el recordatorio a quien va y a quien guardó el evento (una vez por fecha).
   El código de la puerta del RSVP lo arma la base y no sale de aquí: es para la puerta (6g). */
type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi; lleno?: boolean };
const no = (es: string, en: string, lleno = false): { ok: false; msg: Bi; lleno?: boolean } => ({ ok: false, msg: { es, en }, ...(lleno ? { lleno } : {}) });
const ID = /^\d{1,18}$/;

/* Lo que la base contesta → palabras para la persona. */
function traducir(e: unknown): { ok: false; msg: Bi; lleno?: boolean } | null {
  const m = String((e as Error)?.message ?? "");
  const q = /^evt_cupo_lleno: quedan (\d+)/.exec(m);
  if (q) return Number(q[1]) > 0 ? no(`Solo quedan ${q[1]} lugares. Baja las personas o prueba otra fecha.`, `Only ${q[1]} spots left. Lower the number of people or try another date.`, true) : no("Cupo lleno. Ya no quedan lugares.", "Full. No spots left.", true);
  if (/^evt_cupo_lleno/.test(m)) return no("Cupo lleno. Ya no quedan lugares.", "Full. No spots left.", true);
  if (/^evt_rsvp_cerrado/.test(m)) return no("El RSVP de esta fecha ya cerró.", "RSVP for this date is closed.");
  const p = /^evt_rsvp_personas: hasta (\d+)/.exec(m);
  if (p) return no(`Hasta ${p[1]} personas por RSVP.`, `Up to ${p[1]} people per RSVP.`);
  if (/^evt_no_rsvp/.test(m)) return no("Este evento no recibe RSVP.", "This event does not take RSVPs.");
  if (/rsvps_vivo/.test(m)) return no("Ya tienes un RSVP para esta fecha.", "You already RSVP’d for this date.");
  return null;
}

type Datos = { evento: string; title: Bi; slug: string; ldate: string; h0: number; hasta: number; lugar: string };
async function datos(fechaId: string): Promise<Datos | null> {
  return (await db().query<Datos>(
    `select e.id::text as evento, e.title, e.slug, d.local_date::text as ldate,
            (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0,
            (extract(hour from (d.doors_at + make_interval(mins => cfg_int('rsvp_guarda_min'))) at time zone ci.timezone) * 60
             + extract(minute from (d.doors_at + make_interval(mins => cfg_int('rsvp_guarda_min'))) at time zone ci.timezone))::int as hasta,
            case when e.venue_mode = 'other' then e.venue_name else b.name end as lugar
       from event_dates d join events e on e.id = d.event_id join businesses b on b.id = e.business_id join cities ci on ci.id = d.city_id where d.id = $1::bigint`, [fechaId])).rows[0] ?? null;
}

/* Las variables del aviso en el idioma de la persona (el nombre del evento sale en el suyo; si no lo tiene en inglés, en español). */
const vars = (d: Datos, en: boolean, party?: number) => ({
  evento: en ? d.title.en || d.title.es : d.title.es, cuando: `${diaCorto(d.ldate, !en)} · ${hora(d.h0)}`, lugar: d.lugar, hasta: hora(d.hasta),
  ...(party ? { personas: en ? (party === 1 ? "1 person" : `${party} people`) : party === 1 ? "1 persona" : `${party} personas` } : {}),
});
const enIngles = async (userId: string) => (await db().query<{ en: boolean }>(`select lang = 'en' as en from users where id = $1`, [userId])).rows[0]?.en ?? false;

/* «Voy» con personas. Devuelve las personas guardadas y los lugares que quedan (la base los contó). */
export async function rsvp(userId: string, fechaId: string, personas: number): Promise<Res<{ party: number; quedan: number | null; nuevo: boolean }>> {
  if (!ID.test(String(fechaId))) return no("Esa fecha no existe.", "That date does not exist.");
  const party = Math.round(Number(personas));
  if (!Number.isFinite(party) || party < 1 || party > 10) return no("Elige cuántas personas van (1 a 10).", "Pick how many people are going (1 to 10).");
  let r: { party: number; quedan: number | null; nuevo: boolean };
  try {
    r = await tx(async (c) => {
      const ya = (await c.query<{ id: string; party: number }>(`select id::text, party from rsvps where user_id = $1 and event_date_id = $2::bigint and status = 'going' for update`, [userId, fechaId])).rows[0];
      if (ya) { if (ya.party !== party) await c.query(`update rsvps set party = $2 where id = $1::bigint`, [ya.id, party]); }
      else await c.query(`insert into rsvps (event_date_id, event_id, city_id, user_id, party, hold_until) select $1::bigint, d.event_id, d.city_id, $2, $3, now() from event_dates d where d.id = $1::bigint`, [fechaId, userId, party]);
      const q = (await c.query<{ quedan: number | null }>(`select case when e.rsvp_capacity > 0 then greatest(0, e.rsvp_capacity - d.rsvp_n) end as quedan from event_dates d join events e on e.id = d.event_id where d.id = $1::bigint`, [fechaId])).rows[0];
      return { party, quedan: q?.quedan ?? null, nuevo: !ya };
    });
  } catch (e) {
    const t = traducir(e);
    if (t) return t;
    throw e;
  }
  if (r.nuevo) {
    const d = await datos(fechaId);
    if (d) await avisar(userId, "rsvp_ok", vars(d, await enIngles(userId), r.party), { href: `/eventos/${d.slug}?fecha=${fechaId}`, ref: ["event", d.evento] });
  }
  return { ok: true, ...r };
}

/* «Ya no voy»: el lugar se libera. */
export async function quitarRsvp(userId: string, fechaId: string): Promise<Res> {
  if (!ID.test(String(fechaId))) return no("Esa fecha no existe.", "That date does not exist.");
  const r = await db().query(`update rsvps set status = 'cancelled' where user_id = $1 and event_date_id = $2::bigint and status = 'going'`, [userId, fechaId]);
  if (!r.rowCount) return no("No tenías RSVP en esta fecha.", "You had no RSVP for this date.");
  return { ok: true };
}

/* Mi cuenta › Guardados › Eventos: a lo que vas (RSVP vivos) y lo que guardaste (solo lo que sigue en vivo). */
export async function misEventos(userId: string, es: boolean) {
  const [V, G] = await Promise.all([
    db().query<{ fid: string; slug: string; title: Bi; ldate: string; h0: number; lugar: string; party: number; foto: string | null }>(
      `select d.id::text as fid, e.slug, e.title, d.local_date::text as ldate,
              (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0,
              case when e.venue_mode = 'other' then e.venue_name else b.name end as lugar, r.party,
              (select m.url from media m where m.owner_kind = 'event' and m.owner_id = e.id::text and m.status = 'visible' order by m.sort, m.created_at limit 1) as foto
         from rsvps r join event_dates d on d.id = r.event_date_id join events e on e.id = d.event_id join businesses b on b.id = e.business_id join cities ci on ci.id = d.city_id
        where r.user_id = $1 and r.status = 'going' and d.ends_at > now() and d.listable order by d.starts_at limit 50`, [userId]),
    db().query<{ eid: string; slug: string; title: Bi; ldate: string; h0: number; lugar: string; foto: string | null }>(
      `select distinct on (e.id) e.id::text as eid, e.slug, e.title, d.local_date::text as ldate,
              (extract(hour from d.starts_at at time zone ci.timezone) * 60 + extract(minute from d.starts_at at time zone ci.timezone))::int as h0,
              case when e.venue_mode = 'other' then e.venue_name else b.name end as lugar,
              (select m.url from media m where m.owner_kind = 'event' and m.owner_id = e.id::text and m.status = 'visible' order by m.sort, m.created_at limit 1) as foto
         from favorites f join events e on e.id::text = f.target_id join event_dates d on d.event_id = e.id join businesses b on b.id = e.business_id join cities ci on ci.id = d.city_id
        where f.user_id = $1 and f.kind = 'event' and d.listable and d.ends_at > now() order by e.id, d.starts_at limit 50`, [userId]),
  ]);
  const cuando = (ld: string, h0: number) => `${diaCorto(ld, es)} · ${hora(h0)}`.toUpperCase();
  return {
    vas: V.rows.map((x) => ({ fid: x.fid, href: `/eventos/${x.slug}?fecha=${x.fid}`, t: bi(x.title, es), s: `${cuando(x.ldate, x.h0)} · ${x.lugar}`.toUpperCase(), party: x.party, foto: x.foto })),
    guardados: G.rows.sort((a, b) => a.ldate.localeCompare(b.ldate) || a.h0 - b.h0).map((x) => ({ eid: x.eid, href: `/eventos/${x.slug}`, t: bi(x.title, es), s: `${cuando(x.ldate, x.h0)} · ${x.lugar}`.toUpperCase(), foto: x.foto })),
  };
}

/* ── Barrido ── */
/* Pasadas las puertas + rsvp_guarda_min, el lugar ya no se guarda (POL_GRATIS); al abrir puertas, el aviso de hasta cuándo. */
export async function vencerRsvp() {
  const v = await db().query(`update rsvps set status = 'expired' where id in (select id from rsvps where status = 'going' and hold_until <= now() order by hold_until limit 2000)`);
  const P = (await db().query<{ id: string; user: string; fid: string; en: boolean }>(
    `update rsvps r set doors_notified_at = now() from event_dates d
      where d.id = r.event_date_id and r.status = 'going' and r.doors_notified_at is null and d.doors_at <= now() and r.hold_until > now() and d.listable
        and r.id in (select x.id from rsvps x join event_dates y on y.id = x.event_date_id where x.status = 'going' and x.doors_notified_at is null and y.doors_at <= now() and x.hold_until > now() limit 500)
      returning r.id::text, r.user_id::text as user, r.event_date_id::text as fid, (select u.lang = 'en' from users u where u.id = r.user_id) as en`)).rows;
  for (const x of P) {
    const d = await datos(x.fid);
    if (d) await avisar(x.user, "rsvp_vence", vars(d, x.en), { href: `/eventos/${d.slug}?fecha=${x.fid}`, ref: ["event", d.evento] });
  }
  return { vencidos: v.rowCount ?? 0, puertas: P.length };
}

/* El día antes (desde las 10 AM de la ciudad): «Mañana: …» a quien va y «Un evento que guardaste es mañana» a quien lo guardó y no va. */
export async function barrerRecordatoriosEvt() {
  const MANANA = `d.local_date = (now() at time zone ci.timezone)::date + 1 and extract(hour from now() at time zone ci.timezone) >= 10`;
  const R = (await db().query<{ user: string; fid: string; en: boolean }>(
    `update rsvps r set reminded_at = now() where r.id in (
       select x.id from rsvps x join event_dates d on d.id = x.event_date_id join cities ci on ci.id = d.city_id
        where x.status = 'going' and x.reminded_at is null and d.listable and x.created_at < now() - interval '1 hour' and ${MANANA} limit 500)
     returning r.user_id::text as user, r.event_date_id::text as fid, (select u.lang = 'en' from users u where u.id = r.user_id) as en`)).rows;
  const G = (await db().query<{ user: string; fid: string; en: boolean }>(
    `insert into event_save_reminders (user_id, event_date_id)
     select f.user_id, d.id from favorites f join events e on f.kind = 'event' and f.target_id = e.id::text join event_dates d on d.event_id = e.id join cities ci on ci.id = d.city_id
      where d.listable and ${MANANA} and f.created_at < now() - interval '1 hour'
        and not exists (select 1 from rsvps r where r.user_id = f.user_id and r.event_date_id = d.id and r.status = 'going')
      limit 500
     on conflict do nothing returning user_id::text as user, event_date_id::text as fid, (select u.lang = 'en' from users u where u.id = user_id) as en`)).rows;
  for (const [tpl, L] of [["rsvp_recordatorio", R], ["evt_guardado_cerca", G]] as const) for (const x of L) {
    const d = await datos(x.fid);
    if (d) await avisar(x.user, tpl, vars(d, x.en), { href: `/eventos/${d.slug}?fecha=${x.fid}`, ref: ["event", d.evento] });
  }
  return { recordatorios: R.length, guardados: G.length };
}

/* 6e · La fecha cambió (lib/evt-cambios.ts moverFecha, dentro de su transacción): cada RSVP vivo guarda el lugar hasta las puertas nuevas +
   rsvp_guarda_min y el recordatorio del día antes vuelve a salir para la fecha nueva. Solo este archivo escribe RSVP (guardián rsvpConCupo). */
export async function moverRsvps(c: Pick<import("pg").PoolClient, "query">, fechaId: string, puertas: string): Promise<number> {
  const r = await c.query(`update rsvps set hold_until = $2::timestamptz + make_interval(mins => cfg_int('rsvp_guarda_min')), reminded_at = null, doors_notified_at = null
                            where event_date_id = $1::bigint and status = 'going'`, [fechaId, puertas]);
  return r.rowCount ?? 0;
}
