// Prueba al revés del guardián dirigidaEnPartes (22 nov, revisión del CI B2 y tanda 4): «al revés» siempre en sus partes y los nombres de «solo»
// validados antes de arrancar los carriles. Cada caso siembra un defecto en ci.yml o en el corredor; el guardián debe fallar con SU renglón
// ([dirigidaEnPartes]); se restaura.
// 24 nov · Y lo de la dirigida más rápida (decisión AM: más rápido, nunca más flojo): la dirigida en 8 partes, «todas las fases» y «anchos» sin
// las al revés (--sin-alreves), y «al revés» en 6 partes por tiempo (pruebas/reparto-alreves.json). Los casos nuevos exigen además SU mensaje.
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const R = path.resolve(__dirname, '..', '..');
const G = 'dirigidaEnPartes', Y = '.github/workflows/ci.yml', C = 'pruebas/correr.mjs', L = 'pruebas/lib/reparto.cjs', A = 'pruebas/reparto-alreves.json';
const casos = [
  // 22 nov (tanda 4) · «al revés» en su trabajo con partes fijas: que «partes» o «solo» lo cambien, una parte menos, su --parte o su nombre.
  [Y, "      matrix:\n        parte: [1, 2, 3, 4, 5, 6]\n", "      matrix:\n        parte: ${{ fromJSON((inputs.partes || '8') == '1' && '[1]' || '[1, 2, 3, 4, 5, 6]') }}\n", '6 partes fijas'],
  [Y, "      matrix:\n        parte: [1, 2, 3, 4, 5, 6]\n", "      matrix:\n        parte: [1, 2, 3]\n", '6 partes fijas'],
  [Y, "run: node pruebas/correr.mjs --grupo alreves --parte ${{ matrix.parte }}/6\n", "run: node pruebas/correr.mjs ${{ inputs.solo != '' && inputs.solo || '--grupo alreves' }} --parte ${{ matrix.parte }}/6\n"],
  [Y, "run: node pruebas/correr.mjs --grupo alreves --parte ${{ matrix.parte }}/6\n", "run: node pruebas/correr.mjs --grupo alreves --parte ${{ matrix.parte }}/3\n", 'corre --grupo alreves --parte i/6'],
  [Y, "    name: punta a punta · al revés · ${{ matrix.parte }}/6\n", "    name: punta a punta · al revés · ${{ matrix.parte }}\n", 'el nombre de cada parte es «· i/6»'],
  [Y, "          if [ -n \"$SOLO\" ]; then node pruebas/correr.mjs --comprobar $SOLO; fi\n", "          echo \"$SOLO\"\n"],
  [Y, "    needs: [cambios, web]\n    if: ${{ needs.cambios.outputs.alcance != 'documentos' && (inputs.alcance || 'todo') != 'pantallas' }}\n    runs-on: ubuntu-latest\n    timeout-minutes: 300", "    needs: [web]\n    if: ${{ needs.cambios.outputs.alcance != 'documentos' && (inputs.alcance || 'todo') != 'pantallas' }}\n    runs-on: ubuntu-latest\n    timeout-minutes: 300"],
  [C, "process.exit(sel.length ? 0 : 2); }", "process.exit(0); }"],
  [C, "  sel = nombres.map((n) => catalogo.find((t) => t.nombre === n.replace(/\\.(cjs|mjs|sh)$/, \"\")) ?? (console.error(`no existe: ${n}`), process.exit(2)));", "  sel = nombres.map((n) => catalogo.find((t) => t.nombre === n.replace(/\\.(cjs|mjs|sh)$/, \"\"))).filter(Boolean);"],
  // 24 nov · La dirigida en 8 partes.
  ['scripts/ci/subir.mjs', 'export const PARTES_DIRIGIDA = 8;', 'export const PARTES_DIRIGIDA = 4;', 'la dirigida va en 8 partes'],
  // 24 nov · La dirigida chica en 4: ci.yml deja de aceptar 4, o su matriz deja de abrir 4 partes
  [Y, '        options: ["1", "4", "8"]\n', '        options: ["1", "8"]\n', 'acepta 4 (la dirigida chica va en 4)'],
  [Y, "(inputs.partes || '8') == '4' && '[1,2,3,4]'", "(inputs.partes || '8') == '4' && '[1]'", 'abre [1,2,3,4] con partes=4'],
  [Y, '        options: ["1", "4", "8"]\n', '        options: ["1", "4"]\n', 'acepta 8'],
  // 24 nov · Las al revés de «solo» no se repiten en «todas las fases» ni en «anchos».
  [Y, "--parte ${{ matrix.parte }}/${{ inputs.partes || '8' }} --reintentar --sin-alreves\n      - name: Subidas", "--parte ${{ matrix.parte }}/${{ inputs.partes || '8' }} --reintentar\n      - name: Subidas", '«regresion»: su corrida lleva --sin-alreves'],
  [Y, "--dispositivo ${{ matrix.id }} --parte ${{ matrix.parte }}/${{ inputs.partes || '8' }} --reintentar --sin-alreves\n", "--dispositivo ${{ matrix.id }} --parte ${{ matrix.parte }}/${{ inputs.partes || '8' }} --reintentar\n", '«anchos»: su corrida lleva --sin-alreves'],
  [Y, "      - uses: ./.github/actions/entorno-pruebas\n      - name: Regresión de todas las fases en base nueva\n", "      - uses: ./.github/actions/entorno-pruebas\n      - name: age para las pruebas al revés de 9o\n        if: ${{ contains(inputs.solo, 'alreves') }}\n        run: sudo apt-get install -y -q age >/dev/null\n      - name: Regresión de todas las fases en base nueva\n", '«regresion»: sin el paso de age'],
  // El corredor: --sin-alreves que no quita nada, o que no se aplica.
  [C, '  sel = sel.filter((t) => t.carril !== "alreves");\n', '', '--sin-alreves deja fuera las pruebas al revés'],
  [C, 'if (flag("--sin-alreves")) {', 'if (flag("--sin-alreves-no")) {', '--sin-alreves deja fuera las pruebas al revés'],
  // «al revés» por tiempo: por posición, una parte que se pierde, otra biblioteca, sin el archivo de duraciones o con una suite que ya no existe.
  [C, '  else if (!flag("--barajar") && carril === "alreves") {', '  else if (false) {', 'no corre la parte 1 del reparto por tiempo'],
  [L, '  return repartirPorTiempo({ sel, n, seg: leerAlReves(R)?.seg ?? {}, orden: sel }).partes[i - 1];', '  return sel.filter((_, k) => k % n === i - 1);', 'no va por tiempo: la parte más larga'],
  [L, '  for (const g of grupos.sort((a, b) => b.d - a.d || a.p - b.p)) { const i = masVacia(cargas);', '  for (const g of grupos.sort((a, b) => a.p - b.p)) { const i = g.p % n;', 'no va por tiempo: la parte más larga'],
  [A, '"seg": {\n', '"seg": {\n  "zz9noexiste": 5,\n', 'zz9noexiste tiene duración'],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').filter((x) => x.trim().startsWith(`[${g}]`)); return [l.length > 0, l.join(' | ')]; }
};
const informe = (que, [falla, out], msg) => { const ok = falla && (!msg || out.includes(msg)); total++; console.log(`  ${ok ? '✓' : '✗'} ${G} al revés (${que})${msg && !ok ? ` [esperaba «${msg}»]` : ''}${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (ok) bien++; };
for (const [f, a, b, msg] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(`${f.split('/').pop()}: ${a.slice(0, 40).replace(/\n/g, ' ')}`, r, msg);
}
// 24 nov · Once suites al revés nuevas sin medir (más de 10): rojo hasta volver a medir pruebas/reparto-alreves.json.
{
  const nuevas = Array.from({ length: 11 }, (_, i) => path.join(R, 'pruebas', 'alreves', `zz9sinmedir${i}.cjs`));
  try {
    for (const f of nuevas) fs.writeFileSync(f, "console.log('✓ nueva');\n");
    informe('once suites al revés sin medir', correr(G), 'suites al revés sin medir (más de 10)');
  } finally { for (const f of nuevas) try { fs.unlinkSync(f); } catch { /* no estaba */ } }
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
