// Prueba al revés de los guardianes de la auditoría del calendario (23 nov: «la prueba pasa o falla según el día, la hora o el mes en que corre»).
// Se inyecta el defecto, el guardián debe fallar con SU mensaje ([nombre]); se restaura. «crear»: se crea el archivo, se corre y se borra.
const ENT = require('../lib/entorno.cjs'); // rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const casos = [
  // hoyDeLaPruebaEnLaCiudad: din9t3 vuelve a comparar contra el día de Greenwich; el doble de hoyEn de din9t4 también; el ayudante deja de usar la zona
  ['hoyDeLaPruebaEnLaCiudad', 'pruebas/e2e/din9t3.cjs', "s.fin > hoyCiudad(), 'el siguiente paso", "s.fin > new Date().toISOString().slice(0, 10), 'el siguiente paso"],
  ['hoyDeLaPruebaEnLaCiudad', 'pruebas/e2e/din9t4.cjs', "hoyEn: (z, d) => hoyCiudad(z, d)", "hoyEn: () => new Date().toISOString().slice(0, 10)"],
  ['hoyDeLaPruebaEnLaCiudad', 'pruebas/e2e/din9t5.cjs', "hoyEn: (z, d) => hoyCiudad(z, d)", "hoyEn: () => new Date(Date.now()).toISOString().split('T')[0]"],
  ['hoyDeLaPruebaEnLaCiudad', 'pruebas/lib/hoy-ciudad.cjs', "{ timeZone: zona,", "{ timeZone: 'UTC',"],
  // 24 nov · compa7f vuelve a guardar el día como texto SQL (se recalcula en cada orden); msg2p reabre con el día recalculado
  ['hoyDeLaPruebaEnLaCiudad', 'pruebas/e2e/compa7f.cjs', "const HOY = sql(`select extract(dow from now() at time zone 'America/New_York')::int`);", "const HOY = `extract(dow from now() at time zone 'America/New_York')::int`;"],
  ['hoyDeLaPruebaEnLaCiudad', 'pruebas/e2e/msg2p.cjs', "and module = '' and weekday = ${HOY}`); if (compaAntes", "and module = '' and weekday = extract(dow from now() at time zone 'America/New_York')::int`); if (compaAntes"],
  // liquidacionDelMartesSinReloj: evt6e vuelve a terminar la fecha «hace 1 h» a secas
  ['liquidacionDelMartesSinReloj', 'pruebas/e2e/evt6e.cjs', "ends_at = ${FIN} where id = ${A.F}`);", "ends_at = now() - interval '1 hour' where id = ${A.F}`);"],
];
const crear = [
  // hoyDeLaPruebaEnLaCiudad: una prueba nueva con el día de UTC
  ['hoyDeLaPruebaEnLaCiudad', 'pruebas/e2e/zz23hoy.cjs', "const hoy = new Date().toISOString().slice(0, 10);\nconsole.log('✓', hoy);\n"],
  // liquidacionDelMartesSinReloj: una prueba nueva que mira pay_on y termina la fecha hace 30 minutos
  ['liquidacionDelMartesSinReloj', 'pruebas/e2e/zz23liq.cjs', "sql(`update event_dates set ends_at = now() - interval '30 minutes' where id = 1`);\nsql(`select pay_on > current_date from event_settlements`);\nconsole.log('✓');\n"],
];
let bien = 0, total = 0;
const correr = (g, env = {}) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe', env: { ...process.env, ...env } }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b, env] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g, env); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
for (const [g, f, c] of crear) {
  const ruta = path.join(R, f), dir = path.dirname(ruta), nuevo = !fs.existsSync(dir);
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); if (nuevo) try { fs.rmdirSync(dir); } catch { /* no vacía */ } }
  informe(g, `crear ${f.split('/').pop()}`, r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
