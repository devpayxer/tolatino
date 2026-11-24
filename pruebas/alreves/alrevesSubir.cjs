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
// 24 nov (decisión AV) · Y la vía rápida de código: su lista blanca y sus exclusiones, main en rojo, el tope, las pruebas de lo tocado aquí (el
//      servidor de este árbol, su base, --reintentar, RESULTADOS completa), las dos listas, lo local antes de --dirigida/--repaso y --vigilar.
// 24 nov (revisión de 31e2974: código sensible ganaba «codigo») · lib/ fuera salvo LIB_CODIGO, acciones, route, .sql, migraciones, public salvo
//      imágenes y fuentes, enlaces, solo pruebas nuevas, las señales en el archivo entero, main en verde estricto, el tope con reloj, y el
//      cableado con un io de mentira (pruebasAqui, correrCorredor, deMain, planear, decidirSubida, vigilar): cada mutación de la revisión, cazada.
// 24 nov (revisión de 6eb4c17) · La vía rápida de código APAGADA (encenderla, cazado), el servidor solo con alguna de punta a punta, sin servidor
//      de este árbol SALTADO y se lanza, «corrieron aquí» solo en verde, y el push rojo + la programada verde del mismo commit no es verde.
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
  [S, '  if (rapida) avisoDespues({ repo, head, pruebas: p.d.pruebas, codigo: deCodigo });\n  // 24 nov (main', '  // 24 nov (main', '--subir por la vía rápida dice al final que la punta a punta y «al revés» corren DESPUÉS'],
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
  [S, '    && !(r.status === "completed" && r.conclusion === "success" && r.run_attempt === 1) && Number(r.id) > Number(r1?.id)', '    && r.status === "completed" && r.conclusion === "failure" && Number(r.id) > Number(r1?.id)', 'una corrida CANCELADA entre R1 y R2 suma las rojas'],
  [S, '  return (corridas ?? []).filter((r) => r && r.path === ".github/workflows/ci.yml" && r.repository?.full_name === repo && r.head_branch === rama\n', '  return (corridas ?? []).filter((r) => r && r.path === ".github/workflows/ci.yml" && r.repository?.full_name === repo && r.head_branch === rama && r.event === "workflow_dispatch"\n', 'una corrida roja de otro evento (pull_request)'],
  [S, '    if (run?.status !== "completed") return no(`la corrida ${run?.id} todavía no terminó', '    if (false) return no(`la corrida ${run?.id} todavía no terminó', 'que todavía no terminó → FALTA'],
  [S, 'x.r.rojas.forEach((t) => rojas.add(t)); x.r.inestables.forEach((t) => rojas.add(t));', 'x.r.rojas.forEach((t) => rojas.add(t));', 'las inestables de una corrida intermedia también tienen que repetirse en R2'],
  [S, '      if (j?.conclusion === "failure" && !x.r.rojas.length) return no(', '      if (false) return no(', 'una parte ROJA de una intermedia sin ninguna roja'],
  // El cableado (lo que antes armaban cmdSubir y cmdRepaso a mano): cada mutación tumba su caso.
  [S, 'const propuestaDesdeA = aEsAncestro ? (await io.planear(A, [])).d.pruebas : [];', 'const propuestaDesdeA = [];', 'la propuesta desde A sale de io.planear(A)'],
  [S, '    propuestaTotal: p.d.pruebas, propuestaDesdeA, completa: p.ex.corrida === "completa" };', '    propuestaTotal: [], propuestaDesdeA, completa: p.ex.corrida === "completa" };', 'la propuesta de la entrega es la del plan'],
  [S, 'const aEsAncestro = tengo && (await io.esAncestro(A)) === true;', 'const aEsAncestro = true;', '«A es ancestro de HEAD» lo dice git'],
  [S, '  for (const r of intermediasDe(corridas, { r1, r2: r2.run, rama, repo })) intermedias.push(await cargarIntermedia(io, r));\n', '', 'las corridas no verdes entre R1 y R2 salen de la lista de la rama'],
  [S, '  return { r1: await cargarCorrida(io, r1), r2, intermedias,', '  return { r1: { ...(await cargarCorrida(io, r1)), run: { ...r1, run_attempt: 1 } }, r2, intermedias,', 'R1 llega tal cual de la API'],
  [S, '  return { r1: await cargarCorrida(io, r1), r2, intermedias,', '  return { r1: await (async () => { const c = await cargarCorrida(io, r1); return { ...c, trabajos: c.trabajos.filter((j) => !/al revés/.test(j.name)) }; })(), r2, intermedias,', 'R1 llega con todos sus trabajos'],
  [S, '  const arr = difDeArreglo(difAHead);\n  if (!arr.ok) return arr;\n  const corridas', '  const arr = difDeArreglo(difAHead);\n  if (false) return arr;\n  const corridas', 'repaso: .github/ cambiado entre A y HEAD → no hay repaso'],
  [S, 'if (p.ex.corrida !== "dirigida" || !candidatas.length) return', 'if (!candidatas.length) return', 'la evidencia encadenada solo en el camino de la dirigida'],
  [S, '    evidencia: (p) => buscarEvidencia({ p, rama, repo, arbolHead, io: ioReal(repo, rama) }),', '    evidencia: (p) => buscarEvidencia({ p, rama, repo, arbolHead, io: { ...ioReal(repo, rama), esAncestro: () => true } }),', 'la evidencia encadenada solo en el camino de la dirigida (nunca con .github/ ni en la vía rápida), desde buscarEvidencia con ioReal'],
  [S, '    esAncestro: (sha) => gitOk("merge-base", "--is-ancestor", sha, "HEAD"),', '    esAncestro: (sha) => true,', 'ioReal pregunta de verdad'],
  // 24 nov (revisión de bfa43c3) · Lo que el guardián no veía: cada defecto, cazado con su mensaje.
  [S, '    if (!hallada && !cadena) for (const m of motivosCadena.slice(0, 4)) io.decir(`  cadena ${m}`);\n', '', '--subir enseña aparte los motivos de la cadena'],
  [S, '    if (!a.rojas.length) return no("R1 no tiene ninguna prueba roja con nombre");', '', 'cadena: R1 roja solo por la tubería'],
  [S, '  if (!a.rojas.length) return no(`la corrida ${id} no tiene ninguna prueba roja con nombre`);', '', 'repaso: R1 roja solo por la tubería'],
  [S, '  if (pt.ex.corrida === "completa") return no("la entrega toca .github/: la cadena roja + repaso no vale', '  if (false) return no("la entrega toca .github/: la cadena roja + repaso no vale', 'repaso: la entrega toca .github/ (origin/main..HEAD)'],
  [S, '  if (!corridas.some((r) => r?.id === a.id)) return no(', '  if (false) return no(', 'repaso: R1 fuera de las últimas corridas de la rama'],
  [S, '  for (const n of r1.inestables) pon(n, "inestable en R1");\n', '', 'la lista del repaso lleva también las inestables de R1'],
  [S, '    difNombres: (a, b) => git("diff", "--no-renames", "--name-only", "-z", a, b).split("\\0").filter(Boolean),', '    difNombres: (a, b) => git("diff", "--no-renames", "--name-only", "-z", a, b).split("\\0").filter(Boolean).filter((f) => !f.startsWith(".github/")),', 'ioReal pregunta de verdad, entera y sin retoques'],
  [S, ' && r.conclusion === "success" && r.run_attempt === 1) && Number(r.id)', ' && r.conclusion === "success") && Number(r.id)', 'las intermedias: una corrida que se volvió a correr hasta el verde'],
  [S, '    if (run?.run_attempt !== 1) {\n      if (!intento1) return no(', '    if (false) {\n      if (!intento1) return no(', 'cadena: las rojas del PRIMER intento'],
  [S, '      const tras = q.rojas.length ? sinArregloTras(i?.difHead) : "";', '      const tras = "";', 'cadena: un repaso rojo entre R1 y R2 con el mismo árbol que HEAD'],
  [S, '    const tras = q.rojas.length ? sinArregloTras(i.difHead) : "";', '    const tras = "";', 'repaso: un repaso rojo posterior con el mismo árbol que HEAD'],
  [S, '  if (!dif.length || veredicto(dif) === "documentos") return "ya salió roja', '  if (!dif.length) return "ya salió roja', 'cadena: un repaso rojo entre R1 y R2 con el mismo árbol que HEAD (o solo documentos de diferencia)'],
  [S, '  c.difHead = SHA40.test(run?.head_sha ?? "") && (await io.tenerCommit(run.head_sha)) === true ? await io.difNombres(run.head_sha, "HEAD") : null;', '  c.difHead = ["apps/web/x.ts"];', 'cableado: lo que cambió entre una roja intermedia y HEAD sale de git'],
  [S, '    try { const t1 = await io.trabajosIntento(run.id, 1);', '    try { const t1 = await io.trabajos(run.id);', 'cableado: el primer intento de una intermedia que se volvió a correr sale de la API'],
  // 24 nov · La vía rápida de código (decisión AV) y --vigilar: cada defecto, cazado con su mensaje.
  [S, 'export const CODIGO = Object.freeze([/^apps\\/web\\//, ', 'export const CODIGO = Object.freeze([/^scripts\\//, /^apps\\/web\\//, ', 'la lista blanca de código cubre scripts/ci/x.mjs'],
  [S, '  /(^|\\/)(package\\.json|pnpm-lock\\.yaml|pnpm-workspace\\.yaml|\\.npmrc)$/, /(^|\\/)\\.env[^/]*$/,\n', '  /(^|\\/)\\.env[^/]*$/,\n', 'la vía rápida de código deja pasar apps/web/app/x/package.json'],
  [S, '  /(^|\\/)(package\\.json|pnpm-lock\\.yaml|pnpm-workspace\\.yaml|\\.npmrc)$/, /(^|\\/)\\.env[^/]*$/,\n', '  /(^|\\/)(package\\.json|pnpm-lock\\.yaml|pnpm-workspace\\.yaml|\\.npmrc)$/,\n', 'la vía rápida de código deja pasar apps/web/app/x/.env'],
  [S, '  /^apps\\/web\\/public\\/(?!.*\\.(png|jpe?g|webp|avif|woff2)$)/,\n', '', 'la vía rápida de código deja pasar apps/web/public/sw-push.js'],
  [S, '(png|jpe?g|webp|avif|woff2)$)/,\n', '(png|jpe?g|webp|avif|woff2|svg)$)/,\n', 'la vía rápida de código deja pasar apps/web/public/icono.svg'],
  [S, '  /^(apps\\/web|packages\\/ui)\\/[^/]+$/,\n', '', 'la vía rápida de código deja pasar apps/web/tsconfig.json'],
  [S, '  if (p) return `${f} lleva «${p}» en la ruta (dinero, cuenta, permisos o datos personales)`;\n  return "";\n}\nexport const esCodigo', '  return "";\n}\nexport const esCodigo', 'la vía rápida de código deja pasar apps/web/app/(app)/privacidad/Ajustes.tsx'],
  // Revisión de 31e2974 · lib/ fuera salvo LIB_CODIGO, acciones, route, .sql, migraciones, packages/ui/scripts, textos.cjs, enlaces, pruebas nuevas, el archivo entero.
  [S, '\n  new RegExp(`^apps', '\n  /^$/ || new RegExp(`^apps', 'la vía rápida de código deja pasar apps/web/lib/cupones.ts'],
  [S, 'export const LIB_CODIGO = Object.freeze(["apps/web/lib/nombre.ts", "apps/web/lib/plazo-txt.ts"]);', 'export const LIB_CODIGO = Object.freeze(["apps/web/lib/nombre.ts", "apps/web/lib/plazo-txt.ts", "apps/web/lib/cupones.ts"]);', 'LIB_CODIGO: apps/web/lib/cupones.ts ya no es inofensivo'],
  [S, 'export const LIB_CODIGO = Object.freeze(["apps/web/lib/nombre.ts", "apps/web/lib/plazo-txt.ts"]);', 'export const LIB_CODIGO = Object.freeze(["apps/web/lib/nombre.ts", "apps/web/lib/plazo-txt.ts", "apps/web/lib/fecha-local.ts", "apps/web/lib/no-hago.ts"]);', 'LIB_CODIGO es una lista cerrada y corta'],
  [S, '  /(^|\\/)(acciones[^/]*|route)\\.[jt]sx?$/, /\\.sql$/, /(^|\\/)migraciones?\\//,\n', '  /\\.sql$/, /(^|\\/)migraciones?\\//,\n', 'la vía rápida de código deja pasar apps/web/app/x/acciones.ts'],
  [S, '  /(^|\\/)(acciones[^/]*|route)\\.[jt]sx?$/, /\\.sql$/, /(^|\\/)migraciones?\\//,\n', '  /(^|\\/)(acciones[^/]*|route)\\.[jt]sx?$/, /(^|\\/)migraciones?\\//,\n', 'la vía rápida de código deja pasar apps/web/app/x/y.sql'],
  [S, '  /(^|\\/)(acciones[^/]*|route)\\.[jt]sx?$/, /\\.sql$/, /(^|\\/)migraciones?\\//,\n', '  /(^|\\/)(acciones[^/]*|route)\\.[jt]sx?$/, /\\.sql$/,\n', 'la vía rápida de código deja pasar packages/ui/src/migraciones/x.ts'],
  [S, '  /^packages\\/ui\\/scripts\\//,\n', '', 'la vía rápida de código deja pasar packages/ui/scripts/x.mjs'],
  [S, ', /^pruebas\\/alreves\\/textos\\.cjs$/]);', ']);', 'pruebas/alreves/textos.cjs es una herramienta'],
  [S, '  if (!info || typeof info !== "object") return "sin el estado', '  if (!info || typeof info !== "object") return ""; if (0) return "sin el estado', 'la gana una entrega con sin la información de git'],
  [S, '    if (md.some((x) => !MODOS_BIEN.has(String(x)))) return', '    if (false) return', 'la gana una entrega con un enlace simbólico'],
  [S, '    if (/^pruebas\\/(e2e|alreves)\\//.test(f) && est !== "A") return', '    if (false) return', 'la gana una entrega con cambiar una prueba que ya existe'],
  [S, '      for (const [donde, t] of [["el archivo entero", entero], ["los renglones cambiados", juntos]]) {', '      for (const [donde, t] of [["los renglones cambiados", juntos]]) {', 'la gana una entrega con una escritura partida en varios renglones del archivo entero'],
  [S, '    const senales = LIB_CODIGO.includes(f) ? [...SENALES, ...SENALES_LIB] : SENALES;', '    const senales = SENALES;', 'la gana una entrega con fetch en un módulo de LIB_CODIGO'],
  [S, '  [/\\bTRUNCATE\\b|\\btruncate\\s+table\\b|\\bsql\\s*`[^`]*\\btruncate\\b|\\b(merge|MERGE)\\s+(into|INTO)\\b|\\bstripe\\.|\\brefunds\\b/, "truncate, merge into o Stripe (stripe., refunds)"],\n', '', 'la gana una entrega con Stripe en el archivo entero'],
  [S, 'const l = q.find((x) => re.test(x)); if (l !== undefined) return', 'const l = q.find((x) => re.test(x)); if (false) return', 'la gana una entrega con quitar una comprobación'],
  [S, '    if (hunk && f && (l.startsWith("+") || l.startsWith("-"))) {', '    if (hunk && f && l.startsWith("+")) {', 'git diff -U0: los renglones añadidos Y los quitados'],
  [S, '  else if (app && !lista.some((t) => t.carril === "e2e")) motivo =', '  else if (false) motivo =', 'sin ninguna prueba de punta a punta'],
  [S, '  for (const f of codigo) { if (noCodigo) break; if (!SIN_RENGLONES.test(f) && !Array.isArray(renglones?.[f])) noCodigo', '  for (const f of codigo) { if (noCodigo || true) break; if (!SIN_RENGLONES.test(f) && !Array.isArray(renglones?.[f])) noCodigo', 'un archivo de código sin sus renglones → no código'],
  // main en verde, lo más estricto.
  [S, '  if (main?.estado !== "verde") return main?.estado === "rojo"', '  if (false) return main?.estado === "rojo"', 'con main en rojo (o sin saberlo), el código no sube por la vía rápida'],
  [S, '  if (r.conclusion === "failure") return { estado: "rojo"', '  if (r.conclusion === "failure") return { estado: "verde"', 'con main en rojo (o sin saberlo), el código no sube por la vía rápida'],
  [S, '(x.event === "push" || x.event === "schedule") && x.head_branch === "main"', '(x.event === "push" || x.event === "schedule") && x.status === "completed" && x.head_branch === "main"', 'main en verde solo con la corrida más nueva de main'],
  [S, '(x.event === "push" || x.event === "schedule") && x.head_branch === "main"', 'x.event === "push" && x.head_branch === "main"', 'main en verde solo con la corrida más nueva de main'],
  [S, '  if (Number(r.run_attempt) !== 1) return { estado: "duda"', '  if (false) return { estado: "duda"', 'main en verde solo con la corrida más nueva de main'],
  [S, '  if (!vale) return { estado: "duda"', '  if (false) return { estado: "duda"', 'main en verde solo con la corrida más nueva de main'],
  [S, '  } catch (e) { return { estado: "duda", motivo: `no pude preguntar a la API (o a git)', '  } catch (e) { return { estado: "verde", motivo: `no pude preguntar a la API (o a git)', 'leerMain: la API sin responder → duda'],
  [S, 'ci.yml/runs?branch=main&per_page=20`', 'ci.yml/runs?per_page=20`', 'leerMain: pide las corridas de main sin filtrar'],
  [S, 'ci.yml/runs?branch=main&per_page=20`', 'ci.yml/runs?branch=main&status=completed&event=push&per_page=20`', 'leerMain: pide las corridas de main sin filtrar'],
  // El tope.
  [S, '  if (!local.ok) return `${local.motivo}: camino normal`;\n', '', 'código con más pruebas que el tope sale por la vía rápida'],
  [S, 'export const TOPE_LOCAL = Object.freeze({ pruebas: 25, seg: 600,', 'export const TOPE_LOCAL = Object.freeze({ pruebas: 50, seg: 600,', 'el tope de las pruebas de lo tocado: ≤ 25 pruebas y ≤ 10 min'],
  [S, 'Math.round(tope.seg * tope.factor * 1000)', 'Math.round(tope.seg * tope.factor * 4000)', 'el tope: 25 pruebas y 10 min'],
  [S, 'const reloj = setTimeout(() => { pasado = true; ch.kill("SIGINT"); }, topeMs);', 'const reloj = setTimeout(() => { ch.kill("SIGINT"); }, topeMs);', 'correrCorredor: al pasar del tope lo para (SIGINT) y lo dice'],
  [S, '  if (r?.pasado) return di(false,', '  if (false) return di(false,', 'pruebasAqui: el corredor pasó del tope'],
  [S, '  if (c.diseno === true && !sinViaRapida && !c.github', '  if (c.diseno === true && !sinViaRapida && main?.estado !== "rojo" && !c.github', 'main en rojo no frena la vía rápida de diseño'],
  [S, '    if (correr.length < tope.pruebas && total + mas <= tope.seg)', '    if (total + mas <= tope.seg)', 'recortar: nunca más de 25 pruebas aquí'],
  // Las pruebas de lo tocado y su servidor.
  [S, '  if (r.rojas.length) return no(`en rojo aquí:', '  if (false) return no(`en rojo aquí:', 'las pruebas de lo tocado exigen la línea RESULTADOS completa:true y sin rojas'],
  [S, '  if (!r.completa) return no(`no todas corrieron hasta su resultado (completa:false)', '  if (false) return no(`no todas corrieron hasta su resultado (completa:false)', 'las pruebas de lo tocado exigen la línea RESULTADOS completa:true y sin rojas'],
  [S, '  if (proc.cwd !== app) return no(', '  if (false) return no(', 'las pruebas locales corren contra el servidor de DESARROLLO de este árbol'],
  [S, '  if (proc.nodeEnv !== "development") return no(', '  if (false) return no(', 'las pruebas locales corren contra el servidor de DESARROLLO de este árbol'],
  [S, '  if (mala !== undefined) return no(', '  if (false) return no(', 'las pruebas locales corren contra el servidor de DESARROLLO de este árbol'],
  [S, '  if (!cad.some((c) => NEXT_DEV.test(c))) return no(', '  if (false) return no(', 'las pruebas locales corren contra el servidor de DESARROLLO de este árbol'],
  [S, '  if (s.base?.migraciones !== migraciones) return no(', '  if (false) return no(', 'antes de las pruebas locales, /api/salud ok y tantas migraciones como trae HEAD'],
  [S, 'export function servidorEn(url, fsio = FS_REAL) {\n', 'export function servidorEn(url, fsio = FS_REAL) {\n  if (url) return { ok: true, pid: 1, cwd: "/r/t/apps/web", nodeEnv: "development", cadena: ["next dev"] };\n', 'servidorEn: nadie en ese puerto'],
  [S, 'dirs.some((x) => c[1].toUpperCase() === `${x}:${hex}`)', 'c[1].toUpperCase().endsWith(`:${hex}`)', 'servidorEn: nadie en ese puerto, o escucha en otra dirección'],
  [S, '  if (!sv.ok) return sv;\n', '', 'pruebasAqui: el servidor de OTRA copia → FALTA y no corre nada'],
  [S, '  if (!sa.ok) return no(`el servidor de', '  if (false) return no(`el servidor de', 'pruebasAqui: la base del servidor con otras migraciones → FALTA'],
  [S, '  const migraciones = io.migraciones(cabeza);', '  const migraciones = io.migraciones("HEAD");', 'pruebasAqui: el servidor de este árbol, las migraciones de LA CABEZA'],
  [S, '  if (!v.ok) return di(false, `FALTA: pruebas de lo tocado aquí (${nombres.length}) en verde', '  if (false) return di(false, `FALTA: pruebas de lo tocado aquí (${nombres.length}) en verde', 'pruebasAqui: RESULTADOS en rojo → FALTA'],
  [S, 'di = (ok, linea) => { decir({ ok, linea }); return ok; };', 'di = (ok, linea) => { decir({ ok: true, linea }); return ok; };', 'pruebasAqui: el servidor de OTRA copia → FALTA y no corre nada'],
  [S, '  if (!nombres.length || nombres.some((n) => !NOMBRE_PRUEBA.test(String(n ?? "")))) return di(false,', '  if (false) return di(false,', 'pruebasAqui: sin nombres (o un nombre vacío)'],
  // Revisión de 6eb4c17 · El servidor solo con alguna de punta a punta (las al revés no lo usan), en los dos sentidos.
  [S, '  if (e2e.length) {\n    const sl = await servidorListo({ cabeza, io });', '  if (true) {\n    const sl = await servidorListo({ cabeza, io });', 'pruebasAqui: solo al revés → ni servidor ni salud'],
  [S, '  if (e2e.length) {\n    const sl = await servidorListo({ cabeza, io });', '  if (false) {\n    const sl = await servidorListo({ cabeza, io });', 'pruebasAqui: con alguna de punta a punta, el servidor de este árbol y su base se miran'],
  [S, 'const env = { ...process.env, PRUEBAS_URL: url };', 'const env = { ...process.env };', 'correrCorredor: lanza pruebas/correr.mjs con --reintentar y PRUEBAS_URL'],
  [S, '...nombres, "--reintentar"]', '...nombres]', 'correr con --reintentar'],
  // deMain y planear: nunca se juzga con la herramienta de la cabeza.
  [S, '  try { fuente = show("scripts/ci/subir.mjs"); } catch { return null; }', '  try { fuente = readFileSync(join(RAIZ, "scripts", "ci", "subir.mjs"), "utf8"); } catch { return null; }', 'deMain: carga la herramienta de origin/main'],
  [S, '} catch (e) { c2 = null; sinMain = `la herramienta de origin/main falló', '} catch (e) { c2 = c0; sinMain = `la herramienta de origin/main falló', 'planear: la herramienta de origin/main falla → no «codigo»'],
  [S, '  const c = combinar(c0, c2, sinMain);', '  const c = combinar(c0, c2 ?? c0, sinMain);', 'planear: sin la herramienta de origin/main → no «codigo»'],
  [S, '  try { m = await io.deMain(); } catch { m = null; }', '  try { m = await io.deMain(); } catch { m = { clases, dirigida }; }', 'planear: deMain lanza → no «codigo»'],
  [S, '  else if (c2.codigo === undefined) noCodigo =', '  else if (false) noCodigo =', 'la herramienta de origin/main sin «codigo» → no hay vía rápida de código'],
  // decidirSubida: lo que no corre es FALTA, y nada se empuja con una FALTA.
  [S, '      if (falta) linea({ ok: false, linea: "NO CORRIÓ: las pruebas', '      if (true) linea({ ok: false, linea: "NO CORRIÓ: las pruebas', 'decidirSubida: código con todo en verde'],
  [S, 'linea({ ok: false, linea: "NO CORRIÓ: las pruebas de lo tocado (antes falta lo de arriba)" });', 'io.decir("NO CORRIÓ: las pruebas de lo tocado (antes falta lo de arriba)");', 'decidirSubida: una comprobación local roja'],
  [S, '  return { falta, empujar: !(falta || ensayo),', '  return { falta, empujar: !ensayo,', 'decidirSubida: una comprobación local roja'],
  [S, '  if (!d.empujar) {', '  if (ensayo) {', 'mira main antes de decidir y corre las pruebas de lo tocado aquí'],
  [S, '        if (!io.limpio()) linea({ ok: false, linea: "FALTA: las pruebas de lo tocado dejaron el árbol cambiado" });\n', '', 'decidirSubida: las pruebas dejan el árbol cambiado'],
  [S, '    if (!io.limpio()) linea({ ok: false, linea: "FALTA: las comprobaciones dejaron el árbol cambiado" });\n', '', 'decidirSubida: las comprobaciones dejan el árbol cambiado'],
  [S, '        const bien = await pruebasAqui({ pruebas: p.d.pruebas, cabeza: p.head, archivos: p.archivos, decir: linea, io: io.pruebas });', '        const bien = true;', 'mira main antes de decidir y corre las pruebas de lo tocado aquí'],
  [S, '    planear: (o) => planear({ base: "origin/main", cabeza: "HEAD", mas: [], sinViaRapida: o.sinViaRapida, main: o.main }),', '    planear: (o) => planear({ base: "origin/main", cabeza: "HEAD", mas: [], sinViaRapida: o.sinViaRapida, main: { estado: "verde" } }),', 'mira main antes de decidir y corre las pruebas de lo tocado aquí'],
  [S, '    locales: (ls) => correrLocales(ls),\n    limpio: () => !git("status", "--porcelain").trim(),', '    locales: (ls) => correrLocales(ls),\n    limpio: () => true,', 'mira main antes de decidir y corre las pruebas de lo tocado aquí'],
  [S, '    pruebas: ioPruebas(),\n    limpio: () => !git("status", "--porcelain").trim(),', '    pruebas: ioPruebas(),\n    limpio: () => true,', 'antes de lanzar, las de punta a punta solo con el servidor de desarrollo de este árbol'],
  [S, '    salud: (url) => saludDe(url),', '    salud: async () => ({ ok: true, base: { ok: true, migraciones: 1 } }),', 'las pruebas de lo tocado: el servidor de este árbol y su base al día'],
  // --dirigida y --repaso.
  [S, '  if (!(await antesDeLanzar({ archivos: p.archivos, head, sinLocal }))) return 1;\n', '', '--dirigida corre aquí las pruebas de lo tocado antes de lanzar nada'],
  [S, '  if (!(await antesDeLanzar({ archivos: r.difAHead, head, primero: a.rojas, sinLocal }))) return 1;\n', '', '--repaso corre aquí las pruebas de lo tocado antes de lanzar nada'],
  [S, 'if (sinLocal) { io.decir("SALTADO: pruebas locales (--sin-local)"); return true; }', 'if (sinLocal) return true;', '--sin-local se dice'],
  [S, '  if (!ok) { io.decir("no se lanzó nada', '  if (false) { io.decir("no se lanzó nada', 'y con una roja aquí no se lanza'],
  [S, '  if (!ok) { io.decir("no se lanzó nada', '  if (!ok && false) { io.decir("no se lanzó nada', 'antes de lanzar: con el servidor de este árbol y la e2e en rojo → no se lanza nada'],
  [S, 'if (!r.correr.length) { io.decir(`NO HAY: pruebas locales', 'if (!r.correr.length) { io.decir(`CORRIÓ: pruebas locales', 'si no hay ninguna prueba directa se dice «NO HAY»'],
  // Revisión de 6eb4c17 · Sin servidor de este árbol: las de punta a punta se saltan (dicho) y se lanza; las al revés corren igual.
  [S, '      if (!correr.length) return true;', '      if (!correr.length) return false;', 'antes de lanzar: una e2e directa sin el servidor de este árbol'],
  [S, '  if (correr.some((t) => t.carril === "e2e")) {', '  if (false) {', 'antes de lanzar: una e2e directa sin el servidor de este árbol'],
  [S, '      correr = correr.filter((t) => t.carril !== "e2e");', '      correr = [];', 'antes de lanzar: sin servidor, la e2e se salta (dicho) y la al revés corre igual'],
  [S, '    const sl = await servidorListo({ cabeza: head, io: io.pruebas });\n    if (!sl.ok) {', '    const sl = await servidorListo({ cabeza: head, io: io.pruebas });\n    if (false) {', 'antes de lanzar: una e2e directa sin el servidor de este árbol'],
  // La vía rápida de código, APAGADA (AV, 24 nov): encenderla necesita una decisión nueva del fundador.
  [S, 'export const VIA_RAPIDA_CODIGO = false;', 'export const VIA_RAPIDA_CODIGO = true;', 'la vía rápida de código está APAGADA'],
  [S, 'noRapida = viaRapidaCodigo !== true ? APAGADA_CODIGO : sinViaRapida', 'noRapida = sinViaRapida', 'la vía rápida de código está APAGADA'],
  [S, 'local = null, viaRapidaCodigo = VIA_RAPIDA_CODIGO } = {}) {', 'local = null, viaRapidaCodigo = true } = {}) {', 'la vía rápida de código está APAGADA'],
  [S, '  if (deCodigo && viaRapidaCodigo !== true) linea(', '  if (false) linea(', 'decidirSubida: con la vía rápida de código APAGADA'],
  [S, 'sinViaRapida = false, viaRapidaCodigo = VIA_RAPIDA_CODIGO }) {', 'sinViaRapida = false, viaRapidaCodigo = true }) {', 'decidirSubida: con la vía rápida de código APAGADA'],
  [S, '  if (!VIA_RAPIDA_CODIGO) { if (!c.soloDocumentos) console.log(`${APAGADA_CODIGO}', '  if (false) { if (!c.soloDocumentos) console.log(`${APAGADA_CODIGO}', 'la vía rápida de código está APAGADA'],
  // «corrieron aquí» solo en verde; un push rojo + una programada verde del mismo commit no es verde.
  [S, '        verdesAqui = bien === true && falta === antes;', '        verdesAqui = true;', '«las pruebas de lo tocado corrieron aquí» solo si corrieron en verde'],
  [S, '  else if (rapida && deCodigo) io.decir(verdesAqui ? ', '  else if (rapida && deCodigo) io.decir(true ? ', '«las pruebas de lo tocado corrieron aquí» solo si corrieron en verde'],
  [S, '  if (roja) return { estado: "duda"', '  if (false) return { estado: "duda"', 'un push rojo con una programada verde más nueva del MISMO commit'],
  [S, '  for (const f of archivos.filter((x) => /^(apps|packages)\\//.test(x))) {', '  for (const f of archivos) {', 'la parte directa antes de lanzar'],
  // --vigilar.
  [S, '  console.log(ordenVigilar(head));\n  return 0;\n}', '  return 0;\n}', '--subir termina imprimiendo la orden para vigilar la corrida de main'],
  [S, '    else if (flag("--vigilar")) {', '    else if (flag("--vigilar-no")) {', '--vigilar existe'],
  [S, '  if (run.conclusion === "success" && Number(run.run_attempt) === 1) return { ok: true, linea:', '  if (run.conclusion !== "failure") return { ok: true, linea:', '--vigilar: verde solo con success'],
  [S, '  if (run.conclusion === "success" && Number(run.run_attempt) === 1) return { ok: true, linea:', '  if (run.conclusion === "success") return { ok: true, linea:', '--vigilar: dice el intento; verde en el intento 2 no es verde'],
  [S, '  if (!run || run.status !== "completed") return { ok: false, linea: `la corrida de main no terminó', '  if (!run) return { ok: false, linea: `la corrida de main no terminó', '--vigilar: verde solo con success (sale 0); roja, cancelada o sin terminar'],
  [S, ' && r.head_sha === sha && r.repository?.full_name === repo)', ' && r.repository?.full_name === repo)', '--vigilar: la corrida de ci.yml del push a main de ESE commit'],
  [S, '    run = elegirCorridaDeMain(await io.corridasDe(sha), sha, repo);', '    run = [...(await io.corridasDe(sha))].sort((a, b) => b.id - a.id)[0] ?? null;', '--vigilar: la corrida de ESE commit, no la última de main'],
  [S, '      if (r?.status === "completed") fin = r;', '      if (r) fin = r;', '--vigilar: espera a que la corrida TERMINE'],
  [S, '    if (run.conclusion !== "cancelled" || n >= vueltas.reemplazos) break;', '    break;', '--vigilar: una corrida cancelada porque llegó otro push dice «reemplazada por X»'],
  [S, '  if (aviso) io.decir(aviso);\n', '', '--vigilar: avisa si no corrieron los carriles largos'],
  [S, '  const v = await vigilar({ sha: objetivo, repo, io: {', '  const v = await vigilar({ sha: "0".repeat(40), repo, io: {', '--vigilar existe: espera la corrida de main de ese commit'],
  [S, 'const queda = flag("--vigilar") ? "no sé cómo terminó', 'const queda = flag("--vigilar-x") ? "no sé cómo terminó', '--vigilar que falla no dice «no se subió nada»'],
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
