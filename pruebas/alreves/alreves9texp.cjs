// Prueba al revés del guardián exportarSinCorte (19 nov): «Descargar mis datos» ya no corta un archivo en 20 000 filas; sale entero en partes,
// leído con un cursor. Se inyecta el defecto, el guardián debe fallar con SU mensaje ([exportarSinCorte]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const X = 'apps/web/lib/datos/exportar.ts', G = 'exportarSinCorte';
const casos = [
  [G, X, 'args: [cuenta], fuera, tabla: f.tabla });', 'args: [cuenta], fuera, tabla: f.tabla }); void "limit 20000";'],
  [G, X, "from businesses where id = $1`),", "from businesses where id = $1 limit 1`),"],
  [G, X, 'from reviews r join users u on u.id = r.user_id where r.business_id = $1 order by r.created_at desc, r.id`', 'from reviews r join users u on u.id = r.user_id where r.business_id = $1 order by r.created_at desc, r.id limit 20000`'],
  [G, X, 'await c.query(`declare ${cur} no scroll cursor for ${q.sql}`, q.args);', 'await c.query(q.sql, q.args);'],
  [G, X, 'const r = await c.query<Fila>(`fetch forward ${tam} from ${cur}`);', 'const r = await c.query<Fila>(`select * from ${cur}`);'],
  [G, X, 'await poner(`${q.nombre}-${s.partes}.json`, `${q.nombre}-${s.partes}.csv`, t);', 'await poner(`${q.nombre}.json`, `${q.nombre}.csv`, t);'],
  [G, X, '${v.partes > 1 ?', '${v.partes > 99 && false ?'],
  [G, X, 'const PARTE = 20_000', 'const PARTE = 2_000_000'],
  [G, 'pruebas/e2e/exp9t.cjs', 'ids.size === N', 'ids.size >= 0'],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, f.split('/').pop(), r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
