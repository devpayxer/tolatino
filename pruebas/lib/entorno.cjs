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

module.exports = {
  RAIZ, S, REC, SECRETOS,
  OUT: path.join(S, 'cap') + '/',
  B: process.env.PRUEBAS_URL || 'http://localhost:3100',
  DB: process.env.PRUEBAS_DB_CONT || 'tlprueba-db-1',
  get TOK() { return sec('BARRIDO_TOKEN'); },
  sec,
  rec: (x) => path.join(REC, x),
  env: process.env,
};
