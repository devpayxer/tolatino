import "server-only";
import { crc32, deflateRawSync } from "node:zlib";

/* 8g · Un ZIP (PKWARE APPNOTE 6.3, lo mínimo: sin cifrado, sin ZIP64, sin comentarios) para el .pkpass: cada archivo con su CRC-32, DEFLATE si
   achica y STORE si no; fecha fija (1 ene 2026) para que el mismo pase dé los mismos bytes. Módulo autocontenido (sin dependencias). */
const FECHA = ((2026 - 1980) << 9) | (1 << 5) | 1, HORA = 0;

/* 9t · El mismo ZIP armado de a un archivo: cada uno se comprime al agregarlo y su texto crudo se puede soltar (la exportación de datos de una
   cuenta grande no tiene todo en memoria a la vez: solo lo comprimido). zip() = agregar todos y cerrar: los mismos bytes que antes.
   22 nov · `salida`: cada trozo ya comprimido se entrega en orden al llegar (la exportación lo escribe a un archivo temporal y lo sube desde el
   disco) y no se guarda aquí; cerrar() escribe el índice y devuelve un Buffer vacío. Los bytes son los mismos que sin `salida`. */
export function zipPorPartes(salida?: (b: Buffer) => void) {
  const locales: Buffer[] = [], centrales: Buffer[] = [];
  let off = 0, n = 0;
  return {
    agregar(nombre: string, datos: Buffer) {
      if (!/^[A-Za-z0-9@._/-]{1,100}$/.test(nombre) || nombre.includes("..")) throw new Error(`zip: nombre «${nombre}»`);
      if (n >= 65535) throw new Error("zip: más de 65 535 archivos");
      const nb = Buffer.from(nombre, "utf8"), c = deflateRawSync(datos, { level: 9 }), comprimir = c.length < datos.length;
      const cuerpo = comprimir ? c : datos, crc = crc32(datos) >>> 0, metodo = comprimir ? 8 : 0;
      if (off + 30 + nb.length + cuerpo.length > 0xffffffff) throw new Error("zip: más de 4 GB (sin ZIP64)");
      const l = Buffer.alloc(30);
      l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(0x0800, 6); l.writeUInt16LE(metodo, 8); l.writeUInt16LE(HORA, 10); l.writeUInt16LE(FECHA, 12);
      l.writeUInt32LE(crc, 14); l.writeUInt32LE(cuerpo.length, 18); l.writeUInt32LE(datos.length, 22); l.writeUInt16LE(nb.length, 26); l.writeUInt16LE(0, 28);
      const k = Buffer.alloc(46);
      k.writeUInt32LE(0x02014b50, 0); k.writeUInt16LE(0x0314, 4); k.writeUInt16LE(20, 6); k.writeUInt16LE(0x0800, 8); k.writeUInt16LE(metodo, 10); k.writeUInt16LE(HORA, 12); k.writeUInt16LE(FECHA, 14);
      k.writeUInt32LE(crc, 16); k.writeUInt32LE(cuerpo.length, 20); k.writeUInt32LE(datos.length, 24); k.writeUInt16LE(nb.length, 28); k.writeUInt16LE(0, 30); k.writeUInt16LE(0, 32);
      k.writeUInt16LE(0, 34); k.writeUInt16LE(0, 36); k.writeUInt32LE((0o100644 << 16) >>> 0, 38); k.writeUInt32LE(off, 42);
      if (salida) { salida(l); salida(nb); salida(cuerpo); } else locales.push(l, nb, cuerpo);
      centrales.push(k, nb);
      off += 30 + nb.length + cuerpo.length; n++;
    },
    cerrar(): Buffer {
      const cd = Buffer.concat(centrales), fin = Buffer.alloc(22);
      fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(0, 4); fin.writeUInt16LE(0, 6); fin.writeUInt16LE(n, 8); fin.writeUInt16LE(n, 10);
      fin.writeUInt32LE(cd.length, 12); fin.writeUInt32LE(off, 16); fin.writeUInt16LE(0, 20);
      if (salida) { salida(cd); salida(fin); return Buffer.alloc(0); }
      return Buffer.concat([...locales, cd, fin]);
    },
  };
}

export function zip(archivos: [string, Buffer][]): Buffer {
  const z = zipPorPartes();
  for (const [nombre, datos] of archivos) z.agregar(nombre, datos);
  return z.cerrar();
}
