// Prueba al revés del guardián resumenComunidadUnaPasada (19 nov): el resumen de activos de la Comunidad sale de una pasada para 7, 30 y 90 días.
// Se inyecta el defecto, el guardián debe fallar con SU mensaje ([resumenComunidadUnaPasada]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const M = 'packages/db/migrations/0191_comunidad_resumen_en_partes.sql', G = 'resumenComunidadUnaPasada';
const casos = [
  [G, M, 'create or replace function com_activos_resumir() returns integer language plpgsql as $$\nbegin', 'create or replace function com_activos_resumir() returns integer language plpgsql as $$\ndeclare d integer;\nbegin\n  foreach d in array array[7, 30, 90] loop null; end loop;'],
  [G, M, 'return com_rangos_resumir() + com_activos_resumir() + com_recomendados_resumir();', 'return com_rangos_resumir() + com_activos_resumir();'],
  [G, M, 'select z.c, z.u, max(z.at) as at', 'select z.c, z.u, min(z.at) as at'],
  [G, M, "where v.created_at >= ((now() at time zone 'America/New_York')::date - 89)", "where v.created_at >= ((now() at time zone 'America/New_York')::date - 29)"],
  [G, 'pruebas/e2e/com5e.cjs', 'el resumen de activos (una pasada) da lo mismo que la regla', 'el resumen'],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
