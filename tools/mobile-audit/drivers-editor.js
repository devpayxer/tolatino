// drivers-editor.js — professional repartidor editor: photo upload (driver or
// vehicle), formatted phone field, vehicle field.
//  A) DEMO (no auth): open a seed driver → phone auto-formats as you type,
//     vehicle field present, uploading a photo renders it in the avatar (object
//     URL path, zero storage artifacts).
//  B) OWNER (b@b.com): the founder's "El rubio" had a garbage phone
//     ("570566985ghghfhg"); the pro field cleans it to a formatted number.
// Usage: SESSION_B=<b@b> SHOTS_DIR=<dir> node drivers-editor.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const sessB = JSON.parse(fs.readFileSync(process.env.SESSION_B, 'utf8'));
const RED_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

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
async function newPage(browser, session /* null = demo */) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', () => {});
  await page.route('**://*.supabase.co/**', async (route) => { const { status, body } = await curlRelay(route.request()); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  if (session) await page.addInitScript(([s]) => { localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s)); }, [session]);
  return page;
}
async function toRepartidores(page) {
  await page.goto(`${BASE}/negocio/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await page.getByRole('button', { name: 'Menú', exact: true }).first().click({ timeout: 15000 });
  await page.waitForTimeout(800);
  await page.getByText('Entregas y envíos', { exact: false }).last().click({ timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Repartidores', exact: true }).last().click({ timeout: 8000 });
  await page.waitForTimeout(1000);
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let page;
  const fail = async (m) => { if (page) await page.screenshot({ path: `${SHOTS}/drv-FAIL.png`, fullPage: true }).catch(() => {}); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  try {
    // ===================== A) DEMO — full editor, photo renders =====================
    page = await newPage(browser, null);
    await toRepartidores(page);
    // open the first seed driver
    await page.getByRole('button').filter({ hasText: /Marco|Diego|Andrea|Luc/ }).first().click({ timeout: 8000 });
    await page.waitForTimeout(900);
    const hasPhotoBtn = await page.getByRole('button', { name: /Subir foto|Upload photo/ }).last().isVisible().catch(() => false);
    const hasVehicle = await page.getByText('Vehículo', { exact: false }).last().isVisible().catch(() => false);
    console.log('A1) editor → photo button:', hasPhotoBtn, '| vehicle field:', hasVehicle);
    if (!hasPhotoBtn || !hasVehicle) return fail('driver editor missing photo/vehicle');

    // phone formats as you type
    const phone = page.locator('input[inputmode="tel"]').last();
    await phone.fill('');
    await phone.type('7135550142', { delay: 12 });
    const phoneVal = await phone.inputValue();
    console.log('A2) phone typed → value:', JSON.stringify(phoneVal));
    if (phoneVal !== '(713) 555-0142') return fail('phone did not format: ' + phoneVal);

    // vehicle
    await page.getByPlaceholder(/Honda Civic/).last().fill('Honda Civic gris · ABC-1234');

    // upload a photo → object URL renders in the avatar (demo path)
    await page.locator('input[type="file"]').last().setInputFiles({ name: 'driver.png', mimeType: 'image/png', buffer: RED_PNG });
    await page.waitForTimeout(1500);
    const imgSrc = await page.locator('button[aria-label="Subir foto"] img, button[aria-label="Upload photo"] img').last().getAttribute('src').catch(() => null);
    console.log('A3) photo uploaded → avatar img src:', imgSrc ? imgSrc.slice(0, 24) + '…' : null);
    if (!imgSrc) return fail('photo did not appear in the avatar after upload');
    await page.screenshot({ path: `${SHOTS}/drv-A-editor-demo.png` });
    await page.close();

    // ===================== B) OWNER — garbage phone auto-cleaned =====================
    page = await newPage(browser, sessB);
    await toRepartidores(page);
    await page.getByRole('button').filter({ hasText: /El rubio/ }).first().click({ timeout: 8000 });
    await page.waitForTimeout(900);
    const ownerPhone = await page.locator('input[inputmode="tel"]').last().inputValue().catch(() => '?');
    console.log('B1) El rubio phone (was "570566985ghghfhg") now:', JSON.stringify(ownerPhone));
    if (!/^\(\d{3}\)/.test(ownerPhone)) return fail('owner phone not formatted: ' + ownerPhone);
    await page.screenshot({ path: `${SHOTS}/drv-B-owner-cleaned.png` });

    console.log('ALL OK — pro driver editor: phone formatting, vehicle, photo upload.');
    await browser.close();
  } catch (e) {
    await fail('exception: ' + String(e).slice(0, 400));
  }
})();
