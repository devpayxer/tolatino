/* 9b-3 · Lo común de la carga (scripts/carga/*-1m.mjs): la base, generar en el servidor (generate_series, sin disparadores mientras se
   llena: session_replication_role = replica, y los contadores derivados se escriben ya calculados), medir el código REAL de la app
   (lib/app.mjs) con su p50/p95 contra el presupuesto de cada fase, y el plan (EXPLAIN ANALYZE) de la consulta más lenta de lo que pasó del
   presupuesto. SOLO contra una base desechable: se niega si la base no dice que es de pruebas o si DATABASE_URL apunta fuera de esta máquina. */
import { createRequire } from "node:module";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { RAIZ, app } from "./app.mjs";

export { app };
const pg = createRequire(join(RAIZ, "apps/web/package.json"))("pg");
export const ESCALA = Number(process.env.CARGA_ESCALA ?? "1");          // 1 = 1 M de vecinos (la de verdad); 0.01 para probar el guion
export const n = (x) => Math.max(1, Math.round(x * ESCALA));
const SALIDA = process.env.CARGA_SALIDA ?? join(RAIZ, ".carga");
mkdirSync(SALIDA, { recursive: true });

const URL = process.env.DATABASE_URL ?? "";
if (!/@(127\.0\.0\.1|localhost)(:\d+)?\//.test(URL)) { console.error("[carga] DATABASE_URL tiene que ser una base local y desechable"); process.exit(2); }
export const pool = new pg.Pool({ connectionString: URL, max: 4 });
export const q = async (sql, p = []) => (await pool.query(sql, p)).rows;
export const uno = async (sql, p = []) => (await q(sql, p))[0];

/* Candado: la carga solo corre en una base de pruebas (la semilla del sandbox marca a sus vecinos is_test) y nunca en una con datos reales. */
export async function candado() {
  // La marca del sandbox: su semilla solo se aplica en una base de pruebas (migrar.sh tiene su candado) y deja sus filas «pruebas/…» en schema_seeds.
  const r = await uno(`select exists (select 1 from schema_seeds where name like 'pruebas/%') as sandbox, (select count(*) from schema_migrations)::int as m`);
  if (!r.sandbox) { console.error("[carga] esta base no tiene la semilla del sandbox: no se carga aquí (solo en una base desechable de pruebas)"); process.exit(2); }
  return r;
}

/* Genera en el servidor, sin disparadores ni llaves (la carga escribe los derivados ya calculados), en lotes para no llenar la memoria. */
export async function generar(nombre, sentencias) {
  const t0 = Date.now(), c = await pool.connect();
  try {
    await c.query("set session_replication_role = replica; set synchronous_commit = off; set work_mem = '256MB'; set maintenance_work_mem = '1GB'");
    for (const s of [sentencias].flat()) await c.query(s);
    await c.query("set session_replication_role = origin");
  } finally { c.release(); }
  console.log(`[carga] ${nombre}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
/* Un insert grande partido en lotes de `lote` sobre generate_series(1, total): la sentencia recibe $1 (desde) y $2 (hasta). */
export async function porLotes(nombre, total, sql, lote = 250_000) {
  const t0 = Date.now(), c = await pool.connect();
  try {
    await c.query("set session_replication_role = replica; set synchronous_commit = off; set work_mem = '256MB'");
    for (let d = 1; d <= total; d += lote) await c.query(sql, [d, Math.min(total, d + lote - 1)]);
    await c.query("set session_replication_role = origin");
  } finally { c.release(); }
  console.log(`[carga] ${nombre}: ${total.toLocaleString("es-US")} en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
/* Lo que un paso de la generación le deja a la medición (la fecha grande, el hilo de 500…), por si se mide otra vez con --sin-generar. */
export async function guardarMeta(k, v) { await q(`create table if not exists carga_meta (k text primary key, v text not null)`); await q(`insert into carga_meta (k, v) values ($1, $2) on conflict (k) do update set v = excluded.v`, [k, String(v)]); }
export async function meta(k) { return (await q(`select v from carga_meta where k = $1`, [k]).catch(() => []))[0]?.v ?? null; }
/* Después de generar: estadísticas al día y un checkpoint, para medir con la base asentada (si no, el checkpoint de los millones de filas recién
   escritas caía en medio de una medida y la volvía una medida del disco del runner, no de la consulta). */
export async function analizar() { const t = Date.now(); await q("vacuum analyze"); await q("checkpoint"); console.log(`[carga] vacuum analyze y checkpoint: ${((Date.now() - t) / 1000).toFixed(1)} s`); }

/* Las consultas que hace la app mientras se mide (para el plan de la más lenta). */
let captura = null;
export async function capturar() {
  const { db } = await app("lib/db.ts");
  const p = db(), orig = p.query.bind(p);
  if (p.__carga) return;
  p.__carga = true;
  p.query = (...a) => {
    const t = performance.now(), r = orig(...a);
    if (captura && r && typeof r.then === "function") r.then(() => { const ms = performance.now() - t; const sql = typeof a[0] === "string" ? a[0] : a[0]?.text; if (sql && (!captura.max || ms > captura.max.ms)) captura.max = { ms, sql, p: a[1] }; }, () => {});
    return r;
  };
}

const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]; };
export const resultados = [];
/* Mide fn() `veces` veces (después de `calentar`) y compara su p95 con el presupuesto (ms; null = solo se anota). */
export async function medir(id, { linea, presupuesto, veces = 30, calentar = 3, que }, fn) {
  await capturar();
  for (let i = 0; i < calentar; i++) await fn(i);
  captura = { max: null };
  const xs = [];
  let error = null;
  for (let i = 0; i < veces; i++) {
    const t = performance.now();
    // Lo que la app contesta con «no» (ok: false) no es una medida: es un error (una medida limpia a la primera se mira dos veces).
    try { const x = await fn(i); if (x && typeof x === "object" && x.ok === false) throw new Error(`la app dijo que no: ${JSON.stringify(x.msg ?? x).slice(0, 200)}`); }
    catch (e) { error = String(e?.message ?? e).slice(0, 300); break; }
    xs.push(performance.now() - t);
  }
  const lenta = captura.max; captura = null;
  const r = { id, linea, que, presupuesto, veces: xs.length, p50: xs.length ? +pct(xs, 50).toFixed(1) : null, p95: xs.length ? +pct(xs, 95).toFixed(1) : null, max: xs.length ? +Math.max(...xs).toFixed(1) : null, error };
  r.ok = !error && (presupuesto == null || r.p95 <= presupuesto);
  if ((!r.ok || process.env.CARGA_PLANES) && lenta?.sql) {
    try {
      const plan = (await pool.query(`explain (analyze, buffers, format text) ${lenta.sql}`, lenta.p ?? [])).rows.map((x) => x["QUERY PLAN"]).join("\n");
      r.plan = { ms: +lenta.ms.toFixed(1), sql: lenta.sql.replace(/\s+/g, " ").slice(0, 600), plan: plan.slice(0, 6000) };
    } catch (e) { r.plan = { ms: +lenta.ms.toFixed(1), sql: lenta.sql.replace(/\s+/g, " ").slice(0, 600), plan: `(sin plan: ${String(e.message).slice(0, 200)})` }; }
  }
  resultados.push(r);
  appendFileSync(join(SALIDA, "resultados.jsonl"), JSON.stringify(r) + "\n");
  console.log(`[medir] ${r.ok ? "✓" : "✗"} ${id} (${linea ?? "-"}) p50 ${r.p50} ms · p95 ${r.p95} ms${presupuesto != null ? ` · presupuesto ${presupuesto} ms` : " · sin presupuesto escrito"}${error ? ` · ERROR ${error}` : ""}`);
  if (r.plan && !r.ok) console.log(`[plan] ${id}: la más lenta (${r.plan.ms} ms): ${r.plan.sql}\n${r.plan.plan}`);
  return r;
}
/* Una cifra que no es de tiempo (tamaño, cantidad) contra su tope. */
export function anotar(id, { linea, que, valor, tope, unidad }) {
  const r = { id, linea, que, presupuesto: tope, unidad, p50: valor, p95: valor, ok: tope == null || valor <= tope };
  resultados.push(r);
  appendFileSync(join(SALIDA, "resultados.jsonl"), JSON.stringify(r) + "\n");
  console.log(`[medir] ${r.ok ? "✓" : "✗"} ${id} (${linea ?? "-"}) ${valor} ${unidad}${tope != null ? ` · tope ${tope} ${unidad}` : ""}`);
  return r;
}
export async function fin() {
  const { db } = await app("lib/db.ts");
  await db().end().catch(() => {});
  await pool.end();
  const malos = resultados.filter((r) => !r.ok);
  console.log(`\n[carga] ${resultados.length - malos.length}/${resultados.length} dentro del presupuesto`);
  return malos.length;
}
/* Un Staff del Super Admin para medir sus pantallas (todas las ciudades, todos los permisos). */
export const STAFF = (id) => ({ id, phone: "+10000000000", first_name: "Carga", last_name: null, nick: null, lang: "es", estado: "ok", hasta: null, role: "admin", roleName: "Admin", cities: [], puede: () => true });
