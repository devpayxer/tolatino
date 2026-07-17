const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:4173';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await page.route('**://fonts.g**', (r) => r.abort());
  await page.goto(`${BASE}/negocio/?t=rental&sub=ops`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  // ensure we're on the "Rentas" (ops) view
  await page.getByRole('button', { name: /Rentas|Rentals/ }).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const body = await page.evaluate(() => document.body.innerText);
  const checks = {
    explainer: /Cómo funciona una renta|How a rental works/.test(body),
    steps: /Tomas el depósito|Take the deposit/.test(body),
    needsAction: /Acción necesaria|Needs action/.test(body),
    toHandOut: /Por entregar|To hand out/.test(body),
    inUse: /En uso|Out now/.test(body),
    noFake: !/Park Studios.*Salón|Retenido.*\$430|\$430/.test(body),
  };
  console.log(JSON.stringify(checks, null, 2));
  await page.screenshot({ path: '/tmp/rpanel/ops.png', fullPage: true });
  await browser.close();
})();
