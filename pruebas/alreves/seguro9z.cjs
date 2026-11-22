// 22 nov · Revisión del CI (A3) · El seguro contra el defecto sembrado, de verdad, en un repo de prueba (fuera del repo): una «suite» con la
// precarga del corredor (pruebas/lib/alreves-corredor.cjs) siembra defectos y muere con SIGKILL a medio caso; el diario del árbol
// (pruebas/lib/diario.cjs) devuelve lo sembrado solo si el archivo sigue con el defecto anotado: lo que alguien cambió después no se toca, lo
// nuevo se aparta (no se borra) y sin ser hija del corredor la precarga no anota nada. Guardián: alrevesSeguroSembrado.
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const D = require('../lib/diario.cjs'), PRE = path.join(__dirname, '..', 'lib', 'alreves-corredor.cjs');
let bien = 0, total = 0;
const ok = (c, que) => { total++; if (c) bien++; console.log(`  ${c ? '✓' : '✗'} ${que}`); };
const T = fs.mkdtempSync(path.join(os.tmpdir(), 'seguro9z-')), DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'seguro9z-diario-'));
const esc = (f, t) => { fs.mkdirSync(path.dirname(path.join(T, f)), { recursive: true }); fs.writeFileSync(path.join(T, f), t); };
const lee = (f) => { try { return fs.readFileSync(path.join(T, f), 'utf8'); } catch { return null; } };
// La «suite»: siembra con fs como las de verdad y se mata a sí misma con SIGKILL (el corredor muerto a medio caso, sin finally que valga).
const SIEMBRA = `const fs = require('fs');
fs.writeFileSync('a.txt', 'DEFECTO');
fs.appendFileSync('c.txt', ' DEFECTO');
fs.mkdirSync('nueva/sub', { recursive: true });
fs.writeFileSync('nueva/sub/n.txt', 'nuevo');
fs.unlinkSync('b.txt');
process.kill(process.pid, 'SIGKILL');`;
const sembrar = ({ nieto = false } = {}) => {
  const env = { ...process.env, ALREVES_CORREDOR: `${process.pid}:${'a'.repeat(64)}`, ALREVES_DIARIO: DIR, ALREVES_RAIZ: T, SIEMBRA };
  const r = nieto ? spawnSync('bash', ['-c', `node --require "${PRE}" -e "$SIEMBRA"; true`], { cwd: T, env }) : spawnSync(process.execPath, ['--require', PRE, '-e', SIEMBRA], { cwd: T, env });
  return r.signal;
};
const inicial = () => { fs.rmSync(path.join(T, 'nueva'), { recursive: true, force: true }); esc('a.txt', 'ORIGINAL A'); esc('b.txt', 'ORIGINAL B'); esc('c.txt', 'ORIGINAL C'); D.vaciar(DIR); };
try {
  inicial();
  ok(sembrar() === 'SIGKILL' && lee('a.txt') === 'DEFECTO' && lee('b.txt') === null && fs.existsSync(path.join(T, 'nueva/sub/n.txt')), 'la suite muere con SIGKILL a medio caso y deja el defecto sembrado (lo de hoy sin seguro)');
  const n = D.leer(DIR);
  ok(n.length >= 5 && n.every((e) => e.suite) && n.find((e) => e.ruta === 'a.txt')?.antes === D.sha(Buffer.from('ORIGINAL A')), `el diario anotó cada escritura ANTES de hacerla (${n.length} entradas, con el sha del original)`);
  let o = D.recuperar(T, DIR);
  ok(lee('a.txt') === 'ORIGINAL A' && lee('b.txt') === 'ORIGINAL B' && lee('c.txt') === 'ORIGINAL C' && !fs.existsSync(path.join(T, 'nueva')) && !o.conflictos.length, `al arrancar: todo vuelve al original (${o.devueltos.length} devueltos, ${o.apartados.length} apartados, ${o.carpetas.length} carpetas)`);
  ok(fs.readFileSync(path.join(DIR, 'apartados/nueva/sub/n.txt'), 'utf8') === 'nuevo', 'lo nuevo no se borra: queda apartado en el diario');
  // Alguien edita a.txt después del corte: no se restaura a ciegas.
  inicial(); sembrar(); esc('a.txt', 'TRABAJO DE ALGUIEN');
  o = D.recuperar(T, DIR);
  ok(lee('a.txt') === 'TRABAJO DE ALGUIEN' && o.conflictos.some((c) => c.startsWith('a.txt ')) && lee('b.txt') === 'ORIGINAL B', 'un archivo que ya no tiene el defecto anotado (alguien lo editó) no se toca y se dice; lo demás vuelve');
  // Ya estaba restaurado (la suite llegó a su finally): nada que hacer, sin ruido.
  inicial(); sembrar(); esc('a.txt', 'ORIGINAL A'); esc('b.txt', 'ORIGINAL B'); esc('c.txt', 'ORIGINAL C'); fs.rmSync(path.join(T, 'nueva'), { recursive: true });
  o = D.recuperar(T, DIR);
  ok(!o.devueltos.length && !o.apartados.length && !o.conflictos.length, 'lo que ya está como el original no se toca ni cuenta como conflicto');
  // Una línea a medias (el corte justo al escribir el diario) no rompe la lectura.
  fs.appendFileSync(path.join(DIR, 'diario.jsonl'), '{"ruta":"a.t');
  ok(Array.isArray(D.leer(DIR)) && D.leer(DIR).length >= 5, 'una línea del diario a medias no rompe la recuperación');
  // Sin ser hija del corredor (un nieto, o a mano): la precarga no anota nada.
  inicial(); sembrar({ nieto: true });
  ok(D.leer(DIR).length === 0, 'sin ser hija directa del corredor la precarga no anota nada');
} finally { fs.rmSync(T, { recursive: true, force: true }); fs.rmSync(DIR, { recursive: true, force: true }); }
console.log(`\n${bien}/${total} comprobaciones del seguro contra el defecto sembrado`);
process.exit(bien === total ? 0 : 1);
