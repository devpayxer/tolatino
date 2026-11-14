import "server-only";
import type { Staff } from "../admin";
import { fechaLanding } from "../crecimiento/admin";
import { db } from "../db";
import { asistente, evidencia, regla, type Evidencia, type Regla } from "./apertura";
import { progresoAviso } from "./aviso";
import type { Bi, Estado } from "./comun";

/* 9i · Super Admin › Ciudades (ADM-CIUD; prototipo secCiud y cityDetail): el listado con la lista de espera y la regla de cada ciudad, y el detalle con su
   estado, la regla por categoría clave, los barrios, la zona horaria, el impuesto, la cuenta oficial, el equipo local, la beta, el asistente y el
   historial. Lee solo; las acciones están en lib/ciudades/apertura.ts. Siempre las ciudades de quien mira. Sin teléfonos completos: la beta muestra
   el nombre y los dos últimos números. */
const ISO = (c: string) => `to_char((${c}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const QUIEN = (a: string) => `nullif(trim(coalesce(${a}.first_name, '') || ' ' || left(coalesce(${a}.last_name, ''), 1)), '')`;

export type FilaCiudad = { id: string; name: string; state: string; status: Estado; espera: number; listos: number; meta: number; pct: number; barrios: number; abierta: string | null;
  paso: number; cierre: boolean; radio: number };
export async function listado(s: Staff) {
  const r = await db().query<FilaCiudad>(
    `select c.id, c.name, c.state, c.status, c.default_radius as radio, ${ISO("c.opened_at")} as abierta,
            (select count(distinct coalesce(w.user_id::text, w.device::text, w.id::text))::int from city_waitlist w where w.city_id = c.id and w.removed_at is null) as espera,
            (select count(*)::int from businesses b where b.city_id = c.id and b.status = 'active') as listos,
            coalesce(r.min_ready, 30) as meta,
            least(100, round(greatest((select count(*) from businesses b where b.city_id = c.id and b.status = 'active')::numeric / nullif(r.min_ready, 0),
                  (select count(distinct coalesce(w.user_id::text, w.device::text, w.id::text)) from city_waitlist w where w.city_id = c.id and w.removed_at is null)::numeric / nullif(r.min_waitlist, 0), 0) * 100))::int as pct,
            (select count(*)::int from zones z where z.city_id = c.id and z.retired_at is null and z.id <> c.id || '-centro') as barrios,
            coalesce((select max(st.step) from city_launch_steps st join city_launches l on l.id = st.launch_id where l.city_id = c.id and l.status = 'en_curso'), 0)::int as paso,
            exists (select 1 from city_close_requests x where x.city_id = c.id and x.status = 'pendiente') as cierre
       from cities c left join city_open_rules r on r.city_id = c.id
      where cardinality($1::text[]) = 0 or c.id = any($1::text[]) order by c.sort`, [s.cities]);
  const pedidas = s.cities.length ? [] : (await db().query<{ n: string; veces: number; ultima: string }>(
    `select min(city_name) as n, count(*)::int as veces, to_char(max(created_at) at time zone 'America/New_York', 'YYYY-MM-DD') as ultima
       from city_waitlist where city_id is null and removed_at is null group by lower(city_name) order by veces desc, ultima desc limit 12`)).rows;
  return { filas: r.rows, pedidas, fecha: await fechaLanding() };
}

/* El Inicio del Super Admin (9h → 9i): la lista de espera de las ciudades que vienen, sin personas. */
export async function esperaInicio(s: Staff) {
  const r = await db().query<{ id: string; name: string; status: Estado; n: number }>(
    `select c.id, c.name, c.status,
            (select count(distinct coalesce(w.user_id::text, w.device::text, w.id::text))::int from city_waitlist w where w.city_id = c.id and w.removed_at is null and w.notified_at is null) as n
       from cities c where c.status in ('soon', 'beta') and (cardinality($1::text[]) = 0 or c.id = any($1::text[])) order by c.sort`, [s.cities]);
  const cierres = (await db().query<{ n: number }>(`select count(*)::int as n from city_close_requests where status = 'pendiente' and (cardinality($1::text[]) = 0 or city_id = any($1::text[]))`, [s.cities])).rows[0]!.n;
  return { total: r.rows.reduce((a, x) => a + x.n, 0), ciudades: r.rows, cierres };
}

export type Barrio = { id: string; es: string; en: string; calleEs: string; calleEn: string; lat: number; lng: number; centro: boolean; retirado: boolean; editado: string | null };
export type Invitada = { id: string; nombre: string; tel: string; at: string; por: string | null; prueba: boolean };
export type Historial = { at: string; de: string; a: string; via: string; quien: string | null; motivo: string | null };
export type Cierre = { id: string; a: Estado; motivo: string; quien: string | null; at: string; mio: boolean };
export type DetalleCiudad = {
  id: string; name: string; state: string; status: Estado; tz: string; tax: string; radio: number; radios: number[]; zips: string[]; towns: { n: string }[];
  abierta: string | null; beta: string | null; cerrada: string | null; motivoCierre: string | null;
  regla: Regla; barrios: Barrio[]; oficial: Bi | null; equipo: { nombre: string; rol: string }[]; invitadas: Invitada[]; revision: number;
  asistente: Awaited<ReturnType<typeof asistente>>; actual: { paso: number; ev: Evidencia } | null; cierre: Cierre | null; historial: Historial[];
  aviso: Awaited<ReturnType<typeof progresoAviso>> | null; categorias: { k: string; es: string; en: string; n: number }[];
};

export async function detalle(s: Staff, id: string): Promise<DetalleCiudad | null> {
  if (!/^[a-z]{3}$/.test(id) || (s.cities.length && !s.cities.includes(id))) return null;
  const c = (await db().query<{ id: string; name: string; state: string; status: Estado; tz: string; tax: string; radio: number; radios: number[]; zips: string[]; towns: { n: string }[];
    abierta: string | null; beta: string | null; cerrada: string | null; motivo: string | null }>(
    `select id, name, state, status, timezone as tz, (tax_rate * 100)::numeric(5,2)::text as tax, default_radius as radio, radius_options as radios, zips, towns,
            ${ISO("opened_at")} as abierta, ${ISO("beta_at")} as beta, ${ISO("closed_at")} as cerrada, closed_reason as motivo from cities where id = $1`, [id])).rows[0];
  if (!c) return null;
  const [R, Z, O, E, I, rev, A, X, H, K] = await Promise.all([
    regla(id),
    db().query<Barrio>(
      `select z.id, z.name->>'es' as es, z.name->>'en' as en, coalesce(z.streets->>'es', '') as "calleEs", coalesce(z.streets->>'en', '') as "calleEn",
              st_y(z.center::geometry) as lat, st_x(z.center::geometry) as lng, z.id = z.city_id || '-centro' as centro, z.retired_at is not null as retirado, ${ISO("z.edited_at")} as editado
         from zones z where z.city_id = $1 and z.center is not null order by z.retired_at is not null, z.sort, z.id`, [id]),
    db().query<{ name: Bi }>(`select name from city_official_accounts where city_id = $1`, [id]),
    db().query<{ nombre: string; rol: string }>(
      `select ${QUIEN("u")} as nombre, r.name->>'es' as rol from staff_members m join users u on u.id = m.user_id join staff_roles r on r.key = m.role
        where m.status = 'active' and $1 = any(m.cities) order by r.sort, u.first_name`, [id]),
    db().query<Invitada>(
      `select i.id::text, coalesce(${QUIEN("u")}, 'Sin nombre') as nombre, '··' || right(u.phone, 2) as tel, ${ISO("i.created_at")} as at, ${QUIEN("a")} as por, i.is_test as prueba
         from city_beta_invites i join users u on u.id = i.user_id left join users a on a.id = i.invited_by
        where i.city_id = $1 and i.revoked_at is null order by i.id desc limit 200`, [id]),
    db().query<{ n: number }>(`select count(*)::int as n from review_accounts where active`),
    asistente(id),
    db().query<Cierre>(
      `select x.id::text, x.to_status as a, x.reason as motivo, ${QUIEN("u")} as quien, ${ISO("x.requested_at")} as at, x.requested_by = $2::uuid as mio
         from city_close_requests x left join users u on u.id = x.requested_by where x.city_id = $1 and x.status = 'pendiente'`, [id, s.id]),
    db().query<Historial>(
      `select ${ISO("h.at")} as at, h.from_status as de, h.to_status as a, h.via, ${QUIEN("u")} as quien, h.reason as motivo
         from city_status_log h left join users u on u.id = h.actor where h.city_id = $1 order by h.id desc limit 20`, [id]),
    db().query<{ k: string; es: string; en: string; n: number }>(
      `select k.id as k, k.short->>'es' as es, k.short->>'en' as en, count(b.id)::int as n from categories k left join businesses b on b.category_id = k.id and b.city_id = $1 and b.status = 'active'
        where k.status = 'on' group by k.id, k.short, k.sort order by count(b.id) desc, k.sort`, [id]),
  ]);
  const hecho = A.lanzamiento?.status === "en_curso" ? A.pasos.length : 0;
  const actual = (c.status === "soon" || c.status === "beta") ? { paso: hecho + 1, ev: await evidencia(id, hecho + 1) } : null;
  return {
    ...c, cerrada: c.cerrada, motivoCierre: c.motivo, regla: R, barrios: Z.rows, oficial: O.rows[0]?.name ?? null, equipo: E.rows, invitadas: I.rows, revision: rev.rows[0]?.n ?? 0,
    asistente: A, actual, cierre: X.rows[0] ?? null, historial: H.rows, aviso: c.status === "on" ? await progresoAviso(id) : null, categorias: K.rows,
  };
}
