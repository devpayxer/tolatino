import "server-only";
import type { PoolClient } from "pg";
import { db } from "./db";

/* Super Admin · Mensajes entre vecinos reportados (Colas › Mensajes reportados, regla de `chat`; fase5-comunidad.md §4 5c).
   ÚNICO lugar del código del equipo que lee o toca dm_messages (guardián dmSoloConReporte): cada consulta exige, en la misma
   sentencia, el caso abierto de la cola y un reporte abierto de esa conversación. Cerrado el caso, la conversación deja de verse
   aquí. Nada se borra: un mensaje se oculta con motivo y quien lo escribió recibe el aviso. */
const CON_REPORTE = (t: string) => `exists (select 1 from queue_items q where q.queue = 'chat' and q.subject_kind = 'dm_thread' and q.subject_id = ${t}::text and q.status = 'open')
  and exists (select 1 from content_reports cr where cr.target_kind = 'dm' and cr.target_id = ${t}::text and cr.status = 'open')`;

export type DmReportado = {
  a: { id: string; nombre: string }; b: { id: string; nombre: string }; cerrada: boolean;
  msjs: { id: string; de: string; quien: string; t: string; at: string; oculto: boolean; foto: string | null; fst: string | null }[];
  reportes: { reason: string; note: string | null; at: string; quien: string | null }[];
};
/* La conversación reportada, solo con el caso y el reporte abiertos (si no, null y nada se lee). Los últimos 80 mensajes. */
export async function dmReportado(threadId: string): Promise<DmReportado | null> {
  if (!/^\d{1,18}$/.test(threadId)) return null;
  const t = (await db().query<{ a: string; an: string; b: string; bn: string; cerrada: boolean }>(
    `select t.a_user_id::text as a, coalesce(nullif(trim(coalesce(ua.first_name, '') || ' ' || coalesce(ua.last_name, '')), ''), 'Vecino') as an,
            t.b_user_id::text as b, coalesce(nullif(trim(coalesce(ub.first_name, '') || ' ' || coalesce(ub.last_name, '')), ''), 'Vecino') as bn, t.closed_at is not null as cerrada
       from dm_threads t join users ua on ua.id = t.a_user_id join users ub on ub.id = t.b_user_id where t.id = $1::bigint and ${CON_REPORTE("t.id")}`, [threadId])).rows[0];
  if (!t) return null;
  const [M, R] = await Promise.all([
    // 9t · Con su foto: la dirección privada (/api/mensajes/foto/{id} la deja pasar con el caso y el reporte abiertos, y lo audita) y su estado.
    db().query<{ id: string; de: string; t: string; at: string; oculto: boolean; foto: string | null; fst: string | null }>(
      `select m.id::text, m.sender_user_id::text as de, m.body as t, m.created_at as at, m.hidden_at is not null as oculto,
              case when f.status in ('visible', 'review') and f.purged_at is null then '/api/mensajes/foto/' || f.id::text end as foto, f.status as fst
         from dm_messages m left join media f on f.id = m.media_id where m.thread_id = $1::bigint and ${CON_REPORTE("m.thread_id")} order by m.id desc limit 80`, [threadId]),
    db().query<{ reason: string; note: string | null; at: string; quien: string | null }>(
      `select cr.reason, cr.note, cr.created_at as at, nullif(trim(coalesce(u.first_name, '') || ' ' || left(coalesce(u.last_name, ''), 1)), '') as quien
         from content_reports cr join users u on u.id = cr.reporter_user_id where cr.target_kind = 'dm' and cr.target_id = $1 and cr.status = 'open' order by cr.created_at`, [threadId]),
  ]);
  const nombre = (id: string) => (id === t.a ? t.an : t.bn);
  return {
    a: { id: t.a, nombre: t.an }, b: { id: t.b, nombre: t.bn }, cerrada: t.cerrada,
    msjs: M.rows.reverse().map((m) => ({ ...m, quien: nombre(m.de) })), reportes: R.rows,
  };
}

/* 9t · La foto de un mensaje de una conversación reportada (app/api/mensajes/foto/{id}): de qué conversación y mensaje es, y su ciudad, solo con el
   caso y el reporte abiertos (CON_REPORTE en la misma sentencia). Si no, null y la foto no se sirve al equipo por aquí. */
export async function dmFotoConReporte(media: string): Promise<{ hilo: string; msg: string; city: string } | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(media)) return null;
  return (await db().query<{ hilo: string; msg: string; city: string }>(
    `select m.thread_id::text as hilo, m.id::text as msg, m.city_id as city from dm_messages m where m.media_id = $1::uuid and ${CON_REPORTE("m.thread_id")}`, [media])).rows[0] ?? null;
}

/* Ocultar un mensaje de la conversación reportada (dentro de la transacción de la decisión). Devuelve quién lo escribió. */
export async function ocultarDm(c: PoolClient, threadId: string, mensaje: string, motivo: string, staffId: string) {
  return (await c.query<{ id: string; autor: string }>(
    `update dm_messages m set hidden_at = now(), hidden_reason = $3, hidden_by = $4
      where m.id = $2::bigint and m.thread_id = $1::bigint and m.hidden_at is null and ${CON_REPORTE("m.thread_id")}
      returning m.id::text, m.sender_user_id::text as autor`, [threadId, String(mensaje ?? "0").replace(/\D/g, "") || "0", motivo, staffId])).rows[0] ?? null;
}

/* 5d · Apelación de un mensaje oculto: el equipo ve SOLO ese mensaje y solo mientras la apelación está abierta (CON_APELACION, la
   otra llave de dmSoloConReporte); levantarla lo vuelve a mostrar. Nunca el resto de la conversación. */
const CON_APELACION = (m: string) => `exists (select 1 from appeals ap where ap.target_kind = 'dm_message' and ap.target_id = ${m}::text and ap.status = 'open')`;
export async function dmApelado(mensaje: string): Promise<string | null> {
  if (!/^\d{1,18}$/.test(mensaje)) return null;
  return (await db().query<{ t: string }>(`select m.body as t from dm_messages m where m.id = $1::bigint and ${CON_APELACION("m.id")}`, [mensaje])).rows[0]?.t ?? null;
}
export async function restaurarDmApelado(c: PoolClient, mensaje: string) {
  await c.query(`update dm_messages m set hidden_at = null, hidden_reason = null, hidden_by = null where m.id = $1::bigint and m.hidden_at is not null and ${CON_APELACION("m.id")}`, [mensaje]);
}

/* Para Usuarios 360° › Comunidad: cuántas conversaciones tiene la persona (nunca su contenido). */
export async function cuantasConversaciones(userId: string) {
  return (await db().query<{ n: number }>(`select count(*)::int as n from dm_threads where (a_user_id = $1 or b_user_id = $1) and last_at is not null`, [userId])).rows[0]?.n ?? 0;
}
