// Verify no "flash" when jumping to a FAR category: while the click-driven scroll
// animates, the highlighted chip must stay on the tapped category (not flicker
// through the ones it flies past). Samples the active chip rapidly right after the
// click and asserts it never leaves the target. Async curl relay.
// Usage: SESSION_JSON=<file> SHOTS_DIR=<dir> node spy-noflash.js
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
const activeLabel = `(() => { const a = [...document.querySelectorAll('[data-cat]')].find(c => c.className.includes('bg-primary')); return a ? a.innerText.trim().replace(/^⭐\\s*/, '') : null; })()`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/nf-FAIL.png` }); console.error('FAIL:', m); await browser.close(); process.exit(1); };
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

  const start = await page.evaluate(activeLabel);
  const lastChip = page.locator('[data-cat]').last();
  const target = (await lastChip.innerText()).trim().replace(/^⭐\s*/, '');
  if (target === start) return fail('target equals start; pick a farther category');

  // click the far (last) category, then SAMPLE the active chip through the animation
  await lastChip.click();
  const samples = [];
  for (let i = 0; i < 16; i++) { samples.push(await page.evaluate(activeLabel)); await page.waitForTimeout(55); }
  const settled = await page.evaluate(activeLabel);
  await page.screenshot({ path: `${SHOTS}/nf-settled.png` });

  const distinct = [...new Set(samples)];
  console.log('start :', start, '| target(last):', target);
  console.log('samples during jump →', JSON.stringify(distinct));
  console.log('settled →', settled);

  // intermediate categories = anything that isn't the target that appears mid-jump
  const intermediates = distinct.filter((v) => v !== target);
  if (intermediates.length) return fail('highlight FLASHED through: ' + JSON.stringify(intermediates));
  if (settled !== target) return fail(`did not settle on target: ${settled}`);
  console.log('OK — no flash: highlight stayed on the tapped category the whole jump.');
  await browser.close();
})();
