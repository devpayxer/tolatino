import "server-only";
import { Pool, type PoolClient } from "pg";

/* Conexión única a Postgres para todo el servidor. */
let pool: Pool | null = null;
export function db(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 3000 });
  return pool;
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
