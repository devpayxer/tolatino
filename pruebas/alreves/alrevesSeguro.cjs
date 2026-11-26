// Prueba al revés del guardián alrevesSeguroSembrado (22 nov, revisión del CI A3): un corte no deja el defecto sembrado (grupo de procesos,
// señales, diario por árbol que no restaura a ciegas). Cada caso siembra un defecto en el corredor, el diario o su precarga; el guardián debe
// fallar con SU renglón ([alrevesSeguroSembrado]); se restaura.
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const R = path.resolve(__dirname, '..', '..');
const G = 'alrevesSeguroSembrado';
const casos = [
  ["pruebas/correr.mjs","env: envDe(t), stdio: [\"ignore\", \"pipe\", \"pipe\"], detached: true });","env: envDe(t), stdio: [\"ignore\", \"pipe\", \"pipe\"] });"],
  ["pruebas/correr.mjs","matarGrupo(p, \"SIGKILL\"); }, TIEMPO);","p.kill(\"SIGKILL\"); }, TIEMPO);"],
  ["pruebas/correr.mjs","  vigia.alParar();\n  process.exit(cod);","  process.exit(cod);"],
  ["pruebas/correr.mjs","for (const [sen, cod] of [[\"SIGINT\", 130], [\"SIGTERM\", 143]]) process.on(sen, ","for (const [sen, cod] of [[\"SIGINT\", 130]]) process.on(sen, "],
  ["pruebas/correr.mjs","if (c.pid && c.pid !== process.pid && DIARIO.vivo(c.pid)) {","if (false) {"],
  ["pruebas/correr.mjs","    this.abrir();\n",""],
  ["pruebas/correr.mjs"," --require ${JSON.stringify(join(RAIZ, \"pruebas/lib/alreves-corredor.cjs\"))}",""],
  ["pruebas/lib/diario.cjs","if (ahora !== ultima.despues) { out.conflictos.push(","if (false) { out.conflictos.push("],
  ["pruebas/lib/diario.cjs","fs.writeSync(fd, `${JSON.stringify(entrada)}\\n`); fs.fsyncSync(fd);","fs.writeSync(fd, `${JSON.stringify(entrada)}\\n`);"],
  ["pruebas/lib/diario.cjs","execFileSync('git', ['rev-parse', '--absolute-git-dir']","execFileSync('git', ['rev-parse', '--show-toplevel']"],
  ["pruebas/lib/alreves-corredor.cjs","if (pidCorredor && Number(pidCorredor) === process.ppid && ","if (pidCorredor && "],
  ["pruebas/lib/alreves-corredor.cjs","fs.unlinkSync = function (p) { const x = rel(p); if (x) nota(x, null); return","fs.unlinkSync = function (p) { return"],
  ["pruebas/lib/alreves-corredor.cjs"," nota(x, D.sha(Buffer.concat([cur, bytes(data, opt)]))); }"," }"],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(`${f.split('/').pop()}: ${a.slice(0, 40).replace(/\n/g, ' ')}`, r);
}
// 26 nov · Lo que hace alParar() de verdad (el bloque `vigia` de correr.mjs, en un repo de juguete): tras una parada la copia de referencia
// (/tmp/tolatino-alreves-ref-*) se quita si no hay apartados, y se conserva si los hay.
{
  const os = require('os'), { execFileSync } = require('child_process');
  const ARBOL = require('../lib/arbol.cjs'), DIARIO = require('../lib/diario.cjs');
  const fuente = fs.readFileSync(path.join(R, 'pruebas/correr.mjs'), 'utf8');
  const bloque = /\nconst vigia = \{[\s\S]*?\n\};/.exec(fuente)?.[0];
  const hacer = bloque && new Function('RAIZ', 'ARBOL', 'DIARIO', 'existsSync', 'join', 'rmSync', 'mkdtempSync', 'tmpdir', 'unlinkSync', 'writeFileSync', 'mkdirSync', 'readFileSync', 'console', `${bloque}\nreturn vigia;`);
  const informe2 = (que, ok, extra) => { console.log(`  ${ok ? '✓' : '✗'} alParar (${que}) → ${extra}`); if (ok) bien++; };
  const escenario = (que, preparar, esperaDir) => {
    total++;
    const t = fs.mkdtempSync(path.join(os.tmpdir(), 'tolatino-alparar-'));
    let dir = null;
    try {
      const g = (...a) => execFileSync('git', a, { cwd: t, stdio: 'pipe' });
      g('init', '-q'); fs.writeFileSync(path.join(t, 'a.txt'), 'uno\n'); g('add', '.'); g('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'x');
      const v = hacer(t, ARBOL, DIARIO, fs.existsSync, path.join, fs.rmSync, fs.mkdtempSync, os.tmpdir, fs.unlinkSync, fs.writeFileSync, fs.mkdirSync, fs.readFileSync, { log() {}, error() {} });
      v.abrir(); v.ini = ARBOL.huella(t); v.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tolatino-alreves-ref-')); dir = v.dir;
      ARBOL.copiar(t, v.ini, v.dir); v.anotarSuite(0);
      preparar(t, v);
      v.alParar();
      const hay = fs.existsSync(v.dir);
      informe2(que, hay === esperaDir, `la copia ${hay ? 'sigue' : 'ya no está'}`);
    } catch (e) { informe2(que, false, String(e?.message ?? e).slice(0, 150)); }
    finally { if (dir) fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(t, { recursive: true, force: true }); }
  };
  if (!hacer) { total++; console.log('  ✗ alParar: no encontré el bloque vigia en pruebas/correr.mjs'); }
  else {
    escenario('árbol intacto, sin apartados: se quita la copia', () => {}, false);
    escenario('un archivo cambiado y restaurado, sin apartados: se quita la copia', (t) => fs.writeFileSync(path.join(t, 'a.txt'), 'dos\n'), false);
    escenario('con apartados: se conserva la copia', (t, v) => { fs.writeFileSync(path.join(t, 'nuevo.txt'), 'n\n'); fs.mkdirSync(path.join(v.dir, 'apartados')); }, true);
  }
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
