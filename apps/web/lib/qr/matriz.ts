/* 8e · La matriz de un QR de texto corto en el navegador (el código de un cupón TL-CQ-…, que el negocio escanea con «Escanear cupón»). El mismo
   generador abierto de Project Nayuki (MIT, lib/qr/qrcodegen.ts) que usa el boleto; el sistema de diseño (QrCode) solo la dibuja. El QR del cupón
   lleva SOLO el código que la persona ya ve en su pantalla (nada más: ni nombre ni teléfono). */
import qrRaw from "./qrcodegen";

type Gen = { QrCode: { Ecc: { MEDIUM: unknown }; encodeText: (t: string, e: unknown) => { size: number; getModule: (x: number, y: number) => boolean } } };
const qrcodegen = qrRaw as unknown as Gen;
export function matrizTexto(texto: string): boolean[][] {
  const q = qrcodegen.QrCode.encodeText(texto, qrcodegen.QrCode.Ecc.MEDIUM);
  return Array.from({ length: q.size }, (_, y) => Array.from({ length: q.size }, (_, x) => q.getModule(x, y)));
}
