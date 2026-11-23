// Prueba al revés del guardián periodoProSinDesborde (23 nov): el fin del período pagado de Pro sale de LA regla (lib/periodo-pro.ts: el mismo día
// del mes siguiente; si ese mes no lo tiene, su último día; el día del ANCLA; la hora del ancla en la zona de la ciudad), con el ancla de la racha y
// la zona de la ciudad (lib/suscripcion.ts, finDelPeriodo), y nadie suma meses con setMonth/setFullYear. Se inyecta el defecto, el guardián debe
// fallar con SU renglón ([periodoProSinDesborde]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const S = 'apps/web/lib/suscripcion.ts', P = 'apps/web/lib/periodo-pro.ts', G = 'periodoProSinDesborde';
const casos = [
  // Volver a setMonth (el fallo del 23 nov), en los dos sitios.
  ['registrarPeriodo vuelve a setMonth', S, 'hasta = await finDelPeriodo(c, s.business_id, a.desde, a.cycle);',
    'const h0 = new Date(a.desde); h0.setMonth(h0.getMonth() + (a.cycle === "year" ? 12 : 1)); hasta = h0.toISOString();'],
  ['completarRenovacion vuelve a setMonth', S, 'const hasta = await finDelPeriodo(c, negocio, desde, s.cycle);',
    'const h0 = new Date(desde); h0.setMonth(h0.getMonth() + (s.cycle === "year" ? 12 : 1)); const hasta = h0.toISOString();'],
  // Quitar el recorte: el 31 en un mes de 30 (o en febrero) desborda.
  ['sin el recorte al último día', P, 'd: diaQueToca(y, m, A.d), h: A.h', 'd: A.d, h: A.h'],
  // Perder el ancla: 31 ene → 28 feb → 28 mar (deriva).
  ['la regla pierde el ancla', P, 'let A = ancla != null && Number.isFinite(ancla) && ancla <= desde ? partesEn(ancla, zona) : D;', 'let A = D; void ancla;'],
  ['el cobro no busca el ancla', S, 'r?.tz || "America/New_York", r?.ancla ?? null)', 'r?.tz || "America/New_York", null)'],
  ['el ancla no se corta en el último paso a Free', S, "\n                and z.created_at > coalesce((select s.ended_at from subscriptions s where s.business_id = $1), '-infinity'::timestamptz)) as ancla`", ') as ancla`'],
  // La hora: en la zona del proceso, o en UTC.
  ['la hora de pared en la zona del proceso', P, 'for (const x of formato(zona).formatToParts', 'for (const x of formato(Intl.DateTimeFormat().resolvedOptions().timeZone).formatToParts'],
  ['la hora fija en UTC (el cambio de horario la mueve)', P, 'return c.length ? c[0]! : w - antes;', 'return w + 5 * 3_600_000;'],
  ['la zona no es la de la ciudad', S, 'select ci.timezone from businesses b join cities ci on ci.id = b.city_id where b.id = $1', "select 'UTC'::text"],
  // Las excepciones son cerradas: otra suma de meses en esos archivos sí se caza; y la clase en cualquier otro archivo.
  ['la excepción de la Tabla no tapa otra suma', 'apps/web/lib/tabla.ts', 'siguiente.setUTCMonth(siguiente.getUTCMonth() + 1);', 'siguiente.setUTCMonth(siguiente.getUTCMonth() + 2);'],
  ['la excepción de Planes no tapa otro día', 'apps/web/lib/planes.ts', 'd.getUTCMonth() + 1, dia, 12)', 'd.getUTCMonth() + 1, dia + 3, 12)'],
  ['setDate en la hora del proceso', 'apps/web/lib/citas.ts', 'd.setUTCDate(d.getUTCDate() + i);', 'd.setDate(d.getDate() + i);'],
  ['new Date(y, m + 1, d) en otro archivo', 'apps/web/lib/apartados.ts', 'const addD = (s: string, n: number) => {', 'const mesMas = (y: number, m: number, d: number) => new Date(y, m + 1, d);\nconst addD = (s: string, n: number) => {'],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [que, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(que, r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
