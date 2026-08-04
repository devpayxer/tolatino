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

// ── Avisos que la base emite y nadie sabe dibujar ───────────────────────────
// POR QUÉ: hay TRES sitios que tienen que conocer cada tipo de aviso — la base
// (que lo emite), la campana de la app y la función de push — y los tres se
// mantenían A MANO. Se separaron sin que nadie lo notara: la 2ª auditoría de
// Comunidad (2026-08-03) encontró 15 tipos que salían como «Notificación» sin
// una línea de texto, y 23 que llegaban al teléfono con el cuerpo VACÍO.
// Arreglarlos a mano no impide que vuelvan: el próximo `notify_user(...)` con
// un tipo nuevo repite el fallo. Esto lo hace imposible de publicar.
//
// Se lee el FUENTE (las migraciones y los dos ficheros de texto), no el build:
// la función de push no viaja en el bundle del navegador.
const kindsFail = [];
let kindsMsg = '';
try {
  const raiz = new URL('..', import.meta.url).pathname;
  const migDir = join(raiz, 'supabase/migrations');
  const sql = readdirSync(migDir).filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(join(migDir, f), 'utf8')).join('\n');

  // Lo que la base EMITE: notify_user(...,'kind',...) / notify_once(...).
  const emite = new Set();
  for (const m of sql.matchAll(/notify_(?:user|once)\s*\(\s*[^,]+,\s*'([a-z_]+)'/g)) {
    // Un tipo que acaba en «_» no es un tipo: es el prefijo de una
    // concatenación ('claim_' || in_status), que se expande justo abajo.
    if (!m[1].endsWith('_')) emite.add(m[1]);
  }
  // Tipos construidos por concatenación. Los valores posibles NO son la lista
  // que la función valida al entrar (`not in (...)`) sino la condición que
  // envuelve al aviso: `admin_claim_update` acepta 4 estados pero solo avisa
  // en 2. Usar la lista de validación inventaría dos tipos que nunca se emiten.
  for (const m of sql.matchAll(/'([a-z_]+_)'\s*\|\|\s*(\w+)/g)) {
    const [, prefijo, variable] = m;
    const antes = sql.slice(Math.max(0, m.index - 600), m.index);
    const guardas = [...antes.matchAll(new RegExp(`\\b${variable}\\s+in\\s*\\(([^)]+)\\)`, 'g'))];
    const lista = guardas.length ? guardas[guardas.length - 1][1] : null;
    if (lista) for (const v of lista.matchAll(/'([a-z_]+)'/g)) emite.add(prefijo + v[1]);
  }

  // Lo que cada consumidor SABE DIBUJAR: los `case '...'` de su switch.
  const casos = (ruta) => {
    const t = readFileSync(join(raiz, ruta), 'utf8');
    return new Set([...t.matchAll(/case\s+'([a-z_]+)'\s*:/g)].map((m) => m[1]));
  };
  const consumidores = [
    ['la campana de la app', 'apps/web/src/lib/notifications.tsx'],
    ['la notificación al teléfono', 'supabase/functions/send-push/index.ts'],
  ];
  for (const [nombre, ruta] of consumidores) {
    const sabe = casos(ruta);
    const faltan = [...emite].filter((k) => !sabe.has(k)).sort();
    if (faltan.length) kindsFail.push({ nombre, ruta, faltan });
  }
  kindsMsg = `  Avisos: la base emite ${emite.size} tipos`
    + (kindsFail.length ? '' : ', y los dos consumidores los dibujan todos');
} catch (e) {
  // Si el repo no está completo (p. ej. se verifica solo `out/`), no se
  // inventa un ✅: se dice que no se pudo comprobar.
  kindsMsg = `  Avisos: no se pudo comprobar (${e.message})`;
}

// ── Datos de ejemplo como estado INICIAL del panel ──────────────────────────
// POR QUÉ: el estado inicial se pinta ANTES de saber si hay un negocio real, así
// que un dueño ve un instante el catálogo, los pedidos o los clientes de otro.
// La auditoría de 2026-07-29 quitó los respaldos `?? DEMO` pero dejó los estados
// INICIALES; la de 2026-08-04 encontró que «Entregas» abría con cinco pedidos
// inventados —con nombres, platillos y direcciones de Houston— y que además se
// quedaban fijos si la consulta fallaba.
// LA REGLA: los datos de ejemplo solo pueden aparecer cuando el cargador decide
// (detrás de `persistable`/`admin.demo`), NUNCA como valor inicial de useState.
const demoFail = [];
let demoMsg = '';
try {
  const raiz = new URL('..', import.meta.url).pathname;
  const dir = join(raiz, 'apps/web/src/screens/negocio/modules');
  let revisados = 0;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.tsx'))) {
    revisados++;
    const src = readFileSync(join(dir, f), 'utf8');
    for (const m of src.matchAll(/useState<[^>]*>\(\s*([A-Z_]*(?:DEMO|SEED|FIXT|SAMPLE)[A-Z_]*|(?:seed|demo|sample|fixt)[A-Za-z]*|[a-zA-Z]*(?:Seed|Demo|Sample)[A-Za-z]*)\s*[),]/g)) {
      // El patrón cubre DEMO_*, *_SEED, seedX, demoX, sampleX y XSeed: la primera
      // versión solo miraba DEMO/seed/demo al PRINCIPIO del nombre y se le escapó
      // `DRIVER_SEED` — cuatro repartidores inventados con rutas y tiempos de
      // llegada. Un guardián con un hueco es peor que no tenerlo, porque da
      // tranquilidad falsa. (2026-08-04.)
      // EXCEPCIÓN documentada: los `*Config` no son datos de NADIE — son las
      // categorías y ajustes de arranque que se le ofrecen a un dueño nuevo
      // («Degustaciones», «Clases y talleres»). Ofrecer un punto de partida es
      // diseño; el problema es enseñar el catálogo, los pedidos o los clientes
      // de otro como si fueran suyos.
      if (/Config$/.test(m[1])) continue;
      demoFail.push({ archivo: f, constante: m[1] });
    }
  }
  demoMsg = `  Panel: ${revisados} módulos revisados`
    + (demoFail.length ? '' : ', ninguno arranca con datos de ejemplo');
} catch (e) {
  demoMsg = `  Panel: no se pudo comprobar (${e.message})`;
}

// ── Reporte ─────────────────────────────────────────────────────────────────
console.log(`\nverify-build · ${jsFiles.length} archivos JS, ${htmlFiles.length} HTML en ${OUT}`);
console.log(envMsg);
console.log(stripeMsg);
console.log(kindsMsg);
console.log(demoMsg);
for (const { nombre, ruta, faltan } of kindsFail) {
  console.error(`\n  ✖ ${faltan.length} tipo(s) que la base emite y ${nombre} NO sabe dibujar:`);
  console.error(`      ${faltan.join(', ')}`);
  console.error(`      → añade un \`case\` para cada uno en ${ruta}`);
}

for (const d of demoFail) {
  console.error(`\n  ✖ ${d.archivo}: useState arranca con \`${d.constante}\` (datos de ejemplo).`);
  console.error('      → el valor inicial debe ser vacío; que el cargador decida si toca demo.');
}

if (hits.length === 0 && !stripeFail && !envFail && kindsFail.length === 0 && demoFail.length === 0) {
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
