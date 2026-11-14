import "server-only";
import { Client } from "pg";

/* 9b-3 · Configuración e interruptores al instante en TODOS los procesos (LAUNCH L699). Cada proceso guarda una copia de 15 s de
   platform_config, config_keys y feature_flags (lib/config.ts y los interruptores de cada módulo); la base avisa de cada cambio por NOTIFY
   (canal tl_config, disparadores de 0133) y aquí cada proceso olvida su copia al momento. La copia de 15 s queda de respaldo: si la escucha se
   corta, se vuelve a conectar (cada 5 s) y mientras tanto el valor tarda lo mismo que antes.
   - Una sola conexión por proceso, aparte del pool (LISTEN necesita una conexión fija). Nunca durante el build (no deja al build esperando).
   - Solo olvida: no lee el contenido del aviso (el nombre de la tabla) para decidir nada.
   9i · También el canal «ciudades» (0139: cities, zones y city_beta_invites): abrir, cerrar o pasar una ciudad a beta, un barrio nuevo o una invitación se
   notan al instante en todos los procesos (L71): lo registrado con alCambiarConfig se olvida con los dos canales. */
type Cb = () => void;
const olvidar = new Set<Cb>();
let cliente: Client | null = null, conectando = false, reintento: ReturnType<typeof setTimeout> | null = null;

function avisar() { for (const f of olvidar) { try { f(); } catch { /* una copia que no se pudo olvidar vence sola a los 15 s */ } } }

function escuchar() {
  if (cliente || conectando || reintento || !process.env.DATABASE_URL || process.env.NEXT_PHASE === "phase-production-build") return;
  conectando = true;
  const c = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000, keepAlive: true });
  const caer = () => {
    if (cliente === c) cliente = null;
    c.removeAllListeners("notification");
    c.end().catch(() => undefined);
    avisar(); // lo que cambió mientras no se escuchaba
    reintento ??= setTimeout(() => { reintento = null; escuchar(); }, 5000);
    reintento.unref?.();
  };
  c.on("error", caer);
  c.on("end", caer);
  c.on("notification", (m) => { if (m.channel === "tl_config" || m.channel === "ciudades") avisar(); });
  c.connect()
    .then(() => c.query("listen tl_config; listen ciudades"))
    .then(() => {
      cliente = c;
      // La conexión no retiene al proceso al apagarse.
      (c as unknown as { connection?: { stream?: { unref?: () => void } } }).connection?.stream?.unref?.();
      avisar(); // lo que cambió antes de escuchar
    })
    .catch(caer)
    .finally(() => { conectando = false; });
}

/* Quien guarda una copia la registra aquí; se olvida en cuanto cambia algo en la base. */
export function alCambiarConfig(f: Cb): void {
  olvidar.add(f);
  escuchar();
}
/* ¿Se está escuchando? (Super Admin › Salud). */
export const escuchandoConfig = () => cliente != null;
