// promo-shots.js — consumer cart applying a business promo code (BIENVENIDO10) +
// the owner's promo editor with the new "Código" field.
// Usage: SESSION_A SESSION_B SHOTS_DIR node promo-shots.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const sessA = JSON.parse(fs.readFileSync(process.env.SESSION_A, 'utf8'));
const sessB = JSON.parse(fs.readFileSync(process.env.SESSION_B, 'utf8'));
function relay(req) {
  return new Promise((resolve) => {
    const a = ['-s', '-o', '-', '-w', '\n%{http_code}', '-X', req.method(), '--max-time', '30'];
    const h = req.headers();
    for (const k of ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info', 'range']) if (h[k]) a.push('-H', `${k}: ${h[k]}`);
    const b = req.postData(); if (b != null) a.push('--data-binary', b);
    a.push(req.url());
    execFile('curl', a, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }, (e, o) => { o = o || ''; const nl = o.lastIndexOf('\n'); resolve({ status: parseInt(o.slice(nl + 1), 10) || 500, body: o.slice(0, nl) }); });
  });
}
async function mk(browser, sess, vw) {
  const p = await browser.newPage({ viewport: vw });
  p.on('pageerror', () => {});
  await p.route('**://*.supabase.co/**', async (ro) => { const { status, body } = await relay(ro.request()); await ro.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await p.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await p.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await p.addInitScript(([s]) => { localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s)); }, [sess]);
  return p;
}
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    // CONSUMER cart + promo
    let p = await mk(br, sessA, { width: 390, height: 900 });
    await p.goto(`${BASE}/negocios/?b=hz-sabor-quisqueya`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(6500);
    const mt = p.getByRole('button', { name: /^Menú$/ }).first();
    if (await mt.isVisible().catch(() => false)) { await mt.click(); await p.waitForTimeout(1200); }
    // add ~3 items to exceed the $15 promo minimum
    const adds = p.getByRole('button', { name: 'Agregar' });
    const n = await adds.count(); let count = 0;
    for (let i = 0; i < Math.min(n, 20) && count < 3; i++) {
      await adds.nth(i).click().catch(() => {}); await p.waitForTimeout(350);
      const sa = p.getByRole('button', { name: /Agregar \d/ }).first();
      if (await sa.isVisible().catch(() => false)) { if (await sa.isEnabled().catch(() => false)) { await sa.click(); await p.waitForTimeout(350); count++; } else { await p.keyboard.press('Escape'); await p.waitForTimeout(200); } }
      else if (await p.getByText(/Ver carrito/).first().isVisible().catch(() => false)) count++;
    }
    await p.locator('button:has-text("Ver carrito")').first().click({ force: true, timeout: 6000 }).catch(() => {});
    await p.waitForTimeout(1500);
    // switch to Recoger so no address gate blocks the view
    const rec = p.getByText(/^Recoger$/).first();
    if (await rec.isVisible().catch(() => false)) { await rec.click(); await p.waitForTimeout(500); }
    const promoInput = p.getByPlaceholder(/Código de promoción/).first();
    await promoInput.scrollIntoViewIfNeeded().catch(() => {});
    await promoInput.fill('BIENVENIDO10').catch(() => {});
    await p.getByRole('button', { name: /^Aplicar$/ }).first().click().catch(() => {});
    await p.waitForTimeout(2500);
    await promoInput.scrollIntoViewIfNeeded().catch(() => {});
    await p.getByText(/Descuento/).first().scrollIntoViewIfNeeded().catch(() => {});
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${SHOTS}/promo-cart.png` });
    console.log('cart discount visible:', await p.getByText(/Descuento/).first().isVisible().catch(() => false));
    await p.close();

    // OWNER promo editor — Menú → Promociones → new percent promo → código field
    p = await mk(br, sessB, { width: 390, height: 1000 });
    await p.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(6500);
    await p.getByRole('button', { name: 'Menú', exact: true }).first().click({ timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(700);
    const foodLink = p.getByText('Menú de comida', { exact: true });
    for (let i = 0; i < await foodLink.count(); i++) { const e = foodLink.nth(i); if (await e.isVisible().catch(() => false)) { await e.click(); break; } }
    await p.waitForTimeout(2500);
    const promosTab = p.getByText('Promociones', { exact: true });
    for (let i = 0; i < await promosTab.count(); i++) { const e = promosTab.nth(i); if (await e.isVisible().catch(() => false)) { await e.click(); break; } }
    await p.waitForTimeout(1200);
    // open the % descuento create tile (or an existing promo)
    const pct = p.getByText(/% descuento/).first();
    if (await pct.isVisible().catch(() => false)) { await pct.click(); await p.waitForTimeout(1000); }
    const codeField = p.getByPlaceholder(/BIENVENIDO10|WELCOME10/).first();
    const codeVisible = await codeField.isVisible().catch(() => false);
    await p.screenshot({ path: `${SHOTS}/promo-owner.png` });
    console.log('owner código field visible:', codeVisible);
    await br.close();
  } catch (e) { console.error('exception:', String(e).slice(0, 300)); await br.close(); process.exit(1); }
})();
