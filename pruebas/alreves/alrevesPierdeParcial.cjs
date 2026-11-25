// Prueba al revés del guardián pierdeConDevolucionParcial (25 nov, revisión de Fable de ae089df): «pierde» de noche, fiesta e inscripción
// mira también pay = 'partially_refunded'. Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const casos = [
  // noche y fiesta vuelven a mirar solo «captured»; la inscripción también
  ['pierdeConDevolucionParcial', 'apps/web/lib/noche-reservas.ts', '(o.pay === "captured" || o.pay === "partially_refunded")', 'o.pay === "captured"'],
  ['pierdeConDevolucionParcial', 'apps/web/lib/fiestas-reservas.ts', '(o.pay === "captured" || o.pay === "partially_refunded")', 'o.pay === "captured"'],
  ['pierdeConDevolucionParcial', 'apps/web/lib/inscripciones.ts', '(o.pay === "captured" || o.pay === "partially_refunded")', 'o.pay === "captured"'],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
for (const [g, f, a, b] of casos) {
  const ruta = path.join(R, f); total++;
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  console.log(`  ${r[0] ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${r[1] ? ' → ' + r[1].trim().slice(0, 170) : ''}`); if (r[0]) bien++;
}
const limpio = !correr('pierdeConDevolucionParcial')[0];
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
if (bien !== total || !limpio) process.exit(1);
