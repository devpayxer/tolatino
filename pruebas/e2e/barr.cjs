// Barrido central: una reserva sin respuesta vence y se libera SIN que nadie abra una página; dos barridos a la vez no se
// pisan (el segundo no corre); sin token, 404.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const B = 'http://localhost:3100', V = 'van-express-nyc', TOK = ENT.TOK;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
// 9b-1 · Los servicios de Van Express por su nombre (antes los ids 870 y 872 de una base vieja: en una base nueva son otros).
const svcVan = (n) => sql(`select id from items where business_id = 'van-express-nyc' and name->>'es' = '${n}' and removed_at is null order by id limit 1`);
const SVC = svcVan('Hazleton → Washington Heights');
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const barrer = () => fetch(B + '/api/interno/barrido', { method: 'POST', headers: { 'x-barrido-token': TOK } }).then((r) => r.json());
(async () => {
  const MAR = sql(`select id from users where phone = '+15705550122'`);
  sql(`update operations set status = 'cancelled', cancelled_by = 'system' where user_id = '${MAR}' and kind = 'trip' and status in ('pending', 'change_proposed')`);
  // 9b-3 · Lo retenido sale de SU tarjeta: barajada en una base nueva, Marisol no tenía ninguna (guardián tarjetaPropia).
  require('../lib/negocio-nuevo.cjs').tarjeta('5705550122');
  const b = await chromium.launch();
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(m, '5705550122');
  const d2 = sql(`select ((now() at time zone 'America/New_York')::date + 2)::text`);
  await m.goto(B + `/n/${V}/viaje?s=${SVC}`); await m.getByText('Tu viaje').first().waitFor();
  await clic(m.getByRole('button', { name: 'Continuar' }));
  await clic(m.getByRole('radio', { name: `${DOW[new Date(d2 + 'T12:00:00Z').getUTCDay()]} ${Number(d2.slice(8))}` })); await clic(m.getByRole('radio', { name: '7:00 PM', exact: true }));
  await clic(m.getByRole('button', { name: 'Continuar' })); await clic(m.getByRole('button', { name: 'Reservar', exact: true })); await m.waitForURL(/\/viaje\/V-\d+/, { timeout: 20000 });
  const N = m.url().match(/V-\d+/)[0];
  await b.close(); // nadie mira nada más
  ok(sql(`select o.status || '|' || p.status from operations o join payments p on p.operation_id = o.id where o.number = '${N}'`) === 'pending|held', `${N}: pendiente y retenido`);
  sql(`update operations set respond_by = now() - interval '1 minute' where number = '${N}'`);
  const [r1, r2] = await Promise.all([barrer(), barrer()]);
  ok([r1.corrio, r2.corrio].filter(Boolean).length >= 1 && r1.ok && r2.ok, `dos barridos a la vez: corrió ${[r1.corrio, r2.corrio].filter(Boolean).length} (el otro esperó su turno o no corrió)`);
  ok(sql(`select o.status || '|' || p.status from operations o join payments p on p.operation_id = o.id where o.number = '${N}'`) === 'expired|released', `${N}: vencido y LIBERADO por el barrido, sin abrir ninguna página`);
  ok(sql(`select count(*) from notifications where user_id = '${MAR}' and body like '%${N.slice(2)}%' or (user_id = '${MAR}' and title like 'Sin respuesta%' and created_at > now() - interval '1 minute')`) !== '0', 'y a la clienta le llegó el aviso');
  const r3 = await fetch(B + '/api/interno/barrido', { method: 'POST' }); ok(r3.status === 404, 'sin token: 404');
  // 9a · El barrido creció (15 tareas en 2c; hoy más de 60): todas las que corrieron en este barrido, sin error.
  const [corrieron, conError] = sql(`select count(*) || '|' || count(*) filter (where last_error is not null) from system_jobs where name like 'barrido.%' and last_run_at > now() - interval '2 minutes'`).split('|');
  ok(Number(corrieron) >= 15 && conError === '0', `las ${corrieron} tareas del barrido corrieron sin error (system_jobs)`);
  console.log('OK barr');
})().catch((e) => { console.error(e); process.exit(1); });
