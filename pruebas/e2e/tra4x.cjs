// 4x · Ficha de Transporte: precio cerrado con lo que incluye, la próxima salida con asientos, la hoja con «Reservar»/«Enviar una
// caja»/«Pedir precio cerrado», la licencia verificada (sin ella: «Licencia en revisión» y se llama), caja con SALE/LLEGA EN, FAQ.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (l) => { for (let i = 0; i < 40; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
(async () => {
  sql(`update trip_runs set seats_outside = 0, status = 'scheduled' where business_id = 'van-express-nyc' and run_at > now()`);
  sql(`update licenses set status = 'valid' where business_id = 'aeropuerto-seguro' and kind = 'pa_puc'`);
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
  m.on('pageerror', e => err.push(e.message)); m.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });

  // ── 1. Van: Resumen y Servicios ──
  await m.goto(B + `/n/van-express-nyc`);
  ok(await espera(m.getByText('¿CUÁNTO ES EN TOTAL?')) && await espera(m.getByText('El precio del viaje es cerrado antes de salir.').first()), 'Resumen: ¿CUÁNTO ES EN TOTAL? con la línea fija');
  ok(await espera(m.getByText(/Autoridad interestatal \(MC\).*verificada por To’Latino/)), 'Resumen: la licencia verificada');
  ok(await espera(m.getByText('¿El precio puede cambiar?')) && await espera(m.getByText('¿Cuántas maletas puedo llevar?')), 'FAQ de Transporte (precio cerrado, maletas)');
  await m.screenshot({ path: OUT + 'x1-resumen-m.png', fullPage: true });
  await m.goto(B + `/n/van-express-nyc?tab=svc`);
  ok(await espera(m.getByText(/POR PERSONA · NIÑO \$30/)) && await espera(m.getByText(/SALE 5 AM · 1 PM · 7 PM/)), 'servicio por asiento: $45 POR PERSONA · NIÑO $30 · SALE 5 AM · 1 PM · 7 PM');
  ok(await espera(m.getByText(/(HOY|MAÑANA) \d{1,2}(:\d\d)? (AM|PM) · QUEDAN 14/)), 'la próxima salida con los asientos que quedan');
  ok(await espera(m.getByText(/HASTA 12 PERSONAS/)), 'vehículo completo: HASTA 12 PERSONAS');
  await clic(m.getByText('Hazleton → Washington Heights').first());
  await m.locator('[data-screen-label="Servicio · Transporte"]').waitFor();
  ok(await espera(m.getByText('EL PRECIO INCLUYE')) && await espera(m.getByRole('button', { name: 'Reservar', exact: true })) && await espera(m.getByText(/Se retiene en tu tarjeta al reservar/)), 'hoja: EL PRECIO INCLUYE, se retiene al reservar y «Reservar»');
  await m.screenshot({ path: OUT + 'x2-hoja-m.png' });
  await clic(m.getByRole('button', { name: 'Cerrar' }));

  // ── 2. Caja ──
  await m.goto(B + `/n/envios-quisqueya-cargo?tab=svc`);
  ok(await espera(m.getByText(/POR CAJA O ENVÍO/)), 'caja: POR CAJA O ENVÍO');
  await clic(m.getByText(/Caja grande/).first()); ok(await espera(m.getByRole('button', { name: 'Enviar una caja' })), 'hoja de la caja: «Enviar una caja»');
  await clic(m.getByRole('button', { name: 'Cerrar' }));
  await m.goto(B + `/n/envios-quisqueya-cargo`); ok(await espera(m.getByText('¿Cuánto tarda en llegar?')), 'FAQ de la caja: cuánto tarda');

  // ── 3. Mudanza: precio cerrado con fotos ──
  await m.goto(B + `/n/mudanzas-el-primo?tab=svc`);
  ok(await espera(m.getByText(/CERRADO CON FOTOS/)), 'mudanza: Desde $X · CERRADO CON FOTOS');
  await clic(m.getByText(/Apartamento de 1 cuarto/).first()); ok(await espera(m.getByRole('button', { name: 'Pedir precio cerrado' })) && await espera(m.getByText(/No se cobra nada hasta que lo aceptes/)), 'hoja: «Pedir precio cerrado» sin cobrar');
  await clic(m.getByRole('button', { name: 'Cerrar' }));

  // ── 4. Sin licencia válida: en revisión y se llama ──
  sql(`update licenses set status = 'review' where business_id = 'aeropuerto-seguro' and kind = 'pa_puc'`);
  await m.goto(B + `/n/aeropuerto-seguro?tab=svc`);
  ok(await espera(m.getByText(/Licencia en revisión: por ahora se reserva llamando/)), 'sin licencia válida: «Licencia en revisión»');
  await clic(m.getByText('A JFK').first()); ok(await espera(m.getByRole('button', { name: 'Llama para reservar' })), 'la hoja dice «Llama para reservar»');
  sql(`update licenses set status = 'valid' where business_id = 'aeropuerto-seguro' and kind = 'pa_puc'`);

  // ── 5. Escritorio ──
  const d = await (await b.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); d.on('pageerror', e => err.push(e.message));
  await d.goto(B + `/n/envios-quisqueya-cargo`);
  ok(await espera(d.getByText('SALE')) && await espera(d.getByText('Sábado')) && await espera(d.getByText(/3 a 4 semanas/)), 'escritorio (caja): riel PRECIO · SALE Sábado · LLEGA EN 3 a 4 semanas');
  await d.screenshot({ path: OUT + 'x3-caja-d.png', fullPage: true });
  await d.goto(B + `/n/van-express-nyc?tab=svc`); await espera(d.getByText(/POR PERSONA/));
  await d.screenshot({ path: OUT + 'x4-van-servicios-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK tra4x');
})().catch((e) => { console.error(e); process.exit(1); });
