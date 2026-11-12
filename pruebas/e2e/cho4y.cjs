// 4y-3b · El chofer (un repartidor del equipo): el negocio se la asigna, la ve en /repartidor con sus pasajeros, marca Abordó,
// Salió y Llegó (el cliente lo ve); otro usuario no ve la salida. Aviso automático: una salida con pasajeros sin «Salió» a los
// 15 min avisa a cada pasajero y al negocio UNA sola vez.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', V = 'van-express-nyc';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
// 9b-1 · Los servicios de Van Express por su nombre (antes los ids 870 y 872 de una base vieja: en una base nueva son otros).
const svcVan = (n) => sql(`select id from items where business_id = 'van-express-nyc' and name->>'es' = '${n}' and removed_at is null order by id limit 1`);
const SVC = svcVan('Hazleton → Washington Heights');
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (l) => { for (let i = 0; i < 40; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const esperaV = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
(async () => {
  const vivos = `select id from operations where business_id = '${V}' and kind = 'trip' and status in ('pending', 'change_proposed', 'confirmed')`;
  sql(`update run_seats set status = 'cancelled' where operation_id in (${vivos})`);
  sql(`update operations set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where id in (${vivos})`);
  sql(`update trip_runs set seats_outside = 0, seats_booked = 0, status = 'scheduled', late_until = null, late_alert_at = null, driver_id = null where business_id = '${V}' and run_at > now() - interval '3 hours'`);
  // Héctor entra al equipo de Van Express como chofer (la invitación con código ya está probada en 2l).
  const HEC = sql(`select id from users where phone = '+15705550288'`);
  sql(`insert into delivery_drivers (business_id, user_id, display_name, phone, vehicle, status, accepted_at) select '${V}', '${HEC}', 'Héctor', '+15705550288', 'camioneta', 'active', now() where not exists (select 1 from delivery_drivers where business_id = '${V}' and user_id = '${HEC}' and status = 'active')`);
  const DRV = sql(`select id from delivery_drivers where business_id = '${V}' and user_id = '${HEC}' and status = 'active'`);
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(m, '5705550122');
  m.on('pageerror', e => err.push(e.message));
  const d1 = sql(`select ((now() at time zone 'America/New_York')::date + 1)::text`);
  await m.goto(B + `/n/${V}/viaje?s=${SVC}`); await m.getByText('Tu viaje').first().waitFor();
  const R = sql(`select id from trip_runs where item_id = ${SVC} and (run_at at time zone 'America/New_York')::date = '${d1}' and extract(hour from run_at at time zone 'America/New_York') = 19`);
  ok(/^\d+$/.test(R), `la salida de mañana 7 PM (${R})`);
  await clic(m.getByRole('button', { name: 'Continuar' }));
  await clic(m.getByRole('radio', { name: `${DOW[new Date(d1 + 'T12:00:00Z').getUTCDay()]} ${Number(d1.slice(8))}` })); await clic(m.getByRole('radio', { name: '7:00 PM', exact: true }));
  await clic(m.getByRole('button', { name: 'Continuar' })); await clic(m.getByRole('button', { name: 'Reservar', exact: true })); await m.waitForURL(/\/viaje\/V-\d+/, { timeout: 20000 });
  const V1 = m.url().match(/V-\d+/)[0];
  const w = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(w, '5705550322');
  w.on('pageerror', e => err.push(e.message));
  await w.goto(B + `/panel/${V}/hoy?det=viaje:${V1}`); await clic(w.getByRole('button', { name: 'Confirmar', exact: true })); await w.getByText(/Confirmado/).first().waitFor();

  // ── 1. Wilson asigna a Héctor ──
  await w.goto(B + `/panel/${V}/hoy?det=salida:${R}`); await w.getByText('CHOFER').first().waitFor();
  await clic(w.getByRole('button', { name: 'Héctor', exact: true })); await w.getByText(/Héctor lleva esta salida/).first().waitFor();
  ok(sql(`select driver_id from trip_runs where id = ${R}`) === DRV, 'la salida queda con su chofer');
  ok(sql(`select count(*) from notifications where user_id = '${HEC}' and body like '%es tuya%'`) !== '0', 'al chofer le llega el aviso');
  await w.screenshot({ path: OUT + 'c1-panel-chofer-d.png', fullPage: true });

  // ── 2. Héctor en /repartidor: sus salidas, pasajeros, Abordó, Salió, Llegó ──
  const h = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(h, '5705550288');
  h.on('pageerror', e => err.push(e.message));
  await h.goto(B + '/repartidor'); ok(await espera(h.getByText(/TUS SALIDAS · 1/)), 'TUS SALIDAS · 1');
  await h.goto(B + `/repartidor?s=${R}`); await h.getByText('PASAJEROS').first().waitFor();
  ok(await espera(h.getByText(/Marisol P\. · 1/)) && !(await h.content()).includes('4242'), 've a la pasajera (sin pagos ni tarjeta)');
  await h.screenshot({ path: OUT + 'c2-chofer-salida-m.png', fullPage: true });
  await clic(h.getByRole('button', { name: 'Abordó' })); await h.getByText(/^Abordó\.$/).first().waitFor().catch(() => {});
  ok(await esperaV(() => sql(`select status from run_seats where run_id = ${R} and operation_id = (select id from operations where number = '${V1}')`), 'boarded') === 'boarded', 'Abordó desde el teléfono del chofer');
  // 9b-1 · «Salió» y «Llegó» exactos: la reseña de un viaje («Salió casi a la hora…», de res4z) también es un botón y se tomaba primero.
  await clic(h.getByRole('button', { name: 'Salió', exact: true }));
  ok(await esperaV(() => sql(`select status from trip_runs where id = ${R}`), 'departed') === 'departed', 'Salió');
  await m.goto(B + `/viaje/${V1}`); ok(await espera(m.getByText('EN CAMINO')), 'la clienta ve EN CAMINO');
  await h.goto(B + `/repartidor?s=${R}`); await clic(h.getByRole('button', { name: 'Llegó', exact: true }));
  ok(await esperaV(() => sql(`select status from operations where number = '${V1}'`), 'done') === 'done', 'Llegó: el viaje terminó');
  // Otra persona no ve la salida
  const y = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(y, '5705550299');
  await y.goto(B + `/repartidor?s=${R}`); ok(!(await y.content()).includes('Marisol P.'), 'otro usuario no ve la salida ni sus pasajeros');

  // ── 3. Aviso automático: salida con pasajero sin «Salió» a los 20 min ──
  await m.goto(B + `/n/${V}/viaje?s=${SVC}`); await m.getByText('Tu viaje').first().waitFor();
  const R2 = sql(`select id from trip_runs where item_id = ${SVC} and (run_at at time zone 'America/New_York')::date = '${d1}' and extract(hour from run_at at time zone 'America/New_York') = 13 and extract(minute from run_at at time zone 'America/New_York') = 0 and status = 'scheduled'`);
  await clic(m.getByRole('button', { name: 'Continuar' }));
  await clic(m.getByRole('radio', { name: `${DOW[new Date(d1 + 'T12:00:00Z').getUTCDay()]} ${Number(d1.slice(8))}` })); await clic(m.getByRole('radio', { name: '1:00 PM', exact: true }));
  await clic(m.getByRole('button', { name: 'Continuar' })); await clic(m.getByRole('button', { name: 'Reservar', exact: true })); await m.waitForURL(/\/viaje\/V-\d+/, { timeout: 20000 });
  const V2 = m.url().match(/V-\d+/)[0];
  await w.goto(B + `/panel/${V}/hoy?det=viaje:${V2}`); await clic(w.getByRole('button', { name: 'Confirmar', exact: true })); await w.getByText(/Confirmado/).first().waitFor();
  const MAR = sql(`select id from users where phone = '+15705550122'`);
  const antes = Number(sql(`select count(*) from notifications where user_id = '${MAR}' and title like 'Tu salida todavía no sale%'`));
  sql(`update trip_runs set run_at = now() - interval '20 minutes' where id = ${R2}`);
  await w.goto(B + `/panel/${V}/hoy`); await w.goto(B + `/panel/${V}/hoy`);
  ok(Number(sql(`select count(*) from notifications where user_id = '${MAR}' and title like 'Tu salida todavía no sale%'`)) === antes + 1, 'a la pasajera le llega «Tu salida todavía no sale» UNA vez');
  ok(sql(`select (late_alert_at is not null)::text from trip_runs where id = ${R2}`) === 'true', 'la salida queda marcada como avisada');
  // Limpieza: la salida vuelve a su hora (no choca con otra corrida)
  sql(`update run_seats set status = 'cancelled' where run_id = ${R2}`); sql(`update operations set status = 'cancelled', cancelled_by = 'system' where number = '${V2}'`);
  sql(`update trip_runs set status = 'cancelled', run_at = run_at - interval '400 days' - make_interval(mins => id::int) where id = ${R2}`);
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK cho4y');
})().catch((e) => { console.error(e); process.exit(1); });
