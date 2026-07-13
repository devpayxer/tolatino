// stripe-catalog.js — with El Sabor set NOT connected (connect_charges_enabled=false):
//  OWNER (b@b.com): Inicio shows "Conecta pagos para cobrar"; Configurar módulos
//    shows the amber "Estás en modo catálogo" banner with Conectar pagos CTA.
//  CONSUMER (anon): El Sabor's menu is CATALOG mode — no order/cart CTA.
// Usage: SESSION_B=<sessB.json> SHOTS_DIR=<dir> node stripe-catalog.js
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
  const fail = async (m, page) => { if (page) await page.screenshot({ path: `${SHOTS}/stripe-FAIL.png`, fullPage: true }).catch(() => {}); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  try {
    // ── OWNER: Inicio attention item ──
    let page = await newPage(browser, sessB, { width: 1440, height: 1100 });
    await page.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6500);
    let body = await page.evaluate(() => document.body.innerText);
    if (!body.includes('Conecta pagos para cobrar')) return fail('Inicio missing "Conecta pagos para cobrar" attention item', page);
    if (!body.includes('modo catálogo')) return fail('Inicio missing catalog-mode wording', page);
    console.log('owner Inicio: "Conecta pagos para cobrar" + modo catálogo present');
    await page.screenshot({ path: `${SHOTS}/stripe-inicio.png` });
    // ── OWNER: Configurar módulos banner ──
    const items = page.getByText('Configurar módulos', { exact: true });
    const n = await items.count();
    for (let i = 0; i < n; i++) { const el = items.nth(i); if (await el.isVisible().catch(() => false)) { await el.click(); break; } }
    await page.waitForTimeout(1500);
    body = await page.evaluate(() => document.body.innerText);
    if (!body.includes('Estás en modo catálogo')) return fail('activator missing "Estás en modo catálogo" banner', page);
    if (!body.includes('Conectar pagos')) return fail('activator missing "Conectar pagos" CTA', page);
    console.log('owner módulos: amber "Estás en modo catálogo" banner + Conectar pagos CTA present');
    await page.screenshot({ path: `${SHOTS}/stripe-modules.png` });
    await page.close();

    // ── CONSUMER: El Sabor menu is CATALOG (no order CTA) ──
    page = await newPage(browser, null, { width: 390, height: 844 });
    await page.goto(`${BASE}/negocios/?b=hz-sabor-quisqueya`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6500);
    // open the Menú tab if present
    const menuTab = page.getByRole('button', { name: /^Menú$/ }).first();
    if (await menuTab.isVisible().catch(() => false)) { await menuTab.click(); await page.waitForTimeout(1200); }
    body = await page.evaluate(() => document.body.innerText);
    // catalog mode: no "Ver carrito" / no "Pedir"; a "view menu / call to order" note shows
    const hasCart = /Ver carrito|Agregar al carrito/.test(body);
    if (hasCart) return fail('consumer still shows ordering (cart) despite no Stripe', page);
    console.log('consumer El Sabor menu: catalog mode (no cart/order CTA).');
    await page.screenshot({ path: `${SHOTS}/stripe-consumer.png`, fullPage: true });

    console.log('ALL OK');
    await browser.close();
  } catch (e) {
    await fail('exception: ' + String(e).slice(0, 400));
  }
})();
