import "server-only";
import type { Staff } from "./admin";
import { db } from "./db";

/* ADM-NOTIF · Notificaciones (Super Admin.dc.html secNotif): plantillas por evento (ES/EN, editables con auditoría), los
   envíos de tus ciudades con su estado de SMS, y las reglas. Las cifras salen de `notifications`, nunca inventadas. */
export type GrupoNotif = "crit" | "tx" | "mod" | "biz" | "mkt";
export type Plantilla = { key: string; grp: GrupoNotif; pref: string | null; sms: boolean; title: { es: string; en: string }; body: { es: string; en: string }; editada: boolean; n7: number };
export type Envio = { id: string; tpl: string; title: string; body: string; uid: string; quien: string; at: string; sms: string; leido: boolean };
const CIUD = "(cardinality($1::text[]) = 0 or n.city_id = any($1::text[]))";

export async function datosNotif(s: Staff, tab: "tpl" | "log" | "rules", antes: string | null) {
  const cur = antes && /^\d{1,18}$/.test(antes) ? antes : null;
  const [k, T, L] = await Promise.all([
    db().query<{ hoy: number; sms: number; pruebas: number; frenados: number; fallos: number; leidos: number }>(
      `select count(*)::int as hoy, count(*) filter (where n.sms_status = 'enviado')::int as sms, count(*) filter (where n.sms_status in ('pruebas', 'pendiente'))::int as pruebas,
              count(*) filter (where n.sms_status in ('apagado', 'silencio'))::int as frenados, count(*) filter (where n.sms_status in ('fallo', 'sin_proveedor'))::int as fallos,
              count(*) filter (where n.read_at is not null)::int as leidos
         from notifications n where n.created_at > now() - interval '1 day' and ${CIUD}`, [s.cities]),
    db().query<Plantilla>(
      `select t.key, t.grp, t.pref, t.sms, t.title, t.body, t.edited_by is not null as editada,
              (select count(*)::int from notifications n where n.tpl = t.key and n.created_at > now() - interval '7 days' and ${CIUD}) as n7
         from notif_templates t order by array_position(array['crit', 'tx', 'mod', 'biz', 'mkt'], t.grp), coalesce(array_position(array['ord_ok', 'ord_ready', 'ord_way', 'ord_no', 'rsv_ok', 'rsv_alt', 'rsv_no', 'job_reply', 'help_reply', 'help_done', 'mod_hide', 'biz_req', 'biz_help', 'biz_job'], t.key), 99), t.key`, [s.cities]),
    tab === "log" ? db().query<Envio>(
      `select n.id::text, n.tpl, n.title, n.body, u.id::text as uid, coalesce(nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''), u.phone) as quien,
              to_char(n.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, n.sms_status as sms, n.read_at is not null as leido
         from notifications n join users u on u.id = n.user_id where ${CIUD} and ($2::bigint is null or n.id < $2::bigint) order by n.id desc limit 41`, [s.cities, cur]) : Promise.resolve({ rows: [] as Envio[] }),
  ]);
  return { kpi: k.rows[0]!, plantillas: T.rows, envios: L.rows.slice(0, 40), sig: L.rows.length > 40 ? L.rows[39]!.id : null };
}
export type DatosNotif = Awaited<ReturnType<typeof datosNotif>>;

/* Las variables que una plantilla puede usar: las de su texto original (ES y EN). Un texto nuevo no puede inventar otras,
   porque el sistema no sabría con qué llenarlas. */
export const variables = (t: string) => [...new Set([...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!))];

/* Valores de muestra para «Probar en mi teléfono». */
export const MUESTRA: Record<string, string> = { negocio: "Sabor Dominicano", num: "1042", hora: "7:30 PM", dia: "14/11", alt: "8:00 PM", estado: "te van a llamar", puesto: "Cocinero", tipo: "pedido", cliente: "Marisol", min: "10", motivo: "lenguaje ofensivo" };
