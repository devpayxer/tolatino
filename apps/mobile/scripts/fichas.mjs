#!/usr/bin/env node
/* 8i · Las fichas de las cuatro apps en App Store Connect y Google Play (fase8-apps.md §4 8i; guardián fichaEnLimites). La fuente es el repo:
   apps/mobile/tiendas/{app}/{es,en}.md, escritas desde docs/ayuda/ (cada una dice de cuáles en «fuentes»). De aquí sale
   apps/mobile/tiendas/fichas.json (lo que el servidor sube como BORRADOR y copia en store_listings con la huella del archivo).
   Reglas: dentro de los límites de cada tienda (Apple: nombre 30, subtítulo 30, palabras clave 100 bytes, texto promocional 170, descripción
   4000, novedades 4000; Google: título 30, descripción corta 80, completa 4000, novedades 500 — se vuelven a leer el día del envío), sin emoji,
   sin superlativos falsos, ES y EN de cada app, el nombre igual a apps.json y las fuentes que existen.
   Uso: node apps/mobile/scripts/fichas.mjs              escribe fichas.json
        node apps/mobile/scripts/fichas.mjs --verificar  no escribe: falla si una ficha no cumple o fichas.json no es lo que sale de los .md */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MOVIL = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(MOVIL, "../..");
export const SALIDA = "apps/mobile/tiendas/fichas.json";
export const LIMITES = {
  apple: { nombre: 30, subtitulo: 30, palabras: 100, promo: 170, descripcion: 4000, novedades: 4000 },
  google: { nombre: 30, corta: 80, descripcion: 4000, novedades: 500 },
};
export const LOCALES = { es: { apple: "es-MX", google: "es-US" }, en: { apple: "en-US", google: "en-US" } };
const SECCIONES = { "Nombre": "nombre", "Subtítulo": "subtitulo", "Descripción corta": "corta", "Palabras clave": "palabras", "Texto promocional": "promo", "Descripción": "descripcion", "Novedades": "novedades" };
/* Lo que una ficha sobria no dice (superlativos y promesas que no se pueden sostener). */
export const SUPERLATIVOS = /(^|[^\p{L}])(mejor(es)?|el mejor|la mejor|best|#\s?1|n[uú]mero uno|number one|l[ií]der(es)?|leading|incre[ií]ble|amazing|revolucionari[oa]s?|revolutionary|perfect[oa]s?|perfect|garantizad[oa]s?|guaranteed|gratis para siempre|free forever|el [uú]nico|the only|super ?app)(?=$|[^\p{L}])/iu;
const EMOJI = /\p{Extended_Pictographic}/u;
const A = (raiz) => JSON.parse(readFileSync(join(raiz, "apps/mobile/apps.json"), "utf8"));

export function leerFicha(raiz, app, idioma) {
  const ruta = `apps/mobile/tiendas/${app}/${idioma}.md`, f = join(raiz, ruta);
  if (!existsSync(f)) return { ruta, error: "falta" };
  const crudo = readFileSync(f, "utf8"), sha256 = createHash("sha256").update(crudo).digest("hex");
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(crudo);
  if (!m) return { ruta, error: "sin cabecera ---" };
  const cab = Object.fromEntries(m[1].split("\n").map((l) => l.split(/:\s*/)).map(([k, ...v]) => [k.trim(), v.join(": ").trim()]));
  const s = {};
  let actual = null;
  for (const l of m[2].split("\n")) {
    const h = /^# (.+)$/.exec(l);
    if (h) { actual = SECCIONES[h[1].trim()] ?? `?${h[1].trim()}`; s[actual] = []; continue; }
    if (actual) s[actual].push(l);
  }
  const txt = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.join("\n").trim()]));
  return { ruta, sha256, cab, ...txt };
}

/* Los problemas de una ficha (vacío = bien). */
export function problemasFicha(raiz, x, app, idioma) {
  const out = [], r = x.ruta, def = A(raiz).apps.find((a) => a.key === app);
  if (x.error) return [`${r}: ${x.error}`];
  for (const k of Object.keys(x)) if (k.startsWith("?")) out.push(`${r}: sección desconocida «${k.slice(1)}»`);
  if (x.cab.app !== app || x.cab.idioma !== idioma || x.cab.apple !== LOCALES[idioma].apple || x.cab.google !== LOCALES[idioma].google) out.push(`${r}: la cabecera dice app/idioma/locales distintos (${LOCALES[idioma].apple} en Apple, ${LOCALES[idioma].google} en Google)`);
  for (const k of ["nombre", "subtitulo", "corta", "palabras", "promo", "descripcion", "novedades"]) if (!x[k]) out.push(`${r}: falta «${Object.keys(SECCIONES).find((y) => SECCIONES[y] === k)}»`);
  if (x.nombre && def && x.nombre !== def.nombre[idioma]) out.push(`${r}: el nombre «${x.nombre}» no es el de apps.json («${def.nombre[idioma]}»)`);
  const L = (k, n, bytes = false) => { const v = x[k] ?? "", largo = bytes ? Buffer.byteLength(v, "utf8") : [...v].length; if (largo > n) out.push(`${r}: «${k}» tiene ${largo}${bytes ? " bytes" : ""} y el tope es ${n}`); };
  L("nombre", Math.min(LIMITES.apple.nombre, LIMITES.google.nombre)); L("subtitulo", LIMITES.apple.subtitulo); L("palabras", LIMITES.apple.palabras, true);
  L("promo", LIMITES.apple.promo); L("descripcion", Math.min(LIMITES.apple.descripcion, LIMITES.google.descripcion)); L("corta", LIMITES.google.corta);
  L("novedades", Math.min(LIMITES.apple.novedades, LIMITES.google.novedades));
  if ((x.descripcion ?? "").length < 200) out.push(`${r}: la descripción es demasiado corta para una ficha (${(x.descripcion ?? "").length})`);
  if (x.palabras) {
    const p = x.palabras.split(","), vistas = new Set();
    for (const w of p) { const t = w.trim().toLowerCase(); if (!t || w !== w.trim()) out.push(`${r}: palabras clave separadas solo por comas, sin espacios ni vacías`); if (vistas.has(t)) out.push(`${r}: palabra clave repetida «${t}»`); vistas.add(t); if (/to.?latino/i.test(t)) out.push(`${r}: el nombre de la app no va en las palabras clave (Apple ya lo usa)`); }
  }
  for (const [k, v] of Object.entries(x)) {
    if (typeof v !== "string" || ["ruta", "sha256"].includes(k)) continue;
    if (EMOJI.test(v)) out.push(`${r}: emoji en «${k}» (sin emoji)`);
    const sup = SUPERLATIVOS.exec(v); if (sup) out.push(`${r}: superlativo o promesa en «${k}»: «${sup[2]}»`);
  }
  for (const f of String(x.cab.fuentes ?? "").split(",").map((y) => y.trim()).filter(Boolean)) if (!existsSync(join(raiz, f.startsWith("docs/") ? f : `docs/ayuda/${f}`))) out.push(`${r}: la fuente ${f} no existe en docs/ayuda`);
  if (!x.cab.fuentes) out.push(`${r}: dice de qué docs/ayuda sale (fuentes)`);
  return out;
}

/* Lo que sale de las fichas: por app, idioma y tienda, los campos con el nombre de cada tienda y la huella del .md. */
export function salida(raiz = REPO) {
  const apps = A(raiz).apps.map((a) => a.key), out = { $fuente: "Generado por apps/mobile/scripts/fichas.mjs desde apps/mobile/tiendas/{app}/{es,en}.md. No editar a mano.", limites: LIMITES, fichas: [] }, mal = [];
  for (const app of apps) for (const idioma of ["es", "en"]) {
    const x = leerFicha(raiz, app, idioma);
    mal.push(...problemasFicha(raiz, x, app, idioma));
    if (x.error) continue;
    out.fichas.push({ app, idioma, archivo: x.ruta, sha256: x.sha256,
      apple: { locale: LOCALES[idioma].apple, name: x.nombre, subtitle: x.subtitulo, keywords: x.palabras, promotionalText: x.promo, description: x.descripcion, whatsNew: x.novedades },
      google: { language: LOCALES[idioma].google, title: x.nombre, shortDescription: x.corta, fullDescription: x.descripcion, recentChanges: x.novedades } });
  }
  return { json: JSON.stringify(out, null, 2) + "\n", problemas: mal };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { json, problemas } = salida();
  if (problemas.length) { for (const p of problemas) console.error(`✗ ${p}`); process.exit(1); }
  const f = join(REPO, SALIDA);
  if (process.argv.includes("--verificar")) {
    if (!existsSync(f) || readFileSync(f, "utf8") !== json) { console.error(`✗ ${SALIDA} no es lo que sale de las fichas (corre: node apps/mobile/scripts/fichas.mjs)`); process.exit(1); }
    console.log("✓ las 8 fichas cumplen los límites y fichas.json coincide");
  } else { writeFileSync(f, json); console.log("✓ fichas.json generado (8 fichas)"); }
}
