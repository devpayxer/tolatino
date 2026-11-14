import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { guardarObjeto, mediosListos } from "@/lib/medios";

/* 9n · La foto de la entrega (prueba de entrega; fase9 §6 #21). PRIVADA: se guarda bajo «privado/e/» (nginx nunca la sirve), dueña la entrega
   (media.owner_kind 'delivery', owner_id = la operación). Solo la sube el repartidor ASIGNADO a un delivery ACTIVO (?numero=…); se endereza, se
   reduce y se vuelve a codificar sin metadatos (sin GPS de la foto). La ven el cliente de ese pedido, el negocio y el equipo de To'Latino por
   /api/entrega/foto/{id} (auditado). Se borra a los `entrega_foto_dias` (Configuración › Repartidor) salvo con una disputa abierta. */
export const dynamic = "force-dynamic";
const MAX = 12 * 1024 * 1024;
const err = (status: number, es: string, en: string) => NextResponse.json({ ok: false, mensaje: { es, en } }, { status });

export async function POST(req: NextRequest) {
  if (!(await mismoOrigen())) return err(403, "No permitido.", "Not allowed.");
  const me = await yo();
  if (!me) return err(401, "Entra para subir la foto.", "Sign in to upload the photo.");
  if (!mediosListos()) return err(503, "Las fotos no están disponibles en este momento.", "Photos are not available right now.");
  const numero = String(req.nextUrl.searchParams.get("numero") ?? "");
  if (!/^\d{1,12}$/.test(numero)) return err(400, "Ese pedido no existe.", "That order does not exist.");
  const o = (await db().query<{ id: string }>(
    `select o.id::text from operations o join delivery_drivers d on d.id = o.driver_id
      where o.number = $1 and d.user_id = $2 and d.status = 'active' and o.kind = 'order' and coalesce(o.mode, 'pickup') = 'delivery' and o.status = 'confirmed'`, [numero, me.id])).rows[0];
  if (!o) return err(404, "Este pedido ya no es tuyo.", "This order is no longer yours.");
  if (Number(req.headers.get("content-length") ?? 0) > MAX + 4096) return err(413, "La foto pesa demasiado (máximo 12 MB).", "The photo is too large (12 MB max).");
  const n = (await db().query<{ n: number }>(`select count(*)::int as n from media where uploaded_by = $1 and owner_kind = 'delivery' and created_at > now() - interval '1 hour'`, [me.id])).rows[0]?.n ?? 0;
  if (n >= 30) return err(429, "Subiste muchas fotos seguidas. Prueba en un rato.", "Too many photos in a row. Try again later.");
  const f = (await req.formData().catch(() => null))?.get("foto");
  if (!(f instanceof File) || f.size === 0 || f.size > MAX) return err(400, "No llegó la foto.", "The photo did not arrive.");
  let img: Buffer;
  try {
    img = await sharp(Buffer.from(await f.arrayBuffer()), { limitInputPixels: 50_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  } catch {
    return err(415, "Eso no parece una foto. Prueba con otra.", "That doesn’t look like a photo. Try another one.");
  }
  const id = randomUUID(), clave = `privado/e/${id}.jpg`;
  await guardarObjeto(clave, img, "image/jpeg");
  await db().query(`insert into media (id, owner_kind, owner_id, url, uploaded_by, status, private) values ($1, 'delivery', $2, $3, $4, 'visible', true)`, [id, o.id, clave, me.id]);
  return NextResponse.json({ ok: true, id });
}
