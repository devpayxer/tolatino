// Prueba al revés del guardián dirigidaEnPartes (22 nov, revisión del CI B2): «al revés» siempre en 4 partes y los nombres de «solo»
// validados antes de arrancar los carriles. Cada caso siembra un defecto en ci.yml o en el corredor; el guardián debe fallar con SU renglón
// ([dirigidaEnPartes]); se restaura.
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const R = path.resolve(__dirname, '..', '..');
const G = 'dirigidaEnPartes';
const casos = [
  [".github/workflows/ci.yml","        include: ${{ fromJSON((inputs.partes || '4') == '1' && '[{\"nombre\":\"al revés\",\"parte\":2},{\"nombre\":\"al revés\",\"parte\":3},{\"nombre\":\"al revés\",\"parte\":4}]' || '[]') }}\n",""],
  [".github/workflows/ci.yml","--parte ${{ matrix.parte }}/${{ matrix.nombre == 'al revés' && '4' || inputs.partes || '4' }} --reintentar","--parte ${{ matrix.parte }}/${{ inputs.partes || '4' }} --reintentar"],
  [".github/workflows/ci.yml","format(' · {0}/{1}', matrix.parte, matrix.nombre == 'al revés' && '4' || inputs.partes || '4')","format(' · {0}/{1}', matrix.parte, inputs.partes || '4')"],
  [".github/workflows/ci.yml","          if [ -n \"$SOLO\" ]; then node pruebas/correr.mjs --comprobar $SOLO; fi\n","          echo \"$SOLO\"\n"],
  [".github/workflows/ci.yml","    needs: [cambios, web]\n    if: ${{ needs.cambios.outputs.alcance != 'documentos' && (inputs.alcance || 'todo') != 'pantallas' }}\n    runs-on: ubuntu-latest\n    timeout-minutes: 300","    needs: [web]\n    if: ${{ needs.cambios.outputs.alcance != 'documentos' && (inputs.alcance || 'todo') != 'pantallas' }}\n    runs-on: ubuntu-latest\n    timeout-minutes: 300"],
  ["pruebas/correr.mjs","process.exit(sel.length ? 0 : 2); }","process.exit(0); }"],
  ["pruebas/correr.mjs","  sel = nombres.map((n) => catalogo.find((t) => t.nombre === n.replace(/\\.(cjs|mjs|sh)$/, \"\")) ?? (console.error(`no existe: ${n}`), process.exit(2)));","  sel = nombres.map((n) => catalogo.find((t) => t.nombre === n.replace(/\\.(cjs|mjs|sh)$/, \"\"))).filter(Boolean);"],
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
