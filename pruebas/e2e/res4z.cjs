// 4z-1 · Reseñas de Fiestas y Transporte: verificada con la fiesta / el viaje terminado, «dato de la reserva» (fecha respetada,
// pagaste, precio cerrado) que no se edita, preguntas por rubro, ≤2 ★ → la reseña no devuelve dinero, marcas en la tarjeta y
// «Lo que importa» en la ficha.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
// 9b-1 · Lo que hace otra prueba se pide con requiere (si no está en la base, se corre esa prueba): ya no depende del orden.
const { requiere } = require('../lib/requiere.cjs');
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', F = 'salon-imperial', V = 'van-express-nyc';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const MARISOL = "(select id from users where phone = '+15705550122')";
(async () => {
  sql(`update reviews set status = 'removed' where user_id = ${MARISOL} and business_id in ('${F}', '${V}')`);
  const FN = requiere('fie4v', () => sql(`select number from operations where user_id = ${MARISOL} and business_id = '${F}' and kind = 'party' and status = 'done' order by id desc limit 1`), { que: 'una fiesta terminada' });
  const VN = requiere('tra4y', () => sql(`select number from operations where user_id = ${MARISOL} and business_id = '${V}' and kind = 'trip' and status = 'done' order by id desc limit 1`), { que: 'un viaje terminado' });
  ok(!!FN && !!VN, `fiesta terminada ${FN} y viaje terminado ${VN}`);
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(m, '5705550122');
  m.on('pageerror', e => err.push(e.message));
  const grupo = async (k, l) => clic(m.getByText(k, { exact: true }).locator('..').getByRole('button', { name: l, exact: true }));
  // ── Fiesta: 2 ★ ──
  await m.goto(B + `/n/${F}/resena?pedido=${FN}&e=2`); await m.getByText('TU FIESTA · DATO DE LA RESERVA').first().waitFor();
  ok(!!(await vis(m.getByText(new RegExp(`^Fiesta ${FN}`)))) && !!(await vis(m.getByText('VERIFICADA').first())), 'sobre qué fiesta: verificada');
  ok(!!(await vis(m.getByText(/ · respetada$/))) && !!(await vis(m.getByText('PAGASTE'))), 'dato: fecha respetada y lo que pagó');
  ok(!!(await vis(m.getByText('LO QUE IMPORTA EN UNA FIESTA'))) && !!(await vis(m.getByText('¿QUEDÓ COMO EN LAS FOTOS?'))) && !(await vis(m.getByText('¿RESPETARON LA FECHA?'))), 'preguntas de fiesta (la fecha sale del dato)');
  ok(!!(await vis(m.getByText(/pídelo en Ayuda con la fiesta/))), '≤2 ★: la reseña no devuelve dinero · Ayuda con la fiesta');
  await grupo('¿LLEGARON A LA HORA?', 'Muy tarde'); await grupo('¿QUEDÓ COMO EN LAS FOTOS?', 'Más o menos'); await grupo('¿COBRARON LO DEL PAQUETE?', 'Sí'); await grupo('¿RECOGIERON Y LIMPIARON?', 'Sí');
  await (await vis(m.getByLabel('Tu reseña'))).fill('El salón quedó bonito pero llegaron casi una hora tarde a montar la decoración y empezamos tarde.');
  await m.screenshot({ path: OUT + 'w1-resena-fiesta-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: /^Publicar/ })); await m.waitForURL(/\/resena\/tuya/);
  const r1 = sql(`select r.src || '|' || r.answers::text || '|' || r.facts::text from reviews r where r.user_id = ${MARISOL} and r.business_id = '${F}' and r.status <> 'removed'`);
  ok(/^cita\|/.test(r1) && /"llegaron": "c"/.test(r1) && /"paquete": 1/.test(r1) && /"dia":/.test(r1) && /"tot":/.test(r1), `guardada con respuestas y dato (${r1})`);
  await m.goto(B + `/n/${F}?tab=rev`); await m.getByText('Llegaron muy tarde').first().waitFor();
  ok(!!(await vis(m.getByText('Respetaron la fecha').first())) && !!(await vis(m.getByText('Cobraron lo del paquete').first())), 'tarjeta: respetaron la fecha · llegaron muy tarde · cobraron lo del paquete');
  ok(!!(await vis(m.getByText('LO QUE IMPORTA EN UNA FIESTA').first())), 'ficha: LO QUE IMPORTA EN UNA FIESTA');
  await m.screenshot({ path: OUT + 'w2-ficha-fiesta-m.png', fullPage: true });
  // ── Viaje: 5 ★ ──
  await m.goto(B + `/n/${V}/resena?pedido=${VN}&e=5`); await m.getByText('TU VIAJE · DATO DE LA RESERVA').first().waitFor();
  ok(!!(await vis(m.getByText(/ · precio cerrado$/))), 'dato: pagaste · precio cerrado');
  await grupo('¿COBRÓ EL PRECIO CERRADO?', 'Sí'); await grupo('¿SALIÓ A LA HORA?', 'Hasta 15 min tarde'); await grupo('¿LLEGÓ A LA HORA?', 'Sí'); await grupo('¿MANEJO SEGURO?', 'Sí'); await grupo('¿EQUIPAJE O CARGA BIEN?', 'Todo bien'); await grupo('TRATO', 'Buen trato');
  await (await vis(m.getByLabel('Tu reseña'))).fill('Salió casi a la hora, el chofer manejó con cuidado y llegamos bien a Washington Heights.');
  await m.screenshot({ path: OUT + 'w3-resena-viaje-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: /^Publicar/ })); await m.waitForURL(/\/resena\/tuya/);
  await m.goto(B + `/n/${V}?tab=rev`); await m.getByText('Cobró el precio cerrado').first().waitFor();
  ok(!!(await vis(m.getByText('Manejo seguro').first())) && !!(await vis(m.getByText('LO QUE IMPORTA EN UN VIAJE').first())), 'tarjeta y ficha del viaje');
  await m.screenshot({ path: OUT + 'w4-ficha-viaje-m.png', fullPage: true });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK res4z');
})().catch((e) => { console.error(e); process.exit(1); });
