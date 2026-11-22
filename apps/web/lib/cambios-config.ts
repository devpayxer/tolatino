import "server-only";
import { Client } from "pg";

/* 9b-3 · Configuración e interruptores al instante en TODOS los procesos (LAUNCH L699). Cada proceso guarda una copia de 15 s de
   platform_config, config_keys y feature_flags (lib/config.ts y los interruptores de cada módulo); la base avisa de cada cambio por NOTIFY
   (canal tl_config, disparadores de 0133) y aquí cada proceso olvida su copia al momento. La copia de 15 s queda de respaldo: si la escucha se
   corta, se vuelve a conectar (cada 5 s) y mientras tanto el valor tarda lo mismo que antes.
   - Una sola conexión por proceso, aparte del pool (LISTEN necesita una conexión fija). Nunca durante el build (no deja al build esperando).
   - Solo olvida: no lee el contenido del aviso (el nombre de la tabla) para decidir nada.
   9i · También el canal «ciudades» (0139: cities, zones y city_beta_invites): abrir, cerrar o pasar una ciudad a beta, un barrio nuevo o una invitación se
   notan al instante en todos los procesos (L71): lo registrado con alCambiarConfig se olvida con los dos canales.
   22 nov · UNA escucha por proceso de verdad: Next carga este módulo una vez por capa (rutas, páginas, acciones, arranque) y cada copia abría su propia
   conexión LISTEN (eran tres por proceso). El estado vive en globalThis (como lib/dos-idiomas.ts): la primera capa abre la conexión y las demás registran
   ahí lo que olvidan; un aviso olvida lo de todas. Lo registra solo lib/cache-aviso.ts (cacheConAviso, con la generación que cierra la carrera de una
   lectura en vuelo). Sistema › Salud muestra si la escucha está viva, desde cuándo y el último aviso (estadoEscucha). */
type Cb = () => void;
type Estado = {
  olvidar: Set<Cb>; cliente: Client | null; conectando: boolean; reintento: ReturnType<typeof setTimeout> | null;
  desde: number | null; ultimoAviso: number | null; avisos: number; caidas: number; ultimaCaida: number | null;
};
const G = globalThis as typeof globalThis & { __tlCambiosConfig?: Estado };
const E: Estado = (G.__tlCambiosConfig ??= { olvidar: new Set(), cliente: null, conectando: false, reintento: null, desde: null, ultimoAviso: null, avisos: 0, caidas: 0, ultimaCaida: null });

function avisar() { for (const f of E.olvidar) { try { f(); } catch { /* una copia que no se pudo olvidar vence sola a los 15 s */ } } }

function escuchar() {
  if (E.cliente || E.conectando || E.reintento || !process.env.DATABASE_URL || process.env.NEXT_PHASE === "phase-production-build") return;
  E.conectando = true;
  const c = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000, keepAlive: true });
  let cayo = false;
  const caer = () => {
    if (cayo) return;
    cayo = true;
    if (E.cliente === c) { E.cliente = null; E.desde = null; E.caidas++; E.ultimaCaida = Date.now(); }
    c.removeAllListeners("notification");
    c.end().catch(() => undefined);
    avisar(); // lo que cambió mientras no se escuchaba
    E.reintento ??= setTimeout(() => { E.reintento = null; escuchar(); }, 5000);
    E.reintento.unref?.();
  };
  c.on("error", caer);
  c.on("end", caer);
  c.on("notification", (m) => { if (m.channel === "tl_config" || m.channel === "ciudades") { E.ultimoAviso = Date.now(); E.avisos++; avisar(); } });
  c.connect()
    .then(() => c.query("listen tl_config; listen ciudades"))
    .then(() => {
      E.cliente = c; E.desde = Date.now();
      // La conexión no retiene al proceso al apagarse.
      (c as unknown as { connection?: { stream?: { unref?: () => void } } }).connection?.stream?.unref?.();
      avisar(); // lo que cambió antes de escuchar
    })
    .catch(caer)
    .finally(() => { E.conectando = false; });
}

/* Quien guarda una copia la registra aquí; se olvida en cuanto cambia algo en la base. Solo lo llama lib/cache-aviso.ts. */
export function alCambiarConfig(f: Cb): void {
  E.olvidar.add(f);
  escuchar();
}
/* ¿Se está escuchando? */
export const escuchandoConfig = () => E.cliente != null;
/* Super Admin › Sistema › Salud: la escucha de ESTE proceso (la pide si todavía nadie la pidió). */
export type EstadoEscucha = { viva: boolean; desde: string | null; ultimoAviso: string | null; avisos: number; caidas: number; ultimaCaida: string | null; copias: number };
export function estadoEscucha(): EstadoEscucha {
  escuchar();
  const iso = (t: number | null) => (t == null ? null : new Date(t).toISOString());
  return { viva: E.cliente != null, desde: iso(E.desde), ultimoAviso: iso(E.ultimoAviso), avisos: E.avisos, caidas: E.caidas, ultimaCaida: iso(E.ultimaCaida), copias: E.olvidar.size };
}
