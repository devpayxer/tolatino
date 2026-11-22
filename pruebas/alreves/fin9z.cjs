// 22 nov · Revisión del CI (A1) · El ayudante de la pasada final (pruebas/lib/alreves-fin.cjs), de verdad, sobre un repo de prueba (fuera del repo)
// cuyo «guardianes/run.mjs» es un doble que deja dicho que corrió. Hijo del corredor con la huella inicial: no corre la pasada y lo dice. Hijo del
// corredor con el árbol cambiado: ✗ y en rojo. Con la variable pero sin ser hijo de ese pid (a mano, un nieto): corre la pasada de verdad. Sin
// variable: la corre, y si falla, en rojo. Guardián: alrevesPasadaFinal.
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync, spawnSync } = require('child_process');
const A = require('../lib/arbol.cjs'), FIN = path.join(__dirname, '..', 'lib', 'alreves-fin.cjs');
let bien = 0, total = 0;
const ok = (c, que) => { total++; if (c) bien++; console.log(`  ${c ? '✓' : '✗'} ${que}`); };
const T = fs.mkdtempSync(path.join(os.tmpdir(), 'fin9z-'));
const git = (...a) => execFileSync('git', ['-c', 'user.email=prueba@ejemplo.invalid', '-c', 'user.name=prueba', '-c', 'commit.gpgsign=false', ...a], { cwd: T, stdio: 'ignore' });
const esc = (f, t) => { fs.mkdirSync(path.dirname(path.join(T, f)), { recursive: true }); fs.writeFileSync(path.join(T, f), t); };
// La suite de prueba: llama al ayudante como las de verdad y dice qué devolvió. «hijo» la lanza este proceso; «nieto» la lanza un bash intermedio.
const suite = (env, { nieto = false, heredar = false } = {}) => {
  const js = `const r = require(${JSON.stringify(FIN)})(${JSON.stringify(T)}, { heredar: ${heredar} }); console.log('devolvió ' + r);`;
  const [cmd, args] = nieto ? ['bash', ['-c', 'node -e "$JS"; true']] : [process.execPath, ['-e', js]];
  const r = spawnSync(cmd, args, { cwd: T, encoding: 'utf8', env: { ...process.env, ...env, JS: js } });
  return `${r.stdout}${r.stderr}`;
};
try {
  esc('guardianes/run.mjs', "import { appendFileSync } from 'node:fs'; appendFileSync('corrio.log', 'x'); console.log('✓ guardianes: DOBLE — sin fallos'); process.exit(Number(process.env.DOBLE_FALLA || 0));\n");
  esc('.gitignore', 'corrio.log\n'); esc('a.txt', 'a\n');
  git('init', '-q'); git('add', '-A'); git('commit', '-qm', 'uno'); git('commit', '-q', '--allow-empty', '-m', 'dos');
  const corrio = () => fs.existsSync(path.join(T, 'corrio.log')) && (fs.rmSync(path.join(T, 'corrio.log')), true);
  const h = A.huella(T).digest, VAR = { ALREVES_CORREDOR: `${process.pid}:${h}` };
  let o = suite(VAR);
  ok(/pasada final a cargo del corredor: árbol idéntico/.test(o) && /devolvió true/.test(o) && !corrio(), 'hijo del corredor con la huella inicial: no repite la pasada y lo dice');
  o = suite(VAR, { heredar: true });
  ok(/^✓ guardianes: pasada final a cargo del corredor: árbol idéntico/m.test(o) && !corrio(), 'con stdio heredado el aviso lleva su ✓ (el recuento de ✓ de la suite no cambia)');
  esc('a.txt', 'a \n');
  o = suite(VAR);
  ok(/✗ el árbol NO es el del inicio del carril/.test(o) && /devolvió false/.test(o) && !corrio(), 'hijo del corredor con el árbol cambiado: ✗ y la suite sale en rojo');
  esc('a.txt', 'a\n');
  o = suite(VAR, { nieto: true });
  ok(!/a cargo del corredor/.test(o) && /devolvió true/.test(o) && corrio(), 'con la variable pero sin ser hijo de ese pid: corre la pasada de verdad');
  o = suite({ ALREVES_CORREDOR: `${process.pid}:${'0'.repeat(64)}`.replace(String(process.pid), '1') });
  ok(/devolvió true/.test(o) && corrio(), 'con otro pid en la variable: corre la pasada de verdad');
  o = suite({ ALREVES_CORREDOR: '' });
  ok(corrio() && /devolvió true/.test(o), 'a mano (sin variable): corre la pasada de verdad');
  o = suite({ ALREVES_CORREDOR: '', DOBLE_FALLA: '1' });
  ok(corrio() && /devolvió false/.test(o), 'a mano, con la pasada en rojo: devuelve rojo');
} finally { fs.rmSync(T, { recursive: true, force: true }); }
console.log(`\n${bien}/${total} comprobaciones del ayudante de la pasada final`);
process.exit(bien === total ? 0 : 1);
