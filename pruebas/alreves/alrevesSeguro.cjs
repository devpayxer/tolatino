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
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
