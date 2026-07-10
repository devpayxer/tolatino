// Verify the business page's pin transition is professionally smooth:
//  · the sticky bar's height is CONSTANT while scrolling (title space is always
//    reserved — the reveal is opacity-only), so nothing can jump;
//  · a content heading below never moves DOWN while scrolling down (no "brinco");
//  · the compact title's opacity is 0 before the pin and 1 after it;
//  · ZERO style/class mutations happen in the bar subtree during pure scrolling
//    except the single stuck-flip render (the old impl mutated height per frame —
//    that per-frame lag WAS the visible flicker on slow scroll).
// Usage: SHOTS_DIR=<dir> node sticky-collapse.js
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
const setup = `(() => {
  const bar = [...document.querySelectorAll('div')].find(d => getComputedStyle(d).position==='sticky' && /Overview/.test(d.textContent||'') && d.querySelector('button'));
  if (!bar) return 'NOBAR';
  window.__mut = 0;
  window.__mo = new MutationObserver(ms => { window.__mut += ms.length; });
  window.__mo.observe(bar, { attributes: true, attributeFilter: ['style', 'class'], subtree: true });
  window.__bar = bar;
  return 'OK';
})()`;
const sample = `(() => {
  const bar = window.__bar;
  const title = bar.querySelector('span');
  const titleRow = title ? title.parentElement : null;
  const heads = [...document.querySelectorAll('*')].filter(e => e.children.length===0 && /^(Horario|Ubicación|Reseñas|Fotos|Acerca de)$/.test((e.textContent||'').trim()));
  const ref = heads.map(e => e.getBoundingClientRect().top).find(t => t > 60 && t < 830);
  return { barH: Math.round(bar.getBoundingClientRect().height), barTop: Math.round(bar.getBoundingClientRect().top),
           op: titleRow ? +getComputedStyle(titleRow).opacity : -1,
           ref: ref != null ? Math.round(ref) : null, y: Math.round(window.scrollY), mut: window.__mut };
})()`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/sc-FAIL.png` }); console.error('FAIL:', m); await browser.close(); process.exit(1); };
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
  await page.waitForTimeout(2500); // Overview settle
  if ((await page.evaluate(setup)) !== 'OK') return fail('sticky bar not found');

  // slow scroll: small steps across the pin region
  const rows = [];
  for (let y = 0; y <= 560; y += 8) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(45);
    rows.push(await page.evaluate(sample));
  }
  const barMin = Math.min(...rows.map(r => r.barH));
  const barMax = Math.max(...rows.map(r => r.barH));
  let worstJump = 0, worstAt = null;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1].ref, b = rows[i].ref;
    if (a == null || b == null) continue;
    const d = b - a;
    if (d > worstJump) { worstJump = d; worstAt = rows[i].y; }
  }
  const opStart = rows[0].op, opEnd = rows[rows.length - 1].op;
  const mutations = rows[rows.length - 1].mut;
  const pinned = rows.filter(r => r.barTop <= 160).length > 0;
  await page.screenshot({ path: `${SHOTS}/sc-pinned.png` });

  console.log(`bar height: ${barMin}→${barMax} (must be constant) | pinned reached: ${pinned}`);
  console.log(`title opacity: start ${opStart} → end ${opEnd}`);
  console.log(`worst downward content step: ${worstJump}px at scrollY ${worstAt}`);
  console.log(`style/class mutations in bar during scroll: ${mutations}`);

  if (!pinned) return fail('never reached the pinned state — page too short?');
  if (barMax - barMin > 2) return fail(`bar height changed while scrolling (${barMin}→${barMax}) — layout not constant`);
  if (worstJump > 4) return fail(`content jumped down ${worstJump}px at scrollY ${worstAt}`);
  if (!(opStart < 0.05)) return fail('title visible before the pin (opacity ' + opStart + ')');
  if (!(opEnd > 0.95)) return fail('title not shown after the pin (opacity ' + opEnd + ')');
  if (mutations > 8) return fail(`bar mutated ${mutations} times during scroll — should only mutate at the stuck flip`);
  console.log('OK — constant-height bar, fade-only reveal, no downward jumps, no per-frame mutations.');
  await browser.close();
})();
