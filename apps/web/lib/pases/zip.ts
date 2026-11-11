import "server-only";
import { crc32, deflateRawSync } from "node:zlib";

/* 8g · Un ZIP (PKWARE APPNOTE 6.3, lo mínimo: sin cifrado, sin ZIP64, sin comentarios) para el .pkpass: cada archivo con su CRC-32, DEFLATE si
   achica y STORE si no; fecha fija (1 ene 2026) para que el mismo pase dé los mismos bytes. Módulo autocontenido (sin dependencias). */
const FECHA = ((2026 - 1980) << 9) | (1 << 5) | 1, HORA = 0;

export function zip(archivos: [string, Buffer][]): Buffer {
  const locales: Buffer[] = [], centrales: Buffer[] = [];
  let off = 0;
  for (const [nombre, datos] of archivos) {
    if (!/^[A-Za-z0-9@._/-]{1,100}$/.test(nombre) || nombre.includes("..")) throw new Error(`zip: nombre «${nombre}»`);
    const n = Buffer.from(nombre, "utf8"), c = deflateRawSync(datos, { level: 9 }), comprimir = c.length < datos.length;
    const cuerpo = comprimir ? c : datos, crc = crc32(datos) >>> 0, metodo = comprimir ? 8 : 0;
    const l = Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(0x0800, 6); l.writeUInt16LE(metodo, 8); l.writeUInt16LE(HORA, 10); l.writeUInt16LE(FECHA, 12);
    l.writeUInt32LE(crc, 14); l.writeUInt32LE(cuerpo.length, 18); l.writeUInt32LE(datos.length, 22); l.writeUInt16LE(n.length, 26); l.writeUInt16LE(0, 28);
    const k = Buffer.alloc(46);
    k.writeUInt32LE(0x02014b50, 0); k.writeUInt16LE(0x0314, 4); k.writeUInt16LE(20, 6); k.writeUInt16LE(0x0800, 8); k.writeUInt16LE(metodo, 10); k.writeUInt16LE(HORA, 12); k.writeUInt16LE(FECHA, 14);
    k.writeUInt32LE(crc, 16); k.writeUInt32LE(cuerpo.length, 20); k.writeUInt32LE(datos.length, 24); k.writeUInt16LE(n.length, 28); k.writeUInt16LE(0, 30); k.writeUInt16LE(0, 32);
    k.writeUInt16LE(0, 34); k.writeUInt16LE(0, 36); k.writeUInt32LE((0o100644 << 16) >>> 0, 38); k.writeUInt32LE(off, 42);
    locales.push(l, n, cuerpo); centrales.push(k, n);
    off += 30 + n.length + cuerpo.length;
  }
  const cd = Buffer.concat(centrales), fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(0, 4); fin.writeUInt16LE(0, 6); fin.writeUInt16LE(archivos.length, 8); fin.writeUInt16LE(archivos.length, 10);
  fin.writeUInt32LE(cd.length, 12); fin.writeUInt32LE(off, 16); fin.writeUInt16LE(0, 20);
  return Buffer.concat([...locales, cd, fin]);
}
