// "Ordenar de nuevo" (Order again) — DoorDash/Uber Eats-style: the Menú tab's
// FIRST category chip/section, showing items the signed-in customer has
// ordered before from THIS business (matched by name against order history,
// most-recent order first, deduped, cancelled orders excluded), still on the
// current menu. Verifies: (1) a signed-in customer with real order history
// sees it first and can tap "+" straight into the normal add/customize flow;
// (2) a signed-out visitor never sees it (falls back to Populares/first cat).
// Usage: SESSION_JSON=<file> SHOTS_DIR=<dir> node reorder-section.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
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
function newPage(browser, withSession) {
  return (async () => {
    const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
    await page.route('**://*.supabase.co/**', async (route) => { const { status, body } = await curlRelay(route.request()); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
    await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
    await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
    await page.addInitScript(([s]) => {
      if (s) localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s));
      localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null }));
    }, [withSession ? session : null]);
    return page;
  })();
}
async function openMenu(page) {
  await page.goto(`${BASE}/negocios/`, { waitUntil: 'domcontentloaded' });
  const bizCard = page.getByText('El Sabor de Quisqueya').first();
  for (let i = 0; i < 20; i++) { await page.waitForTimeout(1000); if (await bizCard.isVisible().catch(() => false)) break; }
  await bizCard.click();
  await page.waitForTimeout(5000);
  await page.getByRole('button', { name: /^Menú$/ }).first().click({ timeout: 15000 });
  await page.waitForTimeout(1800);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const fail = async (page, m) => { await page.screenshot({ path: `${SHOTS}/ro-FAIL.png` }).catch(() => {}); console.error('FAIL:', m); await browser.close(); process.exit(1); };

  // 1) signed-in customer with order history sees "Ordenar de nuevo" FIRST.
  const page = await newPage(browser, true);
  await openMenu(page);
  const firstChip = (await page.locator('[data-cat]').first().innerText().catch(() => '')).trim();
  if (!/Ordenar de nuevo/.test(firstChip)) return fail(page, `expected "Ordenar de nuevo" as the first chip, got "${firstChip}" (does this test account have order history at El Sabor?)`);
  const section = page.locator('[id="menu-cat-_reorder"]');
  if (!(await section.isVisible().catch(() => false))) return fail(page, 'reorder section did not render');
  await page.screenshot({ path: `${SHOTS}/ro-1-top.png` });

  // 2) tapping "+" on a reorder card goes through the normal add/customize flow,
  // and the SAME item elsewhere on the page (Populares/its own category) reflects
  // the same cart state — reorder is just another view onto the same catalog.
  const card = section.locator('button').filter({ has: page.locator('[aria-label="Agregar"], [aria-label="Eliminar"], [aria-label="Quitar uno"]') }).first();
  const label = (await card.innerText()).split('\n')[0];
  const addBtn = card.locator('[aria-label="Agregar"]');
  if (await addBtn.isVisible().catch(() => false)) {
    await addBtn.click();
    await page.waitForTimeout(900);
    const opened = await page.getByText('Personaliza tu platillo', { exact: false }).first().isVisible().catch(() => false);
    if (opened) {
      await page.getByRole('button', { name: /^Agregar \d+/ }).last().click({ timeout: 8000 });
      await page.waitForTimeout(900);
    }
  } else {
    await card.locator('[aria-label="Quitar uno"], [aria-label="Eliminar"]').first().waitFor({ state: 'visible' }).catch(() => {});
  }
  const allCopies = page.locator('button').filter({ hasText: label });
  const n = await allCopies.count();
  const states = [];
  for (let i = 0; i < n; i++) states.push(await allCopies.nth(i).locator('[aria-label="Eliminar"], [aria-label="Quitar uno"]').isVisible().catch(() => false));
  if (states.some((s) => !s)) return fail(page, `"${label}" shows inconsistent cart state across its copies on the page: ${JSON.stringify(states)}`);
  console.log(`OK: tapping "+" on the reorder copy of "${label}" added it, and all ${n} copies on the page reflect it.`);
  await page.close();

  // 3) a signed-out visitor never sees it (falls back to Populares/first category).
  const guest = await newPage(browser, false);
  await openMenu(guest);
  const hasChip = await guest.getByRole('button', { name: /Ordenar de nuevo/ }).first().isVisible().catch(() => false);
  if (hasChip) return fail(guest, 'signed-out visitor sees "Ordenar de nuevo" (should require order history)');
  await guest.screenshot({ path: `${SHOTS}/ro-2-signed-out.png` });
  console.log('OK: signed-out visitor does not see "Ordenar de nuevo".');

  console.log('ALL OK — "Ordenar de nuevo" shows first for repeat customers and stays hidden otherwise.');
  await browser.close();
})();
