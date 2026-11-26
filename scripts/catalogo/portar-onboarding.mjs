#!/usr/bin/env node
/* Trae del prototipo las reglas y los datos de «Publica tu negocio v2» (onb-neg-data.js y onb-neg-flow.js: categorías,
   subcategorías, preguntas de cada categoría, lista sugerida, horario típico y lo que cada respuesta enciende) a
   apps/web/lib/onb/datos.ts, tal cual (son funciones puras). Determinista: se puede volver a correr y produce lo mismo.
   Lo usan la pantalla (paso a paso) y el servidor (valida y deriva al publicar): una sola fuente de las reglas.
   Uso: node scripts/catalogo/portar-onboarding.mjs */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
const RAIZ = new URL("../..", import.meta.url).pathname;
const D = RAIZ + "docs/diseno/pantallas/datos/";
// 23 nov · El prototipo trae un ayudante P(id, h) que arma una dirección de images.pexels.com y que nadie usa (el P que sí se usa lo declara otra función con otros
// argumentos). Se quita al portar: nada que corra en producción lleva la dirección de otra empresa (guardián sinFotosAjenasEnProduccion).
const datos = readFileSync(D + "onb-neg-data.js", "utf8").replace(/^[ \t]*const P = \(id, h\) => 'https:\/\/images\.pexels\.com[^\n]*\n/m, "").replace("FREE_PHOTOS, P, cat", "FREE_PHOTOS, cat"), flujo = readFileSync(D + "onb-neg-flow.js", "utf8");
if (/images\.pexels\.com/.test(datos + flujo)) throw new Error("el prototipo trae una dirección de Pexels que este paso no sabe quitar: revisar");
for (const [n, t] of [["datos", datos], ["flujo", flujo]])
  if (/localStorage|document\.|Date\.now\(|Math\.random/.test(t.replace(/\/\*[\s\S]*?\*\//g, ""))) throw new Error(`${n}: ya no es puro, revisar`);
const salida = `// @ts-nocheck — GENERADO por scripts/catalogo/portar-onboarding.mjs desde docs/diseno/pantallas/datos/onb-neg-data.js y
// onb-neg-flow.js (prototipo «Publica tu negocio v2»). No editar a mano: el diseño manda; si cambia, se vuelve a correr.
/* eslint-disable */
const window = {};
${datos}
${flujo}
export const TLOnbNeg: any = window.TLOnbNeg;
export const TLOnbFlow: any = window.TLOnbFlow;
`;
writeFileSync(RAIZ + "apps/web/lib/onb/datos.ts", salida);

/* 26 nov · Los textos de la config llegan al CMS como el resto. Las pantallas de «Publica tu negocio» sacan sus textos de esta config con E2(x[0], x[1]) (el par
   viene de un dato por índice) y el extractor del catálogo (scripts/cms/extraer.mjs) solo ve E2("…", "…") con textos fijos escritos en el código. Aquí se evalúa la
   config (son funciones puras) y se emite lib/onb/cadenas.ts: un E2("es", "en") por cada par ES/EN que la config trae, para que entren al catálogo. dosIdiomas busca
   el par EXACTO, así que lo que se edite en Super Admin › Cadenas sale en la pantalla sin cambiar el punto de uso. cadenas.ts guarda el sha256 de datos.ts: el
   guardián cadenaConLlave comprueba que están al día (si el prototipo cambia, se vuelve a correr este script y las dos salidas cambian juntas). */
const win = {};
new Function("window", datos + "\n" + flujo)(win);
const SIN_PARES = new Set(["on", "units", "allow", "ALLOW", "allowed"]); // listas de módulos y unidades [id, es, en]: no son un par ES/EN
const RAICES = [["N", win.TLOnbNeg, ["CFG", "MOD"]], ["F", win.TLOnbFlow, ["FLOW", "TOWNS", "DAYN"]]];
const letra = (x) => typeof x === "string" && /\p{L}/u.test(x);
const pares = new Map();
const ver = (x, prof) => {
  if (x == null || prof > 9) return;
  if (Array.isArray(x)) {
    if ((x.length === 2 || (x.length === 3 && typeof x[2] === "string" && /^[a-z][a-z0-9_-]*$/.test(x[2]))) && letra(x[0]) && letra(x[1])) { pares.set(x[0] + "\u0001" + x[1], [x[0], x[1]]); return; }
    for (const y of x) ver(y, prof + 1);
    return;
  }
  if (typeof x === "object") for (const [k, v] of Object.entries(x)) if (!SIN_PARES.has(k) && typeof v !== "function") ver(v, prof + 1);
};
for (const [, obj, claves] of RAICES) for (const k of claves) ver(obj[k], 0);
const lit = (x) => JSON.stringify(x);
const cadenas = `// GENERADO por scripts/catalogo/portar-onboarding.mjs junto con datos.ts. No editar a mano.
// fuente: sha256 de datos.ts = ${createHash("sha256").update(salida).digest("hex")}
/* Cada par ES/EN que trae la config de «Publica tu negocio» (datos.ts), escrito como E2("es", "en") para que el extractor de cadenas (scripts/cms/extraer.mjs) lo
   meta al catálogo del CMS. La pantalla los lee con E2(x[0], x[1]) y dosIdiomas busca el par exacto: lo que se edite en Super Admin › Cadenas sale ahí.
   No se llama: solo existe para que el catálogo vea los textos. */
import { dosIdiomas } from "@/lib/dos-idiomas";

export const CADENAS_ONB = (es: unknown): string[] => {
  const E2 = (a: string, b: string) => dosIdiomas(es, a, b);
  return [
${[...pares.values()].map(([a, b]) => "    E2(" + lit(a) + ", " + lit(b) + "),").join("\n")}
  ];
};
`;
writeFileSync(RAIZ + "apps/web/lib/onb/cadenas.ts", cadenas);
console.log(`onboarding: ${Math.round(salida.length / 1024)} KB · ${pares.size} pares al catálogo`);
