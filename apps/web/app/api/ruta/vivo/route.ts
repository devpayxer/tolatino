import { yo } from "@/lib/cuenta";
import { accesoPanel } from "@/lib/panel";
import { idEntrega, rutaCliente, rutaNegocio } from "@/lib/ruta";
import { escucharRuta } from "@/lib/ruta-vivo";

/* 8e · GET /api/ruta/vivo — el mapa en vivo de UNA entrega (SSE), como /api/puerta/vivo. Lo dispara el NOTIFY 'ruta' (cada posición nueva y al
   terminar). Solo dos formas de mirar (el Super Admin ve el recorrido aparte, con motivo):
   - ?pedido=N: el cliente de ESE pedido, desde «Recogí» y solo la última posición.
   - ?negocio=ID&pedido=N: un miembro del negocio de ese pedido con «Hoy y pedidos», desde que empieza, con el rastro.
   Cualquier otra persona, otro negocio, una entrega sin ruta o el cliente antes de «Recogí»: 404, igual para todos (no dice si existe).
   Cada cambio vuelve a revisar el acceso; al terminar la entrega manda «fin» y cierra. Respaldo del cliente: si se cae, pregunta cada 10 s. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const NO = () => new Response("", { status: 404, headers: { "cache-control": "no-store" } });

export async function GET(req: Request) {
  const u = await yo();
  if (!u) return NO();
  const q = new URL(req.url).searchParams, pedido = q.get("pedido") ?? "", negocio = q.get("negocio");
  if (!/^\d{1,12}$/.test(pedido)) return NO();
  const ver = negocio
    ? async () => ((await accesoPanel(negocio, "ord")) ? rutaNegocio(negocio, pedido) : null)
    : async () => rutaCliente(u.id, pedido);
  const v0 = await ver().catch(() => null);
  const op = v0 ? await idEntrega(pedido) : null;
  if (!v0 || !op) return NO();
  const enc = new TextEncoder();
  let parar = () => {}, latido: ReturnType<typeof setInterval> | null = null, t: ReturnType<typeof setTimeout> | null = null, cerrado = false;
  const stream = new ReadableStream({
    async start(ctl) {
      const mandar = (ev: string, data: unknown) => { if (!cerrado) try { ctl.enqueue(enc.encode(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`)); } catch { cerrado = true; } };
      const fin = () => { if (cerrado) return; cerrado = true; parar(); if (latido) clearInterval(latido); if (t) clearTimeout(t); try { ctl.close(); } catch { /* ya cerrado */ } };
      const enviar = async (v: Awaited<ReturnType<typeof ver>>) => {
        if (!v) { mandar("fin", {}); fin(); return; } // perdió el acceso: se corta igual que al terminar
        if (v.estado === "fin") { mandar("fin", {}); fin(); return; }
        mandar("pos", v);
      };
      await enviar(v0);
      // Varias posiciones seguidas = un solo envío (300 ms).
      parar = escucharRuta(op, () => { if (!t && !cerrado) t = setTimeout(() => { t = null; void ver().catch(() => null).then(enviar); }, 300); });
      latido = setInterval(() => { if (!cerrado) try { ctl.enqueue(enc.encode(": ping\n\n")); } catch { fin(); } }, 20000);
      req.signal.addEventListener("abort", fin);
    },
    cancel() { cerrado = true; parar(); if (latido) clearInterval(latido); if (t) clearTimeout(t); },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", "x-accel-buffering": "no", connection: "keep-alive" } });
}
