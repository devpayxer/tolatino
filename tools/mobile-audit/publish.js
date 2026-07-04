// Publish-flow audit at phone width (392px).
// The dashboard audit (audit.js) doesn't reach the consumer "Publicar" modal, so
// this walks the FAB → "Publicar mi negocio" business form — including the new
// Características picker and the weekly Horario editor — measuring horizontal
// overflow in every state (empty, category picked, features on, hours expanded,
// extra time slot, a day closed, apply-to-week). Same detector as audit.js.
//
// Usage (after `pnpm --filter @tolatino/web build`):
//   cd apps/web/out && python3 -m http.server 4173 &
//   cd tools/mobile-audit && node publish.js       # expect "0 violation state(s)"
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/img/audit';
const BASE = 'http://127.0.0.1:4173';

let issues = 0;

async function check(page, name) {
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
    // the modal itself must not scroll horizontally
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
    await page.screenshot({ path: `${OUT}/FAIL-pub-${name.replace(/[^a-z0-9-]/gi, '_')}.png`, fullPage: false });
  } else console.log(`[ok] ${name}`);
}

// Structural steps are ASSERTIVE (throw if the element is missing) so a broken
// flow fails loudly instead of quietly reporting "0 violations".
async function openBizForm(page) {
  await page.goto(`${BASE}/comunidad/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.locator('button[aria-label="Publicar"], button[aria-label="Post"]').first().click({ timeout: 5000 });
  await page.waitForTimeout(300);
  await page.locator(':text("Publicar mi negocio"), :text("List my business")').first().click({ timeout: 5000 });
  await page.waitForTimeout(350);
  // confirm we're really on the business form
  await page.locator('input[placeholder*="Esperanza"], input[placeholder*="Esperanza"]').first().waitFor({ timeout: 5000 });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 392, height: 852 } });

  await openBizForm(page);
  await check(page, 'biz-empty');

  // name (target the business-name field, not the header search)
  await page.locator('input[placeholder*="Esperanza"]').first().fill('Taquería La Prueba');
  await check(page, 'biz-named');

  // pick a category → reveals subcats + per-rubro Características (assertive)
  await page.locator('button:has-text("Comida y Bebida")').first().click({ timeout: 5000 });
  await page.waitForTimeout(250);
  await check(page, 'biz-category');

  // toggle a few feature chips (Sugeridos + rubro)
  for (const f of ['Se habla español', 'A domicilio', 'Comedor', 'Música en vivo']) {
    await page.locator(`button:has-text("${f}")`).first().click().catch(() => {});
    await page.waitForTimeout(120);
  }
  await check(page, 'biz-features-on');

  // expand the weekly hours editor (assertive — the button must exist)
  await page.locator('button:has-text("Agregar horario")').first().click({ timeout: 5000 });
  await page.waitForTimeout(300);
  await check(page, 'biz-hours-open');

  // add an extra time slot (split hours) on the first open day
  await page.locator('button:has-text("Otra franja")').first().click({ timeout: 5000 });
  await page.waitForTimeout(200);
  await check(page, 'biz-hours-franja');

  // close a day, then re-open it
  await page.locator('button:has-text("Cerrado")').first().click().catch(() => {});
  await page.waitForTimeout(150);
  await check(page, 'biz-hours-day-closed');
  await page.locator('button:has-text("Abierto")').first().click().catch(() => {});
  await page.waitForTimeout(150);

  // apply first day to the whole week
  await page.locator('button:has-text("Aplicar el primer día")').first().click().catch(() => {});
  await page.waitForTimeout(200);
  await check(page, 'biz-hours-apply-all');

  // change the open time on the first select (exercises the close-clamp path)
  const firstSelect = page.locator('select').first();
  if (await firstSelect.count()) {
    await firstSelect.selectOption({ index: 20 }).catch(() => {});
    await page.waitForTimeout(150);
    await check(page, 'biz-hours-time-change');
  }

  // scroll the modal to the bottom (submit visible) and re-measure
  await page.evaluate(() => {
    const ov = [...document.querySelectorAll('div')].find((el) => {
      const cs = getComputedStyle(el);
      return cs.position === 'fixed' && parseInt(cs.zIndex || '0', 10) >= 40 && el.scrollHeight > el.clientHeight;
    });
    if (ov) ov.scrollTop = ov.scrollHeight;
  });
  await page.waitForTimeout(150);
  await check(page, 'biz-scrolled-bottom');

  console.log(`\n=== PUBLISH AUDIT DONE — ${issues} violation state(s) ===`);
  await browser.close();
  process.exit(issues > 0 ? 1 : 0);
})();
