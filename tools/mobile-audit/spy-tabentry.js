// Verify no highlight flash when entering the Menú tab from Overview: after
// leaving Menú on a FAR category, coming back must show the FIRST category
// highlighted immediately — never the stale one, not even for a frame. Async relay.
// Usage: SESSION_JSON=<file> SHOTS_DIR=<dir> node spy-tabentry.js
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
const activeLabel = `(() => { const a = [...document.querySelectorAll('[data-cat]')].find(c => c.className.includes('bg-primary')); return a ? a.innerText.trim() : null; })()`;
const railLeft = `(() => { const s = document.querySelector('[data-cat]')?.closest('.overflow-x-auto'); return s ? Math.round(s.scrollLeft) : -1; })()`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/te-FAIL.png` }); console.error('FAIL:', m); await browser.close(); process.exit(1); };
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

  // whichever category is genuinely first (Ordenar de nuevo / Populares / the
  // first real category — depends on this signed-in test account's own order
  // history), read dynamically rather than hardcoded.
  const expectedFirst = (await page.locator('[data-cat]').first().innerText()).trim();

  // leave Menú on a FAR category (rail scrolled, stale highlight)
  const lastChip = page.locator('[data-cat]').last();
  const stale = (await lastChip.innerText()).trim();
  await lastChip.click();
  await page.waitForTimeout(1600);
  const leftBefore = await page.evaluate(railLeft);

  // Overview → back to Menú, sampling the highlight from the very first frame
  await page.getByRole('button', { name: /^Overview$/ }).first().click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /^Menú$/ }).first().click();
  const samples = [];
  for (let i = 0; i < 14; i++) { samples.push(await page.evaluate(activeLabel)); await page.waitForTimeout(55); }
  const first = samples[samples.length - 1];
  const leftAfter = await page.evaluate(railLeft);
  await page.screenshot({ path: `${SHOTS}/te-back.png` });

  const distinct = [...new Set(samples)];
  console.log('stale (far) left on :', stale, '| rail scrollLeft there:', leftBefore);
  console.log('samples on re-entry →', JSON.stringify(distinct));
  console.log('rail scrollLeft on re-entry:', leftAfter, '| settled active:', first);

  if (distinct.includes(stale)) return fail(`stale category "${stale}" flashed on tab re-entry`);
  if (first !== expectedFirst) return fail(`re-entry active should be the first category ("${expectedFirst}"), got "${first}"`);
  if (leftAfter > 8) return fail(`rail did not snap to start on re-entry: scrollLeft=${leftAfter}`);
  console.log('OK — entering Menú snaps to the first category with no stale-highlight flash and the rail resets to the start.');
  await browser.close();
})();
