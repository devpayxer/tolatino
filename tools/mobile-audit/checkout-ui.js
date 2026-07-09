// TEMP audit: drive the REAL consumer checkout UI end-to-end from the Negocios
// LIST (not a deep link) — the exact path the founder uses. Verifies the menu
// tabs/badges, the item modal (instructions), and the DoorDash-grade cart
// (Entrega/Recoger, dirección, propina, desglose, Pagar). Screenshots to SHOTS_DIR.
//
// Chromium can't do TLS through the sandbox's MITM proxy, so ALL supabase.co
// traffic is route-intercepted and relayed via curl (which honors the proxy+CA).
// Usage: SESSION_JSON=<file> node checkout-ui.js
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');

const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const session = JSON.parse(fs.readFileSync(process.env.SESSION_JSON, 'utf8'));

// Relay one browser request to Supabase through curl. Returns {status, body}.
function curlRelay(req) {
  const args = ['-s', '-o', '-', '-w', '\n%{http_code}', '-X', req.method(), '--max-time', '20'];
  const h = req.headers();
  for (const k of ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info', 'range']) {
    if (h[k]) args.push('-H', `${k}: ${h[k]}`);
  }
  const body = req.postData();
  if (body != null) args.push('--data-binary', body);
  args.push(req.url());
  try {
    const out = execFileSync('curl', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    const nl = out.lastIndexOf('\n');
    return { status: parseInt(out.slice(nl + 1), 10) || 500, body: out.slice(0, nl) };
  } catch (e) {
    return { status: 502, body: String(e).slice(0, 200) };
  }
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // mobile-first
  const fail = async (msg) => {
    await page.screenshot({ path: `${SHOTS}/ui-FAIL.png` });
    console.error('FAIL:', msg);
    await browser.close();
    process.exit(1);
  };

  // Relay Supabase REST through curl; silence blocked third parties (fonts).
  await page.route('**://*.supabase.co/**', async (route) => {
    const { status, body } = curlRelay(route.request());
    await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body });
  });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());

  // Session + city BEFORE any app code runs.
  await page.addInitScript(([sess]) => {
    localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(sess));
    localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null }));
  }, [session]);

  await page.goto(`${BASE}/negocios/`, { waitUntil: 'domcontentloaded' });

  // 1) open El Sabor FROM THE LIST
  const card = page.getByText('El Sabor de Quisqueya').first();
  try { await card.waitFor({ timeout: 20000 }); } catch { return fail('El Sabor not in the list feed'); }
  await card.click();

  // 2) Menú tab
  const menuTab = page.getByRole('button', { name: 'Menú', exact: true }).first();
  try { await menuTab.waitFor({ timeout: 10000 }); } catch { return fail('Menú tab not found'); }
  await menuTab.click();

  // hydration → badges + category chips + popular section
  try { await page.getByText('Entrega $2.99').first().waitFor({ timeout: 15000 }); } catch { return fail('delivery badge (hydration) missing'); }
  if (!(await page.getByText('⭐ Populares').first().isVisible())) return fail('Populares chip missing');
  if (!(await page.getByText('Mangú con los tres golpes').first().isVisible())) return fail('menu item missing');
  await page.screenshot({ path: `${SHOTS}/ui-1-menu.png` });

  // 3) item modal: qty 2 (clears the $12 delivery minimum) + special instructions
  await page.getByText('Mangú con los tres golpes').first().click();
  try { await page.getByText('Instrucciones especiales').first().waitFor({ timeout: 8000 }); } catch { return fail('item modal / instructions field missing'); }
  await page.getByPlaceholder(/sin cebolla/).fill('sin cebolla por favor');
  // qty stepper: the modal's "+" bumps quantity
  await page.getByRole('button', { name: '+', exact: true }).last().click();
  await page.screenshot({ path: `${SHOTS}/ui-2-item.png` });
  await page.getByRole('button', { name: /Agregar 2/ }).click();

  // 4) cart bar → cart sheet
  await page.getByText(/Ver carrito/).click();
  try { await page.getByText('Propina para el repartidor').first().waitFor({ timeout: 8000 }); } catch { return fail('cart: tip section missing (old cart rendered!)'); }
  for (const t of ['Tarifa de entrega', 'Tarifa de servicio (5%)', 'sin cebolla']) {
    if (!(await page.getByText(t).first().isVisible())) return fail(`cart: "${t}" missing`);
  }
  if (!(await page.getByText('Elige tu dirección').first().isVisible())) return fail('cart: address CTA missing');
  await page.screenshot({ path: `${SHOTS}/ui-3-cart.png` });

  // 5) address picker view (empty state + new-address CTA)
  await page.getByText('Elige tu dirección de entrega').first().click();
  try { await page.getByText('Aún no tienes direcciones guardadas').first().waitFor({ timeout: 6000 }); } catch { return fail('address picker empty state missing'); }
  if (!(await page.getByText('+ Nueva dirección').first().isVisible())) return fail('new-address CTA missing');
  await page.screenshot({ path: `${SHOTS}/ui-4-address.png` });

  // 6) close the sheet (backdrop) → reopen → switch to Recoger → Pagar arms
  await page.mouse.click(10, 100);
  await page.getByText(/Ver carrito/).click();
  await page.getByRole('button', { name: /Recoger/ }).first().click();
  const pagar = page.getByRole('button', { name: /Pagar · \$/ }).first();
  try { await pagar.waitFor({ timeout: 6000 }); } catch { return fail('Pagar button not armed on pickup'); }
  const label = (await pagar.textContent())?.trim();
  await page.screenshot({ path: `${SHOTS}/ui-5-pickup.png` });

  console.log('OK — full new checkout UI verified from the LIST path. Pagar label:', label);
  await browser.close();
})();
