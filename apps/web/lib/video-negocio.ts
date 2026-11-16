import { db } from "@/lib/db";

/* C-001 · Video de presentación del negocio (Pro). Lo sube el negocio (archivo, no enlace) desde Panel › Tu página › Fotos; el servicio
   propio services/video (ffmpeg, en la red interna) lo deja en `video_max_s` segundos como mucho, 720p, sin metadatos, y saca la portada.
   Entra a la cola «Medios» del Super Admin y SOLO se ve aprobado y mientras el negocio es Pro y está activo: en la tarjeta de resultados
   (solo la del centro se mueve) y en la portada de su página. Nada se borra: cada video queda con su estado. Guardián videoSoloAprobado. */

export type VideoVivo = { src: string; poster: string };
type Bi = { es: string; en: string };

const URL_VIDEO = () => (process.env.VIDEO_URL || "").replace(/\/+$/, "");
export const videoListo = () => !!URL_VIDEO();

export type Procesado =
  | { ok: true; segundos: number; ancho: number | null; alto: number | null; mp4: Buffer; portada: Buffer }
  | { ok: false; error: "no_es_video" | "muy_grande" | "fallo" | "sin_servicio" };

/* El video tal como lo subió el negocio → el servicio propio lo procesa (hasta 150 s). Nunca se guarda el original. */
export async function procesarVideo(cuerpo: Buffer, maxS: number): Promise<Procesado> {
  const base = URL_VIDEO();
  if (!base) return { ok: false, error: "sin_servicio" };
  try {
    const r = await fetch(`${base}/procesar?max=${Math.max(10, Math.min(60, Math.round(maxS)))}`, {
      method: "POST", body: new Uint8Array(cuerpo), headers: { "content-type": "application/octet-stream" }, signal: AbortSignal.timeout(170_000),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; segundos?: number; ancho?: number; alto?: number; mp4?: string; portada?: string };
    if (!j.ok || !j.mp4 || !j.portada || !(Number(j.segundos) > 0)) {
      const e = j.error === "no_es_video" || j.error === "muy_grande" ? j.error : "fallo";
      return { ok: false, error: e };
    }
    return { ok: true, segundos: Number(j.segundos), ancho: j.ancho ?? null, alto: j.alto ?? null, mp4: Buffer.from(j.mp4, "base64"), portada: Buffer.from(j.portada, "base64") };
  } catch {
    return { ok: false, error: "sin_servicio" };
  }
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
