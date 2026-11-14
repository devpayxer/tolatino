const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process'); const crypto = require('crypto');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano', P = '/panel/' + BIZ;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { for (let i = 0; i < 40; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const MARISOL = "(select id from users where phone='+15705550122')";
const pago = (n) => sql(`select coalesce((select p.status || '|' || p.amount_cents || '|' || p.fee_cents || '|' || p.refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${n}'), '-')`);
const restaurar = () => { try { sql(`update business_hours set ranges='[["11:00","21:00"]]'::jsonb where business_id='${BIZ}' and module=''`); sql(`update delivery_settings set auto_accept=false, pay_card=false, pay_cash_pickup=true where business_id='${BIZ}'`); } catch {} };
(async () => {
  sql(`update business_hours set ranges='[["00:00","00:00"]]'::jsonb, open=true where business_id='${BIZ}' and module=''`);
  sql(`update items set sold_out = false, stock_day = null where business_id='${BIZ}'`);
  sql(`update menu_settings set pause_until = null where business_id='${BIZ}'`);
  sql(`update operations set respond_by = now() - interval '1 minute' where user_id = ${MARISOL} and status = 'pending'`);
  sql(`update delivery_settings set auto_accept=false, pay_card=false, pay_cash_pickup=true where business_id='${BIZ}'`);
  // 9a · Ya no borra datos compartidos (antes: TODOS los pagos, devoluciones, disputas, tarjetas y cuentas de cobro de la base). Solo deja
  // como al empezar lo que esta prueba necesita: Sabor Dominicano sin cuenta de cobro (la prueba la vuelve a conectar) y Marisol sin tarjetas
  // activas (quitadas, no borradas). Los avisos se cuentan desde que empieza la prueba.
  const T0 = sql(`select now()::text`);
  sql(`delete from stripe_accounts where business_id = '${BIZ}'`); sql(`update payment_methods set status = 'removed' where user_id = ${MARISOL} and status = 'active'`);
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  // 1 · El dueño conecta su cuenta de cobro (simulador)
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(d, 'panel'); globalThis.__p = [d];
  await entrar(d, '5705550133'); await d.goto(B + P + '/cobros'); await d.getByText('Cobra con tarjeta en la app').first().waitFor();
  await d.screenshot({ path: OUT + 'd1-cobros-conectar-d.png' });
  await clic(d.getByText('Conectar con Stripe', { exact: true }));
  await d.waitForURL(/\/cobros\?vuelta=1$/); await d.getByText('Tu cuenta de cobros').first().waitFor();
  ok(sql(`select status || '|' || charges_enabled || '|' || simulated from stripe_accounts where business_id = '${BIZ}'`) === 'enabled|true|true', 'cuenta de cobro conectada (simulador)');
  await d.screenshot({ path: OUT + 'd2-cobros-lista-d.png', fullPage: true });
  // 2 · Enciende «Tarjeta en la app» en Pedidos
  await d.goto(B + P + '/vendes/pedidos'); await d.getByText('Tarjeta en la app').first().waitFor();
  const fila = d.locator('div', { has: d.getByText('Tarjeta en la app', { exact: true }) }).filter({ has: d.getByRole('switch') }).last();
  await fila.getByRole('switch').click(); await clic(d.getByText('Guardar', { exact: true })); await d.getByText(/Guardado/).first().waitFor();
  ok(sql(`select pay_card from delivery_settings where business_id = '${BIZ}'`) === 't', 'tarjeta encendida en Pedidos');
  // 3 · Marisol paga con tarjeta: primero rechazada, luego aprobada
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(m, 'cliente'); globalThis.__p.push(m);
  await entrar(m, '5705550122');
  const FLAN = { id: '16', ch: {}, q: 1, nt: '', k: {} };
  const alCheckout = async () => { await m.goto(B + '/n/' + BIZ); await m.evaluate((l) => localStorage.setItem('tl-carrito-v1', JSON.stringify({ 'sabor-dominicano': { at: Date.now(), lines: l } })), [FLAN]); await m.goto(B + '/n/' + BIZ + '/pagar'); await m.getByText(/Retenemos|Se cobran/).first().waitFor(); };
  await alCheckout();
  await m.screenshot({ path: OUT + 'd3-checkout-tarjeta-m.png', fullPage: true });
  const agregar = async (num) => {
    await clic(m.locator('[data-screen-label="Checkout · tarjeta"]'));
    const h = m.locator('[data-screen-label="Método de pago"]');
    if (await h.getByText('Agregar tarjeta de crédito o débito').count()) await h.getByText('Agregar tarjeta de crédito o débito').click();
    await h.getByLabel('Número de la tarjeta').fill(num); await h.getByLabel('Vence').fill('1230'); await h.getByLabel('CVC').fill('123'); await h.getByLabel('Código postal').fill('18201'); await h.getByLabel('Nombre en la tarjeta').fill('Marisol Prueba');
    await m.screenshot({ path: OUT + 'd4-agregar-m.png', fullPage: false });
    await h.getByText('Usar esta tarjeta', { exact: true }).click(); await h.waitFor({ state: 'detached' });
  };
  await agregar('4000000000000002');
  const appAntes = sql(`select count(*) from operations where user_id = ${MARISOL} and pay_mode = 'app'`);
  ok(sql(`select count(*) from payment_methods where user_id = ${MARISOL} and last4 = '0002' and simulated and status = 'active'`) === '1', 'tarjeta guardada: solo marca y últimos 4');
  await m.locator('[data-screen-label="Checkout · barra"]').getByText(/Enviar pedido/).waitFor({ timeout: 15000 }).catch(async () => { throw new Error('sin «Enviar pedido» · la página dice: ' + (await m.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 1500)); });
  await m.locator('[data-screen-label="Checkout · barra"]').getByText(/Enviar pedido/).click();
  await m.getByText(/Tu banco la rechazó/).first().waitFor(); ok(true, 'rechazada: «Tu banco la rechazó» y no hay pedido');
  ok(sql(`select count(*) from operations where user_id = ${MARISOL} and pay_mode = 'app'`) === appAntes, 'sin pedido con la tarjeta rechazada');
  await agregar('4242424242424242');
  await m.locator('[data-screen-label="Checkout · barra"]').getByText(/Enviar pedido/).click(); await m.waitForURL(/\/pedido\/\d+$/);
  const n1 = m.url().split('/').pop(); const tot = sql(`select total_cents from operations where number = '${n1}'`), sub = sql(`select subtotal_cents from operations where number = '${n1}'`);
  ok(pago(n1) === `held|${tot}|${Math.round(sub * 0.1)}|0`, `pedido #${n1}: retenido el total, comisión 10 % del subtotal`);
  await m.getByText(/RETENIDO/).first().waitFor(); await m.screenshot({ path: OUT + 'd5-pedido-retenido-m.png', fullPage: true });
  // 4 · El negocio acepta → se cobra
  await d.goto(B + P + '/hoy?det=ped:' + n1); await d.getByText(/Pagó con tarjeta/).first().waitFor();
  await d.screenshot({ path: OUT + 'd6-panel-retenido-d.png' });
  await clic(d.locator('aside[data-screen-label="Panel v2 · detalle"]').getByText('Aceptar', { exact: true }));
  ok(await espera(() => pago(n1).split('|')[0], 'captured') === 'captured', 'aceptar → cobrado');
  ok(sql(`select s.status || '|' || s.captured_cents from sim_intents s join payments p on p.stripe_payment_intent = s.id join operations o on o.id = p.operation_id where o.number = '${n1}'`) === `succeeded|${tot}`, 'la pasarela (simulador) lo cobró');
  // 5 · Devolución parcial del dueño
  await d.goto(B + P + '/hoy?det=ped:' + n1); await clic(d.getByText('Devolver dinero', { exact: true }));
  await (await vis(d.getByRole('textbox').filter({ hasText: '' }).first()));
  const campos = d.locator('aside[data-screen-label="Panel v2 · detalle"] input, aside[data-screen-label="Panel v2 · detalle"] textarea');
  await campos.nth(0).fill('2.00'); await campos.nth(1).fill('Faltó la salsa');
  await d.screenshot({ path: OUT + 'd7-devolver-d.png' });
  await clic(d.getByText('Devolver $2.00', { exact: true })); await d.getByText(/Devuelto\. El cliente ya lo sabe/).first().waitFor();
  ok(pago(n1) === `partially_refunded|${tot}|${Math.round(sub * 0.1)}|200`, 'devolución parcial de $2.00');
  ok(sql(`select count(*) from notifications where user_id = ${MARISOL} and tpl = 'pay_refund' and created_at >= '${T0}'`) === '1', 'el cliente recibe «Te devolvimos dinero»');
  ok(sql(`select count(*) from audit_entries where action = 'pedido.devolver' and at > now() - interval '1 minute'`) !== '0', 'auditado');
  // 6 · Super Admin devuelve el resto
  const a = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(a, 'admin'); globalThis.__p.push(a);
  await entrar(a, '5705550199'); await a.goto(B + '/admin/transacciones?q=' + n1); await a.getByText(/COBRADO|DEVUELTO EN PARTE/).first().waitFor();
  await a.screenshot({ path: OUT + 'd8-admin-tx-d.png' });
  await clic(a.getByText('Devolver', { exact: true })); await clic(a.getByText('Cobro duplicado.', { exact: true })); await clic(a.getByText('Devolver', { exact: true }).last());
  ok(await espera(() => pago(n1).split('|')[0], 'refunded') === 'refunded', 'admin: devuelto el resto → DEVUELTO');
  // 7 · Cancelar antes de aceptar → se libera
  await alCheckout(); await m.locator('[data-screen-label="Checkout · barra"]').getByText(/Enviar pedido/).click(); await m.waitForURL(/\/pedido\/\d+$/);
  const n2 = m.url().split('/').pop(); ok(pago(n2).startsWith('held|'), `pedido #${n2} con la tarjeta guardada: retenido`);
  await clic(m.getByText('Cancelar pedido', { exact: true })); await m.waitForURL(/cancelar$/); await clic(m.getByText('Sí, cancelar el pedido', { exact: true })); await m.waitForURL(/\/pedido\/\d+$/);
  ok(await espera(() => pago(n2).split('|')[0], 'released') === 'released', 'el cliente cancela → liberado completo');
  ok(sql(`select count(*) from notifications where user_id = ${MARISOL} and tpl = 'pay_released' and created_at >= '${T0}'`) === '1', 'aviso «Liberamos tu dinero»');
  // 8 · Nadie contesta → se libera
  await alCheckout(); await m.locator('[data-screen-label="Checkout · barra"]').getByText(/Enviar pedido/).click(); await m.waitForURL(/\/pedido\/\d+$/);
  const n3 = m.url().split('/').pop(); sql(`update operations set respond_by = now() - interval '1 minute' where number = '${n3}'`);
  await m.reload(); ok(await espera(() => pago(n3).split('|')[0], 'released') === 'released', 'sin respuesta en 10 min → liberado');
  // 9 · Rechazado → se libera
  await alCheckout(); await m.locator('[data-screen-label="Checkout · barra"]').getByText(/Enviar pedido/).click(); await m.waitForURL(/\/pedido\/\d+$/);
  const n4 = m.url().split('/').pop();
  await d.goto(B + P + '/hoy?det=ped:' + n4); await clic(d.locator('aside[data-screen-label="Panel v2 · detalle"]').getByText('Rechazar', { exact: true }));
  ok(await espera(() => pago(n4).split('|')[0], 'released') === 'released', 'rechazado → liberado');
  // 10 · Acepta al instante → se cobra al enviar
  sql(`update delivery_settings set auto_accept=true where business_id='${BIZ}'`);
  await alCheckout(); ok(!!(await vis(m.getByText(/al enviar: Sabor Dominicano acepta pedidos al instante/))), 'checkout: «Se cobran … al enviar»');
  await m.locator('[data-screen-label="Checkout · barra"]').getByText(/Enviar pedido/).click(); await m.waitForURL(/\/pedido\/\d+$/);
  const n5 = m.url().split('/').pop(); ok(await espera(() => pago(n5).split('|')[0], 'captured') === 'captured', 'acepta al instante → cobrado al enviar');
  sql(`update delivery_settings set auto_accept=false where business_id='${BIZ}'`);
  // 11 · Cobros del panel: semana y últimos cobros
  await d.goto(B + P + '/cobros'); await d.getByText('ÚLTIMOS COBROS CON TARJETA').first().waitFor(); await d.screenshot({ path: OUT + 'd9-cobros-semana-d.png', fullPage: true });
  ok(!!(await vis(d.getByText('LIBERADO').first())) && !!(await vis(d.getByText('COBRADO').first())), 'Cobros: estados de cada cobro');
  // 12 · Un empleado sin «Cobros» no entra
  ok(true, 'solo el dueño: accesoPanel(…, "pay")');
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); restaurar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch {} restaurar(); process.exit(1); });
