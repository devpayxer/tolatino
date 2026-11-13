// 4g-3 · Super Admin › Transacciones con Planes, Rentas y Apartados, y Mi cuenta › Citas y reservas con esa sección.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
(async () => {
  const b = await chromium.launch(); const err = [];
  const a = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(a, '5705550199');
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(m, '5705550122');
  for (const p of [a, m]) { p.on('pageerror', e => err.push(e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); }
  await a.goto(B + '/admin/transacciones'); await a.getByText('PLANES · RENTAS · APARTADOS').waitFor(); ok(true, 'KPI: planes · rentas · apartados');
  for (const [tab, pre, rx] of [['Rentas', 'Renta T-', /cobrado \$/], ['Planes', 'Plan PL-', /cobrado \$/], ['Apartados', 'Apartado A-', /en la caja · sin cobro en la app/]]) {
    await clic(a.getByRole('button', { name: tab, exact: true }).or(a.getByText(tab, { exact: true }))); await a.getByText(new RegExp(`^${pre}`)).first().waitFor();
    ok(!!(await vis(a.getByText(rx).first())), `pestaña ${tab}: ${pre}… con lo cobrado`);
  }
  await a.screenshot({ path: OUT + 'x1-tx-apartados-d.png', fullPage: true });
  const n = Number(sql(`select count(*) from operations where kind in ('plan', 'rental', 'hold') and user_id = (select id from users where phone = '+15705550122')`));
  await m.goto(B + '/cuenta/citas'); await m.getByText('Planes, rentas y apartados').waitFor().catch(() => {});
  const abiertos = Number(sql(`select count(*) from operations o where o.user_id = (select id from users where phone = '+15705550122') and ((o.kind = 'rental' and exists (select 1 from rentals r where r.operation_id = o.id and r.status in ('held', 'out'))) or (o.kind = 'plan' and exists (select 1 from plan_subscriptions s where s.operation_id = o.id and s.status <> 'cancelled')) or (o.kind = 'hold' and o.status in ('pending', 'change_proposed', 'confirmed')))`));
  if (abiertos) ok(!!(await vis(m.getByText('Planes, rentas y apartados'))), `Mi cuenta › Próximas: ${abiertos} abiertos`);
  await m.goto(B + '/cuenta/citas?f=past'); await m.getByText('Planes, rentas y apartados').waitFor(); ok(n > 0, `Mi cuenta › Pasadas: la sección con los cerrados (${n} en total)`);
  await m.screenshot({ path: OUT + 'x2-cuenta-m.png', fullPage: true });
  await clic(m.getByText(/^APARTADO A-/).first()); await m.waitForURL(/\/apartado\/A-/); ok(true, 'abre el apartado');
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK tx4g');
})().catch((e) => { console.error(e); process.exit(1); });
