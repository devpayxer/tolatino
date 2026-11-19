// Prueba al revés del guardián botonesQueCaben (19 nov): la fila «Llamar · Escribir · Cómo llegar» de la ficha se acomoda y las pruebas miran
// cada botón contra su caja. Se inyecta el defecto, el guardián debe fallar con SU mensaje ([botonesQueCaben]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const F = 'apps/web/app/(app)/n/[id]/FichaNueva.tsx', G = 'botonesQueCaben';
const casos = [
  [G, F, 'data-pieza="acciones-ficha" className="mt-1.5 flex flex-wrap gap-2"', 'data-pieza="acciones-ficha" className="mt-1.5 flex gap-2"'],
  [G, F, 'data-pieza="acciones-ficha" className="mt-1.5 flex flex-wrap gap-2"', 'data-pieza="acciones-ficha" className="mt-1.5 grid gap-2" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}'],
  [G, F, '<div className="grid flex-[1_1_auto]"><Button variant="secondary" size="sm" icon="pin"', '<div className="grid flex-1"><Button variant="secondary" size="sm" icon="pin"'],
  [G, F, 'data-pieza="acciones-ficha"', 'data-x="acciones"'],
  [G, 'pruebas/e2e/fic005.cjs', 'const noCaben = await botonesQueNoCaben(m);', 'const noCaben = [];'],
  [G, 'apps/web/app/globals.css', '[data-letra="grande"] [aria-label="To’Latino"] > span { font-size: 17px !important; }', ''],
  [G, 'pruebas/e2e/bus9t.cjs', 'const noCaben = await botonesQueNoCaben(w);', 'const noCaben = [];'],
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
