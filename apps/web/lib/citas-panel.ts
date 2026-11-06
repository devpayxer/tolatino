import "server-only";
import { db } from "./db";
import { vencerCitas } from "./citas-flujo";

/* Citas en el panel del negocio (Panel v2 · reqRow/detBlocks k='cita', Hoy y Clientes). El servidor decide el estado:
   antes de leer se vencen las que nadie contestó. Con sillas rentadas cada barbero ve las suyas y el dueño todas. */
type Bi = { es: string; en: string };
export type StCita = "pend" | "ok" | "alt" | "in" | "road" | "work" | "ready" | "done" | "nos" | "no" | "exp" | "cx"; // road/work/ready: Auto y Hogar (4c)
export type FilaCita = {
  numero: string; who: string; svc: Bi; ymd: string; dia: number; m: number; dur: number; st: StCita; con: string | null; dep: number; chg: boolean; late: number | null; hace: number;
  rubro: "auto" | "hogar" | null; // obligatorio: un campo opcional se pierde en silencio al copiar fila por fila
};
export type FiltroCita = "all" | "pend" | "cur" | "done" | "no";
const ST = `case when o.status = 'pending' then 'pend' when o.status = 'change_proposed' then 'alt'
                 when o.status = 'confirmed' and o.status_detail in ('live', 'in') then 'in' when o.status = 'confirmed' and o.status_detail in ('road', 'work', 'ready') then o.status_detail when o.status = 'confirmed' then 'ok'
                 when o.status = 'done' and o.status_detail = 'noshow' then 'nos' when o.status = 'done' then 'done'
                 when o.status = 'declined' then 'no' when o.status = 'expired' then 'exp' else 'cx' end`;
const COLS = `o.number as numero, trim(coalesce(u.first_name, '') || ' ' || coalesce(left(u.last_name, 1) || '.', '')) as who, coalesce(o.details->'svc', '{"es":"","en":""}'::jsonb) as svc,
              (o.scheduled_at at time zone c.timezone)::date::text as ymd, ((o.scheduled_at at time zone c.timezone)::date - (now() at time zone c.timezone)::date)::int as dia,
              (extract(hour from o.scheduled_at at time zone c.timezone) * 60 + extract(minute from o.scheduled_at at time zone c.timezone))::int as m, coalesce(o.duration_min, 30) as dur,
              ${ST} as st, m.display_name as con, o.deposit_cents as dep,
              exists (select 1 from change_proposals p where p.operation_id = o.id and p.side = 'customer' and p.status = 'open') as chg,
              (o.details->>'late')::int as late, floor(extract(epoch from now() - o.sent_at) / 60)::int as hace, o.details->>'rubro' as rubro`;
const DESDE = `from operations o join cities c on c.id = o.city_id and o.kind = 'appointment' join users u on u.id = o.user_id left join business_members m on m.id = o.member_id`;

/* Lo vivo: pendientes, otra hora propuesta y confirmadas de hoy en adelante (Hoy y la agenda). */
export async function citasVivas(negocio: string): Promise<FilaCita[]> {
  await vencerCitas({ negocio });
  return (await db().query<FilaCita>(
    `select ${COLS} ${DESDE}
      where o.business_id = $1 and o.kind = 'appointment' and (o.status in ('pending', 'change_proposed') or (o.status = 'confirmed' and o.scheduled_at > now() - interval '12 hours'))
      order by (o.status = 'pending') desc, o.scheduled_at limit 200`, [negocio])).rows;
}
export async function citasPendientes(negocio: string) {
  return (await db().query<{ n: number }>(`select count(*)::int as n from operations where business_id = $1 and kind = 'appointment' and status = 'pending'`, [negocio])).rows[0]?.n ?? 0;
}

/* Clientes › Citas: por estado, buscar por nombre o número, paginado por cursor (id). */
export async function citasLista(negocio: string, f: FiltroCita, q: string, antes: string | null) {
  await vencerCitas({ negocio });
  const W: Record<FiltroCita, string> = {
    all: "true", pend: "o.status in ('pending', 'change_proposed')", cur: "o.status = 'confirmed'", done: "o.status = 'done' and coalesce(o.status_detail, '') <> 'noshow'",
    no: "(o.status in ('declined', 'expired', 'cancelled') or o.status_detail = 'noshow')",
  };
  const r = await db().query<FilaCita & { id: string }>(
    `select o.id::text, ${COLS} ${DESDE}
      where o.business_id = $1 and o.kind = 'appointment' and ${W[f] ?? "true"} and ($3::bigint is null or o.id < $3::bigint)
        and ($2 = '' or o.number ilike '%' || $2 || '%' or u.first_name ilike $2 || '%' or u.last_name ilike $2 || '%')
      order by o.id desc limit 31`, [negocio, q.trim().slice(0, 40), antes && /^\d{1,18}$/.test(antes) ? antes : null]);
  const filas = r.rows.slice(0, 30);
  return { filas: filas.map(({ id: _id, ...x }) => x), mas: r.rows.length > 30 ? filas[filas.length - 1]!.id : null, pend: await citasPendientes(negocio) };
}

/* El detalle de una cita para el negocio. */
export type CitaPanel = FilaCita & {
  tel: string | null; nota: string | null; para: string; nombre: string | null; edad: string | null; opts: { g: Bi; o: Bi; p: number }[]; adds: { name: Bi; cents: number }[];
  total: number; pago: string | null; fotos: string[]; responde: string | null; alt: { ymd: string; m: number; hasta: string } | null; cambio: { ymd: string; m: number; hasta: string } | null;
  tl: { t: Bi; at: string }[]; auto: boolean;
  of: { veh: string | null; mi: number | null; casa: string | null; inq: boolean; w: string | null; win: number | null; luces: string[]; area: string | null; acceso: string | null; accesoNota: string | null; piezas: boolean } | null;
};
export async function citaPanel(negocio: string, numero: string): Promise<CitaPanel | null> {
  if (!/^C-\d{1,10}$/.test(numero)) return null;
  await vencerCitas({ negocio, numero });
  const r = (await db().query<FilaCita & { id: string; nota: string | null; det: Record<string, unknown>; total: number; pago: string | null; fotos: string[]; responde: string | null; tz: string; auto: boolean;
    alt: { ymd: string; m: number } | null; alt_hasta: string | null; chgp: { ymd: string; m: number } | null; chg_hasta: string | null }>(
    `select o.id::text, ${COLS}, o.customer_note as nota, o.details as det, o.total_cents as total, p.status as pago, c.timezone as tz,
            coalesce(case when b.svc_model = 'chair' then m.chair_auto end, bp.auto_approve, false) as auto,
            array(select x.url from media x where x.owner_kind = 'appointment' and x.owner_id = o.id::text and x.status = 'visible' order by x.sort) as fotos,
            to_char(o.respond_by at time zone c.timezone, 'FMHH12:MI AM') as responde,
            (select q.proposed from change_proposals q where q.operation_id = o.id and q.side = 'business' and q.status = 'open' order by q.id desc limit 1) as alt,
            (select to_char(q.respond_by at time zone c.timezone, 'FMHH12:MI AM') from change_proposals q where q.operation_id = o.id and q.side = 'business' and q.status = 'open' order by q.id desc limit 1) as alt_hasta,
            (select q.proposed from change_proposals q where q.operation_id = o.id and q.side = 'customer' and q.status = 'open' order by q.id desc limit 1) as chgp,
            (select to_char(q.respond_by at time zone c.timezone, 'FMHH12:MI AM') from change_proposals q where q.operation_id = o.id and q.side = 'customer' and q.status = 'open' order by q.id desc limit 1) as chg_hasta
       ${DESDE} join businesses b on b.id = o.business_id left join booking_policies bp on bp.business_id = o.business_id left join payments p on p.operation_id = o.id and p.kind = 'deposit'
      where o.business_id = $1 and o.number = $2 and o.kind = 'appointment'`, [negocio, numero])).rows[0];
  if (!r) return null;
  const tl = (await db().query<{ kind: string; note: Bi | null; at: string }>(
    `select e.kind, e.note, to_char(e.at at time zone $2, 'FMHH12:MI AM · FMDD/FMMM') as at from operation_events e where e.operation_id = $1::bigint order by e.at, e.id`, [r.id, r.tz])).rows;
  const K: Record<string, Bi> = {
    sent: { es: "Pidió la cita", en: "Booking requested" }, accepted: { es: "Confirmada", en: "Confirmed" }, declined: { es: "No se pudo", en: "Declined" }, expired: { es: "Venció sin respuesta", en: "Expired without reply" },
    change_proposed: { es: "Propusiste otra hora", en: "You proposed another time" }, alt_accepted: { es: "Aceptó la otra hora", en: "Accepted the new time" }, alt_declined: { es: "No aceptó la otra hora", en: "Declined the new time" },
    alt_expired: { es: "Venció la otra hora", en: "The new time expired" }, cancelled: { es: "Canceló", en: "Cancelled" }, late: { es: "Avisó que llega tarde", en: "Said they are late" },
    arrived: { es: "Llegó · en atención", en: "Arrived · in progress" }, on_the_way: { es: "Va en camino", en: "On the way" }, received: { es: "Recibió el carro", en: "Car received" },
    started: { es: "Empezó el trabajo", en: "Work started" }, ready: { es: "Listo", en: "Ready" }, noshow: { es: "No llegó", en: "No-show" }, done: { es: "Terminada", en: "Done" },
    changed: { es: "Cambió la hora", en: "Changed the time" }, change_requested: { es: "Pidió cambiar la hora", en: "Asked to change the time" }, change_accepted: { es: "Aceptaste el cambio", en: "You accepted the change" },
    change_declined: { es: "No se pudo el cambio", en: "Change declined" }, payment_captured: { es: "Depósito cobrado", en: "Deposit charged" }, payment_released: { es: "Depósito liberado", en: "Deposit released" }, refunded: { es: "Depósito devuelto", en: "Deposit refunded" },
  };
  const d = r.det as { opts?: CitaPanel["opts"]; adds?: CitaPanel["adds"]; para?: string; nombre?: string | null; edad?: string | null; veh?: { t: string; mi?: number | null }; casa?: { dir: string; tenure: string }; w?: string; win?: number; luces?: string[]; area?: string | null; acceso?: string; accesoNota?: string | null; piezas?: boolean };
  const tel = (await db().query<{ tel: string | null }>(`select case when o.status in ('confirmed', 'done') then u.phone end as tel from operations o join users u on u.id = o.user_id where o.id = $1::bigint`, [r.id])).rows[0]?.tel ?? null;
  return {
    numero: r.numero, who: r.who, svc: r.svc, ymd: r.ymd, dia: r.dia, m: r.m, dur: r.dur, st: r.st, con: r.con, dep: r.dep, chg: r.chg, late: r.late, hace: r.hace, rubro: (r as { rubro?: "auto" | "hogar" | null }).rubro ?? null,
    tel, nota: r.nota, para: d.para ?? "me", nombre: d.nombre ?? null, edad: d.edad ?? null, opts: d.opts ?? [], adds: d.adds ?? [], total: r.total, pago: r.pago, fotos: r.fotos ?? [], responde: r.responde, auto: r.auto,
    alt: r.alt ? { ymd: r.alt.ymd, m: r.alt.m, hasta: r.alt_hasta ?? "" } : null, cambio: r.chgp ? { ymd: r.chgp.ymd, m: r.chgp.m, hasta: r.chg_hasta ?? "" } : null,
    tl: tl.map((e) => ({ t: e.note ?? K[e.kind] ?? { es: e.kind, en: e.kind }, at: e.at })),
    of: d.veh || d.casa ? { veh: d.veh?.t ?? null, mi: d.veh?.mi ?? null, casa: d.casa?.dir ?? null, inq: d.casa?.tenure === "inq", w: d.w ?? null, win: d.win ?? null, luces: d.luces ?? [], area: d.area ?? null, acceso: d.acceso ?? null, accesoNota: d.accesoNota ?? null, piezas: !!d.piezas } : null,
  };
}
