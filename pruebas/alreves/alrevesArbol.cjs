// Prueba al revés del guardián alrevesArbolIdentico (22 nov, revisión del CI A2): el corredor vigila el árbol en el carril «al revés». Cada caso
// siembra un defecto en pruebas/correr.mjs, pruebas/lib/arbol.cjs o ci.yml; el guardián debe fallar con SU renglón ([alrevesArbolIdentico]); se restaura.
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const R = path.resolve(__dirname, '..', '..');
const G = 'alrevesArbolIdentico', C = 'pruebas/correr.mjs', A = 'pruebas/lib/arbol.cjs', Y = '.github/workflows/ci.yml';
const casos = [
  [C, 'if (t.carril === "alreves") r = vigia.despues(t, r);', ''],
  [C, 'd = ARBOL.diferencias(this.ini, ARBOL.huella(RAIZ))', 'd = ARBOL.diferencias(ARBOL.huella(RAIZ), ARBOL.huella(RAIZ))'],
  [C, 'const o = ARBOL.restaurar(RAIZ, this.ini, this.dir), otra', 'const o = { restaurados: [], apartados: [], carpetas: [] }, otra'],
  [C, 'if (otra.length) { this.cortado =', 'if (false) { this.cortado ='],
  [C, 'if (!r.ok) { this.cortado = "la pasada real', 'if (false) { this.cortado = "la pasada real'],
  [C, 'spawn("node", ["guardianes/run.mjs"], ', 'spawn("node", ["guardianes/run.mjs", "--solo", "alrevesArbolIdentico"], '],
  [C, 'const env = { ...ENV }; delete env.ALREVES_CORREDOR;', 'const env = { ...ENV };'],
  [C, 'execSync("git rev-parse --verify -q HEAD~1", ', 'execSync("git rev-parse --verify -q HEAD", '],
  [C, 'rs.push(await pasadaReal("final"));', 'void 0;'],
  [C, 'const ARBOL = createRequire(import.meta.url)("./lib/arbol.cjs");', 'let ARBOL = null;'],
  [A, "'.turbo', '.pnpm-store']);", "'.turbo', '.pnpm-store', 'migrations']);"],
  [A, 'if (!hijos.length && rel) vacias.push(rel);', ''],
  [A, "${st.mode & 0o100 ? '755' : '644'}", '${(st.mode & 0o777).toString(8)}'],
  [A, "'refs/remotes/origin/produccion', 'refs/remotes/origin/pruebas'];", "'refs/remotes/origin/produccion'];"],
  [A, 'try { fs.renameSync(src, dst); }', 'try { fs.unlinkSync(src); }'],
  [Y, 'leen versiones viejas de archivos con «git show <sha>».\n      - uses: actions/checkout@v4\n        with: { fetch-depth: 0 }', 'leen versiones viejas de archivos con «git show <sha>».\n      - uses: actions/checkout@v4\n        with: { fetch-depth: 1 }'],
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
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
