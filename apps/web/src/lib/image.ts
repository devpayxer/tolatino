// Client-side image pipeline — resize + re-encode to WebP + strip EXIF, all in
// the browser BEFORE upload. A phone photo (4–12 MB) becomes ~150–350 KB, so we
// never pay bandwidth/storage for the original. Zero dependencies (Canvas API).
//
// Re-drawing through a <canvas> drops all EXIF metadata automatically — smaller
// files AND privacy (phone photos embed GPS). We honour the EXIF orientation
// flag first (via createImageBitmap) so portrait shots don't upload sideways.

import { supabase } from '@/lib/supabase';
import { CARPETA_RESP, VARIANTES } from '@/lib/img';

const BUCKET = 'post-photos';

/** Max long-edge in px per use. Feeds never need more than ~1600. */
export const IMAGE_MAX_EDGE = 1600;
export const AVATAR_MAX_EDGE = 400;
export const LOGO_MAX_EDGE = 512;

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Fallback for older WebViews without crypto.randomUUID.
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Downscale to `maxEdge` (never upscales) and re-encode to WebP. Falls back to
 * JPEG on the rare browser that can't encode WebP, and to the original file if
 * anything goes wrong — the upload should never be blocked by compression.
 */
export async function compressImage(
  file: File,
  maxEdge = IMAGE_MAX_EDGE,
  quality = 0.82,
  /** `true` recorta al cuadrado por el centro — para avatares, que siempre se
   *  pintan en un círculo: se guarda solo lo que se va a ver. */
  square = false,
): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      return file; // can't decode (e.g. HEIC on some browsers) → upload as-is
    }
  }

  // Zona de la imagen ORIGINAL que se copia (todo, o el cuadrado central).
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = square ? Math.round((bitmap.width - side) / 2) : 0;
  const sy = square ? Math.round((bitmap.height - side) / 2) : 0;
  const sw = square ? side : bitmap.width;
  const sh = square ? side : bitmap.height;

  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close?.();
    return file;
  }
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  bitmap.close?.();

  const encode = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, quality));
  const webp = await encode('image/webp');
  if (webp && webp.type === 'image/webp') return webp;
  const jpeg = await encode('image/jpeg');
  return jpeg ?? file;
}

const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

/**
 * Sube UNA imagen y, al lado, sus copias pequeñas — y devuelve la URL de la
 * grande. `lib/img.ts` deduce las pequeñas de esa misma URL, sin consultar nada.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * LA GARANTÍA QUE SOSTIENE TODO: `r/` significa «las copias EXISTEN»
 * ════════════════════════════════════════════════════════════════════════════
 * `imgUrl()` no pregunta al servidor si el archivo pequeño está: construye su
 * dirección y la pinta. Si faltara, el usuario vería una imagen rota — peor que
 * el problema que vinimos a resolver.
 *
 * Por eso las pequeñas se suben PRIMERO y la grande al final: la carpeta `r/`
 * solo llega a existir cuando ya está todo dentro. Y si una pequeña falla, el
 * archivo se sube a la ruta de siempre (fuera de `r/`), donde `imgUrl()` tira
 * del transformador de Supabase. Se pierde lo gratis, no la imagen.
 */
async function uploadResponsive(
  file: File,
  userId: string,
  maxEdge: number,
  quality = 0.82,
  square = false,
): Promise<string> {
  if (!supabase) throw new Error('storage-not-configured');
  const base = await compressImage(file, maxEdge, quality, square);
  const ext = EXT[base.type] ?? 'jpg';
  const id = uuid();

  const subir = async (path: string, blob: Blob) => {
    const { error } = await supabase!.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type,
      cacheControl: '31536000', // 1 año — el nombre lleva un uuid, nunca cambia
      upsert: false,
    });
    if (error) throw error;
  };

  // Solo tienen sentido las copias MENORES que la grande.
  const tallas = VARIANTES.filter((v) => v < maxEdge);
  try {
    for (const v of tallas) {
      const chico = await compressImage(file, v, quality, square);
      await subir(`${userId}/${CARPETA_RESP}/${id}.${v}.${EXT[chico.type] ?? ext}`, chico);
    }
  } catch {
    // Alguna copia no entró: se sube fuera de `r/` para no prometer lo que no
    // hay. El transformador se encarga, y esta imagen simplemente cuesta.
    await subir(`${userId}/${id}.${ext}`, base);
    return supabase.storage.from(BUCKET).getPublicUrl(`${userId}/${id}.${ext}`).data.publicUrl;
  }

  const path = tallas.length ? `${userId}/${CARPETA_RESP}/${id}.${ext}` : `${userId}/${id}.${ext}`;
  await subir(path, base);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Compress each file and upload to Supabase Storage under the user's own folder
 * (`<uid>/<uuid>.webp` — enforced by the storage RLS policy). Returns the public
 * URLs to store on the post. Throws on the first upload error.
 */
export async function uploadPostImages(files: File[], userId: string): Promise<string[]> {
  if (!supabase || files.length === 0) return [];
  const urls: string[] = [];
  for (const file of files) urls.push(await uploadResponsive(file, userId, IMAGE_MAX_EDGE));
  return urls;
}

/**
 * Compress + upload ONE image (same pipeline, custom max edge — e.g. a business
 * logo at LOGO_MAX_EDGE). Returns the public URL. Throws on upload error.
 */
export async function uploadImage(file: File, userId: string, maxEdge = IMAGE_MAX_EDGE): Promise<string> {
  return uploadResponsive(file, userId, maxEdge);
}

/**
 * Foto de perfil: MISMO pipeline (redimensiona, re-codifica a WebP y quita el
 * EXIF), pero recortada al cuadrado central, porque el avatar siempre se pinta
 * en un círculo. Una foto de teléfono de 6 MB acaba en ~15–30 KB.
 */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  // 400 px de lado: no hay copia más pequeña que valga la pena, así que este
  // sale por la ruta de siempre y `imgUrl()` lo deja en paz.
  return uploadResponsive(file, userId, AVATAR_MAX_EDGE, 0.86, true);
}

/**
 * Borra un archivo que subimos, a partir de su URL pública. Se usa al cambiar o
 * quitar la foto de perfil: sin esto cada cambio dejaría el archivo anterior
 * ocupando sitio para siempre, y nadie volvería a mirarlo.
 *
 * Nunca lanza: si el borrado falla, lo peor que pasa es un archivo huérfano —
 * no puede impedir que el usuario cambie su foto. La política de storage solo
 * permite borrar dentro de la carpeta propia, así que una URL ajena no hace nada.
 */
export async function deleteStoredImage(publicUrl: string | null | undefined): Promise<void> {
  if (!supabase || !publicUrl) return;
  const marker = `/${BUCKET}/`;
  const i = publicUrl.indexOf(marker);
  if (i < 0) return; // no es nuestra: nada que borrar
  const path = decodeURIComponent(publicUrl.slice(i + marker.length).split('?')[0]);
  if (!path) return;
  // Las copias pequeñas se van con la grande: si no, cada cambio de foto
  // dejaría tres huérfanos en vez de uno.
  const m = /^(.*\/r\/[^/]+)\.(webp|jpg|jpeg|png)$/i.exec(path);
  const todos = m ? [path, ...VARIANTES.map((v) => `${m[1]}.${v}.${m[2]}`)] : [path];
  try { await supabase.storage.from(BUCKET).remove(todos); } catch { /* archivo huérfano, no es fatal */ }
}
