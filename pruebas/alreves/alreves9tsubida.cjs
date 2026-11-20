// Prueba al revés de los guardianes subidaConTope (19 nov), topeFotoSinNavegador, gotoDevuelveRespuesta y fotoComoPersona (20 nov): toda subida lee el formulario con tope (lib/subida.ts) y contesta 413 al archivo grande,
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
  // 20 nov (confirmación 44685003383): topeFotoSinNavegador (la app avisa antes de subir; las pruebas suben MB desde Node) y gotoDevuelveRespuesta.
  ['topeFotoSinNavegador', 'apps/web/lib/subir-foto.ts', "return b.size > TOPE_FOTO ? null : b;", "return b;"],
  ['topeFotoSinNavegador', 'apps/web/lib/subir-foto.ts', "export const TOPE_FOTO = 12 * 1024 * 1024;", "export const TOPE_FOTO = Infinity;"],
  ['topeFotoSinNavegador', 'apps/web/lib/subir-foto.ts', 'const f = await lista(file); if (!f) return PESADA;\n  const una = async', 'const f = await reducir(file); { const fd = new FormData(); fd.append("foto", await reducir(file), "foto.jpg"); }\n  const una = async'],
  // 20 nov (confirmación 44734711575): subidaReintenta.
  ['subidaReintenta', 'apps/web/lib/subir-foto.ts', "if (x.st === 0 || x.st === 400) x = await una(file.size > 0 && file.size <= TOPE_FOTO ? file : f);", ""],
  ['subidaReintenta', 'apps/web/lib/subir-foto.ts', "if (x.st === 0 || x.st === 400) x = await una(", "if (x.st !== 200) x = await una("],
  ['subidaReintenta', 'apps/web/lib/subir-foto.ts', 'export const subirFoto = (file: File): Promise<Subida> => mandar("/api/medios", file);', 'export const subirFoto = async (file: File): Promise<Subida> => { const fd = new FormData(); fd.append("foto", file); return (await fetch("/api/medios", { method: "POST", body: fd })).json(); };'],
  ['subidaReintenta', 'apps/web/lib/subida.ts', "console.warn(`[subida] sin archivo:", "void (`[subida] sin archivo:"],
  ['subidaReintenta', 'pruebas/lib/elegir-foto.cjs', "console.log(`  · INESTABLE la primera subida de la foto no llegó", "void (`  · la primera subida"],
  ['subidaReintenta', 'pruebas/lib/subida-cruda.cjs', "for (let i = 0; i < 3; i++) { try { return await enviarUna(", "for (let i = 0; i < 1; i++) { try { return await enviarUna("],
  ['topeFotoSinNavegador', 'pruebas/e2e/msg9t.cjs', "const st = await subirCrudoNode(m, B, '/api/mensajes/foto', Buffer.alloc(13 * 1024 * 1024, 7), 'image/jpeg');", "const st = [await subirCrudo(m, 'image/jpeg', 13 * 1024 * 1024)];"],
  ['topeFotoSinNavegador', 'pruebas/e2e/dm9t.cjs', "const st = await subirCrudoNode(a, B, '/api/mensajes/foto', Buffer.alloc(13 * 1024 * 1024, 7), 'image/jpeg', { para: 'dm' });", "const st = [await subirCrudo(a, 'image/jpeg', 13 * 1024 * 1024)];"],
  ['gotoDevuelveRespuesta', 'pruebas/lib/dispositivo-precarga.cjs', "if (soloRuido) return docResp && docResp.url().split('#')[0] === page.url().split('#')[0] ? docResp : null;", "if (soloRuido) return null;"],
  ['gotoDevuelveRespuesta', 'pruebas/lib/dispositivo-precarga.cjs', "if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) docResp = r;", "if (false) docResp = r;"],
  // 20 nov (CI dirigido 44707074106): fotoComoPersona.
  ['fotoComoPersona', 'pruebas/e2e/msg9t.cjs', "await m.goto(B + `/cuenta/mensajes/${BIZ}`); await elegirFoto(m, FOTO2);", "await m.goto(B + `/cuenta/mensajes/${BIZ}`); await m.locator('input[type=file]').setInputFiles(FOTO2);"],
  ['fotoComoPersona', 'pruebas/lib/elegir-foto.cjs', "await fc.setFiles(archivo);", "await p.locator('input[type=file]').setInputFiles(archivo);"],
  ['fotoComoPersona', 'pruebas/lib/elegir-foto.cjs', "if (!resps.length) throw new Error('la foto elegida no se subió: no hubo POST a la ruta de fotos');", ""],
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
