#!/usr/bin/env node
/* Negocios demo del sandbox · ronda 2 · Profesionales (NEG-PRO): las 55 subcategorías que la ronda 1 no cubrió (06–60) × 10 negocios = 550, 2 por ciudad.
   Teléfonos ficticios (solo sandbox): dueños +1 484 555 1800–2399, clientes +1 717 555 0900–1199, números de operación C-24000000–C-24999999.
   Determinista: la misma salida cada vez. Salida: infra/pruebas/demos/demo-x-pro.sql (idempotente, nunca borra). Uso: node scripts/semilla/demos/r2-pro.mjs */
import { writeFileSync } from "node:fs";
import { emitir } from "./r2-pro/sql.mjs";
import { todos } from "./r2-pro/construir.mjs";

const RAIZ = new URL("../../..", import.meta.url).pathname;
const B = todos();
const sql = emitir("Demo X · Profesionales ronda 2 (NEG-PRO): 55 subcategorías × 10 negocios Pro, 2 por ciudad", B);
writeFileSync(`${RAIZ}infra/pruebas/demos/demo-x-pro.sql`, sql);
const n = (f) => B.reduce((s, b) => s + f(b), 0);
console.log(`pro (ronda 2): ${B.length} negocios · ${n((b) => b.items.length)} servicios · ${n((b) => b.ops.length)} operaciones · ${n((b) => b.reviews.length)} reseñas · ${n((b) => b.posts.length)} novedades · ${n((b) => b.follows.length)} seguidores · ${(sql.length / 1048576).toFixed(1)} MB`);
