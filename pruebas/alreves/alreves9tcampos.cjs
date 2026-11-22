// Prueba al revés del guardián camposSinZoom (21 nov): «al escribir hace zoom en el teléfono» (pedido del fundador). Safari de iPhone agranda la
// página al enfocar un campo cuya letra mide menos de 16 px: en pantallas táctiles todo campo de texto mide 16 (globals.css), los de letra más
// grande a propósito llevan data-letra-propia, y se mide sobre lo servido (pruebas/lib/tactil.cjs › campos, desde a11y9c).
// Se inyecta el defecto, el guardián debe fallar con SU mensaje ([camposSinZoom]); se restaura.
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const R = path.resolve(__dirname, '..', '..');
const G = 'camposSinZoom', C = 'apps/web/app/globals.css', A = 'pruebas/e2e/a11y9c.cjs', L = 'pruebas/lib/tactil.cjs', LY = 'apps/web/app/layout.tsx';
const casos = [
  // La regla: sin los 16 px, solo para algunos campos, sin la excepción de los códigos, o para todo el mundo (también con ratón)
  [C, '[data-letra-propia]) { font-size: 16px !important; }', '[data-letra-propia]) { font-size: 15px !important; }'],
  [C, '[data-letra-propia]) { font-size: 16px !important; }', '[data-letra-propia]) { font-size: 16px; }'],
  [C, ':is(input, textarea, select):not([type="checkbox"]', ':is(input):not([type="checkbox"]'],
  [C, ', [type="hidden"], [data-letra-propia])', ', [type="hidden"])'],
  [C, '@media (pointer: coarse) {\n  html:not([data-sin-campo16])', '@media (min-width: 1px) {\n  html:not([data-sin-campo16])'],
  // La medida: deja de mirar los chicos o los achicados, o a11y9c deja de exigir
  [L, 'if (ahora[i] < 16) chicos.push', 'if (ahora[i] < 10) chicos.push'],
  [L, 'if (traia[i] > 16 && ahora[i] < traia[i]) achicados.push', 'if (false) achicados.push'],
  [A, 'if (c.tactil) ok(c.chicos.length === 0 && c.achicados.length === 0,', 'if (c.tactil) ok(true,'],
  [A, 'ok((camposVistos.tactil || !esChromium) && camposVistos.medidos > 0,', 'ok(true,'],
  // El atajo que no se permite: quitarle el zoom a la página
  [LY, '  viewportFit: "cover",', '  viewportFit: "cover",\n  maximumScale: 1,'],
  [LY, '  viewportFit: "cover",', '  viewportFit: "cover",\n  userScalable: false,'],
];
let bien = 0, total = 0;
const correr = (g) => {
  try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; }
  catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)) ?? ''; return [!!l, l]; }
};
const informe = (que, [falla, out]) => { total++; console.log(`  ${falla ? '✓' : '✗'} ${G} al revés (${que})${out ? ' → ' + out.trim().slice(0, 170) : ''}`); if (falla) bien++; };
for (const [f, a, b] of casos) {
  const ruta = path.join(R, f);
  if (!fs.existsSync(ruta)) { total++; console.log(`  ✗ no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { total++; console.log(`  ✗ no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(G); } finally { fs.writeFileSync(ruta, orig); }
  informe(`${f.split('/').pop()}: ${a.slice(0, 40).replace(/\n/g, ' ')}`, r);
}
let limpio = require('../lib/alreves-fin.cjs')(R, { mostrar: true });
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
