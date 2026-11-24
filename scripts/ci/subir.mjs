#!/usr/bin/env node
/* 22 nov · Revisión del CI (tanda 6a) · La herramienta de subida: del árbol de la rama de trabajo al sandbox sin pasos a mano.
   Medido en la semana: 13 dirigidas lanzadas con partes=1, 4 dobles, 1 con un nombre de prueba que no existía; «verde» de una corrida que no era
   del árbol que se subió; pushes a `pruebas` antes de que `main` construyera la imagen; 102 comprobaciones del sandbox lanzadas a mano.
   Lo que hace (y lo que nunca hace: commits, empujes forzados, tocar la rama de producción):
     --plan [--base origin/main] [--cabeza <commit>] [--mas "a b"]   sin red y sin escribir: las clases de la entrega, la dirigida propuesta con la
                                                                     orden exacta de «gh workflow run», y qué falta para subir.
     --dirigida [--mas "a b"]      lanza la dirigida (SIEMPRE en partes, decisión AM) en la rama de trabajo, espera sondeando y dice por trabajo
                                   verde/rojo/inestable; de un trabajo rojo, sus 30 últimas líneas útiles. No reintenta. No empuja.
     --subir [--ensayo]            a. árbol limpio y al día con origin/main · b. tipos, guardianes y textos sobre ese árbol · c. evidencia del CI
                                   para ESE árbol · d. empuja sin forzar (main primero si hay despliegue) · e. espera a que el sandbox lo sirva.
                                   Con --ensayo hace a–c y dice qué empujaría. Cada comprobación imprime «CORRIÓ: …» o «FALTA: …».
       vía rápida de diseño        23 nov (decisión AL, aprobada por el fundador): si la entrega es SOLO de diseño (clase «diseno»: todo lo que no
                                   es documento de trabajo cae en la lista blanca DISENO, nada en NUNCA_DISENO ni con una palabra de
                                   PALABRAS_NO_DISENO en la ruta, sin clases vigiladas ni señales en sus renglones, y lo dicen las listas de la
                                   cabeza Y las de origin/main), b. tipos, guardianes y textos como siempre, SIN build local (decisión AR, 24 nov:
                                   la app la construye el servidor y, si no construye, el sandbox sigue con lo de antes; el CI de main la vuelve a
                                   construir), c. no se exige, y al final dice dónde corren DESPUÉS la punta a punta y «al revés» (la corrida del push
                                   a main) con la lista de pruebas que la dirigida habría propuesto. No espera esa corrida. No cambia producción
                                   ni la confirmación completa.
       vía rápida de código        24 nov (decisión AV, aprobada por el fundador): el código que no es sensible sube como los ajustes, sin corrida
                                   previa del CI. La gana una entrega cuyos archivos (fuera de los documentos de trabajo) caen todos en la lista blanca
                                   CODIGO (apps/web, packages/ui, lo de DISENO y las pruebas sueltas de pruebas/e2e y pruebas/alreves: la prueba nueva
                                   viaja con su código), ninguno en NUNCA_CODIGO (la base, infra, services, scripts, semgrep, .github, guardianes,
                                   dependencias, .env, el JS que apps/web/public sirve tal cual, .well-known, la configuración de la raíz de apps/web y
                                   de packages/ui) ni en SENSIBLE, DESPLIEGUE o HERRAMIENTAS ni con una palabra de PALABRAS_NO_DISENO en la ruta, sin
                                   señales en sus renglones, y lo dicen las listas de la cabeza Y las de origin/main. Si es de diseño, sigue siendo de
                                   diseño. Exige: main en verde (la última corrida terminada de ci.yml de un push a main; en rojo o sin saberlo, camino
                                   normal: primero se arregla); tipos, guardianes y textos a la vez; y DESPUÉS las pruebas de lo tocado aquí (la misma
                                   selección que la dirigida, al menos una, con tope de 25 pruebas y ~10 min: pruebas/reparto.json › seg, 60 s la que
                                   no está medida, ×1,5 por el servidor de desarrollo, +150 s si corre alguna al revés), con pruebas/correr.mjs
                                   --reintentar contra el servidor de DESARROLLO de este árbol (PRUEBAS_URL; sin ella, :3199; lo levanta la sesión):
                                   antes, ese servidor tiene que ser «next dev» desde apps/web de este árbol (se mira en /proc), su /api/salud ok y su
                                   base con tantas migraciones como trae HEAD; se calientan las rutas que tocan las pruebas; y su línea RESULTADOS
                                   tiene que decir completa:true sin rojas (las inestables se dicen). Más que el tope, o ninguna prueba, = camino
                                   normal, y se dice por qué. La punta a punta entera y «al revés» corren DESPUÉS, en la corrida del push a main.
                                   Con main en rojo, diseño sigue subiendo (AN), pero toda subida lo avisa.
     --subir --sin-via-rapida      fuerza el camino normal (con evidencia del CI) aunque la entrega sea de diseño o de código.
       al final                    24 nov · imprime la orden exacta para vigilar la corrida de main de lo subido («vigila la corrida de main: node
                                   scripts/ci/subir.mjs --vigilar <sha>»); no la espera.
     --vigilar [<sha>]             espera la corrida de ci.yml del push a main de ese commit (sin sha, el de origin/main), sondeando como --dirigida,
                                   y dice verde o rojo; en rojo, por cada trabajo rojo, sus líneas ✗ y FALLÓ. Sale 0 en verde y 1 si no.
     --local [--base origin/main] [--mas "a b"]
                                   las pruebas de lo tocado aquí, como las correría la vía rápida de código, sin subir ni lanzar nada.
     --dirigida/--repaso --sin-local
                                   24 nov (AV) · antes de lanzar nada en GitHub, la parte DIRECTA de la selección corre aquí (en el repaso, primero las
                                   rojas de R1; luego las cambiadas y las que nombran un archivo cambiado de apps/ o packages/; luego las más cortas;
                                   lo que no cabe en el tope queda solo para el CI y se dice). Con una roja aquí no se lanza. --sin-local lo salta, y
                                   lo dice: «SALTADO: pruebas locales (--sin-local)».
     --repaso <id> [--mas "a b"] [--ensayo]
                                   24 nov (decisión AU, «repaso corto tras una roja»): tras una dirigida roja R1 (commit A) y con el arreglo en HEAD,
                                   lanza SOLO rojas(R1) ∪ inestables(R1) ∪ rojas e inestables de las corridas no verdes posteriores a R1 en la rama
                                   ∪ dirigida(diff A..HEAD) ∪ --mas ∪ las de punta a punta de la propuesta de la entrega que no salieron en verde en
                                   R1, validadas con pruebas/correr.mjs --comprobar, con la MISMA orden que la dirigida (ordenDirigida, en partes) y
                                   esperando igual. R1: ci.yml de este repo, de esta rama, a mano, alcance=regresion con «solo», primer intento,
                                   terminada en rojo SOLO por pruebas con nombre (todo lo que no es «todas las fases» ni «la tubería», en verde; los
                                   trabajos fijos, presentes; anchos, confirmación y dispositivos, saltados), A ancestro de HEAD; cada parte de «todas
                                   las fases» completa (verde o roja) con su línea RESULTADOS (pruebas/correr.mjs con pruebas/lib/resultados.cjs) y
                                   completa:true; al menos una roja con nombre. Entre A y HEAD tiene que haber arreglo (más que documentos de trabajo:
                                   una roja dos veces es roja, AG) y nada de HERRAMIENTAS (.github/ incluido). Cada corrida de la rama posterior a R1
                                   que no terminó en verde A LA PRIMERA (de cualquier evento; una que se volvió a correr hasta el verde también, con
                                   las rojas de su primer intento) tiene que haber terminado y traer RESULTADOS en cada parte que corrió, y si salió
                                   con rojas, su árbol no puede ser ya el de HEAD (sin arreglo después de ella tampoco hay repaso). Una parte cancelada
                                   antes de arrancar cuenta como «corrió sin RESULTADOS». Si no, dice que toca la dirigida entera. Con --ensayo no
                                   lanza.
       evidencia encadenada        --subir acepta, además de una corrida verde que cubra la propuesta, la cadena de UN eslabón R1 (dirigida roja de la
                                   rama, las condiciones de --repaso) + R2 (corrida verde de este árbol con todo lo que se le exige a una corrida:
                                   primer intento, árbol, EVIDENCIA, trabajos fijos, «al revés» entero, tubería y trabajos en verde) tal que R2.solo ⊇
                                   rojas e inestables de R1 y de las corridas no verdes entre R1 y R2 ∪ propuesta(A..HEAD), y verdes(R1) ∪ R2.solo ⊇
                                   propuesta(origin/main..HEAD) (evaluarCadena). Con .github/ en la entrega no vale (corrida COMPLETA). El cableado
                                   (qué corridas, qué commit, qué propuesta) vive en buscarEvidencia y prepararRepaso con la API y git inyectados
                                   (ioReal), y los casos lo prueban entero. No cambia producción: corrida.mjs y promover.sh siguen exigiendo la
                                   corrida entera.
     toda evidencia                24 nov (revisión de bc9a893): solo vale el PRIMER intento de una corrida (y su línea EVIDENCIA): volver a correr a
                                   mano lo que falló es otro reintento, contra AG. Y los trabajos fijos (alcance, la verificación, tipos · build ·
                                   guardianes, seguridad, web) tienen que estar y en verde, ni saltados ni ausentes.
     --casos                       los casos puros (sin red, sin tocar el repo); los corre el guardián subidaConHerramienta.
   Las clases solo SUMAN exigencias, nunca certifican: «sensible» es mejor esfuerzo (rutas + señales en los renglones cambiados) y lo que no
   caza sube como normal. La garantía que no depende de la clase es tipos + guardianes siempre y la evidencia del CI del mismo árbol.
   Juzga con sus listas y con las de origin/main (si allí existe esta herramienta) y manda lo más estricto (la unión). Las clases que aflojan,
   «diseno» y «codigo», exigen que las dos la den: sin la herramienta de main, con una de main sin esa vía rápida o con un error, no la hay.
   La evidencia es la línea «EVIDENCIA {json}» que imprime el trabajo final de ci.yml («la tubería») solo si todo lo pedido dio verde; la línea
   sola no vale: la conclusión de la corrida y de ese trabajo se leen de la API (como scripts/ci/corrida.mjs). Guardián subidaConHerramienta;
   al revés: alrevesSubir. */
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DOCUMENTOS, veredicto } from "./alcance.mjs";
import { carrilCompleto, trabajosCompletos } from "./corrida.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const REPO = "devpayxer/tolatino";
// Decisión AM: una dirigida va SIEMPRE en partes (las de una parte tardaban 86–128 min). Guardián subidaConHerramienta.
export const PARTES_DIRIGIDA = 4;
export const SONDEO_MS = 25_000;
const DOC = new Set(DOCUMENTOS);
const SHA40 = /^[0-9a-f]{40}$/;
const NOMBRE_PRUEBA = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const no = (motivo) => ({ ok: false, motivo });
const nombreJ = (j) => String(j?.name ?? "");
const verde = (j) => j?.status === "completed" && j?.conclusion === "success";

/* ── Las listas ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
export const HERRAMIENTAS = Object.freeze([/^\.github\//, /^scripts\/ci\//, /^pruebas\/correr\.mjs$/, /^pruebas\/lib\//, /^guardianes\//, /^pruebas\/reparto\.json$/]);
// Lo que leen de verdad infra/pruebas/deploy.sh (sus «$REPO/…», migrar.sh, los demos, los servicios que compose construye) y el trabajo
// «imagenes» de ci.yml (las dos imágenes con su contexto y su .dockerignore, y pruebas/infra/correr.sh). El guardián subidaConHerramienta saca esas
// rutas del repo y exige que cada una caiga aquí.
export const DESPLIEGUE = Object.freeze([
  /^infra\//, /^packages\/db\/migrar\.sh$/, /^\.dockerignore$/, /(^|\/)Dockerfile[^/]*$/, /(^|\/)docker-compose[^/]*$/, /(^|\/)nginx[^/]*$/,
  /^services\/[^/]+\//, /^scripts\/semilla\/demos\//, /^pruebas\/infra\//,
]);
export const SENSIBLE = Object.freeze([
  /^packages\/db\//, /^infra\//, /^scripts\/(produccion|sandbox|semilla|datos)\//, /^services\//, /^semgrep\//,
  /^apps\/web\/(middleware|next\.config|instrumentation[^/]*)\.ts$/, /^apps\/web\/app\/api\//,
  /^apps\/web\/lib\/(pagos|datos|equipo|llaves|sms|canales|pases|push|tiendas|sistema|correo)\//,
  // Lo de pagos, cobro, cuenta, equipo, llaves, tarjeta, cifrado, admin y panel, en cualquier carpeta o nombre de archivo de apps/.
  /^apps\/.*(^|\/|-)(pagos?|pagar|cobros?|cobro-fuera|cuentas?|equipo|llaves?|tarjetas?|cifrado|admin|panel)([./-]|$)/,
  // La propia herramienta y sus listas.
  /^scripts\/ci\/(subir|alcance|corrida)\.mjs$/,
]);
export const SENALES = Object.freeze([
  [/(["'])use server\1/, "«use server»"],
  [/\b(insert\s+into|update\s+[\w."]+\s+set|delete\s+from|upsert)\b|\.(insert|update|delete|upsert)\s*\(/i, "una escritura (insert/update/delete)"],
  [/\b(grant|revoke)\b|security\s+definer|row\s+level\s+security/i, "permisos de la base (grant/revoke)"],
  [/centavos|\bcents\b|_cents\b/i, "centavos"],
]);
export const AL_REVES_ENTERO = Object.freeze([/^guardianes\/run\.mjs$/, /^pruebas\/correr\.mjs$/, /^pruebas\/lib\//]);
const casa = (lista, f) => lista.some((re) => re.test(f));
export const esDespliegue = (f) => casa(DESPLIEGUE, f);

/* 23 nov · La vía rápida de diseño (decisión AL). Una entrega es «solo diseño» cuando TODOS sus archivos que no son documentos de trabajo caen en
   la lista blanca DISENO, ninguno cae en NUNCA_DISENO ni lleva en su ruta una palabra de PALABRAS_NO_DISENO, la entrega no tiene ninguna clase
   vigilada (herramientas, despliegue, sensible, con sus señales) y ningún renglón cambiado de esos archivos trae una SENAL_DISENO. Cualquier duda
   (un archivo de código sin sus renglones, la herramienta de origin/main que no la da por diseño o no responde) = no es diseño. Guardián
   subidaConHerramienta. Por qué cada pieza:
   - packages/ui/src: las piezas del sistema de diseño (no leen datos ni hablan con el servidor).
   - apps/web/app: solo componentes .tsx y estilos .css; NO page/layout/route ni ningún otro archivo especial de Next (page y layout leen datos y
     deciden quién entra; AL deja pasar «los datos de lectura que esa pantalla pinta», pero esa lectura vive en page.tsx y en lib/, que quedan
     fuera: lo más estrecho), NO acciones*, NO nada bajo app/api/ y NO un .ts (local.ts, yo.ts… son lógica).
   - apps/web/public/paginas: las fotos de categoría (.webp con su huella).
   - docs/ayuda (El Compa), docs/LAUNCH-CHECKLIST.md (lo que queda pendiente) y pruebas/visual/**.png (las capturas de referencia). */
export const DISENO = Object.freeze([
  /^packages\/ui\/src\/.*\.(tsx|ts|js|css|svg)$/,
  /^apps\/web\/app\/(?!api\/).*\.(tsx|css)$/,
  /^apps\/web\/public\/paginas\/[^/]+\.webp$/,
  // El catálogo GENERADO de las cadenas ES/EN de las pantallas (scripts/cms/extraer.mjs): cambia con cualquier texto nuevo y el guardián cadenaConLlave exige que sea el que sale del código.
  /^apps\/web\/lib\/cms-cadenas-e2\.json$/,
  /^docs\/ayuda\/.*\.md$/,
  /^docs\/LAUNCH-CHECKLIST\.md$/,
  /^pruebas\/visual\/.*\.png$/,
]);
// Lo que nunca es diseño aunque la lista blanca lo cubriera (cinturón y tirantes: el guardián prueba las dos).
export const NUNCA_DISENO = Object.freeze([
  /^apps\/web\/lib\/(?!cms-cadenas-e2\.json$)/, /^apps\/web\/app\/api\//, /(^|\/)(acciones[^/]*|route)\.[jt]sx?$/,
  /(^|\/)(page|layout|template|default|loading|error|global-error|not-found|forbidden|unauthorized|opengraph-image|twitter-image|icon|apple-icon|sitemap|robots|manifest)\.[jt]sx?$/,
  /(^|\/)(middleware|instrumentation[^/]*|next\.config)\.[mc]?[jt]s$/,
  /^packages\/db\//, /(^|\/)migraciones?\//, /\.sql$/, /^scripts\//, /^infra\//, /^\.github\//, /^guardianes\//, /^services\//, /^semgrep\//,
  /^pruebas\/(?!visual\/)/,
]);
// Una ruta con estas palabras (en cualquier carpeta o nombre, sin importar mayúsculas ni camelCase) toca dinero, cuenta, permisos o datos personales.
export const PALABRAS_NO_DISENO = Object.freeze([
  "pago", "pagos", "pagar", "cobro", "cobros", "cuenta", "cuentas", "equipo", "llave", "llaves", "tarjeta", "tarjetas", "cifrado", "admin", "panel",
  "pay", "payment", "payments", "checkout", "billing", "wallet", "account", "staff", "auth", "login", "sesion", "permiso", "permisos", "rol", "roles",
  "seguridad", "legal", "privado", "privacidad", "exportar", "sistema", "entrar", "acceso", "recuperar", "password", "contrasena", "verificar", "dinero",
]);
const PALABRAS_NO = new Set(PALABRAS_NO_DISENO);
const palabrasDe = (f) => String(f).replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9ñ]+/).filter(Boolean);
// Renglones que sacan un archivo de la lista blanca: algo que ya no es solo «cómo se ve» (leer o escribir datos, cambiar quién entra, red, secretos).
export const SENALES_DISENO = Object.freeze([
  [/(["'])use (server|client)\1/, "«use server/use client»"],
  [/["'`][^"'`]*(@\/lib\/|\/lib\/|acciones|next\/headers|next\/server|server-only|@tolatino\/(?!ui\b))[^"'`]*["'`]/, "un import de lib/, acciones, la base o el servidor"],
  [/\bawait\b|\bfetch\s*\(|XMLHttpRequest|sendBeacon|new\s+(WebSocket|EventSource)\b/, "una espera o una llamada de red (await/fetch)"],
  [/\b(cookies|headers|redirect|permanentRedirect|notFound|unauthorized|forbidden)\s*\(|document\.cookie|localStorage|sessionStorage/, "cookies, cabeceras, redirecciones o almacenamiento del navegador"],
  [/\bprocess\.env\b|dangerouslySetInnerHTML|\beval\s*\(|new\s+Function\b|<script\b|next\/script/, "secretos, HTML crudo o guiones"],
  [/\bformAction\b|\baction=\{/, "un formulario conectado a una acción"],
  [/\bsql\s*`|\btx\s*\(/, "una consulta a la base"],
  [/@import\b|url\(\s*["']?(https?:)?\/\//, "un recurso de fuera (estilos o fuentes de otro sitio)"],
]);
const SIN_RENGLONES = /\.(png|webp|md)$/;
/** Por qué un archivo NO es de diseño ("" si lo es). */
export function porQueNoDiseno(f) {
  if (typeof f !== "string" || !f) return "un nombre de archivo vacío";
  if (casa(NUNCA_DISENO, f)) return `${f} nunca es de diseño (lib/, api/, route, acciones, page/layout, migraciones, scripts, infra, .github, guardianes o pruebas)`;
  if (!casa(DISENO, f)) return `${f} no está en la lista blanca de diseño`;
  const p = palabrasDe(f).find((x) => PALABRAS_NO.has(x));
  if (p) return `${f} lleva «${p}» en la ruta (dinero, cuenta, permisos o datos personales)`;
  return "";
}
export const esDiseno = (f) => porQueNoDiseno(f) === "";
const VIGILADAS = Object.freeze(["herramientas", "despliegue", "sensible"]);

/* 24 nov · La vía rápida de código (decisión AV, aprobada por el fundador): el código que no toca dinero, permisos, datos personales, migraciones,
   el despliegue ni el CI sube como los ajustes (sin corrida previa del CI) con tipos + guardianes + textos Y las pruebas de lo tocado corridas
   aquí, contra el servidor de desarrollo de este árbol, con un tope. Una entrega la gana cuando TODOS sus archivos que no son documentos de
   trabajo caen en la lista blanca CODIGO, ninguno en NUNCA_CODIGO (ni en SENSIBLE, DESPLIEGUE o HERRAMIENTAS) ni lleva una palabra de
   PALABRAS_NO_DISENO en la ruta, la entrega no tiene ninguna clase vigilada (las señales de los renglones ya la hacen «sensible»), se pudieron
   leer los renglones de cada archivo de código, y lo dicen las listas de la cabeza Y las de origin/main (si la de main no conoce «codigo», no
   hay vía rápida de código). Si además es «diseno», sigue siendo «diseno» (sin pruebas locales). Cualquier duda = camino normal. Por qué cada
   pieza:
   - apps/web y packages/ui: la app y sus piezas; lo sensible de ahí ya lo sacan SENSIBLE, las señales de los renglones y las palabras de la ruta
     (más estricto que la letra de AV: «cuenta», «sesion», «permiso», «verificar»… también sacan una ruta de código).
   - pruebas/e2e/*.cjs|mjs y pruebas/alreves/*.cjs sueltas: la prueba nueva viaja con su código (pruebas/lib, el corredor y el reparto no: son
     HERRAMIENTAS).
   - Nunca: la base, infra, services, scripts, semgrep, .github y guardianes; las dependencias (package.json, pnpm-lock.yaml, pnpm-workspace.yaml,
     .npmrc: la cadena de suministro); los .env*; lo que el navegador ejecuta tal cual desde apps/web/public (cualquier .js/.mjs/.cjs: los
     service workers) y .well-known (los enlaces de las apps); y la configuración de la raíz de apps/web y de packages/ui (tsconfig, postcss,
     next.config, middleware, instrumentation…). Guardián subidaConHerramienta (sección 9); al revés: alrevesSubir. */
export const CODIGO = Object.freeze([/^apps\/web\//, /^packages\/ui\//, /^pruebas\/e2e\/[^/]+\.(cjs|mjs)$/, /^pruebas\/alreves\/[^/]+\.cjs$/, ...DISENO]);
export const NUNCA_CODIGO = Object.freeze([
  /^\.github\//, /^packages\/db\//, /^infra\//, /^services\//, /^scripts\//, /^semgrep\//, /^guardianes\//,
  /(^|\/)(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|\.npmrc)$/, /(^|\/)\.env[^/]*$/,
  /^apps\/web\/public\/.*\.[cm]?js$/, /^apps\/web\/public\/\.well-known\//,
  /^(apps\/web|packages\/ui)\/[^/]+$/,
  /^pruebas\/(?!(e2e\/[^/]+\.(cjs|mjs)|alreves\/[^/]+\.cjs|visual\/.*\.png)$)/,
]);
/** Por qué un archivo NO es de la vía rápida de código ("" si lo es). */
export function porQueNoCodigo(f) {
  if (typeof f !== "string" || !f) return "un nombre de archivo vacío";
  if (casa(NUNCA_CODIGO, f)) return `${f} nunca es de la vía rápida de código (la base, infra, services, scripts, semgrep, .github, guardianes, dependencias, .env, el JS que se sirve tal cual o la configuración de la app)`;
  for (const [k, re] of [["herramientas", HERRAMIENTAS], ["despliegue", DESPLIEGUE], ["sensible", SENSIBLE]]) if (casa(re, f)) return `${f} es «${k}»`;
  if (!casa(CODIGO, f)) return `${f} no está en la lista blanca de código`;
  const p = palabrasDe(f).find((x) => PALABRAS_NO.has(x));
  if (p) return `${f} lleva «${p}» en la ruta (dinero, cuenta, permisos o datos personales)`;
  return "";
}
export const esCodigo = (f) => porQueNoCodigo(f) === "";

/** Las clases de una entrega (solo suman). renglones: { archivo: [renglones añadidos o quitados] }. */
export function clases(archivos, renglones = {}) {
  const cl = new Set(), motivos = [];
  const lista = Array.isArray(archivos) ? archivos.filter((f) => typeof f === "string" && f) : [];
  const soloDocumentos = veredicto(lista) === "documentos";
  const docs = lista.filter((f) => DOC.has(f));
  if (docs.length) { cl.add("documentos"); motivos.push(`documentos: ${docs.join(", ")}`); }
  const de = (nombre, re) => { const fs = lista.filter((f) => casa(re, f)); if (fs.length) { cl.add(nombre); motivos.push(`${nombre}: ${fs.slice(0, 6).join(", ")}${fs.length > 6 ? ` (+${fs.length - 6})` : ""}`); } };
  de("herramientas", HERRAMIENTAS);
  de("despliegue", DESPLIEGUE);
  de("sensible", SENSIBLE);
  for (const [f, ls] of Object.entries(renglones ?? {})) {
    // Las señales miran el código del producto y de la máquina: no los documentos, ni las pruebas ni los guardianes (que escriben SQL a propósito).
    if (DOC.has(f) || /\.md$/.test(f) || /^(pruebas|guardianes|docs)\//.test(f) || !Array.isArray(ls)) continue;
    for (const [re, que] of SENALES) {
      const l = ls.find((x) => re.test(String(x)));
      if (l !== undefined) { cl.add("sensible"); motivos.push(`sensible por señal: ${que} en ${f} («${String(l).trim().slice(0, 80)}»)`); break; }
    }
  }
  const otros = lista.filter((f) => !DOC.has(f)).length;
  const github = lista.some((f) => f.startsWith(".github/"));
  const alrevesEntero = lista.some((f) => casa(AL_REVES_ENTERO, f));
  // La vía rápida de diseño (AL): el primer motivo que la saca basta, con su archivo.
  let noDiseno = "";
  const codigo = lista.filter((f) => !DOC.has(f));
  if (!codigo.length) noDiseno = soloDocumentos ? "solo documentos de trabajo (van por su propio camino)" : "no hay archivos";
  for (const f of codigo) { if (noDiseno) break; noDiseno = porQueNoDiseno(f); }
  if (!noDiseno) { const v = VIGILADAS.find((k) => cl.has(k)); if (v) noDiseno = `la entrega es «${v}» (${motivos.find((m) => m.startsWith(v) || m.startsWith(`${v} por señal`)) ?? v})`; }
  if (!noDiseno && github) noDiseno = "toca .github/";
  for (const f of codigo) {
    if (noDiseno) break;
    if (SIN_RENGLONES.test(f)) continue;
    const ls = renglones?.[f];
    if (!Array.isArray(ls)) { noDiseno = `sin los renglones cambiados de ${f}: no se puede mirar`; break; }
    for (const [re, que] of SENALES_DISENO) {
      const l = ls.find((x) => re.test(String(x)));
      if (l !== undefined) { noDiseno = `señal: ${que} en ${f} («${String(l).trim().slice(0, 80)}»)`; break; }
    }
  }
  const diseno = !noDiseno;
  if (diseno) { cl.add("diseno"); motivos.push(`diseno: ${codigo.slice(0, 6).join(", ")}${codigo.length > 6 ? ` (+${codigo.length - 6})` : ""}`); }
  // La vía rápida de código (AV): su lista blanca, las mismas dudas que diseño (cada archivo de código con sus renglones) y sin mirar SENALES_DISENO
  // (el código puede leer datos, esperar y llamar a la red); las SENALES ya la hicieron «sensible» arriba.
  let noCodigo = "";
  if (!codigo.length) noCodigo = soloDocumentos ? "solo documentos de trabajo (van por su propio camino)" : "no hay archivos";
  for (const f of codigo) { if (noCodigo) break; noCodigo = porQueNoCodigo(f); }
  if (!noCodigo) { const v = VIGILADAS.find((k) => cl.has(k)); if (v) noCodigo = `la entrega es «${v}» (${motivos.find((m) => m.startsWith(v) || m.startsWith(`${v} por señal`)) ?? v})`; }
  if (!noCodigo && github) noCodigo = "toca .github/";
  for (const f of codigo) { if (noCodigo) break; if (!SIN_RENGLONES.test(f) && !Array.isArray(renglones?.[f])) noCodigo = `sin los renglones cambiados de ${f}: no se puede mirar`; }
  const deCodigo = !noCodigo;
  if (deCodigo && !diseno) { cl.add("codigo"); motivos.push(`codigo: ${codigo.slice(0, 6).join(", ")}${codigo.length > 6 ? ` (+${codigo.length - 6})` : ""}`); }
  return { clases: [...cl].sort(), soloDocumentos, otros, github, alrevesEntero, motivos, diseno, noDiseno, codigo: deCodigo, noCodigo };
}

/** Las clases de la cabeza (c) juzgadas también con las de origin/main (c2; null si no se pudo): manda lo más estricto. Las vigiladas se suman;
    las que AFLOJAN, «diseno» y «codigo» (AV), solo quedan si las dos la dan y la unión no tiene ninguna vigilada. Si las dos dan diseño, diseño
    (sin pruebas locales); si no, código si las dos lo dan. */
export function combinar(c, c2, sinMain = "no pude juzgarla con las listas de origin/main") {
  const union = [...new Set([...(c?.clases ?? []), ...(c2?.clases ?? [])])].filter((k) => k !== "diseno" && k !== "codigo");
  let noDiseno = "";
  if (!c?.diseno) noDiseno = c?.noDiseno || "la cabeza no la da por diseño";
  else if (!c2) noDiseno = `${sinMain} (cualquier duda = no es diseño)`;
  else if (c2.diseno === undefined) noDiseno = "la herramienta de origin/main todavía no tiene la vía rápida de diseño: manda lo más estricto (camino normal)";
  else if (!c2.diseno) noDiseno = `con las listas de origin/main no es diseño: ${c2.noDiseno || "sin motivo"}`;
  else if (union.some((k) => VIGILADAS.includes(k)) || c.github || c2.github) noDiseno = `la entrega es «${union.find((k) => VIGILADAS.includes(k)) ?? "herramientas"}» con alguna de las dos listas`;
  const diseno = !noDiseno;
  let noCodigo = "";
  if (!c?.codigo) noCodigo = c?.noCodigo || "la cabeza no la da por código";
  else if (!c2) noCodigo = `${sinMain} (cualquier duda = camino normal)`;
  else if (c2.codigo === undefined) noCodigo = "la herramienta de origin/main todavía no tiene la vía rápida de código: manda lo más estricto (camino normal)";
  else if (!c2.codigo) noCodigo = `con las listas de origin/main no es código de la vía rápida: ${c2.noCodigo || "sin motivo"}`;
  else if (union.some((k) => VIGILADAS.includes(k)) || c.github || c2.github) noCodigo = `la entrega es «${union.find((k) => VIGILADAS.includes(k)) ?? "herramientas"}» con alguna de las dos listas`;
  const codigo = !noCodigo;
  return { ...c, clases: (diseno ? [...union, "diseno"] : codigo ? [...union, "codigo"] : union).sort(), soloDocumentos: !!(c?.soloDocumentos && (c2 ? c2.soloDocumentos : true)), github: !!(c?.github || c2?.github),
    alrevesEntero: !!(c?.alrevesEntero || c2?.alrevesEntero), motivos: [...new Set([...(c?.motivos ?? []), ...(c2?.motivos ?? [])])].filter((m) => (diseno || !m.startsWith("diseno:")) && ((codigo && !diseno) || !m.startsWith("codigo:"))),
    diseno, noDiseno, disenoCabeza: !!c?.diseno, codigo, noCodigo, codigoCabeza: !!c?.codigo };
}

/** Lo que exige una entrega según sus clases. sinViaRapida (--sin-via-rapida) fuerza el camino normal aunque sea de diseño o de código.
    main: el estado de main (estadoDeMain; null = sin mirar, como en --plan). local: la cuenta de las pruebas de lo tocado (estimarLocal). */
export function exigencias(c, { sinViaRapida = false, main = null, local = null } = {}) {
  if (c.soloDocumentos) return { locales: ["guardianes"], corrida: "ninguna", mainPrimero: false };
  // Vía rápida de diseño (AL): sin corrida previa; tipos, guardianes y textos aquí. Sin build local (decisión AR, 24 nov): la app se construía tres
  // veces (aquí 171 s, en el servidor y en el CI de main); la del servidor es la compuerta (deploy.sh sale ANTES de recrear si la imagen no se
  // construye: el sandbox sigue con lo de antes) y la del CI la vuelve a mirar. Las pruebas de punta a punta y al revés corren DESPUÉS, en la
  // corrida del push a main. Nunca con una clase vigilada ni con .github/ (se vuelve a mirar aquí). Con main en rojo, diseño sigue (AN): se avisa.
  if (c.diseno === true && !sinViaRapida && !c.github && !c.clases.some((k) => VIGILADAS.includes(k)) && c.clases.includes("diseno"))
    return { locales: ["tipos", "guardianes", "textos"], corrida: "despues", mainPrimero: false };
  // Vía rápida de código (AV): lo mismo que diseño Y las pruebas de lo tocado aquí, antes de empujar. Nunca con main en rojo (ni sin saberlo),
  // nunca por encima del tope, nunca sin ninguna prueba de lo tocado. Si no, camino normal y se dice por qué (noRapida).
  let noRapida = "";
  if (c.codigo === true && !c.github && !c.clases.some((k) => VIGILADAS.includes(k)) && c.clases.includes("codigo")) {
    noRapida = sinViaRapida ? "--sin-via-rapida fuerza el camino normal" : frenoDeCodigo({ main, local });
    if (!noRapida) return { locales: ["tipos", "guardianes", "textos"], corrida: "despues", mainPrimero: false, pruebasAqui: true };
  }
  return { locales: ["tipos", "guardianes", "textos"], corrida: c.github ? "completa" : "dirigida", mainPrimero: c.clases.includes("despliegue"), ...(noRapida ? { noRapida } : {}) };
}

/** Por qué una entrega de código NO sale por la vía rápida aunque su clase lo permita ("" si sale): main que no está en verde (rojo, o sin saber:
    cualquier duda = camino normal), o las pruebas de lo tocado sin contar, ninguna, o más que el tope. */
export function frenoDeCodigo({ main, local }) {
  if (main?.estado !== "verde") return main?.estado === "rojo" ? `${main.motivo}: primero se arregla; esto va por el camino normal (AV)` : `no sé si main está en verde (${main?.motivo ?? "sin mirar"}): cualquier duda = camino normal (AV)`;
  if (!local) return "sin la cuenta de las pruebas de lo tocado: cualquier duda = camino normal";
  if (!local.ok) return `${local.motivo}: camino normal`;
  return "";
}

/** El estado de main: la última corrida TERMINADA de ci.yml de un push a main (la API la da primero; aquí se ordena igual por si acaso). «verde»
    solo con success; «rojo» con failure; cualquier otra cosa (cancelada, fuera de tiempo, ninguna, la API sin responder) es «duda». */
export function estadoDeMain(corridas, repo = REPO) {
  const r = (Array.isArray(corridas) ? [...corridas] : []).sort((a, b) => Number(b?.id) - Number(a?.id))
    .find((x) => x && x.path === ".github/workflows/ci.yml" && x.event === "push" && x.head_branch === "main" && x.status === "completed" && x.repository?.full_name === repo);
  if (!r) return { estado: "duda", motivo: "no encuentro una corrida terminada de ci.yml de un push a main" };
  if (r.conclusion === "success") return { estado: "verde", id: r.id, sha: r.head_sha };
  if (r.conclusion === "failure") return { estado: "rojo", id: r.id, sha: r.head_sha, motivo: `main está en rojo (corrida ${r.id})` };
  return { estado: "duda", id: r.id, sha: r.head_sha, motivo: `la última corrida terminada de main (${r.id}) terminó ${r.conclusion}` };
}

/* Las pruebas de lo tocado, aquí (AV): el tope. Con pruebas/reparto.json › seg (lo medido en el CI), una prueba sin medir cuenta 60 s, todo por
   1,5 (el servidor de desarrollo compila al primer pedido) y, si corre alguna al revés, las dos pasadas reales de guardianes de su carril (~150 s). */
export const TOPE_LOCAL = Object.freeze({ pruebas: 25, seg: 600, sinMedir: 60, factor: 1.5, carrilAlReves: 150 });
const segDe = (t, seg, tope) => Math.round((Number.isFinite(seg?.[t.nombre]) ? seg[t.nombre] : tope.sinMedir) * tope.factor);

/** ¿Las pruebas de lo tocado (la misma selección que la dirigida) caben en el tope? → { ok, motivo, n, seg, lista: [{ nombre, carril, por, s }] }.
    Sin ninguna, no (una entrega de código sin ninguna prueba de lo tocado va por el camino normal: cualquier duda). */
export function estimarLocal(pruebas, seg = {}, tope = TOPE_LOCAL) {
  const lista = (pruebas ?? []).map((t) => ({ nombre: t.nombre, carril: t.carril, por: t.por ?? [], s: segDe(t, seg, tope) }));
  const total = lista.reduce((a, t) => a + t.s, 0) + (lista.some((t) => t.carril === "alreves") ? tope.carrilAlReves : 0);
  let motivo = "";
  if (!lista.length) motivo = "ninguna prueba nombra lo tocado: no hay pruebas de lo tocado que correr aquí (la prueba nueva puede viajar con su código)";
  else if (lista.length > tope.pruebas || total > tope.seg) motivo = `${lista.length} prueba(s), ~${Math.ceil(total / 60)} min: más que el tope (${tope.pruebas} pruebas y ${tope.seg / 60} min en el servidor de desarrollo)`;
  return { ok: !motivo, motivo, n: lista.length, seg: total, lista };
}

/** Antes de --dirigida y --repaso: lo que se corre aquí, dentro del tope. Primero las de «primero» (las rojas de R1), luego las cambiadas, luego las
    más cortas; las que no caben quedan solo para el CI. → { correr, soloCI, seg }. */
export function recortarLocal(pruebas, seg = {}, { primero = [] } = {}, tope = TOPE_LOCAL) {
  const rango = (t) => (primero.includes(t.nombre) ? 0 : (t.por ?? []).includes("cambiada") ? 1 : 2);
  const orden = estimarLocal(pruebas, seg, tope).lista.map((t, i) => ({ ...t, i })).sort((a, b) => rango(a) - rango(b) || (rango(a) === 2 ? a.s - b.s : 0) || a.i - b.i);
  const correr = [], soloCI = [];
  let total = 0, conAlReves = false;
  for (const t of orden) {
    const mas = t.s + (t.carril === "alreves" && !conAlReves ? tope.carrilAlReves : 0);
    if (correr.length < tope.pruebas && total + mas <= tope.seg) { correr.push(t); total += mas; conAlReves ||= t.carril === "alreves"; }
    else soloCI.push(t);
  }
  return { correr, soloCI, seg: total };
}

/** La parte DIRECTA de la selección (antes de --dirigida y --repaso): las de «primero» (las rojas de R1, en el repaso), las pruebas cambiadas y las
    que nombran un archivo cambiado de apps/ o packages/. No el abanico que traen pruebas/lib, el corredor o los guardianes. */
export function seleccionDirecta({ archivos = [], catalogo = [], buscar = () => [], primero = [] }) {
  const porNombre = new Map(catalogo.map((t) => [t.nombre, t])), porArchivo = new Map(catalogo.map((t) => [t.archivo, t])), sel = new Map();
  const pon = (t, por) => { if (!sel.has(t.nombre)) sel.set(t.nombre, { ...t, por: [] }); if (!sel.get(t.nombre).por.includes(por)) sel.get(t.nombre).por.push(por); };
  for (const n of primero) { const t = porNombre.get(n); if (t) pon(t, "roja en R1"); }
  for (const f of archivos) { const t = porArchivo.get(f); if (t) pon(t, "cambiada"); }
  for (const f of archivos.filter((x) => /^(apps|packages)\//.test(x))) {
    let rutas = [];
    try { rutas = buscar(agujaDe(f)) ?? []; } catch { rutas = []; }
    for (const r of rutas) { const t = porArchivo.get(r); if (t) pon(t, `nombra ${agujaDe(f)}`); }
  }
  return [...sel.values()];
}

/** ¿El servidor de las pruebas locales sirve ESTE árbol? Lo que escucha en su puerto (proc: { ok, pid, cwd, nodeEnv }) tiene que ser el servidor de
    DESARROLLO (next dev: compila lo que hay en el disco) y su carpeta, apps/web de este árbol. Un build (servir.sh, :3100) puede ser de otro árbol. */
export function evaluarServidor({ url, proc, raiz }) {
  if (!proc?.ok) return no(proc?.motivo ?? "no sé qué proceso lo sirve");
  const app = join(raiz, "apps", "web");
  if (proc.cwd !== app) return no(`${url} lo sirve el proceso ${proc.pid} desde ${proc.cwd || "(no se ve)"}, no este árbol (${app}): levanta «next dev» desde aquí, o pon PRUEBAS_URL en el tuyo`);
  if (proc.nodeEnv !== "development") return no(`${url} no es el servidor de desarrollo (NODE_ENV=${proc.nodeEnv ?? "sin poner"}): un build puede ser de otro árbol; levanta «next dev» desde este árbol`);
  return { ok: true };
}

/** ¿La salud del servidor dice que su base es la de este árbol? ok:true y tantas migraciones aplicadas como trae HEAD. */
export function evaluarSalud(s, migraciones) {
  if (!s || typeof s !== "object") return no("/api/salud no respondió JSON");
  if (s.ok !== true || s.base?.ok !== true) return no(`/api/salud no dice ok (${s.base?.error ?? s.error ?? "ok:false"})`);
  if (!Number.isInteger(migraciones) || migraciones < 1) return no("no sé cuántas migraciones trae HEAD");
  if (s.base?.migraciones !== migraciones) return no(`su base tiene ${s.base?.migraciones} migraciones y HEAD trae ${migraciones}: no es la base de este árbol (aplícalas, o usa la base que corresponde)`);
  return { ok: true };
}
export const contarMigraciones = (rutas) => (rutas ?? []).filter((f) => /^packages\/db\/migrations\/[^/]+\.sql$/.test(f)).length;

/** Las rutas de las páginas de la app (de sus page.tsx): «/buscar», «/n/[id]» (dinámica), sin los grupos «(app)» ni los paralelos «@x». */
export function rutasDeLaApp(archivos) {
  const out = [];
  for (const f of archivos ?? []) {
    const m = /^apps\/web\/app\/(?:(.*)\/)?page\.(tsx|ts|jsx|js)$/.exec(f);
    if (!m) continue;
    const segs = (m[1] ?? "").split("/").filter((x) => x && !/^\(.*\)$/.test(x) && !x.startsWith("@"));
    const re = new RegExp(`^/${segs.map((x) => (/^\[\[?\.\.\./.test(x) ? ".+" : /^\[.+\]$/.test(x) ? "[^/]+" : x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("/")}$`);
    out.push({ ruta: `/${segs.join("/")}`, dinamica: segs.some((x) => /^\[.+\]$/.test(x)), re });
  }
  return out;
}

/** Qué calentar antes de las pruebas locales (el servidor de desarrollo compila al primer pedido): la portada, las páginas cambiadas sin partes
    dinámicas y las rutas que las pruebas escriben (tras una comilla o tras «${B}») que son páginas de la app. Nada de /api (un GET puede hacer algo). */
export function rutasACalentar({ textos = [], paginas = [], cambiados = [], tope = 30 }) {
  const pats = rutasDeLaApp(paginas), out = ["/"];
  for (const p of rutasDeLaApp(cambiados)) if (!p.dinamica) out.push(p.ruta);
  for (const t of textos) {
    for (const m of String(t).matchAll(/(?:['"`]|\$\{B\})(\/[a-z0-9][a-z0-9\-_.~/]*)/gi)) {
      const r = m[1].replace(/\/+$/, "") || "/";
      if (/^\/(api|_next|medios|assets)(\/|$)/.test(r) || /\.[a-z0-9]{2,5}$/i.test(r)) continue;
      if (pats.some((p) => p.re.test(r))) out.push(r);
    }
  }
  return [...new Set(out)].slice(0, tope);
}

/** ¿Las pruebas de lo tocado salieron bien aquí? La línea RESULTADOS de pruebas/correr.mjs: las pedidas, completa:true y ninguna roja. */
export function evaluarLocal({ salida, codigo, nombres }) {
  const x = resultadosDelRegistro(salida);
  if (!x.ok) return no(`pruebas/correr.mjs no dejó su línea RESULTADOS (${x.motivo}): no se sabe qué pasó`);
  const r = x.r, pedidas = new Set(r.pedidas), pedi = new Set(nombres);
  if (pedi.size !== pedidas.size || [...pedi].some((n) => !pedidas.has(n))) return no("la línea RESULTADOS no es de las pruebas pedidas");
  if (r.rojas.length) return no(`en rojo aquí: ${r.rojas.join(" ")}`);
  if (!r.completa) return no(`no todas corrieron hasta su resultado (completa:false)${Array.isArray(r.delCarril) && r.delCarril.length ? `; falló el carril: ${r.delCarril.join(" ")}` : ""}`);
  if (codigo !== 0) return no(`pruebas/correr.mjs salió con ${codigo}`);
  return { ok: true, verdes: r.verdes, inestables: r.inestables };
}

/* ── La dirigida ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
/** El catálogo de pruebas con la regla de pruebas/correr.mjs: pruebas/e2e y pruebas/alreves, primer nivel, .cjs/.mjs/.sh, sin «_» delante. */
export function catalogoDe(rutas) {
  const out = [];
  for (const f of rutas ?? []) {
    const m = /^pruebas\/(e2e|alreves)\/([^/]+)\.(cjs|mjs|sh)$/.exec(f);
    if (!m || m[2].startsWith("_")) continue;
    out.push({ nombre: m[2], archivo: f, carril: m[1] });
  }
  return out;
}

/** La aguja de un archivo para buscarlo en las pruebas: con su carpeta inmediata (para no casar medio repo). */
export const agujaDe = (f) => { const p = String(f).split("/"); return p.length >= 2 ? p.slice(-2).join("/") : p[0]; };

/** La dirigida propuesta: las pruebas cambiadas o nuevas + las que nombran un archivo cambiado + --mas. Nunca resta.
    buscar(aguja) → rutas de pruebas que la contienen. validar(nombres) → { ok, motivo }. */
export function dirigida({ archivos, catalogo, buscar = () => [], mas = [], validar = null }) {
  const porNombre = new Map(catalogo.map((t) => [t.nombre, t])), porArchivo = new Map(catalogo.map((t) => [t.archivo, t]));
  const sel = new Map(), errores = [];
  const pon = (t, por) => { if (!sel.has(t.nombre)) sel.set(t.nombre, { ...t, por: [] }); if (!sel.get(t.nombre).por.includes(por)) sel.get(t.nombre).por.push(por); };
  for (const f of archivos) { const t = porArchivo.get(f); if (t) pon(t, "cambiada"); }
  for (const f of archivos) {
    let rutas = [];
    try { rutas = buscar(agujaDe(f)) ?? []; } catch { rutas = []; }
    // guardianes/run.mjs, pruebas/correr.mjs y pruebas/lib/ los nombran casi todas las suites al revés: con ellos «al revés» va entero (su
    // trabajo, que no mira «solo»), así que de ellos solo se suman las de punta a punta que los nombran.
    const entero = casa(AL_REVES_ENTERO, f);
    for (const r of rutas) { const t = porArchivo.get(r); if (t && t.archivo !== f && !(entero && t.carril === "alreves")) pon(t, `nombra ${agujaDe(f)}`); }
  }
  for (const n of mas) {
    if (!NOMBRE_PRUEBA.test(n)) { errores.push(`«${n}» no es un nombre de prueba`); continue; }
    const t = porNombre.get(n);
    if (!t) { errores.push(`no existe la prueba «${n}»`); continue; }
    pon(t, "--mas");
  }
  const pruebas = [...sel.values()].sort((a, b) => (a.carril === b.carril ? a.nombre.localeCompare(b.nombre) : a.carril === "e2e" ? -1 : 1));
  if (!errores.length && validar && pruebas.length) {
    const v = validar(pruebas.map((t) => t.nombre));
    if (!v?.ok) errores.push(`los nombres no pasan pruebas/correr.mjs --comprobar: ${v?.motivo ?? "sin motivo"}`);
  }
  const alrevesEntero = archivos.some((f) => casa(AL_REVES_ENTERO, f));
  return { pruebas, alrevesEntero, errores };
}

/** La orden de la dirigida (argumentos de gh). Siempre alcance=regresion y partes=PARTES_DIRIGIDA. Sin nombres, no hay orden. */
export function ordenDirigida({ rama, nombres, repo = REPO }) {
  if (!rama || !Array.isArray(nombres) || !nombres.length || nombres.some((n) => !NOMBRE_PRUEBA.test(n))) return null;
  return ["workflow", "run", "ci.yml", "--repo", repo, "--ref", rama, "-f", "alcance=regresion", "-f", `partes=${PARTES_DIRIGIDA}`, "-f", `solo=${nombres.join(" ")}`];
}
const comoTexto = (args) => "gh " + args.map((a) => (/^[\w./=:@-]+$/.test(a) ? a : `'${a.replace(/'/g, "'\\''")}'`)).join(" ");

/* ── La evidencia ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
/** La línea EVIDENCIA del registro de «la tubería» (con o sin la hora que GitHub pone delante). Tiene que haber exactamente una. */
export function evidenciaDelRegistro(texto) {
  const ls = String(texto ?? "").replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.replace(/^\uFEFF?\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z /, ""));
  const hs = ls.filter((l) => l.startsWith("EVIDENCIA "));
  if (!hs.length) return no("el registro de «la tubería» no trae la línea EVIDENCIA (corrida de antes del cambio en ci.yml, o algo no dio verde)");
  if (hs.length > 1) return no(`el registro de «la tubería» trae ${hs.length} líneas EVIDENCIA (tiene que haber una)`);
  let ev;
  try { ev = JSON.parse(hs[0].slice("EVIDENCIA ".length)); } catch { return no("la línea EVIDENCIA no es JSON"); }
  if (!ev || typeof ev !== "object" || !SHA40.test(ev.sha ?? "") || !SHA40.test(ev.arbol ?? "") || !/^\d+$/.test(String(ev.corrida ?? "")) || typeof ev.evento !== "string")
    return no("la línea EVIDENCIA no trae corrida, sha, árbol y evento");
  if (!(ev.solo === "todas" || (Array.isArray(ev.solo) && ev.solo.length && ev.solo.every((n) => typeof n === "string" && NOMBRE_PRUEBA.test(n)))))
    return no("la línea EVIDENCIA no dice qué pruebas pidió («todas» o la lista de «solo»)");
  return { ok: true, ev };
}

/* 24 nov (revisión de bc9a893) · Los trabajos que corren en TODA corrida de ci.yml que no sea un push de solo documentos (los de scripts/ci/corrida.mjs,
   FIJOS, sin la tubería, que se mira aparte): en una evidencia tienen que estar, uno cada uno, y en verde. Saltado o ausente no vale. */
export const FIJOS_EVIDENCIA = Object.freeze([
  ["alcance", /^alcance \(/], ["verificación · señal rápida", /^verificación · señal rápida /], ["verificación · contratos", /^verificación · contratos /],
  ["verificación · imágenes", /^verificación · imágenes /], ["verificación · base real", /^verificación · base real /],
  ["tipos · build · guardianes", /^tipos · build · guardianes$/], ["seguridad", /^seguridad · /], ["web", /^web · /],
]);
/** "" si cada trabajo fijo está, uno, y en verde; si no, por qué. */
export function faltaFijo(trabajos) {
  for (const [que, re] of FIJOS_EVIDENCIA) {
    const k = (trabajos ?? []).filter((j) => re.test(nombreJ(j)));
    if (k.length !== 1 || !verde(k[0])) return `«${que}»: ${k.length} trabajo(s)${k.length === 1 ? `, terminó ${k[0]?.status}/${k[0]?.conclusion}` : ""}; tiene que haber uno, en verde (ni saltado ni ausente)`;
  }
  return "";
}

/** ¿Esta corrida es evidencia para subir el árbol de HEAD? Todo lo que decide sale de la API (corrida y trabajos) y de git; la línea EVIDENCIA
    solo dice el árbol y lo que se pidió, y se cruza con la API. Solo vale el PRIMER intento: volver a correr a mano lo que falló es otro
    reintento, y va contra AG (una prueba se repite una vez, dentro de la corrida). */
export function evaluarCorrida({ run, trabajos, registro, rama, repo = REPO, arbolHead, arbolDeRun, difRunHead, propuesta = [], completa = false }) {
  try {
    if (!run || typeof run !== "object") return no("corrida vacía");
    if (run.path !== ".github/workflows/ci.yml") return no(`flujo ${run.path}`);
    if (run.repository?.full_name !== repo || run.head_repository?.full_name !== repo) return no("de otro repositorio");
    if (!rama || run.head_branch !== rama) return no(`de la rama ${run.head_branch}, no de ${rama}`);
    if (!["workflow_dispatch", "push"].includes(run.event)) return no(`evento ${run.event}`);
    if (run.status !== "completed" || run.conclusion !== "success") return no(`la corrida terminó ${run.status}/${run.conclusion}`);
    if (run.run_attempt !== 1) return no(`es el intento ${run.run_attempt} de la corrida: solo vale el primero (volver a correr lo que falló es otro reintento, AG)`);
    if (!Array.isArray(trabajos) || !trabajos.length) return no("sin trabajos");
    const tub = trabajos.filter((j) => /^la tubería /.test(nombreJ(j)));
    if (tub.length !== 1) return no(`«la tubería»: ${tub.length} trabajo(s); tiene que haber uno`);
    if (!verde(tub[0])) return no(`«la tubería» terminó ${tub[0]?.status}/${tub[0]?.conclusion}: su línea EVIDENCIA no vale`);
    const malo = trabajos.find((j) => !(verde(j) || (j?.status === "completed" && j?.conclusion === "skipped")));
    if (malo) return no(`«${nombreJ(malo).slice(0, 80)}» terminó ${malo?.status}/${malo?.conclusion}`);
    const fijo = faltaFijo(trabajos);
    if (fijo) return no(fijo);
    const e = evidenciaDelRegistro(registro);
    if (!e.ok) return e;
    const ev = e.ev;
    if (Number(ev.intento) !== 1) return no(`la línea EVIDENCIA es del intento ${ev.intento}: solo vale el primero (AG)`);
    if (String(ev.corrida) !== String(run.id)) return no(`la línea EVIDENCIA es de la corrida ${ev.corrida}, no de ${run.id}`);
    if (ev.sha !== run.head_sha) return no("la línea EVIDENCIA es de otro commit que la corrida");
    if (!SHA40.test(arbolDeRun ?? "") || ev.arbol !== arbolDeRun) return no("el árbol de la línea EVIDENCIA no es el del commit de la corrida");
    if (!SHA40.test(arbolHead ?? "")) return no("sin el árbol de lo que se sube");
    if (ev.arbol !== arbolHead && !(Array.isArray(difRunHead) && difRunHead.length && veredicto(difRunHead) === "documentos"))
      return no(`es de otro árbol (difiere en ${Array.isArray(difRunHead) ? difRunHead.slice(0, 4).join(", ") + (difRunHead.length > 4 ? "…" : "") : "?"}; solo valen diferencias de documentos de trabajo)`);
    const al = carrilCompleto(trabajos, "punta a punta · al revés");
    if (!al.ok) return no(`«al revés» no corrió entero: ${al.motivo}`);
    if (completa) {
      const ent = ev.entradas ?? {};
      const entera = ev.evento === "push" || ((ent.alcance ?? "todo") === "todo" && !String(ent.solo ?? "").trim());
      if (!entera || ev.solo !== "todas") return no("la entrega toca .github/: hace falta una corrida COMPLETA (alcance=todo, sin «solo») de ese árbol (decisión AM)");
      const t = trabajosCompletos(trabajos);
      if (!t.ok) return no(`la entrega toca .github/ y la corrida no es completa: ${t.motivo}`);
    }
    const regOk = carrilCompleto(trabajos, "punta a punta · todas las fases").ok || carrilCompleto(trabajos, "confirmación · dos veces seguidas").ok;
    const cubre = (p) => p.carril === "alreves" || (regOk && (ev.solo === "todas" || ev.solo.includes(p.nombre)));
    const faltan = propuesta.filter((p) => !cubre(p));
    if (faltan.length) return no(`no corrió la dirigida propuesta: faltan ${faltan.map((p) => p.nombre).slice(0, 10).join(" ")}${regOk ? "" : " (la punta a punta no corrió entera)"}`);
    return { ok: true, ev };
  } catch (err) {
    return no(`error: ${String(err?.message ?? err).slice(0, 160)}`);
  }
}

/* ── El repaso corto tras una roja (decisión AU, 24 nov) ─────────────────────────────────────────────────────────────────────────────────── */
/* Qué trabajos de ci.yml miran «solo» (comprobado en ci.yml el 24 nov): «punta a punta · todas las fases» (regresion) y «punta a punta · ancho»
   (anchos). «confirmación» y «dispositivo» corren pruebas/correr.mjs con la regresión entera o con disp9b, sin mirar «solo», y en una dirigida
   (alcance=regresion, sin confirmar ni anchos) quedan SALTADOS los tres; si en R1 corrió alguno, R1 no es una dirigida de esta herramienta y no
   hay repaso. Los demás (alcance, la verificación, tipos · build · guardianes, seguridad, web y «al revés», que corre --grupo alreves entero) no
   miran «solo».
   24 nov (revisión de bc9a893, lo más estricto) · R1 tiene que haber fallado SOLO por pruebas con nombre (la letra de AU): todo lo que no es «todas
   las fases» ni «la tubería» terminó en verde en R1 (y anchos, confirmación y dispositivos, saltados). Sin arreglo no hay repaso: entre A y HEAD
   tiene que cambiar algo más que documentos de trabajo (una roja dos veces es roja, AG), y nada de HERRAMIENTAS (.github/, scripts/ci, el corredor,
   pruebas/lib, guardianes, el reparto): con eso, dirigida entera. Cuenta toda corrida de la rama entre R1 y R2 que no terminó en verde (roja,
   cancelada o fuera de tiempo, de cualquier evento): sus rojas e inestables se suman; una que no terminó, o una parte suya que corrió sin su línea
   RESULTADOS, y no hay cadena. */
export const TRABAJO_REGRESION = "punta a punta · todas las fases";
const OTROS_DE_PRUEBAS = /^(punta a punta · ancho|confirmación|dispositivo) /;
const esDeRegresion = (j) => nombreJ(j) === TRABAJO_REGRESION || nombreJ(j).startsWith(`${TRABAJO_REGRESION} · `);
export const esTrabajoDePruebas = (j) => esDeRegresion(j) || OTROS_DE_PRUEBAS.test(nombreJ(j));
const saltado = (j) => j?.status === "completed" && j?.conclusion === "skipped";
const lineasDe = (texto) => String(texto ?? "").replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.replace(/^\uFEFF?\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z /, ""));

/** La línea RESULTADOS que pruebas/correr.mjs imprime al final de cada corrida (con o sin la hora delante). Tiene que haber exactamente una. */
export function resultadosDelRegistro(texto) {
  const hs = lineasDe(texto).filter((l) => l.startsWith("RESULTADOS "));
  if (!hs.length) return no("sin la línea RESULTADOS de pruebas/correr.mjs");
  if (hs.length > 1) return no(`${hs.length} líneas RESULTADOS (tiene que haber una)`);
  let r;
  try { r = JSON.parse(hs[0].slice("RESULTADOS ".length)); } catch { return no("la línea RESULTADOS no es JSON"); }
  const lista = (x) => Array.isArray(x) && x.every((n) => typeof n === "string" && NOMBRE_PRUEBA.test(n));
  if (!r || typeof r !== "object" || !["pedidas", "verdes", "rojas", "inestables"].every((k) => lista(r[k])) || typeof r.completa !== "boolean")
    return no("la línea RESULTADOS no trae pedidas, verdes, rojas, inestables y completa");
  const P = new Set(r.pedidas), V = new Set(r.verdes);
  if (![...r.verdes, ...r.rojas].every((n) => P.has(n)) || r.rojas.some((n) => V.has(n)) || !r.inestables.every((n) => V.has(n)))
    return no("la línea RESULTADOS no es coherente (verdes o rojas fuera de las pedidas, una prueba en las dos, o una inestable que no es verde)");
  if (r.completa && (r.pedidas.some((n) => !V.has(n) && !r.rojas.includes(n)) || (Array.isArray(r.delCarril) && r.delCarril.length)))
    return no("la línea RESULTADOS dice completa y una pedida no tiene resultado (o falló el carril)");
  return { ok: true, r };
}

/** Las entradas de una corrida a mano, del nombre del paso «entradas: …» del trabajo «alcance» (como corridaDeProduccion en corrida.mjs).
    GitHub puede cortar un nombre largo: sin el final («» · aprobar=… · medir=…»), el último nombre de «solo» puede estar a medias y no se usa. */
export function entradasDe(trabajos) {
  const al = (trabajos ?? []).filter((j) => /^alcance \(/.test(nombreJ(j)));
  if (al.length !== 1) return no(`«alcance»: ${al.length} trabajo(s); tiene que haber uno`);
  const es = (al[0].steps ?? []).map((s) => String(s?.name ?? "")).filter((s) => s.startsWith("entradas: "));
  if (es.length !== 1) return no("sin el paso «entradas: …» del trabajo «alcance» (las entradas de la corrida)");
  const m = /^entradas: alcance=(\S+) · solo=«([^»]*)(» · aprobar=\S+ · medir=\S+$)?/.exec(es[0]);
  if (!m) return no(`el paso de las entradas no se entiende (${es[0].slice(0, 120)})`);
  const entera = !!m[3], solo = m[2].split(/\s+/).filter(Boolean);
  return { ok: true, alcance: m[1], solo: entera ? solo : solo.slice(0, -1), entera, vacio: !m[2].trim() };
}

/** Una dirigida ROJA (R1) leída de la API y de los registros de sus trabajos de pruebas (registros: { id del trabajo: texto }). Sale lo que pidió
    (solo = la unión de las pedidas de cada parte), sus verdes, sus rojas y sus inestables; o por qué no vale para un repaso (= dirigida entera). */
export function analizarDirigida({ run, trabajos, registros = {}, rama, repo = REPO }) {
  try {
    if (!run || typeof run !== "object") return no("corrida vacía");
    if (run.path !== ".github/workflows/ci.yml") return no(`flujo ${run.path}`);
    if (run.repository?.full_name !== repo || run.head_repository?.full_name !== repo) return no("de otro repositorio");
    if (!rama || run.head_branch !== rama) return no(`de la rama ${run.head_branch}, no de ${rama}`);
    if (run.event !== "workflow_dispatch") return no(`evento ${run.event} (el repaso es de una dirigida, a mano)`);
    if (run.status !== "completed" || run.conclusion !== "failure") return no(`terminó ${run.status}/${run.conclusion}: el repaso es de una dirigida ROJA`);
    if (run.run_attempt !== 1) return no(`intento ${run.run_attempt} (solo vale el primero)`);
    if (!SHA40.test(run.head_sha ?? "")) return no("sin el commit de la corrida");
    if (!Array.isArray(trabajos) || !trabajos.length) return no("sin trabajos");
    const en = entradasDe(trabajos);
    if (!en.ok) return en;
    if (en.alcance !== "regresion" || en.vacio) return no(`no es una dirigida (alcance=${en.alcance}${en.vacio ? ", sin «solo»" : ""}; una dirigida es alcance=regresion con «solo»)`);
    const otro = trabajos.find((j) => OTROS_DE_PRUEBAS.test(nombreJ(j)) && !saltado(j));
    if (otro) return no(`corrió «${nombreJ(otro).slice(0, 60)}»: en una dirigida solo corren pruebas en «${TRABAJO_REGRESION}» (anchos, confirmación y dispositivos saltados)`);
    const ajeno = trabajos.find((j) => !esDeRegresion(j) && !/^la tubería /.test(nombreJ(j)) && !OTROS_DE_PRUEBAS.test(nombreJ(j)) && !verde(j));
    if (ajeno) return no(`no falló solo por pruebas con nombre: «${nombreJ(ajeno).slice(0, 60)}» terminó ${ajeno?.status}/${ajeno?.conclusion} (todo lo que no es «${TRABAJO_REGRESION}» ni «la tubería» tiene que estar en verde; AU)`);
    const fijo = faltaFijo(trabajos);
    if (fijo) return no(`no falló solo por pruebas con nombre: ${fijo}`);
    const reg = trabajos.filter(esDeRegresion);
    const forma = carrilCompleto(reg.map((j) => ({ ...j, status: "completed", conclusion: "success" })), TRABAJO_REGRESION);
    if (!forma.ok) return no(`los trabajos de pruebas: ${forma.motivo}`);
    const pedidas = new Set(), verdes = new Set(), rojas = new Set(), inestables = new Set();
    for (const j of reg) {
      const n = nombreJ(j).slice(0, 80);
      if (j?.status !== "completed" || !["success", "failure"].includes(j?.conclusion)) return no(`«${n}» terminó ${j?.status}/${j?.conclusion}: un trabajo de pruebas saltado, cancelado o sin terminar`);
      const x = resultadosDelRegistro(registros?.[j.id]);
      if (!x.ok) return no(`«${n}» (${j.conclusion === "failure" ? "rojo" : "verde"}): ${x.motivo}`);
      if (!x.r.completa) return no(`«${n}»: RESULTADOS dice completa:false (no todas sus pruebas corrieron hasta su resultado)`);
      if (j.conclusion === "success" && x.r.rojas.length) return no(`«${n}» en verde con rojas en RESULTADOS: no es coherente`);
      if (j.conclusion === "failure" && !x.r.rojas.length) return no(`«${n}» rojo sin ninguna prueba roja con nombre en RESULTADOS: no se sabe qué falló`);
      x.r.pedidas.forEach((t) => pedidas.add(t)); x.r.verdes.forEach((t) => verdes.add(t)); x.r.rojas.forEach((t) => rojas.add(t)); x.r.inestables.forEach((t) => inestables.add(t));
    }
    for (const t of rojas) { verdes.delete(t); inestables.delete(t); }
    if (!pedidas.size) return no("las partes no pidieron ninguna prueba");
    const fuera = en.solo.filter((t) => !pedidas.has(t));
    if (fuera.length || (en.entera && [...pedidas].some((t) => !en.solo.includes(t)))) return no(`lo que pidieron las partes no es «solo» de la corrida (${fuera.slice(0, 4).join(" ") || "sobran pedidas"})`);
    return { ok: true, id: run.id, sha: run.head_sha, solo: [...pedidas], verdes: [...verdes], rojas: [...rojas], inestables: [...inestables] };
  } catch (err) {
    return no(`error: ${String(err?.message ?? err).slice(0, 160)}`);
  }
}

/* Las rojas e inestables de los trabajos de pruebas de una corrida (o de su primer intento). Cada trabajo de pruebas que corrió (no saltado) tiene
   que traer RESULTADOS (de una parte cancelada también: el corredor la deja al detenerse); uno ROJO sin ninguna roja con nombre no dice qué falló.
   24 nov (revisión de bfa43c3; así, más estricto) · Una parte CANCELADA ANTES DE ARRANCAR (no llegó al corredor, no hay línea RESULTADOS) cuenta
   como «corrió sin RESULTADOS»: esa corrida deja a su R1 sin repaso ni cadena para siempre (toca la dirigida entera). */
function rojasDeTrabajos(trabajos, registros = {}, que = "") {
  try {
    if (!Array.isArray(trabajos) || !trabajos.length) return no(`sin trabajos${que}`);
    const rojas = new Set();
    for (const j of trabajos.filter(esTrabajoDePruebas)) {
      if (saltado(j)) continue;
      const x = resultadosDelRegistro(registros?.[j.id]);
      if (!x.ok) return no(`«${nombreJ(j).slice(0, 80)}»${que} terminó ${j?.status}/${j?.conclusion} y ${x.motivo}: no se sabe qué prueba falló`);
      if (j?.conclusion === "failure" && !x.r.rojas.length) return no(`«${nombreJ(j).slice(0, 80)}»${que} rojo sin ninguna prueba roja con nombre en RESULTADOS: no se sabe qué falló`);
      x.r.rojas.forEach((t) => rojas.add(t)); x.r.inestables.forEach((t) => rojas.add(t));
    }
    return { ok: true, rojas: [...rojas] };
  } catch (err) {
    return no(`error: ${String(err?.message ?? err).slice(0, 160)}`);
  }
}

/** Una corrida de la rama entre R1 y R2 que no terminó en verde (un repaso que también salió rojo, otra dirigida, una cancelada, una que se volvió a
    correr…): sus rojas y sus inestables se suman a las que R2 tiene que repetir. Una que no terminó no vale (no se sabe qué va a decir). Una que se
    volvió a correr (intento > 1) suma TAMBIÉN las de su primer intento (intento1: { trabajos, registros }); sin poder leerlas, no hay cadena. */
export function rojasDeIntermedia({ run, trabajos, registros = {}, intento1 = null } = {}) {
  try {
    if (run?.status !== "completed") return no(`la corrida ${run?.id} todavía no terminó (${run?.status}): no se sabe qué va a decir`);
    const rojas = new Set();
    if (run?.run_attempt !== 1) {
      if (!intento1) return no(`la corrida ${run?.id} se volvió a correr (intento ${run?.run_attempt}) y no puedo leer su primer intento`);
      const q1 = rojasDeTrabajos(intento1.trabajos, intento1.registros, " (primer intento)");
      if (!q1.ok) return q1;
      q1.rojas.forEach((t) => rojas.add(t));
    }
    const q = rojasDeTrabajos(trabajos, registros);
    if (!q.ok) return q;
    q.rojas.forEach((t) => rojas.add(t));
    return { ok: true, id: run?.id, rojas: [...rojas] };
  } catch (err) {
    return no(`error: ${String(err?.message ?? err).slice(0, 160)}`);
  }
}

/** Las corridas de la rama que cuentan como «entre R1 y R2»: ci.yml de este repo y de esta rama, de CUALQUIER evento, posteriores a R1 (y anteriores
    a R2 si la hay), que no terminaron en verde a la PRIMERA: rojas, canceladas, fuera de tiempo, las que se volvieron a correr (aunque acabaran en
    verde) y las que todavía no terminaron (quien las use las rehúsa). */
export function intermediasDe(corridas, { r1, r2 = null, rama, repo = REPO }) {
  return (corridas ?? []).filter((r) => r && r.path === ".github/workflows/ci.yml" && r.repository?.full_name === repo && r.head_branch === rama
    && !(r.status === "completed" && r.conclusion === "success" && r.run_attempt === 1) && Number(r.id) > Number(r1?.id) && (r2 === null || Number(r.id) < Number(r2?.id)));
}

/** ¿Una corrida no verde con rojas tenía ya el árbol de HEAD? (dif: lo que cambia entre su commit y HEAD). Vacío o solo documentos de trabajo = el
    mismo árbol: sin arreglo después de esa roja no hay repaso ni cadena (una roja dos veces es roja, AG). Sin saberlo, tampoco. */
export function sinArregloTras(dif) {
  if (!Array.isArray(dif)) return "no sé qué cambió entre ella y HEAD";
  if (!dif.length || veredicto(dif) === "documentos") return "ya salió roja con el mismo árbol que HEAD (o solo cambian documentos de trabajo): sin arreglo no hay repaso (una roja dos veces es roja, AG)";
  return "";
}

/** Lo que cambió entre A (el commit de R1) y HEAD: sin arreglo no hay repaso (vacío o solo documentos de trabajo: una roja dos veces es roja, AG) y
    con HERRAMIENTAS (.github/, scripts/ci, el corredor, pruebas/lib, guardianes, el reparto) tampoco: dirigida entera. */
export function difDeArreglo(dif) {
  if (!Array.isArray(dif)) return no("sin la lista de lo que cambió entre A y HEAD");
  const h = dif.filter((f) => casa(HERRAMIENTAS, f));
  if (h.length) return no(`entre A y HEAD cambiaron herramientas del CI (${h.slice(0, 4).join(", ")}${h.length > 4 ? "…" : ""}): no hay repaso ni cadena, toca la dirigida entera`);
  if (!dif.length || veredicto(dif) === "documentos") return no("sin arreglo no hay repaso: entre A y HEAD solo cambian documentos de trabajo, o nada (una roja dos veces es roja, AG)");
  return { ok: true };
}

/** La lista del repaso: rojas e inestables de R1 y de las rojas posteriores, la propuesta desde A (diff A..HEAD, con --mas) y, para que la cadena
    cubra la entrega, las de punta a punta de la propuesta de la entrega (origin/main..HEAD) que no salieron en verde en R1. Nunca resta. */
export function listaDelRepaso({ r1, extra = [], desdeA = [], total = [] }) {
  const sel = new Map(), pon = (n, por) => { if (!sel.has(n)) sel.set(n, []); if (!sel.get(n).includes(por)) sel.get(n).push(por); };
  for (const n of r1.rojas) pon(n, "roja en R1");
  for (const n of r1.inestables) pon(n, "inestable en R1");
  for (const n of extra) pon(n, "roja en una corrida posterior a R1");
  for (const t of desdeA) pon(t.nombre, `desde A: ${(t.por ?? []).join(", ") || "propuesta"}`);
  const verdesR1 = new Set(r1.verdes);
  for (const t of total) if (t.carril !== "alreves" && !verdesR1.has(t.nombre)) pon(t.nombre, "de la entrega y no salió en verde en R1");
  return [...sel].map(([nombre, por]) => ({ nombre, por }));
}

/** ¿La cadena R1 (dirigida roja) + R2 (repaso en verde) es evidencia para subir el árbol de HEAD? (decisión AU). Un solo eslabón: las verdes de R1
    y lo que corrió R2; nada de una corrida anterior a R1. R2 pasa TODO lo que evaluarCorrida le exige a una corrida (primer intento, árbol,
    EVIDENCIA, trabajos fijos, «al revés» entero, tubería y trabajos en verde) y además: R2 ⊇ rojas e inestables de R1 y de las corridas no verdes
    entre R1 y R2 ∪ propuesta(A..HEAD), y verdes(R1) ∪ R2 ⊇ propuesta(origin/main..HEAD) (las de «al revés» las cubre su carril entero en R2, como
    hoy). No vale con .github/ cambiado en la entrega (completa), ni sin arreglo o con herramientas cambiadas entre A y HEAD (difAHead). */
export function evaluarCadena({ r1, r2, intermedias = [], rama, repo = REPO, arbolHead, arbolDeRun, difRunHead, aEsAncestro = false, difAHead = null, propuestaTotal = [], propuestaDesdeA = [], completa = false }) {
  try {
    if (completa) return no("la entrega toca .github/: la cadena roja + repaso no vale, hace falta una corrida COMPLETA (decisión AM)");
    const a = analizarDirigida({ ...r1, rama, repo });
    if (!a.ok) return no(`R1: ${a.motivo}`);
    if (!a.rojas.length) return no("R1 no tiene ninguna prueba roja con nombre");
    if (aEsAncestro !== true) return no(`el commit de R1 (${String(a.sha).slice(0, 12)}) no es ancestro de HEAD`);
    const arr = difDeArreglo(difAHead);
    if (!arr.ok) return arr;
    const v = evaluarCorrida({ run: r2?.run, trabajos: r2?.trabajos, registro: r2?.registro, rama, repo, arbolHead, arbolDeRun, difRunHead, propuesta: [], completa: false });
    if (!v.ok) return no(`R2: ${v.motivo}`);
    if (!(Number(r2.run.id) > Number(a.id))) return no("R2 no es posterior a R1");
    const regOk = carrilCompleto(r2.trabajos, TRABAJO_REGRESION).ok || carrilCompleto(r2.trabajos, "confirmación · dos veces seguidas").ok;
    if (!regOk) return no("R2: la punta a punta no corrió entera");
    const s2 = v.ev.solo === "todas" ? null : new Set(v.ev.solo);
    const enR2 = (n) => s2 === null || s2.has(n);
    const extra = new Set();
    for (const x of intermediasDe(intermedias.map((i) => i?.run), { r1: { id: a.id }, r2: r2.run, rama, repo })) {
      const i = intermedias.find((y) => y?.run === x), q = rojasDeIntermedia(i);
      if (!q.ok) return no(`la corrida ${x.id}, no verde entre R1 y R2: ${q.motivo}`);
      const tras = q.rojas.length ? sinArregloTras(i?.difHead) : "";
      if (tras) return no(`la corrida ${x.id}, roja entre R1 y R2 (${q.rojas.slice(0, 4).join(" ")}): ${tras}`);
      q.rojas.forEach((t) => extra.add(t));
    }
    const rojas = [...new Set([...a.rojas, ...a.inestables, ...extra])];
    const sinRojas = rojas.filter((t) => !enR2(t));
    if (sinRojas.length) return no(`R2 no repite las rojas de R1 (y de las corridas no verdes posteriores): falta ${sinRojas.slice(0, 8).join(" ")}`);
    const sinA = propuestaDesdeA.filter((t) => !enR2(t.nombre));
    if (sinA.length) return no(`R2 no corre la propuesta desde el commit de R1 (A..HEAD): falta ${sinA.slice(0, 8).map((t) => t.nombre).join(" ")}`);
    const verdesR1 = new Set(a.verdes.filter((t) => !extra.has(t)));
    const sinCubrir = propuestaTotal.filter((t) => !(t.carril === "alreves" || enR2(t.nombre) || verdesR1.has(t.nombre)));
    if (sinCubrir.length) return no(`entre las verdes de R1 y R2 no se cubre la propuesta de la entrega (origin/main..HEAD): falta ${sinCubrir.slice(0, 8).map((t) => t.nombre).join(" ")}`);
    return { ok: true, ev: v.ev, r1: a, rojas, extra: [...extra] };
  } catch (err) {
    return no(`error: ${String(err?.message ?? err).slice(0, 160)}`);
  }
}

/* ── El cableado de la cadena y del repaso, con lo de verdad inyectado ───────────────────────────────────────────────────────────────────── */
/* 24 nov (revisión de bc9a893) · Lo que cmdSubir y cmdRepaso armaban a mano (qué corridas, qué commit, qué propuesta, qué intermedias) vive aquí,
   con la API y git detrás de «io»: ioReal en lo de verdad y uno de mentira en los casos. Así los casos prueban el cableado entero y no solo las
   funciones puras: dejar sin la propuesta desde A o sin la de la entrega, dar por ancestro lo que no lo es, olvidar una corrida intermedia,
   maquillar R1 o saltarse lo de las herramientas entre A y HEAD tumba un caso (guardián subidaConHerramienta; al revés: alrevesSubir).
   io: corrida(id) · corridas() (todas las de ci.yml de la rama, de cualquier evento y estado, la más nueva primero) · trabajos(id) ·
       trabajosIntento(id, n) (los del intento n) · registro(idTrabajo) · tenerCommit(sha) · arbol(sha) · difNombres(a, b) (git diff --name-only
       a b) · esAncestro(sha) (de HEAD) · planear(base, mas) (las clases y la dirigida propuesta desde «base» hasta HEAD). */
async function registrosDe(io, trabajos) {
  const registros = {};
  for (const j of trabajos.filter((x) => esTrabajoDePruebas(x) && !saltado(x))) { try { registros[j.id] = await io.registro(j.id); } catch { /* sin registro: RESULTADOS dirá que falta */ } }
  return registros;
}
export async function cargarCorrida(io, run) {
  const trabajos = await io.trabajos(run.id);
  return { run, trabajos, registros: await registrosDe(io, trabajos) };
}
/** Una corrida no verde entre R1 y R2: como cargarCorrida, más su PRIMER intento si se volvió a correr (intento1) y lo que cambia entre su commit y
    HEAD (difHead, para «sin arreglo no hay repaso»). Lo que no se pueda leer queda vacío y la evaluación lo rehúsa. */
export async function cargarIntermedia(io, run) {
  const c = await cargarCorrida(io, run);
  if (run?.status === "completed" && run?.run_attempt !== 1) {
    try { const t1 = await io.trabajosIntento(run.id, 1); c.intento1 = { trabajos: t1, registros: await registrosDe(io, t1) }; } catch { /* sin su primer intento: se rehúsa */ }
  }
  c.difHead = SHA40.test(run?.head_sha ?? "") && (await io.tenerCommit(run.head_sha)) === true ? await io.difNombres(run.head_sha, "HEAD") : null;
  return c;
}

/** Los argumentos de evaluarCadena para R1 (una corrida roja de la lista, tal cual) y R2 (una candidata ya leída: { run, trabajos, registro,
    arbolDeRun, difRunHead }), sacados de io y de nada más. */
export async function armarCadena({ r1, r2, corridas, p, rama, repo = REPO, arbolHead, io }) {
  const A = r1?.head_sha;
  const tengo = SHA40.test(A ?? "") && (await io.tenerCommit(A)) === true;
  const aEsAncestro = tengo && (await io.esAncestro(A)) === true;
  const difAHead = tengo ? await io.difNombres(A, "HEAD") : null;
  const propuestaDesdeA = aEsAncestro ? (await io.planear(A, [])).d.pruebas : [];
  const intermedias = [];
  for (const r of intermediasDe(corridas, { r1, r2: r2.run, rama, repo })) intermedias.push(await cargarIntermedia(io, r));
  return { r1: await cargarCorrida(io, r1), r2, intermedias, rama, repo, arbolHead, arbolDeRun: r2.arbolDeRun, difRunHead: r2.difRunHead, aEsAncestro, difAHead,
    propuestaTotal: p.d.pruebas, propuestaDesdeA, completa: p.ex.corrida === "completa" };
}

/** c. de --subir: la evidencia del CI para el árbol de HEAD. Una corrida verde que lo cubra (evaluarCorrida) o, si no, la cadena de un eslabón
    (evaluarCadena; solo en el camino de la dirigida: nunca con .github/ ni en la vía rápida). → { hallada, cadena, motivos, motivosCadena }. */
export async function buscarEvidencia({ p, rama, repo = REPO, arbolHead, io }) {
  const corridas = (await io.corridas()) ?? [];
  const motivos = [], motivosCadena = [], candidatas = [];
  for (const r of corridas.filter((x) => x?.status === "completed" && x?.conclusion === "success").slice(0, 30)) {
    if (!SHA40.test(r.head_sha ?? "")) continue;
    if ((await io.tenerCommit(r.head_sha)) !== true) { motivos.push(`${r.id}: no tengo su commit`); continue; }
    const arbolDeRun = await io.arbol(r.head_sha);
    const difRunHead = await io.difNombres(r.head_sha, "HEAD");
    if (arbolDeRun !== arbolHead && veredicto(difRunHead) !== "documentos") { motivos.push(`${r.id}: otro árbol`); continue; }
    const trabajos = await io.trabajos(r.id), tub = trabajos.filter((j) => /^la tubería /.test(nombreJ(j)));
    let registro = "";
    if (tub.length === 1) { try { registro = await io.registro(tub[0].id); } catch { motivos.push(`${r.id}: no pude leer el registro de «la tubería»`); continue; } }
    const v = evaluarCorrida({ run: r, trabajos, registro, rama, repo, arbolHead, arbolDeRun, difRunHead, propuesta: p.d.pruebas, completa: p.ex.corrida === "completa" });
    if (v.ok) return { hallada: r, cadena: null, motivos, motivosCadena };
    motivos.push(`${r.id}: ${v.motivo}`);
    candidatas.push({ run: r, trabajos, registro, arbolDeRun, difRunHead });
  }
  if (p.ex.corrida !== "dirigida" || !candidatas.length) return { hallada: null, cadena: null, motivos, motivosCadena };
  const rojas = corridas.filter((r) => r?.event === "workflow_dispatch" && r?.status === "completed" && r?.conclusion === "failure");
  for (const r2 of candidatas) {
    for (const r1 of rojas.filter((r) => Number(r.id) < Number(r2.run.id)).slice(0, 5)) {
      const v = evaluarCadena(await armarCadena({ r1, r2, corridas, p, rama, repo, arbolHead, io }));
      if (v.ok) return { hallada: null, cadena: { r1, r2: r2.run, v }, motivos, motivosCadena };
      motivosCadena.push(`${r1.id}→${r2.run.id}: ${v.motivo}`);
    }
  }
  return { hallada: null, cadena: null, motivos, motivosCadena };
}

/** Lo que --repaso necesita antes de lanzar nada: R1 (por su número) con todas sus condiciones, el arreglo entre A y HEAD (sin herramientas), las
    corridas no verdes posteriores y la lista (listaDelRepaso). → { ok: false, motivo } o { ok: true, run, a, A, difAHead, extra, posteriores, pt,
    pa, lista }. */
export async function prepararRepaso({ id, rama, repo = REPO, mas = [], io }) {
  if (!/^\d+$/.test(String(id ?? ""))) return no("--repaso <id de la corrida roja> (el número de la corrida de la dirigida que salió roja)");
  const run = await io.corrida(id);
  const a = analizarDirigida({ ...(await cargarCorrida(io, run)), rama, repo });
  if (!a.ok) return no(`la corrida ${id} no vale para un repaso: ${a.motivo}`);
  if (!a.rojas.length) return no(`la corrida ${id} no tiene ninguna prueba roja con nombre`);
  const A = a.sha;
  if ((await io.tenerCommit(A)) !== true) return no(`no tengo el commit ${A.slice(0, 12)} de la corrida ${id}`);
  if ((await io.esAncestro(A)) !== true) return no(`el commit de R1 (${A.slice(0, 12)}) no es ancestro de HEAD (¿rebase?)`);
  const difAHead = await io.difNombres(A, "HEAD");
  const arr = difDeArreglo(difAHead);
  if (!arr.ok) return arr;
  const corridas = (await io.corridas()) ?? [];
  if (!corridas.some((r) => r?.id === a.id)) return no(`la corrida ${id} no está entre las ${corridas.length} últimas corridas de ${rama}: no puedo ver todas las posteriores`);
  const extra = new Set(), posteriores = intermediasDe(corridas, { r1: { id: a.id }, rama, repo });
  for (const r of posteriores) {
    const i = await cargarIntermedia(io, r), q = rojasDeIntermedia(i);
    if (!q.ok) return no(`la corrida ${r.id}, posterior a R1 y no verde: ${q.motivo}`);
    const tras = q.rojas.length ? sinArregloTras(i.difHead) : "";
    if (tras) return no(`la corrida ${r.id}, posterior a R1 y roja (${q.rojas.slice(0, 4).join(" ")}): ${tras}`);
    q.rojas.forEach((t) => extra.add(t));
  }
  const pt = await io.planear("origin/main", []);
  if (pt.ex.corrida === "completa") return no("la entrega toca .github/: la cadena roja + repaso no vale, hace falta una corrida COMPLETA (decisión AM)");
  const pa = await io.planear(A, mas);
  const errores = [...(pa.d.errores ?? []), ...(pt.d.errores ?? [])];
  if (errores.length) return no(errores.join(" · "));
  return { ok: true, run, a, A, difAHead, extra: [...extra], posteriores, pt, pa, lista: listaDelRepaso({ r1: a, extra: [...extra], desdeA: pa.d.pruebas, total: pt.d.pruebas }) };
}

/** a. El árbol y la base. */
export function comprobarBase({ limpio, mainEsAncestro, pruebasEsAncestro }) {
  const out = [];
  out.push(limpio ? { ok: true, linea: "CORRIÓ: git status limpio" } : { ok: false, linea: "FALTA: el árbol tiene cambios sin commit (git status no está limpio)" });
  out.push(mainEsAncestro ? { ok: true, linea: "CORRIÓ: HEAD desciende de origin/main" } : { ok: false, linea: "FALTA: ponerse al día: origin/main avanzó y HEAD no desciende de él (merge de origin/main, y la evidencia del CI otra vez)" });
  out.push(pruebasEsAncestro ? { ok: true, linea: "CORRIÓ: origin/pruebas es ancestro de HEAD (el empuje no necesita forzar)" } : { ok: false, linea: "FALTA: origin/pruebas no es ancestro de HEAD: el empuje necesitaría forzar y esta herramienta nunca fuerza" });
  return out;
}

/** d. Qué se empuja y en qué orden. Nunca forzado; con despliegue, main primero y pruebas solo después de «verificación · imágenes» en verde. */
export function planDeEmpuje({ clases: cl, rama, remotaRama, head }) {
  const pasos = [];
  if (remotaRama !== head) pasos.push({ tipo: "push", args: ["push", "origin", `HEAD:refs/heads/${rama}`] });
  if (cl.includes("despliegue")) {
    pasos.push({ tipo: "push", args: ["push", "origin", "HEAD:main"] });
    pasos.push({ tipo: "esperar-imagenes" });
    pasos.push({ tipo: "push", args: ["push", "origin", "HEAD:pruebas"] });
  } else pasos.push({ tipo: "push", args: ["push", "--atomic", "origin", "HEAD:main", "HEAD:pruebas"] });
  pasos.push({ tipo: "comprobar-ramas" });
  return pasos;
}

/** e. Lo que dice el trabajo de estado-sandbox.yml: el commit que sirve /api/salud, la línea de tramos y las rutas. */
export function estadoDelSandbox(registro, head) {
  const ls = String(registro ?? "").replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.replace(/^\uFEFF?\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z /, ""));
  let servido = "";
  for (const l of ls) { const m = /"commit":"([0-9a-f]{7,40})"/.exec(l); if (m) servido = m[1]; }
  const tramos = [...ls].reverse().find((l) => /tramos \(/.test(l) && !/\[36;1m/.test(l)) ?? "";
  const rutas = ls.filter((l) => /^\/\S* (\d{3} [\d.]+s|sin respuesta)$/.test(l));
  const sirve = !!servido && SHA40.test(head ?? "") && head.startsWith(servido);
  return { servido, sirve, tramos: tramos.trim(), rutas };
}

/* ── Lo de verdad (git, gh) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const git = (...a) => execFileSync("git", a, { cwd: RAIZ, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024 });
const gitOk = (...a) => { try { git(...a); return true; } catch { return false; } };
const gh = (...a) => execFileSync("gh", a, { cwd: RAIZ, encoding: "utf8", timeout: 60_000, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
const api = (ruta) => JSON.parse(gh("api", "-H", "Accept: application/vnd.github+json", ruta));
const registroDe = (repo, id) => gh("api", `repos/${repo}/actions/jobs/${id}/logs`);
// ESPERA-FIJA: el sondeo de la API de GitHub va cada 25 s (no hay a qué engancharse para saber que una corrida terminó).
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
class SinGithub extends Error {}

function trabajosDe(repo, id) {
  const d = api(`repos/${repo}/actions/runs/${id}/jobs?filter=latest&per_page=100`);
  if (!Array.isArray(d?.jobs) || d.total_count !== d.jobs.length) throw new Error(`lista de trabajos incompleta (${d?.jobs?.length} de ${d?.total_count})`);
  return d.jobs;
}
/* Los trabajos de un intento concreto (el primero, de una corrida que se volvió a correr). Incompleta = error (quien la pide lo rehúsa). */
function trabajosDeIntento(repo, id, n) {
  const d = api(`repos/${repo}/actions/runs/${id}/attempts/${n}/jobs?per_page=100`);
  if (!Array.isArray(d?.jobs) || d.total_count !== d.jobs.length) throw new Error(`lista de trabajos del intento ${n} incompleta (${d?.jobs?.length} de ${d?.total_count})`);
  return d.jobs;
}

function diffDe(base, cabeza) {
  const archivos = git("diff", "--no-renames", "--name-only", "-z", `${base}...${cabeza}`).split("\0").filter(Boolean);
  const renglones = {};
  let f = null, hunk = false;
  for (const l of git("diff", "--no-renames", "--no-color", "-U0", `${base}...${cabeza}`).split("\n")) {
    if (l.startsWith("diff --git ")) { f = null; hunk = false; continue; }
    if (!hunk && l.startsWith("+++ ")) { f = l === "+++ /dev/null" ? f : l.slice(6); if (f) renglones[f] ??= []; continue; }
    if (!hunk && l.startsWith("--- ")) { if (l !== "--- /dev/null") { f = l.slice(6); renglones[f] ??= []; } continue; }
    if (l.startsWith("@@")) { hunk = true; continue; }
    if (hunk && f && (l.startsWith("+") || l.startsWith("-"))) renglones[f].push(l.slice(1));
  }
  return { archivos, renglones };
}

function catalogoEn(cabeza) {
  return catalogoDe(git("ls-tree", "--name-only", "-z", cabeza, "pruebas/e2e/", "pruebas/alreves/").split("\0").filter(Boolean));
}
const buscarEn = (cabeza) => (aguja) => {
  try { return git("grep", "-l", "-F", "-e", aguja, cabeza, "--", "pruebas/e2e", "pruebas/alreves").split("\n").filter(Boolean).map((l) => l.slice(cabeza.length + 1)); }
  catch { return []; }
};
// Los nombres, con el MISMO código que usa el CI en «cambios»: pruebas/correr.mjs --comprobar (sale con 2 si uno no existe).
const validarConCorredor = (nombres) => {
  const p = spawnSync(process.execPath, [join(RAIZ, "pruebas/correr.mjs"), "--comprobar", ...nombres], { cwd: RAIZ, encoding: "utf8", timeout: 60_000 });
  return p.status === 0 ? { ok: true } : { ok: false, motivo: `${(p.stderr || p.stdout || "").trim().split("\n")[0] || `salió con ${p.status}`}` };
};

/** Las listas de origin/main (si allí existe esta herramienta): manda la unión con las de HEAD (lo más estricto). */
async function deMain() {
  if (!gitOk("cat-file", "-e", "origin/main:scripts/ci/subir.mjs")) return null;
  const d = mkdtempSync(join(tmpdir(), "subir-main-"));
  try {
    mkdirSync(join(d, "scripts", "ci"), { recursive: true });
    for (const f of ["subir.mjs", "alcance.mjs", "corrida.mjs"]) { try { writeFileSync(join(d, "scripts", "ci", f), git("show", `origin/main:scripts/ci/${f}`)); } catch { /* falta: el import dirá */ } }
    return await import(pathToFileURL(join(d, "scripts", "ci", "subir.mjs")).href);
  } catch { return null; } finally { rmSync(d, { recursive: true, force: true }); }
}

async function planear({ base, cabeza, mas, sinViaRapida = false, main = null }) {
  const head = git("rev-parse", "--verify", `${cabeza}^{commit}`).trim();
  const { archivos, renglones } = diffDe(base, head);
  const c0 = clases(archivos, renglones);
  const cat = catalogoEn(head), buscar = buscarEn(head);
  const esHead = head === git("rev-parse", "HEAD").trim();
  let d = dirigida({ archivos, catalogo: cat, buscar, mas, validar: esHead ? validarConCorredor : null });
  const m = await deMain();
  let c2 = null, sinMain = "origin/main no tiene esta herramienta, o no pude cargar la suya";
  if (m?.clases && m?.dirigida) {
    try {
      c2 = m.clases(archivos, renglones);
      const d2 = m.dirigida({ archivos, catalogo: cat, buscar, mas });
      for (const t of d2.pruebas) if (!d.pruebas.some((x) => x.nombre === t.nombre)) d.pruebas.push({ ...t, por: [...t.por, "lista de origin/main"] });
      d.alrevesEntero ||= d2.alrevesEntero;
    } catch (e) { c2 = null; sinMain = `la herramienta de origin/main falló (${String(e?.message ?? e).split("\n")[0].slice(0, 120)})`; }
  }
  // Sin la de main manda la de HEAD en todo, salvo las vías rápidas de diseño y de código: esas necesitan que las dos la den (cualquier duda = no).
  const c = combinar(c0, c2, sinMain);
  // Las pruebas de lo tocado (AV) son la misma selección que la dirigida; su tope, con lo medido en el CI (pruebas/reparto.json de esta cabeza).
  const local = estimarLocal(d.pruebas, duracionesEn(head));
  return { head, archivos, c, d, local, main, ex: exigencias(c, { sinViaRapida, main, local }), exSiMainVerde: exigencias(c, { sinViaRapida, main: { estado: "verde" }, local }), conMain: !!c2, esHead, sinViaRapida };
}

function imprimirPlan({ base, rama, p }) {
  const { head, archivos, c, d, ex } = p;
  console.log(`plan · ${base}...${head.slice(0, 12)} · ${archivos.length} archivo(s) cambiado(s)${p.conMain ? " · juzgado también con las listas de origin/main" : ""}`);
  if (!archivos.length) { console.log("nada cambia respecto de la base: no hay nada que subir"); return; }
  console.log(`clases: ${c.clases.join(", ") || "(ninguna de las vigiladas: código de producto)"}${c.soloDocumentos ? " · SOLO documentos de trabajo" : ""}`);
  for (const mo of c.motivos) console.log(`  · ${mo}`);
  console.log("  («sensible» es mejor esfuerzo: solo sube lo exigido y nunca certifica; lo que no caza sube como normal)");
  if (c.soloDocumentos) console.log("vía rápida de diseño: no aplica (solo documentos de trabajo)");
  else if (c.diseno && ex.corrida === "despues") console.log("VÍA RÁPIDA DE DISEÑO (AL): SÍ · todos los archivos que no son documentos de trabajo están en la lista blanca de diseño, sin clases vigiladas ni señales en sus renglones, juzgado con las listas de esta cabeza y con las de origin/main");
  else if (c.diseno) console.log("vía rápida de diseño: NO · la entrega es de diseño, pero --sin-via-rapida fuerza el camino normal");
  else console.log(`vía rápida de diseño: NO · ${c.noDiseno}${c.disenoCabeza ? " (con las listas de esta cabeza sí lo sería)" : ""}`);
  // La vía rápida de código (AV): aquí no se mira la red, así que se dice si saldría con main en verde.
  const cod = ex.pruebasAqui ? ex : p.exSiMainVerde;
  if (!c.soloDocumentos && !(c.diseno && ex.corrida === "despues")) {
    if (cod?.pruebasAqui) console.log(`VÍA RÁPIDA DE CÓDIGO (AV): SÍ${ex.pruebasAqui ? "" : " si al subir main está en verde (aquí no se mira la red)"} · las pruebas de lo tocado corren aquí antes de empujar: ${p.local.n}, ~${Math.ceil(p.local.seg / 60)} min (tope ${TOPE_LOCAL.pruebas} pruebas y ${TOPE_LOCAL.seg / 60} min)`);
    else console.log(`vía rápida de código: NO · ${cod?.noRapida || c.noCodigo || "sin motivo"}${c.codigoCabeza && !c.codigo ? " (con las listas de esta cabeza sí lo sería)" : ""}`);
  }
  if (c.soloDocumentos) console.log("dirigida: no hace falta (solo documentos de trabajo)");
  else {
    if (ex.corrida === "despues") console.log("  (la dirigida de abajo NO se exige antes de subir: es la lista de pruebas a mirar DESPUÉS, en la corrida del push a main)");
    console.log(`dirigida propuesta: ${d.pruebas.length} prueba(s)${d.alrevesEntero ? " · y «al revés» ENTERO (toca guardianes/run.mjs, pruebas/correr.mjs o pruebas/lib/)" : ""}`);
    for (const t of d.pruebas) console.log(`  · ${t.nombre} (${t.carril}: ${t.por.join(", ")})`);
    console.log("  («al revés» corre entero en toda dirigida: el trabajo «punta a punta · al revés · i/3» no mira «solo»)");
    if (!p.esHead) console.log(`  (nombres comprobados contra el catálogo de ${head.slice(0, 12)}; con HEAD se comprueban con pruebas/correr.mjs --comprobar)`);
    for (const e of d.errores) console.log(`  ✗ ${e}`);
    const o = ordenDirigida({ rama, nombres: d.pruebas.map((t) => t.nombre) });
    if (ex.corrida === "completa") console.log(`orden: gh workflow run ci.yml --repo ${REPO} --ref ${rama} -f alcance=todo  (toca .github/: corrida COMPLETA, decisión AM)`);
    else console.log(o ? `orden: ${comoTexto(o)}` : "orden: ninguna (nada del diff nombra una prueba: añade --mas \"…\")");
  }
  console.log("qué falta para subir:");
  console.log(`  · local, sobre el árbol limpio: ${ex.locales.map((k) => (k === "build" ? `build de la web (${PASOS_LOCALES.build[0]} ${PASOS_LOCALES.build[1].join(" ")})` : k)).join(", ")}`);
  console.log(`  · CI: ${ex.corrida === "ninguna" ? "nada (solo documentos)" : ex.corrida === "despues" ? "nada ANTES de subir (vía rápida de diseño, AL): la punta a punta y «al revés» corren DESPUÉS, en la corrida del push a main; lo que cacen se arregla en el bloque siguiente" : ex.corrida === "completa" ? "una corrida COMPLETA en verde de este árbol en la rama de trabajo" : "la dirigida de arriba en verde, de este árbol (o uno que difiera solo en documentos de trabajo)"}`);
  if (cod?.pruebasAqui) console.log(`  · por la vía rápida de código (AV): en vez de la dirigida, main en verde y las pruebas de lo tocado aquí, contra el servidor de desarrollo de este árbol (${urlLocal()}, con su base al día)`);
  if (c.clases.includes("sensible")) console.log("  · sensible: lo revisa un modelo distinto del que lo escribió (regla 14; esta herramienta no lo puede comprobar)");
  console.log(`  · empuje: ${ex.mainPrimero ? "main primero, esperar «verificación · imágenes» en verde, después pruebas" : "git push --atomic origin HEAD:main HEAD:pruebas"}`);
}

/* ── Las pruebas de lo tocado, aquí (decisión AV) ─────────────────────────────────────────────────────────────────────────────────────────── */
/** Lo medido en el CI para el tope (pruebas/reparto.json › seg, de la cabeza); sin él, todas cuentan como sin medir (lo más estricto). */
function duracionesEn(cabeza) {
  try { return JSON.parse(git("show", `${cabeza}:pruebas/reparto.json`)).seg ?? {}; } catch { return {}; }
}

/* El servidor de las pruebas locales: el de DESARROLLO que levanta la sesión (la herramienta nunca lo levanta), en PRUEBAS_URL (la única variable
   que manda, la de pruebas/lib/puertos.cjs) o, sin ella, en :3199. Las pruebas llegan a la app por ENT.B, que sale de PRUEBAS_URL; sus secretos, de
   $PRUEBAS_SALIDA/secretos.env (los mismos con los que arrancó ese servidor). */
export const SERVIDOR_LOCAL = "http://127.0.0.1:3199";
export function urlLocal(env = process.env) {
  return String(env.PRUEBAS_URL ?? "").trim() || SERVIDOR_LOCAL;
}

/** Quién escucha en el puerto de «url» en ESTA máquina (Linux: /proc): su pid, su carpeta y su NODE_ENV. Sin poder verlo, no (cualquier duda). */
function servidorEn(url) {
  let u;
  try { u = new URL(url); } catch { return no(`${url} no es una dirección`); }
  if (!["127.0.0.1", "localhost", "[::1]"].includes(u.hostname)) return no(`${u.hostname} no es esta máquina: no puedo ver qué código sirve`);
  const puerto = Number(u.port), hex = puerto.toString(16).toUpperCase().padStart(4, "0"), inodos = new Set();
  for (const f of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    let t = "";
    try { t = readFileSync(f, "utf8"); } catch { continue; }
    for (const l of t.split("\n").slice(1)) { const c = l.trim().split(/\s+/); if (c.length > 9 && c[1].endsWith(`:${hex}`) && c[3] === "0A") inodos.add(c[9]); }
  }
  if (!inodos.size) return no(`nadie escucha en el puerto ${puerto} (o esta máquina no deja verlo)`);
  for (const pid of readdirSync("/proc").filter((x) => /^\d+$/.test(x))) {
    let fds = [];
    try { fds = readdirSync(`/proc/${pid}/fd`); } catch { continue; }
    for (const fd of fds) {
      let l = "";
      try { l = readlinkSync(`/proc/${pid}/fd/${fd}`); } catch { continue; }
      const m = /^socket:\[(\d+)\]$/.exec(l);
      if (!m || !inodos.has(m[1])) continue;
      let cwd = "", env = "";
      try { cwd = readlinkSync(`/proc/${pid}/cwd`); } catch { /* sin permiso: cwd vacío y no vale */ }
      try { env = readFileSync(`/proc/${pid}/environ`, "utf8"); } catch { /* sin permiso */ }
      return { ok: true, pid: Number(pid), cwd, nodeEnv: env.split("\0").find((x) => x.startsWith("NODE_ENV="))?.slice(9) ?? null };
    }
  }
  return no(`no encuentro el proceso que escucha en el puerto ${puerto}`);
}

async function saludDe(url) {
  try { const r = await fetch(`${url}/api/salud`, { signal: AbortSignal.timeout(90_000), headers: { "cache-control": "no-store" } }); return await r.json(); }
  catch (e) { return { ok: false, error: `no respondió (${String(e?.message ?? e).split("\n")[0].slice(0, 120)})` }; }
}

/* Calentar: un GET a cada ruta (sin seguir redirecciones), de una en una; lo que no conteste en 2 min se dice y se sigue (no es un fallo: lo que
   cuenta es la prueba, que repite una vez con --reintentar). Tope de 8 min en total. */
async function calentar(url, rutas) {
  const t0 = Date.now(), lentas = [];
  let hechas = 0;
  for (const r of rutas) {
    if (Date.now() - t0 > 8 * 60_000) { lentas.push(`${r} (sin tiempo)`); continue; }
    try { const x = await fetch(`${url}${r}`, { redirect: "manual", signal: AbortSignal.timeout(120_000) }); await x.arrayBuffer(); hechas++; }
    catch { lentas.push(r); }
  }
  return { hechas, lentas, s: Math.round((Date.now() - t0) / 1000) };
}

/* pruebas/correr.mjs <nombres> --reintentar, con PRUEBAS_URL apuntando al servidor (manda una: si la sesión trae también la otra variable del puerto y no
   coincide, el corredor lo dice y sale, y esto queda en FALTA). Su salida se va viendo. */
function correrCorredor({ nombres, url }) {
  return new Promise((listo) => {
    const env = { ...process.env, PRUEBAS_URL: url };
    const ch = spawn(process.execPath, [join(RAIZ, "pruebas/correr.mjs"), ...nombres, "--reintentar"], { cwd: RAIZ, env, stdio: ["ignore", "pipe", "pipe"] });
    let salida = "", resto = "";
    const ver = (d) => { salida = (salida + d).slice(-8 * 1024 * 1024); const ls = (resto + d).split("\n"); resto = ls.pop(); for (const l of ls) console.log(`    ${l}`); };
    ch.stdout.on("data", ver); ch.stderr.on("data", ver);
    const reloj = setTimeout(() => ch.kill("SIGINT"), 45 * 60_000);
    ch.on("error", (e) => { clearTimeout(reloj); listo({ codigo: null, salida: `${salida}\n${String(e?.message ?? e)}` }); });
    ch.on("close", (codigo) => { clearTimeout(reloj); if (resto) console.log(`    ${resto}`); listo({ codigo, salida }); });
  });
}

/** Las pruebas de lo tocado, aquí: el servidor de desarrollo de ESTE árbol con su base al día (si hay alguna de punta a punta), calentar, correr con
    --reintentar y exigir la línea RESULTADOS completa:true sin rojas. Nunca se salta en silencio: cada paso dice su «CORRIÓ: …» o su «FALTA: …» en el
    momento (decir; --subir le pasa la suya, que cuenta las FALTA). → true si todo salió bien. */
async function pruebasAqui({ pruebas, cabeza = "HEAD", archivos = [], decir = (x) => console.log(x.linea) }) {
  const url = urlLocal(), t0 = Date.now(), di = (ok, linea) => { decir({ ok, linea }); return ok; };
  const e2e = pruebas.filter((t) => t.carril === "e2e"), nombres = [...e2e, ...pruebas.filter((t) => t.carril !== "e2e")].map((t) => t.nombre);
  if (!nombres.length) return di(false, "FALTA: pruebas de lo tocado: ninguna que correr");
  if (e2e.length) {
    try { createRequire(import.meta.url)("../../pruebas/lib/puertos.cjs").resolver({ PRUEBAS_URL: url }); } catch (e) { return di(false, `FALTA: pruebas de lo tocado: ${String(e?.message ?? e)}`); }
    let raiz = RAIZ;
    try { raiz = realpathSync(RAIZ); } catch { /* la de siempre */ }
    const sv = evaluarServidor({ url, proc: servidorEn(url), raiz });
    if (!sv.ok) return di(false, `FALTA: pruebas de lo tocado: ${sv.motivo}`);
    const migraciones = contarMigraciones(git("ls-tree", "--name-only", "-z", cabeza, "packages/db/migrations/").split("\0").filter(Boolean));
    const sa = evaluarSalud(await saludDe(url), migraciones);
    if (!sa.ok) return di(false, `FALTA: pruebas de lo tocado: el servidor de ${url}: ${sa.motivo}`);
    di(true, `CORRIÓ: el servidor de ${url} es el de desarrollo de este árbol y su base tiene las ${migraciones} migraciones de HEAD`);
    const paginas = git("ls-tree", "-r", "--name-only", "-z", cabeza, "apps/web/app/").split("\0").filter(Boolean);
    const textos = e2e.map((t) => { try { return readFileSync(join(RAIZ, t.archivo), "utf8"); } catch { return ""; } });
    const rutas = rutasACalentar({ textos, paginas, cambiados: archivos });
    const c = await calentar(url, rutas);
    di(true, `CORRIÓ: calentado el servidor de desarrollo: ${c.hechas} de ${rutas.length} ruta(s) en ${c.s} s${c.lentas.length ? ` (sin respuesta en 2 min: ${c.lentas.join(" ")}; la prueba repite una vez si hace falta)` : ""}`);
  }
  console.log(`  pruebas de lo tocado aquí: pruebas/correr.mjs ${nombres.join(" ")} --reintentar (PRUEBAS_URL=${url})`);
  const r = await correrCorredor({ nombres, url });
  const v = evaluarLocal({ salida: r.salida, codigo: r.codigo, nombres });
  const s = Math.round((Date.now() - t0) / 1000);
  if (!v.ok) return di(false, `FALTA: pruebas de lo tocado aquí (${nombres.length}) en verde: ${v.motivo} (${s} s)`);
  return di(true, `CORRIÓ: pruebas de lo tocado aquí (${nombres.length}): ${nombres.join(" ")} en ${s} s${v.inestables.length ? ` · INESTABLES (fallaron una vez y pasaron al repetirlas; se arreglan igual): ${v.inestables.join(" ")}` : ""}`);
}

/** El estado de main para la vía rápida de código (AV): la última corrida terminada de ci.yml de un push a main. Sin la API, duda. */
function leerMain(repo) {
  try { return estadoDeMain(api(`repos/${repo}/actions/workflows/ci.yml/runs?branch=main&event=push&status=completed&per_page=5`).workflow_runs ?? [], repo); }
  catch (e) { return { estado: "duda", motivo: `no pude preguntar a la API por main (${String(e?.message ?? e).split("\n")[0].slice(0, 120)})` }; }
}

/** Antes de lanzar una dirigida o un repaso (AU, AV): la parte DIRECTA de la selección corre aquí, dentro del tope (primero las rojas de R1, luego las
    cambiadas, luego las más cortas; las demás quedan para el CI y se dice). Con una roja aquí (o sin poder correrlas) no se lanza nada. --sin-local
    lo salta, y lo dice. → true si se puede lanzar. */
async function antesDeLanzar({ archivos, head, primero = [], sinLocal = false }) {
  if (sinLocal) { console.log("SALTADO: pruebas locales (--sin-local)"); return true; }
  const sel = seleccionDirecta({ archivos, catalogo: catalogoEn(head), buscar: buscarEn(head), primero });
  const r = recortarLocal(sel, duracionesEn(head), { primero });
  if (!r.correr.length) { console.log(`CORRIÓ: pruebas locales · ninguna directa (ni cambiada, ni que nombre un archivo cambiado de apps/ o packages/${primero.length ? ", ni roja en R1" : ""}): todo queda para el CI`); return true; }
  console.log(`pruebas locales antes de lanzar (AV): ${r.correr.length} de ${sel.length}, ~${Math.ceil(r.seg / 60)} min${r.soloCI.length ? ` · quedan solo para el CI (tope ${TOPE_LOCAL.pruebas} pruebas y ${TOPE_LOCAL.seg / 60} min): ${r.soloCI.map((t) => t.nombre).join(" ")}` : ""}`);
  const ok = await pruebasAqui({ pruebas: r.correr, cabeza: head, archivos });
  if (!ok) { console.log("no se lanzó nada: con una roja aquí, o sin poder correrlas, no se lanza (arréglalo; --sin-local solo si de verdad hay que saltarlo, y se dice)"); return false; }
  if (git("status", "--porcelain").trim()) { console.log("FALTA: las pruebas locales dejaron el árbol cambiado; no se lanzó nada"); return false; }
  return true;
}

const ramaActual = () => {
  const r = git("branch", "--show-current").trim();
  if (!r || r === "main" || r === "pruebas" || /^produc/.test(r)) throw new Error(`la rama de trabajo no puede ser «${r || "(sin rama)"}»`);
  return r;
};

async function correrYBuscar({ repo, wf, rama, args, coincide }) {
  const antes = new Set((api(`repos/${repo}/actions/workflows/${wf}/runs?event=workflow_dispatch&branch=${encodeURIComponent(rama)}&per_page=30`).workflow_runs ?? []).map((r) => r.id));
  gh(...args);
  for (let i = 0; i < 12; i++) {
    await esperar(10_000);
    const rs = (api(`repos/${repo}/actions/workflows/${wf}/runs?event=workflow_dispatch&branch=${encodeURIComponent(rama)}&per_page=30`).workflow_runs ?? []).filter((r) => !antes.has(r.id) && coincide(r));
    if (rs.length) return rs.sort((a, b) => a.id - b.id)[0];
  }
  throw new SinGithub(`lancé ${wf} pero su corrida no apareció en 2 min`);
}

async function esperarCorrida(repo, id, topeMin) {
  const fin = Date.now() + topeMin * 60_000;
  let fallos = 0;
  while (Date.now() < fin) {
    try { const r = api(`repos/${repo}/actions/runs/${id}`); fallos = 0; if (r.status === "completed") return r; }
    catch (e) { if (++fallos >= 4) throw new SinGithub(`la API no responde (${String(e?.message ?? e).split("\n")[0].slice(0, 120)})`); }
    await esperar(SONDEO_MS);
  }
  throw new SinGithub(`la corrida ${id} no terminó en ${topeMin} min`);
}

const utiles = (registro, n) => String(registro ?? "").split(/\r?\n/).map((l) => l.replace(/^\uFEFF?\d{4}-\d\d-\d\dT[\d:.]+Z ?/, ""))
  .filter((l) => l.trim() && !/^##\[(group|endgroup)\]|^\[36;1m|^Post job cleanup|^Cleaning up orphan|^Temporarily overriding|^\/usr\/bin\/git /.test(l)).slice(-n);

async function cmdDirigida({ mas, sinLocal = false }) {
  const repo = REPO, rama = ramaActual(), head = git("rev-parse", "HEAD").trim();
  if (git("status", "--porcelain").trim()) { console.log("FALTA: el árbol tiene cambios sin commit"); return 1; }
  let remota = "";
  try { remota = git("ls-remote", "origin", `refs/heads/${rama}`).split(/\s/)[0]; } catch (e) { throw new SinGithub(`git ls-remote falló: ${String(e?.message ?? e).split("\n")[0]}`); }
  if (remota !== head) { console.log(`FALTA: la rama remota ${rama} está en ${remota.slice(0, 12) || "(no existe)"}, no en ${head.slice(0, 12)}: empújala tú (aquí no se empuja)`); return 1; }
  try { git("fetch", "-q", "origin", "main"); } catch (e) { throw new SinGithub(`git fetch falló: ${String(e?.message ?? e).split("\n")[0]}`); }
  const p = await planear({ base: "origin/main", cabeza: "HEAD", mas });
  if (p.d.errores.length) { for (const e of p.d.errores) console.log(`✗ ${e}`); console.log("no se lanzó nada"); return 1; }
  const nombres = p.d.pruebas.map((t) => t.nombre), o = ordenDirigida({ rama, nombres, repo });
  if (!o) { console.log("FALTA: la dirigida está vacía (nada del diff nombra una prueba): añade --mas \"…\""); return 1; }
  // AV · Antes de lanzar nada en GitHub, la parte directa de la selección corre aquí (salvo --sin-local, dicho).
  if (!(await antesDeLanzar({ archivos: p.archivos, head, sinLocal }))) return 1;
  return lanzarYEsperar({ repo, rama, head, o });
}

/* La dirigida y el repaso se lanzan y se esperan igual: la orden sale SIEMPRE de ordenDirigida (en partes) y aquí no se toca. */
async function lanzarYEsperar({ repo, rama, head, o }) {
  console.log(`lanzo: ${comoTexto(o)}`);
  const r0 = await correrYBuscar({ repo, wf: "ci.yml", rama, args: o, coincide: (r) => r.head_sha === head });
  console.log(`corrida ${r0.id}: ${r0.html_url} · espero sondeando cada ${SONDEO_MS / 1000} s`);
  const r = await esperarCorrida(repo, r0.id, 240);
  const js = trabajosDe(repo, r.id);
  let inestables = "";
  const tub = js.find((j) => /^la tubería /.test(nombreJ(j)));
  if (tub) { try { inestables = (/inestables de la corrida: (\d+)[^\n]*/.exec(utiles(registroDe(repo, tub.id), 400).join("\n"))?.[0]) ?? ""; } catch { /* sin registro */ } }
  for (const j of js) console.log(`  ${verde(j) ? "verde " : j.conclusion === "skipped" ? "saltado" : "ROJO  "} ${nombreJ(j)}${j.conclusion && !["success", "skipped"].includes(j.conclusion) ? ` (${j.conclusion})` : ""}`);
  if (inestables) console.log(`  ${/: 0 /.test(inestables) ? "" : "INESTABLE · "}${inestables}`);
  console.log(`corrida ${r.id}: ${r.conclusion}`);
  for (const j of js.filter((x) => x.conclusion && !["success", "skipped"].includes(x.conclusion)).slice(0, 3)) {
    console.log(`\n── ${nombreJ(j)} · las 30 últimas líneas útiles:`);
    try { for (const l of utiles(registroDe(repo, j.id), 30)) console.log(`  ${l.slice(0, 300)}`); } catch (e) { console.log(`  (no pude leer el registro: ${String(e?.message ?? e).split("\n")[0]})`); }
  }
  return r.conclusion === "success" ? 0 : 1;
}

const tenerCommit = (sha) => SHA40.test(sha ?? "") && (gitOk("cat-file", "-e", `${sha}^{commit}`) || gitOk("fetch", "-q", "origin", sha));

/** La API y git de verdad para buscarEvidencia y prepararRepaso (con memoria: la misma corrida, el mismo registro o la misma propuesta no se piden
    dos veces). Lo único que cmdSubir y cmdRepaso les pasan. */
export function ioReal(repo, rama) {
  const memo = new Map(), m = (k, f) => { if (!memo.has(k)) memo.set(k, f()); return memo.get(k); };
  return {
    corrida: (id) => m(`c${id}`, () => api(`repos/${repo}/actions/runs/${id}`)),
    corridas: () => m("todas", () => api(`repos/${repo}/actions/workflows/ci.yml/runs?branch=${encodeURIComponent(rama)}&per_page=100`).workflow_runs ?? []),
    trabajos: (id) => m(`t${id}`, () => trabajosDe(repo, id)),
    trabajosIntento: (id, n) => m(`t${id}/${n}`, () => trabajosDeIntento(repo, id, n)),
    registro: (id) => m(`r${id}`, () => registroDe(repo, id)),
    tenerCommit: (sha) => tenerCommit(sha),
    arbol: (sha) => git("rev-parse", `${sha}^{tree}`).trim(),
    difNombres: (a, b) => git("diff", "--no-renames", "--name-only", "-z", a, b).split("\0").filter(Boolean),
    esAncestro: (sha) => gitOk("merge-base", "--is-ancestor", sha, "HEAD"),
    planear: (base, mas) => m(`p${base}\0${mas.join(" ")}`, () => planear({ base, cabeza: "HEAD", mas })),
  };
}

async function cmdRepaso({ id, mas, ensayo, sinLocal = false }) {
  const repo = REPO, rama = ramaActual(), head = git("rev-parse", "HEAD").trim();
  const entera = "toca la dirigida entera: node scripts/ci/subir.mjs --dirigida";
  if (!/^\d+$/.test(String(id ?? ""))) { console.log("FALTA: --repaso <id de la corrida roja> (el número de la corrida de la dirigida que salió roja)"); return 1; }
  if (git("status", "--porcelain").trim()) { console.log("FALTA: el árbol tiene cambios sin commit"); return 1; }
  let remota = "";
  try { remota = git("ls-remote", "origin", `refs/heads/${rama}`).split(/\s/)[0]; } catch (e) { throw new SinGithub(`git ls-remote falló: ${String(e?.message ?? e).split("\n")[0]}`); }
  if (remota !== head) { console.log(`FALTA: la rama remota ${rama} está en ${remota.slice(0, 12) || "(no existe)"}, no en ${head.slice(0, 12)}: empújala tú (aquí no se empuja)`); return 1; }
  try { git("fetch", "-q", "origin", "main"); } catch (e) { throw new SinGithub(`git fetch falló: ${String(e?.message ?? e).split("\n")[0]}`); }
  // R1, el arreglo entre A y HEAD, las corridas no verdes posteriores y la lista: todo en prepararRepaso (probado con un io de mentira en los casos).
  const r = await prepararRepaso({ id, rama, repo, mas, io: ioReal(repo, rama) });
  if (!r.ok) { console.log(`FALTA: ${r.motivo} · ${entera}`); return 1; }
  const { run, a, A, extra, posteriores, pt, lista } = r, nombres = lista.map((t) => t.nombre);
  const v = validarConCorredor(nombres);
  if (!v.ok) { console.log(`FALTA: los nombres del repaso no pasan pruebas/correr.mjs --comprobar: ${v.motivo}`); return 1; }
  const o = ordenDirigida({ rama, nombres, repo });
  if (!o) { console.log("FALTA: el repaso está vacío"); return 1; }
  console.log(`repaso (decisión AU) · R1 = corrida ${a.id}${run.html_url ? ` (${run.html_url})` : ""} · A = ${A.slice(0, 12)} · HEAD = ${head.slice(0, 12)}`);
  console.log(`  rojas de R1: ${a.rojas.join(" ")}${a.inestables.length ? ` · inestables de R1: ${a.inestables.join(" ")}` : ""}${extra.length ? ` · rojas de corridas no verdes posteriores (${posteriores.map((x) => x.id).join(", ")}): ${extra.join(" ")}` : ""}`);
  console.log(`  ${nombres.length} prueba(s) en vez de ${pt.d.pruebas.length} (la dirigida entera de esta cabeza); «al revés» corre entero como siempre:`);
  for (const t of lista) console.log(`  · ${t.nombre} (${t.por.join("; ")})`);
  // AV · Antes de lanzar (también en el ensayo): las rojas de R1 y la parte directa de lo cambiado desde A corren aquí (salvo --sin-local, dicho).
  if (!(await antesDeLanzar({ archivos: r.difAHead, head, primero: a.rojas, sinLocal }))) return 1;
  if (ensayo) { console.log(`ensayo: lanzaría ${comoTexto(o)}`); return 0; }
  return lanzarYEsperar({ repo, rama, head, o });
}

/** Lo que la vía rápida de diseño imprime al final de un --subir que empujó: dónde corren las pruebas que no se esperaron. No espera esa corrida. */
function avisoDespues({ repo, head, pruebas, codigo = false }) {
  let url = "";
  try { url = (api(`repos/${repo}/actions/workflows/ci.yml/runs?event=push&branch=main&head_sha=${head}&per_page=5`).workflow_runs ?? [])[0]?.html_url ?? ""; } catch { /* sin API: se dice cómo encontrarla */ }
  const donde = url || `la del commit ${head.slice(0, 12)} en https://github.com/${repo}/actions/workflows/ci.yml?query=branch%3Amain+event%3Apush (o: gh run list --repo ${repo} --workflow ci.yml --branch main --event push --commit ${head})`;
  if (codigo) console.log(`VÍA RÁPIDA DE CÓDIGO (AV): la punta a punta entera y «al revés» corren DESPUÉS, en la corrida de push de main: ${donde}`);
  else console.log(`VÍA RÁPIDA DE DISEÑO (AL): las pruebas de punta a punta y al revés corren DESPUÉS, en la corrida de push de main: ${donde}`);
  console.log(`  pruebas que la dirigida habría propuesto (${codigo ? "ya corrieron aquí; " : ""}mirarlas en esa corrida): ${pruebas.map((t) => t.nombre).join(" ") || "(ninguna: nada del diff nombra una prueba)"} · y «al revés» entero`);
  console.log(`  esta herramienta NO espera esa corrida: lo que cace se arregla en el bloque siguiente y se anota en REVISION (AD, ${codigo ? "AV" : "AL"})`);
}

// Las comprobaciones locales de --subir.
// 24 nov (fundador: «un cambio pequeño tarda 30 min»; decisión AR) · Corren A LA VEZ, no una detrás de otra. Medido: en serie 5,3 min (tipos 10 s +
// build 171 s + guardianes 100 s + textos 36 s); a la vez y sin el build (lo hace el servidor), 58 s. Los guardianes no repiten la comprobación de
// los textos cuando textos va en su propio paso (GUARDIANES_SIN_TEXTOS=1: el guardián alrevesConSuTexto corre textos.cjs entero, ~19 s).
export const PASOS_LOCALES = Object.freeze({
  tipos: ["pnpm", ["exec", "turbo", "run", "typecheck", "--force"]],
  guardianes: [process.execPath, ["guardianes/run.mjs"]],
  textos: [process.execPath, ["pruebas/alreves/textos.cjs"]],
});

/* Un paso local, sin bloquear (para correr varios a la vez). Devuelve la misma línea «CORRIÓ/FALTA» de siempre, con su tiempo. */
function correrPaso(k, env) {
  const [cmd, a] = PASOS_LOCALES[k], t0 = Date.now(), MAX = 256 * 1024;
  return new Promise((listo) => {
    let out = "", err = "", fin = false;
    const termina = (status, extra = "") => {
      if (fin) return; fin = true; clearTimeout(reloj);
      const ult = [out, err].map((x) => String(x ?? "").split("\n").filter((l) => l.trim()).slice(-1)[0] ?? "").find(Boolean) ?? extra;
      listo(status === 0 ? { ok: true, linea: `CORRIÓ: ${k} en verde (${Math.round((Date.now() - t0) / 1000)} s) · ${ult.slice(0, 200)}` }
        : { ok: false, linea: `FALTA: ${k} en verde (salió con ${status}) · ${ult.slice(0, 300)}` });
    };
    const ch = spawn(cmd, a, { cwd: RAIZ, env, stdio: ["ignore", "pipe", "pipe"] });
    const reloj = setTimeout(() => { ch.kill("SIGTERM"); termina(null, "pasó de 30 min"); }, 30 * 60_000);
    ch.stdout.on("data", (d) => { out = (out + d).slice(-MAX); });
    ch.stderr.on("data", (d) => { err = (err + d).slice(-MAX); });
    ch.on("error", (e) => termina(null, String(e?.message ?? e)));
    ch.on("close", (status) => termina(status));
  });
}
/* Los pasos locales a la vez (ver PASOS_LOCALES). El orden de las líneas es el de la lista, como antes. */
export async function correrLocales(locales, correr = correrPaso) {
  const raros = locales.filter((k) => !PASOS_LOCALES[k]);
  if (raros.length) throw new Error(`pasos locales desconocidos: ${raros.join(", ")}`);
  const conTextos = locales.includes("textos");
  // Sin heredar la variable: los guardianes que corren solos comprueban los textos aunque quien llama la tenga puesta (el guardián subidaConHerramienta
  // corre --casos desde dentro de unos guardianes que sí la tienen).
  const env = (k) => { const e = { ...process.env }; delete e.GUARDIANES_SIN_TEXTOS; if (k === "guardianes" && conTextos) e.GUARDIANES_SIN_TEXTOS = "1"; return e; };
  return Promise.all(locales.map((k) => correr(k, env(k))));
}

async function cmdSubir({ ensayo, sinViaRapida = false }) {
  const repo = REPO, rama = ramaActual();
  let falta = 0;
  const linea = (x) => { console.log(x.linea ?? x); if (x.ok === false) falta++; };
  // a.
  try { git("fetch", "-q", "origin", "main", "pruebas"); } catch (e) { throw new SinGithub(`git fetch falló: ${String(e?.message ?? e).split("\n")[0]}`); }
  const head = git("rev-parse", "HEAD").trim(), arbolHead = git("rev-parse", "HEAD^{tree}").trim();
  console.log(`subir ${head.slice(0, 12)} (árbol ${arbolHead.slice(0, 12)}) desde ${rama}${ensayo ? " · ENSAYO: no se empuja nada" : ""}`);
  const base = comprobarBase({ limpio: !git("status", "--porcelain").trim(), mainEsAncestro: gitOk("merge-base", "--is-ancestor", "origin/main", "HEAD"), pruebasEsAncestro: gitOk("merge-base", "--is-ancestor", "origin/pruebas", "HEAD") });
  base.forEach(linea);
  // AV · El estado de main ANTES de decidir: con main en rojo (o sin saberlo) el código no sale por la vía rápida; diseño sí, avisando.
  const main = leerMain(repo);
  const p = await planear({ base: "origin/main", cabeza: "HEAD", mas: [], sinViaRapida, main });
  const rapida = p.ex.corrida === "despues", deCodigo = p.ex.pruebasAqui === true;
  console.log(`clases: ${p.c.clases.join(", ") || "(código de producto)"}${p.c.soloDocumentos ? " · SOLO documentos" : ""} · dirigida propuesta: ${p.d.pruebas.map((t) => t.nombre).join(" ") || "(vacía)"}${p.d.alrevesEntero ? " + al revés entero" : ""}`);
  if (main.estado !== "verde") console.log(`AVISO: ${main.estado === "rojo" ? main.motivo : `no sé si main está en verde (${main.motivo})`}: lo de main va primero (AV)${rapida && !deCodigo ? "; la vía rápida de diseño sigue (AN)" : ""}`);
  if (!p.c.soloDocumentos) console.log(deCodigo ? `VÍA RÁPIDA DE CÓDIGO (AV): tipos, guardianes y textos y las pruebas de lo tocado aquí (${p.local.n}, ~${Math.ceil(p.local.seg / 60)} min: ${p.local.lista.map((t) => t.nombre).join(" ")}); la punta a punta entera y «al revés» corren DESPUÉS, en la corrida del push a main`
    : rapida ? "VÍA RÁPIDA DE DISEÑO (AL): tipos, guardianes y textos aquí (sin build: la imagen la construye el servidor); la punta a punta y «al revés» corren DESPUÉS, en la corrida del push a main"
    : `camino normal${p.c.diseno && sinViaRapida ? " (--sin-via-rapida)" : ` (vía rápida de diseño: no · ${p.c.noDiseno}; de código: no · ${p.ex.noRapida || p.c.noCodigo || "sin motivo"})`}`);
  for (const e of p.d.errores) linea({ ok: false, linea: `FALTA: ${e}` });
  // b.
  if (base.every((x) => x.ok)) {
    const t0 = Date.now();
    for (const x of await correrLocales(p.ex.locales)) linea(x);
    console.log(`  (comprobaciones locales a la vez: ${Math.round((Date.now() - t0) / 1000)} s en total)`);
    if (git("status", "--porcelain").trim()) linea({ ok: false, linea: "FALTA: las comprobaciones dejaron el árbol cambiado" });
    // AV · Las pruebas de lo tocado, aquí, DESPUÉS de tipos, guardianes y textos (las al revés cambian archivos: nunca a la vez que los guardianes).
    if (deCodigo) {
      if (falta) console.log("NO CORRIÓ: las pruebas de lo tocado (antes falta lo de arriba)");
      else {
        await pruebasAqui({ pruebas: p.d.pruebas, cabeza: p.head, archivos: p.archivos, decir: linea });
        if (git("status", "--porcelain").trim()) linea({ ok: false, linea: "FALTA: las pruebas de lo tocado dejaron el árbol cambiado" });
      }
    }
  } else console.log(`NO CORRIÓ: ${p.ex.locales.join(", ")}${deCodigo ? " y las pruebas de lo tocado" : ""} (antes falta a.)`);
  // c.
  if (p.ex.corrida === "ninguna") console.log("CORRIÓ: evidencia del CI no exigida (solo documentos de trabajo)");
  else if (rapida && deCodigo) console.log("NO SE EXIGE: evidencia del CI antes de subir (vía rápida de código, AV): las pruebas de lo tocado corrieron aquí; la punta a punta entera y «al revés» corren después, en la corrida del push a main");
  else if (rapida) console.log("NO SE EXIGE: evidencia del CI antes de subir (vía rápida de diseño, AL): la punta a punta y «al revés» corren después, en la corrida del push a main");
  else {
    // La corrida verde que cubra la propuesta o, en el camino de la dirigida, la cadena R1 roja + R2 repaso (decisión AU): todo en buscarEvidencia,
    // con la API y git de verdad (ioReal); los casos la prueban con un io de mentira.
    const { hallada, cadena, motivos, motivosCadena } = await buscarEvidencia({ p, rama, repo, arbolHead, io: ioReal(repo, rama) });
    linea(hallada ? { ok: true, linea: `CORRIÓ: evidencia del CI · corrida ${hallada.id} (${hallada.event}, ${hallada.head_sha.slice(0, 12)}) en verde, de este árbol${hallada.head_sha === head ? "" : " salvo documentos de trabajo"}` }
      : cadena ? { ok: true, linea: `CORRIÓ: evidencia del CI encadenada (decisión AU) · R1 = dirigida ${cadena.r1.id} roja (${cadena.r1.head_sha.slice(0, 12)}; rojas: ${cadena.v.rojas.join(" ")}) + R2 = repaso ${cadena.r2.id} en verde, de este árbol${cadena.r2.head_sha === head ? "" : " salvo documentos de trabajo"}` }
      : { ok: false, linea: `FALTA: evidencia del CI para este árbol (${p.ex.corrida === "completa" ? "corrida COMPLETA" : "la dirigida propuesta, o una dirigida roja + su repaso en verde"} en ${rama}) · ${motivos.slice(0, 3).join(" · ") || "ninguna corrida en verde en la rama"}` });
    // Los motivos de la cadena, aparte: detrás de los de las corridas verdes no se veían.
    if (!hallada && !cadena) for (const m of motivosCadena.slice(0, 4)) console.log(`  cadena ${m}`);
  }
  const remotaRama = (() => { try { return git("ls-remote", "origin", `refs/heads/${rama}`).split(/\s/)[0]; } catch { return ""; } })();
  const plan = planDeEmpuje({ clases: p.c.clases, rama, remotaRama, head });
  if (falta || ensayo) {
    console.log(`${falta ? `no se sube: ${falta} cosa(s) FALTA` : "ensayo: todo está"} · empujaría, en este orden:`);
    for (const s of plan) console.log(`  · ${s.tipo === "push" ? "git " + s.args.join(" ") : s.tipo === "esperar-imagenes" ? "esperar «verificación · imágenes» en verde en la corrida de ese push a main" : "git ls-remote: main y pruebas en " + head.slice(0, 12)}`);
    if (rapida) console.log(`  · y al final diría dónde corren DESPUÉS la punta a punta y «al revés» (vía rápida de ${deCodigo ? "código, AV" : "diseño, AL"}), sin esperarlas`);
    console.log(`  · y al final: ${ordenVigilar(head)}`);
    return falta ? 1 : 0;
  }
  // d.
  for (const s of plan) {
    if (s.tipo === "push") {
      const r = spawnSync("git", s.args, { cwd: RAIZ, encoding: "utf8" });
      if (r.status !== 0) { console.log(`FALTA: git ${s.args.join(" ")} falló: ${(r.stderr || "").trim().split("\n").slice(-2).join(" · ")}`); return 1; }
      console.log(`CORRIÓ: git ${s.args.join(" ")}`);
    } else if (s.tipo === "esperar-imagenes") {
      let run = null;
      for (let i = 0; i < 24 && !run; i++) { await esperar(SONDEO_MS); run = (api(`repos/${repo}/actions/workflows/ci.yml/runs?event=push&branch=main&head_sha=${head}&per_page=5`).workflow_runs ?? [])[0] ?? null; }
      if (!run) { console.log("FALTA: no apareció la corrida del push a main (main quedó empujado; pruebas NO)"); return 1; }
      let img = null;
      for (const fin = Date.now() + 40 * 60_000; Date.now() < fin;) {
        img = trabajosDe(repo, run.id).find((j) => /^verificación · imágenes /.test(nombreJ(j)));
        if (img?.status === "completed") break;
        await esperar(SONDEO_MS);
      }
      if (!verde(img)) { console.log(`FALTA: «verificación · imágenes» de la corrida ${run.id} terminó ${img?.status}/${img?.conclusion} (main quedó empujado; pruebas NO)`); console.log(ordenVigilar(head)); return 1; }
      console.log(`CORRIÓ: «verificación · imágenes» en verde en la corrida ${run.id}`);
    } else {
      const ls = git("ls-remote", "origin", "refs/heads/main", "refs/heads/pruebas");
      const en = Object.fromEntries(ls.trim().split("\n").map((l) => l.split(/\s+/)).map(([s, ref]) => [ref, s]));
      const ok = en["refs/heads/main"] === head && en["refs/heads/pruebas"] === head;
      console.log(ok ? `CORRIÓ: git ls-remote: main y pruebas en ${head.slice(0, 12)}` : `FALTA: git ls-remote: main en ${String(en["refs/heads/main"]).slice(0, 12)}, pruebas en ${String(en["refs/heads/pruebas"]).slice(0, 12)}`);
      if (!ok) return 1;
    }
  }
  // e.
  const fin = Date.now() + 12 * 60_000;
  let ult = null;
  while (Date.now() < fin) {
    const r0 = await correrYBuscar({ repo, wf: "estado-sandbox.yml", rama: "main", args: ["workflow", "run", "estado-sandbox.yml", "--repo", repo, "--ref", "main"], coincide: () => true });
    const r = await esperarCorrida(repo, r0.id, 10);
    const mirar = trabajosDe(repo, r.id).find((j) => j.name === "mirar");
    ult = estadoDelSandbox(mirar ? registroDe(repo, mirar.id) : "", head);
    if (ult.sirve) break;
    // 24 nov · Antes 90 s entre miradas: el aviso llegaba hasta 2,5 min después de que el sandbox ya lo servía. Cada mirada ya tarda ~35 s (arranca una
    // corrida de estado-sandbox), así que con el sondeo de 25 s se mira más o menos cada minuto.
    console.log(`  el sandbox sirve ${ult.servido || "(nada)"} todavía · otra mirada en ${SONDEO_MS / 1000} s`);
    await esperar(SONDEO_MS);
  }
  if (ult?.tramos) console.log(`  ${ult.tramos}`);
  for (const l of ult?.rutas ?? []) console.log(`  ${l}`);
  if (!ult?.sirve) {
    console.log(`FALTA: en 12 min el sandbox no sirve ${head.slice(0, 12)} (sirve ${ult?.servido || "(nada)"}); no se deshace nada`);
    if (rapida) avisoDespues({ repo, head, pruebas: p.d.pruebas, codigo: deCodigo });
    console.log(ordenVigilar(head));
    return 1;
  }
  console.log(`CORRIÓ: el sandbox sirve ${head.slice(0, 12)}`);
  if (rapida) avisoDespues({ repo, head, pruebas: p.d.pruebas, codigo: deCodigo });
  // 24 nov (main estuvo 4 h en rojo sin que nadie lo viera) · La orden exacta para vigilar la corrida de main de lo que se subió. No se espera aquí.
  console.log(ordenVigilar(head));
  return 0;
}

/* ── --local: las pruebas de lo tocado, aquí, sin subir ni lanzar nada (AV) ─────────────────────────────────────────────────────────────────── */
async function cmdLocal({ mas, base = "origin/main" }) {
  if (git("status", "--porcelain").trim()) { console.log("FALTA: el árbol tiene cambios sin commit (las pruebas de lo tocado corren sobre HEAD: haz commit primero)"); return 1; }
  const p = await planear({ base, cabeza: "HEAD", mas });
  if (p.d.errores.length) { for (const e of p.d.errores) console.log(`✗ ${e}`); return 1; }
  console.log(`pruebas de lo tocado (la selección de la dirigida desde ${base}): ${p.local.n}, ~${Math.ceil(p.local.seg / 60)} min · ${p.local.lista.map((t) => `${t.nombre} (~${t.s} s)`).join(" ") || "(ninguna)"}`);
  if (!p.local.n) { console.log("NO HAY: ninguna prueba nombra lo tocado (la vía rápida de código pediría el camino normal)"); return 0; }
  if (!p.local.ok) { console.log(`FALTA: ${p.local.motivo}`); return 1; }
  const ok = await pruebasAqui({ pruebas: p.d.pruebas, cabeza: p.head, archivos: p.archivos });
  if (git("status", "--porcelain").trim()) { console.log("FALTA: las pruebas de lo tocado dejaron el árbol cambiado"); return 1; }
  return ok ? 0 : 1;
}

/* ── --vigilar [<sha>]: la corrida de main de lo que se subió (24 nov: main estuvo 4 h en rojo sin que nadie lo viera) ──────────────────────── */
/** La orden que --subir imprime al final (no la espera). */
export const ordenVigilar = (sha) => `vigila la corrida de main: node scripts/ci/subir.mjs --vigilar ${sha}`;
/** De las corridas que da la API, la de ci.yml de un push a main de este repo para ese commit (la más nueva, si hubiera varias). */
export function elegirCorridaDeMain(corridas, sha, repo = REPO) {
  return (Array.isArray(corridas) ? corridas : []).filter((r) => r && r.path === ".github/workflows/ci.yml" && r.event === "push" && r.head_branch === "main" && r.head_sha === sha && r.repository?.full_name === repo)
    .sort((a, b) => Number(b.id) - Number(a.id))[0] ?? null;
}
/** Lo que dice un trabajo rojo: sus líneas ✗ y FALLÓ (sin el guion que GitHub enseña); si no hay, sus últimas líneas útiles. */
export function fallosDelRegistro(texto, n = 30) {
  // El guion del paso que GitHub enseña en cian (\x1b[36;1m…) no cuenta: se quita antes; los demás colores se borran.
  const ls = lineasDe(texto).filter((l) => l.trim() && !/^\x1b?\[36;1m|^##\[(group|endgroup)\]/.test(l)).map((l) => l.replace(/\x1b?\[[0-9;]*m/g, ""));
  const f = [...new Set(ls.filter((l) => /✗|FALLÓ|##\[error\]/.test(l)).map((l) => l.trim()))];
  return (f.length ? f : ls.map((l) => l.trim())).slice(-n);
}
/** Verde o rojo de la corrida de main (sale 0 solo en verde). */
export function veredictoDeMain(run, trabajos = []) {
  if (!run || run.status !== "completed") return { ok: false, linea: `la corrida de main no terminó (${run?.status ?? "sin corrida"})` };
  const rojos = trabajos.filter((j) => j?.conclusion && !["success", "skipped"].includes(j.conclusion));
  if (run.conclusion === "success") return { ok: true, linea: `VERDE: la corrida ${run.id} de main (${String(run.head_sha).slice(0, 12)}) terminó en verde`, rojos };
  return { ok: false, linea: `ROJO: la corrida ${run.id} de main (${String(run.head_sha).slice(0, 12)}) terminó ${run.conclusion}${rojos.length ? `; trabajos rojos: ${rojos.map((j) => nombreJ(j)).join(" · ")}` : ""}`, rojos };
}

async function cmdVigilar({ sha }) {
  const repo = REPO;
  let objetivo = sha;
  if (!objetivo) { try { git("fetch", "-q", "origin", "main"); } catch (e) { throw new SinGithub(`git fetch falló: ${String(e?.message ?? e).split("\n")[0]}`); } objetivo = "origin/main"; }
  try { objetivo = git("rev-parse", "--verify", `${objetivo}^{commit}`).trim(); } catch { if (!SHA40.test(String(objetivo))) { console.log(`FALTA: «${sha}» no es un commit`); return 1; } }
  console.log(`vigilo la corrida de ci.yml del push a main de ${objetivo.slice(0, 12)} · sondeo cada ${SONDEO_MS / 1000} s`);
  let run = null;
  for (let i = 0; i < 48 && !run; i++) {
    run = elegirCorridaDeMain(api(`repos/${repo}/actions/workflows/ci.yml/runs?event=push&branch=main&head_sha=${objetivo}&per_page=10`).workflow_runs ?? [], objetivo, repo);
    if (!run) await esperar(SONDEO_MS);
  }
  if (!run) { console.log(`FALTA: en 20 min no apareció ninguna corrida de ci.yml del push a main de ${objetivo.slice(0, 12)} (¿se empujó a main?)`); return 1; }
  console.log(`corrida ${run.id}: ${run.html_url ?? ""}`);
  const r = await esperarCorrida(repo, run.id, 240);
  const js = trabajosDe(repo, r.id);
  for (const j of js) console.log(`  ${verde(j) ? "verde " : j.conclusion === "skipped" ? "saltado" : "ROJO  "} ${nombreJ(j)}${j.conclusion && !["success", "skipped"].includes(j.conclusion) ? ` (${j.conclusion})` : ""}`);
  const v = veredictoDeMain(r, js);
  console.log(v.linea);
  for (const j of v.rojos ?? []) {
    console.log(`\n── ${nombreJ(j)} · lo que falló:`);
    try { for (const l of fallosDelRegistro(registroDe(repo, j.id))) console.log(`  ${l.slice(0, 300)}`); } catch (e) { console.log(`  (no pude leer el registro: ${String(e?.message ?? e).split("\n")[0]})`); }
  }
  return v.ok ? 0 : 1;
}

/* ── Casos ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
async function casos() {
  let bien = 0, total = 0;
  const ok = (c, que) => { total++; if (c) bien++; console.log(`  ${c ? "✓" : "✗"} ${que}`); };
  const [D0, D1] = DOCUMENTOS;
  const s = (c) => "0123456789abcdef"[c % 16].repeat(40);
  const REP = REPO, rama = "claude/prueba";
  // Clases.
  let c = clases([D0]);
  ok(c.soloDocumentos && c.clases.join() === "documentos" && exigencias(c).corrida === "ninguna" && exigencias(c).locales.join() === "guardianes", `solo ${D0} → documentos, sin corrida, solo guardianes`);
  c = clases([D0, "apps/web/app/page.tsx"]);
  ok(!c.soloDocumentos && exigencias(c).corrida === "dirigida", "documentos + código → no es solo documentos: dirigida");
  c = clases(["infra/pruebas/deploy.sh"]);
  const pe = planDeEmpuje({ clases: c.clases, rama: rama, remotaRama: s(1), head: s(1) });
  ok(c.clases.includes("despliegue") && c.clases.includes("sensible") && exigencias(c).mainPrimero && pe[0].args.join(" ") === "push origin HEAD:main" && pe[1].tipo === "esperar-imagenes" && pe[2].args.join(" ") === "push origin HEAD:pruebas", "toca infra/pruebas/deploy.sh → despliegue + sensible; main primero, esperar imágenes, después pruebas");
  const pn = planDeEmpuje({ clases: ["herramientas"], rama: rama, remotaRama: s(2), head: s(1) });
  ok(pn[0].args.join(" ") === `push origin HEAD:refs/heads/${rama}` && pn[1].args.join(" ") === "push --atomic origin HEAD:main HEAD:pruebas", "sin despliegue: la rama si hace falta y después push --atomic de main y pruebas juntos");
  ok([...pe, ...pn].every((x) => !x.args || !x.args.some((a) => (a.startsWith("-") && a !== "--atomic") || a.startsWith("+") || /produc/.test(a))), "ningún empuje forzado ni a la rama de producción");
  for (const f of [".dockerignore", "infra/pruebas/Dockerfile", "infra/pruebas/docker-compose.yml", "infra/pruebas/nginx-pruebas.conf", "packages/db/migrar.sh", "services/video/Dockerfile", "scripts/semilla/demos/grupo-1.mjs", "pruebas/infra/correr.sh"])
    if (!esDespliegue(f)) ok(false, `${f} es despliegue`);
  ok(["apps/web/app/page.tsx", "packages/ui/src/boton.tsx", D0].every((f) => !esDespliegue(f)) && esDespliegue("infra/produccion/base/Dockerfile"), "la lista de despliegue: lo de la imagen y el despliegue sí, una pantalla no");
  c = clases(["apps/web/lib/visitas.ts"], { "apps/web/lib/visitas.ts": ["  const t = monto_centavos * 2;"] });
  ok(c.clases.includes("sensible") && /centavos/.test(c.motivos.join()), "una señal en los renglones (centavos) sube a sensible");
  c = clases(["apps/web/lib/orden.ts"], { "apps/web/lib/orden.ts": ['"use server";'] });
  ok(c.clases.includes("sensible"), "«use server» en los renglones sube a sensible");
  c = clases([D0], { [D0]: ["update x set y = 1; centavos; grant"] });
  ok(!c.clases.includes("sensible") && c.soloDocumentos, "las señales no cuentan en los documentos de trabajo");
  ok(!clases(["pruebas/e2e/x.cjs"], { "pruebas/e2e/x.cjs": ["sql(`update t set a = 1`)"] }).clases.includes("sensible"), "ni en las pruebas (escriben SQL a propósito)");
  ok(clases(["apps/web/app/admin/layout.tsx"]).clases.includes("sensible") && clases(["apps/web/lib/pagos/stripe.ts"]).clases.includes("sensible") && clases(["scripts/ci/subir.mjs"]).clases.includes("sensible"), "admin, pagos y la propia herramienta son sensibles por ruta");
  c = clases([".github/workflows/ci.yml"]);
  ok(c.clases.includes("herramientas") && exigencias(c).corrida === "completa", "toca .github/ → herramientas y corrida COMPLETA (AM)");
  // La vía rápida de diseño (AL).
  const FN = "apps/web/app/(app)/n/[id]/FichaNueva.tsx", PF = "packages/ui/src/core/PestanasFicha.tsx", LA = "docs/LAUNCH-CHECKLIST.md";
  const rl = { [FN]: ["  const [pegadaM, setPegadaM] = useState(false);", '<div className="sticky z-[21] h-0" style={{ top: CAB_MOVIL }}>'], [PF]: ['style={{ overflowY: "hidden", overscrollBehaviorX: "contain" }}'], [LA]: ["- [ ] la franja del nombre"] };
  const dis = (fs, r = rl, o) => { const x = clases(fs, r); return { x, e: exigencias(x, o) }; };
  const esRapida = (e) => e.corrida === "despues" && !e.mainPrimero && ["tipos", "guardianes", "textos"].every((k) => e.locales.includes(k)) && !e.locales.includes("build");
  let v = dis([FN, PF, LA]);
  ok(v.x.diseno && v.x.clases.join() === "diseno" && esRapida(v.e), "FichaNueva.tsx + PestanasFicha.tsx + LAUNCH → diseño: sin corrida previa, tipos, guardianes y textos (sin build local: lo construye el servidor)");
  v = dis([FN, PF, LA, D1]);
  ok(v.x.diseno && esRapida(v.e), "lo mismo + un documento de trabajo → sigue siendo diseño");
  v = dis([FN, PF, LA, "apps/web/lib/ficha.ts"], { ...rl, "apps/web/lib/ficha.ts": ["export const x = 1;"] });
  ok(!v.x.diseno && v.e.corrida === "dirigida" && /apps\/web\/lib\/ficha\.ts/.test(v.x.noDiseno), `lo mismo + un archivo de apps/web/lib/ → dirigida (${v.x.noDiseno})`);
  v = dis([FN, PF, LA], { ...rl, [FN]: [...rl[FN], '"use server";'] });
  ok(!v.x.diseno && v.e.corrida === "dirigida" && v.x.clases.includes("sensible") && /use server/.test(v.x.noDiseno), "lo mismo + «use server» en un renglón → sensible y dirigida");
  v = dis([FN, PF, LA], { ...rl, [FN]: [...rl[FN], 'import { borrar } from "./acciones";'] });
  ok(!v.x.diseno && v.e.corrida === "dirigida" && /import/.test(v.x.noDiseno), "lo mismo + un import de acciones en un renglón → dirigida");
  v = dis([FN, PF, LA], { ...rl, [FN]: [...rl[FN], "  const r = await fetch(url);"] });
  ok(!v.x.diseno && v.e.corrida === "dirigida", "lo mismo + await/fetch en un renglón → dirigida");
  v = dis([FN, PF, LA], { ...rl, [PF]: ["const total_centavos = a + b;"] });
  ok(!v.x.diseno && v.e.corrida === "dirigida" && v.x.clases.includes("sensible"), "una pieza de packages/ui con «centavos» en un renglón → sensible y dirigida");
  for (const f of ["apps/web/app/admin/Tabla.tsx", "apps/web/app/panel/[id]/Hoy.tsx", "apps/web/app/(app)/n/[id]/pagar/Pagar.tsx", "apps/web/app/(app)/n/[id]/Pagar.tsx", "packages/ui/src/ds/admin/AdminBar.js", "packages/ui/src/ds/booking/PaymentSummary.js"]) {
    v = dis([f], { [f]: ["<div />"] });
    if (v.x.diseno || v.e.corrida !== "dirigida") ok(false, `${f} (admin, panel o pagar en la ruta) → dirigida`);
  }
  v = dis(["apps/web/app/admin/Tabla.tsx"], { "apps/web/app/admin/Tabla.tsx": ["<div />"] });
  ok(!v.x.diseno && v.x.clases.includes("sensible") && v.e.corrida === "dirigida" && !esRapida(dis(["apps/web/app/(app)/n/[id]/Pagar.tsx"], { "apps/web/app/(app)/n/[id]/Pagar.tsx": ["<div />"] }).e), "un .tsx bajo admin/panel/pagar (sensible por nombre, o «Pagar» con mayúscula) → dirigida");
  for (const f of ["apps/web/app/(app)/n/[id]/route.ts", "apps/web/app/x/route.tsx", "apps/web/app/(app)/n/[id]/acciones.ts", "apps/web/app/x/acciones-fiesta.tsx", "apps/web/app/(app)/n/[id]/page.tsx", "apps/web/app/layout.tsx", "apps/web/app/x/loading.tsx", "apps/web/app/api/x/Boton.tsx", "apps/web/app/x/local.ts", "apps/web/middleware.ts", "apps/web/next.config.ts"]) {
    v = dis([FN, f], { ...rl, [f]: ["<div />"] });
    if (v.x.diseno || v.e.corrida !== "dirigida") ok(false, `${f} → dirigida`);
  }
  ok(!dis(["apps/web/app/(app)/n/[id]/route.ts"], { "apps/web/app/(app)/n/[id]/route.ts": ["x"] }).x.diseno && !dis(["apps/web/app/x/acciones.ts"], { "apps/web/app/x/acciones.ts": ["x"] }).x.diseno && !dis(["apps/web/app/(app)/n/[id]/page.tsx"], { "apps/web/app/(app)/n/[id]/page.tsx": ["x"] }).x.diseno, "route.ts, acciones.ts y page.tsx → dirigida (nunca diseño)");
  v = dis(["packages/db/migraciones/0300_x.sql", FN], { ...rl, "packages/db/migraciones/0300_x.sql": ["select 1;"] });
  ok(!v.x.diseno && v.e.corrida === "dirigida", "una migración → dirigida");
  v = dis([".github/workflows/ci.yml", FN], { ...rl, ".github/workflows/ci.yml": ["x"] });
  ok(!v.x.diseno && v.e.corrida === "completa", ".github/ con una pantalla → completa");
  v = dis([D0, D1], {});
  ok(!v.x.diseno && v.e.corrida === "ninguna" && v.e.locales.join() === "guardianes", "solo documentos → como hoy (sin corrida, solo guardianes)");
  v = dis([FN, PF, LA], { [PF]: rl[PF] });
  ok(!v.x.diseno && /sin los renglones/.test(v.x.noDiseno), "un archivo de código sin sus renglones → no es diseño (duda)");
  v = dis([FN, PF, LA], rl, { sinViaRapida: true });
  ok(v.x.diseno && v.e.corrida === "dirigida" && !v.e.locales.includes("build"), "--sin-via-rapida → dirigida aunque sea diseño");
  // Con las listas de origin/main: manda lo más estricto.
  const cH = clases([FN, PF, LA], rl);
  const cMainEstricta = { ...cH, clases: ["sensible"], diseno: false, noDiseno: `${FN} no está en la lista blanca de diseño`, motivos: ["sensible: x"] };
  let k = combinar(cH, cMainEstricta);
  ok(!k.diseno && exigencias(k).corrida === "dirigida" && k.clases.includes("sensible") && /origin\/main/.test(k.noDiseno), "la lista de main más estricta que la de la cabeza → manda main (dirigida)");
  k = combinar(cH, { clases: [], soloDocumentos: false, github: false, alrevesEntero: false, motivos: [] });
  ok(!k.diseno && exigencias(k).corrida === "dirigida" && /todavía no tiene la vía rápida/.test(k.noDiseno), "main sin la vía rápida → camino normal");
  k = combinar(cH, null);
  ok(!k.diseno && exigencias(k).corrida === "dirigida", "sin poder juzgar con main (error o sin herramienta) → no es diseño");
  k = combinar(cH, clases([FN, PF, LA], rl));
  ok(k.diseno && esRapida(exigencias(k)), "cabeza y main la dan por diseño → vía rápida");
  k = combinar(clases([FN, "apps/web/lib/x.ts"], { ...rl, "apps/web/lib/x.ts": ["x"] }), clases([FN, PF, LA], rl));
  ok(!k.diseno && exigencias(k).corrida === "dirigida", "main más laxa que la cabeza → manda la cabeza (dirigida)");
  ok(!exigencias({ ...cH, clases: ["diseno", "sensible"] }).locales.includes("build") && exigencias({ ...cH, clases: ["diseno", "sensible"] }).corrida === "dirigida" && exigencias({ ...cH, github: true }).corrida === "completa", "exigencias nunca da la vía rápida con una clase vigilada o .github/, aunque diga diseño");
  ok(["apps/web/lib/x.tsx", "apps/web/app/api/x.tsx", "scripts/x.tsx", "infra/x.css", ".github/x.css", "guardianes/x.ts", "pruebas/e2e/x.png", "pruebas/alreves/x.png", "packages/db/x.ts"].every((f) => !esDiseno(f)) && [FN, PF, LA, "apps/web/app/globals.css", "apps/web/public/paginas/x.1a2b.webp", "docs/ayuda/es/pedir.md", "pruebas/visual/ficha/x.png"].every(esDiseno), "la lista blanca: lo de cómo se ve sí; lib, api, scripts, infra, .github, guardianes, pruebas y la base no");
  // La dirigida.
  const cat = catalogoDe(["pruebas/e2e/evt6c.cjs", "pruebas/e2e/adm7i.cjs", "pruebas/e2e/_ayuda.cjs", "pruebas/e2e/sub/x.cjs", "pruebas/alreves/alreves9vd.cjs", "pruebas/alreves/alrevesSubir.cjs"]);
  ok(cat.map((t) => t.nombre).join() === "evt6c,adm7i,alreves9vd,alrevesSubir", "el catálogo con la regla del corredor (sin «_», sin subcarpetas)");
  const buscar = (a) => ({ "lib/eventos.ts": ["pruebas/e2e/evt6c.cjs"], "ci/alcance.mjs": ["pruebas/alreves/alreves9vd.cjs"], "e2e/adm7i.cjs": ["pruebas/e2e/adm7i.cjs"] })[a] ?? [];
  let d = dirigida({ archivos: ["apps/web/lib/eventos.ts", "pruebas/e2e/adm7i.cjs", "scripts/ci/alcance.mjs"], catalogo: cat, buscar });
  ok(d.pruebas.map((t) => t.nombre).join() === "adm7i,evt6c,alreves9vd" && !d.alrevesEntero && !d.errores.length, `la dirigida: la cambiada + las que nombran un archivo cambiado (${d.pruebas.map((t) => t.nombre).join(" ")})`);
  ok(agujaDe("apps/web/lib/eventos.ts") === "lib/eventos.ts" && agujaDe(".dockerignore") === ".dockerignore", "la aguja lleva la carpeta inmediata");
  d = dirigida({ archivos: ["guardianes/run.mjs"], catalogo: cat, buscar: () => ["pruebas/alreves/alreves9vd.cjs", "pruebas/e2e/evt6c.cjs"] });
  ok(d.pruebas.map((t) => t.nombre).join() === "evt6c", "de guardianes/run.mjs solo se suman las de punta a punta que lo nombran (las al revés corren enteras)");
  ok(d.alrevesEntero && clases(["guardianes/run.mjs"]).alrevesEntero && clases(["pruebas/lib/arbol.cjs"]).alrevesEntero && clases(["pruebas/correr.mjs"]).alrevesEntero, "toca guardianes/run.mjs (o pruebas/correr.mjs, pruebas/lib/) → al revés entero");
  let lanzadas = 0;
  d = dirigida({ archivos: ["apps/web/lib/eventos.ts"], catalogo: cat, buscar, mas: ["zz9noexiste"] });
  const o1 = d.errores.length ? null : (lanzadas++, ordenDirigida({ rama, nombres: d.pruebas.map((t) => t.nombre) }));
  ok(d.errores.some((e) => /no existe la prueba «zz9noexiste»/.test(e)) && !o1 && lanzadas === 0, "un nombre inexistente en --mas → error antes de lanzar");
  d = dirigida({ archivos: ["apps/web/lib/eventos.ts"], catalogo: cat, buscar, mas: ["adm7i"], validar: () => ({ ok: false, motivo: "no existe: adm7i" }) });
  ok(d.errores.some((e) => /correr\.mjs --comprobar/.test(e)), "si pruebas/correr.mjs --comprobar no los acepta, también es error");
  ok(dirigida({ archivos: ["a.ts"], catalogo: cat, buscar, mas: ["--grupo"] }).errores.length === 1, "un --mas con forma de opción no pasa");
  ok(dirigida({ archivos: [], catalogo: cat, mas: ["adm7i"] }).pruebas.length === 1 && dirigida({ archivos: ["apps/web/lib/eventos.ts"], catalogo: cat, buscar, mas: ["adm7i"] }).pruebas.length === 2, "--mas suma, nunca resta");
  const o = ordenDirigida({ rama, nombres: ["evt6c", "adm7i"] });
  ok(o.join(" ") === `workflow run ci.yml --repo ${REP} --ref ${rama} -f alcance=regresion -f partes=${PARTES_DIRIGIDA} -f solo=evt6c adm7i` && PARTES_DIRIGIDA >= 4, "la orden de la dirigida: siempre alcance=regresion y en partes");
  ok(ordenDirigida({ rama, nombres: [] }) === null, "sin pruebas no hay orden (la dirigida vacía no lanza la regresión entera)");
  // La evidencia.
  const NO = (v, re) => !v.ok && re.test(v.motivo);
  const m = (v) => (v.ok ? "vale" : v.motivo);
  let jid = 500;
  const J = (name, conclusion = "success") => ({ id: jid++, name, status: "completed", conclusion });
  const trabajos = (x = {}) => {
    let js = [J("alcance (todo o solo documentos)"), J("verificación · señal rápida (tipos · guardianes · textos)"), J("verificación · contratos (Stripe)"), J("verificación · imágenes y producción como código"), J("verificación · base real (migraciones)"), J("tipos · build · guardianes"), J("seguridad · Semgrep"), J("web · build una vez para todos los grupos"),
      ...[1, 2, 3].map((i) => J(`punta a punta · al revés · ${i}/3`)), ...[1, 2, 3, 4].map((i) => J(`punta a punta · todas las fases · ${i}/4`)),
      J("dispositivo · ${{ matrix.id }}", "skipped"), J("confirmación · ${{ matrix.nombre }}", "skipped"), J("punta a punta · ancho ${{ matrix.id }}", "skipped"), J("la tubería (verde si todo lo que esta corrida pide salió en verde; el resumen dice qué no corr...")];
    if (x.completa) js = [...js.filter((j) => !/^(dispositivo|punta a punta · todas)/.test(j.name)), ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => J(`punta a punta · todas las fases · ${i}/8`)), ...["iphone-se", "iphone-15", "iphone-15-pro-max", "pixel", "galaxy", "ipad", "escritorio-1024", "escritorio-1280", "escritorio-1440"].map((n) => J(`dispositivo · ${n}`))];
    if (x.rojo) js = js.map((j) => (x.rojo.test(j.name) ? { ...j, conclusion: "failure" } : j));
    if (x.saltado) js = js.map((j) => (x.saltado.test(j.name) ? { ...j, conclusion: "skipped" } : j));
    if (x.sin) js = js.filter((j) => !x.sin.test(j.name));
    return js;
  };
  const SHA_RUN = s(3), ARBOL = s(4);
  const run = (x = {}) => ({ id: 77, head_sha: SHA_RUN, event: "workflow_dispatch", head_branch: rama, path: ".github/workflows/ci.yml", repository: { full_name: REP }, head_repository: { full_name: REP }, status: "completed", conclusion: "success", run_attempt: 1, ...x });
  const ev = (x = {}) => ({ corrida: 77, intento: 1, sha: SHA_RUN, arbol: ARBOL, evento: "workflow_dispatch", rama: rama, entradas: { alcance: "regresion", partes: "4", solo: "evt6c alreves9vd" }, solo: ["evt6c", "alreves9vd"], ...x });
  const reg = (e = ev()) => `﻿2026-11-22T14:05:07.0021101Z Current runner version\n2026-11-22T14:05:14.8774810Z [36;1m    console.log(["EVID", "ENCIA"].join("") + " " + j);[0m\n2026-11-22T14:05:15.1Z EVIDENCIA ${JSON.stringify(e)}\n2026-11-22T14:05:15.2Z ##[group]Run actions/upload-artifact@v4`;
  const prop = [{ nombre: "evt6c", carril: "e2e" }, { nombre: "alreves9vd", carril: "alreves" }];
  const E = (x = {}) => evaluarCorrida({ run: run(), trabajos: trabajos(), registro: reg(), rama: rama, repo: REP, arbolHead: ARBOL, arbolDeRun: ARBOL, difRunHead: [], propuesta: prop, ...x });
  ok(E().ok, "corrida verde de este árbol con la dirigida propuesta → vale");
  ok(!E({ arbolHead: s(5), difRunHead: ["apps/web/lib/eventos.ts"] }).ok && /otro árbol/.test(E({ arbolHead: s(5), difRunHead: ["apps/web/lib/eventos.ts"] }).motivo), "evidencia de otro árbol → FALTA");
  ok(E({ arbolHead: s(5), difRunHead: [D0] }).ok && E({ arbolHead: s(5), difRunHead: [D0, D1] }).ok, `evidencia de un árbol que difiere solo en ${D0} → vale`);
  ok(!E({ arbolHead: s(5), difRunHead: [D0, "apps/web/x.ts"] }).ok && !E({ arbolHead: s(5), difRunHead: [] }).ok, "documentos + código, o árbol distinto sin lista de diferencias → FALTA");
  ok(!E({ propuesta: [...prop, { nombre: "adm7i", carril: "e2e" }] }).ok && /faltan adm7i/.test(E({ propuesta: [...prop, { nombre: "adm7i", carril: "e2e" }] }).motivo), "corrida verde pero sin la prueba propuesta → FALTA");
  ok(E({ registro: reg(ev({ solo: "todas", entradas: { alcance: "regresion", partes: "4", solo: "" } })), propuesta: [...prop, { nombre: "adm7i", carril: "e2e" }] }).ok, "una regresión entera (solo vacío) cubre cualquier prueba de punta a punta");
  ok(!E({ trabajos: trabajos({ sin: /^punta a punta · todas las fases · 2\/4/ }) }).ok, "falta una parte de la punta a punta → FALTA");
  ok(!E({ trabajos: trabajos({ sin: /^punta a punta · al revés · 3\/3/ }) }).ok, "«al revés» sin todas sus partes → FALTA");
  ok(!E({ trabajos: trabajos({ rojo: /^la tubería / }) }).ok && /«la tubería» terminó completed\/skipped/.test(E({ trabajos: trabajos({ saltado: /^la tubería / }) }).motivo), "registro con la línea EVIDENCIA pero «la tubería» no verde (roja o saltada) → FALTA");
  ok(!E({ run: run({ conclusion: "failure" }) }).ok, "la corrida no está en verde según la API → FALTA (aunque traiga la línea)");
  ok(!E({ trabajos: trabajos({ rojo: /^web / }) }).ok, "un trabajo rojo → FALTA");
  ok(!E({ run: run({ head_branch: "otra" }) }).ok && !E({ run: run({ repository: { full_name: "x/y" } }) }).ok && !E({ run: run({ path: ".github/workflows/otro.yml" }) }).ok, "otra rama, otro repo u otro flujo → FALTA");
  ok(!E({ registro: "2026-11-22T14:05:15.1Z sin nada" }).ok && !E({ registro: reg() + "\n" + reg() }).ok, "sin línea EVIDENCIA, o con dos → FALTA");
  ok(!E({ registro: reg(ev({ corrida: 78 })) }).ok && !E({ registro: reg(ev({ sha: s(6) })) }).ok && !E({ registro: reg(ev({ arbol: s(6) })) }).ok, "la línea EVIDENCIA de otra corrida, otro commit u otro árbol → FALTA");
  ok(!E({ completa: true }).ok, "toca .github/ y la corrida es una dirigida → FALTA (hace falta la completa)");
  ok(E({ completa: true, trabajos: trabajos({ completa: true }), registro: reg(ev({ solo: "todas", entradas: { alcance: "todo", partes: "8", solo: "" } })) }).ok, "toca .github/ y hay una corrida completa en verde de ese árbol → vale");
  ok(!E({ completa: true, trabajos: trabajos({ completa: true, sin: /^dispositivo · galaxy/ }), registro: reg(ev({ solo: "todas", entradas: { alcance: "todo", partes: "8", solo: "" } })) }).ok, "corrida «completa» a la que le falta un dispositivo → FALTA");
  ok(evidenciaDelRegistro(reg()).ok && !evidenciaDelRegistro('EVIDENCIA {"sha":"x"}').ok && !evidenciaDelRegistro(reg(ev({ solo: ["--grupo"] }))).ok, "la línea EVIDENCIA se lee con la hora delante y se rechaza si le falta algo");
  // 24 nov (revisión de bc9a893) · Primer intento siempre, y los trabajos fijos presentes y en verde.
  ok(NO(E({ run: run({ run_attempt: 2 }) }), /intento 2/) && NO(E({ run: run({ run_attempt: undefined }) }), /intento/), "evidencia de un segundo intento de la corrida (volver a correr lo que falló) → FALTA (AG)");
  ok(NO(E({ registro: reg(ev({ intento: 2 })) }), /EVIDENCIA es del intento 2/) && NO(E({ registro: reg(ev({ intento: undefined })) }), /intento/), "una línea EVIDENCIA de otro intento → FALTA (AG)");
  for (const [que, re] of FIJOS_EVIDENCIA) {
    if (!NO(E({ trabajos: trabajos({ sin: re }) }), /tiene que haber uno, en verde/) || !NO(E({ trabajos: trabajos({ saltado: re }) }), /tiene que haber uno, en verde/)) ok(false, `evidencia sin «${que}», o con «${que}» saltado → FALTA`);
  }
  ok(FIJOS_EVIDENCIA.length >= 8 && NO(E({ trabajos: trabajos({ saltado: /^tipos · build · guardianes$/ }) }), /«tipos · build · guardianes»: 1 trabajo\(s\), terminó completed\/skipped/), "los trabajos fijos (tipos · build · guardianes, seguridad, la verificación, web) tienen que estar y en verde: ni saltados ni ausentes");
  // 24 nov (decisión AU) · El repaso corto tras una roja y la evidencia encadenada R1 (dirigida roja) + R2 (repaso en verde).
  {
    const SHA_A = s(7), ENT = (solo, fin = " · aprobar=no · medir=no") => `entradas: alcance=regresion · solo=«${solo}»${fin}`;
    const JJ = (name, conclusion = "success", extra = {}) => ({ id: jid++, name, status: "completed", conclusion, ...extra });
    const RES = (x) => `﻿2026-11-24T10:00:00.1Z 4/4 en verde\n2026-11-24T10:00:00.2Z RESULTADOS ${JSON.stringify({ inestables: [], completa: true, ...x })}`;
    const BASE1 = { 1: { pedidas: ["evt6c"], verdes: ["evt6c"], rojas: [] }, 2: { pedidas: ["adm7i"], verdes: [], rojas: ["adm7i"] }, 3: { pedidas: ["com5g"], verdes: ["com5g"], rojas: [] }, 4: { pedidas: ["rec1j"], verdes: ["rec1j"], rojas: [] } };
    // Una dirigida de 4 partes (alcance=regresion): los trabajos fijos y «al revés» en verde, dispositivos, confirmación y anchos saltados; por defecto
    // la parte 2 (adm7i) roja y la tubería roja.
    const dirig = ({ id = 70, sha = SHA_A, solo = "evt6c adm7i com5g rec1j", partes = BASE1, run: rx = {}, entradas, alrevesRojo = false, cambiar = (js) => js, sinRegistro = [], registro = {}, difHead = ["apps/web/lib/eventos.ts"], intento1 } = {}) => {
      const regs = {};
      const js = [JJ("alcance (todo o solo documentos)", "success", { steps: [{ name: "Las pruebas de «solo» existen (antes de arrancar los carriles)" }, { name: entradas ?? ENT(solo) }] }),
        JJ("verificación · señal rápida (tipos · guardianes · textos)"), JJ("verificación · contratos (Stripe)"), JJ("verificación · imágenes y producción como código"), JJ("verificación · base real (migraciones)"),
        JJ("tipos · build · guardianes"), JJ("seguridad · Semgrep"), JJ("web · build una vez para todos los grupos"),
        ...[1, 2, 3].map((i) => JJ(`punta a punta · al revés · ${i}/3`, alrevesRojo && i === 1 ? "failure" : "success")),
        ...[1, 2, 3, 4].map((i) => { const p = partes[i] ?? { pedidas: [], verdes: [], rojas: [] }; const j = JJ(`punta a punta · todas las fases · ${i}/4`, p.conclusion ?? (p.rojas?.length ? "failure" : "success")); if (!sinRegistro.includes(i)) regs[j.id] = registro[i] ?? RES({ pedidas: p.pedidas, verdes: p.verdes, rojas: p.rojas, ...(p.r ?? {}) }); return j; }),
        JJ("dispositivo · ${{ matrix.id }}", "skipped"), JJ("confirmación · ${{ matrix.nombre }}", "skipped"), JJ("punta a punta · ancho ${{ matrix.id }}", "skipped"), JJ("la tubería (verde si todo lo que esta corrida pide salió en verde; el resumen dice qué no corr...", "failure")];
      return { run: { id, head_sha: sha, event: "workflow_dispatch", head_branch: rama, path: ".github/workflows/ci.yml", repository: { full_name: REP }, head_repository: { full_name: REP }, status: "completed", conclusion: "failure", run_attempt: 1, ...rx }, trabajos: cambiar(js), registros: regs, difHead, ...(intento1 ? { intento1 } : {}) };
    };
    const R2 = (solo = ["adm7i", "evt6c"], x = {}) => ({ run: run(x.run ?? {}), trabajos: x.trabajos ?? trabajos(), registro: reg(ev({ solo, entradas: { alcance: "regresion", partes: "4", solo: solo.join(" ") }, ...(x.ev ?? {}) })), arbolDeRun: ARBOL, difRunHead: [] });
    const TOT = [{ nombre: "evt6c", carril: "e2e" }, { nombre: "adm7i", carril: "e2e" }, { nombre: "com5g", carril: "e2e" }, { nombre: "rec1j", carril: "e2e" }, { nombre: "alreves9vd", carril: "alreves" }];
    const DA = [{ nombre: "evt6c", carril: "e2e", por: ["nombra lib/eventos.ts"] }];
    const ARREGLO = ["apps/web/lib/eventos.ts"];
    const C = (x = {}) => evaluarCadena({ r1: dirig(), r2: R2(), intermedias: [], rama, repo: REP, arbolHead: ARBOL, arbolDeRun: ARBOL, difRunHead: [], aEsAncestro: true, difAHead: ARREGLO, propuestaTotal: TOT, propuestaDesdeA: DA, completa: false, ...x });
    ok(C().ok, `cadena: dirigida roja R1 + repaso R2 en verde con las rojas de R1 y la propuesta desde A (las verdes de R1 cubren el resto) → vale (${m(C())})`);
    const a0 = analizarDirigida({ ...dirig(), rama, repo: REP });
    ok(a0.ok && a0.rojas.join() === "adm7i" && a0.verdes.sort().join() === "com5g,evt6c,rec1j" && a0.solo.length === 4, "R1: de los registros de sus partes salen lo pedido, las verdes y las rojas");
    ok(NO(C({ r1: dirig({ run: { conclusion: "success" } }) }), /ROJA/), "cadena: R1 en verde → no hay repaso (R1 es una dirigida ROJA)");
    ok(NO(C({ r1: dirig({ run: { head_branch: "otra" } }) }), /de la rama otra/) && NO(C({ r1: dirig({ run: { repository: { full_name: "x/y" } } }) }), /otro repositorio/) && NO(C({ r1: dirig({ run: { path: ".github/workflows/otro.yml" } }) }), /flujo/), "cadena: R1 de otra rama, otro repo u otro flujo → FALTA");
    ok(NO(C({ r1: dirig({ run: { event: "push" } }) }), /evento push/) && NO(C({ r1: dirig({ run: { run_attempt: 2 } }) }), /intento 2/), "cadena: R1 que no es a mano, o de otro intento → FALTA");
    ok(NO(C({ aEsAncestro: false }), /no es ancestro de HEAD/), "cadena: el commit A de R1 no es ancestro de HEAD → FALTA");
    ok(NO(C({ r1: dirig({ sinRegistro: [2] }) }), /rojo.*sin la línea RESULTADOS/), "cadena: un trabajo de pruebas rojo sin RESULTADOS → FALTA (no se sabe qué falló)");
    ok(NO(C({ r1: dirig({ sinRegistro: [3] }) }), /verde.*sin la línea RESULTADOS/), "cadena: un trabajo de pruebas verde sin RESULTADOS → FALTA (sus verdes no se pueden contar)");
    ok(NO(C({ r1: dirig({ partes: { ...BASE1, 2: { ...BASE1[2], r: { completa: false } } } }) }), /completa:false/), "cadena: RESULTADOS con completa:false → FALTA");
    ok(NO(C({ r1: dirig({ partes: { ...BASE1, 4: { ...BASE1[4], conclusion: "cancelled" } } }) }), /cancelled/) && NO(C({ r1: dirig({ partes: { ...BASE1, 4: { ...BASE1[4], conclusion: "skipped" } } }) }), /skipped/), "cadena: un trabajo de pruebas cancelado o saltado → FALTA");
    ok(NO(C({ r1: dirig({ cambiar: (js) => js.filter((j) => !/todas las fases · 3\/4/.test(j.name)) }) }), /parte/), "cadena: a R1 le falta una parte de la punta a punta → FALTA");
    ok(NO(C({ r1: dirig({ registro: { 2: RES({ pedidas: ["adm7i"], verdes: [], rojas: ["adm7i"] }) + "\n" + RES({ pedidas: ["adm7i"], verdes: ["adm7i"], rojas: [] }) } }) }), /2 líneas RESULTADOS/), "cadena: dos líneas RESULTADOS en un registro → FALTA");
    ok(NO(C({ r1: dirig({ partes: { ...BASE1, 2: { ...BASE1[2], rojas: [], verdes: ["adm7i"], conclusion: "failure" } } }) }), /sin ninguna prueba roja con nombre/), "cadena: un trabajo de pruebas rojo sin ninguna roja en RESULTADOS → FALTA");
    ok(NO(C({ r1: dirig({ partes: { ...BASE1, 1: { pedidas: ["evt6c"], verdes: [], rojas: ["evt6c"], conclusion: "success" } } }) }), /en verde con rojas en RESULTADOS/), "cadena: una parte VERDE de R1 cuyo RESULTADOS trae rojas → FALTA (no es coherente)");
    ok(NO(C({ r1: dirig({ entradas: "entradas: alcance=todo · solo=«evt6c adm7i com5g rec1j» · aprobar=no · medir=no" }) }), /no es una dirigida/) && NO(C({ r1: dirig({ entradas: ENT("") }) }), /no es una dirigida/), "cadena: R1 con alcance=todo o sin «solo» → no es una dirigida");
    ok(NO(C({ r1: dirig({ cambiar: (js) => js.map((j) => (/^dispositivo/.test(j.name) ? { ...j, name: "dispositivo · pixel", conclusion: "failure" } : j)) }) }), /corrió «dispositivo/), "cadena: en R1 corrió un dispositivo (no es una dirigida de esta herramienta) → FALTA");
    ok(C({ r1: dirig({ entradas: ENT("evt6c adm7i com5g re", "") }) }).ok && NO(C({ r1: dirig({ entradas: ENT("evt6c adm7i com5g zz9otra") }) }), /no es «solo»/), "cadena: «solo» de las entradas cortado vale (sin el último nombre); uno que no coincide con lo pedido → FALTA");
    // 24 nov (revisión de bc9a893) · R1 falló SOLO por pruebas con nombre: lo demás, en verde (la letra de AU).
    ok(NO(C({ r1: dirig({ alrevesRojo: true }) }), /no falló solo por pruebas con nombre: «punta a punta · al revés · 1\/3»/), "cadena: «al revés» rojo en R1 → no hay repaso (R1 tiene que haber fallado solo por pruebas con nombre)");
    ok(NO(C({ r1: dirig({ cambiar: (js) => js.map((j) => (/^verificación · contratos/.test(j.name) ? { ...j, conclusion: "failure" } : j)) }) }), /no falló solo por pruebas con nombre/)
      && NO(C({ r1: dirig({ cambiar: (js) => js.filter((j) => !/^seguridad /.test(j.name)) }) }), /no falló solo por pruebas con nombre: «seguridad»: 0 trabajo/), "cadena: en R1 un trabajo que no es de pruebas rojo, o un trabajo fijo que falta → FALTA");
    ok(NO(C({ r2: R2(["evt6c"]) }), /no repite las rojas de R1.*adm7i/), "cadena: R2 que no incluye una roja de R1 → FALTA");
    ok(NO(C({ r1: dirig({ partes: { ...BASE1, 3: { pedidas: ["com5g"], verdes: [], rojas: ["com5g"] } } }) }), /no repite las rojas.*com5g/), "cadena: una prueba roja en R1 que no está en R2 no cuenta como cubierta → FALTA");
    ok(NO(C({ r1: dirig({ partes: { ...BASE1, 1: { ...BASE1[1], r: { inestables: ["evt6c"] } } } }), r2: R2(["adm7i"]), propuestaDesdeA: [] }), /no repite las rojas.*evt6c/), "cadena: una inestable de R1 también tiene que repetirse en R2 (más estricto que «rojas»)");
    ok(NO(C({ r2: R2(["adm7i"]) }), /propuesta desde el commit de R1 \(A\.\.HEAD\).*evt6c/), "cadena: R2 que no incluye la propuesta A..HEAD → FALTA");
    ok(NO(C({ propuestaTotal: [...TOT, { nombre: "pag9x", carril: "e2e" }] }), /no se cubre la propuesta de la entrega.*pag9x/), "cadena: una prueba de la propuesta de la entrega que no salió en verde en R1 ni corrió en R2 → FALTA");
    ok(NO(C({ arbolHead: s(5), difRunHead: ["apps/web/lib/eventos.ts"] }), /R2: es de otro árbol/), "cadena: R2 de otro árbol → FALTA");
    ok(NO(C({ r2: R2(undefined, { trabajos: trabajos({ rojo: /^la tubería / }) }) }), /R2:/) && NO(C({ r2: R2(undefined, { run: { conclusion: "failure" } }) }), /R2:/) && NO(C({ r2: R2(undefined, { trabajos: trabajos({ sin: /^punta a punta · al revés · 2\/3/ }) }) }), /al revés/), "cadena: R2 que no pasa lo de siempre (corrida o tubería no verde, «al revés» no entero) → FALTA");
    ok(NO(C({ r2: R2(undefined, { trabajos: trabajos({ sin: /^punta a punta · todas las fases · 2\/4/ }) }) }), /R2: la punta a punta no corrió entera/), "cadena: a R2 le falta una parte de «todas las fases» → FALTA (sus pruebas no corrieron todas)");
    ok(NO(C({ r2: R2(undefined, { run: { run_attempt: 2 } }) }), /R2: es el intento 2/) && NO(C({ r2: R2(undefined, { ev: { intento: 2 } }) }), /R2: la línea EVIDENCIA es del intento 2/), "cadena: R2 de un segundo intento (la corrida o su EVIDENCIA) → FALTA (AG)");
    ok(NO(C({ r2: R2(undefined, { run: { id: 60 } , ev: { corrida: 60 } }) }), /no es posterior a R1/), "cadena: R2 anterior a R1 → FALTA");
    ok(NO(C({ completa: true }), /\.github/), "cadena: la entrega toca .github/ (completa) → la cadena no vale");
    // Lo que cambió entre A y HEAD: sin arreglo no hay repaso, y con herramientas del CI tampoco.
    ok(NO(C({ difAHead: [".github/workflows/ci.yml", "apps/web/lib/eventos.ts"] }), /herramientas del CI/) && NO(C({ difAHead: ["guardianes/run.mjs", "apps/web/lib/eventos.ts"] }), /herramientas del CI/)
      && NO(C({ difAHead: ["pruebas/lib/arbol.cjs"] }), /herramientas del CI/) && NO(C({ difAHead: ["scripts/ci/subir.mjs"] }), /herramientas del CI/), "cadena: .github/ (o cualquier herramienta del CI: guardianes, pruebas/lib, scripts/ci) cambiado entre A y HEAD → la cadena no vale");
    ok(NO(C({ difAHead: [] }), /sin arreglo no hay repaso/) && NO(C({ difAHead: [D0, D1] }), /sin arreglo no hay repaso/) && NO(C({ difAHead: null }), /sin la lista/), "cadena: sin arreglo (A y HEAD con el mismo árbol, o solo documentos de trabajo) → no vale: una roja dos veces es roja (AG)");
    // Un solo eslabón: R0 (dirigida grande, roja) → Rm (repaso rojo) → R2. Con R0 como R1 y Rm como intermedia, vale si R2 repite las rojas de Rm;
    // con Rm como R1 (repaso de repaso) las verdes de R0 no cuentan y la entrega no queda cubierta.
    const Rm = (rojas = ["adm7i"], x = {}) => dirig({ id: 72, solo: "adm7i com5g", partes: { 1: { pedidas: ["adm7i"], verdes: rojas.includes("adm7i") ? [] : ["adm7i"], rojas: rojas.filter((y) => y === "adm7i") }, 2: { pedidas: ["com5g"], verdes: rojas.includes("com5g") ? [] : ["com5g"], rojas: rojas.filter((y) => y === "com5g") } }, ...x });
    ok(C({ intermedias: [Rm()] }).ok, `cadena: R1 → repaso rojo → R2 que repite las rojas de los dos → vale (${m(C({ intermedias: [Rm()] }))})`);
    ok(NO(C({ intermedias: [Rm(["com5g"])] }), /no repite las rojas.*com5g/), "cadena: una roja del repaso rojo intermedio que no está en R2 → FALTA");
    ok(NO(C({ r1: Rm(), intermedias: [] }), /no se cubre la propuesta de la entrega/), "cadena de dos eslabones (repaso de repaso: R1 = el repaso rojo) → las verdes de la dirigida anterior no cuentan → FALTA");
    ok(NO(C({ intermedias: [dirig({ id: 73, solo: "adm7i", partes: { 1: { pedidas: ["adm7i"], verdes: [], rojas: ["adm7i"] } }, sinRegistro: [1] })] }), /no verde entre R1 y R2.*no se sabe/), "cadena: una corrida roja entre R1 y R2 sin RESULTADOS en un trabajo de pruebas → FALTA");
    ok(C({ intermedias: [dirig({ id: 73, run: { head_branch: "otra" }, solo: "adm7i com5g", partes: { 1: { pedidas: ["com5g"], verdes: [], rojas: ["com5g"] } } })] }).ok && C({ intermedias: [dirig({ id: 80, partes: { 1: { pedidas: ["com5g"], verdes: [], rojas: ["com5g"] } } })] }).ok, "cadena: una roja de otra rama, o posterior a R2, no se suma");
    // 24 nov (revisión de bc9a893) · Cuenta TODA corrida de la rama entre R1 y R2 que no terminó en verde, de cualquier evento.
    const una = (id, parte, x = {}) => dirig({ id, solo: parte.pedidas.join(" "), partes: { 1: parte }, ...x });
    ok(NO(C({ intermedias: [una(73, { pedidas: ["com5g", "rec1j"], verdes: [], rojas: ["com5g"], conclusion: "cancelled", r: { completa: false } }, { run: { conclusion: "cancelled" } })] }), /no repite las rojas.*com5g/), "cadena: una corrida CANCELADA entre R1 y R2 suma las rojas de sus partes con RESULTADOS → R2 sin ellas, FALTA");
    ok(NO(C({ intermedias: [una(73, { pedidas: ["com5g"], verdes: [], rojas: [], conclusion: "cancelled" }, { run: { conclusion: "cancelled" }, sinRegistro: [1] })] }), /no verde entre R1 y R2.*no se sabe/), "cadena: una parte que corrió en una cancelada y no trae RESULTADOS → FALTA");
    ok(NO(C({ intermedias: [una(73, { pedidas: ["com5g"], verdes: [], rojas: ["com5g"] }, { run: { event: "pull_request" } })] }), /no repite las rojas.*com5g/) && NO(C({ intermedias: [una(73, { pedidas: ["com5g"], verdes: [], rojas: ["com5g"] }, { run: { conclusion: "timed_out" } })] }), /no repite las rojas.*com5g/), "cadena: una corrida roja de otro evento (pull_request) o fuera de tiempo entre R1 y R2 también suma sus rojas");
    ok(NO(C({ intermedias: [una(73, { pedidas: ["com5g"], verdes: ["com5g"], rojas: [] }, { run: { status: "in_progress", conclusion: null } })] }), /todavía no terminó/), "cadena: una corrida de la rama entre R1 y R2 que todavía no terminó → FALTA (no se sabe qué va a decir)");
    ok(NO(C({ intermedias: [una(73, { pedidas: ["com5g", "rec1j"], verdes: ["com5g", "rec1j"], rojas: [], r: { inestables: ["rec1j"] } }, { run: { conclusion: "cancelled" } })] }), /no repite las rojas.*rec1j/), "cadena: las inestables de una corrida intermedia también tienen que repetirse en R2");
    ok(NO(C({ intermedias: [una(73, { pedidas: ["com5g"], verdes: ["com5g"], rojas: [], conclusion: "failure" })] }), /rojo sin ninguna prueba roja con nombre/), "cadena: una parte ROJA de una intermedia sin ninguna roja en RESULTADOS → FALTA (no se sabe qué falló)");
    ok(intermediasDe([{ id: 71, path: ".github/workflows/ci.yml", repository: { full_name: REP }, head_branch: rama, event: "schedule", status: "completed", conclusion: "success", run_attempt: 1 }, { id: 72, path: ".github/workflows/ci.yml", repository: { full_name: REP }, head_branch: rama, event: "schedule", status: "completed", conclusion: "startup_failure" }], { r1: { id: 70 }, r2: { id: 77 }, rama, repo: REP }).map((r) => r.id).join() === "72", "las intermedias: toda corrida de la rama entre R1 y R2 que no terminó en verde (cualquier conclusión y evento); las verdes no");
    // 24 nov (revisión de bfa43c3) · Sin arreglo después de una roja intermedia tampoco hay cadena; una corrida que se volvió a correr hasta el verde
    // no se vuelve verde (cuentan las rojas de su primer intento); y una R1 roja solo por la tubería no tiene roja con nombre.
    ok(NO(C({ intermedias: [Rm(["adm7i"], { difHead: [] })] }), /ya salió roja con el mismo árbol que HEAD/) && NO(C({ intermedias: [Rm(["adm7i"], { difHead: [D0] })] }), /ya salió roja con el mismo árbol que HEAD/)
      && NO(C({ intermedias: [Rm(["adm7i"], { difHead: null })] }), /no sé qué cambió entre ella y HEAD/), "cadena: un repaso rojo entre R1 y R2 con el mismo árbol que HEAD (o solo documentos de diferencia) → FALTA: sin arreglo no hay cadena (AG)");
    ok(C({ intermedias: [una(73, { pedidas: ["com5g"], verdes: ["com5g"], rojas: [] }, { run: { conclusion: "cancelled" }, difHead: [] })] }).ok, "cadena: una intermedia sin rojas (cancelada) con el mismo árbol que HEAD no frena la cadena");
    const reint = (x = {}) => una(73, { pedidas: ["com5g"], verdes: ["com5g"], rojas: [] }, { run: { conclusion: "success", run_attempt: 2 }, ...x });
    const prim = (rojas) => { const d = una(73, { pedidas: ["com5g"], verdes: rojas.length ? [] : ["com5g"], rojas }); return { trabajos: d.trabajos, registros: d.registros }; };
    ok(intermediasDe([reint().run], { r1: { id: 70 }, r2: { id: 77 }, rama, repo: REP }).length === 1, "las intermedias: una corrida que se volvió a correr hasta el verde (intento 2) cuenta como no verde");
    ok(NO(C({ intermedias: [reint({ intento1: prim(["com5g"]) })] }), /no repite las rojas.*com5g/) && C({ r2: R2(["adm7i", "evt6c", "com5g"]), intermedias: [reint({ intento1: prim(["com5g"]) })] }).ok, "cadena: las rojas del PRIMER intento de una corrida que se volvió a correr hasta el verde tienen que repetirse en R2");
    ok(NO(C({ intermedias: [reint()] }), /no puedo leer su primer intento/), "cadena: una corrida que se volvió a correr, sin poder leer su primer intento → FALTA");
    const soloTuberia = () => dirig({ partes: { ...BASE1, 2: { pedidas: ["adm7i"], verdes: ["adm7i"], rojas: [], r: { inestables: ["adm7i"] } } } });
    ok(NO(C({ r1: soloTuberia() }), /R1 no tiene ninguna prueba roja con nombre/), "cadena: R1 roja solo por la tubería (inestables, sin una roja con nombre) → no hay cadena");
    const Li = listaDelRepaso({ r1: { rojas: ["adm7i"], inestables: ["rec1j"], verdes: ["rec1j", "com5g", "evt6c"] }, desdeA: [], total: [] });
    ok(Li.map((t) => t.nombre).join() === "adm7i,rec1j" && Li[1].por.includes("inestable en R1"), "la lista del repaso lleva también las inestables de R1");
    // La lista del repaso y la cadena casan: lo que lanza --repaso es lo que --subir acepta.
    const L = listaDelRepaso({ r1: a0, extra: ["zz1x"], desdeA: DA, total: [...TOT, { nombre: "pag9x", carril: "e2e" }] });
    ok(L.map((t) => t.nombre).join() === "adm7i,zz1x,evt6c,pag9x" && L.find((t) => t.nombre === "pag9x").por.join().includes("no salió en verde en R1"), `la lista del repaso: rojas, rojas posteriores, propuesta desde A y lo de la entrega que no salió en verde en R1 (${L.map((t) => t.nombre).join(" ")})`);
    ok(C({ r2: R2(L.map((t) => t.nombre)), propuestaTotal: [...TOT, { nombre: "pag9x", carril: "e2e" }] }).ok, "la lista del repaso en verde (R2) es evidencia encadenada para --subir");
    // La línea RESULTADOS.
    ok(resultadosDelRegistro(RES({ pedidas: ["a1x"], verdes: ["a1x"], rojas: [] })).ok && !resultadosDelRegistro("RESULTADOS {").ok && !resultadosDelRegistro(RES({ pedidas: ["a1x"], verdes: ["a1x"], rojas: ["a1x"] })).ok
      && !resultadosDelRegistro(RES({ pedidas: ["a1x"], verdes: [], rojas: [] })).ok && resultadosDelRegistro(RES({ pedidas: ["a1x"], verdes: [], rojas: [], completa: false })).ok && !resultadosDelRegistro(RES({ pedidas: ["--x"], verdes: [], rojas: [] })).ok,
    "la línea RESULTADOS se lee con la hora delante y se rechaza si no es coherente (una prueba verde y roja, completa sin resultado, un nombre raro)");
    ok(esTrabajoDePruebas({ name: "punta a punta · todas las fases · 2/4" }) && esTrabajoDePruebas({ name: "punta a punta · ancho iphone-se · 1/8" }) && !esTrabajoDePruebas({ name: "punta a punta · al revés · 1/3" }) && !esTrabajoDePruebas({ name: "tipos · build · guardianes" }), "trabajos de pruebas: los que miran «solo» (todas las fases, anchos) y los que en una dirigida quedan saltados; «al revés» y la verificación no");
    // 24 nov (revisión de bc9a893) · El cableado de cmdSubir y cmdRepaso (buscarEvidencia, armarCadena, prepararRepaso) con un io de mentira: lo que
    // la API y git dirían, y nada más. Cada caso cambia UNA respuesta del io y la cadena o el repaso tienen que darse cuenta.
    const mundo = ({ cargas, ancestro = true, difA = ARREGLO, desdeA = DA, total = TOT, sinCommit = [], difs = {}, intentos = {}, ocultar = [], completaEnMain = false }) => {
      const porId = new Map(cargas.map((c) => [Number(c.run.id), c])), regs = {};
      for (const c of cargas) {
        Object.assign(regs, c.registros ?? {});
        const tub = c.trabajos.find((j) => /^la tubería /.test(j.name));
        if (c.registro !== undefined && tub) regs[tub.id] = c.registro;
      }
      for (const c of Object.values(intentos)) Object.assign(regs, c.registros ?? {});
      const corridas = [...cargas].map((c) => c.run).filter((r) => !ocultar.includes(Number(r.id))).sort((a, b) => Number(b.id) - Number(a.id));
      return {
        llamadas: [],
        corrida(id) { return porId.get(Number(id))?.run; },
        corridas() { return corridas; },
        trabajos(id) { return porId.get(Number(id))?.trabajos ?? []; },
        trabajosIntento(id, n) { const c = intentos[Number(id)]; if (!c || n !== 1) throw new Error("sin ese intento"); return c.trabajos; },
        registro(id) { if (!(id in regs)) throw new Error("sin registro"); return regs[id]; },
        tenerCommit(sha) { return !sinCommit.includes(sha); },
        arbol(sha) { return sha === SHA_RUN ? ARBOL : s(9); },
        difNombres(a) { return a in difs ? difs[a] : a === SHA_A ? difA : []; },
        esAncestro() { return ancestro; },
        planear(base, mas = []) { this.llamadas.push(base); return { d: { pruebas: base === "origin/main" ? total : base === SHA_A ? [...desdeA, ...mas.map((n) => ({ nombre: n, carril: "e2e", por: ["--mas"] }))] : [], errores: [] }, ex: { corrida: base === "origin/main" && completaEnMain ? "completa" : "dirigida" } }; },
      };
    };
    const plan = (x = {}) => ({ d: { pruebas: x.total ?? TOT }, ex: { corrida: x.corrida ?? "dirigida" } });
    const B = async (x = {}) => buscarEvidencia({ p: plan(x), rama, repo: REP, arbolHead: ARBOL, io: mundo({ cargas: [dirig(), R2()], ...x }) });
    let b = await B();
    ok(!b.hallada && b.cadena?.r1.id === 70 && b.cadena?.r2.id === 77, `cableado: --subir encuentra la cadena R1 (70) + R2 (77) con lo que dicen la API y git (${b.cadena ? "vale" : b.motivosCadena.join(" · ")})`);
    b = await B({ desdeA: [...DA, { nombre: "zz1x", carril: "e2e", por: ["nombra lib/zz.ts"] }] });
    ok(!b.cadena && /propuesta desde el commit de R1 \(A\.\.HEAD\).*zz1x/.test(b.motivosCadena.join()), "cableado: la propuesta desde A sale de io.planear(A) (una prueba de A..HEAD que R2 no corrió → no hay cadena)");
    b = await B({ total: [...TOT, { nombre: "pag9x", carril: "e2e" }] });
    ok(!b.cadena && /no se cubre la propuesta de la entrega.*pag9x/.test(b.motivosCadena.join()), "cableado: la propuesta de la entrega es la del plan (una prueba que ni salió en verde en R1 ni corrió en R2 → no hay cadena)");
    b = await B({ ancestro: false });
    ok(!b.cadena && /no es ancestro de HEAD/.test(b.motivosCadena.join()), "cableado: «A es ancestro de HEAD» lo dice git (io.esAncestro), no se da por hecho");
    b = await B({ sinCommit: [SHA_A] });
    ok(!b.cadena && /no es ancestro de HEAD/.test(b.motivosCadena.join()), "cableado: sin el commit de R1 no hay cadena");
    b = await B({ cargas: [dirig(), R2(), Rm(["com5g"], { id: 73 })] });
    ok(!b.cadena && /no repite las rojas.*com5g/.test(b.motivosCadena.join()), "cableado: las corridas no verdes entre R1 y R2 salen de la lista de la rama (una roja intermedia con una prueba que R2 no repitió → no hay cadena)");
    b = await B({ cargas: [dirig(), R2(), una(73, { pedidas: ["com5g"], verdes: [], rojas: ["com5g"], conclusion: "cancelled" }, { run: { conclusion: "cancelled", event: "pull_request" } })] });
    ok(!b.cadena && /no repite las rojas.*com5g/.test(b.motivosCadena.join()), "cableado: una cancelada de otro evento entre R1 y R2 también cuenta");
    b = await B({ cargas: [dirig({ run: { run_attempt: 2 } }), R2()] });
    ok(!b.cadena && /intento 2/.test(b.motivosCadena.join()), "cableado: R1 llega tal cual de la API (un segundo intento no se maquilla)");
    b = await B({ cargas: [dirig({ alrevesRojo: true }), R2()] });
    ok(!b.cadena && /no falló solo por pruebas con nombre/.test(b.motivosCadena.join()), "cableado: R1 llega con todos sus trabajos (uno rojo que no es de pruebas no se esconde)");
    b = await B({ cargas: [dirig({ run: { conclusion: "cancelled" } }), R2()] });
    ok(!b.cadena && !b.motivosCadena.length, "cableado: una cancelada no es candidata a R1 (solo las dirigidas rojas)");
    b = await B({ difA: [".github/workflows/ci.yml", "apps/web/lib/eventos.ts"] });
    ok(!b.cadena && /herramientas del CI/.test(b.motivosCadena.join()), "cableado: lo que cambió entre A y HEAD sale de git (io.difNombres): con .github/ no hay cadena");
    b = await B({ corrida: "completa" });
    ok(!b.cadena && !b.motivosCadena.length, "cableado: si la entrega toca .github/ (corrida COMPLETA) ni se busca la cadena");
    b = await B({ cargas: [dirig(), R2(), Rm(["adm7i"], { id: 73, sha: s(8) })], difs: { [s(8)]: [] } });
    ok(!b.cadena && /ya salió roja con el mismo árbol que HEAD/.test(b.motivosCadena.join()), "cableado: lo que cambió entre una roja intermedia y HEAD sale de git (el mismo árbol → no hay cadena)");
    b = await B({ cargas: [dirig(), R2(), reint()], intentos: { 73: prim(["com5g"]) } });
    ok(!b.cadena && /no repite las rojas.*com5g/.test(b.motivosCadena.join()), "cableado: el primer intento de una intermedia que se volvió a correr sale de la API (io.trabajosIntento)");
    // --repaso: prepararRepaso con el mismo io.
    const PR = async (x = {}, id = 70, mas = []) => prepararRepaso({ id, rama, repo: REP, mas, io: mundo({ cargas: [dirig(), R2()], ...x }) });
    let q = await PR();
    ok(q.ok && q.lista.map((t) => t.nombre).join() === "adm7i,evt6c" && q.A === SHA_A, `repaso: R1 70, A y la lista (rojas de R1 + desde A) salen del io (${q.ok ? q.lista.map((t) => t.nombre).join(" ") : q.motivo})`);
    q = await PR({ difA: [".github/workflows/ci.yml", "apps/web/lib/eventos.ts"] });
    ok(NO(q, /herramientas del CI/), "repaso: .github/ cambiado entre A y HEAD → no hay repaso (dirigida entera)");
    q = await PR({ difA: ["pruebas/correr.mjs", "apps/web/lib/eventos.ts"] });
    ok(NO(q, /herramientas del CI/), "repaso: una herramienta del CI (el corredor) cambiada entre A y HEAD → no hay repaso");
    q = await PR({ difA: [] });
    ok(NO(q, /sin arreglo no hay repaso/), "repaso: sin arreglo (el mismo árbol que R1) → no hay repaso (una roja dos veces es roja, AG)");
    q = await PR({ ancestro: false });
    ok(NO(q, /no es ancestro de HEAD/), "repaso: el commit de R1 no es ancestro de HEAD → no hay repaso");
    q = await PR({ cargas: [dirig(), una(73, { pedidas: ["com5g"], verdes: [], rojas: ["com5g"] })] });
    ok(q.ok && q.lista.map((t) => t.nombre).join() === "adm7i,com5g,evt6c" && q.extra.join() === "com5g", "repaso: las rojas de una corrida no verde posterior a R1 entran en la lista");
    q = await PR({ cargas: [dirig(), una(73, { pedidas: ["com5g"], verdes: ["com5g"], rojas: [] }, { run: { status: "in_progress", conclusion: null } })] });
    ok(NO(q, /todavía no terminó/), "repaso: una corrida de la rama posterior a R1 que no terminó → espera (no hay repaso)");
    q = await PR({ cargas: [dirig({ alrevesRojo: true })] });
    ok(NO(q, /no falló solo por pruebas con nombre/), "repaso: R1 que no falló solo por pruebas con nombre → no hay repaso");
    q = await PR({}, "x1");
    ok(NO(q, /--repaso <id/), "repaso: un id que no es un número → no hay repaso");
    q = await PR({}, 70, ["zz2x"]);
    ok(q.ok && q.lista.some((t) => t.nombre === "zz2x"), "repaso: --mas entra en la lista (propuesta desde A)");
    q = await PR({ cargas: [soloTuberia(), R2()] });
    ok(NO(q, /no tiene ninguna prueba roja con nombre/), "repaso: R1 roja solo por la tubería (sin una roja con nombre) → no hay repaso");
    q = await PR({ completaEnMain: true });
    ok(NO(q, /la entrega toca \.github\//), "repaso: la entrega toca .github/ (origin/main..HEAD) → no hay repaso, hace falta la corrida COMPLETA");
    q = await PR({ ocultar: [70] });
    ok(NO(q, /no está entre las \d+ últimas corridas/), "repaso: R1 fuera de las últimas corridas de la rama (no se ven todas las posteriores) → no hay repaso");
    q = await PR({ cargas: [dirig(), Rm(["com5g"], { id: 73, sha: s(8) })], difs: { [s(8)]: [] } });
    ok(NO(q, /ya salió roja con el mismo árbol que HEAD/), "repaso: un repaso rojo posterior con el mismo árbol que HEAD → no hay otro repaso sin arreglo nuevo (AG)");
    q = await PR({ cargas: [dirig(), reint()], intentos: { 73: prim(["com5g"]) } });
    ok(q.ok && q.extra.join() === "com5g", "repaso: las rojas del primer intento de una corrida posterior que se volvió a correr entran en la lista");
  }
  // 24 nov · La vía rápida de código (decisión AV) y --vigilar.
  {
    const LIB = "apps/web/lib/eventos.ts", PAG = "apps/web/app/(app)/eventos/page.tsx", PRU = "pruebas/e2e/evt6c.cjs";
    const rc = { [LIB]: ["export const x = 1;"], [PAG]: ["const r = await leer();"], [PRU]: ["ok(true, 'x');"] };
    const cod = (fs, r = rc) => clases(fs, r);
    let x = cod([LIB, PAG, PRU, D0]);
    ok(x.codigo && !x.diseno && x.clases.join() === "codigo,documentos", `código (lib, una página que lee con await y la prueba que viaja con él) + un documento → «codigo» (${x.clases.join()})`);
    x = clases([FN, PF, LA], rl);
    ok(x.diseno && x.clases.join() === "diseno" && x.codigo === true, "una entrega de diseño sigue siendo «diseno» (aunque también cabría en código)");
    // Las exclusiones, un archivo por cada una.
    const fuera = [
      ["packages/db/migrations/0300_x.sql", /nunca es de la vía rápida de código/], ["infra/pruebas/x.sh", /nunca/], ["services/video/x.mjs", /nunca/], ["scripts/x.mjs", /nunca/], ["semgrep/x.yml", /nunca/],
      [".github/workflows/x.yml", /nunca/], ["guardianes/run.mjs", /nunca/], ["package.json", /nunca/], ["apps/web/app/x/package.json", /nunca/], ["pnpm-lock.yaml", /nunca/], [".npmrc", /nunca/],
      ["apps/web/lib/.env", /nunca/], ["apps/web/.env.local", /nunca/], ["apps/web/public/sw-push.js", /nunca/], ["apps/web/public/puerta/lector.js", /nunca/], ["apps/web/public/.well-known/assetlinks.json", /nunca/],
      ["apps/web/tsconfig.json", /nunca/], ["apps/web/next.config.ts", /nunca/], ["apps/web/middleware.ts", /nunca/], ["packages/ui/package.json", /nunca/], ["packages/ui/tsconfig.json", /nunca/],
      ["pruebas/lib/arbol.cjs", /nunca/], ["pruebas/correr.mjs", /nunca/], ["pruebas/reparto.json", /nunca/], ["pruebas/e2e/sub/x.cjs", /nunca/], ["pruebas/alreves/x.mjs", /nunca/],
      ["apps/web/app/api/x/route.ts", /es «sensible»/], ["apps/web/lib/pagos/x.ts", /es «sensible»/], ["apps/web/app/admin/Tabla.tsx", /es «sensible»/],
      ["apps/web/lib/sesion.ts", /lleva «sesion»/], ["apps/web/app/(app)/privacidad/Ajustes.tsx", /lleva «privacidad»/], ["apps/mobile/x.ts", /no está en la lista blanca/], ["packages/config/x.ts", /no está en la lista blanca/],
    ];
    for (const [f, re] of fuera) { const y = cod([LIB, f], { ...rc, [f]: ["x"] }); if (y.codigo || esCodigo(f) || !re.test(porQueNoCodigo(f))) ok(false, `${f} → no es de la vía rápida de código (${porQueNoCodigo(f) || "lo es"})`); }
    ok(fuera.length >= 30 && fuera.every(([f]) => !esCodigo(f)) && [LIB, PAG, PRU, "pruebas/alreves/alrevesBuscarCumple.cjs", "packages/ui/src/ds/layout/SiteFooter.js", "apps/web/app/(app)/buscar/acciones.ts"].every(esCodigo),
      `la lista blanca de código y cada exclusión, un archivo (${fuera.length} rutas fuera: la base, infra, services, scripts, semgrep, .github, guardianes, dependencias, .env, JS servido tal cual, configuración, herramientas de prueba, sensibles y palabras)`);
    x = cod([LIB], { [LIB]: ["await sql`update eventos set x = 1`"] });
    ok(!x.codigo && x.clases.includes("sensible"), "una escritura en los renglones → sensible, no código");
    x = cod([LIB], { [LIB]: ['"use server";'] });
    ok(!x.codigo && x.clases.includes("sensible"), "«use server» en los renglones → sensible, no código");
    x = cod([LIB, PAG], { [LIB]: ["x"] });
    ok(!x.codigo && /sin los renglones cambiados de apps\/web\/app/.test(x.noCodigo), "un archivo de código sin sus renglones → no código (duda)");
    x = cod([PRU], { [PRU]: ["sql(`update t set a = 1`)"] });
    ok(x.codigo && x.clases.join() === "codigo", "una prueba con SQL que escribe (a propósito) sigue siendo código");
    // Las dos listas (la cabeza y origin/main), con la regla de «diseno».
    const c1 = cod([LIB, PAG, PRU]), cc = combinar(c1, c1);
    ok(cc.codigo && cc.clases.join() === "codigo", "cabeza y main la dan por código → «codigo»");
    let k = combinar(c1, { ...c1, codigo: undefined, noCodigo: undefined });
    ok(!k.codigo && /todavía no tiene la vía rápida de código/.test(k.noCodigo) && !k.clases.includes("codigo"), "la herramienta de origin/main sin «codigo» → no hay vía rápida de código");
    ok(!combinar(c1, null).codigo && !combinar(c1, { ...c1, codigo: false, noCodigo: "x", clases: ["sensible"] }).codigo && !combinar({ ...c1, codigo: false, noCodigo: "y" }, c1).codigo, "sin poder juzgarla con main, o una de las dos listas más estricta → no código");
    const cDis = clases([FN, PF, LA], rl);
    k = combinar(cDis, { ...cDis, diseno: false, noDiseno: "x", clases: [] });
    ok(k.codigo && !k.diseno && k.clases.join() === "codigo", "diseño en la cabeza pero no en main, y código en las dos → código (con sus pruebas locales)");
    // Lo que exige: main en verde, el tope y las pruebas de lo tocado.
    const RM = (id, conclusion, y = {}) => ({ id, path: ".github/workflows/ci.yml", head_branch: "main", status: "completed", conclusion, head_sha: s(id), repository: { full_name: REP }, ...y, event: y.event ?? "push" });
    const VERDE = estadoDeMain([RM(9002, "success")], REP), ROJO = estadoDeMain([RM(9001, "failure")], REP), DUDA = estadoDeMain([], REP);
    const LOK = estimarLocal([{ nombre: "evt6c", carril: "e2e" }], { evt6c: 20 });
    let e = exigencias(cc, { main: VERDE, local: LOK });
    ok(e.pruebasAqui && e.corrida === "despues" && !e.mainPrimero && ["tipos", "guardianes", "textos"].every((y) => e.locales.includes(y)), "código con main en verde y las pruebas dentro del tope → vía rápida de código: tipos, guardianes, textos y las pruebas de lo tocado aquí");
    e = exigencias(cc, { main: ROJO, local: LOK });
    ok(!e.pruebasAqui && e.corrida === "dirigida" && /^main está en rojo \(corrida 9001\): primero se arregla; esto va por el camino normal/.test(e.noRapida), "con main en rojo el código no sube por la vía rápida («main está en rojo (corrida X): primero se arregla»)");
    e = exigencias(cc, { main: DUDA, local: LOK });
    ok(!e.pruebasAqui && /no sé si main está en verde/.test(e.noRapida) && !exigencias(cc, { local: LOK }).pruebasAqui, "sin saber si main está en verde (o sin mirarlo) → camino normal");
    e = exigencias(combinar(cDis, cDis), { main: ROJO });
    ok(e.corrida === "despues" && !e.pruebasAqui, "main en rojo no frena el diseño (AN): sigue por su vía rápida, avisando");
    ok(exigencias(cc, { main: VERDE, local: LOK, sinViaRapida: true }).corrida === "dirigida" && exigencias({ ...cc, clases: ["codigo", "sensible"] }, { main: VERDE, local: LOK }).corrida === "dirigida" && exigencias({ ...cc, github: true }, { main: VERDE, local: LOK }).corrida === "completa", "--sin-via-rapida, una clase vigilada o .github/ → nunca la vía rápida de código");
    const muchas = (n) => Array.from({ length: n }, (_, i) => ({ nombre: `t${i}x`, carril: "e2e" }));
    e = exigencias(cc, { main: VERDE, local: estimarLocal(muchas(26), {}) });
    ok(!e.pruebasAqui && /^26 prueba\(s\), ~\d+ min: más que el tope/.test(e.noRapida), `más pruebas que el tope → camino normal, diciendo por qué (${e.noRapida})`);
    e = exigencias(cc, { main: VERDE, local: estimarLocal([], {}) });
    ok(!e.pruebasAqui && /ninguna prueba nombra lo tocado/.test(e.noRapida), "código sin ninguna prueba de lo tocado → camino normal (cualquier duda)");
    // El tope.
    let L = estimarLocal(muchas(7), {});
    ok(!L.ok && L.seg === 630 && /7 prueba\(s\), ~11 min: más que el tope/.test(L.motivo), "7 pruebas sin medir: 7 × 60 s × 1,5 = 630 s, más de 10 min → fuera del tope");
    L = estimarLocal(muchas(6), {});
    ok(L.ok && L.seg === 540, "6 pruebas sin medir: 540 s → dentro del tope");
    L = estimarLocal([{ nombre: "push8c", carril: "e2e" }, { nombre: "din9n4", carril: "e2e" }], { push8c: 328, din9n4: 246 });
    ok(!L.ok && L.seg === 861, "lo medido en el CI (pruebas/reparto.json): (328 + 246) s × 1,5 = 861 s → fuera del tope");
    L = estimarLocal([{ nombre: "a1x", carril: "e2e" }, { nombre: "alrevesX", carril: "alreves" }], { a1x: 10 });
    ok(L.ok && L.seg === 15 + 90 + 150, "una al revés suma sus dos pasadas reales de guardianes (150 s)");
    ok(!estimarLocal(muchas(26), Object.fromEntries(muchas(26).map((t) => [t.nombre, 1]))).ok && TOPE_LOCAL.pruebas === 25 && TOPE_LOCAL.seg === 600 && TOPE_LOCAL.sinMedir === 60 && TOPE_LOCAL.factor === 1.5, "el tope: 25 pruebas y 10 min (60 s la que no está medida, ×1,5); 26 cortas no caben");
    // El estado de main.
    ok(estadoDeMain([RM(9000, "success"), RM(9001, "failure")], REP).estado === "rojo" && estadoDeMain([RM(9002, "success"), RM(9001, "failure")], REP).estado === "verde", "main: manda la última corrida terminada de un push a main (la de id más alto), en cualquier orden");
    ok(estadoDeMain([RM(9003, "cancelled")], REP).estado === "duda" && estadoDeMain([RM(9004, "failure", { event: "workflow_dispatch" }), RM(9005, "failure", { head_branch: "x" }), RM(9006, "failure", { repository: { full_name: "x/y" } })], REP).estado === "duda", "main: cancelada, o solo corridas de otro evento, rama o repo → duda");
    // La parte directa (antes de --dirigida y --repaso) contra el abanico de la dirigida.
    const catD = catalogoDe(["pruebas/e2e/evt6c.cjs", "pruebas/e2e/adm7i.cjs", "pruebas/e2e/rec1j.cjs", "pruebas/e2e/com5g.cjs", "pruebas/alreves/alreves9vd.cjs"]);
    const busD = (a) => ({ "lib/eventos.ts": ["pruebas/e2e/evt6c.cjs"], "lib/arbol.cjs": ["pruebas/e2e/com5g.cjs", "pruebas/alreves/alreves9vd.cjs"], "guardianes/run.mjs": ["pruebas/e2e/adm7i.cjs"] })[a] ?? [];
    const arch = ["apps/web/lib/eventos.ts", "pruebas/lib/arbol.cjs", "guardianes/run.mjs", "pruebas/e2e/rec1j.cjs"];
    const dirD = dirigida({ archivos: arch, catalogo: catD, buscar: busD }).pruebas.map((t) => t.nombre).sort(), dirL = seleccionDirecta({ archivos: arch, catalogo: catD, buscar: busD }).map((t) => t.nombre).sort();
    ok(dirL.join() === "evt6c,rec1j" && dirD.includes("adm7i") && dirD.includes("com5g"), `la parte directa: las cambiadas y las que nombran un archivo cambiado de apps/ o packages/, no el abanico de pruebas/lib y guardianes (directa ${dirL.join(" ")}; dirigida ${dirD.join(" ")})`);
    ok(seleccionDirecta({ archivos: arch, catalogo: catD, buscar: busD, primero: ["adm7i"] })[0]?.nombre === "adm7i", "en el repaso, la parte directa empieza por las rojas de R1");
    const sel = [{ nombre: "a1x", carril: "e2e", por: ["nombra x"] }, { nombre: "b1x", carril: "e2e", por: ["cambiada"] }, { nombre: "c1x", carril: "e2e", por: ["nombra y"] }, { nombre: "d1x", carril: "e2e", por: ["nombra z"] }];
    let R = recortarLocal(sel, { a1x: 200, b1x: 200, c1x: 50, d1x: 100 });
    ok(R.correr.map((t) => t.nombre).join() === "b1x,c1x,d1x" && R.soloCI.map((t) => t.nombre).join() === "a1x", `recortar: primero la cambiada, luego las más cortas; lo que no cabe queda solo para el CI (${R.correr.map((t) => t.nombre).join(" ")} | ${R.soloCI.map((t) => t.nombre).join(" ")})`);
    R = recortarLocal(sel, { a1x: 200, b1x: 200, c1x: 50, d1x: 100 }, { primero: ["a1x"] });
    ok(R.correr[0]?.nombre === "a1x" && R.seg <= TOPE_LOCAL.seg, "recortar: las rojas de R1 van antes que todo, sin pasarse del tope");
    R = recortarLocal(muchas(30), Object.fromEntries(muchas(30).map((t) => [t.nombre, 1])));
    ok(R.correr.length === 25 && R.soloCI.length === 5, "recortar: nunca más de 25 pruebas aquí");
    // El servidor de las pruebas locales y su base.
    const raiz = "/r/t";
    ok(evaluarServidor({ url: "u", proc: { ok: true, pid: 1, cwd: "/r/t/apps/web", nodeEnv: "development" }, raiz }).ok, "el servidor de desarrollo de este árbol → vale");
    ok(NO(evaluarServidor({ url: "u", proc: { ok: true, pid: 1, cwd: "/otro/apps/web", nodeEnv: "development" }, raiz }), /no este árbol/), "el servidor de desarrollo de OTRA copia → FALTA (sus pruebas no dirían nada de este árbol)");
    ok(NO(evaluarServidor({ url: "u", proc: { ok: true, pid: 1, cwd: "/r/t/apps/web", nodeEnv: "production" }, raiz }), /no es el servidor de desarrollo/) && NO(evaluarServidor({ url: "u", proc: { ok: true, pid: 1, cwd: "/r/t/apps/web", nodeEnv: null }, raiz }), /no es el servidor de desarrollo/), "un build (servir.sh, next start) → FALTA");
    ok(NO(evaluarServidor({ url: "u", proc: { ok: false, motivo: "nadie escucha en el puerto 3199" }, raiz }), /nadie escucha/), "nadie en el puerto → FALTA");
    const SAL = (y = {}) => ({ ok: true, base: { ok: true, migraciones: 217, ...y } });
    ok(evaluarSalud(SAL(), 217).ok && NO(evaluarSalud(SAL(), 218), /217 migraciones y HEAD trae 218/) && NO(evaluarSalud({ ok: false, base: { ok: false, error: "sin base" } }, 217), /no dice ok/) && NO(evaluarSalud(null, 217), /no respondió/) && NO(evaluarSalud(SAL(), 0), /no sé cuántas/), "la salud: ok y las migraciones de HEAD; si no, FALTA con el motivo");
    ok(contarMigraciones(["packages/db/migrations/0001_a.sql", "packages/db/migrations/x.txt", "packages/db/migrar.sh", "packages/db/migrations/sub/0002.sql"]) === 1, "las migraciones de HEAD: los .sql de packages/db/migrations");
    ok(urlLocal({}) === "http://127.0.0.1:3199" && urlLocal({ PRUEBAS_URL: "http://localhost:3120" }) === "http://localhost:3120" && urlLocal({ PRUEBAS_URL: " " }) === "http://127.0.0.1:3199", "el servidor de las pruebas locales: PRUEBAS_URL o, sin ella, :3199");
    const pags = ["apps/web/app/page.tsx", "apps/web/app/(app)/buscar/page.tsx", "apps/web/app/(app)/n/[id]/page.tsx", "apps/web/app/admin/page.tsx", "apps/web/app/admin/colas/page.tsx"];
    const ca = rutasACalentar({ textos: ["goto(B + '/buscar?q=x'); goto(`${B}/n/${N}`); fetch('/api/buscar'); goto(B + '/admin/colas?cola=1'); x('/tmp/foto.png'); goto(B + '/no-existe')"], paginas: pags, cambiados: ["apps/web/app/(app)/buscar/page.tsx", "apps/web/app/(app)/n/[id]/page.tsx"] });
    ok(ca.join() === "/,/buscar,/admin/colas", `calentar: la portada, las páginas cambiadas sin partes dinámicas y las rutas de la app que escriben las pruebas; nada de /api ni de archivos (${ca.join(" ")})`);
    const RL1 = (y) => `2026-11-24T10:00:00.1Z RESULTADOS ${JSON.stringify({ pedidas: ["a1x", "b1x"], verdes: ["a1x", "b1x"], rojas: [], inestables: [], completa: true, ...y })}`;
    ok(evaluarLocal({ salida: RL1(), codigo: 0, nombres: ["a1x", "b1x"] }).ok, "las pruebas de lo tocado en verde (RESULTADOS completa, sin rojas) → vale");
    ok(NO(evaluarLocal({ salida: RL1({ verdes: ["a1x"], rojas: ["b1x"] }), codigo: 1, nombres: ["a1x", "b1x"] }), /en rojo aquí: b1x/), "una roja aquí → FALTA");
    ok(NO(evaluarLocal({ salida: RL1({ verdes: ["a1x"], completa: false }), codigo: 130, nombres: ["a1x", "b1x"] }), /completa:false/), "completa:false (no corrieron todas) → FALTA");
    ok(NO(evaluarLocal({ salida: "nada", codigo: 0, nombres: ["a1x"] }), /no dejó su línea RESULTADOS/) && NO(evaluarLocal({ salida: RL1(), codigo: 0, nombres: ["a1x", "b1x", "c1x"] }), /no es de las pruebas pedidas/) && NO(evaluarLocal({ salida: RL1(), codigo: 1, nombres: ["a1x", "b1x"] }), /salió con 1/), "sin la línea RESULTADOS, de otras pruebas, o un código de salida que no es 0 → FALTA");
    ok(evaluarLocal({ salida: RL1({ inestables: ["b1x"] }), codigo: 0, nombres: ["a1x", "b1x"] }).inestables.join() === "b1x", "las inestables se dicen (en verde)");
    // --vigilar.
    const sh = s(10), RV = (id, y = {}) => ({ id, path: ".github/workflows/ci.yml", head_branch: "main", head_sha: sh, status: "completed", conclusion: "success", repository: { full_name: REP }, ...y, event: y.event ?? "push" });
    ok(elegirCorridaDeMain([RV(9, { head_sha: s(11) }), RV(10, { event: "workflow_dispatch" }), RV(7), RV(8)], sh, REP)?.id === 8 && elegirCorridaDeMain([RV(5, { head_branch: "pruebas" }), RV(6, { path: ".github/workflows/otro.yml" })], sh, REP) === null, "--vigilar: la corrida de ci.yml del push a main de ESE commit (la más nueva); otra rama, otro evento u otro flujo no");
    const rojo = veredictoDeMain(RV(8, { conclusion: "failure" }), [{ name: "tipos · build · guardianes", conclusion: "failure" }, { name: "web · x", conclusion: "success" }, { name: "dispositivo · x", conclusion: "skipped" }]);
    ok(veredictoDeMain(RV(8), [{ name: "a", conclusion: "success" }]).ok && !rojo.ok && /^ROJO: .*tipos · build · guardianes$/.test(rojo.linea) && rojo.rojos.length === 1 && !veredictoDeMain(RV(8, { conclusion: "cancelled" })).ok && !veredictoDeMain(RV(8, { status: "in_progress", conclusion: null })).ok, "--vigilar: verde solo con success (sale 0); roja, cancelada o sin terminar → 1, con los trabajos rojos");
    const fa = fallosDelRegistro("2026-11-24T10:00:00.1Z ##[group]Run node pruebas/correr.mjs\n2026-11-24T10:00:00.2Z [36;1m  echo ✗ no[0m\n2026-11-24T10:00:01Z ✗ adm7i            12 ✓    30 s  · ASSERT x\n2026-11-24T10:00:02Z [guardianes] FALLÓ: algo\n2026-11-24T10:00:03Z ##[error]Process completed with exit code 1.");
    ok(fa.length === 3 && /^✗ adm7i/.test(fa[0]) && /FALLÓ/.test(fa[1]) && /^##\[error\]/.test(fa[2]) && fallosDelRegistro("2026-11-24T10:00:01Z a\n2026-11-24T10:00:02Z b").join() === "a,b", `--vigilar: de cada trabajo rojo, sus líneas ✗ y FALLÓ sin el guion que enseña GitHub (o, si no hay, sus últimas líneas útiles)`);
    ok(ordenVigilar(sh) === `vigila la corrida de main: node scripts/ci/subir.mjs --vigilar ${sh}`, "--subir termina con la orden exacta para vigilar la corrida de main (no la espera)");
  }
  // La base.
  const b = (x) => comprobarBase({ limpio: true, mainEsAncestro: true, pruebasEsAncestro: true, ...x });
  ok(b({}).every((y) => y.ok), "árbol limpio y al día → a. en verde");
  ok(b({ mainEsAncestro: false }).some((y) => !y.ok && /FALTA: ponerse al día/.test(y.linea)), "main avanzó → FALTA");
  ok(b({ limpio: false }).some((y) => !y.ok) && b({ pruebasEsAncestro: false }).some((y) => !y.ok && /forzar/.test(y.linea)), "árbol sucio, o pruebas que no es ancestro (habría que forzar) → FALTA");
  // El sandbox.
  const H = "c0daa9c" + "1".repeat(33);
  const es = estadoDelSandbox(`2026-11-22T14:00:00.1Z / 200 0.123s\n2026-11-22T14:00:00.2Z /api/salud 200 0.05s\n2026-11-22T14:00:01Z 2026-11-22T13:58:00+00:00 tramos (ok, commit c0daa9c): base 3 s · total 292 s\n2026-11-22T14:00:02Z {"ok":true,"commit":"c0daa9c"}`, H);
  ok(es.sirve && es.rutas.length === 2 && /tramos \(ok/.test(es.tramos), "el sandbox sirve el commit (salud, tramos y rutas)");
  ok(!estadoDelSandbox('{"ok":true,"commit":"ee13605"}', H).sirve && !estadoDelSandbox("", H).sirve, "el sandbox sirve otro commit, o no contesta → no");
  // 24 nov · Los pasos locales a la vez: tipos, guardianes y textos arrancan juntos (ninguno espera a otro); las líneas salen en el orden de la lista;
  // los guardianes no repiten textos cuando textos va en su propio paso (y sí cuando van solos, como en una entrega de solo documentos).
  {
    const arr = []; const sueltos = [];
    const falso = (k, env) => new Promise((r) => { arr.push([k, env?.GUARDIANES_SIN_TEXTOS ?? ""]); sueltos.push(() => r({ ok: true, linea: k })); });
    const prom = correrLocales(["tipos", "guardianes", "textos"], falso);
    ok(arr.map((x) => x[0]).join() === "tipos,guardianes,textos", `pasos locales: tipos, guardianes y textos arrancan a la vez (${arr.map((x) => x[0]).join()})`);
    for (const f of sueltos.reverse()) f();
    const res = await prom;
    ok(res.map((x) => x.linea).join() === "tipos,guardianes,textos", "pasos locales: las líneas salen en el orden de la lista aunque terminen en otro orden");
    ok(arr.find((x) => x[0] === "guardianes")?.[1] === "1", "pasos locales: con textos en su propio paso, los guardianes no lo repiten (GUARDIANES_SIN_TEXTOS=1)");
    let raro = ""; try { await correrLocales(["build"], falso); } catch (e) { raro = String(e?.message ?? e); }
    ok(/desconocidos: build/.test(raro), "pasos locales: el build ya no es un paso local (decisión AR): pedirlo es un error, no un paso que no corre");
    const solos = []; await correrLocales(["guardianes"], (k, env) => { solos.push(env?.GUARDIANES_SIN_TEXTOS ?? ""); return Promise.resolve({ ok: true, linea: k }); });
    ok(solos.join() === "", "pasos locales: guardianes solos (entrega de documentos) siguen comprobando los textos");
  }
  console.log(`\n${bien}/${total} casos de subir`);
  return bien === total;
}

/* ── Entrada ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; }, flag = (k) => args.includes(k);
  const mas = (opt("--mas") ?? "").split(/\s+/).filter(Boolean);
  let codigo = 2;
  try {
    if (flag("--casos")) codigo = (await casos()) ? 0 : 1;
    else if (flag("--plan")) {
      const base = opt("--base") ?? "origin/main", cabeza = opt("--cabeza") ?? "HEAD";
      let rama = "<rama>"; try { rama = ramaActual(); } catch { /* en main o sin rama: la orden lleva <rama> */ }
      const p = await planear({ base, cabeza, mas, sinViaRapida: flag("--sin-via-rapida") });
      imprimirPlan({ base, rama, p });
      codigo = p.d.errores.length ? 1 : 0;
    } else if (flag("--dirigida")) codigo = await cmdDirigida({ mas, sinLocal: flag("--sin-local") });
    else if (flag("--repaso")) codigo = await cmdRepaso({ id: opt("--repaso"), mas, ensayo: flag("--ensayo"), sinLocal: flag("--sin-local") });
    else if (flag("--subir")) codigo = await cmdSubir({ ensayo: flag("--ensayo"), sinViaRapida: flag("--sin-via-rapida") });
    else if (flag("--local")) codigo = await cmdLocal({ mas, base: opt("--base") ?? "origin/main" });
    else if (flag("--vigilar")) { const v = opt("--vigilar"); codigo = await cmdVigilar({ sha: v && !v.startsWith("--") ? v : null }); }
    else console.log("Uso: node scripts/ci/subir.mjs --plan [--base origin/main] [--cabeza <commit>] [--mas \"a b\"] [--sin-via-rapida] | --dirigida [--mas \"a b\"] [--sin-local] | --repaso <id-corrida-roja> [--mas \"a b\"] [--ensayo] [--sin-local] | --subir [--ensayo] [--sin-via-rapida] | --local [--base origin/main] [--mas \"a b\"] | --vigilar [<sha>] | --casos");
  } catch (e) {
    console.log(`${e instanceof SinGithub ? "FALTA: GitHub no responde" : "FALTA: error"} · ${String(e?.message ?? e).split("\n")[0].slice(0, 300)} · no se subió nada`);
    codigo = 3;
  }
  process.exit(codigo);
}
