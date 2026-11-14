#!/usr/bin/env node
/* 9o · La página de mantenimiento que sirve nginx (fase9-apertura.md §1b #8, §1c: la línea fija «Estamos haciendo un cambio. Volvemos en unos
   minutos.», FIJAS.mantenimiento). Se ARMA desde el sistema de diseño: los colores y las letras de packages/ui/src/tokens.css, el símbolo de
   To'Latino de packages/ui/src/core/Wordmark.tsx y las dos líneas de apps/web/lib/textos-fijas.ts, tal cual. Sin JavaScript, sin nada de fuera
   (la app puede estar caída: todo va dentro del archivo). El guardián mantenimientoFijo vuelve a armarla y la compara con la del repo.
   Uso: node scripts/produccion/mantenimiento.mjs            (escribe infra/comun/mantenimiento/index.html)
        node scripts/produccion/mantenimiento.mjs --revisar  (sale con 1 si la del repo no es la que sale de aquí) */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SALIDA = "infra/comun/mantenimiento/index.html";

export function pagina() {
  const tokens = readFileSync(join(RAIZ, "packages/ui/src/tokens.css"), "utf8");
  const tok = (n) => { const m = new RegExp(`--${n}:\\s*([^;]+);`).exec(tokens); if (!m) throw new Error(`falta el token --${n}`); return m[1].trim(); };
  const marca = readFileSync(join(RAIZ, "packages/ui/src/core/Wordmark.tsx"), "utf8");
  const simbolo = (/const SIMBOLO = "([^"]+)"/.exec(marca) ?? [])[1];
  if (!simbolo) throw new Error("falta el símbolo de Wordmark.tsx");
  const fijas = readFileSync(join(RAIZ, "apps/web/lib/textos-fijas.ts"), "utf8");
  const linea = (idioma) => { const b = new RegExp(`${idioma}: \\{([\\s\\S]*?)\\n  \\}`).exec(fijas)?.[1] ?? ""; const m = /mantenimiento: "([^"]+)"/.exec(b); if (!m) throw new Error(`falta FIJAS.${idioma}.mantenimiento`); return m[1]; };
  const es = linea("es"), en = linea("en");
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>To'Latino</title>
<style>
:root{--tl-ink:${tok("tl-ink")};--tl-paper:${tok("tl-paper")};--tl-brand:${tok("tl-brand")};--tl-line:${tok("tl-line")};--font-display:${tok("font-display")};--font-body:${tok("font-body")}}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:var(--tl-paper);color:var(--tl-ink);font-family:var(--font-body)}
main{min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:32px 16px;text-align:center}
.marca{display:inline-flex;align-items:center;gap:10px;font-family:var(--font-display);font-weight:800;font-size:32px;letter-spacing:-0.04em;line-height:1}
.marca b{color:var(--tl-brand);margin-left:-7px;font-weight:800}
p{margin:0;max-width:420px;font-size:20px;line-height:1.4;font-weight:600}
p[lang=en]{font-size:16px;font-weight:500;padding-top:16px;border-top:1px solid var(--tl-line)}
</style>
</head>
<body>
<main>
<span class="marca" role="img" aria-label="To'Latino"><svg width="32" height="32" viewBox="0 0 482 482" aria-hidden="true"><path fill="${tok("tl-brand")}" d="${simbolo}"/></svg><span>To&rsquo;</span><b>Latino</b></span>
<p>${esc(es)}</p>
<p lang="en">${esc(en)}</p>
</main>
</body>
</html>
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const html = pagina(), f = join(RAIZ, SALIDA);
  if (process.argv.includes("--revisar")) {
    let actual = ""; try { actual = readFileSync(f, "utf8"); } catch { /* no existe */ }
    if (actual !== html) { console.error(`✗ ${SALIDA} no es la que sale del sistema de diseño: node scripts/produccion/mantenimiento.mjs`); process.exit(1); }
    console.log(`✓ ${SALIDA} al día`);
  } else { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, html); console.log(`✓ ${SALIDA}`); }
}
