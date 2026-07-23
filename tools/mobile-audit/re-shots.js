// re-shots.js — Bienes Raíces proof shots (mobile 402px, real prod data via curl
// relay). 1 discover · 2 detail · 3 map · 4 agent panel · 5 desktop discover.
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = '/tmp/reshots';
const REF = 'zpkaxojonufdwgahiqjh';
const sess = JSON.parse(fs.readFileSync('/tmp/sessRE.json', 'utf8'));
fs.mkdirSync(SHOTS, { recursive: true });

function curlRelay(req) {
  return new Promise((resolve) => {
    const args = ['-s', '-o', '-', '-w', '\n%{http_code}', '-X', req.method(), '--max-time', '25'];
    const h = req.headers();
    for (const k of ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info', 'range']) if (h[k]) args.push('-H', `${k}: ${h[k]}`);
    const b = req.postData(); if (b != null) args.push('--data-binary', b);
    args.push(req.url());
    execFile('curl', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }, (e, o) => { o = o || ''; if (e && !o) return resolve({ status: 502, body: '' }); const nl = o.lastIndexOf('\n'); resolve({ status: parseInt(o.slice(nl + 1), 10) || 500, body: o.slice(0, nl) }); });
  });
}
async function newPage(browser, withSess, viewport) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', () => {});
  await page.route('**://*.supabase.co/**', async (r) => { const { status, body } = await curlRelay(r.request()); await r.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.g*/**', (r) => r.abort());
  await page.route('**://js.stripe.com/**', (r) => r.abort());
  if (withSess) await page.addInitScript(([s, ref]) => localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s)), [sess, REF]);
  // Pin the app's city to Hazleton so the seeded listings are "near".
  await page.addInitScript(() => {
    localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null }));
  });
  return page;
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  try {
    // 1 · discover (mobile, guest)
    const m = await newPage(browser, false, { width: 402, height: 860 });
    await m.goto(`${BASE}/bienes-raices/`, { waitUntil: 'domcontentloaded' });
    await m.waitForTimeout(8000);
    await m.screenshot({ path: `${SHOTS}/1-discover.png` });
    console.log('[shot] 1-discover');

    // 2 · detail (deep link) — scroll to mortgage + agent card zone
    await m.goto(`${BASE}/bienes-raices/?p=hz-casa-alter-3rec`, { waitUntil: 'domcontentloaded' });
    await m.waitForTimeout(8000);
    await m.screenshot({ path: `${SHOTS}/2-detail-top.png` });
    await m.evaluate(() => window.scrollBy(0, 1200));
    await m.waitForTimeout(600);
    await m.screenshot({ path: `${SHOTS}/3-detail-mid.png` });
    console.log('[shot] 2/3-detail');

    // 4 · map view (price pins) — find the Mapa chip/button
    await m.goto(`${BASE}/bienes-raices/`, { waitUntil: 'domcontentloaded' });
    await m.waitForTimeout(7000);
    await m.getByRole('button', { name: /Mapa|Map/ }).first().click({ timeout: 5000 }).catch(() => {});
    await m.waitForTimeout(6000); // tiles load
    await m.screenshot({ path: `${SHOTS}/4-map.png` });
    console.log('[shot] 4-map');
    await m.close();

    // 5 · agent panel (owner session)
    const p = await newPage(browser, true, { width: 402, height: 860 });
    await p.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(9000);
    // rubro realestate → free/verified nav shows Propiedades; open drawer & click
    await p.locator('button[aria-label="Menú"]').first().click().catch(() => {});
    await p.waitForTimeout(700);
    const item = p.getByText(/Propiedades|Bienes Raíces/).first();
    await item.scrollIntoViewIfNeeded().catch(() => {});
    await item.click({ timeout: 5000, force: true }).catch(() => {});
    await p.waitForTimeout(4000);
    await p.screenshot({ path: `${SHOTS}/5-panel.png`, fullPage: true });
    console.log('[shot] 5-panel');
    await p.close();

    // 6 · desktop discover (responsive proof)
    const d = await newPage(browser, false, { width: 1280, height: 860 });
    await d.goto(`${BASE}/bienes-raices/`, { waitUntil: 'domcontentloaded' });
    await d.waitForTimeout(8000);
    await d.screenshot({ path: `${SHOTS}/6-desktop.png` });
    console.log('[shot] 6-desktop');
    await d.close();
  } catch (e) { console.log('ERR', String(e).slice(0, 250)); }
  finally { await browser.close(); }
})();
