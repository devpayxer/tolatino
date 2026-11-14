import "server-only";
import { Client } from "pg";

/* 9m · Mensajes en vivo con SSE propio (L385, L599: sin preguntar cada 5 s; guardián mensajesEnVivo). El mismo patrón que lib/ruta-vivo.ts: UNA
   conexión por proceso hace LISTEN 'mensajes' (los disparadores de chat_messages y dm_messages de 0143 avisan con lo MÍNIMO: de qué conversación y
   de quién es; nunca el texto) y reparte a los SSE abiertos (/api/vivo) de las personas y los negocios de esa conversación. La pantalla trae lo
   nuevo por su camino de siempre (que vuelve a revisar el acceso). Si la conexión se cae, se vuelve a conectar sola; la pantalla, al volver,
   trae lo que se perdió una vez. */
export type AvisoMsj = { k: "chat"; t: string; u: string; b: string } | { k: "dm"; t: string; a: string; b: string };
type Cb = (x: AvisoMsj) => void;
const subs = new Map<string, Set<Cb>>();
let cliente: Client | null = null, conectando: Promise<void> | null = null, espera = 1000;
const ID = /^[0-9a-z-]{1,80}$/;

function leer(p: string | undefined): AvisoMsj | null {
  try {
    const x = JSON.parse(p ?? "") as Record<string, unknown>;
    if (x.k === "chat" && /^\d{1,18}$/.test(String(x.t)) && ID.test(String(x.u)) && ID.test(String(x.b))) return { k: "chat", t: String(x.t), u: String(x.u), b: String(x.b) };
    if (x.k === "dm" && /^\d{1,18}$/.test(String(x.t)) && ID.test(String(x.a)) && ID.test(String(x.b))) return { k: "dm", t: String(x.t), a: String(x.a), b: String(x.b) };
  } catch { /* un aviso roto no se reparte */ }
  return null;
}
function repartir(clave: string, x: AvisoMsj) { for (const f of subs.get(clave) ?? []) { try { f(x); } catch { /* una pantalla cerrada no rompe a las demás */ } } }

async function conectar(): Promise<void> {
  if (cliente || conectando || process.env.NEXT_PHASE === "phase-production-build") return conectando ?? undefined;
  conectando = (async () => {
    try {
      const c = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000, keepAlive: true });
      c.on("notification", (m) => {
        if (m.channel !== "mensajes") return;
        const x = leer(m.payload);
        if (!x) return;
        // A quién le toca: la persona y el negocio de una conversación con un negocio; las dos personas de una conversación entre vecinos.
        if (x.k === "chat") { repartir(`u:${x.u}`, x); repartir(`b:${x.b}`, x); } else { repartir(`u:${x.a}`, x); repartir(`u:${x.b}`, x); }
      });
      const caer = () => { if (cliente !== c) return; cliente = null; c.end().catch(() => undefined); if (subs.size) setTimeout(() => void conectar(), espera = Math.min(espera * 2, 30000)); };
      c.on("error", caer); c.on("end", caer);
      await c.connect();
      await c.query("listen mensajes");
      cliente = c; espera = 1000;
      (c as unknown as { connection?: { stream?: { unref?: () => void } } }).connection?.stream?.unref?.();
    } catch {
      setTimeout(() => void conectar(), espera = Math.min(espera * 2, 30000));
    } finally { conectando = null; }
  })();
  return conectando;
}

/* Escuchar lo de una persona (u:<id>) o de un negocio (b:<id>); devuelve cómo dejar de escuchar. */
export function escucharMensajes(clave: string, cb: Cb): () => void {
  let s = subs.get(clave);
  if (!s) subs.set(clave, (s = new Set()));
  s.add(cb);
  void conectar();
  return () => { const x = subs.get(clave); if (!x) return; x.delete(cb); if (!x.size) subs.delete(clave); };
}
export const escuchandoMensajes = () => cliente != null;
