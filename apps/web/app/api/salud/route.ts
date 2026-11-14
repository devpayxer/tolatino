import { NextResponse } from "next/server";
import { Pool } from "pg";

/* Salud del servidor: app, base de datos y commit servido. Lo leen la puerta de salud del despliegue (azul/verde), la vigilancia de la vuelta atrás,
   el monitoreo de la réplica (blackbox de Prometheus) y el segundo testigo de GitHub Actions. 9o: también cuántos segundos hace que corrió el barrido
   (system_jobs) y que latió el monitoreo externo (health_checks 'vigia'): si el barrido entero o el monitoreo se callan, el testigo lo ve. Esas dos
   cifras van aparte: si fallan, la salud de la app no cambia (la puerta de salud solo mira la base). */
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
  let latidos: { barrido_s: number | null; vigia_s: number | null } = { barrido_s: null, vigia_s: null };
  if (p && base.ok) {
    try {
      const r = await p.query<{ b: number | null; v: number | null }>(
        `select extract(epoch from now() - (select max(last_run_at) from system_jobs where name like 'barrido.%'))::int as b,
                extract(epoch from now() - (select max(at) from health_checks where service = 'vigia' and not is_test))::int as v`);
      latidos = { barrido_s: r.rows[0]?.b ?? null, vigia_s: r.rows[0]?.v ?? null };
    } catch { /* sin estas cifras la salud sigue igual */ }
  }
  const cuerpo = {
    ok: base.ok,
    app: "tolatino-web",
    entorno: process.env.TOLATINO_ENTORNO ?? "desconocido",
    commit: process.env.TOLATINO_COMMIT ?? "desconocido",
    hora: new Date().toISOString(),
    base,
    ...latidos,
    ms: Date.now() - inicio,
  };
  return NextResponse.json(cuerpo, { status: base.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
