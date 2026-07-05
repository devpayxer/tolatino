// Consumer transaction-loop audit at phone width (392px).
// Neither audit.js (dashboard) nor publish.js (publish form) reaches the client
// listing (BizDetail) or Mi cuenta. This walks the consumer create-actions loop:
//   Negocios → open a business → Renta tab + rental modal (period/qty/date) →
//   Servicios tab + booking modal → Menú order → then Mi cuenta transaction
//   sections. Same horizontal-overflow detector as publish.js.
//
// Usage (after `pnpm --filter @tolatino/web build`):
//   cd apps/web/out && python3 -m http.server 4173 &
//   cd tools/mobile-audit && node consumer.js       # expect "0 violation state(s)"
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/img/audit';
const BASE = 'http://127.0.0.1:4173';

let issues = 0;
let checks = 0;

async function check(page, name) {
  checks++;
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const pageOver = document.documentElement.scrollWidth - vw;
    const bad = [];
    document.querySelectorAll('body *').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 24 || rect.height < 10) return;
      let n = el;
      let scrollable = false;
      while (n && n !== document.body) {
        const s = getComputedStyle(n);
        if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && n.scrollWidth > n.clientWidth) { scrollable = true; break; }
        if (s.overflowX === 'hidden' || s.overflowX === 'clip' || s.overflow === 'hidden') { scrollable = true; break; }
        n = n.parentElement;
      }
      if (scrollable) return;
      if (rect.right > vw + 3 || rect.left < -3) {
        bad.push(`${el.tagName}.${(el.className || '').toString().slice(0, 70)} L=${Math.round(rect.left)} R=${Math.round(rect.right)}`);
      }
    });
    const overlays = [];
    document.querySelectorAll('div,aside').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' && parseInt(cs.zIndex || '0', 10) >= 40 && el.getBoundingClientRect().height > 120) {
        if (el.scrollWidth > el.clientWidth + 2) overlays.push(`overlay hscroll +${el.scrollWidth - el.clientWidth}px`);
      }
    });
    return { pageOver, bad: bad.slice(0, 5), overlays };
  });
  const broken = r.pageOver > 2 || r.bad.length > 0 || r.overlays.length > 0;
  if (broken) {
    issues++;
    console.log(`[FAIL] ${name} pageOver=${r.pageOver}`, r.bad, r.overlays);
    await page.screenshot({ path: `${OUT}/FAIL-cons-${name.replace(/[^a-z0-9-]/gi, '_')}.png`, fullPage: false });
  } else console.log(`[ok] ${name}`);
}

// Click the first element whose visible text contains `txt` (optionally scoped).
async function clickText(page, txt, { required = false } = {}) {
  const el = page.locator(`text=${txt}`).first();
  if (await el.count() === 0) {
    if (required) throw new Error(`missing control: "${txt}"`);
    return false;
  }
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await el.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(220);
  return true;
}

// Open the first real business listing by clicking its name (Card is a div).
async function openBiz(page) {
  const name = page.locator('main .shadow-card', { hasText: '★' }).first();
  if (await name.count() === 0) throw new Error('no business card found on Negocios');
  await name.scrollIntoViewIfNeeded().catch(() => {});
  await name.click({ timeout: 5000 });
  await page.waitForTimeout(500);
  // Confirm BizDetail opened: its tab bar has an "Overview" tab.
  if (await page.locator('text=Overview').count() === 0) throw new Error('BizDetail did not open');
}

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 392, height: 812 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));

  // ---- Negocios list → open first business ----
  await page.goto(`${BASE}/negocios/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await check(page, 'negocios-list');

  // Open a business: cards are Card divs (onClick) with the business name inside.
  await openBiz(page);
  await check(page, 'bizdetail-overview');

  // ---- Renta tab (new) ----
  const gotRenta = await clickText(page, 'Renta');
  if (gotRenta) {
    await check(page, 'bizdetail-renta-tab');
    // open rental modal
    if (await clickText(page, 'Rentar')) {
      await check(page, 'rental-modal-day');
      // period → Semana, Hora
      await clickText(page, 'Semana');
      await check(page, 'rental-modal-week');
      await clickText(page, 'Hora');
      await check(page, 'rental-modal-hour');
      // bump quantity a few times
      const plus = page.locator('button', { hasText: /^\+$/ }).first();
      for (let i = 0; i < 3 && await plus.count(); i++) { await plus.click().catch(() => {}); await page.waitForTimeout(80); }
      await check(page, 'rental-modal-qty');
      // pick a later start date
      await clickText(page, 'Sáb');
      await check(page, 'rental-modal-date');
      // submit → guest gets routed to /entrar (that's fine); measure whatever renders
      await clickText(page, 'Solicitar renta');
      await page.waitForTimeout(400);
      await check(page, 'rental-after-submit');
    } else {
      console.log('  [warn] no "Rentar" button found on Renta tab');
    }
  } else {
    throw new Error('Renta tab not found on BizDetail');
  }

  // ---- Servicios tab + booking modal ----
  await page.goto(`${BASE}/negocios/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await openBiz(page);
  if (await clickText(page, 'Servicios')) {
    await check(page, 'bizdetail-servicios-tab');
    if (await clickText(page, 'Reservar')) {
      await check(page, 'booking-modal');
      await clickText(page, 'Solicitar reserva');
      await page.waitForTimeout(300);
      await check(page, 'booking-after-submit');
    }
  }

  // ---- Eventos ----
  await page.goto(`${BASE}/eventos/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await check(page, 'eventos-list');
  // open first event detail
  const ev = page.locator('main button, main article').first();
  if (await ev.count()) await ev.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  await check(page, 'evento-detail');

  // ---- Mi cuenta transaction sections ----
  await page.goto(`${BASE}/cuenta/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await check(page, 'cuenta-home');
  for (const s of ['Mis pedidos', 'Mis reservas', 'Mis rentas', 'Mis boletos', 'Voy a asistir']) {
    if (await clickText(page, s)) {
      await check(page, `cuenta-${s.replace(/\s+/g, '-')}`);
      await clickText(page, 'Volver');
      // some back buttons are icon-only; fall back to reloading
      if (!(await page.locator('text=Mis transacciones').count())) {
        await page.goto(`${BASE}/cuenta/`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(250);
      }
    }
  }

  console.log(`\n${issues} violation state(s) across ${checks} checks`);
  await browser.close();
  process.exit(issues ? 1 : 0);
})().catch((e) => { console.error('AUDIT ERROR:', e.message); process.exit(2); });
