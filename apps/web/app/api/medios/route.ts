import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp, { type OutputInfo } from "sharp";
import { mismoOrigen, yo } from "@/lib/cuenta";
import { tx } from "@/lib/db";
import { HTTP_RECHAZADA, HTTP_RETENIDA, mensajeSubida } from "@/lib/fotos-decision";
import { anotarVeredicto, guardarNoPublicada, huella, reglasFotos, revisarSubida, topeQueFrena, topeSubidas, veredictosDe } from "@/lib/fotos-revision";
import { guardarVariantesPrivadas, llavePrivada, urlPrivada } from "@/lib/fotos-privadas";
import { guardarVariantes } from "@/lib/fotos-variantes";
import { guardarObjeto, mediosListos, urlPublica } from "@/lib/medios";
import { conFotoSubida } from "@/lib/subida";

/* Subir una foto (Publica tu negocio · portada y galería; luego el panel). Con cuenta y del mismo sitio. El servidor
   decide: abre la imagen (si no es una foto, no entra), la endereza, la reduce a 1600 px y la vuelve a codificar en
   JPEG SIN metadatos (fuera EXIF y la ubicación GPS de la cámara). Queda a nombre de la persona hasta publicar.
   Revisión automática (decisión AJ): ANTES de guardar nada en lo público, la foto pasa por las capas (lib/fotos-revision.ts revisarSubida; la
   decisión pura en lib/fotos-decision.ts): memoria por contenido, modelo propio, confianza y, si hace falta, la segunda opinión en este mismo
   pedido (con tiempo límite corto). Solo una foto «visible» llega a n/<uuid>.jpg; una retenida o rechazada se guarda SOLO en la llave privada,
   no devuelve ninguna dirección y contesta ok: false con su estado y el mensaje ES/EN (202 retenida, 422 rechazada: el cliente no los
   reintenta; guardián fotosRevisionAntesDePublicar). Cuenta nueva: tope de fotos por hora más bajo (capa 4).
   Destino: el formulario puede traer destino=privado (la foto va solo a un negocio o al equipo: una solicitud, una cita, un estimado, un viaje…).
   Es una pista del cliente que solo RESTRINGE: con «privado» la segunda opinión (Claude) no se consulta nunca para esta foto (la fila queda con
   rev_sin_c2); una limpia entra igual y una clara se rechaza igual; la dudosa queda retenida («privada»). Cualquier otro valor = público.
   F3 · Y una foto de destino «privado» NUNCA tiene dirección pública: su maestra va a privado/o/<uuid>.jpg (nginx nunca sirve /medios/privado/),
   la fila queda private con la dirección de la ruta con permiso (/api/medios/privada/<uuid>; lib/fotos-privadas.ts permisoFotoPrivada) y sus
   variantes también son privadas. Así marcar «privado» no deja ningún atajo: no hay una dirección que pegar en algo público.
   Fotos a la medida (decisión AI): guardada la maestra, en el mismo pedido salen sus variantes WebP (320/640/1080/1600, nunca más anchas que la
   maestra; lib/fotos-variantes.ts). Si algo falla ahí, la subida vale igual (la maestra ya está) y el barrido las completa. */
export const dynamic = "force-dynamic";
const MAX = 12 * 1024 * 1024;
const err = (status: number, es: string, en: string) => NextResponse.json({ ok: false, mensaje: { es, en } }, { status });

export async function POST(req: NextRequest) {
  if (!(await mismoOrigen())) return err(403, "No permitido.", "Not allowed.");
  const me = await yo();
  if (!me) return err(401, "Entra para subir fotos.", "Sign in to upload photos.");
  if (!mediosListos()) return err(503, "Las fotos no están disponibles en este momento.", "Photos are not available right now.");
  if (Number(req.headers.get("content-length") ?? 0) > MAX + 4096) return err(413, "La foto pesa demasiado (máximo 12 MB).", "The photo is too large (12 MB max).");
  const R = await reglasFotos();
  // El tope general (60 por hora, todas las fotos) antes de leer el cuerpo; el de cuenta nueva, que solo frena las de destino público, cuando ya se
  // sabe el destino (lib/fotos-revision.ts topeQueFrena).
  const t = await topeSubidas(me.id, R);
  const frenada = (sinC2: boolean) => {
    const frena = topeQueFrena(t, sinC2);
    if (!frena) return null;
    return frena === "nueva"
      ? err(429, `Las cuentas nuevas suben hasta ${t.topeNueva} fotos por hora. Prueba en un rato.`, `New accounts can upload up to ${t.topeNueva} photos an hour. Try again later.`)
      : err(429, "Subiste muchas fotos seguidas. Prueba en un rato.", "Too many photos in a row. Try again later.");
  };
  if (topeQueFrena(t, true)) return frenada(false)!;
  // 22 nov · La foto llega al disco y se abre con turno (lib/subida.ts conFotoSubida: lugar antes de leer, turno para sharp; 503 si está lleno).
  return conFotoSubida(req, {
    tope: MAX, textos: ["destino"],
    grande: () => err(413, "La foto pesa demasiado (máximo 12 MB).", "The photo is too large (12 MB max)."),
    sinArchivo: (x) => frenada(x.destino === "privado") ?? err(400, "No llegó la foto.", "The photo did not arrive."),
    antes: (f) => frenada(f.textos.destino === "privado"),
  }, async (f) => {
    const sinC2 = f.textos.destino === "privado";
    let img: { data: Buffer; info: OutputInfo };
    try {
      img = await sharp(f.ruta, { limitInputPixels: 50_000_000 })
        .rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true });
    } catch {
      return err(415, "Eso no parece una foto. Prueba con otra.", "That doesn’t look like a photo. Try another one.");
    }
    // La decisión, antes de guardar nada en lo público.
    const sha = huella(img.data);
    const v = await revisarSubida({ id: randomUUID(), datos: img.data, sha, userId: me.id, sinC2 }, R);
    if (v.d.estado !== "visible") {
      await guardarNoPublicada({ r: v, datos: img.data, ancho: img.info.width, alto: img.info.height, sha, userId: me.id, sinC2 });
      return NextResponse.json({ ok: false, estado: v.d.estado === "rechazada" ? "rechazada" : "revision", id: v.id, mensaje: mensajeSubida(v.d) },
        { status: v.d.estado === "rechazada" ? HTTP_RECHAZADA : HTTP_RETENIDA });
    }
    const id = v.id, clave = sinC2 ? llavePrivada(id) : `n/${id}.jpg`, url = sinC2 ? urlPrivada(id) : urlPublica(clave);
    await guardarObjeto(clave, img.data, "image/jpeg");
    await tx(async (c) => {
      await c.query(
        `insert into media (id, owner_kind, owner_id, url, w, h, uploaded_by, status, sha256, rev_at, rev_capa, private, rev_sin_c2, bytes) values ($1, 'user', $2, $3, $4, $5, $6, 'visible', $7, now(), $8, $10, $10, $9)`,
        [id, me.id, url, img.info.width, img.info.height, me.id, sha, v.d.capa, img.data.length, sinC2]);
      for (const x of veredictosDe(v, { mediaId: id, sha, uploader: me.id })) await anotarVeredicto(c, x);
    });
    if (sinC2) { await guardarVariantesPrivadas(id, img.data, img.info.width); return NextResponse.json({ ok: true, id, url }); }
    await guardarVariantes(id, img.data, img.info.width);
    return NextResponse.json({ ok: true, id, url });
  });
}
