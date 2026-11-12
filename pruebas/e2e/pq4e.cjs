// 4e-2 · Presupuesto a hasta 3 (Hogar): pedir a varios, responden (uno por el panel, otro «no lo hace»), comparar,
// reservar la visita de uno → los otros se cierran y se les avisa.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', H = 'plomeria-rodriguez', FOTO = ENT.rec('fotos') + '/portada.jpg';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const ESPERA = (p) => p.waitForTimeout(700);
const MARISOL = "(select id from users where phone = '+15705550122')";
const limpiar = () => { sql(`update service_requests set status = 'cancelled' where user_id = ${MARISOL} and status in ('sent', 'answered')`); sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id = ${MARISOL} and business_id = '${H}' and status in ('pending', 'change_proposed', 'confirmed')`); };
(async () => {
  limpiar();
  sql(`insert into user_vehicles (user_id, year, make, model, mileage, veh_type, size, tire_size, is_default) select ${MARISOL}, 2016, 'honda', 'CR-V', 84200, 's', 's', '225/65R17', true where not exists (select 1 from user_vehicles where user_id = ${MARISOL} and removed_at is null)`);
  sql(`insert into user_addresses (user_id, label, street, zip, geo, geo_quality, city_id, is_default) select ${MARISOL}, 'casa', '112 W Oak St', '18201', ST_SetSRID(ST_MakePoint(-75.9775, 40.9584), 4326)::geography, 'numero', 'hzl', false where not exists (select 1 from user_addresses where user_id = ${MARISOL} and street = '112 W Oak St' and removed_at is null)`);
  sql(`insert into user_homes (user_id, address_id, kind, tenure, is_default) select ${MARISOL}, id, 'casa', 'dueno', true from user_addresses where user_id = ${MARISOL} and street = '112 W Oak St' and removed_at is null and not exists (select 1 from user_homes where user_id = ${MARISOL} and removed_at is null) limit 1`);
  sql(`update user_homes set tenure = 'dueno' where user_id = ${MARISOL} and removed_at is null`);
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); globalThis.__p = [m]; await entrar(m, '5705550122');
  m.on('pageerror', e => err.push(e.message)); m.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  await m.goto(B + `/n/${H}?tab=svc`); await clic(m.getByText('Cambiar tubería', { exact: true }));
  const hoja = m.locator('[data-screen-label="Servicio · opciones"]'); await hoja.waitFor();
  ok(!!(await vis(hoja.getByText('¿Quieres comparar?'))), 'hoja de «presupuesto»: ¿Quieres comparar?');
  await clic(hoja.getByRole('button', { name: 'Pedir a hasta 3' })); await m.waitForURL(/\/presupuestos\?/);
  const cands = m.getByRole('checkbox'); const nC = await cands.count();
  ok(nC >= 2, `${nC} negocios con presupuesto que hacen ese trabajo`);
  ok((await cands.first().getAttribute('aria-checked')) === 'true' && /Plomería Rodríguez/.test(await cands.first().textContent()), 'el de la ficha va primero y elegido');
  const otro = (await cands.nth(1).textContent()).split(/Visita|No llega/)[0].trim();
  await cands.nth(1).click();
  await clic(m.getByRole('button', { name: 'Baño', exact: true }));
  await m.getByLabel('Qué quieres hacer').fill('Cambiar la tubería galvanizada del baño a PEX; el agua sale café.');
  await m.getByLabel('Medidas').fill('Baño de 5 × 8 pies');
  const fc = m.waitForEvent('filechooser'); await clic(m.getByRole('button', { name: /^Foto$/ })); await (await fc).setFiles(FOTO);
  await m.getByRole('button', { name: 'Quitar foto' }).first().waitFor({ state: 'attached' });
  await m.screenshot({ path: OUT + 'q1-pq-form-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Pedir 2 presupuestos' })); await m.waitForURL(/\/pre\/Q-\d+/);
  const Q = m.url().split('/pre/')[1];
  await m.getByText('ENVIADA').first().waitFor(); ok(!!(await vis(m.getByText('A 2 negocios'))), `enviada ${Q} a 2 negocios`);
  ok(sql(`select count(*) from request_targets t join service_requests r on r.id = t.request_id where r.number = '${Q}'`) === '2', 'dos destinos');
  ok(sql(`select count(*) from notifications where tpl = 'biz_pq' and ref_id = '${Q}'`) !== '0', 'aviso a los negocios');
  // Tomás responde con rango y visita gratis
  const h = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p.push(h); h.on('pageerror', e => err.push('panel ' + e.message)); await entrar(h, '5705550222');
  const ht = h.locator('[data-screen-label="Panel v2 · detalle"]');
  await h.goto(B + `/panel/${H}/hoy`); await clic(h.getByText(`Presupuesto #${Q}`));
  await ht.getByText(/lo pidió a 2 negocios/).first().waitFor(); ok(true, 'panel: presupuesto, «lo pidió a 2 negocios»');
  await ht.getByLabel('DESDE · DÓLARES', { exact: true }).fill('1200'); await ht.getByLabel('HASTA · DÓLARES', { exact: true }).fill('1600');
  await ht.getByLabel('VISITA PARA MEDIR · DÓLARES (0 = GRATIS)', { exact: true }).fill('0');
  await ht.getByLabel('CUÁNTO TARDA · OPCIONAL', { exact: true }).fill('2–3 días');
  await h.screenshot({ path: OUT + 'q2-panel-pq-d.png', fullPage: true });
  await clic(ht.getByRole('button', { name: 'Mandar respuesta' }));
  for (let i = 0; i < 20 && sql(`select t.status from request_targets t join service_requests r on r.id = t.request_id where r.number = '${Q}' and t.business_id = '${H}'`) !== 'rng'; i++) await h.waitForTimeout(250);
  await m.goto(B + `/pre/${Q}`); await m.getByText('RESPONDIERON 1 DE 2').first().waitFor(); ok(true, 'respondieron 1 de 2');
  // El otro: no lo hace (por la base: su dueño de prueba no tiene panel en el sandbox)
  sql(`update request_targets t set status = 'no', reply = '{"nota":"No hacemos tubería completa."}'::jsonb, answered_at = now() from service_requests r where r.id = t.request_id and r.number = '${Q}' and t.business_id <> '${H}'`);
  await m.goto(B + `/pre/${Q}`); await m.getByText('YA RESPONDIERON TODOS').first().waitFor();
  ok(!!(await vis(m.getByText(/NO HACE ESTE TRABAJO/))) && !!(await vis(m.getByText(/\$1,200–\$1,600 · VISITA GRATIS · 2–3 DÍAS/))), 'compara: rango, visita, días · el otro no lo hace');
  await m.screenshot({ path: OUT + 'q3-pq-compara-m.png', fullPage: true });
  // Reserva la visita de Plomería Rodríguez
  await clic(m.getByRole('button', { name: /Plomería Rodríguez/ })); await m.waitForURL(new RegExp(`of=${sql(`select id from items where business_id = 'plomeria-rodriguez' and name->>'es' = 'Cambiar tubería' and removed_at is null order by id limit 1`)}&pre=Q-`)); // 9b-1 · el id del servicio, no el 232 de una base vieja
  const hj = m.locator('[data-screen-label="Servicio · opciones"]'); await hj.waitFor();
  await clic(hj.getByRole('button', { name: /Elegir franja|Elegir día y hora/ })); await m.waitForURL(/\/visita\?.*pre=Q-/);
  const bh = m.locator('[data-screen-label="APP-NEG-HOGAR-BOOKING · móvil"]'); await bh.getByText(`Con tu presupuesto ${Q}`).waitFor(); ok(true, 'Booking de la visita con tu presupuesto');
  const barra = m.locator('[data-screen-label="Booking · barra"]');
  await barra.getByRole('button', { name: 'Continuar' }).click(); await bh.getByText('LLEGA ENTRE').waitFor(); await ESPERA(m);
  await bh.locator('[role="radio"]:not([aria-disabled="true"])').filter({ hasText: /\d (AM|PM)–\d+ (AM|PM)/ }).first().click();
  await barra.getByRole('button', { name: 'Continuar' }).click(); await bh.getByText('CÓMO SE COBRA').waitFor();
  await barra.getByRole('button', { name: /Enviar solicitud|Confirmar/ }).click(); await m.waitForURL(/\/cita\/C-\d+/);
  const C = m.url().split('/cita/')[1].split('?')[0];
  ok(sql(`select details->'pre'->>'num' from operations where number = '${C}'`) === Q, 'la visita lleva el presupuesto');
  ok(sql(`select string_agg(t.status, ',' order by t.sort) || '|' || r.status from request_targets t join service_requests r on r.id = t.request_id where r.number = '${Q}' group by r.status`) === 'used,no|used', 'elegido usado; el otro ya había dicho que no');
  await m.goto(B + `/pre/${Q}`); await m.getByText('RESERVASTE').first().waitFor(); ok(!!(await vis(m.getByRole('button', { name: 'Ver tu visita' }))), 'estado: reservaste · Ver tu visita');
  // Un tercer caso: el otro negocio todavía esperaba → se cierra y se le avisa
  const casa = sql(`select id from user_homes where user_id = ${MARISOL} and removed_at is null order by is_default desc limit 1`);
  const Q2 = 'Q-' + sql(`select nextval('service_request_seq')`);
  const rid = sql(`insert into service_requests (number, mode, user_id, city_id, category_id, rubro, home_id, form, respond_by, status, valid_until) values ('${Q2}', 'pq', ${MARISOL}, 'hzl', 'NEG-HOGAR', 'hogar', '${casa}', '{"svc":{"es":"Cambiar tubería","en":"Repipe"},"k":"pres","nota":"Repipe del baño","casa":{"dir":"112 W Oak St, 18201"}}'::jsonb, now() + interval '40 hours', 'answered', now() + interval '7 days') returning id`).split('\n')[0];
  const otroId = sql(`select t.business_id from request_targets t join service_requests r on r.id = t.request_id where r.number = '${Q}' and t.business_id <> '${H}'`);
  sql(`insert into request_targets (request_id, business_id, item_id, sort, status, reply, answered_at) values (${rid}, '${H}', 232, 0, 'rng', '{"lo":120000,"hi":150000}'::jsonb, now()), (${rid}, '${otroId}', (select id from items where business_id = '${otroId}' and svc_kind = 'pres' and removed_at is null limit 1), 1, 'sent', null, null)`);
  await m.goto(B + `/n/${H}/visita?s=${sql(`select id from items where business_id = 'plomeria-rodriguez' and name->>'es' = 'Cambiar tubería' and removed_at is null order by id limit 1`)}&pre=${Q2}`); await m.locator('[data-screen-label="APP-NEG-HOGAR-BOOKING · móvil"]').getByText(`Con tu presupuesto ${Q2}`).waitFor();
  await barra.getByRole('button', { name: 'Continuar' }).click(); await bh.getByText('LLEGA ENTRE').waitFor(); await ESPERA(m);
  // 9b-1 · La última franja libre (antes la SEGUNDA: a media tarde quedan pocas y la prueba fallaba según la hora); la primera puede ser la de la visita de arriba.
  await bh.locator('[role="radio"]:not([aria-disabled="true"])').filter({ hasText: /\d (AM|PM)–\d+ (AM|PM)/ }).last().click();
  await barra.getByRole('button', { name: 'Continuar' }).click(); await bh.getByText('CÓMO SE COBRA').waitFor();
  await barra.getByRole('button', { name: /Enviar solicitud|Confirmar/ }).click(); await m.waitForURL(/\/cita\/C-\d+/);
  ok(sql(`select status from request_targets where request_id = ${rid} and business_id = '${otroId}'`) === 'closed', `el que no había respondido (${otro}) se cerró`);
  ok(sql(`select count(*) from notifications n join business_members bm on bm.user_id = n.user_id where n.tpl = 'pq_cerrado' and n.ref_id = '${Q2}' and bm.business_id = '${otroId}'`) !== '0' || sql(`select count(*) from business_members where business_id = '${otroId}' and kind = 'owner' and status = 'active' and user_id is not null`) === '0', 'aviso al otro: eligieron a otro negocio');
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); limpiar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png', fullPage: true }); console.log('url', p.url()); } } catch {} try { limpiar(); } catch {} process.exit(1); });
