#!/usr/bin/env node
/* Trae del prototipo las reglas y los datos de «Publica tu negocio v2» (onb-neg-data.js y onb-neg-flow.js: categorías,
   subcategorías, preguntas de cada categoría, lista sugerida, horario típico y lo que cada respuesta enciende) a
   apps/web/lib/onb/datos.ts, tal cual (son funciones puras). Determinista: se puede volver a correr y produce lo mismo.
   Lo usan la pantalla (paso a paso) y el servidor (valida y deriva al publicar): una sola fuente de las reglas.
   Uso: node scripts/catalogo/portar-onboarding.mjs */
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
console.log(`onboarding: ${Math.round(salida.length / 1024)} KB`);
