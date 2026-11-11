const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano', P = '/panel/' + BIZ;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const shot = async (p, n, full = false) => { await p.waitForTimeout(600); await p.screenshot({ path: OUT + n, fullPage: full }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const ds = (c) => sql(`select ${c} from delivery_settings where business_id='${BIZ}'`);
const espera = async (f, v) => { for (let i = 0; i < 40; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
(async () => {
  sql(`update delivery_settings set delivery=false, pickup=true, pay_cash_delivery=false, who='team', external_app=null, zone_mi=3, fee_cents=300, free_over_cents=0, min_order_cents=0 where business_id='${BIZ}'`);
  sql(`update businesses set modules_off = modules_off - 'delivery' where id='${BIZ}'`);
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(d, 'desk');
  await entrar(d, '5705550133'); await d.goto(B + P + '/hoy');
  await d.getByText('Entrega', { exact: true }).first().click(); await d.waitForURL(/\/entrega$/);
  await d.getByText('CÓMO ENTREGAS').waitFor(); ok(true, 'navegación: Entrega');
  const sw = (pg, t) => pg.getByText(t, { exact: true }).first().locator('xpath=ancestor::div[.//*[@role="switch"]][1]').getByRole('switch').first();
  await sw(d, 'Llevas el pedido a la casa').click();
  await d.getByText('HASTA DÓNDE LLEVAS').waitFor(); await d.getByText('5 mi', { exact: true }).click(); await d.getByText('$4', { exact: true }).first().click();
  await d.getByText('$40', { exact: true }).click(); await d.getByText('$15', { exact: true }).click();
  await shot(d, 'e1-entrega-d.png', true);
  await d.getByText('Guardar', { exact: true }).last().click(); await d.getByText('Guardado · el cliente ya lo ve así.').waitFor();
  ok(ds("delivery||'|'||zone_mi||'|'||fee_cents||'|'||free_over_cents||'|'||min_order_cents") === 'true|5|400|4000|1500', 'guardar: delivery 5 mi, $4, gratis desde $40, mínimo $15');
  ok(await d.getByText(/Falta cómo te pagan en delivery/).isVisible(), 'avisa que falta el pago en delivery');
  // Pedidos en línea: efectivo al entregar y propina
  await d.goto(B + P + '/vendes/pedidos'); await d.getByText('Efectivo al entregar').waitFor();
  await sw(d, 'Efectivo al entregar').click();
  await d.getByText('Guardar', { exact: true }).last().click(); await d.getByText('Guardado · el cliente ya lo ve así.').waitFor();
  ok(await espera(() => ds('pay_cash_delivery'), 't') === 't', 'Pedidos en línea: efectivo al entregar');
  // App externa apaga el efectivo al entregar
  await d.goto(B + P + '/entrega'); await d.getByText('Una app externa').click(); await d.getByText('DoorDash').click();
  await d.getByText('Guardar', { exact: true }).last().click(); await d.getByText('Guardado · el cliente ya lo ve así.').waitFor();
  ok(await espera(() => ds("who||'|'||external_app||'|'||pay_cash_delivery"), 'external|doordash|false') === 'external|doordash|false', 'app externa: DoorDash y sin efectivo al entregar');
  ok(+sql(`select count(*) from audit_entries where action='entrega.ajustes' and at > now() - interval '5 minutes'`) >= 2, 'auditoría de Entrega');
  // Nada encendido no se guarda
  await sw(d, 'Llevas el pedido a la casa').click();
  await sw(d, 'Lo recogen en tu local').click();
  ok(await d.getByText('Con todo apagado nadie puede pedir en la app. Enciende al menos una.').isVisible(), 'todo apagado: aviso');
  // Teléfono: Más
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(m, 'movil'); await entrar(m, '5705550133');
  await m.goto(B + P + '/hoy'); await m.getByText('Más', { exact: true }).click(); await m.waitForURL(/\/mas$/);
  ok(await m.getByText('Lo que vendes').first().isVisible() && await m.getByText('Entrega').first().isVisible(), 'teléfono: Más con Lo que vendes y Entrega');
  await shot(m, 'e2-mas-m.png');
  // Super Admin pausa delivery
  sql(`update delivery_settings set who='team', external_app=null, pay_cash_delivery=true where business_id='${BIZ}'`);
  const a = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); await entrar(a, '5705550199');
  await a.goto(B + `/admin/negocios/${BIZ}?tab=vende`);
  const fila = a.locator('div', { has: a.getByText('Delivery', { exact: true }) }).filter({ has: a.getByText('Pausar', { exact: true }) }).last();
  await fila.getByText('Pausar', { exact: true }).click(); await a.getByText('Reportes de clientes').first().click(); await a.getByText('Confirmar', { exact: true }).last().click(); await a.waitForTimeout(1500);
  ok(sql(`select modules_off ? 'delivery' from businesses where id='${BIZ}'`) === 't', 'admin pausa Delivery con motivo');
  await d.goto(B + P + '/entrega'); ok(await d.getByText(/To’Latino pausó tu delivery/).isVisible(), 'el dueño ve el motivo en Entrega');
  sql(`update businesses set modules_off = modules_off - 'delivery' where id='${BIZ}'`);
  ok(err.length === 0, 'sin errores en consola: ' + err.join(' | '));
  await b.close(); console.log('OK');
})().catch(e => { console.error(e); try { execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -c "update businesses set modules_off = modules_off - 'delivery' where id='sabor-dominicano'"`); } catch {} process.exit(1); });
