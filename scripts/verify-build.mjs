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

// ── Guardián: un efecto NO puede depender de una función que llega por prop ──
// De dónde sale: el 2026-08-04 el fundador reportó que solo podía escribir UNA
// letra — en el móvil se le cerraba el teclado y en escritorio tenía que volver
// a hacer clic tras cada tecla. Causa: el efecto de `Overlay` (trampa de foco,
// Escape, devolver el foco al cerrar) llevaba `onClose` en sus dependencias.
// Casi todos los padres pasan `onClose={close}` con `const close = () => …`,
// que es una función NUEVA en cada render; el efecto se desmontaba y volvía a
// montarse con cada letra, y su limpieza devolvía el foco al elemento anterior.
//
// La regla: si un efecto lista una prop con forma de manejador (`onAlgo`), o
// bien esa función viene memorizada, o el efecto se re-monta sin control. Se
// resuelve guardando el manejador en una ref y dejando fuera la dependencia.
const efectoFail = [];
let efectoMsg = '';
try {
  const raiz = new URL('..', import.meta.url).pathname;
  const base = join(raiz, 'apps/web/src');
  const archivos = walk(base).filter((f) => /\.tsx?$/.test(f));
  const deps = /\}\s*,\s*\[([^\]]*)\]\s*\)\s*;/g;
  for (const f of archivos) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(deps)) {
      const lista = m[1].split(',').map((d) => d.trim()).filter(Boolean);
      const malas = lista.filter((d) => /^on[A-Z]\w*$/.test(d));
      if (malas.length) {
        efectoFail.push({ archivo: f.slice(base.length + 1), linea: src.slice(0, m.index).split('\n').length, malas });
      }
    }
  }
  efectoMsg = `  Efectos: ${archivos.length} archivos revisados`
    + (efectoFail.length ? '' : ', ninguno depende de un manejador recibido por prop');
} catch (e) {
  efectoMsg = `  Efectos: no se pudo comprobar (${e.message})`;
}

// ── Guardián: el LIENZO y el RELLENO DE CAMPOS no pueden ser el mismo color ──
// De dónde sale: el 2026-08-06 el fundador pidió cambiar «ese gris del fondo»
// por blanco. Al medirlo salió que el token `app` hacía DOS trabajos a la vez:
// era el lienzo de la página (7 usos) y el relleno de los campos de texto y los
// pozos dentro de tarjetas y hojas blancas (104 usos). Poner `app` en blanco
// habría borrado 104 campos —el buscador, «Escribe tu ciudad…», el editor de
// horario, los formularios de publicar quedaban como un contorno sobre blanco—
// para aclarar 7 fondos. Se separaron: `canvas` es el fondo, `app` el relleno.
//
// La regla: si alguien vuelve a igualarlos (o pone el relleno en blanco puro),
// los campos desaparecen otra vez y no se nota hasta que un usuario intenta
// escribir. Se comprueba en el CSS SERVIDO, no en la config: lo que importa es
// lo que se publica.
const colorFail = [];
let colorMsg = '';
try {
  const css = walk(OUT).filter((f) => f.endsWith('.css')).map((f) => readFileSync(f, 'utf8')).join('\n');
  const valorDe = (clase) => {
    const m = css.match(new RegExp(`\\.${clase}\\{[^}]*background-color:([^;}]+)`));
    return m ? m[1].trim().toLowerCase() : null;
  };
  // Tailwind sirve `rgb(255 255 255/var(--tw-bg-opacity,1))`, así que comparar
  // cadenas no vale: la primera versión de esta comprobación dio "✅" con los
  // campos en BLANCO PURO porque buscaba el texto "rgb(255 255 255)". Se
  // extraen los tres números y se compara con ellos. (Probado al revés: sin
  // esto, el caso que DEBE fallar pasaba.)
  const rgbDe = (v) => {
    if (!v) return null;
    const hex = v.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/);
    if (hex) {
      const h = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    }
    const n = v.match(/(\d{1,3})\D+(\d{1,3})\D+(\d{1,3})/);
    return n ? [+n[1], +n[2], +n[3]] : null;
  };
  const lienzo = valorDe('bg-canvas');
  const campo = valorDe('bg-app');
  const cRgb = rgbDe(campo);
  const lRgb = rgbDe(lienzo);
  if (!lRgb || !cRgb) {
    colorMsg = `  Fondo: no se pudo leer del CSS servido (canvas=${lienzo ?? '?'} · campos=${campo ?? '?'})`;
  } else if (lRgb.join() === cRgb.join()) {
    colorFail.push(`el lienzo y el relleno de campos son el MISMO color (rgb ${lRgb.join(' ')})`);
  } else if (cRgb.every((n) => n === 255)) {
    colorFail.push('el relleno de campos (`bg-app`) quedó en BLANCO PURO — sobre una hoja blanca no se ve nada');
  } else {
    colorMsg = `  Fondo: lienzo rgb(${lRgb.join(' ')}) y campos rgb(${cRgb.join(' ')}) — distintos, los campos se ven`;
  }

  // Con el lienzo en BLANCO, una tarjeta blanca ya no se distingue por su
  // relleno: la delimita `border-line`, y nada más. Si alguien la devuelve al
  // tono de los divisores (`hair`), las tarjetas se desvanecen y la app se ve
  // como un documento plano — es el fallo que este cambio podía dejar servido.
  // Se compone el borde SOBRE el lienzo y se exige un salto perceptible.
  //
  // AGUJERO CERRADO (2026-08-20, migración al sistema nuevo): la primera
  // versión de esto SOLO sabía leer `rgba(...)`. El handoff nuevo trae el borde
  // como HEX (`line: #EAE6F5`), así que en cuanto alguien lo copiara tal cual
  // esta comprobación devolvía `null` y se saltaba **en silencio** — el peor
  // fallo posible en un guardián: no avisa de que dejó de mirar. Ahora lee las
  // dos formas, y si NO consigue leer el borde, lo dice como fallo.
  const bordeDe = (clase) => {
    const m = css.match(new RegExp(`\\.${clase}\\{border-color:([^;}]+)`));
    if (!m) return null;
    const v = m[1].trim().toLowerCase();
    const rgba = v.match(/rgba?\(([\d.,\s/]+)\)/);
    if (rgba) {
      const p = rgba[1].split(/[,/]/).map((x) => parseFloat(x.trim()));
      if (p.length >= 3) return { rgb: p.slice(0, 3), a: p.length >= 4 ? p[3] : 1 };
    }
    const rgb = rgbDe(v);
    return rgb ? { rgb, a: 1 } : null;
  };
  const linea = bordeDe('border-line');
  if (lRgb && !linea) {
    colorFail.push('no se pudo leer `border-line` del CSS servido — la comprobación del contorno de las tarjetas se habría saltado sin avisar');
  } else if (lRgb && linea) {
    // luminancia simple; el borde compuesto sobre el lienzo
    const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
    const compuesto = linea.rgb.map((c, i) => c * linea.a + lRgb[i] * (1 - linea.a));
    const salto = Math.round(lum(lRgb) - lum(compuesto));
    if (salto < 22) {
      colorFail.push(`el contorno de las tarjetas casi no se ve sobre el lienzo (salto ${salto}, mínimo 22) — en blanco, el borde es lo ÚNICO que separa una tarjeta del fondo`);
    } else {
      colorMsg += `\n  Tarjetas: contorno a ${salto} puntos del lienzo — se distinguen sobre blanco`;
    }
  }
} catch (e) {
  colorMsg = `  Fondo: no se pudo comprobar (${e.message})`;
}

// ── Guardián: las TRES tipografías del sistema llegan de verdad ──────────────
// De dónde sale: el paso 1 de la migración al «Sistema To'Latino» (2026-08-20)
// cambia Plus Jakarta Sans por Onest (interfaz) + Bricolage Grotesque
// (titulares y precios) + Space Mono (códigos y antetítulos).
//
// Por qué necesita guardián: una fuente que no carga NO rompe nada. El
// navegador cae a `system-ui` y la app sigue funcionando — solo se ve distinta,
// y en una captura de móvil pequeña ni se nota. Es exactamente la clase de
// regresión que se cuela: basta con que alguien revierta el `<link>` del layout
// o se equivoque en un nombre de familia. Se comprueba sobre lo SERVIDO.
const fuenteFail = [];
let fuenteMsg = '';
try {
  const html = htmlFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
  const css = walk(OUT).filter((f) => f.endsWith('.css')).map((f) => readFileSync(f, 'utf8')).join('\n');
  const familias = [
    ['Onest', 'la interfaz entera (cuerpo, botones, formularios)'],
    ['Bricolage Grotesque', 'titulares y precios'],
    ['Space Mono', 'códigos, horas y antetítulos'],
  ];

  // 1 · EL ENLACE. Es lo único que hace que las fuentes se DESCARGUEN, así que
  //     es lo que se exige siempre. Ojo: en la URL van con `+` en vez de
  //     espacio (`Bricolage+Grotesque`) — la primera versión de este guardián
  //     buscaba el nombre con espacio y falló pidiendo algo que sí estaba.
  const link = (html.match(/https:\/\/fonts\.googleapis\.com\/css2\?[^"']+/) ?? [''])[0].replace(/\+/g, ' ');
  for (const [f, papel] of familias) {
    if (!link.includes(f)) fuenteFail.push(`el \`<link>\` a Google Fonts no pide \`${f}\` (${papel}) — no se descarga`);
  }
  if (!link) fuenteFail.push('no hay `<link>` a Google Fonts en el HTML servido — ninguna familia del sistema se descarga');

  // 2 · LA INTERFAZ. Onest es la que se hereda del `body`: si esa falta, la app
  //     entera cae a system-ui y se ve genérica. Las otras dos se piden a mano
  //     (`font-display`/`font-mono`) donde el sistema las permite.
  if (!/font-family:\s*['"]?Onest/i.test(css) && !/font-family:\s*['"]?Onest/i.test(html)) {
    fuenteFail.push('el `body` no aplica `Onest` — la interfaz cae a la tipografía del sistema operativo');
  }

  // 3 · NADA DE LA ANTERIOR. Un solo sitio sin migrar canta a kilómetros.
  if ((html + css).includes('Plus Jakarta Sans')) {
    fuenteFail.push('sigue servida `Plus Jakarta Sans` (la tipografía del sistema ANTERIOR) — quedó un sitio sin migrar');
  }

  // Informativo, NO fallo: cuántas familias han llegado ya al CSS emitido.
  // Tailwind solo emite `font-display`/`font-mono` cuando alguna pantalla las
  // usa, y eso ocurre en el paso 3 de la migración. Esta línea es el marcador
  // para ver ese paso aterrizar.
  const enCss = familias.filter(([f]) => css.includes(f)).map(([f]) => f);
  if (!fuenteFail.length) {
    fuenteMsg = `  Tipografía: las 3 familias enlazadas · en uso dentro del CSS: ${enCss.join(', ') || 'ninguna todavía'}`;
  }
} catch (e) {
  fuenteMsg = `  Tipografía: no se pudo comprobar (${e.message})`;
}

// ── Reporte ─────────────────────────────────────────────────────────────────
console.log(`\nverify-build · ${jsFiles.length} archivos JS, ${htmlFiles.length} HTML en ${OUT}`);
console.log(envMsg);
console.log(stripeMsg);
console.log(kindsMsg);
console.log(demoMsg);
console.log(efectoMsg);
console.log(colorMsg);
console.log(fuenteMsg);
for (const { nombre, ruta, faltan } of kindsFail) {
  console.error(`\n  ✖ ${faltan.length} tipo(s) que la base emite y ${nombre} NO sabe dibujar:`);
  console.error(`      ${faltan.join(', ')}`);
  console.error(`      → añade un \`case\` para cada uno en ${ruta}`);
}

for (const e of efectoFail) {
  console.error(`\n  ✖ ${e.archivo}:${e.linea}: un efecto depende de \`${e.malas.join('`, `')}\` (prop manejadora).`);
  console.error('      → el padre casi siempre pasa una flecha nueva en cada render: el efecto');
  console.error('        se re-monta con cada tecla y su limpieza roba el foco del campo.');
  console.error('        Guarda el manejador en una ref y sácalo de las dependencias.');
}

for (const c of colorFail) {
  console.error(`\n  ✖ ${c}.`);
  console.error('      → `canvas` es el FONDO de la página; `app` es el relleno de los');
  console.error('        campos de texto y los pozos sobre blanco. Si se igualan, el');
  console.error('        buscador y todos los formularios quedan invisibles.');
}

for (const f of fuenteFail) {
  console.error(`\n  ✖ ${f}.`);
  console.error('      → el sistema son TRES familias con papeles distintos: Onest (interfaz),');
  console.error('        Bricolage Grotesque (titulares y precios), Space Mono (códigos). Se');
  console.error('        piden en el `<link>` de apps/web/app/layout.tsx y se declaran en');
  console.error('        tailwind.config.ts → fontFamily. Una que no carga NO rompe la app:');
  console.error('        cae a system-ui y solo se ve distinta, por eso se comprueba aquí.');
}

for (const d of demoFail) {
  console.error(`\n  ✖ ${d.archivo}: useState arranca con \`${d.constante}\` (datos de ejemplo).`);
  console.error('      → el valor inicial debe ser vacío; que el cargador decida si toca demo.');
}

if (hits.length === 0 && !stripeFail && !envFail && kindsFail.length === 0 && demoFail.length === 0 && efectoFail.length === 0 && colorFail.length === 0 && fuenteFail.length === 0) {
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
