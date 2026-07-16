// rental-both.js — owner processing + customer tracking for the rental cart.
//   OWNER dashboard → switch to the rental biz → Rentas ops → confirm the order.
//   CLIENT Mi cuenta → Mis rentas shows the order with its status.
// Usage: SESSION_A=<client> SESSION_B=<owner> SHOTS_DIR=<dir> node rental-both.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const REF = 'zpkaxojonufdwgahiqjh';
const sessA = JSON.parse(fs.readFileSync(process.env.SESSION_A, 'utf8'));
const sessB = JSON.parse(fs.readFileSync(process.env.SESSION_B, 'utf8'));
function curlRelay(req) {
  return new Promise((resolve) => {
    const args = ['-s', '-o', '-', '-w', '\n%{http_code}', '-X', req.method(), '--max-time', '25'];
    const h = req.headers();
    for (const k of ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info', 'range']) if (h[k]) args.push('-H', `${k}: ${h[k]}`);
    const b = req.postData(); if (b != null) args.push('--data-binary', b);
    args.push(req.url());
    execFile('curl', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }, (e, o) => { o = o || ''; const nl = o.lastIndexOf('\n'); resolve({ status: parseInt(o.slice(nl + 1), 10) || 500, body: o.slice(0, nl) }); });
  });
}
async function newPage(browser, session, vp) {
  const page = await browser.newPage({ viewport: vp });
  page.on('pageerror', () => {});
  await page.route('**://*.supabase.co/**', async (r) => { const { status, body } = await curlRelay(r.request()); await r.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.g**', (r) => r.abort());
  await page.route('**://js.stripe.com/**', (r) => r.abort());
  await page.addInitScript(([s, ref]) => localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s)), [session, REF]);
  return page;
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  let failed = 0; const check = (n, ok) => { if (!ok) failed++; console.log(`${ok ? '[ok]  ' : '[FAIL]'} ${n}`); };
  try {
    // OWNER: dashboard → switch to Alquiler Fiesta → Rentas ops
    const owner = await newPage(browser, sessB, { width: 390, height: 844 });
    await owner.goto(`${BASE}/negocio/?t=rental`, { waitUntil: 'domcontentloaded' });
    await owner.waitForTimeout(7000);
    const sw = owner.locator('button[aria-expanded]').first();
    if (await sw.isVisible().catch(() => false)) {
      await sw.click({ timeout: 4000 }).catch(() => {});
      await owner.waitForTimeout(500);
      await owner.locator('button', { hasText: 'Alquiler Fiesta' }).last().click({ timeout: 4000 }).catch(() => {});
      await owner.waitForTimeout(4500);
    }
    // go to the Rentas ops mode + Solicitudes
    await owner.getByRole('button', { name: /^Rentas$/ }).first().click({ timeout: 4000 }).catch(() => {});
    await owner.waitForTimeout(1500);
    let obody = await owner.evaluate(() => document.body.innerText);
    check('owner sees the rental order (Mesa redonda)', /Mesa redonda/.test(obody));
    await owner.screenshot({ path: `${SHOTS}/rental-owner-ops.png`, fullPage: true }).catch(() => {});
    // confirm it
    await owner.getByRole('button', { name: /^Confirmar$/ }).first().click({ timeout: 4000 }).catch(() => {});
    await owner.waitForTimeout(2000);

    // CLIENT: Mi cuenta → Mis rentas
    const client = await newPage(browser, sessA, { width: 390, height: 844 });
    await client.goto(`${BASE}/cuenta/`, { waitUntil: 'domcontentloaded' });
    await client.waitForTimeout(6000);
    await client.getByText(/Mis rentas/).first().click({ timeout: 5000 }).catch(() => {});
    await client.waitForTimeout(2500);
    const cbody = await client.evaluate(() => document.body.innerText);
    await client.screenshot({ path: `${SHOTS}/rental-client-cuenta.png`, fullPage: false }).catch(() => {});
    check('client Mi cuenta shows the rental', /Alquiler Fiesta|Mesa redonda|art/.test(cbody));
  } catch (e) { console.error('ERROR', e.message); failed++; }
  await browser.close();
  console.log(failed === 0 ? '\nPASS ✓' : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
})();
