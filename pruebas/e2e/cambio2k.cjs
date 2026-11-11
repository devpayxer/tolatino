const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano', P = '/panel/' + BIZ;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const shot = async (p, n, full = false) => { await p.waitForTimeout(600); await p.screenshot({ path: OUT + n, fullPage: full }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const MARISOL = "(select id from users where phone='+15705550122')";
const op = (n, c = "status") => sql(`select ${c} from operations where number='${n}'`);
const hm = (n) => op(n, "to_char(scheduled_at at time zone 'America/New_York', 'HH24:MI') || '|' || party_size");
const chg = (n) => sql(`select coalesce(string_agg(p.status, ',' order by p.id), '-') from change_proposals p join operations o on o.id = p.operation_id where o.number = '${n}' and p.side = 'customer'`);
(async () => {
  sql(`update business_hours set ranges='[["11:00","22:00"]]'::jsonb, open=true where business_id='${BIZ}' and module=''`);
  sql(`update operations set status='cancelled' where kind='table' and status in ('pending','confirmed','change_proposed')`);
  sql(`update reservation_settings set auto_confirm=false where business_id='${BIZ}'`);
  sql(`delete from reservation_holds`); sql(`update reservation_blocks set removed_at=now() where removed_at is null`);
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(m, 'cliente'); globalThis.__p = [m];
  await entrar(m, '5705550122');
  const reservar = async (p, d, h) => {
    await m.goto(B + `/n/${BIZ}?tab=rsv&p=${p}&d=${d}&h=${h}`); await m.locator('[data-screen-label="Ficha · barra de pedido"]').getByText('Continuar').click();
    await m.waitForURL(/\/reservar\?hold=/); await m.locator('[data-screen-label="Reserva · barra"]').getByText('Enviar solicitud').click();
    await m.waitForURL(/\/reserva\/R-\d+$/); return m.url().split('/').pop();
  };
  const cambiar = async (n, p, d, h) => {
    await m.goto(B + '/reserva/' + n); await m.getByText('Cambiar reservación', { exact: true }).locator('visible=true').first().click();
    await m.waitForURL(/editar=/); await m.getByText(/Cambiando tu reservación de/).first().waitFor();
    await m.goto(B + `/n/${BIZ}?tab=rsv&editar=${n}&p=${p}&d=${d}&h=${h}`);
    await m.locator('[data-screen-label="Ficha · barra de pedido"]').getByText('Continuar').click();
    await m.waitForURL(/\/reservar\?hold=/); await m.getByText('Tu reservación actual sigue en pie').first().waitFor();
    await shot(m, 'k2-detalles-m.png', true);
    await m.locator('[data-screen-label="Reserva · barra"]').getByText('Solicitar cambio').click();
    await m.waitForURL(new RegExp(`/reserva/${n}$`));
  };
  const n1 = await reservar(2, 1, 1140);
  sql(`update operations set status='confirmed', confirmed_at=now(), answered_at=now() where number='${n1}'`);
  ok(hm(n1) === '19:00|2', `mesa ${n1} confirmada mañana 7:00 PM, 2 personas`);
  // 1 · Pide el cambio → la actual sigue en pie
  await cambiar(n1, 4, 1, 1200);
  await m.getByText('CAMBIO SOLICITADO').first().waitFor();
  ok(op(n1) === 'confirmed' && hm(n1) === '19:00|2' && chg(n1) === 'open', 'pedido el cambio: sigue confirmada a las 7:00 PM, cambio abierto');
  ok(await m.getByText('Cambiar reservación', { exact: true }).locator('visible=true').count() === 0, 'mientras espera, no se pide otro cambio');
  await shot(m, 'k3-estado-pend-m.png', true);
  ok(sql(`select count(*) from notifications where tpl = 'biz_rsv_chg' and ref_id = '${n1}'`) === '1', 'el negocio recibe «Piden cambiar una mesa»');
  // 2 · El panel lo ve y lo acepta
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(d, 'panel'); globalThis.__p.push(d);
  await entrar(d, '5705550133');
  await d.goto(B + P + '/hoy'); await d.getByText(`Reservación #${n1}`).first().waitFor(); ok(!!(await d.getByText('PIDE CAMBIO').count()), 'Hoy: «PIDE CAMBIO» en lo que espera respuesta');
  await d.goto(B + P + `/hoy?det=rsv:${n1}`); await d.getByText(/pide cambiarla a/).first().waitFor(); await shot(d, 'k4-panel-det-d.png');
  await d.getByText('Aceptar el cambio', { exact: true }).click(); await d.getByText('ya ve su mesa nueva.').waitFor();
  ok(op(n1) === 'confirmed' && hm(n1) === '20:00|4' && chg(n1) === 'accepted', 'aceptado: 8:00 PM, 4 personas');
  ok(sql(`select count(*) from audit_entries where action = 'reserva.cambio.aceptar' and at > now() - interval '1 minute'`) !== '0', 'auditado');
  ok(sql(`select count(*) from notifications where tpl = 'rsv_chg_ok' and ref_id = '${n1}'`) === '1', 'el cliente recibe «Cambio confirmado»');
  await m.goto(B + '/reserva/' + n1); await m.getByText(/Cambio confirmado\./).first().waitFor(); ok(true, 'cliente: «Cambio confirmado.» en su reservación');
  await shot(m, 'k5-estado-ok-m.png', true);
  // 3 · Otro cambio → «No se puede» → sigue igual → Entendido
  await cambiar(n1, 2, 1, 1110);
  await d.goto(B + P + `/hoy?det=rsv:${n1}`); await d.getByText('No se puede', { exact: true }).click(); await d.getByText(/sigue como estaba/).waitFor();
  ok(hm(n1) === '20:00|4' && chg(n1) === 'accepted,declined', 'no se puede: sigue a las 8:00 PM');
  await m.goto(B + '/reserva/' + n1); await m.getByText('CAMBIO NO CONFIRMADO').first().waitFor(); await shot(m, 'k6-estado-no-m.png', true);
  await m.getByText('Entendido', { exact: true }).locator('visible=true').first().click(); await m.waitForTimeout(800); await m.reload();
  ok(await m.getByText('CAMBIO NO CONFIRMADO').locator('visible=true').count() === 0 && await m.getByText('Cambiar reservación', { exact: true }).locator('visible=true').count() === 1, 'Entendido: se quita y se puede pedir otro');
  // 4 · Sin respuesta a tiempo → vence, sigue igual
  await cambiar(n1, 3, 1, 1170);
  sql(`update change_proposals set respond_by = now() - interval '1 minute' where side = 'customer' and status = 'open'`);
  await m.goto(B + '/reserva/' + n1); await m.getByText('CAMBIO NO CONFIRMADO').first().waitFor();
  ok(chg(n1) === 'accepted,declined,expired' && hm(n1) === '20:00|4', 'sin respuesta: vence y la reservación sigue igual');
  ok(sql(`select count(*) from notifications where tpl = 'rsv_chg_no' and ref_id = '${n1}'`) === '2', 'aviso «Cambio no confirmado» (no se puede y vencido)');
  await m.getByText('Entendido', { exact: true }).locator('visible=true').first().click(); await m.waitForTimeout(600);
  // 5 · Con «Confirmar al instante» el cambio se hace solo
  sql(`update reservation_settings set auto_confirm=true where business_id='${BIZ}'`);
  await cambiar(n1, 2, 1, 1230);
  ok(hm(n1) === '20:30|2' && chg(n1).endsWith('accepted'), 'confirmación al instante: el cambio se hace solo');
  await m.getByText(/Cambio confirmado\./).first().waitFor();
  sql(`update reservation_settings set auto_confirm=false where business_id='${BIZ}'`);
  // 6 · Mesa ocupada al aceptar
  await cambiar(n1, 2, 1, 1170);
  sql(`update reservation_settings set areas = jsonb_set(areas, '{salon,on}', 'false') where business_id='${BIZ}'`);
  sql(`update reservation_settings set areas = jsonb_set(areas, '{terraza,on}', 'false') where business_id='${BIZ}'`);
  await d.goto(B + P + `/hoy?det=rsv:${n1}`); await d.getByText('Aceptar el cambio', { exact: true }).click(); await d.getByText(/Ya no tienes mesa a esa hora/).first().waitFor();
  ok(chg(n1).endsWith('open') && hm(n1) === '20:30|2', 'sin mesa a esa hora: no se acepta y nada cambia');
  sql(`update reservation_settings set areas = jsonb_set(jsonb_set(areas, '{salon,on}', 'true'), '{terraza,on}', 'true') where business_id='${BIZ}'`);
  ok(err.length === 0, 'sin errores: ' + err.join(' | '));
  sql(`update operations set status='cancelled' where kind='table' and status in ('pending','confirmed','change_proposed')`);
  await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch {} try { sql(`update reservation_settings set auto_confirm=false, areas = jsonb_set(jsonb_set(areas, '{salon,on}', 'true'), '{terraza,on}', 'true') where business_id='sabor-dominicano'`); } catch {} process.exit(1); });
