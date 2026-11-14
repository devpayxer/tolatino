import "server-only";

/* 9k · Un PDF de texto, propio y sin dependencias (regla 3: construir lo propio): carta, Helvetica, WinAnsi (las letras del español), varias páginas.
   Lo usa la evidencia de las disputas (recibo, conversación y constancia de entrega) que se sube a Stripe. Solo texto: nunca imágenes ni enlaces. */
const WIN: Record<string, number> = { "€": 0x80, "‚": 0x82, "„": 0x84, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "™": 0x99 };
function bytesWin(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    const b = WIN[ch] ?? (c < 256 && (c >= 0x20 || c === 0x09) ? c : 0x3f);
    if (b === 0x28 || b === 0x29 || b === 0x5c) out.push(0x5c); // ( ) \ se escapan
    out.push(b);
  }
  return out;
}
/* Parte una línea larga en varias de hasta `n` caracteres (por palabras). */
function partir(t: string, n: number): string[] {
  const out: string[] = [];
  for (const linea of t.split("\n")) {
    let cur = "";
    for (const w of linea.split(/\s+/)) {
      if (!w) continue;
      if ((cur + " " + w).trim().length > n) { if (cur) out.push(cur); cur = w.length > n ? w.slice(0, n) : w; }
      else cur = (cur + " " + w).trim();
    }
    out.push(cur);
  }
  return out;
}

export function pdfTexto(titulo: string, lineas: string[]): Buffer {
  const todas = [...partir(titulo, 70).map((t) => ({ t, h: true })), { t: "", h: false }, ...lineas.flatMap((l) => partir(l, 92).map((t) => ({ t, h: false })))];
  const porPagina = 52, paginas: { t: string; h: boolean }[][] = [];
  for (let i = 0; i < todas.length; i += porPagina) paginas.push(todas.slice(i, i + porPagina));
  if (!paginas.length) paginas.push([{ t: "", h: false }]);
  const objs: Buffer[] = [];
  const add = (b: Buffer | string) => { objs.push(Buffer.isBuffer(b) ? b : Buffer.from(b, "latin1")); return objs.length; };
  // 1 catálogo, 2 páginas, 3 fuente, 4 fuente negrita; después, página + contenido de cada una.
  add(""); add(""); add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"); add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const hojas: number[] = [];
  paginas.forEach((p, k) => {
    const partes: number[] = [];
    const push = (s: string) => partes.push(...Buffer.from(s, "latin1"));
    push("BT\n");
    let y = 750;
    for (const l of p) {
      push(`/${l.h ? "F2 14" : "F1 10"} Tf\n1 0 0 1 54 ${y} Tm\n(`);
      partes.push(...bytesWin(l.t));
      push(") Tj\n");
      y -= l.h ? 20 : 13.5;
    }
    push(`/F1 8 Tf\n1 0 0 1 54 30 Tm\n(${k + 1} / ${paginas.length}) Tj\nET\n`);
    const cuerpo = Buffer.from(partes);
    const c = add(Buffer.concat([Buffer.from(`<< /Length ${cuerpo.length} >>\nstream\n`, "latin1"), cuerpo, Buffer.from("\nendstream", "latin1")]));
    hojas.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${c} 0 R >>`));
  });
  objs[0] = Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "latin1");
  objs[1] = Buffer.from(`<< /Type /Pages /Kids [${hojas.map((h) => `${h} 0 R`).join(" ")}] /Count ${hojas.length} >>`, "latin1");
  const partes: Buffer[] = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
  const offs: number[] = [];
  let pos = partes[0]!.length;
  objs.forEach((o, i) => { offs.push(pos); const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, "latin1"), o, Buffer.from("\nendobj\n", "latin1")]); partes.push(b); pos += b.length; });
  const xref = [`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`, ...offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)].join("");
  partes.push(Buffer.from(`${xref}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`, "latin1"));
  return Buffer.concat(partes);
}
