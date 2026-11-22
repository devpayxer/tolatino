// 22 nov (revisión del CI, tanda 3a) · «La Configuración ya llegó al servidor»: lo que antes era `dormir(16000)` en 53 sitios de 20 pruebas.
//
// Por qué sobraba la espera: desde 0133 cada escritura en platform_config, feature_flags, config_keys, cities, mod_rules, mod_terms y synonyms
// dispara NOTIFY tl_config, y cada capa del servidor (rutas, páginas, acciones, arranque: cada una con su copia del módulo y su propia conexión
// LISTEN, lib/cambios-config.ts) olvida su copia de 15 s al momento. Los 15 s son solo el respaldo si la escucha se corta. Una espera fija de
// 16 s tapaba justo eso: una escucha rota pasaba igual. Aquí se mira de verdad:
//   1. Al cargar este archivo (al empezar la prueba) se anotan las conexiones que escuchan el canal (pg_stat_activity, «listen tl_config…»).
//   2. `await configLista()` después de escribir: si todas siguen vivas (y hay al menos una), el aviso salió con la escritura (el disparador es
//      por sentencia y el NOTIFY se entrega al confirmar) y basta el margen de que Node lo procese (MARGEN_MS; la consulta misma cuesta ~80 ms).
//      Si falta alguna (o no hay ninguna), espera el respaldo de 16 s COMO ANTES y lo dice en la salida: nunca pasa en silencio.
//   3. `configLista({ ver })`: además espera (sondeo de 100 ms, tope 16 s) a que `ver()` devuelva verdadero, o sea, a que el cambio se vea por la
//      vía que la prueba usa (una página, una ruta, una acción). Si no se ve en 16 s, FALLA (antes la afirmación de después fallaba igual).
// No cambia el producto. Lo que NO cubre (se anota en LAUNCH): una lectura que salió antes del cambio y vuelve después del aviso deja el valor
// viejo hasta 15 s (config.ts guarda la copia al volver sin mirar si llegó un aviso entre medias; ventana de milisegundos).
const { execFileSync } = require('child_process');
const ENT = require('./entorno.cjs');

const MARGEN_MS = 1000;      // lo que tarda Node en procesar el aviso (medido: 28–104 ms en local; el resto es holgura para una máquina del CI cargada)
const RESPALDO_MS = 16000;   // la copia del servidor vence a los 15 s
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Las conexiones que escuchan tl_config, por pid. El texto de una conexión ociosa es su última sentencia («listen tl_config; listen ciudades»).
const CONSULTA = `select pid from pg_stat_activity where datname = 'tolatino' and pid <> pg_backend_pid() and query ~* '^\\s*listen\\s+tl_config' order by pid`;
function escuchas() {
  const out = execFileSync('docker', ['exec', ENT.DB, 'psql', '-U', 'tolatino', '-d', 'tolatino', '-At', '-c', CONSULTA], { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
  return out ? out.split('\n').map(Number) : [];
}

let base = null;
function inicio() { try { base = escuchas(); } catch { base = []; } return base; }
inicio();

let esperas = 0, respaldos = 0;
/* Después de escribir configuración: espera a que el servidor la vea (ver arriba). Devuelve { respaldo, ms }.
   opciones: ver (async () => boolean), que (texto para el mensaje), margen (ms), respaldoMs (para probar el camino del respaldo sin esperar 16 s). */
async function configLista({ ver, que = 'la configuración', margen = MARGEN_MS, respaldoMs = RESPALDO_MS } = {}) {
  const t0 = Date.now();
  esperas++;
  const ahora = escuchas();
  const faltan = base.filter((p) => !ahora.includes(p));
  if (!ahora.length || faltan.length) {
    respaldos++;
    console.log(`  ⚠ config-lista: ${ahora.length ? `la escucha estaba caída (faltan los pids ${faltan.join(', ')}; ahora ${ahora.join(', ')})` : 'no hay ninguna conexión escuchando tl_config'}: espero el respaldo de ${respaldoMs / 1000} s para ${que}`);
    await dormir(respaldoMs);
    base = escuchas();   // lo que hay ahora es la nueva línea de base (no se repite el respaldo en cada sitio)
    return { respaldo: true, ms: Date.now() - t0 };
  }
  base = ahora;           // si apareció alguna escucha nueva, desde aquí también se vigila
  if (ver) {
    const tope = Date.now() + RESPALDO_MS;
    while (!(await ver())) {
      if (Date.now() > tope) throw new Error(`config-lista: ${que} no se vio en ${RESPALDO_MS / 1000} s por la vía de la prueba (la escucha está viva: ${ahora.join(', ')})`);
      await dormir(100);
    }
  } else await dormir(margen);
  return { respaldo: false, ms: Date.now() - t0 };
}

module.exports = { configLista, escuchas, inicio, RESPALDO_MS, MARGEN_MS, resumen: () => ({ esperas, respaldos }) };
