// Precarga de pruebas/alreves/textos.cjs (vive en lib/: no es una prueba): corre una prueba al revés SIN correr los guardianes (cada caso tarda segundos; con los guardianes, la
// pasada completa de las ~100 pruebas son horas en una sola máquina). Así solo queda lo que no depende del guardián: que el archivo de cada caso
// exista y que el texto a cambiar siga en él. Cada llamada a `node guardianes/run.mjs --solo X` «falla» con un renglón [X] (el caso cuenta como
// cazado) y la corrida completa del final sale limpia. Cualquier otro comando corre de verdad.
// Y no escribe nada: sin guardián que corra no hace falta inyectar el defecto, así que escribir, crear y borrar archivos no hacen nada (el
// árbol no se toca: se puede correr mientras se edita, y no despierta a quien vigila los archivos).
// 22 nov · Revisión del CI (A6) · El guardián que nombra un caso tiene que EXISTIR en guardianes/run.mjs («  X() {»): un guardián renombrado
// sale con código 2 («guardián desconocido») y 32 suites viejas lo contaban como cazado. Aquí se dice como «✗ <suite>: no existe el guardián X»,
// que textos.cjs cuenta como roto (corre en cada «tipos · build · guardianes» y en local, en segundos). Guardián alrevesCazadoConRenglon.
const fs = require('fs');
const path = require('path');
let definidos = null;
const existe = (g) => {
  if (!definidos) { try { definidos = new Set([...fs.readFileSync(path.join(process.cwd(), 'guardianes', 'run.mjs'), 'utf8').matchAll(/^ {2}([a-zA-Z0-9_]+)\(\) \{$/gm)].map((m) => m[1])); } catch { definidos = new Set(); } }
  return definidos.has(g);
};
for (const f of ['writeFileSync', 'unlinkSync', 'mkdirSync', 'rmdirSync', 'rmSync', 'renameSync', 'copyFileSync', 'appendFileSync']) fs[f] = () => undefined;
const cp = require('child_process');
const orig = cp.execSync;
cp.execSync = function (cmd, ...resto) {
  const m = /^node guardianes\/run\.mjs(?: --solo (\S+))?/.exec(String(cmd));
  if (!m) return orig.call(this, cmd, ...resto);
  if (!m[1]) return Buffer.from('');
  if (!existe(m[1])) console.log(`✗ ${path.basename(process.argv[1] ?? '?')}: no existe el guardián ${m[1]} en guardianes/run.mjs (¿renombrado? el caso saldría con código 2 y contaría como cazado)`);
  const e = new Error('guardián no corrido (textos.cjs)');
  e.stderr = `  [${m[1]}] (no corrido: solo se comprueban los textos)\n`; e.stdout = ''; e.status = 1;
  throw e;
};
