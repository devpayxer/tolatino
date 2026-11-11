// 4m-1 · Reseña de Doctores y Profesionales: dato de la cita (seguro aceptado, pagaste / total por escrito), preguntas por
// rubro, filtro de datos de salud o del caso, ≤2 ★ → Ayuda, chips y «Lo que importa en Salud / en un trámite».
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', S = 'centro-medico-quisqueya', P = 'bufete-almonte';
const MARISOL = "(select id from users where phone = '+15705550122')";
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const verV = async (l) => { for (let i = 0; i < 60; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
(async () => {
  sql(`update reviews set status = 'removed' where user_id = ${MARISOL} and business_id in ('${S}', '${P}') and status <> 'removed'`);
  // Una cita de Salud terminada (con su seguro aceptado) y un trámite contratado y terminado.
  const CS = sql(`select number from operations where user_id = ${MARISOL} and business_id = '${S}' and kind = 'appointment' order by id desc limit 1`);
  sql(`update operations set status = 'done', done_at = now(), details = jsonb_set(jsonb_set(details, '{seguro,acepta}', 'true'), '{precio}', '{\"es\": \"\$0 · CON TU SEGURO\", \"en\": \"\$0 · WITH YOUR INSURANCE\"}') where number = '${CS}'`);
  const CP = sql(`select number from operations where user_id = ${MARISOL} and business_id = '${P}' and status = 'done' and status_detail = 'done' order by id desc limit 1`);
  sql(`update operations set done_at = now() where number = '${CP}'`);
  ok(!!CS && !!CP, `cita de Salud ${CS} y trámite ${CP} terminados`);
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); await entrar(m, '5705550122');
  m.on('pageerror', (e) => err.push(e.message)); m.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  const grupo = async (k, l) => clic(m.getByText(k, { exact: true }).locator('..').getByRole('button', { name: l, exact: true }));
  // ── Salud: 2 ★ ──
  await m.goto(B + `/n/${S}/resena?pedido=${CS}&e=2`); await verV(m.getByText('TU CITA · DATO DE LA CITA'));
  ok(!!(await vis(m.getByText(new RegExp(`^Cita ${CS} · `)))), 'sobre qué cita: la cita verificada con su servicio');
  ok(!!(await vis(m.getByText('Aceptado', { exact: true }))) && !!(await vis(m.getByText('$0 · CON TU SEGURO'))), 'dato: SEGURO Aceptado · PAGASTE $0 con tu seguro');
  ok(!(await vis(m.getByText(/UPMC|4471/))), 'el nombre del plan y los 4 últimos no salen en la reseña');
  ok(!!(await vis(m.getByText('Nunca se publica el motivo de la consulta.', { exact: false }))), '«Nunca se publica el motivo de la consulta»');
  ok(!!(await vis(m.getByText('LO QUE IMPORTA EN SALUD'))) && !!(await vis(m.getByText('¿TE ENTENDIERON EN TU IDIOMA?'))) && !(await vis(m.getByText('¿ACEPTARON TU SEGURO?'))), 'preguntas de Salud (con cita no pregunta el seguro: sale del dato)');
  ok(!!(await vis(m.getByRole('button', { name: 'Ir a Ayuda con la cita' }))) && !!(await vis(m.getByText(/ni corrige un cobro/))), '≤2 ★: «no devuelve dinero ni corrige un cobro» · Ir a Ayuda con la cita');
  await grupo('¿TE ENTENDIERON EN TU IDIOMA?', 'El médico habló español'); await grupo('¿ESPERASTE LO QUE DIJERON?', 'Más de 30 min');
  await grupo('¿TE EXPLICARON?', 'Sí, todo'); await grupo('¿COBRARON LO QUE DIJERON?', 'Sí'); await grupo('TRATO', 'Buen trato');
  const caja = await vis(m.getByLabel('Tu reseña'));
  ok((await caja.getAttribute('placeholder')).startsWith('No escribas diagnósticos'), 'placeholder fijo: «No escribas diagnósticos, medicinas ni resultados…»');
  await caja.fill('La doctora me cambió la metformina a 500 mg y me explicó todo, pero esperé casi una hora.');
  await verV(m.getByText('QUITAR DATOS DE SALUD O DE TU CASO')); ok(true, 'filtro: con medicina y dosis no se puede publicar');
  await m.screenshot({ path: OUT + 'm1-filtro-salud-m.png', fullPage: true });
  await caja.fill('La doctora habló español conmigo y me explicó todo con calma, pero esperé casi una hora en la sala.');
  await clic(m.getByRole('button', { name: /^Publicar/ })); await m.waitForURL(/\/resena\/tuya/);
  const r1 = sql(`select r.src || '|' || r.answers::text || '|' || r.facts::text from reviews r where r.user_id = ${MARISOL} and r.business_id = '${S}' and r.status <> 'removed'`);
  ok(/^cita\|/.test(r1) && /"lengua": "es"/.test(r1) && /"wait": "c"/.test(r1) && /"explico": 1/.test(r1) && /"cobro": 1/.test(r1) && !/"seguro"/.test(r1.split('|')[1]), `respuestas (${r1.split('|')[1]})`);
  ok(/"seg": true/.test(r1) && /"segOk": true/.test(r1) && !/UPMC|4471|medicaid/i.test(r1), `dato del servidor sin plan ni número (${r1.split('|')[2]})`);
  await m.goto(B + `/n/${S}?tab=rev`); await verV(m.getByText('Aceptaron su seguro'));
  ok(!!(await vis(m.getByText('El médico habló español').first())) && !!(await vis(m.getByText('Esperó más de 30 min').first())), 'tarjeta: aceptaron su seguro · el médico habló español · esperó más de 30 min');
  await m.screenshot({ path: OUT + 'm2-tarjeta-salud-m.png', fullPage: true });
  // ── Pro: 4 ★ ──
  await m.goto(B + `/n/${P}/resena?pedido=${CP}&e=4`); await verV(m.getByText('TU CONSULTA · DATO DE LA CONSULTA'));
  ok(!!(await vis(m.getByText(/^\$[\d,]+ · lo que dijo$/))), 'dato: TOTAL POR ESCRITO $X · lo que dijo');
  ok(!!(await vis(m.getByText('LO QUE IMPORTA EN UN TRÁMITE'))) && !!(await vis(m.getByText('¿HIZO LO QUE DIJO QUE PODÍA?'))) && !!(await vis(m.getByText('¿CUMPLIÓ LA FECHA?'))), 'preguntas de un trámite');
  ok(!(await vis(m.getByText(/La reseña no devuelve dinero/))), '4 ★: sin el aviso de Ayuda');
  await grupo('¿COBRÓ EL TOTAL QUE DIJO?', 'Sí'); await grupo('¿HIZO LO QUE DIJO QUE PODÍA?', 'Sí'); await grupo('¿EN TU IDIOMA?', 'En español'); await grupo('¿CUMPLIÓ LA FECHA?', 'Un poco tarde, avisó');
  const caja2 = await vis(m.getByLabel('Tu reseña'));
  await caja2.fill('Me ayudaron con mi caso, mi número es A123456789 y todo salió bien.');
  await verV(m.getByText('QUITAR DATOS DE SALUD O DE TU CASO')); ok(true, 'filtro: con A-number no se puede publicar');
  await caja2.fill('Me explicaron qué podían hacer y qué no. Cobraron lo del total por escrito, sin sorpresas.');
  await m.screenshot({ path: OUT + 'm3-resena-pro-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: /^Publicar/ })); await m.waitForURL(/\/resena\/tuya/);
  const r2 = sql(`select r.answers::text || '|' || r.facts::text from reviews r where r.user_id = ${MARISOL} and r.business_id = '${P}' and r.status <> 'removed'`);
  ok(/"ley": 1/.test(r2) && /"fecha": "b"/.test(r2) && /"lengua": "es"/.test(r2) && /"hired": true/.test(r2) && /"tot": \d+/.test(r2), `pro: respuestas y dato (${r2})`);
  await m.goto(B + `/n/${P}?tab=rev`); await verV(m.getByText('Hizo lo que dijo que podía'));
  ok(!!(await vis(m.getByText(/^Total por escrito: \$/).first())), 'tarjeta pro: total por escrito · hizo lo que podía');
  const n = Number(sql(`select count(*) from reviews where business_id = '${P}' and status = 'visible'`));
  if (n >= 5) { ok(!!(await vis(m.getByText('LO QUE IMPORTA EN UN TRÁMITE'))) && !!(await vis(m.getByText('HIZO LO QUE PODÍA POR LEY'))), 'ficha: lo que importa en un trámite (barras)'); }
  await m.screenshot({ path: OUT + 'm4-tarjeta-pro-m.png', fullPage: true });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK res4m');
})().catch((e) => { console.error(e); process.exit(1); });
