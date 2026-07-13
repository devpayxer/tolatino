// search-track.js — prove the Negocios page fires track_search_appearance when
// the user searches. The RPC is intercepted and fulfilled LOCALLY (not forwarded)
// so this verifies the client wiring with ZERO database mutation.
// Usage: SHOTS_DIR=<dir> node search-track.js
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
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const captured = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', () => {});
  await page.route('**://*.supabase.co/**', async (route) => {
    const req = route.request();
    if (req.url().includes('track_search_appearance')) {
      captured.push(req.postData() || '');
      return route.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: 'null' });
    }
    const { status, body } = await curlRelay(req);
    await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body });
  });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  // point the anon user at a metro that actually has listings (Hazleton, PA area)
  await page.addInitScript(() => { localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null })); });
  try {
    await page.goto(`${BASE}/negocios/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    // count how many business cards are visible before searching
    const before = await page.evaluate(() => document.querySelectorAll('a[href*="?b="], [data-biz-card]').length);
    console.log('result-ish anchors before search:', before);
    const box = page.getByPlaceholder(/Busca tacos|Search tacos/).first();
    await box.fill('sabor');
    await box.press('Enter');
    await page.waitForTimeout(3000); // past the 800ms debounce
    if (captured.length === 0) {
      const st = await page.evaluate(() => ({ url: location.href, cards: document.querySelectorAll('a[href*="?b="]').length, txt: document.body.innerText.slice(0, 300) }));
      console.error('FAIL: no track_search_appearance fired. state:', JSON.stringify(st));
      await page.screenshot({ path: `${SHOTS}/search-track-FAIL.png`, fullPage: true });
      await browser.close(); process.exit(1);
    }
    // parse the slugs array from the last captured call
    let slugs = [];
    try { slugs = JSON.parse(captured[captured.length - 1]).in_slugs || []; } catch (e) { /* ignore */ }
    console.log(`OK — track_search_appearance fired ${captured.length}× ; last call slugs=${slugs.length}:`, slugs.slice(0, 6));
    if (slugs.length === 0) { console.error('FAIL: fired but with empty slugs'); await browser.close(); process.exit(1); }
    await page.screenshot({ path: `${SHOTS}/search-track.png` });
    console.log('ALL OK');
    await browser.close();
  } catch (e) {
    console.error('exception:', String(e).slice(0, 300)); await browser.close(); process.exit(1);
  }
})();
