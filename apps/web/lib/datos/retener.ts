import "server-only";
import { db } from "../db";

/* 9d · Las retenciones con su número en Configuración › Retención (fase9-apertura.md §3.7; L168, L879). Cada clave retener_* la lee una de
   estas funciones y el barrido central la corre (barrerRetenciones; guardián retencionQueCorre, con su prueba con el reloj movido en datos9d).
   Nada de esto toca lo que una persona tiene vivo: solo lo que ya pasó su tiempo. Las otras retenciones ya corrían (El Compa compa_retener_meses,
   errores errores_retener_dias, la ruta ubic_retener_dias, la analítica eventos_retener_meses, los canales compa_canal_retener_dias). */

/* Escaneos de la puerta (L879, §6 #25): pasados retener_escaneos_meses quedan solo en cifras (escaneos_retener en la base, con tl.retencion). */
export async function retenerEscaneos(): Promise<number> {
  return (await db().query<{ n: number }>(`select escaneos_retener(1000) as n`)).rows[0]?.n ?? 0;
}

/* La foto del documento de un reclamo (L168): retener_doc_reclamo_dias después de decidido, el archivo sale del almacén privado; queda que hubo
   un documento (claims.doc_kind) y la fila de la foto, vacía. */
export async function retenerDocReclamo(): Promise<number> {
  const F = (await db().query<{ id: string; url: string }>(
    `select m.id::text, m.url from claims c join media m on m.id = c.doc_media
      where c.decided_at is not null and c.decided_at < now() - make_interval(days => cfg_int('retener_doc_reclamo_dias')) and m.purged_at is null
      limit 100`)).rows;
  if (!F.length) return 0;
  const { borrarObjeto, mediosListos } = await import("../medios");
  for (const m of F) {
    if (mediosListos() && m.url.startsWith("privado/")) await borrarObjeto(m.url);
    await db().query(`update media set status = 'removed', removed_reason = coalesce(removed_reason, 'Documento del reclamo (retención)'), url = 'privado/borrada', purged_at = now() where id = $1::uuid`, [m.id]);
  }
  return F.length;
}

/* Sesiones cerradas o vencidas hace más de retener_sesiones_dias (con su dirección y su navegador). Las que una llave de acceso o un token de push
   todavía nombran se quedan (su registro las cita). */
export async function retenerSesiones(): Promise<number> {
  return (await db().query(
    `delete from sessions s where s.ctid in (
       select x.ctid from sessions x where coalesce(x.signed_out_at, x.expires_at) < now() - make_interval(days => cfg_int('retener_sesiones_dias'))
          and not exists (select 1 from push_tokens t where t.session_id = x.id) and not exists (select 1 from passkeys k where k.created_session = x.id)
        limit 1000)`)).rowCount ?? 0;
}

/* Búsquedas (lo que dicen las tiendas y Privacidad: 90 días). */
export async function retenerBusquedas(): Promise<number> {
  return (await db().query(
    `delete from search_logs where ctid in (select ctid from search_logs where at < now() - make_interval(days => cfg_int('retener_busquedas_dias')) limit 5000)`)).rowCount ?? 0;
}

/* Códigos de entrada: vencen a los 10 minutos; su fila, con el teléfono, sale pasados retener_codigos_dias. */
export async function retenerCodigos(): Promise<number> {
  return (await db().query(
    `delete from otp_codes where ctid in (select ctid from otp_codes where created_at < now() - make_interval(days => cfg_int('retener_codigos_dias')) limit 5000)`)).rowCount ?? 0;
}

/* La pasada del barrido: cada retención aparte (si una falla, las demás siguen; el barrido anota el error). */
export async function barrerRetenciones() {
  const out: Record<string, number | string> = {};
  const una = async (k: string, f: () => Promise<number>) => { try { out[k] = await f(); } catch (e) { out[k] = `error: ${String((e as Error)?.message ?? e).slice(0, 120)}`; } };
  await una("escaneos", () => retenerEscaneos());
  await una("docReclamo", () => retenerDocReclamo());
  await una("sesiones", () => retenerSesiones());
  await una("busquedas", () => retenerBusquedas());
  await una("codigos", () => retenerCodigos());
  if (Object.values(out).some((v) => typeof v === "string")) throw new Error(`retenciones: ${JSON.stringify(out)}`);
  return out;
}
