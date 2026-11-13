// 4h-3 · SU LICENCIA de cada profesional (panel → cola/360 → «El médico habla español»), Catálogo › Seguros, Mis seguros.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', S = 'centro-medico-quisqueya';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
(async () => {
  const b = await chromium.launch(); const err = [];
  const mk = async (vp) => { const p = await (await b.newContext({ viewport: vp })).newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); }); return p; };
  const d = await mk({ width: 1360, height: 900 }), m = await mk({ width: 390, height: 844 });
  const L = sql(`select id from business_members where business_id = '${S}' and display_name = 'Luis Fernández, PA-C'`);
  sql(`update licenses set status = 'withdrawn' where member_id = '${L}' and status <> 'withdrawn'`);
  sql(`update businesses set filter_values = array_remove(filter_values, 'medesp') where id = '${S}'`);
  // ── Panel: SU LICENCIA ──
  await entrar(d, '5705550244');
  await d.goto(B + `/panel/${S}/pagina/equipo?det=stf:${L}`); await d.getByText('SU LICENCIA', { exact: true }).first().waitFor();
  ok(!!(await vis(d.getByText(/no para elegir en «¿Con quién\?» hasta que su licencia esté verificada/))), 'sin licencia: «no para elegir en ¿Con quién? hasta que esté verificada»');
  await clic(d.getByText('Asistente médico (PA-C)', { exact: true }));
  await (await vis(d.getByLabel('NÚMERO DE LICENCIA', { exact: true }))).fill('MT-209344');
  await d.screenshot({ path: OUT + 'h9-licencia-persona-d.png', fullPage: true });
  await clic(d.getByRole('button', { name: 'Mandar a verificar' }));
  ok(await espera(() => sql(`select kind || '|' || number || '|' || status from licenses where member_id = '${L}' and status <> 'withdrawn'`), 'pac|MT-209344|review') === 'pac|MT-209344|review', 'licencia de Luis: PA-C · MT-209344 · en revisión');
  ok(sql(`select count(*) from queue_items q join licenses l on l.id::text = q.subject_id where q.queue = 'lic' and q.status = 'open' and l.member_id = '${L}'`) === '1', 'caso abierto en la cola Licencias');
  await d.getByText('EN REVISIÓN', { exact: true }).first().waitFor(); ok(true, 'se ve «EN REVISIÓN» en su ficha del equipo');
  // ── Super Admin: verificar desde el 360 ──
  const a = await mk({ width: 1360, height: 900 }); await entrar(a, '5705550199');
  await a.goto(B + `/admin/negocios/${S}?tab=vende`); await a.getByText('Asistente médico (PA-C) · Luis Fernández, PA-C').first().waitFor(); ok(true, 'admin 360 › Lo que vende: «Asistente médico (PA-C) · Luis Fernández, PA-C»');
  await clic(a.getByRole('button', { name: 'Verificar' }));
  await clic(a.getByText('Coincide con el registro oficial', { exact: true }));
  await clic(a.getByRole('button', { name: 'Confirmar' }));
  ok(await espera(() => sql(`select status from licenses where member_id = '${L}' and status <> 'withdrawn'`), 'valid') === 'valid', 'verificada');
  ok(sql(`select 'medesp' = any(filter_values) from businesses where id = '${S}'`) === 't', 'filtro «El médico habla español» (Luis habla español y tiene licencia verificada)');
  // ── Catálogo › Seguros ──
  await a.goto(B + `/admin/catalogo?tab=seg`); await a.getByText('PRIVADOS', { exact: true }).first().waitFor();
  await a.screenshot({ path: OUT + 'h10-admin-seguros-d.png', fullPage: true });
  await clic(a.getByRole('switch', { name: 'EyeMed', exact: true }));
  await clic(a.getByText('Nombre equivocado o duplicado', { exact: true })); await clic(a.getByRole('button', { name: 'Confirmar' }));
  ok(await espera(() => sql(`select hidden from insurers where key = 'eyemed'`), 't') === 't', 'EyeMed oculto (con motivo, en la auditoría)');
  await d.goto(B + `/panel/${S}/vendes/herramienta`); await d.getByText('PRIVADOS', { exact: true }).first().waitFor();
  ok(!(await vis(d.getByText('EyeMed', { exact: true }))), 'oculto: ya no sale en «Seguros e idiomas»');
  await a.goto(B + `/admin/catalogo?tab=seg`); await clic(a.getByRole('switch', { name: 'EyeMed', exact: true }));
  await (await vis(a.getByRole('textbox'))).fill('Prueba terminada'); await clic(a.getByRole('button', { name: 'Confirmar' }));
  ok(await espera(() => sql(`select hidden from insurers where key = 'eyemed'`), 'f') === 'f', 'EyeMed vuelve');
  // ── Mis seguros (Marisol) ──
  const MU = sql(`select id from users where phone = '+15705550122'`); sql(`update user_insurances set removed_at = now() where user_id = '${MU}' and removed_at is null`);
  await entrar(m, '5705550122'); await m.goto(B + '/cuenta/seguros'); await m.getByText('TU SEGURO', { exact: true }).first().waitFor();
  ok(true, 'sin seguros: abre directo el formulario');
  await clic(m.getByText('Medicaid', { exact: true })); await clic(m.getByText('UPMC for You', { exact: true }));
  await (await vis(m.getByLabel(/NÚMERO DE MIEMBRO/))).fill('XJ88214471');
  await m.screenshot({ path: OUT + 'h11-mis-seguros-form-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Guardar seguro' }));
  ok(await espera(() => sql(`select kind || '|' || insurer || '|' || plan || '|' || member_last4 || '|' || is_default from user_insurances where user_id = '${MU}' and removed_at is null`), 'medicaid|medicaid|upmcfy|4471|true') === 'medicaid|medicaid|upmcfy|4471|true', 'guardado: Medicaid · UPMC for You · solo «4471» · principal');
  await m.getByText('Medicaid · UPMC for You').first().waitFor(); ok(!!(await vis(m.getByText(/••• 4471/).first())), 'la lista dice «Medicaid · UPMC for You · ••• 4471»');
  await clic(m.getByRole('button', { name: 'Agregar otro seguro' }));
  await clic(m.getByText('Seguro del trabajo o privado', { exact: true })); await clic(m.getByText('Highmark', { exact: true })); await clic(m.getByText('Para mi hijo o hija', { exact: true }));
  await clic(m.getByRole('button', { name: 'Guardar seguro' }));
  await m.getByText('Highmark').first().waitFor();
  await clic(m.getByRole('button', { name: 'Usar este' }));
  ok(await espera(() => sql(`select insurer from user_insurances where user_id = '${MU}' and removed_at is null and is_default`), 'highmark') === 'highmark', '«Usar este» → Highmark es el principal');
  await m.screenshot({ path: OUT + 'h12-mis-seguros-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Quitar' }).first());
  await clic(m.getByRole('button', { name: 'Quitar', exact: true }).last());
  ok(await espera(() => sql(`select count(*) from user_insurances where user_id = '${MU}' and removed_at is null`), '1') === '1', 'quitar → queda uno (nada se borra: removed_at)');
  ok(sql(`select count(*) from user_insurances where user_id = '${MU}' and removed_at is null and is_default`) === '1', 'el que queda pasa a ser el principal');
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK svc4h3');
})().catch((e) => { console.error(e); process.exit(1); });
