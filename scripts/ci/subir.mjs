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
     --subir --sin-via-rapida      fuerza el camino normal (con evidencia del CI) aunque la entrega sea de diseño.
     --casos                       los casos puros (sin red, sin tocar el repo); los corre el guardián subidaConHerramienta.
   Las clases solo SUMAN exigencias, nunca certifican: «sensible» es mejor esfuerzo (rutas + señales en los renglones cambiados) y lo que no
   caza sube como normal. La garantía que no depende de la clase es tipos + guardianes siempre y la evidencia del CI del mismo árbol.
   Juzga con sus listas y con las de origin/main (si allí existe esta herramienta) y manda lo más estricto (la unión). La única clase que afloja,
   «diseno», exige que las dos la den: sin la herramienta de main, con una de main sin la vía rápida o con un error, no hay vía rápida.
   La evidencia es la línea «EVIDENCIA {json}» que imprime el trabajo final de ci.yml («la tubería») solo si todo lo pedido dio verde; la línea
   sola no vale: la conclusión de la corrida y de ese trabajo se leen de la API (como scripts/ci/corrida.mjs). Guardián subidaConHerramienta;
   al revés: alrevesSubir. */
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
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
  return { clases: [...cl].sort(), soloDocumentos, otros, github, alrevesEntero, motivos, diseno, noDiseno };
}

/** Las clases de la cabeza (c) juzgadas también con las de origin/main (c2; null si no se pudo): manda lo más estricto. Las vigiladas se suman;
    «diseno» (la única que AFLOJA) solo queda si las dos la dan y la unión no tiene ninguna vigilada. */
export function combinar(c, c2, sinMain = "no pude juzgarla con las listas de origin/main") {
  const union = [...new Set([...(c?.clases ?? []), ...(c2?.clases ?? [])])].filter((k) => k !== "diseno");
  let noDiseno = "";
  if (!c?.diseno) noDiseno = c?.noDiseno || "la cabeza no la da por diseño";
  else if (!c2) noDiseno = `${sinMain} (cualquier duda = no es diseño)`;
  else if (c2.diseno === undefined) noDiseno = "la herramienta de origin/main todavía no tiene la vía rápida de diseño: manda lo más estricto (camino normal)";
  else if (!c2.diseno) noDiseno = `con las listas de origin/main no es diseño: ${c2.noDiseno || "sin motivo"}`;
  else if (union.some((k) => VIGILADAS.includes(k)) || c.github || c2.github) noDiseno = `la entrega es «${union.find((k) => VIGILADAS.includes(k)) ?? "herramientas"}» con alguna de las dos listas`;
  const diseno = !noDiseno;
  return { ...c, clases: (diseno ? [...union, "diseno"] : union).sort(), soloDocumentos: !!(c?.soloDocumentos && (c2 ? c2.soloDocumentos : true)), github: !!(c?.github || c2?.github),
    alrevesEntero: !!(c?.alrevesEntero || c2?.alrevesEntero), motivos: [...new Set([...(c?.motivos ?? []), ...(c2?.motivos ?? [])])].filter((m) => diseno || !m.startsWith("diseno:")),
    diseno, noDiseno, disenoCabeza: !!c?.diseno };
}

/** Lo que exige una entrega según sus clases. sinViaRapida (--sin-via-rapida) fuerza el camino normal aunque sea de diseño. */
export function exigencias(c, { sinViaRapida = false } = {}) {
  if (c.soloDocumentos) return { locales: ["guardianes"], corrida: "ninguna", mainPrimero: false };
  // Vía rápida de diseño (AL): sin corrida previa; tipos, guardianes y textos aquí. Sin build local (decisión AR, 24 nov): la app se construía tres
  // veces (aquí 171 s, en el servidor y en el CI de main); la del servidor es la compuerta (deploy.sh sale ANTES de recrear si la imagen no se
  // construye: el sandbox sigue con lo de antes) y la del CI la vuelve a mirar. Las pruebas de punta a punta y al revés corren DESPUÉS, en la
  // corrida del push a main. Nunca con una clase vigilada ni con .github/ (se vuelve a mirar aquí).
  if (c.diseno === true && !sinViaRapida && !c.github && !c.clases.some((k) => VIGILADAS.includes(k)) && c.clases.includes("diseno"))
    return { locales: ["tipos", "guardianes", "textos"], corrida: "despues", mainPrimero: false };
  return { locales: ["tipos", "guardianes", "textos"], corrida: c.github ? "completa" : "dirigida", mainPrimero: c.clases.includes("despliegue") };
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

/** ¿Esta corrida es evidencia para subir el árbol de HEAD? Todo lo que decide sale de la API (corrida y trabajos) y de git; la línea EVIDENCIA
    solo dice el árbol y lo que se pidió, y se cruza con la API. */
export function evaluarCorrida({ run, trabajos, registro, rama, repo = REPO, arbolHead, arbolDeRun, difRunHead, propuesta = [], completa = false }) {
  try {
    if (!run || typeof run !== "object") return no("corrida vacía");
    if (run.path !== ".github/workflows/ci.yml") return no(`flujo ${run.path}`);
    if (run.repository?.full_name !== repo || run.head_repository?.full_name !== repo) return no("de otro repositorio");
    if (!rama || run.head_branch !== rama) return no(`de la rama ${run.head_branch}, no de ${rama}`);
    if (!["workflow_dispatch", "push"].includes(run.event)) return no(`evento ${run.event}`);
    if (run.status !== "completed" || run.conclusion !== "success") return no(`la corrida terminó ${run.status}/${run.conclusion}`);
    if (!Array.isArray(trabajos) || !trabajos.length) return no("sin trabajos");
    const tub = trabajos.filter((j) => /^la tubería /.test(nombreJ(j)));
    if (tub.length !== 1) return no(`«la tubería»: ${tub.length} trabajo(s); tiene que haber uno`);
    if (!verde(tub[0])) return no(`«la tubería» terminó ${tub[0]?.status}/${tub[0]?.conclusion}: su línea EVIDENCIA no vale`);
    const malo = trabajos.find((j) => !(verde(j) || (j?.status === "completed" && j?.conclusion === "skipped")));
    if (malo) return no(`«${nombreJ(malo).slice(0, 80)}» terminó ${malo?.status}/${malo?.conclusion}`);
    const e = evidenciaDelRegistro(registro);
    if (!e.ok) return e;
    const ev = e.ev;
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

async function planear({ base, cabeza, mas, sinViaRapida = false }) {
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
  // Sin la de main manda la de HEAD en todo, salvo la vía rápida de diseño: esa necesita que las dos la den (cualquier duda = no es diseño).
  const c = combinar(c0, c2, sinMain);
  return { head, archivos, c, d, ex: exigencias(c, { sinViaRapida }), conMain: !!c2, esHead, sinViaRapida };
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
  if (c.clases.includes("sensible")) console.log("  · sensible: lo revisa un modelo distinto del que lo escribió (regla 14; esta herramienta no lo puede comprobar)");
  console.log(`  · empuje: ${ex.mainPrimero ? "main primero, esperar «verificación · imágenes» en verde, después pruebas" : "git push --atomic origin HEAD:main HEAD:pruebas"}`);
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

async function cmdDirigida({ mas }) {
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

/** Lo que la vía rápida de diseño imprime al final de un --subir que empujó: dónde corren las pruebas que no se esperaron. No espera esa corrida. */
function avisoDespues({ repo, head, pruebas }) {
  let url = "";
  try { url = (api(`repos/${repo}/actions/workflows/ci.yml/runs?event=push&branch=main&head_sha=${head}&per_page=5`).workflow_runs ?? [])[0]?.html_url ?? ""; } catch { /* sin API: se dice cómo encontrarla */ }
  const donde = url || `la del commit ${head.slice(0, 12)} en https://github.com/${repo}/actions/workflows/ci.yml?query=branch%3Amain+event%3Apush (o: gh run list --repo ${repo} --workflow ci.yml --branch main --event push --commit ${head})`;
  console.log(`VÍA RÁPIDA DE DISEÑO (AL): las pruebas de punta a punta y al revés corren DESPUÉS, en la corrida de push de main: ${donde}`);
  console.log(`  pruebas que la dirigida habría propuesto (mirarlas en esa corrida): ${pruebas.map((t) => t.nombre).join(" ") || "(ninguna: nada del diff nombra una prueba)"} · y «al revés» entero`);
  console.log("  esta herramienta NO espera esa corrida: lo que cace se arregla en el bloque siguiente y se anota en REVISION (AD, AL)");
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
  const p = await planear({ base: "origin/main", cabeza: "HEAD", mas: [], sinViaRapida });
  const rapida = p.ex.corrida === "despues";
  console.log(`clases: ${p.c.clases.join(", ") || "(código de producto)"}${p.c.soloDocumentos ? " · SOLO documentos" : ""} · dirigida propuesta: ${p.d.pruebas.map((t) => t.nombre).join(" ") || "(vacía)"}${p.d.alrevesEntero ? " + al revés entero" : ""}`);
  if (!p.c.soloDocumentos) console.log(rapida ? "VÍA RÁPIDA DE DISEÑO (AL): tipos, guardianes y textos aquí (sin build: la imagen la construye el servidor); la punta a punta y «al revés» corren DESPUÉS, en la corrida del push a main"
    : `camino normal${p.c.diseno && sinViaRapida ? " (--sin-via-rapida)" : ` (vía rápida de diseño: no · ${p.c.noDiseno})`}`);
  for (const e of p.d.errores) linea({ ok: false, linea: `FALTA: ${e}` });
  // b.
  if (base.every((x) => x.ok)) {
    const t0 = Date.now();
    for (const x of await correrLocales(p.ex.locales)) linea(x);
    console.log(`  (comprobaciones locales a la vez: ${Math.round((Date.now() - t0) / 1000)} s en total)`);
    if (git("status", "--porcelain").trim()) linea({ ok: false, linea: "FALTA: las comprobaciones dejaron el árbol cambiado" });
  } else console.log(`NO CORRIÓ: ${p.ex.locales.join(", ")} (antes falta a.)`);
  // c.
  if (p.ex.corrida === "ninguna") console.log("CORRIÓ: evidencia del CI no exigida (solo documentos de trabajo)");
  else if (rapida) console.log("NO SE EXIGE: evidencia del CI antes de subir (vía rápida de diseño, AL): la punta a punta y «al revés» corren después, en la corrida del push a main");
  else {
    const runs = (api(`repos/${repo}/actions/workflows/ci.yml/runs?branch=${encodeURIComponent(rama)}&status=completed&per_page=30`).workflow_runs ?? []).filter((r) => r.conclusion === "success");
    let hallada = null; const motivos = [];
    for (const r of runs) {
      if (!SHA40.test(r.head_sha ?? "")) continue;
      if (!gitOk("cat-file", "-e", `${r.head_sha}^{commit}`) && !gitOk("fetch", "-q", "origin", r.head_sha)) { motivos.push(`${r.id}: no tengo su commit`); continue; }
      const arbolDeRun = git("rev-parse", `${r.head_sha}^{tree}`).trim();
      const difRunHead = git("diff", "--no-renames", "--name-only", "-z", r.head_sha, "HEAD").split("\0").filter(Boolean);
      if (arbolDeRun !== arbolHead && veredicto(difRunHead) !== "documentos") { motivos.push(`${r.id}: otro árbol`); continue; }
      const js = trabajosDe(repo, r.id), tub = js.filter((j) => /^la tubería /.test(nombreJ(j)));
      let registro = "";
      if (tub.length === 1) { try { registro = registroDe(repo, tub[0].id); } catch (e) { motivos.push(`${r.id}: no pude leer el registro de «la tubería»`); continue; } }
      const v = evaluarCorrida({ run: r, trabajos: js, registro, rama, repo, arbolHead, arbolDeRun, difRunHead, propuesta: p.d.pruebas, completa: p.ex.corrida === "completa" });
      if (v.ok) { hallada = r; break; }
      motivos.push(`${r.id}: ${v.motivo}`);
    }
    linea(hallada ? { ok: true, linea: `CORRIÓ: evidencia del CI · corrida ${hallada.id} (${hallada.event}, ${hallada.head_sha.slice(0, 12)}) en verde, de este árbol${hallada.head_sha === head ? "" : " salvo documentos de trabajo"}` }
      : { ok: false, linea: `FALTA: evidencia del CI para este árbol (${p.ex.corrida === "completa" ? "corrida COMPLETA" : "la dirigida propuesta"} en verde en ${rama}) · ${motivos.slice(0, 4).join(" · ") || "ninguna corrida en verde en la rama"}` });
  }
  const remotaRama = (() => { try { return git("ls-remote", "origin", `refs/heads/${rama}`).split(/\s/)[0]; } catch { return ""; } })();
  const plan = planDeEmpuje({ clases: p.c.clases, rama, remotaRama, head });
  if (falta || ensayo) {
    console.log(`${falta ? `no se sube: ${falta} cosa(s) FALTA` : "ensayo: todo está"} · empujaría, en este orden:`);
    for (const s of plan) console.log(`  · ${s.tipo === "push" ? "git " + s.args.join(" ") : s.tipo === "esperar-imagenes" ? "esperar «verificación · imágenes» en verde en la corrida de ese push a main" : "git ls-remote: main y pruebas en " + head.slice(0, 12)}`);
    if (rapida) console.log("  · y al final diría dónde corren DESPUÉS la punta a punta y «al revés» (vía rápida de diseño, AL), sin esperarlas");
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
      if (!verde(img)) { console.log(`FALTA: «verificación · imágenes» de la corrida ${run.id} terminó ${img?.status}/${img?.conclusion} (main quedó empujado; pruebas NO)`); return 1; }
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
    if (rapida) avisoDespues({ repo, head, pruebas: p.d.pruebas });
    return 1;
  }
  console.log(`CORRIÓ: el sandbox sirve ${head.slice(0, 12)}`);
  if (rapida) avisoDespues({ repo, head, pruebas: p.d.pruebas });
  return 0;
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
  const J = (name, conclusion = "success") => ({ name, status: "completed", conclusion });
  const trabajos = (x = {}) => {
    let js = [J("alcance (todo o solo documentos)"), J("verificación · señal rápida (tipos · guardianes · textos)"), J("verificación · contratos (Stripe)"), J("verificación · imágenes y producción como código"), J("verificación · base real (migraciones)"), J("tipos · build · guardianes"), J("seguridad · Semgrep"), J("web · build una vez para todos los grupos"),
      ...[1, 2, 3].map((i) => J(`punta a punta · al revés · ${i}/3`)), ...[1, 2, 3, 4].map((i) => J(`punta a punta · todas las fases · ${i}/4`)),
      J("dispositivo · ${{ matrix.id }}", "skipped"), J("confirmación · ${{ matrix.nombre }}", "skipped"), J("punta a punta · ancho ${{ matrix.id }}", "skipped"), J("la tubería (verde si todo lo que esta corrida pide salió en verde; el resumen dice qué no corr...")];
    if (x.completa) js = [...js.filter((j) => !/^(dispositivo|punta a punta · todas)/.test(j.name)), ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => J(`punta a punta · todas las fases · ${i}/8`)), ...["iphone-se", "iphone-15", "iphone-15-pro-max", "pixel", "galaxy", "ipad", "escritorio-1024", "escritorio-1280", "escritorio-1440"].map((n) => J(`dispositivo · ${n}`))];
    if (x.rojo) js = js.map((j) => (x.rojo.test(j.name) ? J(j.name, "failure") : j));
    if (x.saltado) js = js.map((j) => (x.saltado.test(j.name) ? J(j.name, "skipped") : j));
    if (x.sin) js = js.filter((j) => !x.sin.test(j.name));
    return js;
  };
  const SHA_RUN = s(3), ARBOL = s(4);
  const run = (x = {}) => ({ id: 77, head_sha: SHA_RUN, event: "workflow_dispatch", head_branch: rama, path: ".github/workflows/ci.yml", repository: { full_name: REP }, head_repository: { full_name: REP }, status: "completed", conclusion: "success", ...x });
  const ev = (x = {}) => ({ corrida: 77, intento: 1, sha: SHA_RUN, arbol: ARBOL, evento: "workflow_dispatch", rama: rama, entradas: { alcance: "regresion", partes: "4", solo: "evt6c alreves9vd" }, solo: ["evt6c", "alreves9vd"], ...x });
  const reg = (e = ev()) => `\uFEFF2026-11-22T14:05:07.0021101Z Current runner version\n2026-11-22T14:05:14.8774810Z [36;1m    console.log(["EVID", "ENCIA"].join("") + " " + j);[0m\n2026-11-22T14:05:15.1Z EVIDENCIA ${JSON.stringify(e)}\n2026-11-22T14:05:15.2Z ##[group]Run actions/upload-artifact@v4`;
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
    } else if (flag("--dirigida")) codigo = await cmdDirigida({ mas });
    else if (flag("--subir")) codigo = await cmdSubir({ ensayo: flag("--ensayo"), sinViaRapida: flag("--sin-via-rapida") });
    else console.log("Uso: node scripts/ci/subir.mjs --plan [--base origin/main] [--cabeza <commit>] [--mas \"a b\"] [--sin-via-rapida] | --dirigida [--mas \"a b\"] | --subir [--ensayo] [--sin-via-rapida] | --casos");
  } catch (e) {
    console.log(`${e instanceof SinGithub ? "FALTA: GitHub no responde" : "FALTA: error"} · ${String(e?.message ?? e).split("\n")[0].slice(0, 300)} · no se subió nada`);
    codigo = 3;
  }
  process.exit(codigo);
}
