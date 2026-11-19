// Prueba al revés del guardián subidaConTope (19 nov): toda subida lee el formulario con tope (lib/subida.ts) y contesta 413 al archivo grande,
// aunque el navegador no avise el tamaño. Se inyecta el defecto, el guardián debe fallar con SU mensaje ([subidaConTope]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const L = 'apps/web/lib/subida.ts', G = 'subidaConTope';
const casos = [
  [G, 'apps/web/app/api/ayuda/foto/route.ts', 'const lf = await leerFormulario(req, MAX + 4096);', 'const lf = await leerFormulario(req, MAX + 4096); void (await req.formData().catch(() => null));'],
  [G, 'apps/web/app/api/mensajes/foto/route.ts', 'if (!lf.ok && lf.grande) return err(413,', 'if (!lf.ok && false) return err(413,'],
  [G, L, '    partes.push(value);\n', ''],
  [G, L, 'if (Number(req.headers.get("content-length") ?? 0) > tope) return { ok: false, grande: true };', ''],
  [G, 'pruebas/e2e/sub9t.cjs', '13 MB por partes, sin avisar el tamaño → 413', '13 MB → algo'],
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
