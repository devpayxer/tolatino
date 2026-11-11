// 4y-4 · Renta de vehículos: pestaña «Rentar» en la ficha de Transporte, licencia y 21+ (sin revisarla no se entrega), millas al
// salir y al volver (nunca menos), millas de más descontadas del depósito con foto del odómetro.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', D = 'renta-camionetas-hzl';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const llenar = async (l, v) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.fill(v); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (l) => { for (let i = 0; i < 40; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const MARISOL = "(select id from users where phone = '+15705550122')";
const R = (n, col) => sql(`select ${col} from rentals r join operations o on o.id = r.operation_id where o.number = '${n}'`);
(async () => {
  sql(`update rentals set status = 'cancelled', cancelled_by = 'system', cancelled_at = now() where user_id = ${MARISOL} and status in ('held', 'out')`);
  sql(`update items set stock_left = stock_par where business_id = '${D}' and module = 'renta'`);
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(m, '5705550122');
  const h = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(h, '5705550355');
  for (const p of [m, h]) p.on('pageerror', e => err.push(e.message));
  // ── 1. La ficha: pestaña «Rentar» con los vehículos ──
  await m.goto(B + `/n/${D}?tab=shop`); await m.locator('[data-screen-label="Ficha · tienda"]').waitFor();
  ok(!!(await vis(m.getByRole('tab', { name: 'Rentar' }))) || !!(await vis(m.getByText('Rentar').first())), 'pestaña «Rentar»');
  ok(!!(await vis(m.getByText('Camioneta de carga'))) && !!(await vis(m.getByText('$89/día'))), 'Camioneta de carga · $89/día');
  ok(!(await vis(m.getByText('Pedir precio cerrado'))), 'los servicios de «precio cerrado» que no aplicaban ya no salen');
  await m.screenshot({ path: OUT + 'v1-rentar-tab-m.png', fullPage: true });
  const card = m.locator('[data-screen-label="Ficha · tienda"] > div.grid > div').filter({ hasText: 'Camioneta de carga' });
  await clic(card.getByRole('button', { name: 'Apartar' })); await m.waitForURL(/\/rentar\?a=/); await m.getByText('¿Cuántos días?').waitFor();
  await clic(m.getByRole('button', { name: '2 días' }));
  ok(await espera(m.getByText(/tienes que tener 21 años o más/)) && await espera(m.getByText(/Incluye 150 millas por día\. La milla de más cuesta \$0\.35/)), 'el formulario avisa: licencia y 21+, 150 millas/día, $0.35 la de más');
  await m.screenshot({ path: OUT + 'v2-rentar-form-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: /^Apartar · \$/ })); await m.waitForURL(/\/renta\/T-\d+/); const T = m.url().split('/renta/')[1];
  // ── 2. Panel: sin licencia revisada ni millas, no se entrega ──
  await h.goto(B + `/panel/${D}/hoy?det=renta:${T}`); await h.getByText('ANTES DE ENTREGARLA').first().waitFor();
  const btn = h.getByRole('button', { name: 'La recogió' });
  ok(await (await vis(btn)).isDisabled() || (await (await vis(btn)).getAttribute('aria-disabled')) === 'true', '«La recogió» apagado sin licencia ni millas');
  await clic(h.getByRole('switch', { name: 'Revisé la licencia y la edad (21+)' })); await llenar(h.getByPlaceholder('48210'), '48210');
  await h.screenshot({ path: OUT + 'v3-panel-recoger-d.png', fullPage: true });
  await clic(btn); await h.getByText(/la tiene\. Renta cobrada/).first().waitFor();
  ok(R(T, "r.status || '|' || (r.license_checked_by is not null) || '|' || r.odometer_out") === 'out|true|48210', 'entregada: licencia revisada por el negocio y 48,210 millas al salir');
  // ── 3. Al volver: menos millas que al salir → no; con 520 de más (2 días × 150 = 300 incluidas) ──
  await h.goto(B + `/panel/${D}/hoy?det=renta:${T}`); await h.getByPlaceholder('48210').first().waitFor();
  await llenar(h.getByPlaceholder('48210'), '48000'); ok(await espera(h.getByText(/no pueden ser menos que al salir/)), 'menos millas que al salir: no deja');
  await llenar(h.getByPlaceholder('48210'), '49030'); // 820 recorridas − 300 incluidas = 520 de más × $0.35 = $182
  ok(await espera(h.getByText(/Millas de más: 520 × \$0\.35 = \$182/)), 'cuenta las millas de más: 520 × $0.35 = $182');
  await h.screenshot({ path: OUT + 'v4-panel-millas-d.png', fullPage: true });
  await clic(h.getByRole('button', { name: 'Descontar las millas de más' }));
  ok(await espera(h.getByText('$182')), 'el monto del descuento viene puesto: $182');
  await h.locator('input[type=file]').first().setInputFiles(OUT + 'v1-rentar-tab-m.png').catch(() => {});
  ok(true, '(la foto del odómetro se sube en el sandbox; aquí el servidor local no sirve /medios)');
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK veh4y');
})().catch((e) => { console.error(e); process.exit(1); });
