#!/usr/bin/env node
/* 7a · Indexa docs/ayuda/ en la base (help_articles / help_chunks) — fase7-compa.md §2 0116 y §4 7a. El repo es la fuente: este script
   lee cada archivo con la forma única (scripts/ayuda/forma.mjs), lo parte por secciones e idioma y escribe SQL que llama a
   ayuda_indexar() (idempotente por sha256: el mismo archivo otra vez = nada cambia) y a ayuda_retirar() (lo que ya no está, «retirado»).
   No se conecta a nada: imprime el SQL en una sola transacción para psql. Si un archivo no tiene la forma, no escribe nada y sale con 1.
   Uso:  node scripts/ayuda/indexar.mjs | psql …      (deploy.sh lo corre aparte, después de migrar; si falla, la app sigue arriba)
         node scripts/ayuda/indexar.mjs --revisar      (solo revisa la forma; no imprime SQL) */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { leerAyuda, trozos } from "./forma.mjs";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "ayuda");
const archivos = readdirSync(DIR).filter((f) => f.endsWith(".md")).sort();
const errores = [], filas = [];
for (const f of archivos) {
  const texto = readFileSync(join(DIR, f), "utf8");
  const r = leerAyuda(texto, f);
  for (const [l, m] of r.errores) errores.push(`docs/ayuda/${f}${l ? ":" + l : ""} — ${m}`);
  if (r.errores.length) continue;
  const pantallas = [...new Set([...r.meta.pantallas.matchAll(/`([^`]+)`/g)].map((m) => m[1]).concat(r.meta.pantallas.match(/\b[A-Z]{2,}(?:-[A-Z0-9]+)+\b/g) ?? []))].slice(0, 40);
  filas.push({
    slug: r.slug, title: r.titulo, audience: r.meta.audiencia, topic: r.meta.tema, screens: pantallas, screens_text: r.meta.pantallas,
    version: r.meta.version, sha256: createHash("sha256").update(texto).digest("hex"),
    chunks: trozos(r.secciones).map((c) => ({ lang: c.lang, ord: c.ord, sec: c.sec, nivel: c.nivel === 2 ? 2 : 3, heading: c.heading, body: c.body, equipo: c.equipo })),
  });
}
if (errores.length) {
  console.error(`✗ docs/ayuda sin la forma única (${errores.length}):\n` + errores.map((x) => "  " + x).join("\n"));
  process.exit(1);
}
if (process.argv.includes("--revisar")) { console.log(`✓ docs/ayuda: ${filas.length} artículos con la forma única`); process.exit(0); }

const tag = "$a" + randomBytes(6).toString("hex") + "$";
const lit = (s) => { if (s.includes(tag)) throw new Error("el texto contiene la etiqueta de cita"); return tag + s + tag; };
const out = ["\\set ON_ERROR_STOP on", "begin;", "create temp table _ayuda (r text) on commit drop;"];
for (const x of filas) out.push(`insert into _ayuda select ayuda_indexar(${lit(JSON.stringify(x))}::jsonb);`);
out.push(`insert into _ayuda select 'retirado' from generate_series(1, ayuda_retirar(array[${filas.map((x) => `'${x.slug}'`).join(",")}]::text[]));`);
out.push(`select 'ayuda: ' || count(*) filter (where r = 'nuevo') || ' nuevos · ' || count(*) filter (where r = 'cambiado') || ' cambiados · '
  || count(*) filter (where r = 'igual') || ' iguales · ' || count(*) filter (where r = 'retirado') || ' retirados' from _ayuda;`);
out.push("commit;");
process.stdout.write(out.join("\n") + "\n");
