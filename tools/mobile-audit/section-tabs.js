// section-tabs.js — screenshot a module's section nav (now underline TABS) to
// validate the new style vs the pill filters. Owner (b@b.com). Navigates to a tab
// key passed via TAB env (default 'fulfillment'), desktop + mobile.
// Usage: SESSION_B=<sessB.json> SHOTS_DIR=<dir> TAB=fulfillment LABEL=name node section-tabs.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const TABLABEL = process.env.LABEL || 'Entregas y envíos';
const NAME = process.env.NAME || 'fulfillment';
const sessB = JSON.parse(fs.readFileSync(process.env.SESSION_B, 'utf8'));
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
async function newPage(browser, viewport) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', () => {});
  await page.route('**://*.supabase.co/**', async (route) => { const { status, body } = await curlRelay(route.request()); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.addInitScript(([s]) => { localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s)); }, [sessB]);
  return page;
}
async function openModule(page, mobile) {
  await page.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6500);
  if (mobile) { await page.getByRole('button', { name: 'Menú', exact: true }).first().click({ timeout: 10000 }); await page.waitForTimeout(700); }
  const items = page.getByText(TABLABEL, { exact: true });
  const n = await items.count();
  for (let i = 0; i < n; i++) { const el = items.nth(i); if (await el.isVisible().catch(() => false)) { await el.click(); break; } }
  await page.waitForTimeout(2500);
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    let page = await newPage(browser, { width: 1440, height: 950 });
    await openModule(page, false);
    await page.screenshot({ path: `${SHOTS}/tabs-${NAME}-desktop.png` });
    await page.close();
    page = await newPage(browser, { width: 390, height: 844 });
    await openModule(page, true);
    await page.screenshot({ path: `${SHOTS}/tabs-${NAME}-mobile.png` });
    console.log('shots done for', NAME);
    await browser.close();
  } catch (e) { console.error('exception:', String(e).slice(0, 300)); await browser.close(); process.exit(1); }
})();
