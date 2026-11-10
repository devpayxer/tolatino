import { yo } from "@/lib/cuenta";
import { accesoPanel } from "@/lib/panel";
import { db } from "@/lib/db";
import { accesoPuerta, resumenFecha } from "@/lib/puerta";
import { escuchar } from "@/lib/puerta-vivo";

/* 6g · GET /api/puerta/vivo — en vivo (SSE) la cabecera de la puerta: adentro, faltan, rechazados, repetidos y aforo. Lo dispara el NOTIFY
   'puerta' del trigger de ticket_scans (sin servicio nuevo). Dos formas de entrar: ?sesion= (la puerta: accesoPuerta en CADA cambio; si
   se pierde el acceso, manda «cerrada» y termina) o ?negocio=&fecha= (el Monitor del panel: miembro con «evt» y la fecha de SU evento).
   Respaldo del cliente: si esto se cae, la pantalla pregunta cada 5 s. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const u = await yo();
  if (!u) return new Response("", { status: 401 });
  const q = new URL(req.url).searchParams, sesion = q.get("sesion"), negocio = q.get("negocio"), fParam = q.get("fecha");
  let fecha: string | null = null, sigue: () => Promise<boolean>;
  if (sesion) {
    const ctx = await accesoPuerta(u.id, sesion);
    if (!ctx) return new Response("", { status: 403 });
    fecha = ctx.fecha;
    sigue = async () => !!(await accesoPuerta(u.id, sesion));
  } else if (negocio && fParam && /^\d{1,18}$/.test(fParam)) {
    const a = await accesoPanel(negocio, "evt");
    if (!a || !(await db().query(`select 1 from event_dates d join events e on e.id = d.event_id where d.id = $1::bigint and e.business_id = $2`, [fParam, a.negocio.id])).rowCount) return new Response("", { status: 403 });
    fecha = fParam;
    sigue = async () => !!(await db().query(`select 1 from business_members m where m.business_id = $1 and m.user_id = $2 and m.status = 'active' and (m.kind = 'owner' or m.panel_access && array['all', 'evt']::text[])`, [a.negocio.id, u.id])).rowCount;
  } else return new Response("", { status: 400 });
  const f = fecha;
  const enc = new TextEncoder();
  let parar = () => {}, latido: ReturnType<typeof setInterval> | null = null, t: ReturnType<typeof setTimeout> | null = null, cerrado = false;
  const stream = new ReadableStream({
    async start(ctl) {
      const mandar = (ev: string, data: unknown) => { if (!cerrado) try { ctl.enqueue(enc.encode(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`)); } catch { cerrado = true; } };
      const fin = () => { if (cerrado) return; cerrado = true; parar(); if (latido) clearInterval(latido); if (t) clearTimeout(t); try { ctl.close(); } catch { /* ya cerrado */ } };
      const enviar = async () => {
        t = null;
        if (!(await sigue().catch(() => false))) { mandar("cerrada", {}); fin(); return; }
        mandar("resumen", await resumenFecha(f));
      };
      mandar("resumen", await resumenFecha(f));
      // Varios escaneos seguidos = un solo envío (250 ms).
      parar = escuchar(f, () => { if (!t && !cerrado) t = setTimeout(() => void enviar(), 250); });
      latido = setInterval(() => { if (!cerrado) try { ctl.enqueue(enc.encode(": ping\n\n")); } catch { fin(); } }, 20000);
      req.signal.addEventListener("abort", fin);
    },
    cancel() { cerrado = true; parar(); if (latido) clearInterval(latido); if (t) clearTimeout(t); },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", "x-accel-buffering": "no", connection: "keep-alive" } });
}
