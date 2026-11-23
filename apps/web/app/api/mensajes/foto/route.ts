import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { enComunidad } from "@/lib/comunidad";
import { db } from "@/lib/db";
import { guardarVariantesEn } from "@/lib/fotos-privadas";
import { guardarObjeto, mediosListos } from "@/lib/medios";
import { conFotoSubida } from "@/lib/subida";
import { reglasMod } from "@/lib/moderacion";
import { revisarImagen } from "@/lib/moderacion-img";

/* 9t · Subir la foto de un mensaje (Mensajes cliente ↔ negocio; la sube el vecino en Mi cuenta o alguien del equipo en el panel). PRIVADA: se
   guarda bajo «privado/m/» (nginx nunca la sirve) y se ve solo por /api/mensajes/foto/{id}, con permiso. Aquí:
   - Topes en el servidor: 12 MB, solo imágenes (la abre sharp: lo que no es una foto no pasa), hasta 50 megapíxeles, 30 por persona en una hora.
   - Se endereza, se reduce (lado mayor 1600 px) y se vuelve a codificar en JPEG SIN metadatos (la ubicación de la cámara no viaja).
   - La revisa el modelo propio de imágenes (regla `img`, igual que las fotos de la Comunidad; 3 s y corta-circuito): bien → 'visible'; si la
     marca o no responde → 'review' con la nota de por qué (nunca abierto: nada se ve sin revisar). Al enviarla, lib/mensajes.ts la ata al
     mensaje y, si quedó en revisión, abre el caso en la cola «medios» del Super Admin.
   Hasta que se envía (owner_id 'pendiente') solo la ve quien la subió.
   9t (19 nov) · También la foto de Mensajes entre vecinos (Comunidad › Mensajes): el campo «para» = "dm" la guarda como owner_kind 'dm' (la ata
   lib/mensajes-vecinos.ts al enviar; la ven solo las dos personas). Mismos topes (el de la hora cuenta las dos), mismo almacén privado, mismo
   modelo; solo quien está en la Comunidad la sube. */
export const dynamic = "force-dynamic";
const MAX_FOTO_MSJ = 12 * 1024 * 1024, FOTOS_MSJ_HORA = 30;
const err = (status: number, es: string, en: string) => NextResponse.json({ ok: false, mensaje: { es, en } }, { status });

export async function POST(req: NextRequest) {
  if (!(await mismoOrigen())) return err(403, "No permitido.", "Not allowed.");
  const me = await yo();
  if (!me) return err(401, "Entra para mandar la foto.", "Sign in to send the photo.");
  if (!mediosListos()) return err(503, "Las fotos no están disponibles en este momento.", "Photos are not available right now.");
  if (Number(req.headers.get("content-length") ?? 0) > MAX_FOTO_MSJ + 4096) return err(413, "La foto pesa demasiado (máximo 12 MB).", "The photo is too large (12 MB max).");
  const n = (await db().query<{ n: number }>(`select count(*)::int as n from media where uploaded_by = $1 and owner_kind in ('chat', 'dm') and created_at > now() - interval '1 hour'`, [me.id])).rows[0]?.n ?? 0;
  if (n >= FOTOS_MSJ_HORA) return err(429, "Mandaste muchas fotos seguidas. Prueba en un rato.", "You sent too many photos in a row. Try again later.");
  // 22 nov · La foto llega al disco y se abre con turno (lib/subida.ts conFotoSubida: lugar antes de leer, turno para sharp; 503 si está lleno).
  // El tamaño se mira mientras llega: un navegador que no manda content-length por adelantado (el iPad en el CI) también recibe el 413.
  const sinComunidad = async (x: Record<string, string>) => x.para === "dm" && !(await enComunidad(me.id)).ok
    ? err(403, "Antes de mandar fotos, termina tu bienvenida a la Comunidad.", "Before sending photos, finish your Community welcome.") : null;
  return conFotoSubida(req, {
    tope: MAX_FOTO_MSJ, textos: ["para"],
    grande: () => err(413, "La foto pesa demasiado (máximo 12 MB).", "The photo is too large (12 MB max)."),
    sinArchivo: async (x) => (await sinComunidad(x)) ?? err(400, "No llegó la foto.", "The photo did not arrive."),
    antes: async (f) => (await sinComunidad(f.textos))
      ?? (f.tipo && !/^image\//.test(f.tipo) ? err(415, "Eso no parece una foto. Prueba con otra.", "That doesn’t look like a photo. Try another one.") : null),
  }, async (f) => {
    const kind = f.textos.para === "dm" ? "dm" : "chat";
    let img: Buffer, w = 0, h = 0;
    try {
      const r = await sharp(f.ruta, { limitInputPixels: 50_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true });
      img = r.data; w = r.info.width; h = r.info.height;
    } catch {
      return err(415, "Eso no parece una foto. Prueba con otra.", "That doesn’t look like a photo. Try another one.");
    }
    // La regla `img` (Super Admin › Contenido › Auto-moderación): encendida, el modelo decide; si no responde, revisión manual.
    const R = await reglasMod();
    const rv = R.img.on ? await revisarImagen(img, R.img.p.umbral ?? 0.6) : { estado: "ok" as const, desnudez: null, ms: null };
    const estado = rv.estado === "ok" ? "visible" : "review";
    const nota = rv.estado === "marcada" ? `El modelo la marcó por desnudez (${Math.round((rv.desnudez ?? 0) * 100)} %). No se ve hasta que la revises.`
      : rv.estado === "sin_servicio" ? "El modelo no respondió: revisión manual. No se ve hasta que la revises." : null;
    const id = randomUUID(), clave = `privado/m/${id}.jpg`;
    await guardarObjeto(clave, img, "image/jpeg");
    await db().query(`insert into media (id, owner_kind, owner_id, url, w, h, uploaded_by, status, private, check_note) values ($1, $8, 'pendiente', $2, $3, $4, $5, $6, true, $7)`,
      [id, clave, w, h, me.id, estado, nota, kind]);
    // F3b · Sus variantes (la miniatura del chat pide ?w=), al lado de la maestra y con el mismo permiso; un fallo no tumba la subida.
    await guardarVariantesEn(clave, img, w);
    return NextResponse.json({ ok: true, id, url: `/api/mensajes/foto/${id}`, revision: estado === "review" });
  });
}
