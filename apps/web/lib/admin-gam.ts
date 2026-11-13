import "server-only";
import type { Staff } from "./admin";
import { db } from "./db";
import { mesesDe } from "./tabla";

/* Super Admin · Gamification (ADM-GAM, Super Admin.dc.html secGam; fase5-comunidad.md §4 5f): Rangos (los 10, cuántos vecinos hay en
   cada uno en las ciudades de quien mira, renombrar ES/EN), Puntos (las reglas con su valor y el tope del día) y Tabla del Barrio (mes en
   curso y anterior por ciudad, con excluidos, premios y «Cerrar el mes»), Monedas (5g: EN CIRCULACIÓN · EMITIDAS ESTE MES · CANJEADAS ·
   VALOR «Sin valor en dinero», las reglas de ganancia y los últimos movimientos; el ajuste ± va en Usuarios 360° › Comunidad) y Cupones
   (5g: por aprobar · en la Comunidad · pausados · terminados, por ciudad, con sus canjes). El Patio, después de la apertura (decisión G).
   «Rango del negocio» no se construye (§6 #23). Lo llama la página después de requerir("gam"). Listas con cursor (id), sin offset. */
type Bi = { es: string; en: string };
export type FilaGamTabla = { id: string; nombre: string; puntos: number; recs: number; resp: number; pos: number | null; excluido: boolean; motivo: string | null; general: boolean; premio: number };
export type Gam = {
  rangos: { n: number; name: Bi; req: Bi; unl: Bi; min: number | null; patio: boolean; vecinos: number; editado: boolean }[];
  reglas: { key: string; label: Bi; v: number; on: boolean; editado: boolean }[]; tope: number;
  ciudades: { id: string; name: string }[]; ciudad: string;
  tabla: { mes: string; actual: string; anterior: string; cerrada: { at: string; por: string | null; canjes: number } | null; congelada: boolean; dia: number; filas: FilaGamTabla[] };
  monedas: GamMonedas | null; cupones: GamCupones | null;
};
export type GamMonedas = {
  circulacion: number; emitidas: number; canjeadas: { codigos: number; monedas: number }; devueltas: number;
  reglas: { key: string; label: Bi; v: number; on: boolean; editado: boolean }[];
  log: { id: string; persona: string; uid: string; motivo: string; delta: number; razon: string | null; quien: string | null; at: string }[];
};
export type EstadoCuponAdm = "pending" | "live" | "paused" | "ended";
export type FilaCuponAdm = { id: string; negocio: string; bid: string; titulo: Bi; condiciones: Bi; costo: number | null; cupo: number; dias: number; estado: EstadoCuponAdm;
  pausaPor: string | null; motivo: string | null; mes: number; usados: number; vivos: number; creado: string };
export type GamCupones = {
  estado: EstadoCuponAdm; conteo: Record<EstadoCuponAdm, number>; filas: FilaCuponAdm[]; mas: string | null;
  canjes: { id: string; codigo: string; titulo: Bi; negocio: string; persona: string; estado: "issued" | "used" | "expired"; costo: number; at: string; usado: string | null }[];
};

export async function gamificacion(s: Staff, q: { ciudad?: string; mes?: string; tab?: string; estado?: string; cursor?: string }): Promise<Gam> {
  const cs = (await db().query<{ id: string; name: string }>(`select id, name from cities where status <> 'off' and ($1::text[] = '{}' or id = any($1)) order by sort, name`, [s.cities])).rows;
  const ciudad = cs.find((c) => c.id === q.ciudad)?.id ?? cs.find((c) => c.id === "hzl")?.id ?? cs[0]?.id ?? "hzl";
  const M = (await mesesDe(ciudad))!;
  const mes = q.mes === "anterior" ? M.anterior : M.actual;
  const [R, P, T, C, A] = await Promise.all([
    db().query<{ n: number; name: Bi; req: Bi; unl: Bi; min: number | null; patio: boolean; vecinos: number; editado: boolean }>(
      `select r.level as n, r.name, r.requirement as req, r.unlocks as unl, r.min_points as min, r.patio, r.updated_by is not null as editado,
              (select coalesce(sum(x.vecinos), 0)::int from com_rangos_ciudad x where x.rank_level = r.level and ($1::text[] = '{}' or x.city_id = any($1))) as vecinos
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
  const [monedas, cupones] = await Promise.all([q.tab === "coin" ? monedasAdm(s) : null, q.tab === "cup" ? cuponesAdm(ciudad, q.estado, q.cursor) : null]);
  return {
    monedas, cupones,
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

const ISO = (x: string) => `to_char((${x}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const nombre = (f: string | null, l: string | null) => `${f ?? ""} ${l ?? ""}`.trim() || "Vecino";
/* El inicio del mes de cada ciudad (su hora local), para «este mes». */
const MES_CIUDAD = (col: string) => `(select date_trunc('month', now() at time zone ci.timezone) at time zone ci.timezone from cities ci where ci.id = ${col})`;

/* Monedas (5g) en las ciudades de quien mira: el saldo de todos (derivado), lo emitido este mes (bienvenida, premios y ajustes +), lo
   canjeado en cupones este mes (códigos no vencidos) y lo devuelto por códigos vencidos; las reglas y los últimos 20 movimientos. */
async function monedasAdm(s: Staff): Promise<GamMonedas> {
  const cs = s.cities;
  const [K, E, X, D, R, L] = await Promise.all([
    // 9b-3 · EN CIRCULACIÓN y los vecinos por rango salen del resumen por ciudad (com_rangos_ciudad, cada 10 min): sumar 1 M de perfiles en cada
    // vista tardaba 1,8 s en la carga.
    db().query<{ n: number }>(`select coalesce(sum(monedas), 0)::int as n from com_rangos_ciudad where ($1::text[] = '{}' or city_id = any($1))`, [cs]),
    db().query<{ n: number }>(`select coalesce(sum(e.delta), 0)::int as n from coin_entries e where e.delta > 0 and e.reason_key in ('welcome', 'premio_mes', 'ajuste') and ($1::text[] = '{}' or e.city_id = any($1)) and e.created_at >= ${MES_CIUDAD("e.city_id")}`, [cs]),
    db().query<{ k: number; n: number }>(`select count(*)::int as k, coalesce(sum(r.cost_coins), 0)::int as n from coupon_redemptions r where r.status <> 'expired' and ($1::text[] = '{}' or r.city_id = any($1)) and r.created_at >= ${MES_CIUDAD("r.city_id")}`, [cs]),
    db().query<{ n: number }>(`select coalesce(sum(e.delta), 0)::int as n from coin_entries e where e.reason_key = 'devolucion' and ($1::text[] = '{}' or e.city_id = any($1)) and e.created_at >= ${MES_CIUDAD("e.city_id")}`, [cs]),
    db().query<{ key: string; label: Bi; v: number; on: boolean; editado: boolean }>(`select key, label, coins as v, enabled as on, updated_by is not null as editado from coin_rules order by sort`),
    db().query<{ id: string; uid: string; f: string | null; l: string | null; motivo: string; delta: number; razon: string | null; sf: string | null; sl: string | null; at: string }>(
      `select e.id::text, e.user_id::text as uid, u.first_name as f, u.last_name as l, e.reason_key as motivo, e.delta, e.reason as razon, st.first_name as sf, st.last_name as sl, ${ISO("e.created_at")} as at
         from coin_entries e join users u on u.id = e.user_id left join users st on st.id = e.by_staff
        where ($1::text[] = '{}' or e.city_id = any($1)) order by e.id desc limit 20`, [cs]),
  ]);
  return {
    circulacion: K.rows[0]!.n, emitidas: E.rows[0]!.n, canjeadas: { codigos: X.rows[0]!.k, monedas: X.rows[0]!.n }, devueltas: D.rows[0]!.n, reglas: R.rows,
    log: L.rows.map((x) => ({ id: x.id, uid: x.uid, persona: nombre(x.f, x.l), motivo: x.motivo, delta: x.delta, razon: x.razon, quien: x.sf || x.sl ? nombre(x.sf, x.sl) : null, at: x.at })),
  };
}

/* Cupones (5g) de una ciudad por estado, 30 por página con cursor (id), y los últimos 20 canjes de la ciudad. */
const ESTADOS: EstadoCuponAdm[] = ["pending", "live", "paused", "ended"];
async function cuponesAdm(ciudad: string, estado: string | undefined, cursor: string | undefined): Promise<GamCupones> {
  const e = (ESTADOS.find((x) => x === estado) ?? "pending") as EstadoCuponAdm, cur = cursor && /^\d{1,18}$/.test(cursor) ? cursor : null;
  const [N, L, C] = await Promise.all([
    db().query<{ status: EstadoCuponAdm; n: number }>(`select status, count(*)::int as n from coupons where city_id = $1 group by status`, [ciudad]),
    db().query<{ id: string; bname: string; bid: string; title: Bi; terms: Bi; cost: number | null; stock: number; dias: number; status: EstadoCuponAdm; pb: string | null; motivo: string | null; mes: number; usados: number; vivos: number; creado: string }>(
      `select c.id::text, b.name as bname, b.id as bid, c.title, c.terms, c.cost_coins as cost, c.monthly_stock as stock, c.valid_days as dias, c.status, c.paused_by as pb,
              coalesce(case when c.status = 'paused' then c.paused_reason end, case when c.status = 'ended' then c.ended_reason end) as motivo,
              (select count(*)::int from coupon_redemptions r where r.coupon_id = c.id and r.status <> 'expired' and r.created_at >= ${MES_CIUDAD("c.city_id")}) as mes,
              (select count(*)::int from coupon_redemptions r where r.coupon_id = c.id and r.status = 'used') as usados,
              (select count(*)::int from coupon_redemptions r where r.coupon_id = c.id and r.status = 'issued' and r.expires_at > now()) as vivos, ${ISO("c.created_at")} as creado
         from coupons c join businesses b on b.id = c.business_id where c.city_id = $1 and c.status = $2 and ($3::bigint is null or c.id < $3::bigint) order by c.id desc limit 31`, [ciudad, e, cur]),
    db().query<{ id: string; code: string; title: Bi; bname: string; f: string | null; l: string | null; status: "issued" | "used" | "expired"; cost: number; at: string; usado: string | null }>(
      `select r.id::text, r.code, c.title, b.name as bname, u.first_name as f, u.last_name as l, r.status, r.cost_coins as cost, ${ISO("r.created_at")} as at, case when r.used_at is not null then ${ISO("r.used_at")} end as usado
         from coupon_redemptions r join coupons c on c.id = r.coupon_id join businesses b on b.id = r.business_id join users u on u.id = r.user_id
        where r.city_id = $1 order by r.id desc limit 20`, [ciudad]),
  ]);
  const conteo = { pending: 0, live: 0, paused: 0, ended: 0 } as Record<EstadoCuponAdm, number>;
  for (const x of N.rows) conteo[x.status] = x.n;
  const filas = L.rows.slice(0, 30).map((x) => ({ id: x.id, negocio: x.bname, bid: x.bid, titulo: x.title, condiciones: x.terms, costo: x.cost, cupo: x.stock, dias: x.dias, estado: x.status, pausaPor: x.pb, motivo: x.motivo, mes: x.mes, usados: x.usados, vivos: x.vivos, creado: x.creado }));
  return { estado: e, conteo, filas, mas: L.rows.length > 30 ? filas.at(-1)!.id : null,
    canjes: C.rows.map((x) => ({ id: x.id, codigo: x.code, titulo: x.title, negocio: x.bname, persona: `${x.f ?? ""}${x.l ? ` ${x.l.slice(0, 1)}.` : ""}`.trim() || "Vecino", estado: x.status, costo: x.cost, at: x.at, usado: x.usado })) };
}

/* Usuarios 360° › Comunidad › Monedas: el saldo y los últimos 12 movimientos (con quién del equipo y el motivo cuando es un ajuste). */
export async function monedas360(userId: string) {
  const [p, L] = await Promise.all([
    db().query<{ saldo: number; codigos: number }>(`select coalesce((select coins from community_profiles where user_id = $1), 0) as saldo,
      (select count(*)::int from coupon_redemptions where user_id = $1 and status = 'issued' and expires_at > now()) as codigos`, [userId]),
    db().query<{ id: string; delta: number; motivo: string; reason: string | null; quien: string | null; at: string }>(
      `select e.id::text, e.delta, e.reason_key as motivo, e.reason, nullif(trim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, '')), '') as quien, ${ISO("e.created_at")} as at
         from coin_entries e left join users s on s.id = e.by_staff where e.user_id = $1 order by e.id desc limit 12`, [userId]),
  ]);
  return { ...p.rows[0]!, log: L.rows };
}
export type Monedas360 = Awaited<ReturnType<typeof monedas360>>;
