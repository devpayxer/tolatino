import "server-only";
import type { Staff } from "./admin";
import { db } from "./db";
import { equipo, incidencias, resumenFecha, ultimos } from "./puerta";
import { hora12, type Bi, type Resultado, type Resumen } from "./puerta-comun";

/* 6g · Super Admin › Eventos y boletos › Modo puerta (secEvt L1005–1056: «en solo lectura, para disputas de "me cobraron y no entré"»):
   las puertas abiertas ahora y las fechas recientes con escaneos (ADENTRO · FALTAN · RECHAZADOS · REPETIDOS), y de una fecha: los últimos
   en la puerta, las sesiones de portero, las incidencias y cada escaneo de un boleto (auditoría de check-ins: quién escaneó qué y cuándo).
   Solo lectura; las ciudades del equipo limitan lo que se ve. Sin teléfonos ni montos. */
const ID = /^\d{1,18}$/;
const CIUDAD = `(cardinality($1::text[]) = 0 or d.city_id = any($1::text[]))`;
export type PuertaAdm = { fecha: string; titulo: Bi; negocio: string; ciudad: string; dia: string; h0: string; abiertas: number; r: Resumen; ahora: boolean };
export async function puertasAdmin(s: Staff): Promise<{ ahora: PuertaAdm[]; recientes: PuertaAdm[] }> {
  const r = (await db().query<{ fecha: string; titulo: Bi; negocio: string; ciudad: string; dia: string; h0: string; abiertas: number; ahora: boolean }>(
    `select d.id::text as fecha, e.title as titulo, b.name as negocio, c.name as ciudad, d.local_date::text as dia, to_char(d.starts_at at time zone c.timezone, 'HH24:MI') as h0,
            (select count(*) from door_sessions x where x.event_date_id = d.id and x.ended_at is null)::int as abiertas,
            now() between d.doors_at - make_interval(hours => cfg_int('puerta_ventana_h')) and d.ends_at + make_interval(hours => cfg_int('puerta_ventana_h')) as ahora
       from event_dates d join events e on e.id = d.event_id join businesses b on b.id = e.business_id join cities c on c.id = d.city_id
      where ${CIUDAD} and d.status in ('scheduled', 'done')
        and ((now() between d.doors_at - make_interval(hours => cfg_int('puerta_ventana_h')) and d.ends_at + make_interval(hours => cfg_int('puerta_ventana_h'))
              and (exists (select 1 from door_sessions x where x.event_date_id = d.id) or e.entry <> 'free'))
          or (d.starts_at > now() - interval '7 days' and d.starts_at < now() and exists (select 1 from door_counts k where k.event_date_id = d.id)))
      order by d.starts_at desc limit 60`, [s.cities])).rows;
  const R = await Promise.all(r.map((x) => resumenFecha(x.fecha)));
  const L = r.map((x, i) => ({ ...x, h0: hora12(x.h0), r: R[i]! }));
  return { ahora: L.filter((x) => x.ahora), recientes: L.filter((x) => !x.ahora) };
}
export async function puertaAdmin(s: Staff, fecha: string) {
  if (!ID.test(String(fecha ?? ""))) return null;
  const x = (await db().query<{ fecha: string; evento: string; titulo: Bi; negocio: string; nid: string; ciudad: string; tz: string; dia: string; h0: string }>(
    `select d.id::text as fecha, e.id::text as evento, e.title as titulo, b.name as negocio, b.id as nid, c.name as ciudad, c.timezone as tz, d.local_date::text as dia, to_char(d.starts_at at time zone c.timezone, 'HH24:MI') as h0
       from event_dates d join events e on e.id = d.event_id join businesses b on b.id = e.business_id join cities c on c.id = d.city_id where d.id = $2::bigint and ${CIUDAD}`, [s.cities, fecha])).rows[0];
  if (!x) return null;
  const [r, ult, eq, inc, pu] = await Promise.all([resumenFecha(fecha), ultimos(fecha, x.tz, true, 30), equipo(fecha, x.tz), incidencias(fecha, x.tz),
    db().query<{ puerta: string; adentro: number; entraron: number; rechazados: number; repetidos: number }>(`select door_name as puerta, inside_n as adentro, entered_n as entraron, rejected_n as rechazados, dup_n as repetidos from door_counts where event_date_id = $1::bigint order by entered_n desc`, [fecha])]);
  return { ...x, h0: hora12(x.h0), r, ultimos: ult, equipo: eq, incidencias: inc, puertas: pu.rows };
}
/* Cada escaneo de un boleto (la ficha del boleto en el Super Admin): resultado, puerta, quién y cuándo. */
export async function escaneosBoleto(s: Staff, code: string) {
  if (!/^TL-[A-HJ-NP-Z2-9]{3}-[2-9]{4}$/.test(String(code ?? ""))) return [];
  return (await db().query<{ res: Resultado; dir: string; k: number; puerta: string; quien: string; hora: string; dia: string; motivo: string | null; offline: boolean }>(
    `select x.result as res, x.direction as dir, x.admits_n as k, x.door_name as puerta, coalesce(f.display_name, nullif(u.first_name, ''), 'Equipo') as quien,
            to_char(x.at_server at time zone c.timezone, 'HH24:MI') as hora, (x.at_server at time zone c.timezone)::date::text as dia, x.manual_reason as motivo, x.offline
       from ticket_scans x join tickets t on t.id = x.ticket_id join cities c on c.id = x.city_id join door_sessions ss on ss.id = x.session_id
       left join door_staff f on f.id = ss.door_staff_id left join users u on u.id = x.user_id
      where t.code = $2 and (cardinality($1::text[]) = 0 or t.city_id = any($1::text[])) order by x.at_server limit 100`, [s.cities, code])).rows.map((z) => ({ ...z, hora: hora12(z.hora) }));
}
