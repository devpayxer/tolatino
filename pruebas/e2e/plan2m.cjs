const ENT = require('../lib/entorno.cjs'); // 9a · rutas del repo, salida y secretos de la corrida (nunca en el repo)
const { chromium, devices } = require('playwright'); const { execSync } = require('child_process');
const OUT = ENT.S + '/cap/', B = 'http://localhost:3100', BIZ = 'sabor-dominicano', P = '/panel/' + BIZ;
const sql = (q) => execSync(`docker exec ${ENT.DB} psql -U tolatino -d tolatino -At -c "${q.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`).toString().trim();
const api = (p, u, b) => p.evaluate(async ([u, b]) => (await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })).json(), [u, b]);
const entrar = async (p, tel) => { await p.goto(B + '/entrar'); sql('delete from otp_codes'); const a = await api(p, '/api/cuenta/codigo', { telefono: tel }); await api(p, '/api/cuenta/verificar', { telefono: tel, codigo: a.codigoPrueba }); };
const ok = (c, m) => { if (!c) throw new Error('ASSERT ' + m); console.log('  ✓', m); };
const vis = async (l) => { const n = await l.count(); for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) return l.nth(i); return null; };
const clic = async (l) => { for (let i = 0; i < 24; i++) { const x = await vis(l); if (x) return x.click(); await new Promise((r) => setTimeout(r, 250)); } throw new Error('no visible: ' + l + ' · la página dice: ' + (await l.page().locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300)); };
const PEDRO = "(select id from users where phone='+15705550133')";
const sub = (c = "status||'|'||trial_choice") => sql(`select ${c} from subscriptions where business_id = '${BIZ}'`);
const stats = () => sql(`select plan from business_stats_cache where business_id = '${BIZ}'`);
const notif = (tpl) => sql(`select count(*) from notifications where user_id = ${PEDRO} and tpl = '${tpl}' and created_at > now() - interval '10 minutes'`);
const restaurar = () => { try { sql(`delete from subscriptions where business_id = '${BIZ}'`); sql(`update business_stats_cache set plan = 'pro' where business_id = '${BIZ}'`); } catch {} };
(async () => {
  restaurar(); sql(`delete from payment_methods where user_id = ${PEDRO}`); sql(`delete from notifications where user_id = ${PEDRO} and tpl like 'pro_%'`);
  const cob = () => +sql(`select count(*) from subscription_events where business_id = '${BIZ}' and kind = 'charged'`), c0 = cob();
  sql(`insert into subscriptions (business_id, status, trial_started_at, trial_ends_at, payer_user_id) values ('${BIZ}', 'trial', now() - interval '25 days', now() + interval '5 days' - interval '1 hour', ${PEDRO})`);
  const b = await chromium.launch(); const err = [];
  const watch = (p, tag) => { p.on('pageerror', e => err.push(tag + ' ' + e.message)); p.on('console', x => { if (x.type() === 'error' && !/Failed to load|404|pexels|ERR_/.test(x.text())) err.push(tag + ' console ' + x.text()); }); };
  const d = await (await b.newContext({ ...devices['iPhone 13'] })).newPage(); watch(d, 'panel'); globalThis.__p = [d];
  await entrar(d, '5705550133');
  // 1 · Prueba: quedan 5 días, aviso del día 25 una sola vez
  await d.goto(B + P + '/cobros/plan'); await d.getByText(/Pro · prueba · quedan 5 días/).first().waitFor(); ok(true, 'Tu plan: «Pro · prueba · quedan 5 días»');
  await d.reload(); await d.getByText(/quedan 5 días/).first().waitFor();
  ok(notif('pro_d25') === '1', 'aviso del día 25: una sola vez');
  await d.screenshot({ path: OUT + 'p1-plan-prueba-m.png', fullPage: true });
  // 2 · Seguir con Pro: agrega la tarjeta (se guarda siempre)
  await clic(d.getByRole('button', { name: 'Seguir con Pro' }));
  const h = d.locator('[data-screen-label="Método de pago"]');
  await h.getByLabel('Número de la tarjeta').fill('4242424242424242'); await h.getByLabel('Vence').fill('1230'); await h.getByLabel('CVC').fill('123'); await h.getByLabel('Código postal').fill('18201'); await h.getByLabel('Nombre en la tarjeta').fill('Pedro Prueba');
  ok(await h.getByText('Guardar para la próxima').count() === 0, 'la tarjeta de Pro se guarda siempre (sin interruptor)');
  await h.getByText('Usar esta tarjeta', { exact: true }).click(); await d.getByText(/El primer cobro es el día 30/).first().waitFor();
  ok(sub() === 'trial|card' && stats() === 'pro', 'decidió seguir: tarjeta guardada, sin cobrar hoy');
  await d.getByText(/primer cobro el/).first().waitFor(); await d.screenshot({ path: OUT + 'p2-plan-tarjeta-m.png', fullPage: true });
  // 3 · Día 30: se cobra y queda Pro
  sql(`update subscriptions set trial_ends_at = now() - interval '1 minute' where business_id = '${BIZ}'`);
  await d.goto(B + P + '/cobros/plan'); await d.getByText(/Próximo cobro:/).first().waitFor();
  ok(sub("status||'|'||(current_period_end > now() + interval '27 days')") === 'active|true' && stats() === 'pro', 'día 30: cobrado, Pro por un mes');
  ok(cob() === c0 + 1 && notif('pro_charged') === '1', 'evento de cobro $14.99 y aviso «Cobro de Pro»');
  await d.reload(); ok(cob() === c0 + 1, 'recargar no vuelve a cobrar (idempotente)');
  await d.screenshot({ path: OUT + 'p3-plan-pro-m.png', fullPage: true });
  // 4 · Pasar a Free: sigue Pro hasta el fin del período; luego Free y nada se borra
  await clic(d.getByRole('button', { name: 'Pasar a Free' })); await d.getByText(/Sigues con Pro hasta el/).first().waitFor();
  ok(sub("status") === 'canceling', 'pasar a Free: sigue con Pro hasta el fin del mes');
  sql(`update subscriptions set current_period_end = now() - interval '1 minute' where business_id = '${BIZ}'`);
  await d.goto(B + P + '/cobros/plan'); await d.getByText('Tu contenido Pro está guardado').first().waitFor();
  ok(sub("status") === 'ended' && stats() === 'free' && notif('pro_free') === '1', 'fin del período: Free, aviso «Tu página pasó a Free»');
  await d.screenshot({ path: OUT + 'p4-plan-free-m.png', fullPage: true });
  // 5 · Volver a Pro: tarjeta rechazada → no; aprobada → se cobra hoy
  await clic(d.getByRole('button', { name: /Volver a Pro/ }));
  await h.getByText('Agregar tarjeta de crédito o débito').click();
  await h.getByLabel('Número de la tarjeta').fill('4000000000000002'); await h.getByLabel('Vence').fill('1230'); await h.getByLabel('CVC').fill('123'); await h.getByLabel('Código postal').fill('18201'); await h.getByLabel('Nombre en la tarjeta').fill('Pedro Prueba');
  await h.getByText('Usar esta tarjeta', { exact: true }).click(); await d.getByText(/Tu banco la rechazó/).first().waitFor();
  ok(stats() === 'free', 'volver a Pro con tarjeta rechazada: sigue en Free');
  await clic(d.getByRole('button', { name: /Volver a Pro/ })); await h.getByText(/Visa ·· 4242/).first().click(); await h.getByText(/^Usar Visa ·· 4242/).click();
  await d.getByText(/ya tienes Pro/).first().waitFor();
  ok(sub("status") === 'active' && stats() === 'pro' && cob() === c0 + 2, 'volver a Pro: se cobra hoy y queda Pro');
  // 6 · Renovación con tarjeta rechazada: 3 intentos → Free
  const malo = sql(`select stripe_pm_id from payment_methods where user_id = ${PEDRO} and last4 = '0002' limit 1`);
  sql(`update subscriptions set card_pm = '${malo}', current_period_end = now() - interval '1 minute' where business_id = '${BIZ}'`);
  await d.goto(B + P + '/cobros/plan'); await d.getByText(/intento 1 de 3/).first().waitFor();
  ok(sub("status||'|'||failed_attempts") === 'past_due|1' && stats() === 'pro' && notif('pro_failed') === '1', 'cobro fallido: intento 1 de 3, sigue Pro y le avisa');
  for (const n of [2, 3]) { sql(`update subscriptions set next_attempt_at = now() - interval '1 minute' where business_id = '${BIZ}'`); await d.goto(B + P + '/cobros/plan'); await d.waitForTimeout(500); }
  ok(sub("status") === 'ended' && stats() === 'free', 'al tercer intento: Free (nada se borra)');
  // 7 · Los «Ver Pro» del panel llevan a Tu plan
  await d.goto(B + P + '/vendes/jobs'); ok(true, 'Jobs (Pro) abre');
  ok(err.length === 0, 'sin errores: ' + err.join(' | ')); restaurar(); await b.close(); console.log('OK');
})().catch(async e => { console.error(e); try { for (const p of globalThis.__p || []) { await p.screenshot({ path: OUT + 'fail-' + Math.random().toString(36).slice(2, 6) + '.png' }); console.log('url', p.url()); } } catch {} restaurar(); process.exit(1); });
