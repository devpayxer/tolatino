// Prueba al revés del guardián de 9t «Objetivos táctiles de 44 px» (toqueDe44) y de sistemaSincronizado para el área de toque: se inyecta el
// defecto, el guardián debe fallar con su mensaje; se restaura. «crear»: se crea el archivo, se corre y se borra.
// Lo que se mide en el navegador (pruebas/lib/toque.cjs en a11y9c) tiene su propio al revés a mano: con las sombras con área o sin los topes
// de los grupos, la medida falla (lo dice docs/PROGRESS.md, 19 nov).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const T = 'packages/ui/src/toque.css', GL = 'apps/web/app/globals.css', PK = 'packages/ui/package.json', SC = 'packages/ui/src/ds/scope.js',
  IB = 'packages/ui/src/ds/core/IconButton.js', BC = 'packages/ui/src/ds/cards/BusinessCard.js', BT = 'packages/ui/src/ds/core/Button.js',
  SP = 'packages/ui/src/ds/booking/StaffPicker.js', BL = 'packages/ui/src/panel/Bloques.tsx', A = 'pruebas/e2e/a11y9c.cjs', PS = 'scripts/portar-sistema.mjs';
const casos = [
  // toque.css: el área existe, crece lo que falta para 44 y respeta los topes.
  ['toqueDe44', T, '  [data-toque=""] {\n    position: relative;\n', '  [data-toque=""] {\n'],
  ['toqueDe44', T, '    top: max(calc(-1 * min(var(--tl-toque-y, 22px), var(--tl-toque-arriba, 22px))), min(0px, calc(50% - 22px)));\n    bottom', '    top: -22px;\n    bottom'],
  ['toqueDe44', T, '    left: max(calc(-1 * min(var(--tl-toque-x, 22px), var(--tl-toque-izq, 22px))), min(0px, calc(50% - 22px)));', '    left: min(0px, calc(50% - 22px));'],
  ['toqueDe44', T, '@property --tl-toque-x {\n  syntax: "<length>";\n  inherits: false;', '@property --tl-toque-x {\n  syntax: "<length>";\n  inherits: true;'],
  ['toqueDe44', T, '    position: relative;\n    --tl-toque-x: inherit;\n', '    position: relative;\n'],
  ['toqueDe44', T, '  [data-toque=""]:first-child::after {\n    top: max(calc(-1 * var(--tl-toque-arriba, 22px)), min(0px, calc(50% - 22px)));\n', '  [data-toque=""]:first-child::after {\n'],
  // …y no dibuja nada.
  ['toqueDe44', T, '    background: none;\n    border: 0;\n    box-shadow: none;\n  }\n  /*', '    background: rgba(75, 55, 245, .08);\n    border: 0;\n    box-shadow: none;\n  }\n  /*'],
  ['toqueDe44', T, '    box-shadow: none;\n  }\n  /*', '    box-shadow: none;\n    outline: 1px dashed red;\n  }\n  /*'],
  ['toqueDe44', T, '    content: "";\n', '    content: "·";\n'],
  // Se carga.
  ['toqueDe44', GL, '@import "@tolatino/ui/toque.css";\n', ''],
  ['toqueDe44', PK, ',\n    "./toque.css": "./src/toque.css"', ''],
  // El sistema portado: __btn, __key, los roles escritos a mano, los <button>, las razones.
  ['toqueDe44', SC, 'role: "button", tabIndex: 0, "data-toque": "", ', 'role: "button", tabIndex: 0, '],
  ['toqueDe44', SC, '(fn ? { tabIndex: 0, "data-toque": "", onKeyDown', '(fn ? { tabIndex: 0, onKeyDown'],
  ['toqueDe44', IB, 'role: "button", \'data-toque\': \'\',', 'role: "button",'],
  ['toqueDe44', SP, "role: 'radio', 'data-toque': '', 'aria-checked': on, 'aria-disabled': d.off", "role: 'radio', 'aria-checked': on, 'aria-disabled': d.off"],
  ['toqueDe44', BC, 'React.createElement("button", {\n    \'data-toque\': \'\',\n', 'React.createElement("button", {\n'],
  ['toqueDe44', BT, "'data-toque': v.boxShadow ? 'sombra' : '',", "'data-toque': v.boxShadow ? 'oculto' : '',"],
  // Los bloques del panel.
  ['toqueDe44', BL, '<button data-toque="" type="button" aria-label="Mes anterior"', '<button type="button" aria-label="Mes anterior"'],
  ['toqueDe44', BL, '<span key={i} role="tab" data-toque="" aria-selected={x.on} onClick={x.onClick} style={{ flex: "none", height: 36', '<span key={i} role="tab" aria-selected={x.on} onClick={x.onClick} style={{ flex: "none", height: 36'],
  // Las pantallas: un gap-* que se usa sin su tope.
  ['toqueDe44', GL, '  .gap-2\\.5:is(.flex-wrap, .grid, .inline-grid) { --tl-toque-x: 5px; --tl-toque-y: 5px; }\n', ''],
  ['toqueDe44', GL, '.gap-2\\.5:is(.flex, .inline-flex):not(.flex-col, .flex-col-reverse, .flex-wrap), .gap-x-2\\.5 { --tl-toque-x: 5px; }\n  .gap-2\\.5:is(.flex-col, .flex-col-reverse):not(.flex-wrap), .gap-y-2\\.5 { --tl-toque-y: 5px; }\n  .gap-2\\.5:is(.flex-wrap, .grid, .inline-grid) { --tl-toque-x: 5px; --tl-toque-y: 5px; }\n', ''],
  // a11y9c lo sigue midiendo.
  ['toqueDe44', A, "const { medirToque, toqueInvisible } = require('../lib/toque.cjs');", "const { medirToque, toqueInvisible } = { medirToque: null, toqueInvisible: null };"],
  // El script de portar: sin el paso del área de toque, lo portado ya no es lo que el script produce.
  ['sistemaSincronizado', PS, '  t = toque(t, rel);\n', ''],
  ['sistemaSincronizado', PS, "    const nuevo = [x ? `'--tl-toque-x': ${v(gx)}` : null, y ? `'--tl-toque-y': ${v(gy)}` : null]", "    const nuevo = [x ? `'--tl-toque-x': ${v(gx)}` : null]"],
];
const crear = [
  ['toqueDe44', 'packages/ui/src/panel/Toque9t.tsx', '"use client";\nexport const Toque9t = ({ f }: { f: () => void }) => <span role="button" tabIndex={0} onClick={f}>Ver</span>;\n'],
];
let bien = 0, total = 0;
// Cuenta solo si el guardián FALLÓ con su propio mensaje («[guardián] archivo — …»); un guardián que se cae (excepción) no cuenta como cazado.
const correr = (g) => { try { execSync(`node guardianes/run.mjs --solo ${g}`, { cwd: R, stdio: 'pipe' }); return [false, '']; } catch (e) { const l = String(e.stderr).split('\n').find((x) => x.trim().startsWith(`[${g}]`)); return [!!l, l || ('SE CAYÓ: ' + String(e.stderr).split('\n').find((x) => /Error/.test(x)))]; } };
for (const [g, f, a, b] of casos) {
  total++;
  const ruta = `${R}/${f}`;
  if (!fs.existsSync(ruta)) { console.log(`  ✗ ${g}: no existe ${f}`); continue; }
  const orig = fs.readFileSync(ruta, 'utf8');
  if (!orig.includes(a)) { console.log(`  ✗ ${g}: no encontré el texto a cambiar en ${f}: ${a.slice(0, 70)}`); continue; }
  fs.writeFileSync(ruta, orig.replace(a, () => b));
  let r; try { r = correr(g); } finally { fs.writeFileSync(ruta, orig); }
  const [falla, out] = r;
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
for (const [g, f, c] of crear) {
  total++;
  const ruta = `${R}/${f}`;
  fs.mkdirSync(require('path').dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); }
  const [falla, out] = r;
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (crear ${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
console.log(`\n${bien}/${total} al revés`);
execSync('node guardianes/run.mjs', { cwd: R, stdio: 'inherit' });
// 9b-3 · alrevesQueFalla: un defecto sin cazar pone la prueba en rojo.
if (bien !== total) process.exit(1);
