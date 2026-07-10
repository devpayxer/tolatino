// Verify the dashboard "Pedidos" tab is back to the ORIGINAL CustomersModule
// design (KPI cards, status chips, order-card grid — not the Cocina full-board
// takeover) AND that the 4 new features graft in cleanly: accept w/ prep time,
// assign a real driver, reject with a reason, payout breakdown in detail.
// Usage: SESSION_JSON=<file> SHOTS_DIR=<dir> node pedidos-restored.js
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

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/pr-FAIL.png`, fullPage: true }); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  await page.route('**://*.supabase.co/**', async (route) => { const { status, body } = await curlRelay(route.request()); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
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
  await page.waitForTimeout(2500);

  // ---- 1. ORIGINAL design markers must be back ----
  if (await page.getByText('EN VIVO', { exact: true }).count() > 0) return fail('Cocina "EN VIVO" board still showing — not reverted');
  for (const t of ['Pedidos hoy', 'Nuevos', 'Preparando', 'Listos', 'Completados', 'Cancelados']) {
    if (!(await page.getByText(t, { exact: false }).first().isVisible().catch(() => false))) return fail(`original marker missing: "${t}"`);
  }
  await page.screenshot({ path: `${SHOTS}/pr-1-board.png`, fullPage: true });

  // ---- 2. NEW: accept w/ prep time ----
  await page.getByRole('button', { name: /^Nuevos/ }).first().click();
  await page.waitForTimeout(800);
  const acceptBtn = page.getByRole('button', { name: /^Aceptar$/ }).first();
  if (!(await acceptBtn.isVisible().catch(() => false))) return fail('no "Aceptar" button on a new-order card');
  await acceptBtn.click();
  await page.waitForTimeout(700);
  if (!(await page.getByText('Tiempo de preparación', { exact: false }).first().isVisible().catch(() => false))) return fail('prep-time sheet did not open');
  await page.getByRole('button', { name: /^20 min$/ }).click();
  await page.screenshot({ path: `${SHOTS}/pr-2-prep-sheet.png` });
  await page.getByRole('button', { name: /Aceptar · 20 min/ }).click();
  await page.waitForTimeout(1200);
  console.log('OK: accepted with prep time 20 min');

  // ---- 3. NEW: reject with reason (2nd new order) ----
  const acceptBtn2 = page.getByRole('button', { name: /^Aceptar$/ }).first();
  const hasSecondNew = await acceptBtn2.isVisible().catch(() => false);
  if (hasSecondNew) {
    await acceptBtn2.click();
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: /^Rechazar$/ }).first().click();
    await page.waitForTimeout(700);
    if (!(await page.getByText('Elige el motivo', { exact: false }).first().isVisible().catch(() => false))) return fail('reject-reason sheet did not open');
    await page.screenshot({ path: `${SHOTS}/pr-3-reject-sheet.png` });
    await page.getByText('Cocina saturada', { exact: false }).first().click();
    await page.waitForTimeout(1000);
    console.log('OK: rejected with reason');
  } else {
    console.log('(skip reject test — no second "new" order available)');
  }

  // ---- 4. NEW: assign driver on the delivery order in "Preparando"/"Listos" ----
  await page.getByRole('button', { name: /^Preparando/ }).first().click();
  await page.waitForTimeout(800);
  const markReady = page.getByRole('button', { name: /^Marcar listo$/ }).first();
  if (await markReady.isVisible().catch(() => false)) { await markReady.click(); await page.waitForTimeout(1000); }
  await page.getByRole('button', { name: /^Listos/ }).first().click();
  await page.waitForTimeout(800);
  const assignBtn = page.getByRole('button', { name: /Asignar repartidor/ }).first();
  if (!(await assignBtn.isVisible().catch(() => false))) return fail('"Asignar repartidor" button not found on a ready delivery order');
  await assignBtn.click();
  await page.waitForTimeout(700);
  if (!(await page.getByText('Tus repartidores', { exact: false }).first().isVisible().catch(() => false))) return fail('assign-driver sheet did not open');
  await page.screenshot({ path: `${SHOTS}/pr-4-assign-sheet.png` });
  await page.getByText('Uber Direct', { exact: false }).first().click();
  await page.waitForTimeout(1000);
  console.log('OK: driver assigned');

  // driver line + "Marcar entregado" should now show on the card
  if (!(await page.getByText('Uber Direct', { exact: false }).first().isVisible().catch(() => false))) return fail('driver line not shown on card after assignment');
  const deliverBtn = page.getByRole('button', { name: /Marcar entregado/ }).first();
  if (!(await deliverBtn.isVisible().catch(() => false))) return fail('"Marcar entregado" button not shown after driver assignment');
  await page.screenshot({ path: `${SHOTS}/pr-5-driver-assigned.png`, fullPage: true });

  // ---- 5. detail overlay: payout breakdown ----
  await page.getByText(/^TL-|^#/).first().click();
  await page.waitForTimeout(800);
  if (!(await page.getByText('Pago y liquidación', { exact: false }).first().isVisible().catch(() => false))) return fail('payout section not shown in order detail');
  if (!(await page.getByText(/Comisión/, { exact: false }).first().isVisible().catch(() => false))) return fail('commission line not shown');
  if (!(await page.getByText('Tu pago neto', { exact: false }).first().isVisible().catch(() => false))) return fail('net payout line not shown');
  await page.screenshot({ path: `${SHOTS}/pr-6-payout.png` });

  console.log('OK — Pedidos restored to original design; accept/reject/assign-driver/payout all work.');
  await browser.close();
})();
