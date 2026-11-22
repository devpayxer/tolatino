// Prueba al revés del guardián fotoPorLaPieza (Fotos a la medida, F2a, 20 nov): toda foto de datos que se pinta pide la variante que le toca a su caja
// (fotoSrc / fotoFondo / fotoCss / <Foto> de packages/ui/src/foto.ts), nunca el JPEG original por un `url(${…})` o un <img src> sueltos. Cubre la caja de
// foto del sistema (Placeholder), las piezas que arman su propio fondo, el registro del sistema, el script que porta el sistema, los bloques del panel y
// las pantallas (ayudantes `fondo`, fondos en línea, <img>). Se inyecta el defecto, el guardián debe fallar con SU mensaje ([fotoPorLaPieza]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'fotoPorLaPieza', DS = 'packages/ui/src/ds/';
const casos = [
  // el sistema de diseño
  [G, DS + 'core/Placeholder.js', "'center/cover ' + __ds_scope.__fondo(image, typeof width === 'number' ? width : 540)", "'center/cover url(' + image + ')'"],
  [G, DS + 'cards/BusinessCard.js', "backgroundImage: __ds_scope.__fondo(p, w),", "backgroundImage: 'url(' + p + ')',"],
  [G, DS + 'cards/StoryCard.js', "`center/cover ${__ds_scope.__fondo(u, w)}`", "`center/cover url(${u})`"],
  [G, DS + 'listing/OwnerCard.js', "'center 25%/cover ' + __ds_scope.__fondo(photo, 220)", "'center 25%/cover url(' + photo + ')'"],
  [G, DS + 'menu/MenuItemRow.js', "'center/cover ' + __ds_scope.__fondo(image, 48)", "'center/cover url(' + image + ')'"],
  [G, DS + 'search/SearchResultRow.js', "backgroundImage: __ds_scope.__fondoCss(/^url\\(/.test(s) ? s : 'url(' + s + ')', w),", "backgroundImage: /^url\\(/.test(s) ? s : 'url(' + s + ')',"],
  [G, DS + 'scope.js', "__ds_scope.__fondoCss = fotoCss;", ""],
  [G, DS + 'scope.js', "__ds_scope.__fondo = fotoFondo;", "__ds_scope.__fondo = (u) => 'url(' + u + ')';"],
  [G, 'scripts/portar-sistema.mjs', "  t = fotos(t, rel);\n", ""],
  [G, 'scripts/portar-sistema.mjs', '  "core/Placeholder.js": [', '  "core/PlaceholderX.js": ['],
  // los bloques del panel
  [G, 'packages/ui/src/panel/Bloques.tsx', "backgroundImage: fotoCss(b.ph, 46),", "backgroundImage: b.ph,"],
  [G, 'packages/ui/src/panel/Bloques.tsx', "background: `${fotoFondo(m.img, 180)} center/cover`", "background: `url(\"${m.img}\") center/cover`"],
  // las pantallas
  [G, 'apps/web/app/(app)/n/[id]/Kit4i.tsx', "backgroundImage: fotoFondo(u, w),", "backgroundImage: `url(${u})`,"],
  [G, 'apps/web/app/(app)/eventos/Eventos.tsx', '<Foto src={s.img} alt="" ancho={78} className', '<img src={s.img} alt="" className'],
  [G, 'apps/web/app/(app)/c/[slug]/Categoria.tsx', "backgroundImage: fotoFondo(url, w),", "backgroundImage: `url(${url})`,"],
  [G, 'apps/web/app/(app)/publica/PasosFH.tsx', "`${fotoFondo(foto(d.cover, 600), 540)} center/cover, var(--tl-photo-bg)`", "`url(\"${foto(d.cover, 600)}\") center/cover, var(--tl-photo-bg)`"],
  [G, 'apps/web/app/admin/HiloAdmin.tsx', "background: `${fotoFondo(u, 360)} center/cover`", "background: `url(${u}) center/cover`"],
  [G, 'apps/web/app/panel/Panel.tsx', "backgroundImage: fotoCss(bz.ph, n),", "backgroundImage: bz.ph,"],
  [G, 'apps/web/app/(app)/soporte/reportar/Reportar.tsx', "<Foto src={cap.url} ancho={540} alt=", "<img src={cap.url} alt="],
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
