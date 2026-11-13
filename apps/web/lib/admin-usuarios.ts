import "server-only";
import { DEF_APPS } from "./app-nativa-comun";
import type { Staff } from "./admin";
import { db } from "./db";
import { telefonoBonito } from "./panel";
const APP_NOMBRE: Record<string, string> = Object.fromEntries(DEF_APPS.map((a) => [a.key, a.nombre.es]));

/* ADM-USR · Usuarios: lista con filtros y el 360° de una persona. Acotado a las ciudades de quien mira (Mi ciudad de la
   cuenta; vacío = todas; una cuenta sin ciudad solo la ve quien trabaja todas). Paginado de a 14 (OFFSET con tope,
   como Negocios; ver LAUNCH-CHECKLIST). Pestañas de la Fase 1: Resumen, Seguridad, Confianza, Privacidad (Actividad,
   Dinero y Comunidad llegan con sus módulos). */
export const POR_PAGINA = 14;
export type FiltrosUsr = { q: string; quien: string[]; est: string[]; mas: string[]; rk: number | null; orden: string; pag: number };

export function leerFiltros(sp: Record<string, string | undefined>): FiltrosUsr {
  const lista = (v: string | undefined, ok: string[]) => (v ?? "").split(",").filter((x) => ok.includes(x));
  return {
    q: (sp.q ?? "").trim().slice(0, 80),
    quien: lista(sp.quien, ["own", "cli"]),
    est: lista(sp.est, ["ok", "adv", "mute", "susp", "ban", "del"]),
    mas: lista(sp.mas, ["new", "act7", "inact", "mdev", "noemail", "rep"]),
    rk: [4, 7, 9].includes(Number(sp.rk)) ? Number(sp.rk) : null,
    orden: sp.orden === "new" ? "new" : "last",
    pag: Math.min(100, Math.max(1, Number(sp.pag) || 1)),
  };
}

/* Estado que ve el equipo: borrado · baneado · suspendido · silenciado · advertido (advertencia sin levantar) · activo. */
export const ESTADO_USR = `case when u.status in ('deleted_pending', 'deleted', 'merged') then 'del'
  when cuenta_estado(u.status, u.status_until) = 'banned' then 'ban'
  when cuenta_estado(u.status, u.status_until) = 'suspended' then 'susp'
  when cuenta_estado(u.status, u.status_until) = 'muted' then 'mute'
  when exists (select 1 from sanctions x where x.target_kind = 'user' and x.target_id = u.id::text and x.kind = 'adv' and x.lifted_at is null) then 'adv'
  else 'ok' end`;
const DUENO = `exists (select 1 from businesses b where b.owner_user_id = u.id and b.status <> 'merged')`;
const NOMBRE = `nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), '')`;

export async function listaUsuarios(s: Staff, f: FiltrosUsr) {
  const w: string[] = [];
  const p: unknown[] = [];
  const add = (sql: string, ...v: unknown[]) => { for (const x of v) p.push(x); w.push(sql.replace(/\$(\d)/g, (_, n) => `$${p.length - v.length + Number(n)}`)); };
  if (s.cities.length) add("u.home_city_id = any($1::text[])", s.cities);
  if (f.q) {
    const dig = f.q.replace(/\D/g, "");
    add(`(lower(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) like '%' || lower($1) || '%' or lower(coalesce(u.nick, '')) like '%' || lower($1) || '%'
          or ($2 <> '' and length($2) >= 3 and u.phone like '%' || $2 || '%') or lower(coalesce(u.email::text, '')) like '%' || lower($1) || '%' or u.id::text = lower($1))`, f.q, dig);
  }
  if (f.quien.length === 1) w.push(f.quien[0] === "own" ? DUENO : `not ${DUENO}`);
  if (f.est.length) add(`${ESTADO_USR} = any($1::text[])`, f.est);
  if (f.mas.includes("new")) w.push("u.created_at > now() - interval '30 days'");
  if (f.mas.includes("act7")) w.push("u.last_seen_at > now() - interval '7 days'");
  if (f.mas.includes("inact")) w.push("coalesce(u.last_seen_at, u.created_at) < now() - interval '30 days'");
  if (f.mas.includes("mdev")) w.push("(select count(distinct coalesce(se.device::text, se.id::text)) from sessions se where se.user_id = u.id) > 1");
  if (f.mas.includes("noemail")) w.push("u.email is null");
  // 5i · Comunidad: con reportes recibidos (a la persona o a lo que escribió en la Comunidad) y rango mínimo.
  if (f.mas.includes("rep")) w.push(`exists (select 1 from content_reports x where (x.target_kind = 'user' and x.target_id = u.id::text)
      or (x.target_kind = 'com_post' and x.target_id in (select p.id::text from com_posts p where p.author_user_id = u.id))
      or (x.target_kind = 'com_comment' and x.target_id in (select c.id::text from com_comments c where c.author_user_id = u.id)))`);
  if (f.rk) add("coalesce((select cp.rank_level from community_profiles cp where cp.user_id = u.id), 1) >= $1::int", f.rk);
  const where = w.length ? w.join(" and ") : "true";
  const orden = f.orden === "new" ? "u.created_at desc, u.id" : "u.last_seen_at desc nulls last, u.id";
  const cab = s.cities.length ? "u.home_city_id = any($1::text[])" : "cardinality($1::text[]) = 0";
  const sinFiltros = w.length === (s.cities.length ? 1 : 0);
  const [filas, total, k] = await Promise.all([
    db().query<{ id: string; nombre: string | null; phone: string; photo: string | null; zona: string | null; ciudad: string | null; estado: string; dueno: boolean; staff: string | null; creado: string; visto: string | null }>(
      `select u.id, ${NOMBRE} as nombre, u.phone, u.photo_url as photo, z.name->>'es' as zona, c.name as ciudad, ${ESTADO_USR} as estado, ${DUENO} as dueno,
              (select r.name->>'es' from staff_members m join staff_roles r on r.key = m.role where m.user_id = u.id and m.status = 'active') as staff,
              u.created_at as creado, u.last_seen_at as visto
         from users u left join cities c on c.id = u.home_city_id left join zones z on z.city_id = u.home_city_id and z.id = u.zone_id
        where ${where} order by ${orden} limit ${POR_PAGINA} offset ${(f.pag - 1) * POR_PAGINA}`, p),
    // Sin filtros (solo las ciudades de quien mira), el total es el de arriba: no se cuenta dos veces el millón.
    sinFiltros ? Promise.resolve(null) : db().query<{ n: number }>(`select count(*)::int as n from users u where ${where}`, p),
    // 9b-3 · Las cifras de arriba sin mirar a cada persona: con 1 M de vecinos, «¿es dueño?» y el estado fila por fila tardaban 900 ms. Dueños =
    // los distintos dueños de negocios; con sanción = las cuentas que no están activas (índice parcial) más las advertidas, sin repetir.
    db().query<{ n: number; duenos: number; sanc: number }>(
      `select (select count(*)::int from users u where ${cab}) as n,
              (select count(distinct b.owner_user_id)::int from businesses b join users u on u.id = b.owner_user_id where b.status <> 'merged' and ${cab}) as duenos,
              (select count(*)::int from (select u.id from users u where u.status in ('muted', 'suspended', 'banned') and cuenta_estado(u.status, u.status_until) <> 'active' and ${cab}
                                           union select u.id from users u join sanctions x on x.target_kind = 'user' and x.target_id = u.id::text and x.kind = 'adv' and x.lifted_at is null where ${cab}) z) as sanc`, [s.cities]),
  ]);
  return { filas: filas.rows.map((x) => ({ ...x, phone: telefonoBonito(x.phone) })), total: (total ? total.rows[0]?.n : k.rows[0]?.n) ?? 0, cab: k.rows[0] ?? { n: 0, duenos: 0, sanc: 0 } };
}

/* El 360° de una persona: su cuenta, sus negocios, lo que hizo el equipo, sus dispositivos y lo que reportó. */
export async function usuario360(s: Staff, id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return null;
  const u = (await db().query<{
    id: string; nombre: string | null; nick: string | null; phone: string; phone_ok: string | null; email: string | null; email_ok: boolean; photo: string | null; lang: string;
    city_id: string | null; ciudad: string | null; zona: string | null; city_changed: string | null; status: string; estado: string; until: string | null; delete_at: string | null;
    creado: string; visto: string | null; founder: boolean; is_test: boolean; status_reason: string | null;
  }>(
    `select u.id, ${NOMBRE} as nombre, u.nick, u.phone, u.phone_verified_at as phone_ok, u.email::text as email, u.email_verified as email_ok, u.photo_url as photo, u.lang,
            u.home_city_id as city_id, c.name as ciudad, z.name->>'es' as zona, u.home_city_changed_at as city_changed, u.status, ${ESTADO_USR} as estado, u.status_until as until,
            u.delete_at, u.created_at as creado, u.last_seen_at as visto, u.founder, u.is_test, u.status_reason
       from users u left join cities c on c.id = u.home_city_id left join zones z on z.city_id = u.home_city_id and z.id = u.zone_id
      where u.id = $1 and (cardinality($2::text[]) = 0 or u.home_city_id = any($2::text[]))`, [id, s.cities])).rows[0];
  if (!u) return null;
  const [neg, staff, notas, ses, compartidos, cambios, sanc, rec, reps, cl, cs, hist, ciudades] = await Promise.all([
    db().query<{ id: string; name: string; kind: string; cat: string; plan: string; status: string }>(
      `select b.id, b.name, m.kind, c.name->>'es' as cat, coalesce(st.plan, 'free') as plan, b.status
         from business_members m join businesses b on b.id = m.business_id join categories c on c.id = b.category_id left join business_stats_cache st on st.business_id = b.id
        where m.user_id = $1 and m.status = 'active' and b.status <> 'merged' order by (m.kind = 'owner') desc, b.name limit 20`, [id]),
    db().query<{ role: string }>(`select r.name->>'es' as role from staff_members m join staff_roles r on r.key = m.role where m.user_id = $1 and m.status = 'active'`, [id]),
    db().query<{ text: string; at: string; quien: string | null }>(
      `select n.text, n.at, nullif(trim(coalesce(x.first_name, '') || ' ' || coalesce(x.last_name, '')), '') as quien
         from admin_notes n left join users x on x.id = n.by_staff where n.target_kind = 'user' and n.target_id = $1 order by n.at desc limit 20`, [id]),
    db().query<{ device: string | null; sid: string; ua: string | null; app: string; plat: string; ver: string | null; build: number | null; so: string | null; ip: string | null; primera: string; ultima: string; abiertas: number; bloqueada: boolean; dev_bloq: boolean }>(
      `select s.device::text as device, (array_agg(s.id::text order by s.last_seen_at desc))[1] as sid, (array_agg(s.user_agent order by s.last_seen_at desc))[1] as ua,
              (array_agg(s.app order by s.last_seen_at desc))[1] as app, (array_agg(host(s.ip) order by s.last_seen_at desc))[1] as ip,
              (array_agg(s.platform order by s.last_seen_at desc))[1] as plat, (array_agg(s.app_version order by s.last_seen_at desc))[1] as ver,
              (array_agg(s.app_build order by s.last_seen_at desc))[1] as build, (array_agg(s.os_version order by s.last_seen_at desc))[1] as so,
              min(s.created_at) as primera, max(s.last_seen_at) as ultima,
              count(*) filter (where s.signed_out_at is null and not s.blocked and s.expires_at > now())::int as abiertas, bool_or(s.blocked) as bloqueada,
              exists (select 1 from blocked_devices bd where bd.device = s.device and bd.lifted_at is null) as dev_bloq
         from sessions s where s.user_id = $1 group by coalesce(s.device::text, s.id::text), s.device order by max(s.last_seen_at) desc limit 20`, [id]),
    db().query<{ id: string; nombre: string | null; phone: string; estado: string }>(
      `select distinct u.id, ${NOMBRE} as nombre, u.phone, ${ESTADO_USR} as estado
         from sessions a join sessions b on b.device = a.device and b.user_id <> a.user_id join users u on u.id = b.user_id
        where a.user_id = $1 and a.device is not null limit 10`, [id]),
    db().query<{ kind: string; de: string | null; a: string | null; by: string; at: string }>(`select kind, "from" as de, "to" as a, by, at from account_changes where user_id = $1 order by at desc limit 20`, [id]),
    db().query<{ id: string; kind: string; reason: string; starts_at: string; ends_at: string | null; lifted_at: string | null; lift_reason: string | null; quien: string | null; quien_levanto: string | null }>(
      `select x.id::text, x.kind, x.reason, x.starts_at, x.ends_at, x.lifted_at, x.lift_reason,
              nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), '') as quien, nullif(trim(coalesce(l.first_name, '') || ' ' || coalesce(l.last_name, '')), '') as quien_levanto
         from sanctions x left join users a on a.id = x.by_staff left join users l on l.id = x.lifted_by
        where x.target_kind = 'user' and x.target_id = $1::text order by x.starts_at desc limit 30`, [id]),
    db().query<{ id: string; name: string; status: string; at: string; caso: string | null }>(
      `select r.id::text, r.business_name as name, r.status, r.created_at as at, (select q.id::text from queue_items q where q.queue = 'rec' and q.subject_id = r.id::text order by q.opened_at desc limit 1) as caso
         from recommendations r where r.by_user_id = $1 and r.status <> 'draft' order by r.created_at desc limit 10`, [id]),
    db().query<{ id: string; reason: string; status: string; at: string; negocio: string; bid: string }>(
      `select pr.id::text, pr.reason, pr.status, pr.created_at as at, b.name as negocio, b.id as bid
         from photo_reports pr join media m on m.id = pr.media_id join businesses b on b.id = m.owner_id
        where pr.reporter_user_id = $1 order by pr.created_at desc limit 10`, [id]),
    db().query<{ id: string; status: string; at: string; negocio: string; bid: string; caso: string | null }>(
      `select cl.id, cl.status, cl.created_at as at, b.name as negocio, b.id as bid,
              (select q.id::text from queue_items q where q.subject_kind = 'claim' and q.subject_id = cl.id order by q.opened_at desc limit 1) as caso
         from claims cl join businesses b on b.id = cl.business_id where cl.user_id = $1 order by cl.created_at desc limit 10`, [id]),
    db().query<{ id: string; type: string; status: string; reason: string; at: string; quien: string | null; caso: string | null; decision_reason: string | null }>(
      `select c.id, c.type, c.status, c.reason, c.created_at as at, nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), '') as quien,
              (select q.id::text from queue_items q where q.subject_kind = 'sensitive_change' and q.subject_id = c.id order by q.opened_at desc limit 1) as caso, c.decision_reason
         from sensitive_changes c left join users a on a.id = c.requested_by where c.target_kind = 'user' and c.target_id = $1 order by c.created_at desc limit 10`, [id]),
    db().query<{ action: string; before: unknown; after: unknown; reason: string | null; at: string; quien: string | null }>(
      `select e.action, e.before, e.after, e.reason, e.at, nullif(trim(coalesce(a.first_name, '') || ' ' || coalesce(a.last_name, '')), '') as quien
         from audit_entries e left join users a on a.id::text = e.actor_id
        where e.actor_kind = 'staff' and ((e.target_kind = 'user' and e.target_id = $1) or (e.target_kind = 'session' and e.after->>'user' = $1)) order by e.at desc limit 30`, [id]),
    db().query<{ id: string; name: string; status: string }>(`select id, name, status from cities where status <> 'off' order by (status = 'on') desc, name`),
  ]);
  const UA = (ua: string | null) => !ua ? "Dispositivo" : /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? (/Mobile/.test(ua) ? "Android" : "Tableta Android") : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Navegador";
  const NAV = (ua: string | null) => !ua ? "" : /Edg\//.test(ua) ? "Edge" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /FxiOS|Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return {
    ...u, phone_b: telefonoBonito(u.phone),
    puede: { editar: s.puede("usr", "editar"), retirar: s.puede("usr", "retirar"), exportar: s.puede("usr", "exportar"), admin: s.role === "admin" },
    yoMismo: u.id === s.id,
    negocios: neg.rows, staff: staff.rows[0]?.role ?? null, notas: notas.rows,
    // 8a · Una sesión de una de las cuatro apps dice cuál y qué versión (rótulo TLApp, informativo): «To'Latino Puerta 1.0.0 (12) · iOS 17.5».
    dispositivos: ses.rows.map((d) => ({ ...d, nombre: UA(d.ua), nav: d.plat === "web" ? NAV(d.ua) : null,
      app: d.plat === "web" ? "Web" : `${APP_NOMBRE[d.app] ?? d.app}${d.ver ? ` ${d.ver} (${d.build ?? "?"})` : ""}${d.so ? ` · ${d.plat === "ios" ? "iOS" : "Android"} ${d.so}` : ""}` })),
    // 8c · Teléfonos con avisos (push): enmascarados (rótulo, app, canal y los últimos 6 de la huella; nunca el token).
    push: await (await import("./push/admin")).dispositivosDe(id),
    // 8d · Llaves de acceso (Face ID / huella): dispositivo, cuándo se agregó, la última vez y cuántas entradas; revocar con motivo.
    llaves: await (await import("./llaves/llaves")).llavesDe360(id),
    compartidos: compartidos.rows.map((x) => ({ ...x, phone: telefonoBonito(x.phone) })),
    cambios: cambios.rows, sanciones: sanc.rows, recomendaciones: rec.rows, reportes: reps.rows, reclamos: cl.rows, cambiosSensibles: cs.rows, historial: hist.rows, ciudades: ciudades.rows,
  };
}
export type Usuario360 = NonNullable<Awaited<ReturnType<typeof usuario360>>>;
