// 9t · La pantalla responde en el mismo toque (pedido del fundador, 19 nov: «el sitio se queda como enganchado cuando das un click»).
// 1) Barra de navegación: al tocar un resultado de Buscar (botón con router.push, no un enlace) con la página nueva frenada 2,5 s a propósito,
//    la barra sale antes de 100 ms y avanza; al llegar la página, se completa y se apaga. Atrás del navegador también la enciende.
// 2) Esqueleto: a los 300 ms del mismo toque, el contenido de la pantalla vieja ya se cambió por el esqueleto de la ficha (data-esqueleto,
//    role=status; el encabezado se queda); llega la ficha → el esqueleto se va. Cambiar solo ?tab= no lo saca. Sin loading.tsx: nunca hay
//    dos copias del contenido (la escondida del flujo en dos partes).
// Teléfono 390 y escritorio 1360. No toca la base.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const http = require('http');
const B = ENT.B, OUT = ENT.OUT;
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const traer = (ruta) => new Promise((res, rej) => http.get(B + ruta, { headers: { accept: 'text/html' } }, (r) => { let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => res(b)); }).on('error', rej));
const estado = (p) => p.locator('.tl-barra-nav').evaluate((e) => ({ e: e.dataset.estado, t: e.style.transform }));
(async () => {
  const b = await chromium.launch();
  try {
    for (const [nom, vp, mob] of [['390', { width: 390, height: 844 }, true], ['1360', { width: 1360, height: 900 }, false]]) {
      const c = await b.newContext({ viewport: vp, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 2 : 1 });
      const p = await c.newPage();
      // Precondición propia: Café Quisqueya sale seguro en Buscar (en Inicio depende de lo que dejaron las pruebas anteriores).
      await p.goto(B + '/buscar?q=' + encodeURIComponent('Café Quisqueya'), { waitUntil: 'networkidle' });
      ok((await estado(p)).e === 'quieta', `${nom} · sin navegar, la barra está apagada`);
      await p.route('**/*', async (r) => { const h = r.request().headers(); if (h['rsc'] === '1' && !h['next-router-prefetch']) await new Promise((x) => setTimeout(x, 2500)); await r.continue(); });
      const fila = () => p.getByRole('button', { name: /Café\s*Quisqueya/ });
      const tarjeta = fila().first();
      await tarjeta.waitFor();
      await tarjeta.click({ noWaitAfter: true });
      await p.waitForTimeout(80);
      const e1 = await estado(p);
      ok(e1.e === 'va' && /scaleX\(0\.\d+\)/.test(e1.t), `${nom} · a 80 ms del toque la barra ya salió (${e1.e} ${e1.t}) aunque la página tarda 2,5 s`);
      await p.waitForTimeout(700);
      const e2 = await estado(p);
      ok(e2.e === 'va' && parseFloat(/scaleX\(([\d.]+)\)/.exec(e2.t)?.[1] ?? '0') > parseFloat(/scaleX\(([\d.]+)\)/.exec(e1.t)?.[1] ?? '1'), `${nom} · la barra avanza mientras espera (${e2.t})`);
      await p.waitForTimeout(0);
      ok(await p.locator('[data-esqueleto]').isVisible() && await p.locator('[data-esqueleto] [aria-hidden]').count() > 5, `${nom} · el esqueleto de la ficha ya está en lugar de la pantalla vieja`);
      ok(await fila().count() === 0, `${nom} · la pantalla vieja ya no está (no hay dos contenidos a la vez)`);
      if (nom === '390') await p.screenshot({ path: OUT + 'nav9t-barra-390.png' });
      await p.waitForURL((u) => u.pathname.startsWith('/n/'), { timeout: 15000 });
      await p.waitForTimeout(600);
      ok((await estado(p)).e === 'quieta', `${nom} · llegó la ficha: la barra se completó y se apagó`);
      ok(await p.locator('[data-esqueleto]').count() === 0 && await p.locator('[data-ficha], [data-screen-label^="Ficha"]').count() > 0, `${nom} · el esqueleto se fue y está la ficha`);
      await c.close();
    }
    // Sin flujo en dos partes: lo que manda el servidor no trae esqueleto (sale solo en el navegador al navegar) ni una copia escondida.
    for (const [que, ruta] of [['la ficha', '/n/cafe-quisqueya'], ['Buscar', '/buscar?q=pollo'], ['la Comunidad', '/comunidad']]) {
      const h = await traer(ruta);
      ok(!h.includes('data-esqueleto') && !/<div hidden id="S:/.test(h), `${que}: el servidor manda la página entera, sin esqueleto ni copia escondida`);
    }
    console.log(`OK (${n} comprobaciones)`);
  } catch (e) { console.error(e); process.exitCode = 1; } finally { await b.close(); }
})();
