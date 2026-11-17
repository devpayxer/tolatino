#!/usr/bin/env node
/* Negocios demo del sandbox · ronda 2 · Salud (NEG-SALUD): todas las subcategorías salvo las 5 primeras (ya hechas en la ronda 1, grupo-b),
   o sea NEG-SALUD-06 a 60: 55 subcategorías × 10 negocios (2 por ciudad) = 550 negocios Pro.
   Reutiliza las piezas del grupo B por import (b/negocio, b/citas, b/historia, b/sql); no edita nada de ellas.
   Teléfonos ficticios (solo sandbox): dueños +1 484 555 1200–1749, clientes +1 717 555 0600–0849, números de operación C-23000000 a C-23549999.
   Determinista: la misma salida cada vez. Salida: infra/pruebas/demos/demo-x-salud.sql (idempotente, nunca borra). Uso: node scripts/semilla/demos/r2-salud.mjs */
import { writeFileSync } from "node:fs";
import { emitir } from "./b/sql.mjs";
import { CLIENTES } from "./b/comun.mjs";
import { reiniciarIds } from "./b/negocio.mjs";
import { D1 } from "./r2-salud/datos1.mjs";
import { D2 } from "./r2-salud/datos2.mjs";
import { construir } from "./r2-salud/construir.mjs";

const RAIZ = new URL("../../..", import.meta.url).pathname;
const BASE_OP = 23000000, PASO_OP = 1000;

// El padrón de clientes del grupo B, con los teléfonos reservados para esta ronda (el SQL toma el teléfono de este mismo arreglo).
for (const c of CLIENTES) c.phone = `+1717555${String(600 + c.i).padStart(4, "0")}`;

reiniciarIds();
const SUBS = [...D1, ...D2].sort((a, b) => a.n - b.n);
const B = [];
for (const cfg of SUBS) for (let k = 0; k < 10; k++) B.push(construir(cfg, k, B.length));
if (B.length > 600) throw new Error("más de 600 dueños: se sale del rango reservado");

let sql = emitir("Demo X · Salud ronda 2 (NEG-SALUD-06 a 60): 550 negocios Pro, 55 subcategorías × 10", B);

// Números de operación del rango reservado: el SQL base usa la secuencia de la app; aquí se fijan por negocio (base + posición de la cita).
let i = 0, n = 0;
const marca = "'C-' || nextval('operations_appt_seq')";
const partes = sql.split(marca);
const conOps = B.map((b, idx) => ({ b, idx })).filter((x) => x.b.ops.length);
if (partes.length - 1 !== conOps.length) throw new Error(`bloques de operaciones: ${partes.length - 1} vs ${conOps.length}`);
sql = partes.map((p, j) => (j < conOps.length ? p + `'C-' || (${BASE_OP + conOps[j].idx * PASO_OP} + t.ord)` : p)).join("");
for (const x of conOps) { if (x.b.ops.length >= PASO_OP) throw new Error("demasiadas operaciones en un negocio"); n = Math.max(n, x.b.ops.length); i++; }

writeFileSync(`${RAIZ}infra/pruebas/demos/demo-x-salud.sql`, sql);
const sum = (f) => B.reduce((s, b) => s + f(b), 0);
console.log(`salud r2: ${B.length} negocios · ${sum((b) => b.items.length)} servicios · ${sum((b) => b.ops.length)} operaciones · ${sum((b) => b.reviews.length)} reseñas · ${sum((b) => b.posts.length)} novedades · ${sum((b) => b.follows.length)} seguidores · ${(sql.length / 1048576).toFixed(1)} MB`);
