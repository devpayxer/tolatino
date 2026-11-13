// 4w · Transporte en el panel: Lo que vendes con «Salidas y asientos» (próximas salidas, vendidos en la oficina, «No sale»,
// maletas y maleta extra, disponible hoy / asiento de niño / rampa), servicio por asiento (salidas, asientos, destino) y por
// vehículo completo, filtros derivados, Super Admin 360 en solo lectura; caja: «Salidas de la caja».
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', F = 'van-express-nyc';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (l) => { for (let i = 0; i < 40; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const esperaV = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
(async () => {
  sql(`update trans_settings set bags_included = 2, extra_bag_cents = 1000, available_today_on = null, ramp = false where business_id = '${F}'`);
  sql(`update items set removed_at = now() where business_id = '${F}' and name->>'es' in ('Ruta prueba', 'Van prueba') and removed_at is null`);
  sql(`update trip_runs set seats_outside = 0, status = 'scheduled' where business_id = '${F}' and run_at > now()`);
  const b = await chromium.launch(); const err = [];
  const h = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(h, '5705550322');
  h.on('pageerror', e => err.push(e.message)); h.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  const det = h.locator('[data-screen-label="Panel v2 · detalle"]');

  // ── 1. Lo que vendes y la herramienta ──
  await h.goto(B + `/panel/${F}/vendes`);
  ok(await espera(h.getByText('Salidas y asientos')) && await espera(h.getByText(/asientos libres (hoy|mañana)/)), 'Lo que vendes: «Salidas y asientos» con su resumen');
  await h.goto(B + `/panel/${F}/vendes/herramienta`); await espera(h.getByText(/SALIDAS DE (HOY|MAÑANA)|PRÓXIMAS SALIDAS/));
  await h.screenshot({ path: OUT + 't1-herramienta-d.png', fullPage: true });
  const run = sql(`select r.id from trip_runs r join items i on i.id = r.item_id where r.business_id = '${F}' and r.run_at > now() and r.status = 'scheduled' order by r.run_at limit 1`);
  const quedan0 = Number(sql(`select seats_total - seats_outside - seats_booked from trip_runs where id = ${run}`));
  // Vendidos en la oficina: + baja lo que queda.
  const paso = h.locator('text=VENDIDOS EN LA OFICINA').first(); await paso.waitFor();
  await clic(h.getByRole('button', { name: /\+$/ }).first());
  ok(await esperaV(() => sql(`select seats_total - seats_outside - seats_booked from trip_runs where id = ${run}`), String(quedan0 - 1)) === String(quedan0 - 1), `vendido en la oficina: quedan ${quedan0} → ${quedan0 - 1} (derivado)`);
  ok(sql(`select count(*) from audit_entries where action = 'transporte.vendido_fuera' and target_id = '${F}' and at > now() - interval '1 minute'`) !== '0', 'auditoría de lo vendido fuera');
  // «No sale»
  await clic(h.getByRole('switch').first());
  ok(await esperaV(() => sql(`select status from trip_runs where id = ${run}`), 'cancelled') === 'cancelled', '«No sale»: la salida queda cancelada');
  // 9b-3 · Se vuelve a prender LA MISMA salida: la que quedó apagada (antes «el primer interruptor», que al apagar la única salida de hoy pasaba a
  // ser el de otra; barajada, a la hora de la corrida, apagaba otra salida en vez de prender esta).
  await clic(h.getByRole('switch', { checked: false }).first());
  ok(await esperaV(() => sql(`select status from trip_runs where id = ${run}`), 'scheduled') === 'scheduled', 'y vuelve a salir');
  // Maletas y maleta extra
  await clic(h.getByRole('button', { name: '3', exact: true }));
  ok(await esperaV(() => sql(`select bags_included from trans_settings where business_id = '${F}'`), '3') === '3', 'maletas incluidas: 3');
  await clic(h.getByRole('button', { name: 'Maleta extra +' }));
  ok(await esperaV(() => sql(`select extra_bag_cents from trans_settings where business_id = '${F}'`), '1500') === '1500', 'maleta extra: $10 → $15');
  // Disponible hoy y rampa → filtros
  const sw = async (t) => clic(h.getByRole('switch', { name: t, exact: true }));
  await sw('Disponible hoy');
  ok(await esperaV(() => sql(`select 'hoy' = any(filter_values) from businesses where id = '${F}'`), 't') === 't', 'Disponible hoy → filtro «hoy»');
  await sw('Rampa para silla de ruedas');
  ok(await esperaV(() => sql(`select 'silla' = any(filter_values) from businesses where id = '${F}'`), 't') === 't', 'rampa → filtro «silla»');
  ok(sql(`select 'estados' = any(filter_values) and 'viaje' = any(filter_values) and 'equipaje' = any(filter_values) and 'cerrado' = any(filter_values) from businesses where id = '${F}'`) === 't', 'derivados: viaje, cerrado, equipaje y cruza estados');

  // ── 2. Servicio por asiento ──
  await h.goto(B + `/panel/${F}/vendes/servicios?det=svc:new`); await det.getByText('Nuevo servicio').first().waitFor();
  ok(await espera(det.getByText('CÓMO LO VENDES')) && !(await vis(det.getByText('TIEMPO ENTRE CITAS'))), 'editor: «Cómo lo vendes» de Transporte y sin «tiempo entre citas»');
  await (await vis(det.getByPlaceholder(/Hazleton → Washington/))).fill('Ruta prueba');
  await (await vis(det.getByPlaceholder('0', { exact: true }).first())).fill('50');
  await clic(det.getByRole('button', { name: 'Agregar', exact: true })); await h.waitForTimeout(600);
  ok(await espera(h.getByText(/Marca a qué hora sale/)), 'por asiento sin salidas: no deja guardar');
  await clic(det.getByRole('button', { name: '7 AM', exact: true })); await clic(det.getByRole('button', { name: '3 PM', exact: true }));
  await (await vis(det.getByPlaceholder(/Washington Heights, NY/))).fill('Allentown, PA');
  await (await vis(det.getByPlaceholder('30', { exact: true }))).fill('35');
  await h.screenshot({ path: OUT + 't2-servicio-asiento-d.png', fullPage: true });
  await clic(det.getByRole('button', { name: 'Agregar', exact: true })); await h.waitForTimeout(800);
  ok(await esperaV(() => sql(`select svc_kind || '|' || price_cents || '|' || (svc_attrs->'sal')::text || '|' || (svc_attrs->>'pax') || '|' || (svc_attrs->'to'->>'es') || '|' || (svc_attrs->>'child') from items where business_id = '${F}' and name->>'es' = 'Ruta prueba' and removed_at is null`), 'asiento|5000|[7, 15]|14|Allentown, PA|3500') === 'asiento|5000|[7, 15]|14|Allentown, PA|3500', 'asiento guardado: 7 AM y 3 PM, 14 asientos, a Allentown, niño $35');

  // ── 3. Vehículo completo ──
  await h.goto(B + `/panel/${F}/vendes/servicios?det=svc:new`); await det.getByText('Nuevo servicio').first().waitFor();
  await (await vis(det.getByPlaceholder(/Hazleton → Washington/))).fill('Van prueba');
  await clic(det.getByText('Vehículo completo', { exact: true }));
  await clic(det.getByRole('button', { name: '1 h', exact: true }));
  await (await vis(det.getByPlaceholder('0', { exact: true }).first())).fill('300');
  await clic(det.getByRole('button', { name: 'Agregar', exact: true })); await h.waitForTimeout(800);
  ok(await esperaV(() => sql(`select svc_kind || '|' || (svc_attrs->>'pax') || '|' || (svc_attrs->>'wait') from items where business_id = '${F}' and name->>'es' = 'Van prueba' and removed_at is null`), 'priv|14|60') === 'priv|14|60', 'vehículo completo: hasta 14 personas y 1 h de espera');

  // ── 4. Caja: «Salidas de la caja» ──
  const A = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(A, '5705550199');
  A.on('pageerror', e => err.push(e.message));
  await A.goto(B + `/admin/negocios/${F}?tab=vende`);
  ok(await espera(A.getByText('Salidas y asientos')) && await espera(A.getByText(/tipo van/)), 'Super Admin 360: «Salidas y asientos» en solo lectura con el tipo');
  await A.goto(B + `/admin/negocios/envios-quisqueya-cargo?tab=vende`);
  ok(await espera(A.getByText('Salidas de la caja')) && await espera(A.getByText(/Sale el sábado · llega en 3 a 4 semanas/)), 'caja: «Salidas de la caja» · sale el sábado · llega en 3 a 4 semanas');
  await A.screenshot({ path: OUT + 't3-admin-caja-d.png', fullPage: true });
  sql(`update trip_runs set seats_outside = 0 where id = ${run}`);
  sql(`update trans_settings set ramp = false, available_today_on = null, bags_included = 2, extra_bag_cents = 1000 where business_id = '${F}'`);
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK tra4w');
})().catch((e) => { console.error(e); process.exit(1); });
