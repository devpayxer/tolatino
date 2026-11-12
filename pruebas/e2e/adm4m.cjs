// 4m-3 · Super Admin: Transacciones de Doctores (sin servicio, motivo ni nota; solo si el seguro se aceptó) y de Profesionales
// (el total por escrito y el paso); Analítica › Doctores y Profesionales (solo cifras).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const verV = async (l) => { for (let i = 0; i < 60; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
(async () => {
  // 9b-1 · El trámite terminado con su total por escrito que lista Transacciones › Profesionales lo hace pro4l2: se corre antes (requiere, siempre), así está en una base nueva, en cualquier orden y arriba de la
  // lista aunque la base tenga muchas corridas (antes se daba por hecho que ya había corrido).
  require('../lib/requiere.cjs').requiere('pro4l2', () => sql(`select number from operations where business_id = 'bufete-almonte' and status = 'done' and created_at > now() - interval '30 minutes' limit 1`), { siempre: true, que: 'un trámite con su total por escrito, terminado (pro4l2)' });
  const b = await chromium.launch(); const err = [];
  const a = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  a.on('pageerror', (e) => err.push(e.message)); a.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  await entrar(a, '5705550199');
  await a.goto(B + '/admin/transacciones?tab=sal'); await verV(a.getByText(/Cita de salud · seguro (aceptado|no aceptado)|Cita de salud · sin seguro/));
  ok(!(await vis(a.getByText(/Consulta de medicina general/))), 'Doctores: la fila no dice el servicio');
  ok(!!(await vis(a.getByText(/Cita de salud · seguro aceptado · nada se cobra en la app/).first())), 'Doctores: «seguro aceptado · nada se cobra en la app»');
  await a.screenshot({ path: OUT + 'o1-tx-doctores-d.png' });
  await a.goto(B + '/admin/transacciones?tab=pro'); await verV(a.getByText(/total por escrito \$[\d,]+/).first());
  ok(!!(await vis(a.getByText(/total por escrito \$740(\.00)? · trámite terminado/).first())), 'Profesionales: total por escrito $740 · trámite terminado');
  ok(!!(await vis(a.getByText(/no contrató/).first())), 'Profesionales: «no contrató»');
  await a.screenshot({ path: OUT + 'o2-tx-pro-d.png' });
  await a.goto(B + '/admin/analitica?tab=sp&p=90'); await verV(a.getByText('SEGURO ACEPTADO'));
  ok(!!(await vis(a.getByText('CONSULTA → CONTRATÓ'))) && !!(await vis(a.getByText('«COBRÓ EL TOTAL QUE DIJO»'))), 'Analítica: consulta → contrató · cobró el total');
  const nAy = Number(sql(`select count(*) from help_requests h join operations o on o.id = h.operation_id where o.details->>'rubro' in ('salud', 'pro') and h.created_at > now() - interval '90 days'`));
  ok(nAy ? !!(await vis(a.getByText(/^(Doctores|Profesionales) · /).first())) : !!(await vis(a.getByText('Nadie pidió ayuda con Doctores ni Profesionales en el período.'))), `Analítica: motivos de ayuda por rubro (${nAy} en 90 días)`);
  ok(!(await vis(a.getByText(/UPMC|Medicaid|metformina/))), 'Analítica: ni seguros ni datos de nadie');
  await a.screenshot({ path: OUT + 'o3-analitica-sp-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK adm4m');
})().catch((e) => { console.error(e); process.exit(1); });
