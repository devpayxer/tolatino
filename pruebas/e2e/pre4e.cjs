// 4e-1 · Pre-estimado con fotos: pedir (Auto), responder con un rango en el panel, reservar con él, compararlo con el
// estimado; vencer y mandar otra vez; «no lo hacemos» (Hogar) con otros negocios.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', T = 'taller-hermanos-pena', H = 'plomeria-rodriguez', FOTO = ENT.rec('fotos') + '/portada.jpg';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const ESPERA = (p) => p.waitForTimeout(700);
const OPC = require('child_process').execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "select svc_opts->0->'o'->0->'n'->>'es' from items where business_id = 'taller-hermanos-pena' and name->>'es' = 'Pastillas de freno' and removed_at is null order by id limit 1"`).toString().trim();
const MARISOL = "(select id from users where phone = '+15705550122')";
const limpiar = () => { sql(`update service_requests set status = 'cancelled' where user_id = ${MARISOL} and status in ('sent', 'answered')`); sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id = ${MARISOL} and business_id in ('${T}','${H}') and status in ('pending', 'change_proposed', 'confirmed')`); };
(async () => {
  limpiar();
  sql(`insert into user_vehicles (user_id, year, make, model, mileage, veh_type, size, tire_size, is_default) select ${MARISOL}, 2016, 'honda', 'CR-V', 84200, 's', 's', '225/65R17', true where not exists (select 1 from user_vehicles where user_id = ${MARISOL} and removed_at is null)`);
  sql(`insert into user_addresses (user_id, label, street, zip, geo, geo_quality, city_id, is_default) select ${MARISOL}, 'casa', '112 W Oak St', '18201', ST_SetSRID(ST_MakePoint(-75.9775, 40.9584), 4326)::geography, 'numero', 'hzl', false where not exists (select 1 from user_addresses where user_id = ${MARISOL} and street = '112 W Oak St' and removed_at is null)`);
  sql(`insert into user_homes (user_id, address_id, kind, tenure, is_default) select ${MARISOL}, id, 'casa', 'dueno', true from user_addresses where user_id = ${MARISOL} and street = '112 W Oak St' and removed_at is null and not exists (select 1 from user_homes where user_id = ${MARISOL} and removed_at is null) limit 1`);
  sql(`update user_homes set tenure = 'dueno' where user_id = ${MARISOL} and removed_at is null`);
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); globalThis.__p = [m]; await entrar(m, '5705550122');
  m.on('pageerror', e => err.push(e.message)); m.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  // ── Pedir ──
  await m.goto(B + `/n/${T}?tab=svc`); await clic(m.getByText('Pastillas de freno', { exact: true }));
  const hoja = m.locator('[data-screen-label="Servicio · opciones"]'); await hoja.waitFor();
  ok(!!(await vis(hoja.getByText('¿No sabes cuánto va a salir?'))), 'hoja del servicio «desde»: ¿No sabes cuánto va a salir?');
  await clic(hoja.getByRole('button', { name: 'Pedir pre-estimado' })); await m.waitForURL(/\/preestimado\?/);
  ok(await m.getByRole('button', { name: 'Enviar para pre-estimado' }).first().isDisabled(), 'sin foto ni qué le pasa: no se envía');
  await clic(m.getByRole('button', { name: 'Frenos o ABS' }));
  await m.getByLabel('Qué le pasa').fill('Chilla al frenar desde hace una semana, más en la mañana.');
  const fc = m.waitForEvent('filechooser'); await clic(m.getByRole('button', { name: /^Foto$/ })); await (await fc).setFiles(FOTO);
  await m.getByRole('button', { name: 'Quitar foto' }).first().waitFor({ state: 'attached' });
  await clic(m.getByRole('radio', { name: /Lo necesito hoy/ }));
  await m.screenshot({ path: OUT + 'p1-preest-form-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Enviar para pre-estimado' })); await m.waitForURL(/\/pre\/P-\d+/);
  const P = m.url().split('/pre/')[1];
  await m.getByText('ENVIADO').first().waitFor(); ok(true, `enviado ${P}: «Esperando a Rafael»`);
  ok(sql(`select count(*) from media where owner_kind = 'request' and owner_id = (select id::text from service_requests where number = '${P}')`) === '1', 'la foto queda con la solicitud');
  ok(sql(`select count(*) from notifications where tpl = 'biz_preest' and ref_id = '${P}'`) === '1', 'aviso al taller');
  await m.screenshot({ path: OUT + 'p2-preest-enviado-m.png', fullPage: true });
  // ── Responder en el panel ──
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p.push(d); d.on('pageerror', e => err.push('panel ' + e.message)); await entrar(d, '5705550211');
  await d.goto(B + `/panel/${T}/hoy`); await clic(d.getByText(`Pre-estimado #${P}`));
  const dt = d.locator('[data-screen-label="Panel v2 · detalle"]'); await dt.getByText('FOTOS DEL CLIENTE').waitFor();
  ok(!!(await vis(dt.getByText(/Chilla al frenar/))) && !!(await vis(dt.getByText('Frenos o ABS'))), 'panel: lo que mandó (nota, luces, foto)');
  await dt.getByLabel('DESDE · DÓLARES', { exact: true }).fill('180'); await dt.getByLabel('HASTA · DÓLARES', { exact: true }).fill('260');
  await dt.getByLabel('LO QUE INCLUYE · UNA COSA POR LÍNEA', { exact: true }).fill('Pastillas delanteras de cerámica\nMano de obra');
  await dt.getByLabel('LO QUE PUEDE CAMBIARLO · UNA POR LÍNEA', { exact: true }).fill('Si los discos están bajo la medida mínima');
  await dt.getByLabel('TU MENSAJE · OPCIONAL', { exact: true }).fill('Por las fotos, sale en ese rango. Tráelo y te lo confirmo antes de tocar nada.');
  await d.screenshot({ path: OUT + 'p3-panel-responder-d.png', fullPage: true });
  await clic(dt.getByRole('button', { name: 'Mandar respuesta' }));
  for (let i = 0; i < 20 && sql(`select t.status from request_targets t join service_requests r on r.id = t.request_id where r.number = '${P}'`) !== 'rng'; i++) await d.waitForTimeout(250);
  ok(sql(`select t.status || '|' || (t.reply->>'lo') || '|' || (t.reply->>'hi') || '|' || r.status || '|' || (r.valid_until > now() + interval '6 days') from request_targets t join service_requests r on r.id = t.request_id where r.number = '${P}'`) === 'rng|18000|26000|answered|true', 'rango $180–$260, válido 7 días');
  ok(sql(`select count(*) from notifications where tpl = 'preest_rng' and ref_id = '${P}'`) === '1', 'aviso: tu pre-estimado está listo');
  // ── El cliente reserva con el pre-estimado ──
  await m.goto(B + `/pre/${P}`); await m.getByText('TU PRE-ESTIMADO').first().waitFor();
  ok(!!(await vis(m.getByText('$180–$260'))) && !!(await vis(m.getByText('Pastillas delanteras de cerámica'))), 'cliente: rango, qué incluye y qué puede cambiarlo');
  await m.screenshot({ path: OUT + 'p4-preest-rango-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Reservar con este pre-estimado' })); await m.waitForURL(new RegExp(`of=${sql(`select id from items where business_id = 'taller-hermanos-pena' and name->>'es' = 'Pastillas de freno' and removed_at is null order by id limit 1`)}&pre=`)); // 9b-1 · el id del servicio, no el 84 de una base vieja
  const hj = m.locator('[data-screen-label="Servicio · opciones"]'); await hj.waitFor(); ok(true, 'abre la hoja del servicio para elegir la opción');
  await clic(hj.getByText(OPC, { exact: false })); await clic(hj.getByText('Lo dejo y me avisan', { exact: false })); await clic(hj.getByRole('button', { name: 'Elegir día y hora' })); await m.waitForURL(/\/visita\?.*pre=/);
  const bk = m.locator('[data-screen-label="APP-NEG-AUTO-BOOKING · móvil"]'); await bk.getByText(`Con tu pre-estimado ${P}`).waitFor(); ok(true, 'Booking con el pre-estimado (nota y fotos van en la cita)');
  const barra = m.locator('[data-screen-label="Booking · barra"]');
  await barra.getByRole('button', { name: 'Continuar' }).click(); await bk.getByText('DÍA', { exact: true }).waitFor(); await ESPERA(m);
  await bk.getByRole('radio', { name: /^(LUN|MAR|MIÉ|JUE|VIE|SÁB|DOM) /, disabled: false }).nth(1).click(); await ESPERA(m);
  await bk.locator('[role="radio"]:not([aria-disabled="true"])').filter({ hasText: /\d:\d\d [AP]M/ }).first().click();
  await barra.getByRole('button', { name: 'Continuar' }).click(); await bk.getByText('CÓMO SE COBRA').waitFor();
  await barra.getByRole('button', { name: /Enviar solicitud|Confirmar cita/ }).click(); await m.waitForURL(/\/cita\/C-\d+/);
  const C = m.url().split('/cita/')[1].split('?')[0];
  ok(sql(`select (details->'pre'->>'num') || '|' || (details->'pre'->>'lo') || '|' || jsonb_array_length(details->'preFotos') || '|' || coalesce(customer_note, '') from operations where number = '${C}'`).startsWith(`${P}|18000|1|Chilla al frenar`), 'la cita lleva el pre-estimado, sus fotos y la nota');
  ok(sql(`select r.status || '|' || t.status || '|' || (r.operation_id is not null) from service_requests r join request_targets t on t.request_id = r.id where r.number = '${P}'`) === 'used|used|true', 'solicitud usada y ligada a la cita');
  await m.goto(B + `/pre/${P}`); await m.getByText('RESERVASTE').first().waitFor(); ok(!!(await vis(m.getByRole('button', { name: 'Ver tu cita' }))), 'estado: reservaste · Ver tu cita');
  // El mismo pre-estimado no se usa dos veces
  await m.goto(B + `/n/${T}/visita?s=${sql(`select id from items where business_id = '${T}' and name->>'es' = 'Pastillas de freno' and removed_at is null order by id limit 1`)}&o=0-0&w=deja&pre=${P}`); /* 9b-1 · el id del servicio, no el 84 de una base vieja */ await m.locator('[data-screen-label="APP-NEG-AUTO-BOOKING · móvil"]').getByText('TU VEHÍCULO').waitFor();
  ok(!(await vis(m.getByText(`Con tu pre-estimado ${P}`))), 'usado: el Booking ya no lo ofrece');
  // Panel: la cita dice el rango
  sql(`update operations set status = 'confirmed', confirmed_at = now() where number = '${C}'`);
  await d.goto(B + `/panel/${T}/hoy?det=cita:${C}`); await dt.getByText(`Reservó con el pre-estimado ${P}`).first().waitFor(); ok(true, 'panel: «Reservó con el pre-estimado» y sus fotos');
  // ── Vence y se manda otra vez ──
  sql(`update service_requests set status = 'cancelled' where number <> '${P}' and user_id = ${MARISOL} and status in ('sent', 'answered')`);
  const P2 = 'P-' + sql(`select nextval('service_request_seq')`);
  const vid = sql(`select id from user_vehicles where user_id = ${MARISOL} and removed_at is null order by is_default desc limit 1`);
  const rid = sql(`insert into service_requests (number, mode, user_id, city_id, category_id, rubro, vehicle_id, form, respond_by) values ('${P2}', 'pre', ${MARISOL}, 'hzl', 'NEG-AUTO', 'auto', '${vid}', '{"svc":{"es":"Afinación","en":"Tune-up"},"k":"desde","nota":"Tiembla en neutro","luces":["ce"],"cuando":"sem"}'::jsonb, now() - interval '1 minute') returning id`).split('\n')[0];
  sql(`insert into request_targets (request_id, business_id, item_id) values (${rid}, '${T}', 83)`);
  await m.goto(B + `/pre/${P2}`); await m.getByText('SIN RESPUESTA').first().waitFor(); ok(true, 'pasaron 24 h: SIN RESPUESTA');
  ok(sql(`select count(*) from notifications where tpl = 'preest_exp' and ref_id = '${P2}'`) === '1', 'aviso: sin respuesta');
  await clic(m.getByRole('button', { name: 'Mandarlo otra vez' })); await m.getByText('ENVIADO').first().waitFor();
  ok(sql(`select r.status || '|' || t.status || '|' || (r.respond_by > now() + interval '23 hours') from service_requests r join request_targets t on t.request_id = r.id where r.number = '${P2}'`) === 'sent|sent|true', 'mandado otra vez: 24 h nuevas');
  await clic(m.getByRole('button', { name: 'Ya no lo necesito' })); await m.getByText('CANCELADO').first().waitFor(); ok(true, 'ya no lo necesito → cancelado');
  // ── Hogar: «No lo hacemos» ──
  await m.goto(B + `/n/${H}/preestimado?s=${sql(`select id from items where business_id = 'plomeria-rodriguez' and name->>'es' = 'Visita y diagnóstico' and removed_at is null order by id limit 1`)}`); await m.getByText('Tu casa').first().waitFor();
  await clic(m.getByRole('button', { name: 'Baño', exact: true }));
  await m.getByLabel('Qué pasa').fill('La ducha gotea aunque esté cerrada, desde hace un mes.');
  await m.getByLabel('Marca del equipo').fill('Moen'); await m.getByLabel('Edad del equipo').fill('12 años');
  const fc2 = m.waitForEvent('filechooser'); await clic(m.getByRole('button', { name: /^Foto$/ })); await (await fc2).setFiles(FOTO);
  await m.getByRole('button', { name: 'Quitar foto' }).first().waitFor({ state: 'attached' });
  await m.screenshot({ path: OUT + 'p5-preest-hogar-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Enviar para pre-estimado' })); await m.waitForURL(/\/pre\/P-\d+/);
  const P3 = m.url().split('/pre/')[1];
  const h = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p.push(h); h.on('pageerror', e => err.push('hogar ' + e.message)); await entrar(h, '5705550222');
  const ht = h.locator('[data-screen-label="Panel v2 · detalle"]');
  await h.goto(B + `/panel/${H}/hoy?det=sol:${P3}`); await ht.getByText('Moen · 12 años').waitFor(); ok(true, 'panel Hogar: dónde, equipo, foto');
  await clic(ht.getByRole('button', { name: 'No lo hacemos' })); await clic(ht.getByRole('button', { name: 'Mandar respuesta' }));
  await m.waitForTimeout(800); await m.goto(B + `/pre/${P3}`); await m.getByText('NO LO HACEN').first().waitFor();
  ok(!!(await vis(m.getByText('LO HACEN EN TU CIUDAD'))), 'cliente: no lo hacen + otros negocios de la ciudad');
  await m.screenshot({ path: OUT + 'p6-preest-no-m.png', fullPage: true });
  // Un servicio con precio cerrado no admite pre-estimado (el servidor redirige)
  await m.goto(B + `/n/${T}/preestimado?s=` + sql(`select id from items where business_id = '${T}' and svc_kind = 'fijo' and removed_at is null limit 1`)); await m.waitForURL(/\?tab=svc/); ok(true, 'precio cerrado: sin pre-estimado');
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); limpiar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png', fullPage: true }); console.log('url', p.url()); } } catch {} try { limpiar(); } catch {} process.exit(1); });
