// Ronda 2 de demos · Eventos GRATIS y con RSVP en las 5 ciudades (misas y vigilias, hora del cuento, clases y clínicas gratis, deporte abierto,
// festivales, ferias de empleo). Semanales, mensuales, de un día y de varios días, con cupo, fechas llenas con lista de espera, y pasados con asistencia.
// Uso: node scripts/semilla/demos/r2-eventos-gratis.mjs  →  infra/pruebas/demos/demo-z-eventos-gratis.sql (determinista; solo node:fs/path/url).
// Las fechas son relativas al día de la ciudad al aplicarse (como la semilla 0035); los organizadores los elige la base entre los negocios activos.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CIUDADES, NOMBRE, SEMANAL, SEMANAL_EXTRA, MENSUAL, FESTIVAL, FESTIVAL_PASADO, UNICO, PASADO } from "./r2-eventos-gratis/plantillas.mjs";
import { usuarios } from "./r2-eventos-gratis/usuarios.mjs";
import { FUNCIONES, USUARIOS_SQL, PRINCIPAL } from "./r2-eventos-gratis/sql.mjs";

const aqui = dirname(fileURLToPath(import.meta.url)), salida = join(aqui, "..", "..", "..", "infra", "pruebas", "demos");
const FILE = "demo-z-eventos-gratis.sql";
const sub = (o, c) => ({ es: o.es.replaceAll("{C}", NOMBRE[c]), en: o.en.replaceAll("{C}", NOMBRE[c]) });

const lista = [];
let cont = 0;
const poner = (c, t, base, extra) => {
  cont += 1;
  const e = { k: `gz-${c}-${base.id}`, c, cat: base.cat, subs: base.subs || [], o: cont * 5 + CIUDADES.indexOf(c), f: base.f, ti: sub(base.ti, c), de: sub(base.de, c), t,
    h0: base.h0, h1: base.h1, dr: base.dr || 0, en: base.en, ...extra };
  for (const k of ["cap", "pm", "age", "kids", "bf", "lu", "gen", "dc", "ex", "full", "wl", "food"]) if (base[k] !== undefined) e[k] = base[k];
  if (e.en === "free") { delete e.cap; delete e.pm; delete e.full; delete e.wl; }
  lista.push(e);
};

CIUDADES.forEach((c, ci) => {
  // Semanales: uno por cada día de la semana (el calendario siempre tiene algo gratis cada día) + 4 extra.
  for (let dow = 0; dow < 7; dow++) {
    const ops = SEMANAL[dow], b = ops[(ci + dow) % ops.length];
    poner(c, "w", b, { dow, pn: 4 });
  }
  for (let j = 0; j < 4; j++) { const b = SEMANAL_EXTRA[(ci * 2 + j) % SEMANAL_EXTRA.length]; poner(c, "w", b, { dow: b.dow, pn: 3 }); }
  // Mensuales (3 de 5).
  for (let j = 0; j < 3; j++) { const b = MENSUAL[(ci + j) % MENSUAL.length]; poner(c, "m", b, { dd: 4 + ci * 3 + j * 5 }); }
  // Varios días.
  for (const b of FESTIVAL) {
    if (b.id === "cultural" && ci % 2 === 1) continue;
    if (b.id === "empleo2" && ci % 2 === 0) continue;
    poner(c, "x", b, { dh: b.dias, nd: b.nd, ...(b.ph ? { ph: b.ph } : { dd: b.dd + (ci % 3) }) });
  }
  for (const b of FESTIVAL_PASADO) poner(c, "x", b, { dh: b.dias, nd: b.nd, dd: b.dd - ci });
  // Sueltos futuros: las fechas fijas siempre + 10 rotando.
  const fijos = UNICO.filter((b) => ["gallo", "guadalupe", "reyes"].includes(b.id)), resto = UNICO.filter((b) => !["gallo", "guadalupe", "reyes"].includes(b.id));
  for (const b of fijos) poner(c, "s", b, { ph: b.ph });
  for (let n = 0; n < 10; n++) { const b = resto[(ci * 5 + n * 2) % resto.length]; poner(c, "s", b, { dd: Math.max(3, b.dd + (ci * 3) % 5 - 2) }); }
  // Sueltos pasados (7 de 12), con asistencia.
  for (let n = 0; n < 7; n++) { const b = PASADO[(ci * 3 + n) % PASADO.length]; poner(c, "s", b, { dd: b.dd - ci }); }
});

// Comprobaciones del generador: títulos únicos por ciudad, horas y cupos dentro de las reglas de la base.
const vistos = new Set();
for (const e of lista) {
  const k = `${e.c}|${e.ti.es}`;
  if (vistos.has(k)) throw new Error(`título repetido en ${e.c}: ${e.ti.es}`);
  vistos.add(k);
  if (e.ti.es.length > 70 || e.ti.en.length > 70) throw new Error(`título largo: ${e.ti.es}`);
  if (e.de.es.length > 400 || e.de.en.length > 400) throw new Error(`descripción larga: ${e.ti.es}`);
  if (e.h1 <= e.h0 || e.h1 > e.h0 + 720) throw new Error(`horas: ${e.ti.es}`);
  if (e.en === "rsvp" && e.cap > 0 && e.pm > e.cap) throw new Error(`party > cupo: ${e.ti.es}`);
}

const us = usuarios();
const sql = `-- Eventos gratis y con RSVP · ronda 2 de demos.
-- GENERADO por scripts/semilla/demos/r2-eventos-gratis.mjs (determinista: la misma entrada da el mismo SQL). SOLO SANDBOX; nunca corre en producción.
-- ${lista.length} eventos en hzl/alw/wbr/scr/rdg: semanales (cada día de la semana en cada ciudad), mensuales, de un día y de varios días; RSVP con cupo,
-- fechas llenas con lista de espera y pasados con asistencia. Los vecinos de los RSVP son +1 717 555 7500–7999 (ficticios). Repetible: un evento con el
-- mismo título en la ciudad no se vuelve a crear; nada se borra.
begin;
set local statement_timeout = 0;
${USUARIOS_SQL(us)}${FUNCIONES}${PRINCIPAL(lista)}
commit;
`;
mkdirSync(salida, { recursive: true });
writeFileSync(join(salida, FILE), sql);
const por = (f) => lista.filter(f).length;
console.log(`${FILE}: ${lista.length} eventos (${por((e) => e.t === "w")} semanales, ${por((e) => e.t === "m")} mensuales, ${por((e) => e.t === "x")} de varios días, ${por((e) => e.t === "s")} de un día; ${por((e) => e.en === "rsvp")} con RSVP, ${por((e) => e.en === "free")} entrada libre), ${us.length} vecinos, ${(sql.length / 1e6).toFixed(2)} MB`);
