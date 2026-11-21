// Prueba al revés de 9u · «Para mirar» elige entre las fotos que se pueden mostrar (guardián muestraDeLasQueSePuedenVer). Cada caso rompe el código a
// propósito y el guardián tiene que fallar con SU mensaje; después se restaura y los guardianes quedan limpios:
//   la muestra otra vez antes de filtrar (sin el join con las publicadas) · la muestra que deja pasar las privadas · rev9u2 que vuelve a «al menos una»
//   · el reporte diario sin comparar el número · una muestra al azar nueva en otro archivo.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ, G = 'muestraDeLasQueSePuedenVer';
const F = 'apps/web/lib/fotos-revision.ts', T = 'pruebas/e2e/rev9u2.cjs';
const casos = [
  [F, "         join media x on x.id = r.media_id and x.status = 'visible' and x.purged_at is null and not x.private and x.url like '/medios/n/%'\n", '', 'antes de filtrar las que siguen publicadas'],
  [F, " and not x.private and x.url like '/medios/n/%'\n        where r.created_at", " and x.url like '/medios/n/%'\n        where r.created_at", 'antes de filtrar las que siguen publicadas'],
  [T, 'ok(esperadas >= 1 && vistas === esperadas,', 'ok(vistas >= 1,', 'compara el número exacto de miniaturas'],
  [T, '&& enCorreo === deAyer &&', '&& enCorreo >= 3 &&', 'compara el número exacto de miniaturas'],
];
const crear = [
  ['apps/web/lib/zz-alreves-muestra/azar.ts', 'import { db } from "../db";\nexport const cinco = () => db().query(`select id from media order by random() limit 5`);\n', 'una muestra al azar nueva'],
];
const soloTextos = !!process.env.ALREVES_SOLO_TEXTOS;
let bien = 0, total = 0;
const correr = () => {
  try { execSync(`node guardianes/run.mjs --solo ${G}`, { cwd: R, stdio: 'pipe' }); return []; }
  catch (e) { return String(e.stderr).split('\n').filter((x) => x.trim().startsWith(`[${G}]`)); }
};
const informe = (que, msg, lineas) => {
  total++;
  const l = soloTextos ? lineas[0] : lineas.find((x) => x.includes(msg));
  console.log(`  ${l ? '✓' : '✗'} ${G} al revés (${que}: «${msg}»)${l ? ' → ' + l.trim().slice(0, 200) : lineas.length ? ' → otro mensaje: ' + lineas[0].trim().slice(0, 160) : ' → el guardián no falló'}`);
  if (l) bien++;
};
for (const [f, a, b, msg] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  try { informe(path.basename(f), msg, correr()); } finally { fs.writeFileSync(ruta, orig); }
}
for (const [f, contenido, msg] of crear) {
  const ruta = path.join(R, f);
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, contenido);
  try { informe(f, msg, correr()); } finally { fs.rmSync(path.dirname(ruta), { recursive: true, force: true }); }
}
let limpio = true;
try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch { limpio = false; }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
