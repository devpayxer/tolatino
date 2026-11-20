// Prueba al revés del guardián objetivosTactiles (19 nov): objetivos táctiles de 44 px DE VERDAD. a11y9c exige el 44 en las pantallas clave
// (390 y 320 con letra grande, y el Super Admin en el teléfono) con chicos, pisan y desbordan (pruebas/lib/tactil.cjs); la lista de permitidos es
// corta y dice por qué; el sistema portado deja botones, íconos, chips, pestañas y el nombre del plato en 44; no vuelve un área invisible.
// Se inyecta el defecto, el guardián debe fallar con SU mensaje ([objetivosTactiles]); se restaura.
const ENT = require('../lib/entorno.cjs');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const G = 'objetivosTactiles', A = 'pruebas/e2e/a11y9c.cjs', L = 'pruebas/lib/tactil.cjs', P = 'scripts/portar-sistema.mjs';
const casos = [
  // a11y9c deja de exigir
  [A, "ok(t.medidos > 0 && t.malos.length === 0, `${donde}: los ${t.medidos} controles", "ok(true, `${donde}: los ${t.medidos} controles"],
  [A, "ok(ps.length === 0, `${donde}: ninguna caja le quita el toque", "ok(true, `${donde}: ninguna caja le quita el toque"],
  [A, "...await TACTIL.desbordan(p)]; ok(fu.length === 0,", "]; ok(fu.length === 0,"],
  [A, "for (const [w, h, grande] of [[390, 844, false], [320, 568, true]])", "for (const [w, h, grande] of [[390, 844, false], [320, 568, false]])"],
  [A, "'/comunidad', '/eventos', '/cuenta'];", "'/eventos', '/cuenta'];"],
  [A, "ok(new URL(q.url()).pathname === new URL(B + ruta).pathname,", "console.log(new URL(q.url()).pathname === new URL(B + ruta).pathname,"],
  [A, "update community_profiles set rules_version = 1, rules_ok_at = coalesce(rules_ok_at, now()), adult = true", "update community_profiles set rules_version = 1, rules_ok_at = coalesce(rules_ok_at, now()), adult = adult"],
  [A, "} finally { sql(`update users set big_text = false where phone = '+1${MARISOL}'`);", "} finally { (`update users set big_text = false where phone = '+1${MARISOL}'`);"],
  [A, "await tactil44(q, `${w} /admin", "await (async () => {})(q, `${w} /admin"],
  [A, "ok(mi.length === 0, `AA 2.5.8", "console.log(mi.length === 0, `AA 2.5.8"],
  [A, "const TACTIL = require('../lib/tactil.cjs');", "const TACTIL = require('../lib/caben.cjs');"],
  ['packages/ui/src/ds/onboarding/OnbTopBar.js', "      padding: '10px 16px 12px',\n      minWidth: 0,\n", "      padding: '10px 16px 12px',\n"],
  ['pruebas/e2e/vec9m.cjs', "ok(ancho[0] === 390 && ancho[1] === 390,", "console.log(ancho[0] === 390 && ancho[1] === 390,"],
  [A, "const mi = await minimos(d); ok(mi.length === 0, `1440 ${ruta}: AA 2.5.8", "const mi = await minimos(d); console.log(mi.length === 0, `1440 ${ruta}: AA 2.5.8"],
  [A, "const mi = await minimos(a); ok(mi.length === 0, `el Super Admin a 1440: AA 2.5.8", "const mi = await minimos(a); console.log(mi.length === 0, `el Super Admin a 1440: AA 2.5.8"],
  // la lista de permitidos crece o no dice por qué
  [L, "  { regla: 'oculto', por:", "  { regla: 'nombre', por: 'Un nombre que repite el toque de su tarjeta: se toca la tarjeta.' },\n  { regla: 'chip', por: 'Las etiquetas pequeñas de los filtros del escritorio no se tocan con el dedo.' },\n  { regla: 'oculto', por:"],
  [L, "por: 'Fuera de la vista (solo para lectores de pantalla, 1 px o menos): nadie lo puede tocar.' }", "por: 'oculto' }"],
  // el sistema vuelve a lo chico
  [P, "  md: {\\n    height: ${T44},`", "  md: {\\n    height: 40,`"],
  [P, "Math.max(size, ${T44})", "Math.max(size, 40)"],
  [P, "...(onClick ? {\\n        minHeight: ${T44},\\n        minWidth: ${T44},", "...(onClick ? {\\n        minWidth: ${T44},"],
  [P, "  t = tactiles(t, rel);\n", "\n"],
  ['packages/ui/src/ds/menu/MenuItemRow.js', "      padding: '13px 0',\n      margin: '-13px 0'", "      padding: 0,\n      margin: 0"],
  // vuelve el área invisible fuera de la caja
  ['apps/web/app/globals.css', "@container (max-width: 102px)", "[data-toque=\"\"]::after { content: \"\"; position: absolute; inset: -6px; }\n@container (max-width: 102px)"],
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
// Un área de toque invisible como archivo propio (lo que se revirtió): packages/ui/src/toque.css
{ const t = path.join(R, 'packages/ui/src/toque.css'); fs.writeFileSync(t, '[data-toque]::after { content: ""; }\n'); let r; try { r = correr(G); } finally { fs.rmSync(t, { force: true }); } informe('packages/ui/src/toque.css vuelve', r); }
let limpio = true; try { execSync('node guardianes/run.mjs', { cwd: R, stdio: 'pipe' }); } catch (e) { limpio = false; console.log(String(e.stderr).slice(0, 600)); }
console.log(`\n${bien}/${total} defectos cazados · guardianes limpios después: ${limpio ? 'sí' : 'NO'}`);
process.exit(bien === total && limpio ? 0 : 1);
