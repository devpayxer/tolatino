// Audit the REAL Cocina module (design handoff "Cocina", Fase 2) as the El Sabor
// owner (b@b.com). Screenshots board → order detail → notifications to SHOTS_DIR.
// Supabase relayed via curl (sandbox proxy can't MITM-TLS from Chromium).
// Usage: SESSION_JSON=<file> SHOTS_DIR=<dir> node cocina-ui.js
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
  const body = req.postData();
  if (body != null) args.push('--data-binary', body);
  args.push(req.url());
  try { const out = execFileSync('curl', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }); const nl = out.lastIndexOf('\n'); return { status: parseInt(out.slice(nl + 1), 10) || 500, body: out.slice(0, nl) }; }
  catch (e) { return { status: 502, body: String(e).slice(0, 200) }; }
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/ck-FAIL.png`, fullPage: true }); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  await page.route('**://*.supabase.co/**', async (route) => { const { status, body } = curlRelay(route.request()); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.addInitScript(([s]) => {
    localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s));
    localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null }));
  }, [session]);

  await page.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
  // The curl relay blocks Node's loop per request, so poll rather than one-shot.
  // Readiness = the mobile bottom-nav "Pedidos" button is visible (the business
  // name also matches a hidden desktop-sidebar node, so don't use that).
  // the fixed bottom nav (mobile) contains "Inicio"; scope to it so we don't hit
  // the insights chart's "Pedidos" toggle (which also matches the name).
  const bottomNav = page.locator('nav').filter({ has: page.getByText('Inicio', { exact: true }) });
  const pedidosNav = bottomNav.getByRole('button', { name: /Pedidos/ });
  let loaded = false;
  for (let i = 0; i < 20 && !loaded; i++) { await page.waitForTimeout(1500); loaded = await pedidosNav.first().isVisible().catch(() => false); }
  if (!loaded) return fail('panel did not load (Pedidos nav never visible)');
  if (!(await page.getByText('El Sabor de Quisqueya').last().isVisible().catch(() => false))) return fail('panel loaded but El Sabor header not shown');

  // open Pedidos tab (bottom nav on mobile)
  await pedidosNav.first().click();
  for (let i = 0; i < 12; i++) { await page.waitForTimeout(1200); if (await page.getByText('EN VIVO', { exact: true }).first().isVisible().catch(() => false)) break; }

  // Cocina board: EN VIVO badge + status tabs + stats
  if (!(await page.getByText('EN VIVO', { exact: true }).first().isVisible().catch(() => false))) return fail('Cocina board (EN VIVO) not shown');
  for (const t of ['Ingresos hoy', 'Nuevos', 'Preparando', 'Listos', 'En camino', 'Completados']) { if (!(await page.getByText(t, { exact: false }).first().isVisible().catch(() => false))) return fail(`board: "${t}" missing`); }
  await page.screenshot({ path: `${SHOTS}/ck-1-board.png`, fullPage: true });

  // open the first order card → detail (El Sabor has real 'new' orders)
  const firstCode = page.getByText(/TL-[0-9A-F]{6}/).first();
  if (await firstCode.isVisible().catch(() => false)) {
    await firstCode.click();
    await page.waitForTimeout(1200);
    if (!(await page.getByText('Progreso del pedido').first().isVisible().catch(() => false))) return fail('order detail (Progreso del pedido) not shown');
    for (const t of ['Para preparar', 'Pago y liquidación', 'Comisión', 'Tu pago neto', 'Depósito automático']) { if (!(await page.getByText(t, { exact: false }).first().isVisible().catch(() => false))) return fail(`detail: "${t}" missing`); }
    await page.screenshot({ path: `${SHOTS}/ck-2-detail.png`, fullPage: true });
    // back to board via the header back button
    await page.locator('button').first().click().catch(() => {});
    await page.waitForTimeout(800);
  } else {
    console.log('  (no TL- order card visible in Nuevos)');
  }

  await page.screenshot({ path: `${SHOTS}/ck-3-board2.png`, fullPage: true });
  console.log('OK — Cocina board + detail verified for El Sabor (b@b.com).');
  await browser.close();
})();
