// Prueba al revés de 9vc · Ninguna prueba escribe el puerto del servidor (guardián pruebasSinPuertoFijo). Cada caso deshace el arreglo a propósito y el guardián
// tiene que fallar con SU mensaje (el texto de cada caso abajo); después se restaura y los guardianes quedan limpios:
//   una prueba de pruebas/e2e que vuelve a escribir la dirección con el puerto (con la dirección base, con una ruta, con 127.0.0.1, con un host de prueba:puerto) ·
//   un script de scripts/ con el puerto escrito · una excepción que ya no existe en su archivo · ENT.B que deja de leer PRUEBAS_URL ·
//   servir.sh con el puerto o el «fuser -k» escritos a mano.
// El puerto se arma con una concatenación para que este archivo no sea, él mismo, una prueba con el puerto escrito.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ, G = 'pruebasSinPuertoFijo', P = '31' + '00', LH = 'localhost:' + P;
const MSG = 'escribe un host con el puerto 3100', MEX = 'ya no aparece en el archivo';
const E = 'pruebas/e2e/rsv2e.cjs', E2 = 'pruebas/e2e/push8c.cjs', S = 'scripts/tiendas/capturas.mjs', EN = 'pruebas/lib/entorno.cjs', SV = 'pruebas/servir/servir.sh';
const casos = [
  [E, "B = ENT.B,", `B = 'http://${LH}',`, MSG, 'la dirección base escrita otra vez'],
  [E, "ENT.S + '/cap/'", `ENT.S + '/cap/'; const __x = 'http://${LH}/entrar'`, MSG, 'una ruta con el puerto escrito'],
  [E, "ENT.S + '/cap/'", `ENT.S + '/cap/'; const __x = 'http://127.0.0.1:${P}'`, MSG, 'con 127.0.0.1'],
  [E2, "'http://pruebas.test:' + new URL(ENT.B).port", `'http://pruebas.test:${P}'`, MSG, 'un host de prueba con el puerto'],
  [S, 'arg("base", "http://127.0.0.1:' + P + '")', 'arg("base", "http://127.0.0.1")', MEX, 'una excepción que ya no existe'],
  [EN, "B: process.env.PRUEBAS_URL || 'http://localhost:" + P + "'", "B: 'http://localhost:" + P + "'", 'ya no sale de PRUEBAS_URL', 'ENT.B sin PRUEBAS_URL'],
  [SV, 'VARS=(PORT=$PUERTO ', 'VARS=(PORT=' + P + ' ', 'salen de PRUEBAS_PUERTO', 'servir.sh con el puerto escrito'],
  [SV, 'fuser -k "$PUERTO/tcp"', 'fuser -k ' + P + '/tcp', 'salen de PRUEBAS_PUERTO', 'servir.sh mata lo que haya en el puerto escrito'],
];
// El caso 1 parte de una línea con «B = ENT.B,»: si esa prueba cambia, el caso se queda sin texto y lo dice (✗), no pasa en silencio.
const soloTextos = !!process.env.ALREVES_SOLO_TEXTOS;
let bien = 0, total = 0;
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return []; }
  catch (e) { return String(e.stderr).split('\n').filter((x) => x.trim().startsWith(`[${G}]`)); }
};
for (const [f, a, b, msg, que] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  total++;
  if (!orig.includes(a)) { console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  try {
    const lineas = correr();
    const l = soloTextos ? lineas[0] : lineas.find((x) => x.includes(msg));
    console.log(`  ${l ? '✓' : '✗'} ${G} al revés (${path.basename(f)}: ${que})${l ? ' → ' + l.trim().slice(0, 170) : lineas.length ? ' → otro mensaje: ' + lineas[0].trim().slice(0, 160) : ' → el guardián no falló'}`);
    if (l) bien++;
  } finally { fs.writeFileSync(ruta, orig); }
}
let limpio = true;
if (!require('../lib/alreves-fin.cjs')(R)) limpio = false;
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
