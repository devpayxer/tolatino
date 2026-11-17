#!/usr/bin/env node
/* Negocios demo del sandbox · ronda 2 · Deporte (NEG-DEPORTE): las 38 subcategorías que la ronda 1 no cubrió (06 a 43) × 10 negocios = 380, 2 por ciudad.
   Reutiliza los ayudantes del grupo B (b/*.mjs) y su emisor de SQL; el motor y los datos propios están en r2-deporte/.
   Rangos reservados (ficticios, solo sandbox): dueños +1 484 555 2400–2999, clientes +1 717 555 1200–1499, números de operación 25000000–25999999
   (mismo prefijo I-… de las inscripciones, con una secuencia propia). Determinista; idempotente (llaves fijas, on conflict do nothing); nunca borra.
   Salida: infra/pruebas/demos/demo-x-deporte.sql. Uso: node scripts/semilla/demos/r2-deporte.mjs */
import { writeFileSync } from "node:fs";
import { emitir } from "./b/sql.mjs";
import { todos } from "./r2-deporte/motor.mjs";

const RAIZ = new URL("../../..", import.meta.url).pathname;
const B = todos(0);

let sql = emitir("Demo X · Deporte (NEG-DEPORTE) ronda 2: 38 subcategorías × 10 negocios Pro (2 por ciudad)", B);

/* Teléfonos: los del grupo B (570-555-8xxx clientes, 9xxx dueños) pasan a los rangos reservados de esta ronda. Los correos de los dueños llevan el mismo número. */
let fuera = 0;
sql = sql.replace(/\+1570555([89]\d{3})/g, (_, d) => { const n = +d; if (n < 9000) { if (n - 8250 > 299) fuera++; return `+1717555${1200 + (n - 8250)}`; } if (n - 9250 > 599) fuera++; return `+1484555${2400 + (n - 9250)}`; });
sql = sql.replace(/\.(9\d{3})@demo\.example/g, (_, d) => `.${2400 + (+d - 9250)}@demo.example`);
if (fuera) throw new Error(`teléfonos fuera de rango: ${fuera}`);

/* Números de operación: una secuencia propia en 25000000–25999999 en lugar de insc_seq / operations_appt_seq. */
const antes = (sql.match(/nextval\('(insc_seq|operations_appt_seq)'\)/g) ?? []).length;
sql = sql.replace(/nextval\('(insc_seq|operations_appt_seq)'\)/g, "nextval('r2_deporte_seq')");
if (!antes) throw new Error("no se encontró la secuencia de números de operación");
sql = sql.replace(/\nbegin;/, "\nbegin;\ncreate sequence if not exists r2_deporte_seq start 25000000 minvalue 25000000 maxvalue 25999999;");

writeFileSync(`${RAIZ}infra/pruebas/demos/demo-x-deporte.sql`, sql);
const n = (f) => B.reduce((s, b) => s + f(b), 0);
console.log(`deporte r2: ${B.length} negocios · ${n((b) => b.items.length)} servicios · ${n((b) => b.ops.length)} operaciones · ${n((b) => b.reviews.length)} reseñas · ${n((b) => b.posts.length)} novedades · ${n((b) => b.follows.length)} seguidores · ${(sql.length / 1024 / 1024).toFixed(1)} MB`);
