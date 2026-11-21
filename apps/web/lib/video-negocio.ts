import { createHash } from "node:crypto";
import { mkdtemp, open, readdir, rm, stat, type FileHandle } from "node:fs/promises";
import type { IncomingMessage } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { db } from "@/lib/db";
import { enviarArchivo, textoConTope } from "@/lib/medios";
import { renovarCupo, soltarCupo, tomarCupo } from "@/lib/topes";

/* C-001 · Video de presentación del negocio (Pro). Lo sube el negocio (archivo, no enlace) desde Panel › Tu página › Fotos; el servicio
   propio services/video (ffmpeg, en la red interna) lo deja en `video_max_s` segundos como mucho, 720p, sin metadatos, y saca la portada.
   Entra a la cola «Medios» del Super Admin y SOLO se ve aprobado y mientras el negocio es Pro y está activo: en la tarjeta de resultados
   (solo la del centro se mueve) y en la portada de su página. Nada se borra: cada video queda con su estado. Guardián videoSoloAprobado. */

export type VideoVivo = { src: string; poster: string };
type Bi = { es: string; en: string };

const URL_VIDEO = () => (process.env.VIDEO_URL || "").replace(/\/+$/, "");
export const videoListo = () => !!URL_VIDEO();

export type Procesado =
  | { ok: true; segundos: number; ancho: number | null; alto: number | null; mp4: { ruta: string; bytes: number; sha256: string }; portada: Buffer }
  | { ok: false; error: "no_es_video" | "muy_grande" | "fallo" | "sin_servicio" };

/* 9t · Medios en flujo. El video ya está en el DISCO (lib/subida.ts recibirArchivo) → al servicio propio por partes, con su content-length (el
   servicio lo escribe a su carpeta temporal por partes: ffprobe/ffmpeg necesitan el archivo entero y buscable —un MOV del iPhone lleva el índice
   al final—, así que el disco es el lugar natural y la memoria nunca lo tiene entero). La respuesta (binaria, «application/x-tolatino-video»):
   la portada (chica, a memoria) y después el MP4, que va por partes a `dir/salida.mp4` calculando su sha256 al pasar (lo firma el PUT al
   almacén sin otra lectura). Antes iba y volvía entero y en base64 dentro de un JSON: ~610 MB de memoria de la app por video de 120 MB.
   Un servicio que conteste otra cosa (el de antes, con base64) es un fallo: nunca se lee una respuesta grande a memoria. Nunca se guarda el
   original. Guardián mediosEnFlujo. */
const MAX_PORTADA = 4 * 1024 * 1024, MAX_SALIDA = 200 * 1024 * 1024, MAX_JSON = 64 * 1024;
export async function procesarVideo(entrada: { ruta: string; bytes: number }, maxS: number, dir: string): Promise<Procesado> {
  const base = URL_VIDEO();
  if (!base) return { ok: false, error: "sin_servicio" };
  let fh: FileHandle | null = null, r: IncomingMessage | null = null;
  try {
    r = await enviarArchivo(`${base}/procesar?max=${Math.max(10, Math.min(60, Math.round(maxS)))}`, {
      metodo: "POST", ruta: entrada.ruta, bytes: entrada.bytes, ms: 170_000,
      headers: { "content-type": "application/octet-stream", accept: "application/x-tolatino-video" },
    });
    const cab = (k: string) => { const v = r!.headers[k]; return Array.isArray(v) ? v[0] ?? "" : v ?? ""; };
    if (r.statusCode !== 200 || !/^application\/x-tolatino-video\b/.test(cab("content-type"))) {
      // Un error del servicio es un JSON chico; se lee con tope (nunca una respuesta grande a memoria).
      let j: { ok?: boolean; error?: string } = {};
      try { j = JSON.parse(await textoConTope(r, MAX_JSON)) as typeof j; } catch { /* no es JSON */ }
      if (j.ok) console.warn("[video] el servicio contestó en el formato de antes (base64): ¿falta reconstruir services/video?");
      return { ok: false, error: j.error === "no_es_video" || j.error === "muy_grande" ? j.error : "fallo" };
    }
    const num = (k: string) => { const v = Number(cab(k)); return Number.isFinite(v) && v > 0 ? v : null; };
    const segundos = num("x-segundos") ?? 0, nP = num("x-portada-bytes") ?? 0;
    if (!(segundos > 0) || !(nP > 0) || nP > MAX_PORTADA) return { ok: false, error: "fallo" };
    const portada = Buffer.alloc(nP), sha = createHash("sha256"), ruta = join(dir, "salida.mp4");
    fh = await open(ruta, "w", 0o600);
    let p = 0, bytes = 0;
    for await (const t of r) {
      let c = t as Buffer;
      if (p < nP) { const k = Math.min(nP - p, c.length); c.copy(portada, p, 0, k); p += k; c = c.subarray(k); }
      if (!c.length) continue;
      if (bytes + c.length > MAX_SALIDA) return { ok: false, error: "fallo" };
      sha.update(c);
      await fh.write(c);
      bytes += c.length;
    }
    if (p < nP || bytes === 0 || !r.complete) return { ok: false, error: "fallo" };
    return { ok: true, segundos, ancho: num("x-ancho"), alto: num("x-alto"), mp4: { ruta, bytes, sha256: sha.digest("hex") }, portada };
  } catch {
    return { ok: false, error: "sin_servicio" };
  } finally {
    r?.destroy();
    await fh?.close().catch(() => undefined);
  }
}


/* 9t · Medios en flujo · Cuántos videos se reciben y procesan A LA VEZ. El servicio de video (1 CPU, 1 GB) corre un ffmpeg por video y cada
   subida ocupa disco (hasta 120 MB de entrada y la salida) y una conexión larga: sin cupo, unas cuantas subidas juntas lo ahogan a él y a la
   máquina. Dos topes: por proceso (VIDEO_A_LA_VEZ_PROCESO, en memoria: protege a ESTE proceso aunque la base no responda) y entre todos los
   procesos (VIDEO_A_LA_VEZ, lib/topes.ts tomarCupo: compartido en rate_counters; el turno vence solo si el proceso se cae). El turno se toma
   ANTES de leer el cuerpo: quien llega con el cupo lleno lo sabe al instante (503 + Retry-After, «prueba en un momento»), no después de subir
   120 MB. Devuelve con qué soltarlo (una vez, en el finally de quien llama) o null si no hay lugar. */
export const VIDEO_A_LA_VEZ = 3, VIDEO_A_LA_VEZ_PROCESO = 2, VIDEO_TURNO_S = 90;
let enEsteProceso = 0;
export async function turnoVideo(): Promise<(() => Promise<void>) | null> {
  if (enEsteProceso >= VIDEO_A_LA_VEZ_PROCESO) return null;
  enEsteProceso++;
  const ficha = await tomarCupo("video_cupo", VIDEO_A_LA_VEZ, VIDEO_TURNO_S).catch(() => null);
  if (!ficha) { enEsteProceso--; return null; }
  // Mientras se sube y se procesa (puede pasar de los 90 s), el turno se renueva cada 30 s.
  const reloj = setInterval(() => { void renovarCupo("video_cupo", ficha, VIDEO_TURNO_S); }, (VIDEO_TURNO_S / 3) * 1000);
  reloj.unref?.();
  let suelto = false;
  return async () => {
    if (suelto) return;
    suelto = true;
    clearInterval(reloj);
    enEsteProceso--;
    await soltarCupo("video_cupo", ficha);
  };
}

/* 9t · La carpeta temporal de UNA subida (entrada y salida del video). Quien la pide la borra en su finally (pase lo que pase). Si un proceso se
   cayó a mitad, su carpeta queda: cada carpeta nueva barre antes las de más de una hora (los videos de nadie no se acumulan en el disco). */
const PREFIJO_TMP = "tl-video-";
export async function carpetaVideo(): Promise<string> {
  const raiz = tmpdir();
  try {
    const hace1h = Date.now() - 3_600_000;
    for (const d of await readdir(raiz)) {
      if (!d.startsWith(PREFIJO_TMP)) continue;
      const s = await stat(join(raiz, d)).catch(() => null);
      if (s && s.mtimeMs < hace1h) await rm(join(raiz, d), { recursive: true, force: true }).catch(() => undefined);
    }
  } catch { /* sin permiso para listar: sigue */ }
  return mkdtemp(join(raiz, PREFIJO_TMP));
}
export async function borrarCarpetaVideo(dir: string): Promise<void> {
  if (!dir.includes(PREFIJO_TMP)) return;
  await rm(dir, { recursive: true, force: true }).catch(() => undefined);
}

/* Lo que se ve en público: el video APROBADO de cada negocio Pro activo (una consulta para toda la lista; sin N+1). */
export async function videosVivos(ids: string[]): Promise<Map<string, VideoVivo>> {
  const m = new Map<string, VideoVivo>();
  const L = [...new Set(ids.filter((x) => typeof x === "string" && x))].slice(0, 500);
  if (!L.length) return m;
  const r = await db().query<{ id: string; src: string; poster: string }>(
    `select v.business_id as id, v.url as src, v.poster_url as poster
       from business_videos v
       join businesses b on b.id = v.business_id and b.status = 'active'
       join business_stats_cache s on s.business_id = v.business_id and s.plan = 'pro'
      where v.business_id = any($1::text[]) and v.status = 'aprobado'`, [L]).catch(() => ({ rows: [] as { id: string; src: string; poster: string }[] }));
  for (const x of r.rows) m.set(x.id, { src: x.src, poster: x.poster });
  return m;
}

/* Panel › Tu página › Fotos: el aprobado que sale hoy, el que está en revisión y el último no aprobado (con su motivo). */
export type VideoPanel = {
  aprobado: { src: string; poster: string; segundos: number } | null;
  revision: { src: string; poster: string; segundos: number; desde: string } | null;
  rechazado: { motivo: string; cuando: string } | null;
};
export async function videoPanel(negocio: string): Promise<VideoPanel> {
  const r = await db().query<{ status: string; url: string; poster_url: string; seconds: number; reject_reason: string | null; created_at: string; reviewed_at: string | null }>(
    `select status, url, poster_url, seconds, reject_reason, created_at::text, reviewed_at::text from business_videos
      where business_id = $1 and (status in ('aprobado', 'revision') or (status = 'rechazado' and reviewed_at > now() - interval '30 days'))
      order by business_videos.created_at desc limit 10`, [negocio]).catch(() => ({ rows: [] as never[] }));
  const ap = r.rows.find((x) => x.status === "aprobado"), rv = r.rows.find((x) => x.status === "revision");
  // El no aprobado solo cuenta si es más nuevo que lo que hay (si después subió otro, ese manda).
  const rc = r.rows.find((x) => x.status === "rechazado");
  const masNuevo = rc && !r.rows.some((x) => (x.status === "aprobado" || x.status === "revision") && x.created_at > rc.created_at);
  return {
    aprobado: ap ? { src: ap.url, poster: ap.poster_url, segundos: Number(ap.seconds) } : null,
    revision: rv ? { src: rv.url, poster: rv.poster_url, segundos: Number(rv.seconds), desde: rv.created_at } : null,
    rechazado: rc && masNuevo ? { motivo: rc.reject_reason ?? "", cuando: rc.reviewed_at ?? rc.created_at } : null,
  };
}

/* Super Admin · Colas · Medios: el caso de un video. */
export async function casoVideo(id: string) {
  if (!/^\d{1,18}$/.test(id)) return null;
  return (await db().query<{ id: string; negocio: string; nombre: string; src: string; poster: string; segundos: number; status: string; subido: string; plan: string }>(
    `select v.id::text, v.business_id as negocio, b.name as nombre, v.url as src, v.poster_url as poster, v.seconds as segundos, v.status, v.created_at::text as subido,
            coalesce(s.plan, 'free') as plan
       from business_videos v join businesses b on b.id = v.business_id left join business_stats_cache s on s.business_id = v.business_id
      where v.id = $1::bigint`, [id])).rows[0] ?? null;
}

/* Motivos para no aprobar un video (propios del video; el equipo puede escribir otro). */
export const MOTIVOS_VIDEO: Bi[] = [
  { es: "No se ve tu negocio ni tu trabajo.", en: "It doesn’t show your business or your work." },
  { es: "Tiene música de otros artistas.", en: "It has music by other artists." },
  { es: "Se ve mal: borroso, oscuro o de lado.", en: "It looks bad: blurry, dark or sideways." },
  { es: "Tiene contenido que no se permite en To'Latino.", en: "It has content that isn’t allowed on To'Latino." },
  { es: "Tiene teléfonos, precios o enlaces escritos encima.", en: "It has phone numbers, prices or links written on it." },
];
