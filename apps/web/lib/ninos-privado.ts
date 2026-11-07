import "server-only";
import type { PoolClient } from "pg";
import { cifrar, descifrar } from "./cifrado";
import { db } from "./db";

/* Los datos de un niño en una inscripción (Fase 4 · 4eb · fase4-edu-ninos-deporte.md §3, Preguntas #6). ÚNICO lugar que los toca
   (guardián ninosNotaCifrada): op_private con motivo 'nino' y todo cifrado (AES-256-GCM, lib/cifrado.ts).
   - Lo que se guarda: nombre de pila, edad en años o grado, la escuela solo si el programa los recoge ahí, y una nota corta.
   - Lo que NUNCA: fecha de nacimiento, fotos, acta, vacunas, alergias, medicinas, diagnósticos, Medicaid ni la lista de quién puede
     recogerlo (eso se entrega en persona). El servidor rechaza una nota que parezca una fecha de nacimiento o un número de seguro
     social, y la hoja dice «No escribas datos médicos aquí».
   - Quién lo ve: el papá o la mamá que inscribió y el panel de ese negocio. Nunca en avisos, búsqueda, analítica ni El Compa.
   - Se borra a los 30 días de que la inscripción termina, se cancela o vence (barrido: purgarNinos). */
export type DatosNino = { nombre: string; edad: number | null; grado: string | null; escuela: string | null; nota: string | null };
export const GRADOS = ["Pre-K", "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
type R<T> = { ok: true; v: T } | { ok: false; es: string; en: string };
const no = <T>(es: string, en: string): R<T> => ({ ok: false, es, en });
const limpio = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, n) : "");
// Una fecha (12/03/2019, 2019-03-12, «12 de marzo de 2019») o un número de seguro social no van en la nota.
const FECHA = /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\s+de\s+[a-záéíóú]+\s+(de\s+)?\d{4}\b/i, NUM9 = /\b\d{3}-?\d{2}-?\d{4}\b/; // un número de 9 cifras con forma de seguro social

export function limpiarNino(p: unknown): R<DatosNino> {
  const x = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
  const nombre = limpio(x.nombre, 30);
  if (!/^[\p{L}][\p{L}' -]{0,29}$/u.test(nombre)) return no("Escribe solo el nombre de pila del niño.", "Write only the child's first name.");
  const edad = x.edad == null || x.edad === "" ? null : Math.round(Number(x.edad));
  if (edad != null && !(edad >= 0 && edad <= 17)) return no("La edad va de 0 a 17 años.", "Age goes from 0 to 17.");
  const grado = x.grado == null || x.grado === "" ? null : String(x.grado);
  if (grado != null && !GRADOS.includes(grado)) return no("Elige el grado.", "Pick the grade.");
  if (edad == null && grado == null) return no("Pon la edad o el grado.", "Add the age or the grade.");
  const escuela = limpio(x.escuela, 60) || null, nota = limpio(x.nota, 200) || null;
  for (const t of [escuela, nota]) if (t && (FECHA.test(t) || NUM9.test(t)))
    return no("No escribas fechas de nacimiento ni números de seguro social: no hacen falta.", "Do not write birth dates or social security numbers: they are not needed.");
  return { ok: true, v: { nombre, edad, grado, escuela, nota } };
}

/* Guardar (al inscribir; 4ee). Dentro de la transacción de la inscripción. */
export async function guardarNino(c: PoolClient, operacion: string, p: unknown): Promise<R<true>> {
  const r = limpiarNino(p);
  if (!r.ok) return r;
  await c.query(`insert into op_private (operation_id, reason, note_enc) values ($1::bigint, 'nino', $2)
                 on conflict (operation_id) do update set note_enc = excluded.note_enc, purge_at = null where op_private.reason = 'nino'`, [operacion, cifrar(JSON.stringify(r.v))]);
  return { ok: true, v: true };
}

/* Leer: solo quien inscribió o un miembro activo del negocio de esa inscripción (lo comprueba la consulta, no quien llama). */
export async function leerNino(operacion: string, quien: { usuario: string } | { negocio: string }): Promise<DatosNino | null> {
  const por = "usuario" in quien ? `o.user_id = $2::uuid` : `o.business_id = $2`;
  const r = (await db().query<{ enc: Buffer | null }>(
    `select p.note_enc as enc from op_private p join operations o on o.id = p.operation_id where p.operation_id = $1::bigint and p.reason = 'nino' and ${por}`,
    [operacion, "usuario" in quien ? quien.usuario : quien.negocio])).rows[0];
  const t = r ? descifrar(r.enc) : null;
  if (!t) return null;
  try { return JSON.parse(t) as DatosNino; } catch { return null; }
}

/* El barrido: a los 30 días de que la inscripción terminó, se canceló, venció o no se dio, los datos del niño se borran. */
export async function purgarNinos(): Promise<number> {
  const r = await db().query(
    `update op_private p set note_enc = null, purge_at = now() from operations o
      where o.id = p.operation_id and p.reason = 'nino' and p.note_enc is not null
        and o.status in ('done', 'cancelled', 'expired', 'declined')
        and coalesce(o.done_at, o.cancelled_at, o.updated_at) < now() - interval '30 days'`);
  return r.rowCount ?? 0;
}
