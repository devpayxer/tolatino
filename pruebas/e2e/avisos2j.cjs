const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
// 9b-1 · El SMS que se espera sale de la regla del servidor (de noche, lo que no es crítico espera: «silencio»).
const { smsEsperado } = require('../lib/negocio-nuevo.cjs');
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano', P = '/panel/' + BIZ;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 20; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { for (let i = 0; i < 40; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const MARISOL = "(select id from users where phone='+15705550122')", PEDRO = "(select id from users where phone='+15705550133')", ANA = "(select id from users where phone='+15705550199')";
const restaurar = () => { try { sql(`update business_hours set ranges='[["11:00","21:00"]]'::jsonb where business_id='${BIZ}' and module=''`); sql(`update users set notif_prefs = notif_prefs - 'ord' - 'quiet' where id = ${MARISOL}`); sql(`update notif_templates set body = jsonb_set(body, '{es}', to_jsonb('{negocio} aceptó tu pedido #{num}. Listo a las {hora}.'::text)), edited_by = null where key = 'ord_ok'`); } catch {} };
(async () => {
  sql(`update business_hours set ranges='[["00:00","00:00"]]'::jsonb, open=true where business_id='${BIZ}' and module=''`);
  sql(`update items set sold_out = false, stock_day = null where business_id='${BIZ}'`);
  sql(`update menu_settings set pause_until = null where business_id='${BIZ}'`);
  sql(`update operations set respond_by = now() - interval '1 minute' where user_id = ${MARISOL} and status = 'pending'`);
  sql(`update delivery_settings set auto_accept=false where business_id='${BIZ}'`);
  // 8c · Un aviso que ya tuvo push no se borra (push_outbox / push_deliveries lo referencian, solo inserción): se deja leído.
  sql(`delete from notifications n where user_id in (${MARISOL}, ${PEDRO}, ${ANA}) and not exists (select 1 from push_outbox o where o.notification_id = n.id)`);
  sql(`update notifications set read_at = coalesce(read_at, now()) where user_id in (${MARISOL}, ${PEDRO}, ${ANA})`);
  sql(`update users set notif_prefs = notif_prefs || '{"quiet": false}'::jsonb - 'ord' where id = ${MARISOL}`);
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(m, 'cliente'); globalThis.__p = [m];
  await entrar(m, '5705550122');
  const pedir = async (lines) => {
    await m.goto(B + '/n/' + BIZ); await m.evaluate((l) => localStorage.setItem('tl-carrito-v1', JSON.stringify({ 'sabor-dominicano': { at: Date.now(), lines: l } })) || localStorage.setItem('tl-modo-v1', JSON.stringify({ 'sabor-dominicano': 'pickup' })), lines); /* 9b-1 · Pickup a propósito: sin elegir, sale el primer modo del negocio (Delivery si otra prueba lo encendió) */
    await m.goto(B + '/n/' + BIZ + '/pagar'); await m.locator('[data-screen-label="Checkout · barra"]').getByText(/Enviar pedido/).click();
    await m.waitForURL(/\/pedido\/\d+$/); return m.url().split('/').pop();
  };
  const FLAN = { id: '16', ch: {}, q: 1, nt: '', k: {} };
  const n1 = await pedir([FLAN]);
  ok(await espera(() => sql(`select count(*) from notifications where user_id = ${PEDRO} and tpl = 'biz_req' and ref_id = '${n1}'`), '1') === '1', 'el negocio recibe «Nueva solicitud» (biz_req)');
  // Panel acepta → aviso al cliente
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(d, 'panel'); globalThis.__p.push(d);
  await entrar(d, '5705550133'); await d.goto(B + P + '/hoy'); await d.getByText(new RegExp(`^Pedido #${n1} · Pickup$`)).first().waitFor();
  const fila = d.locator('div', { has: d.getByText(new RegExp(`^Pedido #${n1} · Pickup$`)) }).filter({ has: d.getByText('Aceptar', { exact: true }) }).last();
  await fila.getByText('Aceptar', { exact: true }).click(); await d.getByText('Marisol ya lo ve en su pedido.').waitFor();
  ok(await espera(() => sql(`select tpl || '|' || sms_status || '|' || (body like 'Sabor Dominicano aceptó tu pedido #${n1}. Listo a las %') from notifications where user_id = ${MARISOL} and ref_id = '${n1}'`), `ord_ok|${smsEsperado('ord_ok', `${MARISOL}`)}|true`) === `ord_ok|${smsEsperado('ord_ok', `${MARISOL}`)}|true`, 'aceptar → aviso ord_ok con el texto lleno; SMS «en modo pruebas»');
  // Preferencia apagada → SMS apagado (la bandeja igual)
  sql(`update users set notif_prefs = notif_prefs || '{"ord": false}'::jsonb where id = ${MARISOL}`);
  await d.goto(B + P + '/hoy?det=ped:' + n1); const det = d.locator('aside[data-screen-label="Panel v2 · detalle"]'); await det.getByText('HISTORIAL').waitFor();
  await clic(det.getByText('Listo para recoger', { exact: true }));
  ok(await espera(() => sql(`select sms_status from notifications where user_id = ${MARISOL} and tpl = 'ord_ready' and ref_id = '${n1}'`), 'apagado') === 'apagado', 'con «Pedidos» apagado: queda en la bandeja, SMS apagado');
  // Campana con punto y bandeja
  await m.goto(B + '/'); await m.waitForTimeout(400);
  ok(sql(`select count(*) from notifications where user_id = ${MARISOL} and read_at is null`) === '2', '2 avisos sin leer');
  await m.screenshot({ path: OUT + 'j1-campana-m.png' });
  await clic(m.getByRole('button', { name: /Notificaciones|Avisos|Notifications/ }));
  await m.waitForURL(/\/avisos$/); await m.getByText('Pedido aceptado').first().waitFor();
  ok(!!(await vis(m.getByText('NUEVO').first())), 'bandeja: los nuevos con NUEVO');
  await m.screenshot({ path: OUT + 'j2-bandeja-m.png', fullPage: true });
  ok(await espera(() => sql(`select count(*) from notifications where user_id = ${MARISOL} and read_at is null`), '0') === '0', 'abrir la bandeja los marca leídos');
  await clic(m.getByText('Tu pedido está listo', { exact: true })); await m.waitForURL(new RegExp(`/pedido/${n1}$`)); ok(true, 'tocar el aviso lleva al pedido');
  // Admin: plantillas, editar, probar, envíos
  const a = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(a, 'admin'); globalThis.__p.push(a);
  await entrar(a, '5705550199'); await a.goto(B + '/admin/notificaciones'); await a.getByText('PEDIDOS, RESERVACIONES Y SOLICITUDES').first().waitFor();
  await a.screenshot({ path: OUT + 'j3-admin-tpl-d.png', fullPage: true });
  const tarjeta = a.locator('div', { has: a.getByText('Pedido aceptado', { exact: true }) }).filter({ has: a.getByText('Editar español', { exact: true }) }).last();
  await tarjeta.getByText('Editar español', { exact: true }).click();
  const area = await vis(a.locator('textarea')); await area.fill('{negocio} aceptó tu pedido #{num}. Listo a las {hora}. {propina}');
  await (await vis(a.getByRole('textbox').last())).fill('Prueba de texto');
  await clic(a.getByText('Guardar', { exact: true })); await a.getByText(/no conoce \{propina\}/).first().waitFor(); ok(true, 'editar: rechaza una variable que no existe');
  await area.fill('{negocio} aceptó tu pedido #{num}. Estará listo a las {hora}.');
  await clic(a.getByText('Guardar', { exact: true })); await a.getByText(/Guardada/).first().waitFor();
  ok(sql(`select body->>'es' from notif_templates where key = 'ord_ok'`) === '{negocio} aceptó tu pedido #{num}. Estará listo a las {hora}.', 'editar: guardada');
  ok(sql(`select count(*) from audit_entries where action = 'notificaciones.plantilla' and at > now() - interval '1 minute'`) !== '0', 'editar: queda en la auditoría');
  await a.getByText('EDITADA').first().waitFor();
  const t2 = a.locator('div', { has: a.getByText('Pedido aceptado', { exact: true }) }).filter({ has: a.getByText('Probar en mi teléfono', { exact: true }) }).last();
  await t2.getByText('Probar en mi teléfono', { exact: true }).click(); await a.getByText(/Enviada a tu bandeja/).first().waitFor();
  ok(sql(`select body from notifications where user_id = ${ANA} and tpl = 'ord_ok' order by id desc limit 1`) === 'Sabor Dominicano aceptó tu pedido #1042. Estará listo a las 7:30 PM.', 'probar: llega a mi bandeja con valores de muestra');
  await a.goto(B + '/admin/notificaciones?tab=log'); await a.getByText('SMS EN PRUEBAS').first().waitFor(); ok(!!(await vis(a.getByText('SMS APAGADO').first())), 'envíos: estado del SMS por aviso');
  await a.screenshot({ path: OUT + 'j4-admin-log-d.png', fullPage: true });
  await a.goto(B + '/admin/notificaciones?tab=rules'); await a.getByText('Horas de silencio').first().waitFor(); ok(true, 'reglas');
  // Móvil admin
  const am = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(am, 'admin-m'); globalThis.__p.push(am);
  await entrar(am, '5705550199'); await am.goto(B + '/admin/notificaciones'); await am.getByText('Pedido aceptado').first().waitFor(); await am.screenshot({ path: OUT + 'j5-admin-m.png', fullPage: true });
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); restaurar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch {} restaurar(); process.exit(1); });
