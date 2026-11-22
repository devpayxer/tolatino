// 22 nov · Revisión del CI (A3) · Precarga de las suites al revés lanzadas por el corredor (pruebas/correr.mjs la pone en NODE_OPTIONS del
// proceso de cada suite del carril «al revés»). Solo actúa en ese proceso: ALREVES_CORREDOR=<pid>:<huella> y ese pid es su padre (en los nietos
// —«node guardianes/run.mjs --solo», las pruebas que lanza una suite— no hace nada).
// Antes de cada escritura de la suite dentro del árbol (escribir, añadir, quitar, renombrar, copiar, crear o quitar carpetas) anota en el diario
// del árbol (pruebas/lib/diario.cjs) qué había y qué se escribe, con fsync, y guarda los bytes de lo que había. Si el corredor muere a medio caso
// (SIGKILL, la máquina), el siguiente arranque devuelve lo sembrado comprobando que el archivo sigue con el defecto anotado. Lo que escribe un
// comando de shell (perl -pi, age -o) no pasa por aquí: eso lo cubre la copia de referencia del corredor (árbol idéntico tras cada suite).
// Y (A6) un «--solo X» que falla sin el renglón [X] de su guardián no cuenta como cazado (ver abajo).
const fs = require('fs'), path = require('path');
const [pidCorredor] = String(process.env.ALREVES_CORREDOR ?? '').split(':');
if (pidCorredor && Number(pidCorredor) === process.ppid && process.env.ALREVES_DIARIO && process.env.ALREVES_RAIZ) {
  const D = require('./diario.cjs'), DIR = process.env.ALREVES_DIARIO, RAIZ = process.env.ALREVES_RAIZ;
  const suite = path.basename(process.argv[1] ?? '?');
  const o = {};
  for (const f of ['writeFileSync', 'appendFileSync', 'unlinkSync', 'renameSync', 'copyFileSync', 'rmSync', 'mkdirSync', 'rmdirSync', 'cpSync']) o[f] = fs[f];
  const rel = (p) => {
    if (typeof p !== 'string' && !(p instanceof URL) && !Buffer.isBuffer(p)) return null; // un descriptor: no es una ruta
    const abs = path.resolve(String(p instanceof URL ? p.pathname : p)), r = path.relative(RAIZ, abs);
    if (!r || r.startsWith('..') || path.isAbsolute(r) || abs.startsWith(DIR + path.sep) || abs === DIR) return null;
    const rr = r.split(path.sep).join('/');
    return rr === '.git' || rr.startsWith('.git/') ? null : { abs, r: rr };
  };
  const nota = (x, despues) => { const antes = D.guardarOriginal(DIR, x.abs); D.anotar(DIR, { ruta: x.r, antes, despues, suite, pid: process.pid, hora: new Date().toISOString() }); };
  const bytes = (data, opt) => Buffer.isBuffer(data) ? data : ArrayBuffer.isView(data) ? Buffer.from(data.buffer, data.byteOffset, data.byteLength) : Buffer.from(String(data), typeof opt === 'string' ? opt : opt?.encoding ?? 'utf8');
  const archivosDe = (abs) => { const st = fs.lstatSync(abs); if (!st.isDirectory()) return [abs]; return fs.readdirSync(abs).flatMap((h) => archivosDe(path.join(abs, h))); };
  const seguro = (fn) => { try { fn(); } catch (e) { if (e?.code !== 'ENOENT') throw e; } };
  fs.writeFileSync = function (p, data, opt) {
    const x = rel(p);
    if (x) { const ap = /a/.test(typeof opt === 'object' ? opt?.flag ?? '' : ''); let b = bytes(data, opt); if (ap) { try { b = Buffer.concat([fs.readFileSync(x.abs), b]); } catch { /* no existía */ } } nota(x, D.sha(b)); }
    return o.writeFileSync.apply(this, arguments);
  };
  fs.appendFileSync = function (p, data, opt) {
    const x = rel(p);
    if (x) { let cur = Buffer.alloc(0); try { cur = fs.readFileSync(x.abs); } catch { /* no existía */ } nota(x, D.sha(Buffer.concat([cur, bytes(data, opt)]))); }
    return o.appendFileSync.apply(this, arguments);
  };
  fs.unlinkSync = function (p) { const x = rel(p); if (x) nota(x, null); return o.unlinkSync.apply(this, arguments); };
  fs.renameSync = function (a, b) {
    const xa = rel(a), xb = rel(b);
    if (xa || xb) {
      let s = null; try { s = D.sha(fs.readFileSync(path.resolve(String(a)))); } catch { /* una carpeta o nada */ }
      if (xb) nota(xb, s);
      if (xa) nota(xa, null);
    }
    return o.renameSync.apply(this, arguments);
  };
  fs.copyFileSync = function (a, b) { const x = rel(b); if (x) { let s = null; try { s = D.sha(fs.readFileSync(path.resolve(String(a)))); } catch { /* nada */ } nota(x, s); } return o.copyFileSync.apply(this, arguments); };
  fs.cpSync = function (a, b) { const x = rel(b); if (x) seguro(() => { for (const f of archivosDe(path.resolve(String(a)))) { const y = rel(path.join(x.abs, path.relative(path.resolve(String(a)), f))); if (y) nota(y, D.sha(fs.readFileSync(f))); } }); return o.cpSync.apply(this, arguments); };
  fs.rmSync = function (p) { const x = rel(p); if (x) seguro(() => { for (const f of archivosDe(x.abs)) { const y = rel(f); if (y) nota(y, null); } }); return o.rmSync.apply(this, arguments); };
  fs.mkdirSync = function (p) {
    const x = rel(p);
    if (x) { let top = null, d = x.abs; while (!fs.existsSync(d) && rel(d)) { top = d; d = path.dirname(d); } if (top) D.anotar(DIR, { ruta: rel(top).r, carpeta: 'nueva', suite, pid: process.pid }); }
    return o.mkdirSync.apply(this, arguments);
  };
  fs.rmdirSync = function (p) { const x = rel(p); if (x) D.anotar(DIR, { ruta: x.r, carpeta: 'quitada', suite, pid: process.pid }); return o.rmdirSync.apply(this, arguments); };
  // 22 nov · Revisión del CI (A6) · Un caso cuenta como cazado SOLO si su guardián falló con su renglón: código 1, la cabecera «fallo(s) de
  // guardianes» y un renglón [X]. Un guardián desconocido (código 2), un run.mjs que revienta o el renglón de otro guardián vuelven como si el
  // guardián hubiera pasado (la suite lo cuenta como NO cazado) y se dice con un ✗. Sin la salida de error a la vista (stdio heredado) no se
  // puede mirar: queda como antes. Solo en las suites que no miran el renglón por su cuenta (las 32 viejas, 5a … 8f: su código no arma
  // «[${g}]»); las nuevas ya lo exigen y algunas esperan a propósito otro fallo (alreves9vd: run.mjs que revienta con EISDIR).
  // Guardián alrevesCazadoConRenglon.
  let fuente = ''; try { fuente = fs.readFileSync(process.argv[1] ?? '', 'utf8'); } catch { /* -e o sin archivo */ }
  const cp = require('child_process'), execOrig = cp.execSync;
  if (!/\[\$\{/.test(fuente)) cp.execSync = function (cmd, ...resto) {
    const m = /^node guardianes\/run\.mjs --solo (\S+)/.exec(String(cmd));
    if (!m) return execOrig.call(this, cmd, ...resto);
    try { return execOrig.call(this, cmd, ...resto); } catch (e) {
      if (e?.stderr == null) throw e;
      const err = String(e.stderr);
      if (e.status === 1 && /fallo\(s\) de guardianes:/.test(err) && err.split('\n').some((l) => l.trim().startsWith(`[${m[1]}]`))) throw e;
      console.log(`  ✗ ${suite}: el caso de ${m[1]} no salió con el renglón [${m[1]}] de su guardián (código ${e.status ?? e.signal}: ${(err.trim().split('\n').pop() ?? '').slice(0, 160)}): no cuenta como cazado`);
      return e.stdout ?? Buffer.from('');
    }
  };
}
