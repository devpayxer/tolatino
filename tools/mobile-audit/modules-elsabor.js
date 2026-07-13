// modules-elsabor.js — confirm the default-off change did NOT break El Sabor:
// its stored modules ({menu:true}) keep the Menú live (sidebar + activator ON),
// while everything else is off. Owner session (b@b.com).
// Usage: SESSION_B=<sessB.json> SHOTS_DIR=<dir> node modules-elsabor.js
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
  const fail = async (m, page) => { if (page) await page.screenshot({ path: `${SHOTS}/elsabor-FAIL.png`, fullPage: true }).catch(() => {}); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  try {
    const page = await newPage(browser, sessB, { width: 1440, height: 1000 });
    await page.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6500);
    const body = await page.evaluate(() => document.body.innerText);
    // El Sabor sells food → the sidebar must still list "Menú de comida" (menu on),
    // NOT collapse to "Activar ventas".
    if (!body.includes('Menú de comida')) return fail('El Sabor lost its Menú module!', page);
    if (body.includes('Activar ventas')) return fail('El Sabor shows "Activar ventas" — menu got turned off!', page);
    console.log('El Sabor sidebar keeps "Menú de comida"; no "Activar ventas". Menu preserved.');
    await page.screenshot({ path: `${SHOTS}/elsabor-panel.png` });
    // open Configurar módulos → Menú should be ON, others off
    const items = page.getByText('Configurar módulos', { exact: true });
    const n = await items.count();
    for (let i = 0; i < n; i++) { const el = items.nth(i); if (await el.isVisible().catch(() => false)) { await el.click(); break; } }
    await page.waitForTimeout(1500);
    const menuSwitch = page.getByRole('switch', { name: 'Menú de comida' }).last();
    const menuOn = await menuSwitch.getAttribute('aria-checked').catch(() => null);
    const prodSwitch = page.getByRole('switch', { name: 'Productos' }).last();
    const prodOn = await prodSwitch.getAttribute('aria-checked').catch(() => null);
    console.log(`activator: Menú aria-checked=${menuOn} (expect true), Productos aria-checked=${prodOn} (expect false)`);
    if (menuOn !== 'true') return fail('Menú toggle not ON in activator', page);
    if (prodOn !== 'false') return fail('Productos toggle not OFF in activator', page);
    await page.screenshot({ path: `${SHOTS}/elsabor-modules.png` });
    console.log('ALL OK');
    await browser.close();
  } catch (e) {
    await fail('exception: ' + String(e).slice(0, 400));
  }
})();
