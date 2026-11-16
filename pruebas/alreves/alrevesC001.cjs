// Prueba al revés de C-001 (video de presentación + anillo). videoSoloAprobado: un video sin aprobar en público, subir sin ser Pro,
// guardar el original, y una pantalla pública que lee business_videos por su cuenta. Se inyecta el defecto, el guardián debe fallar con
// SU mensaje; se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const L = 'apps/web/lib/video-negocio.ts', A = 'apps/web/app/api/negocio/video/route.ts';
const casos = [
  ['videoSoloAprobado', L, "where v.business_id = any($1::text[]) and v.status = 'aprobado'", "where v.business_id = any($1::text[]) and v.status in ('aprobado', 'revision')"],
  ['videoSoloAprobado', L, "join business_stats_cache s on s.business_id = v.business_id and s.plan = 'pro'", "join business_stats_cache s on s.business_id = v.business_id"],
  ['videoSoloAprobado', A, '  if (plan !== "pro") return err(403, "El video de presentación es de Pro.", "The intro video is a Pro feature.");\n', ''],
  ['videoSoloAprobado', A, 'await guardarObjeto(cv, p.mp4, "video/mp4");', 'await guardarObjeto(cv, Buffer.from(await f.arrayBuffer()), "video/mp4");'],
];
const crear = [
  // Una pantalla pública que lee los videos sin pasar por videosVivos.
  ['videoSoloAprobado', 'apps/web/lib/zz-alreves-video.ts', 'export const q = "select url from business_videos where business_id = $1";\n'],
];
let bien = 0, total = 0;
const correr = (G) => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${G}]`)) ?? ''; return [!!l, l]; }
};
const informe = (G, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 200) : ''}`); if (falla) bien++; };
for (const [G, f, a, b] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  try { informe(G, path.basename(f), correr(G)); } finally { fs.writeFileSync(ruta, orig); }
}
for (const [G, f, contenido] of crear) {
  const ruta = path.join(R, f);
  fs.writeFileSync(ruta, contenido);
  try { informe(G, path.basename(f), correr(G)); } finally { fs.unlinkSync(ruta); }
}
let limpio = true;
try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch { limpio = false; }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
