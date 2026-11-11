const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
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
  console.log('cerca:', await p.getByText(/queda a .* mi de Hazleton/).count());
  await p.getByText('Ampliar a 10 mi').click();
  await p.waitForTimeout(800);
  console.log('radio 10 activo:', await p.getByText('Ver ', { exact: false }).last().textContent());
  // pronto → ver Hazleton
  await p.goto('http://localhost:3100/');
  await p.getByText('10 MI').first().click().catch(()=>{});
  await p.goto('http://localhost:3100/negocios');
  // inglés
  await c.addCookies([{ name: 'tl_lang', value: 'en', url: 'http://localhost:3100' }]);
  await p.goto('http://localhost:3100/');
  await p.getByText(/MI$/).first().click();
  await p.getByText('Where are you looking?').waitFor();
  await p.waitForTimeout(700);
  await p.screenshot({ path: OUT + 'm10-en.png' });
  console.log('errores', err);
  await b.close();
})().catch(e => { console.error('FALLO', e.message); process.exit(1); });
