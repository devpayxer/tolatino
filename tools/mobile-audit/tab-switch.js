// Verify tab switching on the business page is a clean single-frame swap:
// Overview → Menú / Reseñas / back must NOT drift, shift, or re-layout across the
// frames after the tap (the old impl adjusted heights post-paint → visible jank).
// Samples the bar top, tabs-row top and scrollY rapidly after each switch and
// asserts everything is already settled from the FIRST sample.
// Usage: SHOTS_DIR=<dir> node tab-switch.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
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
const sample = `(() => {
  const bar = [...document.querySelectorAll('div')].find(d => getComputedStyle(d).position==='sticky' && /Overview/.test(d.textContent||'') && d.querySelector('button'));
  if (!bar) return null;
  const tabsRow = [...bar.children].at(-1);
  return { barTop: Math.round(bar.getBoundingClientRect().top), tabsTop: Math.round(tabsRow.getBoundingClientRect().top),
           barH: Math.round(bar.getBoundingClientRect().height), y: Math.round(window.scrollY) };
})()`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/ts-FAIL.png` }); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  await page.route('**://*.supabase.co/**', async (route) => { const { status, body } = await curlRelay(route.request()); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.addInitScript(() => {
    localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null }));
  });

  await page.goto(`${BASE}/negocios/`, { waitUntil: 'domcontentloaded' });
  const card = page.getByText('El Sabor de Quisqueya').first();
  for (let i = 0; i < 20; i++) { await page.waitForTimeout(1000); if (await card.isVisible().catch(() => false)) break; }
  await card.click();
  await page.waitForTimeout(2500);

  const switchAndSample = async (tabName) => {
    await page.getByRole('button', { name: new RegExp(`^${tabName}$`) }).first().click();
    const frames = [];
    for (let i = 0; i < 10; i++) { frames.push(await page.evaluate(sample)); await page.waitForTimeout(40); }
    const valid = frames.filter(Boolean);
    if (valid.length < 8) return { tabName, error: 'bar not found in samples' };
    // drift = how much any metric moves AFTER the first post-switch sample
    const first = valid[0];
    let drift = 0;
    for (const f of valid.slice(1)) {
      drift = Math.max(drift, Math.abs(f.barTop - first.barTop), Math.abs(f.tabsTop - first.tabsTop), Math.abs(f.barH - first.barH), Math.abs(f.y - first.y));
    }
    return { tabName, first, drift };
  };

  // scroll down first so switches start from a pinned state (worst case)
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(500);

  const seq = [];
  for (const t of ['Menú', 'Overview', 'Reseñas', 'Overview', 'Tienda']) {
    const r = await switchAndSample(t);
    seq.push(r);
    if (r.error) return fail(`switch to ${t}: ${r.error}`);
    console.log(`→ ${t}: settled at barTop=${r.first.barTop} tabsTop=${r.first.tabsTop} barH=${r.first.barH} y=${r.first.y} | post-switch drift=${r.drift}px`);
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: `${SHOTS}/ts-final.png` });

  const worst = Math.max(...seq.map(r => r.drift));
  if (worst > 2) return fail(`layout drifted ${worst}px across frames after a tab switch — not a clean swap`);
  console.log(`OK — every tab switch settles on the first frame (worst drift ${worst}px).`);
  await browser.close();
})();
