import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { guardarObjeto, mediosListos } from "@/lib/medios";

/* Foto de una ayuda de Salud o Pro (factura, recibo, total por escrito). PRIVADA (§3 de fase4-salud-pro): se guarda bajo
   «privado/a/» (nginx nunca la sirve) y solo la ven quien la subió, el negocio de esa cita y el equipo de To'Latino, por
   /api/ayuda/foto/{id}. Se endereza, se reduce y se vuelve a codificar sin metadatos. Se borra 90 días después de cerrar. */
export const dynamic = "force-dynamic";
const MAX = 12 * 1024 * 1024;
const err = (status: number, es: string, en: string) => NextResponse.json({ ok: false, mensaje: { es, en } }, { status });

export async function POST(req: NextRequest) {
  if (!(await mismoOrigen())) return err(403, "No permitido.", "Not allowed.");
  const me = await yo();
  if (!me) return err(401, "Entra para subir la foto.", "Sign in to upload the photo.");
  if (!mediosListos()) return err(503, "Las fotos no están disponibles en este momento.", "Photos are not available right now.");
  if (Number(req.headers.get("content-length") ?? 0) > MAX + 4096) return err(413, "La foto pesa demasiado (máximo 12 MB).", "The photo is too large (12 MB max).");
  const n = (await db().query<{ n: number }>(`select count(*)::int as n from media where uploaded_by = $1 and private and created_at > now() - interval '1 hour'`, [me.id])).rows[0]?.n ?? 0;
  if (n >= 20) return err(429, "Subiste muchas fotos seguidas. Prueba en un rato.", "Too many photos in a row. Try again later.");
  const f = (await req.formData().catch(() => null))?.get("foto");
  if (!(f instanceof File) || f.size === 0 || f.size > MAX) return err(400, "No llegó la foto.", "The photo did not arrive.");
  let img: Buffer;
  try {
    img = await sharp(Buffer.from(await f.arrayBuffer()), { limitInputPixels: 50_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  } catch {
    return err(415, "Eso no parece una foto. Prueba con otra.", "That doesn’t look like a photo. Try another one.");
  }
  const id = randomUUID(), clave = `privado/a/${id}.jpg`;
  await guardarObjeto(clave, img, "image/jpeg");
  await db().query(`insert into media (id, owner_kind, owner_id, url, uploaded_by, status, private) values ($1, 'user', $2, $3, $4, 'visible', true)`, [id, me.id, clave, me.id]);
  return NextResponse.json({ ok: true, id, url: `/api/ayuda/foto/${id}` });
}
