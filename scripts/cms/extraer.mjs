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
   El largo máximo de una cadena editable es lo que cabe en su lugar: 1,5 veces la más larga de las dos lenguas (mínimo 40, máximo 600). Las líneas fijas
   (locked) no se editan: ni el largo importa.
   Uso:  node scripts/cms/extraer.mjs            escribe apps/web/lib/cms-cadenas.json
         node scripts/cms/extraer.mjs --verificar   falla (1) si el archivo no es el que sale del código (guardián cmsCadenasAlDia) */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SALIDA = join(RAIZ, "apps", "web", "lib", "cms-cadenas.json");
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
const redondear = (n) => Math.ceil(n / 10) * 10;
const largo = (es, en) => Math.min(600, Math.max(40, redondear(Math.max(es.length, en.length) * 1.5)));
const sha = (c) => createHash("sha256").update(`${c.id}\u0000${c.es}\u0000${c.en}\u0000${c.max_len}\u0000${c.locked}`).digest("hex");

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
  return { errores, cadenas };
}

export const comoJson = (cadenas) => JSON.stringify({
  $fuente: "9f · Generado por scripts/cms/extraer.mjs desde el código (textos.ts, textos-home.ts, textos-fijas.ts y las líneas fijas de las categorías). No editar a mano.",
  version: 1, cadenas,
}, null, 1) + "\n";

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { errores, cadenas } = await cadenasDelCodigo();
  if (errores.length) { for (const e of errores) console.error("✗ " + e); process.exit(1); }
  const json = comoJson(cadenas);
  if (process.argv.includes("--verificar")) {
    if (!existsSync(SALIDA) || readFileSync(SALIDA, "utf8") !== json) { console.error("✗ apps/web/lib/cms-cadenas.json no es el que sale del código: corre «node scripts/cms/extraer.mjs»"); process.exit(1); }
    console.log(`cms-cadenas.json al día (${cadenas.length} cadenas)`);
  } else { writeFileSync(SALIDA, json); console.log(`cms-cadenas.json escrito (${cadenas.length} cadenas, ${cadenas.filter((c) => c.locked).length} con candado)`); }
}
