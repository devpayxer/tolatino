// rental-cart.js — verify the Renta CART flow (0097) end to end:
//   CLIENT adds 2 items on the party-rental business → opens the cart → picks an
//   event date → checks out (pay-at-pickup, manual → "¡Renta solicitada!" + "Por
//   confirmar"). Screenshot each step.
// Usage: SESSION_A=<client> SHOTS_DIR=<dir> node rental-cart.js
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
    check('rental tab shows items (Mesa/Silla/Carpa)', /Mesa|Silla|Carpa/.test(body));
    // add the first two items
    const adds = page.getByRole('button', { name: /^Agregar$/ });
    await adds.nth(0).click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /^Agregar$/ }).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/rental-1-items.png`, fullPage: false }).catch(() => {});
    // open the cart
    await page.getByRole('button', { name: /Ver carrito de renta/ }).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    // pick a future day in the calendar (day 25 of the current month)
    await page.locator('button', { hasText: /^25$/ }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/rental-2-cart.png`, fullPage: false }).catch(() => {});
    // checkout (manual → Solicitar renta)
    const cta = page.getByRole('button', { name: /Solicitar renta|Confirmar renta/ }).first();
    check('checkout CTA present', await cta.isVisible().catch(() => false));
    await cta.click({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(3500);
    body = await page.evaluate(() => document.body.innerText);
    await page.screenshot({ path: `${SHOTS}/rental-3-confirm.png`, fullPage: false }).catch(() => {});
    check('confirmation "¡Renta solicitada!"', /¡Renta solicitada!/.test(body));
    check('status chip "Por confirmar"', /Por confirmar/.test(body));
  } catch (e) { console.error('ERROR', e.message); failed++; }
  await browser.close();
  console.log(failed === 0 ? '\nPASS ✓' : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
})();
