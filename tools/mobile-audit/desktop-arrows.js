// Verify the DESKTOP hover arrows on the Menú category rail: a mouse can't swipe
// the horizontal rail, so left/right arrows fade in on hover and scroll it (each
// shows only while that direction can still scroll). Desktop viewport 1280×800.
// Usage: SESSION_JSON=<file> SHOTS_DIR=<dir> node desktop-arrows.js
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
const scrollLeftOf = `(() => { const s = document.querySelector('[data-cat]')?.closest('.overflow-x-auto'); return s ? Math.round(s.scrollLeft) : -1; })()`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/da-FAIL.png` }); console.error('FAIL:', m); await browser.close(); process.exit(1); };
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

  const rightArrow = page.getByRole('button', { name: /Más categorías/ });
  if (!(await rightArrow.count())) return fail('right arrow not rendered on desktop');
  const opBefore = await rightArrow.first().evaluate((el) => getComputedStyle(el).opacity);

  // hover the rail → arrows fade in
  await page.getByText('Populares', { exact: false }).first().hover();
  await page.waitForTimeout(500);
  const opAfter = await rightArrow.first().evaluate((el) => getComputedStyle(el).opacity);
  await page.screenshot({ path: `${SHOTS}/da-1-hover.png` });

  const s0 = await page.evaluate(scrollLeftOf);
  await rightArrow.first().click();
  await page.waitForTimeout(900);
  const s1 = await page.evaluate(scrollLeftOf);
  await page.screenshot({ path: `${SHOTS}/da-2-scrolled-right.png` });

  const leftArrow = page.getByRole('button', { name: /Categorías anteriores/ });
  const leftShows = (await leftArrow.count()) > 0;
  let s2 = s1;
  if (leftShows) { await leftArrow.first().click(); await page.waitForTimeout(900); s2 = await page.evaluate(scrollLeftOf); }

  console.log('opacity before hover:', opBefore, '| after hover:', opAfter);
  console.log('scrollLeft: start', s0, '→ after right', s1, '→ after left', s2, '| left arrow shown:', leftShows);

  if (!(parseFloat(opAfter) > parseFloat(opBefore) + 0.3)) return fail(`arrow did not fade in on hover (${opBefore} → ${opAfter})`);
  if (!(s1 > s0 + 50)) return fail(`right arrow did not scroll the rail (${s0} → ${s1})`);
  if (!leftShows) return fail('left arrow did not appear after scrolling right');
  if (!(s2 < s1 - 50)) return fail(`left arrow did not scroll back (${s1} → ${s2})`);
  console.log('OK — desktop hover arrows scroll the category rail both ways.');
  await browser.close();
})();
