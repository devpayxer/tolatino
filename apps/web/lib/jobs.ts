import "server-only";
import type { Pool, PoolClient } from "pg";
import { db, tx } from "./db";
import { PROHIBIDO } from "./jobs-txt";
export { PROHIBIDO };

/* Jobs (prototipo jobAdd / jobDetVals / jobApVals / jobStVals; panel jobBlocks / jobDet; modelo «JobPosting» y
   «JobApplication»). Solo Pro. Pago real por hora (desde $7.25), sin CV, sin estatus migratorio, SSN ni pago para aplicar:
   el servidor rechaza esas palabras. La solicitud es un perfil corto; el negocio la mueve (vista, le va a llamar,
   entrevista, no seleccionado) y la persona confirma la entrevista o la retira. */
type Bi = { es: string; en: string };
type Q = Pool | PoolClient;
export type Exp = 0 | 1 | 3 | 4;
export type EstApp = "sent" | "seen" | "contact" | "interview" | "not_selected" | "withdrawn";
export const PAGO_MIN = 725;

export type Vacante = {
  id: string; title: Bi; kind: "ft" | "pt" | "fds"; payFrom: number; payTo: number | null; tips: boolean; days: number[]; start: number; end: number; openings: number;
  langEs: "need" | "plus" | "no"; langEn: "need" | "plus" | "no"; descr: Bi; req: [string, string][]; ben: [string, string][]; ago: number;
};
const VAC_SQL = `j.id::text, j.title, j.kind, j.pay_from_cents as "payFrom", j.pay_to_cents as "payTo", j.tips, j.days, j.start_min as start, j.end_min as "end", j.openings,
  j.lang_es as "langEs", j.lang_en as "langEn", j.descr, j.requirements as req, j.benefits as ben, greatest(0, (now()::date - coalesce(j.published_at, j.created_at)::date))::int as ago`;
const telBonito = (p: string) => { const d = p.replace(/\D/g, "").slice(-10); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p; };

/* Pestaña Jobs de la ficha: las vacantes en vivo, con lo guardado y la última solicitud de la persona. */
export async function vacantesFicha(negocio: string, userId: string | null) {
  const r = await db().query<Vacante & { saved: boolean; mi: EstApp | null; ivOk: boolean }>(
    `select ${VAC_SQL},
            coalesce($2::uuid is not null and exists (select 1 from job_saves s where s.job_id = j.id and s.user_id = $2::uuid), false) as saved,
            (select a.status from job_applications a where a.job_id = j.id and a.user_id = $2::uuid order by a.id desc limit 1) as mi,
            coalesce((select a.interview_confirmed from job_applications a where a.job_id = j.id and a.user_id = $2::uuid order by a.id desc limit 1), false) as "ivOk"
       from job_postings j where j.business_id = $1 and vacante_en_vivo(j) order by j.published_at desc nulls last limit 30`, [negocio, userId]);
  return r.rows;
}
export type VacanteFicha = Awaited<ReturnType<typeof vacantesFicha>>[number];

/* Vacantes parecidas en la ciudad (misma categoría primero). */
async function parecidas(c: Q, jobId: string, negocio: string) {
  return (await c.query<{ id: string; biz: string; bname: string; title: Bi; kind: string; payFrom: number; payTo: number | null; logo: string | null }>(
    `select j.id::text, j.business_id as biz, b.name as bname, j.title, j.kind, j.pay_from_cents as "payFrom", j.pay_to_cents as "payTo",
            (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as logo
       from job_postings j join businesses b on b.id = j.business_id
      where j.city_id = (select city_id from businesses where id = $2) and j.id <> $1::bigint and vacante_en_vivo(j)
      order by (b.category_id = (select category_id from businesses where id = $2)) desc, j.published_at desc limit 3`, [jobId, negocio])).rows;
}

/* APP-NEG-JOB: la vacante, el negocio, la solicitud de la persona y parecidas. */
export async function vacanteDetalle(negocio: string, jobId: string, userId: string | null) {
  if (!/^\d{1,18}$/.test(jobId)) return null;
  const j = (await db().query<Vacante & { saved: boolean; bname: string; logo: string | null; subs: string | null; ciudad: string }>(
    `select ${VAC_SQL}, b.name as bname, ci.name as ciudad,
            (select m.url from media m where m.owner_kind = 'business' and m.owner_id = b.id and m.status = 'visible' order by m.sort limit 1) as logo,
            (select string_agg(sc.name->>'es', ' · ') from (select * from subcategorias_vivas where id = any(b.subcategory_ids) limit 2) sc) as subs,
            coalesce($3::uuid is not null and exists (select 1 from job_saves s where s.job_id = j.id and s.user_id = $3::uuid), false) as saved
       from job_postings j join businesses b on b.id = j.business_id join cities ci on ci.id = j.city_id
      where j.business_id = $1 and j.id = $2::bigint and vacante_en_vivo(j)`, [negocio, jobId, userId])).rows[0];
  if (!j) return null;
  const app = userId ? (await db().query<{ number: string; status: EstApp; ivOk: boolean; at: string }>(
    `select a.number, a.status, a.interview_confirmed as "ivOk", to_char(a.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
       from job_applications a where a.job_id = $1::bigint and a.user_id = $2 order by a.id desc limit 1`, [jobId, userId])).rows[0] ?? null : null;
  return { ...j, app, sim: await parecidas(db(), jobId, negocio) };
}
export type VacanteDet = NonNullable<Awaited<ReturnType<typeof vacanteDetalle>>>;

type Res<T = object> = ({ ok: true } & T) | { ok: false; msg: Bi };
const no = (es: string, en: string) => ({ ok: false as const, msg: { es, en } });

export type AplicarIn = { job: string; name: string; phone: string; exp: number; note?: string; days: number[]; langs: string[]; reqs: boolean };
export async function aplicar(userId: string, negocio: string, p: AplicarIn): Promise<Res<{ numero: string }>> {
  const name = String(p.name ?? "").trim().slice(0, 80), d = String(p.phone ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (name.length < 2) return no("Escribe tu nombre.", "Write your name.");
  if (!/^[2-9]\d{9}$/.test(d)) return no("Escribe tu teléfono de 10 dígitos.", "Write your 10-digit phone.");
  if (![0, 1, 3, 4].includes(Number(p.exp))) return no("Elige tu experiencia.", "Pick your experience.");
  const days = Array.isArray(p.days) ? [...new Set(p.days.map(Number).filter((x) => Number.isInteger(x) && x >= 0 && x <= 6))].sort() : [];
  if (!days.length) return no("Elige los días que puedes.", "Pick the days you can work.");
  const langs = Array.isArray(p.langs) ? [...new Set(p.langs.filter((x) => x === "es" || x === "en"))] : [];
  const note = String(p.note ?? "").trim().slice(0, 200) || null;
  if (!/^\d{1,18}$/.test(String(p.job))) return no("Esa vacante no existe.", "That job does not exist.");
  return tx(async (c) => {
    const j = (await c.query<{ id: string; city_id: string; req: unknown[] }>(
      `select j.id::text, j.city_id, j.requirements as req from job_postings j where j.id = $1::bigint and j.business_id = $2 and vacante_en_vivo(j) for share`, [p.job, negocio])).rows[0];
    if (!j) return no("Esta vacante ya no recibe solicitudes.", "This job is no longer taking applications.");
    if (Array.isArray(j.req) && j.req.length && !p.reqs) return no("Confirma que cumples los requisitos.", "Confirm you meet the requirements.");
    const n = (await c.query<{ n: number }>(`select count(*)::int as n from job_applications where user_id = $1 and created_at > now() - interval '1 day'`, [userId])).rows[0]!.n;
    if (n >= 15) return no("Mandaste muchas solicitudes hoy. Prueba mañana.", "You sent many applications today. Try tomorrow.");
    const r = await c.query<{ number: string }>(
      `insert into job_applications (number, job_id, business_id, city_id, user_id, name, phone, experience, days, languages, note)
       values ('J-' || nextval('job_app_number_seq'), $1::bigint, $2, $3, $4, $5, $6, $7, $8, $9, $10) on conflict do nothing returning number`,
      [j.id, negocio, j.city_id, userId, name, `+1${d}`, Number(p.exp), days, langs, note]);
    if (!r.rows[0]) return no("Ya aplicaste a esta vacante.", "You already applied to this job.");
    return { ok: true as const, numero: r.rows[0].number };
  });
}

/* APP-NEG-JOB-ESTADO: la solicitud propia. */
export async function miSolicitud(numero: string, userId: string) {
  if (!/^J-\d{1,12}$/.test(numero)) return null;
  const a = (await db().query<{
    number: string; status: EstApp; ivOk: boolean; iv: string | null; name: string; phone: string; exp: Exp; days: number[]; langs: string[]; note: string | null;
    sent: string; seen: string | null; fin: string | null; job: string; biz: string; bname: string; btel: string | null; title: Bi; tz: string;
  }>(
    `select a.number, a.status, a.interview_confirmed as "ivOk", to_char(a.interview_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as iv, a.name, a.phone, a.experience as exp,
            a.days, a.languages as langs, a.note, to_char(a.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as sent,
            to_char(a.seen_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as seen, to_char(coalesce(a.withdrawn_at, a.answered_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as fin,
            a.job_id::text as job, a.business_id as biz, b.name as bname, b.phone as btel, j.title, ci.timezone as tz
       from job_applications a join job_postings j on j.id = a.job_id join businesses b on b.id = a.business_id join cities ci on ci.id = a.city_id
      where a.number = $1 and a.user_id = $2`, [numero, userId])).rows[0];
  if (!a) return null;
  return { ...a, phone: telBonito(a.phone), sim: a.status === "not_selected" || a.status === "withdrawn" ? await parecidas(db(), a.job, a.biz) : [] };
}
export type MiSolicitud = NonNullable<Awaited<ReturnType<typeof miSolicitud>>>;

export async function confirmarEntrevista(userId: string, numero: string): Promise<Res> {
  const r = await db().query(`update job_applications set interview_confirmed = true, updated_at = now() where number = $1 and user_id = $2 and status = 'interview' and not interview_confirmed and interview_at > now()`, [numero, userId]);
  return r.rowCount ? { ok: true } : no("Esta entrevista ya cambió. Actualiza la pantalla.", "This interview already changed. Refresh the screen.");
}
export async function retirarSolicitud(userId: string, numero: string): Promise<Res> {
  const r = await db().query(`update job_applications set status = 'withdrawn', withdrawn_at = now(), updated_at = now() where number = $1 and user_id = $2 and status in ('sent', 'seen', 'contact', 'interview')`, [numero, userId]);
  return r.rowCount ? { ok: true } : no("Esta solicitud ya no se puede retirar.", "This application can no longer be withdrawn.");
}
export async function guardarVacanteCliente(userId: string, jobId: string): Promise<Res> {
  if (!/^\d{1,18}$/.test(jobId)) return no("Esa vacante no existe.", "That job does not exist.");
  return tx(async (c) => {
    const ok = (await c.query(`select 1 from job_postings j where j.id = $1::bigint and vacante_en_vivo(j)`, [jobId])).rowCount;
    if (!ok) return no("Esa vacante ya no está.", "That job is gone.");
    const d = await c.query(`delete from job_saves where job_id = $1::bigint and user_id = $2`, [jobId, userId]);
    if (!d.rowCount) await c.query(`insert into job_saves (job_id, user_id) values ($1::bigint, $2)`, [jobId, userId]);
    return { ok: true as const };
  });
}

/* ── Panel (Lo que vendes › Jobs) ─────────────────────────────────────────────────────────────────────────────── */
export type FilaVac = Vacante & { st: "draft" | "live" | "paused" | "filled" | "adm"; hidden: string | null; apps: number; nuevas: number; pend: number };
export async function vacantesPanel(negocio: string) {
  const [L, m] = await Promise.all([
    db().query<FilaVac>(
      `select ${VAC_SQL}, case when j.hidden_at is not null then 'adm' else j.status end as st, j.hidden_reason as hidden,
              (select count(*)::int from job_applications a where a.job_id = j.id) as apps,
              (select count(*)::int from job_applications a where a.job_id = j.id and a.status = 'sent') as nuevas,
              (select count(*)::int from job_applications a where a.job_id = j.id and a.status in ('sent', 'seen')) as pend
         from job_postings j where j.business_id = $1 and j.status <> 'removed' order by (j.status = 'live') desc, j.updated_at desc limit 100`, [negocio]),
    db().query<{ on: boolean; off: { reason: string } | null }>(`select 'jobs' = any(modules_on) as on, modules_off->'jobs' as off from businesses where id = $1`, [negocio]),
  ]);
  return { filas: L.rows, on: m.rows[0]?.on ?? false, pausa: m.rows[0]?.off?.reason ?? null };
}
export type VacPanel = Awaited<ReturnType<typeof vacantesPanel>>;

export type AppPanel = { id: string; number: string; name: string; phone: string; exp: Exp; days: number[]; langs: string[]; note: string | null; st: EstApp; iv: string | null; ivOk: boolean; at: string };
const APP_SQL = `a.id::text, a.number, a.name, a.phone, a.experience as exp, a.days, a.languages as langs, a.note, a.status as st,
  to_char(a.interview_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as iv, a.interview_confirmed as "ivOk", to_char(a.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at`;
export async function vacantePanel(negocio: string, id: string) {
  if (!/^\d{1,18}$/.test(id)) return null;
  const j = (await db().query<FilaVac & { tz: string }>(
    `select ${VAC_SQL}, case when j.hidden_at is not null then 'adm' else j.status end as st, j.hidden_reason as hidden, 0 as apps, 0 as nuevas, 0 as pend, ci.timezone as tz
       from job_postings j join cities ci on ci.id = j.city_id where j.business_id = $1 and j.id = $2::bigint and j.status <> 'removed'`, [negocio, id])).rows[0];
  if (!j) return null;
  const [apps, ivDias] = await Promise.all([
    db().query<AppPanel>(`select ${APP_SQL} from job_applications a where a.job_id = $1::bigint order by a.id desc limit 200`, [id]),
    diasEntrevista(db(), negocio, j.tz),
  ]);
  return { ...j, solicitudes: apps.rows.map((a) => ({ ...a, phone: telBonito(a.phone) })), ivDias };
}
export type VacPanelDet = NonNullable<Awaited<ReturnType<typeof vacantePanel>>>;

/* Abrir una solicitud nueva la marca «vista» (la persona lo ve en su estado). */
export async function verSolicitud(negocio: string, appId: string) {
  if (!/^\d{1,18}$/.test(appId)) return;
  await db().query(`update job_applications set status = 'seen', seen_at = now(), updated_at = now() where id = $1::bigint and business_id = $2 and status = 'sent'`, [appId, negocio]);
}

/* Hoy: solicitudes nuevas. */
export async function solicitudesNuevas(negocio: string) {
  return (await db().query<{ id: string; job: string; name: string; title: Bi; at: string }>(
    `select a.id::text, a.job_id::text as job, a.name, j.title, to_char(a.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at
       from job_applications a join job_postings j on j.id = a.job_id where a.business_id = $1 and a.status = 'sent' order by a.id desc limit 6`, [negocio])).rows;
}

export type VacIn = {
  id?: string | null; t0: string; t1?: string; kind: string; lo: number; hi?: number | null; tips: boolean; days: number[]; start: number; end: number; openings: number;
  les: string; len: string; d0?: string; d1?: string; req: [string, string][]; ben: [string, string][]; pub: boolean;
};
export async function guardarVacante(negocio: string, p: VacIn, actorId: string): Promise<Res<{ id: string }>> {
  const t0 = String(p.t0 ?? "").trim().slice(0, 50), t1 = String(p.t1 ?? "").trim().slice(0, 50) || t0;
  if (t0.length < 3) return no("Escribe el puesto.", "Write the position.");
  const kind = ["ft", "pt", "fds"].includes(p.kind) ? p.kind : "ft";
  const lo = Math.round(Number(p.lo) * 100), hi = p.hi != null && Number(p.hi) > 0 ? Math.round(Number(p.hi) * 100) : null;
  if (!(lo >= PAGO_MIN)) return no("El pago por hora va desde $7.25 (el mínimo de Pensilvania).", "Hourly pay starts at $7.25 (the Pennsylvania minimum).");
  if (hi != null && hi < lo) return no("«Hasta» tiene que ser mayor que «desde».", "“Up to” must be above “from”.");
  const days = Array.isArray(p.days) ? [...new Set(p.days.map(Number).filter((x) => Number.isInteger(x) && x >= 0 && x <= 6))].sort() : [];
  if (!days.length) return no("Elige al menos un día.", "Pick at least one day.");
  const start = Math.round(Number(p.start)), end = Math.round(Number(p.end));
  if (!(start >= 0 && end <= 1440 && end > start)) return no("Revisa la hora de entrada y de salida.", "Check the start and end times.");
  const openings = Math.max(1, Math.min(20, Math.round(Number(p.openings) || 1)));
  const L = ["need", "plus", "no"], les = L.includes(p.les) ? p.les : "need", len = L.includes(p.len) ? p.len : "no";
  const lista = (a: unknown) => (Array.isArray(a) ? a : []).map((x) => (Array.isArray(x) ? [String(x[0] ?? "").trim().slice(0, 40), String(x[1] ?? "").trim().slice(0, 40)] : null)).filter((x): x is [string, string] => !!x && !!x[0]).slice(0, 5);
  const req = lista(p.req), ben = lista(p.ben);
  const d0 = String(p.d0 ?? "").trim().slice(0, 300), d1 = String(p.d1 ?? "").trim().slice(0, 300);
  const todo = [t0, t1, d0, d1, ...req.flat(), ...ben.flat()].join(" "), hit = todo.match(PROHIBIDO)?.[0];
  if (hit) return no(`Quita «${hit}»: To’Latino no deja pedir CV, papeles, estatus, SSN ni pago para aplicar.`, `Remove “${hit}”: To’Latino does not allow asking for a resume, papers, status, SSN or a fee to apply.`);
  return tx(async (c) => {
    const b = (await c.query<{ city_id: string; pro: boolean }>(`select b.city_id, coalesce(s.plan, 'free') = 'pro' as pro from businesses b left join business_stats_cache s on s.business_id = b.id where b.id = $1 for update of b`, [negocio])).rows[0];
    if (!b) return no("Ese negocio no existe.", "That business does not exist.");
    if (!b.pro) return no("Jobs es de Pro.", "Jobs is a Pro feature.");
    const vals = [JSON.stringify({ es: t0, en: t1 }), kind, lo, hi, p.tips === true, days, start, end, openings, les, len, JSON.stringify({ es: d0, en: d1 || d0 }), JSON.stringify(req.map(([a, e]) => [a, e || a])), JSON.stringify(ben.map(([a, e]) => [a, e || a]))];
    let id: string;
    if (p.id) {
      if (!/^\d{1,18}$/.test(String(p.id))) return no("Esa vacante no existe.", "That job does not exist.");
      const u = await c.query<{ id: string }>(
        `update job_postings set title = $3::jsonb, kind = $4, pay_from_cents = $5, pay_to_cents = $6, tips = $7, days = $8, start_min = $9, end_min = $10, openings = $11,
                lang_es = $12, lang_en = $13, descr = $14::jsonb, requirements = $15::jsonb, benefits = $16::jsonb,
                status = case when status = 'draft' and $17 then 'live' else status end,
                published_at = case when status = 'draft' and $17 then now() else published_at end, updated_at = now()
          where id = $1::bigint and business_id = $2 and status <> 'removed' and hidden_at is null returning id::text`, [p.id, negocio, ...vals, p.pub === true]);
      if (!u.rows[0]) return no("Esa vacante ya no se puede editar.", "That job can no longer be edited.");
      id = u.rows[0].id;
    } else {
      const n = (await c.query<{ n: number }>(`select count(*)::int as n from job_postings where business_id = $1 and created_at > now() - interval '1 day'`, [negocio])).rows[0]!.n;
      if (n >= 10) return no("Publicaste muchas vacantes hoy. Prueba mañana.", "You posted many jobs today. Try tomorrow.");
      id = (await c.query<{ id: string }>(
        `insert into job_postings (business_id, city_id, title, kind, pay_from_cents, pay_to_cents, tips, days, start_min, end_min, openings, lang_es, lang_en, descr, requirements, benefits, status, published_at, created_by)
         values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16::jsonb, $17, case when $17 = 'live' then now() end, $18) returning id::text`,
        [negocio, b.city_id, ...vals, p.pub === false ? "draft" : "live", actorId])).rows[0]!.id;
      if (p.pub !== false) await c.query(`update businesses set modules_on = array(select distinct x from unnest(modules_on || array['jobs']) x) where id = $1 and not ('jobs' = any(modules_on))`, [negocio]);
    }
    return { ok: true as const, id };
  });
}

export type PasoVac = "pausar" | "publicar" | "cubrir" | "quitar";
export async function pasoVacante(negocio: string, id: string, paso: PasoVac): Promise<Res> {
  if (!/^\d{1,18}$/.test(id)) return no("Esa vacante no existe.", "That job does not exist.");
  const Q: Record<PasoVac, [string[], string]> = {
    pausar: [["live"], `status = 'paused'`], publicar: [["draft", "paused", "filled"], `status = 'live', published_at = coalesce(published_at, now())`],
    cubrir: [["live", "paused"], `status = 'filled'`], quitar: [["draft", "live", "paused", "filled"], `status = 'removed'`],
  };
  return tx(async (c) => {
    const j = (await c.query<{ status: string; hidden: boolean }>(`select status, hidden_at is not null as hidden from job_postings where id = $1::bigint and business_id = $2 for update`, [id, negocio])).rows[0];
    if (!j) return no("Esa vacante ya no está.", "That job is gone.");
    if (j.hidden && paso !== "quitar") return no("To’Latino ocultó esta vacante.", "To’Latino hid this job.");
    const [desde, set] = Q[paso];
    if (!desde.includes(j.status)) return no("Esta vacante ya cambió. Actualiza la pantalla.", "This job already changed. Refresh the screen.");
    if (paso === "publicar") await c.query(`update businesses set modules_on = array(select distinct x from unnest(modules_on || array['jobs']) x) where id = $1 and not ('jobs' = any(modules_on))`, [negocio]);
    await c.query(`update job_postings set ${set}, updated_at = now() where id = $1::bigint`, [id]);
    // Cubierta o quitada: a quien esperaba respuesta se le cierra con respeto («no seleccionado»).
    if (paso === "cubrir" || paso === "quitar") await c.query(`update job_applications set status = 'not_selected', answered_at = now(), updated_at = now() where job_id = $1::bigint and status in ('sent', 'seen')`, [id]);
    return { ok: true as const };
  });
}

/* Días para la entrevista: los próximos 10 que el negocio abre (horario general, sin feriados) y sus horas en punto. */
const hm = (x: string) => { const [h, m] = x.split(":").map(Number); return (h ?? 0) * 60 + (m ?? 0); };
export async function diasEntrevista(c: Q, negocio: string, tz: string) {
  // Una tras otra: `c` puede ser el cliente de una transacción.
  const H = await c.query<{ weekday: number; ranges: [string, string][] }>(`select weekday, ranges from business_hours where business_id = $1 and module = '' and open`, [negocio]);
  const F = await c.query<{ d: number; ymd: string; dow: number }>(
      `select g as d, ((now() at time zone $1)::date + g)::text as ymd, extract(dow from (now() at time zone $1)::date + g)::int as dow from generate_series(1, 10) g
        where not exists (select 1 from special_hours s where s.business_id = $2 and s.closed and ((now() at time zone $1)::date + g) between s.date_from and s.date_to)`, [tz, negocio]);
  const R = new Map(H.rows.map((r) => [r.weekday, r.ranges]));
  return F.rows.map((f) => {
    const rg = R.get(f.dow) ?? [], horas: number[] = [];
    for (let h = 6; h <= 21; h++) if (rg.some(([x, z]) => { const A = hm(x), Z = hm(z) <= A ? hm(z) + 1440 : hm(z); return h * 60 >= A && h * 60 + 30 <= Z; })) horas.push(h);
    return { d: f.d, ymd: f.ymd, horas };
  }).filter((x) => x.horas.length > 0);
}
/* Para el editor: los días que abre el negocio (0 = lunes) y su primera hora de abrir y última de cerrar. */
export async function horarioVac(negocio: string) {
  const H = (await db().query<{ weekday: number; ranges: [string, string][] }>(`select weekday, ranges from business_hours where business_id = $1 and module = '' and open order by weekday`, [negocio])).rows.filter((r) => r.ranges.length);
  const abre = H.map((r) => (r.weekday + 6) % 7).sort((a, b) => a - b);
  const a = H.length ? Math.min(...H.map((r) => hm(r.ranges[0]![0]))) : 540;
  return { abre, a, z: Math.min(1440, a + 480) };
}

/* El negocio responde una solicitud: le va a llamar, entrevista (un día que abre, a una hora) o no seleccionado. */
export async function responderSolicitud(negocio: string, appId: string, paso: "contact" | "interview" | "not_selected", iv?: { d: number; h: number } | null): Promise<Res> {
  if (!/^\d{1,18}$/.test(appId)) return no("Esa solicitud no existe.", "That application does not exist.");
  return tx(async (c) => {
    const a = (await c.query<{ status: EstApp; tz: string }>(
      `select a.status, ci.timezone as tz from job_applications a join cities ci on ci.id = a.city_id where a.id = $1::bigint and a.business_id = $2 for update of a`, [appId, negocio])).rows[0];
    if (!a) return no("Esa solicitud ya no está.", "That application is gone.");
    if (a.status === "withdrawn") return no("La persona retiró su solicitud.", "The person withdrew the application.");
    if (paso === "interview") {
      if (!iv || !Number.isInteger(iv.d) || iv.d < 1 || iv.d > 10 || !Number.isInteger(iv.h) || iv.h < 6 || iv.h > 21) return no("Elige el día y la hora.", "Pick the day and time.");
      // Un día que el negocio abre (horario general) y a una hora dentro de su horario.
      const dia = (await diasEntrevista(c, negocio, a.tz)).find((x) => x.d === iv.d);
      if (!dia) return no("Ese día tu negocio no abre. Elige otro.", "Your business is closed that day. Pick another.");
      if (!dia.horas.includes(iv.h)) return no("Elige una hora en que tu negocio está abierto.", "Pick a time when your business is open.");
      const r = await c.query(
        `update job_applications set status = 'interview', interview_at = (date_trunc('day', now() at time zone $2) + make_interval(days => $3::int, hours => $4::int)) at time zone $2,
                interview_confirmed = false, answered_at = now(), seen_at = coalesce(seen_at, now()), updated_at = now() where id = $1::bigint`, [appId, a.tz, iv.d, iv.h]);
      return r.rowCount ? ({ ok: true } as const) : no("No se pudo. Prueba de nuevo.", "Could not do it. Try again.");
    }
    await c.query(`update job_applications set status = $2, answered_at = now(), seen_at = coalesce(seen_at, now()), updated_at = now() where id = $1::bigint`, [appId, paso]);
    return { ok: true } as const;
  });
}
export async function moduloJobs(negocio: string, on: boolean) {
  await db().query(on ? `update businesses set modules_on = array(select distinct x from unnest(modules_on || array['jobs']) x) where id = $1`
    : `update businesses set modules_on = array_remove(modules_on, 'jobs') where id = $1`, [negocio]);
}

/* Avisos de Jobs: la respuesta del negocio a la persona, y el puesto para el aviso al negocio. */
export async function tituloVacante(jobId: string) {
  if (!/^\d{1,18}$/.test(jobId)) return "";
  return (await db().query<{ t: string }>(`select title->>'es' as t from job_postings where id = $1::bigint`, [jobId])).rows[0]?.t ?? "";
}
export async function avisarSolicitud(appId: string, paso: string) {
  const { avisar } = await import("./avisos");
  const a = (await db().query<{ uid: string; num: string; negocio: string; puesto: string; lang: string }>(
    `select a.user_id::text as uid, a.number as num, b.name as negocio, j.title->>'es' as puesto, u.lang from job_applications a join businesses b on b.id = a.business_id join job_postings j on j.id = a.job_id join users u on u.id = a.user_id where a.id = $1::bigint`, [appId])).rows[0];
  if (!a) return;
  const en = a.lang === "en", E: Record<string, [string, string]> = { contact: ["te van a llamar", "they will call you"], interview: ["te invitan a una entrevista", "you are invited to an interview"], not_selected: ["eligieron a otra persona", "they chose someone else"] };
  const e = E[paso]; if (!e) return;
  await avisar(a.uid, "job_reply", { negocio: a.negocio, estado: en ? e[1] : e[0], puesto: a.puesto }, { href: `/solicitud/${a.num}`, ref: ["job_application", a.num] });
}
