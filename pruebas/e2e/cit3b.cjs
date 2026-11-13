const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'barberia-el-primo';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const MARISOL = `(select id from users where phone = '+15705550122')`, JUAN = `(select id from users where phone = '+15705550144')`;
const LUIS = `(select id from business_members where business_id = '${BIZ}' and kind = 'owner')`, KEL = `(select id from business_members where business_id = '${BIZ}' and display_name = 'Kelvin Rosario')`;
const SV = (n) => `(select id from items where business_id = '${BIZ}' and module = 'svc' and name->>'es' = '${n}' and removed_at is null)`;
const limpiar = () => {
  // Solo la base local de pruebas. Nada se borra: las citas de prueba anteriores quedan canceladas y su depósito liberado.
  sql(`update payments set status = 'released', released_at = now() where status = 'held' and operation_id in (select id from operations where user_id = ${MARISOL} and business_id = '${BIZ}')`);
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id = ${MARISOL} and business_id = '${BIZ}' and status in ('pending', 'change_proposed', 'confirmed')`);
  sql(`delete from notifications where ref_kind = 'appointment' and ref_id in (select number from operations where business_id = '${BIZ}' and user_id = ${MARISOL})`); // 9b-1 · solo los de sus citas (antes: TODOS los avisos de citas de la base)
  sql(`delete from appointment_alerts where user_id = ${MARISOL}`);
  sql(`delete from special_hours where business_id = '${BIZ}' and label->>'es' = 'prueba'`);
  sql(`update items set duration_min = 40, svc_opts = '[]'::jsonb, sell = true, status = 'live', hidden_reason = null where id = ${SV('Fade')}`);
  sql(`update business_members set chair_auto = false, chair_deposit_cents = 1000, chair_response_min = 15 where id = ${LUIS}`);
  sql(`update business_members set chair_auto = true, chair_deposit_cents = 500 where id = ${KEL}`); sql(`delete from member_payout_accounts where member_id = ${KEL}`); // sin su cuenta propia: no pide depósito (3d)
  sql(`update businesses set svc_model = 'chair', modules_on = array['svc','citas','staff'], modules_off = modules_off - 'citas' - 'svc' where id = '${BIZ}'`);
  // 9b-1 · La cita de Juan con Luis MAÑANA a las 10:00 (la que ocupa 10:00 y 10:30). Antes era la de la semilla 0011, que es «mañana» del día en
  // que se sembró la base: al día siguiente ya no estaba. Si mañana no la tiene, se la pone igual que la semilla (confirmada, 40 min + 5).
  sql(`insert into operations (number, kind, city_id, business_id, user_id, member_id, status, scheduled_at, duration_min, buffer_min, details, subtotal_cents, total_cents, pay_mode, confirmed_at, answered_at, client_key, is_test)
       select 'C-' || nextval('operations_appt_seq'), 'appointment', 'hzl', '${BIZ}', u.id, ${LUIS}, 'confirmed', (((now() at time zone 'America/New_York')::date + 1) + time '10:00') at time zone 'America/New_York', 40, 5,
              jsonb_build_object('svc', '{\"es\":\"Fade\",\"en\":\"Fade\"}'::jsonb, 'svcId', ${SV('Fade')}::text, 'opts', '[]'::jsonb, 'adds', '[]'::jsonb, 'para', 'me', 'sms', true, 'base', 2800), 2800, 2800, 'local', now(), now(), gen_random_uuid(), true
         from users u where u.phone = '+15705550144'
          and not exists (select 1 from operations o where o.business_id = '${BIZ}' and o.user_id = u.id and o.member_id = ${LUIS} and o.status = 'confirmed'
                          and o.scheduled_at = (((now() at time zone 'America/New_York')::date + 1) + time '10:00') at time zone 'America/New_York')`);
};
(async () => {
  limpiar();
  // 9b-1 · Las dos tarjetas de Marisol que usa (la que el banco rechaza y la buena): se guardan si no las tiene (una base nueva no las tenía).
  { const T = require('../lib/negocio-nuevo.cjs').tarjeta; T('5705550122', '0002', { predeterminada: false }); T('5705550122', '4242'); }
  const b = await chromium.launch(); const err = [];
  const ctxM = await b.newContext({ ...devices['iPhone 13'] }); const m = await ctxM.newPage();
  m.on('pageerror', e => err.push(e.message)); m.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  // 1. Visitante: pestaña Servicios
  await m.goto(B + `/n/${BIZ}?tab=svc`); const tab = m.locator('[data-screen-label="Ficha · servicios"]'); await tab.waitFor();
  ok(!!(await vis(tab.getByText('Por servicio'))), 'pestaña Servicios con Por servicio / Por barbero');
  ok(!!(await vis(tab.getByText(/\$22–\$28/))), 'Fade: rango de precio de las sillas ($22–$28)');
  ok(!!(await vis(tab.getByText(/4 BARBEROS/).first())), 'meta: 4 barberos');
  ok(!!(await vis(tab.getByText(/Cada barbero renta su silla/))), 'nota: cada barbero pone su precio');
  await m.screenshot({ path: OUT + 'b1-servicios-m.png', fullPage: true });
  await tab.getByText('Por barbero').click(); await tab.getByText('CONFIRMA AL INSTANTE').first().waitFor();
  ok(await tab.getByText('SILLA 2').count() === 1 && !!(await vis(tab.getByText(/RESPONDE EN ~15 MIN/).first())), 'por barbero: silla, confirma al instante / responde en ~15 min');
  await m.screenshot({ path: OUT + 'b2-barberos-m.png', fullPage: true });
  // 2. Marisol: hoja del Fade
  await entrar(m, '5705550122');
  await m.goto(B + `/n/${BIZ}?tab=svc`); await tab.waitFor(); await clic(tab.getByText('Fade', { exact: true }));
  const hoja = m.locator('[data-screen-label="Servicio · opciones"]'); await hoja.getByText('¿Con quién?').waitFor();
  ok(await hoja.getByRole('button', { name: 'Elige con quién' }).isDisabled(), 'sin elegir con quién no sigue');
  await hoja.getByRole('button', { name: /Luis Batista/ }).click();
  ok(!!(await vis(hoja.getByText(/Depósito de \$10: se retiene al enviar, se cobra cuando confirman/))), 'Luis: depósito de $10 al enviar');
  ok(!!(await vis(hoja.getByText('$28').first())), 'precio exacto de Luis: $28');
  await m.screenshot({ path: OUT + 'b3-hoja-m.png', fullPage: false });
  await hoja.getByRole('button', { name: 'Elegir día y hora' }).click(); await m.waitForURL(/\/cita\?/);
  // 3. Booking: mañana, 10:00 ocupada (cita de Juan), 11:00 libre
  const bk = m.locator('[data-screen-label="APP-NEG-BOOKING · móvil"]'); await bk.getByText('DÍA', { exact: true }).waitFor();
  await bk.locator('[data-screen-label="APP-NEG-BOOKING · móvil"] >> text=/^\\d+$/').first().waitFor().catch(() => {});
  const dias = bk.getByRole('radio', { name: /^(LUN|MAR|MIÉ|JUE|VIE|SÁB|DOM) / });
  await dias.first().click(); await m.waitForTimeout(300); await m.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
  const diez = bk.getByRole('radio', { name: '10:00 AM', exact: true }), diezMedia = bk.getByRole('radio', { name: '10:30 AM', exact: true }), once = bk.getByRole('radio', { name: '11:00 AM', exact: true });
  await once.waitFor();
  ok(await diez.isDisabled() && await diezMedia.isDisabled(), 'mañana 10:00 y 10:30 ocupadas (cita de Juan + tiempo entre citas)');
  await once.click(); await bk.getByText(/De 11:00 AM a ~11:40 AM · 40 min/).waitFor(); ok(true, 'De 11:00 AM a ~11:40 AM · 40 min');
  ok(!!(await vis(bk.getByText(/agenda de Luis/))), 'nota: horas de la agenda de Luis');
  await m.screenshot({ path: OUT + 'b4-dia-hora-m.png', fullPage: true });
  await m.locator('[data-screen-label="Booking · barra"]').getByRole('button', { name: 'Continuar' }).click();
  await bk.getByText('¿PARA QUIÉN ES?').waitFor(); await bk.getByRole('radio', { name: /Para otra persona/ }).click();
  ok(await m.locator('[data-screen-label="Booking · barra"]').getByRole('button', { name: 'Continuar' }).isDisabled(), 'otra persona sin nombre: no sigue');
  await bk.getByRole('radio', { name: /Para mí/ }).click(); await bk.getByLabel(/NOTA PARA LUIS/).fill('Fade bajo, dejar largo arriba');
  ok(await bk.getByRole('switch', { name: 'Recordatorio' }).getAttribute('aria-checked') === 'true', 'recordatorio encendido');
  await m.screenshot({ path: OUT + 'b5-detalles-m.png', fullPage: true });
  await m.locator('[data-screen-label="Booking · barra"]').getByRole('button', { name: 'Continuar' }).click();
  await bk.getByText('ANTES DE ENVIAR').waitFor();
  ok(!!(await vis(m.getByText('HOY PAGAS'))) && !!(await vis(m.locator('[data-screen-label="Booking · barra"]').getByText('$10'))), 'Revisa y envía: hoy pagas $10');
  ok(!!(await vis(bk.getByText(/TU DEPÓSITO DE \$10/))) && !!(await vis(bk.getByText('Se queda con Luis'))), 'qué pasa con tu depósito');
  ok(!!(await vis(bk.getByText(/Luis tiene 2 h para contestar/))), 'Luis tiene 2 h para contestar');
  await m.screenshot({ path: OUT + 'b6-revisa-m.png', fullPage: true });
  // Tarjeta rechazada (0002): no hay cita
  const antes = sql(`select count(*) from operations where user_id = ${MARISOL} and kind = 'appointment'`);
  await clic(m.locator('[data-screen-label="Booking · método de pago"]')); const mp = m.locator('[data-screen-label="Método de pago"]');
  await clic(mp.getByText(/0002/)); await clic(mp.getByText(/^Usar /)); await mp.waitFor({ state: 'detached' });
  await m.locator('[data-screen-label="Booking · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click();
  await bk.getByText('Tu tarjeta fue rechazada').waitFor(); ok(sql(`select count(*) from operations where user_id = ${MARISOL} and kind = 'appointment'`) === antes, 'tarjeta rechazada: no hay cita ni cobro');
  await clic(m.locator('[data-screen-label="Booking · método de pago"]')); await clic(mp.getByText(/4242/)); await clic(mp.getByText(/^Usar /)); await mp.waitFor({ state: 'detached' });
  await m.locator('[data-screen-label="Booking · barra"]').getByRole('button', { name: 'Enviar solicitud' }).click(); await m.waitForURL(/\/cita\/C-\d+$/);
  const n1 = m.url().split('/').pop();
  await m.getByText('PENDIENTE DE CONFIRMAR').waitFor(); ok(!!(await vis(m.getByText('Solicitud enviada').first())), `${n1}: Solicitud enviada · pendiente de confirmar`);
  ok(sql(`select status || '|' || deposit_cents || '|' || total_cents || '|' || (member_id = ${LUIS}) || '|' || to_char(scheduled_at at time zone 'America/New_York', 'HH24:MI') || '|' || buffer_min from operations where number = '${n1}'`) === 'pending|1000|2800|true|11:00|5', 'cita guardada: pendiente, $10 de $28, con Luis, 11:00, 5 min entre citas');
  ok(sql(`select kind || '|' || status || '|' || amount_cents || '|' || fee_cents from payments where operation_id = (select id from operations where number = '${n1}')`) === 'deposit|held|1000|80', 'depósito retenido $10, comisión 8 % ($0.80)');
  ok(sql(`select round(extract(epoch from respond_by - sent_at) / 3600)::int from operations where number = '${n1}'`) === '2', 'vence a las 2 h');
  ok(sql(`select count(*) from notifications n join users u on u.id = n.user_id where u.phone = '+15705550166' and n.tpl = 'biz_cita' and n.ref_id = '${n1}'`) === '1', 'aviso a Luis: nueva solicitud de cita');
  ok(sql(`select customer_note from operations where number = '${n1}'`) === 'Fade bajo, dejar largo arriba', 'nota guardada');
  await m.screenshot({ path: OUT + 'b7-estado-m.png', fullPage: true });
  // 4. La misma hora ya no está libre para otra persona
  const ctxJ = await b.newContext({ ...devices['iPhone 13'] }); const j = await ctxJ.newPage(); await entrar(j, '5705550144');
  await j.goto(B + `/n/${BIZ}/cita?s=${sql(`select ${SV('Fade')}`)}&con=${sql(`select ${LUIS}`)}`); const bj = j.locator('[data-screen-label="APP-NEG-BOOKING · móvil"]'); await bj.getByText('DÍA', { exact: true }).waitFor();
  await bj.getByRole('radio', { name: /^(LUN|MAR|MIÉ|JUE|VIE|SÁB|DOM) / }).first().click(); await j.waitForTimeout(300); await j.waitForFunction(() => !document.querySelector('[aria-busy="true"]')); await bj.getByRole('radio', { name: '11:00 AM', exact: true }).waitFor();
  ok(await bj.getByRole('radio', { name: '11:00 AM', exact: true }).isDisabled(), 'la hora pedida ya sale ocupada para Juan');
  await ctxJ.close();
  // 5. Kelvin confirma al instante (silla rentada: sin depósito hasta que tenga su cuenta)
  await m.goto(B + `/n/${BIZ}?tab=svc`); await tab.waitFor();
  ok(!!(await vis(tab.locator('[data-screen-label]').getByText('TU CITA').first())) || !!(await vis(m.getByText('TU CITA').first())), 'la ficha muestra TU CITA');
  await clic(tab.getByText('Corte clásico', { exact: true })); await hoja.getByText('¿Con quién?').waitFor(); await hoja.getByRole('button', { name: /Kelvin Rosario/ }).click();
  ok(!(await vis(hoja.getByText(/Depósito de/))), 'Kelvin sin cuenta de cobro propia: no pide depósito');
  await hoja.getByRole('button', { name: 'Elegir día y hora' }).click(); await m.waitForURL(/\/cita\?/);
  await bk.getByText('DÍA', { exact: true }).waitFor(); await bk.getByRole('radio', { name: /^(LUN|MAR|MIÉ|JUE|VIE|SÁB|DOM) / }).nth(1).click(); await m.waitForTimeout(300); await m.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
  await clic(bk.getByRole('radio', { name: '1:00 PM', exact: true }));
  for (let k = 0; k < 2; k++) { await m.locator('[data-screen-label="Booking · barra"]').getByRole('button', { name: 'Continuar' }).click(); await m.waitForTimeout(300); }
  await bk.getByText('No pide depósito. No se cobra nada ahora.').waitFor(); ok(true, 'sin depósito: no se cobra nada ahora');
  await m.locator('[data-screen-label="Booking · barra"]').getByRole('button', { name: 'Confirmar cita' }).click(); await m.waitForURL(/\/cita\/C-\d+$/);
  const n2 = m.url().split('/').pop(); await m.getByText('Cita confirmada').first().waitFor();
  ok(sql(`select status || '|' || deposit_cents || '|' || pay_mode from operations where number = '${n2}'`) === 'confirmed|0|local', `${n2}: confirmada al instante, sin depósito`);
  ok(sql(`select count(*) from notifications n where n.user_id = ${MARISOL} and n.tpl = 'cita_ok' and n.ref_id = '${n2}'`) === '1', 'aviso a Marisol: cita confirmada');
  await m.screenshot({ path: OUT + 'b8-confirmada-m.png', fullPage: true });
  // 6. Sin horas en 14 días (cerrado por prueba) → «No quedan horas» y «Avísame si se libera una hora»
  sql(`insert into special_hours (business_id, kind, date_from, date_to, closed, label) select '${BIZ}', 'holiday', (now() at time zone 'America/New_York')::date, (now() at time zone 'America/New_York')::date + 14, true, '{"es":"prueba","en":"test"}'::jsonb`);
  await m.goto(B + `/n/${BIZ}/cita?s=${sql(`select ${SV('Fade')}`)}&con=${sql(`select ${LUIS}`)}`); await bk.getByText(/No quedan horas el/).waitFor();
  ok(await bk.getByRole('radio', { name: /^(LUN|MAR|MIÉ|JUE|VIE|SÁB|DOM) / }).first().getAttribute('aria-disabled') === 'true', 'días cerrados: no se pueden elegir');
  await bk.getByText('Avísame si se libera una hora').click(); await bk.getByText('Te avisamos en Avisos si se libera una hora').waitFor();
  ok(sql(`select count(*) from appointment_alerts where user_id = ${MARISOL} and removed_at is null and member_id = ${LUIS}`) === '1', 'Avísame: guardado para ese día y con Luis');
  await m.screenshot({ path: OUT + 'b8b-sin-horas-m.png', fullPage: true });
  await bk.getByText('Te avisamos en Avisos si se libera una hora').click(); await bk.getByText('Avísame si se libera una hora').waitFor();
  ok(sql(`select count(*) from appointment_alerts where user_id = ${MARISOL} and removed_at is null`) === '0', 'Avísame: se puede quitar');
  sql(`delete from special_hours where business_id = '${BIZ}' and label->>'es' = 'prueba'`);
  // 6b. Hoy cerrado (si hoy no tiene horas) → abre en el primer día con horas
  await m.goto(B + `/n/${BIZ}/cita?s=${sql(`select ${SV('Fade')}`)}&con=${sql(`select ${LUIS}`)}`); await bk.getByText('DÍA', { exact: true }).waitFor(); await m.waitForTimeout(300); await m.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
  ok(await bk.getByRole('radio').filter({ hasText: '' }).count() > 0 && !(await vis(bk.getByText(/No quedan horas el/))), 'abre en un día con horas libres');
  // 7. No se cuela HTML/JS ni scroll de lado
  const ancho = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); ok(ancho <= 0, 'teléfono sin scroll de lado');
  // 8. Escritorio
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); await entrar(d, '5705550122');
  d.on('pageerror', e => err.push(e.message));
  await d.goto(B + `/n/${BIZ}?tab=svc`); await d.locator('[data-screen-label="Ficha · servicios · desktop"]').waitFor(); for (let k = 0; k < 20 && !(await vis(d.locator('[data-screen-label="Ficha · Booking · columna"]'))); k++) await d.waitForTimeout(250); ok(!!(await vis(d.locator('[data-screen-label="Ficha · Booking · columna"]'))), 'escritorio: columna Booking');
  await d.screenshot({ path: OUT + 'b9-servicios-d.png', fullPage: true });
  await d.goto(B + `/n/${BIZ}/cita?s=${sql(`select ${SV('Fade')}`)}&con=${sql(`select ${LUIS}`)}`); await d.locator('[data-screen-label="APP-NEG-BOOKING · desktop"]').getByText('Antes de enviar', { exact: true }).waitFor();
  await d.screenshot({ path: OUT + 'b10-booking-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores en la consola: ' + err.join(' | '));
  await b.close(); limpiar(); console.log('LISTO');
})().catch(async (e) => { console.error('FALLO', e.message); process.exit(1); });
