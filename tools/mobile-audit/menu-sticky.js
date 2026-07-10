// Verify the DoorDash-style sticky category rail + scroll-spy on El Sabor's Menú
// tab: the rail pins under the tab bar while scrolling, and the active (purple)
// chip tracks the section in view + auto-centers. Supabase relayed via curl.
// Usage: SESSION_JSON=<file> SHOTS_DIR=<dir> node menu-sticky.js
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const session = JSON.parse(fs.readFileSync(process.env.SESSION_JSON, 'utf8'));
function curlRelay(req) {
  const args = ['-s', '-o', '-', '-w', '\n%{http_code}', '-X', req.method(), '--max-time', '25'];
  const h = req.headers();
  for (const k of ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info', 'range']) if (h[k]) args.push('-H', `${k}: ${h[k]}`);
  const body = req.postData(); if (body != null) args.push('--data-binary', body);
  args.push(req.url());
  try { const out = execFileSync('curl', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }); const nl = out.lastIndexOf('\n'); return { status: parseInt(out.slice(nl + 1), 10) || 500, body: out.slice(0, nl) }; }
  catch (e) { return { status: 502, body: String(e).slice(0, 200) }; }
}
// which rail chip is active (purple) + the rail's pinned top, live from the DOM
const probe = `(() => {
  const rail = document.querySelector('[data-cat]')?.closest('.overflow-x-auto');
  const chips = [...document.querySelectorAll('[data-cat]')];
  const active = chips.find((c) => c.className.includes('bg-primary'));
  const railTop = rail ? Math.round(rail.getBoundingClientRect().top) : null;
  return { active: active?.getAttribute('data-cat') ?? null, activeLabel: active?.innerText?.trim() ?? null, railTop, chipCount: chips.length };
})()`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/ms-FAIL.png` }); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  await page.route('**://*.supabase.co/**', async (route) => { const { status, body } = curlRelay(route.request()); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.addInitScript(([s]) => {
    localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s));
    localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null }));
  }, [session]);

  await page.goto(`${BASE}/negocios/`, { waitUntil: 'domcontentloaded' });
  const card = page.getByText('El Sabor de Quisqueya').first();
  for (let i = 0; i < 20; i++) { await page.waitForTimeout(1200); if (await card.isVisible().catch(() => false)) break; }
  await card.click();
  for (let i = 0; i < 12; i++) { await page.waitForTimeout(1000); if (await page.getByRole('button', { name: /^Menú$/ }).first().isVisible().catch(() => false)) break; }
  await page.getByRole('button', { name: /^Menú$/ }).first().click();
  await page.waitForTimeout(1800);

  const at0 = await page.evaluate(probe);
  await page.screenshot({ path: `${SHOTS}/ms-1-top.png` });

  // scroll down ~1600px (into later categories)
  await page.evaluate(() => window.scrollTo({ top: 1600, behavior: 'instant' }));
  await page.waitForTimeout(900);
  const at1 = await page.evaluate(probe);
  await page.screenshot({ path: `${SHOTS}/ms-2-scrolled.png` });

  // scroll further
  await page.evaluate(() => window.scrollTo({ top: 3200, behavior: 'instant' }));
  await page.waitForTimeout(900);
  const at2 = await page.evaluate(probe);
  await page.screenshot({ path: `${SHOTS}/ms-3-scrolled2.png` });

  // click a later chip → should jump + activate it
  const chipCount = at0.chipCount;
  await page.locator('[data-cat]').nth(Math.min(4, chipCount - 1)).click();
  await page.waitForTimeout(1200);
  const atClick = await page.evaluate(probe);
  await page.screenshot({ path: `${SHOTS}/ms-4-clicked.png` });

  console.log('top     :', JSON.stringify(at0));
  console.log('scroll1 :', JSON.stringify(at1));
  console.log('scroll2 :', JSON.stringify(at2));
  console.log('clicked :', JSON.stringify(atClick));

  // assertions
  if (at0.railTop == null) return fail('category rail not found');
  const pinned = [at1.railTop, at2.railTop, atClick.railTop].every((t) => t != null && t >= 30 && t <= 320);
  if (!pinned) return fail('rail not pinned while scrolled: ' + JSON.stringify([at1.railTop, at2.railTop, atClick.railTop]));
  const spyMoved = at1.active !== at0.active || at2.active !== at0.active;
  if (!spyMoved) return fail('scroll-spy did not change active category: ' + [at0.active, at1.active, at2.active].join(','));
  console.log('OK — rail stays pinned while scrolling and the active chip tracks the section.');
  await browser.close();
})();
