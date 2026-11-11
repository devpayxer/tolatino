const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', N = '/n/sabor-dominicano', BIZ = 'sabor-dominicano';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const shot = async (p, n, full = false) => { await p.waitForTimeout(450); await p.screenshot({ path: OUT + n, fullPage: full }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const fila = (p, nombre) => p.locator('[data-msec^="m-"]:not([data-msec="m-pop"]) div.grid').filter({ has: p.getByText(nombre, { exact: true }) }).last();
const MARISOL = "(select id from users where phone='+15705550122')";

(async () => {
  // Las ofertas de Novedades cambian el precio: esta prueba mira el precio del menú.
  sql(`update business_posts set status = 'stopped' where business_id = 'sabor-dominicano' and kind = 'oferta' and status = 'live'`);
  // Preparación (base local): abierto todo el día, nada agotado salvo el chivo, inventario de hoy en su número, sin pausa.
  sql(`update business_hours set ranges='[["00:00","23:59"]]'::jsonb, open=true where business_id='${BIZ}' and module=''`);
  sql(`update items set sold_out = (id = 3), stock_day = null where business_id='${BIZ}'`);
  sql(`insert into menu_settings (business_id) values ('${BIZ}') on conflict (business_id) do update set pause_until = null`);
  sql(`update operations set respond_by = now() - interval '1 minute' where user_id = ${MARISOL} and status = 'pending'`);
  sql(`update business_stats_cache set plan='pro' where business_id='${BIZ}'`);
  sql(`update platform_config set value='10' where key='free_ops_cap'`);
  const quedan0 = +sql(`select stock_par from items where id=1`);
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };

  // ── Teléfono ──
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(m, 'movil');
  await entrar(m, '5705550122');
  await m.goto(B + N); await m.evaluate(() => localStorage.removeItem('tl-carrito-v1')); await m.reload();
  await m.locator('[data-screen-label="Resumen · menú"]').waitFor();
  ok(await m.locator('[data-screen-label="Ficha · barra de pedido"]').isVisible(), 'barra «Desde» en la ficha');
  await shot(m, 'b1-resumen-m.png', true);
  await m.getByRole('tab', { name: /Menú/ }).click();
  await m.locator('[data-screen-label="Ficha · menú"]').waitFor();
  ok(await m.getByText('AGOTADO HOY').first().isVisible(), 'chivo agotado se ve atenuado con su etiqueta');
  await shot(m, 'b2-menu-m.png');
  await shot(m, 'b2b-menu-m-full.png', true);
  // Tostones: sin opciones → + agrega directo
  await fila(m, 'Tostones').getByRole('button', { name: 'Agregar' }).click();
  await m.locator('[data-screen-label="Ficha · barra del pedido"]').waitFor(); ok(/1 artículo/.test(await m.locator('[data-screen-label="Ficha · barra del pedido"]').innerText()), '+ agrega directo y sale la barra del pedido');
  await shot(m, 'b3-agregado-m.png');
  // La bandera: hoja con opciones obligatorias
  await m.locator('[data-screen-label="Ficha · menú"]').getByText('Mofongo de chicharrón', { exact: true }).last().click();
  const hoja = m.locator('[data-screen-label="Menú · plato y opciones"]'); await hoja.waitFor();
  ok(await hoja.getByText(/^Elige: /).isVisible(), 'sin elegir, el botón pide lo obligatorio: ' + await hoja.getByText(/^Elige: /).innerText());
  await shot(m, 'b4-plato-m.png');
  const caldo = sql(`select options->0->>'es' from option_groups where id=6`), caldoC = +sql(`select options->0->>'cents' from option_groups where id=6`);
  await hoja.getByText('Pollo guisado', { exact: true }).click();
  await hoja.getByText(caldo, { exact: true }).click();
  await hoja.getByText('Aguacate', { exact: true }).click();
  await hoja.locator('textarea').fill('Sin cebolla');
  await shot(m, 'b5-plato-elegido-m.png');
  const cta = await hoja.getByText(/^Agregar · /).innerText(); ok(cta.includes('$' + ((1200 + caldoC + 250) / 100).toFixed(2)), 'precio con opciones: ' + cta.trim());
  await hoja.getByText(/^Agregar · /).click();
  await m.getByText('Agregado: Mofongo de chicharrón').waitFor();
  // + otra vez → pregunta «otra igual o con cambios»
  await m.waitForTimeout(3800); // la pastilla abierta se cierra sola
  await fila(m, 'Mofongo de chicharrón').getByRole('button', { name: /Cantidad/ }).click();
  await fila(m, 'Mofongo de chicharrón').getByRole('button', { name: 'Agregar' }).click();
  const otra = m.locator('[data-screen-label="Menú · otra igual o con cambios"]'); await otra.waitFor();
  await shot(m, 'b6-otra-igual-m.png');
  await otra.getByText(/IGUAL A LA ANTERIOR/).click();
  await m.getByText(/Otra igual · 2 en tu pedido/).waitFor(); ok(true, 'otra igual suma 2');
  // Carrito
  await m.locator('[data-screen-label="Ficha · barra del pedido"]').click();
  const car = m.locator('[data-screen-label="Menú · tu pedido"]'); await car.waitFor();
  ok(/3 ARTÍCULOS/.test(await car.innerText()), 'carrito con 3 artículos');
  await shot(m, 'b7-carrito-m.png');
  await car.getByText(/^Ir a pagar/).click();
  await m.waitForURL(/\/pagar$/); await m.locator('[data-pantalla="APP-NEG-CHECKOUT"]').waitFor();
  await m.getByText('Lo antes posible ·', { exact: false }).first().waitFor();
  await shot(m, 'b8-pagar-m.png', true);
  if (await m.getByText('Cambiar', { exact: true }).count()) { // sin horas para programar (tarde en la noche) no sale «Cambiar»
    await m.getByText('Cambiar', { exact: true }).click(); await m.waitForTimeout(300);
    await shot(m, 'b9-pagar-horas-m.png');
    await m.getByText('Lo antes posible', { exact: true }).click();
  } else console.log('  · sin horas para programar a esta hora');
  const total = (await m.locator('[data-screen-label="Checkout · barra"]').innerText()).match(/\$[\d.]+/)[0];
  await m.locator('[data-screen-label="Checkout · barra"]').getByText(/Enviar pedido/).click();
  await m.waitForURL(/\/pedido\/\d+$/); const num = m.url().split('/').pop();
  await m.locator('[data-pantalla="APP-NEG-PEDIDO"]').waitFor();
  ok(await m.getByText('GRACIAS POR TU PEDIDO').isVisible(), 'pedido #' + num + ' enviado');
  await shot(m, 'b10-pedido-m.png', true);
  const op = sql(`select status||'|'||stage||'|'||pay_mode||'|'||total_cents||'|'||subtotal_cents||'|'||tax_cents||'|'||coalesce(free_quota_month,'-') from operations where number='${num}'`);
  console.log('  operación:', op, '· total en pantalla', total);
  ok(op.startsWith('pending|sent|local|'), 'estado pendiente, pago en el local');
  ok(+op.split('|')[3] === Math.round(parseFloat(total.slice(1)) * 100), 'el total del servidor = el de la pantalla');
  ok(sql(`select count(*) from operation_lines where operation_id=(select id from operations where number='${num}')`) === '2', '2 líneas (mofongo x2, tostones)');
  ok(sql(`select instructions from operation_lines where operation_id=(select id from operations where number='${num}') and qty=2`) === 'Sin cebolla', 'instrucciones para la cocina guardadas');
  ok(sql(`select count(*) from operation_events where operation_id=(select id from operations where number='${num}') and kind='sent'`) === '1', 'línea de tiempo: enviado');
  ok(await m.evaluate(() => !JSON.parse(localStorage.getItem('tl-carrito-v1') || '{}')['sabor-dominicano']), 'el carrito se vació');

  // Error del servidor: el plato se agota entre el carrito y el pago
  await m.goto(B + N + '?tab=menu'); await m.locator('[data-screen-label="Ficha · menú"]').waitFor();
  await fila(m, 'Maduros').getByRole('button', { name: 'Agregar' }).click(); await m.locator('[data-screen-label="Ficha · barra del pedido"]').waitFor();
  sql(`update items set sold_out=true, sold_out_until='hoy', sold_out_at=now() where id=10`);
  await m.goto(B + N + '/pagar'); await m.locator('[data-screen-label="Checkout · barra"]').getByText(/Enviar pedido/).click();
  await m.locator('[data-screen-label="Checkout · no se pudo enviar"]').waitFor();
  ok(/Maduros/.test(await m.locator('[data-screen-label="Checkout · no se pudo enviar"]').innerText()), 'el servidor rechaza un plato agotado y lo dice');
  await shot(m, 'b11-pagar-error-m.png');
  sql(`update items set sold_out=false where id=10`);
  await m.evaluate(() => localStorage.removeItem('tl-carrito-v1'));

  // Pausa: se ve el menú, no se puede pedir
  sql(`update menu_settings set pause_until = now() + interval '30 minutes', pause_kind='30' where business_id='${BIZ}'`);
  await m.goto(B + N + '?tab=menu'); await m.getByText('Pedidos en línea en pausa').first().waitFor(); ok(true, 'pausa: aviso en el menú');
  ok(await fila(m, 'Tostones').getByRole('button', { name: 'Agregar' }).count() === 0, 'pausa: sin botón +');
  await shot(m, 'b12-pausa-m.png');
  sql(`update menu_settings set pause_until = null where business_id='${BIZ}'`);

  // ── Escritorio ──
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(d, 'desk');
  await entrar(d, '5705550122');
  await d.goto(B + N); await d.locator('[data-screen-label="Resumen desktop · menú"]').waitFor();
  await shot(d, 'b13-resumen-d.png');
  await d.goto(B + N + '?tab=menu'); await d.locator('[data-screen-label="Ficha · menú · desktop"]').waitFor();
  await shot(d, 'b14-menu-d.png');
  await d.locator('[data-screen-label="Ficha · menú · desktop"]').getByText('Morir soñando', { exact: true }).first().click();
  const dlg = d.locator('[data-screen-label="Menú · plato · desktop"]'); await dlg.waitFor();
  await dlg.getByText('Vaso grande', { exact: true }).click(); await dlg.getByText('Normal', { exact: true }).click();
  await shot(d, 'b15-plato-d.png');
  await dlg.getByText(/^Agregar · /).click();
  await d.getByText('Agregado: Morir soñando').waitFor();
  const parFlan = +sql(`select stock_par from items where id=16`);
  await d.locator('[data-msec^="d-"]:not([data-msec="d-pop"]) div.grid').filter({ has: d.getByText('Flan de leche', { exact: true }) }).last().getByRole('button', { name: 'Agregar' }).click();
  await shot(d, 'b16-menu-carrito-d.png');
  await d.locator('[data-screen-label="Ficha · menú · tu pedido"]').getByText(/^Ir a pagar/).last().click();
  await d.waitForURL(/\/pagar$/); await d.getByText('Finalizar pedido', { exact: true }).last().waitFor();
  await shot(d, 'b17-pagar-d.png');
  await d.getByText(/^Enviar pedido/).first().click();
  await d.waitForURL(/\/pedido\/\d+$/); await d.locator('[data-pantalla="APP-NEG-PEDIDO"]').waitFor();
  await shot(d, 'b18-pedido-d.png');
  ok(sql(`select stock_left||'|'||(stock_day = (now() at time zone 'America/New_York' - interval '6 hours')::date) from items where id=16`) === `${parFlan - 1}|true`, `inventario del día del flan: ${parFlan} → ${parFlan - 1}`);

  // Sin sesión: Ir a pagar lleva a Entra y vuelve al pago
  const g = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(g, 'anon');
  await g.goto(B + N + '?tab=menu'); await g.locator('[data-screen-label="Ficha · menú"]').waitFor();
  await fila(g, 'Aguacate').getByRole('button', { name: 'Agregar' }).click();
  await g.locator('[data-screen-label="Ficha · barra del pedido"]').click();
  await g.locator('[data-screen-label="Menú · tu pedido"]').getByText(/^Ir a pagar/).click();
  await g.waitForURL(/\/entrar\?volver=/); ok(decodeURIComponent(g.url()).includes('/n/sabor-dominicano/pagar'), 'sin sesión → Entra con regreso al pago');

  // Free: 5 platos en la página; con pedidos este mes se pide desde el Resumen; sin pedidos, lista y Llamar
  sql(`update business_stats_cache set plan='free' where business_id='${BIZ}'`);
  await m.goto(B + N); await m.locator('[data-screen-label="Resumen · menú"]').waitFor();
  ok(await m.getByRole('tab', { name: /Menú/ }).count() === 0, 'Free: sin pestaña Menú');
  ok(/PICKUP · PAGAS EN EL LOCAL/.test(await m.locator('[data-screen-label="Ficha · barra de pedido"]').innerText()), 'Free con pedidos: barra pickup');
  await shot(m, 'b19-free-m.png', true);
  sql(`update platform_config set value='0' where key='free_ops_cap'`);
  await m.reload(); await m.locator('[data-screen-label="Resumen · menú"]').waitFor();
  ok(/PAGO EN EL LOCAL/.test(await m.locator('[data-screen-label="Ficha · barra de pedido"]').innerText()), 'Free sin pedidos: lista y Llamar');
  await shot(m, 'b20-free-tope-m.png', true);
  sql(`update platform_config set value='10' where key='free_ops_cap'`); sql(`update business_stats_cache set plan='pro' where business_id='${BIZ}'`);

  // Restaurar horario de la semilla
  sql(`update business_hours set ranges='[["11:00","21:00"]]'::jsonb where business_id='${BIZ}' and module=''`);
  console.log('errores:', err.length ? err : 'ninguno'); await b.close();
  sql(`update business_posts set status = 'live' where business_id = 'sabor-dominicano' and kind = 'oferta' and status = 'stopped' and created_by is null`);
})().catch(e => { console.error('FALLO', e.message.split('\n').slice(0, 6).join(' | ')); try { sql(`update business_posts set status = 'live' where business_id = 'sabor-dominicano' and kind = 'oferta' and status = 'stopped' and created_by is null`); sql(`update business_hours set ranges='[["11:00","21:00"]]'::jsonb where business_id='sabor-dominicano' and module=''`); sql(`update business_stats_cache set plan='pro' where business_id='sabor-dominicano'`); sql(`update platform_config set value='10' where key='free_ops_cap'`); } catch {} process.exit(1); });
