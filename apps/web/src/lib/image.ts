// Client-side image pipeline — resize + re-encode to WebP + strip EXIF, all in
// the browser BEFORE upload. A phone photo (4–12 MB) becomes ~150–350 KB, so we
// never pay bandwidth/storage for the original. Zero dependencies (Canvas API).
//
// Re-drawing through a <canvas> drops all EXIF metadata automatically — smaller
// files AND privacy (phone photos embed GPS). We honour the EXIF orientation
// flag first (via createImageBitmap) so portrait shots don't upload sideways.

import { supabase } from '@/lib/supabase';

const BUCKET = 'post-photos';

/** Max long-edge in px per use. Feeds never need more than ~1600. */
export const IMAGE_MAX_EDGE = 1600;
export const AVATAR_MAX_EDGE = 400;

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
export async function compressImage(file: File, maxEdge = IMAGE_MAX_EDGE, quality = 0.82): Promise<Blob> {
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

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close?.();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const encode = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, quality));
  const webp = await encode('image/webp');
  if (webp && webp.type === 'image/webp') return webp;
  const jpeg = await encode('image/jpeg');
  return jpeg ?? file;
}

const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

/**
 * Compress each file and upload to Supabase Storage under the user's own folder
 * (`<uid>/<uuid>.webp` — enforced by the storage RLS policy). Returns the public
 * URLs to store on the post. Throws on the first upload error.
 */
export async function uploadPostImages(files: File[], userId: string): Promise<string[]> {
  if (!supabase || files.length === 0) return [];
  const urls: string[] = [];
  for (const file of files) {
    const blob = await compressImage(file);
    const path = `${userId}/${uuid()}.${EXT[blob.type] ?? 'jpg'}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type,
      cacheControl: '31536000', // 1 year — files are content-addressed by uuid
      upsert: false,
    });
    if (error) throw error;
    urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return urls;
}
