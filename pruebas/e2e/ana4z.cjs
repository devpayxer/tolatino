// 4z-3 · Super Admin › Analítica › Fiestas y Transporte: cifras de los dos rubros y los motivos de ayuda.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
(async () => {
  const b = await chromium.launch(); const err = [];
  const ad = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(ad, '5705550199');
  ad.on('pageerror', e => err.push(e.message));
  await ad.goto(B + '/admin/analitica?tab=ft'); await ad.getByText('CONFIRMADAS EN 24 H').first().waitFor();
  for (const t of ['SOLICITUDES DE FECHA', 'FECHAS CANCELADAS POR EL NEGOCIO', 'DEPÓSITOS', 'SALIDAS A LA HORA', 'OCUPACIÓN DE ASIENTOS', 'CANCELACIONES TARDÍAS', 'SALIDAS CANCELADAS', '«COBRÓ MÁS» POR CADA 100'])
    ok(!!(await vis(ad.getByText(t, { exact: true }).first())), t);
  ok(!!(await vis(ad.getByText(/Fiestas · Faltó algo del paquete/).first())) && !!(await vis(ad.getByText(/Transporte · Manejo inseguro/).first())), 'motivos de ayuda con su nombre por rubro');
  const n = sql(`select count(*) from operations where kind = 'party' and sent_at > now() - interval '30 days'`);
  ok(!!(await vis(ad.getByText(n, { exact: true }).first())), `solicitudes de fecha = ${n} (de la base)`);
  await ad.screenshot({ path: OUT + 'a2-analitica-ft-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK ana4z');
})().catch((e) => { console.error(e); process.exit(1); });
