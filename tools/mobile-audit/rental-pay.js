// rental-pay.js — verify the Renta ONLINE-PAYMENT branch (0099) in the browser:
// on a Stripe-connected business the cart shows "Pagas ahora con tarjeta", the CTA
// is "Pagar renta · $X", and tapping it opens OUR CheckoutSheet (Payment Element).
// js.stripe.com is blocked in the sandbox, so we assert the sheet SHELL + secure
// copy render (the iframes themselves need Stripe's script).
// Usage: SESSION_A=<client> SHOTS_DIR=<dir> SLUG=zz-test-renta-pagos node rental-pay.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const REF = 'zpkaxojonufdwgahiqjh';
const sessA = JSON.parse(fs.readFileSync(process.env.SESSION_A, 'utf8'));
const SLUG = process.env.SLUG || 'zz-test-renta-pagos';
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
  page.on('pageerror', () => {});
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
    check('test items visible', /Mesa test|Silla test/.test(body));
    // pick dates: open date card → tap day 23 → 25 → Listo
    await page.getByText('¿Para qué fechas?').first().click({ timeout: 5000 });
    await page.waitForTimeout(900);
    await page.locator('button', { hasText: /^23$/ }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.locator('button', { hasText: /^25$/ }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /^Listo/ }).first().click({ timeout: 5000 });
    await page.waitForTimeout(800);
    // add both items
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /^Agregar$/ }).first().click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(400);
    }
    // open cart
    await page.getByRole('button', { name: /Continuar/ }).first().click({ timeout: 5000 });
    await page.waitForTimeout(1200);
    body = await page.evaluate(() => document.body.innerText);
    check('online totals: "Pagas ahora con tarjeta"', /Pagas ahora con tarjeta/.test(body));
    check('deposit-at-pickup split shown', /Al recoger · depósito/.test(body));
    check('CTA is "Pagar renta · $"', /Pagar renta · \$/.test(body));
    await page.screenshot({ path: `${SHOTS}/pay-1-cart-online.png`, fullPage: false });
    // tap Pagar → our CheckoutSheet should open (PaymentIntent from the edge fn)
    await page.getByRole('button', { name: /Pagar renta/ }).first().click({ timeout: 6000 });
    await page.waitForTimeout(6000);
    body = await page.evaluate(() => document.body.innerText);
    await page.screenshot({ path: `${SHOTS}/pay-2-checkout-sheet.png`, fullPage: false });
    check('CheckoutSheet opened (our branded sheet)', /Pago seguro|Pagar \$|Total a pagar|Secure payment/.test(body));
  } catch (e) { console.error('ERROR', e.message); failed++; }
  await browser.close();
  console.log(failed === 0 ? '\nPASS ✓' : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
})();
