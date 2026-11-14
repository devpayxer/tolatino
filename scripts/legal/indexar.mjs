#!/usr/bin/env node
/* 9e · Indexa docs/legal/ en la base (legal_pages) — fase9-apertura.md §3.6 y §4 9e. Como la ayuda (scripts/ayuda/indexar.mjs): el repo es la
   fuente. Lee cada página (sus dos archivos, .es.md y .en.md, con la forma de scripts/legal/forma.mjs), saca su sha256 (los dos juntos) y escribe
   SQL que llama a legal_indexar() (el mismo sha256 que la última versión viva = nada cambia; si cambió, una versión NUEVA en borrador: el texto
   de una versión nunca cambia) y a legal_retirar() (lo que ya no está en el repo y no se publicó queda «retirado»). Publicar es del Super Admin,
   nunca de este script. No se conecta a nada: imprime el SQL en una sola transacción para psql. Si un archivo no tiene la forma, no escribe nada
   y sale con 1.
   Uso:  node scripts/legal/indexar.mjs | psql …      (deploy.sh lo corre aparte, después de la ayuda; si falla, la app sigue arriba)
         node scripts/legal/indexar.mjs --revisar      (solo revisa la forma; no imprime SQL) */
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JURISDICCION, leerLegal, parejaLegal } from "./forma.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIR = join(RAIZ, "docs", "legal");

/* Todas las páginas del repo: [{ jur, clave, es, en, sha256, source_path }] y los errores de forma. Lo usan este script y los guardianes. */
export function paginasLegales(dir = DIR) {
  const errores = [], paginas = [];
  if (!existsSync(dir)) return { errores: ["falta docs/legal/"], paginas };
  for (const jur of readdirSync(dir).filter((x) => statSync(join(dir, x)).isDirectory()).sort()) {
    if (!JURISDICCION.test(jur)) { errores.push(`docs/legal/${jur} — la carpeta es una jurisdicción: us, us-pa, us-nj…`); continue; }
    const fs = readdirSync(join(dir, jur)).filter((f) => f.endsWith(".md")).sort();
    const claves = [...new Set(fs.map((f) => f.replace(/\.(es|en)\.md$/, "")))];
    for (const clave of claves) {
      const lee = (l) => { const r = `docs/legal/${jur}/${clave}.${l}.md`; return existsSync(join(RAIZ, r)) ? { r, t: readFileSync(join(RAIZ, r), "utf8") } : null; };
      const fe = lee("es"), fn = lee("en");
      if (!fe || !fn) { errores.push(`docs/legal/${jur}/${clave} — van los dos idiomas: ${clave}.es.md y ${clave}.en.md`); continue; }
      const es = leerLegal(fe.t, fe.r), en = leerLegal(fn.t, fn.r);
      for (const [x, f] of [[es, fe.r], [en, fn.r]]) for (const [l, m] of x.errores) errores.push(`${f}${l ? ":" + l : ""} — ${m}`);
      if (es.errores.length || en.errores.length) continue;
      for (const m of parejaLegal(es, en)) errores.push(`docs/legal/${jur}/${clave} — ${m}`);
      paginas.push({ jur, clave, es, en, textos: [fe.t, fn.t], sha256: createHash("sha256").update(fe.t).update("\n\u0000\n").update(fn.t).digest("hex"), source_path: `docs/legal/${jur}/${clave}.{es,en}.md` });
    }
  }
  // Una adenda de un estado solo existe si la página general existe.
  for (const p of paginas) if (p.jur !== "us" && !paginas.some((x) => x.jur === "us" && x.clave === p.clave)) errores.push(`docs/legal/${p.jur}/${p.clave} — una adenda necesita su página general en docs/legal/us/`);
  return { errores, paginas };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { errores, paginas } = paginasLegales();
  if (errores.length) {
    console.error(`✗ docs/legal sin la forma única (${errores.length}):\n` + errores.map((x) => "  " + x).join("\n"));
    process.exit(1);
  }
  if (process.argv.includes("--revisar")) { console.log(`✓ docs/legal: ${paginas.length} páginas con la forma única`); process.exit(0); }
  const tag = "$l" + randomBytes(6).toString("hex") + "$";
  const lit = (s) => { if (s.includes(tag)) throw new Error("el texto contiene la etiqueta de cita"); return tag + s + tag; };
  const out = ["\\set ON_ERROR_STOP on", "begin;", "create temp table _legal (r text) on commit drop;"];
  for (const p of paginas) {
    const a = { key: p.clave, jurisdiction: p.jur, title: { es: p.es.titulo, en: p.en.titulo }, lead: { es: p.es.lead, en: p.en.lead },
      body: { es: p.es.cuerpo, en: p.en.cuerpo }, summary: { es: p.es.resumen.join("\n"), en: p.en.resumen.join("\n") }, text_date: p.es.meta.fecha,
      sha256: p.sha256, source_path: p.source_path };
    out.push(`insert into _legal select legal_indexar(${lit(JSON.stringify(a))}::jsonb);`);
  }
  out.push(`insert into _legal select 'retirada' from generate_series(1, legal_retirar(array[${paginas.map((p) => `'${p.clave}|${p.jur}'`).join(",")}]::text[]));`);
  out.push(`select 'legal: ' || count(*) filter (where r = 'nueva') || ' nuevas · ' || count(*) filter (where r = 'cambiada') || ' cambiadas · '
  || count(*) filter (where r = 'igual') || ' iguales · ' || count(*) filter (where r = 'retirada') || ' retiradas' from _legal;`);
  out.push("commit;");
  process.stdout.write(out.join("\n") + "\n");
}
