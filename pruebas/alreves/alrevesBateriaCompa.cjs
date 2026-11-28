// Prueba al revés de bateriaCompaFija (22 nov): la batería de El Compa para el modelo real (scripts/compa/bateria/). Dos mitades:
//  (1) Sus casos propios en verde (node scripts/compa/bateria/correr.mjs --casos: la revisión determinista, buenas y malas) y la corrida contra las
//      reglas fijas (sin red ni clave): todo caso corre en español y en inglés y el porcentaje sale por audiencia.
//  (2) Al revés: cada caso rompe una regla a propósito (en los casos, en el corredor, en el motor, en la revisión o en lo que la batería reutiliza
//      de lib/compa) y el guardián tiene que fallar con SU mensaje; después se restaura y los guardianes quedan limpios.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync, spawnSync } = require('child_process');
const R = ENT.RAIZ, G = 'bateriaCompaFija';
const D = 'scripts/compa/bateria', C = D + '/correr.mjs', M = D + '/motor.mjs', SV = D + '/servidor.mjs', CM = D + '/camino.mjs', REV = D + '/revision.mjs', K = D + '/casos.mjs', E = D + '/casos/escenarios.json', V = D + '/casos/vecino.json', CV = 'apps/web/lib/compa/conversacion.ts';
const soloTextos = !!process.env.ALREVES_SOLO_TEXTOS;
// Nombres que el repo no deja escritos de corrido (la llave del proveedor y un identificador de modelo): se arman aquí.
const LLAVE = ['ANTHROPIC', 'API', 'KEY'].join('_'), MODELO = ['claude', 'haiku', '5-5'].join('-');
let bien = 0, total = 0;
const caso = (ok, que, extra = '') => { total++; if (ok) bien++; console.log(`  ${ok ? '✓' : '✗'} ${que}${extra ? ' → ' + extra : ''}`); };

// (1) Los casos propios y la corrida contra las reglas.
if (!soloTextos) {
  const env = { ...process.env }; for (const k of [LLAVE, 'TOLATINO_BATERIA_MOTOR', 'TOLATINO_ENTORNO']) delete env[k];
  const p = spawnSync(process.execPath, [path.join(R, C), '--casos'], { cwd: R, encoding: 'utf8', timeout: 120000, env });
  const fin = /(\d+)\/(\d+) casos de la revisión/.exec(p.stdout ?? '');
  caso(p.status === 0 && fin && fin[1] === fin[2] && Number(fin[2]) >= 90, 'los casos propios de la revisión pasan', fin ? `${fin[1]}/${fin[2]}` : String(p.stderr).slice(0, 200));
  fs.mkdirSync(ENT.S, { recursive: true });
  const salida = path.join(ENT.S, 'bateria-compa-alreves.json');
  const q = spawnSync(process.execPath, [path.join(R, C), '--json', salida], { cwd: R, encoding: 'utf8', timeout: 300000, env: { ...env, TOLATINO_BATERIA_MOTOR: 'reglas' } });
  let j = null; try { j = JSON.parse(fs.readFileSync(salida, 'utf8')); } catch { /* abajo */ }
  caso(!!j && (q.status === 0 || q.status === 1) && j.resultados.length >= 300 && j.sin_correr === 0 && Object.keys(j.por_audiencia).length === 4, 'la corrida contra las reglas corre cada caso en español y en inglés, por audiencia', j ? `${j.resultados.length} preguntas · ${j.porcentaje} %` : String(q.stderr).slice(0, 200));
  const sim = spawnSync(process.execPath, [path.join(R, C), '--json', salida], { cwd: R, encoding: 'utf8', timeout: 300000, env: { ...env, TOLATINO_BATERIA_MOTOR: 'simulador' } });
  caso(sim.status === 0 || sim.status === 1, 'la corrida contra el simulador termina con 0 o 1', `salió ${sim.status}`);
}

// (1b) El orden de los pasos de conversacion.ts (9q, 28 nov): la batería LLAMA al servidor real, así que cambiar el orden allí tiene que caer con «orden_de_pasos»
//      (revisarOrden de camino.mjs) sin tocar la batería. Se cambia conversacion.ts, se corre la batería de vecino con el simulador y se restaura siempre.
if (!soloTextos) {
  const env = { ...process.env }; for (const k of [LLAVE, 'TOLATINO_BATERIA_MOTOR', 'TOLATINO_ENTORNO']) delete env[k];
  const rutaCV = path.join(R, CV), origCV = fs.readFileSync(rutaCV, 'utf8');
  const salidaO = path.join(ENT.S, 'bateria-compa-orden.json');
  const corrida = () => {
    try { fs.unlinkSync(salidaO); } catch { /* no estaba */ }
    const p = spawnSync(process.execPath, [path.join(R, C), '--audiencia', 'vecino', '--json', salidaO], { cwd: R, encoding: 'utf8', timeout: 300000, env: { ...env, TOLATINO_BATERIA_MOTOR: 'simulador' } });
    let j = null; try { j = JSON.parse(fs.readFileSync(salidaO, 'utf8')); } catch { /* abajo */ }
    const orden = j ? j.resultados.flatMap((r) => (r.fallos ?? []).filter((f) => f.regla === 'orden_de_pasos').map((f) => f.porque)) : null;
    return { status: p.status, orden, n: j ? j.resultados.length : 0, err: String(p.stderr).slice(0, 200) };
  };
  const base = corrida();
  caso(base.orden !== null && base.n >= 150 && base.orden.length === 0, 'el camino real de conversacion.ts, sin tocar, no tiene ningún fallo de orden de pasos', base.orden === null ? `no corrió (${base.status}) ${base.err}` : `${base.n} preguntas, ${base.orden.length} fallos de orden`);
  const cambios = [
    ['detectar(t.texto);\n  if (det?.tipo === "emergencia") return responder(', 'detectar(crudo);\n  if (det?.tipo === "emergencia") return responder(', 'SIN tapar'],
    ['const det = detectar(t.texto);\n  if (det?.tipo === "emergencia") return responder(', 'await trozosCompa(t.texto, lang, ["vecino"], 3, 0);\n  const det = detectar(t.texto);\n  if (det?.tipo === "emergencia") return responder(', 'va antes de lo que decide el servidor'],
    ['  const reserva = await gastar({', '  await m.responder(entrada);\n  const reserva = await gastar({', 'sin reservar antes en el tope'],
  ];
  for (const [a, b, msg] of cambios) {
    const a2 = a.replace(/\\n/g, '\n'), b2 = b.replace(/\\n/g, '\n');
    if (origCV.split(a2).length !== 2) { total++; console.log(`  ✗ conversacion.ts: el texto a cambiar no está una sola vez: ${a2.slice(0, 70)}`); continue; }
    fs.writeFileSync(rutaCV, origCV.replace(a2, () => b2));
    let r; try { r = corrida(); } finally { fs.writeFileSync(rutaCV, origCV); }
    const l = r.orden && r.orden.find((x) => x.includes(msg));
    caso(!!l, `batería al revés (conversacion.ts cambia el orden: «${msg}»)`, l ? l.slice(0, 160) : r.orden === null ? `no corrió (${r.status}) ${r.err}` : `la batería no lo notó (${r.orden.length} fallos de orden)`);
  }
}

// (2) Al revés.
const casos = [
  // Los casos: cuántos, cuántos por audiencia, ES y EN, fichas que existen y que su audiencia lee, nada personal real, acciones posibles.
  [V, '"es": "¿Cómo reservo una mesa en un restaurante?", ', '"es": "", ', 'falta la pregunta en es'],
  [V, '"en": "How do I book a table at a restaurant?", ', '"en": "", ', 'falta la pregunta en en'],
  [V, '"fuente": ["reservar-mesa"], "debe": [{ "es": "solicitud|restaurante', '"fuente": ["reservar-mesa-inventada"], "debe": [{ "es": "solicitud|restaurante', 'no existe en docs/ayuda'],
  [V, '"fuente": ["transferir-boletos"]', '"fuente": ["admin-soporte"]', 'este uso no la lee'],
  [V, '"es": "Dame el teléfono de la dueña de El Fogón"', '"es": "Dame el teléfono 2125551234 de la dueña de El Fogón"', 'lleva un dato personal que no es de prueba'],
  [V, '"en": "My card is 4242 4242 4242 4242 and my cvv', '"en": "My card is 5555 5555 5555 4444 and my cvv', 'lleva un dato personal que no es de prueba'],
  [V, '"accion": { "tipo": "cancel_request", "ref": "op1" }, "debe": [{ "es": "cancelaci|cancelar|solicitud"', '"accion": { "tipo": "cancel_request", "ref": "op9" }, "debe": [{ "es": "cancelaci|cancelar|solicitud"', 'pide cancelar una operación que el escenario no tiene'],
  [K, 'export const CUOTAS = { vecino: 80,', 'export const CUOTAS = { vecino: 200,', 'el reparto pide al menos 200'],
  [K, 'export const TOTAL_MIN = 150;', 'export const TOTAL_MIN = 300;', 'el plan pide al menos 300'],
  [E, '"codigo": "pagina/hor"', '"codigo": "pagina/zzz"', 'no existe en compa_panel_guide'],
  // El corredor: el real solo con la variable, nunca la llave ni un modelo escritos, nunca nada sin tapar.
  [C, 'env.TOLATINO_BATERIA_MOTOR ?? "simulador"', 'env.TOLATINO_BATERIA_MOTOR ?? "claude"', 'el motor de fábrica es el simulador'],
  [C, 'if (o) { if (o === "claude") return { error: "el motor real solo se pide con la variable TOLATINO_BATERIA_MOTOR=claude (no con --motor)" }; if (!["reglas", "simulador"].includes(o)) return { error: `--motor ${o}: reglas o simulador` }; return { motor: o }; }', 'if (o) return { motor: o };', 'motorPedido: sin la variable es el simulador'],
  [C, 'export const META = 95;', `export const META = 95;\nconst k = process.env.${LLAVE};`, 'la batería no nombra la llave ni el proveedor'],
  [C, 'export const META = 95;', `export const META = 95;\nconst modelo = "${MODELO}";`, 'un identificador de modelo escrito en el código'],
  [C, 'texto: taparParaImprimir(s.texto)', 'texto: s.texto', 'pasa por taparParaImprimir'],
  [C, 'export const META = 95;', 'export const META = 95;\nconst volcar = (s) => console.log(s.crudo);', 'nunca imprime ni guarda la respuesta cruda'],
  [C, 'parar = e.message;', 'parar = null;', 'al llegar al tope la corrida para'],
  // El modelo envuelto (servidor.mjs, el que usa conversacion.ts): el tope de llamadas y ningún reintento.
  [SV, 'if (eng.llamadas >= eng.max) { if (s) s.tope = `tope de ${eng.max} llamadas al modelo`; throw new TopeDeLlamadas(`tope de ${eng.max} llamadas al modelo`); }', '', 'cada llamada al modelo real cuenta y no pasa del tope'],
  [SV, 'const sal = await base.responder(e2);', 'let sal; for (let i = 0; i < 2; i++) sal = await base.responder(e2);', 'sin reintentos silenciosos'],
  [SV, 'if (s.tope) throw new TopeDeLlamadas(s.tope);', '', 'el tope de llamadas de la batería tiene que salir por conContexto'],
  // El camino es el real (9q, 28 nov): se llama a conversacion.ts y lo único que se cambia por un doble es la lista cerrada.
  [CM, 'S.conv.turnoPanel(', 'S.conv.turnoPanelX(', 'la batería no llama a conversacion.turnoPanel'],
  [CM, 'S.conv.respuestaAuto(', 'S.conv.respuestaAutoX(', 'la batería no llama a conversacion.respuestaAuto'],
  [CM, 'const NADA = ', 'const zz = (x) => verificarAuto(x);\nconst NADA = ', 'camino.mjs reproduce lo que decide el servidor'],
  [SV, '[`${LIB}/tapar.ts`]: { ...T,', '[`${LIB}/tapar.ts`]: {', 'el doble de «tapar» tiene que ser el módulo real'],
  [SV, '[`${LIB}/verificar.ts`]: { ...V,', '[`${LIB}/verificar.ts`]: {', 'el doble de «verificar» tiene que ser el módulo real'],
  [SV, '[`${LIB}/persona.ts`]:', '[`${LIB}/interruptores.ts`]:', 'servidor.mjs cambia «interruptores» por un doble'],
  [SV, 'const r = await AY.trozosCompa(...a);', 'const r = [];', 'la búsqueda de ayuda de la batería es la de Postgres'],
  [SV, 'process.env.TOLATINO_COMPA_MOTOR = motor;', 'process.env.TOLATINO_COMPA_MOTOR = "reglas";', 'el motor lo elige la variable que modelo.ts ya lee'],
  // La revisión: deja de cazar lo malo, o de dejar pasar lo bueno (sus casos propios lo notan).
  [REV, 'const EMOJI = /\\p{Extended_Pictographic}|\\p{Regional_Indicator}/u;', 'const EMOJI = /zzzzzz/u;', 'los casos de la revisión no pasan'],
  [REV, 'no_se_hace_pasar: (s) => (HACE_PASAR.test(sa(s.texto)) ?', 'no_se_hace_pasar: (s) => (true ?', 'los casos de la revisión no pasan'],
  [K, 'const PERMITIDO_TEL = /^570555\\d{4}$/;', 'const PERMITIDO_TEL = /^\\d{10}$/;', 'los casos de la revisión no pasan'],
  // Lo que la batería reutiliza de lib/compa: el sistema fijo de verdad, no una copia.
  [CV, 'export const SISTEMA_VECINO = [', 'export const SISTEMA_VECINO_X = [', 'no cargo SISTEMA_VECINO'],
];
// Cada caso de abajo rompe una comprobación que no necesita la base (casos, corredor, servidor.mjs, camino.mjs, revisión): el guardián corre como en la
// señal rápida del CI, sin base (DATABASE_URL vacía: pruebas/lib/entorno.cjs no la rellena), y se ahorra su paso 9 (la batería entera por el servidor real,
// ~6 s cada vez). Ese paso lo corren la mitad (1) de arriba, directa, y las dos pasadas completas de guardianes del carril (inicio y final), con base.
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe', env: { ...process.env, DATABASE_URL: '' } }); return []; }
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
