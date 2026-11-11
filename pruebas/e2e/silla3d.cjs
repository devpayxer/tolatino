const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'barberia-el-primo';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const MARISOL = `(select id from users where phone = '+15705550122')`, JUAN = `(select id from users where phone = '+15705550144')`;
const KEL = `(select id from business_members where business_id = '${BIZ}' and chair_seat = 2)`;
const SV = (n) => `(select id from items where business_id = '${BIZ}' and module = 'svc' and name->>'es' = '${n}' and removed_at is null)`;
const ESPERA = async (p) => { await p.waitForTimeout(300); await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]')); };
const limpiar = () => {
  sql(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, simulated) select ${MARISOL}, 'pm_sim_visa_4242_c13c3c00', 'visa', '4242', '12/30', true, true where not exists (select 1 from payment_methods where stripe_pm_id = 'pm_sim_visa_4242_c13c3c00')`);
  sql(`update payment_methods set status = 'active' where stripe_pm_id = 'pm_sim_visa_4242_c13c3c00'`);
  sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated) values ('${BIZ}', 'acct_sim_${BIZ}', 'enabled', true, true, '[]'::jsonb, '4321', true) on conflict (business_id) do nothing`);
  sql(`update payments set status = 'released' where status = 'held' and operation_id in (select id from operations where user_id = ${MARISOL} and business_id = '${BIZ}')`);
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id = ${MARISOL} and business_id = '${BIZ}' and status in ('pending', 'change_proposed', 'confirmed')`);
  // La cuenta de Kelvin vuelve a «sin conectar» (solo base local de pruebas).
  sql(`delete from member_payout_accounts where member_id = ${KEL}`); sql(`update business_members set payout_invited_at = null, chair_auto = true, chair_deposit_cents = 500 where id = ${KEL}`);
  sql(`delete from notifications where tpl in ('silla_cobro', 'biz_silla_cobro') or ref_kind = 'appointment'`);
  sql(`update businesses set svc_model = 'chair', modules_on = array['svc','citas','staff'], modules_off = modules_off - 'citas' - 'svc' where id = '${BIZ}'`);
};
(async () => {
  limpiar();
  const b = await chromium.launch(); const err = [];
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); await entrar(d, '5705550166'); d.on('pageerror', (e) => err.push('panel ' + e.message));
  // 1. Sin cuenta propia, la silla de Kelvin no pide depósito
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(m, '5705550122'); m.on('pageerror', (e) => err.push(e.message));
  m.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  await m.goto(B + `/n/${BIZ}/silla/2`); const tab = m.locator('[data-screen-label="Ficha · servicios"]'); await tab.waitFor();
  ok(!!(await vis(m.getByText('Kelvin Rosario'))) && !!(await vis(m.getByText(/Barbero · Silla 2 en Barbería El Primo/))), 'página de la silla: Kelvin, «Barbero · Silla 2 en Barbería El Primo»');
  ok(!!(await vis(m.getByText(/SILLA 2 · DESDE 2019/))), 'tarjeta «SILLA 2 · DESDE 2019» con el local');
  ok(!(await vis(tab.getByText('Por barbero'))) && !!(await vis(tab.getByText(/Kelvin pone estos precios y Kelvin cobra/))), 'servicios de Kelvin con sus precios; sin «por barbero»');
  ok(!!(await vis(tab.getByText(/confirmación automática/))), 'confirma al instante');
  ok(!(await vis(tab.getByText(/Depósito de/))), 'sin cuenta propia: no pide depósito');
  await m.screenshot({ path: OUT + 'd1-silla-m.png', fullPage: true });
  // 2. El dueño le pide que conecte su cuenta (Panel › Sillas)
  await d.goto(B + `/panel/${BIZ}/vendes/sillas`); await d.getByText('SILLA 2 · KELVIN ROSARIO').waitFor();
  ok(!!(await vis(d.getByText(/Sin conectar: su silla no pide depósito en línea/).first())), 'Sillas: Kelvin sin conectar');
  await clic(d.getByRole('button', { name: 'Pedirle a Kelvin que la conecte' })); await d.getByText('Le avisamos a Kelvin.').first().waitFor();
  ok(sql(`select count(*) from notifications n join users u on u.id = n.user_id where u.phone = '+15705550177' and n.tpl = 'silla_cobro'`) === '1', 'aviso a Kelvin: conecta tu cuenta de cobro');
  ok(!!(await vis(d.getByRole('button', { name: 'Pedirle a Andy que la conecte' }))), 'Andy (sin usuario): también se le puede pedir (el servidor dice qué falta)');
  await clic(d.getByRole('button', { name: 'Pedirle a Andy que la conecte' })); await d.getByText(/todavía no entra a To'Latino/).first().waitFor(); ok(true, 'Andy sin usuario: «invítalo desde Equipo»');
  await d.screenshot({ path: OUT + 'd2-sillas-d.png', fullPage: true });
  // 3. Kelvin conecta su cuenta (simulador)
  const k = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(k, '5705550177'); k.on('pageerror', (e) => err.push('kelvin ' + e.message));
  const mid = sql(`select ${KEL}`);
  await k.goto(B + `/cuenta/silla/${mid}`); await k.getByText('Conecta tu cuenta de cobro').first().waitFor();
  await k.screenshot({ path: OUT + 'd3-cobro-m.png', fullPage: true });
  await k.getByRole('button', { name: 'Conectar mi cuenta' }).click(); await k.waitForURL(/\/cuenta\/silla\/.*vuelta=1/); await k.getByText('Tu cuenta de cobro está conectada').first().waitFor();
  ok(sql(`select status || '|' || charges_enabled || '|' || stripe_account_id from member_payout_accounts where member_id = ${KEL}`) === `enabled|true|acct_sim_m-${mid}`, 'cuenta propia de Kelvin habilitada (simulada)');
  ok(sql(`select count(*) from notifications n join users u on u.id = n.user_id where u.phone = '+15705550166' and n.tpl = 'biz_silla_cobro'`) === '1', 'aviso al dueño: Kelvin conectó su cuenta');
  // otra persona no puede abrir la página de cobro de Kelvin
  await m.goto(B + `/cuenta/silla/${mid}`); ok(await m.getByText(/no existe|No encontramos|404/i).first().isVisible().catch(() => false) || !(await vis(m.getByText('Conectar mi cuenta'))), 'la página de cobro solo la ve Kelvin');
  // 4. Cita con Kelvin: depósito $5 a SU cuenta
  await m.goto(B + `/n/${BIZ}/silla/2`); await tab.waitFor(); await clic(tab.getByText('Fade', { exact: true }));
  const hoja = m.locator('[data-screen-label="Servicio · opciones"]'); await hoja.getByText(/Depósito de \$5/).waitFor(); ok(true, 'con cuenta: la silla pide $5 de depósito');
  await hoja.getByRole('button', { name: 'Elegir día y hora' }).click(); await m.waitForURL(/\/cita\?/);
  const bk = m.locator('[data-screen-label="APP-NEG-BOOKING · móvil"]'); await bk.getByText('DÍA', { exact: true }).waitFor();
  await bk.getByRole('radio', { name: /^(LUN|MAR|MIÉ|JUE|VIE|SÁB|DOM) / }).nth(1).click(); await ESPERA(m);
  await bk.locator('[role="radio"]:not([aria-disabled="true"])').filter({ hasText: /\d:\d\d [AP]M/ }).first().click();
  const barra = m.locator('[data-screen-label="Booking · barra"]'); await barra.getByRole('button', { name: 'Continuar' }).click(); await bk.getByText('¿PARA QUIÉN ES?').waitFor();
  await barra.getByRole('button', { name: 'Continuar' }).click(); await bk.getByText('ANTES DE ENVIAR').waitFor();
  await clic(m.locator('[data-screen-label="Booking · método de pago"]')); const mp = m.locator('[data-screen-label="Método de pago"]'); await clic(mp.getByText(/4242/)); await clic(mp.getByText(/^Usar /)); await mp.waitFor({ state: 'detached' });
  await barra.getByRole('button', { name: 'Confirmar cita' }).click(); await m.waitForURL(/\/cita\/C-\d+$/);
  const n1 = m.url().split('/').pop();
  ok(sql(`select o.status || '|' || p.status || '|' || p.amount_cents || '|' || s.destination from operations o join payments p on p.operation_id = o.id join sim_intents s on s.id = p.stripe_payment_intent where o.number = '${n1}'`) === `confirmed|captured|500|acct_sim_m-${mid}`, `${n1}: depósito de $5 cobrado a la cuenta de Kelvin (no la del local)`);
  // 5. Reseña de una cita con Kelvin → «VERIFICADA · CON KELVIN» en su página
  sql(`update reviews set status = 'removed' where user_id = ${JUAN} and business_id = '${BIZ}'`);
  sql(`insert into operations (number, kind, city_id, business_id, user_id, member_id, status, status_detail, scheduled_at, duration_min, details, subtotal_cents, total_cents, pay_mode, done_at, client_key, is_test)
       values ('C-' || nextval('operations_appt_seq'), 'appointment', 'hzl', '${BIZ}', ${JUAN}, ${KEL}, 'done', 'done', now() - interval '2 days', 40, '{"svc":{"es":"Fade","en":"Fade"}}'::jsonb, 2500, 2500, 'local', now() - interval '2 days', gen_random_uuid(), true)`);
  sql(`insert into reviews (business_id, city_id, user_id, operation_id, src, stars, body, status) select '${BIZ}', 'hzl', ${JUAN}, max(id), 'cita', 5, 'Kelvin me dejó el fade perfecto, puntual y con buena conversación.', 'visible' from operations where user_id = ${JUAN} and member_id = ${KEL} and status = 'done'`);
  await m.goto(B + `/n/${BIZ}/silla/2?tab=rev`); await clic(m.getByText('VERIFICADA · CON KELVIN')); ok(true, 'reseña con la cita: «VERIFICADA · CON KELVIN»');
  await m.goto(B + `/n/${BIZ}/silla/3`); await m.locator('[data-screen-label="Ficha · servicios"]').waitFor(); ok(!(await vis(m.getByText('Kelvin me dejó el fade perfecto'))), 'la página de Andy no muestra reseñas de Kelvin');
  // 6. Por barbero › Ver su página
  await m.goto(B + `/n/${BIZ}?tab=svc`); await tab.waitFor(); await tab.getByText('Por barbero').click(); await clic(tab.getByRole('button', { name: 'Ver su página' }).nth(1)); await m.waitForURL(/\/silla\/2$/); ok(true, 'Por barbero › Ver su página');
  // 7. Escritorio
  await d.goto(B + `/n/${BIZ}/silla/2`); await d.locator('[data-screen-label="Ficha · servicios · desktop"]').waitFor(); await d.screenshot({ path: OUT + 'd4-silla-d.png', fullPage: true });
  const ancho = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); ok(ancho <= 0, 'teléfono sin scroll de lado');
  ok(err.length === 0, 'sin errores en la consola: ' + err.join(' | '));
  await b.close(); console.log('LISTO');
})().catch(async (e) => { console.error('FALLO', e.message); process.exit(1); });
