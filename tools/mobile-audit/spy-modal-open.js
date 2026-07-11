// Regression test: opening a product's customize sheet must NOT move the
// category rail's active chip. Root cause (fixed): useScrollLock pinned <body>
// via a plain useEffect (a frame after commit), and in that gap the browser's
// own scroll anchoring could nudge window.scrollY before engage() captured it —
// once pinned, the collapsed document height then fooled the scroll-spy's
// near-bottom clamp into forcing the LAST category active. Fixed by (1) engaging
// the lock in a useLayoutEffect (pre-paint, no gap for drift) and (2) freezing
// the spy outright while body is position:fixed. Scroll to a MIDDLE category
// (not first/last), open a product from it, and assert the rail didn't move.
// Usage: SESSION_JSON=<file> SHOTS_DIR=<dir> node repro-jump.js
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
const probe = `(() => {
  const chips = [...document.querySelectorAll('[data-cat]')];
  const active = chips.find(c => c.className.includes('bg-primary'));
  return {
    active: active ? active.innerText.trim() : null,
    y: Math.round(window.scrollY),
    bodyPos: getComputedStyle(document.body).position,
    docScrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  };
})()`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/rj-FAIL.png` }).catch(() => {}); console.error('FAIL:', m); await browser.close(); process.exit(1); };
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

  // scroll to a MIDDLE category (not first, not last)
  await page.evaluate(() => window.scrollTo(0, 2400));
  await page.waitForTimeout(900);
  const before = await page.evaluate(probe);
  await page.screenshot({ path: `${SHOTS}/rj-1-before.png` });

  // tap a product card from WITHIN the currently-active category's own section —
  // anything looser (e.g. "first card visible in the viewport") can pick a card
  // from a neighboring section poking in at the very top/bottom edge, or (worse)
  // the first matching card anywhere in the DOM (inside "Populares", above every
  // category) — scrollIntoViewIfNeeded()/click() would then legitimately move
  // the page there, which isn't a bug, just a mistargeted test.
  const activeKey = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('[data-cat]')];
    const active = chips.find((c) => c.className.includes('bg-primary'));
    return active ? active.getAttribute('data-cat') : null;
  });
  if (!activeKey) return fail('could not read the active category key');
  const section = page.locator(`[id="menu-cat-${activeKey}"]`);
  // No scrollIntoViewIfNeeded() here on purpose: a real tap never programmatically
  // scrolls the page first — the user already scrolled themselves to see the card
  // they're tapping. Adding it would scroll the section boundary near the sticky
  // line and misattribute activeCat to the neighboring category — a test artifact,
  // not the bug being repro'd.
  // ...AND currently on screen: "platos" being active just means its section
  // header crossed the sticky line — the section's very first card can still be
  // scrolled above the viewport (already passed), which isn't what a real tap
  // targets either.
  const cardsInSection = section.locator('button').filter({ has: page.locator('[aria-label="Agregar"], [aria-label="Eliminar"], [aria-label="Quitar uno"]') });
  const inSectionCount = await cardsInSection.count();
  let card = null;
  // Stay well clear of the sticky header+tabs+rail stack (roughly the top ~250px)
  // so the pick isn't visually obstructed by it — a real tap can't land there either.
  for (let i = 0; i < inSectionCount; i++) {
    const box = await cardsInSection.nth(i).boundingBox();
    if (box && box.y >= 260 && box.y + box.height <= 800) { card = cardsInSection.nth(i); break; }
  }
  if (!card) return fail('no on-screen card found in the active section');
  // force:true skips Playwright's own pre-click scrollIntoViewIfNeeded step — a
  // real finger tap never programmatically scrolls first, so this matches actual
  // user behavior (the card is already fully on screen, confirmed above).
  await card.click({ force: true });
  await page.waitForTimeout(900);
  const opened = await page.getByText('Personaliza tu platillo', { exact: false }).first().isVisible().catch(() => false);
  if (!opened) return fail('item sheet did not open');
  const during = await page.evaluate(probe);
  console.log('BEFORE:', JSON.stringify(before));
  console.log('DURING (sheet open):', JSON.stringify(during));
  await page.screenshot({ path: `${SHOTS}/rj-2-during.png` });
  if (during.active !== before.active) return fail(`active chip moved from "${before.active}" to "${during.active}" just from opening the sheet`);

  // close it, check after
  await page.getByRole('button', { name: /^Cerrar$|close/i }).first().click().catch(async () => { await page.keyboard.press('Escape').catch(() => {}); });
  await page.waitForTimeout(900);
  const after = await page.evaluate(probe);
  console.log('AFTER closing:', JSON.stringify(after));
  await page.screenshot({ path: `${SHOTS}/rj-3-after.png` });
  if (after.active !== before.active) return fail(`active chip did not settle back to "${before.active}" after closing (got "${after.active}")`);

  console.log(`OK — the rail stayed on "${before.active}" through opening and closing the item sheet.`);
  await browser.close();
})();
