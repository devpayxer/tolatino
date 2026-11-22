// Prueba al revés del guardián alrevesPasadaFinal (22 nov, revisión del CI A1): la pasada final de cada suite al revés va por
// pruebas/lib/alreves-fin.cjs, que bajo el corredor no la repite (comprueba la huella) y a mano la corre de verdad; guardianes/run.mjs no guarda
// ningún veredicto. Cada caso siembra un defecto; el guardián debe fallar con SU renglón ([alrevesPasadaFinal]); se restaura.
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const R = path.resolve(__dirname, '..', '..');
const G = 'alrevesPasadaFinal', H = 'pruebas/lib/alreves-fin.cjs', C = 'pruebas/correr.mjs', T = 'pruebas/alreves/alreves9ttel.cjs';
const casos = [
  [T, "let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });", "let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; }"],
  [H, 'if (pid && Number(pid) === process.ppid && ', 'if (pid && '],
  [H, 'if (ahora === huella) {', 'if (true) {'],
  [H, "if (heredar) { cp.execSync('node guardianes/run.mjs', { cwd: R, stdio: 'inherit' }); return true; }", 'if (heredar) return true;'],
  [H, "try { cp.execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); return true; }", 'try { return true; }'],
  [H, "${heredar ? '✓ guardianes: ' : '  '}${AVISO}", "  ${AVISO}"],
  [C, 'ALREVES_CORREDOR: `${process.pid}:${vigia.ini.digest}`', 'ALREVES_CORREDOR: `${process.pid}`'],
  ['guardianes/run.mjs', 'const lista = solo ? { [solo]: guardianes[solo] } : guardianes;', 'if (!solo && process.env.ALREVES_CORREDOR) process.exit(0);\nconst lista = solo ? { [solo]: guardianes[solo] } : guardianes;'],
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
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
