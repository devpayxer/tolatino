#!/usr/bin/env node
/* Negocios demo del sandbox · grupo B: Belleza, Salud, Profesionales y Deporte (4 categorías × 5 subcategorías principales × 10 negocios = 200).
   Teléfonos ficticios (solo sandbox): dueños +1 570 555 9250–9499, clientes +1 570 555 8250–8499. Determinista: la misma salida cada vez.
   Salida: infra/pruebas/demos/demo-b-<categoria>.sql (uno por categoría; idempotentes, nunca borran). Uso: node scripts/semilla/demos/grupo-b.mjs [bell|salud|pro|deporte]. */
import { writeFileSync } from "node:fs";
import { emitir } from "./b/sql.mjs";

const RAIZ = new URL("../../..", import.meta.url).pathname;
const CATS = {
  bell: { mod: "./b/bell.mjs", ord: 0, titulo: "Demo B · Belleza (NEG-BELL): 50 negocios Pro, 5 subcategorías principales × 10", archivo: "demo-b-bell.sql" },
  salud: { mod: "./b/salud.mjs", ord: 50, titulo: "Demo B · Salud (NEG-SALUD): 50 negocios Pro, 5 subcategorías principales × 10", archivo: "demo-b-salud.sql" },
  pro: { mod: "./b/pro.mjs", ord: 100, titulo: "Demo B · Profesionales (NEG-PRO): 50 negocios Pro, 5 subcategorías principales × 10", archivo: "demo-b-pro.sql" },
  deporte: { mod: "./b/deporte.mjs", ord: 150, titulo: "Demo B · Deporte (NEG-DEPORTE): 50 negocios Pro, 5 subcategorías principales × 10", archivo: "demo-b-deporte.sql" },
};
const pedidas = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CATS);
for (const c of pedidas) {
  const C = CATS[c];
  if (!C) throw new Error(`categoría desconocida: ${c}`);
  const m = await import(C.mod);
  const B = m.todos(C.ord);
  const sql = emitir(C.titulo, B);
  writeFileSync(`${RAIZ}infra/pruebas/demos/${C.archivo}`, sql);
  const n = (f) => B.reduce((s, b) => s + f(b), 0);
  console.log(`${c}: ${B.length} negocios · ${n((b) => b.items.length)} servicios · ${n((b) => b.ops.length)} operaciones · ${n((b) => b.reviews.length)} reseñas · ${n((b) => b.posts.length)} novedades · ${n((b) => b.follows.length)} seguidores · ${(sql.length / 1024).toFixed(0)} KB`);
}
