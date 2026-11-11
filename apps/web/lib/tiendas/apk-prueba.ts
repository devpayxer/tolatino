import "server-only";
import { crc32 } from "node:zlib";

/* 8f · El APK de PRUEBA del sandbox (fase8-apps.md §6 #10; sin binarios en el repo): hasta que 8h suba los APK firmados por el CI, el build de
   la semilla «apk_propio» apunta a este archivo, que el servidor arma la primera vez que alguien lo baja con su enlace de un uso (solo fuera de
   producción y solo para un build is_test). Es un ZIP con la forma de un APK (AndroidManifest.xml y un LEEME), sin código: NO se instala.
   Sirve para probar de punta a punta el enlace de un uso, la huella sha256 y la descarga. Determinista (fechas fijas): su huella no cambia,
   y la semilla 0045 la trae escrita (lib/beta.ts la vuelve a comprobar antes de entregar nada). */
const ARCHIVOS: [string, string][] = [
  ["AndroidManifest.xml", "<!-- To'Latino · APK de PRUEBA del sandbox (8f). No es una app: no se instala. Los APK de verdad los sube el CI en 8h. -->\n"],
  ["LEEME.txt", "To'Latino - APK de prueba del sandbox. Sirve para probar el enlace de un uso del programa beta. No se instala.\nTo'Latino - sandbox test APK. It tests the one-use link of the beta program. It does not install.\n"],
];

export function apkDePrueba(): Buffer {
  const partes: Buffer[] = [], central: Buffer[] = [];
  let off = 0;
  for (const [nombre, texto] of ARCHIVOS) {
    const n = Buffer.from(nombre, "utf8"), d = Buffer.from(texto, "utf8"), crc = crc32(d) >>> 0;
    const l = Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(0, 6); l.writeUInt16LE(0, 8);
    l.writeUInt16LE(0, 10); l.writeUInt16LE(0x5b21, 12);   // 1 sep 2025, 00:00 (fijo)
    l.writeUInt32LE(crc, 14); l.writeUInt32LE(d.length, 18); l.writeUInt32LE(d.length, 22); l.writeUInt16LE(n.length, 26); l.writeUInt16LE(0, 28);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0, 8); c.writeUInt16LE(0, 10);
    c.writeUInt16LE(0, 12); c.writeUInt16LE(0x5b21, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(d.length, 20); c.writeUInt32LE(d.length, 24);
    c.writeUInt16LE(n.length, 28); c.writeUInt16LE(0, 30); c.writeUInt16LE(0, 32); c.writeUInt16LE(0, 34); c.writeUInt16LE(0, 36); c.writeUInt32LE(0, 38); c.writeUInt32LE(off, 42);
    partes.push(l, n, d); central.push(c, n);
    off += 30 + n.length + d.length;
  }
  const cd = Buffer.concat(central), fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(0, 4); fin.writeUInt16LE(0, 6); fin.writeUInt16LE(ARCHIVOS.length, 8); fin.writeUInt16LE(ARCHIVOS.length, 10);
  fin.writeUInt32LE(cd.length, 12); fin.writeUInt32LE(off, 16); fin.writeUInt16LE(0, 20);
  return Buffer.concat([...partes, cd, fin]);
}
