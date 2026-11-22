// Prueba al revés de AK · La tarjeta «Vitrina» es la de todas las listas (guardián vitrinaEnLasListas; decisión AK, 22 nov). Cada caso rompe el código a
// propósito y el guardián tiene que fallar con SU mensaje (el texto de cada caso); después se restaura y los guardianes quedan limpios:
//   la tarjeta «de una línea» o la vieja (BusinessCard) que vuelven a una pantalla · la caja HOY sin abrir «Hoy en el barrio» · el video fuera de `media` o en
//   cualquier celda · la galería sin las fotos de la lista, con más de 3 o con las privadas/purgadas · las fotos fuera de la misma consulta (una consulta por
//   tarjeta o la portada sola) · la pieza que pinta con <img> en vez de <Foto> · «+N FOTOS» con 3 o menos · un <div> de botón · la caja de toque de 44 y la
//   galería de 187 · un efecto de escala al pasar el ratón · el CSS sin importar.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ, G = 'vitrinaEnLasListas';
const W = 'apps/web/app/(app)/TarjetaNegocio.tsx', V = 'packages/ui/src/core/Vitrina.tsx', C = 'apps/web/lib/categoria.ts', CSS = 'packages/ui/src/vitrina.css', CAT = 'apps/web/app/(app)/c/[slug]/Categoria.tsx';
const casos = [
  [CAT, '<TarjetaNegocio es={v.lang === "es"} b={b} origen="categoria"', '<TarjetaNegocio es={v.lang === "es"} una b={b} origen="categoria"', 'volvió la tarjeta «de una línea»'],
  [W, '<FilaFree nombre={b.name}', '<BusinessCard nombre={b.name}', 'la tarjeta vieja (BusinessCard) volvió a una pantalla'],
  ['apps/web/app/acceso/Landing.tsx', '<FilaFree nombre=', '<BusinessCard plan="free" nombre=', 'la tarjeta vieja (BusinessCard) volvió a una pantalla'],
  [W, 'onOferta={h ? () => setHoy(true) : undefined}', 'onOferta={undefined}', 'la caja HOY de la tarjeta abre «Hoy en el barrio»'],
  [W, 'media={b.video ? <VideoTarjeta', 'media={b.video ? <VideoTarjetaX', 'el video aprobado va como `media` de la tarjeta'],
  [W, 'fotos={b.fotos} fotosTotal={b.nfotos}', 'fotos={b.fotos.slice(0, 1)} fotosTotal={b.nfotos}', 'la galería recibe las fotos y el total'],
  [W, 'abierto={b.open}', 'abierto={b.open} ring="x"', 'la tarjeta vuelve a llevar el anillo'],
  [C, "and not m.private and m.purged_at is null) q) as fotos_j", "and m.purged_at is null) q) as fotos_j", 'ninguna privada'],
  [C, "and not m.private and m.purged_at is null) q) as fotos_j", "and not m.private) q) as fotos_j", 'ninguna purgada'],
  [C, "m.status = 'visible' and not m.private", "m.status <> 'removed' and not m.private", 'solo las visibles'],
  [C, "filter (where q.rn <= 3)", "filter (where q.rn <= 4)", 'las tres primeras'],
  [C, 'select r.*, ${FOTOS("r")} from r order by pro desc', 'select r.*, ${FOTO("r")} from r order by pro desc', 'resultados() trae las fotos de la galería con FOTOS()'],
  ['apps/web/lib/buscar.ts', 'count(*) over () as total, ${FOTOS("base")} from base', 'count(*) over () as total, ${FOTO("base")} from base', 'la consulta de esta lista trae las fotos de la galería'],
  ['apps/web/lib/tarjetas.ts', 'const ids = items.map((x) => x.id);', 'const ids = items.map((x) => x.id); void db().query("select url from media");', 'armarTarjetas no consulta fotos'],
  ['apps/web/lib/tarjetas.ts', 'fotos: b.fotos ?? ', 'fotos: [] ?? ', 'la tarjeta arma sus fotos y su total'],
  [V, '<Foto src={f} alt=""', '<img src={f} alt=""', 'la Vitrina pinta sus fotos con <Foto>'],
  [V, 'extra = total - 3;', 'extra = total - 2;', '«+N FOTOS» solo sale con más de 3 fotos'],
  [V, '{grande ? p.media ?? null : null}', '{p.media ?? null}', 'el video (media) va SOLO en la celda grande'],
  [V, '.filter((f): f is string => !!f).slice(0, 3)', '.filter((f): f is string => !!f).slice(0, 4)', 'la galería tiene como mucho 3 fotos'],
  [V, '<button type="button" className="tl-vit-oferta" data-oferta=""', '<div role="button" className="tl-vit-oferta" data-oferta=""', 'un <div> hace de botón en la Vitrina'],
  [CSS, '.tl-vit-guardar { position: absolute; z-index: 3; top: 5px; right: 5px; width: 44px; height: 44px;', '.tl-vit-guardar { position: absolute; z-index: 3; top: 5px; right: 5px; width: 34px; height: 34px;', 'la caja del corazón mide 44'],
  [CSS, '.tl-vit-gal { position: relative; display: grid; height: 187px;', '.tl-vit-gal { position: relative; display: grid; height: 180px;', 'la galería mide 187 px'],
  [CSS, '@media (hover: hover) {', '@media (hover: hover) {\n  .tl-vit:hover { transform: scale(1.02); }', 'no tiene efectos de escala ni elevación'],
  [CSS, '.tl-vit-hora { min-height: 44px;', '.tl-vit-hora { min-height: 30px;', 'la caja de cada horario mide 44'],
  ['apps/web/app/globals.css', '@import "@tolatino/ui/vitrina.css";', '', 'vitrina.css se exporta del paquete del sistema'],
];
const soloTextos = !!process.env.ALREVES_SOLO_TEXTOS;
let bien = 0, total = 0;
const correr = (g = G) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return []; }
  catch (e) { return String(e.stderr).split('\n').filter((x) => x.trim().startsWith(`[${g}]`)); }
};
const informe = (que, msg, lineas) => {
  total++;
  const l = soloTextos ? lineas[0] : lineas.find((x) => x.includes(msg));
  console.log(`  ${l ? '✓' : '✗'} ${G} al revés (${que}: «${msg}»)${l ? ' → ' + l.trim().slice(0, 200) : lineas.length ? ' → otro mensaje: ' + lineas[0].trim().slice(0, 160) : ' → el guardián NO falló'}`);
  if (l) bien++;
};
for (const [f, a, b, msg, g = G] of casos) {
  const ruta = path.join(R, f);
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ ${G}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  try { informe(path.basename(f), msg, correr(g)); } finally { fs.writeFileSync(ruta, orig); }
}
let limpio = true;
if (!require('../lib/alreves-fin.cjs')(R)) limpio = false;
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
