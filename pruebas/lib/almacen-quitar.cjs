// 22 nov · Saca del almacén de pruebas (Garage) el ARCHIVO de una foto privada (la maestra y todas sus variantes) sin tocar su fila de media: el caso
// «la fila vive pero el archivo no está». Las rutas de fotos privadas (Mensajes, ayuda, entrega, reclamo, destino privado) deben dar 404 (el mismo que
// «no tienes permiso») y no dejar renglón de «vio la foto»; antes daban 500. Usa lib/medios.ts REAL con la llave de la corrida (secretos.env).
//   const { quitarDelAlmacen } = require('../lib/almacen-quitar.cjs');   const claves = await quitarDelAlmacen(sql, idDeLaFoto);
// Devuelve las llaves que sacó (la maestra y las variantes anotadas en var_widths). Falla si la fila no existe o no es privada.
require('./entorno.cjs'); // carga los secretos de la corrida (MEDIOS_KEY_ID, MEDIOS_SECRET) en process.env
const { cargar } = require('./ts-servidor.cjs');
async function quitarDelAlmacen(sql, id) {
  process.env.MEDIOS_S3_URL = process.env.MEDIOS_S3_URL || `http://127.0.0.1:${process.env.PRUEBAS_S3_PUERTO || 3900}`;
  const fila = sql(`select url || '|' || coalesce(array_to_string(var_widths, ','), '') from media where id = '${id}' and private`);
  if (!fila) throw new Error(`almacen-quitar: la foto ${id} no existe o no es privada`);
  const [url0, ws] = fila.split('|');
  const url = url0.startsWith('/api/medios/privada/') ? `privado/o/${id}.jpg` : url0; // destino «privado»: la llave no es la dirección (lib/fotos-privadas.ts llavePrivada)
  if (!/^privado\/[oamer]\/[0-9a-f-]{36}\.jpg$/.test(url)) throw new Error(`almacen-quitar: la dirección ${url} no es la llave de una privada`);
  const A = cargar('apps/web/lib/medios.ts');
  const claves = [url, ...ws.split(',').filter(Boolean).map((w) => url.replace(/\.jpg$/, `.w${w}.webp`))];
  for (const k of claves) await A.borrarObjeto(k);
  return claves;
}
module.exports = { quitarDelAlmacen };
