import "server-only";
import { cfgSql } from "./config";
import type { PoolClient } from "pg";
import { avisar } from "./avisos";
import { db, tx } from "./db";
import { APELABLE, MAX_APELACION, MIN_APELACION, type Apelable } from "./moderacion-comun";
import { SANCIONES, type Sancion } from "./sanciones";

/* 5d · Avisos de moderación y apelaciones (fase5-comunidad.md §3 «Moderación con plazo», §4 5d; hueco #3).
   - avisarOculto() / avisarSancion(): TODA acción que oculta algo de la Comunidad o sanciona a una persona avisa con el motivo y
     lleva a «Apelar» (/cuenta/moderacion; guardián ocultarAvisaYApela). Sin SMS.
   - misAvisos() / avisoDe(): lo que To'Latino ocultó de la persona (publicaciones, comentarios, mensajes, fotos) y sus sanciones
     vivas, con el motivo, hasta cuándo puede apelar (14 días) y cómo va su apelación.
   - apelar(): una vez por cosa, 20–500 letras, en 14 días → caso en la cola «apel» (72 h) → «Recibimos tu apelación. Te respondemos
     en 72 h.». La base pone quién sancionó (sanctioned_by) y rechaza que esa persona la decida (segunda revisión).
   - decidirApelacion(): otra persona del equipo; «lifted» devuelve el contenido (o levanta la sanción y la cuenta vuelve a activa si
     no le queda otra) y cierra los casos abiertos de ese contenido; «upheld» la mantiene. La decisión es final y avisa con el motivo. */
type Bi = { es: string; en: string };
type Q = Pick<PoolClient, "query">;
const ID = /^\d{1,18}$/, UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const no = (es: string, en: string): { ok: false; msg: Bi } => ({ ok: false, msg: { es, en } });
export const RUTA_AVISO = (k: Apelable, id: string) => `/cuenta/moderacion?k=${k}&id=${encodeURIComponent(id)}`;
const okId = (k: string, id: string) => (k === "media" ? UUID.test(id) : k === "evt_org" ? /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) && id.length <= 80 : ID.test(id));

/* ── Avisos ── */
export async function avisarOculto(userId: string, k: Exclude<Apelable, "sanction">, id: string, motivo: string, o: { auto?: boolean } = {}) {
  const tpl = k === "com_post" ? (o.auto ? "com_autohide" : "com_hide") : k === "com_comment" ? (o.auto ? "com_cm_autohide" : "com_cm_hide") : k === "dm_message" ? "dm_hide" : "mod_foto";
  await avisar(userId, tpl, { motivo: motivo.slice(0, 160) }, { href: RUTA_AVISO(k, id), ref: [k, id], sinSms: true }).catch(() => undefined);
}
export async function avisarSancion(userId: string, sancionId: string, kind: Sancion, motivo: string) {
  const en = (await db().query<{ lang: string }>(`select coalesce(lang, 'es') as lang from users where id = $1`, [userId])).rows[0]?.lang === "en";
  await avisar(userId, "mod_sancion", { sancion: en ? SANCIONES[kind].en : SANCIONES[kind].es, motivo: motivo.slice(0, 160) }, { href: RUTA_AVISO("sanction", sancionId), ref: ["sanction", sancionId], sinSms: true }).catch(() => undefined);
}

/* Aplicar una sanción a una persona (dentro de la transacción de quien decide). El efecto en la Comunidad lo lee efectoSancion().
   Quien llama avisa después con avisarSancion() (guardián ocultarAvisaYApela). */
export async function aplicarSancion(c: Q, s: { userId: string; ciudad: string | null; kind: Sancion; motivo: string; staffId: string; ref?: [string, string] | null }) {
  const k = SANCIONES[s.kind], fin = k.dias ? `now() + interval '${k.dias} days'` : "null";
  const id = (await c.query<{ id: string }>(
    `insert into sanctions (target_kind, target_id, city_id, kind, reason, by_staff, ends_at, ref_kind, ref_id) values ('user', $1, $2, $3, $4, $5, ${fin}, $6, $7) returning id::text`,
    [s.userId, s.ciudad, s.kind, s.motivo, s.staffId, s.ref?.[0] ?? null, s.ref?.[1] ?? null])).rows[0]!.id;
  if (s.kind !== "adv") await c.query(`update users set status = $2, status_until = ${fin}, status_reason = $3 where id = $1 and status not in ('banned', 'deleted', 'merged')`, [s.userId, k.estado, s.motivo]);
  if (s.kind === "susp14" || s.kind === "ban") await c.query(`update sessions set signed_out_at = now() where user_id = $1 and signed_out_at is null`, [s.userId]);
  return id;
}

/* ── Lo que la persona ve: sus avisos de moderación ── */
export type AvisoMod = {
  k: Apelable; id: string; que: Bi; motivo: string | null; at: string; texto: string; foto: string | null; auto: boolean; href: string | null;
  efecto: Bi | null; hasta: string | null; vence: string; puedeApelar: boolean;
  apelacion: { numero: string; estado: "open" | "upheld" | "lifted"; texto: string; at: string; decision: string | null; decidida: string | null } | null;
};
type Fila = { k: Apelable; id: string; motivo: string | null; at: string; texto: string; foto: string | null; auto: boolean; href: string | null; kind: Sancion | null; hasta: string | null };
const DIAS = cfgSql("com_apelar_dias"); // 5i · valor de Configuración (lib/config.ts)
const FILAS = (filtro: string) => `
  select 'com_post' as k, p.id::text as id, p.hidden_reason as motivo, p.hidden_at as at, left(p.body, 280) as texto, null::text as foto, p.hidden_by = 'auto' as auto, '/comunidad/p/' || p.id as href, null::text as kind, null::timestamptz as hasta
    from com_posts p where p.author_user_id = $1 and p.status = 'hidden' and p.hidden_at > now() - interval '90 days' ${filtro.replace(/\$K/g, "'com_post'").replace(/\$X/g, "p.id::text")}
  union all
  select 'com_comment', c.id::text, c.hidden_reason, c.hidden_at, left(c.body, 280), null, c.hidden_by = 'auto', '/comunidad/p/' || c.post_id, null, null
    from com_comments c where c.author_user_id = $1 and c.status = 'hidden' and c.hidden_at > now() - interval '90 days' ${filtro.replace(/\$K/g, "'com_comment'").replace(/\$X/g, "c.id::text")}
  union all
  select 'media', m.id::text, m.removed_note, m.removed_at, coalesce(left(p.body, 120), ''), m.url, false, '/comunidad/p/' || p.id, null, null
    from media m join com_posts p on m.owner_kind = 'com_post' and p.id::text = m.owner_id
   where m.uploaded_by = $1 and m.status = 'removed' and m.removed_reason = 'admin' and m.removed_at > now() - interval '90 days' ${filtro.replace(/\$K/g, "'media'").replace(/\$X/g, "m.id::text")}
  union all
  select 'event', e.id::text, coalesce(e.hidden_reason, e.review_note), coalesce(e.hidden_at, e.reviewed_at), e.title->>'es', null, false, '/panel/' || e.business_id || '/eventos?det=evt:' || e.id, null, null
    from events e join business_members bm on bm.business_id = e.business_id and bm.kind = 'owner' and bm.status = 'active' and bm.user_id = $1
   where (e.hidden_at is not null or e.status = 'rejected') and coalesce(e.hidden_at, e.reviewed_at) > now() - interval '90 days' ${filtro.replace(/\$K/g, "'event'").replace(/\$X/g, "e.id::text")}
  union all
  select 'evt_org', o.business_id, o.blocked_reason, o.blocked_at, b.name, null, false, '/panel/' || o.business_id || '/eventos', null, null
    from event_organizers o join businesses b on b.id = o.business_id join business_members bm on bm.business_id = o.business_id and bm.kind = 'owner' and bm.status = 'active' and bm.user_id = $1
   where o.blocked_at is not null ${filtro.replace(/\$K/g, "'evt_org'").replace(/\$X/g, "o.business_id")}
  union all
  select 'sanction', s.id::text, s.reason, s.starts_at, '', null, false, null, s.kind, s.ends_at
    from sanctions s where s.target_kind = 'user' and s.target_id = $1::text and s.lifted_at is null and (s.ends_at is null or s.ends_at > now())
     and s.kind in ('adv', 'mute7', 'nopub', 'susp14', 'ban') and s.starts_at > now() - interval '90 days' ${filtro.replace(/\$K/g, "'sanction'").replace(/\$X/g, "s.id::text")}`;

async function armar(userId: string, F: Fila[]): Promise<AvisoMod[]> {
  if (!F.length) return [];
  const [A, dias] = await Promise.all([
    db().query<{ k: Apelable; id: string; numero: string; estado: "open" | "upheld" | "lifted"; texto: string; at: string; decision: string | null; decidida: string | null }>(
      `select target_kind as k, target_id as id, number as numero, status as estado, text as texto, created_at as at, decision_reason as decision, decided_at as decidida
         from appeals where user_id = $1 and (target_kind, target_id) in (select * from unnest($2::text[], $3::text[]))`, [userId, F.map((x) => x.k), F.map((x) => x.id)]),
    db().query<{ d: number }>(`select ${DIAS} as d`),
  ]);
  const d = dias.rows[0]!.d;
  return F.map((x) => {
    const ap = A.rows.find((a) => a.k === x.k && a.id === x.id) ?? null, vence = new Date(new Date(x.at).getTime() + d * 86_400_000).toISOString();
    const s = x.kind ? SANCIONES[x.kind] : null;
    return {
      k: x.k, id: x.id, que: x.k === "sanction" && s ? { es: s.es, en: s.en } : { es: APELABLE[x.k].oculto.es, en: APELABLE[x.k].oculto.en }, motivo: x.motivo, at: new Date(x.at).toISOString(),
      texto: x.texto, foto: x.foto, auto: x.auto, href: x.href, efecto: s ? s.com : null, hasta: x.hasta ? new Date(x.hasta).toISOString() : null, vence,
      puedeApelar: !ap && Date.now() < new Date(vence).getTime(),
      apelacion: ap ? { numero: ap.numero, estado: ap.estado, texto: ap.texto, at: new Date(ap.at).toISOString(), decision: ap.decision, decidida: ap.decidida ? new Date(ap.decidida).toISOString() : null } : null,
    };
  });
}

/* Todo lo de la persona (lo más reciente primero) y sus apelaciones ya decididas (90 días). */
export async function misAvisos(userId: string) {
  const { mensajesOcultosDe } = await import("./mensajes-vecinos");
  const [F, M, D] = await Promise.all([
    db().query<Fila>(`${FILAS("")} order by at desc limit 60`, [userId]),
    mensajesOcultosDe(userId, null),
    db().query<{ numero: string; k: Apelable; estado: "upheld" | "lifted"; decision: string; decidida: string; motivo: string | null }>(
      `select number as numero, target_kind as k, status as estado, decision_reason as decision, decided_at as decidida, hidden_reason as motivo
         from appeals where user_id = $1 and status <> 'open' and decided_at > now() - interval '90 days' order by decided_at desc limit 30`, [userId]),
  ]);
  const items = (await armar(userId, [...F.rows, ...M.map((m) => ({ ...m, k: "dm_message" as const, foto: null, auto: false, kind: null, hasta: null }))])).sort((a, b) => b.at.localeCompare(a.at));
  return { items, decididas: D.rows.map((x) => ({ ...x, decidida: new Date(x.decidida).toISOString() })) };
}
export type MisAvisos = Awaited<ReturnType<typeof misAvisos>>;

export async function avisoDe(userId: string, k: string, id: string): Promise<AvisoMod | null> {
  if (!(k in APELABLE) || !okId(k, id)) return null;
  if (k === "dm_message") {
    const { mensajesOcultosDe } = await import("./mensajes-vecinos");
    const M = await mensajesOcultosDe(userId, id);
    return (await armar(userId, M.map((m) => ({ ...m, k: "dm_message" as const, foto: null, auto: false, kind: null, hasta: null }))))[0] ?? null;
  }
  const F = (await db().query<Fila>(`select * from (${FILAS("and $K = $2 and $X = $3")}) x`, [userId, k, id])).rows;
  return (await armar(userId, F))[0] ?? null;
}

/* ── Apelar ── */
export async function apelar(userId: string, k: string, id: string, texto: string): Promise<{ ok: true; numero: string } | { ok: false; msg: Bi }> {
  const t = String(texto ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim();
  if (t.length < MIN_APELACION) return no(`Cuéntanos un poco más: al menos ${MIN_APELACION} letras.`, `Tell us a bit more: at least ${MIN_APELACION} characters.`);
  if (t.length > MAX_APELACION) return no(`Máximo ${MAX_APELACION} letras.`, `${MAX_APELACION} characters at most.`);
  const a = await avisoDe(userId, k, id);
  if (!a) return no("No encontramos lo que quieres apelar.", "We could not find what you want to appeal.");
  if (a.apelacion) return no(`Ya apelaste (${a.apelacion.numero}). La revisión es una sola.`, `You already appealed (${a.apelacion.numero}). There is a single review.`);
  if (!a.puedeApelar) return no("Ya pasaron los días para apelar.", "The time to appeal has passed.");
  const r = await tx(async (c) => {
    const ap = (await c.query<{ id: string; numero: string; ciudad: string | null }>(
      `insert into appeals (user_id, target_kind, target_id, text) values ($1, $2, $3, $4) on conflict (target_kind, target_id, user_id) do nothing returning id::text, number as numero, city_id as ciudad`,
      [userId, k, id, t])).rows[0];
    if (!ap) return null;
    const ciudad = ap.ciudad ?? (await c.query<{ c: string | null }>(`select home_city_id as c from users where id = $1`, [userId])).rows[0]?.c ?? "hzl";
    await c.query(`insert into queue_items (queue, subject_kind, subject_id, city_id, priority) values ('apel', 'appeal', $1, $2, 'normal') on conflict (queue, subject_kind, subject_id) where status = 'open' do nothing`, [ap.id, ciudad]);
    return ap;
  }).catch((e) => { if (/apelar|oculto|sanción/.test(String(e?.message))) return null; throw e; });
  if (!r) return no("No encontramos lo que quieres apelar.", "We could not find what you want to appeal.");
  await avisar(userId, "apel_recibida", { numero: r.numero }, { href: RUTA_AVISO(k as Apelable, id), ref: ["appeal", r.id], sinSms: true }).catch(() => undefined);
  return { ok: true, numero: r.numero };
}

/* ── Para la cola «apel»: la apelación y lo apelado (para decidir; el mensaje de un vecino solo con la apelación abierta) ── */
export async function apelacionDeCaso(appealId: string) {
  if (!ID.test(appealId)) return null;
  const a = (await db().query<{ id: string; numero: string; k: Apelable; tid: string; texto: string; estado: string; at: string; motivo: string | null; uid: string; quien: string;
    por: string | null; por_nombre: string | null; sancion: Sancion | null; hasta: string | null }>(
    `select a.id::text, a.number as numero, a.target_kind as k, a.target_id as tid, a.text as texto, a.status as estado, a.created_at as at, a.hidden_reason as motivo, a.user_id::text as uid,
            coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), 'Vecino') as quien, a.sanctioned_by::text as por,
            nullif(trim(coalesce(st.first_name, '') || ' ' || left(coalesce(st.last_name, ''), 1)), '') as por_nombre, s.kind as sancion, s.ends_at as hasta
       from appeals a join users u on u.id = a.user_id left join users st on st.id = a.sanctioned_by left join sanctions s on s.id = a.sanction_id where a.id = $1::bigint`, [appealId])).rows[0];
  if (!a) return null;
  let contenido: { texto: string; foto: string | null; href: string | null } = { texto: "", foto: null, href: null };
  if (a.k === "com_post") contenido = (await db().query<{ texto: string; href: string }>(`select body as texto, '/comunidad/p/' || id as href, null as foto from com_posts where id = $1::bigint`, [a.tid])).rows[0] as typeof contenido ?? contenido;
  if (a.k === "com_comment") contenido = (await db().query<{ texto: string; href: string }>(`select body as texto, '/comunidad/p/' || post_id as href, null as foto from com_comments where id = $1::bigint`, [a.tid])).rows[0] as typeof contenido ?? contenido;
  if (a.k === "media") contenido = (await db().query<{ texto: string; foto: string; href: string }>(`select '' as texto, url as foto, '/comunidad/p/' || owner_id as href from media where id = $1::uuid`, [a.tid])).rows[0] ?? contenido;
  if (a.k === "dm_message" && a.estado === "open") contenido = { texto: (await (await import("./admin-dm")).dmApelado(a.tid)) ?? "", foto: null, href: null };
  if (a.k === "sanction" && a.sancion) contenido = { texto: `${SANCIONES[a.sancion].es} · ${SANCIONES[a.sancion].com.es}`, foto: null, href: null };
  if (a.k === "event") contenido = (await db().query<{ texto: string; href: string; foto: string | null }>(
    `select e.title->>'es' || ' · ' || b.name as texto, '/admin/eventos/' || e.id as href,
            (select m.url from media m where m.owner_kind = 'event' and m.owner_id = e.id::text and m.status = 'visible' order by m.sort limit 1) as foto
       from events e join businesses b on b.id = e.business_id where e.id = $1::bigint`, [a.tid])).rows[0] ?? contenido;
  if (a.k === "evt_org") contenido = (await db().query<{ texto: string; href: string }>(`select 'Bloqueo de eventos · ' || name as texto, '/admin/eventos?tab=org' as href, null as foto from businesses where id = $1`, [a.tid])).rows[0] as typeof contenido ?? contenido;
  const [hist] = await Promise.all([
    db().query<{ kind: Sancion; at: string; reason: string; lifted: boolean }>(
      `select kind, starts_at as at, reason, lifted_at is not null as lifted from sanctions where target_kind = 'user' and target_id = $1 order by starts_at desc limit 10`, [a.uid]),
  ]);
  return { ...a, contenido, historial: hist.rows };
}

/* ── Decidir (segunda revisión). Lo llama app/admin/acciones-confianza.ts dentro de su permiso; la base vuelve a impedir que lo
   decida quien sancionó. Devuelve qué avisar después de guardar. ── */
export async function decidirApelacion(c: PoolClient, staffId: string, appealId: string, accion: "upheld" | "lifted", motivo: string) {
  const a = (await c.query<{ id: string; numero: string; k: Apelable; tid: string; uid: string; por: string | null; estado: string; sid: string | null; ciudad: string | null }>(
    `select id::text, number as numero, target_kind as k, target_id as tid, user_id::text as uid, sanctioned_by::text as por, status as estado, sanction_id::text as sid, city_id as ciudad
       from appeals where id = $1::bigint for update`, [appealId])).rows[0];
  if (!a) return { err: "Esa apelación no existe." };
  if (a.estado !== "open") return { err: "Esta apelación ya se decidió." };
  if (a.por === staffId) return { err: "Tú ocultaste o sancionaste esto: la apelación la decide otra persona del equipo." };
  if (a.uid === staffId) return { err: "Nadie decide su propia apelación." };
  if (accion === "lifted") {
    if (a.k === "com_post" || a.k === "com_comment") {
      const tabla = a.k === "com_post" ? "com_posts" : "com_comments";
      await c.query(`update ${tabla} set status = 'visible', hidden_by = null, hidden_staff_id = null, hidden_reason = null, hidden_at = null where id = $1::bigint and status = 'hidden'`, [a.tid]);
      // Los casos abiertos de ese contenido se cierran con esta decisión; sus reportes quedan descartados.
      await c.query(`update queue_items set status = 'decided', decision = 'apelacion', reason = $3, decided_by = $4, decided_at = now() where queue = 'rep' and subject_kind = $1 and subject_id = $2 and status = 'open'`, [a.k, a.tid, motivo, staffId]);
      await c.query(`update content_reports set status = 'dismissed', decided_by = $3, decided_at = now() where target_kind = $1 and target_id = $2 and status = 'open'`, [a.k, a.tid, staffId]);
    } else if (a.k === "dm_message") {
      await (await import("./admin-dm")).restaurarDmApelado(c, a.tid);
    } else if (a.k === "media") {
      await c.query(`update media set status = 'visible', removed_reason = null, removed_note = null, removed_by = null, removed_at = null where id = $1::uuid and status = 'removed' and removed_reason = 'admin'`, [a.tid]);
    } else if (a.k === "event") {
      // 6a · Tenía razón: el evento vuelve a verse; si no se había aprobado, queda aprobado por quien decide la apelación.
      await c.query(`update events set hidden_at = null, hidden_by = null, hidden_reason = null where id = $1::bigint and hidden_at is not null`, [a.tid]);
      const ap = await c.query(`update events set status = 'live', approved_at = now(), approved_by = $2, reviewed_at = now(), reviewed_by = $2, review_note = null, review_reason_key = null
                                 where id = $1::bigint and status = 'rejected' and not exists (select 1 from event_organizers o where o.business_id = events.business_id and o.blocked_at is not null)`, [a.tid, staffId]);
      if (ap.rowCount) await (await import("./evt")).registrar(c, a.tid, "approved", "staff", staffId, null, `Apelación ${a.numero}: ${motivo}`.slice(0, 500));
    } else if (a.k === "evt_org") {
      await c.query(`update event_organizers set blocked_at = null, blocked_by = null, blocked_reason = null, updated_at = now() where business_id = $1 and blocked_at is not null`, [a.tid]);
    } else if (a.sid) {
      await c.query(`update sanctions set lifted_at = now(), lifted_by = $2, lift_reason = $3 where id = $1::bigint and lifted_at is null`, [a.sid, staffId, `Apelación ${a.numero}: ${motivo}`.slice(0, 500)]);
      const otra = (await c.query(`select 1 from sanctions where target_kind = 'user' and target_id = $1 and lifted_at is null and (ends_at is null or ends_at > now()) and kind in ('mute7', 'nopub', 'susp14', 'ban')`, [a.uid])).rowCount;
      if (!otra) await c.query(`update users set status = 'active', status_until = null, status_reason = null where id = $1 and status in ('muted', 'suspended', 'banned')`, [a.uid]);
    }
    // 5f · Puntos: al volver a verse, la base devuelve lo que se restó al ocultar (trigger → pts_restaurar_objetivo: asiento inverso del
    // inverso); el rango se recalcula después de guardar (avisarDecision).
  }
  await c.query(`update appeals set status = $2, decided_by = $3, decided_at = now(), decision_reason = $4 where id = $1::bigint`, [a.id, accion, staffId, motivo]);
  return { err: null, a };
}
/* Después de guardar la decisión: el aviso a quien apeló, con el motivo. */
export async function avisarDecision(a: { numero: string; k: Apelable; tid: string; uid: string }, accion: "upheld" | "lifted", motivo: string) {
  if (accion === "lifted") await (await import("./puntos")).recalcularRango(a.uid).catch(() => undefined);
  const en = (await db().query<{ lang: string }>(`select coalesce(lang, 'es') as lang from users where id = $1`, [a.uid])).rows[0]?.lang === "en";
  const que = a.k === "sanction" ? (en ? "the sanction was lifted" : "levantamos la sanción") : a.k === "evt_org" ? (en ? "you can publish events again" : "puedes publicar eventos otra vez")
    : en ? `your ${APELABLE[a.k].en} is visible again` : `tu ${APELABLE[a.k].es} se ve otra vez`;
  await avisar(a.uid, accion === "lifted" ? "apel_lifted" : "apel_upheld", { numero: a.numero, que, motivo: motivo.slice(0, 160) }, { href: RUTA_AVISO(a.k, a.tid), ref: ["appeal", a.numero], sinSms: true }).catch(() => undefined);
}
