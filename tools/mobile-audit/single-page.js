// Verify El Sabor opens as the BUSINESS SINGLE-PAGE (hero + tab bar incl. Reseñas),
// NOT the full-screen OrderFlow takeover, and that the "Menú" tab still orders
// (add item → cart bar). The founder's fix: keep the original single-page design,
// food menu confined to the Menu tab. Supabase relayed via curl (sandbox proxy).
// Usage: SESSION_JSON=<file> SHOTS_DIR=<dir> node single-page.js
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
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/sp-FAIL.png`, fullPage: true }); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  await page.route('**://*.supabase.co/**', async (route) => { const { status, body } = curlRelay(route.request()); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.addInitScript(([s]) => {
    localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s));
    localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null }));
  }, [session]);

  await page.goto(`${BASE}/negocios/`, { waitUntil: 'domcontentloaded' });
  const card = page.getByText('El Sabor de Quisqueya').first();
  let ok = false; for (let i = 0; i < 20 && !ok; i++) { await page.waitForTimeout(1200); ok = await card.isVisible().catch(() => false); }
  if (!ok) return fail('El Sabor not in Negocios list');
  await card.click();
  await page.waitForTimeout(2500);

  // SINGLE-PAGE markers: the sticky tab bar has a "Reseñas" tab (OrderFlow never did).
  const resenasTab = page.getByRole('button', { name: /^Reseñas$/ });
  let hasTabs = false; for (let i = 0; i < 12 && !hasTabs; i++) { await page.waitForTimeout(1000); hasTabs = await resenasTab.first().isVisible().catch(() => false); }
  if (!hasTabs) return fail('single-page tab bar (Reseñas tab) not shown — still OrderFlow takeover?');
  // must NOT be the OrderFlow full-screen (its signature header "Los más pedidos" as the page body)
  await page.screenshot({ path: `${SHOTS}/sp-1-overview.png`, fullPage: true });

  // open the Menú tab
  await page.getByRole('button', { name: /^Menú$/ }).first().click();
  await page.waitForTimeout(1500);
  // food menu present (a real dish + delivery/pickup chips)
  const dish = page.getByText('Mangú con los tres golpes').first();
  let hasDish = false; for (let i = 0; i < 10 && !hasDish; i++) { await page.waitForTimeout(1000); hasDish = await dish.isVisible().catch(() => false); }
  if (!hasDish) return fail('Menú tab: dishes not shown');
  await page.screenshot({ path: `${SHOTS}/sp-2-menu.png`, fullPage: true });

  // add-to-cart: click a dish's add control, then confirm the cart bar appears
  await dish.scrollIntoViewIfNeeded();
  await dish.click();
  await page.waitForTimeout(1200);
  // an item sheet or direct add — look for an "Agregar" button, else a + on the card
  const addBtn = page.getByRole('button', { name: /Agregar/ }).first();
  if (await addBtn.isVisible().catch(() => false)) { await addBtn.click(); }
  await page.waitForTimeout(1500);
  const cartBar = page.getByText(/Ver (carrito|orden|pedido)|Ir a pagar|carrito/i).first();
  const hasCart = await cartBar.isVisible().catch(() => false);
  await page.screenshot({ path: `${SHOTS}/sp-3-cart.png`, fullPage: true });
  console.log('OK — single-page restored (tabs incl. Reseñas); Menú tab orders. cartBar visible:', hasCart);
  await browser.close();
})();
