// Verify the product-card add-to-cart stepper on El Sabor's Menú tab:
//  · no "Pedir" button anywhere
//  · qty 0 → "+"; first add → [🗑] 1 [+] (trash on the left)
//  · +  → [−] 2 [+] (minus replaces trash)
//  · −  → back to [🗑] 1 [+]
//  · 🗑 → item removed → back to "+"
// Driven by the aria-labels the card sets (Eliminar @1, Quitar uno @≥2, Agregar/
// Agregar uno). Supabase relayed via curl (sandbox proxy).
// Usage: SESSION_JSON=<file> SHOTS_DIR=<dir> node menu-stepper.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const DISH = 'Mangú con los tres golpes';
const session = JSON.parse(fs.readFileSync(process.env.SESSION_JSON, 'utf8'));
// ASYNC relay (execFile, not …Sync) so the Node event loop stays responsive and
// Playwright's CDP isn't starved while background requests are in flight.
function curlRelay(req) {
  return new Promise((resolve) => {
    const args = ['-s', '-o', '-', '-w', '\n%{http_code}', '-X', req.method(), '--max-time', '25'];
    const h = req.headers();
    for (const k of ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info', 'range']) if (h[k]) args.push('-H', `${k}: ${h[k]}`);
    const body = req.postData(); if (body != null) args.push('--data-binary', body);
    args.push(req.url());
    execFile('curl', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }, (err, stdout) => {
      const out = stdout || '';
      if (err && !out) return resolve({ status: 502, body: String(err).slice(0, 200) });
      const nl = out.lastIndexOf('\n');
      resolve({ status: parseInt(out.slice(nl + 1), 10) || 500, body: out.slice(0, nl) });
    });
  });
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/st-FAIL.png` }); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  await page.route('**://*.supabase.co/**', async (route) => { const { status, body } = await curlRelay(route.request()); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.addInitScript(([s]) => {
    localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s));
    localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null }));
  }, [session]);

  await page.goto(`${BASE}/negocios/`, { waitUntil: 'domcontentloaded' });
  const bizCard = page.getByText('El Sabor de Quisqueya').first();
  for (let i = 0; i < 20; i++) { await page.waitForTimeout(1200); if (await bizCard.isVisible().catch(() => false)) break; }
  await bizCard.click();
  await page.waitForTimeout(6000); // fixed settle (blocking curl relay starves polling)
  await page.getByRole('button', { name: /^Menú$/ }).first().click({ timeout: 15000 });
  await page.waitForTimeout(1800);

  // no "Pedir" anywhere on the menu
  if ((await page.getByText('Pedir', { exact: true }).count()) > 0) return fail('"Pedir" button still present');

  const card = page.getByRole('button').filter({ hasText: DISH }).first();
  if (!(await card.isVisible().catch(() => false))) return fail(`dish card "${DISH}" not found`);
  await card.scrollIntoViewIfNeeded();
  const has = async (label) => (await card.locator(`[aria-label="${label}"]`).count()) > 0;

  if (!(await has('Agregar'))) return fail('qty0: "+" (Agregar) not on card');
  await page.screenshot({ path: `${SHOTS}/st-1-plus.png` });

  // first add (may open the customize sheet)
  await card.locator('[aria-label="Agregar"]').click();
  await page.waitForTimeout(900);
  const sheetAdd = page.getByRole('button', { name: /Agregar \d+ ·/ });
  if (await sheetAdd.first().isVisible().catch(() => false)) { await sheetAdd.first().click(); await page.waitForTimeout(900); }

  if (!(await has('Eliminar'))) return fail('qty1: trash (Eliminar) not shown after first add');
  if (!(await has('Agregar uno'))) return fail('qty1: plus (Agregar uno) not shown');
  if (await has('Quitar uno')) return fail('qty1: minus should NOT show at qty 1');
  await page.screenshot({ path: `${SHOTS}/st-2-qty1-trash.png` });

  // + → qty 2 → minus replaces trash
  await card.locator('[aria-label="Agregar uno"]').click();
  await page.waitForTimeout(700);
  if (!(await has('Quitar uno'))) return fail('qty2: minus (Quitar uno) not shown');
  if (await has('Eliminar')) return fail('qty2: trash should be gone at qty 2');
  await page.screenshot({ path: `${SHOTS}/st-3-qty2-minus.png` });

  // − → back to qty 1 (trash)
  await card.locator('[aria-label="Quitar uno"]').click();
  await page.waitForTimeout(700);
  if (!(await has('Eliminar'))) return fail('back to qty1: trash not restored');

  // 🗑 → removed → back to "+"
  await card.locator('[aria-label="Eliminar"]').click();
  await page.waitForTimeout(700);
  if (!(await has('Agregar'))) return fail('after remove: "+" not restored');
  if (await has('Eliminar')) return fail('after remove: stepper still present');

  console.log('OK — stepper flow verified: + → [trash]1[+] → [−]2[+] → [trash]1[+] → removed → +. No "Pedir".');
  await browser.close();
})();
