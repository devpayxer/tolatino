// Prueba al revés de 9vc · Ninguna prueba escribe el puerto del servidor (guardián pruebasSinPuertoFijo). Cada caso deshace el arreglo a propósito y el guardián
// tiene que fallar con SU mensaje (el texto de cada caso abajo); después se restaura y los guardianes quedan limpios:
//   una prueba de pruebas/e2e que vuelve a escribir la dirección con el puerto (con la dirección base, con una ruta, con 127.0.0.1, con un host de prueba:puerto) ·
//   una prueba que lee PRUEBAS_PUERTO por su cuenta (UNA sola variable manda: PRUEBAS_URL, y su cuenta vive solo en pruebas/lib/puertos.cjs) ·
//   un script de scripts/ con el puerto escrito · una excepción que ya no existe en su archivo · ENT.B que deja de salir de puertos.cjs ·
//   puertos.cjs con el puerto por defecto cambiado o con la tabla de simuladores mutilada · servir.sh con el puerto o el «fuser -k» escritos a mano ·
//   el corredor que no usa la cuenta de puertos.cjs · el puerto de un simulador o servicio escrito a mano (en una prueba: puerto de App Store Connect, de video,
//   de la moderación con «localhost:…»; en una librería: el traductor de mentira; en servir.sh: el de FCM).
// Además comprueba la cuenta misma (resolver): por defecto 3100 y sus simuladores de siempre; solo PRUEBAS_PUERTO deriva la URL; las dos y distintas dan error
// «no coinciden»; una dirección con ruta o sin puerto da error; el desplazamiento es el mismo para el servidor y los simuladores.
// El puerto se arma con una concatenación para que este archivo no sea, él mismo, una prueba con el puerto escrito.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ, G = 'pruebasSinPuertoFijo', P = '31' + '00', LH = 'localhost:' + P;
const MSP = 'escribe a mano el puerto de un simulador', MSG = 'escribe un host con el puerto 3100', MEX = 'ya no aparece en el archivo';
const E = 'pruebas/e2e/rsv2e.cjs', E2 = 'pruebas/e2e/push8c.cjs', S = 'scripts/tiendas/capturas.mjs', EN = 'pruebas/lib/entorno.cjs', SV = 'pruebas/servir/servir.sh', PU = 'pruebas/lib/puertos.cjs', CO = 'pruebas/correr.mjs';
const casos = [
  [E, "B = ENT.B,", `B = 'http://${LH}',`, MSG, 'la dirección base escrita otra vez'],
  [E, "ENT.S + '/cap/'", `ENT.S + '/cap/'; const __x = 'http://${LH}/entrar'`, MSG, 'una ruta con el puerto escrito'],
  [E, "ENT.S + '/cap/'", `ENT.S + '/cap/'; const __x = 'http://127.0.0.1:${P}'`, MSG, 'con 127.0.0.1'],
  [E2, "'http://pruebas.test:' + new URL(ENT.B).port", `'http://pruebas.test:${P}'`, MSG, 'un host de prueba con el puerto'],
  [S, 'arg("base", "http://127.0.0.1:' + P + '")', 'arg("base", "http://127.0.0.1")', MEX, 'una excepción que ya no existe'],
  [E, "B = ENT.B,", "B = ENT.B, __v = process.env.PRUEBAS_PUERTO,", 'lee PRUEBAS_PUERTO', 'una prueba que lee PRUEBAS_PUERTO por su cuenta'],
  [EN, "B: PU.url,", "B: 'http://localhost:" + P + "',", 'ya no sale de pruebas/lib/puertos.cjs', 'ENT.B sin puertos.cjs'],
  [PU, 'const SERVIDOR = ' + P + ';', 'const SERVIDOR = 3101;', 'la cuenta del puerto', 'puertos.cjs con otro puerto por defecto'],
  [SV, 'VARS=(PORT=$PUERTO ', 'VARS=(PORT=' + P + ' ', 'salen de pruebas/lib/puertos.cjs', 'servir.sh con el puerto escrito'],
  [SV, 'fuser -k "$PUERTO/tcp"', 'fuser -k ' + P + '/tcp', 'salen de pruebas/lib/puertos.cjs', 'servir.sh mata lo que haya en el puerto escrito'],
  [CO, '.resolver(process.env)', '.resolver({})', 'el corredor pregunta la salud', 'el corredor sin la cuenta de puertos.cjs'],
  [PU, 'traductorDm: 5098, ', '', 'perdió entradas', 'puertos.cjs sin una entrada de la tabla de simuladores'],
  ['pruebas/e2e/beta8f.cjs', '{ puerto: ENT.P.asc, publica', '{ puerto: ' + (44 * 100 + 4) + ', publica', MSP, 'App Store Connect con el puerto escrito'],
  ['pruebas/e2e/vid001.cjs', 'PUERTO: String(ENT.P.video)', "PUERTO: '" + (87 * 100 + 91) + "'", MSP, 'el servicio de video con el puerto escrito'],
  ['pruebas/e2e/com5d.cjs', 'localhost:${ENT.P.moderacion}/salud', 'localhost:' + (87 * 100 + 90) + '/salud', MSP, 'la salud de la moderación en localhost:puerto'],
  ['pruebas/lib/stub-traductor.cjs', "require('./puertos.cjs').resolver().p.traductor", String(50 * 100 + 99), MSP, 'el traductor de mentira con el puerto por defecto escrito'],
  [SV, 'PUSH_FCM_URL=http://127.0.0.1:$P_FCM ', 'PUSH_FCM_URL=http://127.0.0.1:' + (44 * 100 + 2) + ' ', MSP, 'servir.sh con el puerto del simulador de FCM escrito'],
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
// La cuenta misma (pruebas/lib/puertos.cjs), sin tocar ningún archivo.
const { resolver, NOMINAL } = require('../lib/puertos.cjs');
const intenta = (env) => { try { return resolver(env); } catch (e) { return e; } };
const verifica = (que, ok, detalle) => { total++; if (ok) bien++; console.log(`  ${ok ? '✓' : '✗'} resolver: ${que}${ok ? '' : ' → ' + detalle}`); };
{
  const d = intenta({}), a = intenta({ PRUEBAS_URL: 'http://localhost:3120' }), b = intenta({ PRUEBAS_PUERTO: '3120' }), c = intenta({ PRUEBAS_URL: 'http://localhost:3120', PRUEBAS_PUERTO: '3121' });
  verifica('sin variables: ' + 'http://localhost:' + P + ' y cada simulador en su puerto de siempre', d.url === 'http://localhost:' + P && Object.entries(NOMINAL).every(([k, v]) => d.p[k] === v), JSON.stringify(d));
  verifica('PRUEBAS_URL manda: el puerto y los simuladores se desplazan igual (+20)', a.puerto === 3120 && a.desp === 20 && a.p.apns === NOMINAL.apns + 20 && a.p.moderacion === NOMINAL.moderacion + 20, JSON.stringify(a));
  verifica('solo PRUEBAS_PUERTO: la dirección se deriva', b.url === 'http://localhost:3120' && b.puerto === 3120, JSON.stringify(b));
  verifica('las dos y distintas: error «no coinciden» antes de arrancar', c instanceof Error && /no coinciden/.test(c.message), String(c.message ?? JSON.stringify(c)));
  verifica('las dos y iguales: sin error', !(intenta({ PRUEBAS_URL: 'http://localhost:3120', PRUEBAS_PUERTO: '3120' }) instanceof Error), 'dio error');
  verifica('una dirección sin puerto o con ruta da error con su motivo', ['http://localhost', 'http://localhost:3120/x', 'localhost:3120'].every((u) => intenta({ PRUEBAS_URL: u }) instanceof Error), 'alguna se aceptó');
  const sh = require('child_process').execSync('node pruebas/lib/puertos.cjs --sh', { cwd: R }).toString(), conocidas = new Set([...sh.matchAll(/^(P_[A-Z]+)=/gm)].map((m) => m[1]));
  const usadas = [...new Set([...fs.readFileSync(path.join(R, SV), 'utf8').matchAll(/\$(P_[A-Z]+)/g)].map((m) => m[1]))];
  verifica('servir.sh solo usa variables que la cuenta entrega (--sh): ' + usadas.length + ' de ' + conocidas.size, usadas.length >= 10 && usadas.every((u) => conocidas.has(u)), usadas.filter((u) => !conocidas.has(u)).join(', ') || 'usa menos de 10');
  verifica('un puerto que saca un simulador de 1024–65535 da error', intenta({ PRUEBAS_PUERTO: '65000' }) instanceof Error && intenta({ PRUEBAS_PUERTO: 'abc' }) instanceof Error, 'se aceptó');
}
let limpio = true;
if (!require('../lib/alreves-fin.cjs')(R)) limpio = false;
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
