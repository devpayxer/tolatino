import "server-only";
import type { Staff } from "./admin";
import { db } from "./db";
import { SLA_SQL } from "./admin-colas";
import { catalogoConfig, valor } from "./config";
import { saludImagen } from "./moderacion-img";
import { saludTraductor } from "./traductor";
import { LIMITES, ORDEN_LIMITES, ORDEN_REGLAS, type ReglaKey } from "./moderacion-comun";
import { SANCIONES, type Sancion } from "./sanciones";

/* 5d · Super Admin › Confianza y seguridad (ADM-CONF, Super Admin.dc.html secConf) y Contenido › Auto-moderación (secCont «auto»):
   lo que esperan las colas de moderación, el catálogo de sanciones con su efecto en la Comunidad, quién está sancionado, las
   apelaciones, el fraude (cuentas por dispositivo, reseñas en ráfaga, redes de votos y seguidores, dispositivos bloqueados) y la
   privacidad (solo lectura). Y los casos de la Comunidad para Colas (casoComunidad, casoPersona). Todo por ciudad de quien mira
   (staff.cities; vacío = todas). Nada se borra. */
const N = (u: string) => `coalesce(nullif(trim(coalesce(${u}.first_name, '') || ' ' || coalesce(${u}.last_name, '')), ''), 'Vecino')`;
const CIUDAD = (col: string, i: number) => `(cardinality($${i}::text[]) = 0 or ${col} = any($${i}::text[]))`;

/* ── Colas: una publicación o un comentario de la Comunidad (sigue visible mientras se decide, salvo auto-ocultado) ── */
export async function casoComunidad(kind: "com_post" | "com_comment", id: string) {
  if (!/^\d{1,18}$/.test(id)) return null;
  const x = (await db().query<{ id: string; body: string; status: string; hidden_by: string | null; hidden_reason: string | null; autor: string; quien: string; ciudad: string; post: string; at: string; fotos: string[] }>(
    kind === "com_post"
      ? `select p.id::text, p.body, p.status, p.hidden_by, p.hidden_reason, p.author_user_id::text as autor, ${N("u")} as quien, p.city_id as ciudad, p.id::text as post, p.created_at as at,
                coalesce((select array_agg(m.url order by m.sort) from media m where m.owner_kind = 'com_post' and m.owner_id = p.id::text and m.status = 'visible'), '{}') as fotos
           from com_posts p join users u on u.id = p.author_user_id where p.id = $1::bigint`
      : `select c.id::text, c.body, c.status, c.hidden_by, c.hidden_reason, c.author_user_id::text as autor, ${N("u")} as quien, c.city_id as ciudad, c.post_id::text as post, c.created_at as at, '{}'::text[] as fotos
           from com_comments c join users u on u.id = c.author_user_id where c.id = $1::bigint`, [id])).rows[0];
  if (!x) return null;
  const [R, F, H] = await Promise.all([
    db().query<{ reason: string; note: string | null; at: string; quien: string | null; rango: number }>(
      `select cr.reason, cr.note, cr.created_at as at, nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien, coalesce(cp.rank_level, 1) as rango
         from content_reports cr join users u on u.id = cr.reporter_user_id left join community_profiles cp on cp.user_id = u.id
        where cr.target_kind = $1 and cr.target_id = $2 and cr.status = 'open' order by cr.priority desc, cr.created_at limit 30`, [kind, id]),
    db().query<{ regla: string; detalle: string; at: string }>(`select rule_key as regla, detail as detalle, created_at as at from mod_flags where target_kind = $1 and target_id = $2 order by id desc limit 10`, [kind, id]),
    db().query<{ sanciones: number; ocultas: number }>(
      `select (select count(*)::int from sanctions where target_kind = 'user' and target_id = $1) as sanciones,
              (select count(*)::int from com_posts where author_user_id = $1::uuid and status = 'hidden') + (select count(*)::int from com_comments where author_user_id = $1::uuid and status = 'hidden') as ocultas`, [x.autor]),
  ]);
  return { ...x, kind, reportes: R.rows, marcas: F.rows, historial: H.rows[0]! };
}
export type CasoCom = NonNullable<Awaited<ReturnType<typeof casoComunidad>>>;

/* ── Colas: una persona (reportes de vecinos y lo que marcaron rev5 y la red de cuentas) ── */
export async function casoPersona(userId: string) {
  if (!/^[0-9a-f-]{36}$/.test(userId)) return null;
  const u = (await db().query<{ id: string; quien: string; ciudad: string | null; creada: string; estado: string; rango: number; staff: boolean }>(
    `select u.id::text, ${N("u")} as quien, c.name as ciudad, u.created_at as creada, cuenta_estado(u.status, u.status_until) as estado, coalesce(cp.rank_level, 1) as rango,
            exists (select 1 from staff_members m where m.user_id = u.id and m.status = 'active') as staff
       from users u left join cities c on c.id = u.home_city_id left join community_profiles cp on cp.user_id = u.id where u.id = $1`, [userId])).rows[0];
  if (!u) return null;
  const [R, F, C, S] = await Promise.all([
    db().query<{ reason: string; note: string | null; at: string; quien: string | null }>(
      `select cr.reason, cr.note, cr.created_at as at, nullif(trim(coalesce(x.first_name, '') || ' ' || left(coalesce(x.last_name, ''), 1)), '') as quien
         from content_reports cr join users x on x.id = cr.reporter_user_id where cr.target_kind = 'user' and cr.target_id = $1 and cr.status = 'open' order by cr.created_at limit 30`, [userId]),
    db().query<{ regla: string; detalle: string; at: string }>(`select rule_key as regla, detail as detalle, created_at as at from mod_flags where target_kind = 'user' and target_id = $1 order by id desc limit 10`, [userId]),
    db().query<{ posts: number; cms: number; ocultas: number; resenas24: number; dispositivos: number; otras: number }>(
      `select (select count(*)::int from com_posts where author_user_id = $1::uuid and created_at > now() - interval '30 days') as posts,
              (select count(*)::int from com_comments where author_user_id = $1::uuid and created_at > now() - interval '30 days') as cms,
              (select count(*)::int from com_posts where author_user_id = $1::uuid and status = 'hidden') + (select count(*)::int from com_comments where author_user_id = $1::uuid and status = 'hidden') as ocultas,
              (select count(*)::int from reviews where user_id = $1::uuid and operation_id is null and created_at > now() - interval '24 hours') as resenas24,
              (select count(distinct device)::int from sessions where user_id = $1::uuid and device is not null) as dispositivos,
              (select count(distinct s2.user_id)::int from sessions s1 join sessions s2 on s2.device = s1.device and s2.user_id <> s1.user_id where s1.user_id = $1::uuid and s1.device is not null) as otras`, [userId]),
    db().query<{ kind: Sancion; at: string; reason: string; vigente: boolean }>(
      `select kind, starts_at as at, reason, lifted_at is null and (ends_at is null or ends_at > now()) as vigente from sanctions where target_kind = 'user' and target_id = $1 order by starts_at desc limit 10`, [userId]),
  ]);
  return { ...u, reportes: R.rows, marcas: F.rows, cifras: C.rows[0]!, sanciones: S.rows };
}
export type CasoPersona = NonNullable<Awaited<ReturnType<typeof casoPersona>>>;

/* ── Confianza y seguridad ── */
const COLAS_CONF = ["rep", "repUsr", "chat", "medios", "apel"] as const;
export async function confianza(s: Staff) {
  const c = s.cities;
  const [Q, sanc, fraude, disp, bloq, apel] = await Promise.all([
    // 9n · El plazo de cada cola sale de Configuración › Colas (SLA_SQL), no de una copia aquí.
    db().query<{ queue: string; n: number; tarde: number; sla: number }>(
      `select q.queue, count(*)::int as n, count(*) filter (where q.opened_at < now() - make_interval(secs => (${SLA_SQL}) * 3600))::int as tarde, max(${SLA_SQL})::float8 as sla
         from queue_items q where q.status = 'open' and q.queue = any($1::text[]) and ${CIUDAD("q.city_id", 2)} group by q.queue`, [COLAS_CONF, c]),
    db().query<{ id: string; uid: string; quien: string; kind: Sancion; reason: string; at: string; hasta: string | null; ciudad: string | null; apelada: string | null }>(
      `select s.id::text, u.id::text as uid, ${N("u")} as quien, s.kind, s.reason, s.starts_at as at, s.ends_at as hasta, ci.name as ciudad,
              (select a.number || ' · ' || a.status from appeals a where a.sanction_id = s.id) as apelada
         from sanctions s join users u on u.id::text = s.target_id left join cities ci on ci.id = u.home_city_id
        where s.target_kind = 'user' and s.lifted_at is null and (s.ends_at is null or s.ends_at > now()) and ${CIUDAD("u.home_city_id", 1)}
        order by s.starts_at desc limit 50`, [c]),
    db().query<{ id: string; regla: string; detalle: string; at: string; uid: string | null; quien: string | null; caso: string | null; abierto: boolean }>(
      `select f.id::text, f.rule_key as regla, f.detail as detalle, f.created_at as at, f.user_id::text as uid, ${N("u")} as quien, f.queue_item_id::text as caso,
              coalesce((select q.status = 'open' from queue_items q where q.id = f.queue_item_id), false) as abierto
         from mod_flags f left join users u on u.id = f.user_id
        where f.rule_key in ('red', 'rev5') and f.created_at > now() - interval '30 days' and ${CIUDAD("f.city_id", 1)} order by f.id desc limit 40`, [c]),
    db().query<{ device: string; cuentas: number; nombres: string[]; ultima: string; bloqueado: boolean; uid: string }>(
      `select s.device::text as device, count(distinct s.user_id)::int as cuentas, (array_agg(distinct ${N("u")}))[1:4] as nombres, max(s.created_at) as ultima,
              exists (select 1 from blocked_devices b where b.device = s.device and b.lifted_at is null) as bloqueado, (array_agg(s.user_id::text order by s.created_at desc))[1] as uid
         from sessions s join users u on u.id = s.user_id
        where s.device is not null and s.created_at > now() - interval '90 days' and ${CIUDAD("u.home_city_id", 1)}
        group by s.device having count(distinct s.user_id) >= 3 order by count(distinct s.user_id) desc, max(s.created_at) desc limit 30`, [c]),
    db().query<{ n: number }>(`select count(*)::int as n from blocked_devices where lifted_at is null`),
    db().query<{ id: string; numero: string; k: string; estado: string; at: string; quien: string; caso: string | null; decidida: string | null }>(
      `select a.id::text, a.number as numero, a.target_kind as k, a.status as estado, a.created_at as at, ${N("u")} as quien, a.decided_at as decidida,
              (select q.id::text from queue_items q where q.queue = 'apel' and q.subject_id = a.id::text order by q.id desc limit 1) as caso
         from appeals a join users u on u.id = a.user_id where ${CIUDAD("a.city_id", 1)} order by (a.status = 'open') desc, a.created_at desc limit 40`, [c]),
  ]);
  const cola = Object.fromEntries(COLAS_CONF.map((k) => [k, Q.rows.find((x) => x.queue === k) ?? { queue: k, n: 0, tarde: 0, sla: 0 }]));

  // 6j · Señales de Eventos (evt_senales: ráfaga de órdenes, transferencias en cadena, entradas duplicadas, contracargos) con su caso.
  const { senalesEvt } = await import("./evt-admin");
  // 9k · La misma tarjeta (por su huella, card.fingerprint) en varias cuentas en 90 días (L938): la señal no sanciona sola; se mira cada cuenta.
  const tarjetas = (await db().query<{ huella: string; cuentas: number; ultima: string; marca: string | null; l4: string | null; nombres: string[]; uid: string }>(
    `select t.huella, t.cuentas, t.ultima,
            (select m.brand from payment_methods m where m.card_fingerprint = t.huella order by m.id desc limit 1) as marca,
            coalesce((select m.last4 from payment_methods m where m.card_fingerprint = t.huella order by m.id desc limit 1), (select p.card_last4 from payments p where p.card_fingerprint = t.huella order by p.id desc limit 1)) as l4,
            array(select ${N("u")} from users u where u.id in (select m.user_id from payment_methods m where m.card_fingerprint = t.huella union select p.user_id from payments p where p.card_fingerprint = t.huella) order by u.created_at desc limit 4) as nombres,
            (select x.user_id::text from (select m.user_id, m.created_at from payment_methods m where m.card_fingerprint = t.huella union all select p.user_id, p.created_at from payments p where p.card_fingerprint = t.huella) x order by x.created_at desc limit 1) as uid
       from tarjetas_en_varias_cuentas(cfg_int('tarjeta_cuentas_senal'), 90) t
      where cardinality($1::text[]) = 0 or exists (select 1 from users u where u.home_city_id = any($1::text[]) and u.id in (select m.user_id from payment_methods m where m.card_fingerprint = t.huella union select p.user_id from payments p where p.card_fingerprint = t.huella))
      limit 30`, [c])).rows;
  return {
    tarjetas,
    cola, sanc: sanc.rows, fraude: fraude.rows, disp: disp.rows, bloqueados: bloq.rows[0]!.n, apel: apel.rows, apelarDias: await valor("com_apelar_dias"), evt: await senalesEvt(s), abreCaso: s.puede("usr", "editar"),
    catalogo: (Object.keys(SANCIONES) as Sancion[]).map((k) => ({ k, ...SANCIONES[k] })),
  };
}
export type Confianza = Awaited<ReturnType<typeof confianza>>;

/* ── Contenido › Auto-moderación: reglas, términos, límites y si el modelo de fotos responde ── */
export async function autoModeracion() {
  const [R, T, cfg, img, trad] = await Promise.all([
    db().query<{ key: ReglaKey; enabled: boolean; params: Record<string, number>; updated_at: string; quien: string | null }>(
      `select r.key, r.enabled, r.params, r.updated_at, nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien
         from mod_rules r left join users u on u.id = r.updated_by`),
    db().query<{ id: string; lang: string; term: string; kind: string; enabled: boolean }>(`select id::text, lang, term, kind, enabled from mod_terms order by kind, lang, term`),
    catalogoConfig(),
    saludImagen(),
    // 5h · El traductor propio (salud, nunca textos: el Super Admin ve siempre el original) y el tope por persona en una hora.
    saludTraductor(),
  ]);
  const marcas = (await db().query<{ regla: string; n: number }>(`select rule_key as regla, count(*)::int as n from mod_flags where created_at > now() - interval '30 days' group by rule_key`)).rows;
  return {
    reglas: ORDEN_REGLAS.map((k) => { const r = R.rows.find((x) => x.key === k); return { k, on: r?.enabled ?? true, params: r?.params ?? {}, at: r?.updated_at ?? null, quien: r?.quien ?? null, n30: marcas.find((m) => m.regla === k)?.n ?? 0 }; }),
    // Los límites y el tope de traducciones son de Configuración (lib/config.ts): valor, de fábrica y límites salen del catálogo.
    terminos: T.rows, limites: ORDEN_LIMITES.map((k) => { const c = cfg.find((x) => x.key === LIMITES[k].key)!; return { k, v: c.v, def: c.def, min: c.min, max: c.max }; }), img,
    trad: { ...trad, ...(({ v, def, min, max }) => ({ tope: v, def, min, max }))(cfg.find((x) => x.key === "com_traduccion_hora")!) },
  };
}
export type AutoMod = Awaited<ReturnType<typeof autoModeracion>>;
