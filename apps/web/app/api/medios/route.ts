import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp, { type OutputInfo } from "sharp";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { guardarObjeto, mediosListos, urlPublica } from "@/lib/medios";

/* Subir una foto (Publica tu negocio · portada y galería; luego el panel). Con cuenta y del mismo sitio. El servidor
   decide: abre la imagen (si no es una foto, no entra), la endereza, la reduce a 1600 px y la vuelve a codificar en
   JPEG SIN metadatos (fuera EXIF y la ubicación GPS de la cámara). Queda a nombre de la persona hasta publicar. */
export const dynamic = "force-dynamic";
const MAX = 12 * 1024 * 1024;
const err = (status: number, es: string, en: string) => NextResponse.json({ ok: false, mensaje: { es, en } }, { status });

export async function POST(req: NextRequest) {
  if (!(await mismoOrigen())) return err(403, "No permitido.", "Not allowed.");
  const me = await yo();
  if (!me) return err(401, "Entra para subir fotos.", "Sign in to upload photos.");
  if (!mediosListos()) return err(503, "Las fotos no están disponibles en este momento.", "Photos are not available right now.");
  if (Number(req.headers.get("content-length") ?? 0) > MAX + 4096) return err(413, "La foto pesa demasiado (máximo 12 MB).", "The photo is too large (12 MB max).");
  const n = (await db().query<{ n: number }>(`select count(*)::int as n from media where uploaded_by = $1 and created_at > now() - interval '1 hour'`, [me.id])).rows[0]?.n ?? 0;
  if (n >= 60) return err(429, "Subiste muchas fotos seguidas. Prueba en un rato.", "Too many photos in a row. Try again later.");
  const form = await req.formData().catch(() => null);
  const f = form?.get("foto");
  if (!(f instanceof File) || f.size === 0 || f.size > MAX) return err(400, "No llegó la foto.", "The photo did not arrive.");
  let img: { data: Buffer; info: OutputInfo };
  try {
    img = await sharp(Buffer.from(await f.arrayBuffer()), { limitInputPixels: 50_000_000 })
      .rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  } catch {
    return err(415, "Eso no parece una foto. Prueba con otra.", "That doesn’t look like a photo. Try another one.");
  }
  const id = randomUUID(), clave = `n/${id}.jpg`;
  await guardarObjeto(clave, img.data, "image/jpeg");
  await db().query(
    `insert into media (id, owner_kind, owner_id, url, w, h, uploaded_by, status) values ($1, 'user', $2, $3, $4, $5, $6, 'visible')`,
    [id, me.id, urlPublica(clave), img.info.width, img.info.height, me.id]);
  return NextResponse.json({ ok: true, id, url: urlPublica(clave) });
}
