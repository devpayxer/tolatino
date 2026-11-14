import "server-only";
import { alCambiarConfig } from "./cambios-config";
import { db } from "./db";
import cat from "./cms-cadenas.json";
import type { Lang } from "./idioma";
import { T } from "./textos";

/* 9f · Cadenas de la interfaz (fase9-apertura.md §4 9f). LA BASE PRIMERO, EL CÓDIGO DE RESPALDO: cada texto de la interfaz tiene una llave
   (ÁREA-MÓDULO-PANTALLA.clave, apps/web/lib/cms-cadenas.json, que extrae scripts/cms/extraer.mjs del código). Lo que alguien editó en el Super Admin
   (cms_strings: edited y vivo) se sirve en lugar del texto del código; sin edición —o si la base no responde— sale el del código, así que una pantalla nunca
   se corta por esto. Copia por proceso de 15 s que la base vacía al momento por NOTIFY (canal tl_config; cambios-config.ts). Solo se copia lo editado:
   son pocas filas, no las miles que el código ya tiene.
   - cadena(id, lang): un texto. pantalla(prefijo, lang): {clave: texto} de una pantalla (para pasarlo a un componente). textosT(lang): el diccionario T
     (lib/textos.ts) con lo editado encima, igual de forma que T[lang].
   - Quien usa una llave que no existe en el catálogo recibe la llave (se ve en las pruebas; el guardián cadenaConLlave lo caza antes). */
type Par = { es: string; en: string };
type Fila = { id: string; screen: string; es: string; en: string; locked: boolean };
const CODIGO = new Map<string, Fila>((cat.cadenas as Fila[]).map((c) => [c.id, c]));
const TTL_MS = 15_000;
let cache: { at: number; m: Map<string, Par> } | null = null, escucha = false;

async function editadas(): Promise<Map<string, Par>> {
  if (!escucha) { escucha = true; alCambiarConfig(() => { cache = null; }); }
  if (cache && Date.now() - cache.at < TTL_MS) return cache.m;
  try {
    const r = await db().query<{ id: string; text: Par }>(`select id, text from cms_strings where edited and status = 'vivo'`);
    cache = { at: Date.now(), m: new Map(r.rows.map((x) => [x.id, x.text])) };
  } catch {
    // La base no respondió: se sirve el código (y se vuelve a intentar pronto, sin quedarse con un vacío de 15 s).
    cache = { at: Date.now() - TTL_MS + 2_000, m: new Map() };
  }
  return cache.m;
}
/* Para las pruebas y el Super Admin: olvidar la copia ya. */
export function olvidarCadenas() { cache = null; }

export async function cadena(id: string, lang: Lang): Promise<string> {
  const e = (await editadas()).get(id);
  if (e && typeof e[lang] === "string" && e[lang]) return e[lang];
  const c = CODIGO.get(id);
  return c ? c[lang] : id;
}

/* Todas las cadenas de una pantalla (prefijo «APP-HOME») como {clave: texto}. */
export async function pantalla(prefijo: string, lang: Lang): Promise<Record<string, string>> {
  const e = await editadas(), out: Record<string, string> = {}, pre = prefijo + ".";
  for (const [id, c] of CODIGO) {
    if (!id.startsWith(pre)) continue;
    const x = e.get(id);
    out[id.slice(pre.length)] = x && x[lang] ? x[lang] : c[lang];
  }
  return out;
}

/* El diccionario T con lo editado encima (misma forma que T[lang]; los tipos no cambian). */
export async function textosT(lang: Lang): Promise<(typeof T)["es"]> {
  const e = await editadas();
  const base = T[lang] as unknown as Record<string, unknown>;
  if (!e.size) return base as unknown as (typeof T)["es"];
  const copia = structuredClone(base);
  for (const [id, par] of e) {
    const c = CODIGO.get(id);
    if (!c || !par[lang]) continue;
    const m = /^WEB-([A-Z0-9-]+)\.(.+)$/.exec(id);
    if (!m) continue;
    // Camino dentro de T: WEB-GENERAL.clave → T[clave]; WEB-FICHA.clave → T[ficha][clave]. Se busca la hoja cuyo texto del código coincide.
    ponerHoja(copia, m[1] === "GENERAL" ? [] : [m[1]!.toLowerCase()], m[2]!.split("."), c[lang], par[lang]);
  }
  return copia as unknown as (typeof T)["es"];
}
function ponerHoja(raiz: Record<string, unknown>, pre: string[], ruta: string[], codigo: string, nuevo: string) {
  let cur: unknown = raiz;
  // El grupo de WEB-<GRUPO> se escribe en mayúsculas sin distinguir: se busca la clave de T que coincide sin importar mayúsculas.
  const claves = [...pre.map((p) => porNombre(cur, p)), ...ruta];
  cur = raiz;
  for (let i = 0; i < claves.length - 1; i++) { cur = (cur as Record<string, unknown>)?.[claves[i]!]; if (cur == null || typeof cur !== "object") return; }
  const ultima = claves[claves.length - 1]!;
  const obj = cur as Record<string, unknown>;
  if (obj[ultima] === codigo) obj[ultima] = nuevo;
}
function porNombre(obj: unknown, nombre: string): string {
  if (obj && typeof obj === "object") for (const k of Object.keys(obj)) if (k.toLowerCase().replace(/[^a-z0-9]+/g, "-") === nombre) return k;
  return nombre;
}
