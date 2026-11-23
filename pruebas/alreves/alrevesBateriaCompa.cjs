// Prueba al revés de bateriaCompaFija (22 nov): la batería de El Compa para el modelo real (scripts/compa/bateria/). Dos mitades:
//  (1) Sus casos propios en verde (node scripts/compa/bateria/correr.mjs --casos: la revisión determinista, buenas y malas) y la corrida contra las
//      reglas fijas (sin red ni clave): todo caso corre en español y en inglés y el porcentaje sale por audiencia.
//  (2) Al revés: cada caso rompe una regla a propósito (en los casos, en el corredor, en el motor, en la revisión o en lo que la batería reutiliza
//      de lib/compa) y el guardián tiene que fallar con SU mensaje; después se restaura y los guardianes quedan limpios.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync, spawnSync } = require('child_process');
const R = ENT.RAIZ, G = 'bateriaCompaFija';
const D = 'scripts/compa/bateria', C = D + '/correr.mjs', M = D + '/motor.mjs', REV = D + '/revision.mjs', K = D + '/casos.mjs', E = D + '/casos/escenarios.json', V = D + '/casos/vecino.json', CV = 'apps/web/lib/compa/conversacion.ts';
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
  // El motor: el tope de llamadas y ningún reintento.
  [M, 'if (nombre === "claude" && o.llamadas >= o.max) throw new TopeDeLlamadas(`tope de ${o.max} llamadas al modelo`);', '', 'cada llamada al modelo real cuenta y no pasa del tope'],
  [M, 'const s = await base.responder({ ...entrada, esperaMs: o.esperaMs });', 'let s; for (let i = 0; i < 2; i++) s = await base.responder({ ...entrada, esperaMs: o.esperaMs });', 'sin reintentos silenciosos'],
  // La revisión: deja de cazar lo malo, o de dejar pasar lo bueno (sus casos propios lo notan).
  [REV, 'const EMOJI = /\\p{Extended_Pictographic}|\\p{Regional_Indicator}/u;', 'const EMOJI = /zzzzzz/u;', 'los casos de la revisión no pasan'],
  [REV, 'no_se_hace_pasar: (s) => (HACE_PASAR.test(sa(s.texto)) ?', 'no_se_hace_pasar: (s) => (true ?', 'los casos de la revisión no pasan'],
  [K, 'const PERMITIDO_TEL = /^570555\\d{4}$/;', 'const PERMITIDO_TEL = /^\\d{10}$/;', 'los casos de la revisión no pasan'],
  // Lo que la batería reutiliza de lib/compa: el sistema fijo de verdad, no una copia.
  [CV, 'export const SISTEMA_VECINO = [', 'export const SISTEMA_VECINO_X = [', 'no cargo SISTEMA_VECINO'],
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
