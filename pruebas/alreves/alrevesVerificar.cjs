// Prueba al revés del guardián verificarEntero (22 nov, revisión del CI B4): «tipos · build · guardianes» en trabajos paralelos (señal rápida,
// contratos, imágenes, base real) más el build único de «web», y «verificar» como compuerta. Cada caso siembra un defecto en ci.yml (un paso que
// desaparece o se apaga, un paso que se va a otro trabajo, la compuerta que deja pasar) o un segundo script «build»; el guardián debe fallar con SU
// renglón ([verificarEntero]); se restaura.
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const R = path.resolve(__dirname, '..', '..');
const G = 'verificarEntero', Y = '.github/workflows/ci.yml';
const casos = [
  // Un paso que desaparece.
  [Y, '      - run: pnpm typecheck\n', ''],
  [Y, '      - run: pnpm guardianes\n', ''],
  [Y, '        run: bash scripts/contrato-wallet/correr.sh\n', '        run: echo wallet\n'],
  [Y, '          bash packages/db/migrar.sh $C\n          bash packages/db/migrar.sh $C\n', '          bash packages/db/migrar.sh $C\n'],
  [Y, '          node scripts/cms/extraer.mjs --verificar\n', ''],
  [Y, '        run: docker build -f infra/pruebas/Dockerfile -t tolatino/web:ci .\n', '        run: echo imagen\n'],
  [Y, '          sudo apt-get install -y -q age shellcheck pgbackrest postgresql-16 >/dev/null\n', '          sudo apt-get install -y -q age shellcheck >/dev/null\n'],
  [Y, "        run: test -z \"$(find apps/web/.next/static -name '*.map' -print -quit)\" && test -n \"$(find apps/web/.next/standalone/apps/web/.next/mapas -name '*.map' -print -quit)\"\n", ''],
  // La historia de la señal rápida (migracionReversible la necesita).
  [Y, '      - uses: actions/checkout@v4\n        with: { fetch-depth: 2 }\n', '      - uses: actions/checkout@v4\n'],
  // Un paso que se apaga o se va a otro trabajo.
  [Y, '      - run: pnpm typecheck\n', "      - run: pnpm typecheck\n        if: ${{ github.event_name != 'push' }}\n"],
  [Y, '      - run: pnpm guardianes\n', '      - run: pnpm guardianes\n        continue-on-error: true\n'],
  [Y, "    needs: cambios\n    if: ${{ needs.cambios.outputs.alcance != 'documentos' }}\n    runs-on: ubuntu-latest\n    timeout-minutes: 15\n    steps:\n      - uses: actions/checkout@v4\n      # Las imágenes primero", "    needs: cambios\n    if: ${{ needs.cambios.outputs.alcance != 'documentos' && github.event_name != 'schedule' }}\n    runs-on: ubuntu-latest\n    timeout-minutes: 15\n    steps:\n      - uses: actions/checkout@v4\n      # Las imágenes primero"],
  [Y, '      - run: pnpm --filter @tolatino/web build\n      # 22 nov (B4) · Sobre el build que se prueba', '      - run: pnpm --filter @tolatino/web build\n      - run: pnpm typecheck\n      # 22 nov (B4) · Sobre el build que se prueba'],
  // La compuerta que deja pasar.
  [Y, '    if: ${{ !cancelled() }}\n', '    if: always()\n'],
  [Y, '    needs: [cambios, rapida, contratos, imagenes, basedatos, web]\n', '    needs: [cambios, rapida, contratos, imagenes, web]\n'],
  [Y, 'const r = n[k]?.result, ok = r === "success" || (docs && k !== "rapida" && r === "skipped");', 'const r = n[k]?.result, ok = r !== "failure";'],
  [Y, '            if (mal) process.exit(1);\n          \'\n\n  seguridad:', '            if (mal) console.log("rojo");\n          \'\n\n  seguridad:'],
  // Un segundo script «build» (el build único de «web» ya no lo cubriría).
  ['packages/ui/package.json', '"scripts": {', '"scripts": {\n    "build": "tsc -p .",'],
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
  informe(`${f.split('/').pop()}: ${a.slice(0, 50).replace(/\n/g, ' ')}`, r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
