// spinner-timeout.js — verify the P0 hanging-spinner fix (global fetch timeout).
// Two runs as El Sabor owner (b@b.com), Mensajes module:
//   A) NORMAL  — relay all Supabase → module loads, NO infinite spinner.
//   B) STALLED — relay all EXCEPT business_conversations (those hang forever) →
//      the module spinner appears, then RESOLVES within the 15s fetch timeout
//      (spinner gone, empty/error state shown) instead of spinning indefinitely.
// Usage: SESSION_B=<sess.json> SHOTS_DIR=<dir> node spinner-timeout.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
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
async function newPage(browser, { stall }) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', () => {});
  await page.route('**://*.supabase.co/**', async (route) => {
    // In STALLED mode, drop business_conversations reads on the floor (never
    // fulfill) to emulate a dead mobile connection for that one query.
    if (stall && /business_conversations/.test(route.request().url())) return; // hang
    const { status, body } = await curlRelay(route.request());
    await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body });
  });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.addInitScript(([s]) => { localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s)); }, [sessB]);
  return page;
}
async function openMensajes(page) {
  await page.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6500);
  await page.getByRole('button', { name: 'Menú', exact: true }).first().click({ timeout: 10000 });
  await page.waitForTimeout(700);
  const items = page.getByText('Mensajes', { exact: true });
  const n = await items.count();
  for (let i = 0; i < n; i++) { const el = items.nth(i); if (await el.isVisible().catch(() => false)) { await el.click(); break; } }
}
const spinnerVisible = (page) => page.locator('.animate-spin').first().isVisible().catch(() => false);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const report = {};
  try {
    // A) NORMAL
    let page = await newPage(browser, { stall: false });
    await openMensajes(page);
    await page.waitForTimeout(3500);
    report.normal_spinner_after_load = await spinnerVisible(page);
    report.normal_body_has_content = (await page.locator('body').innerText()).length > 200;
    await page.screenshot({ path: `${SHOTS}/spin-normal.png` });
    await page.close();

    // B) STALLED — conversations hang; spinner must resolve within the timeout
    page = await newPage(browser, { stall: true });
    await openMensajes(page);
    await page.waitForTimeout(2500);
    report.stalled_spinner_at_2s = await spinnerVisible(page);       // expect true (still waiting)
    await page.screenshot({ path: `${SHOTS}/spin-stalled-2s.png` });
    // wait past the 15s fetch timeout
    await page.waitForTimeout(16000);
    report.stalled_spinner_at_18s = await spinnerVisible(page);      // expect FALSE (timed out → resolved)
    await page.screenshot({ path: `${SHOTS}/spin-stalled-18s.png` });
    await page.close();
    console.log('RESULT ' + JSON.stringify(report));
    await browser.close();
  } catch (e) { console.error('exception:', String(e).slice(0, 400)); console.log('RESULT ' + JSON.stringify(report)); await browser.close(); process.exit(1); }
})();
