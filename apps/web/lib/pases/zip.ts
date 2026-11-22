import "server-only";
import { crc32, createDeflateRaw, deflateRawSync } from "node:zlib";

/* 8g · Un ZIP (PKWARE APPNOTE 6.3, lo mínimo: sin cifrado, sin ZIP64, sin comentarios) para el .pkpass: cada archivo con su CRC-32, DEFLATE si
   achica y STORE si no; fecha fija (1 ene 2026) para que el mismo pase dé los mismos bytes. Módulo autocontenido (sin dependencias). */
const FECHA = ((2026 - 1980) << 9) | (1 << 5) | 1, HORA = 0;

/* 9t · El mismo ZIP armado de a un archivo: cada uno se comprime al agregarlo y su texto crudo se puede soltar (la exportación de datos de una
   cuenta grande no tiene todo en memoria a la vez: solo lo comprimido). zip() = agregar todos y cerrar: los mismos bytes que antes.
   22 nov · `salida`: cada trozo ya comprimido se entrega en orden al llegar (la exportación lo escribe a un archivo temporal y lo sube desde el
   disco) y no se guarda aquí; cerrar() escribe el índice y devuelve un Buffer vacío. Los bytes son los mismos que sin `salida`. */
/* 22 nov · agregarPorPartes: un archivo que llega como texto por trozos (la exportación de datos: el JSON y el CSV de una parte de 20 000 filas, fila
   por fila) se comprime al llegar (el mismo DEFLATE de nivel 9, por partes: la misma salida que deflateRawSync del texto entero) y en memoria solo
   queda lo comprimido, nunca el texto entero. Si comprimido no achica, se guarda tal cual (STORE) volviendo a pedir los trozos. Mismos bytes que
   agregar(nombre, Buffer.from(texto entero)). */
const TROZO = 1 << 18;
function* enBuffers(trozos: Iterable<string>): Generator<Buffer> {
  let p: string[] = [], n = 0;
  for (const t of trozos) {
    p.push(t); n += t.length;
    if (n >= TROZO) { yield Buffer.from(p.join(""), "utf8"); p = []; n = 0; }
  }
  if (n || !p.length) yield Buffer.from(p.join(""), "utf8");
}
export function zipPorPartes(salida?: (b: Buffer) => void) {
  const locales: Buffer[] = [], centrales: Buffer[] = [];
  let off = 0, n = 0;
  const nombreBien = (nombre: string) => {
    if (!/^[A-Za-z0-9@._/-]{1,100}$/.test(nombre) || nombre.includes("..")) throw new Error(`zip: nombre «${nombre}»`);
    if (n >= 65535) throw new Error("zip: más de 65 535 archivos");
  };
  // La cabecera local y la central de un archivo ya comprimido (o guardado tal cual); los trozos del cuerpo los pone quien llama, en orden.
  const cabeceras = (nb: Buffer, metodo: number, crc: number, comprimido: number, largo: number): Buffer => {
    if (off + 30 + nb.length + comprimido > 0xffffffff) throw new Error("zip: más de 4 GB (sin ZIP64)");
    const l = Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(0x0800, 6); l.writeUInt16LE(metodo, 8); l.writeUInt16LE(HORA, 10); l.writeUInt16LE(FECHA, 12);
    l.writeUInt32LE(crc, 14); l.writeUInt32LE(comprimido, 18); l.writeUInt32LE(largo, 22); l.writeUInt16LE(nb.length, 26); l.writeUInt16LE(0, 28);
    const k = Buffer.alloc(46);
    k.writeUInt32LE(0x02014b50, 0); k.writeUInt16LE(0x0314, 4); k.writeUInt16LE(20, 6); k.writeUInt16LE(0x0800, 8); k.writeUInt16LE(metodo, 10); k.writeUInt16LE(HORA, 12); k.writeUInt16LE(FECHA, 14);
    k.writeUInt32LE(crc, 16); k.writeUInt32LE(comprimido, 20); k.writeUInt32LE(largo, 24); k.writeUInt16LE(nb.length, 28); k.writeUInt16LE(0, 30); k.writeUInt16LE(0, 32);
    k.writeUInt16LE(0, 34); k.writeUInt16LE(0, 36); k.writeUInt32LE((0o100644 << 16) >>> 0, 38); k.writeUInt32LE(off, 42);
    centrales.push(k, nb);
    off += 30 + nb.length + comprimido; n++;
    return l;
  };
  const poner = (b: Buffer) => { if (salida) salida(b); else locales.push(b); };
  return {
    async agregarPorPartes(nombre: string, trozos: () => Iterable<string>) {
      nombreBien(nombre);
      const nb = Buffer.from(nombre, "utf8"), comp: Buffer[] = [], d = createDeflateRaw({ level: 9 });
      let crc = 0, largo = 0, comprimido = 0;
      d.on("data", (b: Buffer) => { comp.push(b); comprimido += b.length; });
      const fin = new Promise<void>((ok, no) => { d.once("end", ok); d.once("error", no); });
      for (const b of enBuffers(trozos())) {
        crc = crc32(b, crc); largo += b.length;
        if (!d.write(b)) await new Promise((ok) => d.once("drain", ok));
      }
      d.end();
      await fin;
      if (comprimido < largo) {
        poner(cabeceras(nb, 8, crc >>> 0, comprimido, largo)); poner(nb);
        for (const b of comp.splice(0)) poner(b);
      } else {
        poner(cabeceras(nb, 0, crc >>> 0, largo, largo)); poner(nb);
        for (const b of enBuffers(trozos())) poner(b);
      }
    },
    agregar(nombre: string, datos: Buffer) {
      nombreBien(nombre);
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
