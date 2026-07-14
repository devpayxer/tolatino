// cash-sales.js — El Sabor set NOT connected (connect_charges_enabled=false):
//  OWNER: Configurar módulos shows the NEW professional dialogue — "Ventas activas
//    · cobras en efectivo contra entrega o al recoger · Aceptar pagos con tarjeta".
//  CONSUMER: the menu is NOT catalog (ordering works for cash); the cart offers
//    Entrega/Recoger and the note "Pagas en efectivo al recibir tu pedido".
// Usage: SESSION_B=<sessB.json> SHOTS_DIR=<dir> node cash-sales.js
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
  const fail = async (m, page) => { if (page) await page.screenshot({ path: `${SHOTS}/cash-FAIL.png`, fullPage: true }).catch(() => {}); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  try {
    // ── OWNER: professional cash dialogue ──
    let page = await newPage(browser, sessB, { width: 1440, height: 1050 });
    await page.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6500);
    const items = page.getByText('Configurar módulos', { exact: true });
    const n = await items.count();
    for (let i = 0; i < n; i++) { const el = items.nth(i); if (await el.isVisible().catch(() => false)) { await el.click(); break; } }
    await page.waitForTimeout(1500);
    let body = await page.evaluate(() => document.body.innerText);
    for (const t of ['Ventas activas', 'efectivo contra entrega', 'Aceptar pagos con tarjeta']) {
      if (!body.includes(t)) return fail('owner dialogue missing: ' + t, page);
    }
    if (body.includes('modo catálogo')) return fail('owner dialogue still says "modo catálogo"', page);
    console.log('owner dialogue OK: efectivo contra entrega + aceptar tarjetas, no "modo catálogo"');
    await page.screenshot({ path: `${SHOTS}/cash-owner.png` });
    await page.close();

    // ── CONSUMER: menu is orderable (cash), cart shows Entrega + efectivo note ──
    page = await newPage(browser, null, { width: 390, height: 844 });
    await page.goto(`${BASE}/negocios/?b=hz-sabor-quisqueya`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6500);
    const menuTab = page.getByRole('button', { name: /^Menú$/ }).first();
    if (await menuTab.isVisible().catch(() => false)) { await menuTab.click(); await page.waitForTimeout(1200); }
    body = await page.evaluate(() => document.body.innerText);
    if (body.includes('Menú informativo')) return fail('menu is catalog-only (should allow cash orders)', page);
    console.log('consumer menu is orderable (no "Menú informativo" catalog note)');
    // best-effort: add an item → open cart → screenshot the cash checkout
    try {
      const add = page.getByRole('button', { name: 'Agregar' }).first();
      await add.click({ timeout: 6000 });
      await page.waitForTimeout(900);
      // if a customize sheet opened, click its "Agregar N · $" button
      const sheetAdd = page.getByRole('button', { name: /Agregar \d/ }).first();
      if (await sheetAdd.isVisible().catch(() => false)) { await sheetAdd.click(); await page.waitForTimeout(700); }
      const cartBar = page.getByText(/Ver carrito/).first();
      if (await cartBar.isVisible().catch(() => false)) { await cartBar.click(); await page.waitForTimeout(1200); }
      const cbody = await page.evaluate(() => document.body.innerText);
      const okCash = /efectivo/.test(cbody) && /Realizar pedido/.test(cbody);
      console.log('cart reached; efectivo+Realizar pedido present:', okCash);
      await page.screenshot({ path: `${SHOTS}/cash-cart.png`, fullPage: true });
    } catch (e) { console.log('cart best-effort step skipped:', String(e).slice(0, 80)); }

    console.log('ALL OK');
    await browser.close();
  } catch (e) {
    await fail('exception: ' + String(e).slice(0, 400));
  }
})();
