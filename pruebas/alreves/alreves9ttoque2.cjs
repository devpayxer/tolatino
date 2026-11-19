// Prueba al revés de 9t «Objetivos táctiles de 44 px», segunda versión (packages/ui/src/toque.ts; la primera, con un ::after agrandado, se
// revirtió el 19 nov: el área de un control tapaba la caja de un control de OTRO contenedor y le robaba el toque).
// 1 · El guardián toqueDe44: se inyecta el defecto en el código, el guardián debe fallar con SU mensaje; se restaura. «crear»: se crea el
//     archivo, se corre y se borra.
// 2 · La medida del navegador (pruebas/lib/toque.cjs, la que corre a11y9c): una página de prueba con el área de toque de verdad (toque.ts tal
//     cual, sin tipos) primero tiene que salir limpia; después, con cada defecto, la medida tiene que cazarlo. El primero es la clase que rompió
//     el CI: el ::after del logo de un encabezado tapa el botón «Ver las 3 fotos» del contenedor de abajo.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const R = ENT.RAIZ;
const T = 'packages/ui/src/toque.ts', AT = 'apps/web/app/AreaDeToque.tsx', LY = 'apps/web/app/layout.tsx', PK = 'packages/ui/package.json', A = 'pruebas/e2e/a11y9c.cjs';
const casos = [
  // Lo que ya es de alguien se queda con su toque.
  ['toqueDe44', T, '  if (t.closest(ACCIONABLE)) return { el: null, razon: "propio" };\n', ''],
  ['toqueDe44', T, '"[role=button]", "[role=link]", "[role=tab]", "[role=radio]", "[role=checkbox]", "[role=switch]", "[role=option]",\n  "[role=menuitem]", "[role=menuitemcheckbox]", "[role=menuitemradio]", "[role=slider]"', '"[role=link]", "[role=tab]", "[role=radio]", "[role=checkbox]", "[role=switch]", "[role=option]",\n  "[role=menuitem]", "[role=menuitemcheckbox]", "[role=menuitemradio]", "[role=slider]"'],
  ['toqueDe44', T, '"a[href]", "button", "input", "select", "textarea", "label",', '"a[href]", "button", "select", "textarea", "label",'],
  // Lo de debajo con acción propia, el más cercano, el empate, el área de 44, la capa.
  ['toqueDe44', T, '  if (getComputedStyle(t).cursor === "pointer") return { el: null, razon: "clicable" };\n', ''],
  ['toqueDe44', T, '  cerca.sort((a, b) => a.d - b.d);\n', ''],
  ['toqueDe44', T, '    if (ganador) { if (c.d - ganador.d < 0.5 && ', '    if (ganador) { if (false && '],
  ['toqueDe44', T, '  if (!dentroDe(areaDe(ganador.r), x, y)) return { el: null, razon: "lejos " + nombre(g), quien: g };\n', ''],
  ['toqueDe44', T, '  if (capaDe(t, cache) !== capaDe(g, cache)) return { el: null, razon: "otra capa " + nombre(g), quien: g };\n', ''],
  ['toqueDe44', T, '    if (tieneAccion(a)) return { el: null, razon: "clicable", quien: g };\n', ''],
  ['toqueDe44', T, 'export const TOQUE_MIN = 44;', 'export const TOQUE_MIN = 36;'],
  // Solo el dedo; el clic del navegador se descarta; un toque que se mueve no es un toque.
  ['toqueDe44', T, 'if (pausa || e.pointerType === "mouse" || !e.isPrimary) return;', 'if (pausa || !e.isPrimary) return;'],
  ['toqueDe44', T, '{ e.preventDefault(); e.stopImmediatePropagation(); }', '{ e.preventDefault(); }'],
  ['toqueDe44', T, 'if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > MOVER || ', 'if ('],
  // No pinta nada.
  ['toqueDe44', T, '  const cancela = () => { toque = null; };', '  const cancela = () => { if (toque) toque.el.style.outline = ""; toque = null; };'],
  ['toqueDe44', T, '    t.el.click();\n', '    t.el.classList.add("tocado"); t.el.click();\n'],
  // Se monta y se exporta.
  ['toqueDe44', AT, 'useEffect(() => instalarToque(), []);', 'useEffect(() => undefined, []);'],
  ['toqueDe44', LY, '<FocoHojas /><AreaDeToque /><Vitales />', '<FocoHojas /><Vitales />'],
  ['toqueDe44', PK, ',\n    "./toque": "./src/toque.ts"', ''],
  // El nombre del encabezado a 320 con letra grande (lo que cazó la medida).
  ['toqueDe44', 'apps/web/app/globals.css', '[data-letra="grande"] [aria-label="To’Latino"] > span { font-size: 17px !important; }', '[data-letra="grande"] [aria-label="To’Latino"] > span { }'],
  // a11y9c lo sigue midiendo (a 320 / 375 y con letra grande incluidos).
  ['toqueDe44', A, "const { medirToque, tocarJunto, toqueInvisible } = require('../lib/toque.cjs');", "const { medirToque, tocarJunto, toqueInvisible } = {};"],
  ['toqueDe44', A, '[320, 568, false], [375, 667, false], [375, 667, true], [320, 568, true]', '[375, 667, false]'],
  ['toqueDe44', A, "  ok(t.pisan.length === 0, `${donde}: ningún toque", "  console.log(t.pisan.length === 0, `${donde}: ningún toque"],
];
// La versión con estilos, de vuelta (lo revertido): el guardián la echa.
const crear = [
  ['toqueDe44', 'packages/ui/src/toque9t.css', '[data-toque=""] { position: relative; }\n[data-toque=""]::after { content: ""; position: absolute; inset: -8px; }\n'],
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
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (${f.split('/').pop()}: ${a.trim().slice(0, 50)})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}
for (const [g, f, c] of crear) {
  total++;
  const ruta = `${R}/${f}`;
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, c);
  let r; try { r = correr(g); } finally { fs.unlinkSync(ruta); }
  const [falla, out] = r;
  console.log(`  ${falla ? '✓' : '✗'} ${g} al revés (crear ${f.split('/').pop()})${out ? ' → ' + out.trim().slice(0, 150) : ''}`); if (falla) bien++;
}

// ── 2 · En el navegador ──
// toque.ts sin tipos (typescript.transpileModule), como un script de la página; `cambio` lo rompe a propósito.
const ts = require(require.resolve('typescript', { paths: [R] }));
const fuente = fs.readFileSync(`${R}/${T}`, 'utf8');
const script = (cambio) => {
  let s = fuente;
  for (const [a, b] of cambio || []) { if (!s.includes(a)) throw new Error('no encontré en toque.ts: ' + a); s = s.replace(a, () => b); }
  const js = ts.transpileModule(s, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText.replace(/^export /gm, '');
  return `(function(){\n${js}\ninstalarToque(window);\n})();`;
};
// Un encabezado con el logo (218 × 28, como «To’Latino» de la ficha) y, 4 px más abajo, en OTRO contenedor, «Ver las 3 fotos» (un botón de la
// pantalla); una fila de chips chicos con aire; un texto.
const CUERPO = `
<div class="enc"><div role="button" tabindex="0" class="logo" data-toque="">To’Latino</div></div>
<div class="fotos"><button type="button">Ver las 3 fotos</button></div>
<div class="fila"><button type="button" class="chip" data-toque="">A</button><button type="button" class="chip" data-toque="">B</button><button type="button" class="chip" data-toque="">C</button></div>
<p class="texto">Un texto cualquiera de la pantalla.</p>`;
const BASE = 'body{margin:0;font:16px sans-serif;background:#fff} .enc{padding:8px 16px 2px;background:#eee} .logo{width:218px;height:28px;background:#ccc}'
  + ' .fotos{margin:2px 16px 0} .fotos button{height:30px;width:140px;border:0;background:#ddd} .fila{display:flex;gap:24px;padding:40px 16px}'
  + ' .chip{width:36px;height:30px;border:0;background:#ddd} .texto{padding:16px}';
// Lo revertido (packages/ui/src/toque.css de 4bb49b4, lo esencial): position relative y un ::after que crece lo que falta para 44.
const VIEJO = '[data-toque=""]{position:relative}[data-toque=""]::after{content:"";position:absolute;top:min(0px,calc(50% - 22px));bottom:min(0px,calc(50% - 22px));left:min(0px,calc(50% - 22px));right:min(0px,calc(50% - 22px))}';
const pruebas = [
  // [nombre, css extra, script (null = sin área), qué tiene que pasar]
  ['limpio: el área de toque tal cual', '', script(null), 'limpio'],
  ['la versión con ::after (revertida): el logo de un contenedor pisa «Ver las 3 fotos» del de abajo', VIEJO, null, 'pisan'],
  ['el área le da al logo un toque que cayó en la caja de otro control (sin la regla «propio» y con «el más cercano» medido desde el centro)', '', script([['  if (t.closest(ACCIONABLE)) return { el: null, razon: "propio" };\n', ''], ['const distancia = (r: Caja, x: number, y: number) => ', 'const distancia = (r: Caja, x: number, y: number) => Math.hypot(x - (r.left + r.right) / 2, y - (r.top + r.bottom) / 2) || ']]), 'pisan'],
  ['sin el área de toque', '', null, 'cortos'],
  ['un área de 36 en vez de 44', '', script([['export const TOQUE_MIN = 44;', 'export const TOQUE_MIN = 36;']]), 'cortos'],
  ['el clic del navegador no se descarta (el toque cuenta dos veces)', '', script([['{ e.preventDefault(); e.stopImmediatePropagation(); }', '{ }']]), 'tocar'],
];
(async () => {
  const { chromium } = require('playwright');
  const { medirToque, tocarJunto } = require('../lib/toque.cjs');
  const br = await chromium.launch();
  try {
    for (const [nombre, css, js, espera] of pruebas) {
      total++;
      const c = await br.newContext({ viewport: { width: 390, height: 700 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      const p = await c.newPage();
      await p.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>${BASE}${css}</style></head><body>${CUERPO}${js ? `<script>${js}</script>` : ''}</body></html>`);
      const t = await medirToque(p), j = await tocarJunto(p);
      await c.close();
      const tocaBien = j.probado && j.junto.length === 1 && j.junto[0].a === 'c' && !j.junto[0].real && j.encima.length === 1 && j.encima[0].a === 'o';
      const res = `pisan ${t.pisan.length}, cortos ${t.cortos.length}, toque real ${tocaBien ? 'bien' : JSON.stringify({ junto: j.junto, encima: j.encima })}`;
      let paso;
      if (espera === 'limpio') paso = t.instalado && t.pisan.length === 0 && t.cortos.length === 0 && t.controles >= 5 && tocaBien;
      else if (espera === 'pisan') paso = t.pisan.length > 0 && t.pisan.some((x) => /Ver las 3 fotos/.test(x));
      else if (espera === 'cortos') paso = t.cortos.length > 0;
      else paso = !tocaBien;
      console.log(`  ${paso ? '✓' : '✗'} medida ${espera === 'limpio' ? 'limpia' : 'caza'}: ${nombre} → ${res}${t.pisan[0] ? ' · ' + t.pisan[0].slice(0, 140) : ''}${espera === 'limpio' && t.cortos[0] ? ' · CORTOS: ' + t.cortos.join(' · ') : ''}`);
      if (paso) bien++;
    }
  } finally { await br.close(); }
  console.log(`\n${bien}/${total} al revés`);
  execSync('node guardianes/run.mjs --solo toqueDe44', { cwd: R, stdio: 'inherit' });
  // 9b-3 · alrevesQueFalla: un defecto sin cazar pone la prueba en rojo.
  if (bien !== total) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
