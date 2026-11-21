// Prueba al revés del guardián patrocinioDiasPorCalendario (confirmación 44658035571, pat002): los días comprados de un patrocinio se cuentan por
// el calendario de la ciudad (0194). Se inyecta el defecto (volver a la versión sin zona, contar por la duración, medir desde la hora de compra),
// el guardián debe fallar con SU mensaje ([patrocinioDiasPorCalendario]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'patrocinioDiasPorCalendario', P = 'apps/web/lib/patrocinio.ts', E = 'apps/web/lib/patrocinio-evento.ts', M = 'packages/db/migrations/0194_patrocinio_dias_por_calendario.sql';
const casos = [
  [P, ", now(),\n                                (select ci.timezone from cities ci where ci.id = ${t}city_id)) d)`;", ", now()) d)`;"],
  [P, "0, 0, null, now(), ci.timezone) d)", "0, 0, null, now()) d)"],
  [E, "s.paused_at, now(), ci.timezone) d)", "s.paused_at, now()) d)"],
  // 9t8 · Los días de la devolución de un patrocinio, al cerrarla (cerrarDevolucionPat).
  [P, "patrocinio_dias_comprados(s.starts_at, s.ends_at, s.extended_secs, (select ci.timezone from cities ci where ci.id = s.city_id)) as total", "greatest(1, ceil((extract(epoch from s.ends_at - s.starts_at) - s.extended_secs) / 86400.0 - 1 / 24.0))::int as total"],
  [M, "b - ((date_trunc('day', a at time zone tz)) at time zone tz)", "b - a"],
  [M, "with x as (select patrocinio_dias_comprados(a, b, ext, tz) as total,", "with x as (select greatest(1, ceil((extract(epoch from b - a) - ext) / 86400.0 - 1 / 24.0))::int as total,"],
  ['pruebas/e2e/pat003.cjs', "patrocinio_dias_comprados(s.starts_at, s.ends_at, s.extended_secs, ci.timezone) from", "greatest(1, ceil((extract(epoch from s.ends_at - s.starts_at) - s.extended_secs) / 86400.0 - 1 / 24.0))::int from"],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(`${f.split('/').pop()}: ${a.slice(0, 40).replace(/\n/g, ' ')}`, r);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
