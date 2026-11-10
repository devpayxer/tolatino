import "server-only";
import { Client } from "pg";

/* 6g · En vivo en la puerta sin servicio nuevo (fase6-eventos.md §3): UNA conexión por proceso hace LISTEN 'puerta' (el trigger de
   ticket_scans hace NOTIFY con el id de la fecha) y reparte a los SSE abiertos de esa fecha (/api/puerta/vivo). Si la conexión se
   cae, se vuelve a conectar sola; mientras tanto las pantallas preguntan cada 5 s (respaldo del cliente). */
type Cb = () => void;
const subs = new Map<string, Set<Cb>>();
let cliente: Client | null = null, conectando: Promise<void> | null = null, espera = 1000;

async function conectar(): Promise<void> {
  if (cliente || conectando) return conectando ?? undefined;
  conectando = (async () => {
    try {
      const c = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
      c.on("notification", (m) => { if (m.channel !== "puerta" || !m.payload || !/^\d{1,18}$/.test(m.payload)) return; for (const f of subs.get(m.payload) ?? []) { try { f(); } catch { /* una pantalla cerrada no rompe a las demás */ } } });
      const caer = () => { if (cliente !== c) return; cliente = null; c.end().catch(() => undefined); if (subs.size) setTimeout(() => void conectar(), espera = Math.min(espera * 2, 30000)); };
      c.on("error", caer); c.on("end", caer);
      await c.connect();
      await c.query("listen puerta");
      cliente = c; espera = 1000;
    } catch {
      setTimeout(() => void conectar(), espera = Math.min(espera * 2, 30000));
    } finally { conectando = null; }
  })();
  return conectando;
}

/* Escuchar los cambios de una fecha; devuelve cómo dejar de escuchar. */
export function escuchar(fecha: string, cb: Cb): () => void {
  let s = subs.get(fecha);
  if (!s) subs.set(fecha, (s = new Set()));
  s.add(cb);
  void conectar();
  return () => { const x = subs.get(fecha); if (!x) return; x.delete(cb); if (!x.size) subs.delete(fecha); };
}
