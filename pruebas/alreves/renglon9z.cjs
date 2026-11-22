// 22 nov · Revisión del CI (A6) · Un caso al revés cuenta como cazado SOLO si su guardián falló con su renglón [G]. De verdad, en una carpeta de
// prueba (fuera del repo) con un «guardianes/run.mjs» doble: una suite vieja («catch { cazado }») bajo la precarga del corredor
// (pruebas/lib/alreves-corredor.cjs) no cuenta como cazado un guardián desconocido (código 2), un run.mjs que revienta ni el renglón de OTRO
// guardián; y la precarga de textos.cjs (pruebas/lib/alreves-sin-guardian.cjs) dice «no existe el guardián» cuando el nombre no está en run.mjs.
// Guardián: alrevesCazadoConRenglon.
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const LIB = path.join(__dirname, '..', 'lib'), PRE = path.join(LIB, 'alreves-corredor.cjs'), TEX = path.join(LIB, 'alreves-sin-guardian.cjs');
let bien = 0, total = 0;
const ok = (c, que) => { total++; if (c) bien++; console.log(`  ${c ? '✓' : '✗'} ${que}`); };
const T = fs.mkdtempSync(path.join(os.tmpdir(), 'renglon9z-')), DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'renglon9z-diario-'));
fs.mkdirSync(path.join(T, 'guardianes'));
fs.writeFileSync(path.join(T, 'guardianes', 'run.mjs'), `const guardianes = {
  gX() {
  },
};
const m = process.env.DOBLE;
if (m === 'renglon') { console.error('\\n✗ 1 fallo(s) de guardianes:\\n  [gX] a.ts:1 — el defecto\\n'); process.exit(1); }
if (m === 'otro') { console.error('\\n✗ 1 fallo(s) de guardianes:\\n  [gY] a.ts:1 — otra cosa\\n'); process.exit(1); }
if (m === 'desconocido') { console.error('guardián desconocido: gX'); process.exit(2); }
if (m === 'revienta') throw new Error('se rompió run.mjs');
console.log('✓ guardianes: gX — sin fallos');
`);
// Una suite vieja: cualquier salida distinta de 0 es «cazado» (alreves5a … 8f).
const VIEJA = "const { execSync } = require('child_process'); let c = false; try { execSync('node guardianes/run.mjs --solo gX', { cwd: process.cwd(), stdio: 'pipe' }); } catch { c = true; } console.log(c ? 'CAZADO' : 'NO CAZADO');";
const suite = (doble, pre = PRE) => {
  const r = spawnSync(process.execPath, ['--require', pre, '-e', VIEJA], { cwd: T, encoding: 'utf8', env: { ...process.env, DOBLE: doble, ALREVES_CORREDOR: `${process.pid}:${'a'.repeat(64)}`, ALREVES_DIARIO: DIR, ALREVES_RAIZ: T } });
  return `${r.stdout}${r.stderr}`;
};
try {
  let o = suite('renglon');
  ok(/^CAZADO$/m.test(o) && !/✗/.test(o), 'el guardián falla con su renglón [gX]: cazado');
  o = suite('desconocido');
  ok(/^NO CAZADO$/m.test(o) && /✗ .*no salió con el renglón \[gX\]/.test(o), 'guardián desconocido (código 2): NO cuenta como cazado y lo dice con un ✗');
  o = suite('revienta');
  ok(/^NO CAZADO$/m.test(o) && /✗ .*no salió con el renglón \[gX\]/.test(o), 'run.mjs que revienta (código 1 sin renglón): NO cuenta como cazado');
  o = suite('otro');
  ok(/^NO CAZADO$/m.test(o) && /✗/.test(o), 'el renglón de OTRO guardián: NO cuenta como cazado');
  // Una suite nueva (mira el renglón por su cuenta: arma «[${g}]») queda como está: algunas esperan a propósito otro fallo.
  fs.writeFileSync(path.join(T, 'nueva.cjs'), "const { execSync } = require('child_process'); const g = 'gX'; try { execSync(`node guardianes/run.mjs --solo ${g}`, { stdio: 'pipe' }); console.log('PASO'); } catch (e) { console.log(String(e.stderr).includes(`[${g}]`) ? 'RENGLON' : 'OTRO FALLO'); }");
  o = (() => { const r = spawnSync(process.execPath, ['--require', PRE, path.join(T, 'nueva.cjs')], { cwd: T, encoding: 'utf8', env: { ...process.env, DOBLE: 'revienta', ALREVES_CORREDOR: `${process.pid}:${'a'.repeat(64)}`, ALREVES_DIARIO: DIR, ALREVES_RAIZ: T } }); return `${r.stdout}${r.stderr}`; })();
  ok(/^OTRO FALLO$/m.test(o) && !/no salió con el renglón/.test(o), 'una suite nueva (mira el renglón ella misma) recibe el fallo tal cual (alreves9vd espera un run.mjs que revienta)');
  o = suite('pasa');
  ok(/^NO CAZADO$/m.test(o) && !/✗/.test(o), 'el guardián pasa: no cazado, sin ruido de más (la suite lo cuenta)');
  // La precarga de textos.cjs: el nombre tiene que existir en run.mjs.
  o = suite('pasa', TEX);
  ok(!/no existe el guardián/.test(o), 'textos.cjs: un guardián que existe («  gX() {») no se marca');
  fs.writeFileSync(path.join(T, 'guardianes', 'run.mjs'), fs.readFileSync(path.join(T, 'guardianes', 'run.mjs'), 'utf8').replace('  gX() {', '  gXrenombrado() {'));
  o = suite('pasa', TEX);
  ok(/: no existe el guardián gX/.test(o), 'textos.cjs: un guardián renombrado se dice como «no existe el guardián gX» (textos.cjs lo cuenta como roto)');
} finally { fs.rmSync(T, { recursive: true, force: true }); fs.rmSync(DIR, { recursive: true, force: true }); }
console.log(`\n${bien}/${total} comprobaciones de «cazado con su renglón»`);
process.exit(bien === total ? 0 : 1);
