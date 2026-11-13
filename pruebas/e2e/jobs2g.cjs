const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const shot = async (p, n, full = false) => { await p.waitForTimeout(500); await p.screenshot({ path: OUT + n, fullPage: full }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 20; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { for (let i = 0; i < 40; i++) { if (f() === v) return v; await new Promise((r) => setTimeout(r, 250)); } return f(); };
const MARISOL = "(select id from users where phone='+15705550122')";
const JOB = (t) => sql(`select id from job_postings where business_id='${BIZ}' and title->>'es'='${t}' and status <> 'removed' order by id desc limit 1`);
const limpiar = () => {
  sql(`delete from job_applications where user_id = ${MARISOL}`); sql(`delete from job_saves where user_id = ${MARISOL}`);
  sql(`update job_postings set status = 'removed' where business_id = '${BIZ}' and title->>'es' like 'Prueba %'`);
  sql(`update job_postings set hidden_at = null, hidden_reason = null, hidden_by = null, status = 'live' where business_id = '${BIZ}' and title->>'es' in ('Ayudante de cocina', 'Chofer de delivery')`);
  sql(`update job_applications a set status = v.st, interview_at = null, interview_confirmed = false from (values ('Luis Reyes','sent'),('Kathy Peña','sent'),('Héctor Batista','seen'),('Wilfredo Cabrera','contact')) v(n, st) where a.name = v.n and a.business_id = '${BIZ}'`);
  sql(`update businesses set modules_off = modules_off - 'jobs', modules_on = array(select distinct x from unnest(modules_on || array['jobs']) x) where id = '${BIZ}'`);
};
(async () => {
  limpiar();
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(m, 'cliente'); globalThis.__p = [m];
  await entrar(m, '5705550122');
  // Pestaña Jobs
  await m.goto(B + `/n/${BIZ}?tab=jobs`); const TJ = m.locator('[data-screen-label="Ficha · jobs"]');
  await TJ.getByText('Están contratando').first().waitFor();
  ok(!!(await vis(TJ.getByText('Ayudante de cocina'))) && !!(await vis(TJ.getByText('Chofer de delivery'))), 'la pestaña muestra las 2 vacantes');
  ok(!!(await vis(TJ.getByText('$15–17/hora'))), 'pago real por hora ($15–17/hora)');
  await shot(m, 'j1-tab.png', true);
  await clic(TJ.getByRole('button', { name: 'Guardar' }));
  ok(await espera(() => sql(`select count(*) from job_saves where user_id = ${MARISOL}`), '1') === '1', 'guardar una vacante');
  // Vacante → Aplicar
  await clic(TJ.getByText('Ayudante de cocina'));
  await m.waitForURL(/\/empleo\/\d+$/); await m.getByText('Por hora, antes de impuestos.').first().waitFor();
  ok(!!(await vis(m.getByText('NECESITAS'))) && !!(await vis(m.getByText('TE OFRECEN'))), 'vacante: lo que piden y ofrecen');
  ok(!!(await vis(m.getByText(/no se pide CV, estatus migratorio, SSN/))), 'vacante: aviso de que nunca se pide CV ni papeles');
  await shot(m, 'j2-vacante.png', true);
  await clic(m.getByText('Aplicar', { exact: true }));
  await m.waitForURL(/\/aplicar$/); await m.getByText('TUS DATOS').first().waitFor();
  ok(!!(await vis(m.getByText('FALTA: TU EXPERIENCIA'))), 'aplicar: dice lo que falta');
  await clic(m.getByText('1 a 3 años', { exact: true }));
  for (const d of ['mar', 'mié', 'jue', 'vie', 'sáb', 'dom']) await clic(m.getByRole('button', { name: d, exact: true }));
  ok(!!(await vis(m.getByText('PUEDES TODOS LOS DÍAS'))), 'aplicar: cubre todos los días del puesto');
  ok(!!(await vis(m.getByText('FALTA: CONFIRMAR LOS REQUISITOS'))), 'aplicar: pide confirmar requisitos');
  await clic(m.getByRole('checkbox', { name: 'Mayor de 18 años' })); await clic(m.getByRole('checkbox', { name: 'Poder estar de pie todo el turno' }));
  await (await vis(m.getByRole('textbox', { name: 'Cuéntales (opcional)' }))).fill('Trabajé dos años en una cafetería.');
  await shot(m, 'j3-aplicar.png', true);
  await clic(m.getByText('Enviar solicitud', { exact: true }));
  await m.waitForURL(/\/solicitud\/J-\d+/); await m.getByText('Solicitud enviada').first().waitFor();
  const num = sql(`select number from job_applications where user_id = ${MARISOL} order by id desc limit 1`);
  ok(sql(`select status || '|' || experience || '|' || array_to_string(days, ',') from job_applications where number = '${num}'`) === 'sent|3|1,2,3,4,5,6', `solicitud ${num} guardada (enviada, 1–3 años, mar–dom)`);
  ok(!!(await vis(m.getByText('Tu solicitud llegó a Sabor Dominicano'))), 'estado: enviada');
  ok(!(await vis(m.getByText(/SMS/))), 'estado: no promete SMS');
  await shot(m, 'j4-estado.png', true);
  // Volver a la vacante: «Ver mi solicitud»
  await m.goto(B + `/n/${BIZ}/empleo/${JOB('Ayudante de cocina')}`); await m.getByText('TU SOLICITUD').first().waitFor();
  ok(!!(await vis(m.getByText('Ver mi solicitud'))), 'vacante: «Ver mi solicitud» en vez de Aplicar');
  await m.goto(B + `/n/${BIZ}/empleo/${JOB('Ayudante de cocina')}/aplicar`); await m.waitForURL(/\/solicitud\//); ok(true, 'aplicar otra vez lleva a la solicitud (una por vacante)');

  // Panel: Hoy, Jobs, abrir la solicitud (vista), invitar a entrevista
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(d, 'panel'); globalThis.__p.push(d);
  await entrar(d, '5705550133'); await d.goto(B + `/panel/${BIZ}/hoy`);
  await d.getByText('SOLICITUDES DE EMPLEO NUEVAS').first().waitFor();
  ok(!!(await vis(d.getByText('Marisol', { exact: false }))), 'Hoy: la solicitud nueva');
  await d.goto(B + `/panel/${BIZ}/vendes`); await clic(d.getByText('Jobs', { exact: true }));
  await d.getByText(/ABIERTAS · 2/).first().waitFor();
  ok(!!(await vis(d.getByText('POR RESPONDER'))), 'Jobs: por responder');
  await shot(d, 'j5-panel.png', true);
  const aid = sql(`select id from job_applications where number = '${num}'`);
  await d.goto(B + `/panel/${BIZ}/vendes/jobs?det=vap:${aid}`); await d.getByText(/SOLICITUD · /).first().waitFor();
  ok(sql(`select status from job_applications where id = ${aid}`) === 'seen', 'abrir la solicitud la marca «vista»');
  ok(!!(await vis(d.getByText('Trabajé dos años en una cafetería.'))), 'panel: ve la nota de la persona');
  await clic(d.getByText('Invitar a entrevista', { exact: true }));
  await d.getByText('DÍA DE LA ENTREVISTA · DÍAS QUE ABRES').first().waitFor();
  await shot(d, 'j6-entrevista.png', true);
  await clic(d.getByText('Mandar invitación', { exact: true }));
  ok(await espera(() => sql(`select status || '|' || (interview_at is not null) from job_applications where id = ${aid}`), 'interview|true') === 'interview|true', 'panel: entrevista propuesta (día que abre)');
  // Cliente confirma
  await m.goto(B + `/solicitud/${num}`); await m.getByText('Te invitan a una entrevista').first().waitFor();
  await clic(m.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select interview_confirmed from job_applications where id = ${aid}`), 't') === 't', 'cliente: confirma la entrevista');
  await m.getByText('Entrevista confirmada').first().waitFor(); await shot(m, 'j7-confirmada.png', true);

  // Editor: palabra prohibida, pago mínimo, publicar, pausar, cubrir, quitar
  await d.goto(B + `/panel/${BIZ}/vendes/jobs?det=vac:new`); await d.getByText('Publicar vacante').first().waitFor();
  await (await vis(d.getByPlaceholder('Ej. Ayudante de cocina'))).fill('Prueba cajero');
  await (await vis(d.getByPlaceholder('15'))).fill('6');
  await (await vis(d.getByPlaceholder('Lo que hace en el día, con quién trabaja, si le enseñan.'))).fill('Necesitas traer tu SSN.');
  ok(!!(await vis(d.getByText(/Quita «SSN»/))), 'editor: bloquea pedir SSN');
  await (await vis(d.getByPlaceholder('Lo que hace en el día, con quién trabaja, si le enseñan.'))).fill('Atiendes la caja y el teléfono.');
  ok(!!(await vis(d.getByText(/pago por hora desde \$7.25/))), 'editor: pago mínimo $7.25');
  await (await vis(d.getByPlaceholder('15'))).fill('12');
  await shot(d, 'j8-editor.png', true);
  await d.getByText('Publicar', { exact: true }).last().scrollIntoViewIfNeeded(); await d.getByText('Publicar', { exact: true }).last().click();
  ok(await espera(() => sql(`select status || '|' || pay_from_cents from job_postings where business_id='${BIZ}' and title->>'es' = 'Prueba cajero' order by id desc limit 1`), 'live|1200') === 'live|1200', 'editor: vacante publicada a $12/hora');
  const pj = JOB('Prueba cajero');
  await m.goto(B + `/n/${BIZ}?tab=jobs`); await m.getByText('Prueba cajero').first().waitFor(); ok(true, 'cliente: la nueva sale en la pestaña');
  await d.goto(B + `/panel/${BIZ}/vendes/jobs?det=vac:${pj}`); await clic(d.getByText('Pausar', { exact: true }));
  ok(await espera(() => sql(`select status from job_postings where id = ${pj}`), 'paused') === 'paused', 'pausar');
  await m.goto(B + `/n/${BIZ}?tab=jobs`); await m.getByText('Ayudante de cocina').first().waitFor(); ok(!(await vis(m.getByText('Prueba cajero'))), 'pausada: no sale en la página');
  await clic(d.getByText('Ya la cubrí', { exact: true }));
  ok(await espera(() => sql(`select status from job_postings where id = ${pj}`), 'filled') === 'filled', 'ya la cubrí');
  await clic(d.getByText('Quitar', { exact: true })); await clic(d.getByText('Sí, quitar vacante', { exact: true }));
  ok(await espera(() => sql(`select status from job_postings where id = ${pj}`), 'removed') === 'removed', 'quitar (estado, no se borra)');

  // Cliente retira su solicitud y puede volver a aplicar
  await m.goto(B + `/solicitud/${num}`); await clic(m.getByText('Retirar solicitud', { exact: true })); await clic(m.getByText('Retirar', { exact: true }));
  ok(await espera(() => sql(`select status from job_applications where id = ${aid}`), 'withdrawn') === 'withdrawn', 'cliente: retira la solicitud');
  await m.goto(B + `/n/${BIZ}/empleo/${JOB('Ayudante de cocina')}/aplicar`); await m.getByText('TUS DATOS').first().waitFor(); ok(true, 'retirada: puede volver a aplicar');

  // Super Admin: ocultar una vacante y pausar Jobs
  const a = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); watch(a, 'admin'); globalThis.__p.push(a);
  await entrar(a, '5705550199'); await a.goto(B + `/admin/negocios/${BIZ}?tab=cont`); await a.getByText(/^VACANTES · /).first().waitFor();
  const fa = a.locator('div', { has: a.getByText('Chofer de delivery', { exact: true }) }).filter({ has: a.getByText('Ocultar la vacante', { exact: true }) }).last();
  await fa.getByText('Ocultar la vacante', { exact: true }).click(); await clic(a.getByText('Vacante falsa o engañosa')); await clic(a.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select hidden_at is not null from job_postings where business_id='${BIZ}' and title->>'es' = 'Chofer de delivery'`), 't') === 't', 'admin: vacante oculta');
  await m.goto(B + `/n/${BIZ}?tab=jobs`); await m.getByText('Ayudante de cocina').first().waitFor(); ok(!(await vis(m.getByText('Chofer de delivery'))), 'la oculta ya no sale');
  await d.goto(B + `/panel/${BIZ}/vendes/jobs`); await d.getByText(/1 vacante la ocultó To’Latino/).first().waitFor(); ok(true, 'el dueño ve la vacante oculta');
  await clic(a.getByText('Pausar Jobs')); await clic(a.getByText('Reportes de vecinos')); await clic(a.getByText('Confirmar', { exact: true }));
  ok(await espera(() => sql(`select (modules_off ? 'jobs')::text from businesses where id = '${BIZ}'`), 'true') === 'true', 'admin: Jobs en pausa');
  await m.goto(B + `/n/${BIZ}`); await m.waitForTimeout(800); ok(!(await vis(m.getByText('Jobs', { exact: true }))), 'en pausa: la pestaña desaparece');
  await d.goto(B + `/panel/${BIZ}/vendes/jobs`); await d.getByText(/To’Latino pausó tus Jobs/).first().waitFor(); ok(true, 'el dueño ve la pausa con su motivo');

  ok(err.length === 0, 'sin errores en consola: ' + err.join(' | '));
  limpiar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch {} try { limpiar(); } catch {} process.exit(1); });
