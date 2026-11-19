import "server-only";
import type { PoolClient } from "pg";
import { valor } from "./config";
import { db, tx } from "./db";
import { fechaCorta, hora, motorMesa, vencerMesas } from "./reservas";

/* 9t · «Avísame si se libera» de una mesa (LAUNCH «Avísame si se libera (lista de espera) y Otros restaurantes con mesa»; prototipo rsvStVals
   wAsk / wOn / onWait y offerVals «Se liberó una mesa»; el patrón de «Avísame si se libera una hora» de lib/citas.ts y de la lista de espera de
   boletos de lib/espera.ts). Reglas (el servidor decide; la pantalla solo muestra):
   - Solo quien hizo la solicitud que no se pudo (NO PUDO o SIN RESPUESTA) se anota, para ESA hora, ese día y esas personas (cualquier área), y
     solo si esa hora sigue llena con el mismo motor de «Elegir hora» (si ya tiene mesa, se reserva; si ya no se puede pedir, no hay lista).
   - Una entrada viva por persona, restaurante, hora y personas (índice de 0180); hasta TOPE_ESPERA vivas por persona.
   - El barrido de cada minuto (barrerEsperaMesas) mira, con el candado del restaurante, si se liberó una mesa: al primero de la fila (por orden de
     llegada) le guarda la mesa rsv_espera_min minutos A SU NOMBRE (una retención como la de «Elegir hora», nadie más la toma) y le avisa UNA vez
     (waiting → offered en la misma escritura y notif_once) con el enlace a esa mesa: push primero, SMS de respaldo. En sus horas de silencio no se le
     ofrece (sigue en la fila, en su lugar) y la mesa pasa al siguiente que sí puede verla. Si no la toma, la retención vence y la mesa queda libre
     para el siguiente; su entrada se cierra.
   - Pasó la hora (o ya no se puede pedir, o el restaurante dejó de tomar reservaciones en línea): la entrada vence. Nada se borra (estados). */
type Bi = { es: string; en: string };
type Res = { ok: true } | { ok: false; msg: Bi };
const no = (es: string, en: string): Res => ({ ok: false, msg: { es, en } });
export const TOPE_ESPERA = 5;
const NUM = /^R-\d{1,10}$/;

type OpMesa = { id: string; biz: string; city: string; status: string; ymd: string; h: number; p: number };
type Q = { query: PoolClient["query"] } | ReturnType<typeof db>;
async function opDe(c: Q, userId: string, numero: string): Promise<OpMesa | null> {
  // Solo la solicitud de ESTA persona (nunca la de otra con el mismo número a mano).
  return (await (c as ReturnType<typeof db>).query<OpMesa>(
    `select o.id::text, o.business_id as biz, o.city_id as city, o.status, (o.scheduled_at at time zone ci.timezone)::date::text as ymd,
            (extract(hour from o.scheduled_at at time zone ci.timezone) * 60 + extract(minute from o.scheduled_at at time zone ci.timezone))::int as h, o.party_size as p
       from operations o join cities ci on ci.id = o.city_id where o.number = $1 and o.user_id = $2::uuid and o.kind = 'table'`, [numero, userId])).rows[0] ?? null;
}

/* Lo que la pantalla «no pudo» muestra de la lista de espera de ESTA solicitud. */
export type EsperaVista =
  | { st: "no" }
  | { st: "puede"; min: number }
  | { st: "anotada"; id: string; min: number }
  | { st: "ofrecida"; id: string; hold: string; seg: number; min: number };
/* Cuántos minutos se guarda la mesa que se libera (Configuración › Avisos). */
const minutosEspera = () => valor("rsv_espera_min");
export async function esperaDeMesa(userId: string, numero: string): Promise<EsperaVista> {
  if (!NUM.test(numero)) return { st: "no" };
  const o = await opDe(db(), userId, numero);
  if (!o || (o.status !== "declined" && o.status !== "expired")) return { st: "no" };
  const w = (await db().query<{ id: string; status: string; hold: string | null; seg: number | null; min: number | null }>(
    `select w.id::text, w.status, w.hold_id::text as hold,
            (select greatest(0, floor(extract(epoch from h.expires_at - now())))::int from reservation_holds h where h.id = w.hold_id and h.user_id = w.user_id and h.expires_at > now()) as seg,
            (select greatest(1, round(extract(epoch from h.expires_at - h.created_at) / 60))::int from reservation_holds h where h.id = w.hold_id) as min
       from reservation_waitlist w where w.operation_id = $1::bigint and w.user_id = $2::uuid order by w.id desc limit 1`, [o.id, userId])).rows[0];
  if (w?.status === "waiting") return { st: "anotada", id: w.id, min: await minutosEspera() };
  if (w?.status === "offered" && w.hold && w.seg) return { st: "ofrecida", id: w.id, hold: w.hold, seg: w.seg, min: w.min ?? 10 };
  if (w?.status === "taken") return { st: "no" };
  const m = await motorMesa(db(), o.biz);
  if (!m) return { st: "no" };
  return (await m.estado(o.ymd, o.h, o.p, "")).st === "llena" ? { st: "puede", min: await minutosEspera() } : { st: "no" };
}

/* «Avísame si se libera a esa hora»: anotar a quien hizo la solicitud que no se pudo. */
export async function anotarEspera(userId: string, numero: string): Promise<Res> {
  if (!NUM.test(numero)) return no("Esa reservación no existe.", "That reservation does not exist.");
  const o0 = await opDe(db(), userId, numero);
  if (!o0) return no("Esa reservación no existe.", "That reservation does not exist.");
  return tx(async (c) => {
    await c.query(`select pg_advisory_xact_lock(hashtext('mesa:' || $1))`, [o0.biz]);
    const o = await opDe(c, userId, numero);
    if (!o || (o.status !== "declined" && o.status !== "expired")) return no("Esta reservación ya no tiene lista de espera.", "This reservation no longer has a waitlist.");
    const m = await motorMesa(c, o.biz);
    if (!m) return no("Este restaurante no toma reservaciones en línea.", "This restaurant does not take online reservations.");
    const e = await m.estado(o.ymd, o.h, o.p, "");
    if (e.st === "libre") return no("A esa hora ya hay mesa: elígela otra vez y resérvala.", "There is a table at that time now: pick it again and book it.");
    if (e.st === "no") return no("Esa hora ya no se puede reservar.", "That time can no longer be booked.");
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from reservation_waitlist where user_id = $1::uuid and status = 'waiting'`, [userId])).rows[0]?.n ?? 0;
    if (n >= TOPE_ESPERA) return no(`Ya esperas ${TOPE_ESPERA} mesas. Quita una en Mi cuenta › Avisos para anotarte aquí.`, `You are already waiting for ${TOPE_ESPERA} tables. Remove one in My account › Notifications to join here.`);
    // Una mesa que se le guardó antes y no tomó (la retención venció) se cierra: vuelve a la fila, al final.
    await c.query(
      `update reservation_waitlist w set status = 'expired', ended_at = now() where w.user_id = $1::uuid and w.operation_id = $2::bigint and w.status = 'offered'
          and not exists (select 1 from reservation_holds h where h.id = w.hold_id and h.expires_at > now())`, [userId, o.id]);
    await c.query(
      `insert into reservation_waitlist (city_id, business_id, user_id, operation_id, day, at_min, starts_at, party_size, area)
       select o.city_id, o.business_id, o.user_id, o.id, $3::date, $4, o.scheduled_at, o.party_size, '' from operations o where o.id = $1::bigint and o.user_id = $2::uuid
       on conflict do nothing`, [o.id, userId, o.ymd, o.h]);
    return { ok: true };
  });
}

/* Salir de la lista («Quitar» en Mi cuenta › Avisos) o «No, gracias» a la mesa que se le guardó: la retención se suelta al momento. Solo la propia. */
export async function soltarEspera(userId: string, id: string): Promise<boolean> {
  if (!/^\d{1,18}$/.test(String(id))) return false;
  return tx(async (c) => {
    const w = (await c.query<{ hold: string | null }>(
      `update reservation_waitlist set status = 'left', ended_at = now() where id = $1::bigint and user_id = $2::uuid and status in ('waiting', 'offered') returning hold_id::text as hold`, [id, userId])).rows[0];
    if (!w) return false;
    if (w.hold) await c.query(`delete from reservation_holds where id = $1::uuid and user_id = $2::uuid`, [w.hold, userId]);
    return true;
  });
}

/* Mi cuenta › Avisos › Tus alertas: las mesas que la persona espera (y la que se le guardó, mientras siga guardada). */
export type MesaEsperada = { id: string; negocio: string; dia: Bi; hora: string; p: number; at: string; ofrecida: boolean };
export async function misEsperas(userId: string): Promise<MesaEsperada[]> {
  const r = await db().query<{ id: string; negocio: string; ymd: string; h: number; p: number; at: string; ofrecida: boolean }>(
    `select w.id::text, b.name as negocio, w.day::text as ymd, w.at_min as h, w.party_size as p, to_char(w.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at,
            w.status = 'offered' as ofrecida
       from reservation_waitlist w join businesses b on b.id = w.business_id
      where w.user_id = $1::uuid and w.starts_at > now()
        and (w.status = 'waiting' or (w.status = 'offered' and exists (select 1 from reservation_holds h where h.id = w.hold_id and h.expires_at > now())))
      order by w.starts_at limit 20`, [userId]);
  return r.rows.map((x) => ({ id: x.id, negocio: x.negocio, dia: fechaCorta(x.ymd), hora: hora(x.h), p: x.p, at: x.at, ofrecida: x.ofrecida }));
}

/* ── El barrido (cada minuto, lib/barrido.ts) ── */
const una = async (k: string) => ((await db().query(`insert into notif_once (key) values ($1) on conflict do nothing`, [k.slice(0, 200)])).rowCount ?? 0) > 0;
type Ofrecida = { id: string; uid: string; ymd: string; h: number; p: number; num: string | null; hold: string };
export async function barrerEsperaMesas(): Promise<number> {
  // Lo que pasó su hora vence; una mesa guardada que nadie tomó (la retención venció hace más de una hora) se cierra.
  await db().query(`update reservation_waitlist set status = 'expired', ended_at = now() where status = 'waiting' and starts_at < now()`);
  await db().query(
    `update reservation_waitlist w set status = 'expired', ended_at = now() where w.status = 'offered' and w.offered_at < now() - interval '1 hour'
        and not exists (select 1 from reservation_holds h where h.id = w.hold_id and h.expires_at > now())`);
  const negocios = (await db().query<{ b: string }>(`select distinct business_id as b from reservation_waitlist where status = 'waiting' and starts_at > now() limit 50`)).rows.map((x) => x.b);
  let n = 0;
  for (const b of negocios) n += await ofrecer(b).catch(() => 0);
  return n;
}

/* Un restaurante: con su candado, en el orden de la fila, a quien le quedó libre su hora se le guarda la mesa; luego, el aviso (una vez). */
async function ofrecer(negocio: string): Promise<number> {
  await vencerMesas({ negocio }); // una solicitud sin respuesta que venció deja de ocupar la mesa
  const r = await tx(async (c) => {
    await c.query(`select pg_advisory_xact_lock(hashtext('mesa:' || $1))`, [negocio]);
    const m = await motorMesa(c, negocio);
    if (!m) {
      // Ya no toma reservaciones en línea (lo apagó, lo pausó To'Latino, dejó Pro o cerró): la fila se cierra.
      await c.query(`update reservation_waitlist set status = 'expired', ended_at = now() where business_id = $1 and status = 'waiting'`, [negocio]);
      return null;
    }
    const L = (await c.query<{ id: string; uid: string; ymd: string; h: number; p: number; area: string; num: string | null; fuera: boolean; silencio: boolean }>(
      `select w.id::text, w.user_id::text as uid, w.day::text as ymd, w.at_min as h, w.party_size as p, w.area, o.number as num, u.status <> 'active' as fuera,
              (extract(hour from now() at time zone coalesce(uc.timezone, 'America/New_York')) not between 7 and 21 and coalesce(u.notif_prefs->>'quiet', '') <> 'false') as silencio
         from reservation_waitlist w join users u on u.id = w.user_id left join cities uc on uc.id = u.home_city_id left join operations o on o.id = w.operation_id
        where w.business_id = $1 and w.status = 'waiting' and w.starts_at > now() order by w.created_at, w.id limit 100 for update of w`, [negocio])).rows;
    const out: Ofrecida[] = [];
    for (const w of L) {
      const e = await m.estado(w.ymd, w.h, w.p, w.area);
      if (e.st === "no" || w.fuera) { await c.query(`update reservation_waitlist set status = 'expired', ended_at = now() where id = $1::bigint and status = 'waiting'`, [w.id]); continue; }
      if (e.st !== "libre" || w.silencio) continue;
      // La mesa se guarda a nombre de ESTA persona (la dueña de la entrada); nadie más puede tomarla mientras dure.
      const hold = (await c.query<{ id: string }>(
        `insert into reservation_holds (business_id, user_id, starts_at, party_size, area, expires_at)
         select w.business_id, w.user_id, w.starts_at, w.party_size, $2, now() + make_interval(mins => cfg_int('rsv_espera_min'))
           from reservation_waitlist w where w.id = $1::bigint and w.status = 'waiting' returning id::text`, [w.id, e.area])).rows[0]?.id;
      if (!hold) continue;
      await c.query(`update reservation_waitlist set status = 'offered', offered_at = now(), hold_id = $2::uuid where id = $1::bigint and status = 'waiting'`, [w.id, hold]);
      m.ocupar(w.ymd, w.h, w.p, e.area);
      out.push({ id: w.id, uid: w.uid, ymd: w.ymd, h: w.h, p: w.p, num: w.num, hold });
    }
    return { out, nombre: m.x.name };
  });
  if (!r) return 0;
  const { avisar } = await import("./avisos"), min = await minutosEspera();
  let n = 0;
  for (const w of r.out) {
    if (!(await una(`rsv_libre:${w.id}`))) continue;
    const d = new Date(`${w.ymd}T12:00:00Z`);
    await avisar(w.uid, "rsv_libre", { negocio: r.nombre, dia: `${d.getUTCDate()}/${d.getUTCMonth() + 1}`, hora: hora(w.h), p: w.p, min },
      { href: `/n/${negocio}/reservar?hold=${w.hold}`, ref: ["table", w.num ?? `espera:${w.id}`] });
    n++;
  }
  return n;
}
