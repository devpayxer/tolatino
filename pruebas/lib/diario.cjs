// 22 nov · Revisión del CI (A3) · El diario de restauración del carril «al revés», POR ÁRBOL y fuera de él (en la carpeta de git de esta copia:
// <git-dir>/tolatino-alreves/, que no comparten otras copias ni otros encargos, a diferencia de $PRUEBAS_SALIDA).
// - corrida.json: la corrida viva (pid y hora). Es el candado por árbol: con una corrida viva en el mismo árbol, otra no arranca (sembraría
//   sobre lo sembrado y «restauraría» el defecto como si fuera el original).
// - diario.jsonl: cada escritura de una suite en el árbol, anotada ANTES de hacerla (con fsync): ruta, sha de lo que había (o null), sha de lo
//   que se escribe (o null si se quita). Lo escribe la precarga pruebas/lib/alreves-corredor.cjs dentro del proceso de la suite.
// - originales/<sha>: los bytes de lo que había, para poder devolverlo.
// Al arrancar, si quedó un diario de una corrida muerta (el corredor murió con SIGKILL o se apagó la máquina), recuperar() NO restaura a ciegas:
// devuelve un archivo solo si sigue con el defecto anotado (el sha que la suite escribió); si ya está como el original, nada; si tiene otra cosa
// (alguien lo editó después), no lo toca y lo dice. Lo nuevo que hay que quitar se aparta (no se borra).
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const carpetaDe = (raiz) => path.join(execFileSync('git', ['rev-parse', '--absolute-git-dir'], { cwd: raiz, encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } }).trim(), 'tolatino-alreves');
const shaDe = (abs) => { try { const st = fs.lstatSync(abs); return st.isFile() ? sha(fs.readFileSync(abs)) : st.isDirectory() ? 'carpeta' : 'otro'; } catch { return null; } };
const vivo = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

/* Una línea al diario, en disco antes de seguir (fsync). */
function anotar(dir, entrada) {
  fs.mkdirSync(dir, { recursive: true });
  const fd = fs.openSync(path.join(dir, 'diario.jsonl'), 'a');
  try { fs.writeSync(fd, `${JSON.stringify(entrada)}\n`); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
/* Guarda los bytes de lo que había (una vez por sha), en disco antes de seguir. */
function guardarOriginal(dir, abs) {
  let b; try { b = fs.readFileSync(abs); } catch { return null; }
  const s = sha(b), f = path.join(dir, 'originales', s);
  if (!fs.existsSync(f)) {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    const tmp = `${f}.${process.pid}.tmp`, fd = fs.openSync(tmp, 'w');
    try { fs.writeSync(fd, b); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(tmp, f);
  }
  return s;
}

function leer(dir) {
  const f = path.join(dir, 'diario.jsonl');
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }); // una línea a medias (corte) no cuenta
}

/* Recupera el árbol de un diario abierto. Devuelve { devueltos, apartados, carpetas, conflictos } (rutas). No toca nada en conflicto. */
function recuperar(raiz, dir) {
  const out = { devueltos: [], apartados: [], carpetas: [], conflictos: [] };
  const por = new Map();
  for (const e of leer(dir)) { if (!e?.ruta) continue; const x = por.get(e.ruta); if (x) x.ultima = e; else por.set(e.ruta, { primera: e, ultima: e }); }
  // Primero los archivos; después las carpetas, de la más honda a la menos (una carpeta creada se quita solo si quedó vacía).
  const orden = [...por].sort(([a, x], [b, y]) => (!!x.primera.carpeta - !!y.primera.carpeta) || (y.primera.carpeta ? b.split('/').length - a.split('/').length : 0));
  for (const [rel, { primera, ultima }] of orden) {
    const abs = path.join(raiz, ...rel.split('/'));
    if (primera.carpeta) {
      if (primera.carpeta === 'nueva' && fs.existsSync(abs)) {
        const vaciar = (d) => { for (const h of fs.readdirSync(d, { withFileTypes: true })) if (h.isDirectory()) vaciar(path.join(d, h.name)); if (!fs.readdirSync(d).length) fs.rmdirSync(d); };
        try { vaciar(abs); } catch { /* lo que no esté vacío se queda */ }
        if (fs.existsSync(abs)) out.conflictos.push(`${rel}/ (carpeta creada por la suite que ya no está vacía: no la toco)`); else out.carpetas.push(`${rel}/ (quitada, estaba vacía)`);
      } else if (primera.carpeta === 'quitada' && !fs.existsSync(abs)) { fs.mkdirSync(abs, { recursive: true }); out.carpetas.push(`${rel}/ (creada otra vez)`); }
      continue;
    }
    const ahora = shaDe(abs);
    if (ahora === primera.antes) continue; // ya está como el original
    if (ahora !== ultima.despues) { out.conflictos.push(`${rel} (no tiene ni el original ni el defecto anotado: alguien lo cambió después; no lo toco)`); continue; }
    if (primera.antes === null) { // la suite lo creó: se aparta
      const dst = path.join(dir, 'apartados', ...rel.split('/'));
      fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.renameSync(abs, dst); out.apartados.push(rel);
    } else {
      const orig = path.join(dir, 'originales', primera.antes);
      if (!fs.existsSync(orig) || sha(fs.readFileSync(orig)) !== primera.antes) { out.conflictos.push(`${rel} (falta su original en el diario: no lo toco)`); continue; }
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      const tmp = `${abs}.restaurando-${process.pid}`; fs.copyFileSync(orig, tmp); fs.renameSync(tmp, abs);
      if (shaDe(abs) !== primera.antes) { out.conflictos.push(`${rel} (restaurado pero no quedó igual al original)`); continue; }
      out.devueltos.push(rel);
    }
  }
  return out;
}

/* Cierra lo anotado (todo resuelto): el diario y los originales. La corrida sigue abierta. */
function vaciar(dir) {
  for (const f of ['diario.jsonl', 'originales']) try { fs.rmSync(path.join(dir, f), { recursive: true, force: true }); } catch { /* nada */ }
}

module.exports = { carpetaDe, anotar, guardarOriginal, leer, recuperar, vaciar, vivo, sha, shaDe };
