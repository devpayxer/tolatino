// 4o · Ficha de Mercados: Productos con /lb y «SE COBRA LO QUE PESE», hoja con «¿Cuánto? · estimado» y el corte, carrito de un
// mercado a la vez (se reemplaza al agregar en otro), 21+ y agotado hoy no se agregan, «¿Lo pesan delante de ti?» y 4 pasos.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', M = 'supermercado-la-cosecha', M2 = 'carniceria-el-cibao';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const verV = async (l) => { for (let i = 0; i < 60; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
(async () => {
  sql(`update items set sold_out = true, sold_out_until = 'hoy', sold_out_at = now() where business_id = '${M}' and name->>'es' = 'Yuca'`);
  sql(`update items set price_cents = 249 where business_id = '${M}' and name->>'es' = 'Pierna de cerdo'`);
  sql(`update retail_settings set ebt = true, weighs_front = true where business_id = '${M}'`);
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(), d = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  for (const p of [m, d]) { p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); }
  await m.goto(B + `/n/${M}`); await verV(m.getByText('¿LO PESAN DELANTE DE TI?'));
  ok(!!(await vis(m.getByText('Sí: la balanza está de frente al cliente'))), 'Resumen: «Sí: la balanza está de frente al cliente»');
  ok(!!(await vis(m.getByText('Cómo se cobra lo que va por peso'))), 'Resumen: cómo se cobra lo que va por peso (4 pasos)');
  await m.screenshot({ path: OUT + 'r1-ficha-mercado-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Productos' }).or(m.getByRole('tab', { name: 'Productos' })));
  await verV(m.getByText('CARNICERÍA', { exact: true }));
  ok(!!(await vis(m.getByText('$2.49/lb').first())) && !!(await vis(m.getByText(/SE COBRA LO QUE PESE/).first())), 'Productos: $2.49/lb · SE COBRA LO QUE PESE');
  ok(!!(await vis(m.getByText(/SE ACABÓ HOY/).first())), 'la yuca: SE ACABÓ HOY');
  ok(!!(await vis(m.getByText(/Acepta EBT \/ SNAP en la tienda/))), 'nota: acepta EBT');
  await clic(m.getByText('Pierna de cerdo', { exact: true }));
  await verV(m.getByText('¿Cuánto? · estimado')); await clic(m.getByRole('radio', { name: /3 lb/ })); await clic(m.getByRole('radio', { name: 'En trozos' }));
  ok(!!(await vis(m.getByText(/Se retiene \$8\.22 y se cobra lo que pese/))), 'hoja: 3 lb ≈ $7.47 · se retiene $8.22 (estimado + 10 %)');
  await m.screenshot({ path: OUT + 'r2-hoja-lb-m.png' });
  await clic(m.getByRole('button', { name: 'Agregar al pedido' }));
  await verV(m.getByText(/TU PEDIDO · 1 ARTÍCULO/)); ok(!!(await vis(m.getByText('Estimado $7.47').first())), 'Tu pedido: 1 artículo · estimado $7.47');
  const ron = await vis(m.getByText('Ron añejo', { exact: true }));
  if (ron) { await ron.click(); await verV(m.getByText(/21\+ con ID: se compra en la tienda/)); ok(true, '21+: solo en la tienda, sin agregar'); await clic(m.getByRole('button', { name: 'Cerrar' })); }
  // Otro mercado: se reemplaza.
  await m.goto(B + `/n/${M2}?tab=svc`); const primero = m.getByRole('button', { name: 'Agregar' }).first();
  await clic(primero); await verV(m.getByText(/Tienes un pedido en otro mercado; si agregas aquí, se reemplaza/)); ok(true, 'otro mercado: «si agregas aquí, se reemplaza»');
  await clic(m.getByRole('button', { name: 'Agregar al pedido' }));
  const cart = await m.evaluate(() => JSON.parse(localStorage.getItem('tl-mercado') || 'null'));
  ok(cart && cart.biz === 'carniceria-el-cibao' && cart.lines.length === 1, 'el carrito quedó solo con el otro mercado');
  // Escritorio
  await d.goto(B + `/n/${M}?tab=svc`); await verV(d.getByText('Pide para pickup')); ok(!!(await vis(d.getByText('EBT · tarjeta · efectivo'))), 'escritorio: riel con pickup, envío y pago');
  await d.screenshot({ path: OUT + 'r3-productos-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK merc4o');
})().catch((e) => { console.error(e); process.exit(1); });
