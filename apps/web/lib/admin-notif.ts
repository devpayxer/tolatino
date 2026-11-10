import "server-only";
import type { Staff } from "./admin";
import { db } from "./db";

/* ADM-NOTIF · Notificaciones (Super Admin.dc.html secNotif): plantillas por evento (ES/EN, editables con auditoría), los
   envíos de tus ciudades con su estado de SMS, y las reglas. Las cifras salen de `notifications`, nunca inventadas. */
export type GrupoNotif = "crit" | "tx" | "events" | "community" | "mod" | "biz" | "mkt";
export type Plantilla = { key: string; grp: GrupoNotif; pref: string | null; sms: boolean; title: { es: string; en: string }; body: { es: string; en: string }; editada: boolean; n7: number };
export type Envio = { id: string; tpl: string; title: string; body: string; uid: string; quien: string; at: string; sms: string; leido: boolean };
const CIUD = "(cardinality($1::text[]) = 0 or n.city_id = any($1::text[]))";

export type Correo = { id: string; tpl: string; subject: string; to: string; uid: string | null; quien: string | null; at: string; status: string; error: string | null };
/* Un correo de la bandeja para verlo como le llegó a la persona (sandbox y soporte). El enlace de «Confirma tu correo»
   se tapa: el equipo nunca puede confirmar el correo de otra persona. */
export async function correoDe(s: Staff, id: string) {
  if (!/^\d{1,18}$/.test(id)) return null;
  const r = (await db().query<{ id: string; tpl: string; subject: string; to: string; html: string; status: string; at: string; uid: string | null }>(
    `select id::text, tpl, subject, to_email::text as to, html, status, to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, user_id::text as uid
       from email_outbox where id = $1 and (cardinality($2::text[]) = 0 or city_id = any($2::text[]))`, [id, s.cities])).rows[0];
  if (!r) return null;
  return { ...r, to: mascara(r.to), html: r.tpl === "verify" ? r.html.replace(/\/cuenta\/correo\?t=[A-Za-z0-9_-]+/g, "/cuenta/correo?t=…") : r.html };
}
/* Correo enmascarado para la lista: a***@dominio.com (el equipo no necesita verlo entero). */
const mascara = (e: string) => { const [u, d] = e.split("@"); return `${(u ?? "").slice(0, 1)}***@${d ?? ""}`; };
export async function datosNotif(s: Staff, tab: "tpl" | "log" | "rules" | "mail", antes: string | null) {
  const cur = antes && /^\d{1,18}$/.test(antes) ? antes : null;
  const [k, T, L, M, K] = await Promise.all([
    db().query<{ hoy: number; sms: number; pruebas: number; frenados: number; fallos: number; leidos: number }>(
      `select count(*)::int as hoy, count(*) filter (where n.sms_status = 'enviado')::int as sms, count(*) filter (where n.sms_status in ('pruebas', 'pendiente'))::int as pruebas,
              count(*) filter (where n.sms_status in ('apagado', 'silencio'))::int as frenados, count(*) filter (where n.sms_status in ('fallo', 'sin_proveedor'))::int as fallos,
              count(*) filter (where n.read_at is not null)::int as leidos
         from notifications n where n.created_at > now() - interval '1 day' and ${CIUD}`, [s.cities]),
    db().query<Plantilla>(
      `select t.key, t.grp, t.pref, t.sms, t.title, t.body, t.edited_by is not null as editada,
              (select count(*)::int from notifications n where n.tpl = t.key and n.created_at > now() - interval '7 days' and ${CIUD}) as n7
         from notif_templates t order by array_position(array['crit', 'tx', 'events', 'community', 'mod', 'biz', 'mkt'], t.grp), coalesce(array_position(array['ord_ok', 'ord_ready', 'ord_way', 'ord_no', 'rsv_ok', 'rsv_alt', 'rsv_no', 'job_reply', 'help_reply', 'help_done', 'mod_hide', 'biz_req', 'biz_help', 'biz_job'], t.key), 99), t.key`, [s.cities]),
    tab === "log" ? db().query<Envio>(
      `select n.id::text, n.tpl, n.title, n.body, u.id::text as uid, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), u.phone) as quien,
              to_char(n.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, n.sms_status as sms, n.read_at is not null as leido
         from notifications n join users u on u.id = n.user_id where ${CIUD} and ($2::bigint is null or n.id < $2::bigint) order by n.id desc limit 41`, [s.cities, cur]) : Promise.resolve({ rows: [] as Envio[] }),
    tab === "mail" ? db().query<Correo>(
      `select e.id::text, e.tpl, e.subject, e.to_email::text as to, u.id::text as uid, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), u.phone) as quien,
              to_char(e.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, e.status, e.error
         from email_outbox e left join users u on u.id = e.user_id
        where (cardinality($1::text[]) = 0 or e.city_id = any($1::text[])) and ($2::bigint is null or e.id < $2::bigint) order by e.id desc limit 41`, [s.cities, cur]) : Promise.resolve({ rows: [] as Correo[] }),
    db().query<{ hoy: number; pruebas: number; enviados: number; problemas: number }>(
      `select count(*)::int as hoy, count(*) filter (where status = 'pruebas')::int as pruebas, count(*) filter (where status = 'enviado')::int as enviados,
              count(*) filter (where status in ('fallo', 'sin_proveedor'))::int as problemas
         from email_outbox where created_at > now() - interval '1 day' and (cardinality($1::text[]) = 0 or city_id = any($1::text[]))`, [s.cities]),
  ]);
  const lista = tab === "mail" ? M.rows : L.rows;
  return { kpi: k.rows[0]!, plantillas: T.rows, envios: L.rows.slice(0, 40), correos: M.rows.slice(0, 40).map((x) => ({ ...x, to: mascara(x.to) })), kmail: K.rows[0]!,
    sig: lista.length > 40 ? lista[39]!.id : null };
}
export type DatosNotif = Awaited<ReturnType<typeof datosNotif>>;

/* Las variables que una plantilla puede usar: las de su texto original (ES y EN). Un texto nuevo no puede inventar otras,
   porque el sistema no sabría con qué llenarlas. */
export const variables = (t: string) => [...new Set([...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!))];

/* Valores de muestra para «Probar en mi teléfono». */
export const MUESTRA: Record<string, string> = { resumen: "Hoy en la Comunidad: 3 respuestas y 1 seguidor nuevo.", negocio: "Sabor Dominicano", num: "1042", hora: "7:30 PM", dia: "14/11", alt: "8:00 PM", estado: "te van a llamar", puesto: "Cocinero", tipo: "pedido", cliente: "Marisol", min: "10", motivo: "lenguaje ofensivo",
  // 6j · Eventos
  evento: "Noche de bachata", lugar: "La Terraza", que: "Entrada general: cupo de 100 a 120", pct: "90", vendidos: "90", total: "100", cuantos: "2 boletos", codigo: "TL-KQX-4821" };
