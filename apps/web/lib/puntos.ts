import "server-only";
import type { PoolClient } from "pg";
import { avisar } from "./avisos";
import { db, tx } from "./db";
import { CUANDO_PATIO, UNIDAD, type MiRango, type Rango } from "./puntos-comun";

/* Puntos y rangos (fase5-comunidad.md §4 5f; libro Opus/high). La app nunca escribe el libro ni el rango: llama a las funciones de la
   base (migración 0102), que son las únicas que insertan en points_entries (solo inserción, tope del día, idempotente por persona +
   regla + referencia) y la única que escribe rank_level (pts_rango).
   - sumar(): una cadena por (persona, regla, referencia); si ya está en positivo no hace nada; lo que pasa del tope del día no se guarda.
   - revertir(): asiento inverso de lo que dio una referencia (quitar el voto, cambiarlo a −, cambiar la mejor respuesta). Ocultar por las
     reglas, borrar y volver a verse lo hacen los triggers de la base para cualquier camino (equipo, auto-ocultar, autor, apelación).
   - Entre cuentas que usaron el mismo dispositivo no hay puntos (votos ni «Me sirvió»): pts_mismo_dispositivo.
   - La cuenta oficial no es una persona: lo suyo no tiene autor (author_user_id null) y aquí no se suma nada sin persona.
   - recalcularRango(): después de guardar; si subió, el aviso «Subiste de rango» con lo que desbloquea. */
type Q = Pick<PoolClient, "query">;
type Bi = { es: string; en: string };
export type Regla = "voto_post" | "voto_comentario" | "yo_tambien" | "me_sirvio" | "resena_verificada" | "primera_rec";
export type Objetivo = { kind: "com_post" | "com_comment" | "review"; id: string };

export async function sumar(c: Q, userId: string | null, regla: Regla, ref: [string, string], obj: Objetivo | null, tab: "rec" | "ans" | null): Promise<number> {
  if (!userId) return 0;
  return (await c.query<{ n: number }>(`select pts_sumar($1::uuid, $2, $3, $4, $5, $6, $7) as n`, [userId, regla, ref[0], ref[1], obj?.kind ?? null, obj?.id ?? null, tab])).rows[0]!.n;
}
export async function revertir(c: Q, userId: string | null, ref: [string, string], porque: "voto" | "cambio"): Promise<number> {
  if (!userId) return 0;
  return (await c.query<{ n: number }>(`select pts_revertir($1::uuid, $2, $3, $4) as n`, [userId, ref[0], ref[1], porque])).rows[0]!.n;
}
const mismoDispositivo = async (c: Q, a: string, b: string, dev: string | null) =>
  (await c.query<{ s: boolean }>(`select pts_mismo_dispositivo($1::uuid, $2::uuid, $3::uuid) as s`, [a, b, dev])).rows[0]!.s;

/* Un voto en una publicación o un comentario (después de com_votar, en la misma transacción). Da puntos a quien lo escribió solo si el
   voto es + y cuenta (no callado por el mismo dispositivo) y quien vota no comparte dispositivo con quien escribió; si no, revierte lo
   que ese voto había dado. Un voto en una recomendación vale «Sumar mi voto» (+3) y puede cerrar la primera recomendación con 3 votos.
   Devuelve a quién recalcular el rango (o null). */
export async function puntosDelVoto(c: Q, o: { kind: "post" | "comment"; id: string; voter: string; device: string | null; mio: number }): Promise<string | null> {
  const t = (await c.query<{ autor: string | null; rec: boolean; ciudad: string; negocio: string | null }>(o.kind === "post"
    ? `select author_user_id::text as autor, kind = 'recomendacion' as rec, city_id as ciudad, business_id as negocio from com_posts where id = $1::bigint`
    : `select author_user_id::text as autor, business_id is not null as rec, city_id as ciudad, business_id as negocio from com_comments where id = $1::bigint`, [o.id])).rows[0];
  if (!t?.autor) return null;
  const ref: [string, string] = ["com_vote", `${o.kind}:${o.id}:${o.voter}`];
  const v = (await c.query<{ counted: boolean }>(`select counted from com_votes where target_kind = $1 and target_id = $2::bigint and user_id = $3`, [o.kind, o.id, o.voter])).rows[0];
  if (o.mio !== 1 || !v?.counted || (await mismoDispositivo(c, o.voter, t.autor, o.device))) { await revertir(c, t.autor, ref, "voto"); return null; }
  const obj: Objetivo = { kind: o.kind === "post" ? "com_post" : "com_comment", id: o.id };
  let n = await sumar(c, t.autor, t.rec ? "yo_tambien" : o.kind === "post" ? "voto_post" : "voto_comentario", ref, obj, t.rec ? "rec" : o.kind === "comment" ? "ans" : null);
  if (t.rec && t.negocio) n += await primeraRecomendacion(c, t.autor, t.ciudad, t.negocio, obj);
  return n > 0 ? t.autor : null;
}

/* +50 una sola vez por negocio y ciudad: a la primera recomendación de ese negocio en la ciudad (publicación o comentario) cuando junta 3
   votos + que cuentan, de cuentas que no comparten dispositivo con quien recomendó. */
async function primeraRecomendacion(c: Q, autor: string, ciudad: string, negocio: string, obj: Objetivo): Promise<number> {
  const ref: [string, string] = ["primera_rec", `${ciudad}:${negocio}`];
  await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`pts:${ref[1]}`]);
  if ((await c.query(`select 1 from points_entries where rule_key = 'primera_rec' and ref_kind = $1 and ref_id = $2 limit 1`, ref)).rowCount) return 0;
  const p = (await c.query<{ k: string; id: string }>(
    `select k, id from (
       (select 'com_post' as k, p.id::text as id, p.created_at as at, p.id as o from com_posts p
         where p.business_id = $1 and p.city_id = $2 and p.kind = 'recomendacion' and p.status = 'visible' and p.author_kind = 'user' order by p.created_at, p.id limit 1)
       union all
       (select 'com_comment', c.id::text, c.created_at, c.id from com_comments c where c.business_id = $1 and c.city_id = $2 and c.status = 'visible' order by c.created_at, c.id limit 1)) x
     order by at, o limit 1`, [negocio, ciudad])).rows[0];
  if (!p || p.k !== obj.kind || p.id !== obj.id) return 0;
  const votos = (await c.query<{ n: number }>(
    `select count(*)::int as n from com_votes v where v.target_kind = $1 and v.target_id = $2::bigint and v.v = 1 and v.counted and not pts_mismo_dispositivo(v.user_id, $3::uuid, v.device)`,
    [obj.kind === "com_post" ? "post" : "comment", obj.id, autor])).rows[0]!.n;
  return votos >= 3 ? sumar(c, autor, "primera_rec", ref, obj, "rec") : 0;
}

/* «Me sirvió»: +10 a quien respondió (si no comparte dispositivo con quien preguntó); al cambiar la mejor respuesta, el asiento inverso a
   la anterior. Devuelve a quién recalcular el rango. */
export async function puntosMejorRespuesta(c: Q, o: { post: string; asker: string; antes: string | null; ahora: string; autor: string }): Promise<string | null> {
  if (o.antes && o.antes !== o.ahora) {
    const a = (await c.query<{ u: string }>(`select author_user_id::text as u from com_comments where id = $1::bigint`, [o.antes])).rows[0]?.u ?? null;
    await revertir(c, a, ["com_best", `${o.post}:${o.antes}`], "cambio");
  }
  if (await mismoDispositivo(c, o.asker, o.autor, null)) return null;
  return (await sumar(c, o.autor, "me_sirvio", ["com_best", `${o.post}:${o.ahora}`], { kind: "com_comment", id: o.ahora }, "ans")) > 0 ? o.autor : null;
}

/* Reseña verificada nueva (lib/resenas.ts): +15 a quien la escribió. */
export async function puntosResena(c: Q, userId: string, reviewId: string): Promise<number> {
  return sumar(c, userId, "resena_verificada", ["review", reviewId], { kind: "review", id: reviewId }, null);
}

/* ── Rangos ── */
/* Sin caché: son 10 filas y un renombre del equipo tiene que verse al instante en todas las pantallas (la acción del admin y las páginas
   pueden correr en instancias distintas del módulo). */
export async function rangos(c: Q = db()): Promise<Rango[]> {
  return (await c.query<{ n: number; name: Bi; req: Bi; unl: Bi; min: number | null; patio: boolean }>(
    `select level as n, name, requirement as req, unlocks as unl, min_points as min, patio from ranks order by level`)).rows;
}
export const olvidarRangos = () => undefined;
export const nombresRangos = async () => (await rangos()).map((x) => x.name);

/* El único camino al rango: pts_rango en la base. Si subió, avisa una vez con lo que desbloquea. */
export async function recalcularRango(userId: string | null): Promise<{ antes: number; ahora: number } | null> {
  if (!userId) return null;
  const r = await tx(async (c) => {
    const antes = (await c.query<{ n: number }>(`select coalesce((select rank_level from community_profiles where user_id = $1), 1) as n`, [userId])).rows[0]!.n;
    const ahora = (await c.query<{ n: number }>(`select pts_rango($1::uuid) as n`, [userId])).rows[0]!.n;
    return { antes, ahora };
  });
  if (r.ahora > r.antes) {
    const R = (await rangos()).find((x) => x.n === r.ahora), en = (await db().query<{ l: string }>(`select coalesce(lang, 'es') as l from users where id = $1`, [userId])).rows[0]?.l === "en";
    if (R) await avisar(userId, "gam_rank", { rango: en ? R.name.en : R.name.es, puede: (R.patio ? `${en ? R.unl.en : R.unl.es} (${en ? CUANDO_PATIO.en : CUANDO_PATIO.es})` : en ? R.unl.en : R.unl.es).toLowerCase() },
      { href: "/comunidad/rango", ref: ["gam_rank", `${userId}:${r.ahora}`] });
  }
  return r;
}

/* APP-GAM-RANGO: el rango, los puntos, cuánto falta para el siguiente, lo que se puede hacer, las reglas, los últimos movimientos y las
   insignias. Todo del servidor (la pantalla solo pinta). */
export async function miRango(userId: string): Promise<MiRango> {
  await recalcularRango(userId);
  const [p, R, reglas, log, ins] = await Promise.all([
    db().query<{ n: number; total: number; hoy: number; mes: number; tope: number }>(
      `select cp.rank_level as n, cp.points_total as total,
              case when cp.points_day = (now() at time zone coalesce(c.timezone, 'America/New_York'))::date then cp.points_today else 0 end as hoy,
              case when cp.points_month_key = date_trunc('month', (now() at time zone coalesce(c.timezone, 'America/New_York'))::date)::date then cp.points_month else 0 end as mes, pts_tope() as tope
         from community_profiles cp join users u on u.id = cp.user_id left join cities c on c.id = u.home_city_id where cp.user_id = $1`, [userId]),
    rangos(),
    db().query<{ key: string; label: Bi; v: number; on: boolean }>(`select key, label, points as v, enabled as on from points_rules order by sort`),
    db().query<{ rule: string; motive: string; delta: number; at: string; reason: string | null; label: Bi | null }>(
      `select e.rule_key as rule, e.motive, e.delta, to_char(e.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, e.reason, r.label
         from points_entries e join users u on u.id = e.user_id left join points_rules r on r.key = e.rule_key where e.user_id = $1 order by e.id desc limit 8`, [userId]),
    insignias(userId),
  ]);
  const yo = p.rows[0] ?? { n: 1, total: 0, hoy: 0, mes: 0, tope: 100 };
  const sig = R.find((x) => x.n === yo.n + 1) ?? null;
  let siguiente: MiRango["siguiente"] = null;
  if (sig && yo.n < 10) {
    const cond = (await db().query<{ c: { tipo?: string; n?: number } }>(`select cond as c from ranks where level = $1`, [sig.n])).rows[0]?.c ?? {};
    const tipo = cond.tipo ?? "";
    const avance = tipo && UNIDAD[tipo] ? (await db().query<{ k: number }>(`select pts_avance($1::uuid, $2::jsonb) as k`, [userId, JSON.stringify(cond)])).rows[0]!.k : 0;
    siguiente = { n: sig.n, puntos: sig.min != null ? { cur: Math.min(yo.total, sig.min), tot: sig.min } : null,
      cond: tipo && UNIDAD[tipo] ? { cur: avance, tot: cond.n ?? 0, unidad: UNIDAD[tipo]! } : null, equipo: tipo === "equipo", plazas: tipo === "plazas" };
  }
  const T: Record<string, Bi> = {
    reverso: { es: "Se restó", en: "Taken back" }, restaurado: { es: "Volvió", en: "Restored" }, ajuste: { es: "Ajuste del equipo", en: "Team adjustment" },
  };
  return {
    n: yo.n, puntos: yo.total, hoy: yo.hoy, tope: yo.tope, mes: yo.mes, rangos: R, siguiente,
    reglas: reglas.rows,
    log: log.rows.map((x) => {
      const base = x.label ?? { es: "Puntos", en: "Points" };
      const t = x.motive === "regla" ? base : x.motive === "ajuste" ? { es: `${T.ajuste!.es}: ${x.reason ?? ""}`, en: `${T.ajuste!.en}: ${x.reason ?? ""}` }
        : { es: `${T[x.motive]!.es} · ${base.es}${x.reason === "oculto" ? " (oculto por las reglas)" : x.reason === "borrado" ? " (borrado)" : ""}`, en: `${T[x.motive]!.en} · ${base.en}${x.reason === "oculto" ? " (hidden by the rules)" : x.reason === "borrado" ? " (deleted)" : ""}` };
      return { t, v: x.delta, at: x.at };
    }),
    insignias: ins,
  };
}

/* Las insignias de una persona (las de El Patio no salen hasta que abra, decisión G). */
export async function insignias(userId: string) {
  return (await db().query<{ k: string; t: Bi; s: Bi; month: string | null }>(
    `select b.key as k, b.name as t, b.descr as s, to_char(ub.month, 'YYYY-MM-DD') as month from user_badges ub join badges b on b.key = ub.badge_key
      where ub.user_id = $1 and not b.patio order by b.sort, ub.month desc nulls last limit 24`, [userId])).rows
    .map((x) => ({ k: x.month ? `${x.k}:${x.month}` : x.k, t: x.t, s: x.month ? { es: `${x.s.es} · ${x.month.slice(0, 7)}`, en: `${x.s.en} · ${x.month.slice(0, 7)}` } : x.s }));
}

/* «Destacar 1 recomendación al mes» (Sargento Mayor, §6 #11): una recomendación propia y visible sale 7 días en Negocios › Recomendados
   por vecinos con «DESTACADA». Una por mes local de la ciudad. Nunca cambia el orden del muro. */
export async function destacarRecomendacion(userId: string, postId: string): Promise<{ ok: true; hasta: string } | { ok: false; msg: Bi }> {
  if (!/^\d{1,18}$/.test(postId)) return { ok: false, msg: { es: "Esa publicación ya no está.", en: "That post is gone." } };
  return tx(async (c) => {
    await c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [`destacar:${userId}`]);
    const p = (await c.query<{ kind: string; status: string; ya: boolean; rango: number; usada: boolean }>(
      `select p.kind, p.status, p.featured_until > now() as ya, coalesce(cp.rank_level, 1) as rango,
              exists (select 1 from com_posts x join cities ci on ci.id = x.city_id where x.author_user_id = $1 and x.featured_at is not null
                        and date_trunc('month', x.featured_at at time zone ci.timezone) = date_trunc('month', now() at time zone ci.timezone)) as usada
         from com_posts p left join community_profiles cp on cp.user_id = p.author_user_id where p.id = $2::bigint and p.author_user_id = $1`, [userId, postId])).rows[0];
    if (!p || p.status !== "visible") return { ok: false as const, msg: { es: "Esa publicación ya no está.", en: "That post is gone." } };
    if (p.kind !== "recomendacion") return { ok: false as const, msg: { es: "Solo se destaca una recomendación.", en: "Only a recommendation can be featured." } };
    if (p.rango < 5) return { ok: false as const, msg: { es: "Destacar se abre en Sargento Mayor.", en: "Featuring opens at Sergeant Major." } };
    if (p.ya || p.usada) return { ok: false as const, msg: { es: "Ya destacaste una recomendación este mes.", en: "You already featured a recommendation this month." } };
    const h = (await c.query<{ h: string }>(`update com_posts set featured_at = now(), featured_until = now() + interval '7 days' where id = $1::bigint
      returning to_char(featured_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as h`, [postId])).rows[0]!.h;
    return { ok: true as const, hasta: h };
  });
}

/* Lo corto del rango para el marco de la Comunidad (pastilla y columna de escritorio): puntos y cuánto falta en puntos para el siguiente. */
export async function resumenRango(userId: string) {
  const R = await rangos();
  const p = (await db().query<{ n: number; total: number }>(`select coalesce(cp.rank_level, 1) as n, coalesce(cp.points_total, 0) as total from users u left join community_profiles cp on cp.user_id = u.id where u.id = $1`, [userId])).rows[0] ?? { n: 1, total: 0 };
  const sig = R.find((x) => x.n === p.n + 1) ?? null;
  return { rangos: R.map((x) => x.name), puntos: p.total, prog: sig ? { l: sig.name, req: sig.req, cur: sig.min != null ? Math.min(p.total, sig.min) : 0, tot: sig.min ?? 0 } : null };
}
