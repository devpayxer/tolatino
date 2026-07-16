// review-loop.js — full Reseñas loop in a real browser, user → owner → answering:
//   A) CLIENT writes a review on the barbería (5★ + text) → posted.
//   B) OWNER dashboard → barbería → Reseñas → replies to it.
//   C) CLIENT listing shows "Respuesta de <negocio>"; client notif panel shows
//      "Respondieron tu reseña"; owner notif panel shows "Nueva reseña".
// Usage: SESSION_A=<client> SESSION_B=<owner> SHOTS_DIR=<dir> node review-loop.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const REF = 'zpkaxojonufdwgahiqjh';
const sessA = JSON.parse(fs.readFileSync(process.env.SESSION_A, 'utf8'));
const sessB = JSON.parse(fs.readFileSync(process.env.SESSION_B, 'utf8'));
const SLUG = 'hz-barberia-primera';
const REVIEW_TEXT = 'Excelente corte y muy buen trato, súper recomendado.';

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
const has = (body, re) => re.test(body);
let failed = 0;
const check = (name, ok) => { if (!ok) failed++; console.log(`${ok ? '[ok]  ' : '[FAIL]'} ${name}`); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  try {
    // ── A) CLIENT writes a review ───────────────────────────────────────────
    const client = await newPage(browser, sessA, { width: 390, height: 844 });
    await client.goto(`${BASE}/negocios/?b=${SLUG}&bt=reviews`, { waitUntil: 'domcontentloaded' });
    await client.waitForTimeout(6500);
    await client.getByRole('button', { name: /Escribir reseña/ }).first().click({ timeout: 6000 }).catch(() => {});
    await client.waitForTimeout(1000);
    await client.locator('textarea').first().fill(REVIEW_TEXT).catch(() => {});
    await client.waitForTimeout(400);
    await client.getByRole('button', { name: /Publicar reseña/ }).first().click({ timeout: 6000 }).catch(() => {});
    await client.waitForTimeout(3500);
    let cbody = await client.evaluate(() => document.body.innerText);
    await client.screenshot({ path: `${SHOTS}/review-A-write.png`, fullPage: false }).catch(() => {});
    check('A: client review posted (shows "Tú" + text)', has(cbody, /Tú/) && has(cbody, /Excelente corte/));

    // ── B) OWNER replies from the dashboard ─────────────────────────────────
    const owner = await newPage(browser, sessB, { width: 390, height: 844 });
    await owner.goto(`${BASE}/negocio/?t=reviews`, { waitUntil: 'domcontentloaded' });
    await owner.waitForTimeout(7000);
    // switch active business to the barbería
    const sw = owner.locator('button[aria-expanded]').first();
    if (await sw.isVisible().catch(() => false)) {
      await sw.click({ timeout: 4000 }).catch(() => {});
      await owner.waitForTimeout(400);
      await owner.locator('button', { hasText: "Barbería D' Primera" }).last().click({ timeout: 4000 }).catch(() => {});
      await owner.waitForTimeout(4000);
    }
    // make sure we're on the Reseñas sub-tab
    await owner.getByRole('button', { name: /^Reseñas$/ }).first().click({ timeout: 4000 }).catch(() => {});
    await owner.waitForTimeout(1500);
    // open the reply editor on the client's review, type + send
    await owner.getByRole('button', { name: /^Responder$/ }).first().click({ timeout: 4000 }).catch(() => {});
    await owner.waitForTimeout(600);
    await owner.locator('textarea').first().fill('¡Gracias por tu visita, te esperamos pronto! 🙌').catch(() => {});
    await owner.waitForTimeout(300);
    await owner.getByRole('button', { name: /Responder|Enviar/ }).first().click({ timeout: 4000 }).catch(() => {});
    await owner.waitForTimeout(2500);
    await owner.screenshot({ path: `${SHOTS}/review-B-owner-reply.png`, fullPage: true }).catch(() => {});
    // owner notification panel (desktop bell)
    const ownerD = await newPage(browser, sessB, { width: 1100, height: 900 });
    await ownerD.goto(`${BASE}/negocios/`, { waitUntil: 'domcontentloaded' });
    await ownerD.waitForTimeout(6000);
    await ownerD.getByRole('button', { name: /Notificaciones|Notifications/ }).first().click({ timeout: 5000 }).catch(() => {});
    await ownerD.waitForTimeout(1500);
    const obody = await ownerD.evaluate(() => document.body.innerText);
    await ownerD.screenshot({ path: `${SHOTS}/review-owner-notif.png`, fullPage: false }).catch(() => {});
    check('B: owner notified "Nueva reseña"', has(obody, /Nueva reseña/));

    // ── C) CLIENT sees the reply + gets notified ────────────────────────────
    const client2 = await newPage(browser, sessA, { width: 390, height: 844 });
    await client2.goto(`${BASE}/negocios/?b=${SLUG}&bt=reviews`, { waitUntil: 'domcontentloaded' });
    await client2.waitForTimeout(6500);
    const c2body = await client2.evaluate(() => document.body.innerText);
    await client2.screenshot({ path: `${SHOTS}/review-C-client-sees-reply.png`, fullPage: false }).catch(() => {});
    check('C: listing shows "Respuesta de" the business', has(c2body, /Respuesta de/));
    // client notification panel (desktop bell)
    const clientD = await newPage(browser, sessA, { width: 1100, height: 900 });
    await clientD.goto(`${BASE}/negocios/`, { waitUntil: 'domcontentloaded' });
    await clientD.waitForTimeout(6000);
    await clientD.getByRole('button', { name: /Notificaciones|Notifications/ }).first().click({ timeout: 5000 }).catch(() => {});
    await clientD.waitForTimeout(1500);
    const cnbody = await clientD.evaluate(() => document.body.innerText);
    await clientD.screenshot({ path: `${SHOTS}/review-client-notif.png`, fullPage: false }).catch(() => {});
    check('C: client notified "Respondieron tu reseña"', has(cnbody, /Respondieron tu reseña/));
  } catch (e) {
    console.error('ERROR', e.message); failed++;
  }
  await browser.close();
  console.log(failed === 0 ? '\nALL PASS ✓' : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
})();
