// Delivery-radius gate (migration 0076): the cart blocks checkout when the
// chosen delivery address is outside the business's radius.
// PRECONDITION: El Sabor must have a delivery radius set (dashboard → Entregas
// y envíos → Ajustes → "Radio de entrega"), any value between 2 and 100 mi —
// the assertions use a@a.com's real addresses: "casa" (Hazleton, ~1.4 mi → in
// range) and "tia" (NYC, ~104 mi → out of range). With NO radius set the gate
// fails open by design and this test will fail its step 2.
//  1) casa → no warning, Pagar enabled.
//  2) tia → warning card (real distance vs radius), Pagar disabled.
//  3) back to casa clears it; tia + Recoger also clears it.
//  4) Negocio (b@b.com): Ajustes shows "Radio de entrega" with the stored value.
// Usage: SESSION_A=<a@a> SESSION_B=<b@b> SHOTS_DIR=<dir> node delivery-range.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const sessA = JSON.parse(fs.readFileSync(process.env.SESSION_A, 'utf8'));
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
async function newPage(browser, session, viewport = { width: 402, height: 852 }) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', () => {});
  await page.route('**://*.supabase.co/**', async (route) => { const { status, body } = await curlRelay(route.request()); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.addInitScript(([s]) => {
    localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s));
    localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null }));
  }, [session]);
  return page;
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await newPage(browser, sessA);
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/dr-FAIL.png`, fullPage: true }).catch(() => {}); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  try {
    await page.goto(`${BASE}/negocios/`, { waitUntil: 'domcontentloaded' });
    const bizCard = page.getByText('El Sabor de Quisqueya').first();
    for (let i = 0; i < 20; i++) { await page.waitForTimeout(1000); if (await bizCard.isVisible().catch(() => false)) break; }
    await bizCard.click();
    await page.waitForTimeout(4000);
    await page.getByRole('button', { name: /^Menú$/ }).first().click({ timeout: 15000 });
    await page.waitForTimeout(1800);

    // add a simple item ≥ min ($12): Mangú $11.99 + Aguacate $2 = $13.99
    const card = page.getByRole('button').filter({ hasText: 'Mangú con los tres golpes' }).first();
    await card.scrollIntoViewIfNeeded();
    await card.locator('[aria-label="Agregar"]').click();
    await page.waitForTimeout(900);
    await page.getByRole('button', { name: /^Aguacate/ }).last().click({ timeout: 8000 });
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /^Agregar \d+/ }).last().click({ timeout: 8000 });
    await page.waitForTimeout(900);
    await page.getByRole('button').filter({ hasText: 'Ver carrito' }).first().click({ timeout: 8000 });
    await page.waitForTimeout(1200);

    // 1) in range with "casa"? ensure casa is chosen (pick it explicitly)
    await page.getByRole('button').filter({ hasText: /casa|Entregar en|Elige tu dirección/ }).last().click({ timeout: 8000 });
    await page.waitForTimeout(600);
    await page.getByRole('button').filter({ hasText: '762 Mcnair St' }).last().click({ timeout: 8000 });
    await page.waitForTimeout(1200); // let the RPC resolve
    const warnIn = await page.getByText('fuera del rango', { exact: false }).first().isVisible().catch(() => false);
    const payBtn = page.getByRole('button', { name: /Pagar ·|Fuera del rango/ }).last();
    const payLabelIn = (await payBtn.innerText().catch(() => '')).trim();
    const payDisabledIn = await payBtn.isDisabled().catch(() => null);
    console.log('1) casa (in range) → warning:', warnIn, '| Pagar:', JSON.stringify(payLabelIn), '| disabled:', payDisabledIn);
    if (warnIn || payDisabledIn) return fail('in-range address is blocked');
    await page.screenshot({ path: `${SHOTS}/dr-1-in-range.png` });

    // 2) out of range with "tia" (NYC)
    await page.getByRole('button').filter({ hasText: 'casa' }).last().click({ timeout: 8000 });
    await page.waitForTimeout(600);
    await page.getByRole('button').filter({ hasText: '180 Broadway' }).last().click({ timeout: 8000 });
    await page.waitForTimeout(1500); // RPC
    const warnOut = await page.getByText('fuera del rango de entrega', { exact: false }).first().isVisible().catch(() => false);
    const payBtn2 = page.getByRole('button', { name: /Pagar ·|Fuera del rango/ }).last();
    const payLabelOut = (await payBtn2.innerText().catch(() => '')).trim();
    const payDisabledOut = await payBtn2.isDisabled().catch(() => null);
    const distShown = await page.getByText(/mi de|está a .*mi|entrega hasta/i).first().isVisible().catch(() => false);
    console.log('2) tia NYC (out) → warning:', warnOut, '| dist text:', distShown, '| Pagar:', JSON.stringify(payLabelOut), '| disabled:', payDisabledOut);
    if (!warnOut) return fail('out-of-range warning did not appear');
    if (!payDisabledOut) return fail('Pagar still enabled while out of range');
    await page.screenshot({ path: `${SHOTS}/dr-2-out-of-range.png` });

    // 3a) back to casa → clears
    await page.getByRole('button').filter({ hasText: 'tia' }).last().click({ timeout: 8000 });
    await page.waitForTimeout(600);
    await page.getByRole('button').filter({ hasText: '762 Mcnair St' }).last().click({ timeout: 8000 });
    await page.waitForTimeout(1500);
    const warnBack = await page.getByText('fuera del rango', { exact: false }).first().isVisible().catch(() => false);
    const payDisabledBack = await page.getByRole('button', { name: /Pagar ·/ }).last().isDisabled().catch(() => null);
    console.log('3a) back to casa → warning:', warnBack, '| disabled:', payDisabledBack);
    if (warnBack || payDisabledBack) return fail('switching back to casa did not clear the block');

    // 3b) out again, then Recoger re-enables
    await page.getByRole('button').filter({ hasText: 'casa' }).last().click({ timeout: 8000 });
    await page.waitForTimeout(600);
    await page.getByRole('button').filter({ hasText: '180 Broadway' }).last().click({ timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.getByRole('button').filter({ hasText: 'Recoger' }).last().click({ timeout: 8000 });
    await page.waitForTimeout(800);
    const warnPickup = await page.getByText('fuera del rango', { exact: false }).first().isVisible().catch(() => false);
    const payPickup = await page.getByRole('button', { name: /Pagar ·/ }).last().isDisabled().catch(() => null);
    console.log('3b) tia + Recoger → warning:', warnPickup, '| disabled:', payPickup);
    if (warnPickup || payPickup) return fail('Recoger did not lift the out-of-range block');
    await page.screenshot({ path: `${SHOTS}/dr-3-pickup-ok.png` });
    await page.close();

    // 4) owner side: Entregas y envíos → Ajustes shows the DERIVED delivery reach
    // ("Alcance de entrega") — the radius now comes from the zones, not a manual
    // field (see delivery-config.js for the full owner-config test).
    const owner = await newPage(browser, sessB, { width: 1440, height: 900 });
    await owner.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
    await owner.waitForTimeout(5000);
    await owner.getByText('Entregas y envíos', { exact: false }).first().click({ timeout: 15000 });
    await owner.waitForTimeout(1500);
    // the module's sub-tab chips render AFTER the sidebar in the DOM -> .last()
    await owner.getByRole('button', { name: 'Ajustes', exact: true }).last().click({ timeout: 8000 });
    await owner.waitForTimeout(1000);
    const reachRow = await owner.getByText('Alcance de entrega', { exact: false }).first().isVisible().catch(() => false);
    console.log('4) owner Ajustes → "Alcance de entrega" row:', reachRow);
    if (!reachRow) { await owner.screenshot({ path: `${SHOTS}/dr-FAIL-owner.png`, fullPage: true }); console.error('FAIL: owner reach row missing'); await browser.close(); process.exit(1); }
    await owner.screenshot({ path: `${SHOTS}/dr-4-owner-settings.png` });
    await owner.close();

    console.log('ALL OK — range gate verified on both sides.');
    await browser.close();
  } catch (e) {
    await fail('exception: ' + String(e).slice(0, 300));
  }
})();
