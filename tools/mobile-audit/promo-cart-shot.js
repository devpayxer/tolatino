const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const sessA = JSON.parse(fs.readFileSync(process.env.SESSION_A, 'utf8'));
function relay(req) {
  return new Promise((resolve) => {
    const a = ['-s', '-o', '-', '-w', '\n%{http_code}', '-X', req.method(), '--max-time', '25'];
    const h = req.headers();
    for (const k of ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info', 'range']) if (h[k]) a.push('-H', `${k}: ${h[k]}`);
    const b = req.postData(); if (b != null) a.push('--data-binary', b);
    a.push(req.url());
    execFile('curl', a, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }, (e, o) => { o = o || ''; const nl = o.lastIndexOf('\n'); resolve({ status: parseInt(o.slice(nl + 1), 10) || 500, body: o.slice(0, nl) }); });
  });
}
(async () => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await br.newPage({ viewport: { width: 390, height: 900 } });
  p.on('pageerror', () => {});
  await p.route('**://*.supabase.co/**', async (ro) => { const { status, body } = await relay(ro.request()); await ro.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await p.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await p.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await p.addInitScript(([s]) => { localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s)); }, [sessA]);
  try {
    await p.goto(`${BASE}/negocios/?b=hz-sabor-quisqueya`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(6500);
    const mt = p.getByRole('button', { name: /^Menú$/ }).first();
    if (await mt.isVisible().catch(() => false)) { await mt.click(); await p.waitForTimeout(1000); }
    const adds = p.getByRole('button', { name: 'Agregar' });
    const n = await adds.count(); let count = 0;
    for (let i = 0; i < Math.min(n, 20) && count < 3; i++) {
      await adds.nth(i).click().catch(() => {}); await p.waitForTimeout(300);
      const sa = p.getByRole('button', { name: /Agregar \d/ }).first();
      if (await sa.isVisible().catch(() => false)) { if (await sa.isEnabled().catch(() => false)) { await sa.click().catch(() => {}); await p.waitForTimeout(300); count++; } else { await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(200); } }
      else if (await p.getByText(/Ver carrito/).first().isVisible().catch(() => false)) count++;
    }
    await p.getByText(/Ver carrito/).first().click({ timeout: 6000 }).catch(() => {});
    await p.getByText('Tu pedido', { exact: true }).first().waitFor({ timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(800);
    const promoInput = p.getByPlaceholder(/Código de promoción/).first();
    if (await promoInput.isVisible().catch(() => false)) {
      await promoInput.click().catch(() => {});
      await promoInput.type('BIENVENIDO10', { delay: 20 }).catch(() => {});
      await p.getByRole('button', { name: 'Aplicar' }).first().click({ timeout: 5000 }).catch(() => {});
      await p.waitForTimeout(3000);
    }
    const dv = await p.getByText(/Descuento/).first().isVisible().catch(() => false);
    if (dv) await p.getByText(/Descuento/).first().scrollIntoViewIfNeeded().catch(() => {});
    else await promoInput.scrollIntoViewIfNeeded().catch(() => {});
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${SHOTS}/promo-cart.png` });
    console.log('discount visible:', dv);
  } catch (e) { console.error('ex:', String(e).slice(0, 200)); await p.screenshot({ path: `${SHOTS}/promo-cart.png` }).catch(() => {}); }
  await br.close();
})();
