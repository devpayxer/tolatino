#!/usr/bin/env node
/* 9f · Extractor de cadenas (fase9-apertura.md §4 9f): lee los diccionarios de la interfaz que viven en el código y escribe
   apps/web/lib/cms-cadenas.json, el catálogo de cadenas con su llave ÁREA-MÓDULO-PANTALLA.clave. El código es la fuente; el despliegue lo indexa
   (scripts/cms/indexar.mjs → cms_indexar()) y el servidor sirve primero lo de la base y, si no hay, esto (apps/web/lib/cms.ts).
   Fuentes:
     · apps/web/lib/textos.ts      T {es,en}: lo general (WEB-GENERAL) y cada grupo (ficha → WEB-FICHA, buscar → WEB-BUSCAR…)
     · apps/web/lib/textos-home.ts HOME {es,en}: el Inicio de la ciudad (APP-HOME)
     · apps/web/lib/textos-acceso.ts ACCESO {es,en}: la landing de acceso anticipado (APP-LANDING-PRE, 9h)
     · apps/web/lib/textos-fijas.ts FIJAS {es,en}: las líneas de §1c (FIJAS-§1C), FIJAS (candado)
     · apps/web/lib/textos-cuenta.ts CUENTA {es,en}: el nombre de una cuenta borrada (USR-CUENTA), con candado
     · packages/db/seeds/lineas.sql: la línea fija de cada categoría (NEG-CATEGORIA.NEG-XXX.linea), con candado
     · 9f-3 · cada E2("…", "…") con dos textos fijos de apps/web (las pantallas: ~10 000 pares) → apps/web/lib/cms-cadenas-e2.json (ver cadenasE2)
   El largo máximo de una cadena editable es lo que cabe en su lugar: 1,5 veces la más larga de las dos lenguas (mínimo 40, máximo 600). Las líneas fijas
   (locked) no se editan: ni el largo importa.
   Uso:  node scripts/cms/extraer.mjs            escribe apps/web/lib/cms-cadenas.json y apps/web/lib/cms-cadenas-e2.json
         node scripts/cms/extraer.mjs --verificar   falla (1) si alguno no es el que sale del código (guardián cadenaConLlave) */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { AUTO, huellaPar, largo, sha } from "./huella.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SALIDA = join(RAIZ, "apps", "web", "lib", "cms-cadenas.json");
export const SALIDA_E2 = join(RAIZ, "apps", "web", "lib", "cms-cadenas-e2.json");
const ID = /^[A-Z0-9]+(-[A-Z0-9]+)*\.[A-Za-z0-9_.-]+$/;

/* Las hojas de un diccionario {es, en}: ruta → texto, por idioma. Las listas de textos llevan el número como clave (nav.0). */
function hojas(obj, pre = []) {
  const out = new Map();
  for (const [k, v] of Object.entries(obj)) {
    const ruta = [...pre, k];
    if (typeof v === "string") out.set(ruta.join("."), v);
    else if (Array.isArray(v)) v.forEach((x, i) => { if (typeof x === "string") out.set([...ruta, i].join("."), x); else for (const [r, t] of hojas(x, [...ruta, i])) out.set(r, t); });
    else if (v && typeof v === "object") for (const [r, t] of hojas(v, ruta)) out.set(r, t);
  }
  return out;
}
const MAYUS = (s) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toUpperCase();

async function leerTs(ruta, nombre) {
  const m = await import(pathToFileURL(join(RAIZ, ruta)).href);
  if (!m[nombre]) throw new Error(`${ruta} no exporta ${nombre}`);
  return m[nombre];
}

/* Dos diccionarios {es,en} con la misma forma → cadenas. pantalla(rutaPrimera) da la pantalla de cada hoja; clave = el resto de la ruta. */
function pares(dic, ruta, pantalla, errores, locked = false) {
  const es = hojas(dic.es), en = hojas(dic.en), out = [];
  for (const r of new Set([...es.keys(), ...en.keys()])) {
    if (!es.has(r) || !en.has(r)) { errores.push(`${ruta}: «${r}» está en un idioma y en el otro no`); continue; }
    const [pantallaId, clave] = pantalla(r);
    const id = `${pantallaId}.${clave}`;
    if (!ID.test(id)) { errores.push(`${ruta}: la llave «${id}» no tiene la forma ÁREA-MÓDULO-PANTALLA.clave`); continue; }
    out.push({ id, screen: pantallaId, es: es.get(r), en: en.get(r), locked });
  }
  return out;
}

export async function cadenasDelCodigo() {
  const errores = [], todas = [];
  const T = await leerTs("apps/web/lib/textos.ts", "T");
  todas.push(...pares(T, "apps/web/lib/textos.ts", (r) => {
    const [a, ...resto] = r.split(".");
    return resto.length && Number.isNaN(Number(resto[0])) ? [`WEB-${MAYUS(a)}`, resto.join(".")] : resto.length ? ["WEB-GENERAL", r] : ["WEB-GENERAL", a];
  }, errores));
  const H = await leerTs("apps/web/lib/textos-home.ts", "HOME");
  todas.push(...pares(H, "apps/web/lib/textos-home.ts", (r) => ["APP-HOME", r], errores));
  // 9h · La landing de acceso anticipado (APP-LANDING-PRE).
  const AC = await leerTs("apps/web/lib/textos-acceso.ts", "ACCESO");
  todas.push(...pares(AC, "apps/web/lib/textos-acceso.ts", (r) => ["APP-LANDING-PRE", r], errores));
  const F = await leerTs("apps/web/lib/textos-fijas.ts", "FIJAS");
  todas.push(...pares(F, "apps/web/lib/textos-fijas.ts", (r) => ["FIJAS-1C", r], errores, true));
  // El nombre de una cuenta borrada (9d): lo que la purga escribe y lo que se muestra; con candado.
  const C = await leerTs("apps/web/lib/textos-cuenta.ts", "CUENTA");
  todas.push(...pares(C, "apps/web/lib/textos-cuenta.ts", (r) => ["USR-CUENTA", r], errores, true));
  // La línea fija de cada categoría (la semilla del catálogo; con candado).
  const lineas = join(RAIZ, "packages", "db", "seeds", "lineas.sql");
  if (existsSync(lineas)) {
    for (const m of readFileSync(lineas, "utf8").matchAll(/fixed_line = '(\{[^']*\})'::jsonb[^;]*where id = '(NEG-[A-Z]+)'/g)) {
      const j = JSON.parse(m[1]);
      todas.push({ id: `NEG-CATEGORIA.${m[2]}.linea`, screen: "NEG-CATEGORIA", es: j.es, en: j.en, locked: true });
    }
  } else errores.push("falta packages/db/seeds/lineas.sql");
  const vistos = new Set();
  for (const c of todas) { if (vistos.has(c.id)) errores.push(`llave repetida: ${c.id}`); vistos.add(c.id); }
  const cadenas = todas.map((c) => {
    const max_len = c.locked ? Math.max(c.es.length, c.en.length) : largo(c.es, c.en);
    const f = { id: c.id, screen: c.screen, es: c.es, en: c.en, max_len, locked: c.locked };
    return { ...f, sha256: sha(f) };
  }).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const c of cadenas) if (AUTO.test(c.id)) errores.push(`${c.id}: una llave del diccionario no puede tener la forma de las de E2 (.e2-…)`);
  const e2 = await cadenasE2(cadenas, errores);
  return { errores, cadenas, e2 };
}

export const comoJson = (cadenas) => JSON.stringify({
  $fuente: "9f · Generado por scripts/cms/extraer.mjs desde el código (textos.ts, textos-home.ts, textos-fijas.ts y las líneas fijas de las categorías). No editar a mano.",
  version: 1, cadenas,
}, null, 1) + "\n";

/* ── 9f-3 · Las cadenas de las pantallas: cada E2("…", "…") con dos textos fijos (REVISION «Todas las pantallas por el CMS (18 nov)») ──
   Cada pantalla elige el idioma con su E2 local, que pasa por lib/dos-idiomas.ts (scripts/cms/e2-al-cms.mjs). Aquí se leen TODAS las llamadas con el
   árbol de TypeScript (no con expresiones regulares: comillas, escapes y comentarios salen bien) y cada PAR distinto es una cadena del catálogo:
   - El mismo par en muchos lugares es UNA cadena (como gettext): «donde» lista los archivos (relativos a apps/web) y «n» cuántas llamadas. Editar
     «Guardar» lo cambia en todos; el Super Admin lo muestra antes de guardar.
   - Solo pares de dos textos fijos ("…", '…' o `…` sin ${}). E2(`Hola ${n}`, …) no se edita (sigue saliendo del código).
   - Llave: <PANTALLA>.e2-<12 de la huella del par>. La pantalla (ÁREA-MÓDULO-PANTALLA, como las demás) sale del archivo donde más se usa la primera
     vez que el par aparece, y desde ahí se QUEDA (se lee del catálogo anterior): que el par se use en otro archivo no cambia su llave ni pierde lo
     editado. La huella sí es siempre la del par: un par que cambia en el código es otra cadena (la vieja queda en la base, sin borrar, y ya no se lista).
   - Sin texto que traducir (vacío o sin una letra en ninguno de los dos) no entra.
   - Con candado (no se edita en el Super Admin; solo cambia con el código): lo que contiene una línea fija del diccionario (§1c, las de cada categoría,
     «Cuenta borrada»), el 911, «nadie te garantiza un resultado», lo que dice que El Compa es una IA, y lo que un guardián exige palabra por palabra (guardianes/run.mjs: E2("…", "…")). */
const SIN_ACENTOS = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const PALABRAS = (s) => SIN_ACENTOS(s.replace(/^_+/, "")).replace(/([a-z0-9])([A-Z])/g, "$1-$2").split(/[^A-Za-z0-9]+/).filter(Boolean).map((x) => x.toUpperCase());
const AREAS = { "(app)": "APP", panel: "NEG-PANEL", "(puerta)": "PUERTA", repartidor: "REP", admin: "ADM", "(cascara)": "APP-CASCARA", "_cascara": "APP-CASCARA", "(sin-senal)": "APP-SIN-SENAL" };
/* La pantalla de un archivo: app/(app)/n/[id]/Mercado.tsx → APP-FICHA-MERCADO · app/panel/Menu.tsx → NEG-PANEL-MENU · lib/evt-publico.ts → LIB-EVT-PUBLICO. */
export function pantallaDe(rel) {
  const segs = rel.replace(/\.(tsx?|mjs)$/, "").split("/");
  let area, resto;
  if (segs[0] === "app") { area = AREAS[segs[1]] ?? "APP"; resto = AREAS[segs[1]] ? segs.slice(2) : segs.slice(1); }
  else { area = "LIB"; resto = segs.slice(1); }
  // Las palabras que la ruta ya dijo no se repiten: apartado/ApartadoEstado → ESTADO · panel/EventosPanel → EVENTOS · repartidor/Repartidor → REP.
  const ya = new Set([...area.split("-"), ...(segs[0] === "app" && AREAS[segs[1]] ? PALABRAS(segs[1]) : [])]);
  const tok = [];
  for (const s of resto) {
    if (/^\(.*\)$/.test(s) || /^\[.*\]$/.test(s) || /^(page|layout|route|index)$/.test(s)) continue;
    const w = (s === "n" ? ["FICHA"] : PALABRAS(s)).filter((x) => !ya.has(x));
    const p = w.join("-");
    // Una letra de la ruta (comunidad/p/[id], e/[code]) no dice nada.
    if (p.length < 2) continue;
    tok.push(p);
    for (const x of w) ya.add(x);
  }
  const partes = [area, ...(tok.length > 3 ? [tok[0], tok[tok.length - 1]] : tok)];
  let id = partes.join("-");
  while (id.length > 40 && partes.length > 2) { partes.splice(partes.length - 2, 1); id = partes.join("-"); }
  return id.slice(0, 40).replace(/-$/, "");
}

/* Lo que un guardián exige palabra por palabra: E2("…", "…") dentro de guardianes/run.mjs (en una expresión regular o en un texto). */
function exigidosPorGuardianes() {
  const f = join(RAIZ, "guardianes", "run.mjs"), out = new Set();
  if (!existsSync(f)) return out;
  const t = readFileSync(f, "utf8"), des = (x) => x.replace(/\\(.)/g, "$1");
  for (const m of t.matchAll(/E2\\?\(\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"/g)) out.add(des(m[1]) + "\u0001" + des(m[2]));
  return out;
}

export async function cadenasE2(cadenas, errores) {
  const ts = createRequire(join(RAIZ, "package.json"))("typescript");
  // Sin repetidos: en medio de un merge, git ls-files --cached lista un archivo en conflicto una vez por etapa (3) y contaba sus llamadas tres veces (18 nov).
  // 22 nov · Con -z: sin él un nombre con ñ o acento sale entre comillas y con escapes, y el archivo no se leía (guardián gitListaConZ).
  const archivos = [...new Set(execSync("git ls-files -z --cached --others --exclude-standard -- apps/web", { cwd: RAIZ, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\0"))]
    .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.d\.ts$/.test(f) && existsSync(join(RAIZ, f)));
  const pares = new Map(); // par → {es, en, n, donde: Map(archivo → n)}
  for (const f of archivos) {
    const src = readFileSync(join(RAIZ, f), "utf8");
    if (!src.includes("E2(")) continue;
    const rel = f.slice("apps/web/".length);
    const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, false, f.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const fijo = (x) => x && (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x));
    const ver = (n) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "E2" && n.arguments.length === 2 && fijo(n.arguments[0]) && fijo(n.arguments[1])) {
        const es = n.arguments[0].text, en = n.arguments[1].text;
        if (es.trim() && en.trim() && (/\p{L}/u.test(es) || /\p{L}/u.test(en))) {
          const k = es + "\u0001" + en;
          const p = pares.get(k) ?? pares.set(k, { es, en, n: 0, donde: new Map() }).get(k);
          p.n++; p.donde.set(rel, (p.donde.get(rel) ?? 0) + 1);
        }
      }
      ts.forEachChild(n, ver);
    };
    ver(sf);
  }
  // Las llaves que ya tenían (su pantalla se queda): «.e2-<huella>» → la llave entera.
  const antes = new Map();
  if (existsSync(SALIDA_E2)) { try { for (const c of JSON.parse(readFileSync(SALIDA_E2, "utf8")).cadenas ?? []) if (typeof c?.id === "string") antes.set(c.id.slice(c.id.indexOf(".")), c.id); } catch { /* catálogo roto: se rehace */ } }
  const fijas = cadenas.filter((c) => c.locked).flatMap((c) => [c.es, c.en]).map((x) => x.replace(/\s+/g, " ").trim()).filter((x) => x.length >= 8);
  const exigidos = exigidosPorGuardianes();
  const candado = (es, en) => {
    const t = `${es}\n${en}`.replace(/[ \t]+/g, " ");
    return /\b911\b/.test(t) || /El Compa es una IA|EL COMPA · IA|El Compa is an AI|EL COMPA · AI|nadie te garantiza un resultado|no one can guarantee (you )?a result/i.test(t) || fijas.some((x) => t.includes(x)) || exigidos.has(es + "\u0001" + en);
  };
  const out = [], vistas = new Map();
  for (const p of pares.values()) {
    const cola = `.e2-${huellaPar(p.es, p.en)}`;
    const donde = [...p.donde].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    let id = antes.get(cola);
    if (!id || !/^[A-Z0-9]+(-[A-Z0-9]+)*\.e2-[0-9a-f]{12}$/.test(id) || id.indexOf(".") > 40) id = pantallaDe(donde[0][0]) + cola;
    if (vistas.has(id)) { errores.push(`dos pares con la misma llave ${id} («${vistas.get(id)}» y «${p.es}»): alarga la huella`); continue; }
    vistas.set(id, p.es);
    const locked = candado(p.es, p.en);
    const max_len = locked ? Math.max(p.es.length, p.en.length) : largo(p.es, p.en);
    const c = { id, screen: id.slice(0, id.indexOf(".")), es: p.es, en: p.en, max_len, locked };
    out.push({ ...c, n: p.n, donde: donde.map(([f]) => f).sort(), sha256: sha(c) });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/* El catálogo de E2: una cadena por línea (diez mil filas: diffs legibles y un archivo chico); sin la huella (la calcula quien la usa: huella.mjs). */
export const comoJsonE2 = (e2) => '{\n "$fuente": "9f-3 · Generado por scripts/cms/extraer.mjs desde cada E2 de apps/web con dos textos fijos (un par = una cadena; donde = los archivos, n = las llamadas). No editar a mano.",\n "version": 1,\n "cadenas": [\n'
  + e2.map((c) => "  " + JSON.stringify({ id: c.id, es: c.es, en: c.en, max_len: c.max_len, locked: c.locked, n: c.n, donde: c.donde })).join(",\n") + "\n ]\n}\n";

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const t0 = Date.now();
  const { errores, cadenas, e2 } = await cadenasDelCodigo();
  if (errores.length) { for (const e of errores) console.error("✗ " + e); process.exit(1); }
  const json = comoJson(cadenas), jsonE2 = comoJsonE2(e2);
  const resumen = `${cadenas.length} con llave · ${e2.length} de E2 en ${e2.reduce((s, c) => s + c.n, 0)} llamadas (${e2.filter((c) => c.locked).length} con candado) · ${Date.now() - t0} ms`;
  if (process.argv.includes("--verificar")) {
    if (!existsSync(SALIDA) || readFileSync(SALIDA, "utf8") !== json) { console.error("✗ apps/web/lib/cms-cadenas.json no es el que sale del código: corre «node scripts/cms/extraer.mjs»"); process.exit(1); }
    if (!existsSync(SALIDA_E2) || readFileSync(SALIDA_E2, "utf8") !== jsonE2) { console.error("✗ apps/web/lib/cms-cadenas-e2.json no es el que sale del código: corre «node scripts/cms/extraer.mjs»"); process.exit(1); }
    console.log(`catálogo de cadenas al día: ${resumen}`);
  } else { writeFileSync(SALIDA, json); writeFileSync(SALIDA_E2, jsonE2); console.log(`catálogo de cadenas escrito: ${resumen} · ${(Buffer.byteLength(jsonE2) / 1024).toFixed(0)} KB el de E2`); }
}
