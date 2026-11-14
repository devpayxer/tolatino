#!/usr/bin/env node
/* 9f · Indexa las cadenas del código en la base (cms_strings) — fase9-apertura.md §4 9f. Lee apps/web/lib/cms-cadenas.json (lo que genera
   scripts/cms/extraer.mjs) y escribe SQL que llama a cms_indexar() por cada cadena: una nueva se crea con el texto del código; si el código cambió, el
   texto editado se respeta (salvo que ya no cumpla su largo o sus marcas, o sea una línea fija: esas vuelven al código); lo mismo otra vez no cambia nada
   (sha256). Nada se borra. No se conecta a nada: imprime el SQL en una sola transacción para psql. Si el archivo no tiene la forma, sale con 1.
   Uso:  node scripts/cms/indexar.mjs | psql …      (deploy.sh lo corre aparte, después de las páginas legales; si falla, la app sigue arriba) */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { cadenas } = JSON.parse(readFileSync(join(RAIZ, "apps", "web", "lib", "cms-cadenas.json"), "utf8"));
if (!Array.isArray(cadenas) || !cadenas.length) { console.error("✗ cms-cadenas.json vacío o sin la forma"); process.exit(1); }
const json = JSON.stringify(cadenas.map((c) => ({ id: c.id, screen: c.screen, es: c.es, en: c.en, max_len: c.max_len, locked: c.locked, sha256: c.sha256 })));
const tag = "cms" + Math.random().toString(36).slice(2, 10);
const Q = "$" + tag + "$";
if (json.includes(Q)) { console.error("✗ etiqueta repetida"); process.exit(1); }
console.log("begin;");
console.log(`with r as (select cms_indexar(e) as r from jsonb_array_elements(${Q}${json}${Q}::jsonb) e)
select format('cms: %s nuevas · %s cambiadas · %s fijas · %s iguales', count(*) filter (where r = 'nueva'), count(*) filter (where r = 'cambió'), count(*) filter (where r = 'fija'), count(*) filter (where r = 'igual')) from r;`);
console.log("commit;");
