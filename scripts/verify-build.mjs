#!/usr/bin/env node
// verify-build.mjs — guardián del build (2026-07-29).
//
// POR QUÉ EXISTE: el 2026-07-29 el fundador se registró en producción y vio un
// negocio "Taquería La Esperanza" VERIFICADO con 4.8★ y 412 reseñas que parecía
// suyo. La base tenía 0 negocios: todo venía hardcodeado en el frontend. La
// auditoría destapó 11 fugas del mismo tipo. Se arreglaron todas — pero un
// arreglo manual no impide que vuelvan.
//
// Este script convierte "ojalá los hayamos encontrado todos" en "es imposible
// volver a publicarlos": revisa el BUILD YA COMPILADO (no el fuente, que puede
// mentir) y falla si detecta datos fabricados alcanzables por un usuario.
//
// Uso:  node scripts/verify-build.mjs [ruta-del-build]
//       (por defecto apps/web/out; corre DESPUÉS de `pnpm build`)
// Sale con código 1 si encuentra algo → rompe el despliegue a propósito.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const OUT = process.argv[2] ?? 'apps/web/out';

// ── Reglas ──────────────────────────────────────────────────────────────────
// `where`: 'js' = solo en el JavaScript (lo que la app puede renderizar).
//          'all' = también en el HTML.
// El HTML de la landing lleva a propósito un hero ilustrativo, así que los
// nombres de ejemplo se buscan SOLO en js salvo que se diga lo contrario.
const RULES = [
  // 1 · Negocios y personas fabricados que llegaron a producción.
  { id: 'negocio-demo', where: 'js', why: 'Negocio de escaparate que el dueño podía leer como suyo',
    needles: ['Taquería La Esperanza', 'Salón Bella Vida', 'Lupita’s Tortillería', "Lupita's Tortillería", 'Salón Glamour', 'Taller Don Beto', 'Panadería Dulce Hogar'] },
  { id: 'personas-demo', where: 'js', why: 'Personas inventadas (vecinos, equipo, reseñas) mostradas como reales',
    needles: ['Elisabeth Rivera', 'Marisa Díaz', 'Marco Pellegrino', 'Sofía Reyes', 'Carlos Méndez', 'David Bao', 'Lucía Martín'] },
  // 2 · Métricas y dinero fabricados.
  { id: 'metricas-demo', where: 'js', why: 'Cifras inventadas (hashtags, ingresos) presentadas como reales',
    needles: ['#TaqueríasHTX', '#MejorMecánico', '#PulgaDel59', '#EncantoCakes'],
    // Los NÚMEROS van como literales: normalizar les quita el punto y "62.4"
    // pasaría a "624", que choca con cualquier hash del bundle (falso positivo
    // real, visto el 2026-07-29). Se buscan tal cual, con comillas incluidas.
    literals: ['revenue:48120', 'revenue: 48120'] },
  // 3 · Proyecto Supabase BORRADO — nunca correcto, en ningún entorno.
  { id: 'base-borrada', where: 'all', why: 'El build apunta a un proyecto Supabase BORRADO',
    literals: ['ujvzpfygaqywcdlnplie'] },
  // (La coherencia base↔entorno se comprueba abajo: depende del destino.)
  // 4 · Secretos que jamás deben viajar al navegador.
  { id: 'secretos', where: 'all', why: 'SECRETO expuesto en el cliente — rotar de inmediato',
    literals: ['sk_live_', 'sk_test_', 'sb_secret_', 'SUPABASE_SERVICE_ROLE_KEY'] },
  // 5 · Stripe en vivo sin querer (o al revés) se comprueba aparte, abajo.
];

// ── Recorrido del build ─────────────────────────────────────────────────────
// El minificador escapa lo no-ASCII: "Taquería" acaba en el bundle como
// "Taquer\xeda". Buscar la cadena literal se pierde TODOS los nombres con acento
// — o sea, casi todos los de esta app. (Descubierto el 2026-07-29 probando el
// guardián con una regresión inyectada a propósito: dio "✅" con el dato falso
// dentro. Por eso toda comprobación se prueba con un caso que DEBE fallar.)
// Se decodifican \xNN, \uNNNN y \u{NNNN} antes de buscar.
function unescapeJs(text) {
  return text
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// Además el minificador puede partir una cadena ("Taqu"+"ería") o cambiar las
// comillas tipográficas. Se compara sobre una forma normalizada: sin acentos,
// en minúsculas y sin caracteres no alfanuméricos, así "Taquería La Esperanza",
// "Taquer\xeda La Esperanza" y "TAQUERIA  LA  ESPERANZA" son la misma aguja.
function normalize(text) {
  return unescapeJs(text)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

let files;
try {
  files = walk(OUT);
} catch {
  console.error(`✖ verify-build: no encuentro el build en "${OUT}". ¿Corriste \`pnpm build\` antes?`);
  process.exit(2);
}

const jsFiles = files.filter((f) => extname(f) === '.js');
const htmlFiles = files.filter((f) => extname(f) === '.html');
const scanFiles = { js: jsFiles, all: [...jsFiles, ...htmlFiles] };

const hits = [];
for (const rule of RULES) {
  for (const file of scanFiles[rule.where]) {
    let raw;
    try { raw = readFileSync(file, 'utf8'); } catch { continue; }
    const norm = normalize(raw);
    for (const needle of rule.needles ?? []) {
      const n = normalize(needle);
      if (n && norm.includes(n)) hits.push({ rule, needle, file });
    }
    const plain = unescapeJs(raw);
    for (const lit of rule.literals ?? []) {
      if (plain.includes(lit)) hits.push({ rule, needle: lit, file });
    }
  }
}

// ── Coherencia base ↔ entorno ───────────────────────────────────────────────
// El build debe traer la base del destino y NINGUNA otra. Esto es lo que impide
// las dos catástrofes simétricas: publicar producción leyendo la base de pruebas
// (pasó: el sitio en vivo sirvió staging durante semanas) y — peor — que una
// vista previa escriba en la base REAL mientras el fundador "solo estaba
// probando". El destino sale de TOLATINO_TARGET o de VERCEL_ENV, igual que en
// next.config.mjs, así que guardián y build no pueden desalinearse.
const REF_PROD = 'vurqsebgsacickxsxfeh';
const REF_STAGING = 'zpkaxojonufdwgahiqjh';
const target =
  process.env.TOLATINO_TARGET ??
  (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production' ? 'staging' : 'production');
const esperado = target === 'staging' ? REF_STAGING : REF_PROD;
const prohibido = target === 'staging' ? REF_PROD : REF_STAGING;

const textoTodo = [...jsFiles, ...htmlFiles]
  .map((f) => { try { return readFileSync(f, 'utf8'); } catch { return ''; } })
  .join('');
let envFail = false;
let envMsg = `  Destino: ${target.toUpperCase()} · base esperada ${esperado}`;
if (!textoTodo.includes(esperado)) {
  envFail = true;
  envMsg += `\n  ✖ El build NO trae la base esperada (${esperado}).`;
}
if (textoTodo.includes(prohibido)) {
  envFail = true;
  envMsg += `\n  ✖ El build trae la base EQUIVOCADA (${prohibido}) — ${target === 'staging' ? 'una prueba escribiría en PRODUCCIÓN' : 'producción leería la base de pruebas'}.`;
}

// ── Coherencia de Stripe: la llave publicable del build debe coincidir con el
//    modo esperado. Evita lanzar con `pk_test` creyendo que cobras de verdad, y
//    evita cobrar de verdad creyendo que estás en pruebas.
//    Se controla con STRIPE_EXPECT=live|test (si no se pasa, solo informa).
const expect = process.env.STRIPE_EXPECT;
const allJs = unescapeJs(jsFiles.map((f) => { try { return readFileSync(f, 'utf8'); } catch { return ''; } }).join(''));
const hasTest = allJs.includes('pk_test_');
const hasLive = allJs.includes('pk_live_');
let stripeMsg = `  Stripe en el build: ${hasLive ? 'pk_live (DINERO REAL)' : hasTest ? 'pk_test (pruebas)' : 'ninguna llave encontrada'}`;
let stripeFail = false;
if (expect === 'live' && !hasLive) { stripeFail = true; stripeMsg += '\n  ✖ Se esperaba LIVE y el build no trae pk_live.'; }
if (expect === 'test' && hasLive) { stripeFail = true; stripeMsg += '\n  ✖ Se esperaba PRUEBAS y el build trae pk_live — cobraría de verdad.'; }

// ── Reporte ─────────────────────────────────────────────────────────────────
console.log(`\nverify-build · ${jsFiles.length} archivos JS, ${htmlFiles.length} HTML en ${OUT}`);
console.log(envMsg);
console.log(stripeMsg);

if (hits.length === 0 && !stripeFail && !envFail) {
  console.log('\n✅ Sin datos fabricados, sin secretos y con la base correcta.\n');
  process.exit(0);
}

console.error('\n✖ EL BUILD NO PUEDE PUBLICARSE:\n');
const porRegla = new Map();
for (const h of hits) {
  if (!porRegla.has(h.rule.id)) porRegla.set(h.rule.id, { why: h.rule.why, items: [] });
  porRegla.get(h.rule.id).items.push(h);
}
for (const [id, { why, items }] of porRegla) {
  console.error(`  [${id}] ${why}`);
  for (const it of items.slice(0, 6)) {
    console.error(`      "${it.needle}"  →  ${basename(it.file)}`);
  }
  if (items.length > 6) console.error(`      … y ${items.length - 6} más`);
  console.error('');
}
console.error('Arréglalo en el código y vuelve a compilar. Si alguna coincidencia es');
console.error('legítima (p. ej. un placeholder "Ej. …" o el hero ilustrativo de la');
console.error('landing), ajusta la regla en scripts/verify-build.mjs y DEJA ESCRITO por qué.\n');
process.exit(1);
