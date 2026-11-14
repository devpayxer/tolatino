import "server-only";
import { db } from "../db";
import type { EstadoEntrega, EstadoPlantilla } from "../compa/canales-proveedor";
import { anotarEntrega } from "../sms";

/* 9l · Lo que avisan los proveedores DESPUÉS de mandar (la ruta /api/compa/entrada/[proveedor] ya verificó la firma; guardián canalConFirma):
   - Telnyx `message.finalized` → el intento de ese SMS (lib/sms anotarEntrega: entregado, o reintento / falló). Un id que no es nuestro no hace nada.
   - Meta `statuses` → la salida de WhatsApp de El Compa y de Soporte (compa_outbound): delivered/read = entregado, failed = falló; una vez.
   - Meta `message_template_status_update` → el estado de la plantilla en Meta (aprobada, rechazada con su motivo, pausada, deshabilitada) y su historial.
   Nunca lanza: el proveedor siempre recibe su 200. */
export async function anotar(estados: EstadoEntrega[], plantillas: EstadoPlantilla[]): Promise<{ sms: number; whatsapp: number; plantillas: number }> {
  let sms = 0, wa = 0, pl = 0;
  for (const e of estados.slice(0, 100)) {
    if (!e.final) continue;
    try {
      if (e.proveedor === "telnyx") { if (await anotarEntrega("telnyx", e.id, e.final, e.codigo)) sms++; continue; }
      const r = await db().query(
        `update compa_outbound set status = $2, error = case when $2 = 'fallo' then left(coalesce($3, 'meta'), 200) else error end
          where provider = 'whatsapp' and provider_msg_id = $1 and status = 'enviado'`, [e.id, e.final, e.codigo]);
      wa += r.rowCount ?? 0;
    } catch { /* uno malo no frena los demás */ }
  }
  for (const p of plantillas.slice(0, 50)) {
    try {
      const t = (await db().query<{ id: string }>(
        `update wa_templates set status = $3, meta_id = coalesce(nullif($4, ''), meta_id), reason = $5, decided_at = case when $3 in ('aprobada', 'rechazada', 'pausada', 'deshabilitada') then now() else decided_at end
          where name = $1 and language = $2 and status <> $3 returning id::text`, [p.nombre, p.idioma, p.estado, p.metaId, p.motivo])).rows[0];
      if (!t) continue;
      await db().query(`insert into wa_template_events (template_id, status, reason, via) values ($1::bigint, $2, $3, 'meta')`, [t.id, p.estado, p.motivo]);
      pl++;
    } catch { /* sigue */ }
  }
  return { sms, whatsapp: wa, plantillas: pl };
}
