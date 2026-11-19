import "server-only";
import { auditar, type Staff } from "../admin";
import { destacados } from "../categoria";
import { cfgSql, valores } from "../config";
import { db, tx } from "../db";
import { ciudades, resolver } from "../ubicacion";
import { sumarDias } from "../evt-comun";
import { hoyEn } from "../fecha-local";
import { destacadosEventos } from "../evt-publico";
import { bien, mal, type Bi, type Res } from "./comun";

/* 9h · Super Admin › Crecimiento › Destacados (prototipo secMkt «Destacados»: «los Pro de la portada; rotación diaria automática; aquí fijas o quitas a
   mano por 7 días con motivo»). Fijar = sale primero en Negocios › Destacados de su ciudad; quitar = no entra a la rotación. Dura destacados_dias (7) y
   vuelve solo a la rotación; fijados a la vez por ciudad: destacados_por_ciudad (6), lo impone la base (featured_reglas, con candado por ciudad). Nada se
   borra ni se edita: se retira y se crea otro. mkt:editar, con motivo y auditoría.
   9t (0183) · La misma tabla fija EVENTOS arriba de Eventos de la ciudad (placement 'eventos'): el equipo elige desde y hasta (máx. 30 días), solo eventos
   publicados de esa ciudad que todavía no terminan; fijados a la vez: destacados_evt_por_ciudad (4), lo impone la base. Editorial y sin cobro: Patrocinado
   (C-003, lib/patrocinio-evento.ts) es lo pagado y va por su lado. */

const enCiudad = (s: Staff, c: string) => !s.cities.length || s.cities.includes(c);
const NEG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function fijarDestacado(s: Staff, p: { ciudad: string; negocio: string; modo: string; motivo: string }): Promise<Res> {
  if (!s.puede("mkt", "editar")) return mal("Tu rol no cambia los destacados.", "Your role cannot change featured businesses.");
  const motivo = String(p.motivo ?? "").replace(/\s+/g, " ").trim().slice(0, 300), modo = p.modo === "quitar" ? "quitar" : p.modo === "fijar" ? "fijar" : null;
  if (!modo) return mal("Elige fijar o quitar.", "Pick pin or remove.");
  if (!NEG.test(String(p.negocio ?? ""))) return mal("Ese negocio no existe.", "That business does not exist.");
  if (!enCiudad(s, p.ciudad)) return mal("Esa ciudad no es tuya.", "That city is not yours.");
  if (motivo.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  const cfg = await valores("destacados_dias", "destacados_por_ciudad");
  try {
    return await tx(async (c) => {
      const b = (await c.query<{ name: string; city_id: string; status: string }>(`select name, city_id, status from businesses where id = $1`, [p.negocio])).rows[0];
      if (!b || b.city_id !== p.ciudad) return mal("Ese negocio no es de esta ciudad.", "That business is not in this city.");
      if (b.status !== "active") return mal("Ese negocio no está activo.", "That business is not active.");
      const id = (await c.query<{ id: string }>(
        `insert into featured (city_id, business_id, mode, to_at, by_staff_id, reason) values ($1, $2, $3, now() + make_interval(days => $4::int), $5, $6) returning id::text`,
        [p.ciudad, p.negocio, modo, cfg.destacados_dias, s.id, motivo])).rows[0]!.id;
      await auditar(c, { actor: s.id, action: modo === "fijar" ? "mkt.destacado.fijar" : "mkt.destacado.quitar", targetKind: "business", targetId: p.negocio, city: p.ciudad,
        after: { featured: id, modo, dias: cfg.destacados_dias }, reason: motivo });
      return modo === "fijar" ? bien(`${b.name} sale primero en Destacados por ${cfg.destacados_dias} días.`, `${b.name} shows first in Featured for ${cfg.destacados_dias} days.`)
        : bien(`${b.name} sale de la rotación por ${cfg.destacados_dias} días.`, `${b.name} leaves the rotation for ${cfg.destacados_dias} days.`);
    });
  } catch (e) {
    const m = String((e as Error).message ?? "");
    if (m.includes("destacados_tope")) { const tope = (await db().query<{ n: number }>(`select ${cfgSql("destacados_por_ciudad")} as n`)).rows[0]?.n ?? cfg.destacados_por_ciudad; // 19 nov · el de la base, no el de la caché
      return mal(`Ya hay ${tope} fijados en esta ciudad: retira uno antes.`, `There are already ${tope} pinned in this city: retire one first.`); }
    if (m.includes("ya tiene uno vivo")) return mal("Ese negocio ya está fijado o quitado: retira eso antes.", "That business is already pinned or removed: retire that first.");
    throw e;
  }
}

export async function retirarDestacado(s: Staff, id: string, motivo: string): Promise<Res> {
  if (!s.puede("mkt", "editar")) return mal("Tu rol no cambia los destacados.", "Your role cannot change featured businesses.");
  const m = String(motivo ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!/^\d{1,18}$/.test(String(id))) return mal("Ese destacado no existe.", "That featured entry does not exist.");
  if (m.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  return tx(async (c) => {
    const f = (await c.query<{ city: string; biz: string | null; ev: string | null; vivo: boolean }>(`select city_id as city, business_id as biz, event_id::text as ev, retired_at is null and to_at > now() as vivo from featured where id = $1::bigint for update`, [id])).rows[0];
    if (!f) return mal("Ese destacado no existe.", "That featured entry does not exist.");
    if (!enCiudad(s, f.city)) return mal("Esa ciudad no es tuya.", "That city is not yours.");
    if (!f.vivo) return mal("Ya terminó.", "It is already over.");
    await c.query(`update featured set retired_at = now(), retired_by = $2, retired_reason = $3 where id = $1::bigint`, [id, s.id, m]);
    // 9t · Un evento: sale de Destacados de Eventos al momento (vuelve a su lugar de siempre en la lista del día).
    if (f.ev) {
      await auditar(c, { actor: s.id, action: "mkt.destacado_evt.retirar", targetKind: "event", targetId: f.ev, city: f.city, before: { featured: id, vivo: true }, after: { vivo: false }, reason: m });
      return bien("Retirado: ya no sale en Destacados de Eventos.", "Retired: it no longer shows in Featured events.");
    }
    await auditar(c, { actor: s.id, action: "mkt.destacado.retirar", targetKind: "business", targetId: f.biz, city: f.city, before: { featured: id, vivo: true }, after: { vivo: false }, reason: m });
    return bien("Retirado: vuelve a la rotación de siempre.", "Retired: it goes back to the usual rotation.");
  });
}

/* 9t · Fijar un EVENTO arriba de Eventos de su ciudad (Super Admin › Crecimiento › Destacados › EVENTOS, o la ficha del evento). `desde` vacío o de hoy =
   ahora; `hasta` es el último día que sale (hora de la ciudad; si va más allá del último día del evento, se queda en ese día). Máx. 30 días. La ciudad es la
   del evento (y tiene que ser de quien fija). La base vuelve a imponer todo: evento publicado de esa ciudad, uno vivo por evento y el tope a la vez. */
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5);
export async function fijarDestacadoEvento(s: Staff, p: { evento: string; desde: string; hasta: string; motivo: string }): Promise<Res> {
  if (!s.puede("mkt", "editar")) return mal("Tu rol no cambia los destacados.", "Your role cannot change featured items.");
  const motivo = String(p.motivo ?? "").replace(/\s+/g, " ").trim().slice(0, 300), evento = String(p.evento ?? ""), desde = String(p.desde ?? "").trim(), hasta0 = String(p.hasta ?? "").trim();
  if (!/^\d{1,18}$/.test(evento)) return mal("Ese evento no existe.", "That event does not exist.");
  if ((desde && !FECHA.test(desde)) || !FECHA.test(hasta0)) return mal("Escribe las fechas como AAAA-MM-DD.", "Write the dates as YYYY-MM-DD.");
  if (motivo.length < 3) return mal("Escribe el motivo.", "Write the reason.");
  const cfg = await valores("destacados_evt_por_ciudad");
  try {
    return await tx(async (c) => {
      const e = (await c.query<{ city: string; titulo: Bi; tz: string; hoy: string; fin: string | null }>(
        `select e.city_id as city, e.title as titulo, ci.timezone as tz, to_char(now() at time zone ci.timezone, 'YYYY-MM-DD') as hoy,
                (select max(d.local_date)::text from event_dates d where d.event_id = e.id and d.listable and d.ends_at > now()) as fin
           from events e join cities ci on ci.id = e.city_id where e.id = $1::bigint and e.status <> 'cancelled'`, [evento])).rows[0];
      if (!e) return mal("Ese evento no existe o se canceló.", "That event does not exist or was cancelled.");
      if (!enCiudad(s, e.city)) return mal("Esa ciudad no es tuya.", "That city is not yours.");
      if (!e.fin) return mal("Ese evento no está publicado o ya pasó: solo se destaca lo que se ve.", "That event is not live or is over: only what shows can be featured.");
      const d0 = desde && desde > e.hoy ? desde : e.hoy, hasta = hasta0 > e.fin ? e.fin : hasta0;
      if (d0 > e.fin) return mal("Para ese día el evento ya pasó.", "By that day the event is over.");
      if (hasta < d0) return mal("«Hasta» va el mismo día o después de «desde».", "«Until» must be the same day as «from» or later.");
      if (diasEntre(d0, hasta) + 1 > 30) return mal("Un destacado dura 30 días como máximo.", "A pin lasts 30 days at most.");
      const id = (await c.query<{ id: string }>(
        `with t as (select case when $3::date <= (now() at time zone $5)::date then now() else ($3::date)::timestamp at time zone $5 end as a)
         insert into featured (city_id, event_id, placement, mode, from_at, to_at, by_staff_id, reason)
         select $1, $2::bigint, 'eventos', 'fijar', t.a, least(t.a + interval '30 days', ($4::date + 1)::timestamp at time zone $5), $6, $7 from t returning id::text`,
        [e.city, evento, d0, hasta, e.tz, s.id, motivo])).rows[0]!.id;
      await auditar(c, { actor: s.id, action: "mkt.destacado_evt.fijar", targetKind: "event", targetId: evento, city: e.city, after: { featured: id, desde: d0, hasta }, reason: motivo });
      const tes = e.titulo.es || e.titulo.en, ten = e.titulo.en || e.titulo.es;
      return d0 === e.hoy ? bien(`${tes} sale en Destacados de Eventos hasta el ${hasta}.`, `${ten} shows in Featured events until ${hasta}.`)
        : bien(`${tes} sale en Destacados de Eventos del ${d0} al ${hasta}.`, `${ten} shows in Featured events from ${d0} to ${hasta}.`);
    });
  } catch (x) {
    const m = String((x as Error).message ?? "");
    // 19 nov · El número del tope, el que impuso la base (cfg_int, sin la caché de 15 s): recién cambiado en Configuración, decía el de antes (evt9t).
    if (m.includes("destacados_evt_tope")) { const tope = (await db().query<{ n: number }>(`select ${cfgSql("destacados_evt_por_ciudad")} as n`)).rows[0]?.n ?? cfg.destacados_evt_por_ciudad;
      return mal(`Ya hay ${tope} eventos fijados en esas fechas en esta ciudad: retira uno antes o elige otras fechas.`, `There are already ${tope} events pinned on those dates in this city: retire one first or pick other dates.`); }
    if (m.includes("ya tiene uno vivo")) return mal("Ese evento ya está fijado: retira eso antes.", "That event is already pinned: retire that first.");
    if (m.includes("destacado_evento")) return mal("Ese evento no está publicado en esta ciudad o ya pasó.", "That event is not live in this city or is over.");
    throw x;
  }
}

export type DestacadoAdm = { id: string; negocio: string; nombre: string; modo: "fijar" | "quitar"; hasta: string; quien: string | null; motivo: string; vivo: boolean; razon: string | null };
/* 9t · Un evento fijado (o que lo estuvo) en la lista del Super Admin. estado: vivo (sale ahora) · programado (empieza después) · no_sale (vivo, pero el
   evento ya no se ve: se canceló, se ocultó o pasó; se cae solo) · termino · retirado. */
export type DestacadoEvtAdm = { id: string; evento: string; titulo: Bi; org: string; desde: string; hasta: string; quien: string | null; motivo: string; razon: string | null;
  estado: "vivo" | "programado" | "no_sale" | "termino" | "retirado" };
/* Lo vivo y lo reciente de una ciudad, y la vitrina de hoy tal como la ve el vecino (los 6 de Negocios › Destacados, desde el centro). 9t: lo mismo de
   Eventos (los fijados, programados y recientes, y lo que sale hoy arriba de Eventos desde el centro). */
export async function destacadosAdmin(s: Staff, ciudad: string, es = true) {
  if (!enCiudad(s, ciudad)) return null;
  const cs = await ciudades(), ci = cs.find((x) => x.id === ciudad);
  if (!ci) return null;
  const [lista, cfg, ev, hoyC] = await Promise.all([
    db().query<DestacadoAdm>(
      `select f.id::text, f.business_id as negocio, b.name as nombre, f.mode as modo, to_char(f.to_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hasta, f.reason as motivo,
              f.retired_at is null and f.to_at > now() as vivo, f.retired_reason as razon,
              nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien
         from featured f join businesses b on b.id = f.business_id left join users u on u.id = f.by_staff_id
        where f.city_id = $1 and (f.retired_at is null and f.to_at > now() or f.created_at > now() - interval '30 days')
        order by (f.retired_at is null and f.to_at > now()) desc, f.created_at desc limit 50`, [ciudad]),
    valores("destacados_por_ciudad", "destacados_dias", "destacados_evt_por_ciudad"),
    db().query<DestacadoEvtAdm>(
      `select f.id::text, f.event_id::text as evento, e.title as titulo, b.name as org, f.reason as motivo, f.retired_reason as razon,
              to_char(f.from_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as desde, to_char(f.to_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as hasta,
              nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien,
              case when f.retired_at is not null then 'retirado' when f.to_at <= now() then 'termino'
                   when e.status = 'cancelled' or not exists (select 1 from event_dates d where d.event_id = e.id and d.listable and d.ends_at > now()) then 'no_sale'
                   when f.from_at > now() then 'programado' else 'vivo' end as estado
         from featured f join events e on e.id = f.event_id join businesses b on b.id = e.business_id left join users u on u.id = f.by_staff_id
        where f.city_id = $1 and f.placement = 'eventos' and (f.retired_at is null and f.to_at > now() or f.created_at > now() - interval '30 days')
        order by (f.retired_at is null and f.to_at > now()) desc, f.from_at, f.id desc limit 50`, [ciudad]),
    db().query<{ hoy: string }>(`select to_char(now() at time zone timezone, 'YYYY-MM-DD') as hoy from cities where id = $1`, [ciudad]),
  ]);
  const P = resolver(cs, { c: ciudad });
  const [hoy, hoyEv] = ci.status === "on" ? await Promise.all([destacados(P, 6), destacadosEventos(P, null, es)]) : [[], []];
  const hoyCiudad = hoyC.rows[0]?.hoy ?? hoyEn();
  return { lista: lista.rows, hoy: hoy.map((b) => ({ id: b.id, nombre: b.name, abierto: b.open })), tope: cfg.destacados_por_ciudad, dias: cfg.destacados_dias,
    fijados: lista.rows.filter((x) => x.vivo && x.modo === "fijar").length,
    ev: { lista: ev.rows, hoy: hoyEv.map((x) => ({ id: x.id, titulo: x.title, cuando: x.cuando })), tope: cfg.destacados_evt_por_ciudad,
      fijados: ev.rows.filter((x) => x.estado === "vivo").length, hoyCiudad, hastaDef: sumarDias(hoyCiudad, 6) } };
}

/* Buscar un negocio activo de la ciudad para fijarlo o quitarlo (por nombre; los Pro primero). */
export async function buscarNegocio(s: Staff, ciudad: string, q: string) {
  if (!enCiudad(s, ciudad)) return [];
  const t = String(q ?? "").trim().toLowerCase().slice(0, 40);
  if (t.length < 2) return [];
  return (await db().query<{ id: string; nombre: string; pro: boolean }>(
    `select b.id, b.name as nombre, coalesce(st.plan = 'pro', false) as pro from businesses b left join business_stats_cache st on st.business_id = b.id
      where b.city_id = $1 and b.status = 'active' and lower(unaccent(b.name)) like '%' || unaccent($2::text) || '%' order by (st.plan = 'pro') desc, b.name limit 8`, [ciudad, t])).rows;
}

/* 9t · Buscar un evento publicado de la ciudad para fijarlo (por nombre, sobre el índice GIN de events.tsv; los más próximos primero). */
export async function buscarEventoDestacar(s: Staff, ciudad: string, q: string) {
  if (!enCiudad(s, ciudad)) return [];
  const pal = String(q ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").trim().split(/\s+/).filter(Boolean).slice(0, 5);
  if (!pal.length || pal.join("").length < 2) return [];
  return (await db().query<{ id: string; titulo: Bi; org: string; dia: string; fijado: boolean }>(
    `select e.id::text, e.title as titulo, b.name as org, x.dia,
            exists (select 1 from featured f where f.event_id = e.id and f.retired_at is null and f.to_at > now()) as fijado
       from events e join businesses b on b.id = e.business_id
       cross join lateral (select d.local_date::text as dia from event_dates d where d.event_id = e.id and d.listable and d.ends_at > now() order by d.starts_at, d.id limit 1) x
      where e.city_id = $1 and e.status <> 'cancelled' and e.tsv @@ to_tsquery('simple', $2)
      order by x.dia, e.id limit 8`, [ciudad, pal.map((w) => `${w}:*`).join(" & ")])).rows;
}
