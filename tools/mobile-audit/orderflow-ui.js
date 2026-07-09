// TEMP audit: drive the REAL OrderFlow (design handoff "Ordenar") end-to-end from
// the Negocios LIST — the founder's exact path. Screenshots menu → item sheet →
// cart → checkout to SHOTS_DIR. Supabase relayed via curl (sandbox proxy).
// Usage: SESSION_JSON=<file> SHOTS_DIR=<dir> node orderflow-ui.js
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');

const BASE = 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS_DIR || '/tmp';
const session = JSON.parse(fs.readFileSync(process.env.SESSION_JSON, 'utf8'));

function curlRelay(req) {
  const args = ['-s', '-o', '-', '-w', '\n%{http_code}', '-X', req.method(), '--max-time', '20'];
  const h = req.headers();
  for (const k of ['apikey', 'authorization', 'content-type', 'prefer', 'accept', 'accept-profile', 'content-profile', 'x-client-info', 'range']) if (h[k]) args.push('-H', `${k}: ${h[k]}`);
  const body = req.postData();
  if (body != null) args.push('--data-binary', body);
  args.push(req.url());
  try { const out = execFileSync('curl', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }); const nl = out.lastIndexOf('\n'); return { status: parseInt(out.slice(nl + 1), 10) || 500, body: out.slice(0, nl) }; }
  catch (e) { return { status: 502, body: String(e).slice(0, 200) }; }
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 402, height: 852 } });
  const fail = async (m) => { await page.screenshot({ path: `${SHOTS}/of-FAIL.png` }); console.error('FAIL:', m); await browser.close(); process.exit(1); };
  await page.route('**://*.supabase.co/**', async (route) => { const { status, body } = curlRelay(route.request()); await route.fulfill({ status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body }); });
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.addInitScript(([s]) => {
    localStorage.setItem('sb-zpkaxojonufdwgahiqjh-auth-token', JSON.stringify(s));
    localStorage.setItem('tl.city', JSON.stringify({ label: 'Hazleton, PA', lat: 40.9584, lng: -75.9746, address: null, alat: null, alng: null, addressId: null }));
  }, [session]);

  await page.goto(`${BASE}/negocios/`, { waitUntil: 'domcontentloaded' });
  const card = page.getByText('El Sabor de Quisqueya').first();
  try { await card.waitFor({ timeout: 20000 }); } catch { return fail('El Sabor not in list'); }
  await card.click();

  // OrderFlow menu: hero → info → the restaurant name in the info card
  try { await page.getByText('Los más pedidos').first().waitFor({ timeout: 15000 }); } catch { return fail('OrderFlow menu (Los más pedidos) not shown — still BizDetail?'); }
  for (const t of ['Entrega', 'Recoger', 'Todos']) { if (!(await page.getByText(t, { exact: true }).first().isVisible())) return fail(`menu: "${t}" missing`); }
  if (!(await page.getByPlaceholder(/Buscar en/).first().isVisible())) return fail('menu: search missing');
  await page.screenshot({ path: `${SHOTS}/of-1-menu.png` });

  // scroll to a real dish and open the item sheet
  const dish = page.getByText('Mangú con los tres golpes').first();
  await dish.scrollIntoViewIfNeeded();
  await dish.click();
  try { await page.getByText('Instrucciones especiales').first().waitFor({ timeout: 8000 }); } catch { return fail('item sheet not shown'); }
  // at least one addon group visible (Obligatorio/Opcional pill)
  if (!(await page.getByText(/Obligatorio|Opcional/).first().isVisible())) return fail('item sheet: no addon groups');
  await page.getByPlaceholder(/sin cebolla/).fill('sin sal por favor');
  await page.screenshot({ path: `${SHOTS}/of-2-item.png` });
  // Add N
  await page.getByRole('button', { name: /Agregar 1|Agregar 2/ }).click();

  // cart bar → cart
  await page.getByRole('button', { name: /Ver carrito/ }).click();
  try { await page.getByText('Tu carrito').first().waitFor({ timeout: 8000 }); } catch { return fail('cart view not shown'); }
  for (const t of ['¿Se te antoja algo más?', 'Ir a pagar']) { if (!(await page.getByText(t, { exact: false }).first().isVisible())) return fail(`cart: "${t}" missing`); }
  if (!(await page.getByPlaceholder(/promocional/).first().isVisible())) return fail('cart: promo input missing');
  await page.screenshot({ path: `${SHOTS}/of-3-cart.png` });

  // checkout
  await page.getByRole('button', { name: /Ir a pagar/ }).click();
  try { await page.getByText('Resumen del cobro').first().waitFor({ timeout: 8000 }); } catch { return fail('checkout not shown'); }
  for (const t of ['Método de pago', 'Propina para el repartidor', 'Realizar pedido']) { if (!(await page.getByText(t).first().isVisible())) return fail(`checkout: "${t}" missing`); }
  const total = (await page.getByRole('button', { name: /Realizar pedido/ }).textContent())?.replace(/\s+/g, ' ').trim();
  await page.screenshot({ path: `${SHOTS}/of-4-checkout.png` });

  console.log('OK — OrderFlow verified from the list. Checkout CTA:', total);
  await browser.close();
})();
