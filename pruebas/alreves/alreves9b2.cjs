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
  ['tuberiaVisual', Y, 'run: node pruebas/visual/correr.mjs --dispositivo ${{ matrix.id }}\n      - name: Capturas NUEVAS', 'run: node pruebas/visual/correr.mjs --dispositivo ${{ matrix.id }} --aprobar\n      - name: Capturas NUEVAS'],
  ['tuberiaVisual', 'pruebas/visual/correr.mjs', 'captura nueva sin aprobar', 'captura nueva'],
  // tuberiaAccesibilidad: axe que ya no frena lo serio, una violación conocida sin destino, la versión de axe sin fijar
  ['tuberiaAccesibilidad', 'pruebas/visual/correr.mjs', 'v.impact === "serious" || v.impact === "critical"', 'v.impact === "critical"'],
  ['tuberiaAccesibilidad', 'pruebas/visual/axe-conocidas.json', '"pantallas": "*",\n      "destino": "9c"', '"pantallas": "*",\n      "destino": "luego"'],
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
  ['tuberiaNoSeSalta', Y, 'needs: [verificar, seguridad, regresion, dispositivos]', 'needs: [verificar, regresion, dispositivos]'],
  ['tuberiaNoSeSalta', Y, 'const ok = v.result === "success" || (v.result === "skipped" && parcial);', 'const ok = v.result !== "failure";'],
  ['tuberiaNoSeSalta', Y, '- { nombre: "fase 2", args: "--grupo fase2" }\n', ''],
  ['tuberiaVisual', Y, '    timeout-minutes: 40\n', '    timeout-minutes: 40\n    continue-on-error: true\n'],
];
// borrar: la captura aprobada de una pantalla en un dispositivo (el CI la tomaría como «nueva» y el guardián la echa en falta)
const borrar = [['tuberiaVisual', 'pruebas/visual/ficha/ipad.png']];
const crear = [];
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
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
