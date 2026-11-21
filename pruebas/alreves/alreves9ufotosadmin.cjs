// Prueba al revés del guardián fotosCifrasEnElAdmin (Fotos a la medida F4, 21 nov): una cifra que existe en el servidor (cifrasFotos,
// cifrasFotosPrivadas) tiene su pantalla en el Super Admin (Contenido › Auto-moderación › «Fotos a la medida»). Se inyecta el defecto, el guardián debe
// fallar con SU mensaje ([fotosCifrasEnElAdmin]); se restaura. La prueba de punta a punta es pruebas/e2e/fot9uadmin.cjs.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'fotosCifrasEnElAdmin', AC = 'apps/web/lib/admin-confianza.ts', AM = 'apps/web/app/admin/AutoModeracion.tsx';
const casos = [
  // admin-confianza deja de pedir las cifras o de pasarlas a la pantalla.
  [G, AC, 'await Promise.all([cifrasFotos(), cifrasFotosPrivadas()])', 'await Promise.all([Promise.resolve(null), cifrasFotosPrivadas()])'],
  [G, AC, '    medios: { pub: medPub, priv: medPriv },\n', ''],
  // La pantalla deja de mostrar una cifra, o el bloque entero.
  [G, AM, 'String(M.sinMaestra)', 'String(0)'],
  [G, AM, '${dec(M.vista640.ahorro * 100)}', '${dec(0)}'],
  [G, AM, 'v: mb(M.bytesVariantes)', 'v: mb(0)'],
  [G, AM, 'v: String(MP.convertidas)', 'v: String(0)'],
  [G, AM, '    ...bloquesMedios,\n', ''],
  [G, AM, 'E("FOTOS A LA MEDIDA", "PHOTOS SIZED TO FIT")', 'E("FOTOS A LA MEDIDA", "FOTOS A LA MEDIDA")'],
  // El bloque deja de ser solo lectura.
  [G, AM, 'v: String(MP.sinMaestra) }] },', 'v: String(MP.sinMaestra), onClick: () => {} }] },'],
  // La página pierde el permiso de Contenido.
  [G, 'apps/web/app/admin/contenido/page.tsx', 'await requerir("cont", "ver")', 'await requerir("cont", "editar")'],
  // Otra función de cifras que ninguna pantalla muestra (la misma clase).
  [G, 'apps/web/lib/fotos-variantes.ts', 'export type CifrasFotos = {', 'export async function cifrasHuerfana() { return 1; }\nexport type CifrasFotos = {'],
  // La prueba de punta a punta que compara con la base.
  [G, 'pruebas/e2e/fot9uadmin.cjs', '${etiqueta}: las cifras del bloque coinciden con la base', '${etiqueta}: las cifras del bloque existen'],
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
