// booking-approval.js — verify the booking approval mode (migration 0095) end to
// end in a real browser, both facets:
//   • CLIENT books on the barbería (pay-at-local) in each mode:
//       autoConfirm=false → "¡Cita solicitada!" + "Por confirmar"  (DB status=pending)
//       autoConfirm=true  → "¡Cita confirmada!" + "Confirmada"      (DB status=confirmed)
//   • OWNER dashboard: switch to the barbería → Servicios config shows the
//     "Confirmación de citas" control.
// Usage: SESSION_A=<clientSess> SESSION_B=<ownerSess> SHOTS_DIR=<dir>
//        EXPECT=confirmed|pending TAG=<label> node booking-approval.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const REF = 'zpkaxojonufdwgahiqjh';
const sessA = JSON.parse(fs.readFileSync(process.env.SESSION_A, 'utf8'));
const sessB = JSON.parse(fs.readFileSync(process.env.SESSION_B, 'utf8'));
const SLUG = 'hz-barberia-primera';

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
  await page.route('**://js.stripe.com/**', (r) => r.abort());
  if (session) await page.addInitScript(([s, ref]) => { localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s)); }, [session, REF]);
  return page;
}

async function bookOnce(page, expectConfirmed, tag) {
  await page.goto(`${BASE}/negocios/?b=${SLUG}&bt=services`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(7000);
  const reservar = page.getByRole('button', { name: /^Reservar$/ }).first();
  if (!await reservar.isVisible().catch(() => false)) throw new Error(`${tag}: no Reservar button`);
  await reservar.click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(1500);
  // provider "★ Cualquiera" if a team step is shown
  const any = page.locator('button:has-text("★")').first();
  if (await any.isVisible().catch(() => false)) { await any.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(300); }
  // iterate the date chips (skip today, usually closed) until time slots appear
  const dateChips = page.locator('div.no-scrollbar > button:not([disabled])');
  const nDates = await dateChips.count();
  let slotPicked = false;
  for (let i = 1; i < nDates && !slotPicked; i++) {
    await dateChips.nth(i).click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(1600); // slots recompute from the busy feed
    // a time slot button shows a clock time like "9:00" / "10:30 am"
    const slots = page.locator('button:not([disabled])').filter({ hasText: /\d{1,2}:\d{2}/ });
    const nSlots = await slots.count();
    if (nSlots > 0) { await slots.last().click({ timeout: 4000 }).catch(() => {}); slotPicked = true; } // last = late slot, least contended
  }
  if (!slotPicked) throw new Error(`${tag}: no bookable slot found on any date`);
  await page.waitForTimeout(500);
  const confirm = page.getByRole('button', { name: /Confirmar cita|Solicitar reserva/ }).first();
  if (!await confirm.isVisible().catch(() => false)) throw new Error(`${tag}: no confirm CTA`);
  await confirm.click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(3800);
  let body = await page.evaluate(() => document.body.innerText);
  // if a slot just got taken, the sheet flashes an error and stays open — retry the confirm on a later slot once
  if (!/¡Cita (confirmada|solicitada|agendada)!/.test(body)) {
    const more = page.locator('button:not([disabled])').filter({ hasText: /\d{1,2}:\d{2}/ });
    if (await more.count() > 1) { await more.nth(await more.count() - 2).click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(500); }
    const c2 = page.getByRole('button', { name: /Confirmar cita|Solicitar reserva/ }).first();
    if (await c2.isVisible().catch(() => false)) { await c2.click({ timeout: 6000 }).catch(() => {}); await page.waitForTimeout(3800); }
    body = await page.evaluate(() => document.body.innerText);
  }
  await page.screenshot({ path: `${SHOTS}/booking-${tag}.png`, fullPage: false }).catch(() => {});
  const title = /¡Cita confirmada!/.test(body) ? 'confirmada' : /¡Cita solicitada!/.test(body) ? 'solicitada' : /¡Cita agendada!/.test(body) ? 'agendada(OLD)' : '???';
  const chip = /\bConfirmada\b/.test(body) ? 'Confirmada' : /Por confirmar/.test(body) ? 'Por confirmar' : '—';
  const wantTitle = expectConfirmed ? 'confirmada' : 'solicitada';
  const wantChip = expectConfirmed ? 'Confirmada' : 'Por confirmar';
  const ok = title === wantTitle && chip === wantChip;
  console.log(`${ok ? '[ok]  ' : '[FAIL]'} client ${tag}: title="${title}" chip="${chip}" (want "${wantTitle}"/"${wantChip}")`);
  return ok;
}

async function ownerConfig(browser) {
  const owner = await newPage(browser, sessB, { width: 390, height: 844 });
  await owner.goto(`${BASE}/negocio/?t=services`, { waitUntil: 'domcontentloaded' });
  await owner.waitForTimeout(7000);
  // switch the active business to the barbería
  const switcher = owner.locator('button[aria-expanded]').first();
  if (await switcher.isVisible().catch(() => false)) {
    await switcher.click({ timeout: 4000 }).catch(() => {});
    await owner.waitForTimeout(500);
    const opt = owner.locator('button', { hasText: "Barbería D' Primera" }).last();
    if (await opt.isVisible().catch(() => false)) { await opt.click({ timeout: 4000 }).catch(() => {}); }
    await owner.waitForTimeout(4000);
  }
  const dash = await owner.evaluate(() => document.body.innerText);
  const hasToggle = /Confirmación de citas/.test(dash);
  await owner.screenshot({ path: `${SHOTS}/booking-owner-config.png`, fullPage: true }).catch(() => {});
  console.log(`${hasToggle ? '[ok]  ' : '[FAIL]'} owner Servicios config shows "Confirmación de citas": ${hasToggle}`);
  return hasToggle;
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  let failed = 0;
  try {
    const client = await newPage(browser, sessA, { width: 390, height: 844 });
    if (!await bookOnce(client, process.env.EXPECT === 'confirmed', process.env.TAG || 'run')) failed++;
    if (process.env.SKIP_OWNER !== '1') { if (!await ownerConfig(browser)) failed++; }
  } catch (e) {
    console.error('ERROR', e.message); failed++;
  }
  await browser.close();
  console.log(failed === 0 ? '\nPASS ✓' : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
})();
