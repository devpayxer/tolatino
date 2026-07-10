// Verify the site-wide modal scroll-lock: with the item sheet ("Personaliza tu
// platillo") open, the background page must NOT scroll; on close, the scroll
// position is restored. Supabase relayed via curl (async, non-blocking).
// Usage: SESSION_JSON=<file> SHOTS_DIR=<dir> node scroll-lock.js
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
const bodyState = `(() => ({ pos: document.body.style.position, top: document.body.style.top, y: Math.round(window.scrollY), docTop: Math.round(document.scrollingElement.scrollTop) }))()`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/sl-FAIL.png` }); console.error('FAIL:', m); await browser.close(); process.exit(1); };
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

  // scroll the menu down so there's a position to preserve
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(500);
  const before = await page.evaluate(bodyState);

  // open the item sheet (tap the dish title → openItem)
  await page.getByText('Mangú con los tres golpes').first().click();
  for (let i = 0; i < 8; i++) { await page.waitForTimeout(700); if (await page.getByText('Personaliza tu platillo').first().isVisible().catch(() => false)) break; }
  if (!(await page.getByText('Personaliza tu platillo').first().isVisible().catch(() => false))) return fail('item sheet did not open');
  const openState = await page.evaluate(bodyState);

  // try hard to scroll the background while the sheet is open
  await page.evaluate(() => { window.scrollTo(0, 2000); document.scrollingElement.scrollTop = 2000; });
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(500);
  const afterScrollAttempt = await page.evaluate(bodyState);
  await page.screenshot({ path: `${SHOTS}/sl-open-locked.png` });

  // close the sheet (X button in the overlay title)
  await page.getByRole('button', { name: /Cerrar|Close/ }).first().click().catch(async () => {
    await page.mouse.click(20, 20); // fallback: click the backdrop corner
  });
  await page.waitForTimeout(900);
  const after = await page.evaluate(bodyState);

  console.log('before open :', JSON.stringify(before));
  console.log('while open  :', JSON.stringify(openState));
  console.log('scroll try  :', JSON.stringify(afterScrollAttempt));
  console.log('after close :', JSON.stringify(after));

  // the lock captures the scroll position at engage time (Playwright auto-scrolls
  // to click the dish, so it's the position when the sheet opened — not 800).
  const lockedY = Math.abs(parseInt(openState.top, 10)) || 0;
  if (openState.pos !== 'fixed') return fail('background not locked (body.position != fixed while open)');
  if (afterScrollAttempt.docTop > 20) return fail('background scrolled while sheet open: docTop=' + afterScrollAttempt.docTop);
  if (afterScrollAttempt.pos !== 'fixed' || afterScrollAttempt.top !== openState.top) return fail('lock offset drifted during scroll attempt');
  if (after.pos === 'fixed') return fail('body still fixed after close (lock not released)');
  if (Math.abs(after.y - lockedY) > 5) return fail(`scroll not restored on close: expected ~${lockedY}, got ${after.y}`);
  console.log(`OK — background stays put while the sheet is open (docTop 0) and the page is restored to y≈${lockedY} on close.`);
  await browser.close();
})();
