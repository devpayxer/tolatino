import "server-only";
import { createHash } from "node:crypto";
import { cacheConAviso, type CacheAviso } from "./cache-aviso";
import type { LlaveAbierta, Proveedor, TipoProveedor } from "./tiendas/llavero";

/* 23 nov · EL ÚNICO LECTOR de las llaves de los proveedores en el servidor (docs/REVISION.md «Cómo llegan las llaves de terceros al servidor»;
   guardián llaveProveedorUnSoloLector). Para cada nombre de la lista (PROVEEDORES de lib/tiendas/llavero.ts, la misma de infra/comun/secretos.json):
   1. la variable del entorno, si existe (el sobre sellado de respaldo; el sandbox, el CI y las pruebas de hoy: nada cambia para ellos);
   2. si no, la del llavero: el sobre se abre en el servidor y el valor queda SOLO en la memoria de este proceso.
   - Una consulta para todas las llaves, al arrancar (instrumentation.ts la espera, 3 s como mucho) y cuando el llavero cambia: store_secrets avisa por
     NOTIFY tl_config (0213) y cacheConAviso olvida y vuelve a leer al momento (releer). Ninguna petición consulta la base por una llave: llaveYa() lee la
     copia del proceso; llave() también, y solo espera la primera carga. De respaldo, la copia vence a los 10 min (si la escucha se cortó).
   - Si la base no responde, se queda lo que había (una llave puesta no desaparece por un corte).
   - El estado vive en globalThis: Next carga el módulo una vez por capa (rutas, páginas, acciones, arranque) y todas comparten la misma copia.
   - NUNCA escribe un valor en un registro, un error, una respuesta ni la auditoría (guardián llaveProveedorSinFuga): lo que sale de aquí hacia una
     pantalla es el origen y la huella (origenes()). */
export type NombreLlave = Uppercase<TipoProveedor>;
export type OrigenLlave = "entorno" | "llavero";
const TTL_MS = 10 * 60_000;
const tipoDe = (n: NombreLlave) => n.toLowerCase() as TipoProveedor;

type Estado = { valores: Map<TipoProveedor, LlaveAbierta>; cargada: number | null; vistas: Set<string>; cache: CacheAviso<[], Map<TipoProveedor, LlaveAbierta>> | null };
const G = globalThis as typeof globalThis & { __tlLlavesProveedor?: Estado };
const E: Estado = (G.__tlLlavesProveedor ??= { valores: new Map(), cargada: null, vistas: new Set(), cache: null });

const sinBase = () => !process.env.DATABASE_URL || process.env.NEXT_PHASE === "phase-production-build";
function cache(): CacheAviso<[], Map<TipoProveedor, LlaveAbierta>> {
  return (E.cache ??= cacheConAviso<[], Map<TipoProveedor, LlaveAbierta>>({
    ttlMs: TTL_MS,
    cargar: async () => (await import("./tiendas/llavero")).leerProveedores(E.vistas),
    // La base no respondió: lo que ya había (se vuelve a intentar a los 5 s).
    siFalla: () => E.valores,
    reintentoMs: 5_000,
    juntar: true,
    releer: true,
    alGuardar: (m) => { E.valores = m; E.cargada = Date.now(); },
  }));
}
const delEntorno = (n: NombreLlave): string | null => { const v = (process.env[n] ?? "").trim(); return v ? v : null; };

/* La llave, sin esperar: la del entorno o la copia del proceso (cargada al arrancar). Si la copia es vieja, pide otra sin detener a quien llama. Para
   los «¿hay proveedor?» síncronos (modoPago, hayLlaves, sesListo, hayClave). */
export function llaveYa(n: NombreLlave): string | null {
  const v = delEntorno(n);
  if (v) return v;
  if (!sinBase() && (E.cargada == null || Date.now() - E.cargada > TTL_MS)) void cache().leer().catch(() => undefined);
  return E.valores.get(tipoDe(n))?.valor ?? null;
}

/* La llave, para quien la va a usar (llamar al proveedor, verificar una firma): la del entorno o la del llavero. Solo espera la primera carga. */
export async function llave(n: NombreLlave): Promise<string | null> {
  const v = delEntorno(n);
  if (v) return v;
  if (sinBase()) return null;
  try { await cache().leer(); } catch { /* lo que había */ }
  return E.valores.get(tipoDe(n))?.valor ?? null;
}

/* Al arrancar el proceso (instrumentation.ts): las llaves del llavero quedan en memoria antes de la primera petición. Nunca lanza. */
export async function prepararLlaves(): Promise<void> {
  if (sinBase()) return;
  try { await cache().leer(); } catch { /* sin base: llaveYa vuelve a pedirla */ }
}

/* Quien acaba de poner, rotar o retirar una llave en ESTE proceso no espera al aviso de la base. */
export function olvidarLlaves(): void { E.cache?.olvidar(); E.cargada = null; void prepararLlaves(); }

/* Lo que una pantalla puede saber de cada llave: de dónde la toma el servidor y su huella (sha256; la del llavero es la de su sobre). NUNCA el valor. */
export type OrigenDe = { tipo: TipoProveedor; nombre: NombreLlave; prov: Proveedor; origen: OrigenLlave | null; huella: string | null; version: number | null; sombra: boolean };
export async function origenes(): Promise<OrigenDe[]> {
  const { PROVEEDORES: P } = await import("./tiendas/llavero");
  if (!sinBase()) { try { await cache().leer(); } catch { /* lo que había */ } }
  return (Object.entries(P) as [TipoProveedor, { prov: Proveedor }][]).map(([tipo, d]) => {
    const nombre = tipo.toUpperCase() as NombreLlave, env = delEntorno(nombre), ll = E.valores.get(tipo) ?? null;
    return {
      tipo, nombre, prov: d.prov,
      origen: env ? "entorno" : ll ? "llavero" : null,
      huella: env ? createHash("sha256").update(env, "utf8").digest("hex") : ll?.huella ?? null,
      version: env ? null : ll?.version ?? null,
      // Hay una en el llavero pero manda la del entorno (el sobre sellado): la pantalla lo dice, para que rotar en el llavero no parezca hecho.
      sombra: !!env && !!ll,
    };
  });
}
