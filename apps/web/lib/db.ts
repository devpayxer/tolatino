import "server-only";
import { appendFileSync } from "node:fs";
import { Pool, type PoolClient } from "pg";

/* Conexión única a Postgres para todo el servidor. */
let pool: Pool | null = null;
export function db(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
  if (!pool) { pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 3000 }); anotarConsultas(pool); }
  return pool;
}

/* 22 nov · Medida de las consultas que una corrida ejecuta (pruebas/lib/consultas-medir.cjs). SOLO en el servidor de pruebas (TOLATINO_ENTORNO=pruebas)
   y SOLO si PRUEBAS_ANOTAR_SQL trae la ruta de un archivo: cada texto de consulta distinto que pasa por el pool o por un cliente suyo se anota una vez
   (una línea JSON, espacios en uno solo). No cambia lo que se manda a la base ni lo que vuelve; un error al anotar se traga. Sin la variable no hace nada. */
const ANOTAR = process.env.TOLATINO_ENTORNO === "pruebas" ? process.env.PRUEBAS_ANOTAR_SQL : undefined;
const anotados = new Set<string>();
function anotarTexto(q: unknown) {
  try {
    const t = typeof q === "string" ? q : (q as { text?: unknown } | null)?.text;
    if (!ANOTAR || typeof t !== "string") return;
    const k = t.replace(/\s+/g, " ").trim();
    if (anotados.has(k)) return;
    anotados.add(k);
    appendFileSync(ANOTAR, JSON.stringify(k) + "\n");
  } catch { /* medir no puede romper una consulta */ }
}
function anotarConsultas(p: Pool) {
  if (!ANOTAR) return;
  const q0 = p.query.bind(p) as (...a: unknown[]) => unknown;
  (p as unknown as { query: unknown }).query = (...a: unknown[]) => { anotarTexto(a[0]); return q0(...a); };
  const c0 = p.connect.bind(p) as (...a: unknown[]) => unknown;
  (p as unknown as { connect: unknown }).connect = (...a: unknown[]) => {
    const r = c0(...a);
    if (a.length || !(r instanceof Promise)) return r;
    return r.then((c: PoolClient) => {
      const m = c as unknown as { __anota?: boolean; query: unknown };
      if (!m.__anota) { const cq = c.query.bind(c) as (...x: unknown[]) => unknown; m.query = (...x: unknown[]) => { anotarTexto(x[0]); return cq(...x); }; m.__anota = true; }
      return c;
    });
  };
}

export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await db().connect();
  try {
    await c.query("begin");
    const r = await fn(c);
    await c.query("commit");
    return r;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/* 9n · La transacción de quien llama, si ya hay una, o una propia. Una acción del panel abre tx(), llama a la función de lib con su
   cliente y deja la auditoría con ESE cliente: el cambio y su renglón entran juntos o ninguno (guardián auditoriaEnLaTransaccion). */
export function enTx<T>(cx: PoolClient | null | undefined, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  return cx ? fn(cx) : tx(fn);
}
/* 9n · Cuando la función de lib cobra, devuelve o avisa (Stripe, SMS) fuera de la base, la acción no la mete en su transacción: le pasa
   su auditoría y la función la escribe con SU cliente, dentro de la transacción del cambio, justo antes del commit. */
export type AlGuardar<T = void> = (c: PoolClient, x: T) => Promise<unknown>;
/* tx() que, si el cambio salió bien (ok), deja la auditoría de quien llama con el MISMO cliente antes del commit. La función de lib
   declara qué le pasa (AlGuardar sin nada, o AlGuardar<su resultado ok>); aquí llega lo que devolvió fn. */
export function txAuditada<R extends { ok: boolean }>(alGuardar: AlGuardar<never> | undefined, fn: (c: PoolClient) => Promise<R>): Promise<R> {
  return tx(async (c) => {
    const r = await fn(c);
    if (r.ok && alGuardar) await alGuardar(c, r as never);
    return r;
  });
}
