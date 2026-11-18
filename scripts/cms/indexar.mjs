#!/usr/bin/env node
/* 9f · Indexa las cadenas del código en la base (cms_strings) — fase9-apertura.md §4 9f. Lee apps/web/lib/cms-cadenas.json (lo que genera
   scripts/cms/extraer.mjs) y escribe SQL que llama a cms_indexar() por cada cadena: una nueva se crea con el texto del código; si el código cambió, el
   texto editado se respeta (salvo que ya no cumpla su largo o sus marcas, o sea una línea fija: esas vuelven al código); lo mismo otra vez no cambia nada
   (sha256). Nada se borra. No se conecta a nada: imprime el SQL en una sola transacción para psql. Si el archivo no tiene la forma, sale con 1.
   9f-3 · También apps/web/lib/cms-cadenas-e2.json (cada E2("…", "…") de las pantallas, ~10 000): la huella la calcula aquí (scripts/cms/huella.mjs, la
   misma del extractor). Sin node_modules: corre con el node de la imagen base. Se manda en tandas de 2 000 (un solo begin/commit).
   Uso:  node scripts/cms/indexar.mjs | psql …      (deploy.sh lo corre aparte, después de las páginas legales; si falla, la app sigue arriba) */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sha } from "./huella.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { cadenas } = JSON.parse(readFileSync(join(RAIZ, "apps", "web", "lib", "cms-cadenas.json"), "utf8"));
if (!Array.isArray(cadenas) || !cadenas.length) { console.error("✗ cms-cadenas.json vacío o sin la forma"); process.exit(1); }
const E2 = join(RAIZ, "apps", "web", "lib", "cms-cadenas-e2.json");
const e2 = existsSync(E2) ? JSON.parse(readFileSync(E2, "utf8")).cadenas : [];
if (!Array.isArray(e2)) { console.error("✗ cms-cadenas-e2.json sin la forma"); process.exit(1); }
const filas = [
  ...cadenas.map((c) => ({ id: c.id, screen: c.screen, es: c.es, en: c.en, max_len: c.max_len, locked: c.locked, sha256: c.sha256 })),
  ...e2.map((c) => {
    if (typeof c?.id !== "string" || typeof c.es !== "string" || typeof c.en !== "string" || !Number.isInteger(c.max_len) || typeof c.locked !== "boolean") { console.error("✗ cms-cadenas-e2.json: una cadena sin la forma"); process.exit(1); }
    const f = { id: c.id, screen: c.id.slice(0, c.id.indexOf(".")), es: c.es, en: c.en, max_len: c.max_len, locked: c.locked };
    return { ...f, sha256: sha(f) };
  }),
];
const tag = "cms" + Math.random().toString(36).slice(2, 10);
const Q = "$" + tag + "$";
const TANDA = 2000;
console.log("begin;");
console.log("create temp table cms_indexado (r text) on commit drop;");
for (let i = 0; i < filas.length; i += TANDA) {
  const json = JSON.stringify(filas.slice(i, i + TANDA));
  if (json.includes(Q)) { console.error("✗ etiqueta repetida"); process.exit(1); }
  console.log(`insert into cms_indexado select cms_indexar(e) from jsonb_array_elements(${Q}${json}${Q}::jsonb) e;`);
}
console.log(`select format('cms: %s nuevas · %s cambiadas · %s fijas · %s iguales', count(*) filter (where r = 'nueva'), count(*) filter (where r = 'cambió'), count(*) filter (where r = 'fija'), count(*) filter (where r = 'igual')) from cms_indexado;`);
console.log("commit;");
