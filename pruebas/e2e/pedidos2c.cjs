const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano', P = '/panel/' + BIZ;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const shot = async (p, n, full = false) => { await p.waitForTimeout(500); await p.screenshot({ path: OUT + n, fullPage: full }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const MARISOL = "(select id from users where phone='+15705550122')";
const restaurar = () => { try { sql(`update business_hours set ranges='[["11:00","21:00"]]'::jsonb where business_id='${BIZ}' and module=''`); sql(`update delivery_settings set auto_accept=false, prep_min=20 where business_id='${BIZ}'`); } catch {} };
const st = (n) => sql(`select status||'|'||coalesce(stage,'-') from operations where number='${n}'`);

(async () => {
  sql(`update business_hours set ranges='[["00:00","23:59"]]'::jsonb, open=true where business_id='${BIZ}' and module=''`);
  sql(`update items set sold_out = (id = 3), stock_day = null where business_id='${BIZ}'`);
  sql(`update menu_settings set pause_until = null where business_id='${BIZ}'`);
  sql(`update operations set respond_by = now() - interval '1 minute' where user_id = ${MARISOL} and status = 'pending'`);
  sql(`update delivery_settings set auto_accept=false, prep_min=20 where business_id='${BIZ}'`);
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(m, 'cliente');
  await entrar(m, '5705550122');
  // Pedir desde el carrito guardado (el flujo de la ficha ya se probó en el 2b)
  const pedir = async (lines) => {
    await m.goto(B + '/n/' + BIZ); await m.evaluate((l) => localStorage.setItem('tl-carrito-v1', JSON.stringify({ 'sabor-dominicano': { at: Date.now(), lines: l } })), lines);
    await m.goto(B + '/n/' + BIZ + '/pagar'); await m.locator('[data-screen-label="Checkout · barra"]').getByText(/Enviar pedido/).click();
    await m.waitForURL(/\/pedido\/\d+$/); return m.url().split('/').pop();
  };
  const FLAN = { id: '16', ch: {}, q: 1, nt: '', k: {} }, MOF = { id: '5', ch: { '5': [1], '6': [0] }, q: 2, nt: 'Bien caliente', k: {} };
  const flan0 = () => +sql(`select case when stock_day is null then stock_par else stock_left end from items where id=16`);

  // 1 · Pedido → el negocio lo acepta, lo marca listo y entregado
  const n1 = await pedir([MOF, FLAN]);
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(d, 'panel');
  await entrar(d, '5705550133');
  await d.goto(B + P + '/hoy'); await d.getByText(`Pedido #${n1} · Pickup`).first().waitFor();
  ok(true, `panel › Hoy: llega el pedido #${n1}`);
  await shot(d, 'c1-hoy-pend-d.png');
  const fila = d.locator('div', { has: d.getByText(`Pedido #${n1} · Pickup`, { exact: true }) }).filter({ has: d.getByText('Aceptar', { exact: true }) }).last();
  await fila.getByText('Aceptar', { exact: true }).click();
  await d.getByText('Marisol ya lo ve en su pedido.').waitFor(); ok(st(n1) === 'confirmed|preparing', 'aceptar → confirmado, en la cocina');
  await shot(d, 'c2-hoy-aceptado-d.png');
  await m.goto(B + '/pedido/' + n1); await m.getByText('En la cocina', { exact: true }).first().waitFor();
  ok(await m.getByText('Cancelar pedido').count() === 0, 'cliente: ya aceptado, sin «Cancelar pedido»');
  await shot(m, 'c3-pedido-cocina-m.png', true);
  await d.goto(B + P + '/hoy?det=ped:' + n1); const det = d.locator('aside[data-screen-label="Panel v2 · detalle"]'); await det.getByText('HISTORIAL').waitFor();
  ok(/Aceptado por Pedro/.test(await det.innerText()), 'historial: «Aceptado por Pedro»');
  ok(/Bien caliente/.test(await det.innerText()), 'detalle: instrucciones del cliente para la cocina');
  await shot(d, 'c4-detalle-d.png');
  await det.getByText('Listo para recoger', { exact: true }).click(); await d.getByText(/ya ve que está listo/).waitFor();
  ok(st(n1) === 'confirmed|ready', 'listo para recoger');
  await m.reload(); await m.getByText('Listo para recoger', { exact: true }).first().waitFor(); ok(true, 'cliente: «Listo para recoger»');
  await d.goto(B + P + '/hoy?det=ped:' + n1); await det.getByText('Entregado', { exact: true }).last().click(); await d.getByText('Anotado · Entregado.').waitFor();
  ok(st(n1) === 'done|picked_up', 'entregado');
  await m.reload(); await m.getByText('Recogido', { exact: true }).first().waitFor(); await shot(m, 'c5-pedido-recogido-m.png', true);
  // Volver a pedir: el carrito vuelve con el mofongo y sus opciones
  await m.getByText('Volver a pedir', { exact: true }).first().click(); await m.waitForURL(/tab=menu/);
  await m.locator('[data-screen-label="Ficha · barra del pedido"]').waitFor();
  ok(/3 artículos/.test(await m.locator('[data-screen-label="Ficha · barra del pedido"]').innerText()), 'volver a pedir: 3 artículos en el carrito');
  await m.evaluate(() => localStorage.removeItem('tl-carrito-v1'));

  // 2 · El cliente cancela gratis: el inventario del flan vuelve
  const antes = flan0(); const n2 = await pedir([FLAN]); ok(flan0() === antes - 1, `flan descontado (${antes} → ${antes - 1})`);
  await m.getByText('Cancelar pedido', { exact: true }).first().click(); await m.waitForURL(/cancelar$/);
  await m.getByText('¿Cancelar el pedido?').waitFor(); await m.getByText('Tarda mucho', { exact: true }).click();
  await shot(m, 'c6-cancelar-m.png');
  await m.getByText('Sí, cancelar el pedido', { exact: true }).click(); await m.waitForURL(/\/pedido\/\d+$/);
  await m.getByText('Pedido cancelado').first().waitFor();
  ok(sql(`select status||'|'||cancelled_by||'|'||cancel_reason from operations where number='${n2}'`) === 'cancelled|user|tarda', 'cancelado por el cliente con su motivo');
  ok(flan0() === antes, 'inventario devuelto al cancelar');
  await shot(m, 'c7-pedido-cancelado-m.png', true);

  // 3 · El negocio rechaza
  const n3 = await pedir([FLAN]);
  await d.goto(B + P + '/hoy'); const f3 = d.locator('div', { has: d.getByText(`Pedido #${n3} · Pickup`, { exact: true }) }).filter({ has: d.getByText('Rechazar', { exact: true }) }).last();
  await f3.getByText('Rechazar', { exact: true }).click(); await d.getByText('Marisol ya ve que no se pudo.').waitFor();
  ok(st(n3) === 'declined|sent', 'rechazado'); ok(flan0() === antes, 'inventario devuelto al rechazar');
  await m.goto(B + '/pedido/' + n3); await m.getByText('No pudieron tomar tu pedido').waitFor(); ok(true, 'cliente: «No pudieron tomar tu pedido»');

  // 4 · Nadie contesta en 10 min: SIN RESPUESTA e inventario de vuelta (sin tareas programadas: al leer)
  const n4 = await pedir([FLAN]); ok(flan0() === antes - 1, 'flan descontado otra vez');
  sql(`update operations set respond_by = now() - interval '1 second' where number='${n4}'`);
  await d.goto(B + P + '/hoy'); await d.getByText('Nada pendiente').waitFor();
  ok(st(n4) === 'expired|sent', 'vencido al abrir el panel'); ok(flan0() === antes, 'inventario devuelto al vencer');
  ok(sql(`select count(*) from operation_events where operation_id=(select id from operations where number='${n4}') and kind='expired'`) === '1', 'historial: «Nadie contestó en 10 minutos»');
  await m.goto(B + '/pedido/' + n4); await m.getByText('No contestaron a tiempo').waitFor(); ok(true, 'cliente: SIN RESPUESTA');
  // El negocio ya no puede aceptar un pedido vencido
  await d.goto(B + P + '/hoy?det=ped:' + n4); await det.getByText(/Nadie contestó a tiempo/).first().waitFor();
  ok(await det.getByText('Aceptar', { exact: true }).count() === 0, 'vencido: sin «Aceptar»');

  // 5 · Clientes: filtros y búsqueda
  await d.goto(B + P + '/clientes'); await d.getByText('Clientes', { exact: true }).first().waitFor();
  ok(await d.getByText(/^Terminadas · \d+$/).count() === 1, 'chips con su cuenta');
  await shot(d, 'c8-clientes-d.png');
  await d.goto(B + P + '/clientes?f=no'); await d.getByText(`Pedido #${n3} · Pickup`).first().waitFor(); ok(true, 'filtro «No se pudo» muestra el rechazado');
  await d.goto(B + P + '/clientes?q=' + n1); await d.getByText(`Pedido #${n1} · Pickup`).first().waitFor();
  ok(await d.getByText(/^Pedido #\d+ · Pickup$/).count() === 1, 'buscar por número');

  // 6 · Pedidos en línea: aceptar al instante y tiempo de preparación
  await d.goto(B + P + '/vendes'); await d.getByText('Pedidos en línea', { exact: true }).first().waitFor(); await shot(d, 'c9-vendes-d.png');
  await d.goto(B + P + '/vendes/pedidos'); await d.getByText('CÓMO ACEPTAS', { exact: true }).waitFor();
  await d.getByText('Aceptar pedidos al instante', { exact: true }).locator('xpath=ancestor::div[.//*[@role="switch"]][1]').getByRole('switch').click();
  await d.getByText('Tiempo de preparación', { exact: true }).locator('xpath=ancestor::div[.//*[substring(@aria-label, string-length(@aria-label)) = "+"]][1]').getByRole('button', { name: '+' }).click();
  await shot(d, 'c10-pedidos-en-linea-d.png', true);
  await d.getByText('Guardar', { exact: true }).last().click(); await d.getByText('Guardado · el cliente ya lo ve así.').waitFor();
  ok(sql(`select auto_accept||'|'||prep_min from delivery_settings where business_id='${BIZ}'`) === 'true|25', 'aceptar al instante y 25 min guardados');
  ok(sql(`select count(*) from audit_entries where action='pedidos.ajustes' and target_id='${BIZ}'`) !== '0', 'auditoría de ajustes');
  const n5 = await pedir([FLAN]); ok(st(n5) === 'confirmed|accepted', 'con «al instante» el pedido entra aceptado');
  await m.getByText(/Aceptado/).first().waitFor(); await shot(m, 'c11-pedido-instante-m.png', true);

  // 7 · Teléfono del dueño: Hoy
  const pm = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(pm, 'panel-m');
  sql(`update delivery_settings set auto_accept=false where business_id='${BIZ}'`);
  await entrar(pm, '5705550133'); const n6 = await pedir([MOF]);
  await pm.goto(B + P + '/hoy'); await pm.getByText(`Pedido #${n6} · Pickup`).first().waitFor(); await shot(pm, 'c12-hoy-m.png', true);
  await pm.getByText(`Pedido #${n6} · Pickup`).first().click(); await pm.getByText('HISTORIAL').waitFor(); await shot(pm, 'c13-detalle-m.png', true);
  ok(+sql(`select count(*) from audit_entries where action in ('pedido.aceptar','pedido.rechazar','pedido.listo','pedido.entregado') and target_id='${BIZ}'`) >= 4, 'auditoría de cada paso');
  restaurar(); console.log('errores:', err.length ? err : 'ninguno'); await b.close();
})().catch(e => { console.error('FALLO', e.message.split('\n').slice(0, 6).join(' | ')); restaurar(); process.exit(1); });
