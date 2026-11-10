import "server-only";
import { db } from "./db";
import { yo, type Yo } from "./cuenta";
import type { Lang } from "./idioma";
import { TLOnbNeg } from "./onb/datos";
import { aPanel, fuerza, prueba, seDuerme, type DiaPanel } from "./panel-reglas";
import { EQUIPO_FREE, ITEMS_FREE, TOPE_FREE } from "./plan";
import { topeFreeDe } from "./pedir";
import { estado } from "./tarjeta";
import { licenciasDe, licenciasEquipo } from "./licencias";

/* Panel del negocio: quién entra. El servidor decide en cada lectura y cada cambio: la persona tiene que ser miembro
   activo del negocio (dueño, o equipo con acceso a esa parte del panel). Nunca se confía en lo que diga la pantalla. */
export type Acceso = { yo: Yo; negocio: { id: string; name: string; city_id: string; category_id: string; status: string }; kind: "owner" | "staff" | "renter"; partes: string[] };

export async function accesoPanel(negocioId: string, parte?: string): Promise<Acceso | null> {
  if (typeof negocioId !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(negocioId) || negocioId.length > 80) return null;
  const me = await yo();
  if (!me) return null;
  const r = (await db().query<{ id: string; name: string; city_id: string; category_id: string; status: string; kind: Acceso["kind"]; panel_access: string[] }>(
    `select b.id, b.name, b.city_id, b.category_id, b.status, m.kind, m.panel_access
       from business_members m join businesses b on b.id = m.business_id
      where m.business_id = $1 and m.user_id = $2 and m.status = 'active' and b.status <> 'merged'
      order by (m.kind = 'owner') desc limit 1`, [negocioId, me.id])).rows[0];
  if (!r) return null;
  const partes = r.kind === "owner" ? ["all"] : r.panel_access ?? [];
  if (parte && !partes.includes("all") && !partes.includes(parte)) return null;
  const { kind, panel_access: _p, ...negocio } = r;
  void _p;
  return { yo: me, negocio, kind, partes };
}

/* Los negocios de la persona (para entrar al panel y elegir cuál). */
export async function misNegocios(userId: string) {
  return (await db().query<{ id: string; name: string; kind: string; plan: string; foto: string | null; until: string | null; days: number | null }>(
    `select b.id, b.name, m.kind, coalesce(s.plan, 'free') as plan,
            (select x.url from media x where x.owner_kind = 'business' and x.owner_id = b.id and x.status = 'visible' order by x.sort limit 1) as foto,
            (select to_char(x.trial_ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from subscriptions x where x.business_id = b.id and x.status = 'trial') as until,
            (select round(extract(epoch from x.trial_ends_at - x.trial_started_at) / 86400)::int from subscriptions x where x.business_id = b.id and x.status = 'trial') as days
       from business_members m join businesses b on b.id = m.business_id left join business_stats_cache s on s.business_id = b.id
      where m.user_id = $1 and m.status = 'active' and b.status <> 'merged'
      order by (m.kind = 'owner') desc, b.created_at`, [userId])).rows;
}

type Bi = { es: string; en: string };
const VENDE = ["pedidos", "citas", "rsv", "cot"];
const cfg = (cat: string) => (TLOnbNeg.CFG?.[cat] ?? {}) as { items?: [string, string]; amen?: string[][] };
const D = 86_400_000;
export const telefonoBonito = (p: string | null) => (p && /^\+1\d{10}$/.test(p) ? `(${p.slice(2, 5)}) ${p.slice(5, 8)}-${p.slice(8)}` : p ?? "");

export type Persona = {
  id: string; kind: "owner" | "staff" | "renter"; st: "ok" | "inv" | "req" | "gone"; name: string; role: Bi | null; photo: string | null; langs: string[];
  sp: Bi[]; bio: Bi | null; wk: ([number, number] | null)[] | null; same: boolean; show: boolean; since: number | null; phone: string;
  invitedAt: string | null; expires: string | null; sends: number; msg: Bi | null; hidden: string | null; me: boolean;
};

/* Todo lo que el panel necesita del negocio, calculado en el servidor (fuerza, prueba, estado, cifras). Consultas
   fijas en paralelo, sin N+1. */
export async function datosPanel(acc: Acceso, lang: Lang) {
  const id = acc.negocio.id, es = lang === "es";
  // La prueba Pro y el plan viven en subscriptions (lib/suscripcion.ts): lo vencido se procesa antes de mostrar.
  await (await import("./suscripcion")).procesar(id).catch(() => undefined);
  const b = (await db().query<{
    id: string; name: string; cat: string; city: string; ciudad: string; status: string; plan: string; verified: boolean; review_count: number;
    attrs: Record<string, any>; logo: string | null; about: Bi | null; amen: string[]; op: string; from_home: boolean; mods: string[]; evt_aplica: boolean;
    email_ok: boolean; owner: string | null; tz: string; dow: number; hm: string; hoy: string; hora: number; open: boolean; closed_today: boolean; created: string;
    status_reason: string | null; temp_until: string | null; temp_reason: string | null; admin_edits: Record<string, unknown>; phone: string | null; owner_phone: string | null;
    email: string | null; sello: string | null; sello_note: string | null; reclamo_aviso: string | null; sub_until: string | null; sub_days: number | null; sub_used: boolean;
  }>(
    `select b.id, b.name, b.category_id as cat, b.city_id as city, c.name as ciudad, b.status, coalesce(s.plan, 'free') as plan,
            coalesce(s.verified, false) as verified, coalesce(s.review_count, 0) as review_count, b.category_attrs as attrs, b.logo_url as logo,
            b.about, b.amenities as amen, b.operation as op, b.works_from_home as from_home, b.modules_on as mods,
            coalesce((select cc.allowed_modules ? 'eventos' from categories cc where cc.id = b.category_id), false) as evt_aplica,
            coalesce(u.email_verified, false) as email_ok, u.first_name as owner, c.timezone as tz,
            extract(dow from now() at time zone c.timezone)::int as dow, to_char(now() at time zone c.timezone, 'HH24:MI') as hm,
            to_char(now() at time zone c.timezone, 'YYYY-MM-DD') as hoy, extract(hour from now() at time zone c.timezone)::int as hora,
            negocio_abierto(b.id, (now() at time zone c.timezone)::timestamp) as open,
            coalesce(b.closed_on = (now() at time zone c.timezone)::date, false) as closed_today, b.created_at as created,
            b.status_reason, case when b.temp_closed_until > now() then b.temp_closed_until end as temp_until, b.temp_closed_reason as temp_reason, b.admin_edits,
            b.phone, u.phone as owner_phone, u.email,
            (select v.status from verification_requests v where v.business_id = b.id order by v.created_at desc limit 1) as sello,
            (select v.note from verification_requests v where v.business_id = b.id order by v.created_at desc limit 1) as sello_note,
            (select cl.owner_notified_at from claims cl where cl.business_id = b.id and cl.status = 'pending' and cl.had_owner_id = b.owner_user_id order by cl.created_at limit 1) as reclamo_aviso,
            (select to_char(x.trial_ends_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from subscriptions x where x.business_id = b.id and x.status = 'trial') as sub_until,
            (select round(extract(epoch from x.trial_ends_at - x.trial_started_at) / 86400)::int from subscriptions x where x.business_id = b.id and x.status = 'trial') as sub_days,
            exists (select 1 from subscriptions x where x.business_id = b.id and x.trial_started_at is not null) as sub_used
       from businesses b join cities c on c.id = b.city_id left join business_stats_cache s on s.business_id = b.id
       left join users u on u.id = b.owner_user_id
      where b.id = $1`, [id])).rows[0];
  if (!b) return null;
  const tr = prueba(b.sub_until, b.sub_days);
  const desde = tr ? tr.start : new Date(0).toISOString();
  const [fotos, horas, miembros, cifras, faqs, amen, negocios, lic, licCat] = await Promise.all([
    db().query<{ id: string; url: string }>(`select id, url from media where owner_kind = 'business' and owner_id = $1 and status = 'visible' order by sort, created_at`, [id]),
    db().query<{ weekday: number; open: boolean; ranges: [string, string][] }>(`select weekday, open, ranges from business_hours where business_id = $1 and module = '' order by weekday`, [id]),
    db().query<{
      id: string; user_id: string | null; kind: Persona["kind"]; status: string; display_name: string; role: Bi | null; photo_url: string | null; languages: string[];
      specialties: Bi[]; bio: Bi | null; weekly_schedule: ([number, number] | null)[] | null; same_as_business_hours: boolean; show_on_page: boolean;
      since_year: number | null; phone: string | null; invited_at: string | null; invite_expires_at: string | null; invite_sends: number; join_message: Bi | null; hidden_reason: string | null; hidden: boolean;
    }>(`select id, user_id, kind, status, display_name, role, photo_url, languages, specialties, bio, weekly_schedule, same_as_business_hours, show_on_page,
               since_year, phone, invited_at, invite_expires_at, invite_sends, join_message, hidden_reason, hidden_by_admin is not null as hidden
          from business_members where business_id = $1 and (status <> 'removed' or hidden_by_admin is not null)
         order by (kind = 'owner') desc, sort, invited_at nulls first, id`, [id]),
    db().query<{ v7: number; vhoy: number; vprueba: number; c7: number; cprueba: number }>(
      `select (select coalesce(sum(n), 0)::int from business_views_daily where business_id = $1 and day > $2::date - 7) as v7,
              (select coalesce(sum(n), 0)::int from business_views_daily where business_id = $1 and day = $2::date) as vhoy,
              (select coalesce(sum(n), 0)::int from business_views_daily where business_id = $1 and day >= $3::timestamptz::date) as vprueba,
              (select count(*)::int from contact_taps where business_id = $1 and at > now() - interval '7 days') as c7,
              (select count(*)::int from contact_taps where business_id = $1 and at >= $3::timestamptz) as cprueba`, [id, b.hoy, desde]),
    db().query<{ n: number }>(`select count(*)::int as n from faqs where business_id = $1`, [id]),
    db().query<{ key: string; icon: string; label: Bi }>(`select key, icon, label from amenities where categories = '{}' or $1 = any(categories) order by (categories = '{}'), sort`, [b.cat]),
    misNegocios(acc.yo.id),
    b.cat === "NEG-PRO" || b.cat === "NEG-FE" || b.cat === "NEG-INMUEBLE" || b.cat === "NEG-DEALER" ? licenciasDe(id) : Promise.resolve([]),
    db().query<{ key: string; title: Bi }>(`select key, title from license_kinds where category_id = $1 order by sort`, [b.cat]),
  ]);
  const licEq = b.cat === "NEG-SALUD" || b.cat === "NEG-PRO" ? await licenciasEquipo(id) : [];

  const pro = b.plan === "pro", c = cfg(b.cat), itemsW = (c.items ?? ["servicios", "services"]) as [string, string];
  const items = Array.isArray(b.attrs?.items) ? b.attrs.items.length : 0;
  const sells = b.mods.some((m) => VENDE.includes(m));
  const equipo: Persona[] = miembros.rows.map((m) => ({
    id: m.id, kind: m.kind, st: m.status === "active" ? "ok" : m.status === "invited" ? "inv" : m.status === "requested" ? "req" : "gone",
    name: m.display_name, role: m.role, photo: m.photo_url, langs: m.languages, sp: m.specialties ?? [], bio: m.bio, wk: m.weekly_schedule, same: m.same_as_business_hours,
    show: m.show_on_page, since: m.since_year, phone: telefonoBonito(m.phone), invitedAt: m.invited_at, expires: m.invite_expires_at, sends: m.invite_sends,
    msg: m.join_message, hidden: m.hidden ? m.hidden_reason ?? "" : null, me: m.user_id === acc.yo.id,
  }));
  const okEquipo = equipo.filter((p) => p.st === "ok" && p.kind !== "owner");
  const dias: DiaPanel[] = aPanel(horas.rows);
  const st = estado(horas.rows, { dow: b.dow, hm: b.hm }, b.open, lang, null, b.closed_today, !!b.temp_until);
  // Fotos que quitó To'Latino (con su motivo): el dueño lo ve en Fotos y portada.
  const quitadas = (await db().query<{ note: string | null }>(`select removed_note as note from media where owner_kind = 'business' and owner_id = $1 and status = 'removed' and removed_reason = 'admin' order by removed_at desc limit 10`, [id])).rows;
  // Reseñas (2g): cifras para «Tu página › Reseñas» y la regla «Responde tus reseñas críticas» (≤ 3 ★ sin respuesta).
  const rs = (await db().query<{ n: number; avg: number | null; norep: number; crit: number }>(
    `select count(*)::int as n, round(avg(stars)::numeric, 1)::float as avg, count(*) filter (where reply is null)::int as norep,
            count(*) filter (where reply is null and stars <= 3)::int as crit from reviews where business_id = $1 and status = 'visible'`, [id])).rows[0]!;
  const f = fuerza({
    items, itemsW, galeria: fotos.rows.length, about: !!b.about?.es, logo: !!b.logo, sello: b.verified, correo: b.email_ok, faqs: faqs.rows[0]?.n ?? 0,
    resenasSinResponder: rs.crit, equipo: okEquipo.length, aDomicilio: b.op === "casa", diasAbiertos: dias.filter((d) => d.on).length, amenidades: b.amen.length, pro,
  });
  // Derivado cacheado (lo leen las listas del Super Admin): se guarda solo si cambió.
  await db().query(`update business_stats_cache set profile_strength = $2, updated_at = now() where business_id = $1 and profile_strength <> $2`, [id, f.sc]);
  const k = cifras.rows[0] ?? { v7: 0, vhoy: 0, vprueba: 0, c7: 0, cprueba: 0 };
  const onb = !!b.attrs?.onb && Date.now() - Date.parse(b.created) < 45 * D;
  const ahoraHora = b.hora;
  const tope = pro ? { cap: TOPE_FREE, usados: 0 } : await topeFreeDe(id);
  // Novedades (2g): cuántas en vivo y programadas, para «Tu página › Novedades».
  const nv = (await db().query<{ vivas: number; prog: number }>(
    `select count(*) filter (where p.status = 'live' and p.hidden_at is null and p.publish_at <= now() and (p.ends_at is null or p.ends_at > now()))::int as vivas,
            count(*) filter (where p.status = 'live' and p.hidden_at is null and p.publish_at > now())::int as prog
       from business_posts p where p.business_id = $1`, [id])).rows[0]!;
  // Cupones por monedas (5g): cuántos en la Comunidad y por aprobar, para «Tu página › Cupones por monedas».
  const cu = (await db().query<{ vivos: number; pend: number }>(
    `select count(*) filter (where status = 'live')::int as vivos, count(*) filter (where status = 'pending')::int as pend from coupons where business_id = $1`, [id])).rows[0]!;
  return {
    resenas: rs, novedades: nv, cupones: cu,
    id, name: b.name, cat: b.cat, city: b.city, ciudad: b.ciudad, kind: acc.kind, partes: acc.partes, pro, verified: b.verified,
    trial: tr && tr.on ? tr : null, trialUsed: b.sub_used, onb, sells, mods: b.mods, evtAplica: b.evt_aplica, op: b.op, itemsW, items,
    st: { open: st.open, text: st.text, closedToday: b.closed_today },
    // Lo que hizo To'Latino (triángulo): el dueño siempre ve qué pasó y por qué.
    adm: { status: b.status, reason: b.status_reason, tempUntil: b.temp_until, tempReason: b.temp_reason, nombre: !!b.admin_edits?.name, about: !!b.admin_edits?.about, fotos: quitadas.map((x) => x.note ?? ""), reclamo: acc.kind === "owner" && b.reclamo_aviso ? b.reclamo_aviso : null },
    ver: { phone: telefonoBonito(b.phone), phoneOk: !!b.phone && b.phone === b.owner_phone, email: b.email_ok ? b.email : null, sello: b.verified ? "ok" : (b.sello as string | null) ?? "none", selloNote: b.sello_note },
    ph: fotos.rows[0]?.url ?? null, logo: b.logo,
    kpis: { views7: k.v7, contacts7: k.c7, viewsToday: k.vhoy, viewsTrial: k.vprueba, contactsTrial: k.cprueba },
    fuerza: f, duerme: seDuerme({ galeria: fotos.rows.length, equipo: okEquipo.length, items, itemsW, itemsFree: ITEMS_FREE }, es),
    fotos: fotos.rows, horas: dias, about: b.about, amen: b.amen, amenAll: amen.rows.map((a) => ({ key: a.key, l: a.label[lang] })),
    owner: b.owner, equipo, equipoFree: EQUIPO_FREE, tope: tope.cap, usadosMes: tope.usados,
    hoy: { fecha: b.hoy, tz: b.tz, dow: b.dow, hm: b.hm, saludo: ahoraHora < 12 ? (es ? "Buenos días" : "Good morning") : ahoraHora < 19 ? (es ? "Buenas tardes" : "Good afternoon") : es ? "Buenas noches" : "Good evening" },
    // Tus licencias (Trámites y profesionales): las del negocio con su estado y las del catálogo que puede agregar.
    lic: b.cat === "NEG-PRO" || b.cat === "NEG-FE" || b.cat === "NEG-INMUEBLE" || b.cat === "NEG-DEALER" ? { filas: lic, catalogo: licCat.rows.map((k) => ({ key: k.key, l: k.title[lang] })), cant: Array.isArray(b.attrs?.cant) ? (b.attrs.cant as string[])[es ? 0 : 1] ?? null : null } : null,
    // Licencias de cada persona del equipo (Doctores y Profesionales, 4h-3): solo quien la tiene verificada atiende citas.
    licEq: b.cat === "NEG-SALUD" || b.cat === "NEG-PRO" ? { filas: licEq, catalogo: licCat.rows.map((k) => ({ key: k.key, l: k.title[lang] })) } : null,
    negocios: negocios.map((n) => ({ id: n.id, name: n.name, plan: n.plan, foto: n.foto, trial: prueba(n.until, n.days) })),
    // 7b · Más › Ayuda y Soporte: el horario del equipo (Configuración) y los casos abiertos del negocio.
    sop: await (async () => {
      const [{ horario }, { horarioCorto }] = await Promise.all([import("./soporte"), import("./soporte-comun")]);
      const [h, n] = await Promise.all([horario(), db().query<{ n: number }>(`select count(*)::int as n from support_cases where business_id = $1 and status not in ('resolved', 'merged')`, [id])]);
      return { horario: horarioCorto(h, es), abiertos: n.rows[0]?.n ?? 0 };
    })(),
  };
}
export type DatosPanel = NonNullable<Awaited<ReturnType<typeof datosPanel>>>;
