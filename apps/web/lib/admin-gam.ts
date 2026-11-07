import "server-only";
import type { Staff } from "./admin";
import { db } from "./db";
import { mesesDe } from "./tabla";

/* Super Admin · Gamification (ADM-GAM, Super Admin.dc.html secGam; fase5-comunidad.md §4 5f): Rangos (los 10, cuántos vecinos hay en
   cada uno en las ciudades de quien mira, renombrar ES/EN), Puntos (las reglas con su valor y el tope del día) y Tabla del Barrio (mes en
   curso y anterior por ciudad, con excluidos, premios y «Cerrar el mes»). Monedas, Cupones y El Patio no están aquí todavía (5g; El Patio
   después de la apertura, decisión G). «Rango del negocio» no se construye (§6 #23). Lo llama la página después de requerir("gam"). */
type Bi = { es: string; en: string };
export type FilaGamTabla = { id: string; nombre: string; puntos: number; recs: number; resp: number; pos: number | null; excluido: boolean; motivo: string | null; general: boolean; premio: number };
export type Gam = {
  rangos: { n: number; name: Bi; req: Bi; unl: Bi; min: number | null; patio: boolean; vecinos: number; editado: boolean }[];
  reglas: { key: string; label: Bi; v: number; on: boolean; editado: boolean }[]; tope: number;
  ciudades: { id: string; name: string }[]; ciudad: string;
  tabla: { mes: string; actual: string; anterior: string; cerrada: { at: string; por: string | null; canjes: number } | null; congelada: boolean; dia: number; filas: FilaGamTabla[] };
};

export async function gamificacion(s: Staff, q: { ciudad?: string; mes?: string }): Promise<Gam> {
  const cs = (await db().query<{ id: string; name: string }>(`select id, name from cities where status <> 'off' and ($1::text[] = '{}' or id = any($1)) order by sort, name`, [s.cities])).rows;
  const ciudad = cs.find((c) => c.id === q.ciudad)?.id ?? cs.find((c) => c.id === "hzl")?.id ?? cs[0]?.id ?? "hzl";
  const M = (await mesesDe(ciudad))!;
  const mes = q.mes === "anterior" ? M.anterior : M.actual;
  const [R, P, T, C, A] = await Promise.all([
    db().query<{ n: number; name: Bi; req: Bi; unl: Bi; min: number | null; patio: boolean; vecinos: number; editado: boolean }>(
      `select r.level as n, r.name, r.requirement as req, r.unlocks as unl, r.min_points as min, r.patio, r.updated_by is not null as editado,
              (select count(*)::int from community_profiles cp join users u on u.id = cp.user_id where cp.rank_level = r.level and ($1::text[] = '{}' or u.home_city_id = any($1))) as vecinos
         from ranks r order by r.level`, [s.cities]),
    db().query<{ key: string; label: Bi; v: number; on: boolean; editado: boolean }>(`select key, label, points as v, enabled as on, updated_by is not null as editado from points_rules order by sort`),
    db().query<{ id: string; first_name: string | null; last_name: string | null; puntos: number; recs: number; resp: number; pos: number | null; excluido: boolean; motivo: string | null; general: boolean; premio: number }>(
      `select mb.user_id::text as id, u.first_name, u.last_name, mb.points as puntos, mb.recs, mb.answers as resp, mb.position as pos, mb.excluded as excluido, mb.excluded_reason as motivo, mb.seat as general, mb.prize_coins as premio
         from monthly_boards mb join users u on u.id = mb.user_id where mb.city_id = $1 and mb.month = $2::date and (mb.points > 0 or mb.excluded)
        order by mb.points desc, mb.user_id limit 100`, [ciudad, mes]),
    db().query<{ at: string | null; por: string | null; canjes: number }>(
      `select to_char(b.closed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), '') as por, coalesce((b.report ->> 'canjes')::int, 0) as canjes
         from board_closures b left join users u on u.id = b.closed_by where b.city_id = $1 and b.month = $2::date`, [ciudad, mes]),
    db().query<{ tope: number }>(`select pts_tope() as tope`),
  ]);
  const c = C.rows[0];
  return {
    rangos: R.rows, reglas: P.rows, tope: A.rows[0]!.tope, ciudades: cs, ciudad,
    tabla: { mes: q.mes === "anterior" ? "anterior" : "actual", actual: M.actual, anterior: M.anterior, cerrada: c?.at ? { at: c.at, por: c.por, canjes: c.canjes } : null, congelada: !!c, dia: M.dia,
      filas: T.rows.map((x) => ({ id: x.id, nombre: `${x.first_name ?? ""} ${x.last_name ?? ""}`.trim() || "Vecino", puntos: x.puntos, recs: x.recs, resp: x.resp, pos: x.pos, excluido: x.excluido, motivo: x.motivo, general: x.general, premio: x.premio })) },
  };
}

/* Usuarios 360° › Comunidad › Puntos: total, hoy, este mes, rango y lo que pide el siguiente, y los últimos 12 movimientos (con quién del
   equipo y el motivo cuando es un ajuste). */
export async function puntos360(userId: string) {
  const [p, L] = await Promise.all([
    db().query<{ total: number; hoy: number; mes: number; n: number; piso: number; name: Bi; sig: Bi | null; req: Bi | null; tope: number }>(
      `select coalesce(cp.points_total, 0) as total,
              case when cp.points_day = (now() at time zone coalesce(c.timezone, 'America/New_York'))::date then cp.points_today else 0 end as hoy,
              case when cp.points_month_key = date_trunc('month', (now() at time zone coalesce(c.timezone, 'America/New_York'))::date)::date then cp.points_month else 0 end as mes,
              coalesce(cp.rank_level, 1) as n, coalesce(cp.rank_floor, 1) as piso, r.name, s.name as sig, s.requirement as req, pts_tope() as tope
         from users u left join community_profiles cp on cp.user_id = u.id left join cities c on c.id = u.home_city_id
         left join ranks r on r.level = coalesce(cp.rank_level, 1) left join ranks s on s.level = coalesce(cp.rank_level, 1) + 1 where u.id = $1`, [userId]),
    db().query<{ id: string; delta: number; motive: string; rule: string; label: Bi | null; reason: string | null; quien: string | null; at: string }>(
      `select e.id::text, e.delta, e.motive, e.rule_key as rule, r.label, e.reason, nullif(trim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, '')), '') as quien,
              to_char(e.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
         from points_entries e join users u on u.id = e.user_id left join points_rules r on r.key = e.rule_key left join users s on s.id = e.by_staff
        where e.user_id = $1 order by e.id desc limit 12`, [userId]),
  ]);
  return { ...p.rows[0]!, log: L.rows };
}
export type Puntos360 = Awaited<ReturnType<typeof puntos360>>;
