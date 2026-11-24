// 9a · El entorno de cada prueba de punta a punta y al revés. EL REPO ES PÚBLICO: aquí no hay ni un secreto.
// - RAIZ: la raíz del repo (las pruebas nunca llevan una ruta absoluta de una máquina).
// - S: la carpeta de salida de la corrida ($PRUEBAS_SALIDA; por defecto <tmp>/tolatino-pruebas, FUERA del repo): capturas (cap/), el registro
//   del servidor (server.log), lo que una prueba deja en disco y los secretos de la corrida (secretos.env).
// - Los secretos (AUTH_SECRET, BARRIDO_TOKEN, STRIPE_WEBHOOK_SECRET, DATOS_SECRET, REVISION_CODIGO_*…) los genera al azar
//   pruebas/servir/servir.sh en $PRUEBAS_SALIDA/secretos.env y el servidor local arranca con ellos; aquí solo se leen (lo que ya está en el
//   entorno del proceso manda).
// - REC: los recursos de terceros que ninguna prueba debe subir al repo (jsQR, el generador de QR, los documentos de descubrimiento de Google,
//   fotos de prueba, el venv de la moderación). Los baja o los hace pruebas/servir/recursos.sh en $PRUEBAS_SALIDA/recursos.
const fs = require('fs'), path = require('path'), os = require('os');

const RAIZ = path.resolve(__dirname, '..', '..');
const S = path.resolve(process.env.PRUEBAS_SALIDA || path.join(os.tmpdir(), 'tolatino-pruebas'));
const REC = path.resolve(process.env.PRUEBAS_RECURSOS || path.join(S, 'recursos'));
const SECRETOS = process.env.PRUEBAS_SECRETOS || path.join(S, 'secretos.env');
if (S.startsWith(RAIZ + path.sep)) throw new Error(`PRUEBAS_SALIDA (${S}) está dentro del repo: tiene que quedar fuera (lleva secretos y capturas)`);
fs.mkdirSync(path.join(S, 'cap'), { recursive: true });

const leer = (f) => {
  const out = {};
  if (!fs.existsSync(f)) return out;
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) { const m = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(l); if (m) out[m[1]] = m[2]; }
  return out;
};
for (const [k, v] of Object.entries(leer(SECRETOS))) if (process.env[k] === undefined) process.env[k] = v;

const falta = (k) => { throw new Error(`falta ${k}: corre primero «bash pruebas/servir/servir.sh» (escribe ${SECRETOS})`); };
const sec = (k) => process.env[k] || falta(k);

// 9b-2 · El dispositivo de esta corrida (PRUEBAS_DISPOSITIVO: iphone-se, iphone-15, iphone-15-pro-max, pixel, galaxy, ipad, escritorio-1024,
// escritorio-1280, escritorio-1440; ver dispositivos.cjs). Sin variable: null = teléfono 390 y escritorio 1360 como siempre. Las pruebas no tienen que
// leerlo: pruebas/lib/dispositivo-precarga.cjs (la pone correr.mjs --dispositivo) ya cambia cada contexto; esto es para las nuevas.
const DISPOSITIVO = process.env.PRUEBAS_DISPOSITIVO || null;
// Una prueba que comprueba algo A UN ANCHO (320 del piso, 640 de una ventana estrecha, una lista de anchos) pone su viewport con anchoPropio(w, h):
// la precarga del dispositivo lo respeta en vez de cambiarlo al del dispositivo (375, 834…). Lo que vale para cualquier ancho NO lo usa: mide
// contra window.innerWidth o page.viewportSize() y corre al ancho de cada dispositivo. Sin dispositivo, es el viewport de siempre.
const anchoPropio = (width, height) => ({ width, height, [Symbol.for('tolatino.anchoPropio')]: true });
// Lo mismo para una prueba que necesita un ESCRITORIO con ratón (pasar el cursor, hover): en una tableta o un teléfono el contexto sería táctil y sin
// cursor. Va al ancho pedido, sin agente móvil, sin toque y sin escala del dispositivo; el motor (WebKit o Chromium) sigue siendo el del dispositivo.
const escritorioPropio = (width, height) => ({ width, height, [Symbol.for('tolatino.anchoPropio')]: 'escritorio' });

// 22 nov · La dirección del servidor de esta corrida (B) y los puertos de sus simuladores (P): salen de UNA variable, PRUEBAS_URL (pruebas/lib/puertos.cjs).
// Sin variables: el servidor en :3100 y los puertos de siempre. Ninguna prueba escribe el puerto (guardián pruebasSinPuertoFijo).
const PU = require('./puertos.cjs').resolver();

module.exports = {
  RAIZ, S, REC, SECRETOS, DISPOSITIVO, anchoPropio, escritorioPropio,
  get DISP() { return DISPOSITIVO ? require('./dispositivos.cjs').de(DISPOSITIVO) : null; },
  OUT: path.join(S, 'cap') + '/',
  B: PU.url,
  P: PU.p,
  PUERTO: PU.puerto,
  DB: process.env.PRUEBAS_DB_CONT || 'tlprueba-db-1',
  get TOK() { return sec('BARRIDO_TOKEN'); },
  sec,
  rec: (x) => path.join(REC, x),
  env: process.env,
};
