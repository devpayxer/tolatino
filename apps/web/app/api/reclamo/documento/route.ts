import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { guardarVariantesEn } from "@/lib/fotos-privadas";
import { guardarObjeto, mediosListos } from "@/lib/medios";
import { conFotoSubida } from "@/lib/subida";

/* Foto del documento de un reclamo (Recuperar tu negocio). PRIVADA: se guarda bajo «privado/» (nginx nunca la sirve) y
   solo el equipo la ve por /api/admin/reclamo/{id}/documento. Se endereza, se reduce y se vuelve a codificar sin
   metadatos (fuera EXIF y GPS). Nunca se devuelve una URL. */
export const dynamic = "force-dynamic";
const MAX = 12 * 1024 * 1024;
const err = (status: number, es: string, en: string) => NextResponse.json({ ok: false, mensaje: { es, en } }, { status });

export async function POST(req: NextRequest) {
  if (!(await mismoOrigen())) return err(403, "No permitido.", "Not allowed.");
  const me = await yo();
  if (!me) return err(401, "Entra para subir el documento.", "Sign in to upload the document.");
  if (!mediosListos()) return err(503, "Las fotos no están disponibles en este momento.", "Photos are not available right now.");
  if (Number(req.headers.get("content-length") ?? 0) > MAX + 4096) return err(413, "La foto pesa demasiado (máximo 12 MB).", "The photo is too large (12 MB max).");
  const n = (await db().query<{ n: number }>(`select count(*)::int as n from media where uploaded_by = $1 and owner_kind = 'claim' and created_at > now() - interval '1 hour'`, [me.id])).rows[0]?.n ?? 0;
  if (n >= 10) return err(429, "Subiste muchas fotos seguidas. Prueba en un rato.", "Too many photos in a row. Try again later.");
  // 22 nov · La foto llega al disco y se abre con turno (lib/subida.ts conFotoSubida: lugar antes de leer, turno para sharp; 503 si está lleno).
  return conFotoSubida(req, {
    tope: MAX,
    grande: () => err(413, "La foto pesa demasiado (máximo 12 MB).", "The photo is too large (12 MB max)."),
    sinArchivo: () => err(400, "No llegó la foto.", "The photo did not arrive."),
  }, async (f) => {
    let img: Buffer;
    try {
      img = await sharp(f.ruta, { limitInputPixels: 50_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    } catch {
      return err(415, "Eso no parece una foto. Prueba con otra.", "That doesn’t look like a photo. Try another one.");
    }
    const id = randomUUID(), clave = `privado/r/${id}.jpg`;
    await guardarObjeto(clave, img, "image/jpeg");
    await db().query(`insert into media (id, owner_kind, owner_id, url, uploaded_by, status, private) values ($1, 'claim', $2, $3, $4, 'visible', true)`, [id, me.id, clave, me.id]);
    // F3b · Sus variantes, al lado de la maestra y con el mismo permiso; un fallo no tumba la subida.
    await guardarVariantesEn(clave, img);
    return NextResponse.json({ ok: true, id });
  });
}
