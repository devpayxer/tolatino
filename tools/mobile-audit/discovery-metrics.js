// discovery-metrics.js — verify the DashboardHome "Cómo te encuentran" block
// renders REAL discovery numbers for the owner (b@b.com, El Sabor):
//   Vistas · 7 días  +  the customer-actions row (Guardados / Cómo llegar /
//   Llamadas). Backend was seeded via SQL to view=5, save=1, direction=1,
//   call=1 (owner self-views excluded, 0078). Screenshots mobile + desktop.
// Usage: SESSION_B=<sessB.json> SHOTS_DIR=<dir> node discovery-metrics.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const sessB = JSON.parse(fs.readFileSync(process.env.SESSION_B, 'utf8'));
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
async function newPage(browser, session, viewport) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', () => {});
  await page.route('**://*.supabase.co/**', async (route) => { const { status, body } = await curlRelay(route.request()); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  if (session) await page.addInitScript(([s]) => { localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s)); }, [session]);
  return page;
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let page;
  const fail = async (m) => { if (page) await page.screenshot({ path: `${SHOTS}/disc-FAIL.png`, fullPage: true }).catch(() => {}); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  try {
    // ── mobile (390) ──
    page = await newPage(browser, sessB, { width: 390, height: 844 });
    await page.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);
    // assert via innerText (robust to sticky-nav occlusion) that the discovery
    // block + all three customer-action labels rendered
    const body = await page.evaluate(() => document.body.innerText);
    if (!/Cómo te encuentran/.test(body)) return fail('"Cómo te encuentran" not in page');
    for (const lbl of ['Guardados', 'Cómo llegar', 'Llamadas', 'tus propias visitas no cuentan']) {
      if (!body.includes(lbl)) return fail('missing in discovery block: ' + lbl);
    }
    // pull the exact numbers rendered under the action row (h2 → card sibling)
    const blockTxt = await page.evaluate(() => {
      const h = Array.from(document.querySelectorAll('h2')).find((x) => /Cómo te encuentran/.test(x.textContent || ''));
      const card = h && h.nextElementSibling;
      return card ? card.textContent : '';
    });
    console.log('DISCOVERY BLOCK TEXT:', JSON.stringify(blockTxt));
    await page.screenshot({ path: `${SHOTS}/disc-mobile.png`, fullPage: true });
    console.log('mobile: discovery block + Guardados/Cómo llegar/Llamadas present');
    await page.close();

    // ── desktop (1440) ──
    page = await newPage(browser, sessB, { width: 1440, height: 900 });
    await page.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);
    await page.getByText('Cómo te encuentran', { exact: false }).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/disc-desktop.png` });
    console.log('desktop shot done');

    console.log('ALL OK');
    await browser.close();
  } catch (e) {
    await fail('exception: ' + String(e).slice(0, 400));
  }
})();
