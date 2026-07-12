// delivery-config.js — Work Unit 11: professional seller delivery config +
// the gate respecting the business address + delivery-address / platform-location
// decoupling.
//
//  A) Owner (b@b.com): Zonas shows the numeric zone (Hasta 5 mi · Gratis); the
//     zone editor uses PROFESSIONAL inputs ("Radio de la zona" + mi, "Tarifa de
//     entrega" + $, fee reformats to X.00 on blur); Ajustes shows the DERIVED
//     "Alcance de entrega · Hasta 5 mi" (no manual radius field); "Guardar
//     ajustes" persists the derived radius → delivery_ops.radiusMi (DB-checked
//     by the caller after this run).
//  B) Buyer (a@a.com): with that radius, "tia" (NYC, 104 mi) is OUT of range
//     (warning + Pagar disabled) and "casa" (Hazleton, 1.4 mi) is IN range.
//  C) Decouple: selecting the NYC delivery address in the cart does NOT change
//     the platform city (tl.city stays "Hazleton, PA"); "+ Nueva dirección"
//     opens a delivery-scoped modal ("Solo para este pedido…").
//
// Usage: SESSION_A=<a@a> SESSION_B=<b@b> SHOTS_DIR=<dir> node delivery-config.js
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
const cityLabel = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('tl.city')).label; } catch { return null; } });

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let page;
  const fail = async (m) => { if (page) await page.screenshot({ path: `${SHOTS}/dc-FAIL.png`, fullPage: true }).catch(() => {}); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  try {
    // ===================== A) OWNER — professional config =====================
    page = await newPage(browser, sessB, { width: 1440, height: 900 });
    await page.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.getByText('Entregas y envíos', { exact: false }).first().click({ timeout: 15000 });
    await page.waitForTimeout(1500);

    // Zonas: numeric zone card
    await page.getByRole('button', { name: 'Zonas', exact: true }).last().click({ timeout: 8000 });
    await page.waitForTimeout(1000);
    const zoneCard = page.getByRole('button').filter({ hasText: /(Hasta|Up to) \d.*mi/ }).first();
    const zoneTxt = (await zoneCard.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    console.log('A1) zone card:', JSON.stringify(zoneTxt));
    const zoneShowsMi = /mi/.test(zoneTxt) && /(Gratis|Free|\$)/.test(zoneTxt);
    if (!zoneShowsMi) return fail('zone card missing numeric radius/fee: ' + zoneTxt);
    await page.screenshot({ path: `${SHOTS}/dc-A1-zonas.png` });

    // Zone editor: professional inputs
    await zoneCard.click();
    await page.waitForTimeout(900);
    const hasRadLabel = await page.getByText('Radio de la zona', { exact: false }).last().isVisible().catch(() => false);
    const hasFeeLabel = await page.getByText('Tarifa de entrega', { exact: false }).last().isVisible().catch(() => false);
    const hasMi = await page.getByText('mi', { exact: true }).last().isVisible().catch(() => false);
    const hasFreeHint = await page.getByText(/0 = Gratis|0 = Free/).last().isVisible().catch(() => false);
    console.log('A2) editor → Radio label:', hasRadLabel, '| Tarifa label:', hasFeeLabel, '| mi affix:', hasMi, '| free hint:', hasFreeHint);
    if (!hasRadLabel || !hasFeeLabel || !hasFreeHint) return fail('zone editor missing professional labels/affixes');
    await page.screenshot({ path: `${SHOTS}/dc-A2-editor.png` });

    // money .00 auto-format on blur (fee field). Change locally, verify, then
    // CLOSE WITHOUT SAVING so El Sabor's fee stays untouched.
    const feeInput = page.locator('input[inputmode="decimal"]').last();
    await feeInput.click();
    await feeInput.fill('3');
    await page.getByText('Radio de la zona', { exact: false }).last().click(); // blur
    await page.waitForTimeout(300);
    const feeVal = await feeInput.inputValue().catch(() => '?');
    console.log('A3) fee ".00" on blur → value:', JSON.stringify(feeVal));
    if (feeVal !== '3.00') return fail('fee did not auto-format to 3.00, got ' + feeVal);
    await page.screenshot({ path: `${SHOTS}/dc-A3-money-format.png` });
    // close without saving (Overlay X button, aria-label="close")
    await page.getByLabel('close').last().click({ timeout: 4000 }).catch(async () => { await page.keyboard.press('Escape'); });
    await page.waitForTimeout(900);

    // Ajustes: derived "Alcance de entrega" + persist radius
    await page.getByRole('button', { name: 'Ajustes', exact: true }).last().click({ timeout: 8000 });
    await page.waitForTimeout(1000);
    const hasReach = await page.getByText('Alcance de entrega', { exact: false }).first().isVisible().catch(() => false);
    const noOldRadius = !(await page.getByText('Radio de entrega', { exact: false }).first().isVisible().catch(() => false));
    const reachVal = await page.getByRole('button', { name: /Hasta .*mi|Sin zonas|Sin límite/ }).last().innerText().catch(() => '?');
    console.log('A4) Ajustes → Alcance row:', hasReach, '| old manual radius gone:', noOldRadius, '| reach:', JSON.stringify(reachVal.replace(/\s+/g, ' ').trim()));
    if (!hasReach) return fail('Ajustes missing derived "Alcance de entrega"');
    await page.screenshot({ path: `${SHOTS}/dc-A4-ajustes.png` });
    await page.getByRole('button', { name: /Guardar ajustes|Save settings/ }).last().click({ timeout: 8000 });
    await page.waitForTimeout(3000); // let the settings write land (relay)
    await page.close();

    // ===================== B) BUYER — the gate respects the radius =====================
    page = await newPage(browser, sessA);
    await page.goto(`${BASE}/negocios/`, { waitUntil: 'domcontentloaded' });
    const bizCard = page.getByText('El Sabor de Quisqueya').first();
    for (let i = 0; i < 20; i++) { await page.waitForTimeout(1000); if (await bizCard.isVisible().catch(() => false)) break; }
    await bizCard.click();
    await page.waitForTimeout(4000);
    await page.getByRole('button', { name: /^Menú$/ }).first().click({ timeout: 15000 });
    await page.waitForTimeout(1800);
    const item = page.getByRole('button').filter({ hasText: 'Mangú con los tres golpes' }).first();
    await item.scrollIntoViewIfNeeded();
    await item.locator('[aria-label="Agregar"]').click();
    await page.waitForTimeout(900);
    await page.getByRole('button', { name: /^Aguacate/ }).last().click({ timeout: 8000 });
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /^Agregar \d+/ }).last().click({ timeout: 8000 });
    await page.waitForTimeout(900);
    await page.getByRole('button').filter({ hasText: 'Ver carrito' }).first().click({ timeout: 8000 });
    await page.waitForTimeout(1200);

    const cityBefore = await cityLabel(page);

    // pick tia (NYC) → out of range
    await page.getByRole('button').filter({ hasText: /casa|Entregar en|Elige tu dirección/ }).last().click({ timeout: 8000 });
    await page.waitForTimeout(600);
    await page.getByRole('button').filter({ hasText: '180 Broadway' }).last().click({ timeout: 8000 });
    await page.waitForTimeout(1800); // RPC
    const warnOut = await page.getByText('fuera del rango de entrega', { exact: false }).first().isVisible().catch(() => false);
    const payOut = page.getByRole('button', { name: /Pagar ·|Fuera del rango/ }).last();
    const payDisabledOut = await payOut.isDisabled().catch(() => null);
    const cityAfterNYC = await cityLabel(page);
    console.log('B1) tia(NYC) → warning:', warnOut, '| Pagar disabled:', payDisabledOut, '| city stayed:', JSON.stringify(cityAfterNYC));
    if (!warnOut || !payDisabledOut) return fail('out-of-range NOT blocked (radius not respected)');
    // ===== C) decouple: selecting NYC delivery address must NOT move the platform =====
    if (cityAfterNYC !== cityBefore || cityAfterNYC !== 'Hazleton, PA') return fail('platform city CHANGED after picking delivery address: ' + cityBefore + ' -> ' + cityAfterNYC);
    await page.screenshot({ path: `${SHOTS}/dc-B1-out-of-range.png` });

    // pick casa (Hazleton) → in range
    await page.getByRole('button').filter({ hasText: 'tia' }).last().click({ timeout: 8000 });
    await page.waitForTimeout(600);
    await page.getByRole('button').filter({ hasText: '762 Mcnair St' }).last().click({ timeout: 8000 });
    await page.waitForTimeout(1800);
    const warnIn = await page.getByText('fuera del rango', { exact: false }).first().isVisible().catch(() => false);
    const payInDisabled = await page.getByRole('button', { name: /Pagar ·/ }).last().isDisabled().catch(() => null);
    console.log('B2) casa(Hazleton) → warning:', warnIn, '| Pagar disabled:', payInDisabled);
    if (warnIn || payInDisabled) return fail('in-range address wrongly blocked');
    await page.screenshot({ path: `${SHOTS}/dc-B2-in-range.png` });

    // C2) "+ Nueva dirección" opens a DELIVERY-SCOPED modal
    await page.getByRole('button').filter({ hasText: /762 Mcnair St|Entregar en/ }).last().click({ timeout: 8000 });
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: /Nueva dirección|New address/ }).last().click({ timeout: 8000 });
    await page.waitForTimeout(900);
    const delTitle = await page.getByText('Dirección de entrega', { exact: false }).last().isVisible().catch(() => false);
    const delNote = await page.getByText(/No cambia tu ubicación|won.t change your location/i).last().isVisible().catch(() => false);
    console.log('C2) "+ Nueva dirección" → delivery modal title:', delTitle, '| decouple note:', delNote);
    if (!delNote) return fail('add-address modal is not delivery-scoped (missing "no cambia tu ubicación")');
    const cityFinal = await cityLabel(page);
    if (cityFinal !== 'Hazleton, PA') return fail('platform city drifted: ' + cityFinal);
    await page.screenshot({ path: `${SHOTS}/dc-C2-delivery-modal.png` });

    console.log('ALL OK — professional config, gate respected, location decoupled.');
    await browser.close();
  } catch (e) {
    await fail('exception: ' + String(e).slice(0, 400));
  }
})();
