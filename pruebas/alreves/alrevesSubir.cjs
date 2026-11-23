// Prueba al revés de subidaConHerramienta (22 nov, revisión del CI, tanda 6a): la herramienta de subida (scripts/ci/subir.mjs) y lo que ci.yml
// publica para ella. Dos mitades:
//  (1) Sus casos puros en verde (node scripts/ci/subir.mjs --casos: clases, dirigida, evidencia, base, empuje y sandbox, sin red).
//  (2) Al revés: cada caso rompe una regla a propósito (en la herramienta, en ci.yml o en deploy.sh) y el guardián tiene que fallar con SU
//      mensaje; después se restaura y los guardianes quedan limpios. Las reglas de lógica (árbol, documentos, propuesta, main, conclusión de la
//      API, nombres) las caza el guardián corriendo los casos: cada defecto tiene que tumbar el caso que lo vigila.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync, spawnSync } = require('child_process');
const R = ENT.RAIZ, G = 'subidaConHerramienta', S = 'scripts/ci/subir.mjs', Y = '.github/workflows/ci.yml', D = 'infra/pruebas/deploy.sh';
const soloTextos = !!process.env.ALREVES_SOLO_TEXTOS;
// Los nombres de la lista de documentos de trabajo, sacados de alcance.mjs (escritos aquí, ciSoloDocumentos diría que esta prueba los lee).
const DOCS = [...(/export const DOCUMENTOS = Object\.freeze\(\[([\s\S]*?)\]\);/.exec(fs.readFileSync(path.join(R, 'scripts/ci/alcance.mjs'), 'utf8'))?.[1] ?? '').matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const ULT = DOCS[DOCS.length - 1] ?? '(sin lista)';
let bien = 0, total = 0;
const caso = (ok, que, extra = '') => { total++; if (ok) bien++; console.log(`  ${ok ? '✓' : '✗'} ${que}${extra ? ' → ' + extra : ''}`); };

// (1) Los casos puros.
if (!soloTextos) {
  const p = spawnSync(process.execPath, [path.join(R, S), '--casos'], { cwd: R, encoding: 'utf8', timeout: 60000 });
  const fin = /(\d+)\/(\d+) casos de subir/.exec(p.stdout ?? '');
  caso(p.status === 0 && fin && fin[1] === fin[2] && Number(fin[2]) >= 40, 'los casos puros de subir.mjs pasan', fin ? `${fin[1]}/${fin[2]}` : String(p.stderr).slice(0, 200));
}

// (2) Al revés.
const casos = [
  // La programada en su propio grupo.
  [Y, "(github.event_name == 'workflow_dispatch' || github.event_name == 'schedule') && format('-{0}', github.run_id)", "github.event_name == 'workflow_dispatch' && format('-{0}', github.run_id)", 'la corrida programada y las de a mano van en su propio grupo'],
  // La lista de documentos se importa, no se copia.
  [S, 'import { DOCUMENTOS, veredicto } from "./alcance.mjs";', `import { veredicto } from "./alcance.mjs";\nconst DOCUMENTOS = Object.freeze(${JSON.stringify(DOCS.slice(0, 2))});`, 'importa DOCUMENTOS de scripts/ci/alcance.mjs'],
  [S, 'const DOC = new Set(DOCUMENTOS);', `const DOC = new Set([...DOCUMENTOS, "docs/LAUNCH-CHECKLIST.md", ${JSON.stringify(ULT)}]);`, `copia DOCUMENTOS («${ULT}» escrito a mano)`],
  // Nunca forzado, nunca a otra rama, nunca fuera de planDeEmpuje.
  [S, 'args: ["push", "--atomic", "origin", "HEAD:main", "HEAD:pruebas"]', 'args: ["push", "--atomic", "--force", "origin", "HEAD:main", "HEAD:pruebas"]', 'nunca fuerza ni borra ramas'],
  [S, 'args: ["push", "origin", "HEAD:main"]', 'args: ["push", "-f", "origin", "HEAD:main"]', 'nunca fuerza ni borra ramas'],
  [S, 'args: ["push", "origin", "HEAD:pruebas"]', 'args: ["push", "origin", "+HEAD:pruebas"]', 'nunca fuerza ni borra ramas'],
  [S, 'args: ["push", "origin", "HEAD:pruebas"]', 'args: ["push", "origin", "HEAD:produccion"]', 'empuja a «HEAD:produccion»'],
  [S, '  // d.\n', '  // d.\n  spawnSync("git", ["push", "origin", "HEAD:main"], { cwd: RAIZ });\n', 'un push fuera de planDeEmpuje'],
  // La dirigida, siempre en partes y desde una sola orden.
  [S, 'export const PARTES_DIRIGIDA = 4;', 'export const PARTES_DIRIGIDA = 1;', 'la dirigida va siempre en partes'],
  [S, '"-f", `partes=${PARTES_DIRIGIDA}`, ', '', 'la dirigida va siempre en partes'],
  [S, '  gh(...args);\n', '  gh(...args);\n  gh("workflow", "run", "ci.yml", "--repo", repo, "--ref", rama);\n', 'ci.yml se lanza desde un solo sitio'],
  // La clase «despliegue» cubre lo que leen deploy.sh, compose y el trabajo «imagenes».
  [S, '/^\\.dockerignore$/, ', '', 'la clase despliegue no cubre .dockerignore'],
  [S, '/^scripts\\/semilla\\/demos\\//, ', '', 'la clase despliegue no cubre scripts/semilla/demos'],
  [S, '/^services\\/[^/]+\\//, ', '', 'la clase despliegue no cubre services/moderacion-img'],
  [S, '/^pruebas\\/infra\\//,', '', 'la clase despliegue no cubre pruebas/infra/correr.sh'],
  [D, 'bash "$REPO/packages/db/migrar.sh" "${COMPOSE[@]}"', 'bash "$REPO/packages/db/migrar.sh" "${COMPOSE[@]}"\nbash "$REPO/scripts/zz-nuevo/paso.sh"', 'la clase despliegue no cubre scripts/zz-nuevo/paso.sh'],
  // La lógica, por sus casos: cada defecto tumba el caso que lo vigila.
  [S, 'if (ev.arbol !== arbolHead && !(', 'if (false && !(', 'evidencia de otro árbol → FALTA'],
  [S, 'difRunHead.length && veredicto(difRunHead) === "documentos"))', 'difRunHead.length))', 'documentos + código, o árbol distinto sin lista de diferencias → FALTA'],
  [S, 'const faltan = propuesta.filter((p) => !cubre(p));', 'const faltan = [];', 'corrida verde pero sin la prueba propuesta → FALTA'],
  [S, 'if (!verde(tub[0])) return no(', 'if (false) return no(', '«la tubería» no verde (roja o saltada) → FALTA'],
  [S, 'if (run.status !== "completed" || run.conclusion !== "success") return no(`la corrida terminó', 'if (run.status !== "completed") return no(`la corrida terminó', 'la corrida no está en verde según la API → FALTA'],
  [S, 'out.push(mainEsAncestro ? ', 'out.push(true ? ', 'main avanzó → FALTA'],
  [S, 'const alrevesEntero = archivos.some((f) => casa(AL_REVES_ENTERO, f));\n  return { pruebas', 'const alrevesEntero = false;\n  return { pruebas', 'toca guardianes/run.mjs (o pruebas/correr.mjs, pruebas/lib/) → al revés entero'],
  [S, 'if (!t) { errores.push(`no existe la prueba «${n}»`); continue; }', 'if (!t) continue;', 'un nombre inexistente en --mas → error antes de lanzar'],
  [S, 'const soloDocumentos = veredicto(lista) === "documentos";', 'const soloDocumentos = lista.some((f) => DOC.has(f));', 'documentos + código → no es solo documentos'],
  [S, '  if (cl.includes("despliegue")) {\n', '  if (false) {\n', 'main primero, esperar imágenes, después pruebas'],
  [S, 'if (completa) {', 'if (false) {', 'toca .github/ y la corrida es una dirigida → FALTA'],
  // 23 nov · La vía rápida de diseño (decisión AL).
  [S, '  /^apps\\/web\\/public\\/paginas\\/[^/]+\\.webp$/,\n', '  /^apps\\/web\\/public\\/paginas\\/[^/]+\\.webp$/,\n  /^apps\\/web\\/lib\\/.*\\.(tsx|ts)$/,\n', 'la lista blanca de diseño cubre apps/web/lib/ficha.tsx'],
  [S, '  /^apps\\/web\\/lib\\//, /^apps\\/web\\/app\\/api\\//, ', '  /^apps\\/web\\/app\\/api\\//, ', 'la vía rápida de diseño deja pasar apps/web/lib/ficha.tsx'],
  [S, '    return { locales: ["tipos", "build", "guardianes", "textos"], corrida: "despues", mainPrimero: false };', '    return { locales: ["tipos", "guardianes", "textos"], corrida: "despues", mainPrimero: false };', 'solo diseño exige build local además de tipos, guardianes y textos'],
  [S, '  build: ["pnpm", ["--filter", "@tolatino/web", "build"]],', '  build: ["pnpm", ["exec", "tsc", "--noEmit"]],', 'solo diseño exige build local: PASOS_LOCALES.build es el mismo comando'],
  [S, '  if (!noDiseno) { const v = VIGILADAS.find((k) => cl.has(k)); if (v) noDiseno', '  if (!noDiseno) { const v = VIGILADAS.find((k) => cl.has(k) && false); if (v) noDiseno', 'una entrega con una clase vigilada sale por la vía rápida de diseño (sensible por centavos)'],
  [S, '  if (c.diseno === true && !sinViaRapida && !c.github && !c.clases.some((k) => VIGILADAS.includes(k)) && c.clases.includes("diseno"))', '  if (c.diseno === true && !sinViaRapida && !c.github)', 'una entrega con una clase vigilada sale por la vía rápida de diseño (exigencias con «sensible»)'],
  [S, '  else if (!c2) noDiseno = `${sinMain}', '  else if (true) noDiseno = "";\n  else if (!c2) noDiseno = `${sinMain}', 'la vía rápida de diseño necesita que la cabeza y origin/main la den'],
  [S, 'console.log(`VÍA RÁPIDA DE DISEÑO (AL): las pruebas de punta a punta y al revés corren DESPUÉS, en la corrida de push de main: ${donde}`);', 'console.log(`subido: ${donde}`);', '--subir por la vía rápida dice al final que la punta a punta y «al revés» corren DESPUÉS'],
  [S, '  if (rapida) avisoDespues({ repo, head, pruebas: p.d.pruebas });\n  return 0;', '  return 0;', '--subir por la vía rápida dice al final que la punta a punta y «al revés» corren DESPUÉS'],
  // ci.yml: cada corrida dice de qué es y la evidencia solo sale con todo en verde.
  [Y, "run-name: \"CI · ${{ github.event_name }} · ${{ github.ref_name }}${{ github.event_name == 'workflow_dispatch' && format(' · alcance={0} · partes={1} · solo=«{2}»', inputs.alcance, inputs.partes, inputs.solo) || '' }}\"\n", '', 'run-name: cada corrida dice evento, alcance, partes y «solo»'],
  [Y, '      - name: Evidencia de la corrida (solo con todo en verde; scripts/ci/subir.mjs la lee del registro de este trabajo)\n', '      - name: Evidencia de la corrida (solo con todo en verde; scripts/ci/subir.mjs la lee del registro de este trabajo)\n        if: always()\n', 'la evidencia solo sale con todo en verde'],
  [Y, 'console.log(["EVID", "ENCIA"].join("") + " " + j);', 'console.log("EVIDENCIA " + j);', 'no lleva la palabra EVIDENCIA entera'],
  [Y, '          test "$(git rev-parse HEAD)" = "$SHA"\n', '', 'la evidencia lleva el commit comprobado'],
  [Y, '          ENTRADAS: ${{ toJSON(inputs) }}\n', '          ENTRADAS: "{}"\n', 'la evidencia lleva todas las entradas'],
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
if (!require('../lib/alreves-fin.cjs')(R, { mostrar: true })) limpio = false;
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
