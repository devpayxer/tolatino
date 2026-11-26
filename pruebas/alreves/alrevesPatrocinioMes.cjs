// Prueba al revés del guardián patrocinioMesSinDeriva (23 nov): el mes de un patrocinio (lib/patrocinio.ts › fechasPeriodo, negocios y eventos) sale
// de LA regla de Pro (lib/periodo-pro.ts › finDePeriodo) con el ancla de su cadena, y nadie en apps/web/lib suma meses en SQL para un período (antes:
// interval '1 month' encadenado, 31 ene → 28 feb → 28 mar). Se inyecta el defecto, el guardián debe fallar con SU renglón; se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const PT = 'apps/web/lib/patrocinio.ts', PE = 'apps/web/lib/patrocinio-evento.ts', P = 'apps/web/lib/periodo-pro.ts', G = 'patrocinioMesSinDeriva';
const casos = [
  // Volver al interval '1 month' (el fallo del 23 nov).
  ['fechasPeriodo vuelve a interval \'1 month\'', PT, 'case when $3 = \'week\' then to_char((((dia + 7)::timestamp) at time zone tz)',
    'to_char((((dia + case when $3 = \'week\' then interval \'7 days\' else interval \'1 month\' end)::date)::timestamp at time zone tz) at time zone \'UTC\', \'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"\') as b0, case when $3 = \'week\' then to_char((((dia + 7)::timestamp) at time zone tz)'],
  ['el mes sin finDePeriodo', PT, 'b: new Date(finDePeriodo(Number(r.m0), "month", r.tz, ancla)).toISOString()', 'b: new Date(Number(r.m0) + 30 * 86_400_000).toISOString()'],
  // Perder el ancla, o la cadena.
  ['el mes pierde el ancla', PT, 'finDePeriodo(Number(r.m0), "month", r.tz, ancla)', 'finDePeriodo(Number(r.m0), "month", r.tz, null)'],
  ['la renovación sola no pasa su cadena', PT, 'f = (await fechasPeriodo(c, s.city_id, s.fin, s.duration, { tabla: "sponsorships", negocio: s.business_id, categoria: s.category_id }))!;', 'f = (await fechasPeriodo(c, s.city_id, s.fin, s.duration))!;'],
  ['comprar (y «Renovar otro mes») no pasa su cadena', PT, '  const f = await fechasPeriodo(null, n.city_id, desde, x.dur, { tabla: "sponsorships", negocio, categoria: n.category_id });', '  const f = await fechasPeriodo(null, n.city_id, desde, x.dur);'],
  ['las fechas de «Renovar otro mes» no pasan su cadena', PT, '  const f = await fechasPeriodo(null, n.city_id, v.dia, dur, { tabla: "sponsorships", negocio, categoria: n.category_id });', '  const f = await fechasPeriodo(null, n.city_id, v.dia, dur);'],
  ['la pantalla de las fechas no pasa su cadena', PT, 'desde === d.hoy ? "hoy" : desde, dur, { tabla: "sponsorships", negocio, categoria: n.category_id });', 'desde === d.hoy ? "hoy" : desde, dur);'],
  ['la renovación de un evento no pasa su cadena', PE, '(await fechasPeriodo(c, s.city_id, s.fin, s.duration, { tabla: "event_sponsorships", negocio: s.business_id, evento: s.event_id }))!;', '(await fechasPeriodo(c, s.city_id, s.fin, s.duration))!;'],
  ['la cadena cuenta lo terminado antes', PT, "(${x}.status = 'terminado' and ${x}.end_kind = 'vencio')", "${x}.status = 'terminado'"],
  ['la cadena mezcla semanas', PT, "`${x}.duration = 'month' and (", '`${x}.duration in (\'week\', \'month\') and ('],
  ['la cadena no exige que termine el día en que empieza el siguiente', PT, 'and (p.ends_at at time zone $3)::date = (r.ini at time zone $3)::date and p.starts_at < r.ini', 'and p.starts_at < r.ini'],
  ['sin importar la regla', PT, 'import { finDePeriodo } from "./periodo-pro";', 'import { finDePeriodo } from "./periodo-pro-copia";'],
  // La regla misma: sin recortar al último día, el 31 de un mes de 30 desborda.
  ['la regla sin el recorte', P, 'd: diaQueToca(y, m, A.d), h: A.h', 'd: A.d, h: A.h'],
  // La clase en cualquier otro archivo, y las excepciones son cerradas (línea exacta).
  ['otro archivo suma un mes en SQL', 'apps/web/lib/planes.ts', 'const mesSiguiente = (s: string, dia: number) =>', 'export const QX = "select now() + interval \'1 month\'";\nconst mesSiguiente = (s: string, dia: number) =>'],
  ['make_interval(months => …)', 'apps/web/lib/planes.ts', 'const mesSiguiente = (s: string, dia: number) =>', 'export const QY = "select now() + make_interval(months => 1)";\nconst mesSiguiente = (s: string, dia: number) =>'],
  ['la excepción de Inmuebles no tapa otra suma', 'apps/web/lib/inmuebles.ts', "+ interval '2 months')::date::text] as fechas", "+ interval '3 months')::date::text] as fechas"],
  ['la excepción de puestosLibres no tapa otra suma', PT, "x.t + case when $6 = 'week' then interval '7 days' else interval '1 month' end, null) < $5) as libre`", "x.t + case when $6 = 'week' then interval '7 days' else interval '2 months' end, null) < $5) as libre`"],
  // 26 nov · Las acciones (apps/web/app) también, y nadie llama a LA regla sin su ancla.
  ['una acción suma un mes en SQL', 'apps/web/app/admin/acciones-planes.ts', "+ interval '1 year') at time zone 'America/New_York'\";", "+ interval '1 year') at time zone 'America/New_York'\";\n  const QZ = \"select now() + interval '1 month'\";"],
  ['la excepción de licencias no tapa un mes', 'apps/web/app/admin/acciones-colas.ts', "then (now() + interval '3 months')::date else next_review end", "then (now() + interval '1 month')::date else next_review end"],
  ['el cobro de Pro llama a la regla sin ancla', 'apps/web/lib/suscripcion.ts', 'r?.tz || "America/New_York", r?.ancla ?? null))', 'r?.tz || "America/New_York"))'],
  ['el patrocinio llama a la regla sin ancla', PT, 'finDePeriodo(Number(r.m0), "month", r.tz, ancla)', 'finDePeriodo(Number(r.m0), "month", r.tz)'],
  ['la regla partida en varias líneas', PT, 'finDePeriodo(Number(r.m0), "month", r.tz, ancla)', 'finDePeriodo(Number(r.m0), "month",\n    r.tz, ancla)'],
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
