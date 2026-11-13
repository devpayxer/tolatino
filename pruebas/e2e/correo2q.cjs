const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const { requiere } = require('../lib/requiere.cjs');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const MARI = "(select id from users where phone='+15705550122')";
const EMAIL = 'marisol.prueba@example.com';
const prev = { email: sql(`select coalesce(email::text, '') from users where id = ${MARI}`), verif: sql(`select email_verified from users where id = ${MARI}`), prefs: sql(`select notif_prefs::text from users where id = ${MARI}`) };
const restaurar = () => { try { sql(`update users set email = nullif('${prev.email}', ''), email_verified = ${prev.verif === 't'}, notif_prefs = '${prev.prefs}'::jsonb where id = ${MARI}`); } catch {} };
(async () => {
  sql(`update users set email = null, email_verified = false where id = ${MARI}`);
  sql(`delete from email_verifications where user_id = ${MARI}`); // base local de pruebas: el límite de 3 por hora empieza de cero
  const b = await chromium.launch(); const err = [];
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true })).newPage(); globalThis.__p = [m];
  m.on('pageerror', e => err.push(e.message)); m.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  await entrar(m, '5705550122'); await m.goto(B + '/cuenta/perfil'); await m.getByText('CORREO').first().waitFor();
  await (await vis(m.getByPlaceholder('ana@correo.com'))).fill(EMAIL); await clic(m.getByRole('button', { name: 'Guardar cambios' }));
  await m.getByText('Confirma tu correo').first().waitFor(); ok(sql(`select email::text || '|' || email_verified from users where id = ${MARI}`) === `${EMAIL}|false`, 'correo guardado sin verificar');
  await clic(m.getByText('Mandar el enlace', { exact: true })); await m.getByText('Abrir el enlace', { exact: true }).first().waitFor();
  ok(sql(`select status from email_outbox where tpl = 'verify' and user_id = ${MARI} order by id desc limit 1`) === 'pruebas', 'el correo de confirmar queda en modo pruebas (no sale)');
  await m.screenshot({ path: OUT + 'q1-perfil-m.png', fullPage: true });
  await clic(m.getByText('Abrir el enlace', { exact: true })); await m.getByText('Tu correo está confirmado').first().waitFor();
  ok(sql(`select email_verified from users where id = ${MARI}`) === 't', 'correo confirmado'); const url = m.url();
  await m.goto(url); await m.getByText('Ese enlace no sirve').first().waitFor(); ok(true, 'el enlace sirve una sola vez');
  await m.screenshot({ path: OUT + 'q2-enlace-m.png', fullPage: true });
  // recibo de pedido: Pedro marca Entregado
  const num = sql(`select number from operations where user_id = ${MARI} and business_id = '${BIZ}' and kind = 'order' and mode = 'pickup' order by id desc limit 1`);
  const op = sql(`select id from operations where number = '${num}' and business_id = '${BIZ}'`);
  sql(`update operations set status = 'confirmed', stage = 'ready', done_at = null where id = ${op}`); sql(`delete from email_outbox where idem_key = 'rcpt-ord-${op}'`);
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p.push(p); p.on('pageerror', e => err.push(e.message));
  await entrar(p, '5705550133'); await p.goto(B + `/panel/${BIZ}/clientes?det=ped:${num}`); await clic(p.locator('[data-screen-label="Panel v2 · detalle"]').getByRole('button', { name: 'Entregado' })); await p.getByText('Anotado · Entregado.').first().waitFor();
  ok(sql(`select status || '|' || tpl from email_outbox where idem_key = 'rcpt-ord-${op}'`) === 'pruebas|receipt_order', 'recibo del pedido en la bandeja');
  ok(sql(`select subject from email_outbox where idem_key = 'rcpt-ord-${op}'`).startsWith(`Recibo de tu pedido #${num}`), 'asunto del recibo');
  // reservación confirmada
  // 9b-3 · Una reservación futura de Marisol en Sabor Dominicano: la hace rsv2e de punta a punta (antes se daba por hecho que ya había corrido).
  const rn = requiere('rsv2e', () => sql(`select number from operations where user_id = ${MARI} and business_id = '${BIZ}' and kind = 'table' and scheduled_at > now() order by id desc limit 1`), { que: 'una reservación futura de Marisol' });
  sql(`update operations set status = 'pending', status_detail = null, cancelled_at = null where number = '${rn}'`);
  await p.goto(B + `/panel/${BIZ}/clientes?t=rsv&det=rsv:${rn}`); await clic(p.locator('[data-screen-label="Panel v2 · detalle"]').getByRole('button', { name: 'Confirmar' })); await p.waitForTimeout(1500);
  ok(sql(`select count(*) from email_outbox where tpl = 'receipt_table' and user_id = ${MARI} and created_at > now() - interval '1 minute'`) === '1', 'confirmación de mesa por correo');
  // Recibos apagado: no llega
  sql(`update users set notif_prefs = notif_prefs || '{\"mailR\": false}'::jsonb where id = ${MARI}`);
  sql(`update operations set status = 'confirmed', stage = 'ready', done_at = null where id = ${op}`); sql(`delete from email_outbox where idem_key = 'rcpt-ord-${op}'`);
  await p.goto(B + `/panel/${BIZ}/clientes?det=ped:${num}`); await clic(p.locator('[data-screen-label="Panel v2 · detalle"]').getByRole('button', { name: 'Entregado' })); await p.getByText('Anotado · Entregado.').first().waitFor();
  ok(sql(`select count(*) from email_outbox where idem_key = 'rcpt-ord-${op}'`) === '0', 'con Recibos apagado no se manda');
  // Super Admin › Correos
  const a = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p.push(a); a.on('pageerror', e => err.push(e.message));
  await entrar(a, '5705550199'); await a.goto(B + '/admin/notificaciones?tab=mail'); await a.getByText('Mesa confirmada · Sabor Dominicano').first().waitFor();
  ok(!(await vis(a.getByText(EMAIL).first())), 'el correo sale enmascarado en la lista'); ok(!!(await vis(a.getByText('m***@example.com').first())), 'máscara m***@example.com');
  await a.screenshot({ path: OUT + 'q3-admin-correos-d.png', fullPage: true });
  await clic(a.getByText(/Confirma tu correo en To’Latino/).first()); await a.getByText('NOTIFICACIONES · CORREO').first().waitFor();
  const src = await a.locator('iframe').getAttribute('srcdoc'); ok(src.includes('/cuenta/correo?t=…') && !/correo\?t=[A-Za-z0-9_-]{20}/.test(src), 'el enlace de confirmar sale tapado para el equipo');
  await a.goto(B + '/admin/notificaciones?tab=mail'); await clic(a.getByText('Mesa confirmada · Sabor Dominicano').first()); await a.waitForTimeout(800);
  await a.screenshot({ path: OUT + 'q4-correo-d.png', fullPage: true });
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); restaurar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch {} restaurar(); process.exit(1); });
