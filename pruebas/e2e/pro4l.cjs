// 4l-1 · Consulta con un profesional: 3 pasos (cómo, situación, nota sin A-number) → hora → revisa ($0 hoy); privacidad (nota
// cifrada, aviso al negocio sin el trámite); el panel ve cómo, situación y nota; confirmar.
const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', L = 'bufete-almonte';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 40; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const verV = async (l) => { for (let i = 0; i < 60; i++) { if (await vis(l)) return true; await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const espera = async (f, v) => { let x; for (let i = 0; i < 40; i++) { x = f(); if (x === v) return x; await new Promise((r) => setTimeout(r, 250)); } return x; };
(async () => {
  const b = await chromium.launch(); const err = [];
  const mk = async (vp) => { const p = await (await b.newContext({ viewport: vp })).newPage(); p.on('pageerror', (e) => err.push(e.message)); p.on('console', (x) => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_|maplibre|tiles/i.test(x.text())) err.push('console ' + x.text()); }); return p; };
  const m = await mk({ width: 390, height: 844 }), d = await mk({ width: 1360, height: 900 });
  const MU = sql(`select id from users where phone = '+15705550122'`);
  sql(`update operations set status = 'cancelled', cancelled_by = 'admin' where user_id = '${MU}' and kind = 'appointment' and status in ('pending','confirmed','change_proposed')`);
  sql(`update businesses set modules_on = (select array(select distinct unnest(modules_on || array['svc','citas']::text[]))) where id = '${L}'`);
  sql(`insert into booking_policies (business_id) values ('${L}') on conflict do nothing`); sql(`update booking_policies set auto_approve = false where business_id = '${L}'`);
  await entrar(m, '5705550122');
  await m.goto(B + `/n/${L}?tab=svc`); await clic(m.getByText('Consulta de inmigración', { exact: true }));
  await clic(m.getByRole('button', { name: 'Elegir hora' })); await m.waitForURL(/\/tramite\?/);
  await verV(m.getByText('¿PUEDE HACERLO POR LEY?')); ok(true, 'paso 1: ¿PUEDE HACERLO POR LEY?');
  await clic(m.getByText('Por video', { exact: true })); await clic(m.getByText('Me llegó una carta', { exact: true }));
  await (await vis(m.getByLabel('Nota para la oficina'))).fill('Me llegó una carta de USCIS sobre mi renovación');
  await m.screenshot({ path: OUT + 'l1-pro-booking-1-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Continuar' })); await verV(m.getByText('HORA', { exact: true }));
  await clic(m.locator('[role="radio"]:not([aria-disabled="true"])').filter({ hasText: /^\s*\d{1,2}:\d{2} (AM|PM)\s*$/ }));
  await clic(m.getByRole('button', { name: 'Continuar' })); await verV(m.getByText('CÓMO SE PAGA'));
  ok(!!(await vis(m.getByText('Te dan el total por escrito.'))), 'paso 3: «Antes de empezar: te dan el total por escrito»');
  await m.screenshot({ path: OUT + 'l2-pro-booking-3-m.png', fullPage: true });
  await clic(m.getByRole('button', { name: 'Enviar solicitud' }));
  await m.waitForURL(/\/cita\/C-\d+/); const num = m.url().match(/C-\d+/)[0];
  await verV(m.getByText(/Confirman la hora en unos/)); ok(true, `${num}: «Confirman la hora… No se ha cobrado nada.»`);
  const op = sql(`select id from operations where number = '${num}'`);
  ok(sql(`select details->>'modo' || '|' || pay_mode || '|' || coalesce(customer_note, '') from operations where id = ${op}`) === 'video|local|', 'cita: por video, pago en la oficina, sin nota en operations');
  // 9b-1 · Lo cifrado se busca como bytes: convert_from(…, 'LATIN1') fallaba al azar cuando el cifrado traía un byte 0 (inestable).
  ok(sql(`select reason || '|' || (position(convert_to('USCIS', 'UTF8') in note_enc) = 0)::text from op_private where operation_id = ${op}`) === 'carta|true', 'op_private: situación «carta» y la nota CIFRADA');
  const av = sql(`select body from notifications where ref_id = '${num}' and tpl = 'biz_pro_cita' order by id desc limit 1`);
  ok(av && !/inmigraci|USCIS|carta/i.test(av), `aviso a la oficina sin el trámite: «${av}»`);
  // Panel
  await entrar(d, '5705550166'); await d.goto(B + `/panel/${L}/hoy?det=cita:${num}`); await verV(d.getByText('SITUACIÓN', { exact: true }));
  ok(!!(await vis(d.getByText('Le llegó una carta', { exact: true }))) && !!(await vis(d.getByText(/Nota del cliente \(privada\): Me llegó una carta de USCIS/))), 'panel: situación y la nota descifrada solo aquí');
  await d.screenshot({ path: OUT + 'l3-panel-consulta-d.png', fullPage: true });
  await clic(d.getByRole('button', { name: 'Confirmar' }));
  ok(await espera(() => sql(`select status from operations where id = ${op}`), 'confirmed') === 'confirmed', 'confirmada');
  await m.goto(B + `/cita/${num}`); await verV(m.getByText(/El enlace o la llamada te llegan a tus Avisos/)); ok(true, 'cita confirmada por video: «el enlace o la llamada te llegan a tus Avisos»');
  ok(sql(`select count(*) from payments where operation_id = ${op}`) === '0', 'nada se cobró en la app');
  ok(err.length === 0, 'sin errores en el navegador' + (err.length ? ': ' + err.join(' | ') : ''));
  await b.close(); console.log('OK pro4l ' + num);
})().catch((e) => { console.error(e); process.exit(1); });
