import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { mismoOrigen } from "@/lib/cuenta";
import { db, tx } from "@/lib/db";
import { valor } from "@/lib/config";
import { guardarObjeto, mediosListos, urlPublica } from "@/lib/medios";
import { leerFormulario } from "@/lib/subida";
import { accesoPanel } from "@/lib/panel";
import { procesarVideo, videoListo } from "@/lib/video-negocio";

/* C-001 · Subir el video de presentación (Panel › Tu página › Fotos · «Video de presentación · Pro»). Solo un miembro con acceso a «Tu
   página» de un negocio Pro, desde el mismo sitio. El servidor decide todo: el servicio propio (ffmpeg) lo recorta a video_max_s segundos,
   lo deja en 720p sin metadatos y saca la portada; si no es un video, no entra. Queda EN REVISIÓN (cola «Medios» del Super Admin): el que
   ya estaba aprobado sigue en la página hasta que este se apruebe. El original nunca se guarda. Hasta 120 MB (nginx abre solo esta ruta). */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;
const MAX = 120 * 1024 * 1024;
const err = (status: number, es: string, en: string) => NextResponse.json({ ok: false, mensaje: { es, en } }, { status });

export async function POST(req: NextRequest) {
  if (!(await mismoOrigen())) return err(403, "No permitido.", "Not allowed.");
  const negocio = req.nextUrl.searchParams.get("negocio") ?? "";
  const a = await accesoPanel(negocio, "page");
  if (!a) return err(403, "No tienes acceso a esta parte del panel.", "You don’t have access to this part of the dashboard.");
  const plan = (await db().query<{ plan: string }>(`select plan from business_stats_cache where business_id = $1`, [a.negocio.id])).rows[0]?.plan ?? "free";
  if (plan !== "pro") return err(403, "El video de presentación es de Pro.", "The intro video is a Pro feature.");
  if (!mediosListos() || !videoListo()) return err(503, "Subir videos no está disponible en este momento. Prueba en un rato.", "Video upload isn’t available right now. Try again later.");
  if (Number(req.headers.get("content-length") ?? 0) > MAX + 64 * 1024) return err(413, "El video pesa demasiado (máximo 120 MB).", "The video is too large (120 MB max).");
  // Tope: 10 videos por negocio al día (el servicio de video es caro de correr).
  const n = (await db().query<{ n: number }>(`select count(*)::int as n from business_videos where business_id = $1 and created_at > now() - interval '1 day'`, [a.negocio.id])).rows[0]?.n ?? 0;
  if (n >= 10) return err(429, "Subiste muchos videos hoy. Prueba mañana.", "You uploaded many videos today. Try again tomorrow.");
  const lf = await leerFormulario(req, MAX + 64 * 1024);
  if (!lf.ok && lf.grande) return err(413, "El video pesa demasiado (máximo 120 MB).", "The video is too large (120 MB max).");
  const form = lf.ok ? lf.fd : null;
  const f = form?.get("video");
  if (f instanceof File && f.size > MAX) return err(413, "El video pesa demasiado (máximo 120 MB).", "The video is too large (120 MB max).");
  if (!(f instanceof File) || f.size === 0) return err(400, "No llegó el video.", "The video did not arrive.");
  const p = await procesarVideo(Buffer.from(await f.arrayBuffer()), await valor("video_max_s"));
  if (!p.ok) {
    if (p.error === "no_es_video") return err(415, "Eso no parece un video. Prueba con otro.", "That doesn’t look like a video. Try another one.");
    if (p.error === "muy_grande") return err(413, "El video pesa demasiado (máximo 120 MB).", "The video is too large (120 MB max).");
    return err(503, "No pudimos procesar el video. Prueba otra vez en un rato.", "We couldn’t process the video. Try again in a while.");
  }
  // La portada pasa por sharp como cualquier foto (JPEG limpio, sin metadatos, 1280 px como mucho).
  const portada = await sharp(p.portada).rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  const id = randomUUID(), cv = `v/${id}.mp4`, cp = `v/${id}.jpg`;
  await guardarObjeto(cv, p.mp4, "video/mp4");
  await guardarObjeto(cp, portada, "image/jpeg");
  const fila = await tx(async (c) => {
    // El que estaba en revisión queda reemplazado por este (uno en revisión a la vez); su caso en la cola se cierra solo.
    const viejos = (await c.query<{ id: string }>(`update business_videos set status = 'reemplazado', ended_at = now() where business_id = $1 and status = 'revision' returning id::text`, [a.negocio.id])).rows;
    for (const v of viejos) {
      await c.query(`update queue_items set status = 'decided', decision = 'reemplazado', reason = 'El negocio subió otro video.', decided_at = now() where queue = 'medios' and subject_kind = 'business_video' and subject_id = $1 and status = 'open'`, [v.id]);
    }
    const r = (await c.query<{ id: string }>(
      `insert into business_videos (business_id, city_id, url, poster_url, seconds, width, height, bytes, uploaded_by) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id::text`,
      [a.negocio.id, a.negocio.city_id, urlPublica(cv), urlPublica(cp), p.segundos, p.ancho, p.alto, p.mp4.length, a.yo.id])).rows[0]!;
    await c.query(`insert into queue_items (queue, subject_kind, subject_id, business_id, city_id) values ('medios', 'business_video', $1, $2, $3)`, [r.id, a.negocio.id, a.negocio.city_id]);
    await c.query(
      `insert into audit_entries (actor_kind, actor_id, action, target_kind, target_id, city_id, before, after) values ('user', $1, 'negocio.video.subir', 'business', $2, $3, null, $4::jsonb)`,
      [a.yo.id, a.negocio.id, a.negocio.city_id, JSON.stringify({ video: r.id, segundos: p.segundos })]);
    return r;
  });
  return NextResponse.json({ ok: true, id: fila.id, segundos: p.segundos, src: urlPublica(cv), poster: urlPublica(cp) });
}
