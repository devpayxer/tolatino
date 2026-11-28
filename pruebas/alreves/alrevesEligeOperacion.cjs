// Prueba al revés de compaEligeLaOperacion (23 nov): los dos motores de El Compa sin modelo (reglas fijas y simulador) preparaban «cancelar» o
// «abrir» sobre la PRIMERA operación de la lista sin mirar de cuál hablaba la persona. Cada caso mete el defecto (volver a `ops.find(…)` / `ops[0]`,
// que el simulador o las reglas dejen de pasar por la función de elección, quitar una de sus pistas —otra persona, referencia, tipo, negocio,
// fecha, «por la mañana»—, un texto que el verificador rechaza, un chip que ya no elige UNA operación) y el guardián tiene que fallar con SU
// mensaje; después se restaura y los guardianes quedan limpios.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ, G = 'compaEligeLaOperacion';
const CV = 'apps/web/lib/compa/conversacion.ts', RG = 'apps/web/lib/compa/modelo-reglas.ts', SM = 'apps/web/lib/compa/modelo-simulador.ts';
let bien = 0, total = 0;
const caso = (ok, que, extra = '') => { total++; if (ok) bien++; console.log(`  ${ok ? '✓' : '✗'} ${que}${extra ? ' → ' + extra : ''}`); };
const casos = [
  // La clase: volver a tomar la primera de la lista (las reglas y el simulador).
  [RG, '  const e = quiereCancelar(x.texto) ?', '  const primera = x.ops.find((o) => o.cancelable_gratis);\n  const e = quiereCancelar(x.texto) ?', 'toma la primera operación de la lista'],
  [RG, '  const e = quiereCancelar(x.texto) ?', '  const primera = x.ops[0];\n  const e = quiereCancelar(x.texto) ?', 'toma la primera operación de la lista'],
  [SM, '    const hecho = quiereCancelar(texto) ?', '    const primera = ops.find((o) => o.cancelable_gratis);\n    const hecho = quiereCancelar(texto) ?', 'toma la primera operación de la lista'],
  [SM, '    const hecho = quiereCancelar(texto) ?', '    const primera = ops[0];\n    const hecho = quiereCancelar(texto) ?', 'toma la primera operación de la lista'],
  // Dejar de pasar por la función de elección.
  [RG, 'quiereAbrir(x.texto) ? respuestaAbrir(x) : null;', 'null;', 'responderConReglas no pasa por respuestaCancelar / respuestaAbrir'],
  [SM, 'respuestaCancelar({ texto, lang: e.lang, ops })', 'null', 'el simulador no comparte la elección con las reglas'],
  [RG, 'export function respuestaAbrir(x: { texto: string; lang: Lang; ops: OpCtx[]; hoy?: string }): Propuesta | null {\n  const es = x.lang === "es", e = elegirOperacion(x);', 'export function respuestaAbrir(x: { texto: string; lang: Lang; ops: OpCtx[]; hoy?: string }): Propuesta | null {\n  const es = x.lang === "es", e: Eleccion = { k: "sin_pista" };', 'respuestaAbrir no pasa por elegirOperacion'],
  // Lo que decide la tabla: la elección, una pista por vez.
  [RG, '  const p = e.k === "una" ? (e.op.cancelable_gratis ? e.op : null) : canc.length === 1 ? canc[0]! : null;', '  const p = canc[0] ?? null;', 'la tabla esperaba'],
  [RG, '  if (deOtraPersona(t)) return { k: "otra_persona" };\n', '', 'elegirOperacion no mira la operación de otra persona'],
  [RG, '  if (deOtraPersona(t)) return { k: "otra_persona" };\n', '', 'la tabla esperaba «otra»'],
  [RG, '  else if (POSESIVO.test(x.texto)) return { k: "otra_persona" };', '', 'la tabla esperaba «otra»'],
  [RG, '  if (!x.ops.length) return { k: "ninguna" };\n', '', 'la tabla esperaba «ninguna»'],
  [RG, '  if (hit.size) { pista = true; c = c.filter((o) => hit.has(o)); }', '  if (hit.size) { pista = true; }', 'la tabla esperaba'],
  [RG, 'tipos.every((g) => delGrupo(o, g) !== false)); }', 'true); }', 'la tabla esperaba'],
  [RG, '\\\\d{3,}${LD}`', '\\\\d{30,}${LD}`', 'la tabla esperaba'],
  [RG, '(?:la|esta|por la|en la|de la)', '(?:zzzz)', 'la tabla esperaba «varias:op1,op2»'],
  [RG, 'const f = fechaDicha(s, x.hoy);', 'const f = fechaDicha("", x.hoy);', 'la tabla esperaba'],
  [RG, 'for (const w of [...hit.values()].flat()) s = s.replace(', 'for (const w of [] as string[]) s = s.replace(', 'la tabla esperaba'],
  [RG, '["barberia", "barbershop", "barber"], ', '', 'la tabla esperaba'],
  [RG, '{ kinds: ["appointment"], dicen: "citas?|appointments?", etiqueta: "cita|appointment" },', '', 'la tabla esperaba'],
  // El texto que ve la persona y los chips.
  [RG, '"No encontré esa operación entre las tuyas."', '"Listo, no encontré esa operación entre las tuyas."', 'el verificador rechaza su respuesta'],
  [RG, '(es ? "Cancela mi" : "Cancel my")', '(es ? "Quitar" : "Remove")', 'no vuelve a elegir UNA operación'],
  // 28 nov · El número solo («R-1042») tras «¿Cuál quieres cancelar?» sigue la pregunta (conversacion.ts, antes del modelo) y elige esa candidata con el mismo verbo.
  [RG, 'export const soloReferencia = (t: string) => SOLO_REF.test(', 'export const soloReferencia = (t: string) => !SOLO_REF.test(', 'soloReferencia debe aceptar'],
  [RG, '(?:¿Cuál quieres (cancelar|abrir)\\?|Which one', '(?:¿Qué quieres (cancelar|abrir)\\?|Which one', 'verboPreguntado no reconoce la pregunta'],
  [RG, '`${verbo === "cancelar" ? (lang === "es" ? "Cancela" : "Cancel") : lang === "es" ? "Abre mi" : "Open my"} ${ref}`', '`${lang === "es" ? "Cancela" : "Cancel"} ${ref}`', 'el mismo verbo'],
  [CV, 'if (soloReferencia(t.texto)) {', 'if (soloReferencia(crudo + "x")) {', 'turno no sigue la pregunta de El Compa'],
  [CV, 'if (verbo) return desdeReglas("seguimiento", ordenConReferencia(verbo, t.texto, lang));', 'if (verbo) return desdeReglas("seguimiento", t.texto);', 'turno no sigue la pregunta de El Compa'],
  // Las marcas y la tabla.
  [RG, '// ◆ elegir:inicio', '// elegir', 'faltan las marcas'],
  [RG, 'export const CASOS_ELEGIR: CasoElegir[] = [', 'export const CASOS_ELEGIR: CasoElegir[] = [].concat([] as never) as CasoElegir[]; const OTROS: CasoElegir[] = [', 'CASOS_ELEGIR'],
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
  const l = lineas.find((x) => x.includes(msg));
  caso(!!l, `${G} al revés (${path.basename(f)}: «${msg}» — ${a.slice(0, 40).replace(/\n/g, ' ')})`, l ? l.trim().slice(0, 200) : lineas.length ? 'otro mensaje: ' + lineas[0].trim().slice(0, 160) : 'el guardián no falló');
}
let limpio = true;
if (!require('../lib/alreves-fin.cjs')(R, { mostrar: true })) limpio = false;
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
