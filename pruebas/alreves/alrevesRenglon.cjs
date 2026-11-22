// Prueba al revés del guardián alrevesCazadoConRenglon (22 nov, revisión del CI A6): un caso cuenta como cazado solo con el renglón [G] de
// su guardián (código 2, un run.mjs que revienta o el renglón de otro no valen). Cada caso siembra un defecto en una de las dos precargas o en
// textos.cjs; el guardián debe fallar con SU renglón ([alrevesCazadoConRenglon]); se restaura.
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const R = path.resolve(__dirname, '..', '..');
const G = 'alrevesCazadoConRenglon';
const casos = [
  ["pruebas/lib/alreves-sin-guardian.cjs","  if (!existe(m[1])) console.log(","  if (false) console.log("],
  ["pruebas/lib/alreves-sin-guardian.cjs","matchAll(/^ {2}([a-zA-Z0-9_]+)\\(\\) \\{$/gm)","matchAll(/([a-zA-Z0-9_]+)/gm)"],
  ["pruebas/lib/alreves-corredor.cjs","if (e.status === 1 && /fallo\\(s\\) de guardianes:/.test(err) && ","if ("],
  ["pruebas/lib/alreves-corredor.cjs","if (e.status === 1 && /fallo\\(s\\) de guardianes:/.test(err) && err.split('\\n').some((l) => l.trim().startsWith(`[${m[1]}]`))) throw e;","throw e;"],
  ["pruebas/lib/alreves-corredor.cjs","      return e.stdout ?? Buffer.from('');","      throw e;"],
  ["pruebas/lib/alreves-corredor.cjs","  if (!/\\[\\$\\{/.test(fuente)) cp.execSync = function","  if (fuente !== null) cp.execSync = function"],
  ["pruebas/alreves/textos.cjs","const rotos = out.split('\\n').filter(","const rotos = [].filter("],
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
