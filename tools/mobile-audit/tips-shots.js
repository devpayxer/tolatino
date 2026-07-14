// tips-shots.js — verify the owner tip-policy config (dashboard) + the resulting
// consumer cart. Owner (b@b.com): Entregas → Ajustes → Propinas card. Client
// (a@a.com): El Sabor menu → cart → tip presets from the owner's config.
// Usage: SESSION_A=<a.json> SESSION_B=<b.json> SHOTS_DIR=<dir> node tips-shots.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const sessA = JSON.parse(fs.readFileSync(process.env.SESSION_A, 'utf8'));
const sessB = JSON.parse(fs.readFileSync(process.env.SESSION_B, 'utf8'));
function curlRelay(req) {
  return new Promise((resolve) => {
    const args = ['-s', '-o', '-', '-w', '\n%{http_code}', '-X', req.method(), '--max-time', '30'];
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
async function newPage(browser, sess, vw) {
  const page = await browser.newPage({ viewport: vw });
  page.on('pageerror', () => {});
  await page.route('**://*.supabase.co/**', async (route) => { const { status, body } = await curlRelay(route.request()); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.addInitScript(([s]) => { localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s)); }, [sess]);
  return page;
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    // ---- OWNER: config card (mobile) ----
    let page = await newPage(browser, sessB, { width: 390, height: 1600 });
    await page.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6500);
    await page.getByRole('button', { name: 'Menú', exact: true }).first().click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(700);
    const ent = page.getByText('Entregas y envíos', { exact: true });
    for (let i = 0; i < await ent.count(); i++) { const e = ent.nth(i); if (await e.isVisible().catch(() => false)) { await e.click(); break; } }
    await page.waitForTimeout(2500);
    const ajustes = page.getByText('Ajustes', { exact: true });
    for (let i = 0; i < await ajustes.count(); i++) { const e = ajustes.nth(i); if (await e.isVisible().catch(() => false)) { await e.click(); break; } }
    await page.waitForTimeout(1500);
    const propina = page.getByText('Ofrecer propina al repartidor', { exact: true }).first();
    await propina.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${SHOTS}/tips-owner.png`, fullPage: true });
    console.log('owner Propinas card visible:', await propina.isVisible().catch(() => false));
    await page.close();

    // ---- CONSUMER: cart tip presets from config (mobile) ----
    page = await newPage(browser, sessA, { width: 390, height: 900 });
    await page.goto(`${BASE}/negocios/?b=hz-sabor-quisqueya`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6500);
    const menuTab = page.getByRole('button', { name: /^Menú$/ }).first();
    if (await menuTab.isVisible().catch(() => false)) { await menuTab.click(); await page.waitForTimeout(1200); }
    const adds = page.getByRole('button', { name: 'Agregar' });
    const n = await adds.count(); let added = false;
    for (let i = 0; i < Math.min(n, 15) && !added; i++) {
      await adds.nth(i).click().catch(() => {}); await page.waitForTimeout(400);
      const sheetAdd = page.getByRole('button', { name: /Agregar \d/ }).first();
      if (await sheetAdd.isVisible().catch(() => false)) { if (await sheetAdd.isEnabled().catch(() => false)) { await sheetAdd.click(); await page.waitForTimeout(400); added = true; } else { await page.keyboard.press('Escape'); await page.waitForTimeout(250); } }
      else if (await page.getByText(/Ver carrito/).first().isVisible().catch(() => false)) added = true;
    }
    await page.locator('button:has-text("Ver carrito")').first().click({ force: true, timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(1800);
    const tipHdr = page.getByText('Propina para el repartidor', { exact: false }).first();
    const tipVisible = await tipHdr.isVisible().catch(() => false);
    if (tipVisible) await tipHdr.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/tips-cart.png`, fullPage: true });
    console.log('consumer tip section visible:', tipVisible);
    await browser.close();
  } catch (e) { console.error('exception:', String(e).slice(0, 300)); await browser.close(); process.exit(1); }
})();
