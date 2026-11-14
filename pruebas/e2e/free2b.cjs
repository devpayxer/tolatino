const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const B = 'http://localhost:3100', N = '/n/sabor-dominicano', BIZ = 'sabor-dominicano', OUT = ENT.S + '/cap/';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const restaurar = () => { sql(`update business_hours set ranges='[["11:00","21:00"]]'::jsonb where business_id='${BIZ}' and module=''`); sql(`update business_stats_cache set plan='pro' where business_id='${BIZ}'`); sql(`update platform_config set value='10' where key='free_ops_cap'`); };
(async () => {
  sql(`update business_hours set ranges='[["00:00","00:00"]]'::jsonb where business_id='${BIZ}' and module=''`);
  sql(`update operations set respond_by = now() - interval '1 minute' where status='pending'`);
  sql(`update business_stats_cache set plan='free' where business_id='${BIZ}'`);
  const usados = +sql(`select count(*) from operations where business_id='${BIZ}' and free_quota_month = to_char(now() at time zone 'America/New_York','YYYY-MM')`);
  sql(`update platform_config set value='${usados + 1}' where key='free_ops_cap'`);
  const b = await chromium.launch(); const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
  await m.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(m, '/api/cuenta/codigo', { telefono: '5705550122' }); await api(m, '/api/cuenta/verificar', { telefono: '5705550122', codigo: a.codigoPrueba });
  const cart = (id, ch = {}) => m.evaluate(([id, ch]) => { localStorage.setItem('tl-modo-v1', JSON.stringify({ 'sabor-dominicano': 'pickup' })); localStorage.setItem('tl-carrito-v1', JSON.stringify({ 'sabor-dominicano': { at: Date.now(), lines: [{ id, ch, q: 1, nt: '', k: {} }] } })); }, [id, ch]); /* 9b-1 · Pickup a propósito: sin elegir, sale el primer modo del negocio (Delivery si otra prueba lo encendió) */
  // Free: el plato 9 (Tostones) no está entre los 5 primeros → el servidor no lo acepta aunque venga en el carrito
  await m.goto(B + N); await cart('9'); await m.goto(B + N + '/pagar');
  ok(await m.getByText('Tu pedido está vacío').isVisible(), 'Free: un plato fuera de los 5 se cae del carrito');
  // Plato 7 (Chicharrón de cerdo, De la casa, sin opciones) — entre los 5 primeros
  const cinco = sql(`select string_agg(i.id::text, ',' order by s.sort, s.id, i.sort, i.id) from items i join item_sections s on s.id=i.section_id where i.business_id='${BIZ}' and i.removed_at is null and i.status='live' and s.visible and s.removed_at is null`).split(',').slice(0, 5);
  console.log('  los 5 de Free:', cinco.join(','));
  const sin = '5', CH = { '5': [0], '6': [0] }; ok(cinco.includes(sin), 'el mofongo está entre los 5');
  await cart(sin, CH); await m.goto(B + N + '/pagar'); await m.locator('[data-screen-label="Checkout · barra"]').getByText(/Enviar pedido/).click();
  await m.waitForURL(/\/pedido\/\d+$/); const num = m.url().split('/').pop();
  ok(/^\d{4}-\d{2}$/.test(sql(`select free_quota_month from operations where number='${num}'`)), 'Free: el pedido #' + num + ' cuenta para el techo del mes');
  await m.goto(B + N); await cart(sin, CH); await m.goto(B + N + '/pagar');
  ok(await m.locator('[data-screen-label="Checkout · no se pudo enviar"]').isVisible(), 'Free con el techo lleno: el pago avisa y no deja enviar');
  await m.screenshot({ path: OUT + 'b21-free-tope-pagar-m.png' });
  // Y el servidor lo rechaza aunque la pantalla insista (llamada directa a la acción vía el botón deshabilitado no es posible: se prueba el SQL del techo)
  const tras = +sql(`select count(*) from operations where business_id='${BIZ}' and free_quota_month = to_char(now() at time zone 'America/New_York','YYYY-MM')`);
  ok(tras === usados + 1, `techo: ${tras} de ${usados + 1}`);
  // Panel del dueño: el aviso Free cuenta los pedidos reales
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await d.goto(B + '/entrar'); sql('delete from otp_codes'); const a2 = await api(d, '/api/cuenta/codigo', { telefono: '5705550133' }); await api(d, '/api/cuenta/verificar', { telefono: '5705550133', codigo: a2.codigoPrueba });
  await d.goto(B + '/panel/sabor-dominicano/hoy'); /* 9b-1 · Con el techo lleno el panel dice «Free: llegaste a N de N…» (Pedidos.tsx; antes la prueba esperaba «Free: N de N», el texto de antes de llegar) */ await d.getByText(new RegExp(`Free: llegaste a ${usados + 1} de ${usados + 1} pedidos`)).first().waitFor(); ok(true, `panel: «Free: llegaste a ${usados + 1} de ${usados + 1} pedidos o citas en línea este mes»`);
  // 9b-1 · La fila del Hoy dice «Pedido #N · Pickup» (cómo lo recibe), ya no «· Marisol» (el nombre va abajo).
  ok(await d.getByText(`Pedido #${num} · `, { exact: false }).first().waitFor({ timeout: 8000 }).then(() => true, () => false), 'panel › Hoy: el pedido espera respuesta');
  await d.screenshot({ path: OUT + 'b22-panel-free-d.png' });
  sql(`update business_stats_cache set plan='pro' where business_id='${BIZ}'`);
  await d.goto(B + '/panel/sabor-dominicano/vendes'); await d.getByText('EN TU PÁGINA').first().waitFor(); ok(true, 'panel › Lo que vendes: «EN TU PÁGINA»');
  await d.screenshot({ path: OUT + 'b23-panel-vendes-d.png' });
  restaurar(); await b.close();
})().catch(e => { console.error('FALLO', e.message.split('\n').slice(0, 5).join(' | ')); restaurar(); process.exit(1); });
