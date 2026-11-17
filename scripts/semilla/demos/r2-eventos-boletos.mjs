// Ronda 2 · Eventos con boletos de los negocios demo (Noche, Fiestas, Comida, Deporte, Iglesias, Educación) en las 5 ciudades.
// Uso: node scripts/semilla/demos/r2-eventos-boletos.mjs  →  infra/pruebas/demos/demo-z-eventos-boletos.sql (determinista, sin red ni base).
// Compradores +1717555 7000…7499; órdenes B-40000001… (rango reservado 40000000–40999999). SOLO SANDBOX.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { construirEventos, ventasDe, codigosDe, COMPRADORES } from "./r2-eventos-boletos/plan.mjs";
import { ENCABEZADO, FUNCIONES, crear, BLOQUE_EVENTOS, BLOQUE_ORDENES, BLOQUE_CAMBIOS, BLOQUE_PUERTA, BLOQUE_FINAL, PIE } from "./r2-eventos-boletos/sql.mjs";

const aqui = dirname(fileURLToPath(import.meta.url)), salida = join(aqui, "..", "..", "..", "infra", "pruebas", "demos");
const eventos = construirEventos();
const ordenes = [], rsvps = [], especs = [];
let n = 0, nr = 0;
for (const s of eventos) {
  const v = ventasDe(s);
  for (const o of v.orders) ordenes.push({ n: ++n, ...o });
  for (const p of v.rsvps) rsvps.push({ n: ++nr, ...p });
  // El SQL solo necesita la forma del evento (lo demás es ritmo de ventas del plan)
  const { fillR, free, pastN, lead, tpl, bizName, ...resto } = s;
  const codes = codigosDe(s, v.orders);
  especs.push({ ...resto, codes, cod: undefined, tks: s.tks, mesas: s.mesas, adds: s.adds });
}
if (n > 999999) throw new Error("más órdenes que el rango reservado");

const sql = ENCABEZADO + FUNCIONES + crear({ compradores: JSON.stringify(COMPRADORES), eventos: JSON.stringify(especs), ordenes: JSON.stringify(ordenes), rsvps: JSON.stringify(rsvps) })
  + [["A", BLOQUE_EVENTOS], ["B", BLOQUE_ORDENES], ["C", BLOQUE_CAMBIOS], ["D", BLOQUE_PUERTA], ["E", BLOQUE_FINAL]].filter(([k]) => (process.env.K20_BLOQUES || "ABCDE").includes(k)).map(([, v]) => v).join("") + PIE;
mkdirSync(salida, { recursive: true });
const f = join(salida, "demo-z-eventos-boletos.sql");
writeFileSync(f, sql);
const por = (k) => especs.filter((e) => e.kind === k).length;
const tickets = ordenes.reduce((a, o) => a + o.t.reduce((s, x) => s + x[1], 0) + (o.m ? 1 : 0), 0);
console.log(`demo-z-eventos-boletos.sql: ${especs.length} eventos (${por("single")} de un día, ${por("series")} series, ${por("span")} varios días), ${ordenes.length} órdenes, ${tickets} boletos, ${rsvps.length} RSVP, ${(sql.length / 1e6).toFixed(2)} MB`);
