// 23 nov · Pone en el almacén de pruebas (Garage) el ARCHIVO de una foto privada cuya fila la sembró la prueba directo en la base (una «foto simulada»).
// Hace falta desde el 22 nov: las rutas de fotos privadas contestan 404 (el mismo de «no tienes permiso») cuando la fila vive pero el archivo no está,
// así que una prueba ya no puede leer «pasó el permiso» de un 500 por archivo ausente: tiene que ver la foto de verdad (200). Usa lib/medios.ts REAL
// con la llave de la corrida (secretos.env), como almacen-quitar.cjs.
//   const { ponerEnAlmacen } = require('../lib/almacen-poner.cjs');   await ponerEnAlmacen(sql, idDeLaFoto, bufferJpeg);
// Devuelve la llave donde quedó. Falla si la fila no existe, no es privada o su dirección no es la llave de una privada.
require('./entorno.cjs');
const { cargar } = require('./ts-servidor.cjs');
async function ponerEnAlmacen(sql, id, jpg) {
  process.env.MEDIOS_S3_URL = process.env.MEDIOS_S3_URL || `http://127.0.0.1:${process.env.PRUEBAS_S3_PUERTO || 3900}`;
  const url0 = sql(`select url from media where id = '${id}' and private`);
  if (!url0) throw new Error(`almacen-poner: la foto ${id} no existe o no es privada`);
  const url = url0.startsWith('/api/medios/privada/') ? `privado/o/${id}.jpg` : url0;
  if (!/^privado\/[oamer]\/[0-9a-f-]{36}\.jpg$/.test(url)) throw new Error(`almacen-poner: la dirección ${url} no es la llave de una privada`);
  await cargar('apps/web/lib/medios.ts').guardarObjeto(url, jpg, 'image/jpeg');
  return url;
}
module.exports = { ponerEnAlmacen };
