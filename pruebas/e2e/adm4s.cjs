// 4s-3 · Super Admin: Analítica › Mercados y Tiendas; Transacciones › Apartados con talla, envío y plan.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const espera = async (l) => { for (let i = 0; i < 40; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
(async () => {
  const b = await chromium.launch(); const err = [];
  const a = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(a, '5705550199');
  a.on('pageerror', e => err.push(e.message)); a.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  await a.goto(B + '/admin/analitica?tab=mt&p=7');
  ok(await espera(a.getByText('CON FOTO DE CADA PESO')) && await espera(a.getByText('ESTIMADO → COBRADO')) && await espera(a.getByText('FALTÓ LA TALLA')) && await espera(a.getByText('PLANES', { exact: true })), 'Analítica › Mercados y Tiendas: foto de cada peso, estimado → cobrado, faltó la talla, planes');
  ok(await espera(a.getByText(/Mercados · El peso no cuadra/)) || await espera(a.getByText(/Nadie pidió ayuda/)), 'motivos de ayuda de mercados y tiendas');
  await a.screenshot({ path: OUT + 'a1-analitica-mt-d.png', fullPage: true });
  await a.goto(B + '/admin/transacciones?tab=apt');
  ok(await espera(a.getByText(/plan \$\d+(\.\d\d)? de \$320/)), 'Transacciones › Apartados: el plan con lo pagado de $320');
  ok(await espera(a.getByText(/envío · cobrado \$/)), 'Transacciones › Apartados: el envío con lo cobrado');
  ok(await espera(a.getByText(/talla [A-Z0-9]/)), 'Transacciones › Apartados: la talla');
  await a.screenshot({ path: OUT + 'a2-tx-apartados-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK adm4s');
})().catch((e) => { console.error(e); process.exit(1); });
