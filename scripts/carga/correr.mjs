#!/usr/bin/env node
/* 9b-3 · Corre la carga entera (o las partes que se pidan) en orden y deja la tabla de presupuestos: cada cifra medida con su presupuesto y si
   pasa. Uso: DATABASE_URL=… CARGA_SALIDA=… node scripts/carga/correr.mjs [comunidad eventos apps compa analitica] [--sin-generar]
   Sale con 1 si algo pasó de su presupuesto o falló (la tabla se imprime igual). Lo corre .github/workflows/carga.yml a mano. */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RAIZ } from "./lib/app.mjs";

const TODAS = ["comunidad", "eventos", "apps", "compa", "analitica", "direcciones"];
const pedidas = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const partes = pedidas.length ? pedidas : TODAS;
for (const p of partes) if (!TODAS.includes(p)) { console.error(`parte desconocida: ${p} (${TODAS.join(", ")})`); process.exit(2); }
const SALIDA = process.env.CARGA_SALIDA ?? join(RAIZ, ".carga"), R = join(SALIDA, "resultados.jsonl");
if (existsSync(R)) rmSync(R);
const codigos = {};
for (const p of partes) {
  const t = Date.now();
  console.log(`\n══ ${p}-1m ══`);
  const r = spawnSync(process.execPath, [join(RAIZ, "scripts/carga", `${p}-1m.mjs`), ...process.argv.slice(2).filter((x) => x.startsWith("--"))], { stdio: "inherit", env: process.env });
  codigos[p] = r.status;
  console.log(`══ ${p}-1m: código ${r.status} en ${((Date.now() - t) / 60000).toFixed(1)} min ══`);
}
const filas = existsSync(R) ? readFileSync(R, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const num = (x) => (x == null ? "—" : Number(x).toLocaleString("es-US"));
const md = ["| medida | LAUNCH | qué | presupuesto | p50 | p95 | ¿pasa? |", "|---|---|---|---|---|---|---|",
  ...filas.map((r) => `| ${r.id} | ${r.linea ?? "—"} | ${r.que ?? ""}${r.error ? ` (ERROR: ${r.error})` : ""} | ${r.presupuesto == null ? "sin presupuesto escrito" : `${num(r.presupuesto)} ${r.unidad ?? "ms"}`} | ${num(r.p50)} | ${num(r.p95)} | ${r.ok ? "sí" : "**NO**"} |`)];
writeFileSync(join(SALIDA, "tabla.md"), md.join("\n") + "\n");
console.log(`\n${md.join("\n")}\n`);
const malos = filas.filter((r) => !r.ok).length, caidas = Object.entries(codigos).filter(([, c]) => c !== 0 && c !== 1);
for (const [p, c] of caidas) console.log(`✗ ${p}-1m terminó con código ${c} (no llegó a medir todo)`);
console.log(`${filas.length - malos}/${filas.length} dentro del presupuesto · partes: ${Object.entries(codigos).map(([p, c]) => `${p} ${c === 0 ? "✓" : "✗"}`).join(" · ")}`);
process.exit(malos || caidas.length || !filas.length ? 1 : 0);
