// 4i · Ficha de Doctores: Servicios con precio según tu seguro, «Tu seguro» (sin cuenta = solo esta visita; con cuenta =
// se guarda), compatibilidad (acepta / no acepta, nunca bloquea), hoja del servicio (IMPORTANTE, ¿Con quién? solo con licencia
// verificada), sin cita con espera fresca, Resumen (datos, cómo funciona). Teléfono y escritorio.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', S = 'centro-medico-quisqueya', U = 'urgencias-express-hazleton';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const verV = async (l) => { for (let i = 0; i < 60; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l); };
const espera = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
(async () => {
  const b = await chromium.launch(); const err = [];
  const mk = async (vp) => { const p = await (await b.newContext({ viewport: vp })).newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_|maplibre|tiles/i.test(x.text())) err.push('console ' + x.text()); }); return p; };
  const m = await mk({ width: 390, height: 844 }), d = await mk({ width: 1360, height: 900 });
  sql(`update health_settings set insurers = '{medicaid,medicare,chip,highmark,geisinger,upmc,aetna}', uninsured = true, cash_cents = 8500 where business_id = '${S}'`);
  // ── Sin cuenta ──
  await m.goto(B + `/n/${S}?tab=svc`); await m.getByText('¿ACEPTAN TU SEGURO?').first().waitFor();
  ok(!!(await vis(m.getByText(/Si es una emergencia, llama al 911/).first())), 'nota 911 arriba');
  ok(!!(await vis(m.getByText('SIN SEGURO · CON EL TUYO PUEDE SER MENOS', { exact: false }).first())), 'sin seguro elegido: «SIN SEGURO · CON EL TUYO PUEDE SER MENOS»');
  await m.screenshot({ path: OUT + 'i1-salud-svc-anon-m.png', fullPage: true });
  await clic(m.getByText('Agrega tu seguro', { exact: true }));
  await clic(m.getByRole('dialog', { name: 'Tu seguro' }).getByText('Seguro del trabajo o privado', { exact: true }));
  await clic(m.getByRole('dialog', { name: 'Tu seguro' }).getByText('Cigna', { exact: true }));
  await clic(m.getByRole('button', { name: 'Guardar seguro' }));
  await m.getByText(/No aceptan Cigna · sin seguro \$85/).first().waitFor(); ok(true, 'Cigna (no lo aceptan): «No aceptan Cigna · sin seguro $85» — no bloquea');
  await clic(m.getByText('Cambiar', { exact: true }));
  ok(!!(await vis(m.getByText('SOLO ESTA VISITA', { exact: true }))), 'sin cuenta: «SOLO ESTA VISITA»');
  await m.keyboard.press('Escape').catch(() => {}); await clic(m.getByRole('button', { name: 'Listo' }));
  // ── Con cuenta (Marisol: Medicaid · UPMC for You) ──
  const MU = sql(`select id from users where phone = '+15705550122'`);
  sql(`update user_insurances set removed_at = now() where user_id = '${MU}' and removed_at is null`);
  sql(`insert into user_insurances (user_id, kind, insurer, plan, member_last4, for_whom, is_default) values ('${MU}', 'medicaid', 'medicaid', 'upmcfy', '4471', 'yo', true)`);
  await entrar(m, '5705550122'); await m.goto(B + `/n/${S}?tab=svc`);
  await m.getByText(/Aceptan tu Medicaid · UPMC for You · no pagas la consulta/).first().waitFor(); ok(true, 'con cuenta: «Aceptan tu Medicaid · UPMC for You · no pagas la consulta»');
  ok(!!(await vis(m.getByText('$0', { exact: true }).first())) && !!(await vis(m.getByText(/CON TU SEGURO/).first())), 'precios: «$0 · CON TU SEGURO»');
  await m.screenshot({ path: OUT + 'i2-salud-svc-medicaid-m.png', fullPage: true });
  // Hoja del servicio: ¿Con quién? solo con licencia verificada (Luis verificado en 4h-3).
  await clic(m.getByText('Consulta de medicina general', { exact: true }));
  const hoja = m.getByRole('dialog', { name: 'Consulta de medicina general' });
  await hoja.getByText('¿CON QUIÉN?').waitFor();
  ok(!!(await vis(hoja.getByText('Luis Fernández, PA-C'))) && !(await vis(hoja.getByText('Marisol Peña'))), '¿Con quién?: Luis (licencia verificada) sí; recepción no');
  ok(!!(await vis(hoja.getByText(/HABLA ESPAÑOL/).first())), '«HABLA ESPAÑOL»');
  await m.screenshot({ path: OUT + 'i3-salud-hoja-m.png' });
  await clic(hoja.getByRole('button', { name: 'Cerrar' }));
  // Cambiar a Highmark privado (se guarda en la cuenta) → «Copago · SEGÚN TU PLAN».
  await clic(m.getByText('Cambiar', { exact: true }));
  await clic(m.getByRole('button', { name: 'Agregar otro seguro' }));
  await clic(m.getByRole('dialog', { name: 'Tu seguro' }).getByText('Seguro del trabajo o privado', { exact: true }));
  await clic(m.getByRole('dialog', { name: 'Tu seguro' }).getByText('Highmark', { exact: true }));
  await clic(m.getByRole('button', { name: 'Guardar seguro' }));
  await m.getByText(/Aceptan tu Highmark · pagas tu copago/).first().waitFor(); ok(true, 'Highmark: «Aceptan tu Highmark · pagas tu copago»');
  ok(await espera(() => sql(`select insurer from user_insurances where user_id = '${MU}' and removed_at is null and is_default`), 'highmark') === 'highmark', 'guardado en la cuenta y principal');
  ok(!!(await vis(m.getByText('Copago', { exact: true }).first())), 'precio: «Copago · SEGÚN TU PLAN»');
  // ── Sin cita con espera fresca (Urgencias Express) ──
  sql(`update health_settings set walk_wait_min = 25, walk_wait_at = now() - interval '6 minutes' where business_id = '${U}'`);
  await d.goto(B + `/n/${U}`); await verV(d.getByText('SIN CITA · AHORA'));
  ok(!!(await vis(d.getByText(/HACE [67] MIN/))), 'Resumen: «SIN CITA · AHORA · Espera ~25 min · HACE 6 MIN»');
  ok(!!(await vis(d.getByText('Cómo funciona'))), 'Resumen: «Cómo funciona»');
  await d.screenshot({ path: OUT + 'i4-urgencias-d.png', fullPage: true });
  sql(`update health_settings set walk_wait_at = now() - interval '5 hours' where business_id = '${U}'`);
  await d.reload(); await verV(d.getByText('Cómo funciona'));
  ok(!(await vis(d.getByText('SIN CITA · AHORA'))), 'espera vieja (5 h): no se muestra (no se inventa)');
  await d.goto(B + `/n/${S}?tab=svc`); await verV(d.getByText('¿ACEPTAN TU SEGURO?'));
  await d.screenshot({ path: OUT + 'i5-salud-svc-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK sal4i');
})().catch((e) => { console.error(e); process.exit(1); });
