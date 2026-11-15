#!/usr/bin/env node
/* 9c · Contraste AA (4,5:1) fuera del sistema portado: las pantallas (apps/web) y las piezas propias de packages/ui (panel, etc.) escriben el
   gris de texto a mano. El mismo cambio que scripts/portar-sistema.mjs hace en packages/ui/src/ds: ink al 40–55 % → ink al 60 % cuando es texto
   o ícono (color, fill de un ícono no; se deja: ver abajo), nunca en sombras, bordes, fondos ni contornos. Decide por la propiedad más cercana
   antes del valor en la misma línea (en una línea con varios estilos, la que le toca). Idempotente: correrlo otra vez no cambia nada.
   Uso: node scripts/contraste-aa.mjs [--revisar]   (--revisar no escribe: lista lo que cambiaría y sale con 1 si hay algo; el guardián
   contrasteTexto hace lo mismo). */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = new URL("..", import.meta.url).pathname;
export const GRIS_AA = "rgba(11,14,18,.6)";
const BAJO = /rgba\(11,\s?14,\s?18,\s?0?\.(34|4|42|45|5|55)\)/g;
const NO_TEXTO = /shadow|border|background|outline|stroke|ring|divide|^bg$|^line|^fill-?soft$|^fill$/i;

/* La propiedad que le toca al valor: la última «nombre:» antes, en la misma línea. Sin propiedad (constantes, ternarios), es texto. */
function propiedad(antes) {
  const m = [...antes.matchAll(/([A-Za-z][\w-]*)\s*:\s*/g)];
  return m.length ? m[m.length - 1][1] : "";
}
/* Dentro de una clase arbitraria de Tailwind (shadow-[…], bg-[…], border-[…], from-[…]): solo text-[…] es texto. */
function noEsTextoTw(antes) {
  const a = antes.lastIndexOf("["), c = antes.lastIndexOf("]");
  if (a < 0 || c > a) return false;
  const pre = /([\w:-]+)-$/.exec(antes.slice(0, a));
  return !!pre && !/(^|:)text$/.test(pre[1]);
}
/* Tailwind: text-ink/40…55 (con o sin variante: lg:, hover:, placeholder:) → text-ink/60. */
const TW = /(^|[\s"'`:])text-ink\/(40|45|50|55)(?![\d])/g;
export function contrasteLinea(l) {
  return l.replace(BAJO, (m, _a, i) => (NO_TEXTO.test(propiedad(l.slice(0, i))) || noEsTextoTw(l.slice(0, i)) ? m : GRIS_AA)).replace(TW, "$1text-ink/60");
}
export function contrasteTexto(t) { return t.split("\n").map(contrasteLinea).join("\n"); }

export function archivos() {
  const out = [];
  const ir = (d) => {
    for (const n of readdirSync(d)) {
      if (n === "node_modules" || n === ".next" || n === "ds" || n.startsWith(".")) continue;
      const p = join(d, n), st = statSync(p);
      if (st.isDirectory()) ir(p);
      else if (/\.(tsx|ts|css)$/.test(n)) out.push(p);
    }
  };
  ir(join(RAIZ, "apps/web/app")); ir(join(RAIZ, "apps/web/lib")); ir(join(RAIZ, "packages/ui/src"));
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const revisar = process.argv.includes("--revisar");
  let n = 0;
  for (const p of archivos()) {
    const t = readFileSync(p, "utf8"), u = contrasteTexto(t);
    if (u === t) continue;
    const a = t.split("\n"), b = u.split("\n");
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { n++; if (revisar) console.log(`${relative(RAIZ, p)}:${i + 1}`); }
    if (!revisar) writeFileSync(p, u);
  }
  console.log(`${revisar ? "por cambiar" : "cambiadas"}: ${n} líneas`);
  if (revisar && n) process.exit(1);
}
