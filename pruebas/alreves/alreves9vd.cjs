// Prueba al revés de ciSoloDocumentos (22 nov): un push a main que solo cambia documentos de trabajo no corre los carriles largos del CI, y eso no
// puede volverse un hueco para saltarse pruebas. Dos mitades:
//  (1) Casos directos del script (scripts/ci/alcance.mjs): listas de archivos → veredicto, y un repo de git de verdad (en una carpeta temporal,
//      fuera del repo) con commits de solo documentos, de mezcla, de renombre, con espacios, de docs/ayuda, rama nueva y git que falla.
//  (2) Al revés: cada caso rompe el script o el CI a propósito y el guardián tiene que fallar con SU mensaje; después se restaura y los
//      guardianes quedan limpios.
// 22 nov · «documentos» además exige que el código (el ancla) tenga una corrida de push en verde con los carriles largos corridos: casos con la
// API de GitHub de mentira (nunca se llama a GitHub aquí), uno por rama de la decisión, y los commits reales del 21 nov (ceaaba2, ec26b14,
// b990f36 sobre 4ee2ae2 y 026bbaf) y del 22 (e640f59 sobre 3559997).
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
    const p = spawnSync(process.execPath, [path.join(R, S)], { cwd: T, encoding: 'utf8', env: { ...process.env, GITHUB_OUTPUT: o, GH_TOKEN: '', REPO: '', ...env } });
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
      // Sin token no hay a quién preguntar si el código quedó confirmado: «todo» (con la API de mentira, abajo).
      ['push de solo documentos sin token para preguntar', P(c0, c1), 'todo', '2'],
      ['push de un solo documento sin token para preguntar', P(c5, c6), 'todo', '1'],
      ['push de solo documentos con token pero sin repo', P(c0, c1, { GH_TOKEN: 'x' }), 'todo', '2'],
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

    // La decisión con la API de mentira: el módulo, en un proceso aparte (ESM), con el mundo de corridas que dice cada caso.
    escribe('docs/PROGRESS.md', '# d1\n'); const d1 = commit('documentos sobre c6');
    escribe('docs/REVISION.md', '# d2\n'); const d2 = commit('documentos sobre d1');
    escribe('apps/web/b.ts', 'export const b = 1;\n'); const k1 = commit('código');
    let ult = k1; for (let i = 0; i < 21; i++) { escribe('docs/PROGRESS.md', `# ${i}\n`); ult = commit(`documentos ${i}`); }
    const muchos = ult; escribe('docs/PROGRESS.md', '# fin\n'); const trasMuchos = commit('documentos tras 21');
    const REP = 'o/r';
    const trabajos = (x = {}) => {
      const j = (name, conclusion = 'success') => ({ name, status: 'completed', conclusion });
      let js = [j('alcance (todo o solo documentos)'), j('tipos · build · guardianes'), j('seguridad · Semgrep (reglas propias) · dependencias'), j('web · build una vez para todos los grupos'),
        ...[1, 2, 3, 4].flatMap((i) => [j(`punta a punta · al revés · ${i}/4`), j(`punta a punta · todas las fases · ${i}/4`)]),
        ...['iphone-se', 'iphone-15', 'iphone-15-pro-max', 'pixel', 'galaxy', 'ipad', 'escritorio-1024', 'escritorio-1280', 'escritorio-1440'].map((d) => j(`dispositivo · ${d}`)),
        j('confirmación · ${{ matrix.nombre }}', 'skipped'), j('punta a punta · ancho ${{ matrix.id }}', 'skipped'), j('la tubería completa (todo en verde, nada saltado)')];
      if (x.saltados) js = js.map((t) => (x.saltados.test(t.name) ? j(t.name, 'skipped') : t));
      if (x.rojo) js = js.map((t) => (x.rojo.test(t.name) ? j(t.name, 'failure') : t));
      if (x.sin) js = js.filter((t) => !x.sin.test(t.name));
      return js;
    };
    let id = 100;
    const corrida = (sha, x = {}, tj = {}) => ({ run: { id: ++id, head_sha: sha, event: 'push', head_branch: 'main', path: '.github/workflows/ci.yml', repository: { full_name: REP }, head_repository: { full_name: REP }, status: 'completed', conclusion: 'success', ...x }, trabajos: tj === 'cae' ? 'cae' : trabajos(tj) });
    const DOCS = /^(web|punta a punta · (al revés|todas las fases)|dispositivo) /;
    const decide = (casos) => {
      const codigo = `import { alcance } from ${JSON.stringify(require('url').pathToFileURL(path.join(R, S)).href)};
        import { readFileSync } from "node:fs";
        const casos = JSON.parse(readFileSync(0, "utf8"));
        const re = (x) => (x ? new RegExp(x) : null);
        console.log(JSON.stringify(casos.map((c) => {
          let llamadas = 0;
          const api = c.mundo === null ? null : {
            corridas: (sha) => { llamadas++; if (c.mundo === "cae") throw new Error("503 de mentira"); if (c.mundo === "rara") return { message: "rate limit" }; return (c.mundo[sha] ?? []).map((x) => x.run); },
            trabajos: (id) => { llamadas++; for (const xs of Object.values(c.mundo)) for (const x of xs) if (x.run.id === id) { if (x.trabajos === "cae") throw new Error("lista de trabajos incompleta"); return x.trabajos; } throw new Error("sin esa corrida"); },
          };
          const r = alcance({ evento: c.evento ?? "push", antes: c.antes, despues: c.despues, cwd: c.cwd, repo: "${REP}", api, traer: () => {} });
          return { alcance: r.alcance, ancla: r.ancla ?? "", corrida: r.corrida ?? "", motivo: r.motivo, llamadas };
        })));`;
      const p = spawnSync(process.execPath, ['--input-type=module', '-e', codigo], { cwd: R, encoding: 'utf8', input: JSON.stringify(casos), env: { ...process.env, GH_TOKEN: '', REPO: '' } });
      try { return JSON.parse(p.stdout); } catch { caso(false, 'el módulo de alcance responde', String(p.stderr).slice(0, 300)); return null; }
    };
    const verdeDe = (sha) => ({ [sha]: [corrida(sha)] });
    const CA = [
      ['documentos sobre un código confirmado (corrida de push en verde y completa)', { antes: c0, despues: c1, mundo: verdeDe(c0) }, 'documentos', c0],
      ['el código del before no tiene ninguna corrida (evento perdido o [skip ci])', { antes: c0, despues: c1, mundo: {} }, 'todo', c0],
      ['documentos sobre un main rojo', { antes: c0, despues: c1, mundo: { [c0]: [corrida(c0, { conclusion: 'failure' }, { rojo: /^punta a punta · todas las fases · 2\/4$/ })] } }, 'todo', c0],
      ['documentos sobre una corrida cancelada a mano', { antes: c0, despues: c1, mundo: { [c0]: [corrida(c0, { conclusion: 'cancelled' })] } }, 'todo', c0],
      ['cola sustituida: el código se canceló sin correr ningún trabajo', { antes: c0, despues: c1, mundo: { [c0]: [{ ...corrida(c0, { conclusion: 'cancelled' }), trabajos: [] }] } }, 'todo', c0],
      ['la corrida del código todavía en curso', { antes: c0, despues: c1, mundo: { [c0]: [corrida(c0, { status: 'in_progress', conclusion: null })] } }, 'todo', c0],
      ['la corrida del código fue a su vez de solo documentos (carriles saltados) aunque salió verde', { antes: c0, despues: c1, mundo: { [c0]: [corrida(c0, {}, { saltados: DOCS })] } }, 'todo', c0],
      ['la corrida del código saltó solo los dispositivos', { antes: c0, despues: c1, mundo: { [c0]: [corrida(c0, {}, { saltados: /^dispositivo /, })] } }, 'todo', c0],
      ['a la corrida del código le falta una parte de «al revés»', { antes: c0, despues: c1, mundo: { [c0]: [corrida(c0, {}, { sin: /^punta a punta · al revés · 4\/4$/ })] } }, 'todo', c0],
      ['la única corrida verde del código es de pull_request', { antes: c0, despues: c1, mundo: { [c0]: [corrida(c0, { event: 'pull_request' })] } }, 'todo', c0],
      ['la única corrida verde del código es a mano', { antes: c0, despues: c1, mundo: { [c0]: [corrida(c0, { event: 'workflow_dispatch' })] } }, 'todo', c0],
      ['la única corrida verde del código es de otra rama', { antes: c0, despues: c1, mundo: { [c0]: [corrida(c0, { head_branch: 'trabajo' })] } }, 'todo', c0],
      ['la corrida verde es de un fork', { antes: c0, despues: c1, mundo: { [c0]: [corrida(c0, { head_repository: { full_name: 'otro/r' } })] } }, 'todo', c0],
      ['una corrida roja y después otra completa en verde del mismo commit', { antes: c0, despues: c1, mundo: { [c0]: [corrida(c0, { conclusion: 'failure' }), corrida(c0)] } }, 'documentos', c0],
      ['la API de corridas cae (sin red, sin permiso)', { antes: c0, despues: c1, mundo: 'cae' }, 'todo', c0],
      ['la API responde algo que no es una lista', { antes: c0, despues: c1, mundo: 'rara' }, 'todo', c0],
      ['la lista de trabajos llega incompleta', { antes: c0, despues: c1, mundo: { [c0]: [corrida(c0, {}, 'cae')] } }, 'todo', c0],
      ['sin API (sin token)', { antes: c0, despues: c1, mundo: null }, 'todo', c0],
      ['documentos sobre documentos: se sigue hasta el código (2 pasos) y está confirmado', { antes: d1, despues: d2, mundo: verdeDe(c5) }, 'documentos', c5],
      ['documentos sobre documentos: el código de atrás no está confirmado', { antes: d1, despues: d2, mundo: {} }, 'todo', c5],
      ['documentos sobre documentos: solo el commit de documentos tiene corrida (el ancla es el código, no él)', { antes: d1, despues: d2, mundo: verdeDe(d1) }, 'todo', c5],
      ['21 commits seguidos de solo documentos: pasa el tope, sin ancla', { antes: muchos, despues: trasMuchos, mundo: verdeDe(k1) }, 'todo', ''],
      ['mezcla con código: no pregunta a la API', { antes: c1, despues: c2, mundo: verdeDe(c1) }, 'todo', ''],
      ['fuera de un push no pregunta a la API', { evento: 'workflow_dispatch', antes: c0, despues: c1, mundo: verdeDe(c0) }, 'todo', ''],
    ];
    const RC = decide(CA.map(([, c]) => ({ ...c, cwd: T })));
    if (RC) CA.forEach(([que, c, a, ancla], i) => {
      const x = RC[i], ok = x.alcance === a && x.ancla === ancla && (!/no pregunta a la API/.test(que) || x.llamadas === 0);
      caso(ok, `API de mentira: ${que} = ${a}`, ok ? (x.corrida ? `corrida ${x.corrida}` : '') : `dijo ${x.alcance} · ancla ${x.ancla.slice(0, 7)} · ${x.llamadas} llamadas · ${x.motivo.slice(0, 140)}`);
    });
    // El caso real del 21 nov, con los commits del repo: 4ee2ae2 (código) terminó roja; 026bbaf (documentos + LAUNCH) se canceló en la cola;
    // ceaaba2 (código: LAUNCH, oficios-publico, sql9u) la sustituyó y se canceló con 0 trabajos; ec26b14 y b990f36 (solo documentos) encima.
    // Con la regla vieja ec26b14 y b990f36 salían verdes sin que nadie corriera ceaaba2. Y e640f59 (documentos) sobre 3559997 (completa en verde).
    const real = (c) => { try { return execFileSync('git', ['rev-parse', '-q', '--verify', `${c}^{commit}`], { cwd: R, encoding: 'utf8' }).trim(); } catch { return ''; } };
    const RL = Object.fromEntries(['4ee2ae2', '026bbaf', 'ceaaba2', 'ec26b14', 'b990f36', 'cd7f7d0', '3559997', 'e640f59'].map((c) => [c, real(c)]));
    const faltan = Object.entries(RL).filter(([, v]) => !v).map(([k]) => k);
    if (faltan.length) caso(false, 'los commits reales del 21 y 22 nov están en el repo (hace falta la historia: fetch-depth 0)', `faltan ${faltan.join(' ')}`);
    else {
      const mundo21 = { [RL['4ee2ae2']]: [corrida(RL['4ee2ae2'], { conclusion: 'failure' }, { rojo: /^punta a punta · al revés · 1\/4$/ })], [RL['026bbaf']]: [{ ...corrida(RL['026bbaf'], { conclusion: 'cancelled' }), trabajos: [] }],
        [RL.ceaaba2]: [{ ...corrida(RL.ceaaba2, { conclusion: 'cancelled' }), trabajos: [] }], [RL.cd7f7d0]: [corrida(RL.cd7f7d0)], [RL['3559997']]: [corrida(RL['3559997'])] };
      const CR = [
        ['026bbaf sobre 4ee2ae2 (trae LAUNCH: no son solo documentos)', { antes: RL['4ee2ae2'], despues: RL['026bbaf'], mundo: mundo21 }, 'todo', ''],
        ['ec26b14 sobre ceaaba2 (cancelado con 0 trabajos)', { antes: RL.ceaaba2, despues: RL.ec26b14, mundo: mundo21 }, 'todo', RL.ceaaba2],
        ['b990f36 sobre ec26b14 (se sigue hasta ceaaba2, que nunca corrió)', { antes: RL.ec26b14, despues: RL.b990f36, mundo: mundo21 }, 'todo', RL.ceaaba2],
        ['b990f36 si ceaaba2 hubiera corrido completa y en verde', { antes: RL.ec26b14, despues: RL.b990f36, mundo: { ...mundo21, [RL.ceaaba2]: [corrida(RL.ceaaba2)] } }, 'documentos', RL.ceaaba2],
        ['e640f59 sobre 3559997 (completa en verde)', { antes: RL['3559997'], despues: RL.e640f59, mundo: mundo21 }, 'documentos', RL['3559997']],
        ['e640f59 si la de 3559997 hubiera sido de solo documentos', { antes: RL['3559997'], despues: RL.e640f59, mundo: { [RL['3559997']]: [corrida(RL['3559997'], {}, { saltados: DOCS })] } }, 'todo', RL['3559997']],
      ];
      const rr = decide(CR.map(([, c]) => ({ ...c, cwd: R })));
      if (rr) CR.forEach(([que, , a, ancla], i) => caso(rr[i].alcance === a && rr[i].ancla === ancla, `caso real: ${que} = ${a}`, rr[i].alcance === a && rr[i].ancla === ancla ? '' : `dijo ${rr[i].alcance} · ancla ${rr[i].ancla.slice(0, 7)} · ${rr[i].motivo.slice(0, 160)}`));
    }
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
  [S, 'git("diff", "--no-renames", "--name-only", "-z", antes, despues)', 'git("diff", "--name-only", "-z", antes, despues)', 'un renombre cuenta los dos nombres'],
  [S, 'git("diff", "--no-renames", "--name-only", "-z", p, x)', 'git("diff", "--name-only", "-z", p, x)', 'el ancla se busca hacia atrás'],
  [S, 'if (evento !== "push") return { alcance: "todo"', 'if (evento === "nunca") return { alcance: "todo"', 'fuera de un push'],
  [S, ' || /^0+$/.test(antes)) return { alcance: "todo"', ') return { alcance: "todo"', 'rama nueva'],
  // 22 nov · El código de un push de documentos tiene que estar confirmado: quitar la pregunta, el recorrido hacia atrás o su tope, o abrir una
  // puerta por el entorno (una API de mentira) es un hueco.
  [S, 'if (!c.ok) return { alcance: "todo"', 'if (c.ok === "nunca") return { alcance: "todo"', 'quedó confirmado por una corrida de push en verde'],
  [S, 'const c = confirmadoEnGithub(ancla.sha, { repo, api });', 'const c = { ok: true, corrida: 0 };', 'quedó confirmado por una corrida de push en verde'],
  [S, 'for (let i = 0; i <= tope; i++)', 'for (let i = 0; ; i++)', 'el ancla se busca hacia atrás'],
  [S, '!== "documentos") return { sha: x, pasos: i };', '!== "nunca") return { sha: x, pasos: i };', 'el ancla se busca hacia atrás'],
  [S, 'api: process.env.GH_TOKEN ? apiGh({ repo }) : null', 'api: process.env.API_DE_PRUEBA ? JSON.parse(process.env.API_DE_PRUEBA) : process.env.GH_TOKEN ? apiGh({ repo }) : null', 'solo lee EVENTO, ANTES, DESPUES, REPO, GH_TOKEN'],
  // Qué corrida confirma (scripts/ci/corrida.mjs): saltado como verde, cualquier evento, cualquier repo, sin carriles, sin un dispositivo.
  ['scripts/ci/corrida.mjs', 'const verde = (j) => j?.status === "completed" && j?.conclusion === "success";', 'const verde = (j) => j?.status === "completed" && (j?.conclusion === "success" || j?.conclusion === "skipped");', 'NO puede confirmar'],
  ['scripts/ci/corrida.mjs', 'if (r.event !== "push") return no(', 'if (r.event === "nunca") return no(', 'evento pull_request: NO puede confirmar'],
  ['scripts/ci/corrida.mjs', 'if (r.head_branch !== "main") return no(', 'if (r.head_branch === "nunca") return no(', 'otra rama: NO puede confirmar'],
  ['scripts/ci/corrida.mjs', ' || r.head_repository?.full_name !== repo) return no(', ') return no(', 'otro repositorio (fork): NO puede confirmar'],
  ['scripts/ci/corrida.mjs', 'if (r.status !== "completed" || r.conclusion !== "success") return no(', 'if (r.status !== "completed") return no(', 'corrida roja: NO puede confirmar'],
  ['scripts/ci/corrida.mjs', 'for (const c of CARRILES) {', 'for (const c of []) {', 'falta una parte de «al revés»: NO puede confirmar'],
  ['scripts/ci/corrida.mjs', 'opcional = /^(confirmación|punta a punta · ancho) /', 'opcional = /^(confirmación|punta a punta) /', 'otro carril de punta a punta saltado (solo confirmación y anchos pueden faltar): NO puede confirmar'],
  ['scripts/ci/corrida.mjs', '"galaxy", ', '', 'DISPOSITIVOS de corrida.mjs'],
  [Y, '    permissions: { contents: read, actions: read }\n    outputs:\n      alcance:', '    permissions: { contents: write, actions: read }\n    outputs:\n      alcance:', 'un token de solo lectura'],
  [Y, ', REPO: "${{ github.repository }}", GH_TOKEN: "${{ github.token }}" }', ' }', 'falta el trabajo «cambios»'],
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
