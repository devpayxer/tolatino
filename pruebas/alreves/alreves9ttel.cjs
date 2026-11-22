// Prueba al revés del guardián telefonoDePrueba555 (21 nov): un teléfono de prueba armado es siempre +1570555 y cuatro dígitos. din9t…din9t4 los
// sacaban de la hora: números que pueden ser de alguien (el repo es público) y, por Number(), a veces con un dígito de menos (CI 44884103116).
// Se inyecta el defecto, el guardián debe fallar con SU mensaje ([telefonoDePrueba555]); se restaura.
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const R = path.resolve(__dirname, '..', '..');
const G = 'telefonoDePrueba555', D4 = 'pruebas/e2e/din9t4.cjs', D1 = 'pruebas/e2e/din9t.cjs';
const casos = [
  [D4, "[await telNuevo()]", "[`+1570${String(Date.now()).slice(-7)}`]"],
  [D1, "const tel = await telNuevo();", "const tel = `+1484${String(Date.now()).slice(-7)}`;"],
  [D4, "const avisosDe = (tpl) => avisados.filter((a) => a[2] === tpl);", "const avisosDe = (tpl) => avisados.filter((a) => a[2] === tpl);\nlet TEL = Number(String(Date.now()).slice(-7));"],
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
