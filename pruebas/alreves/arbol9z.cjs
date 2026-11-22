// 22 nov · Revisión del CI (A2) · La huella del árbol y la restauración de pruebas/lib/arbol.cjs, de verdad, en un repo de prueba (fuera del repo):
// lo que tiene que ver (un espacio de más, un archivo nuevo, una carpeta vacía, el contenido de un ignorado, el bit de ejecución, una referencia
// de git que se mueve), lo que no (node_modules, otro modo que git no distingue, otra copia de trabajo anidada) y que restaurar devuelve la huella
// inicial sin borrar nada (lo nuevo queda apartado en la copia). Guardián: alrevesArbolIdentico.
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const A = require('../lib/arbol.cjs');
let bien = 0, total = 0;
const ok = (c, que) => { total++; if (c) bien++; console.log(`  ${c ? '✓' : '✗'} ${que}`); };
const T = fs.mkdtempSync(path.join(os.tmpdir(), 'arbol9z-')), d0 = fs.mkdtempSync(path.join(os.tmpdir(), 'arbol9z-ref-'));
const git = (...a) => execFileSync('git', ['-c', 'user.email=prueba@ejemplo.invalid', '-c', 'user.name=prueba', '-c', 'commit.gpgsign=false', ...a], { cwd: T, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const esc = (f, t) => { fs.mkdirSync(path.dirname(path.join(T, f)), { recursive: true }); fs.writeFileSync(path.join(T, f), t); };
try {
  git('init', '-q');
  esc('.gitignore', '*.log\nnode_modules/\n'); esc('lib/a.ts', '// un comentario\nexport const a = 1;\n'); esc('lib/b.sh', 'echo hola\n');
  git('add', '-A'); git('commit', '-qm', 'uno');
  esc('docs/c.md', '# c\n'); git('add', '-A'); git('commit', '-qm', 'dos');
  git('update-ref', 'refs/remotes/origin/pruebas', 'HEAD');
  esc('migraciones/salida.log', 'inocuo\n'); esc('node_modules/x/index.js', 'module.exports = 1;\n'); esc('otra/.git', 'gitdir: /en/otro/sitio\n'); esc('otra/z.txt', 'z\n');
  const h0 = A.huella(T), dif = () => A.diferencias(h0, A.huella(T)), nombra = (d, r) => d.some((x) => x.ruta === r);
  ok(A.huella(T).digest === h0.digest && h0.refs['HEAD~1'] !== '-' && h0.refs['refs/remotes/origin/pruebas'] !== '-', 'la huella es la misma dos veces y lleva HEAD~1 y origin/pruebas');
  // Lo que tiene que ver.
  const casos = [
    ['un espacio de más en un comentario', () => esc('lib/a.ts', '// un comentario \nexport const a = 1;\n'), 'lib/a.ts'],
    ['un archivo nuevo sin seguimiento', () => esc('lib/zz-nuevo.ts', 'x'), 'lib/zz-nuevo.ts'],
    ['una carpeta vacía', () => fs.mkdirSync(path.join(T, 'migraciones/zz-vacia')), 'migraciones/zz-vacia/'],
    ['el contenido de un archivo ignorado', () => esc('migraciones/salida.log', "('sal_recordatorio', '{negocio}')\n"), 'migraciones/salida.log'],
    ['el bit de ejecución', () => fs.chmodSync(path.join(T, 'lib/b.sh'), 0o755), 'lib/b.sh'],
    ['un archivo con seguimiento que falta', () => fs.unlinkSync(path.join(T, 'docs/c.md')), 'docs/c.md'],
    ['origin/pruebas que se mueve', () => git('update-ref', 'refs/remotes/origin/pruebas', 'HEAD~1'), '(git) refs/remotes/origin/pruebas'],
  ];
  for (const [que, hacer, ruta] of casos) {
    hacer();
    const d = dif();
    ok(nombra(d, ruta), `la huella ve ${que} y lo nombra (${ruta})`);
  }
  // Restaurar: todo vuelve, lo nuevo se aparta (no se borra). La referencia de git no la toca la restauración (el corredor corta).
  git('update-ref', 'refs/remotes/origin/pruebas', h0.refs['refs/remotes/origin/pruebas']);
  // La copia se toma del árbol inicial: se vuelve a él a mano, se copia, se ensucia otra vez y se restaura.
  esc('lib/a.ts', '// un comentario\nexport const a = 1;\n'); fs.unlinkSync(path.join(T, 'lib/zz-nuevo.ts')); fs.rmdirSync(path.join(T, 'migraciones/zz-vacia'));
  esc('migraciones/salida.log', 'inocuo\n'); fs.chmodSync(path.join(T, 'lib/b.sh'), 0o644); esc('docs/c.md', '# c\n');
  ok(dif().length === 0, 'a mano, de vuelta a la huella inicial');
  A.copiar(T, h0, d0);
  esc('lib/a.ts', 'roto'); esc('lib/zz-nuevo.ts', 'trabajo de alguien'); fs.mkdirSync(path.join(T, 'zz/hondo/vacia'), { recursive: true }); esc('zz2/q.txt', 'q');
  fs.unlinkSync(path.join(T, 'docs/c.md')); fs.chmodSync(path.join(T, 'lib/b.sh'), 0o755);
  const o = A.restaurar(T, h0, d0);
  ok(dif().length === 0, `restaurar devuelve la huella inicial (${o.restaurados.length} devueltos, ${o.apartados.length} apartados, ${o.carpetas.length} carpetas)`);
  const ap = path.join(d0, 'apartados/lib/zz-nuevo.ts');
  ok(fs.existsSync(ap) && fs.readFileSync(ap, 'utf8') === 'trabajo de alguien' && fs.existsSync(path.join(d0, 'apartados/zz2/q.txt')), 'lo nuevo no se borra: queda apartado en la copia');
  // Lo que NO tiene que ver (no lo leen los guardianes o git no lo distingue).
  esc('node_modules/x/index.js', 'module.exports = 2;\n');
  ok(dif().length === 0, 'node_modules queda fuera de la huella');
  esc('otra/z.txt', 'otra cosa\n');
  ok(dif().length === 0, 'otra copia de trabajo anidada (una carpeta con su .git) queda fuera');
  fs.chmodSync(path.join(T, 'lib/a.ts'), 0o664);
  ok(dif().length === 0, 'un cambio de modo que git no distingue (644 → 664) no cuenta');
  // Un error al calcularla no da una huella: lanza.
  let lanzo = false; try { const v = process.env.GIT_DIR; process.env.GIT_DIR = path.join(T, 'no-existe'); try { A.huella(T); } finally { if (v === undefined) delete process.env.GIT_DIR; else process.env.GIT_DIR = v; } } catch { lanzo = true; }
  ok(lanzo, 'si git no responde, no hay huella (lanza; el corredor lo cuenta como rojo)');
} finally { fs.rmSync(T, { recursive: true, force: true }); fs.rmSync(d0, { recursive: true, force: true }); }
console.log(`\n${bien}/${total} comprobaciones de la huella del árbol`);
process.exit(bien === total ? 0 : 1);
