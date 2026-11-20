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

export type Subida = { ok: boolean; id?: string; url?: string; mensaje?: { es: string; en: string }; estado?: "revision" | "rechazada" };
/* 20 nov · El tope de las rutas de fotos (12 MB, el mismo del servidor). Si la foto, ya reducida, pasa del tope (no se pudo achicar), se avisa
   aquí sin subirla: el servidor también la rechaza (413), pero así el aviso no depende de cómo el navegador manda el archivo. */
export const TOPE_FOTO = 12 * 1024 * 1024;
const PESADA: Subida = { ok: false, mensaje: { es: "La foto pesa demasiado (máximo 12 MB).", en: "The photo is too large (12 MB max)." } };
async function lista(file: File): Promise<Blob | null> { const b = await reducir(file); return b.size > TOPE_FOTO ? null : b; }
/* 20 nov · Una foto que no llega se reintenta UNA vez, con el archivo original (confirmación 44734711575, iPhone SE: el servidor contestó
   «No llegó la foto» a una foto normal recién elegida; en WebKit la foto ya reducida a veces llega vacía o cortada). Solo si no hubo respuesta
   o el servidor dijo 400: lo demás (413, 415, 429, 403…) es una respuesta de verdad y se muestra. Una subida que falló no deja nada guardado. */
type Resp = Subida & { revision?: boolean };
async function mandar(url: string, file: File, extra: Record<string, string> = {}): Promise<Resp> {
  const f = await lista(file); if (!f) return PESADA;
  const una = async (b: Blob): Promise<{ st: number; j: Resp | null }> => {
    const fd = new FormData(); fd.append("foto", b, "foto.jpg");
    for (const [k, v] of Object.entries(extra)) fd.append(k, v);
    const r = await fetch(url, { method: "POST", body: fd }).catch(() => null);
    return { st: r?.status ?? 0, j: r ? ((await r.json().catch(() => null)) as Resp | null) : null };
  };
  let x = await una(f);
  if (x.st === 0 || x.st === 400) x = await una(file.size > 0 && file.size <= TOPE_FOTO ? file : f);
  return x.j ? avisoDeEstado(x.j) : { ok: false };
}
/* AJ (revisión automática de las fotos públicas) · UN solo lugar para lo que no es un fallo: el servidor contesta ok: false con estado «revision»
   (la foto quedó en revisión: es un ESTADO) o «rechazada» (con su motivo). Aquí, para TODAS las pantallas que suben con subirFoto, se avisa a
   app/AvisoFoto.tsx (la hoja con el estado, el motivo y «Pedir revisión») y a la pantalla le queda `mensaje` en una línea corta, para su aviso
   de siempre. La frase completa viaja en la hoja. Sin dirección: la foto no se publicó. */
export const EVENTO_FOTO = "tl:foto-estado";
export type AvisoFotoDetalle = { estado: "revision" | "rechazada"; id: string | null; mensaje: { es: string; en: string } };
const CORTO: Record<"revision" | "rechazada", { es: string; en: string }> = {
  revision: { es: "Tu foto está en revisión.", en: "Your photo is under review." },
  rechazada: { es: "Esta foto no se pudo publicar.", en: "This photo could not be published." },
};
function avisoDeEstado(j: Resp): Resp {
  if ((j.estado !== "revision" && j.estado !== "rechazada") || typeof window === "undefined") return j;
  const detalle: AvisoFotoDetalle = { estado: j.estado, id: typeof j.id === "string" ? j.id : null, mensaje: j.mensaje ?? CORTO[j.estado] };
  window.dispatchEvent(new CustomEvent<AvisoFotoDetalle>(EVENTO_FOTO, { detail: detalle }));
  return { ok: false, estado: j.estado, id: j.id, mensaje: CORTO[j.estado] };
}
/* Fotos privadas (ayuda de Salud y Pro): nunca públicas; se ven por /api/ayuda/foto/{id} con permiso. */
export const subirFotoPrivada = (file: File): Promise<Subida> => mandar("/api/ayuda/foto", file);
/* 9n · La foto de la entrega (privada; solo el repartidor asignado a un delivery activo): /api/repartidor/foto?numero=… devuelve el id. */
export const subirFotoEntrega = (numero: string, file: File): Promise<Subida> => mandar(`/api/repartidor/foto?numero=${encodeURIComponent(numero)}`, file);
/* AJ · destino «privado»: la foto va solo a un negocio o al equipo (solicitud, cita, estimado, viaje, la balanza o el daño de una renta…), no a una
   página pública. El servidor nunca la manda a la segunda opinión (Claude); solo restringe. Ante la duda, privado (guardián fotosRevisionPrivacidad). */
export type DestinoFoto = "publico" | "privado";
export const subirFoto = (file: File, destino: DestinoFoto = "publico"): Promise<Subida> => mandar("/api/medios", file, destino === "privado" ? { destino: "privado" } : {});
/* 9t · La foto de un mensaje (Mensajes cliente ↔ negocio; privada, la revisa el modelo propio al subirla): /api/mensajes/foto devuelve el id que
   se manda con el mensaje y la dirección privada para verla antes de enviarla. revision = el modelo la marcó o no respondió (la otra parte la ve
   cuando una persona de To'Latino la revise). para "dm" = Mensajes entre vecinos (Comunidad): la misma ruta, la guarda como foto de esa conversación. */
export const subirFotoMensaje = (file: File, para: "chat" | "dm" = "chat"): Promise<Resp> => mandar("/api/mensajes/foto", file, para === "dm" ? { para: "dm" } : {});
