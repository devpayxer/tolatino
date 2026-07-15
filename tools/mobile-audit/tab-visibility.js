// tab-visibility.js — verify the GLOBAL rule (2026-07-15): a consumer listing tab
// appears ONLY when the owner activated that module AND it holds real content.
// Opens 4 real businesses and asserts the exact tab set on each.
//   Barbería  → services(8)+updates(3) only  → Overview,Novedades,Servicios,Relacionados,Reseñas
//   Bodega    → products(300), no updates     → Overview,Tienda,Relacionados,Reseñas
//   El Sabor  → menu(150)+updates(1)          → Overview,Novedades,Menú,Relacionados,Reseñas
//   Muebles   → products(48)+updates(3)       → Overview,Novedades,Tienda,Relacionados,Reseñas
// None may show Equipo (staff removed) or a tab for an empty/off module.
// Usage: SHOTS_DIR=<dir> node tab-visibility.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
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

const CASES = [
  { slug: 'hz-barberia-primera', name: 'Barbería', expect: ['Resumen', 'Novedades', 'Servicios', 'Relacionados', 'Reseñas'] },
  { slug: 'hz-bodega-bendicion', name: 'Bodega', expect: ['Resumen', 'Tienda', 'Relacionados', 'Reseñas'] },
  { slug: 'hz-sabor-quisqueya', name: 'El Sabor', expect: ['Resumen', 'Novedades', 'Menú', 'Relacionados', 'Reseñas'] },
  { slug: 'hz-muebles-encanto', name: 'Muebles', expect: ['Resumen', 'Novedades', 'Tienda', 'Relacionados', 'Reseñas'] },
];
const FORBIDDEN_EVER = ['Equipo']; // staff tab removed entirely

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', () => {});
  await page.route('**://*.supabase.co/**', async (route) => { const { status, body } = await curlRelay(route.request()); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://js.stripe.com/**', (r) => r.abort());

  let failed = 0;
  for (const c of CASES) {
    await page.goto(`${BASE}/negocios/?b=${c.slug}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000); // let all module fetches resolve
    // The tab-bar buttons are the only ones with a border-b-[2.5px] underline class.
    const labels = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('button').forEach((b) => {
        if (/border-b-\[2\.5px\]/.test(b.className)) out.push(b.textContent.trim());
      });
      return out;
    });
    await page.screenshot({ path: `${SHOTS}/tabs-${c.name.replace(/[^a-z0-9]/gi, '_')}.png`, fullPage: false }).catch(() => {});
    const got = labels.filter(Boolean);
    const missing = c.expect.filter((t) => !got.includes(t));
    const extra = got.filter((t) => !c.expect.includes(t));
    const forbidden = got.filter((t) => FORBIDDEN_EVER.includes(t));
    const ok = missing.length === 0 && extra.length === 0 && forbidden.length === 0;
    if (!ok) failed++;
    console.log(`${ok ? '[ok]  ' : '[FAIL]'} ${c.name.padEnd(9)} tabs=[${got.join(', ')}]${missing.length ? ` MISSING=[${missing}]` : ''}${extra.length ? ` EXTRA=[${extra}]` : ''}${forbidden.length ? ` FORBIDDEN=[${forbidden}]` : ''}`);
  }
  await browser.close();
  console.log(failed === 0 ? '\nALL PASS ✓' : `\n${failed} case(s) FAILED`);
  process.exit(failed === 0 ? 0 : 1);
})();
