const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const B = 'http://localhost:3100', BIZ = 'sabor-dominicano';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
(async () => {
  sql(`update businesses set modules_off = modules_off - 'rsv' where id='${BIZ}'`);
  const b = await chromium.launch(); const a = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await entrar(a, '5705550199'); await a.goto(B + `/admin/negocios/${BIZ}?tab=vende`);
  await a.getByText('Reservaciones', { exact: true }).first().waitFor(); ok(true, 'admin 360 › Vende: módulo Reservaciones');
  await a.screenshot({ path: ENT.S + '/cap/a1-360-rsv.png' });
  const fila = a.locator('div', { has: a.getByText('Reservaciones', { exact: true }) }).filter({ has: a.getByText('Pausar', { exact: true }) }).last();
  await fila.getByText('Pausar', { exact: true }).click();
  await a.getByText('Reportes de clientes').first().click();
  await a.getByText('Confirmar', { exact: true }).last().click();
  await a.waitForTimeout(1500);
  ok(sql(`select modules_off ? 'rsv' from businesses where id='${BIZ}'`) === 't', 'pausar Reservaciones con motivo');
  const c = await (await b.newContext()).newPage(); await c.goto(B + '/n/' + BIZ);
  ok(!(await c.getByText('Reservaciones', { exact: true }).count()), 'la página ya no tiene la pestaña');
  sql(`update businesses set modules_off = modules_off - 'rsv' where id='${BIZ}'`);
  await b.close(); console.log('OK');
})().catch(e => { console.error(e); execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -c "update businesses set modules_off = modules_off - 'rsv' where id='sabor-dominicano'"`); process.exit(1); });
