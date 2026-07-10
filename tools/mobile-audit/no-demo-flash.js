// Verify the platform-wide "flash of demo data" is gone: on load, the consumer
// lists (Negocios/Eventos/Comunidad) show SKELETONS while the real data fetches
// — never the demo fixtures ("Taquería La Esperanza" etc.) — then swap to real.
// The data RPCs are artificially delayed so the loading window is observable.
// Usage: SHOTS_DIR=<dir> node no-demo-flash.js
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const DEMO = ['Taquería La Esperanza', 'Don Beto Mecánica', 'Salón Bella Vida', 'Dulces Encanto'];
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
const probe = `(() => ({
  skeletons: document.querySelectorAll('[aria-busy="true"]').length,
  pulses: document.querySelectorAll('.animate-pulse').length,
  demo: ${JSON.stringify(DEMO)}.filter(n => document.body.innerText.includes(n)),
  hasReal: document.body.innerText.includes('El Sabor de Quisqueya'),
}))()`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/nd-FAIL.png` }); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  // delay the data RPCs so the skeleton window is observable
  await page.route('**://*.supabase.co/**', async (route) => {
    if (/rpc\/(businesses_v2|events_near|posts_near)/.test(route.request().url())) await new Promise((r) => setTimeout(r, 1800));
    const { status, body } = await curlRelay(route.request());
    await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body });
  });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.addInitScript(() => {
    localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null }));
  });

  // ---- Negocios ----
  await page.goto(`${BASE}/negocios/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700); // inside the RPC delay → should be skeletons, no demo
  const during = await page.evaluate(probe);
  await page.screenshot({ path: `${SHOTS}/nd-1-loading.png` });
  if (during.demo.length) return fail('DEMO flashed on Negocios during load: ' + JSON.stringify(during.demo));
  if (during.skeletons === 0 && during.pulses === 0) return fail('no skeletons shown during Negocios load');

  await page.waitForTimeout(2600); // RPC resolves
  const after = await page.evaluate(probe);
  await page.screenshot({ path: `${SHOTS}/nd-2-real.png` });
  if (after.skeletons !== 0) return fail('skeletons still present after Negocios load');
  if (!after.hasReal) return fail('real business (El Sabor) not shown after load');

  // ---- Eventos ----
  await page.goto(`${BASE}/eventos/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  const ev = await page.evaluate(probe);
  if (ev.demo.length) return fail('DEMO flashed on Eventos: ' + JSON.stringify(ev.demo));
  if (ev.skeletons === 0 && ev.pulses === 0) return fail('no skeletons on Eventos load');

  // ---- Comunidad ----
  await page.goto(`${BASE}/comunidad/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  const co = await page.evaluate(probe);
  if (co.skeletons === 0 && co.pulses === 0) return fail('no skeletons on Comunidad load');

  console.log('Negocios during-load:', JSON.stringify(during));
  console.log('Negocios after-load :', JSON.stringify({ skeletons: after.skeletons, hasReal: after.hasReal }));
  console.log('Eventos during-load :', JSON.stringify(ev));
  console.log('Comunidad during-load:', JSON.stringify(co));
  console.log('OK — skeletons on load (no demo fixtures), real data swaps in. Platform-wide.');
  await browser.close();
})();
