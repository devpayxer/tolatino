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
  let base: { ok: boolean; postgis?: string; error?: string } = { ok: false, error: "sin DATABASE_URL" };
  const p = db();
  if (p) {
    try {
      const r = await p.query<{ v: string }>("select postgis_version() as v");
      base = { ok: true, postgis: r.rows[0]?.v };
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
