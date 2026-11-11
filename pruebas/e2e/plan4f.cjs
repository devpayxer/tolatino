// 4f-1 · Planes recurrentes: empezar (hoy $0, visita creada), cobro del período fuera de sesión con comisión, saltar,
// pausar y reanudar, rechazo del banco (reintentos y pausa al tercero) y cambiar la tarjeta, panel, cancelar.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', D = 'hermanos-diaz-multiservicios';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const MARISOL = "(select id from users where phone = '+15705550122')";
const limpiar = () => { sql(`update plan_subscriptions set status = 'cancelled', cancelled_at = now() where user_id = ${MARISOL} and status <> 'cancelled'`); sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id = ${MARISOL} and business_id = '${D}' and status in ('pending', 'confirmed')`); };
const hoy = () => sql(`select (now() at time zone 'America/New_York')::date`);
(async () => {
  limpiar();
  sql(`insert into user_addresses (user_id, label, street, zip, geo, geo_quality, city_id, is_default) select ${MARISOL}, 'casa', '112 W Oak St', '18201', ST_SetSRID(ST_MakePoint(-75.9775, 40.9584), 4326)::geography, 'numero', 'hzl', false where not exists (select 1 from user_addresses where user_id = ${MARISOL} and street = '112 W Oak St' and removed_at is null)`);
  sql(`insert into user_homes (user_id, address_id, kind, tenure, is_default) select ${MARISOL}, id, 'casa', 'dueno', true from user_addresses where user_id = ${MARISOL} and street = '112 W Oak St' and removed_at is null and not exists (select 1 from user_homes where user_id = ${MARISOL} and removed_at is null) limit 1`);
  sql(`update payment_methods set status = 'active', is_default = (stripe_pm_id = 'pm_sim_visa_4242_c13c3c00') where user_id = ${MARISOL} and stripe_pm_id in ('pm_sim_visa_4242_c13c3c00', 'pm_sim_visa_0002_7725ac2e')`);
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); globalThis.__p = [m]; await entrar(m, '5705550122');
  m.on('pageerror', e => err.push(e.message)); m.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  // ── Empezar ──
  await m.goto(B + `/n/${D}?tab=svc`); await clic(m.getByText('Mantenimiento de la casa', { exact: true }));
  const hoja = m.locator('[data-screen-label="Servicio · opciones"]'); await hoja.waitFor();
  await clic(hoja.getByRole('button', { name: /Empezar el plan · \$149\/mes/ })); await m.waitForURL(/\/plan\?s=/);
  await m.getByText('DÍA FIJO', { exact: true }).waitFor();
  ok(!!(await vis(m.getByText('HOY NO SE COBRA NADA · CANCELAS CUANDO QUIERAS'))), 'formulario: hoy no se cobra nada');
  await m.getByLabel('Qué quieres que revisen').fill('Revisar el grifo del baño y la puerta del patio.');
  await m.getByLabel('Cómo entrar').fill('Llave con la vecina del 2');
  await m.screenshot({ path: OUT + 'l1-plan-form-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: /^Empezar el plan · \$149\/mes/ })); await m.waitForURL(/\/plan\/PL-\d+/);
  const P = m.url().split('/plan/')[1];
  await m.getByText('PLAN ACTIVO').first().waitFor(); ok(!!(await vis(m.getByText(/Hoy no se cobró nada/))), `${P}: plan activo · hoy no se cobró nada`);
  const s0 = sql(`select s.status || '|' || s.price_cents || '|' || s.charges_ok || '|' || (s.next_visit_on = s.next_charge_on) || '|' || s.payment_method from plan_subscriptions s join operations o on o.id = s.operation_id where o.number = '${P}'`);
  ok(s0 === 'active|14900|0|true|pm_sim_visa_4242_c13c3c00', 'suscripción: $149, sin cobros, primer cobro el día de la primera visita');
  const v1 = sql(`select number || '|' || status || '|' || total_cents || '|' || (details->>'k') from operations where kind = 'appointment' and details->>'plan' = '${P}' and status <> 'cancelled'`);
  ok(/^C-\d+\|confirmed\|0\|plan$/.test(v1), `la primera visita ya es una cita confirmada de $0 (${v1.split('|')[0]})`);
  ok(sql(`select count(*) from payments p join operations o on o.id = p.operation_id where o.number = '${P}'`) === '0', 'no hay cobros todavía');
  ok(sql(`select count(*) from notifications where tpl = 'biz_plan_nuevo' and ref_id = '${P}'`) === '1', 'aviso al negocio: plan nuevo');
  await m.screenshot({ path: OUT + 'l2-plan-activo-m.png', fullPage: true });
  // ── Cobro del período ──
  sql(`update plan_subscriptions set next_charge_on = '${hoy()}' where operation_id = (select id from operations where number = '${P}')`);
  await m.goto(B + `/plan/${P}`); await m.getByText('COBRO 1').waitFor();
  ok(sql(`select p.kind || '|' || p.status || '|' || p.amount_cents || '|' || p.fee_cents from payments p join operations o on o.id = p.operation_id where o.number = '${P}'`) === 'plan|captured|14900|1192', 'cobrado $149 con la comisión del plan (8 %)');
  ok(sql(`select s.next_charge_on > '${hoy()}'::date + 27 from plan_subscriptions s join operations o on o.id = s.operation_id where o.number = '${P}'`) === 't', 'el próximo cobro, el mes siguiente');
  await m.goto(B + `/plan/${P}`); await m.waitForTimeout(400);
  ok(sql(`select count(*) from payments p join operations o on o.id = p.operation_id where o.number = '${P}'`) === '1', 'mirar otra vez no cobra dos veces');
  ok(sql(`select count(*) from notifications where tpl = 'plan_cobro' and ref_id = '${P}'`) === '1', 'aviso: cobro de tu plan');
  // ── Saltar la próxima ──
  const next0 = sql(`select s.next_visit_on from plan_subscriptions s join operations o on o.id = s.operation_id where o.number = '${P}'`);
  await clic(m.getByRole('button', { name: 'Saltar la próxima' })); await m.getByText(/esa visita no va/).waitFor();
  ok(sql(`select status from operations where number = '${v1.split('|')[0]}'`) === 'cancelled', 'saltar: la visita se quitó');
  ok(sql(`select s.next_visit_on > '${next0}'::date + 20 from plan_subscriptions s join operations o on o.id = s.operation_id where o.number = '${P}'`) === 't', 'saltar: la próxima pasa al mes siguiente');
  // ── Pausar y reanudar ──
  await clic(m.getByRole('button', { name: 'Pausar un mes' })); await m.getByText('EN PAUSA').first().waitFor(); ok(true, 'pausa un mes: EN PAUSA');
  ok(sql(`select count(*) from notifications where tpl = 'plan_pausa' and ref_id = '${P}'`) === '1', 'aviso: plan en pausa');
  await clic(m.getByRole('button', { name: 'Reanudar' })); await m.getByText('PLAN ACTIVO').first().waitFor(); ok(true, 'reanudar → activo');
  // ── El banco rechaza: reintento a los 2 días; al tercero, pausa ──
  sql(`update plan_subscriptions set payment_method = 'pm_sim_visa_0002_7725ac2e', next_charge_on = '${hoy()}', retry_on = null, fail_count = 0 where operation_id = (select id from operations where number = '${P}')`);
  await m.goto(B + `/plan/${P}`); await m.getByText(/Tu banco rechazó el último cobro/).waitFor();
  ok(sql(`select fail_count || '|' || (retry_on = '${hoy()}'::date + 2) from plan_subscriptions s join operations o on o.id = s.operation_id where o.number = '${P}'`) === '1|true', 'rechazo 1: reintento en 2 días');
  for (let k = 0; k < 2; k++) { sql(`update plan_subscriptions set retry_on = '${hoy()}' where operation_id = (select id from operations where number = '${P}')`); await m.goto(B + `/plan/${P}`); await m.waitForTimeout(300); }
  await m.getByText('Tu banco rechazó el cobro').first().waitFor();
  ok(sql(`select s.status || '|' || fail_count from plan_subscriptions s join operations o on o.id = s.operation_id where o.number = '${P}'`) === 'paused|3', 'rechazo 3: plan en pausa');
  ok(sql(`select count(*) from notifications where tpl = 'plan_fallo' and ref_id = '${P}'`) === '3', 'aviso en cada rechazo');
  await m.screenshot({ path: OUT + 'l3-plan-banco-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Cambiar la tarjeta' }));
  await clic(m.getByRole('button', { name: /^Usar Visa ·· 4242/ }));
  await m.getByText('PLAN ACTIVO').first().waitFor();
  ok(sql(`select s.status || '|' || fail_count || '|' || charges_ok || '|' || payment_method from plan_subscriptions s join operations o on o.id = s.operation_id where o.number = '${P}'`) === 'active|0|2|pm_sim_visa_4242_c13c3c00', 'cambiar la tarjeta: activo y se cobró el período pendiente');
  // ── Panel ──
  const h = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p.push(h); h.on('pageerror', e => err.push('panel ' + e.message)); await entrar(h, '5705550233');
  await h.goto(B + `/panel/${D}/hoy`); await h.getByText(/TUS PLANES · 1 ACTIVO/).waitFor(); ok(!!(await vis(h.getByText(/Marisol P\. · Mantenimiento de la casa/))), 'panel: Tus planes · Marisol');
  await h.screenshot({ path: OUT + 'l4-panel-planes-d.png', fullPage: true });
  // ── Cancelar ──
  await clic(m.getByRole('button', { name: 'Cancelar el plan' })); await clic(m.getByRole('button', { name: 'Sí, cancelar' }));
  await m.getByText('CANCELADO').first().waitFor(); ok(!!(await vis(m.getByText(/Cobrado en total: \$298/))), 'cancelado · cobrado en total $298');
  ok(sql(`select count(*) from operations where kind = 'appointment' and details->>'plan' = '${P}' and status = 'confirmed'`) === '0', 'cancelar: no quedan visitas');
  sql(`update plan_subscriptions set next_charge_on = '${hoy()}' where operation_id = (select id from operations where number = '${P}')`);
  await m.goto(B + `/plan/${P}`); await m.waitForTimeout(300);
  ok(sql(`select count(*) from payments p join operations o on o.id = p.operation_id where o.number = '${P}'`) === '2', 'cancelado: no se cobra más');
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); limpiar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png', fullPage: true }); console.log('url', p.url()); } } catch {} try { limpiar(); } catch {} process.exit(1); });
