// rental-flow.js — prove the redesigned Renta flow (dates lead, Turo/Airbnb-style):
//   1) rental tab shows a top DATE card + 3-step guide (before any item)
//   2) tap Elegir → date sheet with calendar → pick a range → Listo
//   3) items now show the per-item span subtotal (= $ · N días)
//   4) add 2 items → cart bar "Continuar" → cart sheet with extras + totals
//   5) request → confirmation
// Screenshots each step. Usage: SESSION_A=<client> SHOTS_DIR=<dir> node rental-flow.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const REF = 'zpkaxojonufdwgahiqjh';
const sessA = JSON.parse(fs.readFileSync(process.env.SESSION_A, 'utf8'));
const SLUG = 'hz-alquiler-fiesta';
function curlRelay(req) {
  return new Promise((resolve) => {
    const args = ['-s', '-o', '-', '-w', '\n%{http_code}', '-X', req.method(), '--max-time', '25'];
    const h = req.headers();
    for (const k of ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info', 'range']) if (h[k]) args.push('-H', `${k}: ${h[k]}`);
    const body = req.postData(); if (body != null) args.push('--data-binary', body);
    args.push(req.url());
    execFile('curl', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }, (err, stdout) => {
      const out = stdout || ''; if (err && !out) return resolve({ status: 502, body: String(err).slice(0, 200) });
      const nl = out.lastIndexOf('\n'); resolve({ status: parseInt(out.slice(nl + 1), 10) || 500, body: out.slice(0, nl) });
    });
  });
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await page.route('**://*.supabase.co/**', async (route) => { const { status, body } = await curlRelay(route.request()); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.g**', (r) => r.abort());
  await page.route('**://js.stripe.com/**', (r) => r.abort());
  await page.addInitScript(([s, ref]) => localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s)), [sessA, REF]);
  let failed = 0;
  const check = (n, ok) => { if (!ok) failed++; console.log(`${ok ? '[ok]  ' : '[FAIL]'} ${n}`); };
  try {
    await page.goto(`${BASE}/negocios/?b=${SLUG}&bt=rentals`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);
    let body = await page.evaluate(() => document.body.innerText);
    check('date card present ("¿Para qué fechas?")', /¿Para qué fechas\?/.test(body));
    check('3-step guide present (Fechas · Artículos · Extras)', /Fechas/.test(body) && /Extras y solicitar/.test(body));
    check('items visible (Mesa/Silla)', /Mesa|Silla/.test(body));
    await page.screenshot({ path: `${SHOTS}/flow-1-dates-lead.png`, fullPage: false });

    // open the date sheet (the whole date card is clickable)
    await page.getByText('¿Para qué fechas?').first().click({ timeout: 5000 });
    await page.waitForTimeout(1000);
    body = await page.evaluate(() => document.body.innerText);
    check('date sheet opened (calendar hint)', /Elige uno o dos días|Fechas del evento/.test(body));
    // pick a start day (23) then an end day (25) → a range
    await page.locator('button', { hasText: /^23$/ }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.locator('button', { hasText: /^25$/ }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/flow-2-calendar.png`, fullPage: false });
    // done
    await page.getByRole('button', { name: /^Listo/ }).first().click({ timeout: 5000 });
    await page.waitForTimeout(1000);
    body = await page.evaluate(() => document.body.innerText);
    check('after dates: item shows span subtotal ("· 3 días")', /·\s*3\s*días/.test(body));
    await page.screenshot({ path: `${SHOTS}/flow-3-items-priced.png`, fullPage: false });

    // add the first two items
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /^Agregar$/ }).first().click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(400);
    }
    body = await page.evaluate(() => document.body.innerText);
    check('cart bar "Continuar" with total', /Continuar/.test(body) && /extras y solicitar/.test(body));
    await page.screenshot({ path: `${SHOTS}/flow-4-cart-bar.png`, fullPage: false });

    // open the cart
    await page.getByRole('button', { name: /Continuar/ }).first().click({ timeout: 5000 });
    await page.waitForTimeout(1200);
    body = await page.evaluate(() => document.body.innerText);
    check('cart shows Extras del pedido (addons)', /Extras del pedido/.test(body));
    check('cart shows Depósito reembolsable', /Depósito reembolsable/.test(body));
    // pick a delivery extra
    await page.locator('button', { hasText: /Entrega a domicilio/ }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/flow-5-cart-review.png`, fullPage: false });

    // request the rental (manual business → Solicitar renta)
    const cta = page.getByRole('button', { name: /Solicitar renta|Confirmar renta/ }).first();
    check('checkout CTA present', await cta.isVisible().catch(() => false));
    await cta.click({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(3500);
    body = await page.evaluate(() => document.body.innerText);
    await page.screenshot({ path: `${SHOTS}/flow-6-confirm.png`, fullPage: false });
    check('confirmation "¡Renta solicitada!"', /¡Renta solicitada!|¡Renta confirmada!/.test(body));
  } catch (e) { console.error('ERROR', e.message); failed++; }
  await browser.close();
  console.log(failed === 0 ? '\nPASS ✓' : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
})();
