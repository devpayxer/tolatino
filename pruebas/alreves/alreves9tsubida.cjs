// Prueba al revés de los guardianes topeFotoSinNavegador y gotoDevuelveRespuesta (confirmación 44685003383, msg9t en el iPad): el tope de 12 MB de las fotos se prueba desde
// Node (subida-cruda) y la app avisa antes de subir (TOPE_FOTO). Se inyecta el defecto, el guardián debe fallar con SU mensaje; se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'topeFotoSinNavegador', P = 'apps/web/lib/subir-foto.ts';
const casos = [
  [P, "return b.size > TOPE_FOTO ? null : b;", "return b;"],
  [P, "export const TOPE_FOTO = 12 * 1024 * 1024;", "export const TOPE_FOTO = Infinity;"],
  [P, 'const f = await lista(file); if (!f) return PESADA;\n  const fd = new FormData(); fd.append("foto", f, "foto.jpg");', 'const fd = new FormData(); fd.append("foto", await reducir(file), "foto.jpg");'],
  ['pruebas/e2e/msg9t.cjs', "const st = await subirCrudoNode(m, B, '/api/mensajes/foto', Buffer.alloc(13 * 1024 * 1024, 7), 'image/jpeg');", "const st = [await subirCrudo(m, 'image/jpeg', 13 * 1024 * 1024)];"],
  ['pruebas/lib/dispositivo-precarga.cjs', "if (soloRuido) return docResp && docResp.url().split('#')[0] === page.url().split('#')[0] ? docResp : null;", "if (soloRuido) return null;", 'gotoDevuelveRespuesta'],
  ['pruebas/lib/dispositivo-precarga.cjs', "if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) docResp = r;", "if (false) docResp = r;", 'gotoDevuelveRespuesta'],
  ['pruebas/e2e/dm9t.cjs', "const st = await subirCrudoNode(a, B, '/api/mensajes/foto', Buffer.alloc(13 * 1024 * 1024, 7), 'image/jpeg', { para: 'dm' });", "const st = [await subirCrudo(a, 'image/jpeg', 13 * 1024 * 1024)];"],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [f, a, b, g] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g ?? G); } finally { fs.writeFileSync(ruta, orig); }
  informe(`${g ? g + ' · ' : ''}${f.split('/').pop()}: ${a.slice(0, 40).replace(/\n/g, ' ')}`, r);
}
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
