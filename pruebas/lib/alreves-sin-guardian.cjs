// Precarga de pruebas/alreves/textos.cjs (vive en lib/: no es una prueba): corre una prueba al revés SIN correr los guardianes (cada caso tarda segundos; con los guardianes, la
// pasada completa de las ~100 pruebas son horas en una sola máquina). Así solo queda lo que no depende del guardián: que el archivo de cada caso
// exista y que el texto a cambiar siga en él. Cada llamada a `node guardianes/run.mjs --solo X` «falla» con un renglón [X] (el caso cuenta como
// cazado) y la corrida completa del final sale limpia. Cualquier otro comando corre de verdad.
// Y no escribe nada: sin guardián que corra no hace falta inyectar el defecto, así que escribir, crear y borrar archivos no hacen nada (el
// árbol no se toca: se puede correr mientras se edita, y no despierta a quien vigila los archivos).
const fs = require('fs');
for (const f of ['writeFileSync', 'unlinkSync', 'mkdirSync', 'rmdirSync', 'rmSync', 'renameSync', 'copyFileSync', 'appendFileSync']) fs[f] = () => undefined;
const cp = require('child_process');
const orig = cp.execSync;
cp.execSync = function (cmd, ...resto) {
  const m = /^node guardianes\/run\.mjs(?: --solo (\S+))?/.exec(String(cmd));
  if (!m) return orig.call(this, cmd, ...resto);
  if (!m[1]) return Buffer.from('');
  const e = new Error('guardián no corrido (textos.cjs)');
  e.stderr = `  [${m[1]}] (no corrido: solo se comprueban los textos)\n`; e.stdout = ''; e.status = 1;
  throw e;
};
