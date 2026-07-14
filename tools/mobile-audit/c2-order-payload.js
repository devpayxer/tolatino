// c2-order-payload.js — real-browser proof that the order cart sends id + sel to
// marketplace-checkout (so the server can re-price). Logged-in client (a@a.com)
// on El Sabor (payments ON): add a menu item → cart → Recoger → Pagar. Intercepts
// the marketplace-checkout call and asserts items[].id + items[].sel are present
// and the function returns 200. Usage: SESSION_A=<sess.json> SHOTS_DIR=<dir> node c2-order-payload.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const sessA = JSON.parse(fs.readFileSync(process.env.SESSION_A, 'utf8'));
let checkoutReq = null, checkoutResBody = null, checkoutStatus = null;

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
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', () => {});
  await page.route('**://*.supabase.co/**', async (route) => {
    const req = route.request();
    const isCheckout = /functions\/v1\/marketplace-checkout/.test(req.url());
    if (isCheckout) checkoutReq = req.postData();
    const { status, body } = await curlRelay(req);
    if (isCheckout) { checkoutStatus = status; checkoutResBody = body; }
    await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body });
  });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.addInitScript(([s]) => { localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s)); }, [sessA]);
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/c2-FAIL.png`, fullPage: true }).catch(() => {}); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  try {
    await page.goto(`${BASE}/negocios/?b=hz-sabor-quisqueya`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6500);
    const menuTab = page.getByRole('button', { name: /^Menú$/ }).first();
    if (await menuTab.isVisible().catch(() => false)) { await menuTab.click(); await page.waitForTimeout(1200); }
    // add one item (simple add carries id + sel:[])
    const adds = page.getByRole('button', { name: 'Agregar' });
    const n = await adds.count();
    let added = false;
    for (let i = 0; i < Math.min(n, 15) && !added; i++) {
      await adds.nth(i).click().catch(() => {});
      await page.waitForTimeout(450);
      const sheetAdd = page.getByRole('button', { name: /Agregar \d/ }).first();
      if (await sheetAdd.isVisible().catch(() => false)) {
        if (await sheetAdd.isEnabled().catch(() => false)) { await sheetAdd.click(); await page.waitForTimeout(500); added = true; }
        else { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); }
      } else if (await page.getByText(/Ver carrito/).first().isVisible().catch(() => false)) { added = true; }
    }
    if (!added) return fail('could not add item');
    await page.locator('button:has-text("Ver carrito")').first().click({ timeout: 6000, force: true });
    await page.waitForTimeout(1800);
    // switch to Recoger (pickup → no address needed)
    const recoger = page.getByText(/^Recoger$/).first();
    if (await recoger.isVisible().catch(() => false)) { await recoger.click(); await page.waitForTimeout(700); }
    await page.screenshot({ path: `${SHOTS}/c2-cart.png`, fullPage: true });
    // click Pagar
    const pagar = page.locator('button:has-text("Pagar")').first();
    if (!(await pagar.isVisible().catch(() => false))) return fail('no Pagar button (is payOnline on?)');
    await pagar.click({ force: true });
    await page.waitForTimeout(4000);

    if (!checkoutReq) return fail('marketplace-checkout was never called');
    let parsed; try { parsed = JSON.parse(checkoutReq); } catch { return fail('checkout body not JSON'); }
    const line0 = parsed?.items?.[0] ?? {};
    const hasId = typeof line0.id === 'string' && /[0-9a-f-]{36}/.test(line0.id);
    const hasSel = Array.isArray(line0.sel);
    let resJson = {}; try { resJson = JSON.parse(checkoutResBody); } catch { /* */ }
    const got200 = checkoutStatus === 200 && typeof resJson.url === 'string';
    console.log(`payload items[0]: id=${line0.id} sel=${JSON.stringify(line0.sel)}`);
    console.log(`hasId:${hasId} · hasSel:${hasSel} · funcStatus:${checkoutStatus} · returnedUrl:${!!resJson.url} (${resJson.error ?? ''})`);
    if (!hasId) return fail('order line missing id');
    if (!hasSel) return fail('order line missing sel');
    if (!got200) return fail('marketplace-checkout did not return a url');
    console.log('C2 CLIENT WIRING OK ✅');
    await browser.close();
  } catch (e) { await fail('exception: ' + String(e).slice(0, 300)); }
})();
