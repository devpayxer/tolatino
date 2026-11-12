const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); }; // 9b-1 · antes solo imprimía: la corrida la contaba «en verde con 0 ✓»
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = ENT.S + '/cap/', TES = ENT.rec('teselas-muestra') + '/'; // 9a: teselas de muestra OPCIONALES (sin ellas, 404 y el mapa sale sin fondo)
(async () => {
  const b = await chromium.launch(); const err = [];
  const teselas = async (ctx) => ctx.route('**/teselas/**', async (r) => {
    const m = r.request().url().match(/\/(\d+)\/(\d+)\/(\d+)\.png/); const f = m && path.join(TES, m[1], m[2], m[3] + '.png');
    if (f && fs.existsSync(f)) return r.fulfill({ path: f, contentType: 'image/png' }); return r.fulfill({ status: 404, body: '' });
  });
  // Teléfono
  const m = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await teselas(m);
  const p = await m.newPage(); p.on('pageerror', e => err.push('m ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/404|Failed to load/.test(x.text())) err.push('m console ' + x.text()); });
  await p.goto('http://localhost:3100/mapa?cat=comida&ctx=1'); await p.waitForTimeout(1200);
  ok(/\/mapa/.test(p.url()), 'el mapa abre en el teléfono');
  await p.screenshot({ path: OUT + 'mp1-movil.png' });
  // tocar un pin
  const pin = p.locator('[data-screen-label="Mapa · pines"] div[role=button]').nth(3);
  await pin.click(); await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + 'mp2-movil-pin.png' });
  // acercar y arrastrar
  await p.getByRole('button', { name: 'Acercar' }).click(); await p.waitForTimeout(300);
  const box = await p.locator('[data-screen-label="Mapa · pines"]').boundingBox();
  await p.mouse.move(box.x + 100, box.y + 250); await p.mouse.down(); await p.mouse.move(box.x + 200, box.y + 300, { steps: 6 }); await p.mouse.up();
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + 'mp3-movil-zoom.png' });
  await p.evaluate(() => window.scrollTo(0, 520)); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + 'mp4-movil-lista.png' });
  // Escritorio
  const d = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await teselas(d);
  const q = await d.newPage(); q.on('pageerror', e => err.push('d ' + e.message));
  await q.goto('http://localhost:3100/c/comida'); await q.locator('text=Mapa >> visible=true').last().click(); await q.waitForURL(/\/mapa/);
  ok(/\/mapa/.test(q.url()), 'desde la categoría «Mapa» abre el mapa');
  await q.goto('http://localhost:3100/mapa'); await q.waitForTimeout(1200);
  await q.screenshot({ path: OUT + 'mp5-desk.png' });
  await q.getByText('Abierto ahora', { exact: true }).click(); await q.waitForTimeout(1200);
  ok(/NEGOCIOS · EL MÁS CERCA/.test(await q.locator('text=/NEGOCIOS · EL MÁS CERCA/').first().textContent()), `«Abierto ahora» filtra la lista (${q.url().split('?')[1] ?? ''})`);
  await q.locator('div[style*="overflow-y: auto"] >> nth=0').locator('div[style*="border-radius: 17px"]').nth(2).click(); await q.waitForTimeout(600);
  await q.screenshot({ path: OUT + 'mp6-desk-sel.png' });
  await q.getByText(/5 mi · Cambiar/).click(); await q.getByText('¿Dónde buscas?').waitFor({ timeout: 4000 }); ok(true, 'el selector de zona abre desde el mapa');
  ok(!err.length, `sin errores en las páginas (${err.join(' | ').slice(0, 300) || 'ninguno'})`);
  await b.close();
})().catch(e => { console.error('FALLO', e.message); process.exit(1); });
