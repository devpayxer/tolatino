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
