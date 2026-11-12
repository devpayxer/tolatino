const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); }; // 9b-1 · antes solo imprimía: la corrida la contaba «en verde con 0 ✓»
const { chromium } = require('playwright');
const OUT = ENT.S + '/cap/';
(async () => {
  const b = await chromium.launch();
  const errores = [];
  // Teléfono
  const m = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await m.newPage();
  p.on('pageerror', e => errores.push('m: ' + e.message));
  p.on('console', x => { if (x.type() === 'error' && !/teselas|Failed to load resource/.test(x.text())) errores.push('m console: ' + x.text()); });
  await p.goto('http://localhost:3100/');
  await p.getByText('5 MI', { exact: true }).click();
  await p.getByText('¿Dónde buscas?').waitFor(); ok(true, 'teléfono: «5 MI» abre «¿Dónde buscas?»');
  await p.waitForTimeout(900);
  await p.screenshot({ path: OUT + 'm1-sheet.png' });
  // North End + 10 mi
  await p.getByText('North End', { exact: true }).click();
  await p.getByText('10 mi', { exact: true }).click();
  await p.waitForTimeout(800);
  await p.locator('div[style*="overflow-y: auto"]').first().evaluate(e => e.scrollTop = 380);
  await p.screenshot({ path: OUT + 'm2-north10.png' });
  await p.locator('div[style*="overflow-y: auto"]').first().evaluate(e => e.scrollTop = 900);
  await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + 'm3-ciudades.png' });
  // búsqueda de lugar
  await p.locator('div[style*="overflow-y: auto"]').first().evaluate(e => e.scrollTop = 0);
  await p.getByPlaceholder('Dirección, barrio, ciudad o código postal').fill('free');
  await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + 'm4-buscar-lugar.png' });
  await p.getByPlaceholder('Dirección, barrio, ciudad o código postal').fill('');
  // aplicar
  await p.getByRole('button', { name: /negocios a 10 mi/ }).click().catch(async () => { await p.getByText(/negocios a 10 mi/).click(); });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: OUT + 'm5-inicio-north10.png' });
  // pedir ciudad sin cuenta
  await p.getByText('10 MI', { exact: true }).click();
  await p.getByText('Avísame cuando llegue a mi zona').first().click();
  await p.getByPlaceholder('Ej. Bethlehem, PA').fill('Bethlehem, PA');
  await p.getByPlaceholder('(570) 555-0142').fill('5705550199');
  await p.screenshot({ path: OUT + 'm6-pedir.png' });
  await p.getByText('Avísame', { exact: true }).last().click();
  await p.getByText('Anotamos').waitFor({ timeout: 5000 }); ok(true, 'pedir la ciudad sin cuenta: «Anotamos»');
  await p.screenshot({ path: OUT + 'm7-pedido-listo.png' });
  // Elegir Allentown → Pronto
  await p.getByRole('button', { name: 'Volver' }).click();
  await p.getByText('Allentown, PA').first().click();
  await p.waitForTimeout(600);
  await p.getByText('Ver Allentown').click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: OUT + 'm8-pronto.png', fullPage: true });
  // Escritorio
  const d = await b.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  const q = await d.newPage();
  q.on('pageerror', e => errores.push('d: ' + e.message));
  await q.goto('http://localhost:3100/negocios');
  await q.getByText(/Hazleton, PA/).first().click();
  await q.getByText('¿Dónde buscas?').waitFor(); ok(true, 'escritorio: el selector abre desde Negocios');
  await q.waitForTimeout(900);
  await q.screenshot({ path: OUT + 'd1-pop.png' });
  await q.getByText('The Heights', { exact: true }).click();
  await q.getByText('2 mi', { exact: true }).click();
  await q.waitForTimeout(900);
  await q.screenshot({ path: OUT + 'd2-heights2.png' });
  await q.getByText(/negocios a 2 mi/).last().click();
  await q.waitForTimeout(1500);
  await q.screenshot({ path: OUT + 'd3-negocios-heights2.png' });
  await q.getByText(/Hazleton, PA/).first().click();
  await q.getByText('Reading, PA').first().click();
  await q.waitForTimeout(700);
  await q.screenshot({ path: OUT + 'd4-pop-reading.png' });
  await q.getByText('Ver Reading').last().click();
  await q.waitForTimeout(1500);
  await q.screenshot({ path: OUT + 'd5-pronto.png', fullPage: true });
  ok(/Reading/.test(await q.locator('body').innerText()), 'escritorio: «Ver Reading» lleva a Reading');
  ok(!errores.length, `sin errores en las páginas (${errores.join(' | ').slice(0, 300) || 'ninguno'})`);
  await b.close();
})().catch(e => { console.error('FALLO', e.message); process.exit(1); });
