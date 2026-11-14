import "server-only";
import { db } from "./db";

/* 9m · Reportar una novedad o una vacante desde su página (L299, L309): va a la cola «Reportes de contenido» del Super Admin (content_reports:
   «post» = una novedad del negocio, «job» = una vacante). Una vez por persona y cosa (el índice único); solo lo que se ve en público; el negocio no
   sabe quién reportó. Un tope de 10 reportes por persona al día (manadas: guardián reportesSinManada). */
type Bi = { es: string; en: string };
export type ResRep = { ok: true; ya: boolean } | { ok: false; msg: Bi };
const MOTIVOS = new Set(["spam", "off", "falso", "otro"]);

export async function reportarContenido(userId: string, kind: "post" | "job", id: string, motivo: string, nota: string): Promise<ResRep> {
  if (!/^\d{1,18}$/.test(String(id))) return { ok: false, msg: { es: "No encontramos eso.", en: "We could not find that." } };
  if (!MOTIVOS.has(motivo)) return { ok: false, msg: { es: "Elige un motivo.", en: "Pick a reason." } };
  const hoy = (await db().query<{ n: number }>(`select count(*)::int as n from content_reports where reporter_user_id = $1 and created_at > now() - interval '24 hours'`, [userId])).rows[0]?.n ?? 0;
  if (hoy >= 10) return { ok: false, msg: { es: "Ya reportaste mucho hoy. Gracias: el equipo lo revisa.", en: "You reported a lot today. Thanks: the team reviews it." } };
  const t = kind === "post"
    ? (await db().query<{ biz: string; city: string }>(`select business_id as biz, city_id as city from business_posts where id = $1::bigint and status = 'live' and hidden_at is null`, [id])).rows[0]
    : (await db().query<{ biz: string; city: string }>(`select j.business_id as biz, j.city_id as city from job_postings j where j.id = $1::bigint and vacante_en_vivo(j)`, [id])).rows[0];
  if (!t) return { ok: false, msg: { es: "Eso ya no está en la página.", en: "That is no longer on the page." } };
  const r = await db().query(
    `insert into content_reports (target_kind, target_id, business_id, city_id, reporter_user_id, reason, note) values ($1, $2, $3, $4, $5, $6, nullif($7, ''))
     on conflict (target_kind, target_id, reporter_user_id) do nothing`,
    [kind, String(id), t.biz, t.city, userId, motivo, String(nota ?? "").replace(/\s+/g, " ").trim().slice(0, 300)]);
  return { ok: true, ya: !r.rowCount };
}
