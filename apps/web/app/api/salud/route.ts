import { NextResponse } from "next/server";
import { Pool } from "pg";

/* Salud del servidor: app, base de datos y commit servido. Lo leen los guardianes y Uptime Kuma. */
export const dynamic = "force-dynamic";

let pool: Pool | null = null;
function db(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 2000 });
  return pool;
}

export async function GET() {
  const inicio = Date.now();
  let base: { ok: boolean; postgis?: string; migraciones?: number; ciudades?: number; categorias?: number; error?: string } = {
    ok: false,
    error: "sin DATABASE_URL",
  };
  const p = db();
  if (p) {
    try {
      const r = await p.query<{ v: string; m: number; c: number; k: number }>(
        `select postgis_version() as v,
                (select count(*)::int from schema_migrations) as m,
                (select count(*)::int from cities) as c,
                (select count(*)::int from categories) as k`,
      );
      const x = r.rows[0];
      base = { ok: true, postgis: x?.v, migraciones: x?.m, ciudades: x?.c, categorias: x?.k };
    } catch (e) {
      base = { ok: false, error: e instanceof Error ? e.message : "error" };
    }
  }
  const cuerpo = {
    ok: base.ok,
    app: "tolatino-web",
    entorno: process.env.TOLATINO_ENTORNO ?? "desconocido",
    commit: process.env.TOLATINO_COMMIT ?? "desconocido",
    hora: new Date().toISOString(),
    base,
    ms: Date.now() - inicio,
  };
  return NextResponse.json(cuerpo, { status: base.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
