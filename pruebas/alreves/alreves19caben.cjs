// Prueba al revés del guardián botonesQueCaben (19 nov; reescrita el 23 nov). La fila «Llamar · Escribir · Cómo llegar» ya no existe: el guardián vigila lo
// que ahora puede desbordar (la fila estado + «Contactar», los renglones de la hoja, los botones del escritorio) y que las pruebas lo miren. Se inyecta
// el defecto, el guardián debe fallar con SU mensaje ([botonesQueCaben]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const F = 'apps/web/app/(app)/n/[id]/FichaNueva.tsx', G = 'botonesQueCaben';
const EST = '<div className="flex min-w-0 flex-wrap items-center gap-2 text-[13.5px] font-bold" data-estado=';
const DESK = 'className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 pb-[14px] pt-[26px]" data-pieza="cabecera-ficha"';
const casos = [
  // (1) teléfono: estado + «Contactar»
  [G, F, EST, EST.replace('min-w-0 ', ''), 'el estado ya no cede (sin min-w-0)'],
  [G, F, EST, EST.replace('flex-wrap ', ''), 'el estado ya no se parte en líneas (sin flex-wrap)'],
  [G, F, '<div className="flex-none" data-pieza="contactar-ficha"', '<div className="flex-1" data-pieza="contactar-ficha"', '«Contactar» ya no es flex-none'],
  // (2) la hoja
  [G, F, '<span className="min-w-0 flex-1"><span className="block text-[15.5px]', '<span className="flex-1"><span className="block text-[15.5px]', 'el texto del renglón ya no cede'],
  [G, F, '<span className="block truncate text-[13px] font-medium text-ink/60">', '<span className="block text-[13px] font-medium text-ink/60">', 'la dirección ya no se corta con elipsis'],
  [G, F, 'flex min-h-[64px] items-center gap-3.5', 'flex items-center gap-3.5', 'el renglón ya no mide 64 o más'],
  // (3) escritorio
  [G, F, DESK, DESK.replace('flex-wrap ', ''), 'la cabecera del escritorio ya no baja los botones'],
  [G, F, '<div className="min-w-0 flex-[1_1_420px]">', '<div className="flex-[1_1_420px]">', 'el nombre del escritorio ya no cede'],
  [G, F, '<div className="flex flex-none flex-wrap gap-2">', '<div className="flex flex-none gap-2">', 'los botones del escritorio ya no se acomodan'],
  // vuelve la fila vieja / se quita «Contactar»
  [G, F, '<div ref={tabsRef} className="sticky z-20 bg-white"', '<div data-pieza="acciones-ficha" /><div ref={tabsRef} className="sticky z-20 bg-white"', 'vuelve la fila de tres botones'],
  [G, F, 'data-pieza="contactar-ficha"', 'data-x="contactar"', '«Contactar» pierde su marca'],
  // las pruebas dejan de mirar
  [G, 'pruebas/e2e/fic005.cjs', "const { botonesQueNoCaben } = require('../lib/caben.cjs');", 'const botonesQueNoCaben = async () => [];', 'fic005 deja de mirar'],
  [G, 'pruebas/e2e/bus9t.cjs', "const { botonesQueNoCaben } = require('../lib/caben.cjs');", 'const botonesQueNoCaben = async () => [];', 'bus9t deja de mirar'],
  [G, 'pruebas/e2e/fic9cab.cjs', "const { botonesQueNoCaben, botonesFueraDeLaVentana, contenidoSeSale } = require('../lib/caben.cjs');", 'const botonesQueNoCaben = async () => [], botonesFueraDeLaVentana = async () => [], contenidoSeSale = async () => [];', 'fic9cab deja de mirar'],
  [G, 'pruebas/e2e/fic9cab.cjs', 'await abrirHoja(s);', 'await 0;', 'fic9cab deja de abrir la hoja a 320'],
  [G, 'apps/web/app/globals.css', '[data-letra="grande"] [aria-label="To’Latino"] > span { font-size: 17px !important; }', '', 'el nombre del encabezado a 320'],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (g, que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [g, f, a, b, que] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  informe(g, `${f.split('/').pop()}: ${que}`, r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
