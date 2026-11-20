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
/* 20 nov · El tope de las rutas de fotos (12 MB, el mismo del servidor). Si la foto, ya reducida, pasa del tope (no se pudo achicar), se avisa
   aquí sin subirla: el servidor también la rechaza (413), pero así el aviso no depende de cómo el navegador manda el archivo. */
export const TOPE_FOTO = 12 * 1024 * 1024;
const PESADA: Subida = { ok: false, mensaje: { es: "La foto pesa demasiado (máximo 12 MB).", en: "The photo is too large (12 MB max)." } };
async function lista(file: File): Promise<Blob | null> { const b = await reducir(file); return b.size > TOPE_FOTO ? null : b; }
/* Fotos privadas (ayuda de Salud y Pro): nunca públicas; se ven por /api/ayuda/foto/{id} con permiso. */
export async function subirFotoPrivada(file: File): Promise<Subida> {
  const f = await lista(file); if (!f) return PESADA;
  const fd = new FormData(); fd.append("foto", f, "foto.jpg");
  return ((await fetch("/api/ayuda/foto", { method: "POST", body: fd }).then((x) => x.json()).catch(() => null)) as Subida | null) ?? { ok: false };
}
/* 9n · La foto de la entrega (privada; solo el repartidor asignado a un delivery activo): /api/repartidor/foto?numero=… devuelve el id. */
export async function subirFotoEntrega(numero: string, file: File): Promise<Subida> {
  const f = await lista(file); if (!f) return PESADA;
  const fd = new FormData(); fd.append("foto", f, "foto.jpg");
  return ((await fetch(`/api/repartidor/foto?numero=${encodeURIComponent(numero)}`, { method: "POST", body: fd }).then((x) => x.json()).catch(() => null)) as Subida | null) ?? { ok: false };
}
export async function subirFoto(file: File): Promise<Subida> {
  const f = await lista(file); if (!f) return PESADA;
  const fd = new FormData(); fd.append("foto", f, "foto.jpg");
  return ((await fetch("/api/medios", { method: "POST", body: fd }).then((x) => x.json()).catch(() => null)) as Subida | null) ?? { ok: false };
}
/* 9t · La foto de un mensaje (Mensajes cliente ↔ negocio; privada, la revisa el modelo propio al subirla): /api/mensajes/foto devuelve el id que
   se manda con el mensaje y la dirección privada para verla antes de enviarla. revision = el modelo la marcó o no respondió (la otra parte la ve
   cuando una persona de To'Latino la revise). para "dm" = Mensajes entre vecinos (Comunidad): la misma ruta, la guarda como foto de esa conversación. */
export async function subirFotoMensaje(file: File, para: "chat" | "dm" = "chat"): Promise<Subida & { revision?: boolean }> {
  const f = await lista(file); if (!f) return PESADA;
  const fd = new FormData(); fd.append("foto", f, "foto.jpg");
  if (para === "dm") fd.append("para", "dm");
  return ((await fetch("/api/mensajes/foto", { method: "POST", body: fd }).then((x) => x.json()).catch(() => null)) as (Subida & { revision?: boolean }) | null) ?? { ok: false };
}
