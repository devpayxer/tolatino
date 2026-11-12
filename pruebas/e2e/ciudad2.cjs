const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); }; // 9b-1 · antes solo imprimía: la corrida la contaba «en verde con 0 ✓»
const { chromium } = require('playwright');
const OUT = ENT.S + '/cap/';
(async () => {
  const b = await chromium.launch(); const err = [];
  const c = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const p = await c.newPage(); p.on('pageerror', e => err.push(e.message));
  // pedir y quitar
  await p.goto('http://localhost:3100/ciudad?pedir');
  await p.getByText('Avísame cuando llegue a mi zona').first().waitFor();
  await p.getByPlaceholder('Ej. Bethlehem, PA').fill('Freeland');
  await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + 'm9-cerca.png' });
  ok(await p.getByText(/queda a .* mi de Hazleton/).count() >= 1, 'Freeland: «queda a N mi de Hazleton»');
  await p.getByText('Ampliar a 10 mi').click();
  await p.waitForTimeout(800);
  const ver = await p.getByText('Ver ', { exact: false }).last().textContent(); ok(!!ver, `ampliar a 10 mi ofrece «${ver}»`);
  // pronto → ver Hazleton
  await p.goto('http://localhost:3100/');
  await p.getByText('10 MI').first().click().catch(()=>{});
  await p.goto('http://localhost:3100/negocios');
  // inglés
  await c.addCookies([{ name: 'tl_lang', value: 'en', url: 'http://localhost:3100' }]);
  await p.goto('http://localhost:3100/');
  await p.getByText(/MI$/).first().click();
  await p.getByText('Where are you looking?').waitFor(); ok(true, 'en inglés: «Where are you looking?»');
  await p.waitForTimeout(700);
  await p.screenshot({ path: OUT + 'm10-en.png' });
  ok(!err.length, `sin errores en las páginas (${err.join(' | ').slice(0, 300) || 'ninguno'})`);
  await b.close();
})().catch(e => { console.error('FALLO', e.message); process.exit(1); });
