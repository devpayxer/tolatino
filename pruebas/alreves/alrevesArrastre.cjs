// Prueba al revés del guardián arrastreSeSuelta (anchos 18 nov): un arrastre del mapa que se queda «agarrado» mueve el pin al guardar.
// Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const MP = 'apps/web/app/_dir/MapaPin.tsx', MA = 'apps/web/app/(app)/mapa/Mapa.tsx';
const casos = [
  ['arrastreSeSuelta', MP, ' onLostPointerCapture={arriba}', ''],
  ['arrastreSeSuelta', MP, 'if (!s || e.pointerId !== s.id) return;', 'if (!s) return;'],
  ['arrastreSeSuelta', MP, 'if (e.pointerType === "mouse" && e.buttons === 0) { arriba(); return; }', ''],
  ['arrastreSeSuelta', MA, ' onLostPointerCapture={arriba}', ''],
  ['arrastreSeSuelta', MA, 'if (!g || e.pointerId !== g.id) return;', 'if (!g) return;'],
  ['arrastreSeSuelta', MA, 'if (e.pointerType === "mouse" && e.buttons === 0) { arriba(); return; }', ''],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
for (const [g, f, a, b] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  total++;
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  console.log(`  ${r[0] ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${r[1] ? ' → ' + r[1].trim().slice(0, 170) : ''}`); if (r[0]) bien++;
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
if (bien !== total || !limpio) process.exit(1);
