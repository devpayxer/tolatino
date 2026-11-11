const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', T = 'taller-hermanos-pena', H = 'plomeria-rodriguez';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const MARISOL = "(select id from users where phone = '+15705550122')";
const limpiar = () => { sql(`update user_vehicles set removed_at = now() where user_id = ${MARISOL} and removed_at is null`); sql(`update user_homes set removed_at = now() where user_id = ${MARISOL} and removed_at is null`); };
(async () => {
  limpiar();
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); globalThis.__p = [m]; await entrar(m, '5705550122');
  m.on('pageerror', e => err.push(e.message)); m.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  // ── Ficha del taller: pestaña Servicios ──
  await m.goto(B + `/n/${T}?tab=svc`); await m.getByText('Nada se hace ni se cobra sin tu OK', { exact: false }).first().waitFor();
  ok(!!(await vis(m.getByText('¿QUÉ CARRO ES?'))), 'Servicios: «¿Qué carro es?» para agregar tu vehículo');
  ok(!!(await vis(m.getByText(/se descuenta si lo arreglas aquí/i).first())), 'Diagnóstico: se descuenta si lo arreglas aquí');
  await m.screenshot({ path: OUT + 'f1-taller-svc-m.png', fullPage: true });
  // ── Hoja: Pastillas de freno (desde) → sin vehículo pide agregarlo ──
  await clic(m.getByText('Pastillas de freno', { exact: true }));
  const hoja = m.locator('[data-screen-label="Servicio · opciones"]'); await hoja.waitFor();
  ok(!!(await vis(hoja.getByRole('button', { name: 'Agrega tu vehículo' }))), 'hoja sin vehículo: «Agrega tu vehículo»');
  await m.screenshot({ path: OUT + 'f2-hoja-m.png' });
  await clic(hoja.getByRole('button', { name: 'Agrega tu vehículo' }));
  const vh = m.locator('[data-screen-label="Mi vehículo"]'); await vh.waitFor();
  await clic(vh.getByText('Honda', { exact: true })); await clic(vh.getByText('CR-V', { exact: true })); await clic(vh.getByText('2016', { exact: true }));
  await (await vis(vh.getByLabel('Millaje'))).fill('84200');
  await m.screenshot({ path: OUT + 'f3-vehiculo-m.png' });
  await clic(vh.getByRole('button', { name: 'Guardar vehículo' })); await vh.waitFor({ state: 'detached' });
  ok(sql(`select year || ' ' || make || ' ' || model || ' ' || size || ' ' || tire_size || ' ' || mileage from user_vehicles where user_id = ${MARISOL} and removed_at is null`) === '2016 honda CR-V s 225/65R17 84200', 'vehículo guardado en la cuenta: 2016 Honda CR-V, SUV, 225/65R17, 84,200 mi');
  ok(!!(await vis(hoja.getByText('Trabajan con tu CR-V'))), 'compatibilidad: «Trabajan con tu CR-V»');
  ok(!!(await vis(hoja.getByText('¿Qué eje?'))), 'opciones del servicio: ¿Qué eje?');
  await m.screenshot({ path: OUT + 'f4-hoja-veh-m.png' });
  await clic(m.getByRole('button', { name: 'Cerrar' }).first());
  // ── Un taller que no trabaja con tu vehículo (diésel con un CR-V) ──
  await m.goto(B + `/n/hazleton-diesel-truck?tab=svc`); await m.getByText('TU VEHÍCULO').first().waitFor();
  ok(!!(await vis(m.getByText(/no trabaja con Honda/))), 'otro taller: «Este taller no trabaja con Honda»');
  // ── Hogar: Tu casa ──
  sql(`insert into user_addresses (user_id, label, street, zip, geo, geo_quality, city_id, is_default) select ${MARISOL}, 'casa', '112 W Oak St', '18201', ST_SetSRID(ST_MakePoint(-75.9775, 40.9584), 4326)::geography, 'numero', 'hzl', false where not exists (select 1 from user_addresses where user_id = ${MARISOL} and street = '112 W Oak St' and removed_at is null)`);
  await m.goto(B + `/n/${H}?tab=svc`); await m.getByText('Precio completo antes de empezar', { exact: false }).first().waitFor();
  await clic(m.getByText('¿DÓNDE ES?'));
  const hc = m.locator('[data-screen-label="Mi casa"]'); await hc.waitFor();
  await (await vis(hc.getByLabel('Dirección'))).selectOption({ label: '112 W Oak St, 18201' });
  await clic(hc.getByText('Casa', { exact: true })); await clic(hc.getByText('Soy inquilino', { exact: true }));
  ok(!!(await vis(hc.getByText(/permiso de tu landlord/))), 'inquilino: aviso del permiso del landlord');
  await clic(hc.getByText('Antes de 1950', { exact: true }));
  ok(!!(await vis(hc.getByText(/pintura con plomo/))), 'casa antigua: aviso de plomo');
  await m.screenshot({ path: OUT + 'f5-casa-m.png', fullPage: true });
  await clic(hc.getByRole('button', { name: 'Guardar casa' })); await hc.waitFor({ state: 'detached' });
  ok(sql(`select kind || '|' || tenure || '|' || year_band from user_homes where user_id = ${MARISOL} and removed_at is null`) === 'casa|inq|pre50', 'casa guardada: casa, inquilino, antes de 1950');
  ok(!!(await vis(m.getByText(/Necesitas el permiso de tu landlord/))), 'Plomería Rodríguez: llega a tu casa, con el permiso del landlord');
  await m.screenshot({ path: OUT + 'f6-hogar-svc-m.png', fullPage: true });
  // Desktop
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p.push(d); d.on('pageerror', e => err.push('desk ' + e.message)); await entrar(d, '5705550122');
  await d.goto(B + `/n/${T}?tab=svc`); await d.waitForSelector('text=TU VEHÍCULO >> visible=true'); await d.screenshot({ path: OUT + 'f7-taller-svc-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); limpiar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch {} try { limpiar(); } catch {} process.exit(1); });
