// 22 nov · Revisión del CI (A1, la forma que aguantó) · La pasada final de guardianes de cada suite al revés, en UN sitio. Hasta hoy cada suite
// terminaba con «node guardianes/run.mjs» entero (5 formas de la misma línea en 114 suites): 113 pasadas completas por confirmación, el 85–88 % del
// carril. Ahora cada suite llama aquí:
// - lanzada por el corredor (pruebas/correr.mjs, carril «al revés»): la variable ALREVES_CORREDOR=<pid>:<huella> la pone el corredor SOLO para el
//   proceso de la suite y solo vale si ese pid es el padre de este proceso. Entonces NO repite la pasada completa: comprueba aquí mismo que el árbol
//   tiene la huella inicial del carril (pruebas/lib/arbol.cjs) y lo DICE. El corredor vuelve a compararla al terminar la suite y corre la pasada
//   REAL al empezar y al terminar el carril. Si la huella no es la inicial, lo dice con un ✗ y la suite sale en rojo.
// - lanzada a mano (o por cualquier otro): corre la pasada completa de verdad, como siempre.
// Nada de esto vive en guardianes/run.mjs: «node guardianes/run.mjs» siempre corre de verdad (regla 10). Guardián alrevesPasadaFinal.
const cp = require('child_process'), path = require('path');
const AVISO = 'pasada final a cargo del corredor: árbol idéntico';
module.exports = function pasadaFinal(R, { heredar = false, mostrar = false } = {}) {
  const [pid, huella] = String(process.env.ALREVES_CORREDOR ?? '').split(':');
  if (pid && Number(pid) === process.ppid && /^[0-9a-f]{64}$/.test(huella ?? '')) {
    let ahora = null;
    try { ahora = require(path.join(__dirname, 'arbol.cjs')).huella(R).digest; } catch (e) { ahora = `error: ${String(e?.message ?? e).slice(0, 160)}`; }
    if (ahora === huella) {
      console.log(`${heredar ? '✓ guardianes: ' : '  '}${AVISO} (huella ${huella.slice(0, 16)}, la misma que al empezar el carril; la pasada real corre al empezar y al terminar el carril)`);
      return true;
    }
    console.log(`  ✗ el árbol NO es el del inicio del carril al terminar esta suite (huella ${String(ahora).slice(0, 16)} en vez de ${huella.slice(0, 16)}): el corredor nombra los archivos y restaura`);
    return false;
  }
  if (heredar) { cp.execSync('node guardianes/run.mjs', { cwd: R, stdio: 'inherit' }); return true; }
  try { cp.execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); return true; }
  catch (e) { if (mostrar) console.log(String(e.stderr).slice(0, 600)); return false; }
};
