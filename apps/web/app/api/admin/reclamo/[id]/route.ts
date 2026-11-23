import { NextResponse, type NextRequest } from "next/server";
import { auditar, staff } from "@/lib/admin";
import { colasVisibles } from "@/lib/admin-colas";
import { db, tx } from "@/lib/db";
import { entregarPrivado } from "@/lib/entrega-privada";
import { llavesAEntregar } from "@/lib/fotos-privadas";

/* El documento de un reclamo, solo para el equipo que trabaja «Cambios sensibles» (en su ciudad). Cada vez que alguien
   lo ve queda en la auditoría. Nunca se cachea. 22 nov · Un documento ya purgado (retención o cuenta borrada: su fila queda con
   purged_at y la dirección «privado/borrada», que no existe en el almacén) da 404, sin renglón en la auditoría: antes daba 500. */
export const dynamic = "force-dynamic";
// 23 nov · El MISMO 404 para «no tienes permiso», «no existe» y «el archivo no está en el almacén», y nunca se guarda (private, no-store): un
// navegador o Cloudflare no siguen dando 404 cuando el archivo vuelve. Guardián almacenPrivadoSinQuinientos.
const no = () => new NextResponse(null, { status: 404, headers: { "cache-control": "private, no-store" } });
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await staff();
  if (!s || !colasVisibles(s).includes("cambio") || !/^CL-\d{1,12}$/.test(id)) return no();
  const x = (await db().query<{ url: string; var_widths: number[] | null; city_id: string; business_id: string }>(
    `select m.url, m.var_widths, cl.city_id, cl.business_id from claims cl join media m on m.id = cl.doc_media where cl.id = $1 and m.private and m.purged_at is null`, [id])).rows[0];
  const r = !x || (s.cities.length && !s.cities.includes(x.city_id)) ? null : x;
  if (!r || !r.url.startsWith("privado/")) return no();
  // El renglón de «vio el documento» se deja solo si el archivo existe y sale (entregarPrivado alEntregar): un archivo ausente da 404 sin renglón.
  const ver = () => tx((c) => auditar(c, { actor: s.id, action: "reclamo.documento.ver", targetKind: "claim", targetId: id, city: r.city_id }));
  // 9t · En flujo desde el almacén, con ETag y 304 a If-None-Match (lib/entrega-privada.ts). F3b · Con `?w=` la variante (llavesAEntregar), con el
  // MISMO permiso de arriba (y su renglón en la auditoría) y las mismas cabeceras privadas; si la variante falla en el almacén, la maestra.
  const cab = { "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-disposition": "inline", vary: "Accept, Cookie" };
  const llaves = llavesAEntregar(req, r.url, r.var_widths);
  return entregarPrivado(req, llaves, cab, no, ver).catch(() => entregarPrivado(req, llaves.slice(-1), cab, no, ver));
}
