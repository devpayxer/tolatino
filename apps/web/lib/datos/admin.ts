import "server-only";
import { db } from "../db";
import { archivosDe } from "./exportar";
import { purgaDe } from "./purgar";
import { terminosAceptados } from "./terminos";

/* 9d · Super Admin › Usuarios 360° › Privacidad (L186, L189): sus archivos (sin contenido), el borrado programado y, si ya corrió, la purga con
   cada tabla; lo que aceptó; los avisos que tiene apagados; las fusiones (de esta cuenta o hacia ella) y el pedido de fusión pendiente. La lee
   la página solo después de usuario360() (permiso y ciudad ya revisados). */
const AVISO: Record<string, string> = {
  ord: "Cómo va tu pedido", cit: "Respuesta a tus reservaciones", com: "Respuestas y votos", dig: "Un resumen al día", msg: "Mensajes de vecinos", evt: "Boletos y cambios",
  evtR: "Recordatorios de eventos", evtG: "Eventos que guarda", emp: "Respuesta a sus solicitudes", hoy: "Lo que traen hoy", of: "Ofertas", mailR: "Recibos por correo", mailW: "Resumen semanal por correo",
  quiet: "Horas de silencio", cpa: "El Compa por WhatsApp o SMS",
};
export async function privacidad360(id: string) {
  const [archivos, purga, terminos, u, fusiones, pedido] = await Promise.all([
    archivosDe(id), purgaDe(id), terminosAceptados(id),
    db().query<{ prefs: Record<string, boolean>; delete_at: string | null; reason: string | null; status: string; merged_into: string | null }>(
      `select notif_prefs as prefs, to_char(delete_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as delete_at, delete_reason as reason, status, merged_into::text from users where id = $1::uuid`, [id]),
    db().query<{ desde: string; hacia: string; pidio: string | null; aprobo: string | null; at: string; tablas: Record<string, number> }>(
      `select m.from_user_id::text as desde, m.to_user_id::text as hacia, nullif(trim(coalesce(a.first_name, '') || ' ' || left(coalesce(a.last_name, ''), 1)), '') as pidio,
              nullif(trim(coalesce(b.first_name, '') || ' ' || left(coalesce(b.last_name, ''), 1)), '') as aprobo, to_char(m.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as at, m.tables as tablas
         from account_merges m left join users a on a.id = m.requested_by left join users b on b.id = m.approved_by
        where m.from_user_id = $1::uuid or m.to_user_id = $1::uuid order by m.at desc limit 10`, [id]),
    db().query<{ id: string; hacia: string | null; pidio: string | null; caso: string | null }>(
      `select c.id, c.payload->>'into' as hacia, nullif(trim(coalesce(a.first_name, '') || ' ' || left(coalesce(a.last_name, ''), 1)), '') as pidio,
              (select q.id::text from queue_items q where q.subject_kind = 'sensitive_change' and q.subject_id = c.id order by q.opened_at desc limit 1) as caso
         from sensitive_changes c left join users a on a.id = c.requested_by where c.type = 'mergeUser' and c.target_id = $1 and c.status = 'pending' limit 1`, [id]),
  ]);
  const x = u.rows[0];
  const apagados = Object.entries(x?.prefs ?? {}).filter(([k, v]) => v === false && k !== "quiet").map(([k]) => AVISO[k] ?? k);
  return {
    archivos, purga, terminos, fusiones: fusiones.rows, pedidoFusion: pedido.rows[0] ?? null,
    borrado: x?.delete_at ? { at: x.delete_at, porElEquipo: x.reason === "admin" || x.status === "deleted_pending", motivo: x.reason } : null,
    avisos: { apagados, silencio: x?.prefs?.quiet !== false },
    fusionadaEn: x?.merged_into ?? null,
  };
}
export type Privacidad360 = Awaited<ReturnType<typeof privacidad360>>;
