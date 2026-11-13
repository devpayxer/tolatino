const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', T = 'taller-hermanos-pena', H = 'plomeria-rodriguez';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { for (let i = 0; i < 40; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const ESPERA = async (p) => { await p.waitForTimeout(300); await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]')); };
const MARISOL = "(select id from users where phone = '+15705550122')";
const limpiar = () => {
  sql(`update payments set status = 'released', released_at = now() where status = 'held' and operation_id in (select id from operations where user_id = ${MARISOL} and business_id in ('${T}','${H}'))`);
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id = ${MARISOL} and business_id in ('${T}','${H}') and status in ('pending', 'change_proposed', 'confirmed')`);
  sql(`update user_vehicles set removed_at = now() where user_id = ${MARISOL} and removed_at is null`); sql(`update user_homes set removed_at = now() where user_id = ${MARISOL} and removed_at is null`);
  sql(`update items set sell = true where business_id = '${T}' and name->>'es' = 'Cambio de aceite'`);
};
(async () => {
  limpiar();
  // Datos de partida: su CR-V; su casa (inquilina) a menos de 1 milla; tarjeta de prueba; cuenta de cobro simulada de la plomería.
  sql(`insert into user_vehicles (user_id, year, make, model, mileage, veh_type, size, tire_size, is_default) values (${MARISOL}, 2016, 'honda', 'CR-V', 84200, 's', 's', '225/65R17', true)`);
  sql(`insert into user_addresses (user_id, label, street, zip, geo, geo_quality, city_id, is_default) select ${MARISOL}, 'casa', '112 W Oak St', '18201', ST_SetSRID(ST_MakePoint(-75.9775, 40.9584), 4326)::geography, 'numero', 'hzl', false where not exists (select 1 from user_addresses where user_id = ${MARISOL} and street = '112 W Oak St' and removed_at is null)`);
  sql(`insert into user_homes (user_id, address_id, kind, tenure, is_default) select ${MARISOL}, id, 'casa', 'inq', true from user_addresses where user_id = ${MARISOL} and street = '112 W Oak St' and removed_at is null limit 1`);
  sql(`insert into payment_methods (user_id, stripe_pm_id, brand, last4, exp, is_default, simulated) select ${MARISOL}, 'pm_sim_visa_4242_c13c3c00', 'visa', '4242', '12/30', true, true where not exists (select 1 from payment_methods where stripe_pm_id = 'pm_sim_visa_4242_c13c3c00')`);
  sql(`update payment_methods set status = 'active' where stripe_pm_id = 'pm_sim_visa_4242_c13c3c00'`);
  sql(`insert into stripe_accounts (business_id, stripe_account_id, status, charges_enabled, payouts_enabled, requirements, bank_last4, simulated) values ('${H}', 'acct_sim_${H}', 'enabled', true, true, '[]'::jsonb, '7788', true) on conflict (business_id) do nothing`);
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); globalThis.__p = [m]; await entrar(m, '5705550122');
  m.on('pageerror', e => err.push(e.message)); m.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  // ── Auto: Cambio de aceite (precio cerrado, con opción de aceite) ──
  await m.goto(B + `/n/${T}?tab=svc`); await clic(m.getByText('Cambio de aceite', { exact: true }));
  const hoja = m.locator('[data-screen-label="Servicio · opciones"]'); await hoja.waitFor();
  await clic(hoja.getByText('Mezcla sintética', { exact: false }));
  await clic(hoja.getByRole('button', { name: 'Elegir día y hora' })); await m.waitForURL(/\/visita\?/);
  const bk = m.locator('[data-screen-label="APP-NEG-AUTO-BOOKING · móvil"]'); await bk.getByText('TU VEHÍCULO').waitFor();
  ok(!!(await vis(bk.getByText('Trabajan con tu CR-V'))), 'Booking Auto · Tu carro: CR-V compatible');
  await m.screenshot({ path: OUT + 'v1-auto-paso1-m.png', fullPage: true });
  const barra = m.locator('[data-screen-label="Booking · barra"]');
  await barra.getByRole('button', { name: 'Continuar' }).click(); await bk.getByText('DÍA', { exact: true }).waitFor(); await ESPERA(m);
  await bk.getByRole('radio', { name: /^(LUN|MAR|MIÉ|JUE|VIE|SÁB|DOM) /, disabled: false }).nth(1).click(); await ESPERA(m);
  const slot = bk.locator('[role="radio"]:not([aria-disabled="true"])').filter({ hasText: /\d:\d\d [AP]M/ }).first(); const hora = (await slot.textContent()).trim(); await slot.click();
  await m.screenshot({ path: OUT + 'v2-auto-hora-m.png', fullPage: true });
  await barra.getByRole('button', { name: 'Continuar' }).click(); await bk.getByText('CÓMO SE COBRA').waitFor();
  ok(!!(await vis(bk.getByText('Guárdame las piezas viejas'))), 'Revisa y envía: «Guárdame las piezas viejas»');
  await clic(bk.getByRole('switch', { name: 'Guárdame las piezas viejas' }));
  await m.screenshot({ path: OUT + 'v3-auto-revisa-m.png', fullPage: true });
  await barra.getByRole('button', { name: /Enviar solicitud|Confirmar cita/ }).click(); await m.waitForURL(/\/cita\/C-\d+/);
  const A = m.url().split('/').pop();
  ok(sql(`select status || '|' || (details->'veh'->>'t') || '|' || (details->>'piezas') || '|' || total_cents from operations where number = '${A}'`) === 'pending|2016 honda CR-V|true|5500', `${A}: solicitud pendiente con su CR-V, piezas viejas, $55 (aceite + mezcla)`);
  ok(sql(`select to_char(scheduled_at at time zone 'America/New_York', 'FMHH12:MI AM') from operations where number = '${A}'`) === hora, `a la hora elegida (${hora})`);
  ok(sql(`select count(*) from notifications where tpl = 'biz_cita' and ref_id = '${A}'`) === '1', 'aviso al taller: nueva solicitud');
  // ── Panel del taller: Hoy y Confirmar ──
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p.push(d); d.on('pageerror', e => err.push('panel ' + e.message)); await entrar(d, '5705550211');
  await d.goto(B + `/panel/${T}/hoy?det=cita:${A}`); const det = d.locator('[data-screen-label="Panel v2 · detalle"]');
  await clic(det.getByRole('button', { name: 'Confirmar' }));
  ok(await espera(() => sql(`select status from operations where number = '${A}'`), 'confirmed') === 'confirmed', 'el taller la confirma desde su panel');
  // ── Hogar: Cambiar grifo (precio cerrado $145, depósito $40, inquilina con permiso) ──
  await m.goto(B + `/n/${H}?tab=svc`); await clic(m.getByText('Cambiar grifo', { exact: true }));
  await hoja.waitFor(); await clic(hoja.getByText('Traes el tuyo', { exact: false }));
  ok(!!(await vis(hoja.getByText(/Depósito de \$40/))), 'hoja Hogar: depósito de $40 (precio cerrado)');
  await clic(hoja.getByRole('button', { name: 'Elegir franja' })); await m.waitForURL(/\/visita\?/);
  const bh = m.locator('[data-screen-label="APP-NEG-HOGAR-BOOKING · móvil"]'); await bh.getByText('VA A TU CASA').waitFor();
  await clic(bh.getByText('Cocina', { exact: true }).or(bh.getByText('Baño', { exact: true }))).catch(() => undefined);
  await barra.getByRole('button', { name: 'Continuar' }).click(); await bh.getByText('LLEGA ENTRE').waitFor(); await ESPERA(m);
  const fr = bh.locator('[role="radio"]:not([aria-disabled="true"])').filter({ hasText: /\d (AM|PM)–\d+ (AM|PM)/ }).first(); const franja = (await fr.textContent()).trim(); await fr.click();
  ok(/–/.test(franja), `franja de 2 h: ${franja}`);
  await m.screenshot({ path: OUT + 'v4-hogar-franja-m.png', fullPage: true });
  await barra.getByRole('button', { name: 'Continuar' }).click(); await bh.getByText('Tengo el permiso de mi landlord').waitFor();
  ok(await barra.getByRole('button', { name: /Enviar solicitud|Confirmar cita/ }).isDisabled(), 'inquilina: sin el permiso del landlord no se envía');
  await clic(bh.getByRole('switch', { name: 'Tengo el permiso de mi landlord' }));
  await clic(m.locator('[data-screen-label="Booking · método de pago"]')); const mp = m.locator('[data-screen-label="Método de pago"]'); await clic(mp.getByText(/4242/)); await clic(mp.getByText(/^Usar /)); await mp.waitFor({ state: 'detached' });
  await m.screenshot({ path: OUT + 'v5-hogar-revisa-m.png', fullPage: true });
  await barra.getByRole('button', { name: /Enviar solicitud|Confirmar cita/ }).click(); await m.waitForURL(/\/cita\/C-\d+/);
  const C = m.url().split('/').pop();
  ok(sql(`select status || '|' || (details->'casa'->>'tenure') || '|' || (details->>'landlord') || '|' || deposit_cents || '|' || ((details->>'win')::int - extract(hour from scheduled_at at time zone 'America/New_York')::int * 60) from operations where number = '${C}'`) === 'pending|inq|true|4000|120', `${C}: visita pendiente, inquilina con permiso, depósito $40, franja de 2 h`);
  ok(sql(`select status || '|' || amount_cents from payments where operation_id = (select id from operations where number = '${C}') and kind = 'deposit'`) === 'held|4000', 'depósito de $40 retenido en la tarjeta');
  // Desktop del Booking de Hogar
  const md = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p.push(md); md.on('pageerror', e => err.push('desk ' + e.message)); await entrar(md, '5705550122');
  const sid = sql(`select id from items where business_id = '${H}' and name->>'es' = 'Cambiar grifo' and removed_at is null`);
  await md.goto(B + `/n/${H}/visita?s=${sid}&o=0-0`); await md.waitForSelector('text=Franja de llegada >> visible=true'); await md.screenshot({ path: OUT + 'v6-hogar-booking-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); limpiar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png', fullPage: true }); console.log('url', p.url()); } } catch {} try { limpiar(); } catch {} process.exit(1); });
