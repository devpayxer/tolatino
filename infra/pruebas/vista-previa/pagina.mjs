#!/usr/bin/env node
/* 23 nov · Las dos piezas visibles del sitio de vista previa del sandbox (SOLO pruebas; guardián vistaPreviaAcotada), ARMADAS desde el sistema de diseño
   como la página de mantenimiento (scripts/produccion/mantenimiento.mjs), nunca inventadas:
   1) La página de pausa (infra/pruebas/vista-previa/pausa.html), que nginx sirve con 503 mientras la rama trae migraciones que la base no tiene: los
      colores y las letras de packages/ui/src/tokens.css, el símbolo de packages/ui/src/core/Wordmark.tsx y la misma maqueta de la de mantenimiento,
      con su línea ES/EN. Sin JavaScript, sin nada de fuera.
   2) La marca «VISTA PREVIA» que nginx pone en cada página servida por la vista previa (sub_filter de infra/pruebas/nginx-pruebas.conf): la pieza Tag
      del sistema (packages/ui/src/ds/core/Tag.js) con su tono «ink», tal cual (relleno, radio, letra y espaciado de la pieza), fija arriba al centro.
      Lleva a la dirección normal del sandbox (el mismo servidor, puerto 80).
   Uso: node infra/pruebas/vista-previa/pagina.mjs            (escribe pausa.html)
        node infra/pruebas/vista-previa/pagina.mjs --revisar  (sale con 1 si pausa.html o la marca de nginx no son las que salen de aquí) */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const SALIDA = "infra/pruebas/vista-previa/pausa.html";
/* 24 nov · La de «arrancando»: lo que nginx sirve (503) mientras next dev no contesta (acaba de arrancar o de reiniciarse). Antes salía la de
   mantenimiento del sitio («Volvemos en unos minutos») y el fundador no sabía si estaba roto. Se recarga sola cada 8 s (meta refresh, sin JavaScript). */
export const SALIDA_ARRANCANDO = "infra/pruebas/vista-previa/arrancando.html";
const ES_ARR = "La vista previa está arrancando con el último cambio. Esta página se recarga sola en unos segundos.";
const EN_ARR = "The preview is starting with the latest change. This page reloads itself in a few seconds.";
export const NGINX = "infra/pruebas/nginx-pruebas.conf";
const ES = "La vista previa está en pausa: este cambio trae cambios de base y se ve en el sandbox normal.";
const EN = "The preview is paused: this change brings database changes and can be seen on the regular sandbox.";

const leer = (f) => readFileSync(join(RAIZ, f), "utf8");
function tokens() {
  const t = leer("packages/ui/src/tokens.css");
  return (n) => { const m = new RegExp(`--${n}:\\s*([^;]+);`).exec(t); if (!m) throw new Error(`falta el token --${n}`); return m[1].trim(); };
}
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function pagina(arrancando = false) {
  const tok = tokens();
  const simbolo = (/const SIMBOLO = "([^"]+)"/.exec(leer("packages/ui/src/core/Wordmark.tsx")) ?? [])[1];
  if (!simbolo) throw new Error("falta el símbolo de Wordmark.tsx");
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">${arrancando ? `\n<meta http-equiv="refresh" content="8">` : ""}
<title>To'Latino · vista previa</title>
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
<p>${esc(arrancando ? ES_ARR : ES)}</p>
<p lang="en">${esc(arrancando ? EN_ARR : EN)}</p>
</main>
</body>
</html>
`;
}

/* La marca: el Tag «ink» de packages/ui/src/ds/core/Tag.js (sus valores se leen de la pieza; si la pieza cambia, la marca cambia con ella). Va dentro de
   una cadena de nginx entre comillas simples: sin comillas simples dentro. $host es la variable de nginx (el mismo servidor, puerto 80). */
export function marca() {
  const tag = leer("packages/ui/src/ds/core/Tag.js"), tok = tokens();
  const ink = /ink: \['([^']+)', '([^']+)'\]/.exec(tag);
  const pad = /padding: '([^']+)'/.exec(tag), rad = /borderRadius: (\d+)/.exec(tag), font = /font: "([^"]+)"/.exec(tag), ls = /letterSpacing: '([^']+)'/.exec(tag);
  if (!ink || !pad || !rad || !font || !ls) throw new Error("la pieza Tag cambió de forma: revisa la marca de la vista previa");
  const conRespaldo = (v) => v.replace(/var\(--([a-z-]+)\)/g, (_, n) => `var(--${n},${tok(n)})`);
  const letra = font[1].replace(/'([^']+)'/g, "$1");
  const estilo = [
    "position:fixed", "top:4px", "left:50%", "transform:translateX(-50%)", "z-index:2147483647", "display:inline-block",
    `padding:${pad[1]}`, `border-radius:${rad[1]}px`, `background:${conRespaldo(ink[1])}`, `color:${conRespaldo(ink[2])}`, `font:${letra}`,
    `letter-spacing:${ls[1]}`, "white-space:nowrap", "text-decoration:none",
  ].join(";");
  return `<a href="http://$host/" data-vista-previa style="${estilo}" title="Vista previa de la rama de trabajo · Branch preview">VISTA PREVIA · PREVIEW</a>`;
}
export const lineaNginx = () => `        sub_filter '</body>' '${marca()}</body>';`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const html = pagina(), f = join(RAIZ, SALIDA), htmlA = pagina(true), fA = join(RAIZ, SALIDA_ARRANCANDO);
  if (process.argv.includes("--revisar")) {
    let mal = 0, actual = "";
    try { actual = readFileSync(f, "utf8"); } catch { /* no existe */ }
    if (actual !== html) { console.error(`✗ ${SALIDA} no es la que sale del sistema de diseño: node infra/pruebas/vista-previa/pagina.mjs`); mal = 1; }
    let actualA = ""; try { actualA = readFileSync(fA, "utf8"); } catch { /* no existe */ }
    if (actualA !== htmlA) { console.error(`✗ ${SALIDA_ARRANCANDO} no es la que sale del sistema de diseño: node infra/pruebas/vista-previa/pagina.mjs`); mal = 1; }
    if (!leer(NGINX).split("\n").includes(lineaNginx())) { console.error(`✗ ${NGINX} no lleva la marca «VISTA PREVIA» que sale de la pieza Tag (línea esperada:\n${lineaNginx()})`); mal = 1; }
    if (!mal) console.log(`✓ ${SALIDA} y la marca de nginx al día`);
    process.exit(mal);
  } else { writeFileSync(f, html); writeFileSync(fA, htmlA); console.log(`✓ ${SALIDA} · ${SALIDA_ARRANCANDO}`); console.log(`línea de nginx:\n${lineaNginx()}`); }
}
