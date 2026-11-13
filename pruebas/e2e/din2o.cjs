const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano';
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const PEDRO = "(select id from users where phone='+15705550133')";
const restaurar = () => { try { sql(`update stripe_accounts set payouts_paused = false, paused_reason = null, paused_at = null, paused_by = null where business_id = '${BIZ}'`); sql(`delete from subscriptions where business_id = '${BIZ}'`); sql(`update business_stats_cache set plan = 'pro' where business_id = '${BIZ}'`); } catch {} };
(async () => {
  restaurar();
  sql(`insert into subscriptions (business_id, status, trial_started_at, trial_ends_at, payer_user_id) values ('${BIZ}', 'trial', now() - interval '20 days', now() + interval '10 days', ${PEDRO})`);
  const n0 = sql(`select count(*) from notifications where tpl = 'pay_hold' and user_id = ${PEDRO}`);
  const b = await chromium.launch(); const err = [];
  const a = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); globalThis.__p = [a];
  a.on('pageerror', e => err.push(e.message)); a.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push('console ' + x.text()); });
  await entrar(a, '5705550199'); await a.goto(B + `/admin/negocios/${BIZ}`); await clic(a.getByText('Dinero', { exact: true }));
  await a.getByText('COBRADO · 90 D').first().waitFor();
  ok(a.url().includes('tab=din'), 'pestaña Dinero');
  ok(!!(await vis(a.getByText('Habilitada · recibe pagos').first())), 'cuenta de Stripe habilitada');
  ok(!!(await vis(a.getByText('COBROS CON TARJETA').first())), 'cobros con tarjeta');
  await a.screenshot({ path: OUT + 'o1-dinero-d.png', fullPage: true });
  await clic(a.getByRole('button', { name: 'Pausar pagos' })); await clic(a.getByText('Sospecha de fraude', { exact: true })); await clic(a.getByRole('button', { name: 'Pausar' }).last());
  await a.getByText(/Pagos en pausa. El dueño recibió el aviso/).first().waitFor();
  ok(sql(`select payouts_paused::text || '|' || paused_reason from stripe_accounts where business_id = '${BIZ}'`) === 'true|Sospecha de fraude', 'pagos en pausa con motivo');
  ok(sql(`select count(*) from audit_entries where action = 'negocio.pagos.pausar' and at > now() - interval '1 minute'`) !== '0', 'auditado');
  ok(Number(sql(`select count(*) from notifications where tpl = 'pay_hold' and user_id = ${PEDRO}`)) === Number(n0) + 1, 'el dueño recibió el aviso');
  ok(!!(await vis(a.getByText(/Pagos en pausa desde el/).first())), 'nota de pausa con quién y cuándo');
  // el dueño lo ve en su panel
  const c2 = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true }); const o = await c2.newPage(); globalThis.__p.push(o);
  await entrar(o, '5705550133'); await o.goto(B + `/panel/${BIZ}/cobros`); await o.getByText(/Pagos al banco retenidos por To’Latino: Sospecha de fraude/).first().waitFor();
  ok(true, 'el panel del dueño muestra la retención y el motivo');
  await a.screenshot({ path: OUT + 'o2-pausa-d.png', fullPage: true });
  await clic(a.getByRole('button', { name: 'Reanudar pagos' })); await clic(a.getByText('Se resolvió la disputa.', { exact: true })); await clic(a.getByRole('button', { name: 'Reanudar' }).last());
  await a.getByText(/Pagos reanudados/).first().waitFor();
  ok(sql(`select payouts_paused::text || '|' || coalesce(paused_reason, '-') from stripe_accounts where business_id = '${BIZ}'`) === 'false|-', 'reanudados');
  // plan: extender 14 días (elegir) y anular
  const fin0 = sql(`select trial_ends_at::date from subscriptions where business_id = '${BIZ}'`);
  await clic(a.getByRole('button', { name: 'Extender prueba' })); await clic(a.getByText('14 días', { exact: true })); await clic(a.getByText('Evento de la ciudad.', { exact: true })); await clic(a.getByRole('button', { name: 'Extender' }).last());
  await a.getByText(/Prueba extendida 14 días/).first().waitFor();
  ok(sql(`select (trial_ends_at::date - '${fin0}'::date) from subscriptions where business_id = '${BIZ}'`) === '14', 'prueba extendida 14 días');
  await a.getByText('Prueba extendida', { exact: false }).nth(1).waitFor().catch(() => {});
  ok(!!(await vis(a.getByText(/^Prueba extendida$/).first())), 'la factura/evento sale en el historial del plan');
  await clic(a.getByRole('button', { name: 'Anular suscripción' })); await (await vis(a.getByRole('textbox').last())).fill('Pedido del dueño por teléfono'); await clic(a.getByRole('button', { name: 'Anular' }).last());
  await a.getByText(/Suscripción anulada/).first().waitFor();
  ok(sql(`select trial_choice from subscriptions where business_id = '${BIZ}'`) === 'no_continue', 'anulada: el día 30 pasa a Free');
  // pasado de cobro → anular = Free hoy
  sql(`update subscriptions set status = 'past_due', failed_attempts = 1, next_attempt_at = now() + interval '3 days' where business_id = '${BIZ}'`);
  await a.reload(); await clic(a.getByRole('button', { name: 'Anular suscripción' })); await (await vis(a.getByRole('textbox').last())).fill('No va a seguir'); await clic(a.getByRole('button', { name: 'Anular' }).last());
  await a.getByText(/Suscripción anulada/).first().waitFor();
  ok(sql(`select status from subscriptions where business_id = '${BIZ}'`) === 'ended' && sql(`select plan from business_stats_cache where business_id = '${BIZ}'`) === 'free', 'cobro fallido + anular = Free hoy');
  // cortesía 60 días (elegir)
  await a.reload(); await clic(a.getByRole('button', { name: 'Pro de cortesía' })); await clic(a.getByText('60 días', { exact: true })); await clic(a.getByText('Socio fundador.', { exact: true })); await clic(a.getByRole('button', { name: 'Dar cortesía' }).last());
  await a.getByText(/Pro de cortesía por 60 días/).first().waitFor();
  ok(sql(`select status || '|' || (courtesy_until::date - now()::date) from subscriptions where business_id = '${BIZ}'`) === 'courtesy|60', 'cortesía 60 días');
  // móvil
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true })).newPage(); globalThis.__p.push(m);
  await entrar(m, '5705550199'); await m.goto(B + `/admin/negocios/${BIZ}?tab=din`); await m.getByText('COBRADO · 90 D').first().waitFor();
  const w = await m.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, 'móvil sin scroll horizontal (' + w + ')');
  await m.screenshot({ path: OUT + 'o3-dinero-m.png', fullPage: true });
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); restaurar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch {} restaurar(); process.exit(1); });
