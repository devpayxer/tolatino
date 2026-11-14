import "server-only";
import { auditar, type Staff } from "../admin";
import { db, tx } from "../db";
import { descartados } from "./ingesta";

/* 8f · Super Admin › Sistema › Apps › Salud (fase8-apps.md §4 8f; hueco #7): los grupos de errores por app, plataforma y build, la tasa de
   sesiones sin cierre (aproximada) y la ficha de un grupo con su stack simbolizado. SIN PERSONAS: un grupo dice cuántas veces, en cuántos
   teléfonos (huella diaria), en qué builds y en qué familia de pantalla; nunca quién. Ver: apps:ver (Admin, Soporte, Solo lectura); cambiar el
   estado (Visto, Resuelto en el build N, Silenciar con motivo, Reabrir): apps:editar, lo revisa la acción y queda en la auditoría. */
const ISO = (c: string) => `to_char((${c}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
export type FiltroErrores = { app?: string | null; estado?: string | null; tipo?: string | null; cursor?: string | null };
export type FilaGrupo = { id: string; app: string; plat: string; tipo: string; titulo: string; estado: string; n: number; tel: number; primero: string; ultimo: string; build: string | null; resueltoEn: string | null; n24: number };
export type SaludApps = {
  kpis: { nuevos24: number; eventos24: number; grupos: number; alertas24: number; descartados: number; desde: string };
  sinCierre: { app: string; plat: string; sesiones: number; conCierre: number; pct: number | null }[];
  grupos: FilaGrupo[]; siguiente: string | null;
};
const APPS = new Set(["cliente", "negocio", "delivery", "checkin", "web"]), ESTADOS = new Set(["nuevo", "visto", "resuelto", "silenciado"]), TIPOS = new Set(["js", "nativo", "cierre", "red", "servidor"]);

export async function saludApps(f: FiltroErrores): Promise<SaludApps> {
  const app = f.app && APPS.has(f.app) ? f.app : null, estado = f.estado && ESTADOS.has(f.estado) ? f.estado : null, tipo = f.tipo && TIPOS.has(f.tipo) ? f.tipo : null;
  // Cursor: «última vez|id» del último de la página anterior (paginación por cursor, sin OFFSET).
  const cur = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z)\|(\d{1,18})$/.exec(f.cursor ?? "");
  const [k, s, g] = await Promise.all([
    db().query<{ nuevos24: number; eventos24: number; grupos: number; alertas24: number }>(
      `select (select count(*)::int from app_error_groups where first_seen > now() - interval '1 day') as nuevos24,
              (select count(*)::int from app_error_events where at > now() - interval '1 day') as eventos24,
              (select count(*)::int from app_error_groups where status in ('nuevo', 'visto')) as grupos,
              (select count(*)::int from app_error_alerts where at > now() - interval '1 day') as alertas24`),
    // Sesiones sin cierre (7 días, aproximado): sesiones vistas de cada app y plataforma contra los teléfonos (huella diaria) con un cierre.
    db().query<{ app: string; plat: string; sesiones: number; con: number }>(
      `with s as (select app, platform as plat, count(*)::int as n from sessions where app in ('cliente', 'negocio', 'delivery', 'checkin') and platform in ('ios', 'android')
                    and last_seen_at > now() - interval '7 days' group by 1, 2),
            c as (select g.app, g.platform as plat, count(distinct e.session_hash)::int as n from app_error_events e join app_error_groups g on g.id = e.group_id
                   where g.kind = 'cierre' and e.at > now() - interval '7 days' group by 1, 2)
       select coalesce(s.app, c.app) as app, coalesce(s.plat, c.plat) as plat, coalesce(s.n, 0) as sesiones, coalesce(c.n, 0) as con
         from s full join c on c.app = s.app and c.plat = s.plat order by 1, 2`),
    db().query<FilaGrupo & { cur: string }>(
      `select g.id::text, g.app, g.platform as plat, g.kind as tipo, g.title as titulo, g.status as estado, g.count::int as n, g.users_n as tel,
              ${ISO("g.first_seen")} as primero, ${ISO("g.last_seen")} as ultimo, g.last_build as build, g.resolved_in_build as "resueltoEn",
              (select count(*)::int from app_error_events e where e.group_id = g.id and e.at > now() - interval '1 day') as n24,
              to_char(g.last_seen at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || g.id as cur
         from app_error_groups g
        where ($1::text is null or g.app = $1) and ($2::text is null or g.status = $2) and ($3::text is null or g.kind = $3)
          and ($4::timestamptz is null or (g.last_seen, g.id) < ($4::timestamptz, $5::bigint))
        order by g.last_seen desc, g.id desc limit 31`, [app, estado, tipo, cur?.[1] ?? null, cur?.[2] ?? null]),
  ]);
  const filas = g.rows.slice(0, 30);
  const d = await descartados();
  return {
    kpis: { ...k.rows[0]!, descartados: d.n, desde: d.desde },
    sinCierre: s.rows.map((x) => ({ app: x.app, plat: x.plat, sesiones: x.sesiones, conCierre: x.con, pct: x.sesiones > 0 ? Math.max(0, Math.round(1000 * (1 - x.con / x.sesiones)) / 10) : null })),
    grupos: filas.map(({ cur: _c, ...x }) => x), siguiente: g.rows.length > 30 ? g.rows[29]!.cur : null,
  };
}

export type FichaGrupo = FilaGrupo & {
  quien: string | null; cuando: string | null; motivo: string | null; regreso: string | null;
  eventos: { at: string; build: string | null; version: string | null; os: string | null; modelo: string | null; ruta: string | null; mensaje: string | null; stack: string | null; simbolizado: boolean }[];
  builds: { build: string; n: number }[]; rutas: { ruta: string; n: number }[]; alertas: { tipo: string; build: string; n: number; at: string }[];
};
export async function fichaGrupo(id: string): Promise<FichaGrupo | null> {
  if (!/^\d{1,18}$/.test(id)) return null;
  const g = (await db().query<FichaGrupo>(
    `select g.id::text, g.app, g.platform as plat, g.kind as tipo, g.title as titulo, g.status as estado, g.count::int as n, g.users_n as tel,
            ${ISO("g.first_seen")} as primero, ${ISO("g.last_seen")} as ultimo, g.last_build as build, g.resolved_in_build as "resueltoEn",
            (select count(*)::int from app_error_events e where e.group_id = g.id and e.at > now() - interval '1 day') as n24,
            nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien, ${ISO("g.status_at")} as cuando, g.status_reason as motivo, ${ISO("g.regressed_at")} as regreso
       from app_error_groups g left join users u on u.id = g.status_by where g.id = $1::bigint`, [id])).rows[0];
  if (!g) return null;
  const [e, b, r, a] = await Promise.all([
    db().query<FichaGrupo["eventos"][number]>(
      `select ${ISO("at")} as at, release as build, app_version as version, os_version as os, device_model as modelo, route_family as ruta, message as mensaje, stack, symbolicated as simbolizado
         from app_error_events where group_id = $1::bigint order by at desc limit 20`, [id]),
    db().query<{ build: string; n: number }>(`select coalesce(release, '—') as build, count(*)::int as n from app_error_events where group_id = $1::bigint group by 1 order by 2 desc limit 8`, [id]),
    db().query<{ ruta: string; n: number }>(`select coalesce(route_family, '—') as ruta, count(*)::int as n from app_error_events where group_id = $1::bigint group by 1 order by 2 desc limit 8`, [id]),
    db().query<{ tipo: string; build: string; n: number; at: string }>(`select kind as tipo, release as build, events_n as n, ${ISO("at")} as at from app_error_alerts where group_id = $1::bigint order by at desc limit 10`, [id]),
  ]);
  return { ...g, eventos: e.rows, builds: b.rows, rutas: r.rows, alertas: a.rows };
}

const ESTADO_L: Record<string, string> = { nuevo: "Nuevo", visto: "Visto", resuelto: "Resuelto", silenciado: "Silenciado" };
/* Visto · Resuelto en el build N · Silenciar (con motivo) · Reabrir. Solo el estado: las cifras son de la base (0127). */
export async function cambiarEstadoGrupo(s: Staff, id: string, accion: string, build: string, motivo: string): Promise<{ ok: boolean; msg: string }> {
  if (!/^\d{1,18}$/.test(id)) return { ok: false, msg: "Ese grupo no existe." };
  const m = motivo.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 300), b = build.trim();
  const nuevo = accion === "visto" ? "visto" : accion === "resuelto" ? "resuelto" : accion === "silenciar" ? "silenciado" : accion === "reabrir" ? "nuevo" : null;
  if (!nuevo) return { ok: false, msg: "Esa acción no existe." };
  if (nuevo === "resuelto" && !/^([0-9]{1,9}|[a-z0-9]{4,12})$/i.test(b)) return { ok: false, msg: "Escribe el build donde quedó resuelto (el número, o el commit en la web)." };
  if ((nuevo === "silenciado" || nuevo === "resuelto" || accion === "reabrir") && m.length < 3) return { ok: false, msg: "Escribe el motivo: queda en la auditoría." };
  return tx(async (c) => {
    const g = (await c.query<{ status: string; title: string; resolved_in_build: string | null }>(`select status, title, resolved_in_build from app_error_groups where id = $1::bigint for update`, [id])).rows[0];
    if (!g) return { ok: false, msg: "Ese grupo no existe." };
    if (g.status === nuevo && nuevo !== "resuelto") return { ok: true, msg: "Ya estaba así." };
    await c.query(`update app_error_groups set status = $2, resolved_in_build = $3, status_by = $4, status_at = now(), status_reason = $5 where id = $1::bigint`,
      [id, nuevo, nuevo === "resuelto" ? b : null, s.id, m || null]);
    await auditar(c, { actor: s.id, action: `errores.${accion}`, targetKind: "app_error_group", targetId: id, before: { estado: ESTADO_L[g.status] ?? "—", resuelto: g.resolved_in_build }, after: { estado: ESTADO_L[nuevo], resuelto: nuevo === "resuelto" ? b : null }, reason: m || null });
    return { ok: true, msg: nuevo === "resuelto" ? `Resuelto en el build ${b}. Si vuelve en uno posterior, se reabre solo y avisa.` : nuevo === "silenciado" ? "Silenciado: no avisa más (se sigue contando)." : nuevo === "visto" ? "Marcado como visto." : "Reabierto." };
  });
}
