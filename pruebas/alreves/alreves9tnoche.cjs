// Prueba al revés del guardián nocheHorasQueSeEnvian (confirmación 44658035571, noc4c): la hoja «¿A qué hora llegan?» de Noche solo ofrece, esta
// noche, horas que enviar() acepta. Se inyecta el defecto (el selector vuelve a > ahora + 15, el margen de la mesa baja o no se usa, el servidor
// pide más), el guardián debe fallar con SU mensaje ([nocheHorasQueSeEnvian]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'nocheHorasQueSeEnvian', F = 'apps/web/lib/noche-reservas.ts';
const casos = [
  [F, "if (i > 0 || m > x.ahoraN + cerca) slots.push(m);", "if (i > 0 || m > x.ahoraN + 15) slots.push(m);"],
  [F, "LISTA_CERCA_MIN = 15, MESA_CERCA_MIN = 20;", "LISTA_CERCA_MIN = 15, MESA_CERCA_MIN = 15;"],
  [F, "LISTA_CERCA_MIN = 15, MESA_CERCA_MIN = 20;", "LISTA_CERCA_MIN = 15, MESA_CERCA_MIN = 19;"],
  [F, "const cerca = s.k === \"lista\" ? LISTA_CERCA_MIN : MESA_CERCA_MIN;", "const cerca = LISTA_CERCA_MIN;"],
  [F, "select respond_by > now() + interval '4 minutes' as ok", "select respond_by > now() + interval '10 minutes' as ok"],
  [F, "make_interval(mins => $7::int - 15)) at time zone $8) end", "make_interval(mins => $7::int - 30)) at time zone $8) end"],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(`${f.split('/').pop()}: ${a.slice(0, 40).replace(/\n/g, ' ')}`, r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
