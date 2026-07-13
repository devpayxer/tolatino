// modules-activator.js — screenshot the redesigned "Vender en To'Latino" activator
// (ModulesSetup) in DEMO mode (Verified; toggles are local-only, no DB writes).
// Shows two states: (A) as the owner would first see it, and (B) the "primer día"
// state with nothing activated (recommended channel highlighted).
// Usage: SHOTS_DIR=<dir> node modules-activator.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
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
  return page;
}
async function gotoModules(page, mobile) {
  await page.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  if (mobile) {
    await page.getByRole('button', { name: 'Menú', exact: true }).first().click({ timeout: 10000 });
    await page.waitForTimeout(700);
  }
  // click the visible "Configurar módulos"
  const items = page.getByText('Configurar módulos', { exact: true });
  const n = await items.count();
  for (let i = 0; i < n; i++) { const el = items.nth(i); if (await el.isVisible().catch(() => false)) { await el.click(); break; } }
  await page.waitForTimeout(1500);
}
async function turnOffSell(page) {
  for (const lbl of ['Menú de comida', 'Productos', 'Servicios', 'Renta', 'Eventos y boletos']) {
    const sw = page.getByRole('switch', { name: lbl }).last();
    if (await sw.isVisible().catch(() => false)) {
      const checked = await sw.getAttribute('aria-checked').catch(() => 'false');
      if (checked === 'true') { await sw.click(); await page.waitForTimeout(200); }
    }
  }
  await page.waitForTimeout(500);
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const fail = async (m) => { console.error('FAIL:', m); await browser.close(); process.exit(1); };
  try {
    // desktop — default (as first seen) then the "primer día / nada activo" state
    let page = await newPage(browser, { width: 1440, height: 1200 });
    await gotoModules(page, false);
    const body = await page.evaluate(() => document.body.innerText);
    if (!/Activa lo que quieras vender/.test(body)) return fail('activator intro not found');
    await page.screenshot({ path: `${SHOTS}/mods-desktop-default.png` });
    await turnOffSell(page);
    await page.screenshot({ path: `${SHOTS}/mods-desktop-firstday.png` });
    console.log('desktop: default + first-day shots done');
    await page.close();

    // mobile — the "primer día" state
    page = await newPage(browser, { width: 390, height: 844 });
    await gotoModules(page, true);
    await turnOffSell(page);
    await page.screenshot({ path: `${SHOTS}/mods-mobile-firstday.png`, fullPage: true });
    console.log('mobile: first-day shot done');

    console.log('ALL OK');
    await browser.close();
  } catch (e) {
    await fail('exception: ' + String(e).slice(0, 400));
  }
})();
