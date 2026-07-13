// stats-tab.js — verify the dedicated Estadísticas tab renders REAL analytics
// for the owner (b@b.com, El Sabor): range selector (7/30/90), interacciones
// totales + trend, customer-actions grid (Vistas/Guardados/Cómo llegar/Llamadas)
// with sparklines, reputación, ventas. Backend seeded with a multi-day spread.
// Usage: SESSION_B=<sessB.json> SHOTS_DIR=<dir> node stats-tab.js
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
async function newPage(browser, session, viewport) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', () => {});
  await page.route('**://*.supabase.co/**', async (route) => { const { status, body } = await curlRelay(route.request()); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  if (session) await page.addInitScript(([s]) => { localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s)); }, [session]);
  return page;
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let page;
  const fail = async (m) => { if (page) await page.screenshot({ path: `${SHOTS}/stats-FAIL.png`, fullPage: true }).catch(() => {}); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  try {
    // ── desktop: sidebar has Estadísticas directly ──
    page = await newPage(browser, sessB, { width: 1440, height: 900 });
    await page.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6500);
    await page.getByText('Estadísticas', { exact: true }).first().click({ timeout: 10000 });
    await page.waitForTimeout(4000);
    let body = await page.evaluate(() => document.body.innerText);
    for (const t of ['Interacciones totales', 'Guardados', 'Cómo llegar', 'Llamadas', 'Reputación']) {
      if (!body.includes(t)) return fail('missing on stats page: ' + t);
    }
    console.log('desktop 7d: hero + actions + reputación present');
    await page.screenshot({ path: `${SHOTS}/stats-desktop-7d.png` });
    // switch to 30 días
    await page.getByRole('button', { name: '30 días', exact: true }).click({ timeout: 8000 });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${SHOTS}/stats-desktop-30d.png` });
    console.log('desktop 30d shot done');
    await page.close();

    // ── mobile: open drawer → Estadísticas ──
    page = await newPage(browser, sessB, { width: 390, height: 844 });
    await page.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6500);
    await page.getByRole('button', { name: 'Menú', exact: true }).first().click({ timeout: 10000 });
    await page.waitForTimeout(900);
    // click the VISIBLE "Estadísticas" (the drawer copy; the desktop sidebar copy
    // is in the DOM but hidden on mobile, so .first() would hit the hidden one)
    const items = page.getByText('Estadísticas', { exact: true });
    const n = await items.count();
    let clicked = false;
    for (let i = 0; i < n; i++) { const el = items.nth(i); if (await el.isVisible().catch(() => false)) { await el.click(); clicked = true; break; } }
    if (!clicked) return fail('mobile: no visible "Estadísticas" in drawer');
    await page.waitForTimeout(4000);
    body = await page.evaluate(() => document.body.innerText);
    if (!body.includes('Interacciones totales')) return fail('mobile: hero missing');
    await page.screenshot({ path: `${SHOTS}/stats-mobile-7d.png`, fullPage: true });
    console.log('mobile 7d shot done');

    console.log('ALL OK');
    await browser.close();
  } catch (e) {
    await fail('exception: ' + String(e).slice(0, 400));
  }
})();
