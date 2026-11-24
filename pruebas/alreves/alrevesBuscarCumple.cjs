// 24 nov · Prueba al revés del guardián buscarCumpleLaSugerencia (fallo visto por el fundador: «Arro» prometía resultados en la sugerencia y al
// buscar salía «No encontramos»): se inyecta el defecto, el guardián debe fallar con SU mensaje ([buscarCumpleLaSugerencia]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'buscarCumpleLaSugerencia';
const P = 'apps/web/app/(app)/buscar/page.tsx', A = 'apps/web/app/api/buscar/route.ts';
const casos = [
  [P, '    const x = await buscarTodo(true);', '    const x = await buscarTodo(false);', 'el segundo intento no completa la palabra'],
  [P, '  if (E.grupos.length && r.total === 0 && cuentaPlatos(PL) === 0) {', '  if (false) {', 'nunca se intenta completar la palabra'],
  [P, 'orden, pagina: tab === "biz" ? pagina : 0, limite, vivo }),', 'orden, pagina: tab === "biz" ? pagina : 0, limite }),', 'los negocios no completan la palabra'],
  [P, 'userId: u?.id ?? null, vivo }),', 'userId: u?.id ?? null }),', 'los platos no completan la palabra'],
  [P, 'buscarEventos(tsq(E.grupos, true, vivo),', 'buscarEventos(tsq(E.grupos, true),', 'los eventos no completan la palabra'],
  [P, 'buscarVecinos(u.id, CIUDAD, tsq(E.grupos, true, vivo),', 'buscarVecinos(u.id, CIUDAD, tsq(E.grupos, true),', 'los vecinos no completan la palabra'],
  [P, 'textoRazon(b.name, RZ.get(b.id), E, es, { vivo: completada })', 'textoRazon(b.name, RZ.get(b.id), E, es)', 'la razón se calcula con la palabra entera'],
  [A, 'negocios(E, { punto: loc, cat, limite: 4, vivo: true })', 'negocios(E, { punto: loc, cat, limite: 4 })', 'la sugerencia deja de completar la palabra'],
];
let bien = 0;
for (const [f, a, b, que] of casos) {
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${G}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 60)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let falla = false, out = '';
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); } catch (e) { out = String(e.stderr).split('\n').find((l) => l.includes(`[${G}]`)) || ''; falla = !!out; }
  finally { fs.writeFileSync(ruta, orig); }
  console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${f.split('/').pop()}: ${que})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
const limpio = require('../lib/alreves-fin.cjs')(R);
console.log(`${bien}/${casos.length} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === casos.length && limpio ? 0 : 1);
