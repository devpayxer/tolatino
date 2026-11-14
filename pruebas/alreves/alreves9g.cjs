// Prueba al revés de los guardianes de 9g (la Analítica completa: los derivados que solo escribe el barrido, Analítica por la base de análisis, el
// reporte diario al fundador que sale a las 7:30 con «lo que necesita de ti» y alerta si a las 8:00 no salió, y sin personas también en los correos). Se
// inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
// Los textos que el guardián caza (escribir un derivado, encender la marca del barrido) se arman aquí por partes: este archivo no los contiene.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0137_analitica.sql', AN = 'apps/web/lib/admin-analitica.ts', DA = 'apps/web/lib/db-analisis.ts', DE = 'apps/web/lib/analitica-derivados.ts',
  BA = 'apps/web/lib/barrido.ts', RP = 'apps/web/lib/reportes.ts', RD = 'apps/web/lib/reporte-diario.ts', PG = 'apps/web/app/admin/analitica/page.tsx', CO = 'infra/pruebas/docker-compose.yml';
const MARCA = 'tl.' + 'metricas_barrido', ESCRIBE = (t) => 'insert ' + 'into ' + t;
const casos = [
  // analiticaSinPersonas: Dinero devuelve un teléfono, una búsqueda de una sola persona sale, el correo consulta la base, el reporte diario lee personas,
  // Eventos lee la vista y no la tabla del barrido
  ['analiticaSinPersonas', AN, 'dbAnalisis().query<{ semana: string; neto: number }>(', 'dbAnalisis().query<{ semana: string; neto: number; phone: string }>('],
  ['analiticaSinPersonas', AN, "having count(distinct x.user_id) + (count(*) filter (where x.user_id is null) > 0)::int >= 2", "having count(*) >= 2"],
  ['analiticaSinPersonas', RP, 'const L = await busquedasSinResultado(a, dias);', 'const L = (await dbAnalisis().query<{ q: string; personas: number }>(`select query as q, 1 as personas from search_logs`)).rows;'],
  ['analiticaSinPersonas', RD, "coalesce((array_agg(b.name order by b.created_at))[1:5], '{}') as nombres from businesses b", "coalesce((array_agg(u.first_name order by b.created_at))[1:5], '{}') as nombres from businesses b join users u on u.id = b.owner_user_id"],
  ['analiticaSinPersonas', AN, 'from evt_ventas_negocio_dia_cache v join cities ci', 'from evt_ventas_negocio_dia v join cities ci'],
  // derivadoNoEditable: un derivado sin su trigger, el trigger que deja pasar, la marca que no se apaga, el barrido que no los rehace, Analítica leyendo la vista
  ['derivadoNoEditable', M, "array['metricas_dinero_dia', 'metricas_pro_dia', 'metricas_retencion', 'evt_analitica_dia_cache',", "array['metricas_dinero_dia', 'metricas_pro_dia', 'evt_analitica_dia_cache',"],
  ['derivadoNoEditable', M, "if coalesce(current_setting('" + MARCA + "', true), '') <> 'on' then", 'if false then'],
  ['derivadoNoEditable', M, "  perform set_config('" + MARCA + "', 'off', true);\n", ''],
  ['derivadoNoEditable', BA, '["metricas", async () => (await import("./analitica-derivados")).barrerAnalitica()],', ''],
  ['derivadoNoEditable', DE, 'select metricas_al_dia() as n', 'select 0 as n'],
  ['derivadoNoEditable', AN, 'from compa_analitica_dia_cache a where a.dia >= ${DESDE} and ${scope("a.city_id")} group by a.uso', 'from compa_analitica_dia a where a.dia >= ${DESDE} and ${scope("a.city_id")} group by a.uso'],
  // analisisPorReplica: sin la base de análisis no hay respaldo, la conexión deja escribir, Analítica usa la principal, el reporte lee cifras por la
  // principal, la pantalla abre la base, el compose no pasa la variable
  ['analisisPorReplica', DA, 'if (!url) return db();', 'if (!url) throw new Error("sin base de análisis");'],
  ['analisisPorReplica', DA, 'void c.query("set default_transaction_read_only = on");', 'void c;'],
  ['analisisPorReplica', AN, 'dbAnalisis().query<{ n: number; nuevos: number; activos: number }>(', 'db().query<{ n: number; nuevos: number; activos: number }>('],
  ['analisisPorReplica', RD, 'dbAnalisis().query<{ bruto: number; comision: number; devuelto: number }>(', 'db().query<{ bruto: number; comision: number; devuelto: number }>('],
  ['analisisPorReplica', PG, 'import { idioma } from "@/lib/idioma";', 'import { idioma } from "@/lib/idioma";\nimport { db } from "@/lib/db";'],
  ['analisisPorReplica', CO, '      DATABASE_URL_ANALISIS: ${DATABASE_URL_ANALISIS:-}\n', ''],
  // reporteDiarioSale: otra hora, otra hora de la alerta, sin alerta, sin error en el barrido, sin «lo que necesita de ti», fuera del barrido, se puede
  // cambiar, el aviso con SMS, el correo con otra plantilla
  ['reporteDiarioSale', RD, 'export const HORA_REPORTE = { h: 7, m: 30 };', 'export const HORA_REPORTE = { h: 9, m: 30 };'],
  ['reporteDiarioSale', RD, 'export const HORA_ALERTA = { h: 8, m: 0 };', 'export const HORA_ALERTA = { h: 10, m: 0 };'],
  ['reporteDiarioSale', RD, 'await alertar(f.dia, hecho ? "tarde" : "no_salio", error);', 'void error;'],
  ['reporteDiarioSale', RD, 'if (!hecho) throw new Error(', 'if (false) throw new Error('],
  ['reporteDiarioSale', RD, 'pendientes = (await loQueTeToca()).flatMap(', 'pendientes = ([] as Awaited<ReturnType<typeof loQueTeToca>>).flatMap('],
  ['reporteDiarioSale', BA, '["reporteDiario", async () => (await import("./reporte-diario")).barrerReporteDiario()],', ''],
  ['reporteDiarioSale', M, 'create trigger founder_reports_no_cambia before update or delete on founder_reports', 'create trigger founder_reports_no_cambia before delete on founder_reports'],
  ['reporteDiarioSale', M, "('reporte_no_salio', 'mod', null, false,", "('reporte_no_salio', 'mod', null, true,"],
  ['reporteDiarioSale', RD, 'tpl: "founder_daily", ...correoReporte(b, es), ref: ["founder_report", b.dia]', 'tpl: "report", ...correoReporte(b, es), ref: ["founder_report", b.dia]'],
];
const crear = [
  // derivadoNoEditable: otro archivo que escribe un derivado; otro que enciende la marca del barrido; una semilla que escribe un derivado a mano
  ['derivadoNoEditable', 'apps/web/lib/zz9g.ts', 'import "server-only";\nexport const q = `' + ESCRIBE('metricas_dinero_dia') + " (city_id, dia, tipo) values ('hzl', current_date, 'order')`;\n"],
  ['derivadoNoEditable', 'apps/web/lib/zz9g.ts', 'import "server-only";\nexport const q = `select set_config(\'' + MARCA + "', 'on', true)`;\n"],
  ['derivadoNoEditable', 'infra/pruebas/semilla/zz9g.sql', 'update ' + 'metricas_pro_dia set mrr_cents = 0;\n'],
];
let bien = 0, total = 0;
const correr = (g, env = {}) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe', env: { ...process.env, ...env } }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
for (const [g, f, c] of crear) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); }
  informe(g, `crear ${f.split('/').pop()}`, r);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
if (bien !== total || !limpio) process.exit(1);
