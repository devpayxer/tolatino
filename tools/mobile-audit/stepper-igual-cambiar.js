// The "¿igual o cambiar?" add-another flow on BOTH steppers that gained it
// (the menu-card stepper already had it; see addon-variant-prompts.js):
//  A) Customize-sheet footer stepper: pick an addon, tap "+" → prompt;
//     "Cambiar algo" adds the current one and resets the sheet (stays open) so
//     you can build a different variant, then "Agregar" closes it.
//  B) Cart per-line stepper: on a customized line, tap "+" → prompt shown OVER
//     the cart (z-index); "Sí, igual" bumps that exact line; "Cambiar algo"
//     opens the customize sheet (above the cart) for a different variant.
// Usage: SESSION_JSON=<file> SHOTS_DIR=<dir> node stepper-igual-cambiar.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const DISH = 'Mangú con los tres golpes';
const session = JSON.parse(fs.readFileSync(process.env.SESSION_JSON, 'utf8'));
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
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/sic-FAIL.png`, fullPage: true }).catch(() => {}); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  page.on('pageerror', () => {});
  await page.route('**://*.supabase.co/**', async (route) => { const { status, body } = await curlRelay(route.request()); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.addInitScript(([s]) => {
    localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s));
    localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null }));
  }, [session]);
  try {
    await page.goto(`${BASE}/negocios/`, { waitUntil: 'domcontentloaded' });
    const bizCard = page.getByText('El Sabor de Quisqueya').first();
    for (let i = 0; i < 20; i++) { await page.waitForTimeout(1000); if (await bizCard.isVisible().catch(() => false)) break; }
    await bizCard.click();
    await page.waitForTimeout(4000);
    await page.getByRole('button', { name: /^Menú$/ }).first().click({ timeout: 15000 });
    await page.waitForTimeout(1800);
    const card = page.getByRole('button').filter({ hasText: DISH }).first();
    await card.scrollIntoViewIfNeeded();

    // ---- A) SHEET footer stepper ----
    await card.locator('[aria-label="Agregar"]').click();
    await page.waitForTimeout(900);
    if (!(await page.getByText('Personaliza tu platillo', { exact: false }).first().isVisible().catch(() => false))) return fail('sheet did not open');
    await page.getByRole('button', { name: /^Aguacate/ }).last().click({ timeout: 8000 });
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: '+', exact: true }).last().click({ timeout: 8000 }); // sheet qty "+"
    await page.waitForTimeout(600);
    if (!(await page.getByText('¿Lo deseas igual o quieres cambiar algo?', { exact: false }).first().isVisible().catch(() => false))) return fail('sheet "+" did not open the igual/cambiar prompt');
    await page.getByRole('button', { name: /Cambiar algo/ }).click({ timeout: 8000 });
    await page.waitForTimeout(700);
    if (!(await page.getByText('Personaliza tu platillo', { exact: false }).first().isVisible().catch(() => false))) return fail('sheet did not stay open after "Cambiar algo"');
    await page.getByRole('button', { name: /^Queso frito/ }).last().click({ timeout: 8000 });
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /^Agregar \d+/ }).last().click({ timeout: 8000 });
    await page.waitForTimeout(900);
    if (await page.getByText('Personaliza tu platillo', { exact: false }).first().isVisible().catch(() => false)) return fail('sheet did not close after Agregar');
    console.log('OK: A) sheet stepper — "+" prompts; "Cambiar algo" adds one and keeps the sheet open for a different variant');

    // ---- B) CART per-line stepper ----
    await page.getByRole('button').filter({ hasText: 'Ver carrito' }).first().click({ timeout: 8000 });
    await page.waitForTimeout(900);
    if (!(await page.getByText('Tu pedido', { exact: false }).first().isVisible().catch(() => false))) return fail('cart did not open');
    await page.getByRole('button', { name: '+', exact: true }).last().click({ timeout: 8000 });
    await page.waitForTimeout(600);
    if (!(await page.getByText('¿Lo deseas igual o quieres cambiar algo?', { exact: false }).first().isVisible().catch(() => false))) return fail('cart line "+" did not open the prompt');
    if (await page.getByText('Personaliza tu platillo', { exact: false }).first().isVisible().catch(() => false)) return fail('prompt opened over the sheet, not the cart');
    await page.getByRole('button', { name: /Sí, igual/ }).click({ timeout: 8000 });
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: '+', exact: true }).last().click({ timeout: 8000 });
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: /Cambiar algo/ }).click({ timeout: 8000 });
    await page.waitForTimeout(800);
    if (!(await page.getByText('Personaliza tu platillo', { exact: false }).first().isVisible().catch(() => false))) return fail('"Cambiar algo" in the cart did not open the sheet (z-index/stacking?)');
    console.log('OK: B) cart stepper — "+" prompts over the cart; "Sí, igual" bumps the line, "Cambiar algo" opens the sheet');

    await page.screenshot({ path: `${SHOTS}/sic-final.png`, fullPage: true });
    console.log('ALL OK — igual/cambiar add-another flow works on the sheet stepper AND the cart line stepper.');
    await browser.close();
  } catch (e) {
    await fail('exception: ' + String(e).slice(0, 300));
  }
})();
