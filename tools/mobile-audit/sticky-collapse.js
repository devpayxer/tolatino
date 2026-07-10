// Verify the business page's sticky tab bar collapses SMOOTHLY (no "brinco"):
// as you scroll across the pin point on Overview, the compact title row grows
// scroll-linked and the content below must NOT jump down. We step the scroll
// across the pin and assert no content element jumps down between steps.
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
// measure: sticky-bar height + the viewport-top of a stable content heading
const sample = `(() => {
  const bar = [...document.querySelectorAll('div')].find(d => getComputedStyle(d).position==='sticky' && /Overview/.test(d.textContent||'') && d.querySelector('button'));
  const heads = [...document.querySelectorAll('*')].filter(e => e.children.length===0 && /^(Horario|Ubicación|Reseñas|Fotos)$/.test((e.textContent||'').trim()));
  const ref = heads.map(e => e.getBoundingClientRect().top).find(t => t > 60 && t < 820);
  return { barH: bar ? Math.round(bar.getBoundingClientRect().height) : -1, ref: ref != null ? Math.round(ref) : null, y: Math.round(window.scrollY) };
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
  await page.waitForTimeout(2500); // Overview

  // step the scroll finely across the pin region and record bar height + a content ref
  const rows = [];
  for (let y = 0; y <= 520; y += 12) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(60);
    rows.push(await page.evaluate(sample));
  }
  const barMin = Math.min(...rows.map(r => r.barH));
  const barMax = Math.max(...rows.map(r => r.barH));

  // find the biggest DOWNWARD jump of the content ref between consecutive steps
  // (content jumping down as you scroll down = the "brinco"). Only where ref is set.
  let worstJump = 0, worstAt = null;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1].ref, b = rows[i].ref;
    if (a == null || b == null) continue;
    const delta = b - a; // positive = content moved DOWN while scrolling down (bad)
    if (delta > worstJump) { worstJump = delta; worstAt = rows[i].y; }
  }
  await page.screenshot({ path: `${SHOTS}/sc-scrolled.png` });
  console.log('bar height range while scrolling:', barMin, '→', barMax, '(title grows as it pins)');
  console.log('worst downward content jump:', worstJump, 'px at scrollY', worstAt);

  if (barMax - barMin < 20) return fail('title row does not appear to collapse/expand (bar height ~constant): ' + barMin + '-' + barMax);
  if (worstJump > 22) return fail(`content JUMPED down ${worstJump}px at scrollY ${worstAt} — not smooth`);
  console.log('OK — the compact title collapses scroll-linked; content below never jumps (max downward step ' + worstJump + 'px).');
  await browser.close();
})();
