// 4y-3a · Super Admin › Transacciones › Viajes (forma, día, asientos/cajas, la mitad, rastreo, precio cerrado) y «Devolver» de un
// viaje y de una fiesta (antes la pantalla lo mostraba y el servidor decía «Ese pedido no existe»).
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const espera = async (l) => { for (let i = 0; i < 40; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
(async () => {
  // 9b-1 · Los viajes que esta prueba mira en Transacciones los hacen tra4y (la mitad cobrada, la salida que cancela el negocio) y tra4y2 (la caja
  // con rastreo, la mudanza con su precio cerrado). Se corren siempre antes (requiere): así son los últimos de la lista, en una base nueva o en
  // la décima corrida (antes la lista se llenaba con viajes de otras corridas y lo de tra4y ya no salía arriba).
  const { requiere } = require('../lib/requiere.cjs');
  requiere('tra4y', () => sql(`select number from operations where kind = 'trip' and business_id = 'van-express-nyc' and sent_at > now() - interval '30 minutes' limit 1`), { siempre: true, que: 'los viajes de tra4y' });
  const V = requiere('tra4y2', () => sql(`select o.number from operations o join payments p on p.operation_id = o.id and p.kind = 'full' where o.kind = 'trip' and o.details->>'k' = 'cotiza' and p.status = 'captured' order by o.id desc limit 1`), { siempre: true, que: 'un viaje cotizado y cobrado' });
  const b = await chromium.launch(); const err = [];
  const ad = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); await entrar(ad, '5705550199');
  ad.on('pageerror', e => err.push(e.message));
  await ad.goto(B + '/admin/transacciones?tab=viaje');
  ok(await espera(ad.getByText(/Viaje V-\d+/).first()), 'pestaña Viajes con viajes');
  ok(await espera(ad.getByText(/se cobró la mitad \$22\.50/).first()), 'se ve la mitad cobrada');
  ok(await espera(ad.getByText(/el negocio canceló la salida/).first()), 'se ve la salida cancelada por el negocio');
  ok(await espera(ad.getByText(/rastreo QC-77881/).first()) && await espera(ad.getByText(/precio cerrado v1/).first()), 'caja con rastreo y mudanza con su precio cerrado');
  ok(!(await ad.content()).includes('Testigo'), 'el destinatario no sale en Transacciones');
  await ad.screenshot({ path: OUT + 'a1-admin-viajes-d.png', fullPage: true });
  // Devolver $10 de la mudanza cobrada (M1 de tra4y2, $650 captured y done).
  ok(/^V-\d+$/.test(V), `mudanza cobrada para devolver: ${V}`);
  await ad.goto(B + `/admin/transacciones?tab=viaje&q=${V}`); await ad.getByText(new RegExp(`Viaje ${V}`)).first().waitFor();
  await clic(ad.getByRole('button', { name: 'Devolver' }));
  const monto = await vis(ad.getByLabel(/MONTO EN DÓLARES/)) ?? await vis(ad.locator('input').last()); await monto.fill('10');
  await clic(ad.getByText('El viaje no fue como se acordó.')); await clic(ad.getByRole('button', { name: 'Devolver', exact: true }).last());
  ok(await espera(ad.getByText(/Devueltos \$10\.00/)), 'Devolver desde el Super Admin funciona en un viaje');
  ok(sql(`select p.refunded_cents from payments p join operations o on o.id = p.operation_id where o.number = '${V}' and p.kind = 'full'`) === '1000', 'devueltos $10 en el pago');
  ok(sql(`select count(*) from audit_entries where action = 'transacciones.devolver' and after->>'viaje' = '${V}'`) === '1', 'queda en la auditoría como viaje');
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK adm4y');
})().catch((e) => { console.error(e); process.exit(1); });
