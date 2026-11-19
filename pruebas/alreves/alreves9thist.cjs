// Prueba al revés del guardián tablaConHistograma (19 nov): «mi lugar» de la Tabla del Barrio suma el histograma que mantiene la base (0188). Se
// inyecta el defecto, el guardián debe fallar con SU mensaje ([tablaConHistograma]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const T = 'apps/web/lib/tabla.ts', M = 'packages/db/migrations/0188_tabla_histograma.sql', G = 'tablaConHistograma';
const casos = [
  [G, T, "(select coalesce(sum(h.n), 0)::int from monthly_board_hist h where h.city_id = $1 and h.month = $2::date and h.col = '${col}' and h.v > greatest(mb.${col}, 0))", "(select count(*)::int from monthly_boards o where o.city_id = $1 and o.month = $2::date and not o.excluded and o.${col} > greatest(mb.${col}, 0))"],
  [G, M, "create trigger monthly_boards_hist after insert or update or delete on monthly_boards", "create trigger monthly_boards_hist after insert or update on monthly_boards"],
  [G, M, "when tg_op in ('UPDATE', 'DELETE') and not old.excluded", "when tg_op in ('UPDATE', 'DELETE')"],
  [G, M, "if pg_trigger_depth() < 2 then raise exception", "if false then raise exception"],
  [G, M, "lock table monthly_boards in share row exclusive mode;", ""],
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
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
