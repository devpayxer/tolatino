import "server-only";
import { avisar } from "./avisos";
import { db, tx } from "./db";
import { revisarMensaje } from "./comunidad-filtro";
import { ISO, UUID, autores, corto, enComunidad, ini, no, sinBloqueo, type Res } from "./comunidad";

/* Comunidad · Mensajes vecino ↔ vecino (APP-COM-MENSAJES / APP-COM-CHAT; fase5-comunidad.md §4 5c y §6 #16). El patrón de
   lib/mensajes.ts (lista por cursor, «solo con un reporte abierto se lee», ocultar con motivo) en tablas propias (0099). Reglas:
   - Solo texto (1–1000), sin teléfonos, correos ni números privados (revisarMensaje; la base lo impone con com_sin_datos).
   - Un mensaje nuevo solo a quien te sigue, o a quien ya te escribió en esa conversación (la base también lo impone).
   - Con un bloqueo de por medio, en cualquier sentido, la conversación no existe para ninguno de los dos (se cierra sin avisar);
     la respuesta es la misma que «no existe». Silenciar: los mensajes llegan, pero sin aviso.
   - Límites: 10 conversaciones nuevas al día (24 h) y 20 mensajes cada 10 minutos por persona.
   - Nada se borra: el equipo oculta un mensaje con motivo, y solo lo lee con un reporte abierto (lib/admin-dm.ts). */
type Bi = { es: string; en: string };
export const NUEVAS_DIA = 10, POR_PAGINA_DM = 30, MSJS_PAGINA = 50;
const NO_ESTA = () => no("No encontramos esta conversación.", "We could not find this conversation.");
const ENTRA_COM = () => no("Antes de escribir, termina tu bienvenida a la Comunidad.", "Before writing, finish your Community welcome.");
const SOLO_SIGUE: Bi = { es: "Solo le escribes a quien te sigue.", en: "You can only message people who follow you." };

/* La otra persona, tal como la puede ver quien mira (activa, en la Comunidad, sin bloqueo en ningún sentido). */
async function otraPersona(viewer: string, otro: string) {
  if (!UUID.test(otro) || otro === viewer) return null;
  return (await db().query<{ id: string; first_name: string | null; last_name: string | null; photo_url: string | null; rango: number; zona: Bi | null; me_sigue: boolean; activa: boolean }>(
    `select u.id::text, u.first_name, u.last_name, u.photo_url, coalesce(cp.rank_level, 1) as rango, z.name as zona,
            exists (select 1 from follows f where f.follower_user_id = u.id and f.target_kind = 'user' and f.target_id = $1::uuid::text) as me_sigue,
            cuenta_estado(u.status, u.status_until) in ('active', 'muted') as activa
       from users u join community_profiles cp on cp.user_id = u.id and cp.adult is true and cp.welcome_at is not null
       left join zones z on z.city_id = u.home_city_id and z.id = u.zone_id
      where u.id = $2 and ${sinBloqueo("u.id", "$1")}`, [viewer, otro])).rows[0] ?? null;
}

/* ── La lista (APP-COM-MENSAJES): las conversaciones con algo escrito, la más reciente primero, de 30 en 30 por (last_at, id).
   Dos lecturas por índice (como «a» y como «b») unidas; sin las cerradas ni las de alguien con un bloqueo. ── */
export type Conv = { id: string; otro: { id: string; nombre: string; ini: string; foto: string | null; rango: number }; last: string; oculto: boolean; mio: boolean; at: string; unread: number };
export async function misConversaciones(viewer: string, cursor: string | null) {
  const c = cursor && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z\|\d{1,18}$/.test(cursor) ? cursor.split("|") : null;
  const lado = (yo: "a" | "b", otro: "a" | "b") => `(select t.id, t.${otro}_user_id as otro, t.last_text, t.last_from, t.last_at, t.${yo}_unread as unread
       from dm_threads t where t.${yo}_user_id = $1 and t.last_at is not null and t.closed_at is null and ${sinBloqueo(`t.${otro}_user_id`, "$1")}
        and ($2::timestamptz is null or (t.last_at, t.id) < ($2::timestamptz, $3::bigint))
      order by t.last_at desc, t.id desc limit ${POR_PAGINA_DM + 1})`;
  const L = (await db().query<{ id: string; otro: string; last_text: string | null; mio: boolean; at: string; unread: number; cur: string }>(
    `select x.id::text, x.otro::text, x.last_text, x.last_from = $1 as mio, ${ISO("x.last_at")} as at, x.unread,
            to_char(x.last_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || x.id as cur
       from (${lado("a", "b")} union all ${lado("b", "a")}) x order by x.last_at desc, x.id desc limit ${POR_PAGINA_DM + 1}`, [viewer, c?.[0] ?? null, c?.[1] ?? null])).rows;
  const filas = L.slice(0, POR_PAGINA_DM), A = await autores(filas.map((f) => f.otro));
  const items: Conv[] = filas.map((f) => { const a = A(f.otro); return { id: f.id, otro: { id: f.otro, nombre: a.nombre, ini: a.ini, foto: a.foto, rango: a.rango }, last: f.last_text ?? "", oculto: f.last_text === "", mio: f.mio, at: f.at, unread: f.unread }; });
  return { items, mas: L.length > POR_PAGINA_DM ? filas.at(-1)!.cur : null };
}
export async function sinLeerVecinos(viewer: string): Promise<number> {
  return (await db().query<{ n: number }>(
    `select coalesce((select sum(t.a_unread) from dm_threads t where t.a_user_id = $1 and t.closed_at is null and ${sinBloqueo("t.b_user_id", "$1")}), 0)::int
          + coalesce((select sum(t.b_unread) from dm_threads t where t.b_user_id = $1 and t.closed_at is null and ${sinBloqueo("t.a_user_id", "$1")}), 0)::int as n`, [viewer])).rows[0]?.n ?? 0;
}

/* ── La conversación (APP-COM-CHAT) ── */
export type MsjV = { id: string; mio: boolean; t: string; oculto: boolean; at: string };
export type Conversacion = {
  id: string | null; otro: { id: string; nombre: string; ini: string; foto: string | null; rango: number; zona: Bi | null; meSigue: boolean };
  msjs: MsjV[]; mas: string | null; puede: boolean; motivo: Bi | null;
};
const MSJS = (filtro: string) => `select m.id::text, m.sender_user_id = $2 as mio, case when m.hidden_at is null then m.body else '' end as t, m.hidden_at is not null as oculto, ${ISO("m.created_at")} as at
  from dm_messages m where m.thread_id = $1 ${filtro}`;
async function hiloDe(viewer: string, otro: string) {
  return (await db().query<{ id: string; closed: boolean; me_escribio: boolean }>(
    `select t.id::text, t.closed_at is not null as closed, exists (select 1 from dm_messages m where m.thread_id = t.id and m.sender_user_id = $2) as me_escribio
       from dm_threads t where t.a_user_id = least($1::uuid, $2::uuid) and t.b_user_id = greatest($1::uuid, $2::uuid)`, [viewer, otro])).rows[0] ?? null;
}
/* La conversación con otra persona (aunque todavía no exista: se crea al primer mensaje). Marca leído. null = no existe para ti. */
export async function conversacion(viewer: string, otroId: string, antes: string | null = null): Promise<Conversacion | null> {
  const o = await otraPersona(viewer, otroId);
  if (!o) return null;
  const t = await hiloDe(viewer, o.id);
  if (t?.closed) return null;
  const cur = antes && /^\d{1,18}$/.test(antes) ? antes : null;
  const L = t ? (await db().query<MsjV>(`${MSJS(cur ? "and m.id < $3::bigint" : "")} order by m.id desc limit ${MSJS_PAGINA + 1}`, cur ? [t.id, viewer, cur] : [t.id, viewer])).rows : [];
  if (t && !cur) await db().query(`select dm_leido($1::bigint, $2::uuid)`, [t.id, viewer]);
  const yo = await enComunidad(viewer);
  const puede = yo.ok && o.activa && (o.me_sigue || !!t?.me_escribio);
  const n = corto(o.first_name, o.last_name);
  return {
    id: t?.id ?? null, otro: { id: o.id, nombre: n, ini: ini(n), foto: o.photo_url, rango: o.rango, zona: o.zona, meSigue: o.me_sigue },
    msjs: L.slice(0, MSJS_PAGINA).reverse(), mas: L.length > MSJS_PAGINA ? L[MSJS_PAGINA - 1]!.id : null, puede,
    motivo: puede ? null : !o.activa ? { es: "Esta cuenta no recibe mensajes ahora.", en: "This account is not taking messages now." } : SOLO_SIGUE,
  };
}
/* ¿La otra persona ya te escribió en una conversación abierta? (Entonces le puedes contestar aunque no te siga.) */
export async function meEscribio(viewer: string, otro: string) {
  if (!UUID.test(otro)) return false;
  const t = await hiloDe(viewer, otro);
  return !!t && !t.closed && t.me_escribio;
}
/* Los mensajes nuevos desde un id (la pantalla abierta pregunta cada pocos segundos). Marca leído. */
export async function nuevos(viewer: string, otroId: string, desde: string): Promise<MsjV[] | null> {
  if (!(await otraPersona(viewer, otroId))) return null;
  const t = await hiloDe(viewer, otroId);
  if (!t || t.closed) return t?.closed ? null : [];
  const L = (await db().query<MsjV>(`${MSJS("and m.id > $3::bigint")} order by m.id limit 100`, [t.id, viewer, /^\d{1,18}$/.test(desde) ? desde : "0"])).rows;
  if (L.length) await db().query(`select dm_leido($1::bigint, $2::uuid)`, [t.id, viewer]);
  return L;
}

/* ── Escribir ── */
export async function enviar(viewer: string, otroId: string, texto: unknown, ciudad: string): Promise<Res<{ id: string; msj: MsjV }>> {
  const f = revisarMensaje(String(texto ?? ""));
  if (f) return { ok: false, msg: f.msg, campo: f.campo };
  const body = String(texto ?? "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const r = await tx(async (c) => {
    if (!(await enComunidad(viewer, c)).ok) return ENTRA_COM();
    const yo = (await c.query<{ estado: string; f: string | null; l: string | null; home: string | null }>(
      `select cuenta_estado(status, status_until) as estado, first_name as f, last_name as l, home_city_id as home from users where id = $1`, [viewer])).rows[0];
    if (!yo || yo.estado !== "active") return no("Tu cuenta no puede escribir mensajes ahora.", "Your account can't send messages right now.");
    const o = await otraPersona(viewer, String(otroId ?? ""));
    if (!o) return NO_ESTA();
    if (!o.activa) return no("Esta cuenta no recibe mensajes ahora.", "This account is not taking messages now.");
    const r10 = (await c.query<{ n: number }>(`select count(*)::int as n from dm_messages where sender_user_id = $1 and created_at > now() - interval '10 minutes'`, [viewer])).rows[0]!.n;
    if (r10 >= 20) return no("Estás escribiendo muy rápido. Espera unos minutos.", "You are writing too fast. Wait a few minutes.");
    const [a, b] = viewer < o.id ? [viewer, o.id] : [o.id, viewer];
    let t = (await c.query<{ id: string; closed: boolean; otro_unread: number; me_escribio: boolean }>(
      `select t.id::text, t.closed_at is not null as closed, case when t.a_user_id = $3 then t.a_unread else t.b_unread end as otro_unread,
              exists (select 1 from dm_messages m where m.thread_id = t.id and m.sender_user_id = $3) as me_escribio
         from dm_threads t where t.a_user_id = $1 and t.b_user_id = $2 for update`, [a, b, o.id])).rows[0];
    if (t?.closed) return NO_ESTA();
    if (!o.me_sigue && !t?.me_escribio) return { ok: false as const, msg: SOLO_SIGUE };
    if (!t) {
      const hoy = (await c.query<{ n: number }>(`select count(*)::int as n from dm_threads where started_by = $1 and created_at > now() - interval '24 hours'`, [viewer])).rows[0]!.n;
      if (hoy >= NUEVAS_DIA) return no(`Ya empezaste ${NUEVAS_DIA} conversaciones hoy. Sigue mañana.`, `You started ${NUEVAS_DIA} conversations today. Continue tomorrow.`);
      t = { ...(await c.query<{ id: string }>(`insert into dm_threads (a_user_id, b_user_id, city_id, started_by) values ($1, $2, $3, $4) returning id::text`, [a, b, yo.home ?? ciudad, viewer])).rows[0]!, closed: false, otro_unread: 0, me_escribio: false };
    }
    const m = (await c.query<MsjV>(`insert into dm_messages (thread_id, sender_user_id, body) values ($1::bigint, $2, $3)
                                    returning id::text, true as mio, body as t, false as oculto, ${ISO("created_at")} as at`, [t.id, viewer, body])).rows[0]!;
    return { ok: true as const, id: t.id, msj: m, avisar: t.otro_unread === 0, otro: o.id, nombre: corto(yo.f, yo.l) };
  }).catch((e) => {
    const m = String(e?.message ?? "");
    if (String(e?.constraint ?? "").endsWith("_datos")) return no("Por seguridad, sin teléfonos ni datos en los mensajes.", "For your safety, no phone numbers or personal details in messages.");
    if (/bloqueo|cerrada/.test(m)) return NO_ESTA();
    if (/quien te sigue/.test(m)) return { ok: false as const, msg: SOLO_SIGUE };
    throw e;
  });
  if (!r.ok || !("avisar" in r)) return r;
  // Aviso a la otra persona cuando no tenía nada sin leer (uno por tanda), nunca si te silenció.
  if (r.avisar) {
    const silencio = (await db().query(`select 1 from user_blocks where user_id = $1 and target_user_id = $2 and removed_at is null`, [r.otro, viewer])).rowCount;
    if (!silencio) await avisar(r.otro, "dm_message", { nombre: r.nombre, texto: body.slice(0, 80) }, { href: `/comunidad/mensajes/${viewer}`, ref: ["dm_thread", r.id], actor: viewer });
  }
  return { ok: true, id: r.id, msj: r.msj };
}

/* Reportar una conversación (una vez por persona mientras esté abierta). El equipo de To'Latino la puede leer solo así, en Colas ›
   Mensajes reportados, mientras el caso siga abierto. Se puede reportar aunque ya hayas bloqueado a la otra persona. */
export const MOTIVOS_DM: Record<string, Bi> = {
  acoso: { es: "Acoso o amenazas", en: "Harassment or threats" }, spam: { es: "Spam o ventas", en: "Spam or sales" },
  priv: { es: "Pide o comparte datos privados", en: "Asks for or shares private details" }, otro: { es: "Otra cosa", en: "Something else" },
};
export async function reportarConversacion(viewer: string, otroId: string, motivo: string, nota: string): Promise<Res> {
  if (!MOTIVOS_DM[motivo]) return no("Elige un motivo.", "Pick a reason.");
  if (!UUID.test(String(otroId ?? ""))) return NO_ESTA();
  const t = (await db().query<{ id: string; city: string }>(
    `select t.id::text, t.city_id as city from dm_threads t where t.a_user_id = least($1::uuid, $2::uuid) and t.b_user_id = greatest($1::uuid, $2::uuid) and t.last_at is not null`, [viewer, otroId])).rows[0];
  if (!t) return NO_ESTA();
  const n = String(nota ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 300) || null;
  await tx(async (c) => {
    const ya = (await c.query(`select 1 from content_reports where target_kind = 'dm' and target_id = $1 and reporter_user_id = $2 and status = 'open'`, [t.id, viewer])).rowCount;
    if (ya) return;
    // Una conversación sigue en el tiempo: si ya la habías reportado y el caso se cerró, el reporte se vuelve a abrir (uno por persona).
    await c.query(`insert into content_reports (target_kind, target_id, city_id, reporter_user_id, by_business, reason, note, priority) values ('dm', $1, $2, $3, false, $4, $5, $6)
                   on conflict (target_kind, target_id, reporter_user_id) do update set status = 'open', reason = excluded.reason, note = excluded.note, priority = excluded.priority,
                     decided_by = null, decided_at = null, created_at = now()`,
      [t.id, t.city, viewer, motivo, n, motivo === "acoso" ? 1 : 0]);
    await c.query(`insert into queue_items (queue, subject_kind, subject_id, city_id, priority) values ('chat', 'dm_thread', $1, $2, $3)
                   on conflict (queue, subject_kind, subject_id) where status = 'open' do nothing`, [t.id, t.city, motivo === "acoso" ? "alta" : "normal"]);
  });
  return { ok: true };
}
