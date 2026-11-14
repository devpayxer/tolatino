const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano', P = '/panel/' + BIZ;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const shot = async (p, n, full = false) => { await p.waitForTimeout(600); await p.screenshot({ path: OUT + n, fullPage: full }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const espera = async (f, v) => { for (let i = 0; i < 40; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const MARISOL = "(select id from users where phone='+15705550122')";
const op = (n, c) => sql(`select ${c} from operations where number='${n}'`);
(async () => {
  // Delivery encendido: 3 mi, envío $3, gratis desde $40, mínimo $15, propina, efectivo al entregar con mi equipo.
  // Abierto ~22 h alrededor de la hora actual de la ciudad (que no caiga justo en el cierre).
  const H = Number(sql(`select extract(hour from now() at time zone 'America/New_York')::int`)), hh = (x) => String((x + 24) % 24).padStart(2, '0') + ':00';
  sql(`update business_hours set ranges='[["${hh(H - 2)}","${hh(H - 4)}"]]'::jsonb, open=true where business_id='${BIZ}' and module=''`);
  sql(`update menu_settings set pause_until = null where business_id='${BIZ}'`);
  sql(`update items set sold_out = false, stock_left = greatest(stock_left, stock_par), stock_day = null where business_id='${BIZ}' and id in (9,10,7,2)`);
  sql(`update delivery_settings set delivery=true, pickup=true, pay_cash_delivery=true, ask_tip=true, zone_mi=3, fee_cents=300, free_over_cents=4000, min_order_cents=1500, travel_min=15, last_delivery_min=0, who='team', external_app=null, auto_accept=false where business_id='${BIZ}'`);
  sql(`update businesses set modules_off = modules_off - 'delivery' where id='${BIZ}'`);
  sql(`update operations set status='cancelled' where user_id=${MARISOL} and status='pending'`);
  // Calles de prueba (en este contenedor no hay datos del Censo): una junto al negocio y otra a ~12 mi.
  sql(`delete from geo_streets where county = 'prueba'`);
  sql(`insert into geo_streets (name, norm, l_from, l_to, r_from, r_to, zip_l, zip_r, county, geom) values
    ('N Wyoming St', dir_abrev('N Wyoming St'), 401, 499, 400, 498, '18201', '18201', 'prueba', st_geomfromtext('LINESTRING(-75.9782 40.9540, -75.9782 40.9570)', 4326)),
    ('Main St', dir_abrev('Main St'), 1, 99, 2, 100, '18202', '18202', 'prueba', st_geomfromtext('LINESTRING(-76.2000 40.9600, -76.1990 40.9600)', 4326))`);
  sql(`update user_addresses set removed_at = now() where user_id = ${MARISOL} and removed_at is null`);
  sql(`insert into user_addresses (user_id, label, street, apt, zip, geo, geo_quality, city_id, is_default) values
    (${MARISOL}, 'casa', '420 N Wyoming St', 'Apt 2', '18201', st_setsrid(st_point(-75.9782, 40.9546), 4326)::geography, 'numero', 'hzl', true),
    (${MARISOL}, 'trabajo', '50 Main St', null, '18202', st_setsrid(st_point(-76.1995, 40.9600), 4326)::geography, 'numero', 'hzl', false)`);
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(m, 'cliente');
  await entrar(m, '5705550122');
  await m.goto(B + `/n/${BIZ}?tab=menu`); await m.evaluate(() => { localStorage.removeItem('tl-carrito-v1'); localStorage.removeItem('tl-modo-v1'); }); await m.reload();
  const tabs = await vis(m.getByRole('tablist').filter({ hasText: 'Delivery' }));
  ok(!!tabs && (await tabs.innerText()).includes('Delivery') && (await tabs.innerText()).includes('Pickup'), 'menú: Delivery / Pickup');
  ok(!!(await vis(m.getByText(/^LLEGA ENTRE/))), 'delivery primero: «LLEGA ENTRE …»');
  ok(!!(await vis(m.getByText('SOLO PICKUP'))), 'la Limonada dice SOLO PICKUP');
  // Mínimo de delivery: con Tostones ($5) no alcanza
  await (await vis(m.locator('[aria-label="Agregar"]').nth(0))) && null;
  await m.evaluate(() => localStorage.setItem('tl-carrito-v1', JSON.stringify({ 'sabor-dominicano': { at: Date.now(), lines: [{ id: '9', ch: {}, q: 1, nt: '', k: {} }] } })));
  await m.reload(); await m.locator('[data-screen-label="Ficha · barra del pedido"]').click();
  const cart = m.locator('[data-screen-label="Menú · tu pedido"]');
  await cart.getByText(/^Mínimo \$15\.00 · faltan \$10\.00$/).waitFor(); ok(true, 'carrito: «Mínimo $15.00 · faltan $10.00»');
  ok(await cart.getByText(/Delivery desde \$15\.00/).isVisible() && await cart.getByText('Envío').isVisible(), 'aviso del mínimo y fila de Envío');
  await shot(m, 'd1-carrito-minimo.png');
  // Con más platos pasa el mínimo
  await m.evaluate(() => localStorage.setItem('tl-carrito-v1', JSON.stringify({ 'sabor-dominicano': { at: Date.now(), lines: [{ id: '9', ch: {}, q: 2, nt: '', k: {} }, { id: '7', ch: {}, q: 1, nt: '', k: {} }] } })));
  await m.reload(); await m.locator('[data-screen-label="Ficha · barra del pedido"]').click();
  await cart.getByText(/Te faltan \$16\.00 para envío gratis\./).waitFor(); ok(true, 'barra de envío gratis: «Te faltan $16.00…»');
  await cart.getByText(/^Ir a pagar · \$28\.44$/).click(); await m.waitForURL(/\/pagar$/); ok(true, 'Ir a pagar · $28.44 (24 + 1.44 impuestos + 3 envío)');
  // Checkout de delivery
  await m.getByText('Casa · 420 N Wyoming St', { exact: true }).waitFor(); ok(true, 'checkout: ENTREGA en Casa · 420 N Wyoming St');
  ok(await m.getByText('CÓMO TE LO ENTREGAMOS').isVisible() && await m.getByText('PROPINA AL REPARTIDOR').isVisible(), 'cómo te lo entregamos y propina');
  await m.getByText('Dejar en la puerta').click(); await m.getByText('No toques el timbre').click();
  await m.locator('textarea').fill('Portón azul');
  await m.getByRole('button', { name: /^20%/ }).click();
  await shot(m, 'd2-checkout-delivery.png', true);
  ok(await m.locator('[data-screen-label="Checkout · barra"]').getByText(/^Enviar pedido · \$33\.24$/).isVisible(), 'total con propina 20% ($4.80): $33.24');
  await m.locator('[data-screen-label="Checkout · barra"]').getByText(/^Enviar pedido/).click(); await m.waitForURL(/\/pedido\/\d+$/);
  const n1 = m.url().split('/').pop();
  ok(op(n1, "mode||'|'||delivery_cents||'|'||tip_cents||'|'||total_cents||'|'||pay_mode") === 'delivery|300|480|3324|entrega', `pedido #${n1}: delivery, envío 300, propina 480, total 3324, efectivo al entregar`);
  ok(op(n1, "details->'to'->>'street'||'|'||(details->'drop'->>'drop')||'|'||(details->'drop'->>'note')") === '420 N Wyoming St|puerta|Portón azul', 'guarda a dónde y cómo se entrega');
  ok(sql(`select drop_pref->>'drop' from user_addresses where user_id=${MARISOL} and label='casa' and removed_at is null`) === 'puerta', '«Guardar para Casa»: la dirección recuerda «en la puerta»');
  ok(await m.getByText(/PAGAS \$33\.24 EN EFECTIVO AL RECIBIR/).first().isVisible() && await m.getByText('LLEGA').first().isVisible(), 'pedido: LLEGA y PAGAS EN EFECTIVO AL RECIBIR');
  await shot(m, 'd3-pedido-delivery.png', true);
  // Panel: aceptar, salió en camino, entregado
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(d, 'panel');
  await entrar(d, '5705550133'); await d.goto(B + P + `/hoy?det=ped:${n1}`); await d.getByText('ENTREGA', { exact: true }).first().waitFor();
  ok(await d.getByText('420 N Wyoming St, Apt 2').first().isVisible() && await d.getByText('Dejar en la puerta').first().isVisible(), 'panel: a dónde y «Dejar en la puerta»');
  await d.getByText('Aceptar', { exact: true }).last().click(); await d.getByText(/ya lo ve en su pedido/).waitFor();
  await d.getByText('Salió en camino').last().click(); await d.getByText(/ya ve que va en camino/).waitFor();
  ok(await espera(() => op(n1, "status||'|'||stage"), 'confirmed|on_the_way') === 'confirmed|on_the_way', 'Salió en camino → on_the_way');
  await shot(d, 'd4-panel-encamino.png');
  await m.reload(); ok(!!(await vis(m.getByText('En camino'))), 'el cliente ve «En camino»');
  await d.reload(); await d.getByText(`Pedido #${n1} · Delivery`).first().waitFor(); ok(await d.getByText('EN CAMINO', { exact: true }).first().isVisible(), 'Hoy: el delivery en camino sigue en la agenda');
  await d.getByText(`Pedido #${n1} · Delivery`).first().click();
  await d.getByText('Entregado', { exact: true }).last().click(); await d.getByText('Anotado · Entregado.').waitFor();
  ok(await espera(() => op(n1, "status||'|'||stage"), 'done|delivered') === 'done|delivered', 'Entregado → done/delivered');
  // Fuera de la zona: la predeterminada a ~12 mi
  sql(`update user_addresses set is_default = false where user_id=${MARISOL} and removed_at is null`); sql(`update user_addresses set is_default = true where user_id=${MARISOL} and removed_at is null and label = 'trabajo'`);
  await m.goto(B + `/n/${BIZ}?tab=menu`); await m.locator('[data-screen-label="Ficha · barra del pedido"]').click().catch(() => {});
  await m.evaluate(() => localStorage.setItem('tl-carrito-v1', JSON.stringify({ 'sabor-dominicano': { at: Date.now(), lines: [{ id: '7', ch: {}, q: 2, nt: '', k: {} }] } })));
  await m.reload(); await m.locator('[data-screen-label="Ficha · barra del pedido"]').click();
  await cart.getByText('No llega a tu dirección').waitFor(); ok(await cart.getByText(/lleva hasta 3 mi\. Pide pickup\./).isVisible(), 'fuera de la zona: «No llega a tu dirección»');
  // Cambia a Pickup y se puede
  await cart.getByRole('tab', { name: 'Pickup' }).click(); await cart.getByText(/^Ir a pagar · \$29\.68$/).waitFor(); ok(true, 'cambiando a Pickup se puede pedir (sin envío)');
  sql(`update user_addresses set is_default = false where user_id=${MARISOL} and removed_at is null`);
  sql(`update user_addresses set is_default = true where user_id=${MARISOL} and removed_at is null and label = 'casa'`);
  ok(err.length === 0, 'sin errores en consola: ' + err.join(' | '));
  sql(`delete from geo_streets where county = 'prueba'`);
  sql(`update delivery_settings set delivery=false, pay_cash_delivery=false where business_id='${BIZ}'`);
  sql(`update business_hours set ranges='[["11:00","21:00"]]'::jsonb where business_id='${BIZ}' and module=''`);
  await b.close(); console.log('OK');
})().catch(e => { console.error(e); try { execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -c "update delivery_settings set delivery=false, pay_cash_delivery=false where business_id='sabor-dominicano'; update business_hours set ranges='[[\\"11:00\\",\\"21:00\\"]]'::jsonb where business_id='sabor-dominicano' and module=''"`); } catch {} process.exit(1); });
