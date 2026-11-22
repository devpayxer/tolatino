#!/usr/bin/env node
/* 9f-3 · Todas las pantallas por el CMS (LAUNCH «9f-3 · Más cadenas por el CMS»; REVISION «Todas las pantallas por el CMS (18 nov)»).
   Cada pantalla de apps/web define su propio E2 para elegir el idioma: `const E2 = (a: string, b: string) => (es ? a : b)` (y variantes: otros nombres
   de parámetros, `en ? b : a`, `x.es ? a : b`, `lang === "es" ? es : en`, dentro de useCallback). Este codemod reescribe CADA definición para que pase por
   la fábrica compartida lib/dos-idiomas.ts, sin tocar ni uno de los ~16 000 textos:
       const E2 = (a: string, b: string) => (es ? a : b)      →   const E2 = (a: string, b: string) => dosIdiomas(es, a, b)
       const E2 = (a: string, b: string) => (en ? b : a)      →   const E2 = (a: string, b: string) => dosIdiomas(!en, a, b)
   Es equivalente palabra por palabra: la condición se sigue evaluando en cada llamada (como antes) y dosIdiomas devuelve `es ? a : b` mientras nadie
   edite ese par. Agrega el import de "@/lib/dos-idiomas" después de los demás imports (y de "use client"/"use server").
   - Idempotente: una definición ya convertida no se vuelve a tocar; correrlo dos veces no cambia nada (el líder lo vuelve a correr después de unir ramas).
   - Lo que no puede probar equivalente NO lo toca y lo lista con su razón (el guardián e2PorElCms lo caza: tiene que quedar en 0).
   - `E2 = c.E2` (pasar el de otro) y `const { E2 } = v` (sacarlo de un objeto) no son definiciones: usan una ya convertida.
   Uso:  node scripts/cms/e2-al-cms.mjs              reescribe y resume
         node scripts/cms/e2-al-cms.mjs --verificar  no escribe: sale con 1 si algo cambiaría o si queda una definición sin convertir
         node scripts/cms/e2-al-cms.mjs --lista      además, la lista de archivos tocados */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const MODULO = "apps/web/lib/dos-idiomas.ts";
export const IMPORT = 'import { dosIdiomas } from "@/lib/dos-idiomas";';
const ID = String.raw`[A-Za-z_$][\w$]*`;
// La condición que elige el idioma: un nombre o una cadena de propiedades (es, x.es, !en) o una comparación con un código de idioma (lang === "es").
const COND = String.raw`!?${ID}(?:\.${ID})*(?:\s*[!=]==\s*"[a-z]{2}")?`;
// Una definición vieja: E2 = (P1: string, P2: string)[: string] => (COND ? X : Y), también dentro de useCallback(…).
export const DEF_VIEJA = new RegExp(String.raw`(\bE2\s*=\s*(?:useCallback\(\s*)?)\(\s*(${ID})\s*:\s*string\s*,\s*(${ID})\s*:\s*string\s*\)(\s*:\s*string)?\s*=>\s*\(\s*(${COND})\s*\?\s*(${ID})\s*:\s*(${ID})\s*\)`, "g");
// Una definición ya convertida (la única forma que el guardián acepta).
export const DEF_NUEVA = new RegExp(String.raw`\bE2\s*=\s*(?:useCallback\(\s*)?\(\s*(${ID})\s*:\s*string\s*,\s*(${ID})\s*:\s*string\s*\)(?:\s*:\s*string)?\s*=>\s*dosIdiomas\(\s*(${COND}|!\(${COND}\))\s*,\s*\1\s*,\s*\2\s*\)`, "g");
// Cualquier asignación a E2 (para hallar lo que no es ninguna de las dos): «E2 =» que no sea «==» ni «=>»; y «function E2(».
export const ASIGNA = /\bE2\s*=(?![=>])|\bfunction\s+E2\s*\(/g;
const PASA = new RegExp(String.raw`^\bE2\s*=\s*${ID}(?:\??\.${ID})*\.E2\b`);

/* El texto sin comentarios, del mismo largo (las posiciones siguen valiendo). Un «/*» pegado a una comilla es texto (accept="image/*"), como en los guardianes. */
export const sinComentarios = (t) => t.replace(/\/\*(?=["'`])/g, "/_").replace(/\/\*[\s\S]*?\*\//g, (x) => x.replace(/[^\n]/g, " ")).replace(/(^|[^:])\/\/.*$/gm, (x, a) => a + x.slice(a.length).replace(/[^\n]/g, " "));

/* Los archivos de apps/web que pueden definir un E2 (los de git y los nuevos que aún no lo están). */
export function archivosWeb() {
  // 22 nov · Con -z (un nombre con ñ o acento no sale entre comillas; guardián gitListaConZ).
  return execSync("git ls-files -z --cached --others --exclude-standard -- apps/web", { cwd: RAIZ, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\0")
    .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.d\.ts$/.test(f) && f !== MODULO && existsSync(join(RAIZ, f)));
}

/* Una definición vieja → la nueva, o null (con la razón) si no se puede probar que es lo mismo. */
function convertir(pre, p1, p2, ret, cond, x, y) {
  const raiz = cond.replace(/^!/, "").split(/[.\s]/)[0];
  if (raiz === p1 || raiz === p2) return [null, `la condición «${cond}» usa un parámetro del propio E2`];
  if (p1 === p2) return [null, "los dos parámetros se llaman igual"];
  let c;
  if (x === p1 && y === p2) c = cond;
  else if (x === p2 && y === p1) c = /^!?[\w$.]+$/.test(cond) ? (cond.startsWith("!") ? cond.slice(1) : "!" + cond) : `!(${cond})`;
  else return [null, `devuelve «${x} : ${y}», no sus dos parámetros`];
  return [`${pre}(${p1}: string, ${p2}: string)${ret ?? ""} => dosIdiomas(${c}, ${p1}, ${p2})`, null];
}

/* Pone el import después de la directiva y de los imports de arriba (o lo suma a uno de "@/lib/dos-idiomas" que ya esté). */
export function conImport(t) {
  if (/import\s*\{[^}]*\bdosIdiomas\b[^}]*\}\s*from\s*["']@\/lib\/dos-idiomas["']/.test(t)) return t;
  const otro = /import\s*\{([^}]*)\}\s*from\s*["']@\/lib\/dos-idiomas["'];?/.exec(t);
  if (otro) return t.slice(0, otro.index) + `import { dosIdiomas, ${otro[1].trim()} } from "@/lib/dos-idiomas";` + t.slice(otro.index + otro[0].length);
  const L = t.split("\n");
  let i = 0, despues = -1, comentario = false;
  while (i < L.length) {
    const s = L[i].trim();
    if (comentario) { if (s.includes("*/")) comentario = false; i++; continue; }
    if (s.startsWith("/*")) { if (!s.includes("*/")) comentario = true; i++; continue; }
    if (!s || s.startsWith("//")) { i++; continue; }
    if (/^["']use (client|server)["'];?$/.test(s)) { despues = i; i++; continue; }
    if (/^import\b/.test(s)) {
      let j = i;
      while (j < L.length && !/;\s*(\/\/.*)?$/.test(L[j]) && !/^\s*import\s+["'][^"']+["']\s*$/.test(L[j]) && !/\bfrom\s+["'][^"']+["']\s*$/.test(L[j])) j++;
      despues = j; i = j + 1; continue;
    }
    break;
  }
  L.splice(despues + 1, 0, IMPORT);
  return L.join("\n");
}

/* Un archivo: [texto nuevo, convertidas, ya convertidas, pasadas, sin convertir [{linea, razon, texto}]]. */
export function procesar(f, t) {
  let convertidas = 0;
  const limpio = sinComentarios(t);
  const nuevo = t.replace(DEF_VIEJA, (m, pre, p1, p2, ret, cond, x, y, off) => {
    if (limpio.slice(off, off + m.length) !== m) return m; // dentro de un comentario: no es código
    const [r] = convertir(pre, p1, p2, ret, cond, x, y);
    if (!r) return m;
    convertidas++;
    return r;
  });
  let salida = nuevo;
  const usa = new RegExp(DEF_NUEVA.source).test(sinComentarios(nuevo));
  if (usa) salida = conImport(nuevo);
  const { ya, pasadas, sin } = revisar(salida);
  return { salida, convertidas, ya: ya - convertidas, pasadas, sin };
}

/* Las asignaciones a E2 de un texto: cuántas ya pasan por dosIdiomas, cuántas pasan el de otro y cuáles no son ninguna (con la razón). */
export function revisar(t) {
  const c = sinComentarios(t);
  let ya = 0, pasadas = 0; const sin = [];
  for (const m of c.matchAll(ASIGNA)) {
    const resto = c.slice(m.index, m.index + 400);
    const linea = c.slice(0, m.index).split("\n").length;
    if (new RegExp("^" + DEF_NUEVA.source.replace(/^\\b/, "")).test(resto)) { ya++; continue; }
    if (PASA.test(resto)) { pasadas++; continue; }
    const vieja = new RegExp("^" + DEF_VIEJA.source.replace(/^\(\\b/, "(")).exec(resto);
    let razon = "no tiene la forma (a: string, b: string) => (es ? a : b)";
    if (vieja) razon = convertir(vieja[1], vieja[2], vieja[3], vieja[4], vieja[5], vieja[6], vieja[7])[1] ?? "la forma vieja `es ? a : b` (el codemod la convierte)";
    sin.push({ linea, razon, texto: resto.split("\n")[0].slice(0, 140) });
  }
  return { ya, pasadas, sin };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const verificar = process.argv.includes("--verificar"), lista = process.argv.includes("--lista");
  let archivos = 0, convertidas = 0, ya = 0, pasadas = 0; const sin = [], tocados = [];
  for (const f of archivosWeb()) {
    const ruta = join(RAIZ, f), t = readFileSync(ruta, "utf8");
    if (!/\bE2\b/.test(t)) continue;
    const r = procesar(f, t);
    convertidas += r.convertidas; ya += r.ya; pasadas += r.pasadas;
    for (const s of r.sin) sin.push({ f, ...s });
    if (r.salida !== t) { archivos++; tocados.push(f); if (!verificar) writeFileSync(ruta, r.salida); }
  }
  console.log(`e2-al-cms: ${convertidas} definiciones convertidas en ${archivos} archivos · ${ya} ya pasaban por dosIdiomas · ${pasadas} usan el E2 de otro (c.E2) · ${sin.length} sin convertir`);
  if (lista) for (const f of tocados) console.log("  · " + f);
  for (const s of sin) console.log(`  ✗ ${s.f}:${s.linea} — ${s.razon}: ${s.texto}`);
  if (verificar && (archivos || sin.length)) { console.error(`✗ ${archivos ? `${archivos} archivo(s) cambiarían` : ""}${archivos && sin.length ? " y " : ""}${sin.length ? `${sin.length} definición(es) de E2 sin convertir` : ""}: corre «node scripts/cms/e2-al-cms.mjs»`); process.exit(1); }
}
