// Prueba al revés de los guardianes de 9b-2 (la tubería completa del CI: visual, accesibilidad, seguridad, velocidad y «no se salta»). Se inyecta el
// defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «borrar»: se aparta un archivo y se devuelve.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const Y = '.github/workflows/ci.yml';
const casos = [
  // tuberiaVisual: un dispositivo menos, una tolerancia aflojada, aprobar en cada corrida, una captura que falta
  ['tuberiaVisual', Y, 'galaxy, ipad, escritorio-1024, escritorio-1280, escritorio-1440]', 'galaxy, ipad, escritorio-1024, escritorio-1280]'],
  ['tuberiaVisual', 'pruebas/visual/comparar.cjs', 'MAXIMO = 0.005', 'MAXIMO = 0.5'],
  // 24 nov · El Hoy del Super Admin deja de tapar la auditoría (lo que escribe una migración volvería a cambiar la captura aprobada).
  ['tuberiaVisual', 'pruebas/visual/pantallas.json', '      "desde": "ÚLTIMAS ACCIONES DEL EQUIPO",\n', ''],
  // 22 nov (B5) · los dispositivos sin tope de trabajos a la vez, o juntados en un trabajo
  ['tuberiaVisual', Y, '      fail-fast: false\n      max-parallel: 3\n', '      fail-fast: false\n'],
  ['tuberiaVisual', Y, '      max-parallel: 3\n', '      max-parallel: 9\n'],
  ['tuberiaVisual', Y, 'run: node pruebas/correr.mjs disp9b --dispositivo ${{ matrix.id }}\n', 'run: for d in iphone-se ipad; do node pruebas/correr.mjs disp9b --dispositivo $d; done\n'],
  ['tuberiaVisual', Y, 'run: node pruebas/visual/correr.mjs --dispositivo ${{ matrix.id }}\n      - name: Capturas NUEVAS', 'run: node pruebas/visual/correr.mjs --dispositivo ${{ matrix.id }} --aprobar\n      - name: Capturas NUEVAS'],
  ['tuberiaVisual', 'pruebas/visual/correr.mjs', 'captura nueva sin aprobar', 'captura nueva'],
  // tuberiaAccesibilidad: axe que ya no frena lo serio, una violación conocida sin destino, la versión de axe sin fijar
  ['tuberiaAccesibilidad', 'pruebas/visual/correr.mjs', 'v.impact === "serious" || v.impact === "critical"', 'v.impact === "critical"'],
  ['tuberiaAccesibilidad', 'pruebas/visual/axe-conocidas.json', '"conocidas": []', '"conocidas": [{ "regla": "color-contrast", "pantallas": "*", "destino": "luego" }]'],
  ['tuberiaAccesibilidad', 'pruebas/herramientas/package.json', '"@axe-core/playwright": "4.10.2"', '"@axe-core/playwright": "^4.10.2"'],
  // tuberiaSeguridad: el audit más flojo, Semgrep sin que un hallazgo rompa, el trabajo apagable
  ['tuberiaSeguridad', Y, 'pnpm audit --audit-level high', 'pnpm audit --audit-level critical'],
  ['tuberiaSeguridad', Y, 'scan --config semgrep/ --error --metrics=off', 'scan --config semgrep/ --metrics=off'],
  ['tuberiaSeguridad', Y, '  seguridad:\n    name: seguridad', '  seguridad:\n    if: github.event_name == \'push\'\n    name: seguridad'],
  ['tuberiaSeguridad', 'semgrep/tolatino.yml', 'id: tolatino-html-crudo\n    languages: [typescript, javascript]\n    severity: ERROR', 'id: tolatino-html-crudo\n    languages: [typescript, javascript]\n    severity: WARNING'],
  // tuberiaVelocidad: una pantalla sin presupuesto, la velocidad que deja de correr, el --medir fijo
  ['tuberiaVelocidad', 'pruebas/velocidad/presupuesto.json', '"admin-hoy": {', '"admin-hoy-sin-nombre": {'],
  ['tuberiaVelocidad', Y, '{ id: escritorio-1280, velocidad: true }', '{ id: escritorio-1280 }'],
  ['tuberiaVelocidad', Y, "${{ inputs.medir == 'si' && '--medir' || '' }}", '--medir'],
  // tuberiaNoSeSalta: «tuberia» sin una parte, saltando lo saltado, un grupo de la regresión fuera de la matriz, un continue-on-error
  ['tuberiaNoSeSalta', Y, 'needs: [cambios, verificar, seguridad, alreves, regresion, dispositivos, confirmacion, anchos]', 'needs: [cambios, verificar, alreves, regresion, dispositivos, confirmacion, anchos]'],
  ['tuberiaNoSeSalta', Y, 'needs: [cambios, verificar, seguridad, alreves, regresion, dispositivos, confirmacion, anchos]', 'needs: [cambios, verificar, seguridad, regresion, dispositivos, confirmacion, anchos]'],
  ['tuberiaNoSeSalta', Y, '        with: { pattern: "alreves-*", path: "${{ runner.temp }}/listas" }\n', ''],
  ['tuberiaNoSeSalta', Y, 'const ok = v.result === "success" || (v.result === "skipped" && parcial);', 'const ok = v.result !== "failure";'],
  // 21 nov · El tope de inestables es de la corrida entera (decisión AG), no de cada parte.
  ['tuberiaNoSeSalta', Y, 'if [ "$n" -gt 3 ]; then echo "::error::$n pruebas inestables', 'if [ "$n" -gt 30 ]; then echo "::error::$n pruebas inestables'],
  ['tuberiaNoSeSalta', Y, "-path '*/res/inestables.json' -print0", "-path '*/res/ninguna.json' -print0"],
  ['tuberiaNoSeSalta', Y, 'no se pueden contar y no se dan por cero"; exit 1; fi', 'no se pueden contar"; fi'],
  ['tuberiaNoSeSalta', Y, '        with: { pattern: "anchos-*", path: "${{ runner.temp }}/listas" }\n', ''],
  ['tuberiaNoSeSalta', 'pruebas/correr.mjs', 'writeFileSync(join(RES, "inestables.json")', 'writeFileSync(join(RES, "otra.json")'],
  // 22 nov · «cambios» también lleva ese permiso (pregunta por la corrida del código): el caso quita el de «tuberia», que va tras su «runs-on».
  ['tuberiaNoSeSalta', Y, '    if: always()\n    runs-on: ubuntu-latest\n    permissions: { contents: read, actions: read }\n', '    if: always()\n    runs-on: ubuntu-latest\n'],
  ['tuberiaNoSeSalta', Y, "'--grupo fase1,fase2,fase3,fase4,fase5,fase6,fase7,fase8,fase9,varios' }}", "'--grupo fase1,fase3,fase4,fase5,fase6,fase7,fase8,fase9,varios' }}"],
  // 22 nov (tanda 4) · «al revés» en su trabajo: sin su grupo, con una parte menos, o con una parte fija.
  ['tuberiaNoSeSalta', Y, 'run: node pruebas/correr.mjs --grupo alreves --parte ${{ matrix.parte }}/3\n', 'run: node pruebas/correr.mjs --grupo alreves9b2 --parte ${{ matrix.parte }}/3\n'],
  ['tuberiaNoSeSalta', Y, '\n        parte: [1, 2, 3]\n', '\n        parte: [1, 2]\n'],
  ['tuberiaNoSeSalta', Y, 'run: node pruebas/correr.mjs --grupo alreves --parte ${{ matrix.parte }}/3\n', 'run: node pruebas/correr.mjs --grupo alreves --parte 1/3\n'],
  // 22 nov (tanda 4) · el tope de trabajos a la vez de la confirmación y de los anchos.
  ['tuberiaNoSeSalta', Y, '      fail-fast: false\n      max-parallel: 12\n', '      fail-fast: false\n'],
  ['tuberiaNoSeSalta', Y, '      fail-fast: false\n      max-parallel: 4\n', '      fail-fast: false\n'],
  ['tuberiaNoSeSalta', Y, '        options: ["1", "4", "8"]\n        default: "8"\n', '        options: ["1", "4", "8"]\n        default: "4"\n'],
  // 20 nov · el reparto en partes a medias: una parte fija, una matriz sin partes, la segunda pasada de la confirmación sin su parte.
  ['tuberiaNoSeSalta', Y, "fase9,varios' }} --parte ${{ matrix.parte }}/${{ inputs.partes || '8' }}", "fase9,varios' }} --parte 1/8"],
  // 20 nov · el entorno de pruebas sin tope de tiempo en un paso de red
  ['tuberiaNoSeSalta', '.github/actions/entorno-pruebas/action.yml', 'reintenta 600 npx playwright install', 'npx playwright install'],
  ['tuberiaNoSeSalta', '.github/actions/entorno-pruebas/action.yml', 'reintenta 600 bash pruebas/servir/base.sh', 'bash pruebas/servir/base.sh'],
  // 20 nov · el tope de tiempo no puede ser la causa del rojo (CI 44793647835): man-db, el candado de apt, instalar por instala.sh, matar de verdad
  ['tuberiaNoSeSalta', '.github/actions/entorno-pruebas/action.yml', 'sudo rm -f /var/lib/man-db/auto-update', 'true'],
  ['tuberiaNoSeSalta', '.github/actions/entorno-pruebas/action.yml', 'DPkg::Lock::Timeout "300";', 'DPkg::Lock::Timeout "0";'],
  ['tuberiaNoSeSalta', '.github/actions/entorno-pruebas/action.yml', 'reintenta 420 bash "$RUNNER_TEMP/instala.sh" psmisc ffmpeg', 'reintenta 420 sudo apt-get install -y -qq psmisc ffmpeg'],
  ['tuberiaNoSeSalta', '.github/actions/entorno-pruebas/action.yml', 'timeout -k 15 "$t" "$@" && return 0;', 'timeout "$t" "$@" && return 0;'],
  ['tuberiaNoSeSalta', '.github/actions/entorno-pruebas/action.yml', 'Acquire::ForceIPv4 "true";', 'Acquire::ForceIPv4 "false";'],
  ['tuberiaNoSeSalta', '.github/actions/entorno-pruebas/action.yml', 'if [ "$t" -ge 900 ]; then', 'if false; then'],
  ['tuberiaNoSeSalta', '.github/actions/entorno-pruebas/action.yml', 'path: ~/apt-archivos/*.deb', 'path: ~/otra-carpeta'],
  ['tuberiaNoSeSalta', '.github/actions/entorno-pruebas/action.yml', 'Dir::Cache::Archives "%s/";', 'Dir::Etc::Nada "%s/";'],
  ['tuberiaNoSeSalta', '.github/actions/entorno-pruebas/action.yml', 'sudo dpkg --configure -a > "$L" 2>&1 || true', 'sudo pkill -9 -x apt-get 2> /dev/null || true'],
  ['tuberiaNoSeSalta', '.github/actions/entorno-pruebas/action.yml', '> "$RUNNER_TEMP/playwright.log") || {', '> /dev/null) || {'],
  ['tuberiaNoSeSalta', '.github/actions/entorno-pruebas/action.yml', 'wait $! || { echo "--- apt falló; lo último que dijo:" >&2; tail -n 25 "$L" >&2; exit 1; }', 'wait $!'],
  ['tuberiaNoSeSalta', '.github/actions/entorno-pruebas/action.yml', 'sleep 5; timeout -k 15 "$t" "$@"; }', 'sleep 5; "$@"; }'],
  // 20 nov · decisión AG (reintentoQueSeVe): repetir sin tope, repetir las al revés, callar la inestable, un carril sin --reintentar
  ['reintentoQueSeVe', 'pruebas/correr.mjs', 'TOPE_INESTABLES = 3, inestables = [];', 'TOPE_INESTABLES = 99, inestables = [];'],
  ['reintentoQueSeVe', 'pruebas/correr.mjs', 'if (!r.ok && REINTENTAR && t.carril === "e2e" && inestables.length < TOPE_INESTABLES) {', 'if (!r.ok && REINTENTAR && inestables.length < TOPE_INESTABLES) {'],
  ['reintentoQueSeVe', 'pruebas/correr.mjs', 'if (!r.ok && REINTENTAR && t.carril === "e2e" && inestables.length < TOPE_INESTABLES) {', 'if (!r.ok && t.carril === "e2e") {'],
  ['reintentoQueSeVe', 'pruebas/correr.mjs', 'console.log(`INESTABLES (${inestables.length})', 'void (`INESTABLES (${inestables.length})'],
  ['reintentoQueSeVe', 'pruebas/correr.mjs', "else r = { ...r2, error: `${r2.error} · dos veces seguidas", "else r = { ...(await correrUna(t)), error: `${r2.error} · dos veces seguidas"],
  ['reintentoQueSeVe', Y, "--dispositivo ${{ matrix.id }} --parte ${{ matrix.parte }}/${{ inputs.partes || '8' }} --reintentar", "--dispositivo ${{ matrix.id }} --parte ${{ matrix.parte }}/${{ inputs.partes || '8' }}"],
  // 20 nov · «todas las fases» fuera de la regresión sin que la confirmación la corra, y la primera pasada de la confirmación recortada.
  ['tuberiaNoSeSalta', Y, "!= 'pantallas' && !(inputs.confirmar == 'si' && inputs.solo == '') }}", "!= 'pantallas' && inputs.confirmar != 'si' }}"],
  ['tuberiaNoSeSalta', Y, '|| (k === "regresion" && process.env.CONFIRMAR === "si" && !(process.env.SOLO || "").trim()) ||', '|| (k === "regresion") ||'],
  ['tuberiaNoSeSalta', Y, "      - name: Primera pasada\n        run: node pruebas/correr.mjs --grupo fase1,fase2,", "      - name: Primera pasada\n        run: node pruebas/correr.mjs --grupo fase1,"],
  ['tuberiaNoSeSalta', Y, "        id: [iphone-se, ipad, escritorio-1024]\n        parte: ${{ fromJSON((inputs.partes || '8') == '8' && '[1,2,3,4,5,6,7,8]' || ((inputs.partes || '8') == '4' && '[1,2,3,4]' || '[1]')) }}\n", "        id: [iphone-se, ipad, escritorio-1024]\n        parte: [1]\n"],
  ['tuberiaNoSeSalta', Y, "        if: ${{ matrix.nombre == 'dos veces seguidas' }}\n        run: node pruebas/correr.mjs --grupo fase1,fase2,fase3,fase4,fase5,fase6,fase7,fase8,fase9,varios --parte ${{ matrix.parte }}/${{ inputs.partes || '8' }}", "        if: ${{ matrix.nombre == 'dos veces seguidas' }}\n        run: node pruebas/correr.mjs --grupo fase1,fase2,fase3,fase4,fase5,fase6,fase7,fase8,fase9,varios"],
  ['tuberiaVisual', Y, '    timeout-minutes: 40\n', '    timeout-minutes: 40\n    continue-on-error: true\n'],
];
// borrar: la captura aprobada de una pantalla en un dispositivo (el CI la tomaría como «nueva» y el guardián la echa en falta)
const borrar = [['tuberiaVisual', 'pruebas/visual/ficha/ipad.png']];
const crear = [
  // alrevesConSuTexto: una prueba al revés nueva con un caso que ya no encuentra su texto
  ['alrevesConSuTexto', 'pruebas/alreves/alrevesZrota.cjs', "const fs = require('fs'); const f = 'package.json'; if (!fs.readFileSync(f, 'utf8').includes('UN-TEXTO-QUE-NO-ESTA')) console.log('  ✗ ejemplo: no encontré el texto a cambiar en ' + f + ': UN-TEXTO-QUE-NO-ESTA');\n"],
];
let bien = 0, total = 0;
const correr = (g, env = {}) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe', env: { ...process.env, ...env } }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b, env] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g, env); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
for (const [g, f] of borrar) {
  const ruta = path.join(R, f), aparte = ruta + '.aparte';
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  fs.renameSync(ruta, aparte);
  let r; try { r = correr(g); } finally { fs.renameSync(aparte, ruta); }
  informe(g, `borrar ${f.split('/').slice(-2).join('/')}`, r);
}
for (const [g, f, c] of crear) {
  const ruta = path.join(R, f), dir = path.dirname(ruta), nuevo = !fs.existsSync(dir);
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); if (nuevo) try { fs.rmdirSync(dir); } catch { /* no vacía */ } }
  informe(g, `crear ${f.split('/').pop()}`, r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
