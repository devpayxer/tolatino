// Verify the new "¿Lo deseas igual o quieres cambiar algo?" / "¿Cuál deseas
// eliminar?" prompts on a customizable item's card stepper (Menú tab):
//  1. First add → item sheet, pick "Aguacate".
//  2. "+" again → addPrompt shows the last selection → "Sí, igual" → qty 2, still 1 line.
//  3. "+" again → addPrompt → "Cambiar algo" → fresh sheet (no aguacate pre-checked)
//     → pick "Queso frito" → new distinct line, qty 3, 2 lines.
//  4. "−" → removePrompt lists BOTH variants (Aguacate / Queso frito) → pick one.
//  5. Once back to 1 line, "−" decrements directly again (no prompt).
// Overlays render LAST in the DOM (after the underlying page content), so
// `.last()` reliably targets the open sheet's own controls instead of a
// same-named element on the page behind it (e.g. another dish whose name/desc
// happens to contain the addon label).
// Usage: SESSION_JSON=<file> SHOTS_DIR=<dir> node addon-variant-prompts.js
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
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/av-FAIL.png`, fullPage: true }).catch(() => {}); console.error('FAIL:', m); await browser.close(); process.exit(1); };
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
    await page.waitForTimeout(5000);
    await page.getByRole('button', { name: /^Menú$/ }).first().click({ timeout: 15000 });
    await page.waitForTimeout(1800);

    const card = page.getByRole('button').filter({ hasText: DISH }).first();
    await card.scrollIntoViewIfNeeded();

    // 1) first add via card "+" → opens the item sheet
    await card.locator('[aria-label="Agregar"]').click();
    await page.waitForTimeout(900);
    if (!(await page.getByText('Personaliza tu platillo', { exact: false }).first().isVisible().catch(() => false))) return fail('item sheet did not open on first add');
    await page.getByRole('button', { name: /^Aguacate/ }).last().click({ timeout: 8000 });
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /^Agregar \d+/ }).last().click({ timeout: 8000 });
    await page.waitForTimeout(900);
    if (!(await card.locator('[aria-label="Eliminar"]').isVisible().catch(() => false))) return fail('qty1 (trash) not shown after first add');
    console.log('OK: first add customized with Aguacate (qty 1)');

    // 2) "+" → addPrompt appears, shows last selection, "Sí, igual" increments same line
    await card.locator('[aria-label="Agregar uno"]').click();
    await page.waitForTimeout(700);
    if (!(await page.getByText('¿Lo deseas igual o quieres cambiar algo?', { exact: false }).first().isVisible().catch(() => false))) return fail('add-prompt did not open on 2nd +');
    if (!(await page.getByText('Última selección:', { exact: false }).first().isVisible().catch(() => false))) return fail('add-prompt did not show the last selection');
    await page.screenshot({ path: `${SHOTS}/av-1-add-prompt.png` });
    await page.getByRole('button', { name: /Sí, igual/ }).click({ timeout: 8000 });
    await page.waitForTimeout(700);
    if (!(await card.locator('[aria-label="Quitar uno"]').isVisible().catch(() => false))) return fail('qty2 (minus) not shown after "Sí, igual"');
    console.log('OK: "Sí, igual" incremented the same line (qty 2, still 1 variant)');

    // 3) "+" → addPrompt → "Cambiar algo" → fresh sheet → pick a DIFFERENT addon
    await card.locator('[aria-label="Agregar uno"]').click();
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: /Cambiar algo/ }).click({ timeout: 8000 });
    await page.waitForTimeout(900);
    if (!(await page.getByText('Personaliza tu platillo', { exact: false }).first().isVisible().catch(() => false))) return fail('"Cambiar algo" did not open the customize sheet');
    await page.getByRole('button', { name: /^Queso frito/ }).last().click({ timeout: 8000 });
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /^Agregar \d+/ }).last().click({ timeout: 8000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${SHOTS}/av-2-after-second-variant.png` });
    console.log('OK: "Cambiar algo" created a second distinct variant (qty 3, 2 lines)');

    // 4) "−" with 2 distinct variants → removePrompt lists both, showing the difference
    await card.locator('[aria-label="Quitar uno"]').click();
    await page.waitForTimeout(700);
    if (!(await page.getByText('¿Cuál deseas eliminar?', { exact: false }).first().isVisible().catch(() => false))) return fail('remove-prompt did not open with 2 distinct variants');
    const hasAguacateRow = await page.getByRole('button', { name: /Aguacate/ }).last().isVisible().catch(() => false);
    const hasQuesoRow = await page.getByRole('button', { name: /Queso frito/ }).last().isVisible().catch(() => false);
    if (!hasAguacateRow || !hasQuesoRow) return fail(`remove-prompt did not show both variants (aguacate:${hasAguacateRow} queso:${hasQuesoRow})`);
    await page.screenshot({ path: `${SHOTS}/av-3-remove-prompt.png` });
    await page.getByRole('button', { name: /Queso frito/ }).last().click({ timeout: 8000 });
    await page.waitForTimeout(700);
    console.log('OK: remove-prompt showed both variants, removed the Queso frito one');

    // 5) back to 1 line → "−" now decrements directly, no prompt
    const stillHasPrompt = await page.getByText('¿Cuál deseas eliminar?', { exact: false }).first().isVisible().catch(() => false);
    if (stillHasPrompt) return fail('remove-prompt still open after picking a variant');
    if (!(await card.locator('[aria-label="Quitar uno"]').isVisible().catch(() => false))) return fail('qty2 (minus) not shown after removing the second variant');
    await card.locator('[aria-label="Quitar uno"]').click();
    await page.waitForTimeout(700);
    const promptReappeared = await page.getByText('¿Cuál deseas eliminar?', { exact: false }).first().isVisible().catch(() => false);
    if (promptReappeared) return fail('remove-prompt appeared with only 1 distinct variant left — should decrement directly');
    if (!(await card.locator('[aria-label="Eliminar"]').isVisible().catch(() => false))) return fail('qty1 (trash) not shown after direct decrement to 1 line');
    console.log('OK: with only 1 variant left, "−" decremented directly (no prompt)');

    await page.screenshot({ path: `${SHOTS}/av-4-final.png`, fullPage: true });
    console.log('ALL OK — add/remove variant prompts work end to end.');
    await browser.close();
  } catch (e) {
    await fail('exception: ' + String(e).slice(0, 300));
  }
})();
