// Prueba al revés de ciSoloDocumentos (22 nov): un push a main que solo cambia documentos de trabajo no corre los carriles largos del CI, y eso no
// puede volverse un hueco para saltarse pruebas. Dos mitades:
//  (1) Casos directos del script (scripts/ci/alcance.mjs): listas de archivos → veredicto, y un repo de git de verdad (en una carpeta temporal,
//      fuera del repo) con commits de solo documentos, de mezcla, de renombre, con espacios, de docs/ayuda, rama nueva y git que falla.
//  (2) Al revés: cada caso rompe el script o el CI a propósito y el guardián tiene que fallar con SU mensaje; después se restaura y los
//      guardianes quedan limpios.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), os = require('os'), { execSync, execFileSync, spawnSync } = require('child_process');
const R = ENT.RAIZ, G = 'ciSoloDocumentos', S = 'scripts/ci/alcance.mjs', Y = '.github/workflows/ci.yml';
const soloTextos = !!process.env.ALREVES_SOLO_TEXTOS;
let bien = 0, total = 0;
const caso = (ok, que, extra = '') => { total++; if (ok) bien++; console.log(`  ${ok ? '✓' : '✗'} ${que}${extra ? ' → ' + extra : ''}`); };

// (1) Casos directos (no en textos.cjs: ahí no se escribe en disco y no hace falta).
if (!soloTextos) {
  const decidir = (listas) => JSON.parse(execFileSync(process.execPath, [path.join(R, S), '--decidir'], { input: JSON.stringify(listas), encoding: 'utf8' }));
  const D = [
    [['docs/PROGRESS.md'], 'documentos'], [['docs/PROGRESS.md', 'docs/REVISION.md', 'docs/DECISIONES.md', 'docs/HERRAMIENTAS.md', 'docs/PLAN.md'], 'documentos'],
    [[], 'todo'], [['docs/PROGRESS.md', 'apps/web/app/page.tsx'], 'todo'], [['docs/ayuda/x.md'], 'todo'], [['docs/PROGRESS.md', 'docs/ayuda/x.md'], 'todo'],
    [['docs/LAUNCH-CHECKLIST.md'], 'todo'], [['docs/legal/us/terminos.es.md'], 'todo'], [['docs/diseno/plan/fase8-apps.md'], 'todo'], [['CLAUDE.md'], 'todo'],
    [['package.json'], 'todo'], [['.github/workflows/ci.yml'], 'todo'], [['docs/PROGRESS.md '], 'todo'], [[' docs/PROGRESS.md'], 'todo'], [['docs/PROGRESS .md'], 'todo'],
    [['./docs/PROGRESS.md'], 'todo'], [['docs//PROGRESS.md'], 'todo'], [['docs/../apps/web/app/page.tsx'], 'todo'], [['docs/progress.md'], 'todo'],
    [['docs/PROGRESS.md\napps/x.ts'], 'todo'], [['"docs/PROGRESS.md"'], 'todo'], [['docs/PROGRESS.md/'], 'todo'], [['apps/docs/PROGRESS.md'], 'todo'],
    [null, 'todo'], ['docs/PROGRESS.md', 'todo'], [[1], 'todo'], [[null], 'todo'], [[{}], 'todo'],
  ];
  let r = null; try { r = decidir(D.map((x) => x[0])); } catch (e) { caso(false, 'el script responde --decidir', String(e.message).slice(0, 160)); }
  if (r) D.forEach(([l, v], i) => caso(r[i] === v, `veredicto ${JSON.stringify(l)} = ${v}`, r[i] === v ? '' : `dijo ${r[i]}`));
  const basura = spawnSync(process.execPath, [path.join(R, S), '--decidir'], { input: '{no es json', encoding: 'utf8' });
  caso(basura.stdout.trim() === '"todo"', 'entrada que no es JSON = todo', basura.stdout.trim());

  // Un repo de git de verdad, fuera del repo.
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'alcance-'));
  const git = (...a) => execFileSync('git', ['-c', 'user.name=prueba', '-c', 'user.email=prueba@ejemplo.invalid', '-c', 'commit.gpgsign=false', ...a], { cwd: T, encoding: 'utf8' }).trim();
  const escribe = (f, c) => { fs.mkdirSync(path.dirname(path.join(T, f)), { recursive: true }); fs.writeFileSync(path.join(T, f), c); };
  const commit = (m) => { git('add', '-A'); git('commit', '-q', '-m', m); return git('rev-parse', 'HEAD'); };
  const corre = (env) => {
    const o = path.join(T, '..', path.basename(T) + '.out'); fs.writeFileSync(o, '');
    const p = spawnSync(process.execPath, [path.join(R, S)], { cwd: T, encoding: 'utf8', env: { ...process.env, GITHUB_OUTPUT: o, ...env } });
    const out = fs.readFileSync(o, 'utf8'); fs.unlinkSync(o);
    return { sale: p.stdout, alcance: /^alcance=(.*)$/m.exec(out)?.[1], n: /^n=(.*)$/m.exec(out)?.[1] };
  };
  try {
    git('init', '-q', '-b', 'main');
    escribe('apps/web/a.ts', 'export const a = 1;\n'); escribe('docs/PROGRESS.md', '# p\n'); escribe('docs/REVISION.md', '# r\n'); escribe('docs/ayuda/x.md', '# x\n');
    const c0 = commit('base');
    escribe('docs/PROGRESS.md', '# p\nuna línea\n'); escribe('docs/REVISION.md', '# r\notra\n'); const c1 = commit('solo documentos');
    escribe('docs/PROGRESS.md', '# p\nuna línea\ndos\n'); escribe('apps/web/a.ts', 'export const a = 2;\n'); const c2 = commit('mezcla');
    git('mv', 'apps/web/a.ts', 'docs/PLAN.md'); const c3 = commit('renombre de código a un nombre de la lista');
    escribe('docs/PROGRESS .md', 'x\n'); const c4 = commit('ruta con espacio');
    escribe('docs/ayuda/x.md', '# x\ncambia\n'); const c5 = commit('docs/ayuda');
    escribe('docs/PROGRESS.md', '# solo\n'); const c6 = commit('solo PROGRESS');
    const P = (antes, despues, extra = {}) => corre({ EVENTO: 'push', ANTES: antes, DESPUES: despues, ...extra });
    const casosGit = [
      ['push de solo documentos (PROGRESS y REVISION)', P(c0, c1), 'documentos', '2'],
      ['push de un solo documento', P(c5, c6), 'documentos', '1'],
      ['push de mezcla (PROGRESS + código)', P(c1, c2), 'todo', '2'],
      ['varios commits juntos con código en medio', P(c1, c6), 'todo'],
      ['renombre de código a docs/PLAN.md (cuenta los dos nombres)', P(c2, c3), 'todo', '2'],
      ['ruta con espacio («docs/PROGRESS .md»)', P(c3, c4), 'todo', '1'],
      ['docs/ayuda (es producto)', P(c4, c5), 'todo', '1'],
      ['sin cambios (before = sha)', P(c6, c6), 'todo', '0'],
      ['rama nueva (before en ceros)', P('0'.repeat(40), c1), 'todo', '0'],
      ['sin before', P('', c1), 'todo', '0'],
      ['before que no es un SHA', P('main', c1), 'todo', '0'],
      ['before que no existe y sin remoto (git falla)', P('f'.repeat(40), c1), 'todo', '0'],
      ['pull_request (aunque sean solo documentos)', corre({ EVENTO: 'pull_request', ANTES: c0, DESPUES: c1 }), 'todo', '0'],
      ['programado', corre({ EVENTO: 'schedule', ANTES: c0, DESPUES: c1 }), 'todo', '0'],
      ['a mano', corre({ EVENTO: 'workflow_dispatch', ANTES: c0, DESPUES: c1 }), 'todo', '0'],
      ['sin evento', corre({ EVENTO: '', ANTES: c0, DESPUES: c1 }), 'todo', '0'],
    ];
    for (const [que, x, a, n] of casosGit) caso(x.alcance === a && (n === undefined || x.n === n), `git: ${que} = ${a}${n !== undefined ? ` (${n} archivos)` : ''}`, x.alcance === a && (n === undefined || x.n === n) ? '' : `dijo ${x.alcance} · n=${x.n} · ${x.sale.split('\n')[0]}`);
    const sinSalida = spawnSync(process.execPath, [path.join(R, S)], { cwd: T, encoding: 'utf8', env: { ...process.env, GITHUB_OUTPUT: '/dev/null/no-se-puede', EVENTO: 'push', ANTES: c0, DESPUES: c1 } });
    caso(sinSalida.status !== 0, 'si no puede escribir su salida, el script sale con error (y el CI escribe «todo»)', `salió con ${sinSalida.status}`);
  } finally { fs.rmSync(T, { recursive: true, force: true }); }
}

// (2) Al revés.
const L = '  "docs/PLAN.md",\n]);';
const casos = [
  // La lista: código, docs/ayuda, configuración, un patrón, algo que el producto lee, algo calculado, una segunda lista.
  [S, L, '  "docs/PLAN.md",\n  "apps/web/app/page.tsx",\n]);', 'no puede ser «solo documentos»'],
  [S, L, '  "docs/PLAN.md",\n  "docs/ayuda/inicio.md",\n]);', 'no puede ser «solo documentos»'],
  [S, L, '  "docs/PLAN.md",\n  "package.json",\n]);', 'no puede ser «solo documentos»'],
  [S, L, '  "docs/PLAN.md",\n  "docs/?.md",\n]);', 'no puede ser «solo documentos»'],
  [S, L, '  "docs/PLAN.md",\n  "docs/LAUNCH-CHECKLIST.md",\n]);', '«docs/LAUNCH-CHECKLIST.md» está en la lista de solo documentos y este archivo lo lee'],
  [S, L, '  "docs/PLAN.md",\n  ..."docs/X.md".split(","),\n]);', 'nada calculado'],
  [S, 'const DOC = new Set(DOCUMENTOS);', 'const DOC = new Set([...DOCUMENTOS, "apps/web/app/page.tsx"]);', 'la única lista'],
  // El script: un error que da «documentos», lista vacía, comparar por prefijo, «alguno» en vez de «todos», sin renombres, cualquier evento, rama nueva.
  [S, 'return { alcance: "todo", archivos: [], motivo: `error al calcular', 'return { alcance: "documentos", archivos: [], motivo: `error al calcular', 'con git que falla'],
  [S, 'archivos.length === 0) return "todo";', 'archivos.length === 0) return "documentos";', 'para []'],
  [S, 'typeof f === "string" && DOC.has(f)) ? "documentos"', 'typeof f === "string" && f.startsWith("docs/")) ? "documentos"', 'comparados tal cual'],
  [S, 'return archivos.every((f) =>', 'return archivos.some((f) =>', 'TODOS los archivos'],
  [S, 'git("diff", "--no-renames", "--name-only"', 'git("diff", "--name-only"', 'un renombre cuenta los dos nombres'],
  [S, 'if (evento !== "push") return { alcance: "todo"', 'if (evento === "nunca") return { alcance: "todo"', 'fuera de un push'],
  [S, ' || /^0+$/.test(antes)) return { alcance: "todo"', ') return { alcance: "todo"', 'rama nueva'],
  // El CI: «cambios» sin su red, otra vía para saltar un carril, verificar apagable, un filtro de archivos en «on:».
  [Y, 'run: node scripts/ci/alcance.mjs || echo "alcance=todo" >> "$GITHUB_OUTPUT"', 'run: node scripts/ci/alcance.mjs', 'falta el trabajo «cambios»'],
  [Y, 'run: node scripts/ci/alcance.mjs || echo "alcance=todo" >> "$GITHUB_OUTPUT"', 'run: node scripts/ci/alcance.mjs || echo "alcance=documentos" >> "$GITHUB_OUTPUT"', 'falta el trabajo «cambios»'],
  [Y, "!= 'documentos' && (inputs.alcance || 'todo') != 'pantallas' }}", "!= 'documentos' && github.event_name != 'push' && (inputs.alcance || 'todo') != 'pantallas' }}", '«regresion» se apaga en un push solo por el alcance'],
  [Y, '      - name: Regresión de ${{ matrix.nombre }} en base nueva\n', "      - name: Regresión de ${{ matrix.nombre }} en base nueva\n        if: ${{ github.event_name != 'push' }}\n", 'otra vía para no correr en un push'],
  [Y, "needs.cambios.outputs.alcance != 'documentos' && (inputs.alcance || 'todo') != 'regresion'", "needs.cambios.outputs.alcance == 'todo' && (inputs.alcance || 'todo') != 'regresion'", '«dispositivos» se apaga en un push solo por el alcance'],
  [Y, "    if: ${{ needs.cambios.outputs.alcance != 'documentos' }}\n    runs-on", "    if: ${{ needs.cambios.outputs.alcance != 'documentos' && !contains(github.event.head_commit.message, 'docs') }}\n    runs-on", '«web» se apaga en un push solo por el alcance'],
  [Y, '  push:\n    branches: [main]\n', '  push:\n    branches: [main]\n    paths-ignore: ["docs/**"]\n', 'no filtra por archivos'],
  [Y, '  verificar:\n    name: tipos · build · guardianes\n', "  verificar:\n    name: tipos · build · guardianes\n    needs: cambios\n    if: ${{ needs.cambios.outputs.alcance != 'documentos' }}\n", '«verificar» corre siempre'],
  // «tuberia»: sin «cambios», perdonar lo saltado fuera de un push o más allá de regresión y dispositivos, quitar el aviso.
  [Y, 'needs: [cambios, verificar,', 'needs: [verificar,', '«tuberia» depende de «cambios»'],
  [Y, "SOLO_DOCUMENTOS: ${{ github.event_name == 'push' && needs", 'SOLO_DOCUMENTOS: ${{ needs', 'solo perdona lo saltado por documentos en un push'],
  [Y, 'const porDocs = docs && (k === "regresion" || k === "dispositivos");', 'const porDocs = docs;', 'solo regresión y dispositivos'],
  [Y, '"solo documentos: " + process.env.N_DOCUMENTOS + " archivos; los carriles largos no corren por diseño"', '"solo documentos"', 'con todas las letras'],
];
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return []; }
  catch (e) { return String(e.stderr).split('\n').filter((x) => x.trim().startsWith(`[${G}]`)); }
};
for (const [f, a, b, msg] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let lineas; try { lineas = correr(); } finally { fs.writeFileSync(ruta, orig); }
  const l = soloTextos ? lineas[0] : lineas.find((x) => x.includes(msg));
  caso(!!l, `${G} al revés (${path.basename(f)}: «${msg}»)`, l ? l.trim().slice(0, 200) : lineas.length ? 'otro mensaje: ' + lineas[0].trim().slice(0, 160) : 'el guardián no falló');
}
let limpio = true;
try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
