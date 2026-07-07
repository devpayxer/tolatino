// Focused P0 overflow audit for the Eventos flow at phone width (392px):
//   consumer /eventos (list + filter chips + date chips + open a card detail)
//   dashboard Events module (Próximos/Borradores/Pasados/Recurrentes/Promotores
//   sub-tabs + open Gestionar → Resumen/Asistentes/Check-in/Boletos/Ajustes).
// Demo mode (not signed in) so no network is required. Short timeouts so a
// blocked fetch can't hang the run.
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:4173';
let issues = 0, checks = 0;

async function check(page, name) {
  checks++;
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const over = document.documentElement.scrollWidth - vw;
    const bad = [];
    document.querySelectorAll('body *').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 24 || rect.height < 10) return;
      // ignore elements clipped/scrolled by an ancestor (real audit logic)
      let n = el, scrollable = false;
      while (n && n !== document.body) {
        const s = getComputedStyle(n);
        if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && n.scrollWidth > n.clientWidth) { scrollable = true; break; }
        if (s.overflowX === 'hidden' || s.overflowX === 'clip' || s.overflow === 'hidden') { scrollable = true; break; }
        n = n.parentElement;
      }
      if (scrollable) return;
      if (rect.right > vw + 3 || rect.left < -3) {
        bad.push(`${el.tagName}.${(el.className || '').toString().slice(0, 50)} R=${Math.round(rect.right)}`);
      }
    });
    return { over, bad: bad.slice(0, 5) };
  });
  const fail = r.over > 2 || r.bad.length > 0;
  if (fail) { issues++; console.log(`  ✗ ${name}  pageOver=${r.over}  ${r.bad.join(' | ')}`); }
  else console.log(`  ✓ ${name}`);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 392, height: 852 } });
  page.setDefaultTimeout(2500);

  // ---- consumer /eventos ----
  await page.goto(`${BASE}/eventos.html`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(600);
  await check(page, 'eventos: list');
  // click each filter chip (first chip row)
  const chipRow = page.locator('.no-scrollbar').first();
  const chips = await chipRow.locator('button, [role="button"]').all().catch(() => []);
  for (let i = 0; i < Math.min(chips.length, 6); i++) {
    await chips[i].click({ timeout: 1200 }).catch(() => {});
    await page.waitForTimeout(120);
  }
  await check(page, 'eventos: after filter chips');
  // open a card detail
  const card = page.locator('.grid > div, .grid > button').first();
  await card.click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(500);
  await check(page, 'eventos: card detail overlay');
  await page.mouse.click(6, 120).catch(() => {});

  // ---- dashboard Events module (demo mode) ----
  await page.goto(`${BASE}/negocio.html`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(700);
  // open the drawer menu, click "Eventos y boletos"
  await page.locator('button[aria-label="Menú"]').first().click().catch(() => {});
  await page.waitForTimeout(300);
  const ev = page.getByText('Eventos y boletos', { exact: false }).first();
  await ev.click({ timeout: 2500 }).catch(() => {});
  await page.waitForTimeout(600);
  await check(page, 'dash events: Próximos');

  // sub-tabs: click each chip in the module's first horizontal tab row
  const subTabs = ['Borradores', 'Pasados', 'Recurrentes', 'Promotores', 'Próximos'];
  for (const tab of subTabs) {
    const t = page.locator(`button:has-text("${tab}")`).first();
    if (await t.count().catch(() => 0)) {
      await t.scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => {});
      await t.click({ timeout: 1500, force: true }).catch(() => {});
      await page.waitForTimeout(300);
      await check(page, `dash events: ${tab}`);
    }
  }

  // open Gestionar → manage tabs
  const manage = page.locator('button:has-text("Gestionar")').first();
  if (await manage.count().catch(() => 0)) {
    await manage.click({ timeout: 1500, force: true }).catch(() => {});
    await page.waitForTimeout(500);
    await check(page, 'dash events: Gestionar/Resumen');
    for (const mt of ['Asistentes', 'Check-in', 'Boletos', 'Ajustes']) {
      const t = page.locator(`button:has-text("${mt}")`).first();
      if (await t.count().catch(() => 0)) {
        await t.scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => {});
        await t.click({ timeout: 1500, force: true }).catch(() => {});
        await page.waitForTimeout(300);
        await check(page, `dash manage: ${mt}`);
      }
    }
  }

  // wizard (Crear evento) — check steps don't overflow
  await page.goto(`${BASE}/negocio.html`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(500);
  await page.locator('button[aria-label="Menú"]').first().click().catch(() => {});
  await page.waitForTimeout(250);
  await page.getByText('Eventos y boletos', { exact: false }).first().click({ timeout: 2500 }).catch(() => {});
  await page.waitForTimeout(400);
  const create = page.getByRole('button', { name: /Crear evento/ }).first();
  if (await create.isVisible().catch(() => false)) {
    await create.click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(400);
    await check(page, 'wizard: step 1 (Detalles)');
  }

  console.log(`\n${issues === 0 ? '✓ PASS' : '✗ FAIL'}: ${issues} violation state(s) across ${checks} checks`);
  await browser.close();
  process.exit(issues === 0 ? 0 : 1);
})();
