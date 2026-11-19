import "server-only";
import type { PoolClient } from "pg";
import { avisar } from "./avisos";
import { db, tx } from "./db";
import { revisarMensaje } from "./comunidad-filtro";
import { ISO, UUID, autores, corto, enComunidad, ini, no, sinBloqueo, type Res } from "./comunidad";
import { efectoSancion, esCrisis, limiteDia, marcar, noPuede } from "./moderacion";
import { detectarIdioma, idiomaTexto } from "./traductor";

/* Comunidad · Mensajes vecino ↔ vecino (APP-COM-MENSAJES / APP-COM-CHAT; fase5-comunidad.md §4 5c y §6 #16). El patrón de
   lib/mensajes.ts (lista por cursor, «solo con un reporte abierto se lee», ocultar con motivo) en tablas propias (0099). Reglas:
   - Texto (1–1000), sin teléfonos, correos ni números privados (revisarMensaje; la base lo impone con com_sin_datos).
   - 9t (19 nov) · Fotos (una por mensaje; el mensaje puede ser solo la foto), como Mensajes cliente ↔ negocio (lib/mensajes.ts): la sube
     /api/mensajes/foto con «para=dm» (privada, «privado/m/», sin metadatos, revisada por el modelo propio al subirla); aquí se ata al mensaje
     dentro de la transacción del envío (tomarFoto: solo la que subió esta persona, sin usar, de las últimas 24 h) y, si quedó en revisión, abre
     el caso en la cola «medios». Quién la ve lo decide /api/mensajes/foto/{id} (fotoDmVecino: las dos personas, sin bloqueo, la conversación
     abierta, revisada y el mensaje sin ocultar); aquí solo se dice su estado y la dirección a quien la puede ver (en revisión, solo quien la mandó).
   - 9t · Idioma: se detecta al enviar (traductor propio, ANTES de la transacción; si no se sabe, el de la app de quien escribe) para «Ver
     traducción» (lib/traduccion.ts, kind dm_message: FUENTE_TR_DM, solo las dos personas).
   - Un mensaje nuevo solo a quien te sigue, o a quien ya te escribió en esa conversación (la base también lo impone).
   - Con un bloqueo de por medio, en cualquier sentido, la conversación no existe para ninguno de los dos (se cierra sin avisar);
     la respuesta es la misma que «no existe». Silenciar: los mensajes llegan, pero sin aviso.
   - Límites: 10 conversaciones nuevas al día (24 h) y 20 mensajes cada 10 minutos por persona.
   - Nada se borra: el equipo oculta un mensaje con motivo, y solo lo lee con un reporte abierto (lib/admin-dm.ts). */
type Bi = { es: string; en: string };
export const POR_PAGINA_DM = 30, MSJS_PAGINA = 50;
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
/* 9t · foto: la dirección privada (/api/mensajes/foto/{id}) si quien mira la puede ver; fotoEst: ok · revision (el modelo la marcó o no respondió;
   solo quien la mandó la ve) · quitada (el equipo la quitó con motivo); lang: el idioma del texto («Ver traducción»; null = no se sabe). */
export type MsjV = { id: string; mio: boolean; t: string; oculto: boolean; at: string; foto: string | null; fotoEst: "ok" | "revision" | "quitada" | null; lang: "es" | "en" | null };
type FilaV = Omit<MsjV, "foto" | "fotoEst"> & { fid: string | null; fst: string | null; fsub: string | null };
export type Conversacion = {
  id: string | null; otro: { id: string; nombre: string; ini: string; foto: string | null; rango: number; zona: Bi | null; meSigue: boolean };
  msjs: MsjV[]; mas: string | null; puede: boolean; motivo: Bi | null;
};
const MSJS = (filtro: string) => `select m.id::text, m.sender_user_id = $2 as mio, case when m.hidden_at is null then m.body else '' end as t, m.hidden_at is not null as oculto, ${ISO("m.created_at")} as at,
       case when m.hidden_at is null then m.lang end as lang, case when m.hidden_at is null then m.media_id::text end as fid, x.status as fst, x.uploaded_by::text as fsub
  from dm_messages m left join media x on x.id = m.media_id where m.thread_id = $1 ${filtro}`;
/* Lo que la pantalla recibe de cada foto (nunca quién la subió): la dirección privada solo si la puede ver (revisada, o en revisión y es suya). */
const URL_FOTO = (id: string) => `/api/mensajes/foto/${id}`;
function conFoto(L: FilaV[], viewer: string): MsjV[] {
  return L.map(({ fid, fst, fsub, ...m }) => {
    if (!fid) return { ...m, foto: null, fotoEst: null };
    if (fst !== "visible" && fst !== "review") return { ...m, foto: null, fotoEst: "quitada" };
    const est = fst === "review" ? "revision" as const : "ok" as const;
    const ve = est === "ok" || fsub === viewer;
    return { ...m, foto: ve ? URL_FOTO(fid) : null, fotoEst: est };
  });
}
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
  const L = t ? conFoto((await db().query<FilaV>(`${MSJS(cur ? "and m.id < $3::bigint" : "")} order by m.id desc limit ${MSJS_PAGINA + 1}`, cur ? [t.id, viewer, cur] : [t.id, viewer])).rows, viewer) : [];
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
  const L = conFoto((await db().query<FilaV>(`${MSJS("and m.id > $3::bigint")} order by m.id limit 100`, [t.id, viewer, /^\d{1,18}$/.test(desde) ? desde : "0"])).rows, viewer);
  if (L.length) await db().query(`select dm_leido($1::bigint, $2::uuid)`, [t.id, viewer]);
  return L;
}

/* ── Escribir ── */
/* 9t · La foto que se manda: el id de /api/mensajes/foto (un uuid) o nada. tomarFoto (dentro de la transacción del envío, ANTES de guardar el
   mensaje; la bloquea): solo la que subió esta persona para Mensajes entre vecinos, sin usar, de las últimas 24 h y no quitada; si no, el envío no
   sale. ponerFoto (con el id del mensaje): la ata y, si el modelo la dejó en revisión, la marca (cola «medios» con la ciudad de la conversación). */
const fotoId = (f: unknown): string | null => (typeof f === "string" && UUID.test(f) ? f : null);
const FOTO_TXT = "Foto · Photo"; // lo que dicen la lista y el aviso cuando el mensaje es solo la foto (la lista lo muestra en su idioma)
type FotoTomada = { id: string; status: string; nota: string | null };
async function tomarFoto(c: PoolClient, f: string, quien: string): Promise<FotoTomada | null> {
  return (await c.query<FotoTomada>(
    `select id::text, status, check_note as nota from media where id = $1::uuid and owner_kind = 'dm' and owner_id = 'pendiente' and uploaded_by = $2 and private
        and purged_at is null and status in ('visible', 'review') and created_at > now() - interval '24 hours' for update`, [f, quien])).rows[0] ?? null;
}
async function ponerFoto(c: PoolClient, fo: FotoTomada, msgId: string, quien: string, ciudad: string): Promise<void> {
  await c.query(`update media set owner_id = $2 where id = $1::uuid and owner_id = 'pendiente'`, [fo.id, msgId]);
  if (fo.status !== "review") return;
  await marcar(c, { kind: "media", id: fo.id, regla: "img", autor: quien, ciudad, detalle: `Foto de Mensajes entre vecinos. ${fo.nota ?? "Espera revisión."}` });
}
const FOTO_NO = () => no("Esa foto ya no se puede mandar. Elígela otra vez.", "That photo can no longer be sent. Pick it again.");

export async function enviar(viewer: string, otroId: string, texto: unknown, ciudad: string, foto?: unknown): Promise<Res<{ id: string; msj: MsjV; crisis: boolean; revision: boolean }>> {
  const fid = fotoId(foto);
  const body = String(texto ?? "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  // Con foto, el texto puede quedar vacío; si hay texto, las mismas reglas de siempre.
  const f = fid && !body ? null : revisarMensaje(String(texto ?? ""));
  if (f) return { ok: false, msg: f.msg, campo: f.campo };
  // 9t · El idioma del texto (para «Ver traducción»), ANTES de abrir la transacción: enviar nunca espera al traductor con la base tomada.
  const app = body ? (await db().query<{ lang: string | null }>(`select lang from users where id = $1`, [viewer])).rows[0]?.lang : null;
  const lang = body ? idiomaTexto(await detectarIdioma(body), app) : null;
  const r = await tx(async (c) => {
    if (!(await enComunidad(viewer, c)).ok) return ENTRA_COM();
    const yo = (await c.query<{ estado: string; f: string | null; l: string | null; home: string | null }>(
      `select cuenta_estado(status, status_until) as estado, first_name as f, last_name as l, home_city_id as home from users where id = $1`, [viewer])).rows[0];
    if (!yo) return no("Tu cuenta no puede escribir mensajes ahora.", "Your account can't send messages right now.");
    // 5d · La sanción viva decide (silencio: no escribe; «bloquear publicación»: sí).
    const ef = await efectoSancion(c, viewer);
    if (!ef.mensajes) return noPuede(ef, { es: "escribir mensajes", en: "send messages" });
    const o = await otraPersona(viewer, String(otroId ?? ""));
    if (!o) return NO_ESTA();
    if (!o.activa) return no("Esta cuenta no recibe mensajes ahora.", "This account is not taking messages now.");
    const r10 = (await c.query<{ n: number }>(`select count(*)::int as n from dm_messages where sender_user_id = $1 and created_at > now() - interval '10 minutes'`, [viewer])).rows[0]!.n;
    if (r10 >= 20) return no("Estás escribiendo muy rápido. Espera unos minutos.", "You are writing too fast. Wait a few minutes.");
    const [a, b] = viewer < o.id ? [viewer, o.id] : [o.id, viewer];
    // 9t · La foto, antes de crear la conversación: sin ella, el envío no sale.
    const fo = fid ? await tomarFoto(c, fid, viewer) : null;
    if (fid && !fo) return FOTO_NO();
    let t = (await c.query<{ id: string; closed: boolean; otro_unread: number; me_escribio: boolean; city: string }>(
      `select t.id::text, t.closed_at is not null as closed, case when t.a_user_id = $3 then t.a_unread else t.b_unread end as otro_unread, t.city_id as city,
              exists (select 1 from dm_messages m where m.thread_id = t.id and m.sender_user_id = $3) as me_escribio
         from dm_threads t where t.a_user_id = $1 and t.b_user_id = $2 for update`, [a, b, o.id])).rows[0];
    if (t?.closed) return NO_ESTA();
    if (!o.me_sigue && !t?.me_escribio) return { ok: false as const, msg: SOLO_SIGUE };
    if (!t) {
      // Conversaciones nuevas del día (lib/moderacion.ts limiteDia: día local, la mitad el primer día de la cuenta).
      const lim = await limiteDia(c, viewer, "conversaciones");
      if (!lim.ok) return lim;
      t = { ...(await c.query<{ id: string; city: string }>(`insert into dm_threads (a_user_id, b_user_id, city_id, started_by) values ($1, $2, $3, $4) returning id::text, city_id as city`, [a, b, yo.home ?? ciudad, viewer])).rows[0]!, closed: false, otro_unread: 0, me_escribio: false };
    }
    const m = (await c.query<Omit<MsjV, "foto" | "fotoEst">>(`insert into dm_messages (thread_id, sender_user_id, body, media_id, lang) values ($1::bigint, $2, $3, $4::uuid, $5)
                                    returning id::text, true as mio, body as t, false as oculto, ${ISO("created_at")} as at, lang`, [t.id, viewer, body, fo?.id ?? null, lang])).rows[0]!;
    if (fo) await ponerFoto(c, fo, m.id, viewer, t.city);
    const msj: MsjV = { ...m, foto: fo ? URL_FOTO(fo.id) : null, fotoEst: fo ? (fo.status === "review" ? "revision" : "ok") : null };
    return { ok: true as const, id: t.id, msj, avisar: t.otro_unread === 0, otro: o.id, nombre: corto(yo.f, yo.l), crisis: body ? await esCrisis(c, body) : false, revision: fo?.status === "review" };
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
    if (!silencio) await avisar(r.otro, "dm_message", { nombre: r.nombre, texto: (body || FOTO_TXT).slice(0, 80) }, { href: `/comunidad/mensajes/${viewer}`, ref: ["dm_thread", r.id], actor: viewer });
  }
  return { ok: true, id: r.id, msj: r.msj, crisis: r.crisis, revision: r.revision };
}

/* Reportar una conversación (una vez por persona mientras esté abierta). El equipo de To'Latino la puede leer solo así, en Colas ›
   Mensajes reportados, mientras el caso siga abierto. Se puede reportar aunque ya hayas bloqueado a la otra persona. */
export const MOTIVOS_DM: Record<string, Bi> = {
  acoso: { es: "Acoso o amenazas", en: "Harassment or threats" }, spam: { es: "Spam o ventas", en: "Spam or sales" },
  priv: { es: "Pide o comparte datos privados", en: "Asks for or shares private details" }, otro: { es: "Otra cosa", en: "Something else" },
};
export async function reportarConversacion(viewer: string, otroId: string, motivo: string, nota: string, device: string | null = null): Promise<Res> {
  if (!MOTIVOS_DM[motivo]) return no("Elige un motivo.", "Pick a reason.");
  if (!UUID.test(String(otroId ?? ""))) return NO_ESTA();
  const t = (await db().query<{ id: string; city: string }>(
    `select t.id::text, t.city_id as city from dm_threads t where t.a_user_id = least($1::uuid, $2::uuid) and t.b_user_id = greatest($1::uuid, $2::uuid) and t.last_at is not null`, [viewer, otroId])).rows[0];
  if (!t) return NO_ESTA();
  const n = String(nota ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim().slice(0, 300) || null;
  const r = await tx(async (c) => {
    const ya = (await c.query(`select 1 from content_reports where target_kind = 'dm' and target_id = $1 and reporter_user_id = $2 and status = 'open'`, [t.id, viewer])).rowCount;
    if (ya) return null;
    // 5d · Límite de reportes del día (lib/moderacion.ts).
    const lim = await limiteDia(c, viewer, "reportes");
    if (!lim.ok) return lim;
    // Una conversación sigue en el tiempo: si ya la habías reportado y el caso se cerró, el reporte se vuelve a abrir (uno por persona).
    await c.query(`insert into content_reports (target_kind, target_id, city_id, reporter_user_id, by_business, reason, note, priority, device) values ('dm', $1, $2, $3, false, $4, $5, $6, $7::uuid)
                   on conflict (target_kind, target_id, reporter_user_id) do update set status = 'open', reason = excluded.reason, note = excluded.note, priority = excluded.priority,
                     decided_by = null, decided_at = null, created_at = now(), device = excluded.device`,
      [t.id, t.city, viewer, motivo, n, motivo === "acoso" ? 1 : 0, device && UUID.test(device) ? device : null]);
    await c.query(`insert into queue_items (queue, subject_kind, subject_id, city_id, priority) values ('chat', 'dm_thread', $1, $2, $3)
                   on conflict (queue, subject_kind, subject_id) where status = 'open' do nothing`, [t.id, t.city, motivo === "acoso" ? "alta" : "normal"]);
    return null;
  });
  return r ?? { ok: true };
}

/* 5d · Mis mensajes que To'Latino ocultó (Mi cuenta › Avisos de moderación, para apelar): solo los propios, con el motivo; 90 días. */
export async function mensajesOcultosDe(userId: string, id: string | null) {
  if (id !== null && !/^\d{1,18}$/.test(id)) return [];
  return (await db().query<{ id: string; motivo: string | null; at: string; texto: string; href: string | null }>(
    `select m.id::text, m.hidden_reason as motivo, m.hidden_at as at, left(m.body, 280) as texto,
            '/comunidad/mensajes/' || (case when t.a_user_id = $1 then t.b_user_id else t.a_user_id end)::text as href
       from dm_messages m join dm_threads t on t.id = m.thread_id
      where m.sender_user_id = $1 and m.hidden_at is not null and m.hidden_at > now() - interval '90 days' and ($2::text is null or m.id::text = $2)
      order by m.hidden_at desc limit 30`, [userId, id])).rows;
}

/* 9t · ¿Esta persona puede ver la foto de este mensaje? (app/api/mensajes/foto/{id}, para una foto de Mensajes entre vecinos que no subió ella).
   Sí solo si es una de las dos personas de la conversación, la conversación sigue abierta y sin bloqueo en ningún sentido, la foto ya está
   revisada ('visible') y el mensaje no está oculto. Si no, la dirección da 404 (no se dice si existe). */
export async function fotoDmVecino(viewer: string, media: string): Promise<boolean> {
  if (!UUID.test(viewer) || !UUID.test(media)) return false;
  return !!(await db().query(
    `select 1 from dm_messages m join dm_threads t on t.id = m.thread_id join media x on x.id = m.media_id
      where m.media_id = $2::uuid and m.hidden_at is null and x.status = 'visible' and x.owner_kind = 'dm' and t.closed_at is null
        and (t.a_user_id = $1::uuid or t.b_user_id = $1::uuid)
        and ${sinBloqueo("(case when t.a_user_id = $1::uuid then t.b_user_id else t.a_user_id end)", "$1::uuid")}`, [viewer, media])).rowCount;
}

/* 9t · «Ver traducción» de un mensaje entre vecinos (lib/traduccion.ts, kind dm_message; $1 = quien pide, $2 = el mensaje): solo para una de las
   dos personas, con la conversación abierta y sin bloqueo, el mensaje visible y con su idioma guardado. El equipo de To'Latino no traduce (ve
   siempre el original: guardián adminVeOriginal). Vive aquí porque solo este archivo y lib/admin-dm.ts leen dm_messages (dmSoloConReporte). */
export const FUENTE_TR_DM = `select m.body as texto, m.lang from dm_messages m join dm_threads t on t.id = m.thread_id
     where m.id = $2::bigint and m.hidden_at is null and m.lang is not null and m.body <> '' and t.closed_at is null
       and (t.a_user_id = $1::uuid or t.b_user_id = $1::uuid)
       and ${sinBloqueo("(case when t.a_user_id = $1::uuid then t.b_user_id else t.a_user_id end)", "$1::uuid")}`;

/* 9t · La purga de una cuenta (lib/datos/purgar.ts): los ids de lo que escribió en Mensajes entre vecinos, para borrar sus traducciones (L680;
   la caché es derivada). Solo ids, nunca el texto. p = la cuenta. */
export const MENSAJES_DE = (p: string) => `select x.id from dm_messages x where x.sender_user_id = ${p}`;
