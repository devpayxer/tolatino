import "server-only";
import { matrizTexto } from "../qr/matriz";

/* 9h · El volante y el cartel con el QR de un enlace (hueco #9 de fase9-apertura.md: «PDF imprimible desde Crecimiento › Enlaces y QR: carta y media carta,
   con el logo, una frase y el QR; no son pantallas»). Un PDF propio, sin servicios ni librerías de afuera (regla 3): una página con el nombre To'Latino
   en letra gruesa (la marca en texto: el logo de imagen entra cuando el fundador lo pida, REVISION 9h), la frase de la landing en español y en inglés, el QR
   dibujado módulo por módulo (el mismo generador abierto de los boletos, lib/qr) y la dirección corta escrita debajo para quien no escanea.
   Las letras con acento van en WinAnsi (Helvetica de las 14 estándar de PDF). */

export type Formato = "carta" | "media";
const TAM: Record<Formato, [number, number]> = { carta: [612, 792], media: [396, 612] };

/* Texto → bytes WinAnsi (lo que cabe: el español y el inglés de la plataforma), escapado para un string de PDF. */
function pdfTexto(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFC")) {
    const c = ch === "’" ? 0x92 : ch === "—" ? 0x97 : ch === "–" ? 0x96 : ch.charCodeAt(0);
    const b = c < 256 ? c : 0x3f;
    out += b === 0x28 || b === 0x29 || b === 0x5c ? `\\${String.fromCharCode(b)}` : String.fromCharCode(b);
  }
  return out;
}
/* Partir una frase en renglones que caben (Helvetica: ~0,52 del tamaño por letra en promedio). */
function renglones(s: string, ancho: number, tam: number): string[] {
  const max = Math.max(8, Math.floor(ancho / (tam * 0.52))), out: string[] = [];
  let cur = "";
  for (const w of s.split(/\s+/)) { if ((cur + " " + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }
  if (cur) out.push(cur);
  return out;
}
const ancho = (s: string, tam: number, gruesa = false) => s.length * tam * (gruesa ? 0.6 : 0.52);

export function volantePdf(p: { url: string; corto: string; fraseEs: string; fraseEn: string; lugar: string; formato: Formato }): Buffer {
  const [W, H] = TAM[p.formato], k = p.formato === "carta" ? 1 : 0.68, m = 48 * k;
  const ops: string[] = [];
  const texto = (s: string, x: number, y: number, tam: number, gruesa = false, gris = 0) => ops.push(`BT /${gruesa ? "F2" : "F1"} ${tam.toFixed(1)} Tf ${gris} g ${x.toFixed(1)} ${y.toFixed(1)} Td (${pdfTexto(s)}) Tj ET`);
  const centro = (s: string, y: number, tam: number, gruesa = false, gris = 0) => texto(s, (W - ancho(s, tam, gruesa)) / 2, y, tam, gruesa, gris);
  let y = H - m - 40 * k;
  centro("To'Latino", y, 44 * k, true);
  y -= 46 * k;
  for (const l of renglones(p.fraseEs, W - 2 * m, 22 * k)) { centro(l, y, 22 * k, true); y -= 28 * k; }
  y -= 4 * k;
  for (const l of renglones(p.fraseEn, W - 2 * m, 14 * k)) { centro(l, y, 14 * k, false, 0.35); y -= 19 * k; }
  // El QR: cuadrado centrado con su margen blanco (4 módulos), en negro puro para que cualquier teléfono lo lea.
  const M = matrizTexto(p.url), n = M.length, lado = Math.min(W - 2 * m, y - m - 90 * k), mod = lado / (n + 8), x0 = (W - lado) / 2, y0 = y - 16 * k - lado;
  ops.push("0 g");
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (M[r]![c]) ops.push(`${(x0 + (c + 4) * mod).toFixed(2)} ${(y0 + lado - (r + 5) * mod).toFixed(2)} ${mod.toFixed(2)} ${mod.toFixed(2)} re`);
  ops.push("f");
  y = y0 - 26 * k;
  centro(p.corto, y, 18 * k, true);
  centro(p.lugar, y - 24 * k, 11 * k, false, 0.35);
  const contenido = ops.join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${Buffer.byteLength(contenido, "latin1")} >>\nstream\n${contenido}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];
  let pdf = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const pos: number[] = [];
  objs.forEach((o, i) => { pos.push(Buffer.byteLength(pdf, "latin1")); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${pos.map((x) => `${String(x).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}
