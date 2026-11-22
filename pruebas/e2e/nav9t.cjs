// 9t · La pantalla responde en el mismo toque (pedido del fundador, 19 nov: «el sitio se queda como enganchado cuando das un click»).
// 20 nov · Decisión del fundador: sin la línea azul de arriba; responde el elemento que se tocó.
// 1) El toque: al tocar un resultado de Buscar (botón con router.push, no un enlace) con la página nueva frenada 2,5 s a propósito, a 80 ms
//    ese resultado ya está marcado (data-tl-tocado) y atenuado; no existe la línea de arriba. Al tocar un enlace del marco (la pestaña de
//    abajo o el menú), el enlace se queda atenuado mientras espera y se suelta al llegar la página.
// 2) Esqueleto: a los 300 ms del mismo toque, el contenido de la pantalla vieja ya se cambió por el esqueleto de la ficha (data-esqueleto,
//    role=status; el encabezado se queda); llega la ficha → el esqueleto se va. Cambiar solo ?tab= no lo saca. Sin loading.tsx: nunca hay
//    dos copias del contenido (la escondida del flujo en dos partes).
// Teléfono 390 y escritorio 1360. No toca la base.
const ENT = require('../lib/entorno.cjs');
const { chromium } = require('playwright'); const http = require('http');
const B = ENT.B, OUT = ENT.OUT;
let n = 0; const ok = (x, m) => { if (!x) throw new Error('ASSERT ' + m); n++; console.log('  ✓', m); };
const traer = (ruta) => new Promise((res, rej) => http.get(B + ruta, { headers: { accept: 'text/html' } }, (r) => { let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => res(b)); }).on('error', rej));
// Lo que está marcado como tocado ahora: cuántos, y la opacidad y el nombre del primero.
const tocados = (p) => p.evaluate(() => { const L = [...document.querySelectorAll('[data-tl-tocado]')]; return { n: L.length, op: L[0] ? Number(getComputedStyle(L[0]).opacity) : 1, que: L[0] ? (L[0].getAttribute('aria-label') || L[0].textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) : '' }; });
(async () => {
  const b = await chromium.launch();
  try {
    for (const [nom, vp, mob] of [['390', { width: 390, height: 844 }, true], ['1360', { width: 1360, height: 900 }, false]]) {
      const c = await b.newContext({ viewport: vp, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 2 : 1 });
      const p = await c.newPage();
      // Precondición propia: Café Quisqueya sale seguro en Buscar (en Inicio depende de lo que dejaron las pruebas anteriores).
      await p.goto(B + '/buscar?q=' + encodeURIComponent('Café Quisqueya'), { waitUntil: 'networkidle' });
      ok((await tocados(p)).n === 0 && (await p.locator('.tl-barra-nav').count()) === 0, `${nom} · sin navegar, nada está marcado y no existe la línea de arriba`);
      await p.route('**/*', async (r) => { const h = r.request().headers(); if (h['rsc'] === '1' && !h['next-router-prefetch']) await new Promise((x) => setTimeout(x, 2500)); await r.continue(); });
      const fila = () => p.getByRole('button', { name: /^Café\s*Quisqueya$/ });
      const tarjeta = fila().first();
      await tarjeta.waitFor();
      await tarjeta.click({ noWaitAfter: true });
      await p.waitForTimeout(80);
      const e1 = await tocados(p);
      ok(e1.n === 1 && e1.op < 0.9 && /Quisqueya/.test(e1.que), `${nom} · a 80 ms del toque el resultado tocado ya está atenuado (${e1.n} marcado, opacidad ${e1.op}, «${e1.que}») aunque la página tarda 2,5 s`);
      await p.waitForTimeout(700);
      await p.waitForTimeout(0);
      ok(await p.locator('[data-esqueleto]').isVisible() && await p.locator('[data-esqueleto] [aria-hidden]').count() > 5, `${nom} · el esqueleto de la ficha ya está en lugar de la pantalla vieja`);
      ok(await fila().count() === 0, `${nom} · la pantalla vieja ya no está (no hay dos contenidos a la vez)`);
      if (nom === '390') await p.screenshot({ path: OUT + 'nav9t-esqueleto-390.png' });
      await p.waitForURL((u) => u.pathname.startsWith('/n/'), { timeout: 15000 });
      await p.waitForTimeout(600);
      ok((await tocados(p)).n === 0, `${nom} · llegó la ficha: nada queda marcado`);
      ok(await p.locator('[data-esqueleto]').count() === 0 && await p.locator('[data-ficha], [data-screen-label^="Ficha"]').count() > 0, `${nom} · el esqueleto se fue y está la ficha`);
      // Un control del marco (se queda en pantalla mientras llega la página): atenuado mientras espera, suelto al llegar. En el teléfono es la
      // pestaña de abajo (un botón con router.push); en el escritorio, el menú de arriba.
      await p.goto(B + '/negocios', { waitUntil: 'networkidle' });
      const enlace = p.getByRole('button', { name: /^eventos$/i }).or(p.getByRole('link', { name: /^eventos$/i })).or(p.getByRole('tab', { name: /^eventos$/i })).locator('visible=true').first();
      await enlace.click({ noWaitAfter: true });
      await p.waitForTimeout(400);
      const e3 = await tocados(p);
      ok(e3.n === 1 && Math.abs(e3.op - 0.55) < 0.06, `${nom} · «Eventos» del marco se queda atenuado mientras llega la página (${e3.n} marcado, opacidad ${e3.op}, «${e3.que}»)`);
      if (nom === '390') await p.screenshot({ path: OUT + 'nav9t-tocado-390.png' });
      await p.waitForURL((u) => u.pathname === '/eventos', { timeout: 15000 });
      await p.waitForTimeout(400);
      ok((await tocados(p)).n === 0, `${nom} · llegó Eventos: se soltó`);
      await c.close();
    }
    // Sin flujo en dos partes: lo que manda el servidor no trae esqueleto (sale solo en el navegador al navegar) ni una copia escondida.
    for (const [que, ruta] of [['la ficha', '/n/cafe-quisqueya'], ['Buscar', '/buscar?q=pollo'], ['la Comunidad', '/comunidad']]) {
      const h = await traer(ruta);
      // Next puede mandar trozos VACÍOS aparte cuando el servidor va lento (los metadatos y el lugar de la barra: <div hidden id="S:n"></div>);
      // eso no es una copia de la página. Lo que no puede llegar escondido es contenido (19 nov: loading.tsx mandaba la pantalla entera así).
      const escondido = [...h.matchAll(/<div hidden id="S:\d+">([\s\S]*?)<\/div><script>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
      ok(!h.includes('data-esqueleto') && escondido.length === 0, `${que}: el servidor manda la página entera, sin esqueleto ni copia escondida${escondido.length ? ' → ' + escondido[0].slice(0, 80) : ''}`);
    }
    console.log(`OK (${n} comprobaciones)`);
  } catch (e) { console.error(e); process.exitCode = 1; } finally { await b.close(); }
})();
