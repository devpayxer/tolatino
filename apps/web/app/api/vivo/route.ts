import { yo } from "@/lib/cuenta";
import { escucharMensajes, type AvisoMsj } from "@/lib/mensajes-vivo";
import { accesoPanel } from "@/lib/panel";
import { dentroDelTope } from "@/lib/topes";

/* 9m · GET /api/vivo — Mensajes en vivo (SSE propio, L385, L599). Con sesión, siempre lo de la PROPIA persona (sus conversaciones con negocios y
   con vecinos); con ?negocio=ID, además lo de ese negocio si la persona tiene la parte «Mensajes» de su panel. Cada aviso dice solo de qué
   conversación es («msg» con {k, t, con}: el tipo, el hilo y la otra parte); NUNCA el texto: la pantalla lo trae por su camino de siempre, que
   vuelve a revisar el acceso. Sin sesión o sin acceso al negocio: 404, igual para todos. Latido cada 20 s; a los 30 min se cierra y la pantalla
   se vuelve a conectar (sin quedar abierto para siempre). Tope: 30 conexiones por minuto por persona. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const NO = () => new Response("", { status: 404, headers: { "cache-control": "no-store" } });

export async function GET(req: Request) {
  const u = await yo();
  if (!u) return NO();
  if (!(await dentroDelTope("vivo", u.id, 30))) return new Response("", { status: 429, headers: { "cache-control": "no-store", "retry-after": "20" } });
  const negocio = new URL(req.url).searchParams.get("negocio");
  if (negocio && !(await accesoPanel(negocio, "msg"))) return NO();
  const enc = new TextEncoder();
  let paradas: (() => void)[] = [], latido: ReturnType<typeof setInterval> | null = null, vence: ReturnType<typeof setTimeout> | null = null, cerrado = false;
  const parar = () => { for (const p of paradas) p(); paradas = []; if (latido) clearInterval(latido); if (vence) clearTimeout(vence); };
  const stream = new ReadableStream({
    start(ctl) {
      const fin = () => { if (cerrado) return; cerrado = true; parar(); try { ctl.close(); } catch { /* ya cerrado */ } };
      const mandar = (x: AvisoMsj, para: "yo" | "negocio") => {
        if (cerrado) return;
        // La otra parte de la conversación: para la persona, el negocio (chat) o el otro vecino (dm); para el negocio, la persona.
        const con = x.k === "chat" ? (para === "yo" ? x.b : x.u) : x.a === u.id ? x.b : x.a;
        try { ctl.enqueue(enc.encode(`event: msg\ndata: ${JSON.stringify({ k: x.k, t: x.t, con, para })}\n\n`)); } catch { fin(); }
      };
      paradas.push(escucharMensajes(`u:${u.id}`, (x) => { if (x.k === "dm" || x.u === u.id) mandar(x, "yo"); }));
      if (negocio) paradas.push(escucharMensajes(`b:${negocio}`, (x) => { if (x.k === "chat" && x.b === negocio) mandar(x, "negocio"); }));
      ctl.enqueue(enc.encode(`event: listo\ndata: {}\n\n`));
      latido = setInterval(() => { if (!cerrado) try { ctl.enqueue(enc.encode(": ping\n\n")); } catch { fin(); } }, 20000);
      vence = setTimeout(fin, 30 * 60 * 1000);
      req.signal.addEventListener("abort", fin);
    },
    cancel() { cerrado = true; parar(); },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", "x-accel-buffering": "no", connection: "keep-alive" } });
}
