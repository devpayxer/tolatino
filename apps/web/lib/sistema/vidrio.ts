import "server-only";
import { auditar, type Staff } from "../admin";
import { colasVisibles } from "../admin-colas";
import { db, tx } from "../db";

/* 9j · «Vidrio roto» del equipo a una foto de Salud (LAUNCH L464; plan §3): la foto privada de una ayuda con un consultorio (Doctores, NEG-SALUD)
   solo se muestra al equipo DESPUÉS de escribir el motivo. El motivo queda en break_glass (solo inserción) y en la auditoría; abre las fotos de esa
   ayuda a esa persona durante 10 minutos (cada vista sigue anotándose en la auditoría, como siempre). Sin motivo vigente, la ruta de la foto
   contesta 404 al equipo (el paciente y el consultorio la siguen viendo igual). Los demás rubros siguen como estaban (con su auditoría). */
const MINUTOS = 10;
type Bi = { es: string; en: string };

/* ¿La ayuda es de Salud? (las fotos de una cita con un consultorio). */
export async function ayudaDeSalud(helpId: string): Promise<boolean> {
  if (!/^\d{1,18}$/.test(helpId)) return false;
  return (await db().query(`select 1 from help_requests h join businesses b on b.id = h.business_id where h.id = $1::bigint and b.category_id = 'NEG-SALUD'`, [helpId])).rowCount === 1;
}

/* ¿Esta persona del equipo dio un motivo vigente para esta ayuda? */
export async function vidrioVigente(staffId: string, helpId: string): Promise<boolean> {
  return (await db().query(`select 1 from break_glass where staff_id = $1 and target_kind = 'help_request' and target_id = $2 and expires_at > now() limit 1`, [staffId, helpId])).rowCount === 1;
}

/* Abrir con motivo: la persona puede trabajar Soporte en la ciudad de la ayuda; el motivo tiene al menos 10 letras (no «ok»). Por la foto (la ruta
   de prueba y la del admin dan el id de una foto) o por la ayuda. */
export async function abrirVidrio(s: Staff, x: { foto?: string; ayuda?: string }, motivo: string): Promise<{ ok: true; msg: Bi; ayuda: string } | { ok: false; msg: Bi }> {
  const m = String(motivo ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
  if (m.length < 10) return { ok: false, msg: { es: "Escribe por qué necesitas verla (al menos 10 letras).", en: "Write why you need to see it (at least 10 letters)." } };
  const fila = (x.foto && /^[0-9a-f-]{36}$/.test(x.foto)
    ? await db().query<{ id: string; city: string | null; salud: boolean }>(
      `select h.id::text, h.city_id as city, b.category_id = 'NEG-SALUD' as salud from media m join help_requests h on m.owner_kind = 'help' and h.id::text = m.owner_id
         join businesses b on b.id = h.business_id where m.id = $1::uuid and m.private and m.status = 'visible'`, [x.foto])
    : x.ayuda && /^\d{1,18}$/.test(x.ayuda)
      ? await db().query<{ id: string; city: string | null; salud: boolean }>(`select h.id::text, h.city_id as city, b.category_id = 'NEG-SALUD' as salud from help_requests h join businesses b on b.id = h.business_id where h.id = $1::bigint`, [x.ayuda])
      : { rows: [] }).rows[0];
  if (!fila || !fila.salud) return { ok: false, msg: { es: "Esa foto no existe.", en: "That photo does not exist." } };
  if (!colasVisibles(s).includes("sop") || (s.cities.length && (!fila.city || !s.cities.includes(fila.city)))) return { ok: false, msg: { es: "Tu rol no ve las ayudas de esa ciudad.", en: "Your role cannot see help requests in that city." } };
  await tx(async (c) => {
    await c.query(`insert into break_glass (staff_id, target_kind, target_id, city_id, reason, expires_at) values ($1, 'help_request', $2, $3, $4, now() + make_interval(mins => $5::int))`, [s.id, fila.id, fila.city, m, MINUTOS]);
    await auditar(c, { actor: s.id, action: "ayuda.foto.vidrio", targetKind: "help_request", targetId: fila.id, city: fila.city ?? undefined, after: { minutos: MINUTOS }, reason: m });
  });
  return { ok: true, ayuda: fila.id, msg: { es: `Puedes verlas durante ${MINUTOS} minutos. Queda en la auditoría con tu motivo.`, en: `You can see them for ${MINUTOS} minutes. It goes in the audit log with your reason.` } };
}
