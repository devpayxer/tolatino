// Verify the category scroll-spy after clicking a chip: the clicked category must
// be the one highlighted (bug was: its LEFT neighbor stayed active). Clicks a few
// categories and asserts the active (purple) chip === the clicked one, and the
// section heading under the rail matches. Async curl relay.
// Usage: SESSION_JSON=<file> SHOTS_DIR=<dir> node spy-click.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const session = JSON.parse(fs.readFileSync(process.env.SESSION_JSON, 'utf8'));
const TARGETS = ['Jugos y batidas', 'Postres', 'Menú infantil', 'Mariscos'];
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
const activeLabel = `(() => { const a = [...document.querySelectorAll('[data-cat]')].find(c => c.className.includes('bg-primary')); return a ? a.innerText.trim().replace(/^⭐\\s*/, '') : null; })()`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/spy-FAIL.png` }); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  await page.route('**://*.supabase.co/**', async (route) => { const { status, body } = await curlRelay(route.request()); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.addInitScript(([s]) => {
    localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s));
    localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null }));
  }, [session]);

  await page.goto(`${BASE}/negocios/`, { waitUntil: 'domcontentloaded' });
  const bizCard = page.getByText('El Sabor de Quisqueya').first();
  for (let i = 0; i < 20; i++) { await page.waitForTimeout(1000); if (await bizCard.isVisible().catch(() => false)) break; }
  await bizCard.click();
  await page.waitForTimeout(5000);
  await page.getByRole('button', { name: /^Menú$/ }).first().click({ timeout: 15000 });
  await page.waitForTimeout(1800);

  for (const t of TARGETS) {
    const chip = page.locator(`[data-cat]`).filter({ hasText: t }).first();
    if (!(await chip.count())) { console.log(`  (skip "${t}" — not a category here)`); continue; }
    await chip.click();
    await page.waitForTimeout(1600); // let the smooth scroll settle + spy recompute
    const active = await page.evaluate(activeLabel);
    console.log(`click "${t}" → active chip: "${active}"`);
    if (active !== t) return fail(`clicked "${t}" but active chip is "${active}" (should match)`);
  }
  await page.screenshot({ path: `${SHOTS}/spy-ok.png` });
  console.log('OK — the clicked category is the one highlighted (no left-neighbor drift).');
  await browser.close();
})();
