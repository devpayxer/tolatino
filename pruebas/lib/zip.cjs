// 9d · Leer un ZIP en las pruebas (Descargar mis datos, Exportar los datos del negocio, Usuarios 360° › Exportar): el directorio central, cada
// archivo (STORE o DEFLATE) y su CRC-32. Sin dependencias (zlib de Node). Devuelve { nombre: Buffer }.
const zlib = require('zlib');
function leerZip(buf) {
  const fin = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (fin < 0) throw new Error('zip: sin directorio central');
  const n = buf.readUInt16LE(fin + 10), off = buf.readUInt32LE(fin + 16), out = {};
  for (let i = 0, p = off; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('zip: entrada central rota');
    const metodo = buf.readUInt16LE(p + 10), crc = buf.readUInt32LE(p + 16), tam = buf.readUInt32LE(p + 20), ln = buf.readUInt16LE(p + 28), le = buf.readUInt16LE(p + 30), lc = buf.readUInt16LE(p + 32), loc = buf.readUInt32LE(p + 42);
    const nombre = buf.slice(p + 46, p + 46 + ln).toString('utf8');
    const l2 = buf.readUInt16LE(loc + 26), e2 = buf.readUInt16LE(loc + 28), datos = buf.slice(loc + 30 + l2 + e2, loc + 30 + l2 + e2 + tam);
    const crudo = metodo === 8 ? zlib.inflateRawSync(datos) : datos;
    if ((zlib.crc32(crudo) >>> 0) !== crc) throw new Error(`zip: CRC de ${nombre}`);
    out[nombre] = crudo;
    p += 46 + ln + le + lc;
  }
  return out;
}
module.exports = { leerZip };
