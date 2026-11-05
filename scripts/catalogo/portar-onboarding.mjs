#!/usr/bin/env node
/* Trae del prototipo las reglas y los datos de «Publica tu negocio v2» (onb-neg-data.js y onb-neg-flow.js: categorías,
   subcategorías, preguntas de cada categoría, lista sugerida, horario típico y lo que cada respuesta enciende) a
   apps/web/lib/onb/datos.ts, tal cual (son funciones puras). Determinista: se puede volver a correr y produce lo mismo.
   Lo usan la pantalla (paso a paso) y el servidor (valida y deriva al publicar): una sola fuente de las reglas.
   Uso: node scripts/catalogo/portar-onboarding.mjs */
import { readFileSync, writeFileSync } from "node:fs";
const RAIZ = new URL("../..", import.meta.url).pathname;
const D = RAIZ + "docs/diseno/pantallas/datos/";
const datos = readFileSync(D + "onb-neg-data.js", "utf8"), flujo = readFileSync(D + "onb-neg-flow.js", "utf8");
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
