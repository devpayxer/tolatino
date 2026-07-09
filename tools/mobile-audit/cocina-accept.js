// Action test: as El Sabor owner (b@b.com), open order TL-3655A3 and click Aceptar
// through the REAL Cocina UI. Proves the write path (status→preparing) fires from
// the actual button. DB + client-notification assertions run separately after.
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
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/ck-accept-FAIL.png`, fullPage: true }); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  const patches = [];
  await page.route('**://*.supabase.co/**', async (route) => {
    const r = route.request();
    if (r.method() === 'PATCH' && /business_orders/.test(r.url())) patches.push(r.postData());
    const { status, body } = curlRelay(r); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body });
  });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.addInitScript(([s]) => {
    localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s));
    localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null }));
  }, [session]);
  await page.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
  const bottomNav = page.locator('nav').filter({ has: page.getByText('Inicio', { exact: true }) });
  const pedidosNav = bottomNav.getByRole('button', { name: /Pedidos/ });
  let loaded = false;
  for (let i = 0; i < 20 && !loaded; i++) { await page.waitForTimeout(1500); loaded = await pedidosNav.first().isVisible().catch(() => false); }
  if (!loaded) return fail('panel did not load');
  await pedidosNav.first().click();
  for (let i = 0; i < 12; i++) { await page.waitForTimeout(1200); if (await page.getByText('EN VIVO', { exact: true }).first().isVisible().catch(() => false)) break; }
  // open TL-3655A3 detail
  await page.getByText('TL-3655A3', { exact: true }).first().click();
  for (let i = 0; i < 8; i++) { await page.waitForTimeout(1000); if (await page.getByText('Progreso del pedido').first().isVisible().catch(() => false)) break; }
  if (!(await page.getByText('Progreso del pedido').first().isVisible().catch(() => false))) return fail('detail not shown');
  // click footer Aceptar
  await page.getByRole('button', { name: /Aceptar/ }).first().click();
  await page.waitForTimeout(2500); // let the PATCH flush through the relay
  await page.screenshot({ path: `${SHOTS}/ck-accept-after.png`, fullPage: true });
  console.log('PATCHes sent to business_orders:', JSON.stringify(patches));
  await browser.close();
})();
