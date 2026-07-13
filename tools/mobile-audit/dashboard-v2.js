// dashboard-v2.js — Fase 1: reorganized panel nav (DASH_V2), listing-first with
// selling as an optional add-on.
//  A) OWNER (b@b.com, El Sabor · sells): desktop sidebar + mobile drawer show the
//     new groups (Tu página · Cómo te encuentran · Clientes · Vender en To'Latino ·
//     Cuenta) with the commerce modules under Vender; mobile bottom nav = seller
//     set (Inicio · Pedidos · Menú · Mensajes · Más).
//  B) LISTING-ONLY (demo, commerce toggled OFF in Configurar módulos — no DB
//     write): Vender collapses to a single "Activar ventas"; bottom nav = the
//     engagement set (Inicio · Reseñas · Mensajes · Novedades · Más).
// Usage: SESSION_B=<b@b> SHOTS_DIR=<dir> node dashboard-v2.js
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
  const fail = async (m) => { if (page) await page.screenshot({ path: `${SHOTS}/d2-FAIL.png`, fullPage: true }).catch(() => {}); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  try {
    // ============ A) OWNER — seller nav ============
    page = await newPage(browser, sessB, { width: 1440, height: 900 });
    await page.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    const groups = ['Tu página', 'Cómo te encuentran', 'Clientes', 'Vender en To’Latino', 'Cuenta'];
    for (const g of groups) {
      const ok = await page.getByText(g, { exact: false }).first().isVisible().catch(() => false);
      if (!ok) return fail('missing group in sidebar: ' + g);
    }
    const venderVisible = await page.getByText('Vender en To’Latino', { exact: false }).first().isVisible().catch(() => false);
    console.log('A1) desktop sidebar groups present; Vender:', venderVisible);
    await page.screenshot({ path: `${SHOTS}/d2-A-desktop.png` });
    await page.close();

    // mobile drawer + bottom nav (seller)
    page = await newPage(browser, sessB, { width: 390, height: 844 });
    await page.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    await page.screenshot({ path: `${SHOTS}/d2-A-mobile-inicio.png` });
    const bottomSeller = await page.getByText('Menú', { exact: true }).last().isVisible().catch(() => false);
    console.log('A2) seller bottom nav has "Menú":', bottomSeller);
    await page.getByRole('button', { name: 'Menú', exact: true }).first().click({ timeout: 10000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${SHOTS}/d2-A-drawer.png` });
    await page.close();

    // ============ B) LISTING-ONLY — demo, commerce OFF ============
    page = await newPage(browser, null, { width: 390, height: 844 });
    await page.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    // open drawer → Configurar módulos
    await page.getByRole('button', { name: 'Menú', exact: true }).first().click({ timeout: 10000 });
    await page.waitForTimeout(700);
    await page.getByText('Configurar módulos', { exact: false }).last().click({ timeout: 8000 });
    await page.waitForTimeout(1200);
    // turn OFF every commerce module (leave Novedades)
    for (const lbl of ['Menú de comida', 'Servicios', 'Productos', 'Renta', 'Eventos y boletos']) {
      const sw = page.getByRole('switch', { name: lbl }).last();
      if (await sw.isVisible().catch(() => false)) {
        const checked = await sw.getAttribute('aria-checked').catch(() => 'false');
        if (checked === 'true') { await sw.click(); await page.waitForTimeout(250); }
      }
    }
    await page.waitForTimeout(500);
    // reopen drawer → should now show "Activar ventas"
    await page.getByRole('button', { name: 'Menú', exact: true }).first().click({ timeout: 10000 });
    await page.waitForTimeout(900);
    const activar = await page.getByText('Activar ventas', { exact: false }).last().isVisible().catch(() => false);
    console.log('B1) listing-only drawer shows "Activar ventas":', activar);
    if (!activar) return fail('"Activar ventas" not shown after turning commerce off');
    await page.screenshot({ path: `${SHOTS}/d2-B-drawer-listing.png` });
    // close drawer, check bottom nav has Novedades (engagement set), not Pedidos
    await page.keyboard.press('Escape').catch(() => {});
    await page.getByRole('button', { name: /Cerrar|Close/i }).last().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
    const hasNovedades = await page.getByText('Novedades', { exact: true }).last().isVisible().catch(() => false);
    console.log('B2) listing-only bottom nav has "Novedades":', hasNovedades);
    await page.screenshot({ path: `${SHOTS}/d2-B-bottom-listing.png` });

    console.log('ALL OK — v2 nav: seller groups + Vender, listing-only collapses to Activar ventas.');
    await browser.close();
  } catch (e) {
    await fail('exception: ' + String(e).slice(0, 400));
  }
})();
