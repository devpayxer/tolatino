/* En el teléfono: reduce la foto (como el prototipo novUp: lado mayor 1600 px, JPEG) y la sube a /api/medios.
   El servidor la vuelve a abrir, la endereza y le quita los metadatos; aquí solo se ahorra peso. */
export async function reducir(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.round(im.naturalWidth * k), h = Math.round(im.naturalHeight * k);
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h; cv.getContext("2d")!.drawImage(im, 0, 0, w, h);
    return await new Promise<Blob>((ok) => cv.toBlob((b) => ok(b ?? file), "image/jpeg", 0.85));
  } catch { return file; } finally { URL.revokeObjectURL(url); }
}

export type Subida = { ok: boolean; id?: string; url?: string; mensaje?: { es: string; en: string } };
/* Fotos privadas (ayuda de Salud y Pro): nunca públicas; se ven por /api/ayuda/foto/{id} con permiso. */
export async function subirFotoPrivada(file: File): Promise<Subida> {
  const fd = new FormData(); fd.append("foto", await reducir(file), "foto.jpg");
  return ((await fetch("/api/ayuda/foto", { method: "POST", body: fd }).then((x) => x.json()).catch(() => null)) as Subida | null) ?? { ok: false };
}
/* 9n · La foto de la entrega (privada; solo el repartidor asignado a un delivery activo): /api/repartidor/foto?numero=… devuelve el id. */
export async function subirFotoEntrega(numero: string, file: File): Promise<Subida> {
  const fd = new FormData(); fd.append("foto", await reducir(file), "foto.jpg");
  return ((await fetch(`/api/repartidor/foto?numero=${encodeURIComponent(numero)}`, { method: "POST", body: fd }).then((x) => x.json()).catch(() => null)) as Subida | null) ?? { ok: false };
}
export async function subirFoto(file: File): Promise<Subida> {
  const fd = new FormData(); fd.append("foto", await reducir(file), "foto.jpg");
  return ((await fetch("/api/medios", { method: "POST", body: fd }).then((x) => x.json()).catch(() => null)) as Subida | null) ?? { ok: false };
}
