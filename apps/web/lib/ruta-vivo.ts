import "server-only";
import { Client } from "pg";

/* 8e · La ruta en vivo sin servicio nuevo (el mismo patrón que lib/puerta-vivo.ts): UNA conexión por proceso hace LISTEN 'ruta' (el trigger de
   delivery_positions y el de operations hacen NOTIFY con el id de la entrega) y reparte a los SSE abiertos de esa entrega (/api/ruta/vivo). Si la
   conexión se cae, se vuelve a conectar sola; mientras tanto las pantallas preguntan cada 10 s (respaldo del cliente). */
type Cb = () => void;
const subs = new Map<string, Set<Cb>>();
let cliente: Client | null = null, conectando: Promise<void> | null = null, espera = 1000;

async function conectar(): Promise<void> {
  if (cliente || conectando) return conectando ?? undefined;
  conectando = (async () => {
    try {
      const c = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
      c.on("notification", (m) => { if (m.channel !== "ruta" || !m.payload || !/^\d{1,18}$/.test(m.payload)) return; for (const f of subs.get(m.payload) ?? []) { try { f(); } catch { /* una pantalla cerrada no rompe a las demás */ } } });
      const caer = () => { if (cliente !== c) return; cliente = null; c.end().catch(() => undefined); if (subs.size) setTimeout(() => void conectar(), espera = Math.min(espera * 2, 30000)); };
      c.on("error", caer); c.on("end", caer);
      await c.connect();
      await c.query("listen ruta");
      cliente = c; espera = 1000;
    } catch {
      setTimeout(() => void conectar(), espera = Math.min(espera * 2, 30000));
    } finally { conectando = null; }
  })();
  return conectando;
}

/* Escuchar los cambios de una entrega; devuelve cómo dejar de escuchar. */
export function escucharRuta(op: string, cb: Cb): () => void {
  let s = subs.get(op);
  if (!s) subs.set(op, (s = new Set()));
  s.add(cb);
  void conectar();
  return () => { const x = subs.get(op); if (!x) return; x.delete(cb); if (!x.size) subs.delete(op); };
}
