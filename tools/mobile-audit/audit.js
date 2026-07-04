// Screen-by-screen dashboard audit at phone width (392px).
// For every tab: check page overflow → click through every chip row (sub-tabs,
// filters, modes) re-checking after each → open sheets/wizards via known opener
// texts and the first tappable card, checking INSIDE the overlay too.
// Violations are logged + screenshotted to img/audit/.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/img/audit';

const TABS = [
  ['inicio', null],
  ['updates', 'Novedades'],
  ['menu', 'Menú de comida'],
  ['services', 'Servicios'],
  ['bookings', 'Reservas'],
  ['products', 'Productos'],
  ['shipping', 'Zonas de envío'],
  ['rental', 'Renta'],
  ['events', 'Eventos y boletos'],
  ['customers', 'Clientes'],
  ['orders', 'Pedidos'],
  ['reviews', 'Reseñas'],
  ['staff', 'Personal'],
  ['jobs', 'Empleos'],
  ['billing', 'Plan y facturación'],
  ['messages', 'Mensajes'],
];

// Opener button texts worth trying per view (skipped when absent).
const OPENERS = ['Agregar platillo', 'Agregar servicio', 'Agregar producto', 'Agregar artículo', 'Crear evento', 'Agregar evento', 'Gestionar', 'Rentar', 'Publicar vacante', 'Invitar', 'Mejorar a Verified', 'Mejorar a Premium', 'Cambiar de plan', 'Country Loaf'];
const NEXT_LABELS = ['Siguiente', 'Continuar'];

let issues = 0;

async function check(page, name) {
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const pageOver = document.documentElement.scrollWidth - vw;
    const bad = [];
    // any visible element poking past the viewport horizontally
    document.querySelectorAll('main *, [class*="fixed"] *').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 24 || rect.height < 10) return;
      // ignore rows that scroll internally
      let n = el;
      let scrollable = false;
      while (n && n !== document.body) {
        const s = getComputedStyle(n);
        if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && n.scrollWidth > n.clientWidth) { scrollable = true; break; }
        if (s.overflowX === 'hidden' || s.overflowX === 'clip' || s.overflow === 'hidden') { scrollable = true; break; } // clipped decoration — not a real bleed
        n = n.parentElement;
      }
      if (scrollable) return;
      if (rect.right > vw + 3 || rect.left < -3) {
        bad.push(`${el.tagName}.${(el.className || '').toString().slice(0, 70)} L=${Math.round(rect.left)} R=${Math.round(rect.right)}`);
      }
    });
    // overlays (sheets/dialogs): inner horizontal scroll = clipped content
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
    await page.screenshot({ path: `${OUT}/FAIL-${name.replace(/[^a-z0-9-]/gi, '_')}.png`, fullPage: false });
  } else console.log(`[ok] ${name}`);
}

async function closeOverlays(page) {
  for (let i = 0; i < 3; i++) {
    const hasOverlay = await page.evaluate(() => {
      const els = [...document.querySelectorAll('div,aside')].filter((el) => {
        const cs = getComputedStyle(el);
        return cs.position === 'fixed' && parseInt(cs.zIndex || '0', 10) >= 40 && el.getBoundingClientRect().height > 120;
      });
      return els.length > 0;
    });
    if (!hasOverlay) return;
    const x = page.locator('button[aria-label="Cerrar"], button[aria-label="close"]').last();
    if (await x.isVisible().catch(() => false)) { await x.click().catch(() => {}); await page.waitForTimeout(250); continue; }
    // click backdrop top-left corner
    await page.mouse.click(6, 120).catch(() => {});
    await page.waitForTimeout(250);
  }
}

async function gotoTab(page, label) {
  await page.goto('http://127.0.0.1:4173/negocio/', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(500);
  if (!label) return true;
  await page.locator('button[aria-label="Menú"]').first().click().catch(() => {});
  await page.waitForTimeout(300);
  const it = page.locator(`button:has-text("${label}")`).last();
  if (!(await it.count())) return false;
  await it.click({ timeout: 2500 }).catch(() => {});
  await page.waitForTimeout(450);
  return true;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 392, height: 852 } });

  for (const [key, label] of TABS) {
    if (!(await gotoTab(page, label))) { console.log(`[skip] ${key} (nav item not found)`); continue; }
    await check(page, `${key}`);

    // 1) click through every chip in the first two horizontal chip rows
    const rows = await page.locator('main .no-scrollbar').all();
    let rowIdx = 0;
    for (const row of rows.slice(0, 3)) {
      const chips = await row.locator(':scope > button').all();
      if (chips.length < 2) continue;
      rowIdx++;
      for (let ci = 0; ci < Math.min(chips.length, 7); ci++) {
        await chips[ci].click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(190);
        await check(page, `${key}-row${rowIdx}-chip${ci}`);
        if (await page.evaluate(() => [...document.querySelectorAll("div,aside")].some((el) => { const cs = getComputedStyle(el); return cs.position === "fixed" && parseInt(cs.zIndex || "0", 10) >= 40 && el.getBoundingClientRect().height > 120; }))) await closeOverlays(page);
      }
    }

    // 2) try openers (sheets / wizards / detail views)
    for (const txt of OPENERS) {
      // click the first VISIBLE match (desktop-only hidden twins come first in DOM)
      const cands = page.locator(`main :text("${txt}")`);
      const nCands = await cands.count();
      if (!nCands) continue;
      let clicked = false;
      for (let bi = 0; bi < nCands; bi++) {
        if (await cands.nth(bi).isVisible().catch(() => false)) {
          await cands.nth(bi).click({ timeout: 1500 }).catch(() => {});
          clicked = true;
          break;
        }
      }
      if (!clicked) continue;
      await page.waitForTimeout(400);
      await check(page, `${key}-open-${txt.slice(0, 18)}`);
      // if a wizard: walk enabled Next buttons a few steps
      for (let s = 0; s < 6; s++) {
        let advanced = false;
        for (const nl of NEXT_LABELS) {
          const nx = page.locator(`button:has-text("${nl}")`).last();
          if ((await nx.count()) && (await nx.isEnabled().catch(() => false)) && (await nx.isVisible().catch(() => false))) {
            await nx.click({ timeout: 1200 }).catch(() => {});
            await page.waitForTimeout(300);
            await check(page, `${key}-open-${txt.slice(0, 12)}-step${s + 2}`);
            advanced = true;
            break;
          }
        }
        if (!advanced) break;
      }
      await closeOverlays(page);
      // reset view state fully before next opener
      await gotoTab(page, label);
    }
  }

  console.log(`\n=== AUDIT DONE — ${issues} violation state(s) ===`);
  await browser.close();
})();
