// Prueba al revés de subidaConHerramienta (22 nov, revisión del CI, tanda 6a): la herramienta de subida (scripts/ci/subir.mjs) y lo que ci.yml
// publica para ella. Dos mitades:
//  (1) Sus casos puros en verde (node scripts/ci/subir.mjs --casos: clases, dirigida, evidencia, base, empuje y sandbox, sin red).
//  (2) Al revés: cada caso rompe una regla a propósito (en la herramienta, en ci.yml o en deploy.sh) y el guardián tiene que fallar con SU
//      mensaje; después se restaura y los guardianes quedan limpios. Las reglas de lógica (árbol, documentos, propuesta, main, conclusión de la
//      API, nombres) las caza el guardián corriendo los casos: cada defecto tiene que tumbar el caso que lo vigila.
// 24 nov (decisión AU) · Y el repaso corto tras una roja: la línea RESULTADOS de pruebas/correr.mjs, lo que exige la cadena R1 roja + R2 repaso,
//      el repaso siempre en partes y la puerta de producción (corrida.mjs, promover.sh) que no acepta cadenas. Tras la revisión de bc9a893: la
//      cuenta de RESULTADOS en pruebas/lib/resultados.cjs (sus casos), el cableado de --subir y --repaso (buscarEvidencia, armarCadena,
//      prepararRepaso, ioReal), el primer intento, los trabajos fijos, el arreglo sin herramientas y toda corrida no verde entre R1 y R2.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync, spawnSync } = require('child_process');
const R = ENT.RAIZ, G = 'subidaConHerramienta', S = 'scripts/ci/subir.mjs', Y = '.github/workflows/ci.yml', D = 'infra/pruebas/deploy.sh';
// 24 nov (decisión AU) · El repaso: la línea RESULTADOS del corredor y la puerta de producción, que no acepta cadenas.
const CO = 'pruebas/correr.mjs', RL = 'pruebas/lib/resultados.cjs', CR = 'scripts/ci/corrida.mjs', PR = 'scripts/produccion/promover.sh';
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
  [S, '/(^|\\/)(page|layout|template|', '/(^|\\/)(zzpage|zzlayout|template|', 'la vía rápida de diseño deja pasar apps/web/app/x/page.tsx'],
  [S, '/(^|\\/)(acciones[^/]*|route)\\.[jt]sx?$/,', '/(^|\\/)(zzacciones|zzroute)\\.[jt]sx?$/,', 'la vía rápida de diseño deja pasar apps/web/app/x/route.tsx'],
  [S, '    return { locales: ["tipos", "guardianes", "textos"], corrida: "despues", mainPrimero: false };', '    return { locales: ["tipos"], corrida: "despues", mainPrimero: false };', 'solo diseño: tipos, guardianes y textos aquí, siempre'],
  // 24 nov (decisión AR) · Sin build local: si la imagen no se construye, deploy.sh tiene que salir antes de recrear la app.
  [D, '    log "la imagen no se pudo construir: la app sigue con lo de antes"\n    exit 1\n', '    log "la imagen no se pudo construir: la app sigue con lo de antes"\n', 'el servidor es la compuerta'],
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
  // 24 nov · El repaso corto tras una roja (decisión AU). La línea RESULTADOS: el corredor solo la llama…
  [CO, 'console.log(RESULTADOS.linea({ pedidas: sel.map((t) => t.nombre), hechas,', 'console.log(RESULTADOS.linea({ pedidas: sel.map((t) => t.nombre).slice(0, 1), hechas,', 'imprime la línea RESULTADOS con pruebas/lib/resultados.cjs'],
  [CO, 'delCarril, detenida: detenida || parando }));', 'delCarril, detenida }));', 'completa:false si se está parando'],
  [CO, '  lineaResultados({ detenida: true });\n  vigia.alParar();\n', '  vigia.alParar();\n', 'también cuando se detiene por una señal'],
  [CO, '{ const pedidas = new Set(sel.map((t) => t.nombre)); lineaResultados(', '{ const pedidas = new Set(sel.map((t) => t.nombre)); void (', 'la línea RESULTADOS es la última de la corrida'],
  [CO, '    RESULTADOS.anotar(hechas, t.nombre, r.ok);\n', '    hechas.set(t.nombre, true);\n', 'anota cada prueba que corrió con RESULTADOS.anotar'],
  [CO, '    RESULTADOS.anotar(hechas, t.nombre, r.ok);\n', '    RESULTADOS.anotar(hechas, t.nombre, true);\n', 'anota cada prueba que corrió con RESULTADOS.anotar'],
  [CO, '      const r2 = await correrUna(t);\n      if (parando) await new Promise(() => {});\n', '      const r2 = await correrUna(t);\n', 'tras el reintento de una prueba, si la corrida se está parando'],
  // …y la cuenta vive en pruebas/lib/resultados.cjs, con sus casos ejecutables (el guardián los corre).
  [RL, 'const verdes = ps.filter((n) => hechas.get(n) === true);', 'const verdes = ps.filter((n) => hechas.get(n) !== false);', 'una pedida que no corrió: ni verde ni roja'],
  [RL, 'const rojas = ps.filter((n) => hechas.get(n) === false);', 'const rojas = ps.filter((n) => hechas.get(n) === false).slice(0, 1);', 'varias rojas: se dicen todas'],
  [RL, '  if (hechas.get(nombre) !== false) hechas.set(nombre, !!ok);', '  hechas.set(nombre, !!ok);', 'la roja gana'],
  [RL, 'const completa = !detenida && !carril.length && ps.every((n) => hechas.has(n));', 'const completa = !carril.length && ps.every((n) => hechas.has(n));', 'detenida por una señal: completa:false'],
  [RL, 'const completa = !detenida && !carril.length && ps.every((n) => hechas.has(n));', 'const completa = !detenida && !carril.length;', 'una pedida que no corrió: ni verde ni roja, y completa:false'],
  // La cadena R1 roja + R2 repaso: lo que exige.
  [S, 'const sinRojas = rojas.filter((t) => !enR2(t));', 'const sinRojas = [];', 'la cadena exige que R2 repita las rojas de R1'],
  [S, 'const sinA = propuestaDesdeA.filter((t) => !enR2(t.nombre));', 'const sinA = [];', 'R2 ⊇ propuesta(A..HEAD)'],
  [S, 'const sinCubrir = propuestaTotal.filter(', 'const sinCubrir = [].filter(', 'cubran la propuesta de la entrega'],
  [S, 'if (completa) return no("la entrega toca .github/: la cadena', 'if (false) return no("la entrega toca .github/: la cadena', 'la cadena no vale si la entrega toca .github/'],
  [S, 'if (aEsAncestro !== true) return no(', 'if (false) return no(', 'la cadena exige que el commit de R1 sea ancestro de HEAD'],
  [S, 'if (!x.ok) return no(`«${n}» (${j.conclusion', 'if (!x.ok) continue;\n      if (false) return no(`«${n}» (${j.conclusion', 'la cadena exige la línea RESULTADOS de cada trabajo de pruebas de R1'],
  [S, 'if (!x.r.completa) return no(', 'if (false) return no(', 'RESULTADOS con completa:false'],
  [S, 'if (j.conclusion === "success" && x.r.rojas.length) return no(', 'if (false) return no(', 'una parte VERDE de R1 cuyo RESULTADOS trae rojas'],
  [S, 'if (run.status !== "completed" || run.conclusion !== "failure") return no(`terminó', 'if (run.status !== "completed") return no(`terminó', 'R1 en verde'],
  [S, '    if (!rama || run.head_branch !== rama) return no(`de la rama ${run.head_branch}, no de ${rama}`);\n    if (run.event !== "workflow_dispatch")', '    if (run.event !== "workflow_dispatch")', 'R1 de otra rama'],
  [S, '    if (ajeno) return no(', '    if (false) return no(', '«al revés» rojo en R1 → no hay repaso'],
  [S, 'const v = evaluarCorrida({ run: r2?.run, trabajos: r2?.trabajos, registro: r2?.registro, rama, repo, arbolHead, arbolDeRun,', 'const v = evaluarCorrida({ run: r2?.run, trabajos: r2?.trabajos, registro: r2?.registro, rama, repo, arbolHead: arbolDeRun, arbolDeRun,', 'R2 de otro árbol'],
  [S, '    if (!regOk) return no("R2: la punta a punta no corrió entera");', '    if (false) return no("R2: la punta a punta no corrió entera");', 'a R2 le falta una parte de «todas las fases»'],
  [S, '      q.rojas.forEach((t) => extra.add(t));\n    }\n    const rojas', '    }\n    const rojas', 'una roja del repaso rojo intermedio'],
  // 24 nov (revisión de bc9a893) · Primer intento, trabajos fijos, arreglo sin herramientas entre A y HEAD, y toda corrida no verde entre R1 y R2.
  [S, '    if (run.run_attempt !== 1) return no(`es el intento', '    if (false) return no(`es el intento', 'la evidencia (y R2) solo valen del primer intento'],
  [S, '    if (Number(ev.intento) !== 1) return no(', '    if (false) return no(', 'una línea EVIDENCIA de otro intento'],
  [S, '    const fijo = faltaFijo(trabajos);\n    if (fijo) return no(fijo);\n', '', 'evidencia sin «alcance», o con «alcance» saltado'],
  [S, '    if (!arr.ok) return arr;\n    const v = evaluarCorrida(', '    if (false) return arr;\n    const v = evaluarCorrida(', 'la cadena no vale con herramientas del CI'],
  [S, '  if (!dif.length || veredicto(dif) === "documentos") return no("sin arreglo', '  if (false) return no("sin arreglo', 'la cadena no vale sin arreglo entre A y HEAD'],
  [S, '    && !(r.status === "completed" && r.conclusion === "success") && Number(r.id) > Number(r1?.id)', '    && r.status === "completed" && r.conclusion === "failure" && Number(r.id) > Number(r1?.id)', 'una corrida CANCELADA entre R1 y R2 suma las rojas'],
  [S, '  return (corridas ?? []).filter((r) => r && r.path === ".github/workflows/ci.yml" && r.repository?.full_name === repo && r.head_branch === rama\n', '  return (corridas ?? []).filter((r) => r && r.path === ".github/workflows/ci.yml" && r.repository?.full_name === repo && r.head_branch === rama && r.event === "workflow_dispatch"\n', 'una corrida roja de otro evento (pull_request)'],
  [S, '    if (run?.status !== "completed") return no(`la corrida ${run?.id} todavía no terminó', '    if (false) return no(`la corrida ${run?.id} todavía no terminó', 'que todavía no terminó → FALTA'],
  [S, 'x.r.rojas.forEach((t) => rojas.add(t)); x.r.inestables.forEach((t) => rojas.add(t));', 'x.r.rojas.forEach((t) => rojas.add(t));', 'las inestables de una corrida intermedia también tienen que repetirse en R2'],
  [S, '      if (j?.conclusion === "failure" && !x.r.rojas.length) return no(', '      if (false) return no(', 'una parte ROJA de una intermedia sin ninguna roja'],
  // El cableado (lo que antes armaban cmdSubir y cmdRepaso a mano): cada mutación tumba su caso.
  [S, 'const propuestaDesdeA = aEsAncestro ? (await io.planear(A, [])).d.pruebas : [];', 'const propuestaDesdeA = [];', 'la propuesta desde A sale de io.planear(A)'],
  [S, '    propuestaTotal: p.d.pruebas, propuestaDesdeA, completa: p.ex.corrida === "completa" };', '    propuestaTotal: [], propuestaDesdeA, completa: p.ex.corrida === "completa" };', 'la propuesta de la entrega es la del plan'],
  [S, 'const aEsAncestro = tengo && (await io.esAncestro(A)) === true;', 'const aEsAncestro = true;', '«A es ancestro de HEAD» lo dice git'],
  [S, '  for (const r of intermediasDe(corridas, { r1, r2: r2.run, rama, repo })) intermedias.push(await cargarCorrida(io, r));\n', '', 'las corridas no verdes entre R1 y R2 salen de la lista de la rama'],
  [S, '  return { r1: await cargarCorrida(io, r1), r2, intermedias,', '  return { r1: { ...(await cargarCorrida(io, r1)), run: { ...r1, run_attempt: 1 } }, r2, intermedias,', 'R1 llega tal cual de la API'],
  [S, '  return { r1: await cargarCorrida(io, r1), r2, intermedias,', '  return { r1: await (async () => { const c = await cargarCorrida(io, r1); return { ...c, trabajos: c.trabajos.filter((j) => !/al revés/.test(j.name)) }; })(), r2, intermedias,', 'R1 llega con todos sus trabajos'],
  [S, '  const arr = difDeArreglo(difAHead);\n  if (!arr.ok) return arr;\n  const corridas', '  const arr = difDeArreglo(difAHead);\n  if (false) return arr;\n  const corridas', 'repaso: .github/ cambiado entre A y HEAD → no hay repaso'],
  [S, 'if (p.ex.corrida !== "dirigida" || !candidatas.length) return', 'if (!candidatas.length) return', 'la evidencia encadenada solo en el camino de la dirigida'],
  [S, '    const { hallada, cadena, motivos, motivosCadena } = await buscarEvidencia({ p, rama, repo, arbolHead, io: ioReal(repo, rama) });', '    const { hallada, cadena, motivos, motivosCadena } = await buscarEvidencia({ p, rama, repo, arbolHead, io: { ...ioReal(repo, rama), esAncestro: () => true } });', 'la evidencia encadenada solo en el camino de la dirigida (nunca con .github/ ni en la vía rápida), desde buscarEvidencia con ioReal'],
  [S, '    esAncestro: (sha) => gitOk("merge-base", "--is-ancestor", sha, "HEAD"),', '    esAncestro: (sha) => true,', 'ioReal pregunta de verdad'],
  // El repaso, siempre en partes.
  [S, '  if (ensayo) { console.log(`ensayo: lanzaría ${comoTexto(o)}`); return 0; }\n  return lanzarYEsperar({ repo, rama, head, o });', '  if (ensayo) { console.log(`ensayo: lanzaría ${comoTexto(o)}`); return 0; }\n  return lanzarYEsperar({ repo, rama, head, o: o.map((x) => (x.startsWith("partes=") ? "partes=1" : x)) });', 'el repaso va siempre en partes'],
  // Producción no acepta cadenas.
  [CR, 'export const ENTRADAS_ENTERAS = /^entradas: alcance=todo · solo=«» · aprobar=no · medir=no$/;', 'export const ENTRADAS_ENTERAS = /^entradas: alcance=todo · solo=«[^»]*» · aprobar=no · medir=no$/;', 'corridaDeProduccion acepta una corrida con «solo»'],
  [CR, 'const CARRILES = Object.freeze(', 'export const DE_REPASO = "RESULTADOS";\nconst CARRILES = Object.freeze(', 'scripts/ci/corrida.mjs no lee la herramienta de subida'],
  [PR, 'node "$(dirname "$0")/../ci/corrida.mjs" --produccion "$C" ||', 'node "$(dirname "$0")/../ci/subir.mjs" --casos >/dev/null && node "$(dirname "$0")/../ci/corrida.mjs" --produccion "$C" ||', 'promover.sh solo pregunta a corrida.mjs --produccion'],
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
